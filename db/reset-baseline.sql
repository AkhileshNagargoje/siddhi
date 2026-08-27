-- Atreya — reset the detection baseline.
--
-- HOW TO RUN
--   1. Open the Supabase SQL Editor.
--   2. Click INTO the editor. Do NOT highlight any text — if anything is
--      selected, Supabase runs only that fragment.
--   3. Paste this whole file. Press Run.
--   4. Read the two tables it prints, then run the backfill (bottom of file).
--
-- WHY THIS IS NEEDED
--
--   Detection compares the last 6 hours against the SAME 6-hour slot on each of
--   the previous three days. Repeated demo injections into one sector wrote a
--   fake spike into that history, and the detector correctly concluded that a
--   spike is normal there.
--
--   Sector 5 reached [171, 6, 5] — a mean of 61 with a denominator of 78, so it
--   needed roughly 295 cases in six hours before it would say anything. It had
--   gone deaf, and sector 5 is the sector the whole demo story names.
--
--   This is the "one noisy historical day desensitises the cell" weakness that
--   worker/test/score.test.mjs already documents as accepted behaviour. Nothing
--   is broken. The data is wrong, not the algorithm.
--
-- WHY A FULL RESET RATHER THAN SURGERY
--
--   Once written, an injected row is indistinguishable from ordinary simulated
--   traffic — same shape, same columns. Trimming "the spike" means guessing a
--   cap per sector per syndrome, which quietly biases every baseline it touches.
--   Deleting the simulated history and laying it down again is predictable, and
--   it is the only version whose result you can state exactly.
--
-- WHAT IS NOT TOUCHED
--
--   Anything with simulated = false. Those are the records entered by hand
--   through the clinic form and the medicine stall, and they are the only rows
--   here that represent a real action by a real person.

-- 1. Before ------------------------------------------------------------------

select 'BEFORE' as stage,
       sector,
       count(*) filter (where ts >= now() - interval '6 hours')  as current_window,
       count(*) filter (where ts >= now() - interval '30 hours'
                          and ts <  now() - interval '24 hours') as slot_24h_back,
       count(*)                                                  as gi_rows_total
from encounters
where syndrome = 'gi'
  and ts >= now() - interval '78 hours'
group by sector
order by slot_24h_back desc;

-- 2. Clear the alert board ---------------------------------------------------
--    Tasks reference alerts, so they go first. Deleting rather than resolving:
--    a resolved alert starts a six-hour cooldown that would suppress the very
--    sector you are about to demo in.

delete from tasks;
delete from alerts;

-- 3. Drop the simulated history ----------------------------------------------
--    Everything older than the current window. The last six hours are left
--    alone so the dashboard is not empty while you work.

delete from encounters
where simulated = true
  and ts < now() - interval '6 hours';

delete from pharmacy_sales
where simulated = true
  and ts < now() - interval '6 hours';

-- 4. Drop the baseline cache -------------------------------------------------
--    Display only — the engine recomputes it from raw rows on the next scan.

delete from baselines;
delete from pharmacy_signals;

-- 5. After -------------------------------------------------------------------

select 'AFTER' as stage,
       (select count(*) from encounters where simulated = true)  as simulated_left,
       (select count(*) from encounters where simulated = false) as real_kept,
       (select count(*) from alerts)                             as alerts,
       (select count(*) from tasks)                              as tasks;

-- 6. NOW LAY DOWN CLEAN HISTORY ----------------------------------------------
--
--    This file cannot do it: the traffic model lives in the simulator, and a
--    hand-written SQL version would drift from the one the engine was tuned
--    against. Run this in a terminal:
--
--        cd simulator
--        node simulate.js backfill
--
--    That writes ~4,800 encounters across 84 hours with the real daily rhythm,
--    through the same API the app uses.
--
--    Then confirm the detector is neither deaf nor trigger-happy:
--
--        curl "https://health-engine.akhileshnagargoje.in/scan"
--          -> expect newAlerts: []   (clean history must not alert)
--
--        curl "https://health-engine.akhileshnagargoje.in/outbreak?sector=5&n=25"
--          -> expect an alert on sector 5, roughly 8-12 sigma
--
--    If the first returns alerts, the backfill overlapped a busy hour — wait a
--    few minutes and scan again. If the second returns none, the baseline is
--    still elevated — re-read the BEFORE table above.
