-- Atreya — pre-demo reset.
--
-- Run this in the Supabase SQL Editor shortly before presenting:
--   https://supabase.com/dashboard/project/ommnjuedmzffiawhkdqi/sql/new
-- Click into the editor, don't highlight anything, paste, Run.
--
-- Since harden.sql removed DELETE from the public key, cleanup has to happen
-- here rather than from a script. That is the intended trade — the SQL Editor
-- runs as the owner and is not reachable from the internet.

-- 1. Remove probe rows from testing: any alert for a sector that doesn't exist
--    (the festival has 12). These came from verifying that delete was blocked.
delete from tasks  where alert_id in (select id from alerts where sector not between 1 and 12);
delete from alerts where sector not between 1 and 12;

-- 2. Close any alert the engine raised during rehearsal, so the dashboard opens
--    calm. Resolving rather than deleting keeps the closed-incident cards on
--    screen, which show the system has worked before.
update alerts set status = 'resolved' where status <> 'resolved';

-- 3. Close any job left hanging, so the crew screen reads "all clear".
update tasks
set resolved_at = coalesce(resolved_at, now()),
    ack_at      = coalesce(ack_at, now()),
    outcome     = coalesce(outcome, 'nothing_found'),
    note        = coalesce(note, 'Closed during pre-demo reset')
where resolved_at is null;

-- 4. Remove records entered by hand while testing. Simulated traffic stays —
--    that is what keeps the dashboard alive during the demo.
delete from referrals
where encounter_id in (select id from encounters where simulated = false);
delete from encounters where simulated = false;

-- 5. Remove the specific probe encounter used to verify writes still work.
delete from encounters where id = '11111111-1111-4111-a111-111111111111';

-- ------------------------------------------------------------------ CHECK
select
  (select count(*) from alerts where status <> 'resolved')          as open_alerts,
  (select count(*) from alerts where sector not between 1 and 12)   as bogus_alerts,
  (select count(*) from tasks  where resolved_at is null)           as open_tasks,
  (select count(*) from encounters where simulated = false)         as hand_entered,
  (select count(*) from encounters)                                 as total_encounters,
  (select max(ts)  from encounters)                                 as newest_encounter;

-- Expect: open_alerts 0, bogus_alerts 0, open_tasks 0, hand_entered 0,
-- total_encounters a few thousand, newest_encounter within a few minutes.
