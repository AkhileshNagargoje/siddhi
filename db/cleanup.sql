-- Drishti — pre-demo cleanup.
--
-- Run this in the Supabase SQL Editor shortly before presenting.
--
-- NOTE: after harden.sql, the public key can no longer DELETE, so cleanup has
-- to happen here rather than from a script. That is the intended trade — the
-- SQL Editor runs as the owner and is not exposed to the internet.

-- 1. Close any alerts the engine raised during rehearsal, so the dashboard
--    opens calm. Resolving rather than deleting keeps the history honest and
--    leaves the "we have closed incidents before" cards on screen.
update alerts set status = 'resolved' where status <> 'resolved';

-- 2. Close any jobs left hanging, so the crew screen reads "all clear".
update tasks
set resolved_at = coalesce(resolved_at, now()),
    ack_at      = coalesce(ack_at, now()),
    outcome     = coalesce(outcome, 'nothing_found'),
    note        = coalesce(note, 'Closed during pre-demo reset')
where resolved_at is null;

-- 3. Remove records entered by hand during testing (simulated traffic stays).
delete from referrals
where encounter_id in (select id from encounters where simulated = false);
delete from encounters where simulated = false;

-- ------------------------------------------------------------------ CHECK
select
  (select count(*) from alerts where status <> 'resolved')  as open_alerts,
  (select count(*) from tasks  where resolved_at is null)   as open_tasks,
  (select count(*) from encounters where simulated = false) as hand_entered,
  (select count(*) from encounters)                         as total_encounters,
  (select max(ts)  from encounters)                         as newest_encounter;

-- Expect: open_alerts 0, open_tasks 0, hand_entered 0,
-- total_encounters in the low thousands, newest_encounter within a few minutes.
