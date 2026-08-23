import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)


/* Register the offline shell. Deliberately after load, so it never competes
   with the first paint on the slow connection it exists to survive.

   Escape hatch: open the app with ?nosw to tear it out entirely. If anything
   about caching ever looks wrong five minutes before a demo, that is the fix. */
if ('serviceWorker' in navigator) {
  if (new URLSearchParams(location.search).has('nosw')) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))
    caches.keys().then(ks => ks.forEach(k => caches.delete(k)))
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* No offline shell. The app still works exactly as before. */
      })
    })
  }
}
