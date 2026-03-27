// Service Worker for FinTrack PWA
// Increment version to force cache refresh when needed
// IMPORTANT: Version is synced from version.json. Run: npm run sync-version
const CACHE_NAME = 'fintrack-v32'; // Increment this when deploying new version

// ─── Firebase Messaging (background push notifications) ───────────────────────
// Uses Firebase compat SDK so we can handle background messages in this SW.
// The config values are public — security is enforced by Firestore rules & Auth.
importScripts("https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAj_TioYX7kZsDm9uuKPVrf8BwuOmaN1hA",
  authDomain: "fin-track-adc2c.firebaseapp.com",
  projectId: "fin-track-adc2c",
  storageBucket: "fin-track-adc2c.firebasestorage.app",
  messagingSenderId: "185936461123",
  appId: "1:185936461123:web:90b48701c1a520457383f6",
  measurementId: "G-YRYCTR1THT",
});

const firebaseMessaging = firebase.messaging();

// Background messages — app is closed or in a background tab
firebaseMessaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "Pocket";
  const body  = payload.notification?.body  ?? "";
  const url   = payload.data?.url           ?? "/dashboard";

  self.registration.showNotification(title, {
    body,
    icon:  "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    tag:   payload.data?.tag ?? "pocket",
    renotify: true,
    data: { url },
  });
});
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Critical app shell URLs to pre-cache on install.
// These ensure the app loads instantly and navigates offline.
const PRECACHE_URLS = [
  '/',
  '/dashboard/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png?v=2.5',
  '/icons/icon-512x512.png?v=2.5',
];

// Install event - pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker installed with cache:', CACHE_NAME);
        // Pre-cache shell URLs; ignore individual failures so install always succeeds
        return Promise.allSettled(
          PRECACHE_URLS.map(url => cache.add(url).catch(() => {}))
        );
      })
  );
  // Don't skip waiting automatically - let user decide when to update
  // self.skipWaiting(); // Commented out to show update notification
});

// ─── Push notification click ──────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Always use absolute URL — required for iOS PWA and openWindow()
  const rawUrl = event.notification.data?.url ?? '/dashboard/';
  const absUrl = rawUrl.startsWith('http')
    ? rawUrl
    : self.registration.scope.replace(/\/$/, '') + rawUrl;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find(
        (c) => c.url.startsWith(self.registration.scope)
      );
      if (existing) {
        existing.focus();
        // navigate() not reliable on iOS — postMessage instead
        existing.postMessage({ type: 'NOTIFICATION_CLICK', url: absUrl });
        return;
      }
      clients.openWindow(absUrl);
    })
  );
});

// Listen for skip waiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Skipping waiting and activating new service worker');
    self.skipWaiting();
  }
});

// Fetch event - only cache static assets, not navigation requests
// Fetch event - cache static assets and handle offline navigation
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-http(s) requests (chrome-extension://, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle navigation requests (HTML pages)
  // Network first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // If not found in cache and network fails, show the offline page
              return caches.match('/offline.html')
                .then(response => {
                  if (response) return response;
                  // Final fallback to cached dashboard or home
                  return caches.match('/dashboard')
                    .then(r => r || caches.match('/'));
                });
            });
        })
    );
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
    // For non-static assets (API calls, external services), let the browser handle natively.
    // Do NOT call event.respondWith for cross-origin requests (Firestore streams, etc.)
    // or for same-origin API routes — just return and let the browser fetch normally.
    return;
  }
  
  // For icons and manifest, always fetch from network first to get latest version
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(
      fetch(request, {
        cache: 'no-store',
      }).then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.delete(request).then(() => {
              cache.put(request, responseToCache);
            });
          });
        }
        return response;
      }).catch(() => {
        return caches.match(request);
      })
    );
    return;
  }
  
  // For other static assets, Stale-While-Revalidate strategy
  // This is better for performance than Network-First for static assets
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
           if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
             const responseToCache = networkResponse.clone();
             caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
             });
           }
           return networkResponse;
        });

        // Return cached response immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise;
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
      // Delete ALL icon and manifest caches from ALL cache stores to force refresh
      // This ensures PWA installations get the latest icons
      return Promise.all([
        caches.open(CACHE_NAME).then((cache) => {
          return cache.keys().then((keys) => {
            return Promise.all(
              keys.map((key) => {
                const url = new URL(key.url);
                // Delete all icon and manifest entries (with or without query params)
                if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
                  console.log('Deleting cached icon/manifest:', url.pathname + url.search);
                  return cache.delete(key);
                }
              })
            );
          });
        }),
        // Also check and delete from any old cache stores
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((oldCacheName) => {
              if (oldCacheName !== CACHE_NAME) {
                return caches.open(oldCacheName).then((oldCache) => {
                  return oldCache.keys().then((keys) => {
                    return Promise.all(
                      keys.map((key) => {
                        const url = new URL(key.url);
                        if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
                          console.log('Deleting old cached icon/manifest from', oldCacheName, ':', url.pathname);
                          return oldCache.delete(key);
                        }
                      })
                    );
                  });
                });
              }
            })
          );
        })
      ]);
    }).then(() => {
      // Claim all clients immediately to activate the new service worker
      return self.clients.claim();
    })
  );
});

