const CACHE_NAME = 'newspaper-cache-v1';
const ARTICLES_CACHE = 'articles-cache';
const STATIC_ASSETS = [
  '/index.html',
  '/favicon.ico',
  'icon/.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME && name !== ARTICLES_CACHE)
          .map(name => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Cache static assets
  if (STATIC_ASSETS.includes(url.pathname) || url.host === 'fonts.googleapis.com' || url.host === 'www.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(fetchResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  } else {
    // Handle dynamic content (e.g., Firebase Firestore requests)
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        return networkResponse;
      }).catch(() => {
        // Fallback to cached articles for offline mode
        return caches.match('/articles.json').then(response => {
          if (response) return response;
          return new Response(JSON.stringify({ error: 'Offline and no cached articles available' }), {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
    );
  }

});
