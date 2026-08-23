# Team problems

These are problems, not tasks. Nobody is telling you what to build — a page, a widget, a sound, a printout, a script: your call. Understand the person in the problem, decide what would actually help them, and build that.

What you make may or may not end up in the final product — that's normal, that's how real teams work. Build it well enough to argue for it.

**Read `EXPLAINER.md` first** (repo root). Ten minutes, the whole project in plain language. Every decision gets easier after it.

---

## Practicalities

```bash
git clone https://github.com/AkhileshNagargoje/siddhi.git
cd siddhi/app
npm install
npm run dev
```

Ask the main dev for the two `.env` values. The app is React + plain CSS; look at `src/pages/CrewPage.jsx` to see the house style. The live system is at siddhi.akhileshnagargoje.in.

- Put your work in **new files** — don't edit existing ones. The main dev merges.
- No new npm packages without asking.
- The app's colours live in CSS variables (see `src/styles/tokens.css`) — using them means dark mode works for free.
- Using AI to build is fine; the rest of the project was built that way too. But the decisions must be yours — you'll be the one explaining them to a judge.

---

## Problem 1 — The presenter

In a few days we demonstrate this system live, on stage, in front of judges. The demonstration needs an outbreak to happen while people watch: patients arriving, the alert firing, a crew responding.

Today, making that happen requires typing commands into a terminal. The person on stage will be nervous, the screen will be mirrored to a projector, and there may be no terminal at all. If the demo stumbles for ninety seconds, we lose the room.

**The person:** whoever is holding the clicker, under pressure, in front of an audience.

---

## Problem 2 — The judge

A hackathon judge gives each project a few minutes. They click around the app, form an impression — *real product* or *student exercise* — and move on. Right now, nothing anywhere in the app tells them what this is, why the problem matters, who built it, or that the numbers behind our story are real.

Verified facts you may want, with sources:
- Antibiotics were prescribed in up to **31%** of encounters at the 2013/2015 Kumbh Melas — https://publichealth.jmir.org/2023/1/e45121
- The 2015 project logged **2,000+ visits on day one across 30+ clinics** on tablets — https://mittalsouthasiainstitute.harvard.edu/2018/05/the-jana-swasthya-project-at-the-2015-kumbh-mela/

**The person:** a tired judge, ninety seconds, thirty tabs open, deciding whether to care.

---

## Problem 3 — The doctor who gets nothing back

A doctor at a festival clinic enters 180 patients a day into our system. The system takes and takes and gives nothing back. The doctor never learns what their data caught, never sees what happened in their sector, never gets a reason to keep caring.

This is how surveillance systems actually die — not from bugs, but from data entry quietly turning careless in week three because it feels pointless.

One warning from the project's values: whatever the doctor gets back must never judge them. The moment it feels like surveillance *of the doctor*, trust is gone.

**The person:** a doctor at 7am, tea in one hand, queue already forming, ten seconds of attention to give you.

---

## Problem 4 — The official who can't see inside

> Note: the dashboard now has an **In-depth analysis** tab covering the festival
> as a whole — rankings, case mix, trends. This problem is still open and still
> yours: it is about clicking **one sector tile** and seeing inside *that*
> sector. Do not rebuild the festival-wide view.

The control room shows twelve sector tiles with case counts. An official sees Sector 5 running hot. Their next questions are immediate: *What kind of illness? Who is it hitting — children, the elderly, everyone? Which clinics are seeing it? What's physically in that sector that could be the source?*

The dashboard cannot answer any of that today. The official is looking at a number when they need the shape of a problem.

(Worth knowing: the *age profile* of an outbreak is a real clinical fingerprint — cholera at a Kumbh skews elderly; a bad kitchen hits everyone who ate there.)

**The person:** a district health officer glancing between three screens, five seconds per glance.

---

## Problem 5 — The operator looking away

An outbreak alert lands on the dashboard. The operator is looking at another screen, or talking to someone, or getting tea. The alert sits there, silent and unnoticed — which defeats the entire point of an early-warning system.

And on demo day there's a second layer: the moment the *audience* notices the alert land is the emotional peak of the presentation.

**The person:** a control-room operator on hour six of a quiet shift — and, once, a room full of judges.

---

## Problem 6 — The card nobody has printed

Patients with dangerous readings get a referral card with a QR code, meant to be printed on paper and carried home to a village clinic. The entire feature exists so that a finding survives the train ride home.

**Nobody has ever printed one.** Not once. We do not know if it fits the page, if the QR scans off paper, or what a phone camera makes of it. A feature that only works on screen is, for this population, a feature that doesn't work.

**The person:** an elderly pilgrim with a folded piece of paper, and a village clinician with a phone camera.

---

---

# Small pieces — remake something that already exists

If the problems above feel too open, start here. Each of these is a small piece of the product that already works — so nothing depends on you, and nothing can break. Build **your own version** in a new file (`src/mine/<yourname>/...`). When it's ready we put the two side by side and keep the better one. If yours wins, it ships, and it's yours.

Look at the current one first, then close it and design your own. Don't copy — the point is your take on it.

| Piece | What it must do | Current version lives in |
|---|---|---|
| PIN sign-in screen | 4-digit PIN, big touch targets, obvious error on wrong PIN | `src/pages/EntryPage.jsx` (bottom) |
| Referral card | Printable card: QR, patient facts, bilingual instruction — must look right on paper | `src/components/ReferralCard.jsx` |
| Alert row | One alert in a list: sector, illness, the numbers, a status that reads at a glance | `src/pages/DashboardPage.jsx` (alert-card) |
| "Why this fired" box | Explain observed vs expected so a non-statistician trusts it in five seconds | `src/pages/DashboardPage.jsx` (detail) |
| Sector tile | One map tile: id, name, count, alert state — legible from across a room | `src/components/viz.jsx` (SectorGrid) |
| KPI tile | A number with a label and a tiny trend — the calmest thing on the screen | `src/components/viz.jsx` (StatTile) |
| Home page | The role picker — first thing every judge sees | `src/App.jsx` (Home) |
| Empty & error states | What screens show when there's no data, no alerts, no network | scattered — find them |

These are real: every one of them is on screen during the demo. A better sector tile or a better home page is a visible contribution with your name on it.

---

## When you've built something

1. It runs (`npm run dev`) and doesn't break anything that already works
2. Check it in dark mode and at phone width
3. Bring it to the main dev — show what you made and why. Then we decide together what ships.
