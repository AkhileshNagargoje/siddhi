import { useEffect, useState } from 'react'
import { supabase, isConfigured } from '../lib/supabase'
import { FESTIVAL, USERS } from '../config/festival'
import { SYNDROME_LABELS } from '../config/medical'
import { StatusBadge } from '../components/viz'

const OUTCOMES = [
  { id: 'fixed', label: 'Source found and fixed' },
  { id: 'nothing_found', label: 'Checked — nothing found' },
  { id: 'escalated', label: 'Needs escalation' },
]

const hhmm = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export default function CrewPage() {
  const [user, setUser] = useState(null)
  const [pin, setPin] = useState('')
  const [tasks, setTasks] = useState([])
  const [alerts, setAlerts] = useState([])
  const [resolving, setResolving] = useState(null)
  const [outcome, setOutcome] = useState('fixed')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!user || !isConfigured()) return
    let alive = true
    async function load() {
      const [tk, al] = await Promise.all([
        supabase.from('tasks').select('*').eq('assigned_unit', user.unit).order('created_at', { ascending: false }),
        supabase.from('alerts').select('*'),
      ])
      if (!alive) return
      if (tk.data) setTasks(tk.data)
      if (al.data) setAlerts(al.data)
    }
    load()
    const ch = supabase.channel('crew')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load).subscribe()
    const t = setInterval(load, 30_000)
    return () => { alive = false; supabase.removeChannel(ch); clearInterval(t) }
  }, [user])

  function login() {
    const u = USERS.find(u => u.pin === pin && u.role === 'crew')
    u ? setUser(u) : setPin('')
  }

  /* Must be awaited. A supabase query builder is lazy — it only issues the
     request when something consumes the promise. This was written as an
     expression-bodied arrow that returned the builder and dropped it, so
     Acknowledge looked responsive and silently did nothing: the row was never
     written, and the button stayed on Acknowledge forever. */
  async function ack(task) {
    const { error } = await supabase
      .from('tasks')
      .update({ ack_at: new Date().toISOString() })
      .eq('id', task.id)
    if (error) console.error('acknowledge failed:', error.message)
  }

  async function resolve(task) {
    await supabase.from('tasks').update({ resolved_at: new Date().toISOString(), outcome, note }).eq('id', task.id)
    await supabase.from('alerts').update({ status: 'resolved' }).eq('id', task.alert_id)
    setResolving(null); setNote(''); setOutcome('fixed')
  }

  if (!user) {
    return (
      <div className="login">
        <div className="login-card">
          <h2>Field crew sign in</h2>
          <p>Enter your 4-digit PIN</p>
          <input type="password" inputMode="numeric" maxLength={4} value={pin} autoFocus
                 aria-label="4-digit PIN"
                 onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                 onKeyDown={e => e.key === 'Enter' && login()} />
          <button className="btn btn-wide" onClick={login} disabled={pin.length !== 4}>Enter</button>
          <p>Demo PIN 3333</p>
        </div>
      </div>
    )
  }

  const open = tasks.filter(t => !t.resolved_at)

  return (
    <div className="crew">
      <div className="entry-bar">
        <div>
          <b>{user.name}</b>
          <small>{open.length} open {open.length === 1 ? 'job' : 'jobs'}</small>
        </div>
        <span className={open.length ? 'sync pending' : 'sync'}><i />{open.length ? 'action needed' : 'all clear'}</span>
      </div>

      {tasks.length === 0 && (
        <div className="empty">
          <svg viewBox="0 0 24 24" width="30" height="30" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5l5 5L20 6.5" />
          </svg>
          No jobs assigned right now.
        </div>
      )}

      {tasks.map(task => {
        const alert = alerts.find(a => a.id === task.alert_id)
        const sector = alert ? FESTIVAL.sectors.find(s => s.id === alert.sector) : null
        return (
          <div key={task.id} className={task.resolved_at ? 'job done' : 'job'}>
            <div className="job-head">
              <b>{alert ? `Sector ${alert.sector} — ${SYNDROME_LABELS[alert.syndrome] ?? alert.syndrome}` : 'Job'}</b>
              <time>{hhmm(task.created_at)}</time>
            </div>

            {alert && (
              <p>
                {alert.observed} cases against {Number(alert.expected).toFixed(1)} expected.
                {sector?.waterPoints.length > 0 && <> Check water points <b>{sector.waterPoints.join(', ')}</b>.</>}
                {sector?.kitchens.length > 0 && <> Kitchens <b>{sector.kitchens.join(', ')}</b>.</>}
              </p>
            )}

            {task.resolved_at ? (
              <div className="job-foot">
                <StatusBadge status="good" label="resolved" />
                <small>{OUTCOMES.find(o => o.id === task.outcome)?.label}{task.note && ` · “${task.note}”`}</small>
              </div>
            ) : !task.ack_at ? (
              <button className="btn btn-wide" onClick={() => ack(task)}>Acknowledge</button>
            ) : resolving === task.id ? (
              <div className="resolve">
                <select aria-label="What you found" value={outcome} onChange={e => setOutcome(e.target.value)}>
                  {OUTCOMES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <textarea rows={2} aria-label="Note on what you found" placeholder="One line — what did you find?"
                          value={note} onChange={e => setNote(e.target.value)} />
                <button className="btn btn-good btn-wide" onClick={() => resolve(task)}>Submit</button>
              </div>
            ) : (
              <div className="job-foot">
                <small>Acknowledged {hhmm(task.ack_at)}</small>
                <button className="btn" onClick={() => setResolving(task.id)}>Resolve</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
