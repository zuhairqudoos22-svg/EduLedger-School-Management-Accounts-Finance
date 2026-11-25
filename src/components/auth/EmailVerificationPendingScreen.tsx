import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { checkResendVerificationLimit } from '../../utils/authRateLimit';
import { DeveloperLogo } from '../common/DeveloperLogo';
import {
  Mail,
  ShieldCheck,
  RefreshCw,
  Send,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Inbox,
} from 'lucide-react';

export const EmailVerificationPendingScreen: React.FC = () => {
  const {
    pendingVerificationUser,
    resendPendingVerificationEmail,
    recheckPendingVerification,
    dismissPendingVerification,
  } = useAuth();

  const [cooldown, setCooldown] = useState<number>(0);
  const [remainingHourly, setRemainingHourly] = useState<number>(5);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const targetEmail = pendingVerificationUser?.email || '';

  // Sync cooldown and remaining hourly quota from persistent localStorage rate limit
  useEffect(() => {
    if (!targetEmail) return;
    const status = checkResendVerificationLimit(targetEmail);
    setCooldown(status.retryAfterSeconds);
    setRemainingHourly(status.remainingInWindow);
  }, [targetEmail]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!pendingVerificationUser) return null;

  const handleResend = async () => {
    if (cooldown > 0 || isSending) return;
    setIsSending(true);
    setStatusMessage(null);
    try {
      const res = await resendPendingVerificationEmail();
      if (res.success) {
        setCooldown(res.retryAfterSeconds || 60);
        if (typeof res.remainingThisHour === 'number') {
          setRemainingHourly(res.remainingThisHour);
        }
        setStatusMessage({
          type: 'success',
          text: `A fresh verification link has been sent to ${targetEmail}. Please check your inbox and Spam/Junk folder.`,
        });
      } else {
        if (typeof res.retryAfterSeconds === 'number' && res.retryAfterSeconds > 0) {
          setCooldown(res.retryAfterSeconds);
        }
        if (typeof res.remainingThisHour === 'number') {
          setRemainingHourly(res.remainingThisHour);
        }
        setStatusMessage({
          type: 'error',
          text: res.error || 'Could not send verification email.',
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckVerified = async () => {
    if (isChecking) return;
    setIsChecking(true);
    setStatusMessage(null);
    try {
      const res = await recheckPendingVerification();
      if (!res.verified) {
        setStatusMessage({
          type: 'error',
          text:
            res.error ||
            'Email is not verified yet. Open the link in your email first, then click "I Have Verified My Email".',
        });
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Top Icon + Brand */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
            <Mail className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Email Verification Required</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Please verify your email first.
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
            We sent a confirmation link to{' '}
            <strong className="text-slate-900 dark:text-white break-all">{targetEmail}</strong>. You must verify your inbox before accessing EduLedger.
          </p>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                : 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Helpful Inbox Tips */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <Inbox className="w-4 h-4 text-indigo-500" />
            <span>Verification Checklist</span>
          </div>
          <ul className="space-y-1 text-[11px] list-disc pl-4">
            <li>Open the email from Firebase / EduLedger and click the verification link.</li>
            <li>If it is not in your primary inbox within 1-2 minutes, check <strong>Spam / Junk</strong>.</li>
            <li>Once clicked, return here and press <strong>I Have Verified My Email</strong>.</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={isChecking}
            onClick={handleCheckVerified}
            className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking Verification Status...' : 'I Have Verified My Email'}</span>
          </button>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              disabled={isSending || cooldown > 0 || remainingHourly <= 0}
              onClick={handleResend}
              className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {cooldown > 0 ? <Clock className="w-4 h-4 text-amber-500" /> : <Send className="w-4 h-4 text-indigo-500" />}
              <span>
                {isSending
                  ? 'Sending...'
                  : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : `Resend Verification Email (${remainingHourly}/5 left)`}
              </span>
            </button>

            <button
              type="button"
              onClick={dismissPendingVerification}
              className="py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Sign In</span>
            </button>
          </div>
        </div>

        {/* Footer Credit */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <DeveloperLogo size="sm" showCredit={true} creditVariant="developedBy" />
          <span>EduLedger Security Gate</span>
        </div>
      </div>
    </div>
  );
};
