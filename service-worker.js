// sw.js
const CACHE_NAME = 'slkids-cache-v' + Date.now(); // unique name each build
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/classes.html',
  '/admin.html',
  '/mouse.html',
  '/data/mouse.json',
  '/classes.json',
  '/game-board.html',
  '/data/classes.json',
  '/data/lessons.json',
  '/mouse/year1.html',
  '/mouse/year2.html',
  '/mouse/year3.html',
  '/mouse/year4.html',
  '/mouse/year5.html',
  '/mouse/year6.html',
  '/mouse/year7.html',
  '/mouse/year8.html',
  '/mouse/year9.html',
  '/mouse/year10.html',
  '/mouse/year11.html',
  '/mouse/year12.html',
  '/record.html',
  'record.js',
  '/styles.css',
  '/auth js',
  '/script.js'
];

// Install: clear old caches, pre-cache new files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key))) // 🔥 delete everything
    ).then(() =>
      caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
    )
  );
  self.skipWaiting(); // force activate immediately
});

// Activate: claim clients & reload them
self.addEventListener('activate', event => {
  event.waitUntil(
    clients.claim().then(() =>
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(windowClients => {
          windowClients.forEach(client => client.navigate(client.url)); // 🔄 auto reload
        })
    )
  );
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
