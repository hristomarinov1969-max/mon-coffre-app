// Mon Coffre V8.3 — mise à jour du cache des fichiers publics uniquement.
// Les fiches chiffrées restent dans le stockage local, hors de ce cache.
const CACHE = 'moncoffre-marse-v9-5-4-docs';
const ASSETS = ['./index.html', './manifest.webmanifest', './icon-192-v9-2-final.png', './icon-512-v9-2-final.png', './icon-192-v9-1.png', './icon-512-v9-1.png', './version.json'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Revalider les ressources lors de l'installation du nouveau service worker.
    await Promise.all(ASSETS.map(async path => {
      const request = new Request(path, {cache: 'reload'});
      const response = await fetch(request);
      if (!response.ok) throw new Error('Ressource indisponible: ' + path);
      await cache.put(new URL(path, self.registration.scope).href, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('moncoffre-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  const isNavigation = request.mode === 'navigate' && url.pathname.startsWith(new URL('./', self.registration.scope).pathname);
  const isAppAsset = ASSETS.some(path => new URL(path, self.registration.scope).pathname === url.pathname);
  if (!isNavigation && !isAppAsset) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const fallbackKey = isNavigation ? new URL('./index.html', self.registration.scope).href : url.href;
    try {
      const response = await fetch(request, {cache: 'no-store'});
      if (response.ok) await cache.put(fallbackKey, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(fallbackKey);
      if (cached) return cached;
      throw error;
    }
  })());
});

// Accept an explicit update request if a worker is waiting.
self.addEventListener('message', event => {if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();});
