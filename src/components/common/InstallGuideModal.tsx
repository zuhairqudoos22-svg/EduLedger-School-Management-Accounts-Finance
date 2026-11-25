import React, { useState } from 'react';
import {
  Monitor,
  Laptop,
  Smartphone,
  Share2,
  Sparkles,
  Download,
  Copy,
  Check,
  X,
} from 'lucide-react';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isWindows: boolean;
  isEdge: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  onTriggerInstall?: () => Promise<void>;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  isWindows,
  isEdge,
  isAndroid,
  isIOS,
  onTriggerInstall,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    try {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleInstallClick = async () => {
    if (onTriggerInstall) {
      setIsInstalling(true);
      try {
        await onTriggerInstall();
        onClose();
      } catch (err) {
        console.warn('Install trigger error:', err);
      } finally {
        setIsInstalling(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 text-slate-800 dark:text-slate-100 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Install EduLedger
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Standalone Desktop &amp; Mobile Application
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-4 space-y-4 text-xs sm:text-sm">
          {/* Windows / Desktop Guide */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
              <Laptop className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Windows PC Installation (Chrome &amp; Edge)</span>
            </div>
            <div className="space-y-2 text-slate-600 dark:text-slate-300 pl-6 border-l-2 border-indigo-200 dark:border-indigo-800 text-xs leading-relaxed">
              <p>
                <strong className="text-slate-900 dark:text-white">Method 1 (Fastest):</strong>{' '}
                Look at the right end of your browser's address bar (URL bar). Click the{' '}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  Install icon
                </span>{' '}
                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">
                  {isEdge ? '⊞+ App Available' : '💻↓ Install App'}
                </span>
                .
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">Method 2 (Menu):</strong>{' '}
                Click the browser menu{' '}
                <span className="font-bold text-slate-900 dark:text-white">⋮</span> (or{' '}
                <span className="font-bold text-slate-900 dark:text-white">⋯</span> in Edge) &rarr;{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  Save &amp; Share &rarr; Install EduLedger
                </strong>{' '}
                (or <strong className="text-indigo-600 dark:text-indigo-400">Apps &rarr; Install EduLedger</strong>).
              </p>
            </div>
          </div>

          {/* Mobile guidance if on phone or tablet */}
          {(isAndroid || isIOS) && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Mobile Installation</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-6 border-l-2 border-emerald-200 dark:border-emerald-800">
                {isIOS ? (
                  <>
                    Tap the <strong>Share</strong> button{' '}
                    <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-blue-500" /> in Safari's bottom
                    toolbar, then tap <strong>Add to Home Screen</strong>.
                  </>
                ) : (
                  <>
                    Tap browser menu <strong>⋮</strong> &rarr; tap <strong>Add to Home screen</strong>{' '}
                    or <strong>Install App</strong>.
                  </>
                )}
              </p>
            </div>
          )}

          {/* Benefits */}
          <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              Once installed, EduLedger launches in a <strong>standalone Windows window</strong> with Start
              Menu, Windows Search, and desktop shortcut integration!
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-col sm:flex-row gap-2">
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isInstalling ? 'Opening...' : 'Launch Install Dialog Now'}</span>
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs transition cursor-pointer"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUrl ? 'URL Copied!' : 'Copy App URL'}</span>
          </button>

          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
