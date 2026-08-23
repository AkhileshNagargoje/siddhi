# Siddhi — the problem and the solution

*In plain language. Written so anyone on the team can read it and explain the project.*

**One line:** At a huge festival, everyone who gets sick is treated — but nobody notices the outbreak, because no one is adding up the numbers. We built the thing that adds them up, and then makes someone go fix the cause.

---

# PART 1 — THE PROBLEM

## The short version

**Everyone gets treated. Nobody turns off the tap.**

## What actually happens

Fourteen people in one part of the Kumbh drink from a cracked water pipe and fall ill.

They don't all go to the same clinic. They go to **four different clinics**, at different times of day. Each doctor sees three or four patients with loose motions — which is a completely normal day. So nobody raises an alarm.

And here is the important part: **there was no alarm to raise.**

The number "fourteen" did not exist anywhere. It was 3 here, 4 there, 5 somewhere else, sitting in four separate paper registers that get added up in November.

Every one of those fourteen people got correct treatment. And the pipe kept running.

- **Day 2:** 60 cases
- **Day 3:** 200 cases
- **Day 4:** around 400 cases, and the clinic has a five-hour queue

By then, pilgrims have carried the illness home to dozens of districts across the country.

## Why this festival is especially dangerous

A Kumbh is not just a crowd. It is **a city built in weeks, lived in by millions, then deleted.**

- People sleep in tents with shared toilets
- **Bathing in the same river is the religious act itself** — you cannot ask people not to do it
- Free community kitchens feed millions from a few kitchens, so one bad source reaches thousands
- Many pilgrims are elderly, already unwell, fasting, or walking long distances
- Nothing is permanent: the clinics, the staff, the water points and the drains are all temporary

Then everyone goes home within days. So the festival doesn't just grow an outbreak — **it delivers it across the country.**

## The real reason nobody sees it

Each clinic knows everything about its own patients and **nothing about any other clinic's**.

To spot an outbreak you need to add clinics together. To add them together you need four things at once:

1. Everyone recording things the same way
2. A shared clock
3. One place where the records land
4. Somebody whose job is to look at the combined picture

At a festival, **none of these four exist.** Records are on paper, each clinic writes differently, nothing leaves the tent, and it all gets counted weeks later.

So the honest problem is not "we don't have the data".

**The data exists. Nothing combines it in time.**

## Nobody is doing anything wrong

This matters, because people assume the fix is "train doctors better".

The doctor who saw three cases **is not failing**. Three is normal. They would be *wrong* to panic — a doctor who shouts every ordinary Tuesday is a doctor nobody listens to by next week.

The warning sign does not exist for one person. It only exists in the total.

**So this is a system problem, not a people problem** — which is exactly why software can fix it and a training session cannot.

## Why waiting costs so much

Outbreaks don't grow steadily. They multiply. So every hour of delay costs more than the hour before.

- **Day 1 evening:** 14 cases · one water tap · one crew · 80 minutes to fix
- **Day 4:** ~400 cases · clinic overwhelmed · five-hour queue

And look at what that second line really means. Once that clinic is drowning, **it stops working for everyone** — a man with chest pain now waits behind thirty diarrhoea cases.

So the delay doesn't only hurt the people with the infection. **It breaks the part of the system that was working fine.**

## Two more problems, same root cause

**Wrong medicine goes unnoticed.** The 2015 project's own data showed antibiotics given in up to 31% of visits. No single doctor could see that — it's the same "nobody adds it up" problem, pointed at medicines instead of illness. The system recorded a real harm and did nothing.

**Findings die when people leave.** Screening camps found people with high BP and diabetes. Then they went home and nothing followed. A blood pressure reading with no follow-up isn't half a treatment — it's a nurse, a machine and twenty minutes spent for **zero result**.

## Why it isn't already solved

This is the strongest point, because it proves the problem is real.

In 2013 and 2015, a Harvard project at the Kumbh solved the genuinely hard part: it proved that **busy health workers will enter data on tablets** — 30,000 visits recorded — even though everyone predicted doctors would find it annoying.

But what they built on top was **a reporting tool, not a response system.** Charts that a human had to stare at and correctly understand. No automatic detection. No alerts. Nobody assigned. No record of whether anything was done.

The missing piece was never technology. It was that "collect the data" felt like the finish line.

## Why you can't just install normal hospital software

| Normal software expects | What's actually true here |
|---|---|
| Working internet | Millions of phones on a few towers — it fails constantly |
| Patients have records and ID | Travellers with no records, often no ID |
| Staff get trained | Deployed for days, no training time |
| A few minutes per patient | Hundreds of patients a day — you get 10 seconds |
| Steady power and IT support | Neither |
| One language, everyone reads | Several languages, mixed literacy |

Normal health software doesn't work *badly* here. It doesn't work at all.

---

# PART 2 — THE SOLUTION

## The short version

**We add up the numbers, and we make someone go fix the cause.**

## 1. The doctor's screen — boring on purpose

This is the only place data comes in. If doctors stop using it, everything else goes dark. So the real question was: **will a tired doctor still use this in week six?**

That's why it takes 10 seconds:

- **Tapping only, no typing.** A keyboard on a tablet, in a tent, one-handed, is the end of the tool.
- **Age groups, not exact age.** We don't need to know someone is exactly 63. "60+" is enough to spot an outbreak and is five times faster. We collect *less* detail than a hospital record on purpose — we are not making a hospital record.
- **BP and sugar are hidden** behind a small button, so most doctors never see boxes they don't need.

**It works with no internet.** At a festival of millions, the network being down is normal. So the app saves on the phone first and uploads later.

One important detail: every record gets a unique ID before saving. So if an upload fails and retries, **you never get the same patient twice**. That matters more than it sounds — duplicates would create fake outbreaks, and false alarms are what kill these systems.

The doctor also sees "4 waiting to upload → all sent". They need to trust it didn't lose their work.

## 2. Putting all clinics together — the part that never existed

Every clinic sends to one place, and the picture updates live instead of once a night.

That's the missing piece. Not clever — just something nobody had.

One choice worth explaining: **we group by sector, because that's what you can send a team to.** You can send a crew to Sector 5. You can't send a crew to "the festival". If the map doesn't match what people can actually do, the information is useless.

## 3. Finding the problem — simple maths, carefully guarded

Every 5 minutes the system asks: is any sector above its normal level?

Three guards matter more than the maths:

**Compare like with like.** We compare 6pm to previous 6pms, not to 3am. Otherwise every evening looks like an outbreak. We hit this bug during the build — the first test raised three false alarms on perfectly normal data.

**Ignore small numbers.** A sector that normally sees 0 or 1 case looks "300% up" the moment it sees two. So we require at least **8 real cases** before anything fires. This is the single most important protection against crying wolf.

**Two levels.** "Watch" only shows on screen. "Act" sends a team. Sending a team costs something, and a wasted trip is how you lose a crew's trust forever.

**Every alert shows its own maths.** Not to be polite — because an officer will act on "36 cases, normally 8" and will ignore a computer that just says *trust me*.

**Why no AI?** Honest answer: we have 12 sectors and 6 illness types. There is nothing an AI could learn that simple counting doesn't already show. And an alert nobody can question is an alert nobody uses.

## 4. Making someone act — the part others skip

This is the real difference.

**An alert isn't a message that disappears. It's a job with someone's name on it.** It goes to a specific crew. They tap Accept, go and check, then tap Done with a note about what they found.

The system records all three times by itself — alerted, accepted, finished. So **you know how fast the response really was**, without anyone reporting it.

And "checked, nothing wrong" is a perfectly good answer. If crews get blamed for that, they stop being honest, and you lose the feedback that makes the system smarter.

That is the whole change from "a screen that shows things" to "a system that fixes things".

## 5. Stopping wrong medicine at the right moment

The only time you can change a prescription is **while it is being written**. A report next week changes nothing.

So when a doctor picks an antibiotic for something that usually doesn't need one, one line appears asking "are you sure?"

**It never blocks them.** One tap and they carry on. This is a rule, not a compromise — a system that argues with doctors gets abandoned by lunchtime, and then everything downstream stops working too.

But it is recorded either way. So for the first time you can see which clinics give too many antibiotics. That 31% problem was invisible before for exactly the same reason the outbreaks were: **nobody was adding it up.**

## 6. Following the patient home

If someone has high BP, high sugar, or TB signs, the system spots it while they are still sitting there — the only moment they exist to the system at all.

They get a printed card with a QR code.

**The QR holds the whole record, not a link to a website.** Two reasons:

1. Their village clinic may have no internet. A card that needs a server fails exactly where it's needed most.
2. Their record might still be waiting to upload — so a card pointing at the database would point at nothing.

**Paper for the patient, digital for the system.** That is the right choice for elderly, rural travellers who will not install an app for a three-day trip.

## 7. Proving it works

Our test tool creates realistic fake patients **through the same door real tablets use** — so the detection system cannot tell they are fake.

That is not cheating. That is how we test it. We can drop an outbreak into any sector at any time and measure two honest numbers: **how many hours earlier we catch it**, and **how often we cry wolf**.

Say this out loud before anyone asks. Being upfront looks careful. Getting caught looks dishonest.

## 8. What we chose NOT to build

Each of these is a decision, not a gap:

- **No app for pilgrims** — nobody installs software for a three-day trip
- **No AI in detection** — alerts nobody understands get switched off
- **Not a hospital record system** — we keep only what is needed
- **Never blocks a doctor** — ever
- **No tracking of individuals** — we work area by area

---

# PART 3 — PROBLEM → SOLUTION

| The problem | What we did |
|---|---|
| Records never leave the clinic | One shared place, all clinics send there |
| Nobody's job to watch the whole picture | Software checks every sector every 5 minutes |
| One doctor can't see a pattern | We look at the total, where the pattern actually lives |
| Charts nobody acts on | The alert becomes a job someone must close |
| Nobody knows if the response was fast | Times recorded automatically |
| Wrong medicine unnoticed | Asked at the moment of prescribing, counted per clinic |
| Findings lost when people go home | QR card the patient carries |
| No internet | Saves on the phone, uploads later, never duplicates |
| Tired staff quit slow tools | 10 seconds, tapping only |
| False alarms destroy trust | Minimum 8 cases, compare like with like, two levels |
| No way to prove any of it | Test tool through the real system, measured results |

---

# The line to end on

The data was always there.

**Nothing was adding it up, and nothing was acting on it.**

We built the adding up, and the acting.

---

*Live: [siddhi.akhileshnagargoje.in](https://siddhi.akhileshnagargoje.in) · Full spec in `PROJECT.md` · Build status in `PROGRESS.md`*
