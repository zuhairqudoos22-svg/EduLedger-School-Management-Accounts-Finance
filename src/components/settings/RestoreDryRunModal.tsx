import React, { useState } from 'react';
import {
  RestoreDryRunResult,
  DryRunValidationIssue,
  EntityImpactDelta,
} from '../../utils/restoreDryRunService';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Database,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  Upload,
  X,
  Layers,
  Sparkles,
  Info,
  Calendar,
  Building,
  DollarSign,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

interface RestoreDryRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmRestore: (adminPassword: string) => Promise<void>;
  dryRunResult: RestoreDryRunResult | null;
  fileName: string;
  isRestoring: boolean;
}

export const RestoreDryRunModal: React.FC<RestoreDryRunModalProps> = ({
  isOpen,
  onClose,
  onConfirmRestore,
  dryRunResult,
  fileName,
  isRestoring,
}) => {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'impact' | 'settings'>('diagnostics');
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen || !dryRunResult) return null;

  const {
    isValid,
    hasBlockingErrors,
    canProceed,
    settingsComparison,
    issues,
    passedChecks,
    impactDeltas,
    backupMetadata,
    totalIncomingRecords,
  } = dryRunResult;

  const blockingIssues = issues.filter((i) => i.severity === 'blocking');
  const warningIssues = issues.filter((i) => i.severity === 'warning');
  const infoIssues = issues.filter((i) => i.severity === 'info');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canProceed) return;

    if (!adminPassword || adminPassword.trim().length === 0) {
      setPasswordError('Please enter your administrator password to authorize the database restore.');
      return;
    }

    setPasswordError('');
    try {
      await onConfirmRestore(adminPassword.trim());
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Database restoration authorization failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl border ${
                hasBlockingErrors
                  ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/60 dark:border-rose-900 dark:text-rose-400'
                  : warningIssues.length > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/60 dark:border-amber-900 dark:text-amber-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/60 dark:border-emerald-900 dark:text-emerald-400'
              }`}
            >
              {hasBlockingErrors ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <FileCheck className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Restore Dry-Run Simulation
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    hasBlockingErrors
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200'
                      : warningIssues.length > 0
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200'
                  }`}
                >
                  {hasBlockingErrors
                    ? 'Schema Conflicts Detected'
                    : warningIssues.length > 0
                    ? 'Passed with Advisories'
                    : '100% Compatible & Safe'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pre-flight simulation for <code className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{fileName}</code> ({totalIncomingRecords} records)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs Strip */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-100 dark:border-slate-800 shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Schema Diagnostics</span>
            {hasBlockingErrors && (
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            )}
            {!hasBlockingErrors && warningIssues.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('impact')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'impact'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Database Impact (Diff)</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {impactDeltas.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Institution &amp; Settings</span>
            {!settingsComparison.nameMatch && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: DIAGNOSTICS & CONFLICTS */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              {/* Simulation Status Hero Box */}
              <div
                className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                  hasBlockingErrors
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                    : warningIssues.length > 0
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                {hasBlockingErrors ? (
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                ) : warningIssues.length > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <h4 className="font-bold text-sm">
                    {hasBlockingErrors
                      ? 'Database Restore Blocked by Conflicts'
                      : warningIssues.length > 0
                      ? 'Simulation Passed with Advisories'
                      : 'Simulation Succeeded: 100% Schema Compatible'}
                  </h4>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {hasBlockingErrors
                      ? 'Fatal data conflicts or corrupted records were detected. To protect your current school records, restoration cannot proceed until resolved.'
                      : warningIssues.length > 0
                      ? 'The backup is structurally valid and can be applied safely. Review the non-blocking advisories below before confirming.'
                      : 'All required entity tables, primary keys, non-negative monetary constraints, and administrator continuity checks have passed.'}
                  </p>
                </div>
              </div>

              {/* Blocking Errors */}
              {blockingIssues.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Blocking Schema Conflicts ({blockingIssues.length})</span>
                  </span>
                  <div className="space-y-2">
                    {blockingIssues.map((issue) => (
                      <div
                        key={issue.code}
                        className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs space-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-rose-900 dark:text-rose-200">
                            {issue.title}
                          </span>
                          {issue.entityType && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold">
                              {issue.entityType}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-rose-700 dark:text-rose-300">
                          {issue.details}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning Issues */}
              {warningIssues.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Non-Blocking Advisories ({warningIssues.length})</span>
                  </span>
                  <div className="space-y-2">
                    {warningIssues.map((issue) => (
                      <div
                        key={issue.code}
                        className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-xs space-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-900 dark:text-amber-200">
                            {issue.title}
                          </span>
                          {issue.entityType && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold">
                              {issue.entityType}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                          {issue.details}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Passed Checks */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Validated Integrity Checks ({passedChecks.length})</span>
                </span>
                <div className="space-y-1.5 text-xs">
                  {passedChecks.map((chk) => (
                    <div
                      key={chk.title}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {chk.title}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {chk.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DATABASE IMPACT DIFF TABLE */}
          {activeTab === 'impact' && (
            <div className="space-y-4 text-xs">
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                Simulated row-by-row count comparison between your <strong>Active School Database</strong> and the <strong>Incoming Backup Snapshot</strong>:
              </p>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3.5">Entity Store</th>
                      <th className="py-2.5 px-3 text-right">Active</th>
                      <th className="py-2.5 px-3 text-right">Backup</th>
                      <th className="py-2.5 px-3 text-right">Net Change</th>
                      <th className="py-2.5 px-3.5 text-right">Overwrites</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {impactDeltas.map((delta) => (
                      <tr
                        key={delta.entityName}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-mono text-[11px]"
                      >
                        <td className="py-2 px-3.5 font-sans font-bold text-slate-800 dark:text-slate-200">
                          {delta.entityName}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">
                          {delta.currentCount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {delta.incomingCount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span
                            className={`font-bold ${
                              delta.netChange > 0
                                ? 'text-emerald-600'
                                : delta.netChange < 0
                                ? 'text-rose-600'
                                : 'text-slate-400'
                            }`}
                          >
                            {delta.netChange > 0 ? `+${delta.netChange}` : delta.netChange}
                          </span>
                        </td>
                        <td className="py-2 px-3.5 text-right text-slate-500">
                          {delta.overwrittenCount > 0 ? (
                            <span className="text-amber-600 font-bold">
                              {delta.overwrittenCount} records
                            </span>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: INSTITUTION & SETTINGS COMPARISON */}
          {activeTab === 'settings' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Configuration Comparison
                </span>

                <div className="space-y-2">
                  {/* School Name */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-indigo-500" />
                      <span className="text-slate-500">School Name:</span>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-right">
                      <span className="text-slate-500">
                        {settingsComparison.currentSchoolName}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-indigo-600 dark:text-indigo-400">
                        {settingsComparison.backupSchoolName}
                      </span>
                    </div>
                  </div>

                  {/* Currency */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                      <span className="text-slate-500">Currency Code:</span>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-right font-mono">
                      <span className="text-slate-500">
                        {settingsComparison.currentCurrency}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {settingsComparison.backupCurrency}
                      </span>
                    </div>
                  </div>

                  {/* Academic Year */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <span className="text-slate-500">Academic Year:</span>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-right font-mono">
                      <span className="text-slate-500">
                        {settingsComparison.currentYear || 'Default'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-purple-600 dark:text-purple-400">
                        {settingsComparison.backupYear || 'Unchanged'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Safety Snapshot Guarantee */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Rollback Guarantee:</strong> Before overwriting any record, EduLedger will automatically generate and store a complete safety snapshot in your local IndexedDB vault. If you ever need to revert, you can roll back instantly.
                </p>
              </div>
            </div>
          )}

          {/* Admin Password Confirmation */}
          {canProceed && (
            <form onSubmit={handleSubmit} className="pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Authorize Database Restore (Admin Password Required) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setPasswordError('');
                    }}
                    placeholder="Enter your administrator password to authorize overwrite..."
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    {passwordError}
                  </p>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canProceed || isRestoring}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              hasBlockingErrors
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
            }`}
          >
            {isRestoring ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Restoring Active Database...</span>
              </>
            ) : hasBlockingErrors ? (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>Restore Blocked by Schema Conflicts</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Confirm &amp; Execute Database Restore</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
