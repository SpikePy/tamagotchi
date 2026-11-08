// Service Worker: macht die App offline-fähig.
const CACHE = 'waldling-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const res = await fetch('./index.html', { cache: 'no-cache' });
      const html = await res.clone().text();
      await cache.put('./index.html', res);
      await cache.put('./', new Response(html, { headers: { 'Content-Type': 'text/html' } }));
      // gebaute Assets aus index.html vorab laden
      const assets = [...html.matchAll(/(?:src|href)="\.?\/?([^"]+\.(?:js|css|png|webmanifest))"/g)].map((m) => './' + m[1]);
      await cache.addAll([...new Set([...assets, './icons/icon-192.png', './icons/icon-512.png'])]);
      self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // Seite: erst Netz (für Updates), sonst Cache
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }
  // Assets: erst Cache, sonst Netz (und merken)
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => (list[0] ? list[0].focus() : self.clients.openWindow('./'))),
  );
});
