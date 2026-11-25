import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

export interface BackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  hasUnsavedChanges?: boolean;
  confirmMessage?: string;
  enableEscapeKey?: boolean;
  variant?: 'default' | 'modal' | 'subtle' | 'ghost';
  ariaLabel?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label = 'Back',
  className = '',
  hasUnsavedChanges = false,
  confirmMessage = 'You have unsaved changes. Discard changes and go back?',
  enableEscapeKey = true,
  variant = 'default',
  ariaLabel,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowConfirm(true);
      return;
    }
    onClick();
  }, [hasUnsavedChanges, onClick]);

  // Support Escape key to trigger Back
  useEffect(() => {
    if (!enableEscapeKey) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableEscapeKey, handleClick]);

  // Variants styling - all ensure minimum 44px touch target on mobile
  let variantStyles =
    'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs';

  if (variant === 'modal') {
    variantStyles =
      'bg-slate-100/90 hover:bg-slate-200/90 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700';
  } else if (variant === 'subtle') {
    variantStyles =
      'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700';
  } else if (variant === 'ghost') {
    variantStyles =
      'bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs';
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={ariaLabel || label}
        className={`print:hidden inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] min-w-[44px] rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-95 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${variantStyles} ${className}`}
      >
        <ArrowLeft className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
        <span>{label}</span>
      </button>

      {showConfirm && (
        <ConfirmModal
          isOpen={showConfirm}
          title="Unsaved Changes"
          message={confirmMessage}
          confirmLabel="Discard & Go Back"
          cancelLabel="Stay Here"
          isDestructive={true}
          onConfirm={() => {
            setShowConfirm(false);
            onClick();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
};
