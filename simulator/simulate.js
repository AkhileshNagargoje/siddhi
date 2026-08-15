// Drishti traffic simulator.
// Writes encounters through the SAME Supabase API the real app uses —
// detection cannot tell simulated data from real (PROJECT.md rule 7).
//
// Usage:
//   node simulate.js backfill          # 72h of normal history (baseline food)
//   node simulate.js live              # ongoing normal traffic, ~1 batch/30s
//   node simulate.js outbreak <sector> # inject growing GI outbreak in a sector
//   node simulate.js reset             # delete all simulated data

import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const SUPABASE_URL = 'https://ommnjuedmzffiawhkdqi.supabase.co'
const SUPABASE_KEY = 'sb_publishable_P2D7fSeuoaqc1tgURDXeoA_dDfff-Dk'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// --- festival config (mirrors app/src/config) ---
const CLINICS = [
  { id: 'C01', sector: 1 }, { id: 'C02', sector: 1 }, { id: 'C03', sector: 2 },
  { id: 'C04', sector: 3 }, { id: 'C05', sector: 3 }, { id: 'C06', sector: 4 },
  { id: 'C07', sector: 5 }, { id: 'C08', sector: 5 }, { id: 'C09', sector: 6 },
  { id: 'C10', sector: 7 }, { id: 'C11', sector: 8 }, { id: 'C12', sector: 8 },
  { id: 'C13', sector: 9 }, { id: 'C14', sector: 10 }, { id: 'C15', sector: 11 },
  { id: 'C16', sector: 11 }, { id: 'C17', sector: 12 },
]
const AGE_BANDS = ['0-5', '6-17', '18-39', '40-59', '60+']
const AGE_WEIGHTS = [0.05, 0.1, 0.3, 0.3, 0.25]
const SEXES = ['M', 'F']

// diagnosis mix on a normal festival day (weights sum to 1)
const CASE_MIX = [
  { diagnosis: 'ari',    syndrome: 'respiratory', w: 0.28, symptoms: ['cough', 'fever'],            drugs: ['pcm', 'orsyp'] },
  { diagnosis: 'age',    syndrome: 'gi',          w: 0.15, symptoms: ['loose_motions', 'vomiting'], drugs: ['ors', 'zinc'] },
  { diagnosis: 'injury', syndrome: 'injury',      w: 0.15, symptoms: ['injury'],                    drugs: ['ibup'] },
  { diagnosis: 'heat',   syndrome: 'heat',        w: 0.10, symptoms: ['dizziness', 'weakness'],     drugs: ['ors'] },
  { diagnosis: 'fuo',    syndrome: 'fever',       w: 0.10, symptoms: ['fever', 'weakness'],         drugs: ['pcm'] },
  { diagnosis: 'skin',   syndrome: 'other',       w: 0.07, symptoms: ['rash'],                      drugs: ['amox'] },
  { diagnosis: 'htn',    syndrome: 'screening',   w: 0.05, symptoms: ['dizziness'],                 drugs: [] },
  { diagnosis: 'dm',     syndrome: 'screening',   w: 0.04, symptoms: ['weakness'],                  drugs: [] },
  { diagnosis: 'other',  syndrome: 'other',       w: 0.06, symptoms: ['weakness'],                  drugs: ['pcm'] },
]

function pickWeighted(items, wKey) {
  const r = Math.random()
  let acc = 0
  for (const it of items) { acc += it[wKey]; if (r <= acc) return it }
  return items[items.length - 1]
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function pickAge() {
  const r = Math.random(); let acc = 0
  for (let i = 0; i < AGE_BANDS.length; i++) { acc += AGE_WEIGHTS[i]; if (r <= acc) return AGE_BANDS[i] }
  return '18-39'
}

// hourly rhythm: busy 8-12 and 16-20, quiet at night. Multiplier 0.15..1.
function hourFactor(date) {
  const h = date.getHours()
  if (h >= 8 && h < 12) return 1
  if (h >= 16 && h < 20) return 0.9
  if (h >= 12 && h < 16) return 0.6
  if (h >= 6 && h < 8) return 0.4
  if (h >= 20 && h < 23) return 0.35
  return 0.15
}

// base rate: encounters per clinic per hour at peak
const PEAK_PER_CLINIC_HOUR = 6

function makeEncounter(ts, clinic, mixItem) {
  const m = mixItem ?? pickWeighted(CASE_MIX, 'w')
  return {
    id: crypto.randomUUID(),
    ts: ts.toISOString(),
    clinic_id: clinic.id,
    sector: clinic.sector,
    age_band: pickAge(),
    sex: pick(SEXES),
    symptoms: m.symptoms,
    diagnosis: m.diagnosis,
    syndrome: m.syndrome,
    drugs: m.drugs,
    severity: Math.random() < 0.08 ? 'severe' : Math.random() < 0.35 ? 'moderate' : 'mild',
    risk_flags: [],
    simulated: true,
  }
}

async function insertBatch(rows) {
  if (!rows.length) return
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500)
    const { error } = await supabase.from('encounters').insert(chunk)
    if (error) { console.error('insert error:', error.message); process.exit(1) }
  }
}

// ---- commands --------------------------------------------------

async function backfill() {
  console.log('Backfilling 84h of normal traffic...')
  const rows = []
  const now = Date.now()
  for (let h = 84; h >= 1; h--) {
    const hourStart = new Date(now - h * 3600_000)
    const f = hourFactor(hourStart)
    for (const clinic of CLINICS) {
      const n = Math.round(PEAK_PER_CLINIC_HOUR * f * (0.6 + Math.random() * 0.8))
      for (let i = 0; i < n; i++) {
        const ts = new Date(hourStart.getTime() + Math.random() * 3600_000)
        rows.push(makeEncounter(ts, clinic))
      }
    }
  }
  await insertBatch(rows)
  console.log(`Inserted ${rows.length} encounters over 84h.`)
}

async function live() {
  console.log('Live mode: one batch every 30s. Ctrl+C to stop.')
  const GI = CASE_MIX.find(m => m.diagnosis === 'age')
  for (;;) {
    const nowD = new Date()
    const f = hourFactor(nowD)
    const rows = []
    for (const clinic of CLINICS) {
      // 30s slice of the hourly rate
      const expected = PEAK_PER_CLINIC_HOUR * f / 120
      if (Math.random() < expected) rows.push(makeEncounter(nowD, clinic))
    }
    await insertBatch(rows)
    if (rows.length) console.log(`${nowD.toLocaleTimeString()} +${rows.length} encounters`)
    await new Promise(r => setTimeout(r, 30_000))
  }
}

async function outbreak(sector) {
  const target = Number(sector)
  const clinics = CLINICS.filter(c => c.sector === target)
  if (!clinics.length) { console.error(`No clinics in sector ${sector}`); process.exit(1) }
  const GI = CASE_MIX.find(m => m.diagnosis === 'age')
  console.log(`Injecting GI outbreak in sector ${target}. Cases accelerate; Ctrl+C to stop.`)
  let wave = 0
  for (;;) {
    wave++
    const n = Math.min(2 + Math.floor(wave * 1.5), 15) // grows each wave
    const rows = []
    for (let i = 0; i < n; i++) {
      const enc = makeEncounter(new Date(), pick(clinics), GI)
      if (Math.random() < 0.5) enc.age_band = '60+' // skews elderly
      if (Math.random() < 0.25) enc.severity = 'severe'
      rows.push(enc)
    }
    await insertBatch(rows)
    console.log(`wave ${wave}: +${n} GI cases in sector ${target}`)
    await new Promise(r => setTimeout(r, 60_000))
  }
}

async function reset() {
  console.log('Deleting all simulated encounters, alerts, tasks, baselines...')
  await supabase.from('tasks').delete().not('id', 'is', null)
  await supabase.from('alerts').delete().not('id', 'is', null)
  await supabase.from('encounters').delete().eq('simulated', true)
  await supabase.from('baselines').delete().not('sector', 'is', null)
  console.log('Done.')
}

const cmd = process.argv[2]
if (cmd === 'backfill') await backfill()
else if (cmd === 'live') await live()
else if (cmd === 'outbreak') await outbreak(process.argv[3] ?? 5)
else if (cmd === 'reset') await reset()
else console.log('Usage: node simulate.js backfill | live | outbreak <sector> | reset')
