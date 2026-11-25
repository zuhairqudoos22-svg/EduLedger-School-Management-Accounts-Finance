import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Laptop } from 'lucide-react';
import { InstallGuideModal } from './InstallGuideModal';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const {
    isInstallable,
    isInstalled,
    isWindows,
    isEdge,
    isAndroid,
    isIOS,
    install,
  } = usePWAInstall();

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running in standalone PWA mode, don't display
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        const result = await install();
        if (result === 'unavailable') {
          setShowGuideModal(true);
        }
      } catch (err) {
        console.warn('Install invocation fallback:', err);
        setShowGuideModal(true);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // Browser hasn't fired beforeinstallprompt or is in iframe / restricted mode
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        className={`inline-flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
          isInstallable
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
        } ${className}`}
        title={
          isWindows
            ? 'Install EduLedger on Windows PC'
            : 'Install EduLedger Progressive Web App'
        }
      >
        {isWindows ? <Laptop className="w-3.5 h-3.5 shrink-0" /> : <Download className="w-3.5 h-3.5 shrink-0" />}
        <span className="hidden min-[1500px]:inline whitespace-nowrap">Install App</span>
      </button>

      {/* Guided Windows / Desktop / Mobile Installation Modal */}
      <InstallGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        isInstallable={isInstallable}
        isWindows={isWindows}
        isEdge={isEdge}
        isAndroid={isAndroid}
        isIOS={isIOS}
        onTriggerInstall={async () => {
          await install();
        }}
      />
    </>
  );
};
