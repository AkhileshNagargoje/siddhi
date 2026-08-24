-- Atreya — give an alert its own resolution timestamp.
--
-- HOW TO RUN: Supabase SQL Editor, paste, Run.
--   https://supabase.com/dashboard/project/ommnjuedmzffiawhkdqi/sql/new
--
-- WHY
--
--   The re-fire cooldown was anchored only on tasks.resolved_at. A task row
--   exists only if the alert was DISPATCHED to a crew, so an alert closed any
--   other way -- dismissed, or bulk-cleared from the demo console before a
--   presentation -- left nothing for the cooldown to see. The cases that
--   triggered it are still inside the 6-hour window, so the very next scan
--   raised the identical alert again.
--
--   Observed live: alerts resolved at 02:14 PM, re-fired at 02:15 PM, in three
--   sectors at once. On stage that reads as "he cleared the board and the bug
--   came back", which is the worst possible moment for it.
--
--   Resolution time belongs on the alert, not on the job that happened to
--   close it. The worker reads this column when present and falls back to the
--   task-anchored behaviour when it is absent, so running this is an
--   improvement, not a prerequisite.

alter table alerts add column if not exists resolved_at timestamptz;

-- Backfill from the tasks that closed them, so existing history is not treated
-- as freshly resolved.
update alerts a
   set resolved_at = t.resolved_at
  from tasks t
 where t.alert_id = a.id
   and t.resolved_at is not null
   and a.status = 'resolved'
   and a.resolved_at is null;

comment on column alerts.resolved_at is
  'When this alert stopped being live. Anchors the re-fire cooldown in the worker. Set by whatever resolves the alert, whether or not a crew job existed.';

-- CHECK ----------------------------------------------------------------------
select count(*) filter (where status = 'resolved') as resolved,
       count(*) filter (where status = 'resolved' and resolved_at is null) as missing_timestamp
from alerts;

-- `missing_timestamp` counts alerts closed before this migration with no task
-- to backfill from. They simply get no cooldown, exactly as before.
