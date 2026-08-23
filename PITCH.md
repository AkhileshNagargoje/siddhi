# Siddhi — pitch script

Seven minutes. Every number here is verified; sources at the bottom.

**Setup before you stand up**
- Laptop: three tabs — `/replay`, `/dashboard`, `/dashboard` (spare). Hard-refresh each.
- Phone: `/entry`, signed in with PIN 1111, browser storage cleared so it reads "0 today".
- **Once, ever:** run `db/resolved-at.sql` in the Supabase SQL editor. Without it,
  clearing the board does not stick — every alert re-fires within five minutes,
  because the engine's cooldown has nothing to anchor to. Verified: cleared 7,
  rescanned, got the same 7 straight back.
- Open `/demo` and press **Clear the board**. Check the dashboard says **0 open alerts**.
- Do **not** click a sector tile on stage — the detail panel is a teammate task and still renders nothing.
- Phone on the projector too if the venue allows. If not, hold it up and narrate.

---

## 0:00 — 0:50 · The problem. No screen. Look at them, not the laptop.

> Fourteen people in one sector of the Kumbh drink from a cracked water pipe.
>
> They don't all go to the same clinic. They go to four different clinics, at different hours of the day. Each doctor sees three or four patients with diarrhoea — which is a completely normal Tuesday. So nobody raises an alarm.
>
> *(beat)*
>
> And here's the part that matters. There *was* no alarm to raise. The number fourteen didn't exist anywhere. It was three here, four there, five somewhere else, sitting in four separate paper registers that get added up in November.
>
> Every one of those fourteen people got correct treatment. And the pipe kept running. Day four: four hundred cases, a five-hour queue, and pilgrims on trains home to forty districts.

**Pause. Then, quieter:**

> Everyone got treated. Nobody turned off the tap.

---

## 0:50 — 2:20 · The replay. Press play, then mostly shut up.

Open `/replay`, press **Play**. Say only these three lines, timed to the screen:

- *(early, tiles showing 3 and 2)* — "Three cases at one post. Two at another. Every doctor is seeing a normal handful."
- *(the alert fires)* — "There. Fourteen against four expected. The software saw it, not a person."
- *(resolved)* — "A crew found a cracked pipe beside a drain and chlorinated it. Ninety minutes."

**Do not oversell it while it plays.** The silence is doing work.

Then, before you move on — say this, because someone will check:

> That's a scripted scenario. But it runs the exact detection rule the live system runs: a six-hour window, three sigma, minimum eight cases. Here's that rule running right now.

---

## 2:20 — 3:20 · The live dashboard.

Switch to `/dashboard`.

> This is live. Twelve sectors, seventeen clinics, about fifteen thousand patient records, updating as we speak.

Point at three things and no more:

1. **The sector grid** — "shaded by case load. Grey means a clinic has gone quiet, which is different from calm, and we treat it that way."
2. **The curve** — "cases per hour, with the expected line."
3. **Click a resolved alert** — "and every alert shows its own arithmetic. Observed, expected, how many standard deviations. An officer can argue with this. That's deliberate — they ignore anything they can't argue with."

---

## 3:20 — 4:20 · The phone. This is the moment people remember.

Hold up the phone.

> This is the only place data comes in. A doctor at a clinic tent.

Enter a patient while talking — age, sex, two symptoms, diagnosis, medicine:

> Age band. Male. Loose motions, vomiting. Gastroenteritis. ORS. Save.

**Point at the laptop.** The sector tile moves.

> Ten seconds, and it's on the control room screen. It works with no network — it queues on the phone and syncs when it can. That matters more than anything else we built, because if this is slow, doctors abandon it by day three and every other screen goes dark.

---

## 4:20 — 5:10 · The second signal. The part nobody else has.

Trigger an outbreak (`/demo`, or ask a teammate to fire it), then click the new alert.

> Now — this alert is corroborated.
>
> Pharmacy stalls tally what they sell. Rehydration sales in that sector are several times normal — read the actual figure off the screen. People self-medicate before they consult, so this signal *leads* clinic cases — and it catches the people who never reach a clinic at all, which is our biggest blind spot.
>
> Different reporters. Different act — a purchase, not a consultation. Different failure modes. **Two independent signals agreeing is evidence. One signal shouting twice isn't.**

*(If asked what happens when they disagree:)*

> That's the more interesting case. Clinic cases up with no rehydration spike suggests it may not be waterborne — which changes where you send the crew first.

---

## 5:10 — 5:50 · Closing the loop, and the card.

Click **Dispatch**, pick a crew.

> The alert becomes a job with a name on it. The crew must acknowledge it and close it with what they found. We measure detection to response automatically — nobody self-reports.

Hold up the printed referral card.

> And the pilgrim with high blood pressure doesn't lose that finding on the train home. The QR carries the whole record, not a link — so a village clinic reads it with no network and no app. Paper for the patient, digital for the system.

---

## 5:50 — 6:40 · Does it work? Numbers, not adjectives.

> We didn't want to just assert that this works, so we measured it.
>
> We ran the *deployed* detection function against a thousand synthetic festivals, injecting an outbreak at a random sector and hour.
>
> A typical waterborne outbreak is caught a median of **seven hours after the first case, at eight cases** — against **thirty-three cases** before that cluster would be obvious to someone reading a chart.
>
> False alarms: **1.5 a day** dispatch a crew. Five a day appear on the dashboard and send nobody. We report those separately because they cost completely different things.
>
> And the trade is explicit rather than asserted — the harness sweeps the threshold, so we can show what a different one would have cost.

---

## 6:40 — 7:00 · The close.

> In 2015 a Harvard project ran this exact experiment at this exact festival. It proved health workers *will* enter the data — thousands of visits on tablets in the first days.
>
> It just drew charts with it. Its own data showed antibiotics prescribed in up to thirty-one percent of encounters — recorded, and never acted on.
>
> We built the ten minutes *after* the data is entered. See it, detect it, dispatch it, and carry it home.

**Stop talking.**

---

# The five questions you will get

**"Isn't this just a dashboard?"**
> A dashboard is where this stops for everyone else. Ours turns every alert into an assigned job a named crew has to close — which is why we can measure time-to-response at all. That's the whole difference.

**"Why no AI?"**
> Deliberately. A district health officer will act on "fourteen against four expected, four sigma" and will ignore a black box. Explainability is an adoption feature here, not a limitation. And honestly — twelve sectors and six syndromes is seventy-two series with no labelled outbreak history. There's nothing for a model to learn that arithmetic doesn't already give you.

**"Your data is fake."**
> Yes — say it first. It's synthetic, generated through the same API a real tablet writes to, so the detector can't distinguish it. That's what let us measure detection performance across a thousand festivals instead of asserting it.

**"What about a bathing day, when crowds triple?"** — *the sharpest question. Concede immediately.*
> Correct, and it's the first thing we'd fix. We detect on raw counts, so a genuine crowd surge would false-positive across every sector at once. The fix is rates per thousand present, using the crowd estimates the administration already produces. It's designed, not built — we chose to make what exists solid instead.

**"Three sigma — so a one-in-740 event?"** — *do not say yes.*
> No, and I wouldn't defend it that way. It's a triage threshold, not a p-value. It means this sector's count is at least three Poisson noise-widths above what the same six-hour slot looked like on the last three days. It's tuned to put roughly the right number of things in front of a human — which is why we measured the false-alarm rate rather than quoting a tail probability.

---

# If something breaks

| Problem | Do this |
|---|---|
| Replay won't animate | Drag the progress bar — every beat is scrubbable |
| Dashboard looks stale | Hard refresh (Ctrl+Shift+R). Never deploy on demo day |
| Phone won't sync | "It's queued — that's the offline design." True, and it's a feature |
| No alert appears | Don't wait. Use the replay; that's why it exists |
| Everything is on fire | Talk. The story works with no screen at all — you rehearsed the first fifty seconds for exactly this |

---

# Sources for every number

- **31% antibiotic prescribing** — [Shaikh et al., *JMIR Public Health and Surveillance* 2023](https://publichealth.jmir.org/2023/1/e45121)
- **2,000+ visits on day one, 30+ clinics** — [Harvard Mittal South Asia Institute](https://mittalsouthasiainstitute.harvard.edu/2018/05/the-jana-swasthya-project-at-the-2015-kumbh-mela/)
- **7h lag / 8 vs 33 cases / 1.5 act-tier false alarms** — `worker/eval/RESULTS.txt`, reproducible with `cd worker && node eval/harness.mjs --trials 1000`
- **600 → 35 cases** — a modelled counterfactual, and say so if pressed. The model is in `ReplayPage.jsx`.
