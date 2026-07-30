-- Recurring monthly payments: table, indexes, and RLS policies.
-- Mirrors the Drizzle definition in src/lib/server/db/schema.ts.
-- Generation is lazy (catch-up on page load), no cron required.
--
-- Run with: supabase db push  (or apply via the Supabase dashboard).

create table if not exists public.recurring_payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null,
  amount integer not null,
  note text not null default '',
  day_of_month integer not null default 1,
  active boolean not null default true,
  start_month text not null,
  last_generated_month text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists "recurring_payments_user_id_idx" on public.recurring_payments (user_id);
create index if not exists "recurring_payments_client_id_idx" on public.recurring_payments (client_id);
create index if not exists "recurring_payments_project_id_idx" on public.recurring_payments (project_id);

alter table public.recurring_payments enable row level security;

drop policy if exists "recurring_payments_select_own" on public.recurring_payments;
create policy "recurring_payments_select_own" on public.recurring_payments
  for select using (auth.uid() = user_id);

drop policy if exists "recurring_payments_insert_own" on public.recurring_payments;
create policy "recurring_payments_insert_own" on public.recurring_payments
  for insert with check (auth.uid() = user_id);

drop policy if exists "recurring_payments_update_own" on public.recurring_payments;
create policy "recurring_payments_update_own" on public.recurring_payments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recurring_payments_delete_own" on public.recurring_payments;
create policy "recurring_payments_delete_own" on public.recurring_payments
  for delete using (auth.uid() = user_id);
