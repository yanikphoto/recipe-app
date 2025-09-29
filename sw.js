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
      .then(() => self.skipWaiting()) // Force the waiting service worker to become the active service worker.
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
    }).then(() => self.clients.claim()) // Become the service worker for all open clients.
  );
});

// Fetch event: Apply different caching strategies
self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests and API calls
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  // For navigation requests, use a network-first strategy to ensure users get the latest version.
  // Fallback to cache for offline, and serve index.html for SPA sub-routes.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If the request fails (e.g., 404), serve the main index.html for SPA routing.
          if (!response.ok) {
            console.log(`Service Worker: Serving index.html for failed navigation to ${event.request.url}`);
            return caches.match('/index.html');
          }
          // If successful, cache the response and return it.
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          return response;
        })
        .catch(() => {
          // If the network is unavailable, try to serve the request from cache.
          // If it's not in the cache, fallback to the main index.html.
          return caches.match(event.request)
            .then(response => response || caches.match('/index.html'));
        })
    );
    return;
  }

  // For all other requests (assets like CSS, JS, images), use a cache-first strategy.
  event.respondWith(
    caches.match(event.request).then(response => {
      // Return from cache if available.
      if (response) {
        return response;
      }
      // Otherwise, fetch from network, cache, and return.
      return fetch(event.request).then(networkResponse => {
        // Only cache valid, same-origin responses.
        if (networkResponse && networkResponse.ok && new URL(event.request.url).origin === self.location.origin) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});