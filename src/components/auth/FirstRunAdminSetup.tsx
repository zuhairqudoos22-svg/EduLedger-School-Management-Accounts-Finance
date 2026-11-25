import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  generateRecoveryKey,
  validatePasswordRules,
  STANDARD_SECURITY_QUESTIONS,
} from '../../utils/crypto';
import { isValidRealEmail } from '../../services/firebase';
import { EduLedgerLogo } from '../common/EduLedgerLogo';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  User,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  KeyRound,
  AlertCircle,
  HelpCircle,
  Database,
  Sparkles,
  Building2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { DeveloperLogo } from '../common/DeveloperLogo';

export const FirstRunAdminSetup: React.FC = () => {
  const { createFirstAdminAccount } = useAuth();

  // Wizard Step: 1 = Admin Credentials, 2 = Data Mode Choice
  const [setupStep, setSetupStep] = useState<1 | 2>(1);

  // Admin Credentials
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('admin');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 3 Security Questions
  const [q1, setQ1] = useState(STANDARD_SECURITY_QUESTIONS[0]);
  const [a1, setA1] = useState('');
  const [q2, setQ2] = useState(STANDARD_SECURITY_QUESTIONS[1]);
  const [a2, setA2] = useState('');
  const [q3, setQ3] = useState(STANDARD_SECURITY_QUESTIONS[2]);
  const [a3, setA3] = useState('');

  // Generated Recovery Key
  const [recoveryKey] = useState<string>(() => generateRecoveryKey());
  const [copiedKey, setCopiedKey] = useState(false);
  const [downloadedKey, setDownloadedKey] = useState(false);

  // Step 2: Data Mode Choice
  const [dataChoice, setDataChoice] = useState<'empty' | 'demo'>('empty');
  const [schoolName, setSchoolName] = useState('EduLedger Model School');
  const [currencyCode, setCurrencyCode] = useState('PKR');

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passValidation = validatePasswordRules(password);

  const handleCopyRecoveryKey = async () => {
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDownloadRecoveryKey = () => {
    const textContent = `=====================================================
EDULEDGER — EMERGENCY ADMINISTRATOR RECOVERY KEY
=====================================================
Generated At: ${new Date().toLocaleString()}
Institution : ${schoolName}
Admin User  : ${username.trim().toLowerCase()}

EMERGENCY RECOVERY KEY:
${recoveryKey}

IMPORTANT SECURITY NOTICE:
Keep this key stored in a safe physical or encrypted password manager.
If you forget your password and security questions, this one-time key
allows you to regain access to your school's offline database.
=====================================================`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eduledger_recovery_key_${username.trim() || 'admin'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedKey(true);
  };

  // Validate Step 1 and proceed to Step 2
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim() || !username.trim() || !email.trim()) {
      setErrorMessage('Full name, username, and email address are required.');
      return;
    }

    if (!isValidRealEmail(email)) {
      setErrorMessage('Please enter a valid real email address (internal @eduledger.local addresses cannot be used).');
      return;
    }

    if (!passValidation.isValid) {
      setErrorMessage(passValidation.errors[0] || 'Password does not meet required security standards.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Password and Confirm Password do not match.');
      return;
    }

    if (!a1.trim() || !a2.trim() || !a3.trim()) {
      setErrorMessage('Please provide answers for all 3 security questions.');
      return;
    }

    if (q1 === q2 || q1 === q3 || q2 === q3) {
      setErrorMessage('Please pick 3 distinct security questions.');
      return;
    }

    setSetupStep(2);
  };

  // Final Step 2 submission
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const res = await createFirstAdminAccount({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        phone: phone.trim(),
        passwordPlain: password,
        securityQuestions: [
          { question: q1, answer: a1.trim() },
          { question: q2, answer: a2.trim() },
          { question: q3, answer: a3.trim() },
        ],
        recoveryKey,
        dataChoice,
        schoolName: schoolName.trim() || 'EduLedger Model School',
        currencyCode,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to initialize administrator account.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error setting up administrator.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Background radial blurs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl p-6 sm:p-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-1.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-2 shadow-lg">
            <EduLedgerLogo
              src="/icon.svg"
              alt="EduLedger Logo"
              size={48}
              className="w-12 h-12 rounded-xl object-contain"
              fallbackTextClassName="text-lg"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {setupStep === 1
              ? 'First-Run Setup: Create Main Administrator'
              : 'School Setup: Choose Data Mode'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            {setupStep === 1
              ? 'Welcome to EduLedger! No default or hardcoded password exists. Please configure your primary Master Administrator account to safeguard your school database.'
              : 'Decide how you would like to initialize your school database. You can start with a fresh clean slate or load sample data for evaluation.'}
          </p>

          {/* Step Progress Pill */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${
                setupStep === 1
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 cursor-pointer'
              }`}
              onClick={() => setupStep === 2 && setSetupStep(1)}
            >
              <span>1</span>
              <span>Admin Account</span>
            </div>
            <div className="w-6 h-0.5 bg-slate-800" />
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${
                setupStep === 2
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              <span>2</span>
              <span>Data Choice</span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: CREDENTIALS & RECOVERY */}
        {setupStep === 1 && (
          <form onSubmit={handleProceedToStep2} className="space-y-6">
            {/* Section 1: Administrator Profile Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                <span>1. Administrator Profile</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Arthur Sterling"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Username <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">@</span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="admin"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Official Email Address <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="admin@school.edu.pk"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+92 300 1234567"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Password with Policy Rules */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>2. Master Password</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter strong password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Password Rules Feedback */}
              <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {password.length >= 8 ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />}
                  <span>8+ characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(password) ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {/[A-Z]/.test(password) ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />}
                  <span>Uppercase letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${/[0-9]/.test(password) ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {/[0-9]/.test(password) ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />}
                  <span>Number (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${/[^a-zA-Z0-9]/.test(password) ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {/[^a-zA-Z0-9]/.test(password) ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />}
                  <span>Symbol (@, #, $)</span>
                </div>
              </div>
            </div>

            {/* Section 3: 3 Security Questions */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <span>3. Password Recovery: Security Questions</span>
              </h3>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={q1}
                    onChange={e => setQ1(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    {STANDARD_SECURITY_QUESTIONS.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={a1}
                    onChange={e => setA1(e.target.value)}
                    placeholder="Your answer to Question 1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={q2}
                    onChange={e => setQ2(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    {STANDARD_SECURITY_QUESTIONS.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={a2}
                    onChange={e => setA2(e.target.value)}
                    placeholder="Your answer to Question 2"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={q3}
                    onChange={e => setQ3(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    {STANDARD_SECURITY_QUESTIONS.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={a3}
                    onChange={e => setA3(e.target.value)}
                    placeholder="Your answer to Question 3"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Emergency Master Recovery Key */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <span>4. Emergency Master Recovery Key</span>
                </h3>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-0.5">
                    Generated One-Time Master Key:
                  </span>
                  <span className="font-mono text-base sm:text-lg font-black text-white tracking-widest selection:bg-emerald-500">
                    {recoveryKey}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyRecoveryKey}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadRecoveryKey}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-600/30"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadedKey ? 'Saved .txt' : 'Download .txt'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Continue to Step 2 */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
              <button
                type="submit"
                className="py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition active:scale-98 cursor-pointer flex items-center gap-2"
              >
                <span>Continue to Data Mode Selection</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: DATA INITIALIZATION CHOICE */}
        {setupStep === 2 && (
          <form onSubmit={handleFinalSubmit} className="space-y-6 animate-in fade-in duration-200">
            {/* School Details */}
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>School Identity</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    School / Institution Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                    placeholder="e.g. EduLedger Model High School"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Primary Currency Code
                  </label>
                  <select
                    value={currencyCode}
                    onChange={e => setCurrencyCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="PKR">PKR — Pakistani Rupee (Rs.)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="AED">AED — UAE Dirham (AED)</option>
                    <option value="SAR">SAR — Saudi Riyal (SAR)</option>
                    <option value="INR">INR — Indian Rupee (₹)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Mode Choices */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Choose How to Initialize EduLedger:
              </label>

              {/* Choice A: Empty Clean Slate */}
              <label
                className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition ${
                  dataChoice === 'empty'
                    ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500'
                    : 'border-slate-800 bg-slate-850 hover:bg-slate-800/80'
                }`}
              >
                <input
                  type="radio"
                  name="dataInitChoice"
                  value="empty"
                  checked={dataChoice === 'empty'}
                  onChange={() => setDataChoice('empty')}
                  className="mt-1 text-indigo-600"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-sm">
                      Start with an Empty System
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Recommended for Real Use
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Starts with a clean slate: 0 students, 0 staff, 0 fee records, and 0 payroll runs. Ideal for official school deployment so you can enter or import your school's actual records without clutter.
                  </p>
                </div>
              </label>

              {/* Choice B: Sample Demo Data */}
              <label
                className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition ${
                  dataChoice === 'demo'
                    ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500'
                    : 'border-slate-800 bg-slate-850 hover:bg-slate-800/80'
                }`}
              >
                <input
                  type="radio"
                  name="dataInitChoice"
                  value="demo"
                  checked={dataChoice === 'demo'}
                  onChange={() => setDataChoice('demo')}
                  className="mt-1 text-indigo-600"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-sm">
                      Load Sample Demo Data
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Testing &amp; Evaluation Only
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Pre-populates sample students, staff profiles, fee vouchers, and exam results so you can test features and charts. All records are tagged with <span className="font-mono text-amber-300">isDemo: true</span> and can be removed with 1 click anytime.
                  </p>
                </div>
              </label>
            </div>

            {/* Back & Submit Buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSetupStep(1)}
                className="py-3 px-4 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Credentials</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition active:scale-98 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Launching EduLedger...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Setup &amp; Launch System</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Developer Attribution */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col items-center justify-center text-center">
          <DeveloperLogo size="md" loading="eager" showCredit={true} creditVariant="developedBy" />
        </div>
      </div>
    </div>
  );
};
