import React, { useState, useRef } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { BackupSnapshotRecord } from '../../types';
import { BackupInspectionResult } from '../../db/indexedDB';
import {
  formatBytes,
  getRelativeTimeString,
  downloadJsonFile,
} from '../../utils/autoBackupService';
import {
  HardDrive,
  Download,
  Upload,
  Clock,
  RotateCcw,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Play,
  X,
  Calendar,
  Layers,
  CalendarClock,
  FileCode,
  ArrowRight,
  Database,
} from 'lucide-react';
import { RestoreDryRunModal } from '../settings/RestoreDryRunModal';
import {
  runRestoreDryRun,
  RestoreDryRunResult,
} from '../../utils/restoreDryRunService';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    students,
    staff,
    feePayments,
    expenses,
    studentAttendance,
    staffAttendance,
    allUsers,
    exams,
    books,
    activityLogs,
    assets,
    backupDatabase,
    restoreDatabase,
    inspectBackup,
    autoBackupConfig,
    updateAutoBackupConfig,
    backupSnapshots,
    runAutomatedBackupNow,
    restoreFromSnapshot,
    isAutoBackupRunning,
    settings,
    setActiveTab,
  } = useSchool();

  const { isAdmin, currentUser, reVerifyCurrentPassword } = useAuth();

  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [notice, setNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    details?: string;
  } | null>(null);

  const [dryRunResult, setDryRunResult] = useState<RestoreDryRunResult | null>(null);
  const [isDryRunModalOpen, setIsDryRunModalOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{
    name: string;
    size: number;
    content: string;
    inspection: BackupInspectionResult;
  } | null>(null);

  const [snapshotToRestore, setSnapshotToRestore] = useState<BackupSnapshotRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentTotalRecords =
    (students?.length || 0) +
    (staff?.length || 0) +
    (feePayments?.length || 0) +
    (expenses?.length || 0) +
    (studentAttendance?.length || 0) +
    (staffAttendance?.length || 0) +
    (allUsers?.length || 0) +
    (exams?.length || 0) +
    (books?.length || 0) +
    (activityLogs?.length || 0) +
    (assets?.length || 0);

  const getCurrentDatabaseContext = () => ({
    students,
    staff,
    feePayments,
    expenses,
    settings,
    users: allUsers,
    exams,
    books,
    currentUser,
  });

  const handleDownloadBackup = async () => {
    setIsExporting(true);
    try {
      const res = await backupDatabase();
      setNotice({
        type: 'success',
        message: 'Full Application State Exported',
        details: `Saved "${res.filename}" (${(res.sizeBytes / 1024).toFixed(1)} KB) containing ${res.recordsCount} total records.`,
      });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        message: 'Export Failed',
        details: err instanceof Error ? err.message : 'Unknown error.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const content = ev.target?.result as string;
        const inspection = inspectBackup(content);
        if (!inspection.valid) {
          setNotice({
            type: 'error',
            message: 'Invalid Backup File',
            details: inspection.error || 'The file is not a valid EduLedger JSON backup.',
          });
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        setPendingRestore({
          name: file.name,
          size: file.size,
          content,
          inspection,
        });

        const dryRun = await runRestoreDryRun(content, getCurrentDatabaseContext(), file.size);
        setDryRunResult(dryRun);
        setIsDryRunModalOpen(true);
      } catch (err: unknown) {
        setNotice({
          type: 'error',
          message: 'Parse Error',
          details: err instanceof Error ? err.message : 'Failed to parse JSON file.',
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestoreFromDryRun = async (adminPassword: string) => {
    if (!pendingRestore) return;
    setIsRestoring(true);
    try {
      const isAuthValid = await reVerifyCurrentPassword(adminPassword);
      if (!isAuthValid) {
        throw new Error('Incorrect administrator password. Database restore authorization failed.');
      }
      const ok = await restoreDatabase(pendingRestore.content);
      if (ok) {
        setNotice({
          type: 'success',
          message: 'Restore Completed Successfully',
          details: `Application state synchronized from "${pendingRestore.name}". Pre-restore safety snapshot archived in vault.`,
        });
        setIsDryRunModalOpen(false);
        setPendingRestore(null);
        setDryRunResult(null);
      } else {
        throw new Error('Could not write database records to storage.');
      }
    } catch (err: unknown) {
      throw err;
    } finally {
      setIsRestoring(false);
    }
  };

  const handleConfirmRestoreSnapshot = async () => {
    if (!snapshotToRestore) return;
    setIsRestoring(true);
    try {
      const ok = await restoreFromSnapshot(snapshotToRestore);
      if (ok) {
        setNotice({
          type: 'success',
          message: 'Restored from Local Snapshot',
          details: `Restored ${snapshotToRestore.recordsCount} entities from "${snapshotToRestore.title}".`,
        });
        setSnapshotToRestore(null);
      } else {
        setNotice({
          type: 'error',
          message: 'Restore Failed',
          details: 'Failed to restore snapshot records.',
        });
      }
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        message: 'Restore Error',
        details: err instanceof Error ? err.message : 'Unknown error.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDownloadSnapshot = (snap: BackupSnapshotRecord) => {
    const filename = `eduledger_snapshot_${snap.trigger}_${new Date(snap.timestamp).toISOString().slice(0, 10)}.json`;
    downloadJsonFile(snap.jsonData, filename, settings.schoolName);
  };

  const handleTriggerSnapshotNow = async () => {
    try {
      const snap = await runAutomatedBackupNow('automated_scheduled', false);
      setNotice({
        type: 'success',
        message: 'Snapshot Captured',
        details: `Saved to vault (${snap.recordsCount} records, ${formatBytes(snap.sizeBytes)}).`,
      });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        message: 'Failed to create snapshot',
        details: err instanceof Error ? err.message : 'Unknown error.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 shadow-xs">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Data Backup &amp; Disaster Recovery Center
                </h3>
                {autoBackupConfig.enabled && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Auto-Backup Active</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Export and import your entire offline school state to and from local JSON files
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice feedback banner */}
        {notice && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-start justify-between gap-2.5 ${
              notice.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : notice.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                : 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200'
            }`}
          >
            <div className="flex items-start gap-2">
              {notice.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">{notice.message}</p>
                {notice.details && <p className="text-[11px] opacity-90 mt-0.5">{notice.details}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Automated Backup Status Telemetry Card */}
        <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <CalendarClock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>
                <strong>Automated Client-Side Backup:</strong>{' '}
                {autoBackupConfig.enabled
                  ? `Active (${autoBackupConfig.frequency.replace(/_/g, ' ')})`
                  : 'Disabled'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {autoBackupConfig.lastAutoBackupTimestamp
                ? `Last automated backup: ${new Date(autoBackupConfig.lastAutoBackupTimestamp).toLocaleString()} (${getRelativeTimeString(autoBackupConfig.lastAutoBackupTimestamp)})`
                : 'Scheduled background backup engine ready'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              disabled={isAutoBackupRunning}
              onClick={handleTriggerSnapshotNow}
              className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Snapshot Now</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                setActiveTab('settings');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
            >
              <span>Schedule Settings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2 Primary Actions: Export vs Import */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Action 1: Export */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Export State to File
                  </h4>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    100% Complete JSON Snapshot
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Packages all {currentTotalRecords} records across all 19 database stores, timetables, and settings into a single downloadable .json file.
              </p>
            </div>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadBackup}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Entire Database (.json)</span>
                </>
              )}
            </button>
          </div>

          {/* Action 2: Import */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Restore from Local File
                  </h4>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    Includes Pre-Restore Safety Checkpoint
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Upload any previously saved JSON backup file. An automated safety checkpoint is taken before restoring so you can revert anytime.
              </p>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileInput}
                className="hidden"
                id="quick-modal-backup-file-input"
              />
              <label
                htmlFor="quick-modal-backup-file-input"
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-center"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Choose &amp; Restore Backup (.json)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Local Snapshot Vault Quick List */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              <span>Offline Snapshot Vault ({backupSnapshots.length})</span>
            </span>
            <span className="text-[11px] text-slate-400">Stored in browser IndexedDB</span>
          </div>

          {backupSnapshots.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400">
              No snapshots in vault yet. Snapshots are archived automatically or on-demand.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {backupSnapshots.slice(0, 5).map(snap => (
                <div
                  key={snap.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {snap.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatBytes(snap.sizeBytes)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {new Date(snap.timestamp).toLocaleString()} ({getRelativeTimeString(snap.timestamp)}) • {snap.recordsCount} entities
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownloadSnapshot(snap)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => setSnapshotToRestore(snap)}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition shadow-xs"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Restore Dry-Run Pre-Flight Simulation & Password Auth Modal */}
        <RestoreDryRunModal
          isOpen={isDryRunModalOpen}
          onClose={() => {
            setIsDryRunModalOpen(false);
            setPendingRestore(null);
            setDryRunResult(null);
          }}
          onConfirmRestore={handleConfirmRestoreFromDryRun}
          dryRunResult={dryRunResult}
          fileName={pendingRestore?.name || 'backup.json'}
          isRestoring={isRestoring}
        />

        {snapshotToRestore && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 dark:text-amber-200">
                Restore from Snapshot &quot;{snapshotToRestore.title}&quot;?
              </span>
              <span className="font-mono text-[11px] text-amber-700 dark:text-amber-300">
                {snapshotToRestore.recordsCount} entities
              </span>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              This will overwrite your active database with the snapshot state captured on {new Date(snapshotToRestore.timestamp).toLocaleString()}. An automatic safety checkpoint will be saved first.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSnapshotToRestore(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleConfirmRestoreSnapshot}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
              >
                {isRestoring ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
