import { useEffect, useState } from 'react'
import { supabase, isConfigured } from '../lib/supabase'
import { SYNDROME_LABELS, DRUGS } from '../config/medical'
import { StatusBadge, Sparkline } from '../components/viz'

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

      const since12h = new Date(Date.now() - 12 * 3600_000).toISOString()

      const [mine, sectorAlerts, festival, sectorRows, trendRows] = await Promise.all([
        supabase.from('encounters')
          .select('syndrome, drugs, severity')
          .eq('clinic_id', clinic.id)
          .gte('ts', dayStart.toISOString()),
        supabase.from('alerts')
          .select('syndrome, observed, expected, tier')
          .eq('sector', sector)
          .neq('status', 'resolved'),
        supabase.from('encounters')
          .select('clinic_id, drugs')
          .gte('ts', since6h)
          .order('ts', { ascending: false })
          .limit(2000),
        /* The whole sector, not just this tent. This is the number that does
           not exist anywhere else: every clinic sees its own queue, and the
           total has never been visible to the person generating it. */
        supabase.from('encounters')
          .select('syndrome, clinic_id')
          .eq('sector', sector)
          .gte('ts', since6h)
          .order('ts', { ascending: false })
          .limit(3000),
        supabase.from('encounters')
          .select('ts')
          .eq('clinic_id', clinic.id)
          .gte('ts', since12h)
          .order('ts', { ascending: false })
          .limit(3000),
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

      /* A true per-clinic median, matching DashboardPage's calculation. The
         previous version averaged every encounter festival-wide and called it
         a median, so this screen and the control room disagreed under the same
         label — and a mean is dragged by whichever clinic is busiest. */
      const perClinic = new Map()
      for (const e of festival.data ?? []) {
        if (!perClinic.has(e.clinic_id)) perClinic.set(e.clinic_id, { n: 0, abx: 0 })
        const c = perClinic.get(e.clinic_id)
        c.n++
        if (e.drugs?.some(d => ANTIBIOTICS.has(d))) c.abx++
      }
      const rates = [...perClinic.values()].filter(c => c.n >= 5).map(c => c.abx / c.n).sort((a, b) => a - b)
      const mid = Math.floor(rates.length / 2)
      const festMedian = !rates.length ? null
        : rates.length % 2 ? rates[mid] : (rates[mid - 1] + rates[mid]) / 2

      /* Sector aggregate, and how much of it came from this clinic. */
      /* Exclude screening here too — the headline and the breakdown beneath it
         must describe the same population, or the parts do not sum to the whole. */
      const secRows = (sectorRows.data ?? []).filter(e => e.syndrome !== 'screening')
      const secBySyn = new Map()
      let secMine = 0
      for (const e of secRows) {
        if (e.syndrome !== 'screening') secBySyn.set(e.syndrome, (secBySyn.get(e.syndrome) ?? 0) + 1)
        if (e.clinic_id === clinic.id) secMine++
      }

      /* Twelve hourly buckets. A doctor's real question is not "how many" but
         "is this building?", which a single number cannot answer. */
      const now = Date.now()
      const buckets = new Array(12).fill(0)
      for (const e of trendRows.data ?? []) {
        const hrsAgo = (now - new Date(e.ts).getTime()) / 3600_000
        const idx = 11 - Math.floor(hrsAgo)
        if (idx >= 0 && idx < 12) buckets[idx]++
      }
      const firstHalf = buckets.slice(0, 6).reduce((a, b) => a + b, 0)
      const lastHalf = buckets.slice(6).reduce((a, b) => a + b, 0)

      setState({
        sectorTotal: secRows.length,
        sectorTop: [...secBySyn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
        sectorClinics: new Set(secRows.map(e => e.clinic_id)).size,
        sectorMine: secMine,
        trend: buckets,
        trendDir: lastHalf > firstHalf * 1.3 ? 'rising'
          : lastHalf < firstHalf * 0.7 ? 'easing' : 'steady',
        today: rows.length,
        top: [...bySyndrome.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
        myRate: rows.length ? abx / rows.length : null,
        festRate: festMedian,
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

      {/* The payoff for entering the data. Every clinic can count its own
          queue; none of them can see this, and it is the exact number the
          whole system exists to produce. Put it above their own count. */}
      <div className="panel mc-sector">
        <div className="chart-head">
          <h3>Your sector, last 6 hours</h3>
          <span className="chart-sub">{state.sectorClinics} clinic{state.sectorClinics === 1 ? '' : 's'} reporting</span>
        </div>
        <div className="mc-big">{state.sectorTotal}</div>
        <p className="chart-sub" style={{ marginTop: 0 }}>
          patients across the whole sector — <b>{state.sectorMine}</b> of them yours
        </p>
        {state.sectorTop.length > 0 && (
          <div className="mc-top">
            {state.sectorTop.map(([syn, n]) => (
              <div key={syn} className="mc-row">
                <span>{SYNDROME_LABELS[syn] ?? syn}</span>
                <b>{n}</b>
              </div>
            ))}
          </div>
        )}
        <p className="mc-note">
          No single clinic can see this number. It only exists because every
          tent in the sector is entering patients.
        </p>
      </div>

      <div className="panel">
        <div className="chart-head">
          <h3>Your clinic today</h3>
          <span className="chart-sub">{clinic.name}</span>
        </div>
        <div className="mc-big">{state.today}</div>
        <p className="chart-sub" style={{ marginTop: 0 }}>patients recorded</p>

        {/* "Is it building?" is the question a running total cannot answer. */}
        <div className="mc-trend">
          <Sparkline values={state.trend} width={120} height={30} />
          <span>
            last 12 hours · <b>{state.trendDir}</b>
          </span>
        </div>

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
