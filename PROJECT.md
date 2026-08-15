# Drishti — Project Specification

> **Purpose of this file:** Complete context for any coding agent or developer joining this project.
> Read this fully before writing any code. See `PROGRESS.md` for current build status.

## What we are building

**Drishti** — an outbreak early-warning and response system for mass gatherings (Kumbh Mela scale).

**The problem:** At a Kumbh-scale festival, millions of pilgrims live in a temporary tent city served by dozens of temporary clinics. Each doctor sees only their own queue. When 14 people from one sector fall ill across 4 different clinics and 3 shifts, every doctor sees a normal-looking handful and nobody sees "14" — that number exists nowhere until paper registers are tallied weeks later. By the time an outbreak is obvious it's day 4, there are hundreds of cases, and infected pilgrims have boarded trains to dozens of districts. The data to prevent it was collected; it never reached a decision-maker in time.

**The solution:** Capture every patient in ~10 seconds → pool all clinics into one live picture → let software detect the cluster → turn the alert into an assigned job that someone must close. The contaminated tap gets shut on day 1 evening instead of day 4. Result: ~35 cases instead of ~600.

**Historical basis:** The 2015 Harvard "Jana Swasthya" project at Nashik Kumbh proved health workers WILL enter data at scale (30,000 visits logged on tablets) — but it only drew charts. No detection, no alerts, no dispatch. Its own data showed antibiotics prescribed in up to 31% of encounters — recorded, never acted on. Drishti is everything that should happen in the ten minutes AFTER the data is entered.

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
| Health official | Desktop | Dashboard | Sector map, alerts, assign teams. Sees everything. |
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
Voice entry (Hindi/Marathi), SMS fallback, morning feedback card, demand forecasting, ORS-velocity pharmacy signal, water-test fusion, LLM daily bulletin, IDSP export, rumor inbox, stampede triage mode, LoRa mesh, wearables, baseline transfer between festivals.

## Design rules (non-negotiable — do not "improve" these)

1. **Never block a doctor.** The antibiotic nudge is a question, not a gate. Any prompt is dismissible in one tap.
2. **Explainable maths only.** No ML in detection. Every alert shows observed, expected, and the threshold. Officials must be able to argue with an alert.
3. **Entry must stay ≤ 10 seconds.** Any feature that slows the entry form is rejected.
4. **Offline-first.** Entry form writes to localStorage first, syncs when possible. Records carry client-generated UUIDs so retried uploads never duplicate.
5. **Silence ≠ calm.** A clinic that stops reporting shows GREY on the map, not pale/healthy.
6. **No pilgrim login.** Ever.
7. **Simulator writes through the same API as real clients.** Detection must not be able to tell simulated data from real.
8. **Config-driven festival.** Sectors, clinics, symptoms, thresholds live in seed/config files, not hardcoded in components.

## Data model (6 tables, Supabase Postgres)

```sql
encounters   id uuid PK, ts timestamptz, clinic_id, sector int, age_band text,
             sex text, symptoms text[], diagnosis text, drugs text[],
             severity text, risk_flags text[]
clinics      id text PK, name, sector int, lat float, lng float,
             type text (fixed|mobile), last_report_at timestamptz
baselines    sector int, syndrome text, mean_6h float, stddev_6h float,
             updated_at  (PK: sector+syndrome)
alerts       id uuid PK, sector int, syndrome text, observed int,
             expected float, score float, tier text (watch|act),
             ts timestamptz, status text (open|assigned|resolved)
tasks        id uuid PK, alert_id FK, assigned_unit text, created_at,
             ack_at timestamptz, resolved_at timestamptz,
             outcome text (fixed|nothing_found|escalated), note text
referrals    id uuid PK, encounter_id FK, risk_type text, qr_token text,
             home_district text, created_at
```

## Stack

- **Frontend:** React + Vite, plain CSS (no UI framework — keep it light). One codebase, three routes: `/entry`, `/dashboard`, `/crew`.
- **Backend:** Supabase — Postgres, Realtime (dashboard live updates), simple role handling. Detection runs as a scheduled/manually-invocable function.
- **Simulator:** Node script in `/simulator`, writes via Supabase client (same API as app).
- **Hosting:** Vercel or Netlify (decide at deploy time).
- **Auth for hackathon:** simple PIN → role mapping (hardcoded users in a config table). Do NOT build real auth flows; it's demo software.

## Festival config (seed data)

- 12 sectors (numbered 1–12), each with name, water points (e.g. W-7), kitchens (K-3)
- ~25 clinics spread across sectors (2–3 per sector, mix of fixed/mobile)
- Symptom chips: fever, loose motions, vomiting, cough, breathlessness, injury, dizziness, rash, weakness (EN/HI/MR labels)
- Diagnoses: acute gastroenteritis, acute respiratory infection, heat exhaustion, injury/trauma, skin infection, fever of unknown origin, hypertension finding, diabetes finding, other
- Syndrome mapping for detection: diagnosis → syndrome group (GI, respiratory, heat, injury, other)
- Drugs list incl. which are antibiotics (for Tier 2 nudge)

## Detection algorithm (exact spec)

Every 5 minutes (or on manual trigger for demo):
1. For each (sector, syndrome): count encounters in trailing 6h window.
2. Baseline = mean & stddev of the same 6h-window counts over trailing 72h (excluding windows already inside an open alert's timespan).
3. z = (observed − mean) / max(stddev, 1).
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
