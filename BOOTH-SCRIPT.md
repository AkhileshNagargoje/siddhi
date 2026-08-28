# Atreya — the booth script

For judges who walk up to your table. This is **not** the stage pitch. A judge
arriving at a table has not sat down, has already seen six projects, and will
leave the moment they feel they are being read a script.

Everything here is layered. Start at Layer 0 and **stop climbing the moment they
start asking questions** — a judge asking questions is a judge who is interested,
and answering them beats finishing your paragraph.

---

## Before anyone arrives

| # | Do this | Why |
|---|---|---|
| 1 | Laptop: `/dashboard` open and fronted. Second tab `/replay`. Third tab `/public?s=5`. | You must never be seen typing a URL. |
| 2 | Phone: `/entry`, signed in with PIN 1111, storage cleared so it reads "0 today". | The phone is the moment they remember. |
| 3 | `/demo` → **Clear the board**, then **Start outbreak** on sector 5. | A board with 30 stale alerts looks like a broken product. |
| 4 | Check the dashboard actually shows the sector 5 alert before you relax. | |
| 5 | Printed referral card and the printed pilgrim QR poster on the table, face up. | Physical objects stop people walking past. |
| 6 | The pitch PDF open on a second device or printed. | For the judge who wants to read, not listen. |

**Re-run steps 3 and 4 every 30–45 minutes.** The traffic cron keeps generating
patients, and the board slowly fills with real detections. That is the system
working correctly, but it looks like noise to someone seeing it cold.

> Clearing the board starts a 6-hour cooldown on the sectors it closed. That is
> deliberate. **Start outbreak** bypasses it for the sector it fires into, so the
> demo beat always works.

---

## Who does what

With four of you, do not all face the judge. It reads as a crowd.

- **Greeter** — says Layer 0, hands over the phone, watches for the next arrival.
- **Driver** — sits at the laptop, clicks only what the greeter narrates. Never talks over them.
- **Two others** — one step back, silent, ready to take the *next* judge so nobody waits.

Never let two people answer the same question. If the greeter is wrong, the
driver corrects it **after** the judge leaves, not in front of them.

---

## Layer 0 — the fifteen seconds while they are still standing up

Say this, then **stop talking and ask a question**.

> "At the Kumbh, fourteen people drink from a cracked pipe. They go to four
> different clinics at four different hours, so every doctor sees three or four
> cases of diarrhoea — a normal Tuesday. Nobody raises an alarm, because the
> number fourteen doesn't exist anywhere. We built the thing that adds it up,
> every five minutes."

Then, immediately:

> **"Do you want the thirty-second version or the technical one?"**

That question is doing real work. It hands them control, it tells you which
branch to take, and it stops you delivering a speech to someone who wanted a
conversation.

---

## Layer 1 — sixty seconds, one screen

Turn the laptop toward them. Point at three things, no more.

1. **The sector map.** "Twelve sectors, seventeen clinics, live. Shaded by case
   load. Grey means a sector stopped reporting, which is different from calm."
2. **The alert.** Click it. "Every alert shows its own arithmetic — observed,
   expected, how many noise-widths above. An officer can argue with this.
   That's deliberate; they ignore anything they can't argue with."
3. **Dispatch.** "And it becomes a job with a named crew who has to close it
   with what they actually found. That's why time-to-response is a number on the
   screen instead of a claim in a report."

Then the closing line, which is the one you want them to walk away with:

> "Everybody else builds the dashboard. We built the ten minutes after it."

---

## Layer 2 — three minutes, and hand them the phone

**This is the strongest thing you can do at a table.** Do not demo the phone.
Give it to them.

> "Log a patient. You're the doctor."

Let them tap: age band, sex, two symptoms, diagnosis, medicine, save. Say
nothing while they do it — the silence is doing the work. Then:

> "That took you about ten seconds and you'd never seen it before. Now look."

Point at the laptop. The sector tile has moved.

Then the two things they will not have thought of:

> "**It works with no network.** It queues on the phone and syncs when it can.
> That matters more than anything else we built — if the form is slow on a bad
> network, doctors abandon it by day three and every other screen goes dark."

> "And there's a second signal. Medicine stalls tally what they sell.
> Rehydration sales rising in a sector is a different reporter, a different act,
> a different failure mode. **Two signals agreeing is evidence. One signal
> shouting twice isn't.** It also catches people who never reach a clinic at
> all, which is the biggest blind spot in clinic-only surveillance."

Be straight, before they ask:

> "In this demo both streams are simulated and one command writes both. What
> you're seeing is the architecture, not the evidence for it."

---

## Layer 3 — branch by who is standing there

You will usually know within a minute. Pick one branch. Do not do all three.

### If they are technical

Go to the harness. This is your strongest card and most teams have nothing like it.

> "We didn't want to assert it works, so we measured it. A thousand synthetic
> festivals, an outbreak injected at a random sector and a random hour, and it
> runs the **deployed** detection function over every hour of each one."

Then the four things that make it a measurement and not a demo:

- It imports the live `scoreCell()` — not a reimplementation that could drift.
- It is seeded, so `--seed 42` reproduces on their machine.
- It mirrors the engine's dedup, so one outbreak doesn't count as six catches.
- The false-alarm half has **nothing injected** — it can't be gamed by construction.

> "A typical waterborne outbreak: caught every time, median seven hours after
> the first case, at eight cases — against thirty-three before it'd be obvious
> to someone reading a chart."

**Offer to run it in front of them.** `cd worker && node eval/harness.mjs`.
Almost nobody can do this, and offering is worth as much as running it.

If they push on the maths, the whole detector is one line and you should say it
out loud:

> "Observed minus the mean, over the max of the standard deviation, the square
> root of the mean, and one. Fires at three and at least eight cases."

Then explain the Poisson floor, because it is the part that shows you thought:

> "Three quiet days in a row gives you a standard deviation of zero, and z goes
> infinite — every cell screams. Count data has irreducible noise of about
> root-mean, so we never let the divisor drop below it. That one term kills most
> small-sample false alarms."

### If they are public health / domain

Go to the pilgrim screen and the referral card.

> "This is what a pilgrim sees. Scan a printed poster — no app, no login,
> nothing recorded. It shows which areas are affected and which illness is going
> around. It **never** shows a case count."

Pause, then the reason, which is the part that lands:

> "A number invites comparison between areas. Comparison moves crowds. And
> crowd movement is what kills at these events. So every status ends in an
> instruction, and the board says plainly that a marked area is not a reason to
> move, because every area has its own free clinic."

Then the card:

> "And a pilgrim found to have high blood pressure doesn't lose that finding on
> the train home. The QR carries the record itself, not a link — so a village
> clinic in another state reads it with no network and no app."

If they know the history, name it first:

> "In 2015 a Harvard project ran this exact experiment at this exact festival.
> It proved health workers will enter the data — two thousand visits on day one.
> Then it drew charts with it. Its own published data shows antibiotics in up to
> thirty-one percent of encounters, recorded and never acted on. We built what
> happens next."

### If they are business / judging viability

> "Nothing here is ours to keep alive. It's static assets and two Cloudflare
> Workers — no server to scale on a bathing day. And it's config-driven: sectors,
> clinics, syndromes and thresholds are one file. Point it at a different
> gathering by editing that file, not by rewriting it."

> "It also needs no new hardware and no new staff. The doctor already sees the
> patient. We're asking for ten seconds of what they already know."

---

## Walk-up questions, with short answers

Keep these to two or three sentences at a table. Long answers lose the room.

**"Isn't this just a dashboard?"**
> A dashboard is where this stops for everyone else. Ours turns every alert into
> an assigned job a named crew has to close with an outcome — which is the only
> reason we can measure time-to-response at all.

**"Why no AI?"**
> Deliberately. A district health officer will act on "fourteen against four
> expected" and will ignore a black box, so explainability is an adoption
> feature. And there are seventy-two series with no labelled outbreak history —
> there's nothing for a model to learn that arithmetic doesn't already give you.

**"Your data is fake."** — *say this before they do*
> Yes. It's synthetic, written through the same API a real tablet writes to, so
> the detector can't tell the difference. That's exactly what let us measure
> across a thousand festivals instead of asserting it once.

**"What happens on a bathing day when the crowd triples?"** — *concede instantly*
> Correct, and it's the first thing we'd fix. We detect on raw counts, so a real
> crowd surge would false-positive everywhere at once. The fix is rates per
> thousand present, using the crowd estimates the administration already
> produces. It's designed and deliberately not built — we chose to make what
> exists solid.

**"Three sigma — so a one-in-740 event?"** — *do not say yes*
> No, and I wouldn't defend it that way. It's a triage threshold, not a p-value.
> It's tuned to put roughly the right number of things in front of a human,
> which is why we measured the false-alarm rate instead of quoting a tail
> probability.

**"Why not scan Aadhaar?"**
> Aadhaar doesn't hold medical history — it returns demographics, so we'd get a
> name we don't want and none of the clinical history you're imagining. ABHA is
> the system that holds records. But the real answer is that identity adds
> nothing: we count cases per sector against that sector's own history, and a
> z-score doesn't care who anyone is. It would cost us the ten-second entry and
> turn away exactly the elderly and rural pilgrims most at risk.

**"How many false alarms?"**
> One and a half a day dispatch a crew; five point four a day appear on the
> dashboard and send nobody. We report them separately because they cost
> completely different things. And be honest about the caveat — that's from
> Poisson traffic; our own simulator is burstier and fires more.

**"What's left to build?"**
> Crowd normalisation, a clinician review of the advice wording, native-speaker
> verification of the Hindi and Marathi, and validating the detector against the
> real Jana Swasthya dataset. All four are written down, none are hidden.

**"Who built what?"** — *have a real answer, judges ask this*
> Name who did the pitch, the content, the testing, and the engineering. Do not
> say "we all did everything."

---

## Six rules of the table

1. **Read every number off the screen, never from memory.** If the screen says
   34 and you say 14, you have lost them and you will not get them back.
2. **Never let a judge stand and watch you type.** Everything is one click from
   a tab that is already open.
3. **Hand over the phone.** A judge who has used it remembers it. A judge who
   watched you use it remembers nothing.
4. **Say the weakness first.** Fake data, bathing day, unverified translations.
   Volunteering a limitation buys more credibility than defending one costs.
5. **Stop talking when they start.** A question is interest. Finishing your
   paragraph over it is not.
6. **Do not quote "600 cases reduced to 35."** It is a curve fitted to nothing
   and it sits beside a measured number. The harness owns every figure you say.

---

## If something breaks

| Problem | Do this |
|---|---|
| No alert on the board | `/demo` → Start outbreak. If that fails, switch to `/replay` — that is why it exists |
| Board looks stale | Hard refresh (Ctrl+Shift+R). **Never deploy during judging** |
| Phone won't sync | "It's queued — that's the offline design." True, and it is a feature |
| Board is full of noise | `/demo` → Clear the board, then Start outbreak. Takes ten seconds |
| Laptop dies entirely | Talk. Layer 0 and the referral card work with no screen at all |

---

## The one sentence, if you only get one

> "Every clinic treats its own patients well, and nobody compares notes. We do
> that every five minutes — and in testing we catch a typical outbreak at eight
> cases instead of thirty-three, about seven hours earlier."
