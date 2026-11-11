const CACHE_NAME = 'goc-hoc-nhom-v1-20261111';
const CORE = [
  './', './index.html', './styles.css', './polish.css', './setup-modes.css',
  './mobile.css', './learning.css', './paper.css', './app.js', './bank.js', './manifest.webmanifest',
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
      keys.filter((key) => key.startsWith('goc-hoc-nhom-') && key !== CACHE_NAME).map((key) => caches.delete(key))
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
