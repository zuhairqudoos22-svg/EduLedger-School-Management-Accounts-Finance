import React, { useState, useEffect } from 'react';
import {
  verifyEmailWithCode,
  checkPasswordResetActionCode,
  confirmPasswordResetWithCode,
  getFirebaseAuth,
  getFirestoreDb,
} from '../../services/firebase';
import { validatePasswordRules, hashPasswordPBKDF2 } from '../../utils/crypto';
import { clearSecureSession } from '../../utils/secureSession';
import { getDB } from '../../db/indexedDB';
import { User } from '../../types';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { DeveloperLogo } from '../common/DeveloperLogo';
import {
  CheckCircle2,
  XCircle,
  KeyRound,
  MailCheck,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

interface AuthActionViewProps {
  mode: 'verifyEmail' | 'resetPassword';
  oobCode: string;
  onComplete: () => void;
}

export const AuthActionView: React.FC<AuthActionViewProps> = ({
  mode,
  oobCode,
  onComplete,
}) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [targetEmail, setTargetEmail] = useState<string>('');

  // Reset Password form state
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const passValidation = validatePasswordRules(newPassword);

  useEffect(() => {
    let active = true;

    async function processAction() {
      if (!oobCode) {
        if (active) {
          setStatus('error');
          setErrorMsg('Missing verification or reset code in link.');
        }
        return;
      }

      if (mode === 'verifyEmail') {
        const res = await verifyEmailWithCode(oobCode);
        if (!active) return;
        if (res.success) {
          // Best effort: sync local & cloud user emailVerified flag if signed in
          try {
            const fbAuth = getFirebaseAuth();
            const fbDb = getFirestoreDb();
            if (fbAuth?.currentUser) {
              const uid = fbAuth.currentUser.uid;
              const email = fbAuth.currentUser.email || '';
              setTargetEmail(email);
              const db = await getDB();
              const existingUser: User | undefined = await db.get('users', uid);
              if (existingUser) {
                await db.put('users', { ...existingUser, emailVerified: true, pendingEmail: undefined });
              }
              if (fbDb) {
                await setDoc(doc(fbDb, 'schools/main/users', uid), { emailVerified: true }, { merge: true });
                await setDoc(doc(fbDb, 'users', uid), { emailVerified: true }, { merge: true });
              }
            }
          } catch {
            // Non-blocking sync
          }
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMsg(res.error || 'Email verification link is invalid or expired.');
        }
      } else if (mode === 'resetPassword') {
        const res = await checkPasswordResetActionCode(oobCode);
        if (!active) return;
        if (res.valid) {
          setTargetEmail(res.email || '');
          setStatus('ready');
        } else {
          setStatus('error');
          setErrorMsg(res.error || 'Password reset link is invalid or expired.');
        }
      }
    }

    processAction();
    return () => {
      active = false;
    };
  }, [mode, oobCode]);

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!passValidation.isValid) {
      setErrorMsg(passValidation.errors[0] || 'Password does not satisfy security requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New Password and Confirm Password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await confirmPasswordResetWithCode(oobCode, newPassword);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to reset password.');
        return;
      }

      // Synchronize local IndexedDB PBKDF2 password hash for matching email so offline login works
      if (targetEmail) {
        try {
          const db = await getDB();
          const users: User[] = await db.getAll('users');
          const match = users.find(u => u.email && u.email.toLowerCase() === targetEmail.toLowerCase());
          if (match) {
            const { hashString, salt } = await hashPasswordPBKDF2(newPassword);
            await db.put('users', {
              ...match,
              passwordHash: hashString,
              passwordSalt: salt,
              failedLoginAttempts: 0,
              lockUntil: 0,
              forcePasswordChange: false,
            });
          }
        } catch {
          // Non-blocking: Firebase login also syncs local hash on next sign-in
        }
      }

      // Invalidate any prior active sessions for security
      clearSecureSession();
      const fbAuth = getFirebaseAuth();
      if (fbAuth?.currentUser) {
        await firebaseSignOut(fbAuth).catch(() => {});
      }

      setStatus('success');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* LOADING STATE */}
        {status === 'loading' && (
          <div className="py-8 flex flex-col items-center text-center space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {mode === 'verifyEmail' ? 'Verifying Your Email...' : 'Validating Reset Link...'}
              </h2>
              <p className="text-xs text-slate-500">
                Connecting securely to Firebase Authentication.
              </p>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'error' && (
          <div className="space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {mode === 'verifyEmail' ? 'Verification Link Invalid' : 'Reset Link Expired or Invalid'}
              </h2>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
                {errorMsg}
              </p>
            </div>
            <button
              type="button"
              onClick={onComplete}
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Return to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SUCCESS STATE */}
        {status === 'success' && (
          <div className="space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              {mode === 'verifyEmail' ? (
                <MailCheck className="w-8 h-8" />
              ) : (
                <CheckCircle2 className="w-8 h-8" />
              )}
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {mode === 'verifyEmail' ? 'Email Verified Successfully!' : 'Password Reset Complete!'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {mode === 'verifyEmail'
                  ? `Your email${targetEmail ? ` (${targetEmail})` : ''} is now confirmed. All EduLedger features and account recovery options are active.`
                  : `Your password${targetEmail ? ` for ${targetEmail}` : ''} has been updated securely and all previous sessions were signed out.`}
              </p>
            </div>
            <button
              type="button"
              onClick={onComplete}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{mode === 'verifyEmail' ? 'Continue to EduLedger' : 'Sign In with New Password'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* READY STATE FOR PASSWORD RESET FORM */}
        {status === 'ready' && mode === 'resetPassword' && (
          <form onSubmit={handleConfirmReset} className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Set New Password
                </h2>
                <p className="text-xs text-slate-500 truncate max-w-[260px]">
                  Account: <strong className="text-slate-700 dark:text-slate-300">{targetEmail}</strong>
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter strong password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Password Strength Checklist */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  Strength:
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                    passValidation.score >= 3
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {passValidation.strengthLabel}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <span className={`flex items-center gap-1 ${passValidation.rules.minLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  <Check className="w-3 h-3" /> 8+ characters
                </span>
                <span className={`flex items-center gap-1 ${passValidation.rules.hasUppercase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  <Check className="w-3 h-3" /> Uppercase (A-Z)
                </span>
                <span className={`flex items-center gap-1 ${passValidation.rules.hasLowercase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  <Check className="w-3 h-3" /> Lowercase (a-z)
                </span>
                <span className={`flex items-center gap-1 ${passValidation.rules.hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  <Check className="w-3 h-3" /> Number (0-9)
                </span>
                <span className={`flex items-center gap-1 ${passValidation.rules.hasSpecial ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  <Check className="w-3 h-3" /> Symbol (!@#$)
                </span>
                <span className={`flex items-center gap-1 ${passValidation.rules.notCommon ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  <Check className="w-3 h-3" /> Not common word
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Confirm &amp; Update Password</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <DeveloperLogo size="sm" showCredit={true} creditVariant="developedBy" />
          <span>Auth Action Portal</span>
        </div>
      </div>
    </div>
  );
};
