/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Cache names
const CACHE_NAME = 'domino-omar-hashimi-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - Pre-cache essential static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Stale-While-Revalidate strategy
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Avoid caching browser extensions, dev servers hot-module scripts, or dynamic API routes if present
  if (
    url.protocol !== 'http:' && 
    url.protocol !== 'https:' ||
    event.request.url.includes('chrome-extension') ||
    event.request.url.includes('node_modules') ||
    event.request.url.includes('@vite') ||
    event.request.url.includes('__vite_ping')
  ) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // Fetch fresh resource in the background
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Check if we received a valid response
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // Offline fallback for navigations
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
          });

        // Return cached response instantly if available, otherwise wait for network fetch
        return cachedResponse || fetchPromise;
      });
    })
  );
});
