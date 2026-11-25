import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, CheckCircle2, RefreshCw, AlertTriangle, X } from 'lucide-react';

interface EmailVerificationBannerProps {
  onOpenChangeEmail?: () => void;
}

export const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  onOpenChangeEmail,
}) => {
  const { currentUser, sendVerificationEmail, checkEmailVerifiedStatus } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Don't show if no user, or user already verified, or user still has fake local email
  if (
    !currentUser ||
    currentUser.emailVerified ||
    !currentUser.email ||
    currentUser.email.endsWith('@eduledger.local') ||
    isDismissed
  ) {
    return null;
  }

  const handleResend = async () => {
    if (cooldown > 0) return;
    setIsSending(true);
    setNotice(null);
    try {
      const res = await sendVerificationEmail();
      if (res.success) {
        setCooldown(60);
        setNotice('Verification email resent! Check your inbox and Spam/Junk folder.');
      } else {
        setNotice(res.error || 'Failed to resend verification email.');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckVerified = async () => {
    setIsChecking(true);
    setNotice(null);
    try {
      const isVerified = await checkEmailVerifiedStatus();
      if (isVerified) {
        setNotice('Email verified successfully! All administrator security privileges are now unlocked.');
      } else {
        setNotice('Email not verified yet. Please click the link sent to your inbox, then click "I have verified".');
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 text-white px-4 py-2.5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-in fade-in">
      <div className="flex items-center gap-2.5">
        <span className="p-1.5 rounded-lg bg-black/20 text-white shrink-0">
          <Mail className="w-4 h-4" />
        </span>
        <div>
          <span className="font-bold">Verify Your Real Email:</span>{' '}
          <span className="opacity-95">
            A confirmation link was sent to{' '}
            <strong className="underline decoration-white/50">{currentUser.email}</strong>.
            Required for account recovery and sensitive school settings.
          </span>
          {notice && (
            <p className="text-[11px] font-semibold text-amber-100 mt-0.5">
              {notice}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={isSending || cooldown > 0}
          onClick={handleResend}
          className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
        >
          {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend Email'}
        </button>

        <button
          type="button"
          disabled={isChecking}
          onClick={handleCheckVerified}
          className="px-3 py-1 rounded-lg bg-white text-amber-900 hover:bg-amber-50 font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          <span>I Have Verified</span>
        </button>

        {onOpenChangeEmail && (
          <button
            type="button"
            onClick={onOpenChangeEmail}
            className="text-amber-100 hover:text-white underline text-[11px] font-semibold cursor-pointer ml-1"
          >
            Change Email
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer ml-1"
          title="Dismiss for this session"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
