import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Mail,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Download,
  Copy,
  Check,
  ArrowRight,
  KeyRound,
  X,
} from 'lucide-react';

interface EmailMigrationModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const EmailMigrationModal: React.FC<EmailMigrationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentUser,
    updateUserEmail,
    updateUser,
    generateNewBackupRecoveryCodes,
  } = useAuth();

  const [realEmail, setRealEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'input_email' | 'backup_codes'>('input_email');
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [downloadedCodes, setDownloadedCodes] = useState(false);

  if (!isOpen || !currentUser) return null;

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const skippedCount = currentUser.emailMigrationSkippedCount || 0;
  const canSkip = !isAdmin && skippedCount < 3;

  const handleSkip = async () => {
    if (!canSkip) return;
    try {
      await updateUser({
        ...currentUser,
        emailMigrationSkippedCount: skippedCount + 1,
      });
      if (onClose) onClose();
    } catch {
      if (onClose) onClose();
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const clean = realEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      setErrorMessage('Please enter a valid email address (e.g. name@school.edu.pk).');
      return;
    }

    if (clean.endsWith('@eduledger.local')) {
      setErrorMessage('Please enter a real email provider address, not a local internal placeholder.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateUserEmail(clean);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update email address.');
        return;
      }

      // If user is Admin, generate 10 offline recovery codes if not already present
      if (isAdmin) {
        const codesRes = await generateNewBackupRecoveryCodes();
        if (codesRes.success && codesRes.codes && codesRes.codes.length > 0) {
          setGeneratedCodes(codesRes.codes);
          setStep('backup_codes');
          return;
        }
      }

      if (onClose) onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error configuring email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCodes = async () => {
    try {
      await navigator.clipboard.writeText(generatedCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadCodes = () => {
    const textContent = `=====================================================
EDULEDGER — 10 ONE-TIME BACKUP RECOVERY CODES
=====================================================
Generated At : ${new Date().toLocaleString()}
Account User : ${currentUser.username}
Real Email   : ${currentUser.email}

ONE-TIME BACKUP RECOVERY CODES (10 TOTAL):
${generatedCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}

SECURITY WARNING:
- Each code can be used exactly ONCE to regain access or reset your password.
- Print or store this text file in an offline encrypted vault.
- Never share these codes with unauthorized individuals.
=====================================================`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eduledger_backup_recovery_codes_${currentUser.username}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedCodes(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add Your Real Email to Secure Account
              </h3>
              <p className="text-xs text-slate-500">
                Enables official password recovery &amp; verification
              </p>
            </div>
          </div>
          {canSkip && (
            <button
              type="button"
              onClick={handleSkip}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Remind me later"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: INPUT REAL EMAIL */}
        {step === 'input_email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Account Security Upgrade</span>
              </p>
              <p className="leading-relaxed">
                Your account is currently using an internal placeholder (<span className="font-mono text-slate-500">{currentUser.email || `${currentUser.username}@eduledger.local`}</span>).
                Connecting a real email allows Firebase to send password reset links and verification emails securely.
              </p>
              {isAdmin && (
                <p className="text-amber-700 dark:text-amber-400 font-semibold text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700">
                  Required for Administrator: Destructive operations (Factory Reset, Data Purges) require a verified email.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Real Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  autoFocus
                  required
                  value={realEmail}
                  onChange={e => setRealEmail(e.target.value)}
                  placeholder="e.g. principal@school.edu.pk or admin@gmail.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Save Email &amp; Send Verification</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {canSkip && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Skip ({3 - skippedCount} left)
                </button>
              )}
            </div>
          </form>
        )}

        {/* STEP 2: BACKUP RECOVERY CODES FOR ADMIN */}
        {step === 'backup_codes' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" />
                <span>Your 10 One-Time Backup Recovery Codes</span>
              </p>
              <p className="leading-relaxed">
                Save these emergency codes now. If you ever lose email access or cannot receive verification emails, entering any single code allows resetting your password directly. Each code works only ONCE.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
              {generatedCodes.map((code, idx) => (
                <div key={idx} className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between px-2.5">
                  <span className="text-[10px] text-slate-400 font-sans">#{idx + 1}</span>
                  <span className="tracking-wider">{code}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCodes}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedCodes ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCodes ? 'Copied Codes' : 'Copy All'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCodes}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                <span>{downloadedCodes ? 'Downloaded TXT' : 'Download TXT'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>I Have Saved My Recovery Codes</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
