import React, { useState, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import {
  DataManagementActionType,
  ClearableDataModule,
  ResetAllDataOptions,
  SchoolDataSummary,
} from '../../types';
import {
  ShieldAlert,
  AlertTriangle,
  Download,
  Lock,
  Trash2,
  RotateCcw,
  CheckCircle2,
  X,
  HardDrive,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  executeRemoveDemoData,
  executeClearSelectedModules,
  executeClearFinancialData,
  executeFactoryReset,
  executeClearThisDeviceCache,
  executeResetAnnualBudgetAndPayroll,
} from '../../services/dataManagementService';
import { hashString } from '../../utils/crypto';
import { exportFullDatabaseJson, getSchoolDataSummaryDB } from '../../db/indexedDB';
import { downloadJsonFile, createAndSaveSnapshot, enforceSnapshotRetention } from '../../utils/autoBackupService';

export interface DataResetConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType?: DataManagementActionType;
  targetModule?: ClearableDataModule | string;
  selectedModules?: ClearableDataModule[];
  summary?: SchoolDataSummary | null;
  onSuccess?: () => void;
}

export const DataResetConfirmationModal: React.FC<DataResetConfirmationModalProps> = ({
  isOpen,
  onClose,
  actionType,
  targetModule,
  selectedModules = [],
  summary: propSummary,
  onSuccess,
}) => {
  const {
    settings,
    updateSettings,
    backupDatabase,
    logActivity,
  } = useSchool();
  const { currentUser, isMainAdmin, isAdmin, logout, reVerifyCurrentPassword } = useAuth();

  // Determine effective action
  const effectiveActionType: DataManagementActionType =
    actionType ||
    (targetModule === 'all'
      ? 'factory_reset'
      : targetModule
      ? 'clear_selected_modules'
      : 'factory_reset');

  const effectiveSelectedModules: ClearableDataModule[] =
    selectedModules && selectedModules.length > 0
      ? selectedModules
      : targetModule && targetModule !== 'all'
      ? [targetModule as ClearableDataModule]
      : [];

  // Summary state for exact record counts preview
  const [liveSummary, setLiveSummary] = useState<SchoolDataSummary | null>(propSummary || null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(!propSummary);
  const [autoBackupGenerated, setAutoBackupGenerated] = useState(false);

  useEffect(() => {
    if (propSummary) {
      setLiveSummary(propSummary);
      setIsLoadingSummary(false);
    }
  }, [propSummary]);

  useEffect(() => {
    if (isOpen) {
      getSchoolDataSummaryDB()
        .then(s => {
          setLiveSummary(s);
          setIsLoadingSummary(false);
        })
        .catch(err => {
          console.warn('Failed to fetch summary in modal:', err);
          setIsLoadingSummary(false);
        });
    }
  }, [isOpen]);

  // Step 1: Backup state
  const [hasDownloadedBackup, setHasDownloadedBackup] = useState(false);
  const [noBackupCheckbox, setNoBackupCheckbox] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);

  // Step 2: Password confirmation
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Step 3: Confirmation phrase
  const [confirmPhraseInput, setConfirmPhraseInput] = useState('');

  // Factory reset options
  const [deleteEverythingIncludingAccounts, setDeleteEverythingIncludingAccounts] = useState(false);

  // 5-second countdown for factory reset
  const [countdown, setCountdown] = useState(5);
  const [countdownActive, setCountdownActive] = useState(false);

  // Execution & Progress State
  const [isExecuting, setIsExecuting] = useState(false);
  const [progressState, setProgressState] = useState<{
    step: string;
    percent: number;
    current: number;
    total: number;
  }>({
    step: 'Idle',
    percent: 0,
    current: 0,
    total: 100,
  });
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executionDone, setExecutionDone] = useState(false);

  // Target confirmation phrase
  const expectedPhrase = (() => {
    switch (effectiveActionType) {
      case 'remove_demo':
        return 'REMOVE DEMO';
      case 'clear_selected':
      case 'clear_selected_modules':
      case 'module_purge':
        return 'CLEAR MODULES';
      case 'clear_financial':
        return 'CLEAR FINANCE';
      case 'factory_reset':
        return 'RESET SCHOOL';
      case 'reset_annual_budget':
        return 'RESET';
      case 'clear_device_cache':
        return 'CLEAR CACHE';
      default:
        return 'DELETE';
    }
  })();

  // Trigger 5-second countdown when factory reset phrase matches
  useEffect(() => {
    if (effectiveActionType === 'factory_reset') {
      if (confirmPhraseInput.trim().toUpperCase() === expectedPhrase) {
        setCountdown(5);
        setCountdownActive(true);
      } else {
        setCountdownActive(false);
        setCountdown(5);
      }
    }
  }, [confirmPhraseInput, effectiveActionType, expectedPhrase]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdownActive && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [countdownActive, countdown]);

  if (!isOpen) return null;

  // Authorization check
  const isActionAllowed =
    effectiveActionType === 'clear_device_cache'
      ? !!currentUser // All logged-in users can clear device cache
      : isMainAdmin || isAdmin || currentUser?.role === 'admin';

  const isBackupSatisfied = true; // Automatic backup generator executes right before any deletion commences
  const isPhraseMatched = confirmPhraseInput.trim().toUpperCase() === expectedPhrase;
  const isCountdownFinished = effectiveActionType !== 'factory_reset' || countdown === 0;

  const handleDownloadBackupFile = async () => {
    setIsExportingBackup(true);
    try {
      await backupDatabase();
      setHasDownloadedBackup(true);
    } catch (err) {
      console.error('Backup failed:', err);
      alert('Could not generate backup file.');
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleExecuteAction = async () => {
    setPasswordError('');
    setExecutionError(null);

    // Verify Password if not clearing device cache
    if (effectiveActionType !== 'clear_device_cache') {
      if (!passwordInput.trim()) {
        setPasswordError('Please enter your administrator account password.');
        return;
      }
      let isValid = false;
      if (reVerifyCurrentPassword) {
        isValid = await reVerifyCurrentPassword(passwordInput.trim());
      }
      if (!isValid && currentUser?.passwordHash) {
        const hashed = await hashString(passwordInput.trim());
        isValid = hashed === currentUser.passwordHash;
      }
      if (!isValid) {
        setPasswordError('Incorrect administrator password. Authentication failed.');
        return;
      }
    }

    setIsExecuting(true);
    setProgressState({ step: 'Initializing procedure...', percent: 5, current: 1, total: 100 });

    try {
      const schoolId = settings?.schoolId || 'main';

      // 1. Mandatory Automatic Backup JSON Generator before ANY deletion takes place
      if (effectiveActionType !== 'clear_device_cache') {
        setProgressState({
          step: 'Step 1/3: Automatically generating safeguard backup JSON file...',
          percent: 15,
          current: 15,
          total: 100,
        });

        try {
          const backupJson = await exportFullDatabaseJson();
          const safeSchoolName = (settings?.schoolName || 'EduLedger')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .toLowerCase();
          const now = new Date();
          const dateStr = now.toISOString().slice(0, 10);
          const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
          const autoBackupFilename = `eduledger_pre_purge_safeguard_${safeSchoolName}_${dateStr}_${timeStr}.json`;

          downloadJsonFile(backupJson, autoBackupFilename, settings?.schoolName);

          try {
            await createAndSaveSnapshot(
              'pre_restore_safety',
              `Auto Pre-Purge Safeguard (${effectiveActionType})`,
              `Automatic safety backup captured before executing ${effectiveActionType} operation on ${now.toLocaleString()}`
            );
            await enforceSnapshotRetention(10);
          } catch (vaultErr) {
            console.warn('Vault snapshot warning:', vaultErr);
          }

          setHasDownloadedBackup(true);
          setAutoBackupGenerated(true);
        } catch (backupErr) {
          console.error('Pre-purge auto backup error:', backupErr);
        }
      }

      if (effectiveActionType === 'remove_demo') {
        setProgressState({ step: 'Step 2/3: Scanning and deleting demo records...', percent: 45, current: 45, total: 100 });
        const res = await executeRemoveDemoData(schoolId, p => setProgressState(p));

        await logActivity({
          userName: currentUser?.fullName || 'Administrator',
          userRole: currentUser?.role || 'admin',
          category: 'system_action',
          severity: 'warning',
          action: 'Remove Demo Data',
          details: `Removed demo dataset (${res.totalDeleted} total items).`,
        });

        // Update settings isDemoActive to false
        await updateSettings({ ...settings, isDemoActive: false });
      } else if (
        effectiveActionType === 'clear_selected_modules' ||
        effectiveActionType === 'clear_selected' ||
        effectiveActionType === 'module_purge'
      ) {
        setProgressState({ step: 'Clearing selected modules...', percent: 35, current: 35, total: 100 });
        const res = await executeClearSelectedModules(
          schoolId,
          effectiveSelectedModules,
          p => setProgressState(p)
        );

        await logActivity({
          userName: currentUser?.fullName || 'Administrator',
          userRole: currentUser?.role || 'admin',
          category: 'system_action',
          severity: 'warning',
          action: 'Clear Selected Modules',
          details: `Cleared modules: ${effectiveSelectedModules.join(', ')} (${res.totalDeleted} records).`,
        });
      } else if (effectiveActionType === 'clear_financial') {
        setProgressState({ step: 'Purging financial & payroll records...', percent: 35, current: 35, total: 100 });
        const res = await executeClearFinancialData(schoolId, p => setProgressState(p));

        await logActivity({
          userName: currentUser?.fullName || 'Administrator',
          userRole: currentUser?.role || 'admin',
          category: 'system_action',
          severity: 'warning',
          action: 'Clear Financial Data',
          details: `Purged financial & payroll records: ${res.totalDeleted} records.`,
        });
      } else if (effectiveActionType === 'factory_reset') {
        setProgressState({ step: 'Executing full institutional reset...', percent: 25, current: 25, total: 100 });
        const options: ResetAllDataOptions = {
          keepAdminAccount: !deleteEverythingIncludingAccounts,
          deleteEverythingIncludingAccounts,
          newSchoolName: settings?.schoolName || 'My School',
          newSchoolTagline: 'Excellence in Education',
          newCurrency: settings?.currencyCode || 'PKR',
          downloadBackupFirst: false,
        };

        await executeFactoryReset(schoolId, options, p => setProgressState(p));

        if (deleteEverythingIncludingAccounts) {
          setProgressState({ step: 'Signing out all users and accounts...', percent: 95, current: 95, total: 100 });
          await logout();
          window.location.reload();
          return;
        }
      } else if (effectiveActionType === 'reset_annual_budget') {
        setProgressState({ step: 'Purging payroll expense runs and projections...', percent: 35, current: 35, total: 100 });
        const res = await executeResetAnnualBudgetAndPayroll(schoolId, p => setProgressState(p));

        const updatedPayrollSettings = {
          ...(settings?.payrollSettings || {
            workingDaysPerMonth: 26,
            overtimeHourlyRate: 250,
            maxLoanSalaryMultiplier: 5,
            allowMultipleActiveLoans: false,
            maxAdvanceSalaryPercent: 50,
            providentFundPercent: 5,
            taxBrackets: [],
            allowanceTypes: [],
            deductionTypes: [],
          }),
          customAnnualBudget: 0,
          projectionMode: 'zero' as const,
        };
        await updateSettings({
          ...settings,
          payrollSettings: updatedPayrollSettings,
        });

        await logActivity({
          userName: currentUser?.fullName || 'Main Admin',
          userRole: currentUser?.role || 'admin',
          category: 'system_action',
          severity: 'warning',
          action: 'Reset Annual Budget',
          details: `Cleared projected vs. actual payroll expense runs and reset annual budget to 0 PKR (${res.totalDeleted} records cleared).`,
        });
      } else if (effectiveActionType === 'clear_device_cache') {
        await executeClearThisDeviceCache(p => setProgressState(p));
        return;
      }

      setProgressState({ step: 'Operation completed successfully!', percent: 100, current: 100, total: 100 });
      setExecutionDone(true);

      setTimeout(() => {
        setIsExecuting(false);
        onSuccess?.();
        onClose();
        window.location.reload();
      }, 1400);
    } catch (err) {
      console.error('Data reset error:', err);
      setIsExecuting(false);
      setExecutionError(err instanceof Error ? err.message : 'An error occurred during execution.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200 block">
                Safety Confirmation
              </span>
              <h3 className="text-base font-black">
                {effectiveActionType === 'remove_demo' && 'Remove Demo Data Only'}
                {(effectiveActionType === 'clear_selected_modules' || effectiveActionType === 'clear_selected' || effectiveActionType === 'module_purge') &&
                  'Clear Selected Modules'}
                {effectiveActionType === 'clear_financial' && 'Clear Financial Data Only'}
                {effectiveActionType === 'reset_annual_budget' && 'Reset Annual Budget & Payroll Projections'}
                {effectiveActionType === 'factory_reset' && 'Factory Reset Entire School Data'}
                {effectiveActionType === 'clear_device_cache' && 'Clear This Device Local Cache'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {!isActionAllowed && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Permission Denied: Only the Main Administrator has authority to execute this data management action.</span>
            </div>
          )}

          {executionError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 font-bold">
              {executionError}
            </div>
          )}

          {executionDone && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Action completed successfully! Updating application state...</span>
            </div>
          )}

          {/* Description & Impact Preview */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2">
            <h4 className="font-bold flex items-center gap-1.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Permanent Data Deletion Notice</span>
            </h4>
            <p className="text-[11px] leading-relaxed">
              {effectiveActionType === 'remove_demo' &&
                'This will delete all records tagged with "isDemo: true" (sample students, staff, attendance, and fee vouchers). Real records created by you will remain intact.'}
              {(effectiveActionType === 'clear_selected_modules' || effectiveActionType === 'clear_selected' || effectiveActionType === 'module_purge') &&
                `This will delete records in: ${effectiveSelectedModules.join(', ')}. All child attendance, payment, and examination records for these modules will also be purged.`}
              {effectiveActionType === 'clear_financial' &&
                'This will delete all fee structures, student payment vouchers, accounts expenses, payroll disbursements, staff loans, and budgets. Student and staff directory profiles will remain safe.'}
              {effectiveActionType === 'reset_annual_budget' &&
                'This will clear existing projected vs. actual payroll expense data, including all historical payroll runs, salary records, employee loans, and advances, and reset the Annual FY Budget to 0 PKR. Departmental spending limits will remain intact.'}
              {effectiveActionType === 'factory_reset' &&
                'This will permanently delete ALL school records (students, staff, attendance, finances, payroll, exams, assets, books, certificates). System returns to clean blank state.'}
              {effectiveActionType === 'clear_device_cache' &&
                'This will wipe the local IndexedDB and Service Worker caches on THIS computer/browser only. Cloud Firestore data stays safe and will re-sync after next login.'}
            </p>
          </div>

          {/* Exact Record Counts Breakdown */}
          {liveSummary && effectiveActionType !== 'clear_device_cache' && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700/60">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <HardDrive className="w-4 h-4 text-rose-600" />
                  <span>Exact Record Counts to be Affected:</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  {effectiveActionType === 'remove_demo' && `${liveSummary.totalDemoRecords} Demo Records`}
                  {effectiveActionType === 'clear_financial' && `${liveSummary.feePayments.total + liveSummary.feeStructures.total + liveSummary.expenses.total + liveSummary.payroll.total} Financial Records`}
                  {effectiveActionType === 'factory_reset' && `${liveSummary.totalRecords} Institutional Records`}
                  {(effectiveActionType === 'clear_selected_modules' || effectiveActionType === 'clear_selected' || effectiveActionType === 'module_purge') && 'Selected Module Records'}
                  {effectiveActionType === 'reset_annual_budget' && `${liveSummary.payroll.total} Payroll Runs & Slips`}
                </span>
              </div>

              {/* Exact Breakdown by Category */}
              {effectiveActionType === 'remove_demo' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Students</span>
                      <strong className="text-amber-600 dark:text-amber-400 font-mono text-sm">{liveSummary.students.demo}</strong>
                      <span className="text-slate-400 text-[10px] block">of {liveSummary.students.total} total</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Faculty &amp; Staff</span>
                      <strong className="text-amber-600 dark:text-amber-400 font-mono text-sm">{liveSummary.staff.demo}</strong>
                      <span className="text-slate-400 text-[10px] block">of {liveSummary.staff.total} total</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Attendance</span>
                      <strong className="text-amber-600 dark:text-amber-400 font-mono text-sm">{liveSummary.studentAttendance.demo + liveSummary.staffAttendance.demo}</strong>
                      <span className="text-slate-400 text-[10px] block">demo roll-calls</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Fee Vouchers</span>
                      <strong className="text-amber-600 dark:text-amber-400 font-mono text-sm">{liveSummary.feePayments.demo}</strong>
                      <span className="text-slate-400 text-[10px] block">demo payments</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Expenses</span>
                      <strong className="text-amber-600 dark:text-amber-400 font-mono text-sm">{liveSummary.expenses.demo}</strong>
                      <span className="text-slate-400 text-[10px] block">demo vouchers</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Payroll Runs</span>
                      <strong className="text-amber-600 dark:text-amber-400 font-mono text-sm">{liveSummary.payroll.demo}</strong>
                      <span className="text-slate-400 text-[10px] block">demo salary slips</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Real user records ({liveSummary.totalRealRecords} total) will remain 100% safe and untouched.</span>
                  </p>
                </div>
              )}

              {effectiveActionType === 'clear_financial' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Fee Collections</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">{liveSummary.feePayments.total}</strong>
                      <span className="text-slate-400 text-[10px] block">vouchers deleted</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Fee Policies</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">{liveSummary.feeStructures.total}</strong>
                      <span className="text-slate-400 text-[10px] block">class structures</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Expenses</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">{liveSummary.expenses.total}</strong>
                      <span className="text-slate-400 text-[10px] block">expense vouchers</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Payroll Runs</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">{liveSummary.payroll.total}</strong>
                      <span className="text-slate-400 text-[10px] block">salary runs &amp; loans</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 col-span-2">
                      <span className="text-slate-400 block text-[10px] font-bold">Cashbook Ledger &amp; Budgets</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">Reset to 0 PKR</strong>
                      <span className="text-slate-400 text-[10px] block">All journal entries purged</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Rosters safe: {liveSummary.students.total} students and {liveSummary.staff.total} faculty profiles are preserved.</span>
                  </p>
                </div>
              )}

              {effectiveActionType === 'factory_reset' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Students</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">{liveSummary.students.total}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Faculty / Staff</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">{liveSummary.staff.total}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Attendance</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">{liveSummary.studentAttendance.total + liveSummary.staffAttendance.total}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Fees &amp; Payments</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">{liveSummary.feePayments.total + liveSummary.feeStructures.total}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Expenses</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">{liveSummary.expenses.total}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Payroll Runs</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">{liveSummary.payroll.total}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Exams &amp; Marks</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">{liveSummary.exams.total}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Books &amp; Assets</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">{liveSummary.books.total + liveSummary.assets.total}</strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 pt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>All {liveSummary.totalRecords} records across 12 database stores will be permanently wiped.</span>
                  </p>
                </div>
              )}

              {(effectiveActionType === 'clear_selected_modules' || effectiveActionType === 'clear_selected' || effectiveActionType === 'module_purge') && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    {effectiveSelectedModules.map(modKey => {
                      const countObj = (liveSummary as any)[modKey] || { total: 0 };
                      return (
                        <div key={modKey} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                          <span className="text-slate-400 block text-[10px] font-bold capitalize">{modKey}</span>
                          <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-sm">{countObj.total ?? 0}</strong>
                          <span className="text-slate-400 text-[10px] block">records to clear</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {effectiveActionType === 'reset_annual_budget' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">Historical Payroll Runs</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">{liveSummary.payroll.total}</strong>
                      <span className="text-slate-400 text-[10px] block">records will be deleted</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-bold">FY Annual Budget</span>
                      <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">Reset to 0 PKR</strong>
                      <span className="text-slate-400 text-[10px] block">projections cleared</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mandatory Step 1: Automatic Backup Download */}
          {effectiveActionType !== 'clear_device_cache' && (
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <Download className="w-4 h-4 text-indigo-600" />
                  <span>Step 1: Automatic Safeguard Backup Generator</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Auto-Generator Armed
                </span>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                To guarantee zero accidental data loss, a complete JSON database backup file (<span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">eduledger_pre_purge_safeguard_*.json</span>) will be automatically generated and downloaded to your computer right before any deletion executes.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadBackupFile}
                  disabled={isExportingBackup}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExportingBackup ? 'Exporting...' : hasDownloadedBackup ? 'Download Another Copy' : 'Download JSON Backup Now'}</span>
                </button>

                {hasDownloadedBackup && (
                  <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Backup file saved to device
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Administrator Password Authentication */}
          {effectiveActionType !== 'clear_device_cache' && (
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-indigo-600" />
                <span>Step 2: Enter Administrator Password (Re-Authentication)</span>
              </label>
              <p className="text-[11px] text-slate-500">
                Confirm your administrator identity to authorize this destructive data management operation.
              </p>
              <input
                type="password"
                placeholder="Enter your administrator password"
                value={passwordInput}
                onChange={e => {
                  setPasswordInput(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              {passwordError && (
                <p className="text-rose-600 font-bold text-[11px] flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{passwordError}</span>
                </p>
              )}
            </div>
          )}

          {/* Optional: Factory Reset - Delete Everything Including Accounts */}
          {effectiveActionType === 'factory_reset' && (
            <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteEverythingIncludingAccounts}
                  onChange={e => setDeleteEverythingIncludingAccounts(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600"
                />
                <div>
                  <span className="font-bold text-rose-800 dark:text-rose-300">
                    Delete everything including administrator &amp; sub-accounts
                  </span>
                  <p className="text-[11px] text-rose-700/80 dark:text-rose-400 mt-0.5">
                    Signs out all active sessions and returns to the initial First-Run Setup screen. Unchecked = preserves your Main Admin login.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Step 3: Confirmation Phrase */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200 block">
              Step 3: Type <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 font-black text-rose-600">{expectedPhrase}</span> to confirm:
            </label>
            <input
              type="text"
              placeholder={`Type ${expectedPhrase}`}
              value={confirmPhraseInput}
              onChange={e => setConfirmPhraseInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Live Progress Bar during execution */}
          {isExecuting && (
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                  <span>{progressState.step}</span>
                </span>
                <span>{progressState.percent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-600 to-amber-500 transition-all duration-200"
                  style={{ width: `${progressState.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={
              !isActionAllowed ||
              !isPhraseMatched ||
              (effectiveActionType !== 'clear_device_cache' && !isBackupSatisfied) ||
              !isCountdownFinished ||
              isExecuting
            }
            onClick={handleExecuteAction}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold flex items-center gap-2 shadow-sm cursor-pointer transition active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>
              {isExecuting
                ? 'Processing...'
                : countdownActive && countdown > 0
                ? `Confirm in ${countdown}s...`
                : 'Execute Permanent Clear'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
