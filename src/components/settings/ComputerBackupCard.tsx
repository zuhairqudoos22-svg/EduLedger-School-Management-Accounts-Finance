import React, { useState, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import {
  Folder,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
  RefreshCw,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Download,
  Calendar,
  Clock,
  FileText,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Info,
  Check,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Upload,
} from 'lucide-react';
import {
  isFileSystemAccessSupported,
  pickBackupDirectory,
  performComputerBackup,
  getSavedFolderName,
  removeSavedDirectoryHandle,
  getLastComputerBackupTimestamp,
  getLastComputerBackupFilename,
  checkIsBackupOverdue,
  getStoredBackupConsistencyStatus,
  verifyLastComputerBackupFile,
  verifyBackupConsistency,
  readLastComputerBackupFile,
  BackupConsistencyStatus,
} from '../../utils/fileSystemBackupService';
import { RestoreDryRunModal } from './RestoreDryRunModal';
import {
  runRestoreDryRun,
  RestoreDryRunResult,
} from '../../utils/restoreDryRunService';

export const ComputerBackupCard: React.FC = () => {
  const {
    students,
    staff,
    feePayments,
    expenses,
    settings,
    allUsers,
    exams,
    books,
    getBackupJsonString,
    autoBackupConfig,
    updateAutoBackupConfig,
    backupDatabase,
    restoreDatabase,
  } = useSchool();
  const { isAdmin, currentUser, reVerifyCurrentPassword } = useAuth();

  const isSupported = isFileSystemAccessSupported();
  const [folderName, setFolderName] = useState<string | null>(getSavedFolderName);
  const [isRunningBackup, setIsRunningBackup] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(getLastComputerBackupTimestamp);
  const [lastBackupFile, setLastBackupFile] = useState<string | null>(getLastComputerBackupFilename);
  const [consistencyStatus, setConsistencyStatus] = useState<BackupConsistencyStatus>(
    getStoredBackupConsistencyStatus
  );
  const [isVerifying, setIsVerifying] = useState(false);

  // Restore State & Dry-Run Simulation
  const [dryRunResult, setDryRunResult] = useState<RestoreDryRunResult | null>(null);
  const [isDryRunModalOpen, setIsDryRunModalOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{
    name: string;
    size: number;
    content: string;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoadingRestoreFile, setIsLoadingRestoreFile] = useState(false);
  const restoreFileInputRef = React.useRef<HTMLInputElement>(null);

  // Configuration options
  const [folderBackupEnabled, setFolderBackupEnabled] = useState<boolean>(
    autoBackupConfig?.folderBackupEnabled ?? true
  );
  const [backupDaily, setBackupDaily] = useState<boolean>(
    autoBackupConfig?.backupDaily ?? true
  );
  const [backupOnLogout, setBackupOnLogout] = useState<boolean>(
    autoBackupConfig?.backupOnLogout ?? true
  );
  const [encryptWithPassword, setEncryptWithPassword] = useState<boolean>(
    autoBackupConfig?.encryptWithPassword ?? false
  );
  const [backupPassword, setBackupPassword] = useState<string>(
    autoBackupConfig?.backupPassword ?? ''
  );
  const [showPassword, setShowPassword] = useState(false);

  // Status feedback
  const [feedbackNotice, setFeedbackNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    files?: string[];
  } | null>(null);

  useEffect(() => {
    setFolderName(getSavedFolderName());
    setLastBackupTime(getLastComputerBackupTimestamp());
    setLastBackupFile(getLastComputerBackupFilename());
    setConsistencyStatus(getStoredBackupConsistencyStatus());
  }, []);

  const handlePickFolder = async () => {
    const res = await pickBackupDirectory();
    if (res.success && res.folderName) {
      setFolderName(res.folderName);
      setFolderBackupEnabled(true);
      await updateAutoBackupConfig({
        ...autoBackupConfig,
        folderBackupEnabled: true,
        backupFolderName: res.folderName,
      });
      setFeedbackNotice({
        type: 'success',
        message: `Backup folder "${res.folderName}" successfully connected!`,
      });
      setTimeout(() => setFeedbackNotice(null), 4000);
    } else if (res.error && res.error !== 'Folder selection was canceled.') {
      setFeedbackNotice({
        type: 'error',
        message: res.error,
      });
    }
  };

  const handleDisconnectFolder = async () => {
    await removeSavedDirectoryHandle();
    setFolderName(null);
    await updateAutoBackupConfig({
      ...autoBackupConfig,
      folderBackupEnabled: false,
      backupFolderName: undefined,
    });
    setFeedbackNotice({
      type: 'info',
      message: 'Computer backup folder disconnected.',
    });
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  const handleRunConsistencyCheck = async () => {
    setIsVerifying(true);
    try {
      const res = await verifyLastComputerBackupFile();
      if (res.status === 'unchecked') {
        const json = await getBackupJsonString();
        const verifiedRes = await verifyBackupConsistency(
          json,
          lastBackupFile || 'current-database.json',
          json.length
        );
        setConsistencyStatus(verifiedRes);
      } else {
        setConsistencyStatus(res);
      }
    } catch (err: unknown) {
      setConsistencyStatus({
        status: 'failed',
        checkedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Verification failed',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRunBackupNow = async () => {
    setIsRunningBackup(true);
    setFeedbackNotice(null);

    try {
      const databaseJson = await getBackupJsonString();

      const res = await performComputerBackup({
        databaseJson,
        students,
        staff,
        feePayments,
        expenses,
        settings,
        encryptPassword: encryptWithPassword ? backupPassword : undefined,
        maxKeepBackups: 30,
      });

      if (res.success) {
        setLastBackupTime(res.timestamp);
        if (res.filesSaved.length > 0) {
          setLastBackupFile(res.filesSaved[0]);
        }
        await updateAutoBackupConfig({
          ...autoBackupConfig,
          lastComputerBackupTimestamp: res.timestamp,
          lastComputerBackupFilename: res.filesSaved[0],
        });

        const updatedConsistency = getStoredBackupConsistencyStatus();
        setConsistencyStatus(updatedConsistency);

        setFeedbackNotice({
          type: 'success',
          message: `Backup saved to "${res.folderName || 'computer folder'}" and verified consistent!`,
          files: res.filesSaved,
        });
      } else {
        setFeedbackNotice({
          type: 'error',
          message: res.error || 'Failed to save backup to computer.',
        });
      }
    } catch (err: unknown) {
      setFeedbackNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unknown backup error occurred.',
      });
    } finally {
      setIsRunningBackup(false);
    }
  };

  const handleManualDownloadFallback = async () => {
    try {
      setIsRunningBackup(true);
      const res = await backupDatabase();
      const nowStr = new Date().toISOString();
      setLastBackupTime(nowStr);
      setFeedbackNotice({
        type: 'success',
        message: `Backup downloaded: "${res.filename}" (${Math.round(res.sizeBytes / 1024)} KB).`,
      });
      setTimeout(() => setFeedbackNotice(null), 5000);
    } catch (e: unknown) {
      setFeedbackNotice({
        type: 'error',
        message: e instanceof Error ? e.message : 'Failed to download backup.',
      });
    } finally {
      setIsRunningBackup(false);
    }
  };

  const handleSavePreferences = async () => {
    await updateAutoBackupConfig({
      ...autoBackupConfig,
      folderBackupEnabled,
      backupDaily,
      backupOnLogout,
      encryptWithPassword,
      backupPassword: encryptWithPassword ? backupPassword : '',
      keepLastBackupsCount: 30,
    });
    setFeedbackNotice({
      type: 'success',
      message: 'Computer backup preferences saved.',
    });
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

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

  const handleRestoreFromConnectedFolder = async () => {
    if (!isAdmin) {
      setFeedbackNotice({
        type: 'error',
        message: 'Administrator privilege is required to restore database state.',
      });
      return;
    }
    setIsLoadingRestoreFile(true);
    try {
      const res = await readLastComputerBackupFile();
      if (!res.success || !res.content) {
        setFeedbackNotice({
          type: 'error',
          message: res.error || 'Failed to read backup from connected folder.',
        });
        return;
      }
      setPendingRestore({
        name: res.filename || 'computer-backup.json',
        size: res.fileSizeBytes || res.content.length,
        content: res.content,
      });
      const dryRun = await runRestoreDryRun(res.content, getCurrentDatabaseContext(), res.fileSizeBytes || res.content.length);
      setDryRunResult(dryRun);
      setIsDryRunModalOpen(true);
    } catch (err: unknown) {
      setFeedbackNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to inspect backup file.',
      });
    } finally {
      setIsLoadingRestoreFile(false);
    }
  };

  const handleRestoreFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      setFeedbackNotice({
        type: 'error',
        message: 'Administrator authority required to restore database state.',
      });
      if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const content = ev.target?.result as string;
        setPendingRestore({
          name: file.name,
          size: file.size,
          content,
        });
        const dryRun = await runRestoreDryRun(content, getCurrentDatabaseContext(), file.size);
        setDryRunResult(dryRun);
        setIsDryRunModalOpen(true);
      } catch (err: unknown) {
        setFeedbackNotice({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to parse backup file.',
        });
      } finally {
        if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
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
        setFeedbackNotice({
          type: 'success',
          message: `Database successfully restored from "${pendingRestore.name}"! A rollback safety checkpoint was archived.`,
        });
        setIsDryRunModalOpen(false);
        setPendingRestore(null);
        setDryRunResult(null);
      } else {
        throw new Error('An error occurred while restoring records to database.');
      }
    } catch (err: unknown) {
      throw err;
    } finally {
      setIsRestoring(false);
    }
  };

  const overdueInfo = checkIsBackupOverdue(7);

  // Format last backup time
  const formatTimeDisplay = (isoStr: string | null) => {
    if (!isoStr) return 'Never backed up';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Auto Backup to Computer Folder
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Free &bull; No Server
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Direct PC folder saving via Chrome/Edge File System Access API with automated JSON and CSV export archives.
            </p>
          </div>
        </div>

        {/* Last Backup Date Badge */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs self-stretch sm:self-auto">
          <Clock className="w-4 h-4 text-slate-500 shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
              Last Computer Backup
            </span>
            <span className="font-bold text-slate-900 dark:text-white text-xs">
              {formatTimeDisplay(lastBackupTime)}
            </span>
          </div>
        </div>
      </div>

      {/* Consistency Check Status Card */}
      <div
        className={`p-4 rounded-xl border space-y-3 transition-colors ${
          consistencyStatus.status === 'verified'
            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
            : consistencyStatus.status === 'failed'
            ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                consistencyStatus.status === 'verified'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                  : consistencyStatus.status === 'failed'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
              }`}
            >
              {consistencyStatus.status === 'verified' ? (
                <ShieldCheck className="w-5 h-5" />
              ) : consistencyStatus.status === 'failed' ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Backup Consistency &amp; Integrity Status
                </h4>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    consistencyStatus.status === 'verified'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                      : consistencyStatus.status === 'failed'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {consistencyStatus.status === 'verified'
                    ? 'Verified Healthy & Consistent'
                    : consistencyStatus.status === 'failed'
                    ? 'Integrity Issue Detected'
                    : 'Unchecked'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {consistencyStatus.message ||
                  (consistencyStatus.error
                    ? `Warning: ${consistencyStatus.error}`
                    : 'Verifies readability, valid JSON syntax, cryptographic envelope, record schemas, and entity counts.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunConsistencyCheck}
            disabled={isVerifying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer active:scale-95 disabled:opacity-50 shrink-0 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Verifying...' : 'Verify Integrity Now'}</span>
          </button>
        </div>

        {/* Detailed Breakdown when Verified */}
        {consistencyStatus.status === 'verified' && (
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              <span>
                Inspected File: <code className="font-mono font-bold text-slate-800 dark:text-slate-200">{consistencyStatus.filename || 'Backup File'}</code>
              </span>
              {consistencyStatus.sha256Checksum && (
                <span>
                  SHA-256 Checksum: <code className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{consistencyStatus.sha256Checksum}</code>
                </span>
              )}
              <span>
                Last Checked: <strong className="font-bold text-slate-800 dark:text-slate-200">{consistencyStatus.checkedAt ? new Date(consistencyStatus.checkedAt).toLocaleTimeString() : 'Just now'}</strong>
              </span>
            </div>

            {consistencyStatus.entityBreakdown && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  Students: {consistencyStatus.entityBreakdown.students}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  Staff: {consistencyStatus.entityBreakdown.staff}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  Fee Receipts: {consistencyStatus.entityBreakdown.feePayments}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  Expenses: {consistencyStatus.entityBreakdown.expenses}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  Total Records: {consistencyStatus.totalRecords}
                </span>
              </div>
            )}
          </div>
        )}

        {consistencyStatus.status === 'failed' && (
          <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs">
            <strong>Verification Failure:</strong> {consistencyStatus.error || 'The backup file is corrupt or truncated. Click Backup to Computer Now to generate a fresh backup.'}
          </div>
        )}
      </div>

      {/* 7-Day Overdue Warning Banner */}
      {overdueInfo.isOverdue && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Backup Reminder: No backup taken in the last 7 days.</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
              Ensure your student records, fees, and accounting books are safeguarded against hardware failure or accidental loss.
            </p>
          </div>
          <button
            type="button"
            onClick={isSupported && folderName ? handleRunBackupNow : handleManualDownloadFallback}
            disabled={isRunningBackup}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition shrink-0 cursor-pointer"
          >
            {isSupported && folderName ? 'Backup Now' : 'Download Backup'}
          </button>
        </div>
      )}

      {/* Feedback Notice */}
      {feedbackNotice && (
        <div
          className={`p-3.5 rounded-xl text-xs border space-y-1.5 animate-in fade-in ${
            feedbackNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : feedbackNotice.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-bold">{feedbackNotice.message}</span>
          </div>
          {feedbackNotice.files && feedbackNotice.files.length > 0 && (
            <div className="pl-6 text-[11px] space-y-0.5 opacity-90">
              <p className="font-semibold">Files generated in folder:</p>
              <ul className="list-disc list-inside space-y-0.5 font-mono">
                {feedbackNotice.files.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Supported vs Unsupported Path */}
      {isSupported ? (
        /* File System Access API is Supported (Windows PC Chrome/Edge) */
        <div className="space-y-4">
          {/* Folder Connection Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border ${
                  folderName
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-200 text-slate-500 border-slate-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                }`}
              >
                <Folder className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Target Backup Directory on PC
                </span>
                <span className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                  {folderName ? (
                    <>
                      <span>{folderName}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                        Connected
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-500 italic">No folder selected yet</span>
                  )}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Select a local directory once (e.g. <code className="font-mono">D:\SchoolBackup</code>). Backups will save automatically.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch md:self-auto">
              {folderName ? (
                <>
                  <button
                    type="button"
                    onClick={handlePickFolder}
                    className="flex-1 md:flex-none px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition cursor-pointer"
                  >
                    Change Folder
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectFolder}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handlePickFolder}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition cursor-pointer active:scale-95"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Select Backup Folder on PC</span>
                </button>
              )}
            </div>
          </div>

          {/* Automated Trigger Options & Retention */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Daily Backup Option */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={backupDaily}
                onChange={(e) => setBackupDaily(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">
                  Daily Automated Backup
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Saves a new dated backup file into the folder once each day on startup.
                </span>
              </div>
            </label>

            {/* Logout Backup Option */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={backupOnLogout}
                onChange={(e) => setBackupOnLogout(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">
                  Backup on Admin Logout
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Automatically archives current records before signing out of the system.
                </span>
              </div>
            </label>
          </div>

          {/* Retention Policy Box */}
          <div className="p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Retention Policy:
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Keeps the last <strong className="font-bold text-slate-800 dark:text-slate-200">30 backups</strong>. Older files are automatically cleaned up to prevent filling up disk space.
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              30 Versions Kept
            </span>
          </div>

          {/* Password Protection (AES-GCM) Option */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={encryptWithPassword}
                onChange={(e) => setEncryptWithPassword(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Password-Protect Backup Files (AES-GCM 256-bit Encryption)</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Encrypts full JSON backups so that nobody can view student or financial data without the password.
                </span>
              </div>
            </label>

            {encryptWithPassword && (
              <div className="pl-6 pt-1 max-w-md space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Backup Encryption Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={backupPassword}
                    onChange={(e) => setBackupPassword(e.target.value)}
                    placeholder="Enter backup encryption password..."
                    className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Make sure to remember this password. You will need it to restore this backup.
                </p>
              </div>
            )}
          </div>

          {/* Files Generated Breakdown */}
          <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-2">
            <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Files Automatically Saved on Every Backup:</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-indigo-950 dark:text-indigo-200 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span>eduledger-backup-YYYY-MM-DD_HH-mm-ss.json</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>students_YYYY-MM-DD.csv</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>staff_YYYY-MM-DD.csv</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>fees_YYYY-MM-DD.csv</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>expenses_YYYY-MM-DD.csv</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>ledger_YYYY-MM-DD.csv</span>
              </div>
            </div>
          </div>

          {/* Restore from Backup Option with Dry-Run Schema Simulation */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h5 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Restore from Backup (Dry-Run Simulation &amp; Password Protected)</span>
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Simulates restoration and verifies 100% schema compatibility before making any changes. Admin password required.
                </p>
              </div>

              <input
                ref={restoreFileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleRestoreFileInput}
                className="hidden"
                id="computer-card-restore-input"
              />

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                {folderName && lastBackupFile && (
                  <button
                    type="button"
                    onClick={handleRestoreFromConnectedFolder}
                    disabled={isLoadingRestoreFile || isRestoring || !isAdmin}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                    title={`Restore from latest file "${lastBackupFile}" in connected folder`}
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isLoadingRestoreFile ? 'animate-spin' : ''}`} />
                    <span>{isLoadingRestoreFile ? 'Inspecting Folder...' : 'Restore Latest from Folder'}</span>
                  </button>
                )}

                <label
                  htmlFor="computer-card-restore-input"
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer ${
                    !isAdmin ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Choose Backup File (.json)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSavePreferences}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              Save Backup Preferences
            </button>

            <button
              type="button"
              onClick={handleRunBackupNow}
              disabled={isRunningBackup || !folderName}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningBackup ? 'animate-spin' : ''}`} />
              <span>{isRunningBackup ? 'Saving to Computer...' : 'Backup to Computer Now'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Fallback for Mobile Phones / Android / Unsupported Browsers */
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <Info className="w-5 h-5 shrink-0" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Browser Direct Folder Access Notice
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Direct folder writing requires the <strong>File System Access API</strong>, available on desktop browsers like <strong>Google Chrome</strong> and <strong>Microsoft Edge</strong> on Windows PC.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                On this device or browser, you can safely download your complete school database backup with a single click below. A reminder banner will notify you if no backup is taken for 7 days.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <input
              ref={restoreFileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleRestoreFileInput}
              className="hidden"
              id="mobile-fallback-restore-input"
            />
            <label
              htmlFor="mobile-fallback-restore-input"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer ${
                !isAdmin ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore from Backup File (.json)</span>
            </label>

            <button
              type="button"
              onClick={handleManualDownloadFallback}
              disabled={isRunningBackup}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isRunningBackup ? 'Generating Backup...' : 'Download Full Backup Now'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Restore Dry Run Simulation Modal */}
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
    </div>
  );
};
