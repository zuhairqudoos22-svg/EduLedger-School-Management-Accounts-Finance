/* NextGenAI Static Portfolio — Lightweight Offline-Friendly Service Worker */
const CACHE_NAME = 'nextgenai-portfolio-v1';

const CORE_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/theme-init.js',
  './js/site-data.js',
  './js/firebase-config.js',
  './js/app.js',
  './assets/favicon/site.webmanifest',
  './assets/favicon/favicon.ico',
  './assets/favicon/favicon-32x32.png',
  './assets/favicon/apple-touch-icon.png',
  './assets/logo/nextgenai-logo-128.webp',
  './assets/logo/nextgenai-logo-128.jpg',
  './assets/logo/nextgenai-logo-256.webp',
  './assets/logo/nextgenai-logo-256.jpg',
  './assets/logo/nextgenai-logo-512.webp',
  './assets/logo/nextgenai-logo-512.jpg',
  './assets/images/eduledger-preview.webp',
  './assets/images/eduledger-preview.jpg',
  './assets/images/invoice-generator-preview.webp',
  './assets/images/invoice-generator-preview.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML & site-data.js so edits show up quickly while remaining offline-safe
  const isFreshPreferred =
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('/site-data.js') ||
    url.pathname.endsWith('/index.html');

  if (isFreshPreferred) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for static styles, scripts, logos, and compressed previews
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
