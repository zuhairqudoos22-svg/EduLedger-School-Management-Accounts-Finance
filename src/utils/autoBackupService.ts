import {
  AutoBackupConfig,
  AutoBackupFrequency,
  BackupSnapshotRecord,
  BackupTriggerType,
} from '../types';
import {
  exportFullDatabaseJson,
  inspectBackupJson,
  saveBackupSnapshotDB,
  getAllBackupSnapshotsDB,
  deleteBackupSnapshotDB,
} from '../db/indexedDB';

export const DEFAULT_AUTO_BACKUP_CONFIG: AutoBackupConfig = {
  enabled: true,
  frequency: 'daily',
  maxStoredSnapshots: 10,
  autoPromptDownload: false,
  folderBackupEnabled: false,
  backupOnLogout: true,
  backupDaily: true,
  keepLastBackupsCount: 30,
  encryptWithPassword: false,
};

const STORAGE_KEY_CONFIG = 'eduledger_auto_backup_config';

/**
 * Returns the millisecond duration for a given backup schedule frequency
 */
export function getFrequencyIntervalMs(frequency: AutoBackupFrequency): number {
  switch (frequency) {
    case 'hourly':
      return 60 * 60 * 1000;
    case 'every_6_hours':
      return 6 * 60 * 60 * 1000;
    case 'every_12_hours':
      return 12 * 60 * 60 * 1000;
    case 'daily':
      return 24 * 60 * 60 * 1000;
    case 'every_3_days':
      return 3 * 24 * 60 * 60 * 1000;
    case 'weekly':
      return 7 * 24 * 60 * 60 * 1000;
    case 'disabled':
    default:
      return Infinity;
  }
}

/**
 * Load auto-backup config from localStorage with fallback to default
 */
export function loadAutoBackupConfig(savedInSettings?: AutoBackupConfig): AutoBackupConfig {
  if (savedInSettings && typeof savedInSettings.enabled === 'boolean') {
    return { ...DEFAULT_AUTO_BACKUP_CONFIG, ...savedInSettings };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_AUTO_BACKUP_CONFIG, ...parsed };
    }
  } catch {
    // Ignore error
  }
  return DEFAULT_AUTO_BACKUP_CONFIG;
}

/**
 * Save auto-backup config to localStorage
 */
export function saveAutoBackupConfigToStorage(config: AutoBackupConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save auto backup config to localStorage:', e);
  }
}

/**
 * Calculates the next scheduled ISO timestamp
 */
export function calculateNextBackupTime(
  frequency: AutoBackupFrequency,
  lastTimestamp?: string
): string | undefined {
  if (frequency === 'disabled') return undefined;
  const interval = getFrequencyIntervalMs(frequency);
  if (!isFinite(interval)) return undefined;

  const baseTime = lastTimestamp ? new Date(lastTimestamp).getTime() : Date.now();
  return new Date(baseTime + interval).toISOString();
}

/**
 * Checks if an automated backup is overdue based on current configuration
 */
export function isBackupDue(config: AutoBackupConfig): boolean {
  if (!config.enabled || config.frequency === 'disabled') return false;
  if (!config.lastAutoBackupTimestamp) return true; // never run before

  const interval = getFrequencyIntervalMs(config.frequency);
  if (!isFinite(interval)) return false;

  const lastRun = new Date(config.lastAutoBackupTimestamp).getTime();
  const now = Date.now();
  return now - lastRun >= interval;
}

/**
 * Helper to download a JSON backup file to the user's local disk
 */
export function downloadJsonFile(
  jsonString: string,
  customFilename?: string,
  schoolName = 'EduLedger'
): { filename: string; sizeBytes: number } {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const safeSchoolName = (schoolName || 'EduLedger')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase();
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const filename =
    customFilename || `eduledger_full_backup_${safeSchoolName}_${dateStr}_${timeStr}.json`;

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    filename,
    sizeBytes: blob.size,
  };
}

/**
 * Performs snapshot creation of current entire database state and saves it to IndexedDB vault
 */
export async function createAndSaveSnapshot(
  trigger: BackupTriggerType,
  title?: string,
  notes?: string
): Promise<BackupSnapshotRecord> {
  const jsonString = await exportFullDatabaseJson();
  const inspection = inspectBackupJson(jsonString);

  const now = new Date();
  const id = `snapshot_${trigger}_${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`;
  const sizeBytes = new Blob([jsonString]).size;
  const recordsCount = Object.values(inspection.entityCounts).reduce((a, b) => (a || 0) + (b || 0), 0);

  const defaultTitle =
    trigger === 'automated_scheduled'
      ? `Automated Scheduled Snapshot`
      : trigger === 'pre_restore_safety'
      ? `Pre-Restore Safety Checkpoint`
      : trigger === 'manual_export'
      ? `Manual Export Snapshot`
      : `Application State Checkpoint`;

  const snapshot: BackupSnapshotRecord = {
    id,
    timestamp: now.toISOString(),
    trigger,
    title: title || defaultTitle,
    notes: notes || `Captured ${recordsCount} entities across all database stores.`,
    sizeBytes,
    recordsCount,
    entityCounts: inspection.entityCounts,
    jsonData: jsonString,
  };

  await saveBackupSnapshotDB(snapshot);
  return snapshot;
}

/**
 * Enforces maximum stored snapshots retention limit, deleting oldest ones
 */
export async function enforceSnapshotRetention(maxCount = 10): Promise<void> {
  try {
    const all = await getAllBackupSnapshotsDB();
    if (all.length > maxCount) {
      // Keep safety checkpoints if possible or simply delete oldest
      const toDelete = all.slice(maxCount);
      for (const item of toDelete) {
        await deleteBackupSnapshotDB(item.id);
      }
    }
  } catch (e) {
    console.warn('Failed to prune older snapshots from vault:', e);
  }
}

/**
 * Format bytes to readable KB/MB
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format relative time (e.g., "Just now", "5 minutes ago", "2 hours ago")
 */
export function getRelativeTimeString(isoDate: string): string {
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    if (diffMs < 0) return 'Just now';
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(isoDate).toLocaleDateString();
  } catch {
    return 'Unknown';
  }
}
