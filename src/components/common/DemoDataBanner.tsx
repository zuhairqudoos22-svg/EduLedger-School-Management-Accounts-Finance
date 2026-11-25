import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, Trash2, X, Sparkles, Check } from 'lucide-react';
import { removeDemoDataDB } from '../../db/indexedDB';
import { payrollStorage } from '../../utils/payrollStorage';

interface DemoDataBannerProps {
  onOpenDataManagement?: () => void;
}

export const DemoDataBanner: React.FC<DemoDataBannerProps> = ({ onOpenDataManagement }) => {
  const { settings, updateSettings } = useSchool();
  const { currentUser, isMainAdmin, isAdmin } = useAuth();

  const [isDismissed, setIsDismissed] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Show only if demo data is active and banner not dismissed for this session
  if (!settings?.isDemoActive || isDismissed) {
    return null;
  }

  const canRemove = isMainAdmin || isAdmin || currentUser?.role === 'admin';

  const handleRemoveDemoData = async () => {
    if (!window.confirm('Are you sure you want to remove all sample demo records? Your custom real records will remain intact.')) {
      return;
    }

    setIsRemoving(true);
    try {
      const removedCounts = await removeDemoDataDB();
      const removedPayroll = payrollStorage.removeDemoPayrollData();

      // Update school settings
      const updatedSettings = {
        ...settings,
        isDemoActive: false,
      };
      await updateSettings(updatedSettings);

      setSuccessMsg('Sample demo data removed successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error('Error removing demo data:', err);
      alert('Failed to remove demo data. Please try from Settings > Data Management.');
      setIsRemoving(false);
    }
  };

  return (
    <div className="bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2 text-xs flex items-center justify-between gap-3 relative z-30 transition-all">
      <div className="flex items-center gap-2 min-w-0">
        <span className="p-1 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
        </span>
        <span className="font-bold truncate">
          Demo data is active
        </span>
        <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80 hidden sm:inline truncate">
          Sample student profiles, fee vouchers, and payroll runs are loaded for evaluation.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {successMsg ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
            <Check className="w-3.5 h-3.5" />
            {successMsg}
          </span>
        ) : (
          <>
            {canRemove && (
              <button
                type="button"
                onClick={handleRemoveDemoData}
                disabled={isRemoving}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                <span>{isRemoving ? 'Removing...' : 'Remove demo data'}</span>
              </button>
            )}

            {onOpenDataManagement && canRemove && (
              <button
                type="button"
                onClick={onOpenDataManagement}
                className="text-[11px] text-amber-700 dark:text-amber-300 hover:underline font-semibold hidden md:inline cursor-pointer"
              >
                Manage Data
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded-md hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 cursor-pointer"
              title="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
