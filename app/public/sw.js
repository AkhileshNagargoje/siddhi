/* Siddhi — offline shell.
 *
 * WHY THIS EXISTS
 *
 * The entry screen already queues patients in localStorage when the network is
 * gone, which is the hard half of working offline. But it only helps a doctor
 * who already has the page open. Someone who opens the app cold on a saturated
 * festival network gets a blank screen, and the queue never gets a chance to
 * exist. This closes that gap: the app boots with no network at all.
 *
 * STRATEGY, AND WHY IT CANNOT SERVE A STALE DEMO
 *
 *   HTML  — network first, cache only as a fallback. A fresh deploy is always
 *           picked up the moment there is a network. This is the rule that
 *           makes a service worker safe to ship days before a demo.
 *   /assets/* — cache first. Vite content-hashes these filenames, so a given
 *           URL's bytes can never change. Stale is impossible by construction.
 *   everything else (Supabase, the detection engine) — untouched. Health data
 *           is never cached; a doctor must never read yesterday's alert as if
 *           it were live.
 */

const SHELL = 'siddhi-shell-v1'
const ASSETS = 'siddhi-assets-v2'   // v1 could hold poisoned entries; activate() drops it
const KEEP = new Set([SHELL, ASSETS])

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL)
      .then(c => c.addAll(['/', '/favicon.svg']))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())   // a failed precache must not wedge install
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !KEEP.has(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return

  let url
  try { url = new URL(req.url) } catch { return }
  if (url.origin !== self.location.origin) return   // Supabase and the engine pass straight through

  // Immutable, content-hashed build output.
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        /* Only cache something that is actually the asset.
           A single-page host answers an UNKNOWN /assets/ path with index.html —
           200 OK, Content-Type text/html. Caching that under a .js URL poisons
           the entry permanently: cache-first then serves HTML as a module on
           every future load, and the browser refuses it. That survives
           redeploys, so it is a self-inflicted outage, not a stale cache.
           Anything that claims to be HTML under /assets/ is that fallback. */
        const type = res.headers.get('Content-Type') || ''
        if (res.ok && !type.includes('text/html')) {
          const copy = res.clone()
          caches.open(ASSETS).then(c => c.put(req, copy))
        }
        return res
      }))
    )
    return
  }

  // Navigations: always try the network, so a new deploy wins immediately.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put('/', copy)) }
          return res
        })
        .catch(() => caches.match('/').then(hit => hit || new Response(
          '<!doctype html><meta charset=utf-8><title>Offline</title>' +
          '<body style="font:16px system-ui;padding:2rem;line-height:1.6">' +
          '<h1>No network</h1><p>Siddhi could not reach the server and has no saved copy yet. ' +
          'Open it once with a connection and it will work offline after that.</p>',
          { headers: { 'Content-Type': 'text/html' } }
        )))
    )
  }
})
