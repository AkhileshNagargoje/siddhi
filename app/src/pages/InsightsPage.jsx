import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react'
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

/* Each group knows how to reduce the raw encounter list back to the rows behind
   one figure, so expanding a row is a filter rather than another query. */
const GROUPS = [
  { name: 'Diagnosis', rows: 'diagRows', match: (r, k) => r.diagnosis === k },
  { name: 'Syndrome',  rows: 'synRows',  match: (r, k) => r.syndrome === k },
  { name: 'Sector',    rows: 'sectorRows', match: (r, k) => r.sector === k },
  { name: 'Severity',  rows: 'sevRows',  match: (r, k) => r.severity === k },
  { name: 'Age band',  rows: 'ageRows',  match: (r, k) => r.age_band === k },
]

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


/* Hover layer.
 *
 * Per the mark-level rule: on bars, segments and slices the MARK is the hit
 * target — no crosshair — and the hovered mark has to visibly respond. Focus
 * gets the identical readout, so a keyboard reaches everything a pointer does.
 *
 * Value leads, label follows: the legend's hierarchy inverted, because by the
 * time someone is pointing at a mark they have the category and want the
 * number. The series key is a short stroke rather than a filled box — at this
 * density a box is data-weight ink doing a label's job.
 *
 * Nothing here gates: every figure a tooltip shows is also in the table view.
 */
function Tip({ tip }) {
  if (!tip) return null
  const flip = tip.x > window.innerWidth - 190
  return (
    <div className="mtip" aria-hidden="true"
         style={{ left: tip.x + (flip ? -12 : 12), top: tip.y - 12,
                  transform: flip ? 'translate(-100%, -100%)' : 'translateY(-100%)' }}>
      <span className="mtip-key" style={{ background: tip.hue }} />
      <b>{tip.value}</b>
      <span className="mtip-label">{tip.label}</span>
      {tip.sub && <span className="mtip-sub">{tip.sub}</span>}
    </div>
  )
}

/* One set of handlers for every mark, so hover and focus cannot drift apart. */
function markProps({ label, value, sub, hue, onShow, onHide, onPick, isPicked }) {
  const show = (x, y) => onShow({ x, y, label, value, sub, hue })
  return {
    tabIndex: 0,
    role: 'button',
    'aria-pressed': isPicked,
    'aria-label': `${label}: ${value}${sub ? `, ${sub}` : ''}. Activate for a breakdown.`,
    onPointerMove: e => show(e.clientX, e.clientY),
    onPointerLeave: onHide,
    onFocus: e => {
      const r = e.currentTarget.getBoundingClientRect()
      show(r.left + r.width / 2, r.top)
    },
    onBlur: onHide,
    onClick: e => onPick(e.currentTarget),
    onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(e.currentTarget) } },
  }
}

/* ---- marks ------------------------------------------------------------- */

/* Ranked bars. One hue, magnitude by length; the value is always printed, so
   the reader never estimates it off the axis. */
function RankedBars({ rows, total, hue = 'var(--series-1)', unit = 'cases', mark }) {
  const max = Math.max(...rows.map(r => r.n), 1)
  return (
    <div className="rank">
      {rows.map((r, i) => (
        <div className={mark?.isPicked(r.key) ? 'rank-row is-picked' : 'rank-row'} key={r.key}
             {...(mark ? markProps({
               label: r.label,
               value: `${fmt(r.n)} ${unit}`,
               sub: `${pct(r.n, total).toFixed(1)}% of all cases`,
               hue,
               onShow: mark.onShow, onHide: mark.onHide,
               onPick: el => mark.onPick(r, el),
               isPicked: mark.isPicked(r.key),
             }) : {})}>
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
function ShareBar({ rows, total, mark }) {
  return (
    <div className="share">
      {/* No role="img" here: it is a leaf role, and it would prune the
          focusable segments inside out of the accessibility tree. Each segment
          carries its own name and value instead. */}
      <div className="share-bar" role={mark ? 'group' : 'img'}
           aria-label={mark ? 'Case mix by syndrome'
             : rows.map(r => `${r.label} ${pct(r.n, total).toFixed(0)}%`).join(', ')}>
        {rows.map(r => {
          const p = pct(r.n, total)
          return (
            <span key={r.key}
                  className={mark?.isPicked(r.key) ? 'share-seg is-picked' : 'share-seg'}
                  style={{ width: `${p}%`, background: r.hue }}
                  {...(mark ? markProps({
                    label: r.label, value: fmt(r.n), sub: `${p.toFixed(1)}% of all cases`,
                    hue: r.hue, onShow: mark.onShow, onHide: mark.onHide,
                    onPick: el => mark.onPick(r, el), isPicked: mark.isPicked(r.key),
                  }) : {})}>
              {p >= 9 && <b>{p.toFixed(0)}%</b>}
            </span>
          )
        })}
      </div>
      <div className="share-key">
        {rows.map(r => (
          <button key={r.key}
                  className={mark?.isPicked(r.key) ? 'share-item is-picked' : 'share-item'}
                  onClick={e => mark?.onPick(r, e.currentTarget)}
                  aria-pressed={mark ? mark.isPicked(r.key) : undefined}>
            <i style={{ background: r.hue }} />
            {r.label}
            <b>{pct(r.n, total).toFixed(1)}%</b>
          </button>
        ))}
      </div>
    </div>
  )
}

/* Pie chart.
 *
 * Requested explicitly, so it is here. Built to be the most readable version of
 * the form rather than the default one, because the things that make pies hard
 * to read are mostly fixable:
 *
 *   - slices ordered largest first, clockwise from 12 o'clock, so rank is
 *     positional and the reader is not comparing angles across the circle
 *   - labels OUTSIDE the arc in ordinary ink, not white text on the fill —
 *     which sidesteps the contrast problem entirely
 *   - a 2px surface-coloured gap between slices, so adjacent hues never touch
 *   - a legend carrying the exact figure, since an angle cannot be read to a
 *     number and should not be guessed at
 *
 * The stacked bar beneath it shows the same data on a shared baseline. Keeping
 * both is deliberate: the pie gives the immediate impression of "one thing
 * dominates", the bar is what you use to compare the small slices to each other.
 */
function PieChart({ rows, total, size = 210, mark }) {
  const r = size / 2 - 26
  const cx = size / 2, cy = size / 2
  let angle = -Math.PI / 2          // start at 12 o'clock
  const slices = rows.map(row => {
    const frac = total ? row.n / total : 0
    const start = angle
    const end = angle + frac * Math.PI * 2
    angle = end
    const mid = (start + end) / 2
    const large = end - start > Math.PI ? 1 : 0
    const p = (ang, rad) => [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad]
    const [x1, y1] = p(start, r), [x2, y2] = p(end, r)
    // A full-circle single category cannot be drawn as an arc — draw a disc.
    const d = frac >= 0.999
      ? `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
      : `M${cx} ${cy} L${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
    const [lx, ly] = p(mid, r + 14)
    return { ...row, d, frac, lx, ly, mid }
  })

  return (
    <div className="pie-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="pie"
           role={mark ? 'group' : 'img'}
           aria-label={mark ? 'Case mix by syndrome'
             : `Case mix: ${rows.map(x => `${x.label} ${pct(x.n, total).toFixed(0)}%`).join(', ')}`}>
        {slices.map(sl => (
          <path key={sl.key} d={sl.d} fill={sl.hue}
                className={mark?.isPicked(sl.key) ? 'pie-slice is-picked' : 'pie-slice'}
                stroke="var(--surface-1)" strokeWidth="2" strokeLinejoin="round"
                {...(mark ? markProps({
                  label: sl.label, value: fmt(sl.n),
                  sub: `${(sl.frac * 100).toFixed(1)}% of all cases`, hue: sl.hue,
                  onShow: mark.onShow, onHide: mark.onHide,
                  onPick: el => mark.onPick(sl, el), isPicked: mark.isPicked(sl.key),
                }) : {})} />
        ))}
        {slices.filter(sl => sl.frac >= 0.07).map(sl => (
          <text key={sl.key} x={sl.lx} y={sl.ly}
                textAnchor={Math.cos(sl.mid) > 0.15 ? 'start' : Math.cos(sl.mid) < -0.15 ? 'end' : 'middle'}
                dominantBaseline="middle" className="pie-label">
            {(sl.frac * 100).toFixed(0)}%
          </text>
        ))}
      </svg>
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
  const peak = Math.max(...values, 0)      // what we SAY
  const max = Math.max(peak, 1)            // what we divide by
  const w = 132, h = 34
  const x = i => (i / Math.max(values.length - 1, 1)) * (w - 2) + 1
  const y = v => h - 2 - (v / max) * (h - 6)
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  return (
    <div className="tr">
      <span className="tr-label"><i style={{ background: hue }} />{label}</span>
      <svg width={w} height={h} role="img" aria-label={`${label}: peak ${peak} in one hour`}>
        <path d={`${line} L${x(values.length - 1)} ${h} L${x(0)} ${h} Z`} fill={hue} opacity="0.13" />
        <path d={line} fill="none" stroke={hue} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className="tr-peak">peak {peak}/h</span>
    </div>
  )
}


/* What a table row expands into.
 *
 * A number in a table is a dead end: "Acute gastroenteritis, 894" invites the
 * question "where, and how bad?" and then refuses to answer it. Every row here
 * can answer that from data already in memory, so it does — computed on expand
 * rather than up front, because most rows are never opened.
 */
const RowDetail = memo(function RowDetail({ subset, group, hours, total }) {
  const n = subset.length
  if (!n) return <p className="rd-empty">No records in this range.</p>

  const tally = (key, fn) => {
    const m = new Map()
    for (const r of subset) m.set(fn ? fn(r) : r[key], (m.get(fn ? fn(r) : r[key]) ?? 0) + 1)
    return [...m.entries()].sort((x, y) => y[1] - x[1])
  }

  /* For a sector row "which sectors" is a tautology, so show what it is made of
     instead. Everywhere else, where it is happening is the useful question. */
  const byPlaceOrKind = group === 'Sector'
    ? tally('syndrome').map(([k, c]) => [SYNDROME_LABELS[k] ?? k, c])
    : tally('sector').map(([k, c]) => [FESTIVAL.sectors.find(s => s.id === k)?.name ?? `Sector ${k}`, c])

  const sev = ['mild', 'moderate', 'severe'].map(k => [k, subset.filter(r => r.severity === k).length])
  const abx = subset.filter(r => r.drugs?.some(d => ANTIBIOTICS.has(d))).length
  const severe = subset.filter(r => r.severity === 'severe').length

  const now = Date.now()
  const buckets = new Array(hours).fill(0)
  for (const r of subset) {
    const idx = Math.min(hours - 1, hours - 1 - Math.floor((now - new Date(r.ts).getTime()) / 3600_000))
    if (idx >= 0) buckets[idx]++
  }
  const firstHalf = buckets.slice(0, Math.floor(hours / 2)).reduce((x, y) => x + y, 0)
  const lastHalf = buckets.slice(Math.floor(hours / 2)).reduce((x, y) => x + y, 0)
  const dir = lastHalf > firstHalf * 1.3 ? 'rising' : lastHalf < firstHalf * 0.7 ? 'easing' : 'steady'

  return (
    <div className="rd">
      <div className="rd-facts">
        <div><span>Cases</span><b>{fmt(n)}</b></div>
        <div><span>Share of all</span><b>{pct(n, total).toFixed(1)}%</b></div>
        <div><span>Severe</span><b>{pct(severe, n).toFixed(0)}%</b></div>
        <div><span>On antibiotics</span><b>{pct(abx, n).toFixed(0)}%</b></div>
        <div><span>Direction</span><b>{dir}</b></div>
      </div>

      <div className="rd-cols">
        <div>
          <h5>{group === 'Sector' ? 'What it is made of' : 'Where it is'}</h5>
          <div className="rank">
            {byPlaceOrKind.slice(0, 5).map(([label, c]) => (
              <div className="rank-row rd-row" key={label}>
                <span className="rank-label" title={label}>{label}</span>
                <span className="rank-track">
                  <i style={{ width: `${(c / byPlaceOrKind[0][1]) * 100}%`, background: 'var(--series-1)',
                              opacity: 0.45 + 0.55 * (c / byPlaceOrKind[0][1]) }} />
                </span>
                <span className="rank-n">{fmt(c)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h5>How bad</h5>
          <div className="rank">
            {sev.map(([label, c]) => (
              <div className="rank-row rd-row" key={label}>
                <span className="rank-label">{label}</span>
                <span className="rank-track">
                  <i style={{ width: `${n ? (c / n) * 100 : 0}%`, background: 'var(--series-2)',
                              opacity: 0.45 + 0.55 * (n ? c / n : 0) }} />
                </span>
                <span className="rank-n">{fmt(c)}</span>
              </div>
            ))}
          </div>
          <h5 style={{ marginTop: 'var(--s-4)' }}>Per hour</h5>
          <Trend label={dir} hue="var(--series-1)" values={buckets} />
        </div>
      </div>
    </div>
  )
})

/* ---- page -------------------------------------------------------------- */

export const Insights = memo(function Insights({ visible = true }) {
  const [hours, setHours] = useState(24)
  const [rows, setRows] = useState(null)
  const [showTable, setShowTable] = useState(false)
  const [open, setOpen] = useState(null)   // which table row is expanded
  const [tip, setTip] = useState(null)      // hover/focus readout
  const [pick, setPick] = useState(null)    // {group, key, label} drilled into
  /* The mark that opened the current panel, so focus can go back to it.
     Unmounting the focused Close button drops focus to <body>, which restarts a
     keyboard user at the top of a page with roughly fifty tab stops. */
  const lastMark = useRef(null)

  /* Escape closes the drill. Without it the only keyboard exit was to Tab
     forward to Close — on a page with roughly fifty tab stops. */
  useEffect(() => {
    if (!pick) return
    const onKey = e => { if (e.key === 'Escape') closeDrill() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pick])

  /* One factory so every chart gets identical hover, focus and click behaviour.
     Clicking the picked mark again clears it — a drill-down you cannot close is
     a trap on a screen someone is reading during an incident. */
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
      /* Clamp rather than drop: a clock a few seconds ahead on one tablet
         would otherwise remove its rows from the trend while leaving them in
         every total, so the parts silently stopped summing to the whole. */
      const hAgo = Math.floor((now - new Date(r.ts).getTime()) / 3600_000)
      const idx = Math.min(hours - 1, hours - 1 - hAgo)
      if (idx < 0) continue
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
      clinical,
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

  function closeDrill() {
    setPick(null)
    const el = lastMark.current
    if (el && document.contains(el)) el.focus?.()
  }

  const marker = group => ({
    onShow: setTip,
    onHide: () => setTip(null),
    onPick: (r, el) => {
      lastMark.current = el ?? null
      setPick(p => (p && p.group === group && p.key === r.key)
        ? null : { group, key: r.key, label: r.label })
    },
    isPicked: key => pick?.group === group && pick.key === key,
  })

  /* The rows behind whatever is picked. Memoised on [rows, hours, pick] because
     setTip fires on every pointermove: filtering the full fetched set inline in
     JSX meant one 30k-row pass per mouse-move event, with RowDetail redoing all
     of its own passes on the new array identity each time. */
  const pickedSubset = useMemo(() => {
    if (!a || !pick) return null
    const g = GROUPS.find(x => x.name === pick.group)
    return g ? a.clinical.filter(x => g.match(x, pick.key)) : null
  }, [a, pick])

  /* Same reasoning for the expanded table row. */
  const openSubset = useMemo(() => {
    if (!a || !open) return null
    const [groupName, key] = [open.slice(0, open.indexOf(':')), open.slice(open.indexOf(':') + 1)]
    const g = GROUPS.find(x => x.name === groupName)
    if (!g) return null
    /* Sector keys are numbers; the id round-trips them through a string. */
    const typed = groupName === 'Sector' ? Number(key) : key
    return a.clinical.filter(x => g.match(x, typed))
  }, [a, open])

  const drill = (group) => {
    if (!a || pick?.group !== group || !pickedSubset) return null
    return (
      <div className="drill">
        <div className="drill-head">
          <b>{pick.label}</b>
          <button onClick={() => closeDrill()} aria-label="Close breakdown">Close</button>
        </div>
        <RowDetail group={group} hours={hours} total={a.total} subset={pickedSubset} />
      </div>
    )
  }

  /* Refetch whenever this becomes visible again, and on a slow timer while it
     stays visible. Prefetching on hover means the data can be arbitrarily old
     by the time someone actually opens the tab. */
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    if (!visible) return
    setNonce(n => n + 1)
    const t = setInterval(() => setNonce(n => n + 1), 120_000)
    return () => clearInterval(t)
  }, [visible])

  useEffect(() => {
    if (!isConfigured()) return
    let alive = true
    if (rows === null) setRows(null)
    /* Clear selections: a pick made in one range may have no rows in the next,
       which left an open panel headed by a label nothing on screen matched. */
    setPick(null)
    setOpen(null)
    fetchRange(hours).then(r => { if (alive) setRows(r) })
    return () => { alive = false }
  }, [hours, nonce])


  if (!isConfigured()) {
    return <div className="empty">Supabase is not configured — check the app's .env file.</div>
  }

  return (
    <div className="insights">
      <Tip tip={tip} />
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
        <div className="empty ins-hold">Reading the last {hours} hours…</div>
      ) : a.total === 0 ? (
        <div className="empty ins-hold">No patient records in the last {hours} hours.</div>
      ) : (
        <>
          <div className="kpi">
            <div className="tile">
              <span className="tile-label">Patients</span>
              <strong className="tile-value">{fmt(a.total)}</strong>
              <span className="tile-hint">last {hours}h · excludes screening</span>
            </div>
            <div className="tile">
              <span className="tile-label">Distinct diagnoses</span>
              <strong className="tile-value">{a.diagRows.length}</strong>
              <span className="tile-hint">in this range</span>
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
              <RankedBars rows={a.diagRows} total={a.total} mark={marker('Diagnosis')} />
              {drill('Diagnosis')}
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
                <h3>What the festival is made of</h3>
                <span className="chart-sub">share of all clinical cases</span>
              </div>
              <div className="mix">
                <PieChart rows={a.synRows} total={a.total} mark={marker('Syndrome')} />
                <div className="mix-bar">
                  <ShareBar rows={a.synRows} total={a.total} mark={marker('Syndrome')} />
                </div>
              </div>
              <p className="ins-note">
                Two views of the same numbers on purpose. The pie shows at a glance
                that one illness dominates; the bar below shares a single baseline,
                which is what you want when comparing the smaller slices to each
                other. Exact figures are in the legend and in the table view.
                Hover, focus or click any slice, segment or bar for a breakdown.
              </p>
              {drill('Syndrome')}
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

            <section className="panel ins-wide">
              <div className="chart-head">
                <h3>Severity and age</h3>
                <span className="chart-sub">ordered scales, one hue each</span>
              </div>
              <div className="ins-cols">
              <div>
              <h4 className="ins-sub">Severity</h4>
              <RankedBars rows={a.sevRows} total={a.total} hue="var(--series-2)" mark={marker('Severity')} />
              {drill('Severity')}
              </div>
              <div>
              <h4 className="ins-sub">Age band</h4>
              <RankedBars rows={a.ageRows} total={a.total} hue="var(--series-3)" mark={marker('Age band')} />
              {drill('Age band')}
              </div>
              </div>
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
                    <tr><th scope="col"><span className="sr-only">Expand</span></th>
                      <th scope="col">Category</th>
                      <th scope="col">Cases</th><th scope="col">Share</th></tr>
                  </thead>
                  {GROUPS.map(g => {
                    const list = a[g.rows]
                    const subtotal = list.reduce((x, r) => x + r.n, 0)
                    return (
                      <tbody key={g.name} className="tg">
                        {/* A group heading row with its own subtotal, rather than
                            the group name on the first row and blanks under it —
                            which made five separate tables look like one long one. */}
                        <tr className="tg-head">
                          <th scope="colgroup" colSpan={2}>{g.name}</th>
                          <td className="num">{fmt(subtotal)}</td>
                          <td className="num">{pct(subtotal, a.total).toFixed(1)}%</td>
                        </tr>
                        {list.map(r => {
                          const id = `${g.name}:${r.key}`.replace(/[^A-Za-z0-9_-]/g, '_')   // ids may not contain spaces
                          const isOpen = open === id
                          return (
                            <Fragment key={id}>
                              <tr className={isOpen ? 'tg-row is-open' : 'tg-row'}>
                                <td className="tg-toggle">
                                  <button aria-expanded={isOpen} aria-controls={`d-${id}`}
                                          onClick={() => setOpen(isOpen ? null : id)}>
                                    <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
                                    <span className="sr-only">
                                      {isOpen ? 'Hide' : 'Show'} details for {r.label}
                                    </span>
                                  </button>
                                </td>
                                <td>{r.label}</td>
                                <td className="num">{fmt(r.n)}</td>
                                <td className="num">{pct(r.n, a.total).toFixed(1)}%</td>
                              </tr>
                              {isOpen && (
                                <tr className="tg-detail" id={`d-${id}`}>
                                  <td colSpan={4}>
                                    <RowDetail group={g.name} hours={hours} total={a.total}
                                               subset={openSubset} />
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    )
                  })}
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
})

/* The standalone route. Kept so /insights can still be linked and opened on its
   own screen, but the health official reaches this through a tab on their own
   dashboard — sending the person who needs it to a different address was the
   wrong shape. */
export default function InsightsPage() {
  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <b>In-depth analysis</b>
          <span>{FESTIVAL.name}</span>
        </div>
        <Link className="live" to="/dashboard" style={{ textDecoration: 'none' }}>control room →</Link>
      </div>
      <Insights />
    </div>
  )
}
