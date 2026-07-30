-- Add indexes on tenant/foreign-key columns. Every application query filters
-- by user_id and joins via client_id / project_id / conversation_id; without
-- these indexes Postgres seq-scans as tables grow.
--
-- Mirrors the index definitions in src/lib/server/db/schema.ts (Drizzle).
-- Written as a plain SQL migration because Drizzle manages table schema via
-- `drizzle-kit push`, which does not emit migration files. `if not exists`
-- keeps it idempotent and safe to re-apply alongside drizzle-kit push.
--
-- Run with: supabase db push  (or apply via the Supabase dashboard).

create index if not exists "clients_user_id_idx" on public.clients (user_id);

create index if not exists "projects_user_id_idx" on public.projects (user_id);
create index if not exists "projects_client_id_idx" on public.projects (client_id);

create index if not exists "payments_user_id_idx" on public.payments (user_id);
create index if not exists "payments_project_id_idx" on public.payments (project_id);

create index if not exists "files_user_id_idx" on public.files (user_id);
create index if not exists "files_client_id_idx" on public.files (client_id);

create index if not exists "chat_conversations_user_id_idx" on public.chat_conversations (user_id);

create index if not exists "chat_messages_user_id_idx" on public.chat_messages (user_id);
create index if not exists "chat_messages_conversation_created_idx"
  on public.chat_messages (conversation_id, created_at);
