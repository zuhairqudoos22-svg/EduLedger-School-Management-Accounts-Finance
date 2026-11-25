/**
 * EduLedger PWA Service Worker
 * Ensures reliable installation, startup, and offline shell on Windows PC and Android devices.
 * Data Safety Guarantee: Uses Network-First for API and dynamic data so financial records are never stale.
 */

const CACHE_NAME = 'eduledger-shell-v8';

const STATIC_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/browserconfig.xml',
  '/screenshot-desktop.png',
  '/screenshot-mobile.png',
  '/assets/branding/nextgenai-logo-128.jpg',
  '/assets/branding/nextgenai-logo-128.webp',
  '/assets/branding/nextgenai-logo-256.jpg',
  '/assets/branding/nextgenai-logo-256.webp',
  '/assets/branding/nextgenai-logo-512.jpg',
  '/assets/branding/nextgenai-logo-512.webp',
  '/assets/branding/branding.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache static shell assets safely
      return cache.addAll(STATIC_SHELL_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching non-fatal warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Purge old cache generations
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests (e.g. POST, PUT, DELETE)
  if (request.method !== 'GET') {
    return;
  }

  // Navigation requests (HTML pages): Network-First, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Static assets (scripts, styles, fonts, images, webmanifest): Stale-While-Revalidate or Network-First
  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.ico') ||
      url.pathname.endsWith('.webmanifest') ||
      url.pathname.endsWith('.json') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.webp') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.jpeg'));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Google Fonts caching
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
        );
      })
    );
    return;
  }

  // All other requests (e.g. data, API calls): Network-First for total financial accuracy
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
