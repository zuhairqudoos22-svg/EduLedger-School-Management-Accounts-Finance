/**
 * EduLedger Data Management & Reset Service
 * 
 * Strict Compliance:
 * - Free Spark Tier Only: No Cloud Functions, No Cloud Storage, No Paid Services
 * - Client-Side Batched Deletion: writeBatch in chunks of up to 400 documents (sequential with pause)
 * - Multi-Device Invalidation: Updates resetEpoch / schoolDataVersion in Firestore so other devices invalidate cache
 * - Atomic Child-Record Cleanup: Deletes linked records together to prevent orphaned records
 * - Offline Cache Termination: terminate() and clearIndexedDbPersistence()
 */

import {
  collection,
  doc,
  getDocs,
  writeBatch,
  setDoc,
  updateDoc,
  serverTimestamp,
  terminate,
  clearIndexedDbPersistence,
} from 'firebase/firestore';
import { getFirestoreDb, isFirebaseConfigured } from './firebase';
import { getSchoolPath } from './cloudSyncService';
import {
  ClearableDataModule,
  ResetAllDataOptions,
  SchoolDataSummary,
  DeviceInfoSummary,
} from '../types';
import {
  removeDemoDataDB,
  clearSelectedModulesDB,
  clearFinancialDataDB,
  resetEntireSchoolDatabaseDB,
  getSchoolDataSummaryDB,
  getDB,
} from '../db/indexedDB';
import { payrollStorage } from '../utils/payrollStorage';

export interface ProgressCallback {
  (progress: { step: string; percent: number; current: number; total: number }): void;
}

/**
 * Pause execution helper to remain within Firestore write rate limits on Free Spark Tier
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Client-Side Firestore Collection Batch Deletion (Free Spark Tier Compliant)
 * Deletes documents in batches of up to 400 with a 50ms pause between batches.
 * If filterDemoOnly is true, only deletes documents where isDemo === true.
 */
export async function deleteFirestoreCollectionBatch(
  schoolId: string,
  subCollection: string,
  onProgress?: (deleted: number, total: number) => void,
  filterDemoOnly: boolean = false
): Promise<number> {
  const firestore = getFirestoreDb();
  if (!firestore || !isFirebaseConfigured()) return 0;

  try {
    const collRef = collection(firestore, getSchoolPath(schoolId, subCollection));
    const snapshot = await getDocs(collRef);
    if (snapshot.empty) return 0;

    const docsToDelete = filterDemoOnly
      ? snapshot.docs.filter(d => d.data().isDemo === true)
      : snapshot.docs;

    const total = docsToDelete.length;
    if (total === 0) return 0;

    let deletedCount = 0;
    const CHUNK_SIZE = 400; // Well within 500 batch limit

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = docsToDelete.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(firestore);

      for (const docSnap of chunk) {
        batch.delete(docSnap.ref);
      }

      await batch.commit();
      deletedCount += chunk.length;
      if (onProgress) {
        onProgress(deletedCount, total);
      }
      // Gentle pause to stay under rate limits
      await sleep(60);
    }

    return deletedCount;
  } catch (err) {
    console.warn(`Firestore batch delete for ${subCollection} notice:`, err);
    return 0;
  }
}

/**
 * Updates the school reset epoch in Firestore general settings.
 * Other devices listening to this document will notice a higher epoch and invalidate local cache.
 */
export async function updateCloudResetEpoch(schoolId: string): Promise<number> {
  const firestore = getFirestoreDb();
  if (!firestore || !isFirebaseConfigured()) return Date.now();

  const newEpoch = Date.now();
  try {
    const settingsRef = doc(firestore, getSchoolPath(schoolId, 'settings'), 'general');
    await setDoc(
      settingsRef,
      {
        resetEpoch: newEpoch,
        schoolDataVersion: newEpoch,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not update Firestore resetEpoch:', err);
  }
  return newEpoch;
}

/**
 * 1. REMOVE DEMO DATA ONLY
 * Deletes only records tagged with isDemo: true locally in IndexedDB and in Firestore.
 */
export async function executeRemoveDemoData(
  schoolId: string,
  onProgress?: ProgressCallback
): Promise<{ success: boolean; totalDeleted: number; details: Record<string, number> }> {
  onProgress?.({ step: 'Scanning local database for demo records...', percent: 10, current: 0, total: 100 });

  // 1. Local IndexedDB removal
  const localResult = await removeDemoDataDB();

  onProgress?.({ step: 'Clearing demo records from Cloud Firestore...', percent: 50, current: 50, total: 100 });

  // 2. Cloud Firestore removal (if online)
  if (isFirebaseConfigured()) {
    const collectionsToClean = [
      'students',
      'staff',
      'staffLeaves',
      'attendance',
      'staffAttendance',
      'feeStructures',
      'feePayments',
      'expenses',
      'payrollRuns',
      'salaryRecords',
      'exams',
      'examResults',
      'budgets',
      'books',
      'bookSales',
      'bookSuppliers',
      'supplierPayments',
      'certificates',
      'assets',
    ];

    for (const col of collectionsToClean) {
      await deleteFirestoreCollectionBatch(schoolId, col, undefined, true);
    }
  }

  onProgress?.({ step: 'Demo data successfully removed.', percent: 100, current: 100, total: 100 });

  return {
    success: true,
    totalDeleted: localResult.totalDeleted,
    details: localResult.deletedCounts,
  };
}

/**
 * 2. CLEAR SELECTED MODULES
 * Clears specified module stores locally and in Cloud Firestore.
 */
export async function executeClearSelectedModules(
  schoolId: string,
  selectedModules: ClearableDataModule[],
  onProgress?: ProgressCallback
): Promise<{ success: boolean; totalDeleted: number }> {
  onProgress?.({ step: 'Clearing selected modules in local database...', percent: 20, current: 20, total: 100 });

  const localRes = await clearSelectedModulesDB(selectedModules);

  onProgress?.({ step: 'Syncing module deletions with Cloud Firestore...', percent: 60, current: 60, total: 100 });

  if (isFirebaseConfigured()) {
    const moduleToCloudColl: Record<string, string[]> = {
      students: ['students', 'attendance', 'certificates'],
      staff: ['staff', 'staffLeaves', 'staffAttendance'],
      attendance: ['attendance', 'staffAttendance'],
      feeCollections: ['feePayments'],
      feeStructures: ['feeStructures'],
      expenses: ['expenses'],
      payroll: ['payrollRuns', 'salaryRecords', 'loans', 'advances'],
      exams: ['exams', 'examResults'],
      budgets: ['budgets'],
      books: ['books', 'bookSales', 'bookSuppliers', 'supplierPayments'],
      certificates: ['certificates'],
      assets: ['assets'],
    };

    for (const mod of selectedModules) {
      const colls = moduleToCloudColl[mod] || [];
      for (const col of colls) {
        await deleteFirestoreCollectionBatch(schoolId, col);
      }
    }

    await updateCloudResetEpoch(schoolId);
  }

  onProgress?.({ step: 'Selected modules cleared successfully.', percent: 100, current: 100, total: 100 });

  return {
    success: true,
    totalDeleted: localRes.recordsDeleted,
  };
}

/**
 * 3. CLEAR FINANCIAL DATA ONLY
 * Wipes fees, payments, discounts, expenses, ledger, payroll, loans, budgets.
 * Retains student profiles, staff directories, and academic settings.
 */
export async function executeClearFinancialData(
  schoolId: string,
  onProgress?: ProgressCallback
): Promise<{ success: boolean; totalDeleted: number }> {
  onProgress?.({ step: 'Purging local financial records...', percent: 25, current: 25, total: 100 });

  const localRes = await clearFinancialDataDB();

  onProgress?.({ step: 'Purging cloud financial transactions...', percent: 65, current: 65, total: 100 });

  if (isFirebaseConfigured()) {
    const financialColls = [
      'feePayments',
      'expenses',
      'payrollRuns',
      'salaryRecords',
      'loans',
      'advances',
      'budgets',
      'supplierPayments',
      'bookSales',
    ];
    for (const col of financialColls) {
      await deleteFirestoreCollectionBatch(schoolId, col);
    }
    await updateCloudResetEpoch(schoolId);
  }

  onProgress?.({ step: 'Financial data purged successfully.', percent: 100, current: 100, total: 100 });

  return {
    success: true,
    totalDeleted: localRes.recordsDeleted,
  };
}

/**
 * 4. RESET ENTIRE SCHOOL DATA (Factory Reset)
 * Resets all operational school collections.
 */
export async function executeFactoryReset(
  schoolId: string,
  options: ResetAllDataOptions,
  onProgress?: ProgressCallback
): Promise<{ success: boolean }> {
  onProgress?.({ step: 'Wiping local school database stores...', percent: 20, current: 20, total: 100 });

  await resetEntireSchoolDatabaseDB({
    keepCurrentUser: options.keepAdminAccount,
    newSchoolName: options.newSchoolName,
    newSchoolTagline: options.newSchoolTagline,
    newCurrency: options.newCurrency,
  });

  payrollStorage.clearAllPayrollData();

  onProgress?.({ step: 'Purging Cloud Firestore collections...', percent: 60, current: 60, total: 100 });

  if (isFirebaseConfigured()) {
    const allColls = [
      'students',
      'staff',
      'staffLeaves',
      'attendance',
      'staffAttendance',
      'feeStructures',
      'feePayments',
      'expenses',
      'payrollRuns',
      'salaryRecords',
      'loans',
      'advances',
      'exams',
      'examResults',
      'budgets',
      'books',
      'bookSales',
      'bookSuppliers',
      'supplierPayments',
      'certificates',
      'assets',
      'summaries',
    ];

    if (options.deleteEverythingIncludingAccounts) {
      allColls.push('users');
    }

    for (const col of allColls) {
      await deleteFirestoreCollectionBatch(schoolId, col);
    }

    await updateCloudResetEpoch(schoolId);
  }

  onProgress?.({ step: 'Factory reset completed. System restored to clean state.', percent: 100, current: 100, total: 100 });

  return { success: true };
}

/**
 * 5. CLEAR THIS DEVICE'S LOCAL CACHE ONLY
 * Deletes IndexedDB database, Service Worker caches, and local session on THIS computer.
 * Cloud data remains completely safe!
 */
export async function executeClearThisDeviceCache(
  onProgress?: ProgressCallback
): Promise<void> {
  onProgress?.({ step: 'Terminating Firestore offline persistence...', percent: 20, current: 20, total: 100 });

  const firestore = getFirestoreDb();
  if (firestore) {
    try {
      await terminate(firestore);
      await clearIndexedDbPersistence(firestore);
    } catch (e) {
      console.warn('Firestore offline cache clear notice:', e);
    }
  }

  onProgress?.({ step: 'Clearing local IndexedDB storage...', percent: 50, current: 50, total: 100 });

  try {
    const db = await getDB();
    db.close();
  } catch {}

  try {
    indexedDB.deleteDatabase('eduledger_school_db');
  } catch (e) {
    console.warn('IndexedDB delete notice:', e);
  }

  onProgress?.({ step: 'Clearing Service Worker and asset caches...', percent: 80, current: 80, total: 100 });

  if (typeof caches !== 'undefined') {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (e) {
      console.warn('CacheStorage clear notice:', e);
    }
  }

  // Clear local storage keys
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('eduledger_') || key.startsWith('firebase:'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch {}

  onProgress?.({ step: 'Local device cache cleared. Reloading application...', percent: 100, current: 100, total: 100 });

  await sleep(400);
  window.location.reload();
}

/**
 * Gathers device storage statistics and diagnostic metadata
 */
export async function getDeviceStorageEstimate(
  schoolName: string
): Promise<DeviceInfoSummary> {
  let usedMB = 0;
  let quotaMB = 0;

  if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const est = await navigator.storage.estimate();
      if (est.usage) usedMB = Math.round((est.usage / (1024 * 1024)) * 10) / 10;
      if (est.quota) quotaMB = Math.round((est.quota / (1024 * 1024)) * 10) / 10;
    } catch {}
  }

  const lastSync = typeof window !== 'undefined' ? localStorage.getItem('eduledger_last_synced_at') : null;
  const summary = await getSchoolDataSummaryDB();

  return {
    schoolName: schoolName || 'EduLedger School',
    dataSource: isFirebaseConfigured() ? 'Cloud Firestore + Local IndexedDB' : 'Local IndexedDB (Offline)',
    lastSyncTime: lastSync,
    totalRecords: summary.totalRecords,
    appVersion: 'EduLedger v2.4.0 (PWA Standalone)',
    storageEstimate: quotaMB > 0 ? { usedMB, quotaMB } : undefined,
  };
}

/**
 * 6. RESET ANNUAL BUDGET & PAYROLL PROJECTIONS
 * Clears historical payroll runs, salary records, staff loans, and advances,
 * and resets annual budget and payroll expense projections back to a clean slate.
 */
export async function executeResetAnnualBudgetAndPayroll(
  schoolId: string,
  onProgress?: ProgressCallback
): Promise<{ success: boolean; totalDeleted: number }> {
  onProgress?.({ step: 'Purging local payroll runs and projection baselines...', percent: 20, current: 20, total: 100 });

  const payrollCleared = payrollStorage.clearAllPayrollData();

  // Clear local IndexedDB stores for payroll
  const db = await getDB();
  let indexedDbDeleted = 0;
  const payrollStores = ['payrollRuns', 'salaryRecords'].filter(s => db.objectStoreNames.contains(s));
  if (payrollStores.length > 0) {
    const tx = db.transaction(payrollStores, 'readwrite');
    for (const store of payrollStores) {
      const records = await tx.objectStore(store).getAll();
      indexedDbDeleted += records.length;
      await tx.objectStore(store).clear();
    }
    await tx.done;
  }

  const totalLocal = (payrollCleared.clearedRuns || 0) + (payrollCleared.clearedLoans || 0) + (payrollCleared.clearedAdvances || 0) + indexedDbDeleted;

  onProgress?.({ step: 'Purging cloud payroll collections and synchronizing...', percent: 65, current: 65, total: 100 });

  if (isFirebaseConfigured()) {
    const payrollColls = ['payrollRuns', 'salaryRecords', 'loans', 'advances'];
    for (const col of payrollColls) {
      await deleteFirestoreCollectionBatch(schoolId, col);
    }
    await updateCloudResetEpoch(schoolId);
  }

  onProgress?.({ step: 'Annual budget and payroll expense projections reset successfully.', percent: 100, current: 100, total: 100 });

  return {
    success: true,
    totalDeleted: totalLocal,
  };
}
