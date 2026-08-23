-- Siddhi — public advisories.
--
-- HOW TO RUN: Supabase SQL Editor, click in, highlight nothing, paste, Run.
--   https://supabase.com/dashboard/project/ommnjuedmzffiawhkdqi/sql/new
--
-- WHY THIS IS NOT "A PUBLIC DASHBOARD OF INFECTED AREAS"
--
--   At a mass gathering, telling millions of people that a sector is infected
--   moves the crowd — and crowd movement is what kills at these events. The
--   2025 Maha Kumbh had a fatal crush. Panic also floods clinics with the
--   worried well, which is precisely when you need capacity for the sick.
--
--   So nothing reaches the public automatically. An officer publishes, in
--   words they approve, and the public page carries ADVICE rather than
--   alarm: where to find safe water, what to watch for, when to seek help.
--   Detection stays internal; only the instruction goes out.
--
--   This mirrors how real health departments work: surveillance is internal,
--   public communication is deliberate, attributed and calm.

alter table alerts add column if not exists advisory text;
alter table alerts add column if not exists advisory_at timestamptz;
alter table alerts add column if not exists advisory_by text;

-- The public page reads advisories through the same anon key as everything
-- else; the existing select policy on alerts already covers it. Nothing new
-- is exposed: an advisory is text an officer wrote, not a raw alert.

comment on column alerts.advisory is
  'Officer-approved public wording. NULL means nothing has been published for this alert. Never auto-populated.';

-- CHECK ----------------------------------------------------------------------
select column_name, data_type
from information_schema.columns
where table_name = 'alerts' and column_name like 'advisory%'
order by column_name;

-- Expect three rows: advisory (text), advisory_at (timestamptz), advisory_by (text).
