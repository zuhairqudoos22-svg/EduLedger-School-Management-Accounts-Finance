import React, { useState, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { AlertTriangle, Download, X, CheckCircle2, ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  checkIsBackupOverdue,
  isFileSystemAccessSupported,
  performComputerBackup,
  getSavedFolderName,
  getStoredBackupConsistencyStatus,
  verifyBackupConsistency,
  BackupConsistencyStatus,
} from '../../utils/fileSystemBackupService';

export const BackupReminderBanner: React.FC = () => {
  const {
    backupDatabase,
    getBackupJsonString,
    students,
    staff,
    feePayments,
    expenses,
    settings,
  } = useSchool();

  const [dismissed, setDismissed] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [overdueInfo, setOverdueInfo] = useState<{
    isOverdue: boolean;
    daysSinceLast: number;
    lastDateStr: string | null;
  }>({ isOverdue: false, daysSinceLast: 0, lastDateStr: null });

  const [consistencyStatus, setConsistencyStatus] = useState<BackupConsistencyStatus>(
    getStoredBackupConsistencyStatus
  );

  useEffect(() => {
    const isSessionDismissed = sessionStorage.getItem('eduledger_backup_banner_dismissed') === 'true';
    if (isSessionDismissed) {
      setDismissed(true);
      return;
    }
    const info = checkIsBackupOverdue(7);
    setOverdueInfo(info);
    setConsistencyStatus(getStoredBackupConsistencyStatus());
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('eduledger_backup_banner_dismissed', 'true');
  };

  const handleQuickBackup = async () => {
    setIsBackingUp(true);
    setSuccessMsg(null);

    try {
      const isSupported = isFileSystemAccessSupported();
      const folderName = getSavedFolderName();

      if (isSupported && folderName) {
        // Try saving directly to PC folder
        const json = await getBackupJsonString();
        const res = await performComputerBackup({
          databaseJson: json,
          students,
          staff,
          feePayments,
          expenses,
          settings,
        });

        if (res.success) {
          const verifyRes = await verifyBackupConsistency(
            json,
            res.filesSaved[0],
            json.length
          );
          setConsistencyStatus(verifyRes);
          setSuccessMsg(`Backup saved & verified consistent! (${res.folderName})`);
          setTimeout(() => {
            setDismissed(true);
          }, 3500);
          return;
        }
      }

      // Fallback: Trigger browser file download
      const result = await backupDatabase();
      const json = await getBackupJsonString();
      const verifyRes = await verifyBackupConsistency(json, result.filename, result.sizeBytes);
      setConsistencyStatus(verifyRes);
      setSuccessMsg(`Backup downloaded & verified consistent! (${result.filename})`);
      setTimeout(() => {
        setDismissed(true);
      }, 3500);
    } catch (err) {
      console.error('Failed to run reminder backup:', err);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Show if overdue OR if consistency check failed
  const isIntegrityFailed = consistencyStatus.status === 'failed';
  const shouldShow = (!dismissed && overdueInfo.isOverdue) || isIntegrityFailed;

  if (!shouldShow) {
    return null;
  }

  return (
    <aside
      aria-label="Backup overdue and integrity reminder"
      className={`w-full box-border px-4 sm:px-6 py-2.5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs z-30 text-white ${
        isIntegrityFailed
          ? 'bg-gradient-to-r from-rose-600 via-rose-700 to-amber-700'
          : 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="p-1.5 rounded-lg bg-black/20 shrink-0">
          {isIntegrityFailed ? (
            <ShieldAlert className="w-4 h-4 text-rose-200" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-100" />
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-black tracking-wide uppercase text-[10px] bg-black/20 px-2 py-0.5 rounded shrink-0">
            {isIntegrityFailed ? 'Integrity Alert' : 'Backup Reminder'}
          </span>

          <span className="leading-snug">
            {isIntegrityFailed ? (
              <>
                <strong>Consistency Check Warning:</strong> The last saved backup failed integrity verification ({consistencyStatus.error || 'Corrupt or incomplete file'}). Take a fresh backup immediately.
              </>
            ) : overdueInfo.daysSinceLast >= 999 ? (
              'No computer backup has been recorded yet. Ensure your student fees and accounts records are safe against hardware loss.'
            ) : (
              `No backup has been taken in the last ${overdueInfo.daysSinceLast} days. Ensure your school records are protected.`
            )}
          </span>

          {/* Consistency Badge */}
          {consistencyStatus.status === 'verified' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-200 border border-emerald-400/40 font-bold text-[10px] shrink-0">
              <ShieldCheck className="w-3 h-3 text-emerald-300" />
              <span>
                Verified Healthy
                {consistencyStatus.totalRecords !== undefined
                  ? ` (${consistencyStatus.totalRecords} records)`
                  : ''}
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end shrink-0 ml-auto">
        {successMsg ? (
          <span className="flex items-center gap-1.5 font-bold text-amber-100 bg-black/20 px-3 py-1 rounded-lg shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="whitespace-nowrap">{successMsg}</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleQuickBackup}
            disabled={isBackingUp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
          >
            <Download className={`w-3.5 h-3.5 shrink-0 ${isBackingUp ? 'animate-spin' : ''}`} />
            <span>{isBackingUp ? 'Backing Up...' : 'Take Backup Now'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-lg hover:bg-black/20 text-white/80 hover:text-white transition cursor-pointer shrink-0"
          title="Dismiss reminder for this session"
          aria-label="Dismiss backup reminder"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
