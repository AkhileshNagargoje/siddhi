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
/* ?nosw is handled by an inline script in index.html, which runs even when the
   bundle itself cannot load — see the comment there. */
if ('serviceWorker' in navigator && location.search.indexOf('nosw') === -1) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* No offline shell. The app still works exactly as before. */
    })
  })
}
