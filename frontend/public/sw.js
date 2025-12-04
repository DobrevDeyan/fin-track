// Service Worker for FinTrack PWA
// Increment version to force cache refresh when needed
const CACHE_NAME = 'fintrack-v4';
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Install event - cache static assets only
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker installed');
        // Don't cache HTML pages during install - let them be fetched fresh
        return Promise.resolve();
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Fetch event - only cache static assets, not navigation requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip navigation requests (HTML pages) - let them go to network
  // This prevents Safari redirect errors
  if (request.mode === 'navigate') {
    // Always fetch navigation requests from network
    event.respondWith(fetch(request));
    return;
  }
  
  // Only cache static assets (JS, CSS, images, fonts, etc.)
  const isStaticAsset = 
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.eot') ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/');
  
  if (!isStaticAsset) {
    // For non-static assets, just fetch from network
    event.respondWith(fetch(request));
    return;
  }
  
  // For icons and manifest, always fetch from network first to get latest version
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(
      fetch(request).then((response) => {
        // Cache the new version
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // Fallback to cache if network fails
        return caches.match(request);
      })
    );
    return;
  }
  
  // For other static assets, try cache first, then network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request).then((response) => {
          // Only cache successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response before caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          
          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, return a basic response
        return fetch(request);
      })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim all clients immediately to activate the new service worker
      return self.clients.claim();
    })
  );
});

