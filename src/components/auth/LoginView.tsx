import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { DeveloperLogo } from '../common/DeveloperLogo';
import { EduLedgerLogo } from '../common/EduLedgerLogo';
import { useTranslation } from '../../i18n';
import {
  Lock,
  User,
  ShieldCheck,
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  AlertCircle,
  LogIn,
  Sun,
  Moon,
  Database,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { isDarkMode, toggleDarkMode } = useSchool();
  const { t } = useTranslation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  // Handle countdown for locked account
  useEffect(() => {
    if (lockCountdown === null || lockCountdown <= 0) return;
    const timer = setInterval(() => {
      setLockCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setErrorMessage('');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockCountdown]);

  // Monitor CapsLock state
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setResetSuccessMessage('');

    if (!username.trim()) {
      setErrorMessage('Please enter your account username.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await login(username.trim(), password);
      if (!res.success) {
        setErrorMessage(
          res.needsEmailVerification
            ? 'Please verify your email first.'
            : res.error || 'Invalid username or password.'
        );
        if (res.lockRemainingSeconds) {
          setLockCountdown(res.lockRemainingSeconds);
        }
      }
    } catch {
      setErrorMessage('An unexpected database error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Top Mobile Bar with Software Logo & Theme Toggle */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <EduLedgerLogo
            src="/icon.svg"
            alt="EduLedger Logo"
            size={32}
            className="w-8 h-8 rounded-xl shadow-xs object-contain"
            fallbackTextClassName="text-xs"
          />
          <div>
            <span className="font-black text-sm text-slate-900 dark:text-white block leading-tight">
              EduLedger
            </span>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              <span>by</span>
              <img
                src="/assets/aistudio/NextgenAI_9f1f20ff.jpg"
                alt="NextGenAI Logo"
                className="w-3.5 h-3.5 rounded-sm object-cover ring-1 ring-slate-300 dark:ring-slate-700 shadow-xs inline-block"
              />
              <span className="font-bold text-indigo-600 dark:text-indigo-400">NextGenAI</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
          <PWAInstallButton />
        </div>
      </div>

      {/* LEFT PANE: Software Branding, Assurance & Security */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-12 text-white flex-col justify-between overflow-hidden">
        {/* Ambient lighting glows */}
        <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

        {/* Top Left Software Branding */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <EduLedgerLogo
              src="/icon.svg"
              alt="EduLedger Logo"
              size={48}
              className="w-12 h-12 rounded-2xl shadow-lg shadow-indigo-950/50 object-contain ring-2 ring-white/20 p-0.5 bg-slate-900/40"
              fallbackTextClassName="text-lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white leading-tight">
                  EduLedger
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  ERP Platform
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 font-medium">
                School Management &amp; Accounts Finance Software
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/15 transition cursor-pointer"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-300" />}
          </button>
        </div>

        {/* Hero Section */}
        <div className="relative z-10 my-auto py-12 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>High-Grade Local Cryptography Active</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-black tracking-tight leading-tight">
            Institutional Administration &amp; Financial Governance.
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            A zero-leak, offline-first portal engineered for school executives and finance officers. All credentials and institutional ledgers remain strictly on your local browser engine.
          </p>

          {/* Official Maker Card: NextGenAI */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 to-indigo-950/90 border border-white/15 backdrop-blur-md shadow-xl flex items-center gap-4">
            <img
              src="/assets/aistudio/NextgenAI_9f1f20ff.jpg"
              alt="NextGenAI Official Logo"
              className="w-13 h-13 rounded-2xl object-cover ring-2 ring-white/25 shadow-lg shadow-black/60 shrink-0"
            />
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                  Official Software Creator
                </span>
              </div>
              <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                NextGenAI
              </h3>
              <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                Empowering next-generation institutional administration and offline-first finance systems.
              </p>
            </div>
          </div>

          {/* Security feature badges */}
          <div className="grid grid-cols-1 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-white">Zero Cloud Reliance · 100% Offline</h4>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Operates completely without third-party cloud servers or paid APIs. Your data never leaves this machine.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-white">PBKDF2 SHA-256 (310,000 Iterations)</h4>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Industry-standard key derivation with unique per-user salting and brute-force protection.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info & Maker Attribution */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/NextgenAI_9f1f20ff.jpg"
              alt="NextGenAI"
              className="w-6 h-6 rounded-lg object-cover ring-1 ring-white/30 shadow-xs"
            />
            <span className="text-slate-300">
              Engineered by <strong className="text-white font-black tracking-wide">NextGenAI</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>IndexedDB Secure Engine Ready</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANE: Modern Interactive Login Card */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md space-y-6">
          {/* Card Header with Software Logo */}
          <div className="space-y-3">
            <div className="flex items-center gap-3.5">
              <EduLedgerLogo
                src="/icon.svg"
                alt="EduLedger Logo"
                size={48}
                className="w-12 h-12 rounded-2xl shadow-md object-contain shrink-0 ring-1 ring-slate-200 dark:ring-slate-800"
                fallbackTextClassName="text-lg"
              />
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
                  <KeyRound className="w-3 h-3" />
                  <span>Operator Authentication</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  Sign In to EduLedger
                </h2>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Enter your credentials to access the EduLedger school administration and financial ledger system.
            </p>
          </div>

          {/* Reset Success Message */}
          {resetSuccessMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{resetSuccessMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div className="space-y-1 flex-1">
                <p className="font-semibold">{errorMessage}</p>
                {lockCountdown !== null && lockCountdown > 0 && (
                  <p className="font-mono text-[11px] text-rose-600 dark:text-rose-400 font-bold">
                    Lockout remaining: {Math.floor(lockCountdown / 60)}m {lockCountdown % 60}s
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username / Real Email Input */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Username or Real Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  disabled={lockCountdown !== null && lockCountdown > 0}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter username or email (e.g. admin or name@school.edu.pk)"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-xs disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={lockCountdown !== null && lockCountdown > 0}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-xs disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* CapsLock Warning */}
              {capsLockActive && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 pt-1 font-semibold animate-in fade-in">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Caps Lock is ON</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || (lockCountdown !== null && lockCountdown > 0)}
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Security Protocol Compliance Notice */}
          <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Restricted Access Control</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Only authenticated <strong>Administrators</strong> and <strong>Finance &amp; Accounts</strong> personnel can log into this portal. All sessions expire upon browser close or after inactivity.
            </p>
          </div>

          {/* Developer Attribution Credit: NextGenAI */}
          <div className="pt-2">
            <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <DeveloperLogo size="md" loading="eager" showLink={true} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {t('credit.officialCreator', 'Official Developer')}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
                    {t('credit.developedBy', 'Developed by NextGenAI')}
                  </h4>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 hidden sm:inline-block">
                v2.5.0 PWA
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Reset Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        onSuccess={un => {
          setUsername(un);
          setPassword('');
          setResetSuccessMessage(`Password updated for user "${un}". You can now sign in.`);
        }}
      />
    </div>
  );
};
