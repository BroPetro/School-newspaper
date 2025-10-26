const CACHE_NAME = 'newspaper-cache-v1';
const urlsToCache = [
  '/index.html',
  '/word.html',
  '/account.html',
  '/admin.html',
  '/login.html',
  '/register.html',
  '/manifest.json',
  '/icon.png',
  '/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) return response;
        return fetch(event.request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) return networkResponse;
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseToCache));
            return networkResponse;
          });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    })
  );
});