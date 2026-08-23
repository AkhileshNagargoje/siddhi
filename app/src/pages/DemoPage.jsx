import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FESTIVAL } from '../config/festival'
import { supabase, isConfigured } from '../lib/supabase'

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

  useEffect(() => () => { alive.current = false }, [])

  /* A small live readout, so the presenter can see the state they are about to
     change without switching tabs to the dashboard. */
  const refresh = useCallback(async () => {
    if (!isConfigured()) return
    const since = new Date(Date.now() - 6 * 3600_000).toISOString()
    const [enc, open, pharm] = await Promise.all([
      supabase.from('encounters').select('id', { count: 'exact', head: true }).gte('ts', since),
      supabase.from('alerts').select('id', { count: 'exact', head: true }).neq('status', 'resolved'),
      supabase.from('pharmacy_signals').select('sector').eq('elevated', true),
    ])
    if (!alive.current) return
    setLive({
      recent: enc.count ?? 0,
      openAlerts: open.count ?? 0,
      pharmacy: pharm.data?.length ?? 0,
    })
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 15_000)
    return () => clearInterval(t)
  }, [refresh])

  function note(entry) {
    setLog(l => [{ ...entry, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }, ...l].slice(0, 6))
  }

  async function run(key, path, describe) {
    if (busy) return                       // never two at once
    setBusy(key)
    try {
      const res = await fetch(`${ENGINE}${path}`)
      if (!res.ok) throw new Error(`engine returned ${res.status}`)
      const data = await res.json()
      note({ ok: true, text: describe(data) })
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
      const { data, error } = await supabase.from('alerts')
        .update({ status: 'resolved', advisory: null, advisory_at: null, advisory_by: null })
        .neq('status', 'resolved').select('id')
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
              <span>Sector</span>
              <select value={sector} onChange={e => setSector(Number(e.target.value))}>
                {FESTIVAL.sectors.map(s => <option key={s.id} value={s.id}>{s.id} — {s.name}</option>)}
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
          <button className="btn btn-accent btn-wide" disabled={!!busy}
                  onClick={() => run('outbreak', `/outbreak?sector=${sector}&n=${size}`,
                    d => {
                      const mine = d.scan?.newAlerts?.filter(a => a.sector === sector) ?? []
                      const hit = mine[0]
                      return hit
                        ? `Outbreak in ${FESTIVAL.sectors.find(s => s.id === sector)?.name} — alert raised at ${hit.z}σ (${hit.observed} cases against ${hit.expected} expected).`
                        : `Added ${d.injected} cases to sector ${d.sector}. No new alert yet — one may already be open there, or run a scan.`
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
            {log.map((l, i) => (
              <div key={i} className={l.ok ? 'demo-line' : 'demo-line bad'}>
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
