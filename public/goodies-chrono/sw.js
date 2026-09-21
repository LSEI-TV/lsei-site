/* Service worker minimal — cache-first pour un fonctionnement hors ligne complet.
   Change CACHE_NAME pour forcer un refresh du cache après une release. */
const CACHE_NAME = 'goodies-chrono-v2';
const CORE_ASSETS = [
  '/goodies-chrono/',
  '/goodies-chrono/index.html',
  '/goodies-chrono/logo-lsei.png',
  '/goodies-chrono/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((resp) => {
          if (resp.ok && (req.url.startsWith(self.location.origin) || req.url.startsWith('https://fonts.g'))) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
          }
          return resp;
        })
        .catch(() => cached || new Response('', { status: 504 }));
    })
  );
});
