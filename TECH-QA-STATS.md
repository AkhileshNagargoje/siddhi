# Atreya — statistics & epidemiology Q&A

The hardest lens. If a judge has a quantitative background, these are the
questions. Every number below was computed from the actual code, not estimated.

Format: **Q** = the question · **Say** = spoken answer · **Depth** = the detail
that proves you understand it if they dig further.

---

### Q1. Why a z-score? Real syndromic surveillance uses CUSUM, EWMA or Farrington.

**Say:** "Those are the right tools when you have years of history. Farrington
needs multiple years to fit its seasonal regression, and CUSUM is designed to
detect small sustained shifts over long runs. A Kumbh lasts weeks and has no
prior history for that specific tent city. Our signal is a large, fast jump in
a short window, which a simple threshold detects well — and it stays
explainable, which is what gets an official to act."

**Depth:** Name them accurately — Farrington fits an overdispersed Poisson
regression on historical baselines; EWMA is better for gradual drift; ours is
closest to a simple Shewhart-style control chart. "We chose the method that
matches the signal shape and the data we actually have."

---

### Q2. You estimate a standard deviation from three data points. That's statistically meaningless.

This is the sharpest question available. Do not get defensive — you have a real
answer.

**Say:** "You're right that three points give an unstable variance estimate.
That's exactly why the denominator is not the sample standard deviation alone —
it's `max(stddev, sqrt(mean), 1)`. Most of the time the Poisson floor dominates,
so we're effectively testing against the theoretical noise of count data rather
than trusting a three-sample estimate. The minimum count of eight then removes
the cells where the estimate is worst."

**Depth — the number that wins this exchange:** "If we treated it as a pure
t-statistic with two degrees of freedom, three sigma would be about a 5% tail,
not 0.1%. That would be far too noisy. The floor is what stops us claiming
precision we don't have."

---

### Q3. How many statistical tests do you run a day, and what's your false-alarm rate?

**Say:** "Twelve sectors times six syndromes is 72 cells, scanned every five
minutes — about 20,000 tests a day on paper. But those scans overlap: a
six-hour window re-tested five minutes later is almost the same data, so the
effective number of independent tests is closer to 288 a day. At a three-sigma
threshold that's under one expected false alarm per day from the tail alone,
and the minimum-count floor removes most of it."

**Depth:** Acknowledge the honest gap — "We haven't run the full evaluation
harness to measure the empirical rate yet. That's the number I'd want before
any real deployment, and the simulator is built to produce it."

---

### Q4. Count data is overdispersed. Why Poisson and not negative binomial?

**Say:** "The Poisson term is a floor, not a distributional assumption — we take
the larger of the observed standard deviation and the square root of the mean.
If the data is overdispersed, the observed standard deviation is bigger and it
wins, so overdispersion widens our threshold automatically rather than being
ignored."

**Depth:** "A negative binomial would let us estimate the dispersion parameter
properly, but fitting it from three points is worse than the floor. With real
historical data I'd fit it."

---

### Q5. Once an outbreak is running, doesn't it poison its own baseline?

**Say:** "Yes, that's a real failure mode — an outbreak that grows slowly enough
becomes the new normal within three days. Two things limit it: our baseline
looks back at fixed 24-hour offsets rather than a rolling average, so it takes a
full three days of sustained elevation to fully contaminate; and once an alert
fires, the sector is already in the response loop."

**Depth — name the honest gap:** "The proper fix is excluding known outbreak
windows from the baseline. That's designed but not implemented. It's on the
list, and I'd rather tell you than pretend."

---

### Q6. Day one of the festival has no history. What happens?

**Say:** "The baseline is zero, so the z-score degenerates to the raw count —
and the only thing protecting us is the minimum of eight cases. We test this
explicitly: eight cases against an empty baseline fires an act alert, seven
does not."

**Depth:** "That's actually defensible behaviour — a brand-new cluster in a cell
that has never seen cases is worth acting on. The longer-term fix is carrying
baselines over from the previous festival, which is a config export."

---

### Q7. Crowd size swings tenfold on bathing days. Raw counts are meaningless.

**Say:** "Completely agree, and this is our biggest known limitation. The
correct metric is cases per thousand people present. Our simulator holds traffic
roughly constant so raw counts are valid inside the demo, but a real deployment
needs a crowd denominator — and Kumbh 2025 already had the feeds for it, with
2,700 AI cameras doing headcounts and mobile-tower load per sector."

**Depth:** "Without it you get two failures, not one: false alarms everywhere on
a bathing day, and a real outbreak hidden on a quiet day. It's a data-access
problem more than an engineering one."

---

### Q8. How do you know it would catch a real outbreak?

**Say:** "Honestly, we don't yet — we know it catches the outbreak shape we
simulate. What we can show is that it's silent on normal data: roughly 4,800
synthetic records across three days produced zero alerts, and an injected
cluster fired at 9.9 sigma. Validating against a real outbreak needs historical
clinic records, which is exactly what we'd ask the programme for."

**Depth:** Never claim validation you haven't done. "We tested the detector, not
the epidemiology" is a credible sentence.

---

### Q9. What exactly is detection latency and how would you measure it?

**Say:** "Time from the first case of a cluster appearing in the data to the
alert firing. We measure it in the simulator by injecting an outbreak at a known
timestamp and recording when the alert row is written. The honest comparison
isn't against zero — it's against how long a human reading charts would take,
which at a real Mela is days."

**Depth:** "Two numbers matter together: latency and false alarms per day. Either
alone is gameable — you can always detect faster by lowering the threshold."

---

### Q10. Your data only includes people who reach a clinic. What about everyone else?

**Say:** "That's ascertainment bias and it's real — the sickest person may be
lying in a tent, not walking two kilometres to a clinic. Two mitigations: we
added a pharmacy signal, because people self-medicate before they seek care, and
in a full deployment ambulance dispatches give a parallel severity stream."

**Depth:** "A rising ratio of severe to mild cases is the warning sign that
you're missing people rather than doing better. That's a monitor we designed and
haven't built."

---

### Q11. Are your syndrome categories epidemiologically meaningful?

**Say:** "They're coarse — six groups: gastrointestinal, respiratory,
heat-related, undifferentiated fever, injury, other. That's enough to localise a
water-borne cluster, but not enough to separate cholera from dysentery, which
demand different responses. Finer syndromes with response playbooks attached is
the natural next step."

**Depth:** Watery versus bloody diarrhoea, with or without fever, is the actual
clinical distinction that changes the response.

---

### Q12. Where's your confidence interval? A point estimate with no uncertainty isn't science.

**Say:** "The z-score is the uncertainty statement — it's the distance from
expected measured in units of noise, and we show observed, expected and sigma on
every alert. What we don't publish is an interval on the underlying rate,
because with three baseline points that interval would be so wide it would be
misleading rather than informative."

**Depth:** "I'd rather show a threshold crossing plus the raw numbers than a
false-precision interval on a three-point estimate."

---

### Q13. Why a six-hour window? Why not one hour or twenty-four?

**Say:** "It's a trade-off between speed and stability. One hour has too few
cases to be statistically stable at a single sector. Twenty-four hours would
detect the same cluster a day late. Six hours is short enough to act within the
same shift and long enough that a typical sector has a countable baseline."

**Depth:** "It's a tunable constant, not a law — all four thresholds live in one
config block and would be re-tuned against real data."

---

### Q14. Why three sigma specifically?

**Say:** "It's the conventional control-chart threshold, and it puts our expected
false alarms under one a day at our effective test count. We also tier it —
three sigma is a watch that stays on the dashboard, four sigma dispatches a
crew. That way the borderline cases don't waste a response team."

**Depth:** The tiering is the real answer. A single threshold forces you to
choose between missing things and crying wolf; two thresholds let the cheap
response happen at the lower bar.

---

### Q15. Why sector-level? Real outbreak detection uses spatial scan statistics.

**Say:** "SaTScan-style methods find clusters of arbitrary shape and location,
which is more powerful — but they need point-level patient locations, and we
deliberately don't collect those. Sectors are also the unit the response
actually works in: you dispatch a crew to a sector, not to a coordinate."

**Depth:** "Our spatial resolution is set by the response granularity, not by
what the maths could do. Finer location data would improve detection and worsen
privacy — that's a real trade, and we chose privacy."

---

### Q16. What would proper validation look like?

**Say:** "Retrospective first — take historical clinic records from a past Mela
with a known outbreak, replay them through the detector, and measure how many
hours before the official recognition it fires and how many false alarms it
raises over the same period. Then a shadow deployment: run it live alongside
existing surveillance without acting on it, and compare."

**Depth:** "Shadow mode is how you deploy this safely the first time. Nobody
should act on a detector that has never been scored against reality."

---

## The three sentences that carry this whole section

1. "The Poisson floor is there because three baseline points can't be trusted."
2. "Crowd normalisation is our biggest known gap, and it's a data-access problem."
3. "We validated the detector, not the epidemiology — that needs real data."

Saying all three unprompted makes you look like someone who understands their own
method's limits. That is what a quantitative judge is actually testing for.
