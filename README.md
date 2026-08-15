# Drishti

**Outbreak early warning for mass gatherings.**

Live: [drishti.akhileshnagargoje.in](https://drishti.akhileshnagargoje.in)

---

## The problem

At a Kumbh-scale gathering, millions of pilgrims live in a temporary tent city served by dozens of temporary clinics. Each doctor sees only their own queue.

When fourteen people from one sector fall ill across four different clinics and three shifts, every doctor sees a normal-looking handful — and nobody sees fourteen. That number exists nowhere until paper registers are tallied weeks later. By the time an outbreak is obvious it is day four, there are hundreds of cases, and infected pilgrims have already boarded trains to dozens of districts.

**The data needed to prevent it was collected. It never reached a decision-maker in time.**

The 2015 Harvard *Jana Swasthya* project at the Nashik Kumbh proved health workers will enter data at scale — 30,000 visits logged on tablets. But it only drew charts: no detection, no alerts, no dispatch. Its own data showed antibiotics prescribed in up to 31% of encounters, recorded and never acted on.

Drishti is everything that should happen in the ten minutes **after** the data is entered.

## What it does

Capture every patient in ~10 seconds → pool all clinics into one live picture → let software detect the cluster → turn the alert into an assigned job someone must close → carry the finding home with the patient.

The contaminated tap gets shut on day one evening instead of day four.

## The three roles

| Role | Route | Demo PIN | What they see |
|---|---|---|---|
| Health worker | `/entry` | `1111` | Tap-based patient entry, works offline |
| Health official | `/dashboard` | — | Sector map, epidemic curve, alerts, dispatch |
| Field responder | `/crew` | `3333` | Assigned jobs: acknowledge → resolve |

Plus `/replay` — replays a real recorded incident on a compressed clock, and `/r#…` — what a home-district clinician sees after scanning a referral card.

**Pilgrims are not users.** No app to install; they receive a printed QR card.

## Features

**Capture** — ~10 second tap entry, offline-first with a localStorage queue, duplicate-proof via client-generated UUIDs, immediate push when online with a 5s retry timer and an `online` event listener.

**Detect** — rolling baseline per sector per syndrome, phase-matched to the same time-of-day window over prior days. Fires when z ≥ 3 **and** raw count ≥ 8. A Poisson floor on the divisor suppresses small-number false alarms. Two tiers: watch and act. No ML — every alert shows its own arithmetic so officials can argue with it.

**Respond** — one-tap dispatch to a named crew, acknowledge and resolve timestamps captured automatically, giving a real time-to-response metric. "Checked, nothing found" is a first-class outcome.

**Treatment quality** — a non-blocking prompt when an antibiotic is chosen for a diagnosis that usually doesn't need one, plus a per-clinic prescribing panel against the festival median.

**Continuity** — high BP / high sugar / TB signs auto-flag and print a QR referral card. The QR carries the referral itself rather than a lookup key, so a village health centre can read it with no network and no app.

## Stack

- **Frontend** — React + Vite, plain CSS, no UI framework
- **Backend** — Supabase (Postgres + Realtime)
- **Engine** — Cloudflare Worker on cron: detection every 5 min, simulated traffic every 1 min
- **Hosting** — Cloudflare Workers static assets

Six tables: `encounters`, `clinics`, `baselines`, `alerts`, `tasks`, `referrals`.

## Running locally

```bash
# 1. database — paste db/setup.sql into the Supabase SQL editor and run it

# 2. app
cd app
cp .env.example .env      # fill in your Supabase URL + publishable key
npm install
npm run dev

# 3. seed some history and try it
cd ../simulator
npm install
node simulate.js backfill        # ~84h of realistic traffic
node detect.js once              # run one detection scan
node simulate.js outbreak 5      # inject a growing outbreak in sector 5
node simulate.js reset           # wipe simulated data
```

The simulator writes through the **same API** a real tablet uses, so the detection engine cannot tell simulated data from real.

## Deploying

```bash
cd app && npm run build && npx wrangler deploy      # the app
cd worker && npx wrangler deploy                    # the cron engine
```

## Design rules

These are deliberate and documented in `PROJECT.md`:

1. **Never block a doctor.** Every prompt is a question, dismissible in one tap.
2. **Explainable maths only.** No ML in detection.
3. **Entry stays ≤ 10 seconds.** Any feature that slows it is rejected.
4. **Offline-first.** The device is the source of truth until the server confirms.
5. **Silence ≠ calm.** A clinic that stops reporting shows grey, not healthy.
6. **No pilgrim login.** Ever.
7. **Config-driven.** Sectors, clinics, symptoms and thresholds live in config, so the same system redeploys to any mass gathering.

## Project docs

- `PROJECT.md` — full specification, scope tiers, data model
- `PROGRESS.md` — build status
- `db/setup.sql` — database schema and seed data

## Status

Tier 1 and Tier 2 complete and deployed. Roadmap (designed, not built): voice entry, SMS fallback, demand forecasting, pharmacy ORS-velocity signal, water-quality fusion, IDSP export.
