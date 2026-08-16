-- Drishti — pre-demo hardening.
--
-- HOW TO RUN: open the Supabase SQL Editor, select nothing (click in the editor
-- but do NOT highlight any text — a selection makes it run only that fragment),
-- paste this whole file, press Run. Then read the table it prints at the end.
--
-- WHY: setup.sql created one policy per table with `for all ... using (true)`.
-- "all" includes DELETE, and the publishable key is public by design — it ships
-- inside the frontend bundle. So today any visitor can empty every table with
-- one request:  DELETE /rest/v1/encounters?id=not.is.null
--
-- The app never deletes anything (every call is SELECT, INSERT or UPDATE), so
-- removing DELETE costs nothing.

-- ---------------------------------------------------------------- clinics
drop policy if exists demo_all on clinics;
drop policy if exists demo_read on clinics;
drop policy if exists demo_write on clinics;
drop policy if exists demo_update on clinics;
create policy demo_read   on clinics for select to anon, authenticated using (true);
create policy demo_write  on clinics for insert to anon, authenticated with check (true);
create policy demo_update on clinics for update to anon, authenticated using (true) with check (true);

-- ------------------------------------------------------------- encounters
drop policy if exists demo_all on encounters;
drop policy if exists demo_read on encounters;
drop policy if exists demo_write on encounters;
drop policy if exists demo_update on encounters;
create policy demo_read   on encounters for select to anon, authenticated using (true);
create policy demo_write  on encounters for insert to anon, authenticated with check (true);
create policy demo_update on encounters for update to anon, authenticated using (true) with check (true);

-- -------------------------------------------------------------- baselines
drop policy if exists demo_all on baselines;
drop policy if exists demo_read on baselines;
drop policy if exists demo_write on baselines;
drop policy if exists demo_update on baselines;
create policy demo_read   on baselines for select to anon, authenticated using (true);
create policy demo_write  on baselines for insert to anon, authenticated with check (true);
create policy demo_update on baselines for update to anon, authenticated using (true) with check (true);

-- ----------------------------------------------------------------- alerts
drop policy if exists demo_all on alerts;
drop policy if exists demo_read on alerts;
drop policy if exists demo_write on alerts;
drop policy if exists demo_update on alerts;
create policy demo_read   on alerts for select to anon, authenticated using (true);
create policy demo_write  on alerts for insert to anon, authenticated with check (true);
create policy demo_update on alerts for update to anon, authenticated using (true) with check (true);

-- ------------------------------------------------------------------ tasks
drop policy if exists demo_all on tasks;
drop policy if exists demo_read on tasks;
drop policy if exists demo_write on tasks;
drop policy if exists demo_update on tasks;
create policy demo_read   on tasks for select to anon, authenticated using (true);
create policy demo_write  on tasks for insert to anon, authenticated with check (true);
create policy demo_update on tasks for update to anon, authenticated using (true) with check (true);

-- -------------------------------------------------------------- referrals
drop policy if exists demo_all on referrals;
drop policy if exists demo_read on referrals;
drop policy if exists demo_write on referrals;
drop policy if exists demo_update on referrals;
create policy demo_read   on referrals for select to anon, authenticated using (true);
create policy demo_write  on referrals for insert to anon, authenticated with check (true);
create policy demo_update on referrals for update to anon, authenticated using (true) with check (true);

-- Stop two overlapping scans creating duplicate alerts. The engine checks
-- "is there already an unresolved alert for this sector and syndrome" and then
-- inserts; two scans running at once can both pass that check. This makes the
-- database refuse the second one.
create unique index if not exists alerts_one_live_per_pair
  on alerts (sector, syndrome)
  where status <> 'resolved';

-- ------------------------------------------------------------------ CHECK
-- Should list exactly SELECT, INSERT, UPDATE for each of the six tables.
-- If you see DELETE, or "ALL", the policies above did not apply.
select tablename, cmd, policyname
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
