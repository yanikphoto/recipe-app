// sw.js

const CACHE_NAME = 'nos-recettes-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json'
];

// Install event: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event: serve from cache, fallback to network, then cache network response
self.addEventListener('fetch', (event) => {
    // We only want to handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
        .then((response) => {
            if (response) {
                // Cache hit - return response
                return response;
            }

            // Not in cache - fetch from network
            return fetch(event.request).then(
                (networkResponse) => {
                    // Check if we received a valid response
                    if (!networkResponse || networkResponse.status !== 200) {
                        return networkResponse;
                    }

                    // Clone the response because it's a stream and can only be consumed once.
                    const responseToCache = networkResponse.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return networkResponse;
                }
            ).catch(error => {
                console.error('Fetch failed; app may be offline', error);
                // Optional: return a fallback offline page if one was cached, e.g., return caches.match('/offline.html');
            });
        })
    );
});
