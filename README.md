# Flux CRM

A multi-tenant CRM for freelancers/small agencies: clients, projects, payments,
file storage, finance kanban, dashboard analytics, and an AI assistant that
proposes changes for explicit user approval.

## Stack

- **Frontend:** SvelteKit 2 (runes), TypeScript, Tailwind v4, shadcn-svelte bits, Chart.js
- **Backend:** SvelteKit server routes, Drizzle ORM, PostgreSQL (Supabase)
- **Auth:** Supabase Auth (cookie session via `@supabase/ssr`)
- **Storage:** Supabase Storage (signed upload/download URLs)
- **AI assistant:** [Flue](https://flueframework.com) agent server (`@flue/runtime`) + `@flue/sdk`, default model `anthropic/claude-haiku-4-5` (env-switchable, Greek UI)

## Architecture

```
Browser ──► SvelteKit ──► Drizzle ──► PostgreSQL (Supabase)
              │            (per-row userId filters + Supabase RLS)
              │
              ├─► supabase-js (server) for Storage signed URLs
              └─► Flue agent server (/agents/:name/:id) for the AI assistant
```

The AI assistant never writes to the database directly. Its mutating tools return
**proposals** that the chat UI renders as approval cards; on user confirm the
browser calls the existing validated REST endpoints. This keeps a single write
path and guarantees no data changes without explicit consent.

## Local development

```sh
pnpm install
cp .env.example .env   # then fill in DATABASE_URL, SUPABASE_*, GROQ/ANTHROPIC/GEMINI key
pnpm db:push           # create/apply schema
supabase db push        # apply migrations (RLS + unique index) if using the Supabase CLI
pnpm db:seed            # optional: demo data (single hardcoded tenant)
pnpm dev
```

The Flue AI server runs separately:

```sh
pnpm exec flue dev      # http://localhost:3583
```

Variables (see `.env.example`):

| Variable                            | Where            | Notes                                                                    |
| ----------------------------------- | ---------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`                      | app + flue       | Postgres connection string                                               |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | app + flue       | Flue uses anon key only — `auth.getUser(jwt)` verifies the caller JWT    |
| `SUPABASE_SERVICE_ROLE_KEY`         | app only         | for Storage signed URLs; never ship to Flue or the browser               |
| `ANTHROPIC_API_KEY`                 | flue             | default model provider                                                   |
| `GEMINI_API_KEY`                    | flue             | fallback model provider                                                  |
| `FLUE_MODEL`                        | flue             | e.g. `anthropic/claude-haiku-4-5` (default) or `google/gemini-2.5-flash` |
| `ALLOWED_ORIGIN`                    | flue             | CORS — set to the web app URL in production                              |
| `ORIGIN`, `CSRF_ALLOWED_ORIGINS`    | app              | SvelteKit CSRF config                                                    |
| `PUBLIC_*`                          | app (build time) | browser-visible Supabase + Flue URL                                      |

## Scripts

```sh
pnpm dev          # SvelteKit dev
pnpm build        # production build
pnpm check        # svelte-check (type checking)
pnpm test         # vitest
pnpm lint         # prettier --check && eslint
pnpm format       # prettier --write
pnpm db:push      # drizzle-kit push
pnpm db:migrate   # drizzle-kit migrate
pnpm db:studio    # drizzle-kit studio
pnpm db:seed      # seed demo data
```

## Security model

- **Tenant isolation:** every database query is scoped by `userId` at the app
  layer, enforced again by [Supabase RLS policies](supabase/migrations/0001_rls_and_indexes.sql)
  (`auth.uid() = user_id`).
- **Flue agent auth:** `.flue/app.ts` verifies the Supabase JWT from the
  `Authorization` header and asserts the requested agent instance id equals the
  verified user id, so a caller cannot drive another tenant's agent.
- **CSRF:** mutating requests are origin-checked in `src/hooks.server.ts`.
- **File uploads:** the storage path accepted by `POST /api/files` must be
  prefixed with `${userId}/${clientId}/`, preventing a caller from creating a
  record pointing at another tenant's object.

## Deployment (Fly.io)

Two apps, configured in `fly.toml` (web) and `fly.toml.flue` (AI server):

```sh
# Web
fly deploy --config fly.toml
fly secrets set -a flux-web SUPABASE_SERVICE_ROLE_KEY=... ORIGIN=https://flux-web.fly.dev CSRF_ALLOWED_ORIGINS=https://flux-web.fly.dev

# Flue AI server
fly deploy --config fly.toml.flue
fly secrets set -a flux-flue SUPABASE_URL=... SUPABASE_ANON_KEY=... ANTHROPIC_API_KEY=... ALLOWED_ORIGIN=https://flux-web.fly.dev FLUE_MODEL=anthropic/claude-haiku-4-5
```

`PUBLIC_*` build args are set in `fly.toml`'s `[build.args]`.

## Tests

```sh
pnpm test          # unit tests for utils/validations/csv/chat
```
