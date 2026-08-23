# Drishti

**Outbreak early warning for mass gatherings.**

Live: [drishti.akhileshnagargoje.in](https://drishti.akhileshnagargoje.in)

---

## The problem

At a Kumbh-scale gathering, millions of pilgrims live in a temporary tent city served by dozens of temporary clinics. Each doctor sees only their own queue.

When fourteen people from one sector fall ill across four different clinics and three shifts, every doctor sees a normal-looking handful — and nobody sees fourteen. That number exists nowhere until paper registers are tallied weeks later. By the time an outbreak is obvious it is day four, there are hundreds of cases, and infected pilgrims have already boarded trains to dozens of districts.

**The data needed to prevent it was collected. It never reached a decision-maker in time.**

The 2015 Harvard *Jana Swasthya* project at the Nashik Kumbh proved health workers will enter data at scale — 2,000+ visits logged on tablets across 30+ clinics on its first day. But it only drew charts: no detection, no alerts, no dispatch. Its own data showed antibiotics prescribed in up to 31% of encounters, recorded and never acted on.

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

Plus `/replay` — a scripted scenario running the live detection rule, on a compressed clock, and `/r#…` — what a home-district clinician sees after scanning a referral card.

**Pilgrims are not users.** No app to install; they receive a printed QR card.

## Features

**Capture** — ~10 second tap entry, offline-first with a localStorage queue, duplicate-proof via client-generated UUIDs, immediate push when online with a 5s retry timer and an `online` event listener.

**Detect** — rolling baseline per sector per syndrome, phase-matched to the same time-of-day window over prior days. Fires when z ≥ 3 **and** raw count ≥ 8. A Poisson floor on the divisor suppresses small-number false alarms. Two tiers: watch and act. No ML — every alert shows its own arithmetic so officials can argue with it.

**Respond** — dispatch to a named crew from the alert, acknowledge and resolve timestamps captured automatically, giving a real time-to-response metric. "Checked, nothing found" is a first-class outcome.

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

The simulator writes through the **same API** a real tablet uses, into the same tables. Rows carry a `simulated` flag for cleanup, and the detection engine does not read it — synthetic and real traffic are scored identically.

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
5. **Silence ≠ calm.** A clinic quiet for 3h is named on the dashboard; a sector whose every clinic has gone quiet renders as a blind spot, never as healthy.
6. **No pilgrim login.** Ever.
7. **Config-driven.** Sectors, clinics and symptoms live in config, so the same system redeploys to any mass gathering. *(Detection thresholds are still hardcoded in the worker — a known gap.)*

## Does it actually work?

Not an assertion — a measurement. `worker/eval/harness.mjs` runs the **deployed**
detection function (it imports `scoreCell` from the worker, not a copy) against
a thousand synthetic festivals, injecting an outbreak at a random sector and
hour, and reports what happened. Deterministic: the same seed gives the same
numbers on any machine.

```bash
cd worker && node eval/harness.mjs --trials 1000
```

Latest run — full output in [`worker/eval/RESULTS.txt`](worker/eval/RESULTS.txt):

| outbreak | caught | median lag | cases when we alert | cases if unaided |
|---|---|---|---|---|
| tiny (~1 case/hour) | 99% | 16.0h | 9 | 26 |
| small, self-limiting | 100% | 9.0h | 8 | 48 |
| slow (doubles every 6h) | 100% | 10.0h | 9 | 39 |
| typical (doubles every 4h) | 100% | 7.0h | 8 | 33 |
| fast (doubles every 2.5h) | 100% | 5.0h | 8 | 27 |

**A typical waterborne outbreak is caught a median of 7 hours after the first
case, at 8 cases — against 33 cases before the cluster would be obvious to
someone reading a chart.**

False alarms on festivals where nothing is wrong, split by what they cost:

| tier | what it does | per festival-day |
|---|---|---|
| act | dispatches a crew | **1.4** |
| watch | appears on the dashboard, nobody is sent | 5.4 |

The harness also sweeps the threshold, so the trade is explicit rather than
asserted: dropping to z ≥ 2 buys about 3 hours of lag and costs 17.7 alerts a
day; raising to z ≥ 5 cuts alerts to 0.8 a day and costs 3 hours. z ≥ 3 is
where we chose to sit, and the table is why.

**What it does not prove.** The festivals are synthetic, generated from the same
distributions as our simulator, so this measures the detector against our model
of a Kumbh — not against a real one. Detection at these outbreak sizes is not
the hard part; not crying wolf is, which is why the false-alarm cost is
reported by tier.

## Sources

The headline figures are published, not folkloric:

- **Antibiotic prescribing of up to 31% of encounters** at the 2013/2015 Melas: [Shaikh et al., *JMIR Public Health and Surveillance* 2023](https://publichealth.jmir.org/2023/1/e45121) (also on [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10034612/)).
- **The Jana Swasthya Project / EMcounter** — digital syndromic surveillance plus mass screening, 2,000+ visits on day one across 30+ clinics on government tablets: [Harvard Mittal South Asia Institute](https://mittalsouthasiainstitute.harvard.edu/2018/05/the-jana-swasthya-project-at-the-2015-kumbh-mela/); raw data on [Harvard Dataverse](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/WCEWNR).

## Project docs

- `PROJECT.md` — full specification, scope tiers, data model
- `PROGRESS.md` — build status
- `db/setup.sql` — database schema and seed data

## Status

Tier 1 and Tier 2 complete and deployed. Roadmap (designed, not built): voice entry, SMS fallback, demand forecasting, pharmacy ORS-velocity signal, water-quality fusion, IDSP export.
