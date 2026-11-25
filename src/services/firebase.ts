/**
 * Firebase Service for EduLedger (Spark Free Plan)
 * Features:
 * - Singleton Firebase App, Auth, and Firestore instances from firebase-config
 * - Offline-first persistence via Firestore IndexedDB cache (multi-tab manager)
 * - Session-only auth persistence (browserSessionPersistence)
 * - Secondary App instance factory for Admin sub-account provisioning without session logout
 */

import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import {
  Auth,
  ActionCodeSettings,
  sendPasswordResetEmail,
  sendEmailVerification,
  verifyBeforeUpdateEmail,
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from 'firebase/auth';
import {
  app,
  auth,
  db,
  firebaseConfig,
  getEffectiveFirebaseConfig,
  isFirebaseConfigured,
  FirebaseWebConfig,
} from '../firebase-config';
import {
  checkPasswordResetLimit,
  recordPasswordReset,
  checkResendVerificationLimit,
  recordResendVerification,
} from '../utils/authRateLimit';
import { validatePasswordRules } from '../utils/crypto';

/**
 * Retrieves the primary Firebase App instance
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  return app;
}

/**
 * Retrieves the primary Firestore instance with IndexedDB offline persistence enabled
 */
export function getFirestoreDb(): Firestore | null {
  if (!isFirebaseConfigured()) return null;
  return db;
}

/**
 * Retrieves the primary Firebase Auth instance configured with session-only persistence
 */
export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null;
  return auth;
}

/**
 * Secondary Firebase App Factory
 * Required for Admin creating sub-accounts without disrupting the Admin's active login session
 */
export async function withSecondaryAuth<T>(
  action: (secondaryAuth: Auth) => Promise<T>
): Promise<T> {
  const config = getEffectiveFirebaseConfig();
  if (!isFirebaseConfigured(config)) {
    throw new Error('Firebase is not configured with valid credentials.');
  }
  const secondaryAppName = `EduLedgerSubAuth-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const secondaryApp = initializeApp(config, secondaryAppName);
  const { getAuth } = await import('firebase/auth');
  const secondaryAuth = getAuth(secondaryApp);
  try {
    return await action(secondaryAuth);
  } finally {
    try {
      await deleteApp(secondaryApp);
    } catch (e) {
      console.warn('Error cleaning up secondary Firebase App instance:', e);
    }
  }
}

/**
 * Maps a username to a standardized internal fake email for Firebase Auth
 * Format: username@eduledger.local
 */
export function usernameToInternalEmail(username: string): string {
  const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return `${cleanUser}@eduledger.local`;
}

/**
 * Resolves a login identifier (username or real email) to the actual Firebase Auth login email.
 * 1. If it contains '@', it is already an email.
 * 2. If it is a username, checks Firestore username_lookup.
 * 3. Fallback: checks local storage / IndexedDB users table.
 * 4. Fallback for un-migrated accounts: returns cleanUser@eduledger.local so nobody is locked out.
 */
export async function resolveUserLoginEmail(inputUsernameOrEmail: string): Promise<string> {
  const cleanInput = inputUsernameOrEmail.trim().toLowerCase();
  if (cleanInput.includes('@')) {
    return cleanInput;
  }

  const cleanUser = cleanInput.replace(/[^a-z0-9._-]/g, '');

  // 1. Try Firestore username_lookup
  const firestore = getFirestoreDb();
  if (firestore) {
    try {
      const snap = await getDoc(doc(firestore, 'username_lookup', cleanUser));
      if (snap.exists() && snap.data()?.email) {
        return snap.data().email.toLowerCase();
      }
      const schoolSnap = await getDoc(doc(firestore, 'schools/main/username_lookup', cleanUser));
      if (schoolSnap.exists() && schoolSnap.data()?.email) {
        return schoolSnap.data().email.toLowerCase();
      }
    } catch (e) {
      console.warn('Note reading username_lookup:', e);
    }
  }

  // 2. Try Local IndexedDB users store
  try {
    const { getDB } = await import('../db/indexedDB');
    const db = await getDB();
    const users: any[] = await db.getAll('users');
    const match = users.find(u => u.username && u.username.toLowerCase() === cleanUser);
    if (match && match.email && !match.email.endsWith('@eduledger.local')) {
      return match.email.toLowerCase();
    }
  } catch (e) {
    console.warn('Note checking local db for email:', e);
  }

  // 3. Fallback to legacy internal email
  return `${cleanUser}@eduledger.local`;
}

/**
 * Records or updates the minimal username -> email mapping in Firestore
 */
export async function recordUsernameEmailLookup(username: string, email: string, uid?: string): Promise<void> {
  const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const cleanEmail = email.trim().toLowerCase();
  const firestore = getFirestoreDb();
  if (!firestore) return;

  const data = {
    email: cleanEmail,
    uid: uid || null,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(firestore, 'username_lookup', cleanUser), data, { merge: true });
    await setDoc(doc(firestore, 'schools/main/username_lookup', cleanUser), data, { merge: true });
  } catch (err) {
    console.warn('Failed to record username lookup in Firestore:', err);
  }
}

/**
 * Explicit ActionCodeSettings so Firebase Auth email links return cleanly to the app origin.
 */
export function getActionCodeSettings(): ActionCodeSettings {
  const envUrl = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_APP_URL;
  const rawOrigin =
    (envUrl && envUrl.trim()) ||
    (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://localhost');
  const cleanUrl = rawOrigin.replace(/\/+$/, '');
  return {
    url: cleanUrl,
    handleCodeInApp: false,
  };
}

/**
 * Validates that an email is syntactically valid and not an internal @eduledger.local placeholder.
 */
export function isValidRealEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return false;
  if (clean.endsWith('@eduledger.local')) return false;
  return true;
}

/**
 * Determines whether an account is a built-in demo / legacy synthetic account that bypasses strict real-email verification.
 */
export function isDemoOrLegacyAccount(
  user?: { email?: string | null; isDemo?: boolean } | null
): boolean {
  if (!user) return false;
  if (user.isDemo === true) return true;
  const email = (user.email || '').trim().toLowerCase();
  if (!email) return true;
  if (email.endsWith('@eduledger.local')) return true;
  if (email.endsWith('@staugustine.edu')) return true;
  return false;
}

/**
 * Maps Firebase Auth error codes to crisp user-friendly messages.
 */
export function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email address is already registered with another account.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please satisfy all password security rules.';
    case 'auth/too-many-requests':
      return 'Too many requests sent to the server. Please wait a few minutes and try again.';
    case 'auth/user-disabled':
      return 'This account has been deactivated by the administrator. Access denied.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid username/email or password.';
    case 'auth/expired-action-code':
      return 'This verification or reset link has expired. Please request a new email link.';
    case 'auth/invalid-action-code':
      return 'This link is invalid or has already been used. Please request a fresh email link.';
    case 'auth/requires-recent-login':
      return 'For security, please sign out and sign in again before changing your password or email.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in Firebase Console Authentication settings.';
    case 'auth/network-request-failed':
      return 'Network unavailable. Could not reach Firebase authentication servers.';
    default: {
      const msg = err instanceof Error ? err.message : '';
      return msg || 'Authentication service error occurred.';
    }
  }
}

/**
 * Sends a password reset email using Firebase Auth free Spark built-in email service
 */
export async function sendAuthPasswordResetEmail(
  emailOrUsername: string
): Promise<{
  success: boolean;
  emailSentTo?: string;
  retryAfterSeconds?: number;
  error?: string;
}> {
  const inputKey = emailOrUsername.trim().toLowerCase();
  const inputLimit = checkPasswordResetLimit(inputKey);
  if (!inputLimit.allowed) {
    return {
      success: false,
      retryAfterSeconds: inputLimit.retryAfterSeconds,
      error: inputLimit.reason,
    };
  }

  try {
    const targetEmail = await resolveUserLoginEmail(emailOrUsername);
    const targetLimit = checkPasswordResetLimit(targetEmail);
    if (!targetLimit.allowed) {
      return {
        success: false,
        retryAfterSeconds: targetLimit.retryAfterSeconds,
        error: targetLimit.reason,
      };
    }

    const fbAuth = getFirebaseAuth();

    if (fbAuth && !targetEmail.endsWith('@eduledger.local')) {
      await sendPasswordResetEmail(fbAuth, targetEmail, getActionCodeSettings());
    }

    recordPasswordReset(inputKey);
    if (targetEmail !== inputKey) {
      recordPasswordReset(targetEmail);
    }

    return {
      success: true,
      emailSentTo: targetEmail,
      retryAfterSeconds: 60,
    };
  } catch (err: any) {
    console.error('Password reset email error:', err);
    if (err?.code === 'auth/too-many-requests') {
      return {
        success: false,
        retryAfterSeconds: 60,
        error: mapFirebaseAuthError(err),
      };
    }
    // Security best practice: do not reveal whether account exists
    recordPasswordReset(inputKey);
    if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-email') {
      return { success: true, retryAfterSeconds: 60 };
    }
    return {
      success: false,
      error: mapFirebaseAuthError(err),
    };
  }
}

/**
 * Sends an email verification link to the current authenticated user
 */
export async function sendAuthVerificationEmail(
  userInstance?: any,
  bypassRateLimit: boolean = false
): Promise<{
  success: boolean;
  retryAfterSeconds?: number;
  remainingThisHour?: number;
  error?: string;
}> {
  try {
    const fbAuth = getFirebaseAuth();
    const targetUser = userInstance || fbAuth?.currentUser;
    if (!targetUser) {
      return { success: false, error: 'No active authenticated user to verify.' };
    }

    const emailKey = (targetUser.email || targetUser.uid || 'default').toLowerCase();
    if (!bypassRateLimit) {
      const limitCheck = checkResendVerificationLimit(emailKey);
      if (!limitCheck.allowed) {
        return {
          success: false,
          retryAfterSeconds: limitCheck.retryAfterSeconds,
          remainingThisHour: limitCheck.remainingInWindow,
          error: limitCheck.reason,
        };
      }
    }

    await sendEmailVerification(targetUser, getActionCodeSettings());
    const rec = recordResendVerification(emailKey);
    return {
      success: true,
      retryAfterSeconds: rec.retryAfterSeconds,
      remainingThisHour: rec.remainingInWindow,
    };
  } catch (err: any) {
    console.error('Email verification send error:', err);
    return {
      success: false,
      error: mapFirebaseAuthError(err),
    };
  }
}

/**
 * Initiates an email update by sending a verification link before changing the email
 */
export async function requestUpdateUserEmail(newEmail: string): Promise<{ success: boolean; error?: string }> {
  try {
    const fbAuth = getFirebaseAuth();
    if (!fbAuth?.currentUser) {
      return { success: false, error: 'No active authenticated user.' };
    }
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!isValidRealEmail(cleanEmail)) {
      return { success: false, error: 'Please enter a valid real email address.' };
    }
    await verifyBeforeUpdateEmail(fbAuth.currentUser, cleanEmail, getActionCodeSettings());
    return { success: true };
  } catch (err: any) {
    console.error('verifyBeforeUpdateEmail error:', err);
    return {
      success: false,
      error: mapFirebaseAuthError(err),
    };
  }
}

/**
 * Applies a Firebase Auth email verification action code (?mode=verifyEmail&oobCode=...).
 */
export async function verifyEmailWithCode(
  oobCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const fbAuth = getFirebaseAuth();
    if (!fbAuth) {
      return { success: false, error: 'Firebase Authentication is not configured.' };
    }
    await applyActionCode(fbAuth, oobCode);
    if (fbAuth.currentUser) {
      await fbAuth.currentUser.reload();
    }
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: mapFirebaseAuthError(err) };
  }
}

/**
 * Verifies a Firebase Auth password reset action code (?mode=resetPassword&oobCode=...)
 * and returns the associated email if valid.
 */
export async function checkPasswordResetActionCode(
  oobCode: string
): Promise<{ valid: boolean; email?: string; error?: string }> {
  try {
    const fbAuth = getFirebaseAuth();
    if (!fbAuth) {
      return { valid: false, error: 'Firebase Authentication is not configured.' };
    }
    const email = await verifyPasswordResetCode(fbAuth, oobCode);
    return { valid: true, email };
  } catch (err: unknown) {
    return { valid: false, error: mapFirebaseAuthError(err) };
  }
}

/**
 * Confirms password reset via Firebase Auth action code after checking password complexity rules.
 */
export async function confirmPasswordResetWithCode(
  oobCode: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const rules = validatePasswordRules(newPassword);
  if (!rules.isValid) {
    return { success: false, error: rules.errors[0] || 'Password does not meet security rules.' };
  }
  try {
    const fbAuth = getFirebaseAuth();
    if (!fbAuth) {
      return { success: false, error: 'Firebase Authentication is not configured.' };
    }
    await confirmPasswordReset(fbAuth, oobCode, newPassword);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: mapFirebaseAuthError(err) };
  }
}

/**
 * Tests live connection to Cloud Firestore
 */
export async function testFirestoreConnection(): Promise<{
  connected: boolean;
  message: string;
  latencyMs?: number;
}> {
  if (!isFirebaseConfigured()) {
    return {
      connected: false,
      message: 'Firebase is not yet configured. Local storage is active.',
    };
  }
  const firestore = getFirestoreDb();
  if (!firestore) {
    return {
      connected: false,
      message: 'Unable to initialize Firestore instance.',
    };
  }

  const start = performance.now();
  try {
    // Attempt a light server-side read to verify connectivity
    await getDocFromServer(doc(firestore, '__health_check__', 'ping'));
    const latency = Math.round(performance.now() - start);
    return {
      connected: true,
      message: `Successfully connected to Cloud Firestore (${firebaseConfig.projectId}). Live Multi-Device Sync Active.`,
      latencyMs: latency,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.includes('offline') || errorMsg.includes('unavailable') || !navigator.onLine) {
      return {
        connected: false,
        message: 'Currently operating in Offline Mode. Local IndexedDB cache is active.',
      };
    }
    // Permission denied means connection was reached and security rules responded
    if (errorMsg.includes('permission-denied') || errorMsg.includes('insufficient permissions')) {
      const latency = Math.round(performance.now() - start);
      return {
        connected: true,
        message: `Connected to Cloud Firestore (${firebaseConfig.projectId}). Security Rules active and protecting data.`,
        latencyMs: latency,
      };
    }
    return {
      connected: false,
      message: `Connection error: ${errorMsg}`,
    };
  }
}

export { isFirebaseConfigured, getEffectiveFirebaseConfig } from '../firebase-config';
export type { FirebaseWebConfig } from '../firebase-config';
