import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { supabase, isConfigured } from './lib/supabase'
import { Mark } from './components/Brand'
import { ErrorBoundary } from './components/ErrorBoundary'

/* Per-route document title.
   A judge ends the evening with a dozen tabs open and every one of them saying
   "Atreya". Naming the screen in the tab is the cheapest possible way to stay
   findable, and it is also what a screen reader announces on navigation. */
const TITLES = {
  '/': 'Atreya — outbreak early warning',
  '/entry': 'Record a patient · Atreya',
  '/dashboard': 'Control room · Atreya',
  '/crew': 'Response crew · Atreya',
  '/r': 'Referral card · Atreya',
  '/replay': 'An outbreak, caught · Atreya',
  '/demo': 'Demo console · Atreya',
  '/about': 'About Atreya',
  '/public': 'Health information · Atreya',
  '/stall': 'Medicine stall · Atreya',
  '/insights': 'In-depth analysis · Atreya',
}

function Title() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = TITLES[pathname] ?? TITLES['/']
  }, [pathname])
  return null
}

/* Splitting a bundle introduces a failure mode a single bundle does not have.
   Vite content-hashes every chunk, so after a deploy the OLD index.js in an
   already-open tab asks for chunk names that no longer exist. The server answers
   an unknown /assets/ path with index.html, the browser refuses it as a module,
   and the route hard-crashes into the error boundary.

   That is precisely the tab someone has left open while presenting. So a failed
   chunk fetch reloads the page once — which pulls fresh HTML and therefore the
   correct chunk names. The sessionStorage flag makes it strictly once, so a
   genuinely offline user gets the offline shell instead of a reload loop. */
const RETRIED = 'atreya_chunk_retry'

/* sessionStorage throws, it does not return null, when storage is denied —
   Safari Lockdown, "block all cookies", a third-party iframe. An unguarded
   read on the SUCCESS path would turn a chunk that loaded perfectly into a
   rejected promise and crash every route into the error boundary. */
const flag = {
  get()   { try { return sessionStorage.getItem(RETRIED) } catch { return 'blocked' } },
  set()   { try { sessionStorage.setItem(RETRIED, '1') } catch { /* no retry available */ } },
  clear() { try { sessionStorage.removeItem(RETRIED) } catch { /* nothing to clear */ } },
}

function route(load) {
  return lazy(() =>
    load()
      .then(m => { flag.clear(); return m })   // disarm only on a REAL success
      .catch(err => {
        /* If storage is blocked, get() returns 'blocked' — truthy — so we
           rethrow instead of reloading. A visible error beats a silent loop. */
        if (flag.get()) throw err
        flag.set()
        window.location.reload()
        return new Promise(() => {})    // hold the render until the reload lands
      })
  )
}

/* Split per route. This product's whole premise is working on a saturated
   festival network, so a doctor's phone should not download the control room's
   charts, the replay's animation and the QR encoder just to record a patient.
   Each screen now fetches only its own code. */
const EntryPage = route(() => import('./pages/EntryPage'))
const DashboardPage = route(() => import('./pages/DashboardPage'))
const CrewPage = route(() => import('./pages/CrewPage'))
const ReferralPage = route(() => import('./pages/ReferralPage'))
const ReplayPage = route(() => import('./pages/ReplayPage'))
const DemoPage = route(() => import('./pages/DemoPage'))
const AboutPage = route(() => import('./pages/AboutPage'))
const PublicPage = route(() => import('./pages/PublicPage'))
const InsightsPage = route(() => import('./pages/InsightsPage'))
const StallPage = route(() => import('./pages/StallPage'))
import './styles/tokens.css'
import './App.css'

/* Landing cards only. /crew and /replay are deliberately NOT listed — they are
   still routed and still work by URL, because the demo drives the crew screen
   from a second phone and falls back to the replay if the network dies. This
   list is what a first-time visitor should be pointed at, not a site map. */
const ROLES = [
  { to: '/entry', name: 'Health worker', desc: 'Record a patient in ten seconds', pin: 'PIN 1111' },
  { to: '/dashboard', name: 'Health official', desc: 'Live map, alerts, dispatch, in-depth analysis', pin: 'no PIN' },
  /* The pilgrim page is normally reached by scanning a poster in a sector, so
     nothing in the app linked to it and it was unreachable to anyone who did
     not already know the URL. It is the only role with no login at all. */
  { to: '/public', name: 'Pilgrim', desc: 'What a visitor sees — no app, no login', pin: 'open' },
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
          <span>Atreya</span>
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
      {/* Deliberately plain: a spinner that appears for 80ms reads as jank.
          A quiet line that only shows if the chunk is genuinely slow is calmer,
          which matters most on exactly the connection this is built for. */}
      <Title />
      <Suspense fallback={<div className="route-wait">Loading…</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/entry" element={<EntryPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/crew" element={<CrewPage />} />
        <Route path="/r" element={<ReferralPage />} />
        <Route path="/replay" element={<ReplayPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/public" element={<PublicPage />} />
        <Route path="/stall" element={<StallPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
