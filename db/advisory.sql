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
--   What the public page actually does, stated precisely, because an earlier
--   version of this comment claimed more than the code delivers:
--
--     - An open alert DOES automatically flip its sector to "take care here"
--       and name the syndrome in three languages. That is deliberate. A page
--       that hid which areas are affected would be useless to someone trying
--       to take precautions, and people notice illness around them anyway.
--     - What never goes out automatically is a NUMBER. No case counts, no
--       severity score, no ranking between areas -- a number invites
--       comparison, and comparison moves a crowd.
--     - Every status ends in an instruction, and the page repeats that every
--       area has its own free clinic, so nobody concludes they must travel.
--     - This column overrides the closing advice with wording an officer
--       approved. It is a UI convention, not a database guarantee: with no
--       auth, nothing at this layer distinguishes an officer's write from
--       anyone else's.
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
