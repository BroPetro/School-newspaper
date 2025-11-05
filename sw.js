const CACHE_NAME = 'newspaper-cache-v2'; // Оновлена версія для очищення старого кешу
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
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve(); // Повертаємо resolved Promise для пропущених кешів
        })
      ))
      .then(() => self.clients.claim())
      .catch((error) => {
        console.error('Activation failed:', error);
      })
  );
});

// Уніфікована функція для кешування успішної відповіді
const cacheSuccessfulResponse = (request, response, cache) => {
  if (response && response.status === 200 && response.type !== 'opaque') {
    const responseToCache = response.clone();
    cache.put(request, responseToCache);
  }
};

// Обробка запитів
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = request.url;

  // Визначення типу запиту
  const isFirebaseRequest = requestUrl.includes('firebasedatabase.app') ||
                            requestUrl.includes('firebasestorage.googleapis.com');

  // Пропускаємо не-GET запити та запити до chrome-extension
  if (request.method !== 'GET' || requestUrl.startsWith('chrome-extension://')) {
    return;
  }

  if (isFirebaseRequest) {
    // Стратегія: Network → Cache → Offline
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cacheSuccessfulResponse(request, networkResponse, cache);
          });
          return networkResponse;
        })
        .catch(() => caches.match(request)
          .then((cachedResponse) => cachedResponse || caches.match('/offline.html')))
    );
  } else {
    // Стратегія: Cache → Network → Offline (для статичних ресурсів)
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request)
            .then((networkResponse) => {
              caches.open(CACHE_NAME).then((cache) => {
                cacheSuccessfulResponse(request, networkResponse, cache);
              });
              return networkResponse;
            })
            .catch(() => caches.match('/offline.html'));
        })
    );
  }
});
