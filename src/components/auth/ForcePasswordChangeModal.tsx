import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { validatePasswordRules } from '../../utils/crypto';
import {
  Lock,
  ShieldAlert,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

interface ForcePasswordChangeModalProps {
  isOpen: boolean;
}

export const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({ isOpen }) => {
  const { currentUser, changePassword, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const passValidation = validatePasswordRules(newPassword);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentPassword) {
      setErrorMessage('Please enter your current temporary password.');
      return;
    }

    if (!passValidation.isValid) {
      setErrorMessage(passValidation.errors[0] || 'New password does not meet required security standards.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage('New password cannot be identical to your temporary password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await changePassword(currentUser.id, currentPassword, newPassword);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update temporary password.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error updating password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Mandatory Password Change
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your administrator has reset your password or set a temporary credential. For security compliance, you must choose a new private password before accessing the system.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Temporary / Current Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current temporary password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Master Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter strong new password"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Strength meter bar */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Strength:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{passValidation.strengthLabel}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                  {[1, 2, 3, 4].map(idx => (
                    <div
                      key={idx}
                      className={`flex-1 h-full rounded-full transition-all ${
                        idx <= passValidation.score ? passValidation.color : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Rules pills */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-2 gap-1 text-[11px]">
            <span className={`flex items-center gap-1 ${passValidation.rules.minLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              <Check className="w-3.5 h-3.5" /> Min 8 chars
            </span>
            <span className={`flex items-center gap-1 ${passValidation.rules.hasUppercase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              <Check className="w-3.5 h-3.5" /> Uppercase
            </span>
            <span className={`flex items-center gap-1 ${passValidation.rules.hasLowercase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              <Check className="w-3.5 h-3.5" /> Lowercase
            </span>
            <span className={`flex items-center gap-1 ${passValidation.rules.hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              <Check className="w-3.5 h-3.5" /> Number (0-9)
            </span>
            <span className={`flex items-center gap-1 ${passValidation.rules.hasSpecial ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              <Check className="w-3.5 h-3.5" /> Special symbol
            </span>
            <span className={`flex items-center gap-1 ${passValidation.rules.notCommon ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              <Check className="w-3.5 h-3.5" /> Not common
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 pt-3">
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Sign Out
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Save New Password & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
