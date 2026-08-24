# Atreya — demo rehearsal script

Print this. Run it five times. The fifth run is the one that goes on stage.

**Roles**
- **Driver** — holds the laptop, drives the dashboard and the demo console
- **Speaker** — talks. Does not touch a device.
- **Phone 1** — the doctor's phone
- **Phone 2** — the crew's phone

If you only have two people, the Speaker holds Phone 1 and the Driver holds
Phone 2.

---

# PART 1 — Pre-flight (10 minutes before you present)

Do these in order. Tick each one out loud.

### Devices

- [ ] Laptop charged, **screen sleep turned OFF**, plugged into the projector
- [ ] Phone 1 charged, screen timeout set to 5 minutes
- [ ] Phone 2 charged, screen timeout set to 5 minutes
- [ ] All three on the same network, and **test it** — load the dashboard on each

### Tabs to open (laptop)

| Tab | URL | Notes |
|---|---|---|
| 1 | `health.akhileshnagargoje.in/dashboard` | **the one on screen** |
| 2 | `health.akhileshnagargoje.in/demo` | your control room — never shown |
| 3 | `health.akhileshnagargoje.in/replay` | backup if live fails |

### Phones

- [ ] Phone 1 → `/entry`, **already logged in** with PIN **1111**
- [ ] Phone 2 → `/crew`, **already logged in** with PIN **3333**

Log in *before* you go up. Typing a PIN on stage wastes 15 seconds and invites a
typo.

### The one step people forget

- [ ] On Tab 2 (`/demo`), press **"Clear the board"**

This closes every old alert so the dashboard starts calm. **If you skip this,
your screen is covered in stale alerts from testing and the new one is invisible.**

- [ ] Go back to Tab 1 and confirm the dashboard now shows **0 open alerts**

### Final check

- [ ] Press **"Add a minute of traffic"** once, and watch the patient counter tick
      up on Tab 1. That proves the whole chain is alive: engine → database →
      dashboard.

---

# PART 2 — The script (7 minutes)

## 0:00 – 0:45 · The hook (no screen yet)

**Speaker, looking at the judges, not the laptop:**

> "At the Kumbh Mela, imagine fourteen people drink from one cracked water pipe
> and fall ill.
>
> They don't go to one clinic. They go to four different ones, at different
> hours. Each doctor sees three or four patients with loose motions — a
> completely normal afternoon.
>
> So nobody raises an alarm. There's no alarm to raise, because the number
> fourteen doesn't exist anywhere. It's sitting in four separate registers that
> get added up weeks later.
>
> By day four there are hundreds of cases. We built the system that sees
> fourteen."

**Driver:** stay on Tab 1. Do nothing.

---

## 0:45 – 1:45 · Capture (Phone 1)

**Speaker:**

> "This is what a doctor uses. Everything is a tap, and it works with no
> network — because at a festival of millions, the mobile network is jammed."

**Phone 1 — tap in this order** (rehearse until it's muscle memory):

```
60+  →  M  →  Loose motions  →  Vomiting
     →  Acute gastroenteritis  →  ORS  →  Save patient
```

**Speaker, while the taps happen:**

> "Age, sex, symptoms, diagnosis, medicine. About ten seconds. No typing at all."

**Then point at the projector:**

> "And watch the wall."

**Driver:** nothing to click — the counter moves by itself. Give it 2 seconds of
silence so the judges *see* it move. **That silence is the moment. Don't talk
over it.**

---

## 1:45 – 3:15 · The outbreak (the centrepiece)

**Driver:** switch to Tab 2 (`/demo`), press **"Start outbreak"**, then switch
straight back to Tab 1. Takes about 4 seconds.

**Speaker, covering those seconds:**

> "Now let's run the exact scenario from my story. Cases are appearing across
> Sector 5's clinics — spread out, just like real life."

Within a few seconds Sector 5 turns red and the alert appears.

**Driver:** click the alert to open it.

**Speaker — slow down here, this is the payload:**

> "The system checks every area against its own normal, every five minutes.
> Here's what it found."

*(point at the numbers on screen)*

> "Forty-three cases where nine were expected. That's eleven times the normal
> variation — not a busy afternoon.
>
> And this line is the whole project: **these cases came from four different
> clinics.** No single doctor could have seen this. The system also tells you
> where to look — water points W-7 and W-8 in that sector.
>
> There's no black box here. That arithmetic on screen is the entire model. An
> officer can argue with it, and that's why they'd actually use it."

---

## 3:15 – 4:30 · The response (Phone 2)

**Driver:** click **Assign**, choose **Sanitation Team 3**, confirm.

**Speaker:**

> "The alert just became somebody's job."

**Phone 2** buzzes. Hold it up so judges can see it, then:

```
Acknowledge  →  Resolve  →  "Source found and fixed"
→ type: Cracked pipe at W-7, closed and chlorinated  →  Submit
```

**Speaker, while they type:**

> "Accept, go, fix, close — with a one-line note about what they found."

**Driver:** show the dashboard — the alert is now resolved.

**Speaker:**

> "Detection to resolution, timestamped end to end by the system, not
> self-reported by anyone. That's the number a health department actually
> cares about: not how much data you collected — how fast the tap got closed."

---

## 4:30 – 5:30 · The proof

**Speaker:**

> "Now — how do we know this works, when we can't wait for a real outbreak?
>
> We built a thousand fake festivals inside the computer. In each one we hid an
> outbreak at a random place and a random hour, and let the real detection code
> look at it.
>
> A typical outbreak is caught **every time**, about **seven hours** after the
> first case, when **eight** people are sick — against **thirty-three** before
> a human reading charts would notice.
>
> And on the festivals where we hid nothing at all, it raises about one and a
> half crew dispatches a day in error. We know that number because we measured
> it, not because we hope."

**Driver:** if you have a slide with the harness table, show it now. Otherwise
stay on the dashboard.

---

## 5:30 – 6:30 · The two extras

**Speaker, briskly — these are supporting, not the main act:**

> "Two more things the system does.
>
> The 2015 Harvard project at this festival found antibiotics being given in up
> to thirty-one percent of visits. So when a doctor picks an antibiotic for
> something that usually doesn't need one, one line appears asking if they're
> sure. It never blocks them — it's a question, not a gate.
>
> And any patient found with high blood pressure or TB symptoms leaves with a
> printed card carrying a QR code. Their village doctor scans it and sees the
> record. No app, no login, works offline."

*(Hold up the printed card if you have one. Physical props land well.)*

---

## 6:30 – 7:00 · The close

**Speaker, looking at the judges:**

> "In 2015 Harvard proved health workers will enter this data — thousands of
> visits on day one alone. But that system only drew charts.
>
> We built everything that should happen in the ten minutes afterwards: see it,
> detect it, send someone, and carry the result home with the patient.
>
> It's live right now on the free tier, at zero cost. You can open it on your
> phones."

**Stop talking.** Let them ask.

---

# PART 3 — When it goes wrong

Something will. Have these ready and say them calmly.

| Problem | What to do | What to say |
|---|---|---|
| **Network dies** | Switch to Tab 3 (`/replay`) and press Play | "Convenient — this runs entirely in the browser, so let me show you the same story offline." |
| **Alert doesn't appear** | On `/demo` press **"Run detection now"** | "Detection runs every five minutes; let me force it rather than make you wait." |
| **Dashboard looks static** | Press **"Add a minute of traffic"** | *(say nothing, just do it while talking)* |
| **Old alerts clutter the screen** | You forgot pre-flight. Press **"Clear the board"** | "One moment — clearing test data." |
| **Phone won't sync** | Keep going | "This is queued on the device — it uploads when the network returns. That's the offline design working." |
| **You run out of time** | Skip section 5:30–6:30 entirely | Go straight to the close. |

**The golden rule:** never apologise for a technical problem. Narrate it as a
feature or fix it silently. Judges remember panic far longer than a delay.

---

# PART 4 — How to rehearse

## Run 1 — Walk it slowly

No timer. Just find out where things are and what breaks. Expect it to take 15
minutes and go badly. That's the point.

## Run 2 — Fix what broke

Write down every problem from run 1 and fix it. Usually: a wrong tab, a phone
locked, stale alerts, or someone unsure who clicks what.

## Run 3 — With a timer, out loud

Full speed. Speaker says every word aloud, even if it feels silly. **Time each
section** and write the actual times next to this script.

## Run 4 — With interruptions

Have someone interrupt with a question mid-demo. Practise answering in one
sentence and getting back on track. Judges *will* interrupt.

## Run 5 — Cold

Close everything. Start from a locked laptop and locked phones. Do the whole
pre-flight and the whole demo without looking at this page.

**If run 5 is clean, you are ready.**

---

# PART 5 — The four things every member must be able to say

Drill this separately. It takes twenty minutes and it's the difference between a
team and one person with three spectators.

**1. What the system does, in one sentence.**
> "It watches every clinic at a festival, spots when one area gets unusually
> sick, and turns that into a job someone has to close."

**2. The detection rule, in one sentence.**
> "Compare the last six hours against the same six hours on the last three days,
> and alert when it's three times the normal variation above, with a minimum of
> eight cases."

**3. One thing the system gets wrong.** *Each person picks a different one:*
- Person A: "Crowd size isn't used yet — on a big bathing day everything would
  look alarming."
- Person B: "Our data is simulated. Real pipeline, fake patients."
- Person C: "There's no real login yet, just PINs."
- Driver: "The antibiotic rules need a doctor's sign-off. We're not clinicians."

**4. What they personally worked on.** Every member needs a true answer to this.

---

# The single most important line in this document

> **Practise the pre-flight as hard as you practise the demo.**

Every demo that fails, fails because of something in Part 1 — not Part 2.
