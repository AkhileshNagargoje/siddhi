# Ready-to-paste prompts

Each person: copy **your whole block** into Claude / ChatGPT / Cursor, get the code, save it to the file path named in the prompt, then run the app and check it looks right.

**Before you start:**

```bash
git clone https://github.com/AkhileshNagargoje/drishti.git
cd drishti/app
npm install
npm run dev
```
Open http://localhost:5173 — ask the main dev for the `.env` file first.

**Rules that apply to everyone:**
- Save the file at exactly the path your prompt says. Don't edit any other file.
- If the AI suggests installing a package, say no. We add nothing new.
- Check it looks right in **both light and dark mode** (change your system theme).
- Check it on a **narrow window** (phone width).
- Send the finished file to the main dev. Don't push to GitHub yourself unless told.

---

# TASK 1 — Demo control page

**Copy everything below into your AI tool:**

---

I'm building a React page for an existing app. Write me ONE file: `src/pages/DemoPage.jsx`

**Context:** This is a control panel used during a live demo of an outbreak-detection system. It triggers actions on a backend by calling web addresses. It will be shown on a projector in front of judges, so it must look calm and professional.

**What it does — three actions:**

1. **Add traffic** → `GET https://drishti-engine.akhileshnagargoje.in/traffic`
   Response: `{ "generated": 4, "hourFactorIST": 0.15 }`

2. **Run detection** → `GET https://drishti-engine.akhileshnagargoje.in/scan`
   Response: `{ "examined": 4268, "newAlerts": [] }`

3. **Inject outbreak** → `GET https://drishti-engine.akhileshnagargoje.in/outbreak?sector=5&n=25`
   Response: `{ "injected": 25, "sector": 5, "scan": { "examined": 4273, "newAlerts": [{ "sector": 5, "syndrome": "gi" }] } }`
   For this one add two dropdowns: **sector** (1–12) and **cases** (10, 25, 50). Put the chosen values into the address.

**Requirements:**
- Plain React with hooks. JSX, not TypeScript. No new npm packages. Use `fetch`.
- While a request runs, disable that button and show "Working…" on it. Never let two run at once.
- Keep a log of the last 5 actions, newest first, each with a timestamp and a plain-English result:
  - "Injected 25 cases into Sector 5 — 1 new alert"
  - "Checked 4,268 patients — no new alerts"
  - "Added 4 patients"
- If a request fails, add a red entry to the log saying what failed. The page must never crash or show a blank screen.
- At the top, a heading "Demo controls" and a small warning line: "This creates real data in the live system."

**Styling — use these existing CSS classes, do not write new colours:**
- Page wrapper: `className="shell"`
- Cards/boxes: `className="panel"`
- Buttons: `className="btn"` and `className="btn-accent"` for the main one
- Small grey text: `className="chart-sub"`
- Heading rows: `className="chart-head"`

**If you need extra styles, use only these CSS variables (they handle dark mode automatically):**
`var(--surface-1)` card background, `var(--surface-sunk)` sunken background, `var(--ink-1)` main text, `var(--ink-2)` grey text, `var(--ink-3)` light grey text, `var(--border)` hairlines, `var(--critical-ink)` red text, `var(--good-ink)` green text, `var(--r-md)` corner radius, `var(--s-3)` and `var(--s-4)` spacing.

Put any extra CSS in a `<style>` block is NOT allowed — instead use inline `style={{}}` on the elements.

**Export:** `export default function DemoPage()`

Give me the complete file, nothing else.

---

# TASK 2 — About page

**Copy everything below into your AI tool:**

---

I'm building a React page for an existing app. Write me ONE file: `src/pages/AboutPage.jsx`

**Context:** This is the About page for "Drishti", an outbreak early-warning system for mass gatherings like the Kumbh Mela. Hackathon judges will read it. It should read like a clean one-page website — confident and simple, not corporate.

**Sections in this order:**

**1. Header**
Big title "Drishti". Underneath, one line: "Outbreak early warning for mass gatherings"

**2. The problem** — three short lines, each on its own line, slightly larger than body text:
- "Fourteen people in one sector fall ill from the same water tap."
- "They go to four different clinics. Each doctor sees three or four cases — a normal day."
- "Nobody sees fourteen, because nobody is adding them up."

**3. What Drishti does** — four bullet points:
- "Records a patient in 10 seconds, works with no internet"
- "Pools every clinic into one live picture"
- "Detects a cluster automatically and shows its own maths"
- "Turns the alert into a job a crew must close"

**4. Three big numbers** — displayed side by side on desktop, stacked on mobile. Number large and bold, label small and grey underneath:
- **31%** — "antibiotics prescribed at the 2015 Kumbh, recorded and never acted on"
- **30,000** — "patient visits proving health workers will enter data"
- **600 → 35** — "cases, when the tap is closed on day 1 instead of day 4"

**5. Team** — four people, name and role. Use placeholders: "Name — role" and I'll fill them in.

**6. Links** — "Open the live app" linking to `/`, and "View the code" linking to `https://github.com/AkhileshNagargoje/drishti`

**Requirements:**
- Plain React, JSX not TypeScript. No new npm packages. No images.
- Centred content, maximum width 720px.
- Must look right on a phone and on a laptop.
- Must work in light and dark mode — this is why you must not hardcode any colours.

**Styling — use these existing CSS classes:**
`className="shell"` for the page wrapper, `className="panel"` for boxes, `className="chart-sub"` for small grey text, `className="btn"` for links styled as buttons.

**For anything else use only these CSS variables (they handle dark mode automatically):**
`var(--ink-1)` main text, `var(--ink-2)` grey text, `var(--ink-3)` light grey, `var(--surface-1)` card background, `var(--border)` hairlines, `var(--t-hero)` huge text size, `var(--t-xl)` large, `var(--t-md)` body, `var(--t-sm)` small, `var(--s-3)`/`var(--s-4)`/`var(--s-5)` spacing, `var(--r-lg)` corner radius.

Use inline `style={{}}` for extra styling. Do not write a `<style>` block. Do not use `position: fixed`.

**Export:** `export default function AboutPage()`

Give me the complete file, nothing else.

---

# TASK 3 — Morning card

**Copy everything below into your AI tool:**

---

I'm building a React component for an existing app. Write me ONE file: `src/components/MorningCard.jsx`

**Context:** A doctor at a mass-gathering clinic records patients on a tablet all day. This card appears once, before their first patient of the morning. Its job is to give something back, so data entry doesn't feel like a one-way street. A tired person must be able to read it in ten seconds while holding a cup of tea.

**It receives these props (already calculated — do NOT fetch anything):**

```js
{
  clinicName: 'Sadhugram East PHC',
  yesterdayPatients: 182,
  sectorEvent: 'Water contamination found and fixed at W-7',  // string, or null if nothing happened
  myAntibioticRate: 0.18,      // 0.18 means 18%
  festivalMedianRate: 0.24,    // 0.24 means 24%
  onClose: () => {}            // call this when the button is pressed
}
```

**What to show, in this order:**

1. "Good morning" as the heading, and the clinic name underneath in grey
2. "You recorded **182** patients yesterday" — with the number visually emphasised
3. **Only if `sectorEvent` is not null:** a line with a small tick icon reading "In your sector: Water contamination found and fixed at W-7"
4. A comparison of two percentages side by side: "Your antibiotic use — 18%" and "Festival median — 24%"
   - If the doctor's rate is **lower or equal** to the median, colour their number `var(--good-ink)`
   - If **higher**, colour it `var(--warning-ink)`
5. A full-width button reading "Start the day" that calls `onClose`

**CRITICAL RULE — the most important part of this task:**
Never scold, warn, or judge the doctor. Show the numbers, never a verdict. Do NOT write text like "you are prescribing too many antibiotics" or "above average — please reduce". Just the two numbers side by side. The doctor draws their own conclusion. If you add any judging language, the task is wrong.

**Requirements:**
- Plain React, JSX not TypeScript. No new npm packages.
- No paragraphs of text. Short lines only.
- Card about 380px wide, centred on a dark translucent overlay.
- For the tick icon, write a small inline `<svg>` — do not use an icon library or an emoji.
- Must work in light and dark mode.

**Styling — use these existing CSS classes:**
`className="sheet"` (the dark overlay), `className="sheet-inner"` (the centred container), `className="panel"` (the card itself), `className="btn btn-accent btn-wide"` (the button).

**For anything else use only these CSS variables:**
`var(--ink-1)` main text, `var(--ink-2)` grey text, `var(--ink-3)` light grey, `var(--surface-1)` card background, `var(--surface-sunk)` sunken background, `var(--border)` hairlines, `var(--good-ink)` green, `var(--warning-ink)` orange, `var(--t-hero)`/`var(--t-xl)`/`var(--t-md)`/`var(--t-sm)`/`var(--t-xs)` text sizes, `var(--s-2)`/`var(--s-3)`/`var(--s-4)` spacing, `var(--r-md)` corners.

Use inline `style={{}}`. Do not write a `<style>` block.

**Export:** `export function MorningCard({ ... })` — a named export, not default.

Also give me a small example at the bottom in a comment showing how to render it with test data.

Give me the complete file, nothing else.

---

# TASK 4 — Sector detail panel

**Copy everything below into your AI tool:**

---

I'm building a React component for an existing app. Write me ONE file: `src/components/SectorDetail.jsx`

**Context:** A health official watches a map of 12 festival sectors. When they click one, this panel opens showing what's happening in that sector. It must be readable at a glance in a control room.

**It receives these props (already calculated — do NOT fetch anything):**

```js
{
  sector: { id: 5, name: 'Sadhugram East', waterPoints: ['W-7', 'W-8'], kitchens: ['K-4', 'K-5'] },
  totalCases: 73,                    // last 6 hours
  bySyndrome: [                      // sorted, biggest first
    { syndrome: 'Acute diarrhoeal illness', count: 41 },
    { syndrome: 'Respiratory illness', count: 18 },
    { syndrome: 'Injury', count: 9 },
    { syndrome: 'Heat-related illness', count: 5 },
  ],
  clinics: [
    { id: 'C07', name: 'Sadhugram East PHC', cases: 44 },
    { id: 'C08', name: 'Sadhugram East Mobile', cases: 29 },
  ],
  onClose: () => {}
}
```

**What to show:**

1. Header: sector name, with "Sector 5" small and grey above it. A close button (×) on the right.
2. The total: "73 cases in the last 6 hours" with the number large.
3. **A horizontal bar chart** of `bySyndrome`. Each row: the syndrome name on the left, a bar in the middle whose width is proportional to the largest count, and the number on the right. Build the bars with plain `<div>` elements and percentage widths — do not use a charting library.
4. A list of clinics with their case counts.
5. Two small groups of chips: "Water points: W-7, W-8" and "Kitchens: K-4, K-5". If a list is empty, show "none mapped".

**Requirements:**
- Plain React, JSX not TypeScript. No new npm packages. No charting library.
- Bars should use `var(--series-1)` as their colour, all the same colour — do NOT give each bar a different colour.
- Numbers should line up neatly on the right.
- Must work in light and dark mode, and on a narrow screen.

**Styling — use these existing CSS classes:**
`className="panel"` for the container, `className="chart-head"` for heading rows, `className="chart-sub"` for small grey text, `className="source-chip"` for the water point and kitchen chips.

**For anything else use only these CSS variables:**
`var(--ink-1)`, `var(--ink-2)`, `var(--ink-3)` text colours, `var(--surface-1)`, `var(--surface-sunk)` backgrounds, `var(--border)` hairlines, `var(--series-1)` the bar colour, `var(--t-hero)`/`var(--t-xl)`/`var(--t-md)`/`var(--t-sm)`/`var(--t-xs)` text sizes, `var(--s-2)`/`var(--s-3)`/`var(--s-4)` spacing, `var(--r-sm)`/`var(--r-md)` corners.

Use inline `style={{}}`. Do not write a `<style>` block.

**Export:** `export function SectorDetail({ ... })` — named export.

Give me the complete file, nothing else.

---

# TASK 5 — Alert sound and notification

**Copy everything below into your AI tool:**

---

I'm building a small React hook for an existing app. Write me ONE file: `src/lib/useAlertSound.js`

**Context:** A control-room dashboard shows outbreak alerts. When a NEW alert arrives, the room should hear a soft chime and the operator should get a desktop notification, because they may be looking away. This will run during a live demo in front of an audience, so the sound must be pleasant and short — not an alarm blare.

**What to build — a custom React hook:**

```js
useAlertSound(alerts, { enabled })
```

- `alerts` is an array of objects like `{ id: 'abc', sector: 5, syndrome: 'gi', tier: 'act' }`
- The hook watches this array. When an alert appears whose `id` it has not seen before, it should:
  1. Play a short chime
  2. Show a browser notification titled "Drishti alert" with body "Sector 5 — acute diarrhoeal illness"
- On the very first render it must record all existing alert ids **without** playing anything. Otherwise it would fire a burst of sounds the moment the page loads.

**How to make the sound — important:**
Do NOT load an audio file or add a package. Generate the chime with the browser's built-in Web Audio API: create an `AudioContext`, make an oscillator, use a sine wave, play two short notes (around 880Hz then 1175Hz), each about 0.12 seconds, and fade the volume down so it doesn't click. Keep the total under half a second and keep the volume gentle (gain around 0.15).

Create the `AudioContext` lazily — only on the first sound — because browsers block audio until the user has interacted with the page.

**Notifications:**
- Ask permission with `Notification.requestPermission()` only when `enabled` becomes true, never on page load.
- If permission is denied or the browser doesn't support it, just skip the notification silently and still play the sound. Never throw an error.

**Also export a small toggle component** in the same file:

```js
export function AlertSoundToggle({ enabled, onChange })
```

A small button showing a speaker icon (write an inline `<svg>`, no icon library) and the text "Sound on" / "Sound off". Use `className="live"` for its styling.

**Requirements:**
- Plain JavaScript with React hooks, not TypeScript. No new npm packages.
- Must not crash in any browser, even one without audio or notification support — wrap risky calls in try/catch.
- Clean up properly when the component unmounts.

**Export:** a default export for the hook, plus the named `AlertSoundToggle` export.

Give me the complete file, nothing else.

---

# TASK 6 — Cases by age chart

**Copy everything below into your AI tool:**

---

I'm building a React component for an existing app. Write me ONE file: `src/components/AgeChart.jsx`

**Context:** A dashboard for outbreak detection at a mass gathering. This small chart shows which age groups are getting ill. It matters because certain outbreaks hit the elderly hardest, so the shape of this chart is a real clinical signal.

**It receives these props (already calculated — do NOT fetch anything):**

```js
{
  data: [
    { band: '0-5',   count: 12 },
    { band: '6-17',  count: 21 },
    { band: '18-39', count: 88 },
    { band: '40-59', count: 94 },
    { band: '60+',   count: 71 },
  ],
  title: 'Cases by age',
  subtitle: 'last 6 hours',
}
```

**What to build:** a vertical bar chart, drawn as an inline `<svg>`.

**Requirements:**
- Plain React, JSX not TypeScript. **No charting library** — write the SVG by hand.
- 5 vertical bars, evenly spaced, height proportional to the largest count.
- All bars the **same colour**: `var(--series-1)`. Do not give each bar a different colour — the colour carries no meaning here, only the height does.
- Rounded top corners on the bars (about 4px), square at the bottom where they meet the baseline.
- The age band label under each bar, small and grey.
- The count printed above each bar.
- A thin baseline under the bars in `var(--axis)`.
- On hover, the bar should darken slightly. Use `opacity` for this — do not change its colour.
- The SVG must resize with its container. Use a `viewBox` and `width="100%"`.
- Text inside SVG: set `fill="var(--ink-3)"` for labels and `fill="var(--ink-2)"` for the counts. Font size 11 or 12, no smaller.

**Styling — wrap it in these existing classes:**
```jsx
<div className="chart">
  <div className="chart-head">
    <h3>{title}</h3>
    <span className="chart-sub">{subtitle}</span>
  </div>
  {/* your svg here */}
</div>
```

**Export:** `export function AgeChart({ data, title, subtitle })` — named export.

Give me the complete file, nothing else.

---

# When you're done

1. Save the file at the exact path in your prompt
2. Run `npm run dev` and check the app still loads
3. Switch your system to dark mode and check it still looks right
4. Make your browser window narrow and check nothing overflows
5. Send the file to the main dev

If the AI gives you something that doesn't work, paste the error back to it and ask it to fix it. That's normal — it usually takes two or three rounds.
