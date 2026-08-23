import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FESTIVAL } from '../config/festival'
import { supabase, isConfigured, resolveAlerts } from '../lib/supabase'

/* The presenter's console.
 *
 * Driving a live demo from a terminal is slow and looks amateur, and the
 * person holding the clicker may not be the person who knows the commands.
 * This is that person's screen: large targets, plain-English results, and no
 * way to fire the same thing twice by accident.
 *
 * It is deliberately blunt about consequences. Every button here writes to the
 * live database, so each one says what it will do before it does it.
 */

const ENGINE = 'https://siddhi-engine.akhileshnagargoje.in'

const fmt = n => new Intl.NumberFormat().format(n)

export default function DemoPage() {
  const [busy, setBusy] = useState(null)
  const [log, setLog] = useState([])
  const [sector, setSector] = useState(5)
  const [size, setSize] = useState(28)
  const [live, setLive] = useState(null)
  const alive = useRef(true)

  /* Re-arm on mount. StrictMode mounts, unmounts and remounts in development;
     without the `= true` the first throwaway unmount permanently disables this
     page in `npm run dev` while production looks perfectly fine. */
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  /* A small live readout, so the presenter can see the state they are about to
     change without switching tabs to the dashboard. */
  const refresh = useCallback(async () => {
    if (!isConfigured()) return
    const since = new Date(Date.now() - 6 * 3600_000).toISOString()
    const [enc, open, pharm, gi] = await Promise.all([
      supabase.from('encounters').select('id', { count: 'exact', head: true }).gte('ts', since),
      supabase.from('alerts').select('id', { count: 'exact', head: true }).neq('status', 'resolved'),
      supabase.from('pharmacy_signals').select('sector').eq('elevated', true),
      /* Standing gi load per sector. An injection lands ON TOP of whatever is
         already there, so firing into a sector that rehearsals have already
         loaded up produces a number like "238 against 5.7 — 88 sigma", which
         reads as broken rather than impressive. */
      supabase.from('encounters').select('sector').eq('syndrome', 'gi').gte('ts', since).limit(4000),
    ])
    if (!alive.current) return
    const load = new Map()
    for (const r of gi.data ?? []) load.set(r.sector, (load.get(r.sector) ?? 0) + 1)
    setLive({
      recent: enc.count ?? 0,
      openAlerts: open.count ?? 0,
      pharmacy: pharm.data?.length ?? 0,
      load,
    })
  }, [])

  /* Aim at the quietest sector the first time we learn the loads, so the
     default press produces a believable alert rather than an absurd one. */
  const picked = useRef(false)
  useEffect(() => {
    if (picked.current || !live?.load?.size) return
    picked.current = true
    const quietest = FESTIVAL.sectors
      .map(s => [s.id, live.load.get(s.id) ?? 0])
      .sort((a, b) => a[1] - b[1])[0]
    if (quietest) setSector(quietest[0])
  }, [live])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 15_000)
    return () => clearInterval(t)
  }, [refresh])

  const seq = useRef(0)
  function note(entry) {
    setLog(l => [{ ...entry, id: ++seq.current, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }, ...l].slice(0, 6))
  }

  async function run(key, path, describe) {
    if (busy) return                       // never two at once
    setBusy(key)
    try {
      const res = await fetch(`${ENGINE}${path}`)
      if (!res.ok) throw new Error(`engine returned ${res.status}`)
      const data = await res.json()
      note({ ok: true, text: await describe(data) })
      refresh()
    } catch (e) {
      note({ ok: false, text: `Failed — ${e.message}. The engine may be waking up; try once more.` })
    } finally {
      if (alive.current) setBusy(null)
    }
  }

  /* Resolving rather than deleting: the public key cannot delete, and closing
     an alert is what an officer would actually do anyway. */
  async function resetBoard() {
    if (busy) return
    setBusy('reset')
    try {
      const { data, error } = await resolveAlerts(
        patch => supabase.from('alerts').update(patch).neq('status', 'resolved').select('id'),
        { advisory: null, advisory_at: null, advisory_by: null },
      )
      if (error) throw new Error(error.message)
      const now = new Date().toISOString()
      await supabase.from('tasks')
        .update({ ack_at: now, resolved_at: now, outcome: 'nothing_found', note: 'Closed from the demo console' })
        .is('resolved_at', null)
      note({ ok: true, text: `Board cleared — ${data?.length ?? 0} alert${data?.length === 1 ? '' : 's'} closed, jobs closed, advisories withdrawn.` })
      refresh()
    } catch (e) {
      note({ ok: false, text: `Reset failed — ${e.message}` })
    } finally {
      if (alive.current) setBusy(null)
    }
  }

  const label = (key, idle) => (busy === key ? 'Working…' : idle)

  return (
    <div className="shell demo">
      <div className="topbar">
        <div className="brand">
          <b>Demo console</b>
          <span>everything here writes to the live system</span>
        </div>
        <Link className="live" to="/dashboard" style={{ textDecoration: 'none' }}>dashboard →</Link>
      </div>

      {live && (
        <div className="kpi">
          <div className="tile"><span className="tile-label">Last 6 hours</span><strong className="tile-value">{fmt(live.recent)}</strong><span className="tile-hint">patient records</span></div>
          <div className={live.openAlerts ? 'tile tile-critical' : 'tile'}><span className="tile-label">Open alerts</span><strong className="tile-value">{live.openAlerts}</strong><span className="tile-hint">{live.openAlerts ? 'on the dashboard now' : 'board is clean'}</span></div>
          <div className="tile"><span className="tile-label">Pharmacy elevated</span><strong className="tile-value">{live.pharmacy}</strong><span className="tile-hint">sectors</span></div>
        </div>
      )}

      <div className="demo-grid">
        <section className="panel">
          <div className="chart-head">
            <h3>Start an outbreak</h3>
            <span className="chart-sub">the main demo beat</span>
          </div>
          <p className="chart-sub" style={{ marginTop: 0 }}>
            Adds cases to one sector and spikes rehydration sales there, then runs a
            detection scan. Expect a red sector and a corroborated alert within seconds.
          </p>
          <div className="demo-controls">
            <label>
              <span>Sector to seed</span>
              <select value={sector} onChange={e => setSector(Number(e.target.value))}>
                {FESTIVAL.sectors.map(s => {
                  const n = live?.load?.get(s.id) ?? 0
                  return <option key={s.id} value={s.id}>{s.name} — {n} gi in 6h</option>
                })}
              </select>
            </label>
            <label>
              <span>Size</span>
              <select value={size} onChange={e => setSize(Number(e.target.value))}>
                <option value={14}>Small (14)</option>
                <option value={28}>Normal (28)</option>
                <option value={50}>Large (50)</option>
              </select>
            </label>
          </div>
          {(live?.load?.get(sector) ?? 0) > 25 && (
            <p className="demo-warn">
              Sector {sector} already carries {live.load.get(sector)} gi cases in the
              last six hours, so an injection here will score absurdly high. Pick a
              quieter sector for a believable number.
            </p>
          )}
          <button className="btn btn-accent btn-wide" disabled={!!busy}
                  onClick={() => run('outbreak', `/outbreak?sector=${sector}&n=${size}`,
                    async d => {
                      const name = FESTIVAL.sectors.find(s => s.id === sector)?.name
                      const hit = (d.scan?.newAlerts ?? []).find(a => a.sector === sector)
                      if (hit) {
                        return `Outbreak in ${name} — alert raised at ${hit.z}σ (${hit.observed} cases against ${hit.expected} expected).`
                      }
                      /* Not in newAlerts does NOT mean it failed: the scan reports
                         only alerts it RAISED, so an existing alert it merely
                         updated is invisible here. Announcing failure while a
                         perfectly good alert sits on the dashboard is the worst
                         thing this screen could say mid-pitch, so ask the
                         database what is actually true before claiming anything. */
                      const { data } = await supabase.from('alerts')
                        .select('observed, expected, score, tier')
                        .eq('sector', sector).eq('syndrome', 'gi')
                        .neq('status', 'resolved').order('ts', { ascending: false }).limit(1)
                      const live = data?.[0]
                      if (live) {
                        return `Outbreak in ${name} — alert live at ${Number(live.score).toFixed(1)}σ (${live.observed} cases against ${Number(live.expected).toFixed(1)} expected).`
                      }
                      return `Added ${d.injected} cases to ${name}, but nothing is above threshold there yet. Press "Run detection now".`
                    })}>
            {label('outbreak', 'Start outbreak')}
          </button>
        </section>

        <section className="panel">
          <div className="chart-head"><h3>Other controls</h3></div>
          <div className="demo-stack">
            <button className="btn btn-quiet btn-wide" disabled={!!busy}
                    onClick={() => run('scan', '/scan', d =>
                      d.newAlerts.length
                        ? `Scan complete — ${d.newAlerts.length} new alert${d.newAlerts.length === 1 ? '' : 's'} from ${fmt(d.examined)} records.`
                        : `Scan complete — ${fmt(d.examined)} records checked, nothing above threshold.`)}>
              {label('scan', 'Run detection now')}
            </button>
            <span className="demo-hint">Forces the scan that normally runs every five minutes.</span>

            <button className="btn btn-quiet btn-wide" disabled={!!busy}
                    onClick={() => run('traffic', '/traffic', d =>
                      `Added ${d.generated} patient record${d.generated === 1 ? '' : 's'} and ${d.pharmacySales ?? 0} pharmacy sale${d.pharmacySales === 1 ? '' : 's'}.`)}>
              {label('traffic', 'Add a minute of traffic')}
            </button>
            <span className="demo-hint">Useful if the board looks static while you talk.</span>

            <button className="btn btn-quiet btn-wide" disabled={!!busy} onClick={resetBoard}>
              {label('reset', 'Clear the board')}
            </button>
            <span className="demo-hint">Closes every open alert and job, withdraws advisories. Run this right before you present.</span>
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 'var(--s-4)' }}>
        <div className="chart-head">
          <h3>What just happened</h3>
          <span className="chart-sub">most recent first</span>
        </div>
        {log.length === 0 ? (
          <p className="chart-sub" style={{ margin: 0 }}>Nothing yet. Press a button above.</p>
        ) : (
          <div className="demo-log">
            {log.map(l => (
              <div key={l.id} className={l.ok ? 'demo-line' : 'demo-line bad'}>
                <time>{l.at}</time>
                <span>{l.text}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
