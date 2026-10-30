-- Siddhi — pre-demo hardening.
--
-- HOW TO RUN
--   1. Open the Supabase SQL Editor.
--   2. Click into the editor. Do NOT highlight any text — if anything is
--      selected, Supabase runs only that fragment.
--   3. Paste this whole file. Press Run.
--   4. Read the two tables it prints at the bottom.
--
-- WHY
--   setup.sql granted `for all ... using (true)`, and "all" includes DELETE.
--   The publishable key is public by design (it ships inside the frontend
--   bundle), so any visitor can currently empty every table with one request.
--   The app itself never deletes anything, so removing DELETE costs nothing.
--
--   This script also switches row-level security ON. If RLS is off, Postgres
--   ignores policies completely and permits everything — which would explain
--   deletes still succeeding regardless of what the policies say. Enabling it
--   when it is already on is harmless.

-- 1. Make sure RLS is actually enforced -------------------------------------
alter table clinics    enable row level security;
alter table encounters enable row level security;
alter table baselines  enable row level security;
alter table alerts     enable row level security;
alter table tasks      enable row level security;
alter table referrals  enable row level security;

-- 2. Replace the blanket policies with select / insert / update -------------

drop policy if exists demo_all on clinics;
drop policy if exists demo_read on clinics;
drop policy if exists demo_write on clinics;
drop policy if exists demo_update on clinics;
create policy demo_read   on clinics for select to anon, authenticated using (true);
create policy demo_write  on clinics for insert to anon, authenticated with check (true);
create policy demo_update on clinics for update to anon, authenticated using (true) with check (true);

drop policy if exists demo_all on encounters;
drop policy if exists demo_read on encounters;
drop policy if exists demo_write on encounters;
drop policy if exists demo_update on encounters;
create policy demo_read   on encounters for select to anon, authenticated using (true);
create policy demo_write  on encounters for insert to anon, authenticated with check (true);
create policy demo_update on encounters for update to anon, authenticated using (true) with check (true);

drop policy if exists demo_all on baselines;
drop policy if exists demo_read on baselines;
drop policy if exists demo_write on baselines;
drop policy if exists demo_update on baselines;
create policy demo_read   on baselines for select to anon, authenticated using (true);
create policy demo_write  on baselines for insert to anon, authenticated with check (true);
create policy demo_update on baselines for update to anon, authenticated using (true) with check (true);

drop policy if exists demo_all on alerts;
drop policy if exists demo_read on alerts;
drop policy if exists demo_write on alerts;
drop policy if exists demo_update on alerts;
create policy demo_read   on alerts for select to anon, authenticated using (true);
create policy demo_write  on alerts for insert to anon, authenticated with check (true);
create policy demo_update on alerts for update to anon, authenticated using (true) with check (true);

drop policy if exists demo_all on tasks;
drop policy if exists demo_read on tasks;
drop policy if exists demo_write on tasks;
drop policy if exists demo_update on tasks;
create policy demo_read   on tasks for select to anon, authenticated using (true);
create policy demo_write  on tasks for insert to anon, authenticated with check (true);
create policy demo_update on tasks for update to anon, authenticated using (true) with check (true);

drop policy if exists demo_all on referrals;
drop policy if exists demo_read on referrals;
drop policy if exists demo_write on referrals;
drop policy if exists demo_update on referrals;
create policy demo_read   on referrals for select to anon, authenticated using (true);
create policy demo_write  on referrals for insert to anon, authenticated with check (true);
create policy demo_update on referrals for update to anon, authenticated using (true) with check (true);

-- 3. Stop overlapping scans creating duplicate alerts -----------------------
create unique index if not exists alerts_one_live_per_pair
  on alerts (sector, syndrome)
  where status <> 'resolved';

-- 4. Report ------------------------------------------------------------------
-- rls_enabled must be true on all six rows.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('clinics','encounters','baselines','alerts','tasks','referrals')
order by c.relname;

-- Expect SELECT, INSERT, UPDATE per table. No DELETE. No ALL.
select tablename, cmd, policyname
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
