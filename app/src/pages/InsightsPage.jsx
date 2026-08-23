import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isConfigured } from '../lib/supabase'
import { FESTIVAL } from '../config/festival'
import { SYNDROME_LABELS, DIAGNOSES, DRUGS, AGE_BANDS } from '../config/medical'

/* In-depth analysis.
 *
 * Deliberately a SEPARATE screen from the control room. The dashboard answers
 * "is something wrong right now"; this answers "what is this festival actually
 * made of". Mixing the two would cost the dashboard the property that makes it
 * usable at a glance during an incident.
 *
 * FORMS ARE CHOSEN BY THE JOB, NOT BY VARIETY
 *
 *   ranking            -> horizontal bars, ONE hue, darker = larger. The reader
 *                         is comparing magnitude; distinct colours per row would
 *                         imply the rows are different KINDS of thing.
 *   part-to-whole      -> one horizontal stacked bar, categorical hues. This is
 *                         the job a pie chart is usually reached for, and a
 *                         stacked bar does it better: shared baseline, exact
 *                         labels, no angle estimation.
 *   ratio vs a limit   -> meter, not a two-slice pie.
 *   change over time   -> small multiples, one per syndrome, rather than six
 *                         lines fighting on a single axis.
 *
 * Colour follows the ENTITY: a syndrome keeps its hue everywhere on this page,
 * so nothing repaints when a filter changes the row order.
 */

const PAGE = 1000
const ANTIBIOTICS = new Set(DRUGS.filter(d => d.antibiotic).map(d => d.id))
const DIAG_LABEL = Object.fromEntries(DIAGNOSES.map(d => [d.id, d.en]))

/* Fixed slot per syndrome. Never cycled, never assigned by rank. */
const SYNDROME_HUE = {
  gi: 'var(--series-1)',
  respiratory: 'var(--series-2)',
  heat: 'var(--series-3)',
  fever: 'var(--series-4)',
  injury: 'var(--series-5)',
  other: 'var(--series-6)',
}

const RANGES = [
  { id: 6, label: '6 hours' },
  { id: 24, label: '24 hours' },
  { id: 72, label: '3 days' },
]

async function fetchRange(hours) {
  const since = new Date(Date.now() - hours * 3600_000).toISOString()
  const out = []
  for (let from = 0; from < 30000; from += PAGE) {
    const { data, error } = await supabase
      .from('encounters')
      .select('ts, sector, syndrome, diagnosis, severity, age_band, sex, drugs')
      .gte('ts', since)
      .order('ts', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error || !data?.length) break
    out.push(...data)
    if (data.length < PAGE) break
  }
  return out
}

const pct = (n, total) => (total ? (n / total) * 100 : 0)
const fmt = n => new Intl.NumberFormat().format(n)

/* ---- marks ------------------------------------------------------------- */

/* Ranked bars. One hue, magnitude by length; the value is always printed, so
   the reader never estimates it off the axis. */
function RankedBars({ rows, total, hue = 'var(--series-1)', unit = 'cases' }) {
  const max = Math.max(...rows.map(r => r.n), 1)
  return (
    <div className="rank">
      {rows.map((r, i) => (
        <div className="rank-row" key={r.key}>
          <span className="rank-pos">{i + 1}</span>
          <span className="rank-label" title={r.label}>{r.label}</span>
          <span className="rank-track">
            <i style={{
              width: `${Math.max((r.n / max) * 100, 1.5)}%`,
              background: hue,
              /* Darker = larger, within one hue. Opacity carries the ramp so a
                 filter cannot change which hue a row wears. */
              opacity: 0.45 + 0.55 * (r.n / max),
            }} />
          </span>
          <span className="rank-n">{fmt(r.n)}</span>
          <span className="rank-share">{pct(r.n, total).toFixed(0)}%</span>
          <span className="sr-only">{r.label}: {r.n} {unit}, {pct(r.n, total).toFixed(0)} percent</span>
        </div>
      ))}
    </div>
  )
}

/* Part-to-whole. A stacked bar rather than a pie: one shared baseline, exact
   figures on the segments that can hold them, and a legend that is always
   present so identity never rests on colour alone. */
function ShareBar({ rows, total }) {
  return (
    <div className="share">
      <div className="share-bar" role="img"
           aria-label={rows.map(r => `${r.label} ${pct(r.n, total).toFixed(0)}%`).join(', ')}>
        {rows.map(r => {
          const p = pct(r.n, total)
          return (
            <span key={r.key} className="share-seg" style={{ width: `${p}%`, background: r.hue }}
                  title={`${r.label} — ${fmt(r.n)} (${p.toFixed(1)}%)`}>
              {p >= 9 && <b>{p.toFixed(0)}%</b>}
            </span>
          )
        })}
      </div>
      <div className="share-key">
        {rows.map(r => (
          <span key={r.key} className="share-item">
            <i style={{ background: r.hue }} />
            {r.label}
            <b>{pct(r.n, total).toFixed(1)}%</b>
          </span>
        ))}
      </div>
    </div>
  )
}

/* A single ratio against a reference. Explicitly not a two-slice pie. */
function Meter({ value, reference, label, hint }) {
  const v = Math.min(value, 100)
  return (
    <div className="meter">
      <div className="meter-head">
        <span>{label}</span>
        <b>{value.toFixed(0)}%</b>
      </div>
      <div className="meter-track">
        <i style={{ width: `${v}%` }} />
        {reference != null && (
          <u className="meter-ref" style={{ left: `${Math.min(reference, 100)}%` }}
             title={`festival median ${reference.toFixed(0)}%`} />
        )}
      </div>
      <span className="meter-hint">{hint}</span>
    </div>
  )
}

/* Small multiples beat six lines on one axis. Each panel is its own hue and
   its own scale is stated, so nobody reads across panels by height. */
function Trend({ label, hue, values }) {
  const max = Math.max(...values, 1)
  const w = 132, h = 34
  const x = i => (i / Math.max(values.length - 1, 1)) * (w - 2) + 1
  const y = v => h - 2 - (v / max) * (h - 6)
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  return (
    <div className="tr">
      <span className="tr-label"><i style={{ background: hue }} />{label}</span>
      <svg width={w} height={h} role="img" aria-label={`${label}: peak ${max} in one hour`}>
        <path d={`${line} L${x(values.length - 1)} ${h} L${x(0)} ${h} Z`} fill={hue} opacity="0.13" />
        <path d={line} fill="none" stroke={hue} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className="tr-peak">peak {max}/h</span>
    </div>
  )
}

/* ---- page -------------------------------------------------------------- */

export default function InsightsPage() {
  const [hours, setHours] = useState(24)
  const [rows, setRows] = useState(null)
  const [showTable, setShowTable] = useState(false)

  useEffect(() => {
    if (!isConfigured()) return
    let alive = true
    setRows(null)
    fetchRange(hours).then(r => { if (alive) setRows(r) })
    return () => { alive = false }
  }, [hours])

  const a = useMemo(() => {
    if (!rows) return null
    const clinical = rows.filter(r => r.syndrome !== 'screening')
    const total = clinical.length

    const count = (list, key) => {
      const m = new Map()
      for (const r of list) m.set(r[key], (m.get(r[key]) ?? 0) + 1)
      return m
    }

    const bySyn = count(clinical, 'syndrome')
    const byDiag = count(clinical, 'diagnosis')
    const bySec = count(clinical, 'sector')
    const bySev = count(clinical, 'severity')
    const byAge = count(clinical, 'age_band')

    // Hourly buckets per syndrome, oldest -> newest.
    const buckets = new Map()
    const now = Date.now()
    for (const r of clinical) {
      const hAgo = Math.floor((now - new Date(r.ts).getTime()) / 3600_000)
      const idx = hours - 1 - hAgo
      if (idx < 0 || idx >= hours) continue
      if (!buckets.has(r.syndrome)) buckets.set(r.syndrome, new Array(hours).fill(0))
      buckets.get(r.syndrome)[idx]++
    }

    const abx = clinical.filter(r => r.drugs?.some(d => ANTIBIOTICS.has(d))).length
    const giAbx = clinical.filter(r => r.syndrome === 'gi')
    const giAbxN = giAbx.filter(r => r.drugs?.some(d => ANTIBIOTICS.has(d))).length

    const synRows = [...bySyn.entries()]
      .sort((x, y) => y[1] - x[1])
      .map(([k, n]) => ({ key: k, label: SYNDROME_LABELS[k] ?? k, n, hue: SYNDROME_HUE[k] ?? 'var(--series-6)' }))

    return {
      total,
      screening: rows.length - total,
      sectorsReporting: new Set(clinical.map(r => r.sector)).size,
      synRows,
      diagRows: [...byDiag.entries()].sort((x, y) => y[1] - x[1])
        .map(([k, n]) => ({ key: k, label: DIAG_LABEL[k] ?? k, n })),
      sectorRows: [...bySec.entries()].sort((x, y) => y[1] - x[1])
        .map(([k, n]) => ({ key: k, label: FESTIVAL.sectors.find(s => s.id === k)?.name ?? `Sector ${k}`, n })),
      sevRows: ['mild', 'moderate', 'severe'].map(k => ({ key: k, label: k, n: bySev.get(k) ?? 0 })),
      ageRows: AGE_BANDS.map(k => ({ key: k, label: k, n: byAge.get(k) ?? 0 })),
      buckets,
      abxRate: pct(abx, total),
      giAbxRate: pct(giAbxN, giAbx.length),
      severeRate: pct(bySev.get('severe') ?? 0, total),
    }
  }, [rows, hours])

  return (
    <div className="shell insights">
      <div className="topbar">
        <div className="brand">
          <b>In-depth analysis</b>
          <span>{FESTIVAL.name}</span>
        </div>
        <Link className="live" to="/dashboard" style={{ textDecoration: 'none' }}>control room →</Link>
      </div>

      {/* Filters in one row above the charts, never per-chart. */}
      <div className="ins-filters">
        <div className="seg" role="group" aria-label="Time range">
          {RANGES.map(r => (
            <button key={r.id} className={hours === r.id ? 'on' : ''}
                    aria-pressed={hours === r.id}
                    onClick={() => setHours(r.id)}>{r.label}</button>
          ))}
        </div>
        <button className="btn btn-ghost" onClick={() => setShowTable(v => !v)}>
          {showTable ? 'Hide table' : 'View as table'}
        </button>
      </div>

      {!a ? (
        <div className="empty">Reading the last {hours} hours…</div>
      ) : a.total === 0 ? (
        <div className="empty">No patient records in the last {hours} hours.</div>
      ) : (
        <>
          <div className="kpi">
            <div className="tile">
              <span className="tile-label">Patients</span>
              <strong className="tile-value">{fmt(a.total)}</strong>
              <span className="tile-hint">last {hours}h · excludes screening</span>
            </div>
            <div className="tile">
              <span className="tile-label">Sectors reporting</span>
              <strong className="tile-value">{a.sectorsReporting}<small> / 12</small></strong>
              <span className="tile-hint">silence is not calm</span>
            </div>
            <div className="tile">
              <span className="tile-label">Severe</span>
              <strong className="tile-value">{a.severeRate.toFixed(0)}%</strong>
              <span className="tile-hint">of clinical cases</span>
            </div>
            <div className="tile">
              <span className="tile-label">Screening visits</span>
              <strong className="tile-value">{fmt(a.screening)}</strong>
              <span className="tile-hint">BP / sugar, not outbreak-relevant</span>
            </div>
          </div>

          <div className="ins-grid">
            <section className="panel">
              <div className="chart-head">
                <h3>Which illness is biggest</h3>
                <span className="chart-sub">ranked by case count</span>
              </div>
              <RankedBars rows={a.diagRows} total={a.total} />
            </section>

            <section className="panel">
              <div className="chart-head">
                <h3>What the festival is made of</h3>
                <span className="chart-sub">share of all clinical cases</span>
              </div>
              <ShareBar rows={a.synRows} total={a.total} />
              <p className="ins-note">
                A stacked bar rather than a pie: every segment shares one baseline,
                so the reader compares lengths instead of estimating angles — and
                each share is printed rather than inferred.
              </p>
            </section>

            <section className="panel">
              <div className="chart-head">
                <h3>Busiest sectors</h3>
                <span className="chart-sub">ranked by case count</span>
              </div>
              <RankedBars rows={a.sectorRows} total={a.total} />
            </section>

            <section className="panel">
              <div className="chart-head">
                <h3>How each illness is moving</h3>
                <span className="chart-sub">cases per hour · each panel has its own scale</span>
              </div>
              <div className="tr-wrap">
                {a.synRows.map(r => (
                  <Trend key={r.key} label={r.label} hue={r.hue}
                         values={a.buckets.get(r.key) ?? new Array(hours).fill(0)} />
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="chart-head">
                <h3>Antibiotic use</h3>
                <span className="chart-sub">a ratio against a reference, not a slice</span>
              </div>
              <Meter label="All clinical cases" value={a.abxRate} reference={null}
                     hint="share of patients given an antibiotic" />
              <Meter label="Diarrhoeal cases" value={a.giAbxRate} reference={a.abxRate}
                     hint="marker shows the all-cases rate — most acute diarrhoea is viral and needs ORS, not antibiotics" />
              <p className="ins-note">
                The 2015 project recorded antibiotics in up to 31% of encounters and
                never acted on it. This is the same number, visible while it can
                still change.
                <br /><br />
                <b>Read this one with care.</b> These rates come from synthetic
                traffic, so they describe the generator's prescribing model rather
                than any real clinician — and injected outbreak cases carry ORS and
                zinc by construction, which drags the diarrhoeal figure toward zero.
                The panel is here to show the measurement exists and is watchable
                live; the 31% is the sourced real-world figure, not this one.
              </p>
            </section>

            <section className="panel">
              <div className="chart-head">
                <h3>Severity and age</h3>
                <span className="chart-sub">ordered scales, one hue each</span>
              </div>
              <h4 className="ins-sub">Severity</h4>
              <RankedBars rows={a.sevRows} total={a.total} hue="var(--series-2)" />
              <h4 className="ins-sub">Age band</h4>
              <RankedBars rows={a.ageRows} total={a.total} hue="var(--series-3)" />
            </section>
          </div>

          {/* Required, not optional: three light-mode hues sit under 3:1 against
              the surface, and the fix for that is labels plus a table view. */}
          {showTable && (
            <section className="panel ins-table">
              <div className="chart-head">
                <h3>Every figure on this page</h3>
                <span className="chart-sub">last {hours} hours</span>
              </div>
              <div className="table-scroll">
                <table>
                  <caption className="sr-only">Case counts and shares by category</caption>
                  <thead>
                    <tr><th scope="col">Group</th><th scope="col">Category</th>
                      <th scope="col">Cases</th><th scope="col">Share</th></tr>
                  </thead>
                  <tbody>
                    {[['Diagnosis', a.diagRows], ['Syndrome', a.synRows],
                      ['Sector', a.sectorRows], ['Severity', a.sevRows],
                      ['Age band', a.ageRows]].map(([group, list]) =>
                      list.map((r, i) => (
                        <tr key={group + r.key}>
                          <td>{i === 0 ? group : ''}</td>
                          <td>{r.label}</td>
                          <td className="num">{fmt(r.n)}</td>
                          <td className="num">{pct(r.n, a.total).toFixed(1)}%</td>
                        </tr>
                      )))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
