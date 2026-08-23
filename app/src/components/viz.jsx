import { useLayoutEffect, useRef, useState } from 'react'

/* Measure a container's pixel width so SVGs render 1:1 (crisp text, no scaling).
   Measures synchronously on mount — a ResizeObserver alone can leave width at 0. */
export function useWidth(fallback = 640) {
  const ref = useRef(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const next = el.getBoundingClientRect().width
      if (next > 0) setW(next)
    }
    measure()
    // A layout effect can run before the grid has settled, in which case the
    // measurement above is 0. rAF and a short timeout both re-check.
    const raf = requestAnimationFrame(measure)
    const t = setTimeout(measure, 250)
    // ResizeObserver refines this on real resizes, but it must never be the
    // only path: some embedded and non-compositing browsers never deliver its
    // callbacks at all, and a chart that silently renders nothing on a
    // projector is worse than one whose text is a few percent off.
    let ro
    try {
      ro = new ResizeObserver(measure)
      ro.observe(el)
    } catch { /* not supported — the fallback carries it */ }
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
      ro?.disconnect()
    }
  }, [])
  // Never hand back 0: the caller gates rendering on this, so 0 means a blank
  // panel. A slightly wrong width that draws beats a correct width that does not.
  return [ref, w || fallback]
}


/* Status is never carried by colour alone — every badge ships an icon + label. */
const STATUS_ICON = {
  critical: <path d="M8 3.2v5.4M8 11.4v.6" strokeWidth="2" strokeLinecap="round" />,
  warning: <path d="M8 3.4v5M8 11.4v.6" strokeWidth="2" strokeLinecap="round" />,
  good: <path d="M4.4 8.3l2.4 2.4 4.8-5.1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
}

export function StatusBadge({ status, label }) {
  return (
    <span className={`badge badge-${status}`}>
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
        {status === 'critical' && <circle cx="8" cy="8" r="6.4" fill="none" strokeWidth="1.6" />}
        {status === 'warning' && <path d="M8 2.2L14.4 13.4H1.6z" fill="none" strokeWidth="1.6" strokeLinejoin="round" />}
        {STATUS_ICON[status] ?? STATUS_ICON.good}
      </svg>
      {label}
    </span>
  )
}

/* Sparkline: 2px line, no axes — context for a stat tile, not a chart. */
export function Sparkline({ values, width = 96, height = 28 }) {
  if (!values || values.length < 2) return <svg width={width} height={height} aria-hidden="true" />
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const x = i => (i / (values.length - 1)) * (width - 2) + 1
  const y = v => height - 2 - ((v - min) / span) * (height - 4)
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(values.length - 1).toFixed(1)} ${height} L${x(0).toFixed(1)} ${height} Z`
  return (
    <svg width={width} height={height} role="img" aria-label="recent trend">
      <path d={area} fill="var(--series-1-fill)" />
      <path d={line} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="3"
              fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth="2" />
    </svg>
  )
}

export function StatTile({ label, value, spark, status, hint }) {
  return (
    <div className={status ? `tile tile-${status}` : 'tile'}>
      <span className="tile-label">{label}</span>
      <div className="tile-row">
        <strong className="tile-value">{value}</strong>
        {spark && <Sparkline values={spark} />}
      </div>
      {hint && <span className="tile-hint">{hint}</span>}
    </div>
  )
}

/* Epidemic curve — single series, so no legend box: the title names it.
   Ships a crosshair + tooltip, per the interaction rule for line charts. */
export function EpiCurve({ points, baseline, title, subtitle, height = 210 }) {
  const [ref, w] = useWidth()
  const [hover, setHover] = useState(null)

  const padL = 34, padR = 12, padT = 10, padB = 24
  const width = Math.max(w, 240)
  const iw = width - padL - padR
  const ih = height - padT - padB

  const vals = points.map(p => p.v)
  const rawMax = Math.max(...vals, baseline ?? 0, 1)
  const max = Math.ceil(rawMax * 1.15)
  const x = i => padL + (points.length > 1 ? (i / (points.length - 1)) * iw : iw / 2)
  const y = v => padT + ih - (v / max) * ih

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')
  const area = points.length
    ? `${line} L${x(points.length - 1).toFixed(1)} ${padT + ih} L${x(0).toFixed(1)} ${padT + ih} Z`
    : ''

  const ticks = [0, Math.round(max / 2), max]

  function onMove(e) {
    const box = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - box.left
    if (points.length < 2) return
    const i = Math.round(((px - padL) / iw) * (points.length - 1))
    setHover(Math.max(0, Math.min(points.length - 1, i)))
  }

  const last = points[points.length - 1]

  return (
    <div className="chart">
      <div className="chart-head">
        <h3>{title}</h3>
        {subtitle && <span className="chart-sub">{subtitle}</span>}
      </div>
      <div className="chart-plot" style={{ height }} ref={ref}>
        {w > 0 && (
          <svg width={width} height={height} role="img" aria-label={title}
               onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
            {ticks.map(t => (
              <g key={t}>
                <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth="1" />
                <text x={padL - 7} y={y(t) + 4} textAnchor="end" className="axis-text">{t}</text>
              </g>
            ))}

            {baseline != null && (
              <>
                <line x1={padL} x2={width - padR} y1={y(baseline)} y2={y(baseline)}
                      stroke="var(--ink-3)" strokeWidth="1.5" strokeDasharray="5 4" />
                <text x={width - padR} y={y(baseline) - 6} textAnchor="end" className="axis-text">
                  expected {baseline.toFixed(1)}/hr
                </text>
              </>
            )}

            <path d={area} fill="var(--series-1-fill)" />
            <path d={line} fill="none" stroke="var(--series-1)" strokeWidth="2"
                  strokeLinejoin="round" strokeLinecap="round" />

            {/* Persistent end marker: ≥8px, 2px surface ring so it survives
                crossing the line; the reader's eye lands on "now". */}
            {last && (
              <circle cx={x(points.length - 1)} cy={y(last.v)} r="4"
                      fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth="2" />
            )}

            {hover != null && points[hover] && (
              <>
                <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + ih}
                      stroke="var(--border-strong)" strokeWidth="1" />
                <circle cx={x(hover)} cy={y(points[hover].v)} r="4.5"
                        fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth="2" />
              </>
            )}

            {points.map((p, i) => (
              i % Math.ceil(points.length / 6) === 0 && (
                <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="axis-text">{p.label}</text>
              )
            ))}
          </svg>
        )}
        {hover != null && points[hover] && (
          <div className="tip" style={{
            left: Math.min(Math.max(x(hover), 60), width - 60),
            top: Math.max(y(points[hover].v) - 12, 4),
          }}>
            <strong>{points[hover].v}</strong> cases
            <span>{points[hover].label}</span>
          </div>
        )}
      </div>

      {/* The WCAG-clean twin: every plotted value, readable without a pointer. */}
      <details className="chart-table">
        <summary>View as table</summary>
        <table>
          <thead><tr><th scope="col">Hour</th><th scope="col">Cases</th></tr></thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={i}><td>{p.label}</td><td>{p.v}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

/* Antibiotic stewardship. Bars are peer comparison, not a ranking of blame —
   the median is the reference line, and only clinics above it change colour. */
export function StewardshipPanel({ rows, median }) {
  if (!rows.length) {
    return (
      <div className="panel">
        <div className="chart-head">
          <h3>Antibiotic prescribing</h3>
        </div>
        <div className="empty">Not enough data yet.</div>
      </div>
    )
  }
  const max = Math.max(...rows.map(r => r.rate), median, 0.01)
  const over = rows.filter(r => r.rate > median).length
  return (
    <div className="panel">
      <div className="chart-head">
        <h3>Antibiotic prescribing</h3>
        <span className="chart-sub">share of visits, last 24h</span>
      </div>
      <p className="stew-med">
        Festival median <b>{Math.round(median * 100)}%</b> · {over} {over === 1 ? 'clinic' : 'clinics'} above it
      </p>
      {rows.map(r => {
        const isOver = r.rate > median
        return (
          <div className="stew-row" key={r.clinicId}
               title={`${r.name}: ${Math.round(r.rate * 100)}% of ${r.total} visits included an antibiotic`}>
            <span className="stew-name">{r.name}</span>
            <span className="stew-bar">
              <i className={isOver ? 'over' : ''} style={{ width: `${(r.rate / max) * 100}%` }} />
              {/* median reference tick — the comparison the panel exists for */}
              <u className="stew-median" style={{ left: `${(median / max) * 100}%` }} aria-hidden="true" />
            </span>
            <span className="stew-pct">
              {/* status never rides color alone: over-median rows also get the mark */}
              {isOver && (
                <svg viewBox="0 0 16 16" width="11" height="11" role="img" aria-label="above median">
                  <path d="M8 2.2L14.4 13.4H1.6z" fill="none" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M8 6.4v3M8 11.4v.4" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
              {Math.round(r.rate * 100)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* Sector heatmap. Fill = magnitude (sequential blue). Alert state is a SEPARATE
   channel — status ring + icon badge — so magnitude colour keeps its meaning. */
export function SectorGrid({ sectors, counts, alertTier, onPick, selected, clinicHealth }) {
  const max = Math.max(...sectors.map(s => counts.get(s.id) ?? 0), 1)
  const steps = ['--seq-0', '--seq-1', '--seq-2', '--seq-3', '--seq-4', '--seq-5', '--seq-6']

  function stepFor(n) {
    if (n === 0) return steps[0]
    const idx = Math.min(steps.length - 1, 1 + Math.floor((n / max) * (steps.length - 2)))
    return steps[idx]
  }

  const quiet = clinicHealth?.quiet ?? []
  const silentSectors = clinicHealth?.silentSectors ?? new Set()

  return (
    <div className="panel">
      <div className="chart-head">
        <h3>Sectors</h3>
        <span className="chart-sub">cases in last 6 hours</span>
      </div>

      <div className="sector-grid">
        {sectors.map(sec => {
          const n = counts.get(sec.id) ?? 0
          const tier = alertTier.get(sec.id)
          const silent = silentSectors.has(sec.id)
          /* Text colour comes from the STEP, not from n/max. The old rule
             flipped to white at 55% of the peak, which landed on --seq-3 —
             white on that measured 2.5:1, so the busiest sectors on the wall
             were the least readable ones. Each step now names its own ink. */
          const step = stepFor(n)
          const stepInk = `var(${step}-ink)`
          return (
            <button
              key={sec.id}
              className={`sector${tier ? ` sector-${tier}` : ''}${silent ? ' sector-silent' : ''}${selected === sec.id ? ' is-sel' : ''}`}
              /* A silent sector must never wear the healthy pale ramp — its
                 count is stale information, so the tile becomes a blind spot. */
              style={silent
                ? { background: 'var(--surface-sunk)', color: 'var(--ink-3)' }
                : { background: `var(${step})`, color: stepInk }}
              onClick={() => onPick?.(sec.id)}
              title={silent
                ? `${sec.name} — no clinic has reported for 3 hours`
                : `${sec.name} — ${n} cases in last 6h`}
            >
              <span className="sector-id" style={{ color: stepInk }}>
                S{sec.id}
              </span>
              <span className="sector-count">{silent ? '—' : n}</span>
              <span className="sector-name" style={{ color: stepInk }}>
                {silent ? 'no reports 3h+' : sec.name}
              </span>
              {tier && (
                <span className={`sector-flag flag-${tier}`}>
                  <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
                    <circle cx="8" cy="8" r="6.4" fill="none" strokeWidth="1.8" />
                    <path d="M8 4.4v4.2M8 11v.6" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  {tier === 'act' ? 'alert' : 'watch'}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="legend">
        <span className="legend-label">fewer</span>
        {steps.map(s => <i key={s} style={{ background: `var(${s})` }} />)}
        <span className="legend-label">more cases</span>
      </div>

      {clinicHealth && (
        <div className={quiet.length ? 'clinic-health is-quiet' : 'clinic-health'}>
          {quiet.length === 0 ? (
            <>
              <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"
                   fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
              all {clinicHealth.total} clinics reporting
            </>
          ) : (
            <>
              <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"
                   fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                <path d="M8 2.2L14.4 13.4H1.6z" />
                <path d="M8 6v3.2M8 11.2v.6" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {quiet.length} of {clinicHealth.total} clinics silent 3h+: {quiet.map(c => c.name).join(', ')}
            </>
          )}
        </div>
      )}
    </div>
  )
}
