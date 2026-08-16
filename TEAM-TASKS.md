# Team coding tasks

Six tasks. Each is one file. None of them can break the main app.

**Your file already exists as a stub, and it is already wired into the live app.** Replace the stub, run `npm run dev`, and your work appears inside the real product — the age chart on the control-room dashboard, the sector panel when a tile is clicked, the morning card after a doctor signs in, /demo and /about as live routes. Send the finished file back; after merge it deploys to drishti.akhileshnagargoje.in with your name on it.

Work out how to build it yourself — the points below are the requirements, not the instructions.

---

## Setup

```bash
git clone https://github.com/AkhileshNagargoje/drishti.git
cd drishti/app
npm install
npm run dev
```

Ask the main dev for the `.env` file. Copy `app/.env.example` to `app/.env` and fill in the two values.

## Rules for everyone

- Create only the file listed in your task. Do not edit any other file.
- No new npm packages.
- No hardcoded colours. Use the CSS variables below — they handle dark mode for you.
- No `<style>` blocks. Use inline `style={{}}` or the existing classes.
- JSX, not TypeScript.
- Check it in light mode AND dark mode. Check it in a narrow window.
- Send the file to the main dev when done. Don't push to GitHub yourself.

## What you can style with

**Existing classes:** `shell` `panel` `btn` `btn-accent` `btn-good` `btn-quiet` `btn-wide` `chart` `chart-head` `chart-sub` `tile` `tile-label` `tile-value` `badge` `badge-good` `badge-warning` `badge-critical` `sheet` `sheet-inner` `source-chip` `live` `empty`

**CSS variables:**
- Text — `--ink-1` main, `--ink-2` grey, `--ink-3` light grey
- Backgrounds — `--surface-1` card, `--surface-2` raised, `--surface-sunk` sunken
- Lines — `--border`, `--border-strong`, `--axis`
- Meaning — `--series-1` chart blue, `--good-ink` green, `--warning-ink` orange, `--critical-ink` red
- Text sizes — `--t-hero` `--t-xl` `--t-lg` `--t-md` `--t-sm` `--t-xs`
- Spacing — `--s-1` to `--s-7`
- Corners — `--r-sm` `--r-md` `--r-lg` `--r-pill`

Look at `src/pages/CrewPage.jsx` for an example of how existing pages are written.

---

# TASK 1 — Demo control page

**File:** `src/pages/DemoPage.jsx`
**Why:** Right now we trigger the demo by typing terminal commands. On stage that's slow and looks amateur. This makes it buttons.

- Three buttons, each calls a web address and shows the result
- **Add traffic** → `https://drishti-engine.akhileshnagargoje.in/traffic`
- **Run detection** → `https://drishti-engine.akhileshnagargoje.in/scan`
- **Inject outbreak** → `https://drishti-engine.akhileshnagargoje.in/outbreak?sector=5&n=25`
- For inject: two dropdowns, sector (1–12) and cases (10/25/50), feeding into the address
- Call the addresses yourself in the browser first to see what comes back
- While a request runs: disable that button, show "Working…", never allow two at once
- Show the last 5 actions with timestamps, newest first, in plain English — not raw JSON
- A failed request shows a red log entry. The page must never crash
- Heading "Demo controls" plus a warning line that this creates real data

**Done when:** someone who has never seen a terminal can run the whole demo from this page.

---

# TASK 2 — About page

**File:** `src/pages/AboutPage.jsx`
**Why:** Judges click around. This makes the project feel finished.

- Title "Drishti", one line under it: "Outbreak early warning for mass gatherings"
- **The problem** — three lines:
  - Fourteen people in one sector fall ill from the same water tap
  - They go to four different clinics. Each doctor sees three or four cases — a normal day
  - Nobody sees fourteen, because nobody is adding them up
- **What it does** — four points: 10-second offline entry · pools all clinics live · detects clusters and shows its maths · turns alerts into jobs a crew must close
- **Three big numbers**, side by side on desktop, stacked on mobile:
  - **31%** antibiotics prescribed at the 2015 Kumbh, recorded and never acted on — link the source: https://publichealth.jmir.org/2023/1/e45121
  - **2,000+ visits on day one, 30+ clinics** — health workers really will enter data on tablets — link the source: https://mittalsouthasiainstitute.harvard.edu/2018/05/the-jana-swasthya-project-at-the-2015-kumbh-mela/
  - **600 → 35** cases, when the tap is closed on day 1 instead of day 4
- **Team** — four names and roles
- **Links** — live app, and the GitHub repo
- Centred, max width about 720px
- No images

**Done when:** it reads like a real product page, not a school project.

---

# TASK 3 — Morning card

**File:** `src/components/MorningCard.jsx`
**Why:** A doctor enters 180 patients a day and gets nothing back. Over six weeks that's how people stop caring. This gives something in return.

Props it receives (already calculated — fetch nothing):

```js
{ clinicName, yesterdayPatients, sectorEvent, myAntibioticRate, festivalMedianRate, onClose }
// sectorEvent is a string or null. Rates are decimals: 0.18 = 18%
```

- "Good morning" + clinic name
- How many patients they recorded yesterday, number emphasised
- If `sectorEvent` exists, show it with a small tick icon (write the SVG yourself, no icon library, no emoji)
- Their antibiotic rate next to the festival median, side by side
- Lower or equal to median → green. Higher → orange
- A full-width "Start the day" button calling `onClose`
- Card about 380px wide on a dark overlay — use `sheet` and `sheet-inner`

**The rule that matters most:** never scold or judge the doctor. Show the two numbers, never a verdict. No "you are prescribing too many" or "please reduce". The doctor draws their own conclusion. Judging language means the task is wrong.

**Done when:** a tired person can read it in ten seconds holding a cup of tea.

---

# TASK 4 — Sector detail panel

**File:** `src/components/SectorDetail.jsx`
**Why:** Clicking a sector on the map currently does almost nothing.

Props it receives (fetch nothing):

```js
{ sector, totalCases, bySyndrome, clinics, onClose }
// sector: { id, name, waterPoints: [], kitchens: [] }
// bySyndrome: [{ syndrome, count }] already sorted biggest first
// clinics: [{ id, name, cases }]
```

- Header: sector name, with "Sector 5" small and grey above it, close button on the right
- Total cases in the last 6 hours, number large
- **A horizontal bar chart** of `bySyndrome` — label left, bar middle, number right
- Build the bars with plain `<div>`s and percentage widths. No charting library
- **All bars the same colour** (`--series-1`). Colour carries no meaning here, only length does
- List of clinics with their case counts
- Water points and kitchens as chips (`source-chip`). If empty, say "none mapped"
- Numbers should line up on the right

**Done when:** an official can glance at it and immediately know what's wrong in that sector.

---

# TASK 5 — Alert sound and notification

**File:** `src/lib/useAlertSound.js`
**Why:** The operator may be looking away when an alert fires. Also — during the demo, when the sector turns red *and the room hears it*, that's a moment.

- A React hook: `useAlertSound(alerts, { enabled })`
- `alerts` is an array of `{ id, sector, syndrome, tier }`
- When an alert appears with an id it hasn't seen: play a chime and show a browser notification
- **On first render, record all existing ids without playing anything** — otherwise it fires a burst on page load
- Generate the sound with the Web Audio API. No audio files, no packages
- Two short sine notes, roughly 880Hz then 1175Hz, ~0.12s each, fade the volume out so it doesn't click. Gentle — this is a chime, not an alarm
- Create the AudioContext lazily on first sound. Browsers block audio before user interaction
- Ask notification permission only when `enabled` turns true, never on page load
- If notifications are denied or unsupported: skip silently, still play the sound, never throw
- Also export `AlertSoundToggle({ enabled, onChange })` — a small button with an inline SVG speaker icon, using `className="live"`
- Clean up on unmount

**Done when:** it works, and it doesn't make a sound the moment you open the page.

---

# TASK 6 — Cases by age chart

**File:** `src/components/AgeChart.jsx`
**Why:** Which age groups are affected is a real clinical signal — some outbreaks hit the elderly hardest.

Props it receives (fetch nothing):

```js
{ data, title, subtitle }
// data: [{ band: '0-5', count: 12 }, ...] — five bands
```

- Vertical bar chart drawn as an inline `<svg>`. **No charting library**
- Height proportional to the largest count
- **All bars the same colour** (`--series-1`). Do not give each bar its own colour — height carries the meaning, not colour
- Rounded top corners (~4px), square where they meet the baseline
- Age band label under each bar, count above it
- Thin baseline in `--axis`
- On hover, darken the bar using `opacity` — don't change its colour
- Must resize with its container: use `viewBox` and `width="100%"`
- SVG text: `fill="var(--ink-3)"` for labels, `fill="var(--ink-2)"` for counts, font size 11 minimum
- Wrap it in `<div className="chart">` with a `chart-head` containing the title and `chart-sub` subtitle

**Done when:** it sits next to the existing dashboard charts and looks like it belongs.

---

# Before you send it back

1. `npm run dev` — does the app still load?
2. Switch your system to dark mode — still readable?
3. Narrow the window to phone width — does anything overflow sideways?
4. Send the file to the main dev

If your AI tool gives you broken code, paste the error back and ask it to fix it. Two or three rounds is normal.

| Task | File | Difficulty |
|---|---|---|
| 1. Demo controls | `src/pages/DemoPage.jsx` | medium |
| 2. About page | `src/pages/AboutPage.jsx` | easy |
| 3. Morning card | `src/components/MorningCard.jsx` | medium |
| 4. Sector detail | `src/components/SectorDetail.jsx` | medium |
| 5. Alert sound | `src/lib/useAlertSound.js` | hard |
| 6. Age chart | `src/components/AgeChart.jsx` | medium |

There is also a non-coding task: **print a referral card on real paper and check the QR still scans.** Nobody has ever tested this. Details from the main dev.
