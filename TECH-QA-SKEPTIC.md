# Siddhi — hostile Q&A: the skeptical judge & the stakeholder

**How to use this:** the spoken answer is what you say. The depth card is what
you have ready if they push. Where a section says **Honest version**, say the
honest version — this room has people who have run these systems and will know
when you're spinning.

**One rule above all:** never claim Siddhi is deployed, validated, or approved.
It is a working prototype on synthetic data. Every strong answer below is strong
*because* it concedes that first.

---

## A. "This already exists"

### Q1. "IDSP/IHIP already has a mass-gathering module — it ran at Kumbh 2019, Haridwar 2021 and Maha Kumbh 2025. What are you adding?"

**Say:** IHIP's mass-gathering module is the right system and we assume it's the
system of record — it captured 31,021 cases across 75 facilities at Haridwar
2021, so collection is solved at government scale. What we built is the layer
after collection: an automatic statistical trigger per sector per syndrome, and
a dispatch loop where an alert becomes an assigned job with four timestamps. In
IHIP the analysis and escalation step is a human at an Emergency Operations
Centre reading daily reports. We're not a replacement — we're the
alerting-and-dispatch module that would sit on top of IHIP's feed.

**Depth:** Haridwar 2021 — 24 mass-gathering diseases, 4 zones, 75 facilities,
31,021 cases, **daily** reporting cadence to an EOC. Daily is exactly the cadence
our 6-hour window is designed to beat.

**Honest version if pushed:** "We haven't seen IHIP's internal alerting logic. If
it already runs automatic aberration detection per sub-zone, our contribution
narrows to the dispatch loop and the second signal. We'd want to be told that
rather than guess."

---

### Q2. "Syndromic surveillance with aberration detection is thirty years old. EARS, ESSENCE, SORMAS, DHIS2. You've reinvented a solved problem."

**Say:** We didn't invent the statistics and don't claim to — our z-score is
essentially EARS C2 with a phase-matched baseline and a Poisson noise floor, and
we'd say so in any paper. What isn't solved is the last mile at an Indian mass
gathering: a pop-up city with a 30-day lifetime, no historical baseline, no IT
staff, intermittent network, and clinicians who abandon anything slower than ten
seconds. Our claim is deployability in that environment, not novel epidemiology.

**Depth:** EARS C1/C2/C3 exist precisely because they need **less than 3 years of
baseline** — the same constraint a Kumbh has, which is why we ended up in the
same design space. SORMAS and DHIS2 do this well but assume a district health
system with staff and a network.

---

### Q3. "Does your system follow WHO mass-gathering guidance, or did you make it up?"

**Say:** WHO's 2015 *Public Health for Mass Gatherings: Key Considerations* has
chapters on surveillance and outbreak response and on command-and-control, and
our design maps to it — syndromic case definitions rather than lab confirmation,
a defined alert threshold, and a named responsible unit per signal. We didn't
invent the framework; we implemented the part that usually stays on paper: the
escalation clock.

---

## B. Ownership, money, and who keeps it alive

### Q4. "Who is the buyer? Name the office, not 'the government'."

**Say:** The owner is the Mela Health Officer under the District Collector's Mela
administration, with the State IDSP unit as technical authority — that's who runs
the EOC in the Haridwar model. The buyer is the state health department's Mela
budget line, because the administration already procures clinics, ambulances and
tents on a fixed-term budget. We're not selling to hospitals or pilgrims; there
is no consumer here.

**Honest version:** "We have not spoken to a Mela Health Officer. That's the
single biggest gap in this project, and it's the first thing we'd do with a week
and a phone number — which is part of why we're standing in this room."

---

### Q5. "What does it cost at real scale? Free tiers aren't a cost model."

**Say:** Correct, and we should size it honestly. Prayagraj 2025 saw ~400 million
visits over 45 days; even at one clinical encounter per hundred visits that's ~4
million rows — single-digit gigabytes and a few hundred writes per second at
peak, comfortably one modest managed Postgres plus a serverless function. Low
thousands of rupees a month, not lakhs. The real cost isn't servers, it's the
human layer: devices, a data-quality supervisor per zone, and training. Anyone
who says the cost is the cloud bill hasn't run one of these.

**Depth:** Haridwar's real number for comparison — 31,021 cases / 75 facilities /
30 days ≈ 14 cases per facility per day. Our detection workload doesn't grow with
crowd size, only with facility count.

---

### Q6. "Who maintains this in December, when you have exams and placements?"

**Say:** Honestly: right now, nobody has committed to that, and I won't pretend
otherwise. What we can commit to is that the code is small, documented, and has
no dependency on us — plain React, one Postgres, one worker file with the
detection logic isolated as a pure function testable without a database. The
realistic path isn't "our startup maintains it" but handing it to whoever owns
the surveillance stack, or open-sourcing it.

**Honest version — say it:** "The honest answer to 'what happens after demo day'
for most hackathon projects is nothing. The way we'd avoid that is to be adopted
as a module, not as a company."

---

### Q7. "What would make a District Health Officer actually switch this on?"

**Say:** Three things, none of them features. One: it costs nothing to try,
because it reads data their clinics already record. Two: every alert shows its
arithmetic — observed, expected, sigma — so they can overrule it in front of
their seniors and defend that decision. Three: it produces a number they
currently cannot produce — detection-to-resolution time, from four machine-written
timestamps nobody self-reports. That last one is what a DHO puts in a review
meeting.

---

### Q8. "What's the approval path to run health software at a government event?"

**Say:** As we understand it: sponsorship by the Mela Health Officer, technical
clearance from the State IDSP unit since they own the case definitions, and a
data agreement, because we'd be processing citizens' health data. If it touched
identity or ABDM there's a further layer — one reason we deliberately don't touch
identity. The realistic first step isn't approval at all: it's running in
parallel, read-only, off a data feed, so nothing we do can affect care.

**Depth:** Under the DPDP Act 2023 health data is personal data requiring a lawful
basis; §7 legitimate uses include public-health and epidemic situations, which is
why the *government* is the data fiduciary and a student team must be a processor
under contract, never the fiduciary.

**Honest version:** "We haven't been through this process. We're describing the
path we've read, not one we've walked."

---

## C. Liability, false alarms, and data

### Q9. "Your alert is wrong, a crew is dispatched, and there's a stampede at the ghat they left. Who's liable?"

**Say:** The system never dispatches anyone. It raises a signal; a human officer
clicks Dispatch and owns that decision — an architectural choice, not a
disclaimer. Siddhi never touches treatment: it doesn't diagnose, prescribe or
triage, and the one clinical prompt it has is dismissible in one tap and cannot
block a doctor. Liability sits exactly where it sits today: with the officer who
moved the crew.

**Depth:** Design rule 1 in PROJECT.md — *never block a doctor* — and the
dashboard has a Dispatch button rather than auto-dispatch. This also keeps it out
of medical-device territory: it doesn't advise on an individual patient.

---

### Q10. "And when you MISS an outbreak? A green dashboard is worse than no dashboard."

**Say:** That's the sharpest version of this question and we treat it as a
first-class design constraint. Silence is never rendered as calm: a sector that
stops reporting shows grey, not green, and the dashboard names the individual
quiet clinics rather than letting them vanish into an average. We also publish our
miss behaviour — the harness measures detection lag and threshold sensitivity
across a thousand simulated festivals, so we can show what raising or lowering the
threshold would have cost.

**Depth — volunteer this:** the post-resolution cooldown suppresses a new alert
for the same sector and syndrome for 6 hours, so a genuine second outbreak in
that exact pair inside that window **is missed**. Naming your own worst case
before the judge finds it is the highest-scoring move available.

---

### Q11. "What does a false alarm cost in the real world?"

**Say:** We report two numbers separately because they cost different things:
about 1.5 a day at the "act" tier, where a crew actually moves, and about 5.4 a
day at "watch", which appears on the dashboard and sends nobody. A wasted
act-tier dispatch is roughly a crew-hour and a half — that's the currency. We
chose the threshold to keep act-tier alarms near 1.5 a day precisely because an
officer with twenty a day stops reading them by day three.

**Depth:** `worker/eval/RESULTS.txt`, reproducible with
`node eval/harness.mjs --trials 1000`. 1,000 synthetic festivals per row, seed 42.

**Honest version:** "Those rates come from our simulator's traffic model. If real
Mela traffic is burstier — and around bathing days it probably is — the real rate
is higher. That's why the threshold is a config value and the harness sweeps it."

---

### Q12. "Who owns the data your system collects?"

**Say:** The state health department, full stop — we'd be a processor, not an
owner. Records are clinical, not identified: age band, sex, symptoms, diagnosis,
drugs, sector. No name, no phone, no Aadhaar, no pilgrim login, ever. The one
place a record follows a person is the printed QR referral card, handed to the
patient, carrying their own data — the pilgrim physically holds it rather than us.

**Depth:** Our `encounters` table has no name column at all. Check it.

---

### Q13. "Aadhaar-link it and you'd have real records. Why haven't you?"

**Say:** Because Aadhaar doesn't hold medical history — authentication returns
demographics, so it gives us a name we deliberately don't want and none of the
clinical history people imagine. Since the 2025 rules a private entity has to
route each use case through a ministry to UIDAI, which is a governmental process,
not an integration. And identity adds nothing: a z-score counts cases per sector
against that sector's own history and doesn't care who anyone is. At a Kumbh,
fingerprint failures would turn away exactly the elderly and rural pilgrims most
at risk.

---

### Q14. "Why should a health department trust four students?"

**Say:** They shouldn't, and we're not asking them to. We're asking for a
parallel, read-only pilot where the system has no authority — it watches a feed
and produces alerts compared afterwards against what actually happened. Nothing
we run can affect a patient, a dispatch or a record. If our alerts were useless,
they turn it off having lost nothing but a review meeting.

---

## D. Is it actually novel?

### Q15. "Strip the story away and this is a dashboard with a threshold."

**Say:** You could build the dashboard in a weekend — I'd rather concede that
than defend it. Three things you couldn't: a detection rule with a phase-matched
baseline that doesn't scream every evening, the dispatch loop that turns an alert
into a job someone must close with an outcome, and a measured false-alarm rate
from a thousand simulated festivals. The dashboard is where every other project
stops; it's where ours starts.

**Depth:** The baseline compares the same 6-hour slot on each of the previous 3
days. Without phase-matching, comparing 6pm against 3am makes every evening
anomalous — that one detail is the difference between a demo and something an
officer leaves switched on.

---

### Q16. "What's new versus Jana Swasthya? They did this at this festival in 2015."

**Say:** Jana Swasthya solved the hard human problem and we build on top of it: it
proved busy health workers *will* enter data on tablets — over 2,000 visits on
day one across 30+ clinics. But EMcounter was a visual analytics dashboard: it
showed officials the data in real time and stopped there. Its own data showed
antibiotics in up to 31% of encounters — recorded, never acted on. Siddhi is the
ten minutes after entry: automatic detection, a tiered alert with visible
arithmetic, and a dispatch loop with a closure timestamp.

**Honest version:** "Balsari's team had institutional backing, government tablets
and state sign-off. We have a prototype and a laptop. The difference in what
we've *proven* is enormous; the difference in what we've *designed* is smaller.
And their raw data is public on Harvard Dataverse — that's the obvious next test
for our detector, and we haven't run it yet."

---

### Q17. "Pharmacy sales — isn't that the same outbreak counted twice?"

**Say:** Only if the reporters overlap, and they don't: a rehydration purchase is
a different act by a different person recorded by a different party, and it
catches people who self-medicate and never reach a clinic — our largest blind
spot. Two independent signals agreeing is evidence; one signal shouting twice
isn't. The disagreement case is the interesting one: clinic cases up with no
rehydration spike suggests it may not be waterborne, which changes where you send
the crew.

**Depth — say this unprompted:** in the demo **both streams are simulated and one
command writes both**, so what you're seeing is the architecture, not evidence
for it. Say it before a judge says it for you.

---

### Q18. "Ten seconds. In a real tent, with a queue of forty?"

**Say:** We measure 2.2 seconds on our own entry path, and I'd assume a real
clinician is three to five times slower on a first encounter — so call ten
seconds a target, not a measurement, and treat it as unvalidated until we've
timed a real doctor. What matters more is the design commitment: any feature that
lengthens that form gets rejected, and it's offline-first so a doctor never waits
on a network.

**Honest version:** "We have never timed a practising doctor. Our 10 seconds is a
design constraint we enforced, not a field result."

---

## E. Data, AI, and the team

### Q19. "Your data is fake. Everything you've shown me is a story you wrote and then detected."

**Say:** Yes — and we say it first, before anyone asks. It's synthetic, generated
through the exact same API a real tablet writes to, so the detector cannot tell
them apart; there's a `simulated` flag for cleanup only and detection never reads
it. That's a limitation of our evidence, but it's also what let us measure
detection performance across a thousand festivals instead of asserting it once.
The next honest step is running the detector against the public Jana Swasthya
dataset, which we haven't done.

**Depth — name the circularity yourself:** we wrote the traffic model *and* the
detector, so the harness measures internal consistency, not real-world
sensitivity.

---

### Q20. "Aren't you just detecting the outbreak you injected?"

**Say:** Fair challenge, and the harness is built to answer it. The injection is
random — random sector, random hour, across a thousand trials — and the detector
has no access to where or when. What we report is the distribution of detection
lag and the false-alarm rate on the days with **no injection at all**, which is
the number that would actually be circular to fake.

**Depth:** Median detection at ~7h and ~8 cases for a typical outbreak, versus
~33 cases before the cluster would be visible to a human reading a chart. The
false-alarm figures come from un-injected runs — that's the non-circular half.

---

### Q21. "You built this with AI assistance. So what did you actually learn?"

**Say:** Yes, heavily, and I'd rather be straight about that than have it
discovered. What the AI could not do was decide anything: it didn't know that
comparing a 6pm window against 3am makes every evening anomalous, that a
three-sample standard deviation of zero makes tiny counts alert until you add a
Poisson floor, or that resolving an alert re-fires it because the cases are still
inside the six-hour window. Every one of those was found by running the thing and
being wrong. Ask me anything about the detection code and I'll walk you through
the line.

**Have all three ready at a whiteboard:**
1. **Phase matching** — baseline uses windows 4, 8, 12 back, not a trailing average.
2. **`max(stddev, sqrt(mean), 1)`** — count noise is inherently ~√mean; the
   trailing `1` guards the all-zero baseline where you'd divide by zero.
3. **Post-resolution cooldown** — found in rehearsal, not design; and it
   introduced a *new* bug (clearing the board before a demo silenced every
   sector), which is why `/outbreak` clears suppression for the pair it injects.

**Honest version:** "One person wrote most of the code with AI, and that's a
bus-factor problem we own. The mitigation is that the epidemiological core is a
pure function anyone can read in a minute."

---

### Q22. "Which one of you can explain the detection maths without notes?"

**Say:** All four of us should be able to state the rule — six-hour window, same
slot on the last three days, three sigma with a Poisson floor, minimum eight
cases. The main dev can walk you through the implementation; the rest can defend
the thresholds and the false-alarm trade. If you want to pick someone, pick
anyone.

**Prep note:** this question exists to catch teams where three people are
passengers. Every member must be able to say the rule in one sentence and name
*one* thing the system gets wrong. Drill this before you present.

---

### Q23. "Three sigma — so a one-in-740 event?"

**Say:** No, and I wouldn't defend it that way. It's a triage threshold, not a
p-value — it means this sector's count is at least three Poisson noise-widths
above what the same six-hour slot looked like on the last three days. Count data
isn't normal and our baseline is three samples, so a tail probability would be
meaningless. It's tuned to put roughly the right number of things in front of a
human, which is why we measured the false-alarm rate instead of quoting a
probability.

---

### Q24. "Bathing day. Crowds triple. What does your dashboard do?"

**Say:** It false-positives across every sector at once, and that's the first
thing we'd fix. We detect on raw counts because our simulator generates roughly
constant traffic, so raw counts were correct for what we built. The fix is rates
per thousand present, using crowd estimates the administration already produces —
designed, not built. We chose to make what exists solid rather than half-build
something we couldn't test.

**Concede this immediately.** Arguing it is the fastest way to lose the room.

---

## F. Pilot, measurement, and the future

### Q25. "Describe a pilot that could happen in three months."

**Say:** Not a Kumbh — a smaller gathering with a fixed clinic footprint, or one
zone of a larger one: 5 to 10 clinics, 7 to 14 days, shadow mode with no
authority to dispatch. We'd need one thing that isn't technology: a designated
officer who reads the alerts and records what they'd have done. The output is a
comparison table — every alert we raised against what actually happened, and
every event that happened that we missed.

**Depth:** Haridwar's zone structure (4 zones / 75 facilities) shows one zone is a
legitimate unit. Nashik's own annual gatherings make this locally testable without
waiting twelve years for a Simhastha.

---

### Q26. "How would you know it worked? Give me the metric."

**Say:** One primary: median time from first case in a cluster to a crew closing
the job, against the current baseline — which today is reconstructed from memory.
Three secondaries: alerts actionable per day and what fraction the officer agreed
with; missed events found in post-event review; and entry compliance — the
fraction of encounters that made it into the system by day ten, because that's
where these projects actually die. We'd pre-register those rather than pick the
flattering one afterwards.

---

### Q27. "Six months and funding. What do you build?"

**Say:** Not features. First, crowd normalisation, because it's the known
correctness bug. Second, run the detector against the public Jana Swasthya
dataset — real Kumbh data, already released — for a sensitivity number that isn't
ours. Third, an IHIP-compatible export so we feed the government system rather
than compete with it. Fourth, a field study with real clinicians to replace our
10-second design target with a measured one. Everything else waits.

---

### Q28. "What's most likely to kill this project?"

**Say:** Data entry compliance. Everything downstream is worthless if doctors stop
entering by day three, and no amount of good statistics fixes that. That's why
the entry form is the only thing in the codebase with a hard performance rule
attached, and why the offline queue exists. The second most likely killer is that
nobody in the room has authority to switch it on — a relationship problem, not an
engineering one.

---

## Drill list before you present

1. Every member states the detection rule in one sentence.
2. Every member names **one** thing Siddhi gets wrong — different ones each.
   Available: bathing-day false positives, the cooldown miss, both streams
   simulated by one command, the untimed 10-second claim, no real-data validation.
3. Never say "deployed", "validated", or "we've talked to the health department".
   None are true.
4. Volunteer the fake-data limitation before you're asked. It converts your
   biggest weakness into your credibility.
5. Do not quote "600 → 35 cases" — PITCH.md already forbids it. It's an unfitted
   curve sitting next to a measured 33 → 8. Let the harness own every number.

---

## Sources

- WHO India — surveillance at Maha Kumbh 2025 (IDSP-IHIP mass-gathering module)
- JPMHH — IT-based health event surveillance, Kumbh Mela 2021 Haridwar
- WHO/HSE/GCR/2015.5 — Public Health for Mass Gatherings: Key Considerations
- CDC EID — assessing outbreak detection algorithms in resource-limited settings
- Harvard Mittal South Asia Institute — Jana Swasthya at the 2015 Kumbh Mela
- Shaikh et al., JMIR Public Health & Surveillance 2023 — antibiotic prescribing
- Harvard Dataverse — Jana Swasthya raw data (DOI 10.7910/DVN/WCEWNR)
- ABDM Health Data Management Policy; DPDP Act 2023 in healthcare
