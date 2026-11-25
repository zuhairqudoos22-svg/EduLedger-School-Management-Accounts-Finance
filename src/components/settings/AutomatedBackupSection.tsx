import { ComputerBackupCard } from './ComputerBackupCard';
import { RestoreDryRunModal } from './RestoreDryRunModal';
import {
  runRestoreDryRun,
  RestoreDryRunResult,
} from '../../utils/restoreDryRunService';
import React, { useState, useRef } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import {
  BackupSnapshotRecord,
  AutoBackupFrequency,
  AutoBackupConfig,
} from '../../types';
import { BackupInspectionResult } from '../../db/indexedDB';
import {
  formatBytes,
  getRelativeTimeString,
  downloadJsonFile,
} from '../../utils/autoBackupService';
import {
  encryptBackupWithPassword,
  decryptBackupWithPassword,
} from '../../utils/crypto';
import {
  Database,
  Download,
  Upload,
  Clock,
  RotateCcw,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Trash2,
  Calendar,
  Check,
  Eye,
  FileCode,
  X,
  Play,
  History,
  Shield,
  Layers,
  Sparkles,
  CalendarClock,
  ArrowRight,
  HardDrive,
  Copy,
  CheckCheck,
  KeyRound,
} from 'lucide-react';

export const AutomatedBackupSection: React.FC = () => {
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
    getBackupJsonString,
    autoBackupConfig,
    updateAutoBackupConfig,
    backupSnapshots,
    refreshBackupSnapshots,
    runAutomatedBackupNow,
    deleteBackupSnapshot,
    restoreFromSnapshot,
    isAutoBackupRunning,
    settings,
  } = useSchool();

  const { isAdmin, currentUser, reVerifyCurrentPassword } = useAuth();

  // Notices
  const [backupNotice, setBackupNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    details?: string;
  } | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isManualRunning, setIsManualRunning] = useState(false);

  // Restore inspection modal
  const [dryRunResult, setDryRunResult] = useState<RestoreDryRunResult | null>(null);
  const [isDryRunModalOpen, setIsDryRunModalOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{
    name: string;
    size: number;
    content: string;
    inspection: BackupInspectionResult;
  } | null>(null);
  const [isRestoreInspectionModalOpen, setIsRestoreInspectionModalOpen] = useState(false);
  const [restorePasswordInput, setRestorePasswordInput] = useState('');
  const [restorePasswordError, setRestorePasswordError] = useState('');

  // Snapshot restore confirmation
  const [snapshotToRestore, setSnapshotToRestore] = useState<BackupSnapshotRecord | null>(null);

  // JSON Preview modal
  const [isJsonPreviewModalOpen, setIsJsonPreviewModalOpen] = useState(false);
  const [previewJsonString, setPreviewJsonString] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Encrypted Backup Export & Restore State
  const [isExportPasswordModalOpen, setIsExportPasswordModalOpen] = useState(false);
  const [exportPasswordInput, setExportPasswordInput] = useState('');
  const [confirmExportPasswordInput, setConfirmExportPasswordInput] = useState('');
  const [exportPasswordError, setExportPasswordError] = useState('');

  const [isDecryptModalOpen, setIsDecryptModalOpen] = useState(false);
  const [pendingEncryptedFile, setPendingEncryptedFile] = useState<{
    name: string;
    size: number;
    content: string;
  } | null>(null);
  const [decryptPasswordInput, setDecryptPasswordInput] = useState('');
  const [decryptPasswordError, setDecryptPasswordError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate live records count
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

  const lastManualBackupTime =
    typeof window !== 'undefined'
      ? localStorage.getItem('eduledger_last_backup_timestamp')
      : null;
  const lastManualBackupFilename =
    typeof window !== 'undefined'
      ? localStorage.getItem('eduledger_last_backup_filename')
      : null;
  const lastRestoreTime =
    typeof window !== 'undefined'
      ? localStorage.getItem('eduledger_last_restore_timestamp')
      : null;

  // Handlers
  const handleToggleAutoBackup = async (enabled: boolean) => {
    if (!isAdmin) {
      setBackupNotice({
        type: 'error',
        message: 'Admin Privilege Required',
        details: 'Only system administrators can modify automated backup schedules.',
      });
      return;
    }
    const updated: AutoBackupConfig = {
      ...autoBackupConfig,
      enabled,
    };
    await updateAutoBackupConfig(updated);
    setBackupNotice({
      type: 'success',
      message: enabled
        ? 'Automated Client-Side Backup Activated'
        : 'Automated Backup Paused',
      details: enabled
        ? `Scheduled backups will run automatically according to your ${autoBackupConfig.frequency} frequency.`
        : 'Automated backups are currently turned off. You can still perform manual exports anytime.',
    });
  };

  const handleChangeFrequency = async (frequency: AutoBackupFrequency) => {
    if (!isAdmin) return;
    const updated: AutoBackupConfig = {
      ...autoBackupConfig,
      frequency,
    };
    await updateAutoBackupConfig(updated);
    setBackupNotice({
      type: 'info',
      message: 'Backup Schedule Interval Updated',
      details: `Automated client-side backups will now execute on a ${frequency.replace(/_/g, ' ')} basis.`,
    });
  };

  const handleChangeMaxSnapshots = async (maxStoredSnapshots: number) => {
    if (!isAdmin) return;
    const updated: AutoBackupConfig = {
      ...autoBackupConfig,
      maxStoredSnapshots,
    };
    await updateAutoBackupConfig(updated);
  };

  const handleToggleAutoDownload = async (autoPromptDownload: boolean) => {
    if (!isAdmin) return;
    const updated: AutoBackupConfig = {
      ...autoBackupConfig,
      autoPromptDownload,
    };
    await updateAutoBackupConfig(updated);
  };

  const handleTriggerBackupNow = async () => {
    if (!isAdmin) {
      setBackupNotice({
        type: 'error',
        message: 'Admin Privilege Required',
      });
      return;
    }
    setIsManualRunning(true);
    try {
      const snap = await runAutomatedBackupNow('automated_scheduled', false);
      setBackupNotice({
        type: 'success',
        message: 'Automated Snapshot Created Successfully',
        details: `Saved to offline vault: "${snap.title}" (${formatBytes(snap.sizeBytes)}, ${snap.recordsCount} total entities).`,
      });
    } catch (err: unknown) {
      setBackupNotice({
        type: 'error',
        message: 'Automated Backup Failed',
        details: err instanceof Error ? err.message : 'Unknown error during backup.',
      });
    } finally {
      setIsManualRunning(false);
    }
  };

  const handleTriggerAutomatedBackupExport = async () => {
    if (!isAdmin) {
      setBackupNotice({
        type: 'error',
        message: 'Admin Privilege Required',
        details: 'Only system administrators have permission to trigger automated local database backups.',
      });
      return;
    }
    setIsManualRunning(true);
    try {
      const snap = await runAutomatedBackupNow('automated_scheduled', true);

      const safeSchoolName = (settings.schoolName || 'EduLedger')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase();
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `eduledger_full_backup_${safeSchoolName}_${dateStr}.json`;

      if (typeof window !== 'undefined') {
        const nowIso = new Date().toISOString();
        localStorage.setItem('eduledger_last_backup_timestamp', nowIso);
        localStorage.setItem('eduledger_last_backup_filename', filename);
      }

      setBackupNotice({
        type: 'success',
        message: 'Automated Local Database Backup Exported Successfully',
        details: `Saved "${filename}" locally (${formatBytes(snap.sizeBytes)}, ${snap.recordsCount} entities). An archival snapshot was also stored in your local IndexedDB vault.`,
      });
    } catch (err: unknown) {
      setBackupNotice({
        type: 'error',
        message: 'Automated Local Backup Failed',
        details: err instanceof Error ? err.message : 'Unknown error during automated backup export.',
      });
    } finally {
      setIsManualRunning(false);
    }
  };

  const handleDownloadFullBackup = async () => {
    if (!isAdmin) {
      setBackupNotice({
        type: 'error',
        message: 'Admin Privilege Required',
        details: 'Only system administrators have permission to download full database snapshots.',
      });
      return;
    }
    setIsExporting(true);
    try {
      const result = await backupDatabase();
      setBackupNotice({
        type: 'success',
        message: 'Full Application State Successfully Exported',
        details: `Downloaded "${result.filename}" (${(result.sizeBytes / 1024).toFixed(1)} KB) containing ${result.recordsCount} records across all database stores.`,
      });
    } catch (err: unknown) {
      setBackupNotice({
        type: 'error',
        message: 'Export Failed',
        details: err instanceof Error ? err.message : 'Failed to export application state.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const processFile = (file: File) => {
    if (!file) return;

    if (!isAdmin) {
      setBackupNotice({
        type: 'error',
        message: 'Admin Privilege Required',
        details: 'Only system administrators can restore application state.',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!file.name.toLowerCase().endsWith('.json') && file.type && file.type !== 'application/json') {
      setBackupNotice({
        type: 'error',
        message: 'Invalid File Format',
        details: 'Please select a valid EduLedger JSON backup file ending in .json.',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const content = ev.target?.result as string;
        const inspection = inspectBackup(content);

        // Detect if this is an AES-GCM password encrypted backup file
        if (inspection.isEncrypted) {
          setPendingEncryptedFile({
            name: file.name,
            size: file.size,
            content,
          });
          setDecryptPasswordError('');
          setDecryptPasswordInput('');
          setIsDecryptModalOpen(true);
          return;
        }

        if (!inspection.valid) {
          setBackupNotice({
            type: 'error',
            message: 'Invalid Backup File',
            details: inspection.error || 'The uploaded file is not a valid EduLedger JSON database backup.',
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
        setBackupNotice({
          type: 'error',
          message: 'Failed to Parse Backup File',
          details: err instanceof Error ? err.message : 'The selected file could not be parsed as JSON.',
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleDecryptAndInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingEncryptedFile) return;
    setDecryptPasswordError('');

    try {
      const payload = JSON.parse(pendingEncryptedFile.content);
      const decryptedJson = await decryptBackupWithPassword(payload, decryptPasswordInput);

      const inspection = inspectBackup(decryptedJson);
      if (!inspection.valid) {
        setDecryptPasswordError(inspection.error || 'Decrypted backup file does not contain valid database entities.');
        return;
      }

      setPendingRestore({
        name: pendingEncryptedFile.name + ' (Decrypted)',
        size: pendingEncryptedFile.size,
        content: decryptedJson,
        inspection,
      });

      const dryRun = await runRestoreDryRun(decryptedJson, getCurrentDatabaseContext(), pendingEncryptedFile.size);
      setDryRunResult(dryRun);

      setIsDecryptModalOpen(false);
      setPendingEncryptedFile(null);
      setDecryptPasswordInput('');
      setIsDryRunModalOpen(true);
    } catch {
      setDecryptPasswordError('Incorrect backup decryption password. Please verify and try again.');
    }
  };

  const handleConfirmEncryptedExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exportPasswordInput || exportPasswordInput.length < 6) {
      setExportPasswordError('Password must contain at least 6 characters.');
      return;
    }
    if (exportPasswordInput !== confirmExportPasswordInput) {
      setExportPasswordError('Password and confirmation do not match.');
      return;
    }

    setIsExporting(true);
    try {
      const json = await getBackupJsonString();
      const encryptedPayload = await encryptBackupWithPassword(
        json,
        exportPasswordInput,
        settings.schoolName
      );

      const filename = `eduledger_encrypted_backup_${new Date().toISOString().slice(0, 10)}.json`;
      downloadJsonFile(JSON.stringify(encryptedPayload, null, 2), filename, settings.schoolName);

      setBackupNotice({
        type: 'success',
        message: 'Encrypted Database Exported Successfully',
        details: `Saved "${filename}" protected with AES-GCM 256-bit encryption. Keep your password safe.`,
      });

      setIsExportPasswordModalOpen(false);
      setExportPasswordInput('');
      setConfirmExportPasswordInput('');
    } catch (err: unknown) {
      setBackupNotice({
        type: 'error',
        message: 'Encryption Failed',
        details: err instanceof Error ? err.message : 'Failed to encrypt database.',
      });
    } finally {
      setIsExporting(false);
    }
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

  const handleRestoreFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirmRestoreFile = async () => {
    if (!pendingRestore) return;
    if (!restorePasswordInput || restorePasswordInput.trim().length === 0) {
      setRestorePasswordError('Please enter your admin password to authorize database restore.');
      return;
    }
    setRestorePasswordError('');
    setIsRestoring(true);
    try {
      const isAuthValid = await reVerifyCurrentPassword(restorePasswordInput.trim());
      if (!isAuthValid) {
        setRestorePasswordError('Incorrect password. Database restore authorization failed.');
        setIsRestoring(false);
        return;
      }
      const ok = await restoreDatabase(pendingRestore.content);
      if (ok) {
        setBackupNotice({
          type: 'success',
          message: 'Database Restored Successfully',
          details: `All records restored from "${pendingRestore.name}". An automatic pre-restore safety snapshot was also archived in your local vault.`,
        });
        setIsRestoreInspectionModalOpen(false);
        setPendingRestore(null);
      } else {
        setBackupNotice({
          type: 'error',
          message: 'Database Restore Failed',
          details: 'An error occurred while writing records to IndexedDB.',
        });
      }
    } catch (err: unknown) {
      setBackupNotice({
        type: 'error',
        message: 'Restore Failed',
        details: err instanceof Error ? err.message : 'Unknown database error occurred during restoration.',
      });
    } finally {
      setIsRestoring(false);
    }
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
        setBackupNotice({
          type: 'success',
          message: 'Database Restored Successfully',
          details: `All records restored from "${pendingRestore.name}". An automatic pre-restore safety snapshot was also archived in your local vault.`,
        });
        setIsDryRunModalOpen(false);
        setPendingRestore(null);
        setDryRunResult(null);
      } else {
        throw new Error('An error occurred while writing records to IndexedDB.');
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
        setBackupNotice({
          type: 'success',
          message: 'Restored from Local Snapshot Vault',
          details: `Application state synchronized with snapshot "${snapshotToRestore.title}" (${snapshotToRestore.recordsCount} records).`,
        });
        setSnapshotToRestore(null);
      } else {
        setBackupNotice({
          type: 'error',
          message: 'Failed to Restore Snapshot',
          details: 'Could not restore database records from the selected snapshot.',
        });
      }
    } catch (err: unknown) {
      setBackupNotice({
        type: 'error',
        message: 'Restore Error',
        details: err instanceof Error ? err.message : 'Unknown error.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteSnapshot = async (id: string, title: string) => {
    if (!isAdmin) return;
    const ok = window.confirm(`Delete snapshot "${title}" from the local vault?`);
    if (!ok) return;
    await deleteBackupSnapshot(id);
    setBackupNotice({
      type: 'info',
      message: 'Snapshot Deleted',
      details: `Removed "${title}" from local storage.`,
    });
  };

  const handleDownloadSnapshotFile = (snapshot: BackupSnapshotRecord) => {
    const filename = `eduledger_snapshot_${snapshot.trigger}_${new Date(snapshot.timestamp).toISOString().slice(0, 10)}.json`;
    downloadJsonFile(snapshot.jsonData, filename, settings.schoolName);
  };

  const handleOpenJsonPreview = async () => {
    try {
      const json = await getBackupJsonString();
      setPreviewJsonString(json);
      setIsJsonPreviewModalOpen(true);
      setIsCopied(false);
    } catch (err: unknown) {
      setBackupNotice({
        type: 'error',
        message: 'Failed to Generate JSON Preview',
        details: err instanceof Error ? err.message : 'Error retrieving database JSON state.',
      });
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(previewJsonString);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications / Feedback Banner */}
      {backupNotice && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 transition ${
            backupNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : backupNotice.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {backupNotice.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : backupNotice.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold text-sm">{backupNotice.message}</p>
              {backupNotice.details && (
                <p className="mt-0.5 text-xs opacity-90 leading-relaxed">{backupNotice.details}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBackupNotice(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* DEDICATED FEATURE HERO: AUTOMATED LOCAL DATABASE BACKUP EXPORT */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white border border-indigo-700/40 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glowing background blurs */}
        <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Automated Local Engine
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/10 text-slate-200 border border-white/10">
                JSON File Export
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold text-indigo-200 bg-indigo-500/20 border border-indigo-500/30">
                22 Stores • {currentTotalRecords} Live Records
              </span>
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                <Database className="w-6 h-6 text-emerald-400 shrink-0" />
                <span>Automated Local Database Backup</span>
              </h3>
              <p className="text-xs sm:text-sm text-indigo-100/80 mt-1.5 leading-relaxed">
                Trigger an automated local database backup that compiles all school records (students, faculty registers, fee payments, expenses, staff payroll, attendance roll-calls, weekly timetables, exams, system settings, and audit logs) into a standardized <strong className="text-emerald-300">.json</strong> file and immediately saves it to your local computer, while preserving a verifiable safety snapshot inside your offline browser vault.
              </p>
            </div>

            {/* Real-time telemetry badges */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-indigo-200/90 pt-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Last Backup:</strong>{' '}
                  {autoBackupConfig.lastAutoBackupTimestamp || lastManualBackupTime
                    ? `${new Date(autoBackupConfig.lastAutoBackupTimestamp || lastManualBackupTime!).toLocaleString()} (${getRelativeTimeString(
                        autoBackupConfig.lastAutoBackupTimestamp || lastManualBackupTime!
                      )})`
                    : 'No backup recorded yet'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  <strong>Offline Vault:</strong> {backupSnapshots.length} snapshot(s) archived
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto shrink-0">
            <button
              id="btn-automated-backup-export-json"
              type="button"
              disabled={isManualRunning || isAutoBackupRunning || !isAdmin}
              onClick={handleTriggerAutomatedBackupExport}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2.5 group"
              title="Click to trigger an automated local database backup and download JSON file to your computer"
            >
              {isManualRunning || isAutoBackupRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Exporting School Records...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                  <span>Trigger Automated Local Backup (JSON)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenJsonPreview}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition cursor-pointer flex items-center justify-center gap-2"
              title="Inspect raw database JSON payload"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-300" />
              <span>Inspect Raw JSON Payload</span>
            </button>
          </div>
        </div>
      </div>

      <ComputerBackupCard />

      {/* SECTION 1: BACKUP DATA — LOCAL JSON DATABASE EXPORT & RESTORATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD 1: EXPORT DATABASE AS JSON */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    Backup Data (Export JSON)
                  </h4>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    Local Offline Database Archive (.json)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenJsonPreview}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Inspect Raw JSON State"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Export your school&apos;s entire database locally as a standardized, unencrypted JSON file. This file contains all institutional entities and can be safely archived on external hard drives, USB flash drives, or cloud folders.
            </p>

            {/* Comprehensive entities badge checklist */}
            <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Database Stores Captured ({currentTotalRecords} Records):
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  19 Object Stores + Timetables
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Students &amp; Faculty Registers
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Fee Collections &amp; Invoices
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Expenses &amp; Staff Payroll
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Attendance Roll-Call Logs
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Class Weekly Timetables
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Exams &amp; Student Mark Cards
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  School Assets &amp; Inventory
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Users, Roles &amp; System Settings
                </span>
              </div>
            </div>

            {lastManualBackupTime && (
              <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Last exported: {new Date(lastManualBackupTime).toLocaleString()}
                  {lastManualBackupFilename ? ` (${lastManualBackupFilename})` : ''}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isExporting || !isAdmin}
                onClick={handleDownloadFullBackup}
                className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition active:scale-98 cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Standard JSON</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isExporting || !isAdmin}
                onClick={() => {
                  setExportPasswordInput('');
                  setConfirmExportPasswordInput('');
                  setExportPasswordError('');
                  setIsExportPasswordModalOpen(true);
                }}
                className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 shadow-md transition active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Encrypted (AES-GCM)</span>
              </button>
            </div>
            {!isAdmin && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center">
                Administrator privilege required to export database snapshots.
              </p>
            )}
          </div>
        </div>

        {/* CARD 2: IMPORT DATABASE FROM JSON (WITH DRAG & DROP) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Restore Data (Import JSON)
                </h4>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  Pre-Flight Verification &amp; Safe Rollback
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Import a previously exported EduLedger JSON backup file. Before applying changes, the system validates the file schema, displays a record-by-record comparison diff, and archives an automatic safety snapshot.
            </p>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (isAdmin && fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
              className={`mt-4 p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-2 ${
                isDraggingFile
                  ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/20'
              } ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className={`p-3 rounded-full ${isDraggingFile ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isDraggingFile ? 'Release to inspect backup file' : 'Drag & drop your backup .json file here'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  or click anywhere to browse files on your computer
                </p>
              </div>
            </div>

            {/* Safety Guarantee Banner */}
            <div className="mt-3.5 p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Automatic Pre-Restore Safety Checkpoint</span>
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                EduLedger silently saves your current database to the Snapshot Vault right before applying any import, allowing instant 1-click rollback if needed.
              </p>
            </div>

            {lastRestoreTime && (
              <div className="mt-2.5 text-[11px] text-slate-500 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Last restored: {new Date(lastRestoreTime).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleRestoreFileInput}
              disabled={!isAdmin}
              className="hidden"
              id="automated-backup-file-input"
            />
            <label
              htmlFor="automated-backup-file-input"
              className={`w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 ${
                !isAdmin ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Select &amp; Import Backup File (.json)</span>
            </label>
            {!isAdmin && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center">
                Administrator privilege required to restore database snapshots.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: AUTOMATED CLIENT-SIDE BACKUP SCHEDULER */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Automated Background Backup Schedule
                </h3>
                {autoBackupConfig.enabled ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Auto-Backup Engine Active</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>Auto-Backup Disabled</span>
                  </span>
                )}
                {!isAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Read Only
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Automatically archives full snapshots of your institutional database in the background without requiring manual intervention. Snapshots are stored inside your offline browser vault and can be exported as a local file at any time.
              </p>
            </div>
          </div>

          {/* Master Enable Toggle */}
          <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {autoBackupConfig.enabled ? 'Engine Enabled' : 'Engine Disabled'}
            </span>
            <button
              type="button"
              disabled={!isAdmin}
              onClick={() => handleToggleAutoBackup(!autoBackupConfig.enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                autoBackupConfig.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              title={autoBackupConfig.enabled ? 'Turn off automated backups' : 'Turn on automated backups'}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  autoBackupConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Schedule Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Frequency Interval */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Backup Frequency
            </label>
            <select
              disabled={!isAdmin || !autoBackupConfig.enabled}
              value={autoBackupConfig.frequency}
              onChange={e => handleChangeFrequency(e.target.value as AutoBackupFrequency)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white cursor-pointer disabled:opacity-50"
            >
              <option value="hourly">Hourly (Every 60 minutes)</option>
              <option value="every_6_hours">Every 6 Hours</option>
              <option value="every_12_hours">Every 12 Hours</option>
              <option value="daily">Daily (Every 24 Hours) — Recommended</option>
              <option value="every_3_days">Every 3 Days</option>
              <option value="weekly">Weekly (Every 7 Days)</option>
            </select>
            <p className="text-[11px] text-slate-400">
              Determines how frequently a silent background snapshot is created.
            </p>
          </div>

          {/* 2. Retention Policy */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Vault Retention Limit
            </label>
            <select
              disabled={!isAdmin || !autoBackupConfig.enabled}
              value={autoBackupConfig.maxStoredSnapshots || 10}
              onChange={e => handleChangeMaxSnapshots(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white cursor-pointer disabled:opacity-50"
            >
              <option value={5}>Keep last 5 snapshots</option>
              <option value={10}>Keep last 10 snapshots (Standard)</option>
              <option value={15}>Keep last 15 snapshots</option>
              <option value={20}>Keep last 20 snapshots (Maximum)</option>
            </select>
            <p className="text-[11px] text-slate-400">
              Old automated snapshots are pruned automatically when limit is reached.
            </p>
          </div>

          {/* 3. Automatic Download Prompt */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2 flex flex-col justify-between">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Local Disk Export
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  disabled={!isAdmin || !autoBackupConfig.enabled}
                  checked={autoBackupConfig.autoPromptDownload}
                  onChange={e => handleToggleAutoDownload(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                />
                <span>Also auto-download file (.json) to disk</span>
              </label>
            </div>
            <p className="text-[11px] text-slate-400">
              Automatically triggers browser file download in addition to local vault saving.
            </p>
          </div>
        </div>

        {/* Schedule Telemetry & Manual Trigger Bar */}
        <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>
                <strong>Last Automated Backup:</strong>{' '}
                {autoBackupConfig.lastAutoBackupTimestamp
                  ? `${new Date(autoBackupConfig.lastAutoBackupTimestamp).toLocaleString()} (${getRelativeTimeString(
                      autoBackupConfig.lastAutoBackupTimestamp
                    )})`
                  : 'Pending first scheduled execution'}
              </span>
            </div>
            {autoBackupConfig.enabled && autoBackupConfig.nextScheduledBackupTimestamp && (
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  <strong>Next Scheduled Backup:</strong>{' '}
                  {new Date(autoBackupConfig.nextScheduledBackupTimestamp).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              id="btn-trigger-automated-backup-bar"
              type="button"
              disabled={!isAdmin || isAutoBackupRunning || isManualRunning}
              onClick={handleTriggerAutomatedBackupExport}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              title="Runs automated backup engine and downloads complete JSON database file to local computer"
            >
              {isManualRunning || isAutoBackupRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Exporting JSON...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Trigger Automated Backup &amp; Export JSON</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={!isAdmin || isAutoBackupRunning || isManualRunning}
              onClick={handleTriggerBackupNow}
              className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              title="Creates and saves an internal snapshot to the local IndexedDB vault without downloading file"
            >
              <History className="w-3.5 h-3.5" />
              <span>Vault Snapshot Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: LOCAL SNAPSHOT VAULT (OFFLINE BROWSER ARCHIVES) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Local Snapshot Vault (Offline Browser Backups)
              </h3>
              <p className="text-xs text-slate-500">
                {backupSnapshots.length} snapshot(s) securely preserved inside your local IndexedDB storage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshBackupSnapshots}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Vault</span>
          </button>
        </div>

        {backupSnapshots.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-750 space-y-2">
            <HardDrive className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No Local Snapshots in Vault Yet
            </p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Snapshots will appear here automatically when the automated backup schedule triggers, when you perform manual exports, or before restoring external backups.
            </p>
            <button
              type="button"
              disabled={!isAdmin || isManualRunning}
              onClick={handleTriggerBackupNow}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Create First Snapshot Now</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {backupSnapshots.map(snap => {
              const isScheduled = snap.trigger === 'automated_scheduled';
              const isSafety = snap.trigger === 'pre_restore_safety';
              const isManual = snap.trigger === 'manual_export';

              return (
                <div
                  key={snap.id}
                  className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-750 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {snap.title}
                      </span>
                      {isScheduled && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          Automated Scheduled
                        </span>
                      )}
                      {isSafety && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Pre-Restore Safety Checkpoint
                        </span>
                      )}
                      {isManual && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          Manual Export
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-mono">
                        {formatBytes(snap.sizeBytes)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(snap.timestamp).toLocaleString()} ({getRelativeTimeString(snap.timestamp)})
                      </span>
                      <span>•</span>
                      <span>{snap.recordsCount} total entities</span>
                      <span>•</span>
                      <span className="text-[11px] text-slate-400 truncate max-w-md">
                        {snap.notes}
                      </span>
                    </div>

                    {/* Entities pill preview */}
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 flex-wrap pt-1">
                      <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750">
                        {snap.entityCounts.students || 0} Students
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750">
                        {snap.entityCounts.staff || 0} Staff
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750">
                        {snap.entityCounts.feePayments || 0} Receipts
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750">
                        {snap.entityCounts.assets || 0} Assets
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750">
                        {snap.entityCounts.timetableSlots || 0} Timetable
                      </span>
                    </div>
                  </div>

                  {/* Actions for snapshot */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => handleDownloadSnapshotFile(snap)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-750 transition cursor-pointer flex items-center gap-1.5"
                      title="Download this snapshot as a .json file to your local drive"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Download .json</span>
                    </button>

                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => setSnapshotToRestore(snap)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      title="Restore entire database to this snapshot state"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>

                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => handleDeleteSnapshot(snap.id, snap.title)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-50"
                      title="Delete snapshot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RESTORE DRY-RUN SIMULATION MODAL */}
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

      {/* MODAL 1: RESTORE INSPECTION & CONFIRMATION (FOR FILE UPLOAD) */}
      {isRestoreInspectionModalOpen && pendingRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Inspect &amp; Confirm Database Restore
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify backup contents before applying changes to offline storage
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRestoreInspectionModalOpen(false);
                  setPendingRestore(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Selected File:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white truncate max-w-[240px]">
                  {pendingRestore.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">File Size:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {(pendingRestore.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Target Institution:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[240px]">
                  {pendingRestore.inspection.schoolName}
                </span>
              </div>
              {pendingRestore.inspection.exportedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Export Timestamp:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {new Date(pendingRestore.inspection.exportedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Entity counts breakdown */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Entities to be Restored:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between">
                  <span className="text-slate-500 font-sans">Students:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {pendingRestore.inspection.entityCounts.students}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between">
                  <span className="text-slate-500 font-sans">Faculty / Staff:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {pendingRestore.inspection.entityCounts.staff}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between">
                  <span className="text-slate-500 font-sans">Fee Receipts:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {pendingRestore.inspection.entityCounts.feePayments}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between">
                  <span className="text-slate-500 font-sans">Expenses:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {pendingRestore.inspection.entityCounts.expenses}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between">
                  <span className="text-slate-500 font-sans">Attendance:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {pendingRestore.inspection.entityCounts.studentAttendance}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between">
                  <span className="text-slate-500 font-sans">Assets:</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">
                    {pendingRestore.inspection.entityCounts.assets || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between col-span-2 sm:col-span-3">
                  <span className="text-slate-500 font-sans">Timetable Slots:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {pendingRestore.inspection.entityCounts.timetableSlots || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Safety Guarantee Notice */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3 text-xs text-emerald-800 dark:text-emerald-200">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Automatic Safety Snapshot:</span>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Before applying this backup, EduLedger will archive an automatic safety snapshot of your current state in the local vault. If needed, you can revert anytime with 1 click.
                </p>
              </div>
            </div>

            {/* Admin Password Confirmation */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Admin Password Confirmation <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={restorePasswordInput}
                onChange={(e) => {
                  setRestorePasswordInput(e.target.value);
                  setRestorePasswordError('');
                }}
                placeholder="Enter your admin login password to confirm restore..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              {restorePasswordError && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                  {restorePasswordError}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => {
                  setIsRestoreInspectionModalOpen(false);
                  setPendingRestore(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleConfirmRestoreFile}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isRestoring ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Restoring Database...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Confirm &amp; Restore Database</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM RESTORE FROM SNAPSHOT VAULT */}
      {snapshotToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Restore from Local Snapshot?
                </h3>
                <p className="text-xs text-slate-500">
                  {snapshotToRestore.title}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will restore all records from this snapshot ({snapshotToRestore.recordsCount} entities, captured on {new Date(snapshotToRestore.timestamp).toLocaleString()}). An automatic safety snapshot of your active database will be created first.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setSnapshotToRestore(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleConfirmRestoreSnapshot}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                {isRestoring ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: JSON STRUCTURE PREVIEW MODAL */}
      {isJsonPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Application State JSON Snapshot
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live IndexedDB export schema and verified database hierarchy
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsJsonPreviewModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-auto">
              <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 text-[11px] font-mono overflow-x-auto leading-relaxed max-h-[50vh]">
                {previewJsonString.slice(0, 10000)}
                {previewJsonString.length > 10000 && '\n\n... (truncated preview for display) ...'}
              </pre>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                Size: {(new Blob([previewJsonString]).size / 1024).toFixed(1)} KB
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer flex items-center gap-1.5"
                >
                  {isCopied ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsJsonPreviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ENCRYPTED BACKUP EXPORT PASSWORD MODAL */}
      {isExportPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Export Encrypted Backup
                  </h3>
                  <p className="text-xs text-slate-500">AES-GCM 256-bit Web Crypto Encryption</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportPasswordModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Choose a strong password to lock this backup. The exported file will be completely unreadable without this password.
            </p>

            {exportPasswordError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                {exportPasswordError}
              </div>
            )}

            <form onSubmit={handleConfirmEncryptedExport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Backup Encryption Password
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={exportPasswordInput}
                  onChange={e => setExportPasswordInput(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmExportPasswordInput}
                  onChange={e => setConfirmExportPasswordInput(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExportPasswordModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isExporting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition active:scale-98 disabled:opacity-50"
                >
                  {isExporting ? 'Encrypting...' : 'Encrypt & Download (.json)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: ENCRYPTED BACKUP IMPORT DECRYPTION MODAL */}
      {isDecryptModalOpen && pendingEncryptedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Encrypted Backup Detected
                  </h3>
                  <p className="text-xs text-slate-500">{pendingEncryptedFile.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDecryptModalOpen(false);
                  setPendingEncryptedFile(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This backup file is encrypted with AES-GCM. Please enter the password that was set when this backup was exported to unlock and inspect its contents.
            </p>

            {decryptPasswordError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{decryptPasswordError}</span>
              </div>
            )}

            <form onSubmit={handleDecryptAndInspect} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Decryption Password
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={decryptPasswordInput}
                  onChange={e => setDecryptPasswordInput(e.target.value)}
                  placeholder="Enter backup password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDecryptModalOpen(false);
                    setPendingEncryptedFile(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition active:scale-98"
                >
                  Unlock &amp; Inspect Backup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
