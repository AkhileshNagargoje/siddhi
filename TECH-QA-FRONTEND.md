# Atreya — frontend, security & privacy Q&A

Grounded in the actual code. Format: **Q** = question · **Say** = spoken answer
· **Depth** = the detail that proves you understand it.

Three items below are marked **⚠ REAL RISK** — read those first, they are things
to fix or be ready for, not just talking points.

---

## Authentication & access

### Q1. Four-digit PINs, printed on the login screen. That's not authentication.

**Say:** "Correct, and it's deliberate for a prototype — the PINs are on screen
so anyone judging can walk through all three roles without us handing out
credentials. In deployment this becomes proper identity: the health department
already issues staff IDs, and the natural path is one account per worker with
the role in the token rather than a shared PIN."

**Depth:** "The important design point survives either way — the role determines
what you can see. A clinic worker never sees the whole festival; that separation
is in the app structure, not just the login."

---

### Q2. ⚠ REAL RISK — Your Supabase key is in the frontend. What can I do with it?

**Say:** "That key is publishable by design — it ships in every Supabase
frontend. The protection is row-level security in Postgres. We also hardened it:
the public key can read, insert and update, but DELETE is revoked entirely,
because the app never deletes anything and a public key that can empty your
tables is a liability."

**Depth:** `db/harden.sql`. It also explicitly enables RLS, because if RLS is off
Postgres ignores policies completely and permits everything.

**⚠ The honest remaining exposure:** anyone with the key can still INSERT and
UPDATE. In practice that means a stranger could write fake encounters or close
your alerts. For a demo that's acceptable; for deployment, writes need to be
authenticated. Say this before a judge finds it.

---

### Q3. ⚠ REAL RISK — `/demo` is publicly reachable and can clear the board.

**Say:** "It's a demo console, and it's non-destructive — it resolves alerts
rather than deleting them, because the public key can't delete. But you're right
that it's reachable by anyone who guesses the URL."

**⚠ Practical action before judging:** if anyone else has your URL, be aware
someone could close your alerts mid-presentation. Either don't share `/demo`, or
accept the risk knowingly. Worth a two-minute conversation with the team.

---

## The referral card

### Q4. The QR contains health data. What happens when a patient loses the card?

**Say:** "Whoever finds it can scan it, so we deliberately minimised what's on
it: an age band, sex, the clinic name, date, the risk flag and the reading. No
name, no address, no ID number — you cannot identify the person from it. It's
closer to a paper prescription than a medical record, and paper prescriptions
have the same property."

**Depth:** The payload fields are literally `{t, a, s, c, d, f, v}` in
`app/src/lib/referral.js` — token, age band, sex, clinic, date, flags, vitals.

**Honest extension:** "If we wanted to harden it, the QR would carry only the
token and the record would live behind a lookup — but that breaks the offline
property, which is the whole point for a village clinic."

---

### Q5. Why put the data in the URL fragment rather than a database lookup?

**Say:** "Because the fragment never leaves the browser — it isn't sent to any
server, not even ours. That means the receiving clinic needs no account, no
lookup and no permission from us to read it, and we never learn that the card
was scanned. It's better privacy and better availability at the same time."

**Depth:** "Everything after the `#` is client-side only by web standard. That's
also why we can say the card works without us — if our server disappeared
tomorrow, the card still reads."

---

### Q6. Is this personal data under the DPDP Act?

**Say:** "The encounter records are effectively de-identified — age band, sex,
sector, symptoms, time, no name or ID. The referral card is closer to personal
health data, which is why it stays in the patient's own hands rather than in a
central store we control. A real deployment would need a proper consent flow and
a retention policy, and we'd expect the health department to be the data
controller, not us."

**Depth:** Don't over-claim legal compliance. "We designed for data minimisation;
we'd need legal review before deployment" is the credible answer.

---

## Offline & sync

### Q7. What happens if the sync queue fails or fills up?

**Say:** "The queue lives in localStorage, which gives us a few megabytes —
thousands of records, far more than one clinic generates in a day. If an upload
fails the records stay queued and retry every five seconds and on the browser's
online event. Nothing is deleted until the server confirms it."

**Depth — the bug worth telling:** "We only remove the records we actually sent.
An earlier version cleared the whole queue after a successful upload, so a
patient saved while the upload was in flight was silently wiped. And a thrown
request used to leave the sync flag stuck, deadlocking uploads for the rest of
the session — that's now in a try/finally."

---

### Q8. What if the doctor's device is lost or shared?

**Say:** "Anything still queued on that device is lost, which is the real cost of
offline-first — there's no way around it without a network. Records already
synced are safe. On a shared device the PIN determines the clinic, so a
handover works, but there's no per-user session, which is another reason
deployment needs real accounts."

---

## Concurrency & correctness

### Q9. Two crews open the same task. What happens?

**Say:** "Last write wins on the acknowledge timestamp — we don't lock the row.
In practice a task is dispatched to one named unit, so both crews would have to
be logged in as the same unit. It's a real gap, and the fix is a conditional
update that only sets the acknowledgement if it's still null."

**Depth:** Being able to name the exact fix — a compare-and-set on a null column
— is what separates "we didn't think about it" from "we scoped it out."

---

### Q10. How do you know the UI isn't lying about what was saved?

This is the best story you have. Use it.

**Say:** "Because it lied to us once. The Acknowledge button did nothing for a
while and looked completely fine — a Supabase query builder is lazy, so it only
sends the request when something awaits it, and it had been written as an arrow
function that returned the builder and dropped it. Nothing errored. We caught it
by querying the database afterwards instead of trusting the screen, and that's
now how we verify every flow."

---

## Accessibility

### Q11. What accessibility work have you actually done?

**Say:** "Keyboard focus rings that show for keyboard users and not mouse users;
reduced-motion support so every animation collapses for people with vestibular
sensitivity; all 42 tap targets on the entry form verified at 44 pixels or
larger; and status is never carried by colour alone — every alert badge and
above-median bar ships an icon and a text label."

**Depth:** "Charts also have a table view, so no value is reachable only by
hovering. That matters on a tablet where hover doesn't exist."

---

### Q12. Is it usable by a colour-blind health officer?

**Say:** "Yes, and it's tested rather than assumed. Our heatmap is a single-hue
sequential ramp, verified monotonic in perceptual lightness, and every cell
prints its own number so the colour is redundant. Alert states carry an icon and
a word, not just red or amber."

---

## Internationalisation

### Q13. ⚠ Who verified your Hindi and Marathi?

**Say honestly:** "The translations are drafted and not yet verified by a native
speaker — that's on our list. It's forty words, and it's exactly the kind of
thing we'd want checked before anyone relies on it."

**⚠ Do not claim these are verified.** A Marathi-speaking judge will spot an
error instantly, and claiming verification you didn't do is far worse than
admitting a gap.

---

## Performance

### Q14. How big is the app, and will it load on a cheap phone over 3G?

**Say:** "The main bundle is about 150KB gzipped, and each screen is a separate
chunk of a few kilobytes that loads on demand — the doctor's phone never
downloads the dashboard code. We also self-host the font rather than pulling it
from a CDN, because the whole premise is that the network is saturated."

**Depth:** Route-level code splitting is visible in the build output — nine
separate page chunks, the largest under 20KB.

---

### Q15. Why React at all? Something lighter would load faster.

**Say:** "Honest answer: development speed under a hackathon deadline, and the
realtime dashboard genuinely benefits from a reactive rendering model. For the
clinic app alone, a lighter framework would be defensible — but shipping one
codebase for three roles was worth more than the kilobytes."

---

### Q16. Is it installable as an app?

**Say:** "Not yet — it's a normal web app with offline data, not a full PWA. It
works offline for data entry because the queue is local, but the app shell still
needs the network on first load. Adding a service worker is a small piece of work
and the right next step."

**Do not claim PWA status.** A judge can check in ten seconds.

---

## Testing

### Q17. How did you test the interface?

**Say:** "Manually and against the database rather than the screen — after every
flow we query Postgres and confirm the row landed with the right fields. We also
checked the entry form at mobile width in dark mode for overflow and tap-target
size. What we don't have is automated UI tests; the automated tests we do have
cover the detection maths, which is where a silent error would be most dangerous."

---

## The three things to say before a judge finds them

1. "The public key can still write — writes need authentication in deployment."
2. "The translations aren't native-speaker verified yet."
3. "It's not a full PWA — offline data yes, offline app shell no."

Volunteering these costs you nothing and buys credibility for everything else
you claim.
