// sw.js

const CACHE_NAME = 'nos-recettes-cache-v2';
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
  // Let the browser do its default thing for non-GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignore API calls, always go to network.
  if (event.request.url.includes('/api/')) {
    return;
  }

  // For navigation requests, serve the app shell.
  // This is a "cache, falling back to network" strategy for the app's main page.
  // It's crucial for single-page apps that use client-side routing.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((response) => {
        return response || fetch('/index.html');
      })
    );
    return;
  }

  // For all other requests (assets), use a "Cache First, then Network" strategy.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).then((networkResponse) => {
        // We only cache successful responses (status 200).
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});