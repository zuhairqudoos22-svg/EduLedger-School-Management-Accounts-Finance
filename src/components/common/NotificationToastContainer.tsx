import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useSchool } from '../../context/SchoolContext';
import { InAppNotification } from '../../types';
import {
  Clock,
  AlertTriangle,
  BookOpen,
  UserCheck,
  CheckCircle2,
  Bell,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const NotificationToastContainer: React.FC = () => {
  const { activeToasts, dismissToast, markAsRead } = useNotifications();
  const { setActiveTab } = useSchool();

  if (activeToasts.length === 0) return null;

  const getCategoryTheme = (category: InAppNotification['category'], priority: InAppNotification['priority']) => {
    switch (category) {
      case 'fee_deadline':
        return {
          icon: Clock,
          iconBg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300',
          borderColor: 'border-amber-200 dark:border-amber-800/80',
          actionBtn: 'bg-amber-600 hover:bg-amber-500 text-white',
          dotColor: 'bg-amber-500',
        };
      case 'low_inventory':
        return {
          icon: BookOpen,
          iconBg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300',
          borderColor: 'border-rose-200 dark:border-rose-800/80',
          actionBtn: 'bg-rose-600 hover:bg-rose-500 text-white',
          dotColor: 'bg-rose-500',
        };
      case 'staff_attendance':
        return {
          icon: UserCheck,
          iconBg: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300',
          borderColor: 'border-indigo-200 dark:border-indigo-800/80',
          actionBtn: 'bg-indigo-600 hover:bg-indigo-500 text-white',
          dotColor: 'bg-indigo-500',
        };
      case 'system':
      case 'general':
      default:
        return {
          icon: CheckCircle2,
          iconBg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300',
          borderColor: 'border-emerald-200 dark:border-emerald-800/80',
          actionBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
          dotColor: 'bg-emerald-500',
        };
    }
  };

  const handleAction = (toast: InAppNotification) => {
    markAsRead(toast.id);
    dismissToast(toast.id);
    if (toast.targetTab) {
      setActiveTab(toast.targetTab);
    }
  };

  return (
    <div
      aria-live="polite"
      aria-label="Notification Toasts"
      className="fixed bottom-5 right-4 sm:right-6 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none"
    >
      {activeToasts.map(toast => {
        const theme = getCategoryTheme(toast.category, toast.priority);
        const IconComponent = theme.icon;

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto p-4 rounded-2xl bg-white dark:bg-slate-900 border ${theme.borderColor} shadow-2xl shadow-slate-900/15 flex flex-col gap-2.5 transition-all animate-in slide-in-from-bottom-4 sm:slide-in-from-right-4 fade-in duration-200`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl ${theme.iconBg} flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      {toast.title}
                    </h4>
                    {toast.priority === 'urgent' && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {toast.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                title="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Bar */}
            {toast.targetTab && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                <span className="text-slate-400 font-mono text-[10px]">
                  {new Date(toast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>

                <button
                  type="button"
                  onClick={() => handleAction(toast)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer ${theme.actionBtn}`}
                >
                  <span>{toast.actionLabel || 'View Details'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
