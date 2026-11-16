/* Sierra Madre Seguridad Operativa - Service Worker (PWA) */
const CACHE_NAME = 'sm-seguridad-v4';
const APP_SHELL = [
  '/',
  '/index.html',
  '/biblioteca-nom.html',
  '/supervisor.css',
  '/workspace.css',
  '/brand.css',
  '/phase3.css',
  '/manifest.webmanifest',
  '/firebase-auth.js',
  '/cloud-portal.js',
  '/cloud-live.js',
  '/cloud-sessions.js',
  '/session-clock.js',
  '/session-tracker.js',
  '/accounts-ui.js',
  '/supervisor.js',
  '/workspace.js',
  '/progress-core.js',
  '/normative-library.js',
  '/normative-catalog.json',
  '/regulatory-core.js',
  '/training-suite.js',
  '/training-core.js',
  '/safety-suite-store.js',
  '/safety-talk-topics.json',
  '/integration.js',
  '/phase3-ui.js',
  '/assets/sierra-madre.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-maskable-512.png',
  '/assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('/index.html') || caches.match('/biblioteca-nom.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
