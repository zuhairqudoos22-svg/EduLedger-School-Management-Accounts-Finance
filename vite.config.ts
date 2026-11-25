import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Serves EduLedger's PWA manifest, service worker, and cleanly retires any
 * stale `/sw-site.js` worker from prior sessions without touching user data.
 */
function pwaEndpointsPlugin(): Plugin {
  const publicDir = path.resolve(import.meta.dirname, 'public');

  return {
    name: 'eduledger-pwa-endpoints',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        const url = req.url.split('?')[0];

        if (url === '/manifest.json' || url === '/manifest.webmanifest') {
          const filePath = path.join(publicDir, url.slice(1));
          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(fs.readFileSync(filePath));
            return;
          }
        }

        if (url === '/sw.js') {
          const filePath = path.join(publicDir, 'sw.js');
          if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, max-age=0');
            res.end(fs.readFileSync(filePath));
            return;
          }
        }

        // Safely unregister any stale static-site service worker without clearing user data
        if (url === '/sw-site.js') {
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store, max-age=0');
          res.end(
            `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('nextgenai-')).map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
  );
});`
          );
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => ({
  plugins: [
    pwaEndpointsPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.ico',
        'icon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
        'browserconfig.xml',
        'manifest.json',
        'manifest.webmanifest',
        'screenshot-desktop.png',
        'screenshot-mobile.png',
        'assets/branding/nextgenai-logo-128.jpg',
        'assets/branding/nextgenai-logo-128.webp',
        'assets/branding/nextgenai-logo-256.jpg',
        'assets/branding/nextgenai-logo-256.webp',
        'assets/branding/nextgenai-logo-512.jpg',
        'assets/branding/nextgenai-logo-512.webp',
        'assets/branding/branding.js',
      ],
      manifest: {
        id: '/',
        name: 'EduLedger — School Management & Accounts',
        short_name: 'EduLedger',
        description:
          'Offline-first Progressive Web App for comprehensive school management, student/staff attendance, fee collection, expense tracking, and financial analytics.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        background_color: '#1E1B4B',
        theme_color: '#4F46E5',
        categories: ['education', 'finance', 'productivity', 'business'],
        lang: 'en',
        dir: 'ltr',
        orientation: 'any',
        prefer_related_applications: false,
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/favicon.ico',
            sizes: '32x32',
            type: 'image/x-icon',
            purpose: 'any',
          },
        ],
        shortcuts: [
          {
            name: 'Student Directory',
            short_name: 'Students',
            description: 'View and manage enrolled students',
            url: '/?tab=students',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Fee Collection',
            short_name: 'Fees',
            description: 'Collect tuition and issue receipts',
            url: '/?tab=fees',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Daily Attendance',
            short_name: 'Attendance',
            description: 'Mark student and staff attendance',
            url: '/?tab=attendance',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Financial Reports',
            short_name: 'Reports',
            description: 'View revenue, expenses and balance sheets',
            url: '/?tab=reports',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        screenshots: [
          {
            src: '/screenshot-desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'EduLedger Executive Dashboard & Accounts Summary',
          },
          {
            src: '/screenshot-mobile.png',
            sizes: '720x1280',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'EduLedger Mobile Portal & Fee Management',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json,xml,webp,jpg}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^(?!\/__).*/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
}));
