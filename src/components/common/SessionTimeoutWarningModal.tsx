import React from 'react';
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';

interface SessionTimeoutWarningModalProps {
  isOpen: boolean;
  secondsRemaining: number;
  onStayLoggedIn: () => void;
  onLogoutNow: () => void;
}

export const SessionTimeoutWarningModal: React.FC<SessionTimeoutWarningModalProps> = ({
  isOpen,
  secondsRemaining,
  onStayLoggedIn,
  onLogoutNow,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-5 animate-in zoom-in-95">
        <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-xs font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Session Inactivity Notice</span>
          </div>

          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Are You Still There?
          </h3>

          <p className="text-xs text-slate-500 leading-relaxed">
            No activity has been detected. To prevent unauthorized access to your school&apos;s financial and academic records, your session will automatically lock in:
          </p>

          <div className="py-2">
            <span className="font-mono text-3xl font-black text-amber-600 dark:text-amber-400">
              {secondsRemaining}s
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={onStayLoggedIn}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Stay Signed In (Extend Session)</span>
          </button>

          <button
            type="button"
            onClick={onLogoutNow}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
