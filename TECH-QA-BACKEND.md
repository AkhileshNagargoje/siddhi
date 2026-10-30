# Siddhi — backend / systems / database Q&A

Every answer here is honest. Where the honest answer is "we didn't do that", it
says so and then says why that was the right call for a 10-day build. A judge
forgives a known gap. A judge does not forgive a bluff they catch.

---

## A. Schema & data model

### 1. "Why is `sector` an integer on `encounters` when `clinic_id` already points at `clinics`, which has a sector? That's denormalised."

**Say:** It is, deliberately. Detection groups by `(sector, syndrome)` over a
6-hour window every five minutes — putting sector on the encounter means that
grouping never needs a join. A clinic's sector is also a fact at the time of the
visit: mobile clinics move, and if a clinic is reassigned tomorrow we don't want
last week's encounters silently changing sector under our alerts.

**Depth:** `db/setup.sql` — `idx_enc_sector_syn_ts on encounters (sector,
syndrome, ts)` exists precisely for that grouping. Six of our seventeen clinics
are `type='mobile'`.

---

### 2. ⚠ "Where's your event-time vs ingest-time distinction? `ts` is set by the phone."

**Own it.** **Say:** You've found a real gap. `ts` is client-generated at save
time and there's no server-side `received_at`. If a phone's clock is wrong, or a
record sits in the offline queue for six hours, it lands in the wrong detection
window. The fix is one column with `default now()`, scoring on ingest time and
displaying event time. One-line migration; we didn't get to it.

---

### 3. "`symptoms`, `drugs`, `risk_flags` are `text[]`. Why not junction tables?"

**Say:** Nothing in the product queries inside those arrays — detection groups on
`syndrome`, a scalar we derive at entry. The arrays are display and audit data.
Three junction tables would cost joins and migrations to answer questions we
don't ask. A GIN index gets us array search later if we need it.

---

### 4. "You have a `baselines` table but recompute from raw encounters every scan. What's it for?"

**Say:** Honest answer — it's a display cache, not an input. Every scan
recomputes mean and stddev from raw rows and upserts 72 rows so the dashboard can
show "expected". Detection never reads it.

**Depth:** Nothing in the codebase does a `select` on `baselines` to make a
decision.

---

## B. Query cost & scale

### 5. ⚠ "Your scan pulls 78 hours of raw encounters over HTTP and aggregates in JavaScript."

**Own it.** **Say:** At our scale — 17 clinics, ~1,500 encounters a day — that's
about 5,000 rows and five paged requests, well inside a Worker's budget. At real
Kumbh scale it breaks, and the fix is known: this is a `GROUP BY sector,
syndrome, time_bucket` that Postgres should do, returning 72 rows instead of
100,000. We chose the naive version because it's the version we could unit-test
as a pure function without a database.

**Depth:** `fetchRecent()` pages with `limit/offset`, and OFFSET pagination is
O(n²) as pages deepen. Keyset pagination on `ts` is the correct fix.

---

### 6. "Show me your indexes and tell me which one the scan actually uses."

**Say:** `encounters` has `idx_enc_ts (ts)` and `idx_enc_sector_syn_ts (sector,
syndrome, ts)`. The scan filters only on `ts >= since`, so it uses `idx_enc_ts`.
The composite serves the dashboard drill-down. If we pushed aggregation into SQL,
the composite becomes the right index.

**Depth:** The `order=ts.asc` in `fetchRecent` is load-bearing — without an ORDER
BY, Postgres gives no ordering guarantee across separate LIMIT/OFFSET pages, and
the traffic cron inserts *while we paginate*, so rows could be double-counted or
skipped.

---

### 7. "`alerts` has an index on `status` — a three-value column. Useless."

**Say:** Fair. The index that earns its place is the partial unique one:
`alerts_one_live_per_pair on alerts (sector, syndrome) where status <>
'resolved'`. That's a correctness constraint — it makes two live alerts for the
same pair physically impossible.

---

## C. Concurrency, races, idempotency

### 8. ⚠ "Two scans overlap. Both compute the same alert. What happens?"

**Say:** The database wins — the partial unique index rejects the second insert
with a 23505. But honestly: our `sbInsert` throws on any non-2xx and that throw
isn't caught inside the scan loop, so the loser aborts its whole scan. Remaining
cells go unevaluated, baselines aren't written, pharmacy is skipped. No bad data,
but a lost run. The fix is catching 23505 and treating it as "someone else
already raised this", which is what it means.

**⚠ This is a real unfixed bug. Say so if asked.** Blast radius: one scan cycle;
the next cron recovers.

---

### 9. ⚠ "Two crews open the same task. Or two officers both click Assign."

**Own it.** **Say:** Two Assign clicks create two task rows — no unique
constraint on `tasks.alert_id`, no optimistic locking. Concurrent resolves are
last-write-wins. The fix is a unique index on `tasks(alert_id) where resolved_at
is null` plus conditional updates — `update ... where id = ? and ack_at is null`
— so acknowledge is a claim, not a blind write.

---

### 10. "Your offline queue retries. How do you not create duplicate patients?"

**Say:** Every record carries a client-generated UUID as primary key, so a retry
is the same row. The sync is an upsert with `onConflict: 'id', ignoreDuplicates:
true` — not a plain insert. That distinction cost us a bug: a multi-row insert is
atomic, so *one* leftover duplicate rolled the entire statement back with 23505,
and our error branch read 23505 as success and cleared the queue — silently
losing every other patient in that batch.

**Depth:** We also only remove the ids we actually sent, so a patient saved while
the request was in flight isn't wiped with the batch.

---

### 11. "Referrals reference encounters. What if the referral syncs first?"

**Say:** It can't — flush sends encounters first and returns early if that fails,
before touching the referral queue. FK ordering is enforced by sync order, and
both queues are independent in localStorage so nothing is lost while waiting.

---

## D. Dedup and cooldown — your best material, rehearse this

### 12. "Scan runs every five minutes; cases stay in the window six hours. Why not 72 duplicate alerts?"

**Say:** Two guards. Dedup: before raising, we look for an existing unresolved
alert for that pair and patch it instead. Cooldown: once a crew closes it, the
triggering cases are *still in the window*, so without suppression the next scan
raises a fresh alert seconds after the fix — which reads as the system ignoring
the response.

**Depth — three real bugs, all fixed:**
- Dedup originally matched `status = 'open'`. Dispatching moved it to `assigned`,
  which hid it from the next scan, producing a duplicate every five minutes.
- The fix introduced a NULL-safety bug: PostgREST's `neq` emits SQL `<>`, and
  `NULL <> 'resolved'` is NULL, not true — so NULL-status rows were invisible to
  dedup and re-fired forever. Now `or=(status.is.null,status.neq.resolved)`.
- An explicit `limit=5000`, because Supabase's default max-rows would silently
  truncate the dedup set on a busy festival.

---

### 13. "What is the cooldown anchored on? Be specific."

**Say:** `tasks.resolved_at` — when the crew *closed the job* — not `alerts.ts`,
which is when it was *raised*. That's a bug we shipped and fixed: if a crew took
longer than six hours, the raise time was already outside the window, so the
alert re-fired the instant it was resolved. The failure got **worse the slower
the response was**, which is exactly backwards for a response system.

---

### 14. "An alert never dispatched has no task row. What anchors its cooldown?"

**Say:** Nothing did, and we watched it fail live — resolved 02:14, re-fired
02:15, three sectors at once. We added `alerts.resolved_at` so resolution time
lives on the alert, not on the job that happened to close it. The worker wraps
that read in try/catch and falls back — shipping code that only works after a
hand-run migration is how a demo dies.

---

### 15. "A few hundred UUIDs in a URL — did you hit that limit?"

**Say:** We did, and it's the sharpest bug in the file. A UUID costs ~37
characters in an `id=in.(...)` filter, so a few hundred overflow the gateway
header limit. `sbGet` throws on non-2xx and that call sat *outside* the
try/catch — so the entire scan would 500 and detection would stop. Completely
reachable: a bulk board-clear before a demo produces exactly that many
resolutions in one window. We now query by timestamp directly and chunk
task-derived ids at 100 per request (~3.7 KB).

---

### 16. "You have a `bypass` that skips the cooldown. Aren't you rigging the demo?"

**Head on, don't get defensive.** **Say:** It's set by exactly one caller — the
`/outbreak` injector. That endpoint is an operator explicitly asserting "there is
an outbreak here, right now", which is the one statement a cooldown isn't
entitled to overrule. The cron scan never sets it, and it un-suppresses only the
single `sector|gi` pair the injector wrote, not the board. It exists because the
pre-demo checklist says clear the board, which puts every sector into a six-hour
cooldown — so firing the demo outbreak two minutes later raised nothing at all.

---

## E. Architecture

### 17. "Why Cloudflare Workers instead of a normal Node server?"

**Say:** Three reasons. It costs nothing. There's no machine to babysit — nothing
on a laptop, no restarts, no patching, and it stayed up while we slept. And cron
is built in, so the detection schedule isn't a separate process that can silently
die. The trade is a constrained runtime, and detection is a short bounded job, so
those constraints cost us nothing.

---

### 18. "Cron is the wrong shape. Detection should be event-driven off the insert."

**Say:** You're right that cron is a latency floor — worst case five minutes. We
accepted that because five minutes against a four-day status quo isn't the
bottleneck, and because a periodic full scan is *self-healing*: if one run fails,
the next recomputes from raw data. Event-driven has to get every increment right
or state drifts. Production shape is probably both — cron as the correctness
floor, plus a trigger for the fast path.

---

### 19. "What are the Worker's CPU limits and how close are you?"

**Say:** Wall time is dominated by network round trips to Supabase, not compute —
five paged reads plus a few writes, and arithmetic on a few thousand rows is
trivial. Nowhere near the limit. What would push us there is scale, and the
answer is the same: push aggregation into SQL.

**Depth:** The 78-hour lookback is `(72 + 6) hours` — three days of baseline plus
the current window, the minimum the phase-matched baseline needs.

---

### 20. ⚠ "Your engine endpoints are wide open."

**Own it.** **Say:** Correct, and it's a deliberate demo trade. Anyone with the
URL can inject up to 100 fake cases or force a scan. We bounded the damage —
sector validated 1–12, `n` clamped after we found `n=-5` and `n=abc` slipping
through, generic error messages so PostgREST doesn't leak table names. What we
did not add is auth, because there is no auth anywhere in the system. In
deployment, `/outbreak` and `/traffic` don't exist and `/scan` sits behind
Cloudflare Access.

---

## F. Failure, observability, durability

### 21. "Supabase goes down mid-festival. What happens?"

**Say:** Three layers, only one really covered. Entry is genuinely safe — every
patient hits localStorage first and retries when the network returns. The engine
logs and retries next tick; a failed scan costs one cycle. The dashboard goes
stale. What we don't have is any server-side buffer, so a long outage means
detection is blind for its duration — and nobody gets paged about that.

---

### 22. ⚠ "How do you know detection is running right now? Who pages you if it stops?"

**Own it — this is the most important weakness in the system.** **Say:** Nobody.
We log `SIDDHI_CRON_FAILED` with a greppable prefix, which came from a real
problem: traffic generation and detection are *separate cron invocations*, so a
throw in `scan()` left traffic happily filling the dashboard while detection was
dead. **The system looks perfectly alive with its core function stopped.** That's
the worst failure mode a surveillance system has. The missing piece is a
heartbeat — a "last successful scan" timestamp the dashboard turns red on. First
thing we'd build next.

---

### 23. ⚠ "What's your backup story?"

**Own it.** **Say:** Free tier, so no point-in-time recovery. If someone ran
`cleanup.sql` for real, encounters marked `simulated = false` — the real patient
data — would be gone. Our only structural protection is that DELETE is revoked
from the public key, so destruction requires the SQL Editor, which isn't reachable
from the internet. That's a boundary, not a backup. Real deployment needs PITR on
day one.

**Depth:** `setup.sql` used to grant `for all`, so re-running it after harden
("let me just re-seed the clinics") silently handed the public key the ability to
erase everything. Both files now grant identically so they're order-independent.

---

### 24. ⚠ "How do you handle migrations? I see loose `.sql` files."

**Own it.** **Say:** Hand-pasted into the SQL Editor. No migration tool, no
version table. What we did instead is make it survivable: every file is
idempotent, and the *code tolerates un-migrated schema at runtime* — the worker
catches a missing `alerts.resolved_at` and falls back; the app retries the
resolve without the column on PGRST204. Not a migration system, but a
half-migrated database degrades instead of breaking.

---

### 25. ⚠ "No CI. Nine tests you run by hand."

**Own it.** **Say:** True — `npm test` in `worker/` is manual. What we did
prioritise is testing the one thing that must be right: the detection decision is
a pure exported function, no database, no mocks. The tests assert epidemiological
intent — each reads as "the system would now cry wolf", not "3.71 != 3.70".
Wiring it into Actions is fifteen minutes and we should have spent it.

**Depth:** `scoreCell(8, [2,3,2])` gives z = 3.71 because the Poisson floor
overrides a raw stddev of 0.47; without it, 8 against a baseline of 2 pages a
crew at z = 12. One test documents an *accepted* weakness: a noisy historical day
`[1,10,1]` desensitises the cell and 14 observed stays quiet.

---

### 26. "Your key is committed in `wrangler.jsonc` and `simulate.js`. Talk about secrets."

**Say:** It's the publishable key — public by design, already in the frontend
bundle, so hiding it in the Worker would be theatre. We keep it a `var` so any
teammate can redeploy reproducibly. The security boundary is RLS, not key
secrecy. Where we *are* exposed: the same key can write. There is no service-role
key anywhere in the repo, and that's the one that would matter.

---

## G. Realtime & the frontend as a database client

### 27. ⚠ "Every dashboard subscribes to every encounter INSERT. How many clients before that falls over?"

**Own it.** **Say:** It doesn't scale. The free tier caps concurrent Realtime
connections, and we fan out *every encounter row* to every dashboard. Three or
four officials is fine; fifty at real ingest is the first thing to break. The
correct design broadcasts *aggregates*, not raw rows.

**⚠ Also a real bug:** the encounters array appends forever and is never trimmed
— only a derived memo filters to 6 hours. A slow memory leak on a screen designed
to stay open for days.

---

### 28. "Your dashboard pages up to 20,000 rows into a browser on load."

**Say:** Same architectural mistake as the Worker scan, same fix — a SQL
aggregate returning tens of rows. The one thing we got right is ordering: we page
newest-first, so truncation loses old data rather than the current window alerts
depend on.

---

## H. Portability & the second signal

### 29. "Redeploy at a different festival tomorrow. What changes?"

**Say:** One config file — `app/src/config/festival.js` has sectors, water
points, kitchens, clinic roster. Thresholds live in exactly one place. We
deliberately *removed* a mirrored DETECTION block from the config because it
looked authoritative while wired to nothing, and a config value that silently
does nothing is worse than none.

**Volunteer this before they find it:** the clinic list is duplicated in three
places — app config, worker, simulator — so each can run standalone. It's
copy-paste and it will drift. A shared module or reading the `clinics` table is
the right answer.

---

### 30. "The pharmacy signal — real, or the same data dressed up?"

**Say:** Genuinely independent, and that's the argument. Different reporters —
stall keepers, not clinicians. A different act — a purchase, not a consultation.
It matters because people self-medicate *before* they consult, so rehydration
sales lead clinic cases by hours, and they capture people who never reach a
clinic at all — the system's largest blind spot. Two independent signals agreeing
is evidence in a way one signal shouting twice is not.

**Depth — the part that shows judgement:** we count only `ors`, `zinc` and
`antidiarrheal`. Paracetamol and cough syrup are sold for everything and would
bury the signal. We set the pharmacy bar at the *same* z ≥ 3 as clinical, not
lower — at z ≥ 2.5 two of twelve sectors read elevated on ordinary data, and a
corroborating signal lit 17% of the time corroborates nothing. It never
dispatches on its own: it confirms, or it warns early. It also runs in its own
try/catch so the second signal can never take down the primary.

---

## Real bugs found in review — brief the team

1. **Unhandled 23505 on alert insert aborts the scan.** The unique index protects
   the data correctly, but the losing racer throws, skipping remaining cells, the
   baselines upsert, and the pharmacy scan. Recovers next tick. Cheapest fix in
   the repo.
2. **No uniqueness or locking on dispatch/ack/resolve.** Two Assign clicks make
   two tasks; concurrent resolves are last-write-wins.
3. **No `received_at`.** Detection buckets on client-supplied `ts`, so a stale
   queue or wrong device clock lands cases in the wrong window.
4. **Unbounded encounters array in the dashboard.** Realtime appends forever.
5. **NULL-status inconsistency.** The worker treats `status IS NULL` as
   unresolved; the partial unique index `where status <> 'resolved'` does not
   index NULL-status rows. The two disagree.

If a judge finds any of these, the winning move is: "Yes — here's exactly why it
happens, here's the blast radius, here's the fix." That reads as engineering.
Anything else reads as luck.
