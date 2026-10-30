# Siddhi — Team Handbook

Everything about this project, in simple words. If you read only one document,
read this one.

## Contents

1. What Siddhi is
2. The problem we solve
3. How it works — six steps
4. Who uses it
5. The technology, explained simply
6. The maths, with the equations
7. Why we alert at 3
8. How we know it works (the harness)
9. What is built and what is not
10. Running the demo
11. Questions people will ask
12. Words to know
13. Where everything lives

---

# 1. What Siddhi is

**A system that spots disease outbreaks at big festivals before they spread.**

At the Kumbh Mela, millions of people live in a temporary tent city for weeks.
Dozens of small clinics treat them. Siddhi watches all those clinics at once,
notices when one area gets unusually sick, and sends a crew to fix the cause.

*Siddhi is already built and running live at* **health.akhileshnagargoje.in**

---

# 2. The problem we solve

## What happens today

Imagine 14 people drink from one cracked water pipe and fall ill.

They do not all go to the same clinic. They go to **four different clinics**, at
different times of day.

- Doctor A sees 3 patients → normal day
- Doctor B sees 4 patients → normal day
- Doctor C sees 5 patients → normal day
- Doctor D sees 2 patients → normal day

**Nobody ever sees the number 14.** It does not exist anywhere. It is sitting in
four separate registers that get added up weeks later.

Nobody made a mistake. Nobody was lazy. The pattern was simply invisible.

By day four there are hundreds of cases, and infected pilgrims have already taken
trains home to dozens of districts.

## The problem in one line

> **The data is collected. It just never reaches a decision-maker in time.**

## Why this matters

In 2015, Harvard ran a project called **Jana Swasthya** at this exact festival.
They proved health workers **will** enter data — thousands of patient visits on
tablets on day one alone.

But that system only drew charts. No automatic detection. No alerts. Nobody
assigned to respond.

Its own data even showed antibiotics being given in up to **31% of visits** — a
real problem it recorded faithfully and never acted on.

> **Siddhi is everything that should happen in the ten minutes after the data is
> entered.**

---

# 3. How it works — six steps

### Step 1 — A doctor records a patient (10 seconds)

Taps on a phone: age, sex, symptoms, illness, medicine given. No typing.

**Works with no internet.** The record saves on the phone first and uploads
itself when signal returns. At a festival with millions of people the mobile
network is jammed, so this is essential, not optional.

### Step 2 — All clinics feed one live map

Every clinic writes to the same place. Now someone can see the whole festival at
once: 12 areas, coloured by how busy they are, updating live.

**Important:** a clinic that stops sending data turns **grey**, not green.
Silence must never look like safety.

### Step 3 — The computer checks every 5 minutes

For each area and each illness, it compares now against normal. The maths is in
section 6.

### Step 4 — If something is wrong, it raises an alert

The alert shows its own working:

> *Sector 5 — diarrhoea — 43 cases, expected 9 — 11 bounces above normal — cases
> came from 4 different clinics — water points here: W-7, W-8*

An officer can look at that and argue with it. That matters.

### Step 5 — The alert becomes somebody's job

The officer taps **Assign**. A crew's phone buzzes. They must:

- tap **Acknowledge** (a clock starts)
- go and check
- tap **Resolve** and write one line: *"Cracked pipe at W-7, closed and chlorinated"*

**This step is what makes it a response system instead of a dashboard.** It is
also where every other project stops.

### Step 6 — The finding follows the patient home

If a patient has high BP, high sugar or TB signs, the system prints a small card
with a QR code. They take it to their village clinic. That doctor scans it and
sees the record.

No app. No login. Works on any phone.

---

# 4. Who uses it

| Person | Device | What they see | Demo PIN |
|---|---|---|---|
| **Doctor / nurse** | Phone or tablet | One screen: the patient form | **1111** |
| **Health officer** | Computer | The map, alerts, assign button | no PIN |
| **Field crew** | Phone | A list of jobs — accept, resolve | **3333** |

**Pilgrims never log in.** They only receive a printed card.

---

# 5. The technology, explained simply

## The pieces

| Piece | What it is | What it does here |
|---|---|---|
| **React** | a way of building web pages | all three screens |
| **Supabase** | a database in the cloud | stores every patient, alert and job |
| **Realtime** | a Supabase feature | pushes new data to the dashboard instantly, no refresh |
| **Cloudflare Workers** | code that runs in the cloud | serves the website, and runs our detection engine |
| **Cron** | a timer in the cloud | runs detection every 5 minutes, forever |

## Why we chose them

**Why Supabase?** It gives us a real database plus live updates for free. The
live update is why the dashboard changes the instant a doctor saves a patient —
we did not write that, the database does it.

**Why Cloudflare Workers?** Three reasons. It costs nothing. There is no computer
to look after — nothing on anyone's laptop, nothing to restart. And the timer is
built in, so detection cannot silently stop because someone closed a window.

**Total running cost: zero.** Everything sits inside free tiers.

## How data flows

```
Doctor's phone
      |  (saves on the phone first, uploads when there is signal)
      v
  Database  ------------------> Dashboard  (updates instantly)
      ^                              |
      |                              | officer taps Assign
      |                              v
Detection engine                 Crew's phone
(every 5 minutes,                 (accept, fix, resolve)
 in the cloud)
```

## The six tables

| Table | What is in it |
|---|---|
| `encounters` | every patient visit |
| `clinics` | the list of clinics and which area each is in |
| `baselines` | what "normal" looks like for each area |
| `alerts` | every alert raised |
| `tasks` | every job sent to a crew |
| `referrals` | every QR card printed |

---

# 6. The maths, with the equations

## Step 1 — What is normal here?

```
normal = (day1 + day2 + day3) ÷ 3
```

Add up what this area saw on the last 3 days **at this same time of day**, divide
by 3.

Only 3 days, because a festival is short and there is no year of history. And if
we looked further back, an outbreak running for a while would slowly become the
"normal" — and then we would never notice it.

**Why the same time of day?** Clinics are busy in the morning and dead at 3am. We
got this wrong at first and the system threw **three false alarms on perfectly
normal data**, because every evening looked like a disaster next to the night
before.

---

## Step 2 — How much does this area normally move?

```
spread = √( ((d1−normal)² + (d2−normal)² + (d3−normal)²) ÷ 3 )
```

Nothing counts the same every day. A clinic averaging 9 patients sees 7, then 11,
then 9, then 12 — all normal days. This measures that natural movement.

Take each day, see how far it sits from the average, square it (to remove the
minus signs), average those, then square-root it (to undo the squaring).

---

## Step 3 — Pick the bounce

```
bounce = max( spread , √normal , 1 )
```

Three candidates. **Take the biggest.** Each guards against a different problem.

**`spread`** — what we just measured. Good, unless the 3 days came out nearly
identical by luck, like 5, 5, 5. Then it looks like this place never changes,
which is not true.

**`√normal`** — the safety floor. If you normally count about 9, it naturally
swings by about 3. Count 100, it swings about 10. Square root. Without this, a
clinic that saw 5, 5, 5 and then sees 12 would set off a **full emergency**.

**`1`** — pure safety. A brand-new clinic with no history would have everything
at zero, and we would be dividing by zero. The 1 stops the crash.

---

## Step 4 — How strange is today?

```
ratio = (today − normal) ÷ bounce
```

**`today − normal`** is the gap in patients. Not a percentage — percentages break
on small numbers. Going 6 → 9 and 50 → 75 are both +50%, but only one is strange.

**`÷ bounce`** turns that gap into *how surprising* it is. Ten extra patients at a
busy clinic is nothing; ten at a tiny one is alarming. Dividing by that area's own
bounce puts both on the same scale.

---

## Step 5 — Do we raise a flag?

```
alert  when  ratio ≥ 3  AND  today ≥ 8
```

**`ratio ≥ 3`** — see section 7 for why.

**`today ≥ 8`** — no matter how strange the ratio, never alert on fewer than 8
people. An area that normally sees nothing could hit a ratio of 3 with just 3
patients, and 3 patients might be one family.

---

## Step 6 — How serious is it?

```
tier = act    if ratio ≥ 4
       watch  if ratio ≥ 3
```

At **watch** it goes on the dashboard and nobody moves — costs nothing if wrong.
At **act** a crew is dispatched, costing about 90 minutes of someone's time, so
it needs stronger evidence.

---

## Worked example

Last 3 days: **9, 8, 9** · Today: **43**

```
normal = (9 + 8 + 9) ÷ 3               = 8.67
spread = √( (0.11 + 0.44 + 0.11) ÷ 3 ) = 0.47
bounce = max( 0.47 , √8.67 , 1 )
       = max( 0.47 , 2.94 , 1 )        = 2.94    ← the floor wins
ratio  = (43 − 8.67) ÷ 2.94            = 11.7
```

11.7 ≥ 4 and 43 ≥ 8 → **ACT alert, crew dispatched**

---

## The whole thing on one line

```
alert line = max( normal + 3 × bounce , 8 )
```

This is how many patients trigger a flag in any area:

| Area | Normal | Bounce | Alerts at |
|---|---|---|---|
| Quiet | 6 | 2.45 | **14 patients** |
| Busy | 50 | 7.07 | **72 patients** |

Same formula. Different answer. **Nobody configured either one** — each area's
own history sets its own line. Add a new clinic tomorrow and it starts working
after three days with zero tuning.

---

# 7. Why we alert at 3

## We make 1,728 decisions a day

```
12 areas × 6 illnesses  =    72 things to watch
72 × 24 hours           = 1,728 checks per day
```

Even a rare mistake happens often if you check that many times.

**Rare × many = several.**

## Watch the numbers collapse

For an area that normally sees 6 patients:

| Bounces above | You would need | How often by luck | Out of 1,728 checks |
|---|---|---|---|
| 1 | 9 | 15% | 264 a day |
| 2 | 11 | 4.3% | 74 a day |
| **3** | **14** | **0.36%** | **6 a day** |
| 4 | 16 | 0.05% | 1 a day |

**Each extra bounce cuts false alarms by about ten times.**

Why so steep? For many extra patients to arrive at once, many unlucky
coincidences must happen at the same time. One coincidence is common. Ten at once
is rare.

## So why exactly 3?

- **At 2** → about 74 alerts a day. The officer switches it off on day one.
- **At 4** → quiet, but you detect an hour later, and an hour is real people.
- **At 3** → about 7 a day, most just sitting on a screen. A human can read 7.

> **We chose 3 because it is the most alerts a real person will still pay
> attention to.**

That is a human answer, not a statistics answer — and that is why it is right.

---

# 8. How we know it works (the harness)

## The problem

We cannot wait for a real outbreak to test our system. That could take years, and
people would have to get sick.

## What we did

**We built 1,000 fake festivals inside the computer.**

Each has 12 areas, clinics, patients arriving all day — busy mornings, quiet
nights, just like real life.

In some we **hide an outbreak**: random area, random hour. Our detector has no
idea where or when.

In others we hide **nothing at all**.

Then we let the real detection code look at each one and write down what
happened.

## What it told us

```
A typical outbreak is caught 100% of the time,
about 7 hours after the first case,
when 8 people are sick —
against 33 people sick before a human would notice.
```

On the festivals where nothing was wrong:

```
6.8 false alarms a day in total
1.5 of those actually send a crew
```

## Why judges should trust these numbers

1. **It tests the real code** — it imports the exact function running live, not a
   copy that might have drifted.
2. **Anyone can repeat it** — same settings give the same numbers on any machine.
3. **It does not double-count** — one outbreak counts as one alert, not six.
4. **The false-alarm number comes from festivals with nothing hidden** — there is
   nothing to cheat toward.

## The honest limit — say this yourself

> "We built the world it was measured in. The half I would defend hardest is the
> false-alarm number, because those tests have no outbreak hidden in them. The
> speed number is the softer half."

## Harness vs simulator — do not mix them up

| | **Simulator** | **Harness** |
|---|---|---|
| Purpose | makes the live demo work | measures how good the detector is |
| Data goes | into the real database | nowhere, stays in memory |
| How many | one festival, running now | 1,000, one after another |

---

# 9. What is built and what is not

## Built and working

- 10-second patient entry, works offline
- Live map of 12 areas
- Automatic detection every 5 minutes, in the cloud
- Alerts showing their own arithmetic
- Assign → acknowledge → resolve, with timestamps
- Antibiotic reminder when one is probably not needed
- QR referral card that works with no app
- A second signal from pharmacy sales
- The evaluation harness
- Nine unit tests on the detection maths
- Deployed live, zero cost

## Not built — say these before a judge finds them

- **Crowd size is not used yet.** On a big bathing day the crowd triples, counts
  triple, and every area would look alarming. The fix is counting cases per 1,000
  people present. Designed, not built.
- **Data is simulated.** Real pipeline, fake patients.
- **No real login.** Four-digit PINs — fine for a prototype, not for deployment.
- **Translations not checked** by a native speaker yet.
- **Antibiotic rules need a doctor's sign-off.** Drafted from published guidance;
  we are not clinicians.

---

# 10. Running the demo

## Before you present

1. Open `/demo` and press **"Clear the board"** — closes old alerts so the
   dashboard starts calm. **Do not skip this.**
2. Log both phones in beforehand — Phone 1 on `/entry` with PIN 1111, Phone 2 on
   `/crew` with PIN 3333.
3. Press **"Add a minute of traffic"** and watch the counter move, to prove the
   whole chain is alive.

## The demo console at `/demo`

| Button | What it does |
|---|---|
| **Start outbreak** | injects the demo outbreak and tells you the alert's strength |
| **Run detection now** | forces the scan that normally runs every 5 minutes |
| **Add a minute of traffic** | adds patients if the board looks static |
| **Clear the board** | closes every open alert and job |

## If something fails

| Problem | Fix |
|---|---|
| Network dies | Open `/replay` — runs entirely in the browser |
| Alert does not appear | Press **"Run detection now"** |
| Board looks static | Press **"Add a minute of traffic"** |
| Old alerts cluttering | Press **"Clear the board"** |

**Never apologise for a technical problem.** Fix it quietly or narrate it as a
feature. Judges remember panic far longer than a delay.

---

# 11. Questions people will ask

**Why no AI?**
> An officer has to justify sending a crew. With our system they see: expected 9,
> got 43, that is 11 bounces. They can argue with it. With an AI they would just
> be told "the computer says so" — and officers ignore alerts they cannot argue
> with. Also, nobody has a dataset of past Kumbh outbreaks to train an AI on.

**Doesn't the government already do this?**
> India's IHIP system already collects this data at government scale. But it
> reports **daily** and a human reads it. We are the layer on top: automatic
> detection every five minutes, and a dispatch loop. We would feed their system,
> not replace it.

**What if there is no internet?**
> Everything still works. The record saves on the phone with its own unique ID and
> uploads later. The ID means uploading twice cannot create two patients.

**Is this personal data?**
> Barely. We store age band, sex, area, symptoms, time. **No name, no phone, no
> Aadhaar.** The only record that follows a person is the card they carry
> themselves.

**Why not link Aadhaar?**
> It does not hold medical history — it would give us a name we do not want and
> none of the history people imagine. It needs an OTP on a jammed network or a
> fingerprint scanner, which would destroy our 10-second target. And you must
> never make treatment depend on ID.

**What if you miss an outbreak?**
> A real outbreak keeps growing. If we miss it at 14 cases, we check again five
> minutes later. We might lose a few hours. We do not lose the outbreak.

**What if the alert is wrong and a crew is wasted?**
> That is why there are two levels. Only "act" alerts send anyone, and we measured
> that at 1.5 a day. A wasted trip costs about 90 minutes — that is the real
> currency, and we tuned the threshold around it.

**Who is liable if something goes wrong?**
> The system never dispatches anyone by itself. It raises a signal; a human
> officer clicks Assign and owns that decision. We never diagnose, never
> prescribe, never block a doctor.

**What does it cost to run?**
> Zero right now. At real festival scale, low thousands of rupees a month. The
> real cost is not servers — it is devices and training.

**You used AI to build this. What did you learn?**
> Yes, and I would rather say so than have it discovered. What AI could not do was
> decide anything. It did not know that comparing evening against night makes
> every evening look alarming, or that three identical days make the maths
> overconfident until you add a square-root floor. We found those by running it
> and being wrong.

---

# 12. Words to know

| Word | Simple meaning |
|---|---|
| **normal** | what this area usually sees at this time of day |
| **bounce** | how much it swings when nothing is wrong |
| **ratio** | how many bounces above normal today is |
| **watch** | mild alert — shows on screen, nobody sent |
| **act** | serious alert — a crew is dispatched |
| **harness** | 1,000 fake festivals used to test the detector |
| **simulator** | fake patients that make the live demo work |
| **sector** | one area of the festival (we have 12) |
| **syndrome** | a group of illnesses (we track 6) |
| **encounter** | one patient visit |

*(Bounce is called "standard deviation" in textbooks. If someone uses that word,
they mean this.)*

---

# 13. Where everything lives

## Live links

| What | Address |
|---|---|
| The app | health.akhileshnagargoje.in |
| Doctor's screen | /entry — PIN 1111 |
| Officer's dashboard | /dashboard |
| Crew's screen | /crew — PIN 3333 |
| The 60-second replay | /replay |
| Demo console | /demo |
| The engine | health-engine.akhileshnagargoje.in |

## In the code

| What | Where |
|---|---|
| The three screens | `app/src/pages/` |
| The detection maths | `worker/src/index.js` → `scoreCell()` |
| The tests | `worker/test/score.test.mjs` |
| The harness | `worker/eval/harness.mjs` |
| The results | `worker/eval/RESULTS.txt` |
| Festival settings | `app/src/config/festival.js` |

## Commands

```
cd app     && npm run dev          start the app locally
cd app     && npm run build        build it
cd app     && npx wrangler deploy  put it live
cd worker  && npm test             run the 9 tests
cd worker  && node eval/harness.mjs   run 1,000 fake festivals
```

## Other documents

| File | What it is |
|---|---|
| `REHEARSAL-SCRIPT.md` | the demo, minute by minute |
| `FORMULA-EXPLAINED.md` | every piece of the maths and why |
| `TECH-QA-*.md` | ~110 hostile questions with answers |
| `HARNESS-EXPLAINER.md` | how to explain the harness |
| `PROGRESS.md` | what is done and what is next |

---

# The whole project in five sentences

1. Doctors already collect this data — the 2015 Harvard project proved it.
2. But no single person ever sees the total, so outbreaks stay invisible for days.
3. We add everything up every five minutes and compare each area against its own
   normal.
4. When an area goes 3 bounces above normal we raise an alert that shows its own
   arithmetic, and turn it into a job somebody must close.
5. The tap gets shut on day one instead of day four.
