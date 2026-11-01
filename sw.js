// sw.js - Firestore Version
const CACHE_NAME = 'nos-recettes-firestore-v4';

// Install event: force immediate takeover
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event: clean up ALL old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Network-first so updates are seen instantly
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // For page navigation and scripts, always fetch fresh from network
  if (event.request.mode === 'navigate' || event.request.destination === 'script' || event.request.destination === 'style') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets (images, fonts)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return res;
      });
    })
  );
});
