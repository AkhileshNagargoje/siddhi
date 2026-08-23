# Siddhi

**Outbreak early warning for mass gatherings.**

Live: [siddhi.akhileshnagargoje.in](https://siddhi.akhileshnagargoje.in)

---

## The problem

At a Kumbh-scale gathering, millions of pilgrims live in a temporary tent city served by dozens of temporary clinics. Each doctor sees only their own queue.

When fourteen people from one sector fall ill across four different clinics and three shifts, every doctor sees a normal-looking handful — and nobody sees fourteen. That number exists nowhere until paper registers are tallied weeks later. By the time an outbreak is obvious it is day four, there are hundreds of cases, and infected pilgrims have already boarded trains to dozens of districts.

**The data needed to prevent it was collected. It never reached a decision-maker in time.**

The 2015 Harvard *Jana Swasthya* project at the Nashik Kumbh proved health workers will enter data at scale — 2,000+ visits logged on tablets across 30+ clinics on its first day. But it only drew charts: no detection, no alerts, no dispatch. Its own data showed antibiotics prescribed in up to 31% of encounters, recorded and never acted on.

Siddhi is everything that should happen in the ten minutes **after** the data is entered.

## What it does

Capture every patient in ~10 seconds → pool all clinics into one live picture → let software detect the cluster → turn the alert into an assigned job someone must close → carry the finding home with the patient.

The contaminated tap gets shut on day one evening instead of day four.

## The three roles

| Role | Route | Demo PIN | What they see |
|---|---|---|---|
| Health worker | `/entry` | `1111` | Tap-based patient entry, works offline |
| Health official | `/dashboard` | — | Sector map, epidemic curve, alerts, dispatch |
| Field responder | `/crew` | `3333` | Assigned jobs: acknowledge → resolve |

Plus `/replay` — a scripted animation of one scenario on a compressed clock. It
uses the timings the detector produces; it does not itself run the detector; `/r#…` — what a home-district clinician sees after scanning a
referral card; `/public` — the pilgrim-facing advisory page reached from a
printed poster; `/demo` — the presenter's console; `/about` — the sourced
one-pager; and `/insights` — the analysis view, which is also the second tab on
the dashboard. Ten routes in all.

**Pilgrims are not users.** No app to install; they receive a printed QR card.

## Features

The live board carries **what's driving it** — the syndrome mix over the last six
hours with a direction for each, sitting directly under the epidemic curve
because it answers the question the curve raises: the line is going up, up with
*what*. That is an operational readout, so it belongs on the board rather than
in the analysis tab.

**In-depth analysis** — a second tab on the health official's own dashboard,
because they are the person who needs it and sending them to a different address
to find it was the wrong shape. Live stays the default tab, so the control room
keeps the glanceability that matters during an incident. Ranked bars for diagnoses, small multiples for how each
illness is moving, a pie beside a horizontal stacked bar for the syndrome mix,
meters for antibiotic share, severity and age, and a table grouped by category with per-group subtotals, where every row
expands into a computed breakdown. A 6h / 24h / 3-day selector scopes all of it. Forms are picked by the
job: ranking uses one hue with length carrying magnitude, part-to-whole uses a
shared baseline with printed shares, and a ratio against a
reference uses a meter. A pie sits beside the stacked bar for the syndrome mix —
the pie makes "one illness dominates" immediate, the shared baseline is what you
use to compare the small slices. Every mark on the ranking, pie and stacked bar is interactive (the small
multiples and the meters are not): hovering or focusing a
slice, segment or bar gives a readout with the value leading and the label
following, and clicking one opens a breakdown of the rows behind it — where it
is, how severe, the antibiotic rate, and its per-hour trend. Selection is shared,
so picking a syndrome in the pie also marks it in the stacked bar and the legend.
The six categorical hues are validated in both themes —
worst adjacent colour-blind separation dE 9.1 light / 8.4 dark.

**What the doctor gets back** — a "My clinic" tab behind the entry form: the sector
alert with something clinically actionable, the whole sector's 6-hour total across
every clinic in it (the aggregate no single tent can see, with their own share of
it), their own day, a 12-hour trend that answers "is this building?", and their
antibiotic share beside the festival median with no verdict attached. It sits
behind a tab so the ten-second path never renders it — measured at 2.2s.

**Capture** — ~10 second tap entry, offline-first with a localStorage queue, duplicate-proof via client-generated UUIDs, immediate push when online with a 5s retry timer and an `online` event listener.

Offline goes one layer deeper than the queue. A service worker (`app/public/sw.js`) caches the app shell, so the entry screen *boots* with no network at all — not just survives losing one mid-shift. HTML is network-first so a fresh deploy always wins; hashed assets are cache-first, which is safe because their bytes can never change. Supabase and engine responses are never cached: a doctor must not read yesterday's alert as if it were live. Open any URL with `?nosw` to tear the whole thing out.

**Detect** — rolling baseline per sector per syndrome, phase-matched to the same time-of-day window over prior days. Fires when z ≥ 3 **and** raw count ≥ 8. A Poisson floor on the divisor suppresses small-number false alarms. Two tiers: watch and act. No ML — every alert shows its own arithmetic so officials can argue with it.

**Respond** — dispatch to a named crew from the alert, acknowledge and resolve timestamps captured automatically, giving a real time-to-response metric. "Checked, nothing found" is a first-class outcome.

**Treatment quality** — a non-blocking prompt when an antibiotic is chosen for a diagnosis that usually doesn't need one, plus a per-clinic prescribing panel against the festival median.

**Corroborate** — a second, independent stream. Pharmacy stalls tally rehydration sales, scored by the same function against the same phase-matched baseline. People self-medicate before they consult, so it leads clinic cases and catches those who never reach a clinic at all. A clinical alert is shown as corroborated or not: two signals with different reporters and different failure modes agreeing is evidence in a way one signal repeated is not — and *not* corroborated is useful too, since clinic cases rising without a rehydration spike is a hint that the cluster may not be waterborne.

**Continuity** — high BP / high sugar / TB signs auto-flag and print a QR referral card. The QR carries the referral itself rather than a lookup key, so a village health centre can read it with no network and no app.

## Stack

- **Frontend** — React + Vite, plain CSS, no UI framework
- **Backend** — Supabase (Postgres + Realtime)
- **Engine** — Cloudflare Worker on cron: detection every 5 min, simulated traffic every 1 min
- **Hosting** — Cloudflare Workers static assets

Nine tables: `encounters`, `clinics`, `baselines`, `alerts`, `tasks`,
`referrals`, plus `pharmacy_sales`, `pharmacy_signals`, `pharmacy_stalls`.

## Running locally

```bash
# 1. database — in the Supabase SQL editor, run IN THIS ORDER:
#      db/setup.sql  db/pharmacy.sql  db/advisory.sql  db/resolved-at.sql  db/harden.sql
#    setup alone gives you an app whose corroboration and advisory features throw.

# 2. app
cd app
cp .env.example .env      # fill in your Supabase URL + publishable key
npm install
npm run dev

# 3. seed some history and try it
cd ../simulator
npm install
node simulate.js backfill        # ~84h of realistic traffic
node simulate.js pharmacy        # ~84h of pharmacy sales — WITHOUT THIS the
                                 # corroboration signal has no baseline and the
                                 # second-signal demo shows nothing
node detect.js once              # run one detection scan
node simulate.js outbreak 5      # inject a growing outbreak in sector 5
# NOTE: `node simulate.js reset` no longer works — db/harden.sql removed DELETE
# from the public key. To reset, open /demo and press "Clear the board", or run
# db/cleanup.sql in the SQL editor.
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
| tiny (~1 case/hour) | 98% | 15.0h | 9 | 26 |
| small, self-limiting | 100% | 9.0h | 8 | 48 |
| slow (doubles every 6h) | 100% | 10.0h | 9 | 41 |
| typical (doubles every 4h) | 100% | 7.0h | 8 | 33 |
| fast (doubles every 2.5h) | 100% | 5.0h | 8 | 28 |

**A typical waterborne outbreak is caught a median of 7 hours after the first
case, at 8 cases — against 33 cases before the cluster would be obvious to
someone reading a chart.**

False alarms on festivals where nothing is wrong, split by what they cost:

| tier | what it does | per festival-day |
|---|---|---|
| act | dispatches a crew | **1.5** |
| watch | appears on the dashboard, nobody is sent | **5.4** |

The harness also sweeps the threshold, so the trade is explicit rather than
asserted: dropping to z ≥ 2 buys **one hour** of lag (7.0h → 6.0h) and costs
2.6× the alerts (6.8 → 17.7 a day); raising to z ≥ 5 saves alerts (0.8 a day)
and costs two hours (7.0h → 9.0h). z ≥ 3 is
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

Tier 1 and Tier 2 complete and deployed, plus the pharmacy corroboration
signal, the officer-approved public advisory page, and the in-depth analysis
tab. Roadmap (designed, not built): voice entry, SMS fallback, demand
forecasting, water-quality fusion, IDSP export.
