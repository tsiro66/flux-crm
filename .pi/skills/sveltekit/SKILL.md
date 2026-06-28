---
name: sveltekit
description: >
  REQUIRED for SvelteKit work in this repo: routes, +page/+layout files, form actions,
  load functions, Svelte 5 runes ($state, $derived, $props, $effect, $bindable), endpoints,
  hooks, middleware, adapters, and kit config. Triggers: SvelteKit, Svelte 5, runes, +page.svelte,
  +page.server.ts, +layout.svelte, load(), actions, +server.ts, $state, $derived, $props,
  svelte.config.js, vite.config.ts, svelte-check, svelte-kit sync. Covers Svelte 5 runes mode,
  Tailwind 4, Drizzle ORM, Vitest, adapter-node. Excludes generic TypeScript/Node unrelated to SvelteKit.
---

# SvelteKit Skill

This repo (`flux-crm`) runs **SvelteKit 2 + Svelte 5 (runes forced) + Tailwind 4 + Drizzle ORM +
adapter-node + Vitest**. Use this skill for any SvelteKit/Svelte work here.

## When This Skill MUST Be Used

**ALWAYS load this skill for:**

- Editing anything under `src/routes/` (`+page.svelte`, `+page.ts`, `+page.server.ts`,
  `+layout.svelte`, `+layout.ts`, `+layout.server.ts`, `+server.ts`, `+error.svelte`)
- Svelte 5 runes: `$state`, `$derived`, `$props`, `$bindable`, `$effect`, `$host`, `$inspect`
- Form actions, `load` functions, `ActionData`/`PageData`, `depends()`, `invalidate()`
- API endpoints (`+server.ts` with `GET`/`POST`/`PUT`/`PATCH`/`DELETE`)
- Hooks (`src/hooks.server.ts`, `src/hooks.ts`), `locals`, sequence middleware
- `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `src/app.html`, `src/app.d.ts`
- Svelte stores, components, `src/lib/components/*`, UI primitives
- Client/server boundary mistakes, `$env/static.*`, `$env/dynamic/*`
- Running `pnpm check`, `svelte-check`, `svelte-kit sync`, `pnpm test`, `pnpm build`
- Drizzle ORM access from `src/lib/server/db` inside load/actions/endpoints

**Do NOT use for:** pure Node scripts, unrelated TS, or non-SvelteKit concerns.

## Tooling

| Task | Command |
|------|---------|
| Dev server | `pnpm dev` (Vite) |
| Type check | `pnpm check` (runs `svelte-kit sync` + `svelte-check`) |
| Watch typecheck | `pnpm check:watch` |
| Tests | `pnpm test` (Vitest, jsdom) / `pnpm test:watch` |
| Lint | `pnpm lint` (Prettier --check + ESLint) |
| Format | `pnpm format` |
| Build | `pnpm build` (vite build via adapter-node) |
| Preview prod | `pnpm preview` |
| Regenerate types | `pnpm svelte-kit sync` (also runs on `prepare`) |

Package manager: **pnpm**. Always use `pnpm` not `npm`/`yarn`.

## Project Layout

```
src/
├── app.html                 # Shell, %sveltekit.head%
├── app.d.ts                 # App.Locals, PageData types
├── app.css                  # Tailwind 4 import (@import "tailwindcss")
├── routes/
│   ├── +layout.svelte       # Root layout
│   ├── +layout.server.ts    # Root server load (auth, locals)
│   ├── +layout.ts           # Shared load (merged data)
│   ├── +page.svelte         # Home page
│   ├── login/               # Public route
│   ├── (protected)/         # Group w/ shared layout, NOT in URL
│   │   ├── +layout.server.ts # Auth guard: redirect if no user
│   │   ├── dashboard/
│   │   ├── clients/[id]/
│   │   └── finance/
│   └── api/                 # JSON endpoints (+server.ts)
│       └── clients/[id]/+server.ts
├── lib/
│   ├── components/ui/        # Button, input, card, dialog, ... primitives
│   ├── components/client/    # Browser-only components
│   ├── components/chat/
│   ├── server/               # SERVER ONLY - never import into client
│   │   ├── db/               # Drizzle schema, client, queries
│   │   ├── supabase/
│   │   └── services/
│   ├── stores/               # Svelte stores / state
│   ├── validations/          # Zod-style schemas
│   ├── utils/
│   └── index.ts              # Public barrel
└── hooks/
```

Route groups `(name)` share layout but are stripped from URL. Path params `[id]` -> `params.id`.

## Svelte 5 Runes (FORCED in this repo)

`svelte.config.js` forces runes mode for everything except `node_modules`. Do NOT use legacy
`export let`, `$:`, `on:`, `createEventDispatcher`, or stores as primary state. Use runes.

### Component state

```svelte
<script lang="ts">
  let count = $state(0);              // reactive state
  let doubled = $derived(count * 2);   // derived, recomputes on count change
  let items = $state<string[]>([]);    // typed
</script>

<button onclick={() => count++}>{count}</button>
<p>Doubled: {doubled}</p>
```

### Props

```svelte
<script lang="ts">
  interface Props {
    title: string;
    count?: number;
    onselect?: (id: string) => void;
  }
  let { title, count = 0, onselect }: Props = $props();
</script>
```

### Two-way binding with `$bindable`

Parent: `<Input value={name} bind:this={inputRef} />`
Child:
```svelte
<script lang="ts">
  interface Props { value?: string; }
  let { value = $bindable('') }: Props = $props();
</script>
<input bind:value />
```

Use `bind:` only for form inputs and `$bindable` child values. Avoid binding across deep trees.

### Effects (use sparingly)

```svelte
<script lang="ts">
  let el = $state<HTMLDivElement>();
  $effect(() => {
    // Runs after DOM update. Track anything read synchronously.
    if (!el) return;
    const obs = new ResizeObserver(() => /* ... */);
    obs.observe(el);
    return () => obs.disconnect();   // cleanup
  });
</script>
```

Don't `$effect` for state derivable from other runes - use `$derived`. Don't read `$state` you
mutate inside the same effect (infinite loop).

### Snippets (replace slots)

```svelte
<!-- Parent -->
<List items={users}>
  {#snippet row(u)}
    <td>{u.name}</td>
  {/snippet}
</List>

<!-- Child List.svelte -->
<script lang="ts">
  interface Props { items: T[]; row?: (item: T) => Snippet; }
  let { items, row }: Props = $props();
</script>
{#each items as item}
  {@render row?.(item)}
{/each}
```

### Event handlers

New syntax: `onclick`, `oninput`, `onchange`, `onsubmit` (no `on:` prefix).

```svelte
<button onclick={() => save()}>Save</button>
<form onsubmit={handleSubmit}>...</form>
```

For custom events dispatched to parent, prefer **callback props** over `createEventDispatcher`:

```svelte
<script lang="ts">
  interface Props { onsave?: (data: FormData) => void; }
  let { onsave }: Props = $props();
</script>
<button onclick={() => onsave?.(formData)}>Save</button>
```

### Transitions/actions

```svelte
<script lang="ts">
  import { fade } from 'svelte/transition';
  let show = $state(false);
</script>
{#if show}
  <div transition:fade={{ duration: 200 }}>...</div>
{/if}
```

Svelte actions: `use:action` still supported.

## Routing & Data Loading

### Load functions

- `+page.server.ts` / `+layout.server.ts` -> runs on server only, can query DB via Drizzle.
  Output typed as `PageServerData` / `LayoutServerData`.
- `+page.ts` / `+layout.ts` -> runs on server AND client (universal). Cannot import `server`-only code.
  Use for transforming/merging server data.
- `.svelte` files receive `data` prop typed `PageData` / `LayoutData`.

```ts
// src/routes/(protected)/clients/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { clients } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
  const rows = await db.select().from(clients).where(eq(clients.ownerId, locals.user!.id));
  return { clients: rows };
};
```

Always import types from `./$types` (generated by `svelte-kit sync`). Run `pnpm check` if types
are stale.

### Form actions

```ts
// src/routes/(protected)/clients/+page.server.ts
import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const form = await request.formData();
    const name = String(form.get('name'));
    if (!name) return fail(400, { name, error: 'Name required' });
    // insert via Drizzle...
    return { success: true };
  },
};
```

In the page, use `use:enhance` for progressive enhancement:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();   // ActionData
</script>
<form method="POST" action="?/create" use:enhance>
  <input name="name" value={form?.name ?? ''} />
  {#if form?.error}<p class="text-red-600">{form.error}</p>{/if}
  <button>Save</button>
</form>
```

### Endpoints (+server.ts)

```ts
// src/routes/api/clients/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) throw error(401, 'Unauthorized');
  const c = await db.select().from(clients).where(eq(clients.id, params.id));
  if (!c.length) throw error(404, 'Not found');
  return json(c[0]);
};

export const DELETE: RequestHandler = async ({ params }) => { /* ... */ return new Response(null, { status: 204 }); };
```

### Auth guard pattern (this repo)

`src/routes/(protected)/+layout.server.ts` checks `locals.user` and redirects to `/login` when
absent. Set `locals.user` in `src/hooks.server.ts` from session cookie/JWT before routing.

```ts
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('session');
  if (token) event.locals.user = await getUserFromToken(token);  // verify w/ Supabase
  return resolve(event);
};
```

## Server/Client Boundary (CRITICAL)

- Anything importing `$lib/server/**` runs on server ONLY. Importing server code into a
  universal `.svelte`/`.ts` load or component breaks the build.
- `$env/static/private` -> server only. `$env/static/public` -> both. `$env/dynamic/*` -> runtime.
- Drizzle `db` client lives in `$lib/server/db`. Never import in `+page.ts` (universal) or a
  client component. Query in `+page.server.ts` / actions / `+server.ts` only.
- Browser APIs (`window`, `document`, `localStorage`, `ResizeObserver`) only inside `$effect`,
  `onMount`, or `if (browser)` from `$app/environment`. Top-level access in universal modules
  SSR-errors.

## Tailwind 4

- Config-less. `src/app.css` contains `@import "tailwindcss";`.
- Theme tokens via `@theme { --color-brand: #...; }` in CSS, not `tailwind.config.js`.
- Vite plugin `@tailwindcss/vite` registered in `vite.config.ts`.
- Plugins installed: `@tailwindcss/forms`, `@tailwindcss/typography`.
- Use `pnpm format` - `prettier-plugin-tailwindcss` sorts classes.

## Drizzle ORM (server only)

- Schema: `src/lib/server/db/schema.ts` (or split files re-exported here).
- Client: `src/lib/server/db/index.ts` exports `db` (postgres-js).
- Config: `drizzle.config.ts`. Scripts: `pnpm db:push`, `db:generate`, `db:migrate`, `db:studio`,
  `db:seed`.

```ts
import { db } from '$lib/server/db';
import { clients } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

const list = await db.select().from(clients).where(eq(clients.ownerId, uid)).orderBy(desc(clients.createdAt));
await db.insert(clients).values({ name }).returning();
await db.update(clients).set({ name }).where(eq(clients.id, id));
await db.delete(clients).where(eq(clients.id, id));
```

Always scope queries by `locals.user.id` to avoid cross-tenant leaks.

## Testing (Vitest + jsdom)

- Config in `vite.config.ts` (`test` key). jsdom env for component tests.
- `@testing-library/svelte` for component queries.
- Tests live next to code: `*.test.ts`, `*.spec.ts`, or `src/lib/__tests__/`.
- Mock `$app/stores`, `$app/environment`, server modules as needed.

```ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Button from './Button.svelte';

describe('Button', () => {
  it('renders label', () => {
    render(Button, { props: { label: 'Save' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });
});
```

## Common Mistakes to Avoid

1. **Legacy syntax in runes repo**: `export let x`, `$: doubled = x*2`, `on:click`,
   `createEventDispatcher` -> switch to runes/callback props.
2. **Importing `$lib/server/*` from universal/client code** -> move query to `+page.server.ts`.
3. **Stale `$types`** after adding routes -> run `pnpm check` (runs sync).
4. **Browser API at module top-level** -> guard with `browser` or move into `$effect`/`onMount`.
5. **Mutating `$state` inside its own `$effect`** -> infinite loop; split into `$derived` or
   separate state.
6. **Forgetting `await request.formData()`** in actions, or returning non-`fail` errors.
7. **Missing auth guard** on new `(protected)` routes -> mirror existing `+layout.server.ts`.
8. **Unscoped DB queries** -> always filter by `locals.user.id`.
9. **`bind:value` on non-`$bindable` child prop** -> mark `value = $bindable()` in child.
10. **Using stores where runes fit** -> prefer `$state`/`$derived` in components; keep stores only
    for genuinely cross-component shared state.

## Validation Workflow

After editing SvelteKit code:

```bash
pnpm check       # svelte-kit sync + svelte-check (type errors)
pnpm lint        # prettier + eslint
pnpm test        # vitest run
pnpm build       # full production build via adapter-node (slow, run before deploy)
```

Fix `pnpm check` errors first - they catch most routing/type/boundary issues. If `$types` missing
or wrong, `svelte-kit sync` regenerates them (auto on `check`/`build`/`prepare`).

## Env Vars

- `.env` (gitignored) for local. `.env.example` documents required keys.
- Private (server): `import { SECRET } from '$env/static/private';`
- Public (client+server): `import { PUBLIC_KEY } from '$env/static/public';` - must be prefixed
  `PUBLIC_`.
- Dynamic (runtime, unknown at build): `import { env } from '$env/dynamic/private';`
- Never commit `.env`. Add new keys to `.env.example`.

## Adapter

`@sveltejs/adapter-node` (set in `svelte.config.js`). Output to `build/`. Run via `node build`.
Dockerfile present for deployment. Do not switch to `adapter-auto` for this project's prod target.
