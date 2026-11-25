import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, ActivityLog } from '../types';
import {
  hashPasswordPBKDF2,
  verifyPassword,
  hashSecurityAnswer,
  verifySecurityAnswer,
  hashRecoveryKey,
  verifyRecoveryKey,
  generateRecoveryKey,
  validatePasswordRules,
  legacySha256,
} from '../utils/crypto';
import { getDB, initDatabase, seedDatabase } from '../db/indexedDB';
import { cleanInitialSchoolSettings } from '../db/seedData';
import {
  getFirebaseAuth,
  getFirestoreDb,
  withSecondaryAuth,
  usernameToInternalEmail,
  resolveUserLoginEmail,
  recordUsernameEmailLookup,
  sendAuthPasswordResetEmail,
  sendAuthVerificationEmail,
  requestUpdateUserEmail,
  isFirebaseConfigured,
  isDemoOrLegacyAccount,
  isValidRealEmail,
  mapFirebaseAuthError,
} from '../services/firebase';
import {
  checkLoginThrottle,
  recordLoginAttempt,
} from '../utils/authRateLimit';
import {
  generateBackupRecoveryCodes,
  generateRecoveryCodesSalt,
  hashBackupRecoveryCodes,
  verifyAndConsumeRecoveryCode,
  HashedRecoveryCode,
} from '../utils/recoveryCodes';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { detachAllListeners } from '../services/cloudSyncService';

import {
  saveSecureSession,
  getSecureSession,
  clearSecureSession,
  touchSessionActivity,
} from '../utils/secureSession';

export interface AuthContextType {
  currentUser: User | null;
  pendingVerificationUser: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  isMainAdmin: boolean;
  isFinance: boolean;
  isLoading: boolean;
  isFirstRunSetup: boolean;
  checkIsFirstRun: () => Promise<boolean>;
  login: (
    username: string,
    passwordPlain: string
  ) => Promise<{
    success: boolean;
    error?: string;
    forcePasswordChange?: boolean;
    lockRemainingSeconds?: number;
    needsEmailVerification?: boolean;
    email?: string;
  }>;
  logout: () => void;
  resendPendingVerificationEmail: () => Promise<{
    success: boolean;
    retryAfterSeconds?: number;
    remainingThisHour?: number;
    error?: string;
  }>;
  recheckPendingVerification: () => Promise<{ verified: boolean; error?: string }>;
  dismissPendingVerification: () => void;
  reVerifyCurrentPassword: (passwordPlain: string) => Promise<boolean>;
  createFirstAdminAccount: (data: {
    fullName: string;
    username: string;
    email: string;
    phone?: string;
    passwordPlain: string;
    securityQuestions: { question: string; answer: string }[];
    recoveryKey: string;
    dataChoice?: 'empty' | 'demo';
    schoolName?: string;
    currencyCode?: string;
  }) => Promise<{ success: boolean; error?: string; needsEmailVerification?: boolean }>;
  changePassword: (
    userId: string,
    currentPasswordPlain: string,
    newPasswordPlain: string
  ) => Promise<{ success: boolean; error?: string }>;
  adminResetPassword: (
    userId: string,
    newPasswordPlain: string
  ) => Promise<{ success: boolean; error?: string }>;
  resetPasswordWithSecurityQuestions: (
    username: string,
    answers: { question: string; answer: string }[],
    newPasswordPlain: string
  ) => Promise<{ success: boolean; error?: string; newRecoveryKey?: string }>;
  resetPasswordWithRecoveryKey: (
    username: string,
    enteredKey: string,
    newPasswordPlain: string
  ) => Promise<{ success: boolean; error?: string; newRecoveryKey?: string }>;
  createUser: (
    userData: Omit<User, 'id' | 'createdAt'> & {
      passwordPlain?: string;
      securityQuestionsInput?: { question: string; answer: string }[];
    }
  ) => Promise<{ success: boolean; error?: string; recoveryKey?: string }>;
  updateUser: (user: User) => Promise<boolean>;
  toggleUserStatus: (userId: string) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  updateProfile: (
    userId: string,
    profileData: {
      fullName?: string;
      email?: string;
      phone?: string;
      username?: string;
      avatarUrl?: string;
      securityQuestion?: string;
      securityAnswer?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  refreshCurrentUser: () => Promise<void>;
  logSecurityEvent: (
    action: string,
    details: string,
    severity?: 'info' | 'warning' | 'critical',
    userName?: string,
    userRole?: string
  ) => Promise<void>;
  sendPasswordResetLink: (
    usernameOrEmail: string
  ) => Promise<{ success: boolean; emailSentTo?: string; retryAfterSeconds?: number; error?: string }>;
  sendVerificationEmail: () => Promise<{
    success: boolean;
    retryAfterSeconds?: number;
    remainingThisHour?: number;
    error?: string;
  }>;
  checkEmailVerifiedStatus: () => Promise<boolean>;
  updateUserEmail: (newEmail: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordWithRecoveryCode: (
    username: string,
    recoveryCode: string,
    newPasswordPlain: string
  ) => Promise<{ success: boolean; error?: string }>;
  generateNewBackupRecoveryCodes: () => Promise<{ success: boolean; codes?: string[]; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingVerificationUser, setPendingVerificationUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFirstRunSetup, setIsFirstRunSetup] = useState<boolean>(false);

  // Helper to record security audit logs in IndexedDB
  const logSecurityEvent = useCallback(
    async (
      action: string,
      details: string,
      severity: 'info' | 'warning' | 'critical' = 'info',
      userName?: string,
      userRole?: string
    ) => {
      try {
        const db = await getDB();
        if (db.objectStoreNames.contains('activityLogs')) {
          const logEntry: ActivityLog = {
            id: 'sec-log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            timestamp: new Date().toISOString(),
            userName: userName || currentUser?.username || 'System',
            userRole: userRole || currentUser?.role || 'system',
            category: 'user_security',
            severity,
            action,
            details,
          };
          await db.put('activityLogs', logEntry);
        }
      } catch (err) {
        console.warn('Could not record security audit log:', err);
      }
    },
    [currentUser]
  );

  // Check if any admin account exists in IndexedDB
  const checkIsFirstRun = useCallback(async (): Promise<boolean> => {
    try {
      const db = await getDB();
      const users: User[] = await db.getAll('users');
      const hasAdmin = users.some(u => (u.role === 'admin' || u.role === 'super_admin') && u.isActive);
      return !hasAdmin;
    } catch {
      return false;
    }
  }, []);

  // Restore session: listen to Firebase onAuthStateChanged & fallback to secure sessionStorage
  useEffect(() => {
    let isMounted = true;
    let authUnsub: (() => void) | null = null;

    async function initAuth() {
      try {
        await initDatabase();
        const firstRunNeeded = await checkIsFirstRun();
        if (isMounted) setIsFirstRunSetup(firstRunNeeded);

        const fbAuth = getFirebaseAuth();
        const fbDb = getFirestoreDb();

        if (fbAuth && fbDb) {
          authUnsub = onAuthStateChanged(fbAuth, async (fbUser) => {
            if (!isMounted) return;
            if (fbUser) {
              try {
                let userSnap = await getDoc(doc(fbDb, 'schools/main/users', fbUser.uid));
                if (!userSnap.exists()) {
                  userSnap = await getDoc(doc(fbDb, 'users', fbUser.uid));
                }

                let resolvedUser: User | null = userSnap.exists() ? (userSnap.data() as User) : null;
                if (!resolvedUser) {
                  const localDb = await getDB();
                  const localMatch = await localDb.get('users', fbUser.uid);
                  if (localMatch) resolvedUser = localMatch;
                }

                if (resolvedUser) {
                  if (resolvedUser.isActive === false) {
                    await firebaseSignOut(fbAuth);
                    if (isMounted) {
                      setCurrentUser(null);
                      setPendingVerificationUser(null);
                    }
                    clearSecureSession();
                    detachAllListeners();
                    return;
                  }

                  const needsVerifyGate =
                    !fbUser.emailVerified &&
                    !isDemoOrLegacyAccount({ ...resolvedUser, email: fbUser.email || resolvedUser.email });

                  if (needsVerifyGate) {
                    if (isMounted) {
                      setCurrentUser(null);
                      setPendingVerificationUser({
                        ...resolvedUser,
                        email: fbUser.email || resolvedUser.email,
                        emailVerified: false,
                      });
                    }
                    clearSecureSession();
                    return;
                  }

                  const finalUser: User = {
                    ...resolvedUser,
                    emailVerified: fbUser.emailVerified || resolvedUser.emailVerified,
                  };
                  if (isMounted) {
                    setPendingVerificationUser(null);
                    setCurrentUser(finalUser);
                  }
                  await saveSecureSession({
                    id: finalUser.id,
                    username: finalUser.username,
                    role: finalUser.role,
                  });
                  touchSessionActivity();
                  return;
                }
              } catch (cloudErr) {
                console.warn('Could not read cloud user profile:', cloudErr);
              }
            }

            // Fallback to local session check if not authenticated in Firebase
            const session = await getSecureSession();
            if (session && session.userId) {
              const db = await getDB();
              const user: User | undefined = await db.get('users', session.userId);
              if (user && user.isActive) {
                if (
                  isFirebaseConfigured() &&
                  !isDemoOrLegacyAccount(user) &&
                  user.emailVerified === false
                ) {
                  clearSecureSession();
                  if (isMounted) {
                    setCurrentUser(null);
                    setPendingVerificationUser(user);
                  }
                  return;
                }
                if (isMounted) {
                  setPendingVerificationUser(null);
                  setCurrentUser(user);
                }
                touchSessionActivity();
              } else {
                clearSecureSession();
                if (isMounted) setCurrentUser(null);
              }
            } else {
              if (isMounted) setCurrentUser(null);
            }
          });
        } else {
          // Firebase not configured; purely local session
          const session = await getSecureSession();
          if (session && session.userId) {
            const db = await getDB();
            const user: User | undefined = await db.get('users', session.userId);
            if (user && user.isActive) {
              if (isMounted) setCurrentUser(user);
              touchSessionActivity();
            } else {
              clearSecureSession();
              if (isMounted) setCurrentUser(null);
            }
          } else {
            if (isMounted) setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error('Failed to initialize auth state:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
      if (authUnsub) authUnsub();
    };
  }, [checkIsFirstRun]);

  /**
   * User Login with PBKDF2 Verification, Brute-Force Rate Limiting, and Generic Error Messages
   */
  const login = async (username: string, passwordPlain: string) => {
    const normalizedInput = username.trim().toLowerCase();
    try {
      const throttle = checkLoginThrottle(normalizedInput);
      if (throttle.blocked) {
        return {
          success: false,
          error: throttle.message,
          lockRemainingSeconds: throttle.retryAfterSeconds,
        };
      }

      // Firebase Cloud Auth Check if configured
      if (isFirebaseConfigured()) {
        try {
          const fbAuth = getFirebaseAuth();
          const fbDb = getFirestoreDb();
          if (fbAuth && fbDb) {
            const email = await resolveUserLoginEmail(username);
            const cred = await signInWithEmailAndPassword(fbAuth, email, passwordPlain);
            if (cred && cred.user) {
              await cred.user.reload().catch(() => {});
              let userSnap = await getDoc(doc(fbDb, 'schools/main/users', cred.user.uid));
              if (!userSnap.exists()) {
                userSnap = await getDoc(doc(fbDb, 'users', cred.user.uid));
              }

              const localDb = await getDB();
              let resolvedUser: User | null = userSnap.exists() ? (userSnap.data() as User) : null;
              if (!resolvedUser) {
                const allLocal: User[] = await localDb.getAll('users');
                resolvedUser =
                  allLocal.find(
                    u =>
                      u.id === cred.user.uid ||
                      (u.email && u.email.toLowerCase() === (cred.user.email || '').toLowerCase()) ||
                      u.username.toLowerCase() === normalizedInput
                  ) || null;
              }

              if (resolvedUser) {
                if (resolvedUser.isActive === false) {
                  await firebaseSignOut(fbAuth);
                  return {
                    success: false,
                    error: 'This account has been deactivated by the administrator. Access denied.',
                  };
                }

                // Always re-sync local PBKDF2 hash after successful Firebase sign-in
                // so password resets done via email link seamlessly work offline too.
                const { hashString: syncedHash, salt: syncedSalt } = await hashPasswordPBKDF2(passwordPlain);
                const isVerified = cred.user.emailVerified;
                const demoBypass = isDemoOrLegacyAccount({
                  ...resolvedUser,
                  email: cred.user.email || resolvedUser.email,
                });

                const updatedUser: User = {
                  ...resolvedUser,
                  email: cred.user.email || resolvedUser.email,
                  passwordHash: syncedHash,
                  passwordSalt: syncedSalt,
                  emailVerified: isVerified || demoBypass,
                  previousLogin: resolvedUser.lastLogin || resolvedUser.createdAt,
                  lastLogin: new Date().toISOString(),
                  failedLoginAttempts: 0,
                  lockUntil: 0,
                };

                await localDb.put('users', updatedUser);
                await setDoc(doc(fbDb, 'schools/main/users', cred.user.uid), updatedUser, { merge: true });
                await setDoc(doc(fbDb, 'users', cred.user.uid), updatedUser, { merge: true });

                // Verification gate: Block unverified real email accounts; allow demo accounts
                if (!isVerified && !demoBypass) {
                  clearSecureSession();
                  setCurrentUser(null);
                  setPendingVerificationUser(updatedUser);
                  await logSecurityEvent(
                    'Unverified Email Sign-In Blocked',
                    `Sign-in blocked for "${updatedUser.username}" pending verification of ${updatedUser.email}.`,
                    'warning',
                    updatedUser.username,
                    updatedUser.role
                  );
                  return {
                    success: false,
                    needsEmailVerification: true,
                    email: updatedUser.email,
                    error: 'Please verify your email first.',
                  };
                }

                recordLoginAttempt(normalizedInput, true);
                setPendingVerificationUser(null);
                setCurrentUser(updatedUser);
                await saveSecureSession({
                  id: updatedUser.id,
                  username: updatedUser.username,
                  role: updatedUser.role,
                });
                return {
                  success: true,
                  forcePasswordChange: !!updatedUser.forcePasswordChange,
                };
              }
            }
          }
        } catch (fbErr: any) {
          if (fbErr?.code === 'auth/user-disabled') {
            return {
              success: false,
              error: 'This account has been deactivated by the administrator. Access denied.',
            };
          }
          if (fbErr?.code === 'auth/too-many-requests') {
            recordLoginAttempt(normalizedInput, false);
            return {
              success: false,
              error: mapFirebaseAuthError(fbErr),
            };
          }
        }
      }

      const db = await getDB();
      const users: User[] = await db.getAll('users');
      const normalizedUser = username.trim().toLowerCase();
      const user = users.find(
        u => u.username.toLowerCase() === normalizedUser || (u.email && u.email.toLowerCase() === normalizedUser)
      );

      // Check brute-force lockout if user was found
      if (user && user.lockUntil && user.lockUntil > Date.now()) {
        const remainingSeconds = Math.ceil((user.lockUntil - Date.now()) / 1000);
        return {
          success: false,
          error: `Account is temporarily locked due to multiple failed login attempts. Please wait ${Math.ceil(
            remainingSeconds / 60
          )} minute(s) before trying again.`,
          lockRemainingSeconds: remainingSeconds,
        };
      }

      // If user does not exist, run a dummy PBKDF2 hash to prevent timing attack enumeration
      if (!user) {
        await hashPasswordPBKDF2(passwordPlain, '00000000000000000000000000000000', 310000);
        await logSecurityEvent(
          'Failed Login Attempt',
          `Unknown username attempted: "${username.trim()}".`,
          'warning',
          username.trim(),
          'unauthenticated'
        );
        return { success: false, error: 'Invalid username or password.' };
      }

      // Verify password
      const verification = await verifyPassword(passwordPlain, user.passwordHash);

      if (!verification.valid) {
        // Increment failed attempts
        const currentFails = (user.failedLoginAttempts || 0) + 1;
        let lockUntil = user.lockUntil || 0;
        let lockoutMultiplier = user.lockoutMultiplier || 1;
        let lockMsg: string | undefined;

        if (currentFails >= 5) {
          // Lock for 5 minutes * multiplier
          const lockDurationMs = 5 * 60 * 1000 * lockoutMultiplier;
          lockUntil = Date.now() + lockDurationMs;
          lockoutMultiplier = lockoutMultiplier * 2; // Double on consecutive locks

          await logSecurityEvent(
            'Account Locked (Brute Force Protection)',
            `Account "${user.username}" locked for ${Math.round(lockDurationMs / 60000)} minutes after ${currentFails} consecutive failed attempts.`,
            'critical',
            user.username,
            user.role
          );

          lockMsg = `Account locked due to 5 consecutive failed login attempts. Try again in ${Math.round(
            lockDurationMs / 60000
          )} minutes.`;
        } else {
          await logSecurityEvent(
            'Failed Login Attempt',
            `Invalid password for user "${user.username}" (${currentFails}/5 attempts).`,
            'warning',
            user.username,
            user.role
          );
        }

        const updatedUser: User = {
          ...user,
          failedLoginAttempts: currentFails >= 5 ? 0 : currentFails,
          lockUntil,
          lockoutMultiplier,
        };
        await db.put('users', updatedUser);

        return {
          success: false,
          error: lockMsg || 'Invalid username or password.',
        };
      }

      // Block deactivated accounts
      if (!user.isActive) {
        await logSecurityEvent(
          'Deactivated Account Login Blocked',
          `Deactivated user "${user.username}" attempted to sign in.`,
          'warning',
          user.username,
          user.role
        );
        return {
          success: false,
          error: 'This account has been deactivated by the administrator. Access denied.',
        };
      }

      // Enforce role authorization: Only Admin and Finance roles can log in
      const allowedRoles = ['super_admin', 'admin', 'principal', 'accountant', 'hr_manager', 'teacher', 'receptionist', 'librarian', 'finance'];
      if (!allowedRoles.includes(user.role)) {
        await logSecurityEvent(
          'Unauthorized Role Login Blocked',
          `User "${user.username}" with role "${user.role}" attempted portal login.`,
          'warning',
          user.username,
          user.role
        );
        return {
          success: false,
          error: 'Access denied. Only Administrators and Finance & Accounts personnel may log into this portal.',
        };
      }

      // Enforce email verification gate on offline/local fallback too for unverified real accounts
      if (
        isFirebaseConfigured() &&
        !isDemoOrLegacyAccount(user) &&
        user.emailVerified === false
      ) {
        clearSecureSession();
        setCurrentUser(null);
        setPendingVerificationUser(user);
        return {
          success: false,
          needsEmailVerification: true,
          email: user.email,
          error: 'Please verify your email first.',
        };
      }

      // Successful authentication: Reset brute force counters
      let updatedPasswordHash = user.passwordHash;
      let updatedSalt = user.passwordSalt;

      // Automatically upgrade legacy hash to modern PBKDF2 if needed
      if (verification.needsRehash) {
        const rehash = await hashPasswordPBKDF2(passwordPlain);
        updatedPasswordHash = rehash.hashString;
        updatedSalt = rehash.salt;
      }

      const updatedUser: User = {
        ...user,
        passwordHash: updatedPasswordHash,
        passwordSalt: updatedSalt,
        previousLogin: user.lastLogin || user.createdAt,
        lastLogin: new Date().toISOString(),
        failedLoginAttempts: 0,
        lockUntil: 0,
        lockoutMultiplier: 1,
      };

      await db.put('users', updatedUser);
      recordLoginAttempt(normalizedInput, true);
      setPendingVerificationUser(null);
      setCurrentUser(updatedUser);

      // Save strictly to ephemeral sessionStorage
      await saveSecureSession({
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
      });

      await logSecurityEvent(
        'Successful Login',
        `User "${updatedUser.username}" (${updatedUser.role}) logged in successfully.`,
        'info',
        updatedUser.username,
        updatedUser.role
      );

      return {
        success: true,
        forcePasswordChange: !!updatedUser.forcePasswordChange,
      };
    } catch (err) {
      console.error('Authentication error:', err);
      return { success: false, error: 'Database authentication error occurred.' };
    }
  };

  /**
   * Log out: clears session from sessionStorage and returns to login view
   */
  const logout = useCallback(() => {
    if (currentUser) {
      logSecurityEvent(
        'User Logout',
        `User "${currentUser.username}" logged out of system.`,
        'info',
        currentUser.username,
        currentUser.role
      );
    }
    const fbAuth = getFirebaseAuth();
    if (fbAuth) {
      firebaseSignOut(fbAuth).catch((e) => console.warn('Firebase signout note:', e));
    }
    detachAllListeners();
    setPendingVerificationUser(null);
    setCurrentUser(null);
    clearSecureSession();
  }, [currentUser, logSecurityEvent]);

  /**
   * Re-verify current logged-in user password for sensitive actions
   */
  const reVerifyCurrentPassword = async (passwordPlain: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const db = await getDB();
      const user = await db.get('users', currentUser.id);
      if (!user) return false;
      const res = await verifyPassword(passwordPlain, user.passwordHash);
      if (res.valid) {
        await logSecurityEvent(
          'Sensitive Action Confirmed',
          `Password re-verified for user "${user.username}".`,
          'info',
          user.username,
          user.role
        );
      }
      return res.valid;
    } catch {
      return false;
    }
  };

  /**
   * First-Run Setup: Create initial Administrator account with PBKDF2 hash, 3 security questions, and recovery key
   */
  const createFirstAdminAccount = async (data: {
    fullName: string;
    username: string;
    email: string;
    phone?: string;
    passwordPlain: string;
    securityQuestions: { question: string; answer: string }[];
    recoveryKey: string;
    dataChoice?: 'empty' | 'demo';
    schoolName?: string;
    currencyCode?: string;
  }): Promise<{ success: boolean; error?: string; needsEmailVerification?: boolean }> => {
    try {
      const cleanEmail = data.email.trim().toLowerCase();
      if (!isValidRealEmail(cleanEmail)) {
        return {
          success: false,
          error: 'Please enter a valid real email address (internal @eduledger.local addresses are not permitted).',
        };
      }

      const db = await getDB();
      const existingUsers: User[] = await db.getAll('users');
      const normalizedUsername = data.username.trim().toLowerCase();

      if (existingUsers.some(u => u.username.toLowerCase() === normalizedUsername)) {
        return { success: false, error: `Username "${data.username}" is already in use.` };
      }
      if (existingUsers.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
        return { success: false, error: `Email "${cleanEmail}" is already registered.` };
      }

      // Validate password rules
      const passValidation = validatePasswordRules(data.passwordPlain);
      if (!passValidation.isValid) {
        return { success: false, error: passValidation.errors[0] || 'Password does not meet security rules.' };
      }

      // Hash password with PBKDF2
      const { hashString: passwordHash, salt: passwordSalt } = await hashPasswordPBKDF2(data.passwordPlain);

      // Hash security questions
      const hashedQuestions = await Promise.all(
        data.securityQuestions.map(async q => {
          const { hashString, salt } = await hashSecurityAnswer(q.answer);
          return {
            question: q.question,
            answerHash: hashString,
            salt,
          };
        })
      );

      // Hash recovery key
      const { hashString: recoveryKeyHash, salt: recoveryKeySalt } = await hashRecoveryKey(data.recoveryKey);

      // Generate 10 one-time offline backup recovery codes
      const plainRecoveryCodes = generateBackupRecoveryCodes(10);
      const recoveryCodesSalt = generateRecoveryCodesSalt();
      const hashedRecoveryCodes = await hashBackupRecoveryCodes(plainRecoveryCodes, recoveryCodesSalt);

      const newAdmin: User = {
        id: 'usr-admin-' + Date.now(),
        username: normalizedUsername,
        fullName: data.fullName.trim(),
        email: cleanEmail,
        phone: data.phone?.trim() || '',
        role: 'admin',
        passwordHash,
        passwordSalt,
        securityQuestion: data.securityQuestions[0]?.question || '',
        securityAnswerHash: hashedQuestions[0]?.answerHash || '',
        securityQuestions: hashedQuestions,
        recoveryKeyHash,
        recoveryKeySalt,
        backupRecoveryCodes: hashedRecoveryCodes,
        backupRecoveryCodesSalt: recoveryCodesSalt,
        isPrimaryAdmin: true,
        emailVerified: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      let firebaseProvisioned = false;
      let firebaseVerified = false;

      // Provision in Firebase Cloud Auth & Firestore if configured
      if (isFirebaseConfigured()) {
        try {
          const fbAuth = getFirebaseAuth();
          const fbDb = getFirestoreDb();
          if (fbAuth && fbDb) {
            const cred = await createUserWithEmailAndPassword(fbAuth, cleanEmail, data.passwordPlain);
            newAdmin.id = cred.user.uid;
            firebaseProvisioned = true;
            firebaseVerified = cred.user.emailVerified;
            newAdmin.emailVerified = firebaseVerified;

            // Send email verification link
            await sendAuthVerificationEmail(cred.user, true);
            // Record minimal username -> email lookup
            await recordUsernameEmailLookup(newAdmin.username, newAdmin.email, cred.user.uid);
            // Store user document in Firestore
            await setDoc(doc(fbDb, 'schools/main/users', cred.user.uid), newAdmin);
            await setDoc(doc(fbDb, 'users', cred.user.uid), newAdmin);
            // Store hashed recovery codes in admin security
            await setDoc(doc(fbDb, 'schools/main/admin_security', 'recovery_codes'), {
              salt: recoveryCodesSalt,
              codes: hashedRecoveryCodes,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (fbErr: any) {
          if (fbErr?.code !== 'auth/network-request-failed') {
            return { success: false, error: mapFirebaseAuthError(fbErr) };
          }
          console.warn('Offline during admin creation, saved locally:', fbErr);
        }
      }

      // Store generated recovery codes in localStorage temporarily for download/print
      if (typeof window !== 'undefined') {
        localStorage.setItem('eduledger_initial_recovery_codes', JSON.stringify(plainRecoveryCodes));
      }

      if (data.dataChoice === 'demo') {
        await seedDatabase();
        await db.put('users', newAdmin);
      } else {
        const cleanSettings = {
          ...cleanInitialSchoolSettings,
          schoolName: data.schoolName?.trim() || cleanInitialSchoolSettings.schoolName,
          currencyCode: data.currencyCode?.trim() || 'PKR',
          currencySymbol: data.currencyCode?.trim() === 'USD' ? '$' : 'Rs.',
          isDemoActive: false,
        };
        await db.put('schoolSettings', { key: 'main', data: cleanSettings });
        if (typeof window !== 'undefined') {
          localStorage.setItem('eduledger_is_clean_slate', 'true');
          localStorage.removeItem('eduledger_has_demo_data');
          localStorage.setItem('eduledger_db_initialized', 'true');
        }
        await db.put('users', newAdmin);
      }

      setIsFirstRunSetup(false);

      await logSecurityEvent(
        'First-Run Administrator Account Created',
        `Primary administrator "${newAdmin.username}" initialized the system (Data Choice: ${data.dataChoice === 'demo' ? 'Sample Demo' : 'Clean Empty'}).`,
        'critical',
        newAdmin.username,
        newAdmin.role
      );

      // Require email verification for real accounts created in Firebase before entering MainApp
      if (firebaseProvisioned && !firebaseVerified && !isDemoOrLegacyAccount(newAdmin)) {
        clearSecureSession();
        setCurrentUser(null);
        setPendingVerificationUser(newAdmin);
        return { success: true, needsEmailVerification: true };
      }

      setPendingVerificationUser(null);
      setCurrentUser(newAdmin);

      await saveSecureSession({
        id: newAdmin.id,
        username: newAdmin.username,
        role: newAdmin.role,
      });

      return { success: true, needsEmailVerification: false };
    } catch (err) {
      console.error('Failed to create first admin:', err);
      return { success: false, error: 'Database error creating administrator.' };
    }
  };

  /**
   * Change password for currently logged-in user
   */
  const changePassword = async (
    userId: string,
    currentPasswordPlain: string,
    newPasswordPlain: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const db = await getDB();
      const user: User | undefined = await db.get('users', userId);
      if (!user) {
        return { success: false, error: 'User account not found.' };
      }

      // Verify current password first
      const verification = await verifyPassword(currentPasswordPlain, user.passwordHash);
      if (!verification.valid) {
        return { success: false, error: 'Current password does not match our records.' };
      }

      // Validate new password rules
      const val = validatePasswordRules(newPasswordPlain);
      if (!val.isValid) {
        return { success: false, error: val.errors[0] || 'New password does not satisfy security rules.' };
      }

      // Hash with PBKDF2
      const { hashString: newHash, salt: newSalt } = await hashPasswordPBKDF2(newPasswordPlain);

      // Keep Firebase Auth password synchronized when online & authenticated
      if (isFirebaseConfigured()) {
        try {
          const fbAuth = getFirebaseAuth();
          if (fbAuth?.currentUser && fbAuth.currentUser.email) {
            const cred = EmailAuthProvider.credential(fbAuth.currentUser.email, currentPasswordPlain);
            await reauthenticateWithCredential(fbAuth.currentUser, cred);
            await firebaseUpdatePassword(fbAuth.currentUser, newPasswordPlain);
          }
        } catch (fbErr: any) {
          if (fbErr?.code && fbErr.code !== 'auth/network-request-failed') {
            return { success: false, error: mapFirebaseAuthError(fbErr) };
          }
        }
      }

      const updatedUser: User = {
        ...user,
        passwordHash: newHash,
        passwordSalt: newSalt,
        forcePasswordChange: false,
      };

      await db.put('users', updatedUser);
      if (currentUser?.id === userId) {
        setCurrentUser(updatedUser);
      }

      await logSecurityEvent(
        'Password Changed',
        `User "${user.username}" successfully updated their password.`,
        'info',
        user.username,
        user.role
      );

      return { success: true };
    } catch (err) {
      console.error('Password change error:', err);
      return { success: false, error: 'Failed to update password.' };
    }
  };

  /**
   * Admin resets a Finance user password (sets forcePasswordChange: true)
   */
  const adminResetPassword = async (
    userId: string,
    newPasswordPlain: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
        return { success: false, error: 'Only administrators have authority to reset user passwords.' };
      }

      const db = await getDB();
      const user: User | undefined = await db.get('users', userId);
      if (!user) {
        return { success: false, error: 'Target user account not found.' };
      }

      const val = validatePasswordRules(newPasswordPlain);
      if (!val.isValid) {
        return { success: false, error: val.errors[0] || 'Temporary password does not meet security rules.' };
      }

      const { hashString: newHash, salt: newSalt } = await hashPasswordPBKDF2(newPasswordPlain);

      const updatedUser: User = {
        ...user,
        passwordHash: newHash,
        passwordSalt: newSalt,
        forcePasswordChange: true, // User must change password on their next login!
      };

      await db.put('users', updatedUser);

      await logSecurityEvent(
        'Administrator Password Reset',
        `Admin "${currentUser.username}" reset password for user "${user.username}". Mandatory change required on next login.`,
        'warning',
        currentUser.username,
        currentUser.role
      );

      return { success: true };
    } catch (err) {
      console.error('Admin password reset error:', err);
      return { success: false, error: 'Database error resetting password.' };
    }
  };

  /**
   * Reset Password with Security Questions (Requires at least 2 of 3 correct answers)
   */
  const resetPasswordWithSecurityQuestions = async (
    username: string,
    answers: { question: string; answer: string }[],
    newPasswordPlain: string
  ): Promise<{ success: boolean; error?: string; newRecoveryKey?: string }> => {
    try {
      const db = await getDB();
      const users: User[] = await db.getAll('users');
      const normalizedUser = username.trim().toLowerCase();
      const user = users.find(u => u.username.toLowerCase() === normalizedUser);

      if (!user) {
        // Run dummy hash to normalize timing
        await legacySha256(newPasswordPlain);
        return { success: false, error: 'Security answers verification failed.' };
      }

      let matches = 0;

      if (user.securityQuestions && user.securityQuestions.length > 0) {
        for (const input of answers) {
          if (!input.answer || !input.answer.trim()) continue;
          const foundQ = user.securityQuestions.find(
            sq => sq.question.trim().toLowerCase() === input.question.trim().toLowerCase()
          );
          if (foundQ) {
            const isMatch = await verifySecurityAnswer(input.answer, foundQ.answerHash);
            if (isMatch) matches++;
          }
        }
      } else if (user.securityQuestion && user.securityAnswerHash) {
        // Legacy single question fallback
        const singleAns = answers.find(a => a.answer && a.answer.trim());
        if (singleAns) {
          const isMatch = await verifySecurityAnswer(singleAns.answer, user.securityAnswerHash);
          if (isMatch) matches += 2; // Treat single legacy as satisfied
        }
      }

      // Require at least 2 correct answers
      if (matches < 2) {
        await logSecurityEvent(
          'Security Question Verification Failed',
          `Failed reset attempt for "${user.username}" (only ${matches} correct answers).`,
          'warning',
          user.username,
          user.role
        );
        return {
          success: false,
          error: 'Verification failed. At least 2 correct security answers are required.',
        };
      }

      // Validate new password rules
      const val = validatePasswordRules(newPasswordPlain);
      if (!val.isValid) {
        return { success: false, error: val.errors[0] || 'New password does not meet security rules.' };
      }

      // Hash new password
      const { hashString: newPassHash, salt: newPassSalt } = await hashPasswordPBKDF2(newPasswordPlain);

      // Generate a new one-time recovery key upon reset
      const newRecoveryKey = generateRecoveryKey();
      const { hashString: newRecHash, salt: newRecSalt } = await hashRecoveryKey(newRecoveryKey);

      const updatedUser: User = {
        ...user,
        passwordHash: newPassHash,
        passwordSalt: newPassSalt,
        recoveryKeyHash: newRecHash,
        recoveryKeySalt: newRecSalt,
        failedLoginAttempts: 0,
        lockUntil: 0,
        forcePasswordChange: false,
      };

      await db.put('users', updatedUser);

      await logSecurityEvent(
        'Password Reset via Security Questions',
        `User "${user.username}" reset password by answering security questions.`,
        'warning',
        user.username,
        user.role
      );

      return { success: true, newRecoveryKey };
    } catch (err) {
      console.error('Reset password error:', err);
      return { success: false, error: 'Database error during password reset.' };
    }
  };

  /**
   * Reset Password with One-Time Recovery Key
   */
  const resetPasswordWithRecoveryKey = async (
    username: string,
    enteredKey: string,
    newPasswordPlain: string
  ): Promise<{ success: boolean; error?: string; newRecoveryKey?: string }> => {
    try {
      const db = await getDB();
      const users: User[] = await db.getAll('users');
      const normalizedUser = username.trim().toLowerCase();
      const user = users.find(u => u.username.toLowerCase() === normalizedUser);

      if (!user || !user.recoveryKeyHash) {
        await legacySha256(enteredKey);
        return { success: false, error: 'Invalid or expired recovery key.' };
      }

      const isValidKey = await verifyRecoveryKey(enteredKey, user.recoveryKeyHash);
      if (!isValidKey) {
        await logSecurityEvent(
          'Recovery Key Verification Failed',
          `Invalid recovery key submitted for "${user.username}".`,
          'critical',
          user.username,
          user.role
        );
        return { success: false, error: 'Invalid or expired recovery key.' };
      }

      // Validate new password rules
      const val = validatePasswordRules(newPasswordPlain);
      if (!val.isValid) {
        return { success: false, error: val.errors[0] || 'New password does not meet security rules.' };
      }

      const { hashString: newPassHash, salt: newPassSalt } = await hashPasswordPBKDF2(newPasswordPlain);

      // Immediately invalidate old key and generate a fresh recovery key
      const newRecoveryKey = generateRecoveryKey();
      const { hashString: newRecHash, salt: newRecSalt } = await hashRecoveryKey(newRecoveryKey);

      const updatedUser: User = {
        ...user,
        passwordHash: newPassHash,
        passwordSalt: newPassSalt,
        recoveryKeyHash: newRecHash,
        recoveryKeySalt: newRecSalt,
        failedLoginAttempts: 0,
        lockUntil: 0,
        forcePasswordChange: false,
      };

      await db.put('users', updatedUser);

      await logSecurityEvent(
        'Password Reset via Recovery Key',
        `User "${user.username}" successfully reset password using Emergency Recovery Key. Key rotated.`,
        'critical',
        user.username,
        user.role
      );

      return { success: true, newRecoveryKey };
    } catch (err) {
      console.error('Recovery key reset error:', err);
      return { success: false, error: 'Database error during password recovery.' };
    }
  };

  /**
   * Create User Account (Admin Only)
   */
  const createUser = async (
    userData: Omit<User, 'id' | 'createdAt'> & {
      passwordPlain?: string;
      securityQuestionsInput?: { question: string; answer: string }[];
    }
  ): Promise<{ success: boolean; error?: string; recoveryKey?: string }> => {
    try {
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
        return { success: false, error: 'Administrator permission required.' };
      }

      const db = await getDB();
      const existing: User[] = await db.getAll('users');
      const normalizedDesired = userData.username.trim().toLowerCase();
      const cleanEmail = (userData.email || '').trim().toLowerCase();

      if (existing.some(u => u.username.toLowerCase() === normalizedDesired)) {
        return { success: false, error: `Username "${userData.username}" is already in use.` };
      }

      if (!isValidRealEmail(cleanEmail)) {
        return {
          success: false,
          error: 'Please provide a valid real email address so the user can verify their account and recover passwords.',
        };
      }

      if (existing.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
        return { success: false, error: `Email "${cleanEmail}" is already registered.` };
      }

      const passwordToUse = userData.passwordPlain || 'TempPass@2026';
      const val = validatePasswordRules(passwordToUse);
      if (!val.isValid) {
        return { success: false, error: val.errors[0] || 'Password must meet security rules.' };
      }

      const { hashString: passwordHash, salt: passwordSalt } = await hashPasswordPBKDF2(passwordToUse);

      // Generate initial recovery key for the user
      const recoveryKey = generateRecoveryKey();
      const { hashString: recoveryKeyHash, salt: recoveryKeySalt } = await hashRecoveryKey(recoveryKey);

      let hashedQuestions = userData.securityQuestions;
      if (userData.securityQuestionsInput && userData.securityQuestionsInput.length > 0) {
        hashedQuestions = await Promise.all(
          userData.securityQuestionsInput.map(async q => {
            const { hashString, salt } = await hashSecurityAnswer(q.answer);
            return {
              question: q.question,
              answerHash: hashString,
              salt,
            };
          })
        );
      }

      let newUserId = 'usr-' + Date.now();
      if (isFirebaseConfigured()) {
        try {
          await withSecondaryAuth(async (secondaryAuth) => {
            const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, passwordToUse);
            newUserId = cred.user.uid;
            await sendAuthVerificationEmail(cred.user, true);
            await recordUsernameEmailLookup(normalizedDesired, cleanEmail, cred.user.uid);
          });
        } catch (secErr: any) {
          if (secErr?.code !== 'auth/network-request-failed') {
            return { success: false, error: mapFirebaseAuthError(secErr) };
          }
          console.warn('Offline creating sub-account; saved locally:', secErr);
        }
      }

      const newUser: User = {
        ...userData,
        id: newUserId,
        username: normalizedDesired,
        email: cleanEmail,
        emailVerified: false,
        passwordHash,
        passwordSalt,
        securityQuestions: hashedQuestions,
        recoveryKeyHash,
        recoveryKeySalt,
        forcePasswordChange: true,
        createdAt: new Date().toISOString(),
      };

      await db.put('users', newUser);

      if (isFirebaseConfigured()) {
        try {
          const fbDb = getFirestoreDb();
          if (fbDb) {
            const profileData = {
              id: newUserId,
              name: newUser.fullName,
              fullName: newUser.fullName,
              username: newUser.username,
              email: newUser.email,
              role: newUser.role,
              permissions: userData.customPermissions || {},
              customPermissions: userData.customPermissions || {},
              status: newUser.isActive ? 'active' : 'disabled',
              isActive: newUser.isActive,
              schoolId: 'main',
              forcePasswordChange: true,
              createdAt: newUser.createdAt,
              _syncedAt: serverTimestamp(),
            };
            await setDoc(doc(fbDb, 'schools/main/users', newUserId), profileData, { merge: true });
            await setDoc(doc(fbDb, 'users', newUserId), profileData, { merge: true });
          }
        } catch (fbSyncErr) {
          console.warn('Could not mirror new user to Cloud Firestore:', fbSyncErr);
        }
      }

      await logSecurityEvent(
        'User Created',
        `New account "${newUser.username}" (${newUser.role}) created by admin "${currentUser.username}".`,
        'info',
        currentUser.username,
        currentUser.role
      );

      return { success: true, recoveryKey };
    } catch (err) {
      console.error('Create user error:', err);
      return { success: false, error: 'Database error creating user.' };
    }
  };

  const updateUser = async (user: User): Promise<boolean> => {
    try {
      const db = await getDB();
      await db.put('users', user);
      if (currentUser?.id === user.id) {
        setCurrentUser(user);
      }
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const toggleUserStatus = async (userId: string): Promise<boolean> => {
    try {
      const db = await getDB();
      const user: User | undefined = await db.get('users', userId);
      if (!user) return false;

      // Prevent deactivating own account
      if (currentUser?.id === userId) {
        alert('You cannot deactivate your own active administrative account.');
        return false;
      }

      const updated = { ...user, isActive: !user.isActive };
      await db.put('users', updated);

      await logSecurityEvent(
        updated.isActive ? 'User Account Activated' : 'User Account Deactivated',
        `Account "${user.username}" ${updated.isActive ? 'activated' : 'deactivated'} by "${currentUser?.username}".`,
        'warning',
        currentUser?.username,
        currentUser?.role
      );

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      if (currentUser?.id === userId) {
        alert('You cannot delete your own administrative account.');
        return false;
      }
      const db = await getDB();
      const user = await db.get('users', userId);
      await db.delete('users', userId);

      await logSecurityEvent(
        'User Account Deleted',
        `Account "${user?.username || userId}" deleted by "${currentUser?.username}".`,
        'critical',
        currentUser?.username,
        currentUser?.role
      );

      return true;
    } catch {
      return false;
    }
  };

  const updateProfile = async (
    userId: string,
    profileData: {
      fullName?: string;
      email?: string;
      phone?: string;
      username?: string;
      avatarUrl?: string;
      securityQuestion?: string;
      securityAnswer?: string;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const db = await getDB();
      const user: User | undefined = await db.get('users', userId);
      if (!user) return { success: false, error: 'User not found.' };

      if (profileData.username && profileData.username.trim().toLowerCase() !== user.username.toLowerCase()) {
        const all: User[] = await db.getAll('users');
        const desired = profileData.username.trim().toLowerCase();
        if (all.some(u => u.id !== userId && u.username.toLowerCase() === desired)) {
          return { success: false, error: `Username "${profileData.username}" is already in use.` };
        }
      }

      let securityAnswerHash = user.securityAnswerHash;
      if (profileData.securityAnswer && profileData.securityAnswer.trim()) {
        const hashedAns = await hashSecurityAnswer(profileData.securityAnswer.trim());
        securityAnswerHash = hashedAns.hashString;
      }

      const updatedUser: User = {
        ...user,
        fullName: profileData.fullName !== undefined ? profileData.fullName.trim() : user.fullName,
        email: profileData.email !== undefined ? profileData.email.trim() : user.email,
        phone: profileData.phone !== undefined ? profileData.phone.trim() : user.phone,
        username: profileData.username !== undefined ? profileData.username.trim().toLowerCase() : user.username,
        avatarUrl: profileData.avatarUrl !== undefined ? profileData.avatarUrl : user.avatarUrl,
        securityQuestion: profileData.securityQuestion !== undefined ? profileData.securityQuestion : user.securityQuestion,
        securityAnswerHash,
      };

      await db.put('users', updatedUser);
      if (currentUser?.id === userId) {
        setCurrentUser(updatedUser);
      }
      return { success: true };
    } catch (err) {
      console.error('Update profile error:', err);
      return { success: false, error: 'Failed to update profile.' };
    }
  };

  const refreshCurrentUser = async () => {
    if (!currentUser) return;
    try {
      const db = await getDB();
      const user = await db.get('users', currentUser.id);
      if (user) {
        setCurrentUser(user);
      }
    } catch (err) {
      console.error('Failed to refresh current user:', err);
    }
  };

  /**
   * Request password reset link via Firebase Auth standard email
   */
  const sendPasswordResetLink = async (
    usernameOrEmail: string
  ): Promise<{ success: boolean; emailSentTo?: string; retryAfterSeconds?: number; error?: string }> => {
    return await sendAuthPasswordResetEmail(usernameOrEmail);
  };

  /**
   * Send Firebase email verification to current user
   */
  const sendVerificationEmail = async (): Promise<{
    success: boolean;
    retryAfterSeconds?: number;
    remainingThisHour?: number;
    error?: string;
  }> => {
    return await sendAuthVerificationEmail();
  };

  /**
   * Resend verification email for a user blocked on EmailVerificationPendingScreen
   */
  const resendPendingVerificationEmail = async (): Promise<{
    success: boolean;
    retryAfterSeconds?: number;
    remainingThisHour?: number;
    error?: string;
  }> => {
    const fbAuth = getFirebaseAuth();
    if (!fbAuth?.currentUser) {
      return {
        success: false,
        error: 'Session expired. Please sign in again with your password to resend the verification email.',
      };
    }
    return await sendAuthVerificationEmail(fbAuth.currentUser);
  };

  /**
   * Recheck verification status for pendingVerificationUser and promote into MainApp once verified
   */
  const recheckPendingVerification = async (): Promise<{ verified: boolean; error?: string }> => {
    try {
      const fbAuth = getFirebaseAuth();
      if (!fbAuth?.currentUser) {
        return {
          verified: false,
          error: 'Please return to Sign In and enter your credentials after clicking the verification link.',
        };
      }
      await fbAuth.currentUser.reload();
      if (fbAuth.currentUser.emailVerified) {
        const target = pendingVerificationUser || currentUser;
        if (target) {
          const verifiedUser: User = {
            ...target,
            email: fbAuth.currentUser.email || target.email,
            emailVerified: true,
            pendingEmail: undefined,
          };
          const db = await getDB();
          await db.put('users', verifiedUser);

          const fbDb = getFirestoreDb();
          if (fbDb) {
            await setDoc(doc(fbDb, 'schools/main/users', verifiedUser.id), { emailVerified: true }, { merge: true });
            await setDoc(doc(fbDb, 'users', verifiedUser.id), { emailVerified: true }, { merge: true });
          }

          setPendingVerificationUser(null);
          setCurrentUser(verifiedUser);
          await saveSecureSession({
            id: verifiedUser.id,
            username: verifiedUser.username,
            role: verifiedUser.role,
          });
          await logSecurityEvent(
            'Email Address Verified',
            `User "${verifiedUser.username}" verified their email (${verifiedUser.email}).`,
            'info',
            verifiedUser.username,
            verifiedUser.role
          );
          return { verified: true };
        }
        return { verified: true };
      }
      return {
        verified: false,
        error: 'Your email is not verified yet. Please click the verification link in your inbox (check Spam/Junk too), then try again.',
      };
    } catch (err: any) {
      return { verified: false, error: mapFirebaseAuthError(err) };
    }
  };

  const dismissPendingVerification = useCallback(() => {
    const fbAuth = getFirebaseAuth();
    if (fbAuth) {
      firebaseSignOut(fbAuth).catch(() => {});
    }
    detachAllListeners();
    clearSecureSession();
    setPendingVerificationUser(null);
    setCurrentUser(null);
  }, []);

  /**
   * Refresh email verified status against Firebase Auth
   */
  const checkEmailVerifiedStatus = async (): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const fbAuth = getFirebaseAuth();
      if (fbAuth?.currentUser) {
        await fbAuth.currentUser.reload();
        const isVerified = fbAuth.currentUser.emailVerified;
        if (isVerified && !currentUser.emailVerified) {
          const db = await getDB();
          const updatedUser: User = {
            ...currentUser,
            emailVerified: true,
            pendingEmail: undefined,
          };
          await db.put('users', updatedUser);
          setCurrentUser(updatedUser);

          const fbDb = getFirestoreDb();
          if (fbDb) {
            await setDoc(doc(fbDb, 'schools/main/users', currentUser.id), {
              emailVerified: true,
            }, { merge: true });
          }
          return true;
        }
        return isVerified;
      }
      return !!currentUser.emailVerified;
    } catch (err) {
      console.warn('Error checking email verification:', err);
      return !!currentUser.emailVerified;
    }
  };

  /**
   * Updates user's real email, registers username lookup, and sends verification
   */
  const updateUserEmail = async (newEmail: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Not authenticated.' };
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail.includes('@') || cleanEmail.endsWith('@eduledger.local')) {
      return { success: false, error: 'Please enter a valid real email address.' };
    }

    try {
      const db = await getDB();
      const fbAuth = getFirebaseAuth();
      const fbDb = getFirestoreDb();

      if (fbAuth?.currentUser) {
        await requestUpdateUserEmail(cleanEmail);
      }

      const updatedUser: User = {
        ...currentUser,
        email: cleanEmail,
        pendingEmail: cleanEmail,
        emailVerified: false,
      };

      await db.put('users', updatedUser);
      setCurrentUser(updatedUser);

      if (fbDb) {
        await recordUsernameEmailLookup(currentUser.username, cleanEmail, currentUser.id);
        await setDoc(doc(fbDb, 'schools/main/users', currentUser.id), {
          email: cleanEmail,
          pendingEmail: cleanEmail,
          emailVerified: false,
        }, { merge: true });
      }

      await logSecurityEvent(
        'User Real Email Configured',
        `User "${currentUser.username}" configured real email "${cleanEmail}". Verification email dispatched.`,
        'info',
        currentUser.username,
        currentUser.role
      );

      return { success: true };
    } catch (err: unknown) {
      console.error('Update email error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update email.' };
    }
  };

  /**
   * Reset Password with 10 One-Time Backup Recovery Codes
   */
  const resetPasswordWithRecoveryCode = async (
    username: string,
    recoveryCode: string,
    newPasswordPlain: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const db = await getDB();
      const users: User[] = await db.getAll('users');
      const normalizedUser = username.trim().toLowerCase();
      const user = users.find(u => u.username.toLowerCase() === normalizedUser || (u.email && u.email.toLowerCase() === normalizedUser));

      const fbDb = getFirestoreDb();
      let storedCodes = user?.backupRecoveryCodes;
      let storedSalt = user?.backupRecoveryCodesSalt || '';

      if ((!storedCodes || storedCodes.length === 0) && fbDb) {
        try {
          const secSnap = await getDoc(doc(fbDb, 'schools/main/admin_security', 'recovery_codes'));
          if (secSnap.exists()) {
            const secData = secSnap.data();
            storedCodes = secData.codes;
            storedSalt = secData.salt;
          }
        } catch (e) {
          console.warn('Could not read admin_security from Firestore:', e);
        }
      }

      if (!storedCodes || storedCodes.length === 0) {
        return { success: false, error: 'No backup recovery codes found for this administrator account.' };
      }

      const { valid, updatedCodes } = await verifyAndConsumeRecoveryCode(
        recoveryCode,
        storedCodes,
        storedSalt
      );

      if (!valid || !updatedCodes) {
        return { success: false, error: 'Invalid or previously used recovery code. Each backup code works only once.' };
      }

      const val = validatePasswordRules(newPasswordPlain);
      if (!val.isValid) {
        return { success: false, error: val.errors[0] || 'Password does not meet required security standards.' };
      }

      const { hashString: passwordHash, salt: passwordSalt } = await hashPasswordPBKDF2(newPasswordPlain);

      if (user) {
        const updatedUser: User = {
          ...user,
          passwordHash,
          passwordSalt,
          backupRecoveryCodes: updatedCodes,
          failedLoginAttempts: 0,
          lockUntil: 0,
          forcePasswordChange: false,
        };
        await db.put('users', updatedUser);
      }

      if (fbDb) {
        try {
          await setDoc(doc(fbDb, 'schools/main/admin_security', 'recovery_codes'), {
            salt: storedSalt,
            codes: updatedCodes,
            updatedAt: new Date().toISOString(),
          }, { merge: true });

          if (user) {
            await setDoc(doc(fbDb, 'schools/main/users', user.id), {
              passwordHash,
              passwordSalt,
              backupRecoveryCodes: updatedCodes,
            }, { merge: true });
          }
        } catch (e) {
          console.warn('Firestore update error during recovery code reset:', e);
        }
      }

      await logSecurityEvent(
        'Password Reset via Backup Recovery Code',
        `Administrator "${username}" reset account password using an offline backup recovery code.`,
        'critical',
        username,
        'admin'
      );

      return { success: true };
    } catch (err: unknown) {
      console.error('Recovery code reset error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Database error during recovery.' };
    }
  };

  /**
   * Generate a fresh set of 10 backup recovery codes
   */
  const generateNewBackupRecoveryCodes = async (): Promise<{ success: boolean; codes?: string[]; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Not authenticated.' };
    try {
      const codes = generateBackupRecoveryCodes(10);
      const salt = generateRecoveryCodesSalt();
      const hashed = await hashBackupRecoveryCodes(codes, salt);

      const db = await getDB();
      const updatedUser: User = {
        ...currentUser,
        backupRecoveryCodes: hashed,
        backupRecoveryCodesSalt: salt,
      };
      await db.put('users', updatedUser);
      setCurrentUser(updatedUser);

      const fbDb = getFirestoreDb();
      if (fbDb) {
        await setDoc(doc(fbDb, 'schools/main/admin_security', 'recovery_codes'), {
          salt,
          codes: hashed,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }

      return { success: true, codes };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error generating codes.' };
    }
  };

  const role = currentUser?.role || null;
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isMainAdmin = isAdmin;
  const isFinance = role === 'finance';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        pendingVerificationUser,
        role,
        isAdmin,
        isMainAdmin,
        isFinance,
        isLoading,
        isFirstRunSetup,
        checkIsFirstRun,
        login,
        logout,
        resendPendingVerificationEmail,
        recheckPendingVerification,
        dismissPendingVerification,
        reVerifyCurrentPassword,
        createFirstAdminAccount,
        changePassword,
        adminResetPassword,
        resetPasswordWithSecurityQuestions,
        resetPasswordWithRecoveryKey,
        createUser,
        updateUser,
        toggleUserStatus,
        deleteUser,
        updateProfile,
        refreshCurrentUser,
        logSecurityEvent,
        sendPasswordResetLink,
        sendVerificationEmail,
        checkEmailVerifiedStatus,
        updateUserEmail,
        resetPasswordWithRecoveryCode,
        generateNewBackupRecoveryCodes,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
