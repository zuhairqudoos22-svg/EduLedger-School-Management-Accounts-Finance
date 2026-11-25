import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { getFirestoreDb, isFirebaseConfigured } from './firebase';
import { getSchoolPath } from './cloudSyncService';
import { IssuedCertificate, SchoolSettings } from '../types';

const LOCAL_COUNTER_PREFIX = 'eduledger_cert_counter_seq_v2';

/**
 * Resolves the exact Firestore schoolId used by SchoolContext cloud sync
 * so atomic counter transactions live under the same `/schools/{schoolId}/counters/...` tree.
 */
export function resolveSchoolIdFromSettings(settings?: Pick<SchoolSettings, 'schoolName' | 'schoolId'>): string {
  if (settings?.schoolId && settings.schoolId.trim()) {
    return settings.schoolId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }
  if (settings?.schoolName && settings.schoolName.trim()) {
    return settings.schoolName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }
  return 'main';
}

function getLocalCounterKey(schoolId: string, year: number): string {
  return `${LOCAL_COUNTER_PREFIX}_${schoolId}_${year}`;
}

/**
 * Extracts the highest numeric sequence suffix for the given year from existing certificates
 * and localStorage so offline reservations never collide with already-issued certificates.
 */
function findHighestLocalSeq(
  existingCertificates: IssuedCertificate[],
  schoolId: string,
  year: number
): number {
  let maxSeq = 0;
  const yearPattern = new RegExp(`-${year}-(\\d+)$`);

  for (const cert of existingCertificates) {
    const num = (cert.certificateNumber || '').trim();
    const yearMatch = num.match(yearPattern);
    if (yearMatch) {
      const n = parseInt(yearMatch[1], 10);
      if (!Number.isNaN(n) && n > maxSeq && n < 9_000_000) {
        maxSeq = n;
      }
      continue;
    }
    // Also check legacy/generic trailing digits when issue year matches
    const issueYear = (cert.issueDate || '').slice(0, 4);
    if (issueYear === String(year)) {
      const genericMatch = num.match(/(\d+)$/);
      if (genericMatch) {
        const n = parseInt(genericMatch[1], 10);
        if (!Number.isNaN(n) && n > maxSeq && n < 9_000_000) {
          maxSeq = n;
        }
      }
    }
  }

  try {
    const storedYear = parseInt(localStorage.getItem(getLocalCounterKey(schoolId, year)) || '0', 10);
    if (!Number.isNaN(storedYear) && storedYear > maxSeq) {
      maxSeq = storedYear;
    }
    const storedLegacy = parseInt(localStorage.getItem('eduledger_cert_counter_seq_v1') || '0', 10);
    if (!Number.isNaN(storedLegacy) && storedLegacy > maxSeq) {
      maxSeq = storedLegacy;
    }
  } catch {
    // Ignore restricted storage
  }
  return maxSeq;
}

/**
 * Formats a sequential certificate number like CERT-2026-00042.
 */
export function formatCertificateNumber(
  seq: number,
  prefix: string = 'CERT',
  year: number = new Date().getFullYear()
): string {
  const cleanPrefix =
    (prefix || 'CERT')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '')
      .slice(0, 12) || 'CERT';
  return `${cleanPrefix}-${year}-${String(seq).padStart(5, '0')}`;
}

export interface CertificateCounterStatus {
  schoolId: string;
  year: number;
  prefix: string;
  currentSeq: number;
  nextNumber: string;
  mode: 'firestore_transaction' | 'local_counter';
  syncedWithCloud: boolean;
  lastUpdatedAt?: string;
}

/**
 * Reads the live Firestore counter document (`/schools/{schoolId}/counters/certificates_{year}`)
 * and aligns the local sequence floor so multi-device previews stay accurate.
 */
export async function syncCertificateCounterWithCloud(options: {
  prefix?: string;
  schoolId?: string;
  settings?: Pick<SchoolSettings, 'schoolName' | 'schoolId'>;
  existingCertificates?: IssuedCertificate[];
}): Promise<CertificateCounterStatus> {
  const year = new Date().getFullYear();
  const prefix = options.prefix || 'CERT';
  const schoolId = options.schoolId || resolveSchoolIdFromSettings(options.settings);
  const existing = options.existingCertificates || [];

  let currentSeq = findHighestLocalSeq(existing, schoolId, year);
  let syncedWithCloud = false;
  let lastUpdatedAt: string | undefined;

  const db = getFirestoreDb();
  const isOnline = typeof navigator === 'undefined' || navigator.onLine;
  const canUseCloud = Boolean(db && isFirebaseConfigured() && isOnline);

  if (canUseCloud && db) {
    try {
      const yearDocRef = doc(db, getSchoolPath(schoolId, 'counters'), `certificates_${year}`);
      const legacyDocRef = doc(db, getSchoolPath(schoolId, 'counters'), 'certificates');
      const [yearSnap, legacySnap] = await Promise.all([
        getDoc(yearDocRef),
        getDoc(legacyDocRef),
      ]);

      let remoteSeq = 0;
      if (yearSnap.exists() && typeof yearSnap.data()?.seq === 'number') {
        remoteSeq = Math.max(remoteSeq, yearSnap.data().seq);
        if (typeof yearSnap.data()?.updatedAt === 'string') {
          lastUpdatedAt = yearSnap.data().updatedAt;
        }
      }
      if (
        legacySnap.exists() &&
        typeof legacySnap.data()?.seq === 'number' &&
        (legacySnap.data()?.year === year || !legacySnap.data()?.year)
      ) {
        remoteSeq = Math.max(remoteSeq, legacySnap.data().seq);
        if (!lastUpdatedAt && typeof legacySnap.data()?.updatedAt === 'string') {
          lastUpdatedAt = legacySnap.data().updatedAt;
        }
      }

      if (remoteSeq > currentSeq) {
        currentSeq = remoteSeq;
        try {
          localStorage.setItem(getLocalCounterKey(schoolId, year), String(currentSeq));
        } catch {
          // Ignore storage quota errors
        }
      }
      syncedWithCloud = true;
    } catch (err) {
      console.warn('[CertificateRegistry] Cloud counter sync skipped:', err);
    }
  }

  return {
    schoolId,
    year,
    prefix,
    currentSeq,
    nextNumber: formatCertificateNumber(currentSeq + 1, prefix, year),
    mode: canUseCloud && syncedWithCloud ? 'firestore_transaction' : 'local_counter',
    syncedWithCloud,
    lastUpdatedAt,
  };
}

/**
 * Atomically reserves `count` unique, monotonic certificate numbers (e.g., CERT-2026-00042).
 *
 * - Online + Firebase configured: uses a Firestore `runTransaction` on
 *   `/schools/{schoolId}/counters/certificates_{year}` (also honoring any existing legacy
 *   `/schools/{schoolId}/counters/certificates` sequence for the same year) so concurrent
 *   administrators across multiple devices NEVER receive duplicate IDs.
 * - Offline / Local-only: atomically advances the local monotonic sequence above both
 *   localStorage and existing IndexedDB records, avoiding any collision.
 */
export async function reserveCertificateNumbers(options: {
  count: number;
  prefix?: string;
  schoolId?: string;
  settings?: Pick<SchoolSettings, 'schoolName' | 'schoolId'>;
  existingCertificates?: IssuedCertificate[];
}): Promise<{
  numbers: string[];
  startSeq: number;
  endSeq: number;
  source: 'firestore_transaction' | 'local_counter';
}> {
  const count = Math.max(1, Math.min(500, Math.floor(options.count)));
  const year = new Date().getFullYear();
  const prefix = options.prefix || 'CERT';
  const schoolId = options.schoolId || resolveSchoolIdFromSettings(options.settings);
  const existing = options.existingCertificates || [];

  const localFloor = findHighestLocalSeq(existing, schoolId, year);

  // Attempt atomic Firestore transaction first when configured & online
  const db = getFirestoreDb();
  if (db && isFirebaseConfigured() && (typeof navigator === 'undefined' || navigator.onLine)) {
    try {
      const yearCounterRef = doc(db, getSchoolPath(schoolId, 'counters'), `certificates_${year}`);
      const legacyCounterRef = doc(db, getSchoolPath(schoolId, 'counters'), 'certificates');

      const startSeq = await runTransaction(db, async (tx) => {
        const yearSnap = await tx.get(yearCounterRef);
        const legacySnap = await tx.get(legacyCounterRef);

        const yearRemote =
          yearSnap.exists() && typeof yearSnap.data()?.seq === 'number'
            ? yearSnap.data().seq
            : 0;
        const legacyRemote =
          legacySnap.exists() &&
          typeof legacySnap.data()?.seq === 'number' &&
          (legacySnap.data()?.year === year || !legacySnap.data()?.year)
            ? legacySnap.data().seq
            : 0;

        const base = Math.max(yearRemote, legacyRemote, localFloor);
        const nextEnd = base + count;

        tx.set(
          yearCounterRef,
          {
            seq: nextEnd,
            year,
            prefix,
            updatedAt: new Date().toISOString(),
            _syncedAt: serverTimestamp(),
          },
          { merge: true }
        );

        return base + 1;
      });

      const endSeq = startSeq + count - 1;
      try {
        localStorage.setItem(getLocalCounterKey(schoolId, year), String(endSeq));
      } catch {
        // Ignore
      }

      const numbers: string[] = [];
      for (let s = startSeq; s <= endSeq; s++) {
        numbers.push(formatCertificateNumber(s, prefix, year));
      }
      return { numbers, startSeq, endSeq, source: 'firestore_transaction' };
    } catch (err) {
      console.warn(
        '[CertificateRegistry] Firestore transaction unavailable, falling back to local sequence:',
        err
      );
    }
  }

  // Offline / Local-only monotonic reservation
  const startSeq = localFloor + 1;
  const endSeq = localFloor + count;
  try {
    localStorage.setItem(getLocalCounterKey(schoolId, year), String(endSeq));
  } catch {
    // Ignore
  }

  const numbers: string[] = [];
  for (let s = startSeq; s <= endSeq; s++) {
    numbers.push(formatCertificateNumber(s, prefix, year));
  }
  return { numbers, startSeq, endSeq, source: 'local_counter' };
}

/**
 * Previews the next likely certificate number without consuming the counter.
 */
export function previewNextCertificateNumber(
  prefix: string = 'CERT',
  existingCertificates: IssuedCertificate[] = [],
  settings?: Pick<SchoolSettings, 'schoolName' | 'schoolId'>
): string {
  const year = new Date().getFullYear();
  const schoolId = resolveSchoolIdFromSettings(settings);
  const nextSeq = findHighestLocalSeq(existingCertificates, schoolId, year) + 1;
  return formatCertificateNumber(nextSeq, prefix, year);
}
