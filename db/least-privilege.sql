-- Siddhi — least-privilege grants for the public key.
--
-- Run this AFTER setup.sql (and harden.sql). Safe to run repeatedly.
--
-- Why this exists
-- ---------------
-- setup.sql grants the anon key select + insert + update on every table,
-- which is wider than the app actually uses. With the repository public the
-- API is easy to find and script against, so the grants should match the
-- code rather than be convenient.
--
-- Verified against the source before writing this file:
--
--   clinics         read only      — seeded once; no code path writes it
--   encounters      insert only    — a recorded patient is never edited
--   referrals       insert only    — a handed-over card is never edited
--   pharmacy_sales  insert only    — a stall tally is never edited
--   alerts          insert+update  — engine inserts, app sets status/resolved_at
--   tasks           insert+update  — app assigns, crew acknowledges and resolves
--   baselines       insert+update  — engine upserts every scan
--   pharmacy_signals insert+update — engine upserts the corroboration signal
--
-- After this, someone holding the public key still cannot rewrite a recorded
-- encounter, forge an edit to a referral, or rename a clinic. They can still
-- INSERT junk rows — that is inherent to a demo with no authentication, and
-- db/cleanup.sql is the answer to it.
--
-- DELETE is granted to nobody, on any table, ever.

do $$
declare
  t text;
  read_only    text[] := array['clinics'];
  insert_only  text[] := array['encounters', 'referrals', 'pharmacy_sales'];
  updatable    text[] := array['alerts', 'tasks', 'baselines', 'pharmacy_signals'];
  all_tables   text[];
begin
  all_tables := read_only || insert_only || updatable;

  -- Drop every policy this project has ever created, so the final state is
  -- exactly what this file says regardless of what ran before it.
  foreach t in array all_tables loop
    if to_regclass(t) is null then
      raise notice 'skipping %, table not present', t;
      continue;
    end if;
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists demo_all   on %I', t);
    execute format('drop policy if exists demo_read  on %I', t);
    execute format('drop policy if exists demo_write on %I', t);
    execute format('drop policy if exists demo_edit  on %I', t);
  end loop;

  -- Everything is readable: the dashboard, the public advisory page and the
  -- referral scan all read without a login by design.
  foreach t in array all_tables loop
    if to_regclass(t) is null then continue; end if;
    execute format(
      'create policy demo_read on %I for select to anon, authenticated using (true)', t);
  end loop;

  -- Writes, only where the code writes.
  foreach t in array (insert_only || updatable) loop
    if to_regclass(t) is null then continue; end if;
    execute format(
      'create policy demo_write on %I for insert to anon, authenticated with check (true)', t);
  end loop;

  foreach t in array updatable loop
    if to_regclass(t) is null then continue; end if;
    execute format(
      'create policy demo_edit on %I for update to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Verify: expect clinics=select only, encounters/referrals/pharmacy_sales =
-- select+insert, the rest = select+insert+update. No row should say DELETE.
select tablename,
       string_agg(cmd, ', ' order by cmd) as allowed
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;
