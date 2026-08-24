# The formula, piece by piece — and why each piece exists

Every part of this formula is there because something broke without it. This
document shows what breaks.

**Read PART A first** — it is the whole thing in six short steps, each formula
with a plain explanation underneath. PART B is the deeper version with the
evidence, for when a judge pushes.

---

# PART A — The formula in six steps

## Step 1 — What is normal here?

```
normal = (day1 + day2 + day3) ÷ 3
```

Add up what this area saw on the last 3 days **at this same time of day**, divide
by 3. That is your comparison point.

Only 3 days, because a festival is short and there is no year of history. And if
you looked further back, an outbreak that had been running a while would slowly
become the "normal" — and then you would never notice it.

The *same time of day* part matters more than it looks. Clinics are busy in the
morning and dead at 3am, so you must compare 6pm against 6pm. We got this wrong
at first and the system threw three false alarms on perfectly normal data,
because every evening looked like a disaster next to the night before.

---

## Step 2 — How much does this area normally move?

```
spread = √( ((d1−normal)² + (d2−normal)² + (d3−normal)²) ÷ 3 )
```

Nothing counts the same every day. A clinic averaging 9 patients sees 7, then 11,
then 9, then 12 — all normal days. This measures that natural movement.

Take each day, see how far it sits from the average, square it (to kill the minus
signs), average those, then square-root it (to undo the squaring). What is left
is the typical distance from normal.

---

## Step 3 — Pick the bounce

```
bounce = max( spread , √normal , 1 )
```

Three candidates. Take the biggest. Each one guards against a different problem.

**`spread`** — what we just measured. Good most of the time. But sometimes three
days come out nearly identical by pure luck, like 5, 5, 5, and then it looks like
this place never changes, which is not true. You just had a boring three days.

**`√normal`** — the safety floor. There is a fact about counting things: if you
normally count about 9, it naturally swings by about 3. Count 100, it swings
about 10. Square root. This stops the computer believing three lucky steady days
mean certainty. Without it, a clinic that saw 5, 5, 5 and then sees 12 would set
off a full emergency.

**`1`** — pure safety. If a brand-new clinic has seen zero patients for three
days, everything is zero and you would be dividing by zero. The 1 stops the crash.

Taking the biggest keeps all three protections switched on at once.

---

## Step 4 — How strange is today?

```
ratio = (today − normal) ÷ bounce
```

Two things are happening here.

**`today − normal`** is just the gap — how many extra patients turned up. Not a
percentage, because percentages fall apart on small numbers: 6 → 9 and 50 → 75
are both +50%, but only one of them is strange.

**`÷ bounce`** turns that gap into *how surprising* it is. Ten extra patients at
a busy clinic is nothing; ten extra at a tiny one is alarming. Dividing by that
area's own bounce puts both on the same scale, so one rule works everywhere.

---

## Step 5 — Do we raise a flag?

```
alert  when  ratio ≥ 3  AND  today ≥ 8
```

**`ratio ≥ 3`** — we make 1,728 checks a day (12 areas × 6 illnesses × 24 hours),
so even something rare happens a few times daily. At 2 bounces you would get
about 74 alerts a day and the officer stops reading them by Tuesday. At 4 you get
one a day but find outbreaks an hour later, and an hour is real people. At 3 you
get about 7 a day, and a human can read 7.

So it is not really a maths answer. **It is the most alerts a person will still
pay attention to.**

**`today ≥ 8`** — no matter how strange the ratio looks, never alert on fewer
than 8 people. An area that normally sees nothing could hit a ratio of 3 with
just 3 patients, and 3 patients might be one family. You do not send a crew
across a festival for that.

---

## Step 6 — How serious is it?

```
tier = act    if ratio ≥ 4
       watch  if ratio ≥ 3
```

At 3 it goes on the dashboard and nobody moves — it costs nothing to be wrong.
At 4 a crew is actually dispatched, which costs about ninety minutes of someone's
time, so it needs stronger evidence.

The cheap reaction happens early. The expensive one waits.

---

## The whole thing on one line

```
alert line = max( normal + 3 × bounce , 8 )
```

That is how many patients trigger a flag in any given area.

| Area | Normal | Bounce | Alerts at |
|---|---|---|---|
| Quiet | 6 | 2.45 | **14 patients** |
| Busy | 50 | 7.07 | **72 patients** |

Same formula. Different answer. **Nobody configured either one** — each area's
own history sets its own line.

---
---

# PART B — The evidence behind each piece

The rest of this document is the deeper version: what specifically breaks when
each guard is removed, with the numbers to prove it.

---

# The whole formula

```
normal  = average of the same 6-hour slot on the last 3 days

bounce  = max( measured spread , √normal , 1 )

ratio   = ( today − normal ) ÷ bounce

ALERT   when  ratio ≥ 3  AND  today ≥ 8
ACT     when  ratio ≥ 4
```

Now here is each piece, one at a time.

---

# PIECE 1 — "normal" = average of the last 3 days

### What it does
Gives us something to compare today against.

### Why 3 days?
A festival only lasts a few weeks. There is no year of history to lean on. Three
days is the shortest window that still gives us more than one number to average —
and by day four of the festival, every area has it.

### Why not more days?
Because an outbreak that has been running for a week would poison its own
baseline — the system would slowly accept the outbreak as "normal". A short
window keeps the comparison fresh.

### Honest weakness
Three points is a small sample. The average is fine; the *spread* calculated from
three points is unreliable — which is exactly why PIECE 3 exists.

---

# PIECE 2 — "the same 6-hour slot"

### What it does
Compares 2pm–8pm today against 2pm–8pm yesterday, not against 2am–8am.

### Why it's there
Clinics have a rhythm. Busy at 10am, empty at 3am. If you compared an evening
against a night, **every single evening would look like an outbreak.**

### What broke without it
This was a real bug in our first version. On completely normal data — no outbreak
anywhere — it raised **three false alerts** immediately. Fixing it to compare
like-for-like made those disappear.

### Why 6 hours?
- Shorter (1 hour) → too few cases to be stable, everything looks noisy
- Longer (24 hours) → you find the outbreak a day late
- 6 hours → short enough to act in the same shift, long enough to count

---

# PIECE 3 — "√normal" (the Poisson floor)

**This is the most important piece, and the one a statistics judge will ask about.**

### What it does
Sets a minimum size for the bounce, based on how much counting *naturally*
wobbles.

| Normal | Its natural wobble (√normal) |
|---|---|
| 4 | 2 |
| 9 | 3 |
| 25 | 5 |
| 100 | 10 |

### Why it's there
Sometimes three days come out almost identical **by pure luck** — like 5, 5, 5.
The measured spread is then **zero**. And a zero bounce means the computer thinks
this area *never* varies, so any rise at all looks infinitely serious.

### What breaks without it

Three identical days of 5, then today we see 12:

| | ratio | Result |
|---|---|---|
| **Without the floor** | 7.00 | **ACT — crew dispatched** |
| **With the floor** | 3.13 | watch — appears on screen only |

**Without it, we'd send a crew across a festival because a clinic saw 12 patients
instead of 5.** That's a normal Tuesday.

### The one-sentence version
> "Three steady days can happen by luck. We never let the maths pretend it's more
> certain than it can be."

---

# PIECE 4 — "measured spread"

### What it does
Looks at how much the last 3 days actually varied, and uses that if it's *bigger*
than the natural floor.

### Why it's there
Some areas genuinely swing a lot — a sector next to a bus stand, say, where
crowds arrive in waves. Those areas deserve a **wider** bar before we call
anything strange.

Example: days of 2, 15, 4. That area really is erratic.

| | Value |
|---|---|
| measured spread | 5.72 |
| √normal floor | 2.65 |
| **we use** | **5.72** ← measured wins |

### What breaks without it
Erratic areas would get a bar that's too tight, and they'd raise false alarms
constantly — the noisiest areas would be the ones crying wolf most often.

---

# PIECE 5 — the "1" at the end of max()

### What it does
Stops the bounce ever being zero.

### Why it's there
Pure safety. If an area has seen **zero** cases for three days, then normal = 0,
spread = 0, and √0 = 0. Dividing by zero.

### What breaks without it

Three days of zero, today we see 5:

| | ratio |
|---|---|
| **Without the 1** | **Infinity** — the program breaks |
| **With the 1** | 5.00 — handled normally |

### The one-sentence version
> "It's a guard rail. A brand-new clinic with no history can't crash the system."

---

# PIECE 6 — "max(...)" — taking the biggest of the three

### What it does
Picks whichever of the three numbers is largest.

### Why the biggest and not the smallest or the average?
Because **we would rather be slow than noisy.**

Taking the biggest gives the widest bar, which means fewer alerts, which means
the ones that do fire are trusted. Taking the smallest would give us the most
sensitive system possible — and a health officer who ignores it by Wednesday.

### The one-sentence version
> "Each of the three protects against a different failure. Taking the biggest
> means all three protections are always active."

---

# PIECE 7 — "( today − normal )" — subtract, don't divide

### What it does
Measures the gap in **patients**, before we convert it to bounces.

### Why not use a percentage instead?
Because percentages break on small numbers.

A "50% above normal" rule:

| Area | Fires at | How often that happens by luck |
|---|---|---|
| Quiet (normal 6) | 9 cases | **15% of the time** |
| Busy (normal 50) | 75 cases | **0.06% of the time** |

**The same rule is 264× more likely to cry wolf at the quiet area.** Small numbers
swing wildly in percentage terms; 6 → 9 is an ordinary day.

---

# PIECE 8 — "÷ bounce" — the division

### What it does
Converts a gap in patients into a gap in **bounces** — a unit that means the same
thing everywhere.

### Why it's there
Ten extra patients means nothing at a busy clinic and everything at a quiet one.
Dividing by that area's own bounce makes the two comparable.

| Area | +10 patients | In bounces | Verdict |
|---|---|---|---|
| Busy (normal 50, bounce 7) | 60 | 1.4 | normal day |
| Quiet (normal 6, bounce 2.5) | 16 | 4.0 | act |

### The one-sentence version
> "Bounce converts 'how many patients' into 'how surprising'."

---

# PIECE 9 — "ratio ≥ 3" — the threshold

### What it does
Decides how strange is strange enough.

### Why 3?

We check **1,728** times a day (12 areas × 6 illnesses × 24 hours). So even a
rare mistake happens often.

| Alert at | Chance per check | False alarms per day |
|---|---|---|
| 2 bounces | 4.3% | **~74** |
| **3 bounces** | **0.36%** | **~7** |
| 4 bounces | 0.05% | ~1 |

Each extra bounce cuts false alarms by roughly **ten times**.

- At 2 → 74 alerts a day. The officer switches it off on day one.
- At 4 → quiet, but you detect an hour later, and an hour is real people.
- At 3 → about 7 a day, most just sitting on a screen. A human can read 7.

### The one-sentence version
> "We chose 3 because it's the most alerts a real person will still pay attention
> to."

### Also worth knowing
Three sigma has been the standard control limit in engineering for a century. We
didn't invent the number — we verified it against our own data.

---

# PIECE 10 — "AND today ≥ 8" — the minimum count

### What it does
Refuses to alert on tiny numbers, no matter how strange the ratio looks.

### Why it's there
An area that normally sees zero cases has a bounce of 1. So **3 patients** would
give a ratio of 3 — a full alert, off three people.

### What breaks without it

Empty history, today we see 3 patients:

| | Result |
|---|---|
| **Without the minimum** | ratio 3.00 → **watch alert raised** |
| **With the minimum** | ratio 3.00 → **no alert** |

Three patients could be one family. You don't send a crew across a festival for
that.

### The one-sentence version
> "Small numbers lie. A system that cries wolf over three patients gets ignored by
> week two."

---

# PIECE 11 — two tiers (3 = watch, 4 = act)

### What it does
Splits alerts into "show it on screen" and "send a crew".

### Why it's there
Because being wrong costs different amounts.

| Tier | What happens | Cost of being wrong |
|---|---|---|
| **watch** (ratio 3–4) | appears on the dashboard | nothing — nobody moves |
| **act** (ratio 4+) | a crew is dispatched | about 1.5 crew-hours |

With a single threshold you'd be forced to choose between missing things and
wasting crews. Two thresholds let you do the cheap thing early and the expensive
thing only with more evidence.

### The measured effect
- All alerts: **6.8 a day**
- Only the ones that dispatch a crew: **1.5 a day**

---

# Summary table

| Piece | Why it exists | What breaks without it |
|---|---|---|
| 3-day average | something to compare against | no baseline at all |
| same time slot | clinics have a daily rhythm | every evening alerts |
| √normal floor | 3 steady days can be luck | 12 vs 5 becomes an ACT alert |
| measured spread | erratic areas need a wider bar | noisy areas alert constantly |
| the trailing 1 | never divide by zero | program crashes on a new clinic |
| max() | keep all three protections on | one failure mode gets through |
| subtract, not % | percentages break on small numbers | quiet areas cry wolf 264× more |
| ÷ bounce | makes areas comparable | can't compare a 6-clinic to a 50-clinic |
| ratio ≥ 3 | the most alerts a human will read | 74/day or a 1-hour delay |
| today ≥ 8 | small numbers lie | alerts on 3 patients |
| two tiers | wrong costs different amounts | waste crews or miss things |

---

# If a judge asks "why is your formula so complicated?"

> "It isn't complicated — it's one division. Every extra piece in it is a guard
> against a specific failure we actually hit while building this.
>
> The square root stops three lucky steady days from making the maths
> overconfident. The minimum of eight stops us dispatching a crew over three
> patients. The same-time-of-day comparison stops every evening looking like an
> outbreak — that one raised three false alerts on normal data before we caught
> it.
>
> Each piece is one line of code and one bug we don't have any more."
