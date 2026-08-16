-- Drishti — pre-demo hardening.
-- Paste into the Supabase SQL Editor and Run. Takes a second, no downtime.
--
-- WHY THIS MATTERS
-- setup.sql created one policy per table:  for all ... using (true)
-- "for all" includes DELETE. The publishable key is public by design — it ships
-- inside the frontend bundle — so today ANY visitor can empty every table with a
-- single request:
--     DELETE /rest/v1/encounters?id=not.is.null
-- That would wipe the demo mid-presentation with no recovery.
--
-- The app never deletes anything: every call across the dashboard, entry form
-- and crew app is a SELECT, INSERT or UPDATE. So removing DELETE costs nothing
-- and closes the hole.

-- 1. Replace the blanket policy with select/insert/update only ---------------

do $$
declare t text;
begin
  foreach t in array array['clinics','encounters','baselines','alerts','tasks','referrals'] loop
    execute format('drop policy if exists demo_all on %I', t);
    execute format('drop policy if exists demo_read on %I', t);
    execute format('drop policy if exists demo_write on %I', t);
    execute format('drop policy if exists demo_update on %I', t);

    execute format('create policy demo_read   on %I for select to anon, authenticated using (true)', t);
    execute format('create policy demo_write  on %I for insert to anon, authenticated with check (true)', t);
    execute format('create policy demo_update on %I for update to anon, authenticated using (true) with check (true)', t);
    -- deliberately no DELETE policy
  end loop;
end $$;

-- 2. Stop concurrent scans creating duplicate alerts -------------------------
-- The engine checks "is there already an unresolved alert for this sector and
-- syndrome" and then inserts. Two scans overlapping (the 5-minute cron firing
-- while someone triggers a manual scan) can both pass that check and both
-- insert, putting two identical alerts on the dashboard. This index makes the
-- database refuse the second one.

create unique index if not exists alerts_one_live_per_pair
  on alerts (sector, syndrome)
  where status <> 'resolved';

-- 3. Check it worked ---------------------------------------------------------

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, cmd;

-- Expect exactly three rows per table: SELECT, INSERT, UPDATE. No DELETE.
