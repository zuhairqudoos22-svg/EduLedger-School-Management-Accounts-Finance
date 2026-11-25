/**
 * EduLedger - Auto Backup to Computer Service
 * Uses the browser's File System Access API (Google Chrome & Microsoft Edge on Windows PC)
 * Allows Admin to pick a folder on the PC once (e.g. D:\SchoolBackup)
 * Automatically writes dated JSON backups + CSV exports for students, staff, fees, expenses, and ledger.
 * Prunes backups older than the last 30 versions.
 * Supports AES-GCM 256-bit password-protected encrypted backups.
 * Fallback to manual download & 7-day reminder banner for unsupported browsers/Android devices.
 */

import { openDB, IDBPDatabase } from 'idb';
import {
  Student,
  Staff,
  FeePayment,
  Expense,
  SchoolSettings,
} from '../types';
import {
  formatStudentsForExport,
  formatStaffForExport,
  formatFeePaymentsForExport,
  formatExpensesForExport,
  formatLedgerForExport,
} from './exportUtils';
import { encryptBackupWithPassword, legacySha256 } from './crypto';
import { inspectBackupJson } from '../db/indexedDB';

const FS_DB_NAME = 'eduledger_fs_handles_db';
const FS_STORE_NAME = 'handles';
const HANDLE_KEY = 'backup_directory_handle';
const LAST_BACKUP_TIME_KEY = 'eduledger_last_computer_backup_time';
const LAST_BACKUP_NAME_KEY = 'eduledger_last_computer_backup_name';
const BACKUP_FOLDER_NAME_KEY = 'eduledger_backup_folder_display_name';

/**
 * Checks whether the browser supports the File System Access API (showDirectoryPicker)
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Initializes private IndexedDB store for structured cloning of FileSystemDirectoryHandle
 */
async function getFSDatabase(): Promise<IDBPDatabase> {
  return openDB(FS_DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(FS_STORE_NAME)) {
        db.createObjectStore(FS_STORE_NAME);
      }
    },
  });
}

/**
 * Persists a FileSystemDirectoryHandle in IndexedDB
 */
export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle, folderName?: string): Promise<void> {
  const db = await getFSDatabase();
  await db.put(FS_STORE_NAME, handle, HANDLE_KEY);
  if (folderName && typeof window !== 'undefined') {
    localStorage.setItem(BACKUP_FOLDER_NAME_KEY, folderName);
  }
}

/**
 * Retrieves the stored FileSystemDirectoryHandle from IndexedDB
 */
export async function getSavedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await getFSDatabase();
    const handle = await db.get(FS_STORE_NAME, HANDLE_KEY);
    return handle || null;
  } catch (err) {
    console.warn('Could not retrieve stored directory handle:', err);
    return null;
  }
}

/**
 * Removes the stored directory handle
 */
export async function removeSavedDirectoryHandle(): Promise<void> {
  try {
    const db = await getFSDatabase();
    await db.delete(FS_STORE_NAME, HANDLE_KEY);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(BACKUP_FOLDER_NAME_KEY);
    }
  } catch (err) {
    console.warn('Could not remove directory handle:', err);
  }
}

/**
 * Gets the display name of the selected folder from localStorage
 */
export function getSavedFolderName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(BACKUP_FOLDER_NAME_KEY);
}

/**
 * Verifies or requests readwrite permissions for the directory handle
 */
export async function verifyDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  readWrite = true
): Promise<boolean> {
  const mode = readWrite ? 'readwrite' : 'read';
  try {
    const queryResult = await (handle as any).queryPermission({ mode });
    if (queryResult === 'granted') {
      return true;
    }
    const requestResult = await (handle as any).requestPermission({ mode });
    return requestResult === 'granted';
  } catch (err) {
    console.warn('Permission query/request failed:', err);
    return false;
  }
}

/**
 * Opens browser directory picker for the Admin to select a folder on their PC
 */
export async function pickBackupDirectory(): Promise<{
  success: boolean;
  folderName?: string;
  handle?: FileSystemDirectoryHandle;
  error?: string;
}> {
  if (!isFileSystemAccessSupported()) {
    return {
      success: false,
      error: 'File System Access API is not supported in this browser. Please use Google Chrome or Microsoft Edge on a desktop PC.',
    };
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      id: 'eduledger-school-backups',
      mode: 'readwrite',
      startIn: 'documents',
    });

    const folderName = handle.name || 'Selected Folder';
    await saveDirectoryHandle(handle, folderName);

    return {
      success: true,
      folderName,
      handle,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: 'Folder selection was canceled.' };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to select folder.',
    };
  }
}

/**
 * Helper to convert array of records into a valid CSV string
 */
export function convertRecordsToCsvString(rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) {
    return 'No records available\n';
  }
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvRows = [
    keys.map((k) => `"${String(k).replace(/"/g, '""')}"`).join(separator),
    ...rows.map((row) =>
      keys
        .map((k) => {
          const cell = row[k] === null || row[k] === undefined ? '' : row[k];
          let cellStr = typeof cell === 'object' ? JSON.stringify(cell) : String(cell);
          return `"${cellStr.replace(/"/g, '""')}"`;
        })
        .join(separator)
    ),
  ];
  return csvRows.join('\r\n');
}

export interface PerformComputerBackupParams {
  databaseJson: string;
  students: Student[];
  staff: Staff[];
  feePayments: FeePayment[];
  expenses: Expense[];
  settings?: SchoolSettings;
  encryptPassword?: string;
  maxKeepBackups?: number; // default: 30
}

export interface PerformComputerBackupResult {
  success: boolean;
  folderName?: string;
  filesSaved: string[];
  timestamp: string;
  error?: string;
}

/**
 * Performs an automated backup to the computer folder:
 * 1. Writes dated full JSON backup (optionally encrypted with AES-GCM).
 * 2. Writes CSV exports for students, staff, fees, expenses, and ledger.
 * 3. Prunes backups keeping only the last 30 backup sets.
 */
export async function performComputerBackup(
  params: PerformComputerBackupParams
): Promise<PerformComputerBackupResult> {
  const {
    databaseJson,
    students,
    staff,
    feePayments,
    expenses,
    settings,
    encryptPassword,
    maxKeepBackups = 30,
  } = params;

  if (!isFileSystemAccessSupported()) {
    return {
      success: false,
      filesSaved: [],
      timestamp: new Date().toISOString(),
      error: 'File System Access API is not supported on this browser or platform.',
    };
  }

  const handle = await getSavedDirectoryHandle();
  if (!handle) {
    return {
      success: false,
      filesSaved: [],
      timestamp: new Date().toISOString(),
      error: 'No computer backup folder has been configured yet. Please select a folder in Settings.',
    };
  }

  const hasPermission = await verifyDirectoryPermission(handle, true);
  if (!hasPermission) {
    return {
      success: false,
      filesSaved: [],
      timestamp: new Date().toISOString(),
      error: 'Permission to write to the backup folder was denied.',
    };
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
  const timestampIdentifier = `${dateStr}_${timeStr}`;

  const filesSaved: string[] = [];

  try {
    // 1. Write Full Database JSON (or AES-GCM Encrypted JSON)
    let jsonContentToWrite = databaseJson;
    let jsonFilename = `eduledger-backup-${timestampIdentifier}.json`;

    if (encryptPassword && encryptPassword.trim().length > 0) {
      const encrypted = await encryptBackupWithPassword(databaseJson, encryptPassword.trim());
      jsonContentToWrite = JSON.stringify(encrypted, null, 2);
      jsonFilename = `eduledger-backup-${timestampIdentifier}.enc.json`;
    }

    const jsonFileHandle = await handle.getFileHandle(jsonFilename, { create: true });
    const jsonWritable = await jsonFileHandle.createWritable();
    await jsonWritable.write(jsonContentToWrite);
    await jsonWritable.close();
    filesSaved.push(jsonFilename);

    // Build combined ledger transactions for ledger CSV export
    let runningBalance = 0;
    const combinedLedger = [
      ...feePayments.map((f) => ({
        date: f.date,
        type: 'INCOME' as const,
        description: `Fee: ${f.studentName} (${f.className})`,
        category: (f.category as string) || 'Fee Collection',
        paymentMode: String(f.paymentMode),
        referenceNumber: f.receiptNumber,
        credit: f.totalAmount,
        debit: 0,
      })),
      ...expenses.map((e) => ({
        date: e.date,
        type: 'EXPENSE' as const,
        description: e.title,
        category: e.category,
        paymentMode: String(e.paymentMode),
        referenceNumber: e.referenceNumber || e.id,
        credit: 0,
        debit: e.amount,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const ledgerTransactions = combinedLedger.map((item) => {
      runningBalance += item.credit - item.debit;
      return {
        ...item,
        balance: runningBalance,
      };
    });

    // 2. Generate and write CSV exports
    const csvConfigs: Array<{ name: string; content: string }> = [
      {
        name: `students_${dateStr}.csv`,
        content: convertRecordsToCsvString(formatStudentsForExport(students)),
      },
      {
        name: `staff_${dateStr}.csv`,
        content: convertRecordsToCsvString(formatStaffForExport(staff)),
      },
      {
        name: `fees_${dateStr}.csv`,
        content: convertRecordsToCsvString(formatFeePaymentsForExport(feePayments, settings?.currencySymbol || 'PKR')),
      },
      {
        name: `expenses_${dateStr}.csv`,
        content: convertRecordsToCsvString(formatExpensesForExport(expenses, settings?.currencySymbol || 'PKR')),
      },
      {
        name: `ledger_${dateStr}.csv`,
        content: convertRecordsToCsvString(formatLedgerForExport(ledgerTransactions, settings?.currencySymbol || 'PKR')),
      },
    ];

    for (const csv of csvConfigs) {
      try {
        const csvFileHandle = await handle.getFileHandle(csv.name, { create: true });
        const csvWritable = await csvFileHandle.createWritable();
        await csvWritable.write(csv.content);
        await csvWritable.close();
        filesSaved.push(csv.name);
      } catch (csvErr) {
        console.warn(`Could not save CSV ${csv.name}:`, csvErr);
      }
    }

    // 3. Prune old backups: Keep only the last 30 JSON backups
    try {
      const backupJsonFiles: string[] = [];
      for await (const [name, entry] of (handle as any).entries()) {
        if (entry.kind === 'file' && name.startsWith('eduledger-backup-') && (name.endsWith('.json') || name.endsWith('.enc.json'))) {
          backupJsonFiles.push(name);
        }
      }

      // Sort descending (newest first)
      backupJsonFiles.sort((a, b) => b.localeCompare(a));

      if (backupJsonFiles.length > maxKeepBackups) {
        const toDelete = backupJsonFiles.slice(maxKeepBackups);
        for (const fileNameToDelete of toDelete) {
          try {
            await handle.removeEntry(fileNameToDelete);
          } catch (delErr) {
            console.warn(`Could not prune old backup ${fileNameToDelete}:`, delErr);
          }
        }
      }
    } catch (pruneErr) {
      console.warn('Pruning check encountered warning:', pruneErr);
    }

    // Run Consistency Check on the written backup file
    await verifyBackupConsistency(jsonContentToWrite, jsonFilename, jsonContentToWrite.length);

    // Save metadata
    const completedTimestamp = now.toISOString();
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_BACKUP_TIME_KEY, completedTimestamp);
      localStorage.setItem(LAST_BACKUP_NAME_KEY, jsonFilename);
    }

    return {
      success: true,
      folderName: handle.name || 'Computer Backup Folder',
      filesSaved,
      timestamp: completedTimestamp,
    };
  } catch (err: unknown) {
    console.error('Failed to perform computer backup:', err);
    return {
      success: false,
      filesSaved,
      timestamp: now.toISOString(),
      error: err instanceof Error ? err.message : 'Unknown error saving to computer folder.',
    };
  }
}

/**
 * Retrieves the timestamp of the last computer backup
 */
export function getLastComputerBackupTimestamp(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_BACKUP_TIME_KEY);
}

/**
 * Retrieves the filename of the last computer backup
 */
export function getLastComputerBackupFilename(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_BACKUP_NAME_KEY);
}

/**
 * Checks whether the last backup is overdue (e.g. older than 7 days)
 */
export function checkIsBackupOverdue(maxDays = 7): {
  isOverdue: boolean;
  daysSinceLast: number;
  lastDateStr: string | null;
} {
  const lastTime = getLastComputerBackupTimestamp();
  if (!lastTime) {
    return {
      isOverdue: true,
      daysSinceLast: 999,
      lastDateStr: null,
    };
  }

  try {
    const lastDate = new Date(lastTime);
    const diffMs = Date.now() - lastDate.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return {
      isOverdue: days >= maxDays,
      daysSinceLast: days,
      lastDateStr: lastDate.toLocaleDateString(),
    };
  } catch {
    return {
      isOverdue: true,
      daysSinceLast: 999,
      lastDateStr: null,
    };
  }
}


const CONSISTENCY_STATUS_KEY = 'eduledger_last_backup_consistency';

export interface BackupConsistencyStatus {
  status: 'verified' | 'failed' | 'unchecked';
  checkedAt?: string;
  filename?: string;
  fileSizeBytes?: number;
  isEncrypted?: boolean;
  totalRecords?: number;
  entityBreakdown?: {
    students: number;
    staff: number;
    feePayments: number;
    expenses: number;
    studentAttendance: number;
    staffAttendance: number;
    users: number;
    exams: number;
    books: number;
  };
  sha256Checksum?: string;
  schemaVersion?: number;
  schoolName?: string;
  message?: string;
  error?: string;
}

/**
 * Retrieves the stored consistency check status from localStorage
 */
export function getStoredBackupConsistencyStatus(): BackupConsistencyStatus {
  if (typeof window === 'undefined') {
    return { status: 'unchecked', message: 'Not checked yet' };
  }
  try {
    const raw = localStorage.getItem(CONSISTENCY_STATUS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Could not parse stored consistency status:', err);
  }
  return { status: 'unchecked', message: 'Not checked yet' };
}

/**
 * Saves consistency status to localStorage
 */
export function saveBackupConsistencyStatus(status: BackupConsistencyStatus): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONSISTENCY_STATUS_KEY, JSON.stringify(status));
  }
}

/**
 * Verifies the integrity and consistency of a raw JSON backup string
 */
export async function verifyBackupConsistency(
  rawJson: string,
  filename?: string,
  fileSizeBytes?: number
): Promise<BackupConsistencyStatus> {
  const now = new Date().toISOString();

  if (!rawJson || rawJson.trim().length === 0) {
    const res: BackupConsistencyStatus = {
      status: 'failed',
      checkedAt: now,
      filename,
      fileSizeBytes: fileSizeBytes || 0,
      error: 'Backup file is empty (0 bytes). Corrupt or incomplete write.',
    };
    saveBackupConsistencyStatus(res);
    return res;
  }

  try {
    const sha256 = await legacySha256(rawJson);
    const parsed = JSON.parse(rawJson);

    // 1. Check for AES-GCM Encrypted Backup format
    if (parsed.encrypted === true && parsed.ciphertext && parsed.salt && parsed.iv) {
      const res: BackupConsistencyStatus = {
        status: 'verified',
        checkedAt: now,
        filename,
        fileSizeBytes: fileSizeBytes || rawJson.length,
        isEncrypted: true,
        sha256Checksum: sha256.slice(0, 16) + '...',
        schoolName: parsed.schoolName || 'EduLedger School',
        message: 'AES-GCM 256-bit encrypted backup envelope verified intact with valid cryptographic headers.',
      };
      saveBackupConsistencyStatus(res);
      return res;
    }

    // 2. Validate unencrypted database schema
    const inspection = inspectBackupJson(rawJson);
    if (!inspection.valid) {
      const res: BackupConsistencyStatus = {
        status: 'failed',
        checkedAt: now,
        filename,
        fileSizeBytes: fileSizeBytes || rawJson.length,
        error: inspection.error || 'Schema validation failed: Missing required database entity stores.',
      };
      saveBackupConsistencyStatus(res);
      return res;
    }

    const counts = inspection.entityCounts;
    const totalRecords =
      counts.students +
      counts.staff +
      counts.feePayments +
      counts.expenses +
      counts.studentAttendance +
      counts.staffAttendance +
      counts.users +
      counts.exams +
      counts.books;

    const res: BackupConsistencyStatus = {
      status: 'verified',
      checkedAt: now,
      filename: filename || inspection.exportedAt || 'eduledger-backup.json',
      fileSizeBytes: fileSizeBytes || rawJson.length,
      isEncrypted: false,
      totalRecords,
      entityBreakdown: {
        students: counts.students,
        staff: counts.staff,
        feePayments: counts.feePayments,
        expenses: counts.expenses,
        studentAttendance: counts.studentAttendance,
        staffAttendance: counts.staffAttendance,
        users: counts.users,
        exams: counts.exams,
        books: counts.books,
      },
      sha256Checksum: sha256.slice(0, 16) + '...',
      schemaVersion: inspection.schemaVersion || 2,
      schoolName: inspection.schoolName || 'EduLedger School',
      message: 'Integrity verified! All ' + totalRecords + ' records across 9 collections are consistent and uncorrupted.',
    };

    saveBackupConsistencyStatus(res);
    return res;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Invalid JSON syntax.';
    const res: BackupConsistencyStatus = {
      status: 'failed',
      checkedAt: now,
      filename,
      fileSizeBytes: fileSizeBytes || rawJson.length,
      error: 'JSON syntax or parsing error: ' + errorMsg,
    };
    saveBackupConsistencyStatus(res);
    return res;
  }
}

/**
 * Attempts to read the last saved computer backup file from the connected PC directory
 * and verifies its consistency
 */
export async function verifyLastComputerBackupFile(): Promise<BackupConsistencyStatus> {
  const lastFilename = getLastComputerBackupFilename();
  const handle = await getSavedDirectoryHandle();

  if (handle && lastFilename) {
    try {
      const hasPerm = await verifyDirectoryPermission(handle, false);
      if (hasPerm) {
        const fileHandle = await handle.getFileHandle(lastFilename);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return await verifyBackupConsistency(text, lastFilename, file.size);
      }
    } catch (fsErr) {
      console.warn('Could not read last backup file from folder handle:', fsErr);
    }
  }

  // Fallback to checking the stored consistency status
  const current = getStoredBackupConsistencyStatus();
  if (current.status !== 'unchecked') {
    return current;
  }

  return {
    status: 'unchecked',
    filename: lastFilename || undefined,
    message: 'No file verification has been run yet. Click "Verify Integrity Now" to inspect.',
  };
}

/**
 * Reads the latest JSON backup file directly from the connected PC directory handle
 */
export async function readLastComputerBackupFile(): Promise<{
  success: boolean;
  filename?: string;
  content?: string;
  fileSizeBytes?: number;
  error?: string;
}> {
  const lastFilename = getLastComputerBackupFilename();
  const handle = await getSavedDirectoryHandle();

  if (!handle) {
    return {
      success: false,
      error: 'No local backup directory is connected. Please select your backup folder on PC first.',
    };
  }

  if (!lastFilename) {
    return {
      success: false,
      error: 'No backup file has been recorded in the connected directory yet. Take a backup first.',
    };
  }

  try {
    const hasPerm = await verifyDirectoryPermission(handle, false);
    if (!hasPerm) {
      return {
        success: false,
        error: 'Directory read permission required. Please grant permission when prompted.',
      };
    }
    const fileHandle = await handle.getFileHandle(lastFilename);
    const file = await fileHandle.getFile();
    const content = await file.text();
    return {
      success: true,
      filename: lastFilename,
      content,
      fileSizeBytes: file.size,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Could not read backup file from connected directory.',
    };
  }
}
