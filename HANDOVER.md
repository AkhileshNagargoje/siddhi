# Siddhi — Complete Handover

**Everything needed to continue this project from a different machine, a
different account, or with a different assistant.** Nothing here assumes access
to any past conversation.

Written 2026-08-24. If you change infrastructure, change this file.

---

## 0. READ THIS FIRST — what is actually at risk

| Thing | Where it lives | Safe if this laptop dies? |
|---|---|---|
| Committed code (53 commits) | GitHub `AkhileshNagargoje/siddhi` | **Yes** — pushed, `main` matches `origin/main` |
| **Uncommitted code (6 files)** | This laptop only | **NO — see §1** |
| Database + all data | Supabase cloud | Yes — tied to the Supabase account, not this laptop |
| Live sites | Cloudflare account | Yes — tied to the Cloudflare account |
| Domain `akhileshnagargoje.in` | Registrar + Cloudflare DNS | Yes |
| The 18 documentation files | GitHub | Yes |

**The only irreplaceable thing on this laptop is the uncommitted work.**
Everything else is in a cloud account you own.

### The accounts that matter — losing any one of these hurts

1. **GitHub** — `AkhileshNagargoje` → repo `siddhi` (named before the project was
   renamed to Siddhi; the repo name was never changed, this is cosmetic only).
2. **Supabase** — project `ommnjuedmzffiawhkdqi`. Holds every table and every row.
   **This is the one with no backup.** If the account goes, the data goes.
   `db/*.sql` can rebuild the *schema* from scratch, and the simulator can
   regenerate *fake* data — but any real hand-entered clinic rows are gone.
3. **Cloudflare** — two Workers (`siddhi`, `siddhi-engine`), the custom domains,
   and the DNS for `akhileshnagargoje.in`.

Nothing depends on any AI assistant account. Losing that costs you help, not work.

---

## 1. Uncommitted work — do this before anything else

As of writing, six files exist only on this laptop:

```
 M app/src/App.css                  styling for the pilgrim tabs, stall page, disease cards
 M app/src/config/medical.js        AGE_MIX constant + SEVERITIES became objects
 M app/src/pages/PublicPage.jsx     the entire rebuilt pilgrim page
 M simulator/simulate.js            syntax fix that unblocked the backfill
?? app/src/config/precautions.js    NEW — all age-targeted advice + disease info
?? db/reset-baseline.sql            NEW — baseline reset procedure
```

`precautions.js` is several hundred lines of trilingual health content. It is not
recoverable by re-running anything.

```bash
git add -A && git commit -m "Pilgrim page: multi-illness view, disease detail, targeted precautions" && git push
```

---

## 2. What this project is

An **outbreak early-warning system for mass gatherings** — built for Kumbhathon
(Nashik), extending the 2015 Harvard "Jana Swasthya" work at the Nashik Kumbh Mela.

**The problem.** At a festival of millions, every clinic treats its own patients
well. Nobody compares across clinics. A waterborne outbreak in one sector is
invisible for days because no single doctor sees enough of it to notice — each
one sees "a few extra loose-motion cases today", which is a normal Tuesday.

**What we do.** Doctors log each visit in under ten seconds. Every five minutes
the system compares each area against *its own* recent history and flags the
cells that are genuinely unusual. A crew gets dispatched. Pilgrims see a plain
advisory for their area.

**What we deliberately do not do.** No ML. No pilgrim app or login. No blocking
the doctor. The detection is a z-score anybody can check by hand — because a
health official has to be able to ask "why did this fire?" and get an answer.

Full spec: `PROJECT.md`. Scope tiers and hard rules live there and are binding.

---

## 3. Live URLs

| What | URL |
|---|---|
| App (all screens) | https://health.akhileshnagargoje.in |
| Detection engine | https://health-engine.akhileshnagargoje.in |
| Repo | https://github.com/AkhileshNagargoje/siddhi |
| Supabase API | https://ommnjuedmzffiawhkdqi.supabase.co |

### Routes

| Path | Who | Access |
|---|---|---|
| `/` | everyone | role picker (shows 3 cards) |
| `/entry` | health worker | PIN **1111** |
| `/dashboard` | health official | open |
| `/insights` | health official | in-depth analysis |
| `/public` | pilgrim | open — `?s=5` preselects an area |
| `/stall` | medicine stall | PIN **4444** |
| `/crew` | field crew | route live, card hidden from home |
| `/replay` | presenter | route live, card hidden from home |
| `/demo` | presenter | control console — **"Clear the board" lives here** |
| `/about` | everyone | sources and claims |

The PINs are demo theatre, not security. There is no real auth anywhere, by design.

### Engine endpoints

```bash
curl "https://health-engine.akhileshnagargoje.in/scan"
```
```bash
curl "https://health-engine.akhileshnagargoje.in/traffic"
```
```bash
curl "https://health-engine.akhileshnagargoje.in/outbreak?sector=5&n=25"
```

`/scan` runs detection now, `/traffic` generates one slice of live traffic,
`/outbreak` injects a demo outbreak into a sector.

---

## 4. Credentials

**There are no private secrets in this project.** That is deliberate.

```
SUPABASE_URL = https://ommnjuedmzffiawhkdqi.supabase.co
SUPABASE_KEY = sb_publishable_P2D7fSeuoaqc1tgURDXeoA_dDfff-Dk
```

This is the *publishable* (anon) key. It ships inside the frontend JavaScript
bundle, so it is public by construction — hiding it would be theatre. What
protects the database is **Row Level Security**, applied by `db/harden.sql`:
this key may `SELECT`, `INSERT`, and `UPDATE`. It may **not** `DELETE`.

That is why cleanup runs from the Supabase SQL Editor and not from a script.

Where the key is configured:
- `app/.env` — gitignored, so **recreate it on a new machine** from `app/.env.example`
- `worker/wrangler.jsonc` — committed as a plain var, so any teammate can redeploy
- `simulator/detect.js`, `simulator/simulate.js` — hardcoded

The **service-role** key is not used anywhere and must never be put in this repo.

To recreate `app/.env` on a new machine, create the file with these two lines:

```
VITE_SUPABASE_URL=https://ommnjuedmzffiawhkdqi.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_P2D7fSeuoaqc1tgURDXeoA_dDfff-Dk
```

---

## 5. Stack

- **Frontend** — React 19 + Vite 8, `react-router-dom` 7, code-split lazy routes.
  No UI framework, no CSS framework. Design tokens in `app/src/styles/tokens.css`,
  everything else in one `App.css`. Offline service worker at `app/public/sw.js`.
- **Database** — Supabase (Postgres + PostgREST + Realtime). The dashboard
  subscribes to realtime changes; no polling for alerts.
- **Detection engine** — a second Cloudflare Worker, plain JS, zero dependencies.
  Two crons: `*/5 * * * *` runs detection, `* * * * *` generates live traffic so
  the demo is never a dead screen.
- **Hosting** — Cloudflare Workers static assets (**not** Pages — Pages upload
  returned bare 500s during setup and Cloudflare now recommends Workers anyway).

Deliberate absences: no backend server of our own, no ORM, no state library, no
component library, no ML, no auth provider.

Dependencies, complete:

- app: `@supabase/supabase-js`, `react`, `react-dom`, `react-router-dom`,
  `@fontsource-variable/inter`, `qrcode-generator`; dev: `vite`,
  `@vitejs/plugin-react`, `oxlint`, React types
- worker: none at runtime; dev: `wrangler`
- simulator: `@supabase/supabase-js`

---

## 6. Repository layout

```
/app                    React frontend
  src/pages/            one file per route
  src/components/       shared UI (viz.jsx holds every chart primitive)
  src/config/           festival.js (sectors/clinics), medical.js (symptoms,
                        diagnoses, drugs, AGE_MIX, SEVERITIES),
                        precautions.js (age-targeted advice + DISEASE_INFO)
  src/lib/              supabase.js, uuid.js, referral.js
  src/styles/tokens.css design tokens — light and dark, both hand-tuned
  wrangler.jsonc        deploy config for the app

/worker                 detection engine
  src/index.js          scoreCell(), scan(), cron handlers, HTTP endpoints
  eval/harness.mjs      1,000-festival evaluation
  eval/RESULTS.txt      its output — the numbers quoted in the pitch
  test/score.test.mjs   unit tests for the scoring function
  wrangler.jsonc        deploy config + crons

/simulator              local tooling (writes through the same API as the app)
  simulate.js           backfill | live | outbreak <sector> | pharmacy
  detect.js             once | watch — local copy of the detector

/db                     SQL, run by hand in the Supabase SQL Editor
```

**Rule from `CLAUDE.md`:** the simulator must write through the same API as the
real app. Never let it touch the database directly — if it did, it would stop
being a test of the real path.

---

## 7. The detection algorithm — in full

This is the core of the project. It is small on purpose.

For every **(sector, syndrome)** pair — 12 sectors × 6 syndromes = 72 cells:

1. **Observed** = number of encounters in the **last 6 hours**.
2. **Baseline** = the same 6-hour slot on each of the previous 3 days
   (window indices **4, 8, 12** counting back in 6-hour steps).
3. `mean` and `stddev` of those three numbers.
4. **Score:**

   ```
   z = (observed − mean) / max(stddev, √mean, 1)
   ```

5. **Fire** when `z ≥ 3` **AND** `observed ≥ 8`.
   Tier is `act` when `z ≥ 4`, otherwise `watch`.

### Why each piece exists

**Why phase-matched (windows 4/8/12, not the last 12 windows).**
Compare an afternoon against previous afternoons. Averaged against quiet night
windows, every single afternoon looks like an outbreak.

**Why `max(stddev, √mean, 1)` — the Poisson floor.**
Three quiet days in a row can give `stddev = 0`, which makes `z` infinite and
every cell screams. Count data has irreducible noise of about `√mean`, so the
divisor is never allowed below that. The final `1` covers `mean = 0`.

**Why `observed ≥ 8`.**
Without it, 1 case against a baseline of 0 scores infinitely. Eight is the
smallest count that is worth a human walking somewhere.

**Why z = 3.**
From the sweep in `worker/eval/RESULTS.txt`: lower catches marginally more but
buries the dashboard in noise; higher saves few false alarms and costs hours of
detection lag. Three is where the curve bends.

### Measured performance — `worker/eval/RESULTS.txt`

1,000 synthetic festivals per row, seed 42, 96h each, importing the **deployed**
`scoreCell()` rather than a copy.

| Outbreak speed | caught | median lag | cases when we alert | cases if unaided |
|---|---|---|---|---|
| tiny (~1/hour) | 98% | 15h | 9 | 26 |
| small, self-limiting | 100% | 9h | 8 | 48 |
| slow (doubles/6h) | 100% | 10h | 9 | 41 |
| **typical (doubles/4h)** | **100%** | **7h** | **8** | **33** |
| fast (doubles/2.5h) | 100% | 5h | 8 | 28 |

False alarms, nothing wrong anywhere: **act 1.5/day**, **watch 5.4/day**.

**State this honestly.** The harness generates traffic as a pure Poisson draw.
The simulator uses `mean × (0.6 + random × 0.8)`, which is *overdispersed* —
more variable than Poisson. Run a clean backfill and you will see well over 6.8
alerts, because the detector's noise floor assumes Poisson and the simulator is
not. Neither model is wrong; they describe different worlds. The honest claim is
"6.8/day under a Poisson traffic model, more under bursty traffic — the real
number depends on how bursty real festival traffic is." `TECH-QA-STATS.md`
carries this caveat and you should not drop it under questioning.

### Known, accepted weakness

**One noisy historical day desensitises a cell.** If a sector genuinely had a
huge day three days ago, its baseline mean and stddev both rise, and it goes
partially deaf for the next 72 hours. This is documented in
`worker/test/score.test.mjs` as accepted behaviour, and it has bitten this
project in practice: repeated demo injections gave sector 5 a baseline of
`[171, 6, 5]` — it needed roughly **295 cases** before it would say anything.
The fix is `db/reset-baseline.sql` followed by a fresh backfill.

---

## 8. Database

Nine tables. RLS on all of them.

| Table | Purpose |
|---|---|
| `clinics` | id, name, sector, type, last_report_at |
| `encounters` | the core record — ts, clinic, sector, age_band, sex, symptoms[], diagnosis, syndrome, drugs[], severity, risk_flags[], simulated |
| `baselines` | display cache of mean/stddev per (sector, syndrome) — the engine recomputes from raw rows regardless |
| `alerts` | sector, syndrome, observed, expected, score, tier, status, ts, advisory, advisory_at, advisory_by, resolved_at |
| `tasks` | dispatch — alert_id, assigned_unit, ack_at, resolved_at, outcome, note |
| `referrals` | encounter_id, risk_type, qr_token, home_district |
| `pharmacy_sales` | ts, sector, stall_id, item, qty, simulated |
| `pharmacy_signals` | per-sector medicine-sales anomaly |
| `pharmacy_stalls` | id, name, sector |

`encounters.id` and `pharmacy_sales.id` are **client-generated UUIDs**. That is
what makes the offline queue safe: replaying a queued row upserts with
`onConflict: 'id', ignoreDuplicates: true`, and a `23505` unique violation is
treated as success rather than as an error.

### Rebuilding the schema from nothing — run in this order

```
db/setup.sql          9 tables + seed clinics/stalls
db/pharmacy.sql       pharmacy tables (if not already in setup)
db/advisory.sql       alerts.advisory, advisory_at, advisory_by
db/resolved-at.sql    alerts.resolved_at + tasks.resolved_at (cooldown anchor)
db/harden.sql         RLS policies — LAST, it removes DELETE
```

Order matters: `harden.sql` blocks `DELETE` for the public key, so run it last.

Other SQL, used operationally rather than for setup:
- `db/cleanup.sql` — clear demo data
- `db/reset-baseline.sql` — full baseline reset, with the reasoning written in

---

## 9. Running it

### From a fresh clone

```bash
git clone https://github.com/AkhileshNagargoje/siddhi.git
```

Then install and start the app (create `app/.env` first — see §4):

```bash
cd app && npm install && npm run dev
```

Opens on http://localhost:5173.

```bash
cd worker && npm install
```
```bash
cd simulator && npm install
```

### Simulator

```bash
cd simulator && node simulate.js backfill
```

Lays down ~4,900 encounters across 84 hours with the real daily rhythm. **Run
this after any baseline reset** — the detector needs history to compare against.

```bash
cd simulator && node simulate.js pharmacy
```
```bash
cd simulator && node simulate.js live
```
```bash
cd simulator && node simulate.js outbreak 5
```

`node simulate.js reset` **no longer works** — `harden.sql` removed DELETE. Use
`/demo` → "Clear the board", or `db/cleanup.sql` in the SQL Editor.

### Deploying

```bash
cd app && npm run build && npx wrangler deploy
```
```bash
cd worker && npx wrangler deploy
```

You must be logged in as the Cloudflare account that owns the custom domains
(`npx wrangler login`).

### Tests

```bash
cd worker && npm test
```
```bash
cd worker && node eval/harness.mjs
```

---

## 10. The pilgrim page — the one rule you must not break

`/public` shows **which areas are affected and what the illness is. It never
shows case numbers.**

This is not squeamishness. A number invites comparison between areas;
comparison moves crowds; and crowd movement is what kills at these events — the
2025 Maha Kumbh crush is the reference. Every status therefore ends in an
*instruction*, because an instruction calms and a bare warning does not, and the
page repeats that every area has its own free clinic so nobody concludes they
must travel to be seen.

The page has three tabs — **My area**, **All areas**, **Stay well** — because a
pilgrim standing in a crowd has exactly three questions.

It shows every active illness in an area (not just the worst), what each looks
like, how each spreads, and — when one age group is genuinely over-represented —
advice aimed at that group. The targeting is **share-based, not count-based**:
18–39 is the largest band at any festival, so "most cases" would point there
almost every time and tell a parent nothing. A group is named only when its
share of this sector's cases clearly exceeds its share everywhere else
(ratio ≥ 1.5) and at least 5 cases back it.

**Unverified content, and you must say so if asked.** The Hindi and Marathi
throughout `precautions.js` have **not** been checked by a native speaker, and
the symptom lists follow standard public-health wording but have **not** been
reviewed by a clinician. Both are required before this is shown to a real
pilgrim. The caveat is written at the top of the file.

---

## 11. Where the bodies are buried

Things that cost hours to find. Do not undo them.

- **`.clear` is a global button utility class.** Using `clear` as a state class
  on the pilgrim page silently stripped backgrounds and uppercased every area
  name. The state class is now `ok`. Do not rename it back.
- **DOM ids must not be parsed back into data.** The in-depth analysis table
  built an id as `group:key`, then stripped `:` as an unsafe character, then
  split on the `:` that no longer existed — every "+" in the table was dead.
  Ids are now display-only; the values are held in state.
- **The service worker will serve dead code from an old domain.** Both renames
  (Siddhi → Siddhi → Siddhi) produced ghost errors from cached bundles on
  domains that no longer existed. If you see an error naming an old domain,
  it is a stale SW, not a bug in the code.
- **`route()` in `App.jsx` lazy-loads every page.** A static import of a new
  page will not register it. Add it via `route()`.
- **The uuid helper is exported as `uuid`, not `newId`.**
- **Alert dedup + cooldown.** Matching is `or=(status.is.null,status.neq.resolved)`
  and the cooldown is anchored to `resolved_at`. `/outbreak` passes a `bypass`
  key so a demo injection is not suppressed by its own cooldown. This also means
  an alert that already exists gets **patched, not inserted** — so it will not
  appear in a scan's `newAlerts` even though it is live in the table. Query the
  `alerts` table directly before concluding detection failed.
- **Deleting alerts vs resolving them.** Resolving starts a 6-hour cooldown that
  would suppress the very sector you are about to demo. `reset-baseline.sql`
  deletes for that reason.

---

## 12. State as of 2026-08-24

**Working and deployed:** Tier 1 and Tier 2 complete. Entry form (offline queue,
2.2s measured), dashboard (realtime), detection engine, crew app, insights,
pharmacy stall entry, referral QR, replay, demo console, about page, pilgrim
board. Zero text-contrast failures in light or dark, verified against computed
DOM backgrounds. All routes code-split.

**Immediately before any demo:** open `/demo` → **"Clear the board"**. The
database currently carries leftover alerts from backfill testing — sector 5 alone
shows four illnesses at once, which looks like a disaster zone rather than a
demo.

**Still open:**
- Every teammate task in `PROGRESS.md` is still `todo` — translation
  verification, antibiotic table verification, pitch, slides, test checklist,
  and the stub components (`SectorDetail`, `AgeChart`, `MorningCard`).
- Rehearse `REHEARSAL-SCRIPT.md` five times.
- Highest-value optional work: run the detector against the real Jana Swasthya
  dataset (Harvard Dataverse, DOI `10.7910/DVN/WCEWNR`). Every number quoted
  today comes from synthetic data, and a real-data result would be the single
  strongest thing in the pitch.

---

## 13. Document index

Read in this order if you are new:

| File | What it is |
|---|---|
| `PROJECT.md` | **The spec.** Scope tiers, design rules, data model. Binding. |
| `PROGRESS.md` | Current state, task table. Update it when you finish anything. |
| `CLAUDE.md` | Instructions for an AI assistant working in this repo |
| `README.md` | Setup and overview |
| `SIDDHI-EXPLAINED.md` | Full plain-language walkthrough of how everything works |
| `EXPLAINER.md` | Earlier explainer, simpler language |
| `FORMULA-EXPLAINED.md` | Every formula, in words and in notation |
| `HARNESS-EXPLAINER.md` | How the 1,000-festival evaluation works |
| `TECH-QA.md` | Master technical Q&A |
| `TECH-QA-BACKEND.md` | Database, worker, crons, offline sync |
| `TECH-QA-FRONTEND.md` | React, routing, performance, accessibility |
| `TECH-QA-STATS.md` | The statistics — **including the false-alarm caveat** |
| `TECH-QA-SKEPTIC.md` | The hostile questions and honest answers |
| `PITCH.md` | Pitch narrative |
| `REHEARSAL-SCRIPT.md` | Click-by-click demo with timings |
| `TEAM-HANDBOOK.md` | Everything for the team, plain language |
| `TEAM-TASKS.md` / `ASSIGNMENTS.md` | Who does what |

Also present: `Siddhi - Software Guide.docx`, `Siddhi - Team Handbook.docx`,
`Siddhi-Differentiators.docx` — Word versions carrying the pre-rename name.

---

## 14. If you have to explain this in one paragraph

Millions of people gather. Every clinic treats its own patients well, and nobody
compares notes, so an outbreak is invisible until it is large. Doctors log each
visit in ten seconds on a phone that works offline. Every five minutes we compare
each area against its own recent history, at the same time of day, and flag what
is genuinely unusual — using a z-score, not machine learning, so a health
official can ask why it fired and get a real answer. A crew is dispatched. In
testing, we catch a typical outbreak at 8 cases instead of 33, about seven hours
earlier. Pilgrims see which areas are affected and what to do, and never a case
count, because numbers move crowds and moving crowds is what kills at these
events.
