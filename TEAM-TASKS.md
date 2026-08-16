# Team tasks — problem statements

You get a **problem**, not a spec. Understanding the user and deciding what to build is your job — that's the actual work, and you'll be the one explaining it to judges.

**Your file already exists as a stub, wired into the live app.** Replace the stub, run `npm run dev`, and whatever you build appears inside the real product. Send the file back when it works; after merge it deploys to drishti.akhileshnagargoje.in.

---

## Setup

```bash
git clone https://github.com/AkhileshNagargoje/drishti.git
cd drishti/app
npm install
npm run dev
```

Ask the main dev for the `.env` values (copy `app/.env.example` to `app/.env`).

**Context you should read first:** `EXPLAINER.md` in the repo root — the whole project in plain language. Ten minutes, and every design decision you'll make gets easier.

## The rules (few, but firm)

- Touch only your own file. The interface (props / route) is fixed — the app already calls it.
- No new npm packages. No `<style>` blocks (inline `style={{}}` or existing classes). JSX, not TypeScript.
- No hardcoded colours — use the CSS variables below; they handle dark mode for you.
- Check your work in light AND dark mode, and in a phone-width window.
- Look at `src/pages/CrewPage.jsx` to see how existing screens are written.

**Palette:** classes `shell panel btn btn-accent btn-good btn-quiet btn-wide chart chart-head chart-sub tile tile-label tile-value badge badge-good badge-warning badge-critical sheet sheet-inner source-chip live empty` · text `--ink-1/2/3` · surfaces `--surface-1/2/-sunk` · lines `--border --border-strong --axis` · meaning `--series-1` (chart blue) `--good-ink --warning-ink --critical-ink` · sizes `--t-hero/xl/lg/md/sm/xs` · spacing `--s-1..7` · corners `--r-sm/md/lg/pill`

---

# TASK 1 — `src/pages/DemoPage.jsx` (route: /demo)

**The problem.** In five days we present this system live on stage. Triggering the demo currently means typing commands into a terminal — slow, error-prone, and it looks amateur in front of judges. The presenter may not be the person who knows the commands.

The backend already exposes three actions as plain web addresses (open them in a browser to see what they return):

- `https://drishti-engine.akhileshnagargoje.in/traffic` — adds a few normal patients
- `https://drishti-engine.akhileshnagargoje.in/scan` — runs outbreak detection now
- `https://drishti-engine.akhileshnagargoje.in/outbreak?sector=5&n=25` — creates a fake outbreak (sector 1–12, n up to 100)

**Design for this person:** someone nervous, on stage, projector mirrored, who has never seen a terminal. What do they need to see, press, and trust? What must never happen (double-fires, silent failures, raw JSON on screen)?

**Done when** the least technical person on the team can run the entire outbreak demo alone from this page, and nothing they can press twice breaks it.

---

# TASK 2 — `src/pages/AboutPage.jsx` (route: /about)

**The problem.** Judges click around an app for two minutes and decide whether it's a product or a school project. Right now there is nowhere that tells them what this is, who made it, and why the problem is real.

Raw material — `EXPLAINER.md` has the story; these numbers are verified with sources you should link:

- **31%** — antibiotic prescribing rate at the 2013/2015 Kumbh Melas, recorded and never acted on → https://publichealth.jmir.org/2023/1/e45121
- **2,000+ visits on day one, 30+ clinics** — proof health workers will enter data on tablets → https://mittalsouthasiainstitute.harvard.edu/2018/05/the-jana-swasthya-project-at-the-2015-kumbh-mela/
- **600 → 35** — modelled cases when the contaminated tap closes on day 1 instead of day 4

**Design for this person:** a judge with 90 seconds and thirty tabs open. What earns the next thirty seconds of their attention?

**Done when** a stranger reads it and can retell the problem to someone else — and the team's names are on it.

---

# TASK 3 — `src/components/MorningCard.jsx`

**The problem.** A doctor at a festival clinic enters 180 patients a day into our system and gets *nothing back*. Data entry feels like a one-way street, and over weeks that is exactly how surveillance systems die — quality rots because nobody sees the point. We want the doctor to get something back, once, at the start of each day.

Your component receives (already wired — it mounts after clinic sign-in, once per day):

```js
{ clinicName, yesterdayPatients, sectorEvent, myAntibioticRate, festivalMedianRate, onClose }
// sectorEvent: string or null. Rates are decimals: 0.18 = 18%.
```

**Design for this person:** a doctor at 7am, tea in one hand, queue already forming, who will give this card *ten seconds at most*. What's worth their glance? What would make them dismiss it forever?

**One value that is not negotiable:** this card must never scold or judge. If their antibiotic rate is high, show the number beside the festival's — the doctor draws the conclusion. The instant this card feels like surveillance *of them*, they stop trusting the whole system.

**Done when** it's readable in ten seconds and the doctor would actually want tomorrow's.

---

# TASK 4 — `src/components/SectorDetail.jsx`

**The problem.** The control-room dashboard shows twelve sector tiles. An official sees Sector 5 running hot and clicks it — and today, nothing useful happens. In that moment they have exactly one question: *what is going on in there, and where do I look first?*

Your component receives (already wired — it mounts when a tile is clicked):

```js
{ sector, totalCases, bySyndrome, clinics, onClose }
// sector: { id, name, waterPoints: [], kitchens: [] }
// bySyndrome: [{ syndrome, count }] sorted biggest first
// clinics: [{ id, name, cases }]
```

**Design for this person:** a district health officer glancing between three screens in a control room. They need the shape of the problem in five seconds — which illness dominates, which clinics are seeing it, what physical sources (taps, kitchens) sit in that sector.

One convention this project holds: in a chart where only *size* carries meaning, everything is one colour (`--series-1`). Colour is reserved for meaning.

**Done when** an official can glance at it and know what's wrong in that sector without reading anything twice.

---

# TASK 5 — `src/lib/useAlertSound.js`

**The problem.** An outbreak alert lands on the dashboard — and the operator is looking at another screen. Nothing sounds, nothing stirs; the alert waits silently to be noticed, which defeats its purpose. (And on demo day: the moment the room *hears* the alert land is the moment the audience feels it.)

What's wanted is a React hook, signature `useAlertSound(alerts, { enabled })` where `alerts` is `[{ id, sector, syndrome, tier }]`, plus a small exported toggle component `AlertSoundToggle({ enabled, onChange })` so the operator stays in control.

**Constraints that come from how browsers work, not from us:** audio must be generated with the Web Audio API (no files, no packages, and browsers block sound before the user's first interaction — create the context lazily). Notification permission must be requested only when the user enables the feature, never on page load. And think about the first render: the page loads with alerts already present — what must *not* happen?

**Design for this room:** a control room, hours of quiet. The sound should be a polite tap on the shoulder, not a fire alarm — and it must never, ever crash the dashboard, whatever the browser supports or denies.

**Done when** a new alert is heard and seen once, existing alerts stay silent on load, and the dashboard survives every permission the browser can refuse.

---

# TASK 6 — `src/components/AgeChart.jsx`

**The problem.** Outbreaks have fingerprints. Cholera at a Kumbh hits the elderly hardest; a food-poisoning cluster hits everyone who ate at one kitchen. The dashboard counts cases but says nothing about *who* is getting sick — and the age profile is a genuine clinical signal an epidemiologist reads instantly.

Your component receives (already wired — it renders on the dashboard with live data):

```js
{ data, title, subtitle }
// data: [{ band: '0-5', count: 12 }, ...] — five age bands
```

**Design for this person:** the same control-room official. The shape of the distribution is the message — an elderly skew should be visible from across the room.

Constraints: draw it yourself as inline SVG (no charting library — nothing else in this app uses one), it must resize with its container, and the one-colour rule applies: height carries the meaning, so every bar is `--series-1`.

**Done when** it sits next to the existing dashboard charts and looks like it was always there.

---

## When you're done

1. `npm run dev` — the app loads, your piece appears
2. Dark mode still readable, phone width doesn't overflow
3. Send the file to the main dev — don't push yourself

Using an AI to help you build is fine — that's how the rest of this project was built too. But the *decisions* should be yours, because you'll be the one standing next to it when a judge asks "why did you build it this way?"

There is also one non-coding task: **print a referral card on real paper and scan the QR off the print.** Nobody has ever tested it. Ask the main dev.
