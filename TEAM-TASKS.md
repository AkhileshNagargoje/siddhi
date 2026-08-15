# Team coding tasks

Four tasks. Each one is self-contained — you cannot break the main app by doing them.

**Rules for everyone:**
- Build only the file listed in your task. Don't edit anything else.
- Use the existing CSS variables (listed in each task). Don't invent new colours.
- Ask questions in the group. Answers at **2pm and 8pm** daily.
- When done, send your file back — main dev merges it.

**How to run the project on your computer:**
```bash
git clone https://github.com/AkhileshNagargoje/drishti.git
cd drishti/app
npm install
npm run dev
```
Then open http://localhost:5173

*(You need the `.env` file — ask the main dev for it. Copy `app/.env.example` to `app/.env` and paste the two values in.)*

---

# TASK 1 — Demo control page

**Who:** whoever is most comfortable with code
**Difficulty:** medium
**Why it matters:** Right now, to demo an outbreak we have to open a terminal and type commands. On stage that is slow and looks unprofessional. This page turns it into buttons.

## What to build

A new page at `/demo` with four buttons. Each button calls a web address and shows the result.

**File to create:** `app/src/pages/DemoPage.jsx`

**The four buttons:**

| Button | Web address to call | What it does |
|---|---|---|
| Add traffic | `https://drishti-engine.akhileshnagargoje.in/traffic` | Adds a few normal patients |
| Run detection | `https://drishti-engine.akhileshnagargoje.in/scan` | Checks every sector for outbreaks now |
| Inject outbreak | `https://drishti-engine.akhileshnagargoje.in/outbreak?sector=5&n=25` | Creates a fake outbreak |
| Reset | *(leave this one out for now)* | — |

For **Inject outbreak**, add a dropdown so the user can pick the sector (1 to 12) and the number of cases (10, 25, 50). Put those numbers into the web address.

## What the answers look like

When you call `/scan` you get back:
```json
{ "examined": 4268, "newAlerts": [] }
```

When you call `/outbreak?sector=9&n=5` you get back:
```json
{ "injected": 5, "sector": 9, "scan": { "examined": 4273, "newAlerts": [ ... ] } }
```

Show this on screen in a simple way, for example:
- *"Injected 25 cases into Sector 5 — 1 new alert created"*
- *"Checked 4,268 patients — no new alerts"*

## Rules

- While a button is loading, **disable it and show "Working…"** so nobody double-clicks.
- If it fails, show the error in red. Do not let the page crash.
- Show the last 5 actions as a list with times, so the presenter can see what they already did.

## Done looks like this

A clean page with a title "Demo controls", a warning line saying *"This creates real data in the live system"*, the four buttons in a row, and a list of recent actions underneath.

## Starter code

```jsx
import { useState } from 'react'

const ENGINE = 'https://drishti-engine.akhileshnagargoje.in'

export default function DemoPage() {
  const [busy, setBusy] = useState(null)
  const [log, setLog] = useState([])

  async function call(name, path) {
    setBusy(name)
    try {
      const res = await fetch(`${ENGINE}${path}`)
      const data = await res.json()
      setLog(l => [{ name, data, time: new Date().toLocaleTimeString() }, ...l].slice(0, 5))
    } catch (e) {
      setLog(l => [{ name, error: e.message, time: new Date().toLocaleTimeString() }, ...l].slice(0, 5))
    }
    setBusy(null)
  }

  return (
    <div className="shell">
      {/* your buttons and log go here */}
    </div>
  )
}
```

**CSS classes you can reuse:** `shell`, `panel`, `btn`, `btn-accent`, `chart-head`, `chart-sub`

**Last step:** tell the main dev, who adds one line to `App.jsx` to make `/demo` work.

---

# TASK 2 — About page

**Who:** the person doing slides
**Difficulty:** easy
**Why it matters:** Judges click around. A finished-looking About page makes the project feel real instead of half-built.

## What to build

**File to create:** `app/src/pages/AboutPage.jsx`

A single page with these sections, in this order:

**1. The problem — three short lines**
> Fourteen people in one sector fall ill from the same water tap.
> They go to four different clinics. Each doctor sees three or four cases — a normal day.
> Nobody sees fourteen, because nobody is adding them up.

**2. What Drishti does — four short points**
- Records a patient in 10 seconds, works with no internet
- Pools every clinic into one live picture
- Detects a cluster automatically and shows its own maths
- Turns the alert into a job a crew must close

**3. The numbers**
Show three big numbers with labels underneath:
- **31%** — antibiotics prescribed at the 2015 Kumbh, recorded and never acted on
- **30,000** — patient visits the 2015 project proved health workers will enter
- **600 → 35** — cases when the water tap is closed on day 1 instead of day 4

**4. The team**
Four names with roles. Get the names from the group.

**5. Links**
- Live app → `/`
- GitHub → https://github.com/AkhileshNagargoje/drishti

## Rules

- **No new colours.** Use only these: `var(--ink-1)` (main text), `var(--ink-2)` (grey text), `var(--ink-3)` (light grey), `var(--surface-1)` (card background), `var(--border)` (lines).
- Must look correct on a phone as well as a laptop.
- Do not use `position: fixed`.

## Done looks like this

Reads like a clean one-page website. Big numbers stand out. Everything centred, max width about 720px.

## Starter code

```jsx
export default function AboutPage() {
  return (
    <div className="shell" style={{ maxWidth: 720 }}>
      <h1>Drishti</h1>
      <p className="chart-sub">Outbreak early warning for mass gatherings</p>
      {/* sections go here */}
    </div>
  )
}
```

**CSS classes you can reuse:** `shell`, `panel`, `tile`, `tile-label`, `tile-value`, `chart-head`, `chart-sub`

---

# TASK 3 — Morning card for doctors

**Who:** anyone
**Difficulty:** medium
**Why it matters:** Right now the doctor enters 180 patients and learns nothing back. Over six weeks that is how people stop caring about data entry. This gives them something in return.

## What to build

**File to create:** `app/src/components/MorningCard.jsx`

A card the doctor sees once, before their first patient of the day.

**It receives this information (already worked out for you):**

```js
{
  clinicName: 'Sadhugram East PHC',
  yesterdayPatients: 182,
  sectorEvent: 'Water contamination found and fixed at W-7',  // or null if nothing happened
  myAntibioticRate: 0.18,        // 18%
  festivalMedianRate: 0.24,      // 24%
}
```

**What to show:**

- Title: "Good morning" + the clinic name
- "You recorded **182** patients yesterday"
- If `sectorEvent` is not null: show it with a small tick icon — *"In your sector: Water contamination found and fixed at W-7"*
- A comparison: "Your antibiotic use: **18%** · Festival median: **24%**"
  - If the doctor's rate is **lower** than the median, show it in green (`var(--good-ink)`)
  - If **higher**, show it in orange (`var(--warning-ink)`) — but **never** write anything blaming or scolding. Just the number.
- A "Start the day" button that closes the card

## Rules

- Must be readable in **ten seconds**. No paragraphs.
- **Never scold the doctor.** Show the number, not a judgement. This is the most important rule in the task.
- Build it as a component that takes the data above as props. Do not fetch anything from the database — someone else will connect it.

## Done looks like this

A single card, about 380px wide, that a tired person can read in one glance while holding a cup of tea.

## Starter code

```jsx
export function MorningCard({ clinicName, yesterdayPatients, sectorEvent, myAntibioticRate, festivalMedianRate, onClose }) {
  const better = myAntibioticRate <= festivalMedianRate
  return (
    <div className="sheet">
      <div className="sheet-inner">
        {/* your card goes here */}
        <button className="btn btn-accent" onClick={onClose}>Start the day</button>
      </div>
    </div>
  )
}
```

**CSS classes you can reuse:** `sheet`, `sheet-inner`, `panel`, `btn`, `btn-accent`, `badge`, `badge-good`, `badge-warning`

---

# TASK 4 — Test the printed referral card

**Who:** whoever has access to a printer
**Difficulty:** easy, but needs a real printer
**Why it matters:** The referral card is meant to be printed on paper and given to a patient. **Nobody has ever printed one.** The code has never been tested on a real printer.

## What to do

1. Open the app: https://drishti.akhileshnagargoje.in/entry
2. Sign in with PIN `1111`
3. Enter a patient: age `60+`, sex `M`, diagnosis **High blood pressure**
4. Tap **"+ Add BP / sugar reading"** and enter `150` and `95`
5. Tap **Save & print referral** — a card appears
6. Tap **Print card**
7. **Print it on real paper**

## Then check and report

- Does the whole card fit on one page?
- Is the QR code big enough to scan? **Try scanning the printed paper with a phone camera** — does it open the record?
- Are the buttons and the rest of the app hidden when printing, or do they appear?
- Is any text cut off at the edges?
- Try printing on a phone as well as a laptop — is it different?

## Report back

Take a photo of the printed card, and write down anything wrong. Send both to the main dev.

If everything works — say so clearly. "It works" is a valid and useful result.

---

# Summary

| Task | Who | Difficulty | Creates file |
|---|---|---|---|
| 1. Demo controls | most confident coder | medium | `app/src/pages/DemoPage.jsx` |
| 2. About page | slides person | easy | `app/src/pages/AboutPage.jsx` |
| 3. Morning card | anyone | medium | `app/src/components/MorningCard.jsx` |
| 4. Print test | whoever has a printer | easy | *(no file — a report)* |

Nothing here can break the main app. If a task is not finished, we simply ship without it.
