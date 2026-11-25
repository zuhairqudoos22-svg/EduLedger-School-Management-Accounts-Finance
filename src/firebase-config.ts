/**
 * Firebase Web Configuration for EduLedger Multi-Device Cloud Sync
 * Project: eduledger-604f4 (Spark Free Tier)
 * 
 * Strict Free Spark Plan Rules:
 * - Zero cost ($0/month)
 * - Firebase Authentication (Email/Password)
 * - Cloud Firestore with multi-tab offline persistence
 * - No Cloud Storage, Cloud Functions, or Blaze services
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  Auth,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
  getFirestore,
} from 'firebase/firestore';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// User-provided Firebase Spark Project Configuration
export const firebaseConfig: FirebaseWebConfig = {
  apiKey: 'AIzaSyBKqpobVcmjxyPyrW9XUhYZD3N4JtKMZ20',
  authDomain: 'eduledger-604f4.firebaseapp.com',
  projectId: 'eduledger-604f4',
  storageBucket: 'eduledger-604f4.firebasestorage.app',
  messagingSenderId: '811593452241',
  appId: '1:811593452241:web:fea58097f10967ac0493f0',
};

export const FIREBASE_CONFIG_STORAGE_KEY = 'eduledger_firebase_config';

/**
 * Retrieves the effective Firebase configuration:
 * Prioritizes custom saved config in localStorage (if customized via Settings),
 * falling back to the official configured project above.
 */
export function getEffectiveFirebaseConfig(): FirebaseWebConfig {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.apiKey === 'string' && parsed.apiKey.trim().length > 0) {
          return {
            apiKey: parsed.apiKey.trim(),
            authDomain: (parsed.authDomain || '').trim(),
            projectId: (parsed.projectId || '').trim(),
            storageBucket: (parsed.storageBucket || '').trim(),
            messagingSenderId: (parsed.messagingSenderId || '').trim(),
            appId: (parsed.appId || '').trim(),
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored Firebase config:', e);
    }
  }
  return firebaseConfig;
}

/**
 * Checks if the effective Firebase configuration has valid, non-placeholder credentials.
 */
export function isFirebaseConfigured(config: FirebaseWebConfig = getEffectiveFirebaseConfig()): boolean {
  if (!config) return false;
  const isPlaceholder =
    !config.apiKey ||
    config.apiKey.includes('PASTE_YOUR') ||
    config.apiKey.trim() === '' ||
    !config.projectId ||
    config.projectId.includes('PASTE_YOUR') ||
    config.projectId.trim() === '';
  return !isPlaceholder;
}

/**
 * Saves a new Firebase configuration into browser localStorage
 */
export function saveFirebaseConfig(config: FirebaseWebConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  }
}

/**
 * Clears custom saved Firebase configuration from browser localStorage
 */
export function clearSavedFirebaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
  }
}

// -------------------------------------------------------------
// SINGLETON INITIALIZATION (INITIALIZE ONCE)
// -------------------------------------------------------------
const effectiveConfig = getEffectiveFirebaseConfig();
const existingApps = getApps();

export const app: FirebaseApp =
  existingApps.length > 0 ? getApp() : initializeApp(effectiveConfig);

// Initialize Auth with session-only persistence (logout on tab/browser close)
export const auth: Auth = getAuth(app);
if (typeof window !== 'undefined') {
  setPersistence(auth, browserSessionPersistence).catch((err) => {
    console.warn('Failed to set Auth browserSessionPersistence:', err);
  });
}

// Initialize Firestore with offline persistence enabled using persistentLocalCache & persistentMultipleTabManager
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  firestoreInstance = getFirestore(app);
}

export const db: Firestore = firestoreInstance;

export default { app, auth, db, firebaseConfig };
