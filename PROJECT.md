# Siddhi — Project Specification

> **Purpose of this file:** Complete context for any coding agent or developer joining this project.
> Read this fully before writing any code. See `PROGRESS.md` for current build status.

## What we are building

**Siddhi** — an outbreak early-warning and response system for mass gatherings (Kumbh Mela scale).

**The problem:** At a Kumbh-scale festival, millions of pilgrims live in a temporary tent city served by dozens of temporary clinics. Each doctor sees only their own queue. When 14 people from one sector fall ill across 4 different clinics and 3 shifts, every doctor sees a normal-looking handful and nobody sees "14" — that number exists nowhere until paper registers are tallied weeks later. By the time an outbreak is obvious it's day 4, there are hundreds of cases, and infected pilgrims have boarded trains to dozens of districts. The data to prevent it was collected; it never reached a decision-maker in time.

**The solution:** Capture every patient in ~10 seconds → pool all clinics into one live picture → let software detect the cluster → turn the alert into an assigned job that someone must close. The contaminated tap gets shut on day 1 evening instead of day 4. Result: ~35 cases instead of ~600.

**Historical basis:** The 2015 Harvard "Jana Swasthya" project at Nashik Kumbh proved health workers WILL enter data at scale (2,000+ visits logged on tablets on the first day, across 30+ clinics) — but it only drew charts. No detection, no alerts, no dispatch. Its own data showed antibiotics prescribed in up to 31% of encounters — recorded, never acted on. Siddhi is everything that should happen in the ten minutes AFTER the data is entered.

## The 90-second demo story (this is what we optimize for)

1. Dashboard is calm. Simulator is generating normal patient traffic.
2. Presenter enters a patient on a phone in ~10 seconds → it appears on the dashboard instantly.
3. Simulator's injected outbreak builds in Sector 12 → sector turns amber, then red.
4. Alert fires showing its arithmetic: "14 cases vs 4 expected in 6h".
5. Official clicks alert → sees cases came from 4 different clinics → taps Assign.
6. Crew phone buzzes → Acknowledge → Resolve ("cracked pipe at W-7, chlorinated").
7. Curve flattens. Story told.

## Users (3 logins, one web app)

| Role | Device | Screen | What they do |
|---|---|---|---|
| Health worker | Phone/tablet | Entry form | Log each patient in ~10s. Sees ONLY their clinic. |
| Health official | Desktop | Dashboard | Sector map, alerts, assign teams. NOTE: no PIN gate — the URL alone opens it. |
| Field responder | Phone | Task list | Acknowledge → investigate → resolve with note. |

**Pilgrims are NOT users.** No pilgrim app, ever. They receive a printed QR referral card only.

## Scope tiers

### TIER 1 — ESSENTIAL (build first; this alone = a complete hackathon project)
1. Database + seed data (sectors, clinics, symptoms, diagnoses)
2. Simulator — generates realistic patient traffic through the same API real tablets use; can inject an outbreak (exponential growth in one sector) at a chosen time
3. Detection engine — rolling baseline per sector per syndrome; alert when current 6h window > 3 standard deviations above baseline AND raw count ≥ 8 (minimum floor prevents small-number false alarms)
4. Officer dashboard — sector map colored by case load, live counters, alert feed with visible arithmetic, assign button
5. Doctor entry form — tap-based (age band, sex, symptoms, diagnosis, drugs), localStorage offline queue with sync counter
6. Crew task list — acknowledge / resolve with outcome + note; timestamps captured

### TIER 2 — after Tier 1 works end to end
7. Antibiotic nudge — rule table maps diagnosis → antibiotic usually needed yes/no; one-line non-blocking prompt when doctor picks antibiotic for a "no" diagnosis; clinic-vs-median rates on dashboard
8. QR referral card — auto-flag high BP / high sugar / TB symptoms; printable card with QR token; scannable record view
9. Polish: 60-second replay choreography of the demo story

### TIER 3 — roadmap only (mention in pitch, do NOT build)
Voice entry (Hindi/Marathi), SMS fallback, morning feedback card, demand forecasting, water-test fusion, LLM daily bulletin, IDSP export, rumor inbox, stampede triage mode, LoRa mesh, wearables, baseline transfer between festivals.

**Built anyway, deliberately, after the tiers were agreed:** the ORS-velocity
pharmacy signal (a second independent stream — worker/src/index.js), the
officer-approved public advisory page (/public), and the in-depth analysis tab
on the dashboard. Each was requested explicitly; this note exists so the tier
list stops contradicting the shipped app.

## Design rules (non-negotiable — do not "improve" these)

1. **Never block a doctor.** The antibiotic nudge is a question, not a gate. Any prompt is dismissible in one tap.
2. **Explainable maths only.** No ML in detection. Every alert shows observed, expected, and the threshold. Officials must be able to argue with an alert.
3. **Entry must stay ≤ 10 seconds.** Any feature that slows the entry form is rejected.
4. **Offline-first.** Entry form writes to localStorage first, syncs when possible. Records carry client-generated UUIDs so retried uploads never duplicate.
5. **Silence ≠ calm.** A sector that stops reporting must never render as healthy. IMPLEMENTED at sector level (the KPI shows "N of 12 sectors reporting") AND per-clinic, derived from the encounter stream rather than from clinics.last_report_at — see DashboardPage.jsx and viz.jsx, which name the quiet clinics. clinics.last_report_at remains unused.
6. **No pilgrim login.** Ever.
7. **Simulator writes through the same API as real clients.** Rows carry a simulated flag for cleanup only; detection does not read it, so synthetic and real traffic score identically.
8. **Config-driven festival.** Sectors, clinics, symptoms live in config. The mirrored DETECTION block was REMOVED from config/festival.js — it looked authoritative while being wired to nothing. Thresholds live in worker/src/index.js only; the simulator keeps its own copy for offline runs.

## Data model (9 tables, Supabase Postgres)

```sql
encounters   id uuid PK, ts timestamptz, clinic_id, sector int, age_band text,
             sex text, symptoms text[], diagnosis text, syndrome text,
             drugs text[], severity text, risk_flags text[], simulated bool
             -- syndrome is what detection groups on; it was missing here.
clinics      id text PK, name, sector int,
             type text (fixed|mobile), last_report_at timestamptz
             -- no lat/lng: this block used to claim them and setup.sql
             -- has never created them. The app reads clinic names from
             -- config/festival.js, not from this table.
baselines    sector int, syndrome text, mean_6h float, stddev_6h float,
             updated_at  (PK: sector+syndrome)
alerts       id uuid PK, sector int, syndrome text, observed int,
             expected float, score float, tier text (watch|act),
             ts timestamptz, status text (open|assigned|resolved),
             resolved_at timestamptz            -- db/resolved-at.sql
             advisory text, advisory_at, advisory_by  -- db/advisory.sql
tasks        id uuid PK, alert_id FK, assigned_unit text, created_at,
             ack_at timestamptz, resolved_at timestamptz,
             outcome text (fixed|nothing_found|escalated), note text
referrals    id uuid PK, encounter_id FK, risk_type text, qr_token text,
             home_district text, created_at

-- db/pharmacy.sql adds the second signal's three tables:
pharmacy_stalls   id text PK, name, sector int
pharmacy_sales    id uuid PK, ts, stall_id FK, sector int, item text, qty int
pharmacy_signals  sector int, window_start, observed int, expected float,
                  score float, elevated bool
```


### Post-resolution cooldown (not in the original spec — added after a rehearsal)

When an alert is resolved, the cases that triggered it are still inside the
six-hour window, so the very next scan would raise it again. Detection therefore
suppresses a NEW alert for that (sector, syndrome) pair for `WINDOW_H` after the
resolution, anchored on `alerts.resolved_at` (see `db/resolved-at.sql`), falling
back to the closing task's timestamp.

The trade is real and worth naming: a genuine second outbreak in the same pair
inside that window is missed. The crew that closed the job is expected to still
be watching the sector.

`/outbreak?sector=N` clears the suppression for the pair it injects into, and
only that pair. Without this the demo sabotaged itself — the run sheet says to
clear the board first, which puts every recently-alerting sector into cooldown,
so the demo injection raised nothing at all.

## Stack

- **Frontend:** React + Vite, plain CSS (no UI framework — keep it light). One codebase, ten routes — `/`, `/entry`, `/dashboard`, `/crew`, `/r`, `/replay`, `/demo`, `/about`, `/public`, `/insights`.
- **Backend:** Supabase — Postgres, Realtime (dashboard live updates), simple role handling. Detection runs as a scheduled/manually-invocable function.
- **Simulator:** Node script in `/simulator`, writes via Supabase client (same API as app).
- **Hosting:** Cloudflare Workers static assets (app) + a Cloudflare Worker with cron triggers (engine).
- **Auth for hackathon:** simple PIN → role mapping (hardcoded users in a config table). Do NOT build real auth flows; it's demo software.

## Festival config (seed data)

- 12 sectors (numbered 1–12), each with name, water points (e.g. W-7), kitchens (K-3)
- 17 clinics across 12 sectors (1–2 each, mix of fixed/mobile). Sectors 2, 4, 6, 7, 9, 10, 12 have a single clinic.
- Symptom chips: fever, loose motions, vomiting, cough, breathlessness, injury, dizziness, rash, weakness, dehydration (EN/HI/MR labels)
- Diagnoses: acute gastroenteritis, acute respiratory infection, heat exhaustion, injury/trauma, skin infection, fever of unknown origin, hypertension finding, diabetes finding, other
- Syndrome mapping for detection: diagnosis → syndrome group (GI, respiratory, heat, fever, injury, other). Screening findings (hypertension, diabetes) map to a seventh value that detection deliberately ignores.
- Drugs list incl. which are antibiotics (for Tier 2 nudge)

## Detection algorithm (exact spec)

Every 5 minutes (or on manual trigger for demo):
1. For each (sector, syndrome): count encounters in trailing 6h window.
2. Baseline = mean & stddev of the SAME 6h time-of-day window on each of the previous 3 days (phase-matched: windows 4, 8, 12 back). Comparing 6pm with 3am otherwise makes every evening look anomalous.
3. z = (observed − mean) / max(stddev, sqrt(mean), 1). The sqrt(mean) term is a Poisson noise floor — count data has inherent noise of about sqrt(mean), and without it a 3-sample stddev of 0 makes tiny numbers alert.
4. Fire alert if z ≥ 3 AND observed ≥ 8. Tier: "act" if z ≥ 4, else "watch".
5. Never duplicate an open alert for the same (sector, syndrome) — update its observed count instead.
6. Write alert row; dashboard picks it up via Realtime.

Crowd normalization (per-1000-present) is designed but NOT in Tier 1 — the simulator generates roughly constant traffic, so raw counts are correct for the demo. Note this honestly if asked.

## Team

4 people. Main dev (repo owner) + Claude do all critical-path code. Three teammates contribute: content verification (translations, antibiotic table), pitch/slides, testing + progress tracking, plus small isolated display components (QR card layout, PIN screen, morning card, about page, alert-explanation box, loading/empty states) built in sandboxes and merged by main dev.

## What NOT to do (for future agents)

- Do not add features outside the current tier without the owner asking.
- Do not add a pilgrim-facing login/app.
- Do not replace the z-score detection with ML.
- Do not add heavy UI frameworks or component libraries.
- Do not build real authentication.
- Do not make the entry form longer or slower.
- Keep all festival data in config/seed files.
