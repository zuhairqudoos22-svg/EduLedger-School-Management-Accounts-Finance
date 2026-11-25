import React, { useState, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  UploadCloud,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Database,
  Users,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Info,
  Server,
  Key,
} from 'lucide-react';
import {
  getEffectiveFirebaseConfig,
  isFirebaseConfigured,
  saveFirebaseConfig,
  clearSavedFirebaseConfig,
  FirebaseWebConfig,
} from '../../firebase-config';
import { testFirestoreConnection } from '../../services/firebase';
import { migrateLocalDataToCloud } from '../../services/cloudSyncService';

export const CloudSyncSection: React.FC = () => {
  const {
    settings,
    serverSyncInfo,
    triggerServerSync,
    isServerSyncing,
    students,
    staff,
    feePayments,
    expenses,
    payrollRuns,
    books,
  } = useSchool();
  const { currentUser, isAdmin } = useAuth();

  const [config, setConfig] = useState<FirebaseWebConfig>(getEffectiveFirebaseConfig);
  const [isConfigured, setIsConfigured] = useState<boolean>(isFirebaseConfigured);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    connected: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  // Migration state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationStep, setMigrationStep] = useState('');
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    totalUploaded: number;
    error?: string;
  } | null>(null);

  // Saved banner
  const [saveBanner, setSaveBanner] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);

  useEffect(() => {
    setIsConfigured(isFirebaseConfigured());
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testFirestoreConnection();
      setTestResult(res);
    } catch (err: unknown) {
      setTestResult({
        connected: false,
        message: err instanceof Error ? err.message : 'Failed to test connection',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = () => {
    saveFirebaseConfig(config);
    setIsConfigured(isFirebaseConfigured(config));
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 4000);
    handleTestConnection();
  };

  const handleResetConfig = () => {
    clearSavedFirebaseConfig();
    const defaults = getEffectiveFirebaseConfig();
    setConfig(defaults);
    setIsConfigured(isFirebaseConfigured(defaults));
    setTestResult(null);
  };

  const handleStartMigration = async () => {
    if (!isAdmin) return;
    setIsMigrating(true);
    setMigrationProgress(5);
    setMigrationStep('Starting local data upload...');
    setMigrationResult(null);

    const schoolId = settings?.schoolName
      ? settings.schoolName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
      : 'main';

    const result = await migrateLocalDataToCloud(schoolId, (pct, text) => {
      setMigrationProgress(pct);
      setMigrationStep(text);
    });

    setMigrationResult(result);
    setIsMigrating(false);
    if (result.success) {
      triggerServerSync();
    }
  };

  const totalLocalRecords =
    students.length +
    staff.length +
    feePayments.length +
    expenses.length +
    payrollRuns.length +
    books.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Sync Status Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
          <Cloud className="w-64 h-64 text-indigo-300" />
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-indigo-800/60">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-600/40 border border-indigo-400/30">
              {isConfigured ? (
                <Cloud className="w-6 h-6 text-emerald-400" />
              ) : (
                <CloudOff className="w-6 h-6 text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black tracking-tight">
                  Multi-Device Cloud Sync
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Firebase Spark (Free Tier)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Project: {config.projectId || 'eduledger-604f4'}
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Real-time synchronization across Windows PCs, Android phones, and sub-accounts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing Link...' : 'Test Connection'}</span>
            </button>
            <button
              type="button"
              onClick={() => triggerServerSync()}
              disabled={isServerSyncing}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/30 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${isServerSyncing ? 'animate-spin' : ''}`} />
              <span>{isServerSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">
              Sync Engine
            </span>
            <span className="font-bold text-sm text-white flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {isConfigured ? 'Cloud Firestore' : 'Local Storage Only'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">
              Offline Persistence
            </span>
            <span className="font-bold text-sm text-white flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              IndexedDB Multi-Tab
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">
              Live Listeners
            </span>
            <span className="font-bold text-sm text-white flex items-center gap-1.5 mt-0.5">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              onSnapshot Active
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">
              Cost Plan
            </span>
            <span className="font-bold text-sm text-emerald-300 flex items-center gap-1 mt-0.5">
              100% Free ($0/mo)
            </span>
          </div>
        </div>

        {/* Diagnostics Output */}
        {testResult && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs border flex items-center gap-2 ${
              testResult.connected
                ? 'bg-emerald-900/40 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-900/40 border-amber-500/40 text-amber-200'
            }`}
          >
            {testResult.connected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <div className="flex-1">
              <span className="font-bold">{testResult.message}</span>
              {testResult.latencyMs !== undefined && (
                <span className="ml-2 opacity-80">
                  (Round-trip: {testResult.latencyMs}ms)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Migration Card (Admin Only) */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  First-Time Cloud Migration
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload your existing offline records from this browser to Cloud Firestore so other devices can access them.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {totalLocalRecords} Local Records Ready
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Zero-Risk Safety Guarantee:</p>
              <p className="leading-relaxed">
                Local IndexedDB data is <strong>never deleted</strong> during this migration. It safely copies students, staff, attendance, fees, expenses, and payroll to your cloud database with duplicate detection.
              </p>
            </div>
          </div>

          {/* Migration Progress Bar */}
          {isMigrating && (
            <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  {migrationStep}
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-mono">
                  {migrationProgress}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                  style={{ width: `${migrationProgress}%` }}
                />
              </div>
            </div>
          )}

          {migrationResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                migrationResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-300'
              }`}
            >
              {migrationResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>
                {migrationResult.success
                  ? `Migration successful! Uploaded ${migrationResult.totalUploaded} records to Cloud Firestore.`
                  : `Migration failed: ${migrationResult.error}`}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleStartMigration}
              disabled={isMigrating || !isConfigured}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isMigrating ? 'Migrating Records...' : 'Import Existing Local Data to Cloud'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Firebase Web Configuration Editor */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Firebase Web Credentials (Spark Free Tier)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Defined centrally in <code className="font-mono text-indigo-600 dark:text-indigo-400">firebase-config.js</code> or configured here in the browser.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {isConfigured ? '🟢 Active' : '⚪ Placeholder'}
          </span>
        </div>

        {saveBanner && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Firebase configuration saved successfully! Re-connecting to Cloud Firestore...</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              API Key (apiKey)
            </label>
            <input
              type="text"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Auth Domain (authDomain)
            </label>
            <input
              type="text"
              value={config.authDomain}
              onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
              placeholder="your-project.firebaseapp.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Project ID (projectId)
            </label>
            <input
              type="text"
              value={config.projectId}
              onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
              placeholder="your-project-id"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Storage Bucket (storageBucket)
            </label>
            <input
              type="text"
              value={config.storageBucket}
              onChange={(e) => setConfig({ ...config, storageBucket: e.target.value })}
              placeholder="your-project.appspot.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Messaging Sender ID
            </label>
            <input
              type="text"
              value={config.messagingSenderId}
              onChange={(e) => setConfig({ ...config, messagingSenderId: e.target.value })}
              placeholder="1234567890"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              App ID (appId)
            </label>
            <input
              type="text"
              value={config.appId}
              onChange={(e) => setConfig({ ...config, appId: e.target.value })}
              placeholder="1:123456:web:abcdef"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleResetConfig}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer"
          >
            Reset to Default Placeholders
          </button>
          <button
            type="button"
            onClick={handleSaveConfig}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-xs cursor-pointer active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save &amp; Connect Cloud</span>
          </button>
        </div>
      </div>

      {/* Spark Free Limits & Quota Guidelines Card (Admin Only) */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Spark Free Plan Usage Tips &amp; Daily Limits
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Guaranteed zero-cost operation within Google Firebase Spark daily quotas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Reads Limit
              </span>
              <p className="text-base font-black text-slate-900 dark:text-white">
                50,000 / day
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Optimized with local multi-tab cache and detached background listeners.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Writes Limit
              </span>
              <p className="text-base font-black text-slate-900 dark:text-white">
                20,000 / day
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Class-grouped attendance and batched writes minimize operations.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Storage Limit
              </span>
              <p className="text-base font-black text-slate-900 dark:text-white">
                1 GB Free
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Photos are compressed client-side to ~25KB thumbnails; no Cloud Storage needed.
              </p>
            </div>
          </div>

          {/* Security & Access Control Verification Checklist */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
            <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              <span>Multi-Device Security Verification Checklist (Roman Urdu / English)</span>
            </h5>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] list-disc list-inside">
              <li>
                <strong>Finance Role Isolation:</strong> Finance/Accounts sub-account payroll approve nahi kar sakta aur Users &amp; Roles manage nahi kar sakta (Rules strictly block unauthorized writes).
              </li>
              <li>
                <strong>Deactivated Account Lockdown:</strong> Deactivated user login nahi kar sakta aur Firestore se koi data read ya write nahi kar sakta.
              </li>
              <li>
                <strong>Audit Log Immutability:</strong> Security audit logs create ho saktay hain lekin kabi edit ya delete nahi ho saktay.
              </li>
              <li>
                <strong>Multi-Device Real-Time:</strong> Jab mobile phone par attendance mark ki jaye, PC dashboard par foran refresh ho jati hai (onSnapshot real-time sync).
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
