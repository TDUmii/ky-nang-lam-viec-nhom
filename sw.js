const CACHE_NAME = 'su-ky-mobile-v2-recall-20261107';
const CORE = [
  './', './index.html', './styles.css', './polish.css', './setup-modes.css',
  './mobile.css', './learning.css', './app.js', './bank.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png'
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('su-ky-mobile-') && key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)));
      }
      return response;
    }).catch(async () => {
      return (await caches.match(req)) ||
        (req.mode === 'navigate' ? await caches.match('./index.html') : undefined) ||
        Response.error();
    })
  );
});
