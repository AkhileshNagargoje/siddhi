import { useEffect, useMemo, useState } from 'react'
import { supabase, isConfigured } from '../lib/supabase'
import { FESTIVAL, RESPONSE_UNITS, CLINICS } from '../config/festival'
import { SYNDROME_LABELS, DRUGS } from '../config/medical'
import { StatTile, StatusBadge, EpiCurve, SectorGrid, StewardshipPanel } from '../components/viz'

const ANTIBIOTIC_IDS = new Set(DRUGS.filter(d => d.antibiotic).map(d => d.id))

const HOURS = 24
const WINDOW_MS = 6 * 3600_000

const hhmm = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const PAGE = 1000 // Supabase caps a single response at 1000 rows — page through it.

async function fetchEncounters(sinceIso) {
  const out = []
  for (let from = 0; from < 20000; from += PAGE) {
    const { data, error } = await supabase
      .from('encounters')
      .select('id, ts, clinic_id, sector, syndrome, severity, age_band, drugs')
      .gte('ts', sinceIso)
      .order('ts', { ascending: false })   // newest first, so truncation loses old data not new
      .range(from, from + PAGE - 1)
    if (error || !data?.length) break
    out.push(...data)
    if (data.length < PAGE) break
  }
  return out
}

export default function DashboardPage() {
  const [encounters, setEncounters] = useState([])
  const [alerts, setAlerts] = useState([])
  const [tasks, setTasks] = useState([])
  const [selected, setSelected] = useState(null)
  const [unit, setUnit] = useState(RESPONSE_UNITS[0].id)

  useEffect(() => {
    if (!isConfigured()) return
    let alive = true

    async function load() {
      const since = new Date(Date.now() - HOURS * 3600_000).toISOString()
      const [enc, al, tk] = await Promise.all([
        fetchEncounters(since),
        supabase.from('alerts').select('*').order('ts', { ascending: false }).limit(50),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(50),
      ])
      if (!alive) return
      setEncounters(enc)
      if (al.data) setAlerts(al.data)
      if (tk.data) setTasks(tk.data)
    }
    load()

    const refetch = table => () =>
      supabase.from(table).select('*').order(table === 'alerts' ? 'ts' : 'created_at', { ascending: false })
        .limit(50).then(r => r.data && (table === 'alerts' ? setAlerts(r.data) : setTasks(r.data)))

    const ch = supabase.channel('dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'encounters' },
        p => setEncounters(prev => [...prev, p.new]))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, refetch('alerts'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, refetch('tasks'))
      .subscribe()

    const t = setInterval(load, 60_000)
    return () => { alive = false; supabase.removeChannel(ch); clearInterval(t) }
  }, [])

  const recent = useMemo(() => {
    const cut = Date.now() - WINDOW_MS
    return encounters.filter(e => new Date(e.ts).getTime() >= cut)
  }, [encounters])

  const bySector = useMemo(() => {
    const m = new Map()
    for (const e of recent) m.set(e.sector, (m.get(e.sector) ?? 0) + 1)
    return m
  }, [recent])

  const openAlerts = alerts.filter(a => a.status !== 'resolved')
  const alertTier = useMemo(() => {
    const m = new Map()
    for (const a of openAlerts) {
      if (m.get(a.sector) !== 'act') m.set(a.sector, a.tier)
    }
    return m
  }, [openAlerts])

  const sel = selected ? alerts.find(a => a.id === selected) : null

  /* Hourly buckets — festival-wide by default, or the selected alert's
     sector+syndrome when one is open, so the spike is visible against baseline. */
  const curve = useMemo(() => {
    const now = Date.now()
    const buckets = Array.from({ length: HOURS }, (_, i) => {
      const end = now - (HOURS - 1 - i) * 3600_000
      return { end, v: 0, label: new Date(end).toLocaleTimeString([], { hour: 'numeric' }) }
    })
    const src = sel ? encounters.filter(e => e.sector === sel.sector && e.syndrome === sel.syndrome) : encounters
    for (const e of src) {
      const age = now - new Date(e.ts).getTime()
      const idx = HOURS - 1 - Math.floor(age / 3600_000)
      if (idx >= 0 && idx < HOURS) buckets[idx].v++
    }
    return buckets
  }, [encounters, sel])

  const sparkTotal = useMemo(() => curve.map(b => b.v), [curve])

  const todayCount = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    return encounters.filter(e => new Date(e.ts) >= start).length
  }, [encounters])

  /* Antibiotic prescribing rate per clinic, and the festival median as the
     reference. Clinics with too few visits are excluded — a 100% rate off
     3 patients is noise, not a signal. */
  const stewardship = useMemo(() => {
    const tally = new Map()
    for (const e of encounters) {
      if (!e.clinic_id) continue
      const t = tally.get(e.clinic_id) ?? { total: 0, abx: 0 }
      t.total++
      if (e.drugs?.some(d => ANTIBIOTIC_IDS.has(d))) t.abx++
      tally.set(e.clinic_id, t)
    }
    const rows = [...tally.entries()]
      .filter(([, t]) => t.total >= 10)
      .map(([clinicId, t]) => ({
        clinicId,
        name: CLINICS.find(c => c.id === clinicId)?.name ?? clinicId,
        rate: t.abx / t.total,
        total: t.total,
      }))
      .sort((a, b) => b.rate - a.rate)

    const sorted = rows.map(r => r.rate).sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median = !sorted.length ? 0
      : sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2

    return { rows, median }
  }, [encounters])

  const severeShare = useMemo(() => {
    if (!recent.length) return 0
    return Math.round((recent.filter(e => e.severity === 'severe').length / recent.length) * 100)
  }, [recent])

  async function assign(alert) {
    await supabase.from('tasks').insert({ alert_id: alert.id, assigned_unit: unit })
    await supabase.from('alerts').update({ status: 'assigned' }).eq('id', alert.id)
  }

  if (!isConfigured()) {
    return <div className="shell"><div className="panel">Supabase not configured — check <code>.env</code></div></div>
  }

  const selSector = sel ? FESTIVAL.sectors.find(s => s.id === sel.sector) : null
  const selCases = sel ? recent.filter(e => e.sector === sel.sector && e.syndrome === sel.syndrome) : []
  const selClinics = [...new Set(selCases.map(c => c.clinic_id))]
  const selTasks = sel ? tasks.filter(t => t.alert_id === sel.id) : []

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <b>Drishti</b>
          <span>control room · {FESTIVAL.name}</span>
        </div>
        <span className="live"><i />live</span>
      </div>

      <div className="kpi">
        <StatTile label="Patients today" value={todayCount} spark={sparkTotal} hint="all sectors" />
        {/* Count sectors that actually reported. Hardcoding the total made the
            dashboard assert "12 sectors reporting" even if eleven had gone
            dark — the exact opposite of design rule 5, on the tile most likely
            to be read aloud. */}
        <StatTile
          label="Last 6 hours" value={recent.length}
          status={bySector.size < FESTIVAL.sectors.length ? 'warning' : undefined}
          hint={`${bySector.size} of ${FESTIVAL.sectors.length} sectors reporting`}
        />
        <StatTile
          label="Open alerts" value={openAlerts.length}
          status={openAlerts.length ? 'critical' : undefined}
          hint={openAlerts.length ? 'action required' : 'all clear'}
        />
        <StatTile label="Severe cases" value={`${severeShare}%`} hint="of last 6 hours" />
      </div>

      <div className="dash-grid">
        <div className="dash-col">
          <EpiCurve
            points={curve}
            /* alerts.expected is a count per SIX-HOUR window; this chart is
               bucketed per hour. Plotting it raw drew the line 6x too high, so
               the outbreak spike rendered *below* its own "expected" line —
               visually contradicting the alert text beside it. */
            baseline={sel ? Number(sel.expected) / 6 : null}
            title={sel ? `Sector ${sel.sector} — ${SYNDROME_LABELS[sel.syndrome] ?? sel.syndrome}` : 'All cases'}
            subtitle={sel ? 'cases per hour vs expected' : 'cases per hour, last 24 hours'}
          />
          <SectorGrid
            sectors={FESTIVAL.sectors}
            counts={bySector}
            alertTier={alertTier}
            selected={sel?.sector}
          />
        </div>

        <div className="dash-col">
          <div className="panel">
            <div className="chart-head">
              <h3>Alerts</h3>
              <span className="chart-sub">{openAlerts.length} open</span>
            </div>

            {alerts.length === 0 && (
              <div className="empty">
                <svg viewBox="0 0 24 24" width="30" height="30" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12.5l5 5L20 6.5" />
                </svg>
                All calm. No sector is above its normal range.
              </div>
            )}

            <div className="alert-list">
              {alerts.map(a => (
                <button
                  key={a.id}
                  className={`alert-card ${a.tier}${a.status === 'resolved' ? ' resolved' : ''}${a.id === selected ? ' is-sel' : ''}`}
                  onClick={() => setSelected(a.id === selected ? null : a.id)}
                >
                  <span className="alert-t">
                    <b>Sector {a.sector} · {SYNDROME_LABELS[a.syndrome] ?? a.syndrome}</b>
                    <span>{a.observed} cases vs {Number(a.expected).toFixed(1)} expected · {hhmm(a.ts)}</span>
                  </span>
                  <StatusBadge
                    status={a.status === 'resolved' ? 'good' : a.tier === 'act' ? 'critical' : 'warning'}
                    label={a.status}
                  />
                </button>
              ))}
            </div>

            {sel && (
              <div className="detail">
                <div>
                  <h4>Why this fired</h4>
                  <div className="compare">
                    <div className="compare-row">
                      <span>observed</span>
                      <div className="compare-bar obs" style={{ width: '100%' }} />
                      <b>{sel.observed}</b>
                    </div>
                    <div className="compare-row">
                      <span>expected</span>
                      <div className="compare-bar exp" style={{ width: `${Math.max((sel.expected / Math.max(sel.observed, 1)) * 100, 4)}%` }} />
                      <b>{Number(sel.expected).toFixed(1)}</b>
                    </div>
                  </div>
                  <p>
                    That is <b>{Number(sel.score).toFixed(1)} standard deviations</b> above the
                    same six-hour window averaged over the past three days.
                  </p>
                  <p>
                    Cases arrived at <b>{selClinics.length} separate clinics</b> — no single
                    doctor saw more than a normal handful.
                  </p>
                </div>

                {selSector && (
                  <div>
                    <h4>Possible sources in {selSector.name}</h4>
                    <div className="source-chips">
                      {selSector.waterPoints.map(w => <span key={w} className="source-chip">💧 {w}</span>)}
                      {selSector.kitchens.map(k => <span key={k} className="source-chip">🍲 {k}</span>)}
                      {!selSector.waterPoints.length && !selSector.kitchens.length && <span className="source-chip">none mapped</span>}
                    </div>
                  </div>
                )}

                {sel.status === 'open' && (
                  <div className="assign">
                    <select value={unit} onChange={e => setUnit(e.target.value)}>
                      {RESPONSE_UNITS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <button className="btn btn-accent" onClick={() => assign(sel)}>Dispatch</button>
                  </div>
                )}

                {selTasks.length > 0 && (
                  <div>
                    <h4>Response</h4>
                    <div className="timeline">
                      {selTasks.map(t => (
                        <div key={t.id}>
                          <div className="tl-row"><i className="tl-dot" /><span><b>{t.assigned_unit}</b> dispatched {hhmm(t.created_at)}</span></div>
                          {t.ack_at && <div className="tl-row"><i className="tl-dot" /><span>acknowledged {hhmm(t.ack_at)}</span></div>}
                          {t.resolved_at && (
                            <div className="tl-row">
                              <i className="tl-dot" />
                              <span>resolved {hhmm(t.resolved_at)} — {t.outcome}{t.note && <> · “{t.note}”</>}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <StewardshipPanel rows={stewardship.rows} median={stewardship.median} />
        </div>
      </div>
    </div>
  )
}
