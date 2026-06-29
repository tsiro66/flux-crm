# Prompt: Replace Finance window with Projects list view

In the flux-crm repo at `/home/tsiro/Projects/flux-crm` (SvelteKit + Svelte 5 runes + Drizzle ORM + Supabase + Tailwind 4 + shadcn-style UI). Read `.pi/skills/sveltekit/SKILL.md` first — it's required for SvelteKit work here.

## Goal
Delete the **Finance** nav item / page. Replace it with a new **Projects** window that mirrors the `/clients` list page but shows projects, with server-side filters: **client**, **invoice status** (for_invoice / invoiced / no_invoice), **payment status** (not_paid / partial_payment / paid), and **"owes more"** (sort by remaining = totalAmount - paidAmount desc). Keep the finance drag-and-drop boards logic out — it's gone. Don't touch the `/clients` page.

## Files to study first (DO NOT skip)
- `src/routes/(protected)/clients/+page.svelte` — copy this list-table layout pattern (toolbar: Import/Export/Add buttons; search input; sortable column headers with URL state; row click navigates to detail; pagination footer; bulk select + delete; "X total" count).
- `src/routes/(protected)/clients/+page.server.ts` — copy this load() pattern: URL-driven (`search`, `page`, `sort`, `dir`), server-side `count()` + paged query, correlated subquery for sorting by a derived field, `projectsByClient`/`filesByClient` aggregates.
- `src/lib/components/AppNav.svelte` — nav item `{ href: '/finance', label: 'Finance', icon: Receipt }`. Change to `{ href: '/projects', label: 'Projects', icon: FolderOpen }` (or keep Receipt, your call). There's also a `compact` 4-icon grid rendered from the same `navItems` — it'll update automatically.
- `src/routes/(protected)/finance/+page.svelte` and `+page.server.ts` — delete entirely (the `src/routes/(protected)/finance/` directory).
- `src/lib/server/services/project.ts` — has `listAllProjectsWithClient` (joins client → returns `clientName`, `clientEmail`), `createProject`, `updateProject`, `deleteProject`, `updateProjectStatus`, `findProjectByClientAndTitle`. You'll likely need a NEW paged/filtered query: model it on `listClients`' where/orderBy/limit/offset, joining clients for the filter-by-client + display name. Put it in `project.ts` as something like `listProjects(userId, filters)`.
- `src/lib/server/db/schema.ts` — `projects` table: `id, clientId, title, totalAmount (int cents), paidAmount (int cents), invoiceStatus (enum), paymentStatus (enum), date (timestamptz), userId, createdAt, updatedAt`. `clients` table: `id, name, email, phone, notes, userId`. Amounts are stored in **cents**; display via `formatCurrency(cents)` from `$lib/utils` (divides by 100, EUR).
- `src/lib/validations/project.ts` — `createProjectSchema` / `updateProjectSchema` / `updateProjectStatusSchema` already exist. Reuse for the Add/Edit dialogs.
- `src/lib/utils/index.ts` (and `formatters.ts`) — exports `formatCurrency`, `formatDate`, `invoiceStatusLabels`, `paymentStatusLabels`, `invoiceStatusVariants`, `paymentStatusVariants`, `toCents`, `toEuros`. Use these for badges + amounts, do NOT reformat differently.

## What exists you can reuse (don't recreate)
- `src/lib/components/client/ProjectFormDialog.svelte` — Add/Edit project dialog (takes `clientId`, project data, callbacks). Reuse for the "Add Project" button and inline edit.
- `src/lib/components/client/PaymentDialog.svelte` — add/edit payments on a project. Reuse if you expose a per-project payment action (optional for v1 — at minimum keep Add/Edit/Delete project working).
- `src/lib/components/client/DeleteConfirmDialog.svelte` — generic delete confirm with `title/description/loading/onConfirm`. Reuse for delete project.
- `src/lib/components/ui/pagination/Pagination.svelte` — `page`, `totalPages`, `onPageChange`. Same as clients page.
- `src/lib/components/ui/badge`, `button`, `input`, `dialog`, `label`, `textarea` — all available.
- APIs: `POST /api/projects` (create), `PUT /api/projects/[id]` (update), `DELETE /api/projects/[id]` (delete), `PATCH /api/projects/[id]/status` (status). Consumed exactly like clients page consumes `/api/clients`. Do NOT create new API endpoints — the load() query handles all filtering serverside via URL params.

## Required filter UI (URL-state-driven, like clients' `sort`/`dir`/`search`)
All filters live in the URL and are read in `+page.server.ts`. Use a `<details>` or a row of `<select>`s above the table — match the visual weight of the clients toolbar. Filters:
- **Client**: `<select>` populated from `data.clients` (load all clients for the current user, same query as finance's `clientMap`). `?client=<clientId>`; empty = all. Server: `eq(projects.clientId, clientId)` when present.
- **Invoice status**: `<select>` with options `all / for_invoice / invoiced / no_invoice`. `?invoice=<value>`.
- **Payment status**: `<select>` with options `all / not_paid / partial_payment / paid`. `?payment=<value>`.
- **Search**: optional text search on `projects.title` (and/or client name) like clients' `?search=`. Keep it if easy; not strictly required, skip if it complicates.
- **Sort**: clickable headers like clients. Default sort = **remaining DESC** ("owes more"). Sortable columns: `title`, `client` (by client name via join), `total` (totalAmount), `remaining` (totalAmount - paidAmount, computed), `date`. `?sort=<field>&dir=asc|desc`. Default `sort=remaining&dir=desc`. Implement remaining as `sql<number>` expression `(total_amount - paid_amount)` — Drizzle can sort on it in Postgres.
- Pagination: `?page=<n>`, page size 20 (same as clients). Keep the "X projects total" footer.

Use `goto()` with all current params whenever a filter/sort/page changes — exactly the clients page does this (see its `toggleSort`, `handleSearch`, `handlePageChange`).

## Table columns (projects list)
Checkbox | Client (name, clickable → `/clients/[id]`) | Title | Date (`formatDate`) | Invoice status (Badge) | Payment status (Badge) | Total (`formatCurrency`) | Remaining (`formatCurrency`, red-ish if > 0, green if 0) | (row actions via hover or a kebab — keep minimal; clicking the row could open edit dialog, or just leave row non-clickable and rely on Edit/Delete buttons. Match clients page: row click navigates. For projects there is no project detail page, so row click should open the Edit dialog instead.)

If wiring row-click to Edit dialog feels off, alternative: no row click; an Edit button + Delete button appear at row end. Pick one and stay consistent.

## +page.server.ts (load) shape — mirror clients
```
load returns: {
  projects,        // paged rows: { id, title, date, totalAmount, paidAmount, invoiceStatus, paymentStatus, clientName, clientId }
  clients,         // all clients [{id,name}] for the client filter dropdown
  total, page, totalPages,
  filters: { client: string|null, invoice, payment, sort, dir }  // echoed from URL for UI state
}
```
Empty/unauth shape returns the same fields empty, like clients does.

## Steps
1. Delete `src/routes/(protected)/finance/` (both `+page.svelte` and `+page.server.ts`). Confirm no other imports reference `/finance` or the finance route (`rg -n "finance" src`).
2. Update `AppNav.svelte`: remove `/finance` item, add `/projects` (icon `FolderOpen` from `@lucide/svelte`).
3. Create `src/routes/(protected)/projects/+page.server.ts` modeled on `clients/+page.server.ts` with the filters above. Add `listProjects(userId, {...})` to `src/lib/server/services/project.ts` (paged, filtered, joined to clients, sortable incl. computed remaining). Return `clientName` per row.
4. Create `src/routes/(protected)/projects/+page.svelte` modeled on `clients/+page.svelte`. Toolbar: filter dropdowns + (optional) search + Add Project (uses `ProjectFormDialog`), Import/Export buttons reuse existing `ImportDialog`/`ExportDialog` (they already support a `mode='projects'` prop — check `ImportDialog.svelte`, it switches between clients/projects internally; pass initial mode or copy/adapt). Table + badges + pagination + bulk delete (if you add bulk delete, mirror clients' `selectedIds` + `DELETE /api/clients/bulk-delete` pattern — NOTE there's no `/api/projects/bulk-delete` yet; either skip bulk delete for v1 or add the endpoint modeled on the clients one in `src/routes/api/clients/bulk-delete/+server.ts` calling `deleteProjects(userId, ids)` which you'd add to `project.ts` modeled on `deleteClients`).
5. Run `npx svelte-check --tsconfig ./tsconfig.json --threshold error` and `pnpm test`; fix until clean.
6. Build sanity: `pnpm build` should pass (adapter-node).

## Constraints
- Svelte 5 runes only: `$state`, `$derived`, `$props`, `$effect`, `$bindable`. No stores except existing toast store (`$lib/stores/toast.svelte`). Match clients page's usage exactly incl. the `// svelte-ignore state_referenced_locally` comments where it copies that pattern.
- Tenant scoping: every DB query filtered by `eq(projects.userId, locals.user.id)` / `eq(clients.userId, ...)`. Never trust client-supplied IDs without the userId clause.
- Money in cents in DB, euros in UI (`formatCurrency`).
- Do NOT delete or modify `/clients`, `/dashboard`, `/chat`, `/login`, the projects CSV import/export endpoints, or any client files components unless extending.
- Don't touch the `projects` schema or migrations.

## Out of scope for this session
- The projects CSV import/export already exist (`src/routes/api/projects/import|export`) and the dialogs already branch on mode — just wire the buttons.
- Per-project payment editing from this list (optional); can stay on the client detail page for now.
