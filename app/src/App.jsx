import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { supabase, isConfigured } from './lib/supabase'
import { Mark } from './components/Brand'
import EntryPage from './pages/EntryPage'
import DashboardPage from './pages/DashboardPage'
import CrewPage from './pages/CrewPage'
import ReferralPage from './pages/ReferralPage'
import ReplayPage from './pages/ReplayPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import DemoPage from './pages/DemoPage'
import AboutPage from './pages/AboutPage'
import './styles/tokens.css'
import './App.css'

const ROLES = [
  { to: '/entry', name: 'Health worker', desc: 'Record a patient in ten seconds', pin: 'PIN 1111' },
  { to: '/dashboard', name: 'Health official', desc: 'Live map, alerts, dispatch', pin: 'no PIN' },
  { to: '/crew', name: 'Field crew', desc: 'Accept and close jobs', pin: 'PIN 3333' },
  // "real" would be a false claim — the replay is a scripted scenario running
  // the live detection rule, and says so in its own footer.
  { to: '/replay', name: 'Replay an incident', desc: 'See an outbreak caught and closed', pin: '60 sec' },
]

function Home() {
  const [stats, setStats] = useState(null)

  /* Live proof, not decoration: the landing page states what the system is
     doing right now. HEAD requests with count only — no rows transferred. */
  useEffect(() => {
    if (!isConfigured()) return
    let alive = true
    async function load() {
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
      const [enc, alerts] = await Promise.all([
        supabase.from('encounters').select('id', { count: 'exact', head: true }).gte('ts', dayStart.toISOString()),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).neq('status', 'resolved'),
      ])
      if (alive) setStats({ patients: enc.count ?? 0, alerts: alerts.count ?? 0 })
    }
    load()
    const t = setInterval(load, 30_000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  return (
    <div className="home">
      <div className="home-inner">
        <header className="home-brand">
          <Mark size={30} />
          <span>Drishti</span>
        </header>

        <h1>See the outbreak<br />before it spreads.</h1>
        <p className="lede">
          Live disease surveillance for mass gatherings. Every clinic visit counted
          in real time, every anomaly flagged in minutes, every alert someone's job to close.
        </p>

        <div className={stats ? 'pulse show' : 'pulse'} aria-live="polite">
          <span className="pulse-dot" aria-hidden="true" />
          {stats
            ? <>Live now — <b>{stats.patients.toLocaleString()}</b> patients recorded today · <b>{stats.alerts}</b> open {stats.alerts === 1 ? 'alert' : 'alerts'}</>
            : 'Connecting to the live system…'}
        </div>

        <div className="roles">
          {ROLES.map(r => (
            <Link key={r.to} to={r.to} className="role">
              <span>
                <b>{r.name}</b>
                <small>{r.desc}</small>
              </span>
              <kbd>{r.pin}</kbd>
            </Link>
          ))}
        </div>

        <footer className="home-foot">
          Built for Kumbh-scale gatherings · config-driven for any mass event
          · <Link to="/about">about the project</Link>
        </footer>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/entry" element={<EntryPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/crew" element={<CrewPage />} />
        <Route path="/r" element={<ReferralPage />} />
        <Route path="/replay" element={<ReplayPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
