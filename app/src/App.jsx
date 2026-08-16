import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
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
  return (
    <div className="home">
      <div className="home-inner">
        <h1>Drishti</h1>
        <p className="lede">Outbreak early warning for mass gatherings</p>
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
