const CACHE_NAME = 'newspaper-cache-v2'; // Оновлено версію для очищення старого кешу
const urlsToCache = [
  '/',
  '/index.html',
  '/word.html',
  '/account.html',
  '/admin.html',
  '/login.html',
  '/register.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  '/offline.html' // Додано офлайн-сторінку
];

// Встановлення сервіс-воркера: кешування статичних ресурсів
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache failed during install:', error);
      })
  );
  // Активувати сервіс-воркер одразу після встановлення
  self.skipWaiting();
});

// Активація: очищення старого кешу
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      // Активувати новий сервіс-воркер для всіх клієнтів
      return self.clients.claim();
    })
    .catch((error) => {
      console.error('Activation failed:', error);
    })
  );
});

// Обробка запитів
self.addEventListener('fetch', (event) => {
  // Перевірка, чи запит стосується Firebase (динамічні дані)
  const isFirebaseRequest = event.request.url.includes('firebasedatabase.app') ||
                           event.request.url.includes('firebasestorage.app');

  if (isFirebaseRequest) {
    // Для Firebase використовуємо "Network, falling back to cache"
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Кешуємо успішну відповідь
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Якщо мережа недоступна, повертаємо з кешу
          return caches.match(event.request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('/offline.html');
            });
        })
    );
  } else {
    // Для статичних ресурсів використовуємо "Cache, falling back to network"
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              }
              return networkResponse;
            })
            .catch(() => {
              return caches.match('/offline.html');
            });
        })
    );
  }
});
