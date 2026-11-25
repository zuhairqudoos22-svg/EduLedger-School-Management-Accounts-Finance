import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getDB } from '../../db/indexedDB';
import { User } from '../../types';
import { validatePasswordRules } from '../../utils/crypto';
import { checkPasswordResetLimit } from '../../utils/authRateLimit';
import {
  X,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Mail,
  Send,
  Clock,
  Sparkles,
} from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (username: string) => void;
}

type RecoveryTab = 'email_link' | 'recovery_code' | 'questions';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    resetPasswordWithSecurityQuestions,
    resetPasswordWithRecoveryKey,
    sendPasswordResetLink,
    resetPasswordWithRecoveryCode,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<RecoveryTab>('email_link');
  const [identifier, setIdentifier] = useState(''); // username or email

  // Mode 1: Firebase Email Reset Link
  const [emailSentNotice, setEmailSentNotice] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [resetAttempts, setResetAttempts] = useState(0);

  // Mode 2: Backup One-Time Recovery Code
  const [backupCode, setBackupCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Mode 3: Questions & Legacy Key
  const [legacyStep, setLegacyStep] = useState<'username' | 'method' | 'new_password'>('username');
  const [legacyMethod, setLegacyMethod] = useState<'questions' | 'recovery_key'>('questions');
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [enteredRecoveryKey, setEnteredRecoveryKey] = useState('');
  const [generatedNewRecoveryKey, setGeneratedNewRecoveryKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [downloadedKey, setDownloadedKey] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Cooldown countdown timer
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const interval = setInterval(() => {
      setEmailCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [emailCooldown]);

  const passValidation = validatePasswordRules(newPassword);

  if (!isOpen) return null;

  // HANDLER 1: Send Password Reset Email via Firebase Auth
  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmed = identifier.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your username or registered email address.');
      return;
    }

    const rateCheck = checkPasswordResetLimit(trimmed);
    if (!rateCheck.allowed) {
      setEmailCooldown(rateCheck.retryAfterSeconds);
      setErrorMessage(rateCheck.reason || `Please wait ${rateCheck.retryAfterSeconds}s before retrying.`);
      return;
    }

    if (emailCooldown > 0) {
      setErrorMessage(`Please wait ${emailCooldown}s before requesting another reset email.`);
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendPasswordResetLink(trimmed);
      if (!res.success) {
        if (typeof res.retryAfterSeconds === 'number' && res.retryAfterSeconds > 0) {
          setEmailCooldown(res.retryAfterSeconds);
        }
        setErrorMessage(res.error || 'Could not process password reset request.');
        return;
      }

      setResetAttempts(prev => prev + 1);
      setEmailCooldown(res.retryAfterSeconds || 60);
      setEmailSentNotice(true);
      setSuccessMessage(
        'If an account matches your details, a password reset link has been sent. Check your inbox and Spam/Junk folder.'
      );
    } catch {
      // Security best practice: Never confirm or deny account existence
      setEmailSentNotice(true);
      setSuccessMessage(
        'If an account matches your details, a password reset email has been sent. Check your inbox and Spam/Junk folder.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // HANDLER 2: Reset Password via One-Time Backup Recovery Code
  const handleResetWithBackupCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your administrator username or email.');
      return;
    }

    if (!backupCode.trim()) {
      setErrorMessage('Please enter your 8-character one-time backup recovery code (e.g. 4F9B-2E7A).');
      return;
    }

    if (!passValidation.isValid) {
      setErrorMessage(passValidation.errors[0] || 'Password does not meet required security standards.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Password and Confirm Password do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPasswordWithRecoveryCode(identifier.trim(), backupCode.trim(), newPassword);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to verify backup recovery code.');
        return;
      }

      setSuccessMessage('Password reset successfully! You can now sign in with your new password.');
      setTimeout(() => {
        onSuccess(identifier.trim());
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error resetting password.');
    } finally {
      setIsLoading(false);
    }
  };

  // HANDLER 3: Security Questions & Legacy Emergency Key
  const handleLookupLegacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!identifier.trim()) {
      setErrorMessage('Please enter your account username.');
      return;
    }

    setIsLoading(true);
    try {
      const db = await getDB();
      const users: User[] = await db.getAll('users');
      const found = users.find(
        u => u.username.toLowerCase() === identifier.trim().toLowerCase() ||
             (u.email && u.email.toLowerCase() === identifier.trim().toLowerCase())
      );

      if (!found) {
        setErrorMessage('No registered user account found with those details.');
        return;
      }

      if (found.securityQuestions && found.securityQuestions.length > 0) {
        setAnswers(found.securityQuestions.map(sq => ({ question: sq.question, answer: '' })));
      } else if (found.securityQuestion) {
        setAnswers([{ question: found.securityQuestion, answer: '' }]);
      } else {
        setLegacyMethod('recovery_key');
      }

      setLegacyStep('method');
    } catch {
      setErrorMessage('Error retrieving user security profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyLegacyMethod = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (legacyMethod === 'questions') {
      const filled = answers.filter(a => a.answer.trim().length > 0);
      if (filled.length < 2 && answers.length >= 2) {
        setErrorMessage('Please answer at least 2 security questions.');
        return;
      }
      if (filled.length === 0) {
        setErrorMessage('Please provide an answer to proceed.');
        return;
      }
    } else {
      if (!enteredRecoveryKey.trim()) {
        setErrorMessage('Please enter your 16-character Emergency Recovery Key.');
        return;
      }
    }
    setLegacyStep('new_password');
  };

  const handleFinalLegacyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!passValidation.isValid) {
      setErrorMessage(passValidation.errors[0] || 'Password does not meet required security standards.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Password and Confirm Password do not match.');
      return;
    }

    setIsLoading(true);
    try {
      let res;
      if (legacyMethod === 'questions') {
        res = await resetPasswordWithSecurityQuestions(identifier.trim(), answers, newPassword);
      } else {
        res = await resetPasswordWithRecoveryKey(identifier.trim(), enteredRecoveryKey.trim(), newPassword);
      }

      if (!res.success) {
        setErrorMessage(res.error || 'Verification failed. Password could not be reset.');
        setLegacyStep('method');
        return;
      }

      if (res.newRecoveryKey) {
        setGeneratedNewRecoveryKey(res.newRecoveryKey);
      }

      setSuccessMessage('Password reset successfully!');
      setTimeout(() => {
        onSuccess(identifier.trim());
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error completing password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Account Recovery &amp; Password Reset
              </h3>
              <p className="text-xs text-slate-500">
                Official Firebase email recovery &amp; offline emergency codes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('email_link');
              setErrorMessage('');
            }}
            className={`py-2 px-2 rounded-xl transition text-center cursor-pointer ${
              activeTab === 'email_link'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Email Reset Link
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('recovery_code');
              setErrorMessage('');
            }}
            className={`py-2 px-2 rounded-xl transition text-center cursor-pointer ${
              activeTab === 'recovery_code'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Backup Code
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('questions');
              setErrorMessage('');
            }}
            className={`py-2 px-2 rounded-xl transition text-center cursor-pointer ${
              activeTab === 'questions'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Security Q&amp;A
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="space-y-1">
              <span className="font-semibold block">{successMessage}</span>
              {emailSentNotice && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tip: If you do not see the email within 2 minutes, check your <strong>Spam / Junk</strong> folder or make sure you configured a real email address.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: EMAIL RESET LINK */}
        {activeTab === 'email_link' && (
          <form onSubmit={handleSendResetEmail} className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Enter your username OR real email address. We will send a secure password reset link powered by Firebase Auth.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Username or Real Email Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="e.g. admin or principal@school.edu.pk"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-[11px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Zero-Cost Spark Email Delivery</span>
              </p>
              <p>
                Click the reset link in the email, set your new password, then return here to log in.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || emailCooldown > 0}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>
                {emailCooldown > 0
                  ? `Resend Available in ${emailCooldown}s`
                  : 'Send Password Reset Email'}
              </span>
            </button>
          </form>
        )}

        {/* TAB 2: BACKUP ONE-TIME RECOVERY CODE */}
        {activeTab === 'recovery_code' && (
          <form onSubmit={handleResetWithBackupCode} className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Use one of your 10 offline backup recovery codes (generated during setup). Each code works exactly once.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Administrator Username or Email
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="e.g. admin"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                One-Time Backup Recovery Code
              </label>
              <input
                type="text"
                required
                value={backupCode}
                onChange={e => setBackupCode(e.target.value.toUpperCase())}
                placeholder="e.g. 4F9B-2E7A"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono tracking-widest text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 uppercase"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 number"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Verify Code &amp; Reset Password</span>
            </button>
          </form>
        )}

        {/* TAB 3: QUESTIONS & EMERGENCY KEY */}
        {activeTab === 'questions' && (
          <div className="space-y-4">
            {legacyStep === 'username' && (
              <form onSubmit={handleLookupLegacy} className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Enter your username to answer your registered security questions or enter your 16-character Emergency Recovery Key.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="e.g. admin"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {legacyStep === 'method' && (
              <form onSubmit={handleVerifyLegacyMethod} className="space-y-4">
                {answers.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">
                      Answer at least 2 of your registered security questions:
                    </p>
                    {answers.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {item.question}
                        </label>
                        <input
                          type="text"
                          value={item.answer}
                          onChange={e => {
                            const val = e.target.value;
                            setAnswers(prev => prev.map((a, i) => i === idx ? { ...a, answer: val } : a));
                          }}
                          placeholder="Your answer"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Emergency Recovery Key (16 characters)
                    </label>
                    <input
                      type="text"
                      value={enteredRecoveryKey}
                      onChange={e => setEnteredRecoveryKey(e.target.value)}
                      placeholder="e.g. ABCD-EFGH-IJKL-MNOP"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center justify-center gap-2"
                >
                  <span>Set New Password</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {legacyStep === 'new_password' && (
              <form onSubmit={handleFinalLegacyReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters, 1 number"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  Confirm &amp; Reset Password
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
