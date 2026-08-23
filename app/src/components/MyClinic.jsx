import { useEffect, useState } from 'react'
import { supabase, isConfigured } from '../lib/supabase'
import { SYNDROME_LABELS, DRUGS } from '../config/medical'
import { StatusBadge } from '../components/viz'

const ANTIBIOTICS = new Set(DRUGS.filter(d => d.antibiotic).map(d => d.id))

/* What the clinic gets back.
 *
 * The doctor feeds this system 180 patients a day and, until now, learned
 * nothing from it. That is how surveillance quietly dies — not from bugs, but
 * from data entry turning careless in week three because it feels pointless.
 *
 * The valuable thing here is not the counts. It is the sector alert: detection
 * built from THEIR data, handed back with something clinically actionable to
 * do about it. Everything else on this screen is context for that.
 *
 * Two rules this screen must not break:
 *   - It never judges the doctor. Prescribing is shown beside the festival
 *     median and nowhere near a verdict. The instant this feels like
 *     surveillance OF them, they stop trusting the whole system.
 *   - It never slows entry. It lives behind a tab; the ten-second path never
 *     renders it.
 */
export function MyClinic({ clinic, sector }) {
  const [state, setState] = useState(null)

  useEffect(() => {
    if (!isConfigured() || !clinic) return
    let alive = true

    async function load() {
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
      const since6h = new Date(Date.now() - 6 * 3600_000).toISOString()

      const [mine, sectorAlerts, festival] = await Promise.all([
        supabase.from('encounters')
          .select('syndrome, drugs, severity')
          .eq('clinic_id', clinic.id)
          .gte('ts', dayStart.toISOString()),
        supabase.from('alerts')
          .select('syndrome, observed, expected, tier')
          .eq('sector', sector)
          .neq('status', 'resolved'),
        supabase.from('encounters')
          .select('drugs')
          .gte('ts', since6h)
          .limit(1000),
      ])
      if (!alive) return

      const rows = mine.data ?? []
      const bySyndrome = new Map()
      let abx = 0
      for (const e of rows) {
        if (e.syndrome !== 'screening') {
          bySyndrome.set(e.syndrome, (bySyndrome.get(e.syndrome) ?? 0) + 1)
        }
        if (e.drugs?.some(d => ANTIBIOTICS.has(d))) abx++
      }

      const fest = festival.data ?? []
      const festAbx = fest.filter(e => e.drugs?.some(d => ANTIBIOTICS.has(d))).length

      setState({
        today: rows.length,
        top: [...bySyndrome.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
        myRate: rows.length ? abx / rows.length : null,
        festRate: fest.length ? festAbx / fest.length : null,
        alerts: sectorAlerts.data ?? [],
      })
    }

    load()
    const t = setInterval(load, 60_000)
    return () => { alive = false; clearInterval(t) }
  }, [clinic, sector])

  if (!state) return <div className="empty">Loading your clinic…</div>

  const pct = r => (r === null ? '—' : `${Math.round(r * 100)}%`)
  const alert = state.alerts[0]

  return (
    <div className="myclinic">
      {/* The alert first. It is the only thing here that should change what the
          doctor does in the next hour. */}
      {alert ? (
        <div className="panel mc-alert">
          <StatusBadge status={alert.tier === 'act' ? 'critical' : 'warning'} label="in your sector" />
          <h3>{SYNDROME_LABELS[alert.syndrome] ?? alert.syndrome}</h3>
          <p>
            <b>{alert.observed} cases</b> in your sector in the last six hours,
            against {Number(alert.expected).toFixed(0)} normally. A team has been
            notified.
          </p>
          {alert.syndrome === 'gi' && (
            <p className="mc-do">
              Worth asking every patient with loose motions <b>where they drew water</b>,
              and starting ORS early.
            </p>
          )}
        </div>
      ) : (
        <div className="panel mc-clear">
          <StatusBadge status="good" label="sector clear" />
          <p>Nothing unusual in your sector right now.</p>
        </div>
      )}

      <div className="panel">
        <div className="chart-head">
          <h3>Your clinic today</h3>
          <span className="chart-sub">{clinic.name}</span>
        </div>
        <div className="mc-big">{state.today}</div>
        <p className="chart-sub" style={{ marginTop: 0 }}>patients recorded</p>

        {state.top.length > 0 && (
          <div className="mc-top">
            {state.top.map(([syn, n]) => (
              <div key={syn} className="mc-row">
                <span>{SYNDROME_LABELS[syn] ?? syn}</span>
                <b>{n}</b>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two numbers side by side. No verdict, no advice, no colour-coding that
          implies one is bad — the doctor draws their own conclusion. */}
      <div className="panel">
        <div className="chart-head">
          <h3>Antibiotics</h3>
          <span className="chart-sub">share of your patients today</span>
        </div>
        <div className="mc-compare">
          <div>
            <span className="tile-label">You</span>
            <b>{pct(state.myRate)}</b>
          </div>
          <div>
            <span className="tile-label">Festival median</span>
            <b>{pct(state.festRate)}</b>
          </div>
        </div>
      </div>
    </div>
  )
}
