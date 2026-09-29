/* Service worker — la page (HTML) est chargée en RÉSEAU D'ABORD : chaque appareil connecté
   reçoit tout de suite la dernière version ; la copie en cache ne sert qu'hors ligne.
   Les autres fichiers (logo, manifest, polices) restent en cache d'abord.
   Change CACHE_NAME à chaque release (et APP_VERSION dans index.html). */
const CACHE_NAME = 'goodies-chrono-v47';
const CORE_ASSETS = [
  '/goodies-chrono/',
  '/goodies-chrono/index.html',
  '/goodies-chrono/logo-lsei.png',
  '/goodies-chrono/manifest.webmanifest',
  '/goodies-chrono/icons/nova-192.png',
  '/goodies-chrono/icons/nova-512.png',
  '/goodies-chrono/icons/nova-favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // cache: 'reload' → ignore le cache HTTP du navigateur, on prend la version du serveur
      .then((cache) => cache.addAll(CORE_ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .catch(() => {})
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

function isPage(req) {
  return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Page : réseau d'abord, cache en secours (hors ligne)
  if (isPage(req)) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
          }
          return resp;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('/goodies-chrono/index.html')))
    );
    return;
  }

  // Autres fichiers : cache d'abord
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
        .catch(() => new Response('', { status: 504 }));
    })
  );
});
