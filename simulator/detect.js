// Drishti detection engine (PROJECT.md exact spec).
// For each (sector, syndrome): compare current 6h window against the mean/stddev
// of the twelve 6h windows in the trailing 72h. Fire alert if z >= 3 AND count >= 8.
//
// Usage:
//   node detect.js once    # single scan (demo trigger)
//   node detect.js watch   # scan every 60s

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ommnjuedmzffiawhkdqi.supabase.co'
const SUPABASE_KEY = 'sb_publishable_P2D7fSeuoaqc1tgURDXeoA_dDfff-Dk'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const WINDOW_H = 6
const BASELINE_H = 72
const Z_WATCH = 3
const Z_ACT = 4
const MIN_COUNT = 8
const SYNDROMES = ['gi', 'respiratory', 'heat', 'fever', 'injury', 'other']
const SECTORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

async function fetchEncounters(sinceIso) {
  const out = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('encounters')
      .select('ts, sector, syndrome')
      .gte('ts', sinceIso)
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...data)
    if (data.length < 1000) return out
    from += 1000
  }
}

async function scan() {
  const now = Date.now()
  const since = new Date(now - (BASELINE_H + WINDOW_H) * 3600_000).toISOString()
  const rows = await fetchEncounters(since)

  // bucket counts per (sector|syndrome) per 6h window index (0 = current)
  const buckets = new Map()
  for (const r of rows) {
    if (!SYNDROMES.includes(r.syndrome)) continue
    const ageMs = now - new Date(r.ts).getTime()
    const win = Math.floor(ageMs / (WINDOW_H * 3600_000))
    const key = `${r.sector}|${r.syndrome}`
    if (!buckets.has(key)) buckets.set(key, new Map())
    const m = buckets.get(key)
    m.set(win, (m.get(win) ?? 0) + 1)
  }

  const { data: openAlerts, error: aerr } = await supabase
    .from('alerts').select('id, sector, syndrome, observed').eq('status', 'open')
  if (aerr) throw new Error(aerr.message)

  const nWindows = BASELINE_H / WINDOW_H // 12
  const results = []

  for (const sector of SECTORS) {
    for (const syndrome of SYNDROMES) {
      const m = buckets.get(`${sector}|${syndrome}`) ?? new Map()
      const observed = m.get(0) ?? 0
      // Phase-matched baseline: same 6h time-of-day slot on the previous 3 days
      // (windows 4, 8, 12 back), so daytime is compared with daytime, not with
      // the quiet night windows — otherwise every afternoon looks anomalous.
      const hist = [4, 8, 12].map(w => m.get(w) ?? 0)
      const mean = hist.reduce((a, b) => a + b, 0) / hist.length
      const variance = hist.reduce((a, b) => a + (b - mean) ** 2, 0) / hist.length
      const stddev = Math.sqrt(variance)
      // Poisson floor: count data has inherent noise of sqrt(mean), so never
      // let the divisor drop below that — kills small-sample false alarms.
      const z = (observed - mean) / Math.max(stddev, Math.sqrt(mean), 1)

      // keep baseline table fresh for the dashboard
      results.push({ sector, syndrome, mean_6h: mean, stddev_6h: stddev, updated_at: new Date().toISOString() })

      const existing = openAlerts.find(a => a.sector === sector && a.syndrome === syndrome)
      if (z >= Z_WATCH && observed >= MIN_COUNT) {
        const tier = z >= Z_ACT ? 'act' : 'watch'
        if (existing) {
          if (observed !== existing.observed) {
            await supabase.from('alerts')
              .update({ observed, expected: mean, score: z, tier })
              .eq('id', existing.id)
            console.log(`updated alert s${sector}/${syndrome}: obs=${observed} z=${z.toFixed(1)}`)
          }
        } else {
          const { error } = await supabase.from('alerts').insert({
            sector, syndrome, observed, expected: Number(mean.toFixed(2)),
            score: Number(z.toFixed(2)), tier, status: 'open',
          })
          if (error) console.error('alert insert:', error.message)
          else console.log(`NEW ALERT sector ${sector} ${syndrome}: observed=${observed} expected=${mean.toFixed(1)} z=${z.toFixed(1)} [${tier}]`)
        }
      }
    }
  }

  const { error: berr } = await supabase.from('baselines').upsert(results)
  if (berr) console.error('baseline upsert:', berr.message)

  console.log(`${new Date().toLocaleTimeString()} scan done: ${rows.length} encounters examined, ${openAlerts.length} open alerts before scan`)
}

const cmd = process.argv[2] ?? 'once'
if (cmd === 'once') await scan()
else if (cmd === 'watch') {
  console.log('Watch mode: scanning every 60s. Ctrl+C to stop.')
  for (;;) { try { await scan() } catch (e) { console.error(e.message) } await new Promise(r => setTimeout(r, 60_000)) }
} else console.log('Usage: node detect.js once | watch')
