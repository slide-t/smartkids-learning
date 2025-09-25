// sw.js
const CACHE_NAME = 'slkids-cache-v' + Date.now();  // unique name each load
const PRECACHE_URLS = [
  '/',                 // adjust if app is not at root
  '/index.html',
  '/classes.html',
  '/game-board.html',
  '/data/classes.json',
  '/styles.css',
  '/script.js'
];

// Install: clear old caches, then pre-cache new
self.addEventListener('install', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key))) // 🔥 delete everything
    ).then(() =>
      caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
    )
  );
  self.skipWaiting();
});

// Activate: claim clients
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).then(response => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      return response;
    }).catch(() => caches.match(event.request))
  );
});
