import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isConfigured } from '../lib/supabase'
import { CLINICS, USERS } from '../config/festival'
import { AGE_BANDS, SEXES, SEVERITIES, SYMPTOMS, DIAGNOSES, DRUGS, ANTIBIOTIC_RULES } from '../config/medical'
import { riskFlags, makeToken } from '../lib/referral'
import { uuid } from '../lib/uuid'
import { ReferralCard } from '../components/ReferralCard'
import { MorningCard } from '../components/MorningCard'
import { MyClinic } from '../components/MyClinic'

/* The product was briefly renamed, and these keys carry the name. A phone that
   recorded patients under the old prefix would otherwise open with an empty
   queue and those records would never sync — silent data loss on exactly the
   device that was offline long enough to accumulate a backlog. Runs once,
   never overwrites a key that already exists, and is safe to delete after the
   event once no device can still be holding old data. */
;(function migrateStorageKeys() {
  try {
    for (const suffix of ['queue', 'ref_queue', 'synced', 'synced_day', 'morning_day']) {
      const old = localStorage.getItem('atreya_' + suffix)
      if (old !== null && localStorage.getItem('siddhi_' + suffix) === null) {
        localStorage.setItem('siddhi_' + suffix, old)
      }
      localStorage.removeItem('atreya_' + suffix)
    }
  } catch { /* storage denied — nothing to migrate, nothing to lose */ }
})()

// Offline-first: every record lands in localStorage first, a background loop
// pushes it up. Client-generated UUIDs make retries duplicate-proof.
const QUEUE_KEY = 'siddhi_queue'
const loadQueue = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') } catch { return [] } }
const saveQueue = q => localStorage.setItem(QUEUE_KEY, JSON.stringify(q))

/* Referrals ride their own queue. The card itself never needs the server — the
   QR carries everything — but the health system still wants a record that one
   was issued, so it syncs whenever the network allows. */
const REF_KEY = 'siddhi_ref_queue'
const loadRefs = () => { try { return JSON.parse(localStorage.getItem(REF_KEY) ?? '[]') } catch { return [] } }
const saveRefs = q => localStorage.setItem(REF_KEY, JSON.stringify(q))

// Counter is scoped to the local calendar day and rolls over on its own.
const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, local
function readSyncedToday() {
  if (localStorage.getItem('siddhi_synced_day') !== today()) return 0
  return Number(localStorage.getItem('siddhi_synced') ?? 0)
}
function bumpSyncedToday(by) {
  const n = readSyncedToday() + by
  localStorage.setItem('siddhi_synced_day', today())
  localStorage.setItem('siddhi_synced', String(n))
  return n
}

const EMPTY = { age_band: null, sex: null, symptoms: [], diagnosis: null, drugs: [], severity: 'mild' }

/* The "control" here is a row of chip buttons, not a form input, so a <label>
   labels nothing and is never read out with the chips. A named group is the
   correct shape — and it also gets the Clear button out of the label, where
   tapping the caption text was firing Clear. */
let fieldSeq = 0
function Field({ label, required, onClear, children }) {
  const [id] = useState(() => `fld-${++fieldSeq}`)
  return (
    <div className="field">
      <span className="field-cap">
        <span id={id}>{label}{required && <em> *</em>}</span>
        {/* Only offered once something is selected — an always-visible Clear
            on an empty list is noise on a screen that must stay scannable. */}
        {onClear && <button className="clear" onClick={onClear}>Clear</button>}
      </span>
      <div className="chips" role="group" aria-labelledby={id}>{children}</div>
    </div>
  )
}

export default function EntryPage() {
  const [user, setUser] = useState(null)
  const flashTimer = useRef(null)
  useEffect(() => () => clearTimeout(flashTimer.current), [])
  const [pin, setPin] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [flash, setFlash] = useState(false)
  const [kept, setKept] = useState(false) // doctor dismissed the antibiotic prompt
  const [vitals, setVitals] = useState({ sys: '', dia: '', sugar: '' })
  const [showVitals, setShowVitals] = useState(false)
  const [referral, setReferral] = useState(null)
  const [queue, setQueue] = useState(loadQueue)
  /* The counter is labelled "today", so it has to mean today. It used to be a
     lifetime total in localStorage, which after a few rehearsals had the phone
     opening on "218 today" for a clinic that had seen three patients. */
  const [synced, setSynced] = useState(readSyncedToday)
  const busy = useRef(false)

  const clinic = user ? CLINICS.find(c => c.id === user.clinicId) : null

  /* Push whatever is queued. Called right after a save (so an online clinic
     appears on the dashboard immediately), on a 5s timer, and when the network
     comes back. The queue stays the source of truth either way — an immediate
     push that fails is just a no-op that the timer retries. */
  const flush = useCallback(async () => {
    if (busy.current || !isConfigured()) return
    const batch = loadQueue()
    const refs = loadRefs()
    if (!batch.length && !refs.length) return
    busy.current = true
    try {
      if (batch.length) {
        // upsert, not insert: a multi-row insert is atomic, so ONE duplicate
        // left over from a half-delivered attempt rolled the whole statement
        // back with 23505 — which the branch below treated as success and
        // cleared the queue, silently losing every other patient in the batch.
        const { error } = await supabase
          .from('encounters')
          .upsert(batch, { onConflict: 'id', ignoreDuplicates: true })
        if (!error || error.code === '23505') {
          // Drop only what we actually sent — a patient saved while this
          // request was in flight must not be wiped with the batch.
          const sent = new Set(batch.map(r => r.id))
          const rest = loadQueue().filter(r => !sent.has(r.id))
          setSynced(bumpSyncedToday(batch.length)); saveQueue(rest); setQueue(rest)
        } else {
          // Referrals point at encounters — never send them ahead of the rows
          // they reference, or the foreign key rejects them.
          return
        }
      }
      if (refs.length) {
        /* Upsert, not insert — same reasoning as the encounters batch above.
       A plain multi-row insert is atomic, so a single id left over from a
       half-delivered attempt rolls the whole batch back with 23505, and the
       branch below reads 23505 as success and clears the queue. Referrals are
       the record that a card was handed to a patient, so the loss is silent. */
    const { error } = await supabase.from('referrals')
      .upsert(refs, { onConflict: 'id', ignoreDuplicates: true })
        if (!error || error.code === '23505') {
          const sent = new Set(refs.map(r => r.id))
          saveRefs(loadRefs().filter(r => !sent.has(r.id)))
        }
      }
    } catch {
      // Network dropped mid-request: keep the queue, retry on the next tick.
    } finally {
      // Without this, one thrown request would deadlock sync forever.
      busy.current = false
    }
  }, [])

  useEffect(() => {
    const t = setInterval(flush, 5000)
    window.addEventListener('online', flush)
    return () => { clearInterval(t); window.removeEventListener('online', flush) }
  }, [flush])

  /* Morning card (TASK 3): shown once per local day, right after sign-in.
     Sample props for now — main dev wires live figures once the component
     ships. The stub renders null, so this mounts invisibly until then. */
  const [showMorning, setShowMorning] = useState(false)
  // Entry is the default and stays one tap away. The clinic view is a
  // separate tab precisely so the ten-second path never renders it.
  const [tab, setTab] = useState('entry')

  function login() {
    const u = USERS.find(u => u.pin === pin && u.role === 'worker')
    if (!u) { setPin(''); return }
    setUser(u)
    if (localStorage.getItem('siddhi_morning_day') !== today()) setShowMorning(true)
  }

  function closeMorning() {
    localStorage.setItem('siddhi_morning_day', today())
    setShowMorning(false)
  }

  function toggle(field, value) {
    // Changing the diagnosis or the drug list re-opens the question.
    if (field === 'diagnosis' || field === 'drugs') setKept(false)
    setForm(f => {
      const cur = f[field]
      if (Array.isArray(cur)) return { ...f, [field]: cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value] }
      return { ...f, [field]: cur === value ? null : value }
    })
  }

  const ready = form.age_band && form.sex && form.diagnosis
  const willRefer = ready && riskFlags({ diagnosis: form.diagnosis, symptoms: form.symptoms, vitals }).length > 0

  /* Stewardship prompt: an antibiotic chosen for a diagnosis that usually
     doesn't need one. It is a question, never a gate — saving is always
     available and one tap dismisses it (PROJECT.md design rule 1). */
  const abxChosen = form.drugs.filter(id => DRUGS.find(d => d.id === id)?.antibiotic)
  const rule = form.diagnosis ? ANTIBIOTIC_RULES[form.diagnosis] : null
  const offGuideline = abxChosen.length > 0 && rule && !rule.usuallyNeeded
  const showPrompt = offGuideline && !kept

  function dropAntibiotics() {
    setForm(f => ({ ...f, drugs: f.drugs.filter(id => !DRUGS.find(d => d.id === id)?.antibiotic) }))
    setKept(false)
  }

  function save() {
    if (!ready) return
    const dx = DIAGNOSES.find(d => d.id === form.diagnosis)
    const flags = riskFlags({ diagnosis: form.diagnosis, symptoms: form.symptoms, vitals })
    const rec = {
      id: uuid(),
      ts: new Date().toISOString(),
      clinic_id: user.clinicId,
      sector: clinic.sector,
      age_band: form.age_band,
      sex: form.sex,
      symptoms: form.symptoms,
      diagnosis: form.diagnosis,
      syndrome: dx?.syndrome ?? 'other',
      drugs: form.drugs,
      severity: form.severity,
      // Recorded, not blocked — this is what the stewardship panel counts.
      risk_flags: [...flags, ...(offGuideline ? ['abx_off_guideline'] : [])],
      simulated: false,
    }
    const q = [...loadQueue(), rec]
    saveQueue(q); setQueue(q)

    // A flagged patient leaves with a card; everyone else just gets the tick.
    if (flags.length) {
      const token = makeToken()
      // The card works without this row — the QR is self-contained. The row is
      // the health system's own record that a referral was handed over.
      saveRefs([...loadRefs(), {
        id: uuid(),
        encounter_id: rec.id,
        risk_type: flags.join(','),
        qr_token: token,
      }])
      setReferral({
        token,
        ageBand: form.age_band,
        sex: form.sex,
        clinic: clinic.name,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        flags,
        vitals: {
          ...(vitals.sys && vitals.dia ? { bp: `${vitals.sys}/${vitals.dia}` } : {}),
          ...(vitals.sugar ? { sugar: vitals.sugar } : {}),
        },
      })
    } else {
      setFlash(true)
      clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setFlash(false), 1100)
    }

    flush() // online: lands on the dashboard now, not on the next 5s tick
    setForm(EMPTY); setKept(false); setVitals({ sys: '', dia: '', sugar: '' }); setShowVitals(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!user) {
    return (
      <div className="login">
        <div className="login-card">
          <h2>Clinic sign in</h2>
          <p>Enter your 4-digit PIN</p>
          <input type="password" inputMode="numeric" maxLength={4} value={pin} autoFocus
                 aria-label="4-digit PIN"
                 onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                 onKeyDown={e => e.key === 'Enter' && login()} />
          <button className="btn btn-wide" onClick={login} disabled={pin.length !== 4}>Enter</button>
          <p>Demo PIN 1111</p>
        </div>
      </div>
    )
  }

  return (
    <div className="entry">
      <div className="entry-bar">
        <div>
          <b>{clinic?.name}</b>
          <small>{user.name}</small>
        </div>
        <span className={queue.length ? 'sync pending' : 'sync'}>
          <i />{synced + queue.length} today · {queue.length ? `${queue.length} pending` : 'synced'}
        </span>
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'entry'}
                className={tab === 'entry' ? 'tab on' : 'tab'}
                onClick={() => setTab('entry')}>New patient</button>
        <button role="tab" aria-selected={tab === 'clinic'}
                className={tab === 'clinic' ? 'tab on' : 'tab'}
                onClick={() => setTab('clinic')}>My clinic</button>
      </div>

      {tab === 'clinic' && <MyClinic clinic={clinic} sector={clinic?.sector} />}

      {tab === 'entry' && (
      <>
      <Field label="Age" required>
        {AGE_BANDS.map(a => (
          <button key={a} className={form.age_band === a ? 'chip on' : 'chip'} onClick={() => toggle('age_band', a)}>{a}</button>
        ))}
      </Field>

      <Field label="Sex" required>
        {SEXES.map(s => (
          <button key={s} className={form.sex === s ? 'chip on' : 'chip'} onClick={() => toggle('sex', s)}>{s}</button>
        ))}
      </Field>

      <Field label="Symptoms" onClear={form.symptoms.length ? () => setForm(f => ({ ...f, symptoms: [] })) : null}>
        {SYMPTOMS.map(s => (
          <button key={s.id} className={form.symptoms.includes(s.id) ? 'chip on' : 'chip'} onClick={() => toggle('symptoms', s.id)}>
            {s.en}<small>{s.hi}</small>
          </button>
        ))}
      </Field>

      <Field label="Diagnosis" required>
        {DIAGNOSES.map(d => (
          <button key={d.id} className={form.diagnosis === d.id ? 'chip on' : 'chip'} onClick={() => toggle('diagnosis', d.id)}>{d.en}</button>
        ))}
      </Field>

      <Field label="Medicines given"
             onClear={form.drugs.length ? () => { setForm(f => ({ ...f, drugs: [] })); setKept(false) } : null}>
        {DRUGS.map(d => (
          <button key={d.id}
                  className={`chip${d.antibiotic ? ' abx' : ''}${form.drugs.includes(d.id) ? ' on' : ''}`}
                  onClick={() => toggle('drugs', d.id)}>
            {d.name}{d.antibiotic && <small>antibiotic</small>}
          </button>
        ))}
      </Field>

      {showPrompt && (
        <div className="nudge" role="status">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
            <circle cx="8" cy="8" r="6.4" fill="none" strokeWidth="1.6" />
            <path d="M8 4.4v4.2M8 11v.6" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p>{rule.note}</p>
          <div className="nudge-acts">
            <button className="btn btn-quiet" onClick={dropAntibiotics}>Remove it</button>
            <button className="btn" onClick={() => setKept(true)}>Keep — my call</button>
          </div>
        </div>
      )}

      {offGuideline && kept && (
        <p className="nudge-kept">Antibiotic kept against guidance — recorded, not blocked.</p>
      )}

      {/* The hint under each grade is the whole point: without it two doctors
          anchor on different things and the field means nothing across clinics. */}
      <Field label="Severity">
        {SEVERITIES.map(s => (
          <button key={s.id} className={form.severity === s.id ? 'chip on' : 'chip'}
                  onClick={() => setForm(f => ({ ...f, severity: s.id }))}>
            {s.id}<small>{s.hint}</small>
          </button>
        ))}
      </Field>

      {/* Optional and collapsed by default — the ten-second path never sees it. */}
      <div className="field">
        {!showVitals ? (
          <button className="add-vitals" onClick={() => setShowVitals(true)}>+ Add BP / sugar reading</button>
        ) : (
          <>
            <label>Vitals <span className="opt">optional</span></label>
            <div className="vitals">
              <input inputMode="numeric" placeholder="BP sys" aria-label="Blood pressure, systolic" value={vitals.sys}
                     onChange={e => setVitals(v => ({ ...v, sys: e.target.value.replace(/\D/g, '').slice(0, 3) }))} />
              <span>/</span>
              <input inputMode="numeric" placeholder="dia" aria-label="Blood pressure, diastolic" value={vitals.dia}
                     onChange={e => setVitals(v => ({ ...v, dia: e.target.value.replace(/\D/g, '').slice(0, 3) }))} />
              <input inputMode="numeric" placeholder="Sugar mg/dL" aria-label="Blood sugar in mg/dL" value={vitals.sugar}
                     onChange={e => setVitals(v => ({ ...v, sugar: e.target.value.replace(/\D/g, '').slice(0, 3) }))} />
            </div>
          </>
        )}
      </div>

      {willRefer && (
        <p className="refer-hint">
          Referral card will print — {riskFlags({ diagnosis: form.diagnosis, symptoms: form.symptoms, vitals }).map(f => f === 'bp' ? 'high BP' : f === 'sugar' ? 'high sugar' : 'TB symptoms').join(', ')}
        </p>
      )}

      </>
      )}

      {tab === 'entry' && (
      <div className="savebar">
        <button className={`btn btn-wide${flash ? ' btn-good' : ''}`} disabled={!ready} onClick={save}>
          {flash ? '✓ Saved' : willRefer ? 'Save & print referral' : 'Save patient'}
        </button>
      </div>
      )}

      {referral && <ReferralCard referral={referral} onClose={() => setReferral(null)} />}

      {showMorning && (
        <MorningCard
          clinicName={clinic?.name}
          yesterdayPatients={182}
          sectorEvent={'Water contamination found and fixed at W-7'}
          myAntibioticRate={0.18}
          festivalMedianRate={0.24}
          onClose={closeMorning}
        />
      )}
    </div>
  )
}
