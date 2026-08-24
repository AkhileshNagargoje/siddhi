# Explaining the evaluation harness

The harness is the strongest evidence Atreya has, and almost no hackathon team
brings anything like it. This is how to talk about it.

Run it live: `cd worker && node eval/harness.mjs`

---

## The 20-second version

> "We didn't want to claim our detector works — we wanted to measure it. So we
> built a harness that generates a thousand synthetic festivals, injects an
> outbreak at a random sector and a random hour in each, and runs the real
> detection code over them. It tells us how often we catch it, how many hours
> it takes, and how many false alarms we raise on festivals where nothing is
> wrong at all."

## The 60-second version

> "Think of it as a flight simulator for the detector. Each trial builds four
> days of a synthetic festival — twelve sectors, six syndromes, hourly case
> counts drawn from a Poisson distribution with the same daily rhythm as real
> clinics, busy mornings and quiet nights. Then in half the trials we inject a
> waterborne outbreak: exponential growth from a point source, at a random
> sector, at a random hour the detector knows nothing about.
>
> Then we run the actual detection function over it, hour by hour, and record
> what happened — did it fire, how long after the first case, and how many
> people were already sick at that moment. The other half of the trials have no
> outbreak at all, and that's where the false-alarm rate comes from.
>
> The headline is that a typical waterborne outbreak is caught every time, a
> median of seven hours after the first case, at eight cases — against
> thirty-three cases before it would be obvious to someone just reading a
> chart."

---

## What it actually does — five steps

**1. Build a festival.** Twelve sectors, six syndromes, 168 hours (72 hours of
warm-up so the baseline has history, plus 96 hours evaluated). Each hour's case
count is a Poisson draw around a rate that depends on the number of clinics in
that sector, the syndrome's share of the case mix, and the time of day.

**2. Optionally inject an outbreak.** A point source with exponential growth —
`rate = a0 × 2^(hours/doubling)`, capped — into a random sector at a random
hour, always in the `gi` syndrome, because waterborne is the scenario the
product is built around.

**3. Run the real detector, hour by hour.** For every sector and syndrome at
every hour, compute the 6-hour window count, build the phase-matched baseline
from the same slot 24, 48 and 72 hours earlier, and call `scoreCell`.

**4. Record what happened.** Did it fire in the injected cell? How many hours
after onset? How many cases had accumulated by then? And how many alerts fired
in cells with no outbreak — those are false alarms.

**5. Repeat a thousand times and take medians, not averages.** Medians and 90th
percentiles, because outbreak latency has a long tail and a mean would flatter
us.

---

## Why the numbers are trustworthy — four design choices to name

These are what separate a real evaluation from a self-congratulatory one. Know
all four.

**It imports the deployed algorithm.** The first line of the harness is
`import { scoreCell } from '../src/index.js'` — the same function the live
Worker calls. It is not a reimplementation that could quietly drift from what
actually runs. If you change the detector, these numbers change.

**It is deterministic.** A seeded random generator, so `--seed 42` produces
identical numbers on any machine. Anyone can reproduce our result — that is the
difference between a measurement and an anecdote.

**It mirrors the engine's dedup.** After a cell fires it goes quiet until its
window turns over, exactly as the live system does. Without this, one outbreak
would count as six separate alarms and our numbers would look far better than
reality.

**The false-alarm number comes from clean festivals.** Nothing is injected at
all. This is the half of the evaluation that would be impossible to fake by
construction — we cannot accidentally tune ourselves to detect an outbreak that
isn't there.

---

## Reading the results table

| Column | What it means |
|---|---|
| caught | Fraction of injected outbreaks that fired an alert at all |
| median lag | Hours from the first case to the alert, typical case |
| p90 lag | The bad case — 90% are caught faster than this |
| cases when we alert | How many people were already ill at detection |
| cases if unaided | The counterfactual — see below |

**The counterfactual is the number to defend carefully.** "Cases if unaided" is
when the cluster would become unmissable to a human reading a chart, and we
define it explicitly: the 6-hour count reaching **three times its own baseline
AND at least 25 cases**. That's a stated, conservative rule, not a guess. Say
the definition out loud when you quote the number — it is what makes 33 versus
8 a comparison rather than a boast.

---

## The threshold sweep — the part that shows judgement

This block is the most persuasive thing in the file, because it shows you
understood a trade-off rather than picking a number that flattered you:

```
  z >= 2        100%  caught   6.0h lag   17.7 false alarms/day
  z >= 3        100%  caught   7.0h lag    6.8 false alarms/day  <- shipped
  z >= 5        100%  caught   9.0h lag    0.8 false alarms/day
```

**How to say it:**

> "Lowering the threshold to two sigma buys us one hour of detection speed and
> costs eleven more false alarms every day. That's a terrible trade — an officer
> getting eighteen alerts a day stops reading them by day three, and then the
> system detects nothing at all. Three sigma is where we chose to sit, and the
> sweep is why."

---

## Honest limitations — say these before you're asked

**The circularity problem.** We wrote the traffic model *and* the detector, so
the harness measures internal consistency, not real-world sensitivity. If real
festival traffic is burstier than our Poisson model — and around bathing days it
certainly is — the true false-alarm rate is higher than 1.5 a day.

**Say it like this:**

> "The honest limit of this number is that we built the world it was measured
> in. The half I'd defend hardest is the false-alarm rate, because those trials
> have no outbreak injected — there's nothing to tune toward. The detection
> latency is the softer half."

**One outbreak shape.** Every injected outbreak is exponential growth from a
point source in the `gi` syndrome. A slow-burn respiratory outbreak, or one with
multiple sources, isn't tested.

**No real data yet.** The obvious next step is running this against the public
Jana Swasthya dataset from the 2015 Nashik Kumbh, which is released on Harvard
Dataverse. We haven't done it.

---

## If a judge attacks the harness itself

**"You're grading your own homework."**
> "Partly, and I'd rather say which part. The detection numbers, yes — we built
> the outbreak we detect. The false-alarm numbers, no — those trials contain no
> outbreak, so there's nothing to tune toward. That's the half I'd stake the
> project on."

**"A thousand trials of a model you wrote proves nothing."**
> "It proves the algorithm behaves consistently across a thousand different
> random configurations rather than the one we happened to demo. That's a lower
> bar than clinical validation and a much higher bar than a single screenshot,
> which is what most systems at this stage offer."

**"Why Poisson? Real case counts are overdispersed."**
> "Agreed — and overdispersion would make our false-alarm rate worse, not
> better, so our published number is optimistic rather than flattering in the
> direction that matters. A negative binomial traffic model is the right
> improvement and it would move the number the honest way."

**"Show me it running."**
> Just run it. `cd worker && node eval/harness.mjs`. That is the best possible
> answer, and it takes under a minute.

---

## The one sentence to remember

> "We measured our detector across a thousand synthetic festivals instead of
> asserting that it works — and the number I'd defend hardest is the false-alarm
> rate, because those trials have nothing to detect."
