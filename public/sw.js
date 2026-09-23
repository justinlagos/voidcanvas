// Voidcanvas service worker: makes the app work offline after the first visit.
// Pages are network-first (so updates arrive), build files and fonts are cache-first.
// Nothing here ever sends your images anywhere: it only caches the app itself.
const VERSION = 'vc-app-v1'
const CORE = ['/', '/editor', '/studio', '/effects', '/pdf.worker.min.mjs', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']
const CDN = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()))
})
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('vc-app-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const same = url.origin === self.location.origin
  if (!same && !CDN.includes(url.hostname)) return
  if (same && req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res })
      .catch(() => caches.match(req).then(r => r || caches.match('/editor') || caches.match('/'))))
    return
  }
  const immutable = !same || url.pathname.startsWith('/_next/static/')
  if (immutable) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)) } return res })))
    return
  }
  // Everything else: serve from cache straight away, refresh in the background.
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)) } return res }).catch(() => hit)
    return hit || net
  }))
})
