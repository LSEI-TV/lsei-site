/* Ancien service worker de /goodies-chrono/ — l'app a déménagé vers /nova/.
   Ce fichier « de nettoyage » remplace l'ancien sur les appareils qui l'avaient installé :
   il se désinstalle, vide les anciens caches et recharge les onglets ouverts (→ redirection vers /nova/). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('goodies-chrono')).map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
