import 'chart.js/auto';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import './utils/chartSetup';

// One-time cleanup of any stale static-site service worker or old shell cache
// without ever touching IndexedDB or localStorage user data.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const reg of registrations) {
            const scriptUrl =
              reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
            if (scriptUrl.endsWith('/sw-site.js')) {
              reg.unregister().catch(() => {});
            }
          }
        })
        .catch(() => {});

      if ('caches' in window) {
        caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter((key) => key.startsWith('nextgenai-') || key === 'eduledger-shell-v5')
                .map((key) => caches.delete(key))
            )
          )
          .catch(() => {});
      }
    } catch (err) {
      console.warn('[EduLedger] Non-fatal cache cleanup warning:', err);
    }
  });
}

// Register EduLedger's PWA Service Worker safely so SW issues never block rendering
try {
  registerSW({
    immediate: true,
    onOfflineReady() {
      console.info('EduLedger PWA: Ready for offline use.');
    },
    onNeedRefresh() {
      console.info('EduLedger PWA: New version available.');
    },
    onRegisterError(error) {
      console.warn('EduLedger PWA: Service Worker registration error:', error);
    },
  });
} catch (error) {
  console.warn('EduLedger PWA: Service Worker setup skipped:', error);
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
