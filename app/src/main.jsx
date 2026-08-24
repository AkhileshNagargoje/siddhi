import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import App from './App.jsx'

/* One-time carry-over from the old project name.
 *
 * The rename moved every localStorage key from siddhi_* to atreya_*. On a
 * device that already has the app open, the two that matter are `siddhi_queue`
 * and `siddhi_ref_queue`: patients and referral cards a doctor recorded while
 * offline and that have not reached the server yet. A blind rename orphans
 * them — the new code looks under a key nothing ever wrote, finds an empty
 * queue, and those patients are gone with no error and no way to notice.
 *
 * This is the one failure this product exists to prevent, so it is worth the
 * fifteen lines. Only copies when the new key is absent, so it can never
 * clobber newer data, and it runs before React mounts and reads the queue.
 */
function carryOverFromOldName() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const oldKey = localStorage.key(i)
      if (!oldKey || !oldKey.startsWith('siddhi_')) continue
      const newKey = 'atreya_' + oldKey.slice('siddhi_'.length)
      if (localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, localStorage.getItem(oldKey))
      }
    }
    /* Second pass to delete: removing inside the index loop above would shift
       the indices and skip entries. */
    Object.keys(localStorage)
      .filter(k => k.startsWith('siddhi_'))
      .forEach(k => localStorage.removeItem(k))
  } catch {
    /* Private mode, or storage disabled. Nothing to carry over. */
  }
}
carryOverFromOldName()

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
