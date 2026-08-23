import { useEffect, useMemo, useState } from 'react'
import { Insights } from './InsightsPage'
import { supabase, isConfigured } from '../lib/supabase'
import { FESTIVAL, RESPONSE_UNITS, CLINICS } from '../config/festival'
import { SYNDROME_LABELS, DRUGS } from '../config/medical'
import { StatTile, StatusBadge, EpiCurve, SectorGrid, StewardshipPanel } from '../components/viz'
import { AgeChart } from '../components/AgeChart'
import { SectorDetail } from '../components/SectorDetail'
import { AGE_BANDS } from '../config/medical'

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
  const [pharmacy, setPharmacy] = useState([])
  const [selected, setSelected] = useState(null)
  const [view, setView] = useState('live')
  const [unit, setUnit] = useState(RESPONSE_UNITS[0].id)
  const [pickedSector, setPickedSector] = useState(null)
  const [advisoryDraft, setAdvisoryDraft] = useState(null) // null = composer closed // sector tile clicked → detail panel (TASK 4)

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
      // Second, independent signal. Failure here must never blank the
      // dashboard, so it is fetched separately and defaults to empty.
      supabase.from('pharmacy_signals').select('*').then(r => {
        if (alive && r.data) setPharmacy(r.data)
      })
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
  /* An operations screen surfaces what needs attention, with just enough
     history for context — not an unbounded archive. A week of the engine
     running unattended left fifty resolved cards burying the live ones. */
  const feed = useMemo(() => {
    const live = alerts.filter(a => a.status !== 'resolved')
    const recentlyClosed = alerts.filter(a => a.status === 'resolved').slice(0, 3)
    return [...live, ...recentlyClosed]
  }, [alerts])
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

  /* Live props for the teammate-built components. Data is computed here so
     the components stay pure display (TEAM-TASKS: "fetch nothing"). */
  const ageData = useMemo(() => {
    const c = new Map(AGE_BANDS.map(b => [b, 0]))
    for (const e of recent) c.set(e.age_band, (c.get(e.age_band) ?? 0) + 1)
    return AGE_BANDS.map(band => ({ band, count: c.get(band) ?? 0 }))
  }, [recent])

  const pickedDetail = useMemo(() => {
    if (!pickedSector) return null
    const sec = FESTIVAL.sectors.find(s => s.id === pickedSector)
    if (!sec) return null
    const inSector = recent.filter(e => e.sector === pickedSector)
    const bySyn = new Map()
    for (const e of inSector) bySyn.set(e.syndrome, (bySyn.get(e.syndrome) ?? 0) + 1)
    return {
      sector: sec,
      totalCases: inSector.length,
      bySyndrome: [...bySyn.entries()]
        .filter(([s]) => s !== 'screening')
        .map(([s, count]) => ({ syndrome: SYNDROME_LABELS[s] ?? s, count }))
        .sort((a, b) => b.count - a.count),
      clinics: CLINICS.filter(c => c.sector === pickedSector)
        .map(c => ({ id: c.id, name: c.name, cases: inSector.filter(e => e.clinic_id === c.id).length })),
    }
  }, [pickedSector, recent])

  /* Design rule 5: silence is not calm. A clinic with no encounter for 3h is
     flagged, and a sector whose every clinic has gone quiet is drawn as a
     blind spot, not as a healthy pale tile. Derived from the encounter stream
     itself — no extra write path, and it works whichever client inserted. */
  const clinicHealth = useMemo(() => {
    const QUIET_MS = 3 * 3600_000
    const last = new Map()
    for (const e of encounters) {
      const t = new Date(e.ts).getTime()
      if (t > (last.get(e.clinic_id) ?? 0)) last.set(e.clinic_id, t)
    }
    const cutoff = Date.now() - QUIET_MS
    const quiet = CLINICS.filter(c => (last.get(c.id) ?? 0) < cutoff)
    const silentSectors = new Set(
      FESTIVAL.sectors
        .filter(s => CLINICS.filter(c => c.sector === s.id)
          .every(c => (last.get(c.id) ?? 0) < cutoff))
        .map(s => s.id),
    )
    return { quiet, silentSectors, total: CLINICS.length }
  }, [encounters])

  /* Suggested wording only — the officer edits and approves it. Written to
     be useful without being frightening: it never says a sector is dangerous,
     never gives a case count, and tells people what to DO. Naming a sector as
     infected to a dense crowd moves that crowd, and crowd movement is what
     kills at mass gatherings. */
  function suggestAdvisory(alert) {
    const sec = FESTIVAL.sectors.find(s => s.id === alert.sector)
    const water = sec?.waterPoints?.length ? ` Use the treated water points (${sec.waterPoints.join(', ')}).` : ''
    if (alert.syndrome === 'gi') {
      return `Health teams are checking the water supply in ${sec?.name ?? 'this area'} as a precaution.`
        + ` Please drink only treated or sealed water and wash your hands before eating.${water}`
        + ` If you have loose motions, start ORS straight away — it is free at every clinic.`
    }
    return `Health teams are active in ${sec?.name ?? 'this area'} as a precaution.`
      + ` Please follow the usual advice: treated water only, wash hands before eating,`
      + ` and visit any festival clinic if you feel unwell. Care is free.`
  }

  async function publishAdvisory(alert, text) {
    const { error } = await supabase.from('alerts').update({
      advisory: text,
      advisory_at: new Date().toISOString(),
      advisory_by: 'Festival health office',
    }).eq('id', alert.id)
    if (error) console.error('publish failed:', error.message)
    setAdvisoryDraft(null)
  }

  async function withdrawAdvisory(alert) {
    const { error } = await supabase.from('alerts')
      .update({ advisory: null, advisory_at: null, advisory_by: null })
      .eq('id', alert.id)
    if (error) console.error('withdraw failed:', error.message)
  }

  async function assign(alert) {
    await supabase.from('tasks').insert({ alert_id: alert.id, assigned_unit: unit })
    await supabase.from('alerts').update({ status: 'assigned' }).eq('id', alert.id)
  }

  if (!isConfigured()) {
    return <div className="shell"><div className="panel">Supabase not configured — check <code>.env</code></div></div>
  }

  const selSector = sel ? FESTIVAL.sectors.find(s => s.id === sel.sector) : null
  // Only meaningful for diarrhoeal alerts — rehydration sales say nothing
  // about a respiratory or injury cluster.
  const selPharmacy = sel && sel.syndrome === 'gi'
    ? pharmacy.find(p => p.sector === sel.sector) ?? null
    : null
  const selCases = sel ? recent.filter(e => e.sector === sel.sector && e.syndrome === sel.syndrome) : []
  const selClinics = [...new Set(selCases.map(c => c.clinic_id))]
  const selTasks = sel ? tasks.filter(t => t.alert_id === sel.id) : []

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <b>Siddhi</b>
          <span>control room · {FESTIVAL.name}</span>
        </div>
        <span className="live"><i />live</span>
      </div>

      {/* Tabs, not a separate address. The analysis is for this exact person, so
          sending them elsewhere to find it was the wrong shape. Live stays the
          default: during an incident this screen has to be glanceable, and that
          property is worth protecting even from useful additions. */}
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={view === 'live'}
                className={view === 'live' ? 'tab on' : 'tab'}
                onClick={() => setView('live')}>Live</button>
        <button role="tab" aria-selected={view === 'deep'}
                className={view === 'deep' ? 'tab on' : 'tab'}
                onClick={() => setView('deep')}>In-depth analysis</button>
      </div>

      {view === 'deep' && <Insights />}

      {view === 'live' && <>
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
            clinicHealth={clinicHealth}
            onPick={id => setPickedSector(p => (p === id ? null : id))}
          />
          {pickedDetail && (
            <SectorDetail {...pickedDetail} onClose={() => setPickedSector(null)} />
          )}
          <AgeChart data={ageData} title="Cases by age" subtitle="last 6 hours" />
        </div>

        <div className="dash-col">
          <div className="panel">
            <div className="chart-head">
              <h3>Alerts</h3>
              <span className="chart-sub">{openAlerts.length} open</span>
            </div>

            {alerts.filter(a => a.status === 'resolved').length > 3 && (
              <p className="chart-sub" style={{ margin: '0 0 var(--s-2)' }}>
                Showing {openAlerts.length} open and the 3 most recent of{' '}
                {alerts.filter(a => a.status === 'resolved').length} closed.
              </p>
            )}

            {alerts.length === 0 && (
              <div className="empty">
                <svg viewBox="0 0 24 24" width="30" height="30" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12.5l5 5L20 6.5" />
                </svg>
                All calm. No sector is above its normal range.
              </div>
            )}

            <div className="alert-list">
              {feed.map(a => (
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
                    label={a.status === 'resolved' ? 'resolved' : `${a.status} · ${a.tier}`}
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

                {/* An independent stream: what people bought before they came in.
                    Agreement between two signals with different reporters and
                    different failure modes is evidence; one signal repeated is not. */}
                {selPharmacy && (
                  <div>
                    <h4>Second signal — pharmacy</h4>
                    {selPharmacy.elevated ? (
                      <>
                        <StatusBadge status="critical" label="corroborated" />
                        <p style={{ marginTop: 'var(--s-2)' }}>
                          Rehydration sales in this sector are{' '}
                          <b>{(selPharmacy.observed / Math.max(selPharmacy.expected, 1)).toFixed(1)}x normal</b>{' '}
                          — {selPharmacy.observed} units against {Number(selPharmacy.expected).toFixed(0)} expected
                          ({Number(selPharmacy.score).toFixed(1)}σ). People were treating themselves
                          before they reached a clinic.
                        </p>
                      </>
                    ) : (
                      <>
                        <StatusBadge status="warning" label="not corroborated" />
                        <p style={{ marginTop: 'var(--s-2)' }}>
                          Rehydration sales here are normal ({selPharmacy.observed} units against{' '}
                          {Number(selPharmacy.expected).toFixed(0)} expected). Clinic cases are up
                          without a matching rise in self-treatment — worth confirming this is
                          waterborne before chasing a water point.
                        </p>
                      </>
                    )}
                  </div>
                )}

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

                {/* Public communication is a deliberate, human act. The system
                    drafts; an officer edits, approves and can withdraw. Nothing
                    reaches a pilgrim automatically. */}
                <div>
                  <h4>Public advisory</h4>
                  {sel.advisory ? (
                    <>
                      <StatusBadge status="good" label="published" />
                      <p style={{ marginTop: 'var(--s-2)' }}>{sel.advisory}</p>
                      <button className="btn btn-quiet" onClick={() => withdrawAdvisory(sel)}>Withdraw</button>
                    </>
                  ) : advisoryDraft !== null ? (
                    <div className="resolve">
                      <textarea aria-label="Advisory wording shown to pilgrims" rows={5} value={advisoryDraft}
                                onChange={e => setAdvisoryDraft(e.target.value)} />
                      <p className="chart-sub" style={{ margin: 0 }}>
                        Goes to every pilgrim who scans a poster. Say what to do, not what to fear.
                      </p>
                      <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
                        <button className="btn btn-quiet" onClick={() => setAdvisoryDraft(null)}>Cancel</button>
                        <button className="btn btn-accent" onClick={() => publishAdvisory(sel, advisoryDraft)}>
                          Publish to pilgrims
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="chart-sub" style={{ marginTop: 0 }}>
                        Nothing published. Pilgrims see general advice only.
                      </p>
                      <button className="btn btn-quiet" onClick={() => setAdvisoryDraft(suggestAdvisory(sel))}>
                        Draft an advisory
                      </button>
                    </>
                  )}
                </div>

                {sel.status === 'open' && (
                  <div className="assign">
                    <select aria-label="Response unit to dispatch" value={unit} onChange={e => setUnit(e.target.value)}>
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
      </>}
    </div>
  )
}
