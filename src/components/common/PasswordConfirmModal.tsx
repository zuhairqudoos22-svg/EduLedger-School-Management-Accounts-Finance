import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

interface PasswordConfirmModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  actionButtonLabel?: string;
  actionButtonColor?: 'rose' | 'indigo' | 'emerald' | 'amber';
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const PasswordConfirmModal: React.FC<PasswordConfirmModalProps> = ({
  isOpen,
  title = 'Confirm Sensitive Action',
  description = 'For institutional security compliance, please re-enter your administrator password to authorize this action.',
  actionButtonLabel = 'Authorize Action',
  actionButtonColor = 'rose',
  onClose,
  onConfirm,
}) => {
  const { reVerifyCurrentPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Password is required.');
      return;
    }

    setErrorMessage('');
    setIsVerifying(true);

    try {
      const isValid = await reVerifyCurrentPassword(password);
      if (!isValid) {
        setErrorMessage('Incorrect password. Authorization denied.');
        setIsVerifying(false);
        return;
      }

      await onConfirm();
      setPassword('');
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Authorization error occurred.');
    } finally {
      setIsVerifying(false);
    }
  };

  const colorClasses = {
    rose: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30',
    indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30',
    amber: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30',
  }[actionButtonColor];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="text-xs text-slate-500">Security Authorization Required</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {description}
        </p>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Re-enter Your Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter account password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition active:scale-98 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${colorClasses}`}
            >
              {isVerifying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{actionButtonLabel}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
