import React, { useState, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import {
  ClearableDataModule,
  DataManagementActionType,
  SchoolDataSummary,
  DeviceInfoSummary,
} from '../../types';
import { DataResetConfirmationModal } from '../common/DataResetConfirmationModal';
import {
  ShieldAlert,
  Trash2,
  RotateCcw,
  GraduationCap,
  Users,
  CalendarCheck,
  Receipt,
  Layers,
  DollarSign,
  BookOpen,
  Award,
  Briefcase,
  Clock,
  Building2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  Sliders,
  Laptop,
  ShieldCheck,
} from 'lucide-react';
import { getSchoolDataSummaryDB } from '../../db/indexedDB';
import { getDeviceStorageEstimate } from '../../services/dataManagementService';
import { verifyDataIntegrity } from '../../utils/dashboardMetricsSelector';

export const DataPurgeResetSection: React.FC = () => {
  const { settings, students, staff, feePayments, expenses, feeStructures } = useSchool();
  const { currentUser, isMainAdmin, isAdmin } = useAuth();

  // Active modal
  const [activeAction, setActiveAction] = useState<DataManagementActionType | null>(null);

  // Data Integrity Audit State
  const [integrityAudit, setIntegrityAudit] = useState<{ passedAll: boolean; results: any[] } | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState(false);

  // Selected modules for Action 2: Clear Selected Modules
  const [selectedModulesToClear, setSelectedModulesToClear] = useState<ClearableDataModule[]>([
    'students',
    'attendance',
  ]);

  // Data Summary & Device Storage State
  const [summary, setSummary] = useState<SchoolDataSummary | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfoSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  const fetchSummaryAndDevice = async () => {
    setIsLoadingSummary(true);
    try {
      const [sum, dev] = await Promise.all([
        getSchoolDataSummaryDB(),
        getDeviceStorageEstimate(settings?.schoolName || 'EduLedger School'),
      ]);
      setSummary(sum);
      setDeviceInfo(dev);
    } catch (err) {
      console.warn('Error loading summary:', err);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummaryAndDevice();
  }, [settings?.schoolName]);

  const canManageAll = isMainAdmin || isAdmin || currentUser?.role === 'admin';

  const selectableModulesList: {
    key: ClearableDataModule;
    title: string;
    description: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { key: 'students', title: 'Students & Admissions', description: 'Student directory and profile details', icon: GraduationCap },
    { key: 'staff', title: 'Staff & Faculty', description: 'Faculty profiles and leaves', icon: Users },
    { key: 'attendance', title: 'Student & Staff Attendance', description: 'Daily attendance logs', icon: CalendarCheck },
    { key: 'feeCollections', title: 'Fee Payments & Structures', description: 'Student fee vouchers and fee schedules', icon: Receipt },
    { key: 'expenses', title: 'Expenses & Ledger', description: 'Accounts expense vouchers and thresholds', icon: DollarSign },
    { key: 'payroll', title: 'Payroll & HR', description: 'Monthly runs, salary slips, loans, advances', icon: Briefcase },
    { key: 'exams', title: 'Exams & Results', description: 'Exam papers, grades, student report cards', icon: Award },
    { key: 'timetable', title: 'Timetable Schedules', description: 'Class and teacher weekly schedules', icon: Clock },
    { key: 'certificates', title: 'Issued Certificates', description: 'SLC and achievement certificates', icon: Award },
    { key: 'books', title: 'Bookshop Inventory', description: 'Book items and sales receipts', icon: BookOpen },
    { key: 'assets', title: 'Assets & Equipment', description: 'Campus physical assets', icon: Building2 },
    { key: 'logs', title: 'Audit & Activity Logs', description: 'Activity trails and security logs', icon: Clock },
  ];

  const toggleModuleSelection = (key: ClearableDataModule) => {
    setSelectedModulesToClear(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            <span>Data Management: Clear &amp; Reset</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Safely remove demo data, purge individual department modules, reset financial records, or factory reset your school database for a fresh start.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSummaryAndDevice}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSummary ? 'animate-spin' : ''}`} />
          <span>Refresh Counts</span>
        </button>
      </div>

      {/* 1. DATA SUMMARY STRIP (Total, Demo vs Real) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              Institutional Database Records Summary
            </h4>
          </div>
          {summary && summary.totalDemoRecords > 0 && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>{summary.totalDemoRecords} Demo Records Loaded</span>
            </span>
          )}
        </div>

        {summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
            {[
              { label: 'Students', ...summary.students },
              { label: 'Staff', ...summary.staff },
              {
                label: 'Attendance',
                total: summary.studentAttendance.total + summary.staffAttendance.total,
                real: summary.studentAttendance.real + summary.staffAttendance.real,
                demo: summary.studentAttendance.demo + summary.staffAttendance.demo,
              },
              {
                label: 'Fees',
                total: summary.feePayments.total + summary.feeStructures.total,
                real: summary.feePayments.real + summary.feeStructures.real,
                demo: summary.feePayments.demo + summary.feeStructures.demo,
              },
              { label: 'Expenses', ...summary.expenses },
              { label: 'Payroll', ...summary.payroll },
              { label: 'Exams', ...summary.exams },
              { label: 'Books', ...summary.books },
              { label: 'Certificates', ...summary.certificates },
              { label: 'Assets', ...summary.assets },
            ].map(m => (
              <div
                key={m.label}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800/80"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                  {m.label}
                </span>
                <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {m.total}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>Real: <strong className="text-emerald-600 dark:text-emerald-400">{m.real}</strong></span>
                  <span>Demo: <strong className="text-amber-600 dark:text-amber-400">{m.demo}</strong></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            Loading database record counts...
          </div>
        )}
      </div>

      {/* 2. ABOUT THIS DEVICE INFO BOX */}
      {deviceInfo && (
        <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                About This Device &amp; Local Offline Storage
              </p>
              <p className="text-[11px] text-slate-500">
                {deviceInfo.dataSource} • {deviceInfo.appVersion}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] shrink-0">
            {deviceInfo.storageEstimate && (
              <div>
                <span className="text-slate-400 block">Storage Quota</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {deviceInfo.storageEstimate.usedMB} MB used of {deviceInfo.storageEstimate.quotaMB} MB
                </span>
              </div>
            )}
            <div>
              <span className="text-slate-400 block">Total Records</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {deviceInfo.totalRecords} records stored
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DATA INTEGRITY & AUDIT SECTION */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Data Integrity &amp; Institutional Ledger Audit
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Real Record Verification
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Cross-checks fee registers, orphan receipts, roster statuses, and discount concessions to ensure 100% accounting accuracy without mock data.
            </p>
          </div>

          <button
            type="button"
            disabled={isRunningAudit}
            onClick={() => {
              setIsRunningAudit(true);
              try {
                const audit = verifyDataIntegrity(
                  students || [],
                  staff || [],
                  feePayments || [],
                  expenses || [],
                  feeStructures || []
                );
                setIntegrityAudit(audit);
              } finally {
                setIsRunningAudit(false);
              }
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunningAudit ? 'animate-spin' : ''}`} />
            <span>{isRunningAudit ? 'Auditing Database...' : 'Run Data Integrity Check'}</span>
          </button>
        </div>

        {integrityAudit && (
          <div className="space-y-3 pt-1 animate-in fade-in">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Overall Audit Status:
              </span>
              {integrityAudit.passedAll ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>PASS: All Ledgers 100% Balanced</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>DISCREPANCY DETECTED</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {integrityAudit.results.map((check, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                    check.status === 'PASS'
                      ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-800'
                      : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800 dark:text-slate-200">{check.checkName}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{check.details}</p>
                    {check.fixSuggestion && (
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
                        Action: {check.fixSuggestion}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      check.status === 'PASS'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {check.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. THE 5 ACTIONS */}
      <div className="space-y-4">
        <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <span>Available Data Management Actions</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ACTION 1: REMOVE DEMO DATA ONLY */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-[10px] uppercase border border-amber-200 dark:border-amber-900/60">
                  Safe • Demo Only
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {summary ? `${summary.totalDemoRecords} demo records` : '0 demo records'}
                </span>
              </div>

              <div>
                <h5 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>1. Remove Demo Data</span>
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Deletes only records tagged with <span className="font-mono text-amber-600 dark:text-amber-400">isDemo: true</span>. Any real students, staff, fee receipts, or expenses created by your staff will stay completely safe and untouched.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500">
                Preview: {summary && summary.totalDemoRecords > 0 ? `This will delete ${summary.totalDemoRecords} demo records.` : 'No demo records currently present.'}
              </div>
            </div>

            <button
              type="button"
              disabled={!canManageAll || !summary || summary.totalDemoRecords === 0}
              onClick={() => setActiveAction('remove_demo')}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Demo Data</span>
            </button>
          </div>

          {/* ACTION 2: CLEAR FINANCIAL DATA */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-[10px] uppercase border border-rose-200 dark:border-rose-900/60">
                  Financial Clean Slate
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  Preserves Profiles
                </span>
              </div>

              <div>
                <h5 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-rose-500" />
                  <span>2. Clear Financial Data</span>
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Purges all fee structures, student payment vouchers, accounts expenses, ledger journals, monthly payroll runs, staff loans, advances, and budgets. Keeps student and staff directory rosters safe.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500">
                Preview: {summary ? `Clears ${summary.feePayments.total} fee vouchers, ${summary.expenses.total} expenses, and ${summary.payroll.total} payroll runs.` : 'Clears all ledger entries and payroll history, resetting accounts to 0 PKR.'}
              </div>
            </div>

            <button
              type="button"
              disabled={!canManageAll}
              onClick={() => setActiveAction('clear_financial')}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Financial Data</span>
            </button>
          </div>

          {/* ACTION 3: RESET ALL SCHOOL DATA (FACTORY RESET) */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-rose-900 via-rose-950 to-slate-900 text-white border border-rose-800/60 shadow-xl flex flex-col justify-between gap-4 md:col-span-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] uppercase border border-rose-500/30">
                  Institutional Reset • Clean Slate
                </span>
                <span className="text-xs font-mono font-bold text-rose-300">
                  {summary ? `${summary.totalRecords} total records across all tables` : 'Total Factory Reset'}
                </span>
              </div>

              <div>
                <h5 className="text-base font-black text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <span>3. Reset All School Data (Factory Reset)</span>
                </h5>
                <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">
                  Permanently deletes ALL operational school records (students, staff, finance, attendance, payroll, bookshop, exams, certificates) and returns EduLedger to an empty first-run state. Automatic backup JSON generated prior to execution.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-[11px] text-rose-200">
                Preserves the Main Administrator account unless "Delete everything including accounts" is selected in confirmation.
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                disabled={!canManageAll}
                onClick={() => setActiveAction('factory_reset')}
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset All School Data</span>
              </button>
            </div>
          </div>

          {/* ACTION 4: CLEAR SELECTED MODULES */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-4 md:col-span-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] uppercase border border-indigo-200 dark:border-indigo-900/60">
                  Selective Module Purge
                </span>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedModulesToClear.length} modules selected
                </span>
              </div>

              <div>
                <h5 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>4. Clear Selected Modules</span>
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tick the specific modules you wish to clear. Only the ticked modules will be erased. Child attendance records, payment vouchers, and results will be cleaned safely.
                </p>
              </div>

              {/* Module Checkbox Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-2">
                {selectableModulesList.map(mod => {
                  const isChecked = selectedModulesToClear.includes(mod.key);
                  return (
                    <label
                      key={mod.key}
                      className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition text-xs ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleModuleSelection(mod.key)}
                        className="mt-0.5 rounded text-indigo-600"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white block truncate">
                          {mod.title}
                        </span>
                        <span className="text-[10px] text-slate-400 line-clamp-1">
                          {mod.description}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                disabled={!canManageAll || selectedModulesToClear.length === 0}
                onClick={() => setActiveAction('clear_selected_modules')}
                className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Selected Modules ({selectedModulesToClear.length})</span>
              </button>
            </div>
          </div>

          {/* ACTION 5: CLEAR THIS DEVICE LOCAL CACHE */}
          <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 shadow-xs flex flex-col justify-between gap-4 md:col-span-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[10px] uppercase border border-blue-200 dark:border-blue-800">
                  This Device Only
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  Available to All Users
                </span>
              </div>

              <div>
                <h5 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-blue-600" />
                  <span>5. Clear This Device Local Cache</span>
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Removes only the local IndexedDB offline database, Service Worker shell cache (<span className="font-mono text-blue-600">eduledger-shell-v3</span>), and session keys on THIS computer. Cloud Firestore data remains safe and re-syncs upon login.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500">
                Recommended when handing over a public or shared computer to another faculty user.
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveAction('clear_device_cache')}
                className="py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Clear This Device Cache</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {activeAction && (
        <DataResetConfirmationModal
          isOpen={Boolean(activeAction)}
          actionType={activeAction}
          selectedModules={selectedModulesToClear}
          summary={summary}
          onClose={() => setActiveAction(null)}
          onSuccess={() => {
            fetchSummaryAndDevice();
            setActiveAction(null);
          }}
        />
      )}
    </div>
  );
};
