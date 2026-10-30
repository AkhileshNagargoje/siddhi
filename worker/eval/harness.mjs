/* Siddhi — detection evaluation harness.
 *
 *   cd worker && node eval/harness.mjs
 *   cd worker && node eval/harness.mjs --trials 2000 --seed 7
 *
 * Answers, with numbers instead of assertions:
 *   - How often does the detector catch an outbreak, and how fast?
 *   - How many cases have already happened by the time it does?
 *   - How often does it cry wolf on a festival where nothing is wrong?
 *   - What would a different threshold buy, and what would it cost?
 *
 * It imports scoreCell from ../src/index.js, so this measures the algorithm
 * that is actually deployed, not a reimplementation of it. Everything runs
 * offline against synthetic festivals and never touches the database.
 *
 * Deterministic: the same --seed produces the same numbers on any machine.
 */

import { scoreCell } from '../src/index.js'

// --------------------------------------------------------------- parameters

const WINDOW_H = 6                      // detection window, matches the engine
const BASELINE_OFFSETS = [24, 48, 72]   // phase-matched: same slot, prior 3 days
const WARMUP_H = 72                     // history needed before the first evaluable hour
const EVAL_H = 96                       // hours of festival evaluated per trial
const PEAK_PER_CLINIC_HOUR = 6

// Clinics per sector — mirrors app/src/config/festival.js
const CLINICS_IN = { 1: 2, 2: 1, 3: 2, 4: 1, 5: 2, 6: 1, 7: 1, 8: 2, 9: 1, 10: 1, 11: 2, 12: 1 }
const SECTORS = Object.keys(CLINICS_IN).map(Number)

// Share of traffic by syndrome — mirrors the simulator's case mix.
// 'screening' is excluded: the detector deliberately ignores it.
const SYNDROME_W = { respiratory: 0.28, gi: 0.15, injury: 0.15, heat: 0.10, fever: 0.10, other: 0.13 }
const SYNDROMES = Object.keys(SYNDROME_W)

function hourFactor(h) {
  const t = ((h % 24) + 24) % 24
  if (t >= 8 && t < 12) return 1
  if (t >= 16 && t < 20) return 0.9
  if (t >= 12 && t < 16) return 0.6
  if (t >= 6 && t < 8) return 0.4
  if (t >= 20 && t < 23) return 0.35
  return 0.15
}

// ------------------------------------------------------------------- random

function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Knuth's method — fine for the small lambdas here.
function poisson(rand, lambda) {
  if (lambda <= 0) return 0
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do { k++; p *= rand() } while (p > L)
  return k - 1
}

// ----------------------------------------------------------------- festival

/* counts[sector][syndrome] = hourly case counts for the whole festival. */
function makeFestival(rand) {
  const counts = {}
  for (const s of SECTORS) {
    counts[s] = {}
    for (const syn of SYNDROMES) {
      const arr = new Int32Array(WARMUP_H + EVAL_H)
      const base = CLINICS_IN[s] * PEAK_PER_CLINIC_HOUR * SYNDROME_W[syn]
      for (let h = 0; h < arr.length; h++) arr[h] = poisson(rand, base * hourFactor(h))
      counts[s][syn] = arr
    }
  }
  return counts
}

/* Waterborne outbreak from a point source: exponential growth, capped. */
function injectOutbreak(counts, rand, { sector, syndrome, onset, a0, doubling, capPerHour = 40 }) {
  const arr = counts[sector][syndrome]
  const added = []
  for (let h = onset; h < arr.length; h++) {
    const rate = Math.min(a0 * Math.pow(2, (h - onset) / doubling), capPerHour)
    const n = poisson(rand, rate)
    arr[h] += n
    added.push({ h, n })
  }
  return added
}

function windowCount(arr, endH) {
  let n = 0
  for (let h = Math.max(0, endH - WINDOW_H + 1); h <= endH; h++) n += arr[h]
  return n
}

/* Run the real detector across one festival, hour by hour. Mirrors the
   engine's dedup: a cell that has fired stays quiet until its window turns
   over, so one outbreak is not counted as six separate alarms. */
function runDetector(counts, { zWatch = 3, minCount = 8 } = {}) {
  const shipped = zWatch === 3 && minCount === 8
  const alerts = []
  const quietUntil = new Map()
  for (let h = WARMUP_H; h < WARMUP_H + EVAL_H; h++) {
    for (const s of SECTORS) {
      for (const syn of SYNDROMES) {
        const key = `${s}|${syn}`
        if ((quietUntil.get(key) ?? -1) >= h) continue
        const arr = counts[s][syn]
        const observed = windowCount(arr, h)
        const hist = BASELINE_OFFSETS.map(o => windowCount(arr, h - o))
        const r = scoreCell(observed, hist)
        // At shipped settings, trust scoreCell's own verdict verbatim — that is
        // the point of importing it. Only re-derive when sweeping thresholds.
        const fires = shipped ? r.tier !== null : (r.z >= zWatch && observed >= minCount)
        if (fires) {
          const tier = r.z >= 4 ? 'act' : 'watch'
          alerts.push({ h, sector: s, syndrome: syn, observed, z: r.z, tier })
          quietUntil.set(key, h + WINDOW_H)
        }
      }
    }
  }
  return alerts
}

// -------------------------------------------------------------------- trials

function trialWithOutbreak(rand, severity, opts) {
  const counts = makeFestival(rand)
  const sector = SECTORS[Math.floor(rand() * SECTORS.length)]
  const syndrome = 'gi' // waterborne — the scenario the product is built around
  const onset = WARMUP_H + Math.floor(rand() * (EVAL_H - 30))
  const added = injectOutbreak(counts, rand, { sector, syndrome, onset, ...severity })

  const alerts = runDetector(counts, opts)
  const hit = alerts.find(a => a.sector === sector && a.syndrome === syndrome && a.h >= onset)
  const falseAlarms = alerts.filter(a => !(a.sector === sector && a.syndrome === syndrome))

  const casesBy = h => added.filter(x => x.h <= h).reduce((t, x) => t + x.n, 0)

  /* The counterfactual: when would this cluster be unmissable with no system?
     Modelled as the 6h count reaching 3x its own baseline AND 25+ cases — a
     size nobody reviewing a chart would overlook. */
  let obviousAt = null
  const arr = counts[sector][syndrome]
  for (let h = onset; h < WARMUP_H + EVAL_H; h++) {
    const obs = windowCount(arr, h)
    const base = BASELINE_OFFSETS.map(o => windowCount(arr, h - o)).reduce((a, b) => a + b, 0) / 3
    if (obs >= 25 && obs >= 3 * Math.max(base, 1)) { obviousAt = h; break }
  }

  return {
    detected: !!hit,
    latency: hit ? hit.h - onset : null,
    casesAtDetection: hit ? casesBy(hit.h) : null,
    casesAtObvious: obviousAt !== null ? casesBy(obviousAt) : null,
    falseAlarms: falseAlarms.length,
  }
}

const trialQuiet = (rand, opts) => runDetector(makeFestival(rand), opts)

// --------------------------------------------------------------------- stats

const sorted = a => [...a].sort((x, y) => x - y)
const median = a => {
  if (!a.length) return null
  const s = sorted(a)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const pct = (a, p) => (a.length ? sorted(a)[Math.min(a.length - 1, Math.floor((p / 100) * a.length))] : null)
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
const f1 = n => (n === null ? '--' : n.toFixed(1))
const rule = n => '-'.repeat(n)

// ---------------------------------------------------------------------- main

const argv = process.argv.slice(2)
const argOf = (name, def) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : def
}
const TRIALS = argOf('--trials', 500)
const SEED = argOf('--seed', 42)

const SEVERITIES = [
  // Deliberately includes an outbreak too small to clear the floors — a
  // harness that only reports successes is marketing, not evaluation.
  { label: 'tiny (~1 case/hour)', a0: 0.3, doubling: 10, capPerHour: 1 },
  { label: 'small, self-limiting', a0: 0.5, doubling: 8, capPerHour: 3 },
  { label: 'slow (doubles every 6h)', a0: 0.4, doubling: 6 },
  { label: 'typical (doubles every 4h)', a0: 0.5, doubling: 4 },
  { label: 'fast (doubles every 2.5h)', a0: 0.6, doubling: 2.5 },
]

console.log('')
console.log('Siddhi - detection evaluation')
console.log(`${TRIALS} synthetic festivals per row | seed ${SEED} | ${EVAL_H}h evaluated each`)
console.log('Algorithm under test: scoreCell() imported from the deployed worker.')
console.log('')

console.log('DETECTION PERFORMANCE  (outbreak injected at a random sector and hour)')
console.log(rule(76))
console.log('outbreak speed             caught  median  p90    cases when  cases if')
console.log('                                   lag     lag    we alert    unaided')
console.log(rule(76))

const summary = {}
for (const sev of SEVERITIES) {
  const rand = mulberry32(SEED)
  const rows = []
  for (let i = 0; i < TRIALS; i++) rows.push(trialWithOutbreak(rand, sev, {}))
  const got = rows.filter(r => r.detected)
  const lat = got.map(r => r.latency)
  const cases = got.map(r => r.casesAtDetection)
  const obv = rows.map(r => r.casesAtObvious).filter(x => x !== null)
  summary[sev.label] = {
    rate: got.length / rows.length,
    medLat: median(lat),
    medCases: median(cases),
    medObv: median(obv),
  }
  console.log(
    sev.label.padEnd(27) +
    `${(100 * got.length / rows.length).toFixed(0)}%`.padEnd(8) +
    `${f1(median(lat))}h`.padEnd(8) +
    `${f1(pct(lat, 90))}h`.padEnd(7) +
    `${f1(median(cases))}`.padEnd(12) +
    `${f1(median(obv))}`,
  )
}
console.log(rule(76))
console.log('"cases if unaided" = size the cluster reaches before it is obvious by eye')
console.log('(6h count at 3x its own baseline, and 25+ cases) - the counterfactual.')
console.log('')

// False alarms on quiet festivals
{
  const rand = mulberry32(SEED + 1)
  const days = EVAL_H / 24
  const actPerDay = []
  const watchPerDay = []
  for (let i = 0; i < TRIALS; i++) {
    const a = trialQuiet(rand, {})
    actPerDay.push(a.filter(x => x.tier === 'act').length / days)
    watchPerDay.push(a.filter(x => x.tier === 'watch').length / days)
  }
  console.log('FALSE ALARMS  (nothing wrong anywhere - 12 sectors x 6 syndromes watched)')
  console.log(rule(76))
  console.log('  These cost different things. A watch appears on the dashboard and')
  console.log('  nobody is sent anywhere. An act dispatches a crew - the expensive one.')
  console.log('')
  console.log(`  act   (crew dispatched)   mean ${f1(mean(actPerDay))} / day   p90 ${f1(pct(actPerDay, 90))}`)
  console.log(`  watch (dashboard only)    mean ${f1(mean(watchPerDay))} / day   p90 ${f1(pct(watchPerDay, 90))}`)
  console.log(`  festivals with zero act-tier false alarms: ${(100 * actPerDay.filter(n => n === 0).length / actPerDay.length).toFixed(0)}%`)
  console.log('')
}

// Threshold sweep
{
  const N = Math.min(TRIALS, 200)
  /* Look the scenario up by name rather than by index. This block is headed
     "typical outbreak" but passed SEVERITIES[1], which is the small
     self-limiting one — so the sweep reported 10.0h for the shipped threshold
     while the table above it reported 7.0h for the same detector on the same
     outbreak. The contradiction was visible in the published output. */
  const TYPICAL = SEVERITIES.find(s => s.label.startsWith('typical'))
  if (!TYPICAL) throw new Error('typical scenario missing from SEVERITIES')
  console.log(`THRESHOLD SWEEP  (typical outbreak - what a different z buys and costs)`)
  console.log(`  ${N} trials per row, not ${TRIALS} - this block is capped for runtime`)
  console.log(rule(76))
  console.log('  z threshold   caught   median lag   false alarms/day (all tiers)')
  console.log(rule(76))
  for (const z of [2, 2.5, 3, 3.5, 4, 5]) {
    const r1 = mulberry32(SEED)
    const rows = []
    for (let i = 0; i < N; i++) rows.push(trialWithOutbreak(r1, TYPICAL, { zWatch: z, minCount: 8 }))
    const r2 = mulberry32(SEED + 1)
    const fa = []
    for (let i = 0; i < N; i++) fa.push(trialQuiet(r2, { zWatch: z, minCount: 8 }).length / (EVAL_H / 24))
    const got = rows.filter(r => r.detected)
    console.log(
      `  z >= ${z}`.padEnd(16) +
      `${(100 * got.length / rows.length).toFixed(0)}%`.padEnd(9) +
      `${f1(median(got.map(r => r.latency)))}h`.padEnd(13) +
      f1(mean(fa)) + (z === 3 ? '   <- shipped' : ''),
    )
  }
  console.log(rule(76))
}

// The headline, for the README and the pitch
{
  const s = summary['typical (doubles every 4h)']
  console.log('')
  console.log('HEADLINE')
  console.log(`  A typical waterborne outbreak is caught ${(100 * s.rate).toFixed(0)}% of the time,`)
  console.log(`  a median of ${f1(s.medLat)}h after the first case, at ${f1(s.medCases)} cases -`)
  console.log(`  against ${f1(s.medObv)} cases before it would be obvious unaided.`)
  console.log('')
}
