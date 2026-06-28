-- Enable Row-Level Security and add tenant-isolation policies for every
-- application table, plus the unique (userId, email) index used by imports.
--
-- Run with: supabase db push  (or apply via the Supabase dashboard).
--
-- These policies scope every row to auth.uid() == user_id. The SvelteKit
-- server layer already filters by user_id, so this is defense-in-depth: it
-- blocks direct PostgREST/anon access to another tenant's rows. The service-
-- role connections used by the app bypass RLS by design, so app-level filters
-- remain the source of truth for those paths.
--
-- NOTE: requires the `auth.uid()` function provided by the Supabase auth schema.

-- ──────────────────────────── clients ────────────────────────────
alter table public.clients enable row level security;

drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own" on public.clients
  for select using (auth.uid() = user_id);

drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own" on public.clients
  for insert with check (auth.uid() = user_id);

drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own" on public.clients
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own" on public.clients
  for delete using (auth.uid() = user_id);

-- ──────────────────────────── projects ────────────────────────────
alter table public.projects enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);

-- ──────────────────────────── payments ────────────────────────────
alter table public.payments enable row level security;

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);

drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own" on public.payments
  for insert with check (auth.uid() = user_id);

drop policy if exists "payments_update_own" on public.payments;
create policy "payments_update_own" on public.payments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "payments_delete_own" on public.payments;
create policy "payments_delete_own" on public.payments
  for delete using (auth.uid() = user_id);

-- ──────────────────────────── files ────────────────────────────
alter table public.files enable row level security;

drop policy if exists "files_select_own" on public.files;
create policy "files_select_own" on public.files
  for select using (auth.uid() = user_id);

drop policy if exists "files_insert_own" on public.files;
create policy "files_insert_own" on public.files
  for insert with check (auth.uid() = user_id);

drop policy if exists "files_update_own" on public.files;
create policy "files_update_own" on public.files
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "files_delete_own" on public.files;
create policy "files_delete_own" on public.files
  for delete using (auth.uid() = user_id);

-- ──────────────────────────── chat_conversations ────────────────────────────
alter table public.chat_conversations enable row level security;

drop policy if exists "chat_conversations_select_own" on public.chat_conversations;
create policy "chat_conversations_select_own" on public.chat_conversations
  for select using (auth.uid() = user_id);

drop policy if exists "chat_conversations_insert_own" on public.chat_conversations;
create policy "chat_conversations_insert_own" on public.chat_conversations
  for insert with check (auth.uid() = user_id);

drop policy if exists "chat_conversations_update_own" on public.chat_conversations;
create policy "chat_conversations_update_own" on public.chat_conversations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chat_conversations_delete_own" on public.chat_conversations;
create policy "chat_conversations_delete_own" on public.chat_conversations
  for delete using (auth.uid() = user_id);

-- ──────────────────────────── chat_messages ────────────────────────────
alter table public.chat_messages enable row level security;

drop policy if exists "chat_messages_select_own" on public.chat_messages;
create policy "chat_messages_select_own" on public.chat_messages
  for select using (auth.uid() = user_id);

drop policy if exists "chat_messages_insert_own" on public.chat_messages;
create policy "chat_messages_insert_own" on public.chat_messages
  for insert with check (auth.uid() = user_id);

drop policy if exists "chat_messages_update_own" on public.chat_messages;
create policy "chat_messages_update_own" on public.chat_messages
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chat_messages_delete_own" on public.chat_messages;
create policy "chat_messages_delete_own" on public.chat_messages
  for delete using (auth.uid() = user_id);

-- ──────────────────────────── Unique email per user ────────────────────────────
-- Prevents duplicate clients sharing the same non-empty email within a tenant.
-- Drizzle manages table schema via `drizzle-kit push`, but this index is a
-- data-integrity constraint that belongs in the database regardless. Run with:
--   supabase db push
-- or apply manually.
drop index if exists "clients_user_email_unique";
create unique index "clients_user_email_unique"
  on public.clients (user_id, email)
  where email is not null and email <> '';