# Siddhi — Progress Tracker

> Update rule: whoever finishes a task updates its line IMMEDIATELY, same sitting.
> Status values: `todo` / `doing` / `done` / `blocked` / `cut`

## Current state

- **Latest pass (audit + polish):** every route now measures zero text-contrast failures in both light and dark mode, verified against computed backgrounds in the live DOM rather than against the palette. Every form control has an accessible name. Routes are code-split (main bundle 527 KB -> 443 KB; the pilgrim page is 6 KB), the app boots offline via a service worker, and `/demo` and `/about` are built. Fixed three bugs found on the way: a service worker that cached the SPA fallback under `.js` URLs and served HTML as a module permanently; a stale-chunk crash for anyone with the app open during a deploy; and a demo console that was dead under StrictMode, so it worked in production but not in `npm run dev`.
- **Doctor-facing feedback:** the "My clinic" tab now shows the sector-wide 6h total across all clinics and the clinic's own 12h trend, not just its own counts. Entry path re-measured at 2.2s, unchanged.
- **Before presenting:** open `/demo` and press "Clear the board".
- **`db/resolved-at.sql` has been run.** Verified live: cleared 7 alerts, all stamped, immediate rescan raised 0 — the same rescan raised all 7 back before the migration. Counter-checked that detection is not deaf: a fresh outbreak in a sector outside the cooldown still fired at 15.5 sigma, while a suppressed sector stayed suppressed under 40 more injected cases.
- **Superseded by the above:** routes code-split (main bundle 527 KB -> 443 KB; the public pilgrim page is now 6 KB), offline service-worker shell so the app boots with no network, `/demo` presenter console and `/about` both built and live, per-route page titles, all screens verified with no horizontal scroll and 44px touch targets on a phone.
- **What runs right now:** Tier 1 and Tier 2 complete and deployed — entry form (offline queue), dashboard (realtime), detection, crew app. Full demo loop verified end to end locally.
- **How to run it:** `cd app && npm run dev` → http://localhost:5173 · simulator: `cd simulator && node simulate.js backfill|live|outbreak <sector>` (`reset` no longer works — harden.sql removed DELETE; use /demo → Clear the board, or db/cleanup.sql) · detection: `node detect.js once|watch`
- **Known broken:** —
- **Database:** hardened. Public key can SELECT/INSERT/UPDATE only; DELETE is blocked (db/harden.sql). Cleanup therefore runs from the Supabase SQL Editor via db/cleanup.sql, not from a script.
- **Live URL:** https://siddhi.akhileshnagargoje.in (deploy: cd app && npm run build && npx wrangler deploy)
- **Engine (cloud):** https://siddhi-engine.akhileshnagargoje.in — Cloudflare Worker, 2 crons: detection every 5 min, live traffic every 1 min. Endpoints: /scan, /traffic, /outbreak?sector=5&n=25
- **Deploy commands:** app: `cd app && npm run build && npx wrangler deploy` · engine: `cd worker && npx wrangler deploy`
- **Next up:** open /demo and press "Clear the board" right before presenting. Then: rehearse, and the teammate components (SectorDetail, AgeChart, MorningCard are still stubs). The 31% and Harvard figures are sourced on the About page; the unsourced "30,000 visits" claim has been replaced everywhere with the sourced "2,000+ on day one".

## Tier 1 — Essential (the demo path)

| # | Task | Status | Who | Notes |
|---|---|---|---|---|
| 0.1 | PROJECT.md + PROGRESS.md + CLAUDE.md | done | Claude | |
| 0.2 | React+Vite skeleton (now 10 routes) | done | Claude | |
| 0.3 | Supabase project + 6 tables | done | Claude + owner | needs owner's Supabase account |
| 0.4 | Seed/config data files (sectors, clinics, symptoms, diagnoses, drugs) | done | Claude | Person A verifies translations later |
| 1.1 | Simulator: normal traffic generator | done | Claude | |
| 1.2 | Simulator: outbreak injection | done | Claude | |
| 2.1 | Detection engine (baseline + z-score + alert writing) | done | Claude | |
| 3.1 | Dashboard: sector map + live counters | done | Claude | |
| 3.2 | Dashboard: alert feed + alert detail + assign | done | Claude | |
| 4.1 | Entry form: tap-based, ≤10s | done | Claude | |
| 4.2 | Entry form: offline queue + sync counter | done | Claude | |
| 5.1 | Crew app: task list + ack/resolve | done | Claude | |
| 6.1 | Deploy — Cloudflare Workers static assets | done | Claude | https://siddhi.akhileshnagargoje.in |
| 6.2 | End-to-end demo run works | done | all | |

## Tier 2 — only after ALL Tier 1 is done

| # | Task | Status | Who | Notes |
|---|---|---|---|---|
| 7.1 | Antibiotic rule table + nudge in entry form | done | | table drafted by Claude, verified by Person A |
| 7.2 | Clinic-vs-median antibiotic panel on dashboard | done | | |
| 8.1 | Risk flagging + QR referral card | done | | card layout by Person A |
| 9.1 | 60-second replay (scripted scenario, live detection rule) | done | | |

## Teammate tasks

| Task | Status | Who | Notes |
|---|---|---|---|
| Verify symptom/diagnosis/drug translations (HI/MR) | todo | Person A | sheets generated by Claude |
| Verify antibiotic yes/no table vs WHO link | todo | Person A | |
| QR card layout component | todo | Person A | sandbox link TBD |
| PIN login screen component | todo | Person A | sandbox link TBD |
| Pitch story written + rehearsed | todo | Person B | |
| Slide deck | todo | Person B | after screenshots exist |
| Morning card + About page components | todo | Person B | sandbox link TBD |
| Learn GitHub web edit + own this file | todo | Person C | |
| Test checklist run on deployed app | todo | Person C | checklist by Claude |
| Alert-explanation box + loading/empty states | todo | Person C | sandbox link TBD |

## Decisions log

- 2026-08-16: Industry dataviz pass applied (dataviz skill): tabular-nums scoped to columns only, stewardship panel got median reference tick + icon+label for above-median (never color alone), epi curve got pointer events + persistent end marker + table-view twin, sparkline end-dot got surface ring. Sequential ramps verified monotonic in OKLab; heatmap contrast relief = direct labels on every cell.

- 2026-08-15: Scope locked to PROJECT.md tiers. Tier 1 first, nothing else until it runs end to end.
- 2026-08-15: Claude writes all critical-path code. Teammates get isolated display components only.
- 2026-08-15: Crowd normalization designed but deferred from Tier 1 (simulator traffic is constant).

## Cut list (pre-agreed, cut in this order if time runs out)

1. Voice entry (already Tier 3)
2. Morning feedback card
3. Forecasting
4. SMS fallback
5. QR card printing (degrade to on-screen display)
