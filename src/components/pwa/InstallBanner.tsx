import React, { useState, useEffect, useCallback } from 'react';
import { Download, Sparkles, X } from 'lucide-react';
import { EduLedgerLogo } from '../common/EduLedgerLogo';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
    __isPWAInstalled?: boolean;
  }
}

interface InstallBannerProps {
  className?: string;
}

/**
 * Checks whether the app is currently installed and running in standalone display mode
 */
const checkIsInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.__isPWAInstalled === true) return true;
  if ((window.navigator as unknown as { standalone?: boolean })?.standalone === true) return true;
  if (typeof window.matchMedia === 'function') {
    try {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches
      );
    } catch {
      return false;
    }
  }
  return false;
};

export const InstallBanner: React.FC<InstallBannerProps> = ({ className = '' }) => {
  // Check if app is already running in standalone PWA mode
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkIsInstalled());

  // Track availability of the install prompt (captured early via pwa-prompt-available or beforeinstallprompt)
  const [hasPrompt, setHasPrompt] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.__pwaInstallPrompt);
  });

  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Refresh installed status
    setIsInstalled(checkIsInstalled());

    // Check if prompt was already stored on window before mount
    if (window.__pwaInstallPrompt) {
      setHasPrompt(true);
    }

    // Listener for custom 'pwa-prompt-available' dispatched in index.html
    const handlePromptAvailable = (e: Event) => {
      const customEvent = e as CustomEvent<BeforeInstallPromptEvent>;
      if (customEvent && customEvent.detail) {
        window.__pwaInstallPrompt = customEvent.detail;
      }
      setHasPrompt(Boolean(window.__pwaInstallPrompt || customEvent?.detail));
    };

    // Standard Chromium beforeinstallprompt fallback listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.__pwaInstallPrompt = e as BeforeInstallPromptEvent;
      setHasPrompt(true);
    };

    // App installed event listener
    const handleAppInstalled = () => {
      setIsInstalled(true);
      window.__isPWAInstalled = true;
      window.__pwaInstallPrompt = null;
      setHasPrompt(false);
    };

    // Listen to media query changes (e.g. display-mode changes)
    let mediaQuery: MediaQueryList | null = null;
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        window.__isPWAInstalled = true;
        setHasPrompt(false);
      }
    };

    if (typeof window.matchMedia === 'function') {
      try {
        mediaQuery = window.matchMedia('(display-mode: standalone)');
        mediaQuery.addEventListener?.('change', handleMediaChange);
      } catch {
        // matchMedia event listener not supported in this environment
      }
    }

    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-installed-success', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-installed-success', handleAppInstalled);
      if (mediaQuery) {
        try {
          mediaQuery.removeEventListener?.('change', handleMediaChange);
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, []);

  // Handler for 'Install EduLedger' button - triggers window.__pwaInstallPrompt.prompt()
  const handleInstallClick = useCallback(async () => {
    if (typeof window === 'undefined' || !window.__pwaInstallPrompt) return;

    setIsInstalling(true);
    try {
      const promptResult = window.__pwaInstallPrompt.prompt();
      if (promptResult && typeof (promptResult as Promise<void>).then === 'function') {
        await promptResult;
      }
      const choice = await window.__pwaInstallPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setIsInstalled(true);
        window.__isPWAInstalled = true;
        window.__pwaInstallPrompt = null;
        setHasPrompt(false);
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    } finally {
      setIsInstalling(false);
    }
  }, []);

  // Only display when the app is not already installed and the prompt is available and not dismissed
  if (isInstalled || !hasPrompt || isDismissed) {
    return null;
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/95 via-sky-50/90 to-purple-50/95 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-purple-950/40 dark:border-indigo-800/50 p-4 shadow-sm backdrop-blur-md transition-all duration-300 ${className}`}
      role="banner"
      aria-label="EduLedger Installation Banner"
      data-testid="pwa-install-banner"
    >
      {/* Decorative background accent */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left Side: Icon & Information */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex-shrink-0">
            <EduLedgerLogo
              src="/pwa-192x192.png"
              alt="EduLedger App Logo"
              size={48}
              className="w-12 h-12 rounded-2xl shadow-md object-contain border border-indigo-200/60 dark:border-indigo-700/60"
              fallbackTextClassName="text-lg"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Download className="w-2.5 h-2.5" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Install EduLedger App
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                  <Sparkles className="w-2.5 h-2.5 mr-1 text-amber-500" />
                  PWA Ready
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 max-w-xl">
              Install EduLedger to access school records, attendance, and fee collections offline with fast desktop and mobile shortcuts.
            </p>
          </div>
        </div>

        {/* Right Side: Install EduLedger Button & Dismiss */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition disabled:opacity-60 cursor-pointer"
            id="install-eduledger-button"
            data-testid="install-eduledger-button"
            aria-label="Install EduLedger"
          >
            <Download className="w-4 h-4" />
            <span>{isInstalling ? 'Installing...' : 'Install EduLedger'}</span>
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss banner"
            title="Dismiss for now"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallBanner;
