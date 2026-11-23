/* Sierra Madre Seguridad Operativa - Service Worker (PWA) */
const CACHE_NAME = 'sm-seguridad-v15';
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
  '/departments.js',
  '/departments-ui.js',
  '/normative-library.js',
  '/library-page.js',
  '/normative-catalog.json',
  '/regulatory-core.js',
  '/training-suite.js',
  '/training-core.js',
  '/safety-suite-store.js',
  '/safety-talk-topics.json',
  '/integration.js',
  '/advanced-core.js',
  '/advanced-pdf.js',
  '/advanced-ui.js',
  '/phase3-ui.js',
  '/formats.js',
  '/extended-formats.js',
  '/report-pdf.js',
  '/workspace-pdf.js',
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
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('sm-seguridad-') && k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Operational responses and account data must never enter a shared static cache.
  if(url.pathname.startsWith('/api/')||url.search)return;
  const isAsset=url.pathname.startsWith('/assets/');
  if(!APP_SHELL.includes(url.pathname)&&!isAsset)return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(req);
      if(response.ok){
        const cache=await caches.open(CACHE_NAME);
        await cache.put(req,response.clone());
      }
      return response;
    }catch{
      const cache=await caches.open(CACHE_NAME);
      const cached=await cache.match(req);
      if(cached)return cached;
      // Do not substitute an HTML document for a missing module, image or PDF.
      return new Response('Sin conexión. Este recurso no está disponible en el dispositivo.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});
