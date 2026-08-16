// Drishti engine — runs in Cloudflare's network, not on anyone's laptop.
//
//   */5 * * * *  detection scan (PROJECT.md spec)
//   *   * * * *  one minute of live clinic traffic, so the demo is always alive
//
// HTTP endpoints (handy for the demo and for testing):
//   GET /            status
//   GET /scan        run a detection scan now
//   GET /outbreak?sector=5&n=25   inject an outbreak burst

// ---------- config (mirrors app/src/config) ----------

const CLINICS = [
  { id: 'C01', sector: 1 }, { id: 'C02', sector: 1 }, { id: 'C03', sector: 2 },
  { id: 'C04', sector: 3 }, { id: 'C05', sector: 3 }, { id: 'C06', sector: 4 },
  { id: 'C07', sector: 5 }, { id: 'C08', sector: 5 }, { id: 'C09', sector: 6 },
  { id: 'C10', sector: 7 }, { id: 'C11', sector: 8 }, { id: 'C12', sector: 8 },
  { id: 'C13', sector: 9 }, { id: 'C14', sector: 10 }, { id: 'C15', sector: 11 },
  { id: 'C16', sector: 11 }, { id: 'C17', sector: 12 },
]

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

const AGE_BANDS = ['0-5', '6-17', '18-39', '40-59', '60+']
const AGE_WEIGHTS = [0.05, 0.1, 0.3, 0.3, 0.25]
const SYNDROMES = ['gi', 'respiratory', 'heat', 'fever', 'injury', 'other']
const SECTORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const WINDOW_H = 6
const Z_WATCH = 3
const Z_ACT = 4
const MIN_COUNT = 8
const PEAK_PER_CLINIC_HOUR = 6

// ---------- Supabase REST helpers ----------

function headers(env, extra = {}) {
  return {
    apikey: env.SUPABASE_KEY,
    Authorization: `Bearer ${env.SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

async function sbGet(env, path) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { headers: headers(env) })
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${await res.text()}`)
  return res.json()
}

async function sbInsert(env, table, rows) {
  if (!rows.length) return
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers(env, { Prefer: 'return=minimal' }),
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`INSERT ${table} -> ${res.status} ${await res.text()}`)
}

async function sbUpsert(env, table, rows) {
  if (!rows.length) return
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers(env, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`UPSERT ${table} -> ${res.status} ${await res.text()}`)
}

async function sbPatch(env, table, filter, patch) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: headers(env, { Prefer: 'return=minimal' }),
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`PATCH ${table} -> ${res.status} ${await res.text()}`)
}

// ---------- traffic generation ----------

function pick(a) { return a[Math.floor(Math.random() * a.length)] }
function pickWeighted(items) {
  const r = Math.random(); let acc = 0
  for (const it of items) { acc += it.w; if (r <= acc) return it }
  return items[items.length - 1]
}
function pickAge() {
  const r = Math.random(); let acc = 0
  for (let i = 0; i < AGE_BANDS.length; i++) { acc += AGE_WEIGHTS[i]; if (r <= acc) return AGE_BANDS[i] }
  return '18-39'
}

// Festival day rhythm, in IST (the festival's local time), not UTC.
function hourFactorIST(d) {
  // Include minutes before adding the half-hour offset — using whole hours
  // quantised the clock before the +5:30, so every rhythm change ran up to
  // 30 minutes late.
  const h = (d.getUTCHours() + d.getUTCMinutes() / 60 + 5.5) % 24
  if (h >= 8 && h < 12) return 1
  if (h >= 16 && h < 20) return 0.9
  if (h >= 12 && h < 16) return 0.6
  if (h >= 6 && h < 8) return 0.4
  if (h >= 20 && h < 23) return 0.35
  return 0.15
}

function makeEncounter(ts, clinic, mixItem) {
  const m = mixItem ?? pickWeighted(CASE_MIX)
  return {
    id: crypto.randomUUID(),
    ts: ts.toISOString(),
    clinic_id: clinic.id,
    sector: clinic.sector,
    age_band: pickAge(),
    sex: Math.random() < 0.5 ? 'M' : 'F',
    symptoms: m.symptoms,
    diagnosis: m.diagnosis,
    syndrome: m.syndrome,
    drugs: m.drugs,
    severity: Math.random() < 0.08 ? 'severe' : Math.random() < 0.35 ? 'moderate' : 'mild',
    risk_flags: [],
    simulated: true,
  }
}

async function generateTraffic(env) {
  const now = new Date()
  const f = hourFactorIST(now)
  const rows = []
  for (const clinic of CLINICS) {
    const expected = PEAK_PER_CLINIC_HOUR * f / 60 // one minute's share
    let n = Math.floor(expected)
    if (Math.random() < expected - n) n++
    for (let i = 0; i < n; i++) {
      const ts = new Date(now.getTime() - Math.random() * 60_000)
      rows.push(makeEncounter(ts, clinic))
    }
  }
  await sbInsert(env, 'encounters', rows)
  return rows.length
}

async function injectOutbreak(env, sector, n) {
  const clinics = CLINICS.filter(c => c.sector === sector)
  if (!clinics.length) throw new Error(`no clinics in sector ${sector}`)
  const GI = CASE_MIX.find(m => m.diagnosis === 'age')
  const now = Date.now()
  const rows = []
  for (let i = 0; i < n; i++) {
    const enc = makeEncounter(new Date(now - Math.random() * 3 * 3600_000), pick(clinics), GI)
    if (Math.random() < 0.5) enc.age_band = '60+'
    if (Math.random() < 0.25) enc.severity = 'severe'
    rows.push(enc)
  }
  await sbInsert(env, 'encounters', rows)
  return rows.length
}

// ---------- detection ----------

async function fetchRecent(env, sinceIso) {
  const out = []
  let offset = 0
  for (;;) {
    // order is load-bearing: without it Postgres gives no ordering guarantee
    // across separate limit/offset pages, and the traffic cron inserts while we
    // paginate — so rows could be counted twice or skipped, making two scans a
    // second apart disagree on the same data.
    const page = await sbGet(env,
      `encounters?select=ts,sector,syndrome&ts=gte.${sinceIso}&order=ts.asc&limit=1000&offset=${offset}`)
    out.push(...page)
    if (page.length < 1000) return out
    offset += 1000
  }
}

async function scan(env) {
  const now = Date.now()
  // need 3 days back so the phase-matched baseline has its comparison windows
  const since = new Date(now - (72 + WINDOW_H) * 3600_000).toISOString()
  const rows = await fetchRecent(env, since)

  const buckets = new Map()
  for (const r of rows) {
    if (!SYNDROMES.includes(r.syndrome)) continue
    const win = Math.floor((now - new Date(r.ts).getTime()) / (WINDOW_H * 3600_000))
    const key = `${r.sector}|${r.syndrome}`
    if (!buckets.has(key)) buckets.set(key, new Map())
    const m = buckets.get(key)
    m.set(win, (m.get(win) ?? 0) + 1)
  }

  // Any UNRESOLVED alert counts as already-raised — not just an open one.
  // Matching on status=open alone meant that dispatching a crew (open ->
  // assigned) hid the alert from the next scan, which then raised a duplicate
  // for the same sector and syndrome every five minutes until it was resolved.
  const openAlerts = await sbGet(env, 'alerts?select=id,sector,syndrome,observed&status=neq.resolved')

  // Cooldown after a crew closes an alert. The cases that triggered it are
  // still inside the 6-hour window, so without this the very next scan raises
  // a fresh alert seconds after the source was fixed — which reads as the
  // system ignoring the response. Suppress until those cases age out.
  //
  // Anchored to when the crew CLOSED the job (tasks.resolved_at), not to
  // alerts.ts — that column is when the alert was RAISED. A crew taking longer
  // than the window to find and fix a source would have put the raise time
  // outside the cooldown, so the alert re-fired the moment it was resolved:
  // exactly the failure this guard exists to prevent, and it got worse the
  // slower the response.
  const cooldownFrom = new Date(now - WINDOW_H * 3600_000).toISOString()
  const closedTasks = await sbGet(env, `tasks?select=alert_id&resolved_at=gte.${cooldownFrom}`)
  const closedIds = [...new Set(closedTasks.map(t => t.alert_id).filter(Boolean))]
  const inCooldown = new Set()
  if (closedIds.length) {
    const closedAlerts = await sbGet(
      env,
      `alerts?select=sector,syndrome&id=in.(${closedIds.join(',')})`,
    )
    for (const a of closedAlerts) inCooldown.add(`${a.sector}|${a.syndrome}`)
  }
  const baselines = []
  const fired = []

  for (const sector of SECTORS) {
    for (const syndrome of SYNDROMES) {
      const m = buckets.get(`${sector}|${syndrome}`) ?? new Map()
      const observed = m.get(0) ?? 0
      // Phase-matched: same 6h slot on each of the previous 3 days.
      const hist = [4, 8, 12].map(w => m.get(w) ?? 0)
      const mean = hist.reduce((a, b) => a + b, 0) / hist.length
      const variance = hist.reduce((a, b) => a + (b - mean) ** 2, 0) / hist.length
      const stddev = Math.sqrt(variance)
      // Poisson floor: count noise is at least sqrt(mean).
      const z = (observed - mean) / Math.max(stddev, Math.sqrt(mean), 1)

      baselines.push({ sector, syndrome, mean_6h: mean, stddev_6h: stddev, updated_at: new Date().toISOString() })

      const existing = openAlerts.find(a => a.sector === sector && a.syndrome === syndrome)
      if (!existing && inCooldown.has(`${sector}|${syndrome}`)) continue
      if (z >= Z_WATCH && observed >= MIN_COUNT) {
        const tier = z >= Z_ACT ? 'act' : 'watch'
        if (existing) {
          if (observed !== existing.observed) {
            await sbPatch(env, 'alerts', `id=eq.${existing.id}`,
              { observed, expected: Number(mean.toFixed(2)), score: Number(z.toFixed(2)), tier })
          }
        } else {
          await sbInsert(env, 'alerts', [{
            sector, syndrome, observed,
            expected: Number(mean.toFixed(2)), score: Number(z.toFixed(2)),
            tier, status: 'open',
          }])
          fired.push({ sector, syndrome, observed, expected: Number(mean.toFixed(1)), z: Number(z.toFixed(1)), tier })
        }
      }
    }
  }

  await sbUpsert(env, 'baselines', baselines)
  return { examined: rows.length, newAlerts: fired }
}

// ---------- entrypoints ----------

export default {
  async scheduled(event, env, ctx) {
    // Traffic generation and detection are separate cron invocations, so a
    // throw in scan() used to leave traffic happily filling the dashboard
    // while detection was dead — the system looks alive with its core
    // function stopped. Log loudly so a silent detector is greppable.
    try {
      if (event.cron === '* * * * *') {
        if (env.GENERATE_TRAFFIC !== 'true') return
        const n = await generateTraffic(env)
        if (n) console.log(`traffic: +${n} encounters`)
        return
      }
      const r = await scan(env)
      console.log(`scan: ${r.examined} examined, ${r.newAlerts.length} new alerts`,
        r.newAlerts.length ? JSON.stringify(r.newAlerts) : '')
    } catch (e) {
      console.error(`DRISHTI_CRON_FAILED cron=${event.cron}:`, e?.stack ?? e?.message ?? e)
    }
  },

  async fetch(req, env) {
    const url = new URL(req.url)
    // The app is on drishti.* and this worker is on drishti-engine.* — a
    // different origin, so without these headers every fetch() from the
    // dashboard or the demo-control page is blocked by the browser. Pasting
    // the URL into the address bar works fine, which makes this a
    // particularly confusing failure to debug.
    const cors = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
    const json = (o, s = 200) => new Response(JSON.stringify(o, null, 2), { status: s, headers: cors })

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    try {
      if (url.pathname === '/scan') return json(await scan(env))

      if (url.pathname === '/traffic') {
        // The cron path already honours this flag; the HTTP path did not, so
        // freezing the dataset before a demo left a public endpoint still
        // inserting rows.
        if (env.GENERATE_TRAFFIC !== 'true') return json({ generated: 0, disabled: true })
        const n = await generateTraffic(env)
        return json({ generated: n, hourFactorIST: hourFactorIST(new Date()) })
      }

      if (url.pathname === '/outbreak') {
        const sector = Number(url.searchParams.get('sector') ?? 5)
        if (!Number.isInteger(sector) || sector < 1 || sector > SECTORS.length) {
          return json({ error: `sector must be 1..${SECTORS.length}` }, 400)
        }
        // Clamp both ends: the old cap only bounded the top, so n=-5 or n=abc
        // slipped through as a free way to trigger full scans.
        const raw = Math.floor(Number(url.searchParams.get('n') ?? 25))
        const n = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 100) : 25
        const inserted = await injectOutbreak(env, sector, n)
        const result = await scan(env)
        return json({ injected: inserted, sector, scan: result })
      }

      return json({
        service: 'drishti-engine',
        crons: { detection: '*/5 * * * *', traffic: '* * * * *' },
        trafficEnabled: env.GENERATE_TRAFFIC === 'true',
      })
    } catch (e) {
      // Don't echo raw PostgREST errors to anonymous callers — they carry
      // table names, column names and query strings. Log the detail, return
      // a generic message.
      console.error('request failed:', url.pathname, e?.message ?? e)
      return json({ error: 'request failed' }, 500)
    }
  },
}
