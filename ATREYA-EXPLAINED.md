# Atreya — everything explained simply

One document. Plain words. Read it once and you can answer any question about
this project.

---

# PART 1 — What is Atreya?

**A system that spots disease outbreaks at big festivals before they spread.**

At the Kumbh Mela, millions of people live in a temporary tent city for weeks.
Dozens of small clinics treat them. Our software watches all those clinics at
once, notices when one area gets unusually sick, and sends a crew to fix the
cause.

---

# PART 2 — The problem

## What goes wrong today

Imagine 14 people drink from one cracked water pipe and fall ill.

They don't all go to the same clinic. They go to **four different clinics**, at
different times of day.

- Doctor A sees 3 cases → looks like a normal day
- Doctor B sees 4 cases → looks like a normal day
- Doctor C sees 5 cases → looks like a normal day
- Doctor D sees 2 cases → looks like a normal day

**Nobody ever sees "14".** That number doesn't exist anywhere. It's sitting in
four separate registers that get added up weeks later.

Nobody made a mistake. Nobody was lazy. The pattern was simply invisible.

By day four there are hundreds of cases, and infected pilgrims have already
taken trains home to dozens of districts.

## The one-line problem

> **The data is collected. It just never reaches a decision-maker in time.**

## Why this problem is worth solving

In 2015, Harvard ran a project called Jana Swasthya at this exact festival. They
proved health workers **will** enter data — over 30,000 patient visits logged on
tablets.

But the system only drew charts. No automatic detection. No alerts. Nobody
assigned to respond.

Its own data even showed antibiotics being given in up to **31% of visits** — a
real problem it recorded faithfully and never acted on.

**Atreya is everything that should happen in the ten minutes after the data is
entered.**

---

# PART 3 — How it works: the six steps

### Step 1 — A doctor records a patient (10 seconds)

Taps on a phone: age, sex, symptoms, illness, medicine given. No typing.

**Works with no internet.** The record saves on the phone first and uploads
itself later when signal returns. At a festival with millions of people, the
mobile network is jammed — so this is essential, not optional.

### Step 2 — All clinics feed one live map

Every clinic writes to the same place. Now, for the first time, someone can see
the whole festival at once: 12 areas, coloured by how busy they are, updating
live.

**Important:** a clinic that stops sending data turns **grey**, not green.
Silence must never look like safety.

### Step 3 — The computer checks every 5 minutes

For each area and each illness, it compares now against normal. (The maths is in
Part 5.)

### Step 4 — If something is wrong, it raises an alert

The alert shows its own working:

> *Sector 5 — diarrhoea — 43 cases, expected 9 — 11 bounces above normal —
> cases came from 4 different clinics — water points in this area: W-7, W-8*

An officer can look at that and argue with it. That matters.

### Step 5 — The alert becomes somebody's job

The officer taps **Assign**. A sanitation crew's phone buzzes. They must:
- tap **Acknowledge** (clock starts)
- go and check
- tap **Resolve** and write one line: *"Cracked pipe at W-7, closed and chlorinated"*

**This step is what makes it a response system instead of a dashboard.** It's
also where every other project stops.

### Step 6 — The finding follows the patient home

If a patient has high BP, high sugar or TB signs, the system prints a small card
with a QR code. They take it to their village clinic. That doctor scans it and
sees the record.

No app. No login. Works on any phone.

---

# PART 4 — Who uses it

| Person | Device | What they see |
|---|---|---|
| **Doctor / nurse** | Phone or tablet | One screen: the patient form |
| **Health officer** | Computer | The map, the alerts, the assign button |
| **Field crew** | Phone | A list of jobs. Accept. Resolve. |

**Pilgrims never log in.** They only receive a printed card.

---

# PART 5 — The maths, taught properly

## Learn it with a tea stall

You sell about **50 cups** a day. Not exactly 50 — some days 46, some days 53.
Nothing is wrong on those days. That's just how it goes.

One day you sell **80**. You instantly think: *something happened.*

Your friend has a small stall. He sells about **5** a day. One day he sells
**8**. Nothing strange — that's just a Tuesday.

**But both went up by exactly 60%.** So percentage can't be the answer.

What did your brain actually use? This:

> *"I normally swing between 46 and 53. 80 is nowhere near that swing."*
> *"He normally swings between 3 and 7. 8 is inside that swing."*

**That swing is what matters. We call it the bounce.**

## The three words

| Word | Meaning |
|---|---|
| **normal** | what this area usually sees at this time of day |
| **bounce** | how much it normally swings when nothing is wrong |
| **ratio** | how many bounces above normal today is |

*(Bounce is called "standard deviation" in textbooks. If a judge uses that word,
they mean this.)*

## Finding "normal"

Look at the **same area**, **same illness**, **same time of day**, on the **last
3 days**.

Example: 9, 8, 9 → normal is about **9**.

**Why the same time of day?** Clinics are busy at 10am and empty at 3am. If you
compared evening against night, *every evening* would look like an outbreak. We
actually had this bug — it raised three false alarms on completely normal data
before we fixed it.

## Finding "bounce"

Two ways. **Use whichever is bigger.**

**Way 1 — measure the last 3 days.** For 9, 8, 9 the spread is small: **0.47**

**Way 2 — square root of normal.** √9 = **3**

Use **3** (the bigger one).

**Why the square root?** Because counting things always wobbles, and the size of
that wobble follows this pattern:

| Normal | Bounce |
|---|---|
| 4 | 2 |
| 9 | 3 |
| 25 | 5 |
| 100 | 10 |

**Why take the bigger one?** Because three days sometimes come out almost
identical **by luck** (like 9, 8, 9). If we trusted that, the computer would
think the bounce is nearly zero — and then even 12 patients would look like a
catastrophe. We never let the maths pretend it's more certain than it can be.

## The formula

```
             today − normal
   ratio =  ────────────────         alert when ratio reaches 3
                 bounce
```

## Worked example

Normal = 9. Bounce = 3. Today = 43.

```
(43 − 9) ÷ 3 = 11 bounces above normal   →   ALERT
```

Normal days sit between 1 and 2 bounces. Eleven is not a busy afternoon.

## Two areas, same rule

| | Quiet area | Busy area |
|---|---|---|
| Normal | 6 | 50 |
| Bounce | 2.5 | 7 |
| **Alerts at** | **14 cases** | **72 cases** |
| Extra people needed | +8 | +22 |

**Nobody configured those numbers.** Each area's own history sets its own line.
Add a new clinic tomorrow and it starts working after three days, with zero
tuning.

## Two safety rules

**Rule 1 — never fewer than 8 people.** Seven cases where you expected zero looks
huge on paper, but it's seven people. Could be one family. We don't send a crew
for that.

**Rule 2 — two levels.**

| Ratio | What happens |
|---|---|
| under 3 | nothing |
| 3 or more | **watch** — appears on the dashboard, nobody is sent |
| 4 or more | **act** — a crew gets the job |

Being wrong at "watch" costs nothing. Being wrong at "act" costs a crew's time.
So the expensive response needs more evidence.

---

# PART 6 — Why 3 bounces?

## The key insight: we make 1,728 decisions a day

```
12 areas × 6 illnesses  =    72 things to watch
72 × 24 hours           = 1,728 checks per day
```

Even a rare mistake happens often if you check that many times.

**Rare × many = several.**

## Watch the numbers collapse

For an area that normally sees 6 patients:

| Bounces above | You'd need | How often by luck | Out of 1,728 checks |
|---|---|---|---|
| 1 | 9 | 15% | 264 a day |
| 2 | 11 | 4.3% | 74 a day |
| **3** | **14** | **0.36%** | **6 a day** |
| 4 | 16 | 0.05% | 1 a day |

**Each extra bounce cuts false alarms by about ten times.**

Why so steep? For many extra patients to arrive at once, many unlucky
coincidences must happen simultaneously. One coincidence is common. Ten at once
is rare.

## So why exactly 3?

- **At 2** → about 74 alerts a day. The officer switches it off on day one.
- **At 4** → lovely and quiet, but you detect an hour later, and an hour is real
  people getting sick.
- **At 3** → about 7 alerts a day, most just sitting on a screen. A human can
  read 7.

> **We chose 3 because that's the most alerts a real person will still pay
> attention to.**

That's a human answer, not a statistics answer — and that's why it's the right
one.

---

# PART 7 — The harness (how we know it works)

## The problem

We can't wait for a real outbreak to test our system. That could take years, and
people would have to get sick.

## What we did

**We built 1,000 fake festivals inside the computer.**

Each one has 12 areas, clinics, patients arriving all day — busy mornings, quiet
nights, just like real life.

In some of them we **hide an outbreak**: random area, random hour. Our detector
has no idea where or when.

In others we hide **nothing at all**.

Then we let the real detection code look at each one, and write down what
happened.

## What it told us

```
A typical outbreak is caught 100% of the time,
about 7 hours after the first case,
when 8 people are sick —
against 33 people sick before a human would notice.
```

And on the festivals where nothing was wrong:

```
6.8 false alarms a day total
1.5 of those actually send a crew
```

## Why judges should trust these numbers

1. **It tests the real code** — it imports the exact function running live, not a
   copy that might have drifted.
2. **Anyone can repeat it** — same settings give the same numbers on any machine.
3. **It doesn't double-count** — one outbreak counts as one alert, not six.
4. **The false-alarm number comes from festivals with nothing hidden** — there's
   nothing to cheat toward.

## The honest limit — say this yourself

> "We built the world it was measured in. The half I'd defend hardest is the
> false-alarm number, because those tests have no outbreak hidden in them. The
> speed number is the softer half."

## Harness vs simulator — don't mix them up

| | Simulator | Harness |
|---|---|---|
| Purpose | makes the live demo work | measures how good the detector is |
| Data goes | into the real database | nowhere, stays in memory |
| How many | one festival, running now | 1,000, one after another |

---

# PART 8 — What we built and what we didn't

## Built and working

- 10-second patient entry, works offline
- Live map of 12 areas
- Automatic detection every 5 minutes
- Alerts with their own arithmetic shown
- Assign → acknowledge → resolve, with timestamps
- Antibiotic reminder when one probably isn't needed
- QR referral card that works with no app
- A second signal from pharmacy sales
- The evaluation harness
- Deployed live, running on free tiers at zero cost

## Not built — say these before a judge finds them

- **Crowd size isn't used yet.** On a big bathing day the crowd triples, so
  counts triple, so every area would look alarming. The proper fix is counting
  cases per 1,000 people present. It's designed, not built.
- **Data is simulated.** Real pipeline, fake patients.
- **No real login.** Four-digit PINs. Fine for a prototype, not for deployment.
- **Translations not checked** by a native speaker yet.
- **The antibiotic rules need a doctor's sign-off.** We drafted them from
  published guidance; we are not clinicians.

---

# PART 9 — Common questions, simply answered

**Q: Why no AI?**
> An officer has to justify sending a crew. With our system they see: expected 9,
> got 43, that's 11 bounces. They can argue with it. With an AI they'd just be
> told "the computer says so" — and officers ignore alerts they can't argue with.
> Also, nobody has a dataset of past Kumbh outbreaks to train an AI on.

**Q: Doesn't the government already do this?**
> India's IHIP system already collects this data at government scale — at
> Haridwar 2021 it captured 31,000 cases across 75 facilities. But it reports
> **daily**, and a human reads it. We're the layer on top: automatic detection
> every five minutes and a dispatch loop. We'd feed their system, not replace it.

**Q: What if there's no internet?**
> Everything still works. The record saves on the phone with its own unique ID
> and uploads later. The ID means uploading twice can't create two patients.

**Q: Is this personal data?**
> Barely. We store age band, sex, area, symptoms, time. **No name, no phone, no
> Aadhaar.** The only record that follows a person is the printed card they carry
> themselves.

**Q: Why not link Aadhaar?**
> It doesn't hold medical history — it would give us a name we don't want and
> none of the history people imagine. It needs an OTP on a jammed network or a
> fingerprint scanner, which would destroy our 10-second target. And you must
> never make treatment depend on ID.

**Q: What if you miss an outbreak?**
> A real outbreak keeps growing. If we miss it at 14 cases, we check again five
> minutes later, and again. We might lose a few hours. We don't lose the outbreak.

**Q: What if the alert is wrong and a crew is wasted?**
> That's why there are two levels. Only "act" alerts send anyone, and we measured
> that at 1.5 a day. A wasted trip costs about a crew-hour and a half — that's
> the real currency, and we tuned the threshold around it.

**Q: Who's liable if something goes wrong?**
> The system never dispatches anyone by itself. It raises a signal; a human
> officer clicks Assign and owns that decision. We never diagnose, never
> prescribe, and never block a doctor.

**Q: What does it cost to run?**
> Zero right now — free tiers. At real festival scale it's low thousands of
> rupees a month. The real cost isn't servers, it's devices and training.

**Q: You used AI to build this. What did you actually learn?**
> Yes, and I'd rather say so than have it discovered. What AI couldn't do was
> decide anything. It didn't know that comparing evening against night makes
> every evening look alarming, or that three identical days make the maths
> overconfident until you add a square-root floor. We found those by running it
> and being wrong. Ask me about any line in the detection code.

---

# PART 10 — The words to know

| Word | Simple meaning |
|---|---|
| **normal** | what this area usually sees at this time |
| **bounce** | how much it swings when nothing is wrong |
| **ratio** | how many bounces above normal today is |
| **watch** | mild alert — shows on screen, nobody sent |
| **act** | serious alert — a crew is dispatched |
| **harness** | 1,000 fake festivals used to test the detector |
| **simulator** | fake patients that make the live demo work |
| **sector** | one area of the festival (we have 12) |
| **syndrome** | a group of illnesses (we track 6) |

---

# The whole thing in five sentences

1. Doctors already collect this data — the 2015 Harvard project proved it.
2. But no single person ever sees the total, so outbreaks stay invisible for days.
3. We add everything up every five minutes and compare each area against its own
   normal.
4. When an area goes 3 bounces above normal, we raise an alert that shows its own
   arithmetic, and turn it into a job somebody must close.
5. The tap gets shut on day one instead of day four.
