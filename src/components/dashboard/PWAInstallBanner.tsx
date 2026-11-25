import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Laptop,
  Smartphone,
  Sparkles,
  X,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { InstallGuideModal } from '../common/InstallGuideModal';

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

interface PWAInstallBannerProps {
  className?: string;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ className = '' }) => {
  // Check if app is already running in standalone PWA mode
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      window.__isPWAInstalled === true
    );
  });

  // Track window.__pwaInstallPrompt availability
  const [hasPrompt, setHasPrompt] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.__pwaInstallPrompt);
  });

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('eduLedger_pwa_banner_dismissed') === 'true';
  });

  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  // Platform detection
  const [platformInfo, setPlatformInfo] = useState({
    isWindows: false,
    isEdge: false,
    isChrome: false,
    isAndroid: false,
    isIOS: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

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

    const updateInstallState = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        window.__isPWAInstalled === true;
      setIsInstalled(standalone);
    };

    updateInstallState();

    // Check prompt availability immediately
    if (window.__pwaInstallPrompt) {
      setHasPrompt(true);
    }

    // Media query change listener
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        window.__isPWAInstalled = true;
      }
    };
    mediaQuery.addEventListener?.('change', handleMediaChange);

    // Prompt event listeners
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.__pwaInstallPrompt = e as BeforeInstallPromptEvent;
      setHasPrompt(true);
    };

    const handlePromptAvailable = () => {
      setHasPrompt(Boolean(window.__pwaInstallPrompt));
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      window.__isPWAInstalled = true;
      window.__pwaInstallPrompt = null;
      setHasPrompt(false);
      setInstallSuccess(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-installed-success', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener?.('change', handleMediaChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-installed-success', handleAppInstalled);
    };
  }, []);

  // Manual Trigger Installation Flow
  const triggerInstallation = useCallback(async () => {
    const promptEvent = window.__pwaInstallPrompt;

    if (promptEvent) {
      setIsInstalling(true);
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          window.__isPWAInstalled = true;
          window.__pwaInstallPrompt = null;
          setHasPrompt(false);
          setInstallSuccess(true);
        }
      } catch (err) {
        console.warn('[PWA Banner] Error showing native prompt:', err);
        setShowGuideModal(true);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // If browser doesn't have an active BeforeInstallPromptEvent, show the guided install modal
      setShowGuideModal(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('eduLedger_pwa_banner_dismissed', 'true');
    } catch {
      // Ignore storage errors
    }
  };

  // If already installed or dismissed, do not display
  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-500/10 via-indigo-600/10 to-violet-600/10 dark:from-indigo-950/60 dark:via-indigo-900/40 dark:to-slate-900/80 p-4 sm:p-5 shadow-sm transition-all duration-300 ${className}`}
        role="region"
        aria-label="Install EduLedger Progressive Web Application"
      >
        {/* Background decorative glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Left: Icon & Description */}
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25 shrink-0 flex items-center justify-center">
              {platformInfo.isWindows ? (
                <Laptop className="w-5 h-5 text-white" />
              ) : platformInfo.isAndroid || platformInfo.isIOS ? (
                <Smartphone className="w-5 h-5 text-white" />
              ) : (
                <Download className="w-5 h-5 text-white" />
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {platformInfo.isWindows
                    ? 'Install EduLedger on Windows'
                    : 'Install EduLedger App'}
                </h3>

                {hasPrompt ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <Zap className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                    1-Click Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                    PWA Ready
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                {platformInfo.isWindows
                  ? 'Launch EduLedger in a dedicated standalone window with Start Menu integration, desktop shortcuts, and full offline-first school accounts access.'
                  : 'Get quick home screen access, faster launch speeds, and reliable offline capabilities for school fee collection and attendance.'}
              </p>

              {/* Feature Tags */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Full Offline Support
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  No Browser Address Bar
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Zero Installation Lag
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60 dark:border-slate-800">
            <button
              onClick={() => setShowGuideModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 transition active:scale-95 cursor-pointer"
              title="View step-by-step installation instructions"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Guide</span>
            </button>

            <button
              onClick={triggerInstallation}
              disabled={isInstalling}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-600/25 transition disabled:opacity-50 cursor-pointer"
              title="Trigger manual app installation"
            >
              <Download className="w-4 h-4" />
              <span>{isInstalling ? 'Installing...' : 'Install App'}</span>
            </button>

            <button
              onClick={handleDismiss}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/80 transition cursor-pointer"
              title="Dismiss banner for this session"
              aria-label="Dismiss install banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Shared Install Guide Modal */}
      <InstallGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        isInstallable={hasPrompt}
        isWindows={platformInfo.isWindows}
        isEdge={platformInfo.isEdge}
        isAndroid={platformInfo.isAndroid}
        isIOS={platformInfo.isIOS}
        onTriggerInstall={triggerInstallation}
      />
    </>
  );
};
