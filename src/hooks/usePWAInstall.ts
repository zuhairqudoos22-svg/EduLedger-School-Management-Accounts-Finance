import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
    __isPWAInstalled?: boolean;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined') {
      return window.__pwaInstallPrompt || null;
    }
    return null;
  });

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      window.__isPWAInstalled === true
    );
  });

  const [platformInfo, setPlatformInfo] = useState({
    isWindows: false,
    isEdge: false,
    isChrome: false,
    isAndroid: false,
    isIOS: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect user platform & browser for tailored Windows/Android experience
    const ua = window.navigator.userAgent;
    const isWin = /windows/i.test(ua);
    const isEdg = /edg\//i.test(ua);
    const isChr = /chrome/i.test(ua) && !isEdg;
    const isAnd = /android/i.test(ua);
    const isApple = /iphone|ipad|ipod/i.test(ua);

    setPlatformInfo({
      isWindows: isWin,
      isEdge: isEdg,
      isChrome: isChr,
      isAndroid: isAnd,
      isIOS: isApple,
    });

    const checkInstalledState = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        window.__isPWAInstalled === true;
      setIsInstalled(standalone);
    };

    checkInstalledState();

    // Check media query changes (e.g. app launched or switched to standalone)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    };
    mediaQuery.addEventListener?.('change', handleMediaChange);

    // Event handler for native beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__pwaInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    // Event handler for custom early-captured prompt
    const handleCustomPromptAvailable = (e: Event) => {
      const customEvt = e as CustomEvent<BeforeInstallPromptEvent>;
      const promptEvent = customEvt.detail || window.__pwaInstallPrompt;
      if (promptEvent) {
        setDeferredPrompt(promptEvent);
      }
    };

    // Event handler when app installation completes successfully
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__pwaInstallPrompt = null;
      window.__isPWAInstalled = true;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-available', handleCustomPromptAvailable);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-installed-success', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener?.('change', handleMediaChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-available', handleCustomPromptAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-installed-success', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const promptEvent =
      deferredPrompt || (typeof window !== 'undefined' ? window.__pwaInstallPrompt : null);

    if (!promptEvent) {
      return 'unavailable';
    }

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') {
          window.__pwaInstallPrompt = null;
          window.__isPWAInstalled = true;
        }
        return 'accepted';
      }
      return 'dismissed';
    } catch (err) {
      console.warn('[PWA] Installation prompt error:', err);
      return 'unavailable';
    }
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isWindows: platformInfo.isWindows,
    isEdge: platformInfo.isEdge,
    isChrome: platformInfo.isChrome,
    isAndroid: platformInfo.isAndroid,
    isIOS: platformInfo.isIOS,
    install,
  };
}
