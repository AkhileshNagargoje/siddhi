# Siddhi — technical Q&A prep

Grounded in the actual code as of 2026-08-16. Every number here was verified in
the repo, not remembered. If you are unsure of a detail on stage, say "let me
show you" and open the code — that beats guessing.

---

## The 30-second architecture answer

> "React and Vite on the front end, deployed on Cloudflare Workers static
> assets. Supabase — Postgres plus Realtime — for data and the live dashboard.
> A second Cloudflare Worker runs the detection engine on a cron every five
> minutes, so nothing depends on my laptop being open. Total running cost is
> zero: everything sits inside free tiers."

**Follow-up detail if pressed:** Realtime is why the dashboard updates without
polling — Postgres pushes the insert to every open browser over a WebSocket.
That is a database feature, not code we wrote.

---

## 1. Detection — the most likely deep dive

**Q: How does the detection actually work?**

> "For every sector and every syndrome we count cases in the last six hours,
> then compare that against the same six-hour slot on each of the previous
> three days. If it is three standard deviations above that baseline AND at
> least eight cases, we raise an alert. Four sigma makes it an act alert that
> dispatches a crew."

**Q: Why the same time slot, not just the last three days?**

> "Because clinics have a daily rhythm — busy mornings, dead nights. Comparing
> a Tuesday afternoon against a Monday 3am makes every afternoon look like an
> outbreak. Phase-matching was a bug fix: our first version fired three false
> alerts on completely normal data."

**Q: Why a minimum of eight cases?**

> "Small numbers lie. Seven cases where zero were expected is a seven-sigma
> event on paper, but it is noise. Surveillance systems die from false alarms —
> once crews stop trusting the pager, the whole thing is decoration."

**Q: What if the baseline has almost no variance?**

The sharpest question a statistician could ask.

> "That is the Poisson floor. Three identical quiet days give a standard
> deviation of zero, which would make any uptick infinitely significant. Count
> data has inherent noise of at least the square root of the mean, so our
> divisor is max(stddev, sqrt(mean), 1). Without it, 12 cases against a
> baseline of 5 would page a crew at seven sigma. With it that is 3.1 — a
> watch, not an alarm."

**Q: How do you know the maths is right?**

> "We unit-test it. The scoring function is pure — no database, no mocks — and
> we have nine tests covering the empty baseline, the count floor, the
> zero-variance case, the tier boundary, and an ordinary day that must never
> alert. Run `cd worker && npm test`. All nine pass."

Be ready to run it live. That answer alone puts you above most teams.

---

## 2. "Why no AI or machine learning?"

Judges love this one. It is a strength — do not get defensive.

> "Deliberately. A health officer has to justify sending a crew somewhere. With
> our alert they read the arithmetic on screen — 14 seen, 4 expected, 3.4 sigma
> — and can argue with it. With a neural net they are told the model says so.
> Officials ignore alerts they cannot interrogate, and an ignored alert is
> worse than no alert. We also have no training data: nobody has a labelled
> dataset of Kumbh outbreaks. Classical statistics is the honest tool here, and
> it is what real surveillance systems use."

**If pushed — "so there is no AI at all?"**

> "Not in the detection path, on purpose. Where AI genuinely helps without
> touching trust is drafting the daily bulletin from locked numbers, or turning
> spoken Hindi into structured fields. Those are writing tasks, not judgement
> tasks."

---

## 3. Scale

**Q: Will this handle 400 million people?**

> "The load is not 400 million — it is clinic visits. Even at Maha Kumbh scale
> that is a few hundred thousand records over weeks, which is small for
> Postgres. The detection query is bounded: it only ever looks at the last 78
> hours, indexed on sector, syndrome and timestamp. Our real scaling concern is
> not compute, it is the network at the tent — which is why capture is
> offline-first."

**Q: What breaks first?** Answer honestly; it shows maturity.

> "Realtime fan-out to many dashboards, and free-tier row limits. Both are
> fixed by paying Supabase, not by rewriting anything."

---

## 4. Offline and field constraints

**Q: What happens with no network?**

> "Everything still works. The record is written to the device first with a
> client-generated UUID, and a background loop retries the upload. The UUID is
> what makes retries safe — if a request half-succeeded, the duplicate insert
> comes back as a unique violation and we treat that as success, so nothing is
> written twice and nothing is lost."

**Killer detail:** We only clear the records we actually sent. An earlier
version cleared the whole queue after a successful upload — so a patient saved
while the upload was in flight vanished. That class of bug never appears in a
demo and quietly loses real data in the field.

**Q: What if the tablet dies entirely?**

> "The design has a degradation ladder — tablet, then SMS entry, then a paper
> tally sheet with a QR scanned in later. Only the first rung is built; the
> rest is designed, and I would rather say that plainly than claim it."

---

## 5. Data, privacy, security

**Q: Do you store personal data?**

> "Almost none, on purpose. Surveillance needs age band, sex, sector, symptoms
> and time — not identity. No names, no Aadhaar, no phone numbers in the
> encounter record."

**Q: Why not Aadhaar?**

> "Three reasons. Legally, Aadhaar authentication is not open to a project like
> ours. Practically it needs an OTP on a saturated network or a fingerprint
> scanner, and it would destroy our ten-second target. Ethically, you must
> never gate treatment on identity — a pilgrim without ID who believes they
> cannot be treated is a worse outcome than the one we are solving. ABHA is the
> right long-term path for the referral, and the card is structured for it."

**Q: Your API key is in the frontend — is that not insecure?**

> "That key is publishable by design; it is meant to ship in the bundle. The
> protection is row-level security in Postgres, not the key. We also hardened
> it — the public key can read, insert and update, but DELETE is revoked
> entirely, because the app never deletes anything and a public key that can
> empty your tables is a liability."

---

## 6. The public page — the ethics question

**Q: Do you show the public where the outbreak is?**

> "Carefully. We show which sector to take care in, and the syndrome, in three
> languages — hiding that would be useless to someone trying to protect
> themselves. What never goes out automatically is a number. Publishing 'four
> hundred cases in Sector 5' to millions moves the crowd, and crowd movement is
> what kills at these events — the 2025 Maha Kumbh had a fatal crush. Panic
> also floods clinics with the worried well exactly when you need capacity for
> the sick."

---

## 7. "What was the hardest technical problem?"

Have two ready. Both are true and both are in the code.

**The alert cooldown.**

> "When a crew fixes a water point, the cases that triggered the alert are
> still inside the six-hour window — so the next scan five minutes later raised
> the same alert again. It read as the system ignoring the response. We added a
> cooldown, but anchored it wrong at first: to when the alert was raised rather
> than when the crew closed it. That meant the slower the crew, the more likely
> the alert re-fired the instant they finished — the exact failure the guard
> existed to prevent, made worse by the thing it was protecting."

**The silent failure.**

> "The Acknowledge button on the crew app did nothing for a while, and looked
> fine. A Supabase query builder is lazy — it only sends the request when
> something awaits it. It was written as an arrow function that returned the
> builder and dropped it, so the UI responded and the database was never
> touched. Nothing errored. We caught it only by checking the row afterwards
> instead of trusting the screen."

Use the second if asked "how do you know your demo is real?" — the answer is
that we verify against the database, not the UI.

---

## 8. Testing and correctness

> "Nine unit tests on the detection maths, run with node --test, no framework.
> Beyond that we verify behaviour against the database rather than the screen —
> after every flow we query Postgres and confirm the row landed with the right
> fields."

**Q: How do you test something you cannot observe in the real world?**

> "The simulator. It generates realistic clinic traffic with a daily rhythm and
> can inject an outbreak into any sector — and critically it writes through the
> same API a real tablet uses, so the detection engine cannot tell simulated
> data from real. That also lets us measure ourselves: run it repeatedly and
> report detection latency and false alarms per day."

---

## 9. Deployment and operations

> "Two Cloudflare Workers. One serves the static app; the other is the engine,
> running two crons — detection every five minutes, and simulated traffic every
> minute so the system is alive whenever someone looks. Deploy is one command,
> npx wrangler deploy. The engine also exposes HTTP endpoints — /scan to force
> a detection pass, /outbreak to inject a scenario — which is how we trigger
> the live demo."

---

## 10. Honest weaknesses — prep these, do not hide them

If a judge finds a weakness you have not acknowledged, you lose credibility. If
you name it first, you gain it.

- **Data is simulated.** Real pipeline, simulated pilgrims. Validating the
  thresholds against a real outbreak needs historical clinic records.
- **Crowd normalisation is designed, not shipped.** Cases per thousand people
  present is the statistically correct denominator, because crowd size swings
  tenfold on bathing days. Our simulator holds traffic roughly constant so raw
  counts are valid for the demo; a real deployment needs the crowd feed.
- **No real authentication.** Four-digit PINs mapped to roles — deliberate for
  a prototype, insufficient for deployment.
- **Antibiotic rules need clinical sign-off.** Drafted from published guidance,
  but we are not clinicians. Exactly the validation we would want from the
  programme.

---

## Numbers to know cold

| Thing | Value |
|---|---|
| Detection window | 6 hours |
| Baseline | same 6h slot, previous 3 days |
| Alert threshold | z >= 3 watch, z >= 4 act |
| Minimum cases | 8 |
| Detection cron | every 5 minutes |
| Unit tests | 9, all passing |
| Core tables | 6 (encounters, clinics, baselines, alerts, tasks, referrals) |
| Running cost | zero |
| Entry target | 10 seconds |

---

## Three rules on stage

1. **Never bluff a number.** "I would have to check" is a fine answer; a wrong
   figure a judge catches costs you the room.
2. **Turn "why did you not..." into "here is the trade-off we made."** Every
   gap in this project was a decision, and you can name the reason for each.
3. **When in doubt, show the code or the database.** You built something real.
   That is the advantage — use it.
