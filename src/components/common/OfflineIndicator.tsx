import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { WifiOff, Database } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <aside
      aria-label="Offline Mode Notification"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-bounce border border-amber-400"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <div className="flex flex-col">
        <span>Offline Mode Active</span>
        <span className="text-[11px] font-normal text-amber-100 flex items-center gap-1">
          <Database className="w-3 h-3" /> IndexedDB local database is handling all operations
        </span>
      </div>
    </aside>
  );
};
