import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isConfigured } from '../lib/supabase'
import { STALLS, STALL_ITEMS, USERS } from '../config/festival'
import { uuid } from '../lib/uuid'

/* The second signal's entry point.
 *
 * People buy rehydration before they consult anyone, so this stream leads the
 * clinical one by hours — and it catches the people who never reach a clinic at
 * all, which is the surveillance system's largest blind spot.
 *
 * Until now this data only existed because the engine generated it. A stall
 * keeper had no way to report a sale, so "second independent signal" was
 * architecture we could describe rather than a channel anyone could use.
 *
 * DESIGNED FOR A SHOPKEEPER, NOT A CLINICIAN
 *
 * The reader is behind a counter, mid-transaction, and is doing us a favour.
 * So: no free text, no diagnosis, no patient. Tap a count, press send, done —
 * and the same offline queue as the clinic form, because the stalls sit on the
 * same saturated network the clinics do.
 */

const QUEUE_KEY = 'siddhi_stall_queue'
const loadQueue = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') } catch { return [] } }
const saveQueue = q => localStorage.setItem(QUEUE_KEY, JSON.stringify(q))

const STEPS = [1, 2, 5, 10]
const EMPTY = Object.fromEntries(STALL_ITEMS.map(i => [i.id, 0]))

export default function StallPage() {
  const [user, setUser] = useState(null)
  const [pin, setPin] = useState('')
  const [counts, setCounts] = useState(EMPTY)
  const [flash, setFlash] = useState(false)
  const [queue, setQueue] = useState(loadQueue)
  const [sent, setSent] = useState(() => Number(localStorage.getItem('siddhi_stall_sent') ?? 0))
  const busy = useRef(false)

  const stall = user ? STALLS.find(s => s.id === user.stallId) : null

  /* Same contract as the clinic form: the tally is saved locally the moment it
     is pressed, and a loop pushes it up. A keeper is never made to wait on a
     network, and a failed push is retried rather than lost. */
  const flush = useCallback(async () => {
    if (busy.current || !isConfigured()) return
    const batch = loadQueue()
    if (!batch.length) return
    busy.current = true
    try {
      const { error } = await supabase
        .from('pharmacy_sales')
        .upsert(batch, { onConflict: 'id', ignoreDuplicates: true })
      if (!error || error.code === '23505') {
        const done = new Set(batch.map(r => r.id))
        const rest = loadQueue().filter(r => !done.has(r.id))
        const n = Number(localStorage.getItem('siddhi_stall_sent') ?? 0) + batch.length
        localStorage.setItem('siddhi_stall_sent', String(n))
        setSent(n); saveQueue(rest); setQueue(rest)
      }
    } catch {
      /* Network dropped — keep the queue, retry on the next tick. */
    } finally {
      busy.current = false
    }
  }, [])

  useEffect(() => {
    const t = setInterval(flush, 5000)
    window.addEventListener('online', flush)
    return () => { clearInterval(t); window.removeEventListener('online', flush) }
  }, [flush])

  function login() {
    const u = USERS.find(u => u.pin === pin && u.role === 'stall')
    u ? setUser(u) : setPin('')
  }

  const bump = (item, by) =>
    setCounts(c => ({ ...c, [item]: Math.max(0, Math.min(999, c[item] + by)) }))

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  function send() {
    if (!total) return
    const ts = new Date().toISOString()
    /* One row per item, matching what the engine already reads. A zero is not
       sent: "no ORS sold" and "did not report" are different facts, and only
       the second should make a stall look quiet. */
    const rows = STALL_ITEMS
      .filter(i => counts[i.id] > 0)
      .map(i => ({
        id: uuid(),
        ts,
        sector: stall.sector,
        stall_id: stall.id,
        item: i.id,
        qty: counts[i.id],
        simulated: false,
      }))
    const q = [...loadQueue(), ...rows]
    saveQueue(q); setQueue(q)
    flush()
    setCounts(EMPTY)
    setFlash(true); setTimeout(() => setFlash(false), 1200)
  }

  if (!user) {
    return (
      <div className="login">
        <div className="login-card">
          <h2>Medicine stall sign in</h2>
          <p>Enter your 4-digit PIN</p>
          <input type="password" inputMode="numeric" maxLength={4} value={pin} autoFocus
                 aria-label="4-digit PIN"
                 onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                 onKeyDown={e => e.key === 'Enter' && login()} />
          <button className="btn btn-wide" onClick={login} disabled={pin.length !== 4}>Enter</button>
          <p>Demo PIN 4444</p>
        </div>
      </div>
    )
  }

  return (
    <div className="entry">
      <div className="entry-bar">
        <div>
          <Link to="/" className="brand"><b>{stall?.name}</b></Link>
          <small>Sector {stall?.sector}</small>
        </div>
        <span className={queue.length ? 'sync pending' : 'sync'}>
          <i />{sent + queue.length} sent{queue.length ? ` · ${queue.length} waiting` : ''}
        </span>
      </div>

      <p className="stall-lede">
        How many did you sell since your last report? This is counted by area,
        never by customer — no names, nothing about who bought anything.
      </p>

      {STALL_ITEMS.map(item => (
        <div className="stall-row" key={item.id}>
          <div className="stall-name">
            <b>{item.en}</b>
            <small>{item.hi} · {item.mr}</small>
          </div>
          <div className="stall-count" aria-live="polite">{counts[item.id]}</div>
          <div className="stall-steps">
            {STEPS.map(n => (
              <button key={n} className="chip" onClick={() => bump(item.id, n)}
                      aria-label={`Add ${n} ${item.en}`}>+{n}</button>
            ))}
            <button className="chip stall-clear" onClick={() => bump(item.id, -counts[item.id])}
                    disabled={!counts[item.id]} aria-label={`Clear ${item.en}`}>clear</button>
          </div>
        </div>
      ))}

      <div className="savebar">
        <button className={`btn btn-wide${flash ? ' btn-good' : ''}`} disabled={!total} onClick={send}>
          {flash ? '✓ Sent — thank you' : total ? `Send ${total} item${total === 1 ? '' : 's'}` : 'Nothing to send yet'}
        </button>
      </div>
    </div>
  )
}
