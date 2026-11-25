import React, { useState, useEffect, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Receipt,
  DollarSign,
  Briefcase,
  GraduationCap,
  Users,
  Layers,
  ArrowRight,
  Filter,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  performFullModuleIntegrityCalculation,
  exportIntegrityReportCSV,
  FullDataIntegrityReport,
  OrphanFinancialRecord,
} from '../../utils/dataIntegrityService';
import { payrollStorage } from '../../utils/payrollStorage';

interface DataIntegrityTabProps {
  onNavigateToDataManagement?: () => void;
}

export const DataIntegrityTab: React.FC<DataIntegrityTabProps> = ({
  onNavigateToDataManagement,
}) => {
  const {
    students,
    staff,
    feePayments,
    feeStructures,
    expenses,
    payrollRuns,
    salaryRecords,
    settings,
  } = useSchool();
  const { isMainAdmin, isAdmin, currentUser } = useAuth();

  const [report, setReport] = useState<FullDataIntegrityReport | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<
    'all' | 'fees' | 'expenses' | 'payroll' | 'students' | 'failed'
  >('all');
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Background calculation runner
  const runBackgroundCalculation = () => {
    setIsCalculating(true);
    // Allow React state update to render loader before sync calculation
    setTimeout(() => {
      try {
        const staffLoans = payrollStorage.loadLoans();
        const staffAdvances = payrollStorage.loadAdvances();

        const result = performFullModuleIntegrityCalculation({
          students: students || [],
          staff: staff || [],
          feePayments: feePayments || [],
          feeStructures: feeStructures || [],
          expenses: expenses || [],
          payrollRuns: payrollRuns || [],
          salaryRecords: salaryRecords || [],
          staffLoans,
          staffAdvances,
          settings,
        });

        setReport(result);
      } catch (err) {
        console.error('Data integrity calculation error:', err);
      } finally {
        setIsCalculating(false);
      }
    }, 50);
  };

  // Run calculation on mount and when underlying data entities change
  useEffect(() => {
    runBackgroundCalculation();
  }, [
    students?.length,
    staff?.length,
    feePayments?.length,
    feeStructures?.length,
    expenses?.length,
    payrollRuns?.length,
  ]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!report) return;
    setIsExportingCsv(true);
    try {
      const csvContent = exportIntegrityReportCSV(report, settings?.schoolName || 'EduLedger School');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `eduledger_data_integrity_audit_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export CSV failed:', err);
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Filter checks according to selected tab
  const filteredChecks = useMemo(() => {
    if (!report) return [];
    if (selectedModuleFilter === 'failed') {
      return report.checks.filter(c => c.status === 'FAIL');
    }
    if (selectedModuleFilter === 'all') {
      return report.checks;
    }
    return report.checks.filter(c => c.module === selectedModuleFilter);
  }, [report, selectedModuleFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Institutional Data Integrity &amp; Audit
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-module background cross-referencing across Fees, Expenses, Payroll, and Student Rosters.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!report || isExportingCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingCsv ? 'Exporting...' : 'Export Audit (CSV)'}</span>
          </button>

          <button
            type="button"
            onClick={runBackgroundCalculation}
            disabled={isCalculating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
            <span>{isCalculating ? 'Calculating...' : 'Re-calculate Integrity'}</span>
          </button>
        </div>
      </div>

      {/* 1. OVERALL PASS / FAIL SUMMARY BANNER */}
      {report && (
        <div
          className={`p-6 rounded-3xl border shadow-sm transition-all duration-300 ${
            report.passedAll
              ? 'bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100'
              : 'bg-gradient-to-r from-rose-50 via-white to-rose-50/40 dark:from-rose-950/40 dark:via-slate-900 dark:to-rose-950/20 border-rose-300 dark:border-rose-800/80 text-rose-950 dark:text-rose-100'
          }`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`p-3 rounded-2xl ${
                  report.passedAll
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                }`}
              >
                {report.passedAll ? (
                  <CheckCircle2 className="w-7 h-7" />
                ) : (
                  <AlertTriangle className="w-7 h-7" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      report.passedAll
                        ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    {report.passedAll ? 'OVERALL STATUS: PASS' : 'OVERALL STATUS: FAIL'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Audited in {report.calculationDurationMs}ms
                  </span>
                </div>

                <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  {report.passedAll
                    ? 'All Modules 100% Balanced & Reconciled'
                    : `${report.failedChecks} Discrepancy Found Across Modules`}
                </h4>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {report.passedAll
                    ? 'Zero orphan receipts, fee collections match expectations, and all payroll and expense vouchers balance.'
                    : 'Discrepancies or orphan records have been flagged. Review the findings and fix suggestions below.'}
                </p>
              </div>
            </div>

            {/* Score Pill */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Integrity Score
                </span>
                <span
                  className={`text-2xl font-black font-mono ${
                    report.passedAll
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {report.integrityScore}%
                </span>
              </div>

              <div className="h-10 w-px bg-slate-200 dark:border-slate-800" />

              <div className="text-left text-xs">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{report.passedChecks} Passed</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{report.failedChecks} Failed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. FOUR MODULE INTEGRITY SUMMARY CARDS */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* A. FEES MODULE */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Receipt className="w-4 h-4" />
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    report.moduleSummaries.fees.status === 'PASS'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {report.moduleSummaries.fees.status}
                </span>
              </div>

              <h4 className="text-sm font-black text-slate-900 dark:text-white mt-3">
                Fees &amp; Collections
              </h4>
              <p className="text-[11px] text-slate-500">
                Expectations vs Collections Cross-Reference
              </p>

              <div className="mt-3 space-y-1.5 text-xs">
                {report.moduleSummaries.fees.metrics.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">{m.label}:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span>{report.moduleSummaries.fees.checksCount} Checks</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {report.moduleSummaries.fees.passedCount} Passed
              </span>
            </div>
          </div>

          {/* B. EXPENSES MODULE */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                  <DollarSign className="w-4 h-4" />
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    report.moduleSummaries.expenses.status === 'PASS'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {report.moduleSummaries.expenses.status}
                </span>
              </div>

              <h4 className="text-sm font-black text-slate-900 dark:text-white mt-3">
                Operating Expenses
              </h4>
              <p className="text-[11px] text-slate-500">
                Disbursements &amp; Cashbook Ledgers
              </p>

              <div className="mt-3 space-y-1.5 text-xs">
                {report.moduleSummaries.expenses.metrics.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">{m.label}:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span>{report.moduleSummaries.expenses.checksCount} Checks</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {report.moduleSummaries.expenses.passedCount} Passed
              </span>
            </div>
          </div>

          {/* C. PAYROLL & HR MODULE */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Briefcase className="w-4 h-4" />
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    report.moduleSummaries.payroll.status === 'PASS'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {report.moduleSummaries.payroll.status}
                </span>
              </div>

              <h4 className="text-sm font-black text-slate-900 dark:text-white mt-3">
                Payroll &amp; HR
              </h4>
              <p className="text-[11px] text-slate-500">
                Salary Runs, Slips &amp; Loan Ledgers
              </p>

              <div className="mt-3 space-y-1.5 text-xs">
                {report.moduleSummaries.payroll.metrics.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">{m.label}:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span>{report.moduleSummaries.payroll.checksCount} Checks</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {report.moduleSummaries.payroll.passedCount} Passed
              </span>
            </div>
          </div>

          {/* D. STUDENTS & ROSTERS */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <GraduationCap className="w-4 h-4" />
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    report.moduleSummaries.students.status === 'PASS'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {report.moduleSummaries.students.status}
                </span>
              </div>

              <h4 className="text-sm font-black text-slate-900 dark:text-white mt-3">
                Students &amp; Rosters
              </h4>
              <p className="text-[11px] text-slate-500">
                Enrollment, Classes &amp; Policies
              </p>

              <div className="mt-3 space-y-1.5 text-xs">
                {report.moduleSummaries.students.metrics.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">{m.label}:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span>{report.moduleSummaries.students.checksCount} Checks</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {report.moduleSummaries.students.passedCount} Passed
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. ORPHAN FINANCIAL RECORDS DETECTOR & ADMIN REPORT */}
      {report && report.orphanRecords.length > 0 && (
        <div className="p-6 rounded-3xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900/60 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-rose-200 dark:border-rose-900/40">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-rose-600 text-white shadow-xs">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-base font-black text-rose-900 dark:text-rose-200">
                    Orphan Financial Records Detected ({report.orphanRecords.length})
                  </h4>
                  <p className="text-xs text-rose-700/80 dark:text-rose-300">
                    These transactions reference deleted or non-existent student or staff IDs in the database.
                  </p>
                </div>
              </div>
            </div>

            {onNavigateToDataManagement && (
              <button
                type="button"
                onClick={onNavigateToDataManagement}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <span>Go to Data Management</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Orphan Records Table */}
          <div className="overflow-x-auto rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-100/60 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 font-bold border-b border-rose-200 dark:border-rose-900/60">
                <tr>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Voucher / Ref #</th>
                  <th className="py-2.5 px-3">Recorded Name</th>
                  <th className="py-2.5 px-3">Orphaned ID</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Amount (PKR)</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100 dark:divide-rose-950/40 text-[11px]">
                {report.orphanRecords.map(o => (
                  <tr key={o.id} className="hover:bg-rose-50/50 dark:hover:bg-rose-950/20">
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded font-mono font-bold uppercase text-[9px] bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                        {o.recordType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {o.referenceNo}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                      {o.titleOrName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-rose-600 dark:text-rose-400">
                      {o.orphanedEntityId}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {o.date}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-right text-rose-600 dark:text-rose-400">
                      PKR {o.amount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                      {o.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. DETAILED CHECK-BY-CHECK AUDIT LIST */}
      {report && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Itemized Module Verification Checks ({report.checks.length})</span>
              </h4>
              <p className="text-xs text-slate-500">
                Detailed validation tests performed on institutional records and ledgers.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setSelectedModuleFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedModuleFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Checks ({report.checks.length})
              </button>

              <button
                type="button"
                onClick={() => setSelectedModuleFilter('fees')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedModuleFilter === 'fees'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Fees
              </button>

              <button
                type="button"
                onClick={() => setSelectedModuleFilter('expenses')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedModuleFilter === 'expenses'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Expenses
              </button>

              <button
                type="button"
                onClick={() => setSelectedModuleFilter('payroll')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedModuleFilter === 'payroll'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Payroll
              </button>

              <button
                type="button"
                onClick={() => setSelectedModuleFilter('students')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedModuleFilter === 'students'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Students
              </button>

              {report.failedChecks > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedModuleFilter('failed')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    selectedModuleFilter === 'failed'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Failed ({report.failedChecks})</span>
                </button>
              )}
            </div>
          </div>

          {/* List of Checks */}
          <div className="space-y-2.5">
            {filteredChecks.map(check => (
              <div
                key={check.id}
                className={`p-4 rounded-2xl border transition-all ${
                  check.status === 'PASS'
                    ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                    : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          check.status === 'PASS'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {check.status}
                      </span>

                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {check.module}
                      </span>

                      <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                        {check.name}
                      </h5>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      {check.summary}
                    </p>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {check.details}
                    </p>

                    {check.fixSuggestion && (
                      <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 pt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Fix Action: {check.fixSuggestion}</span>
                      </p>
                    )}
                  </div>

                  {check.discrepancyAmount !== undefined && check.discrepancyAmount > 0 && (
                    <div className="shrink-0 text-right p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60">
                      <span className="text-[10px] text-slate-400 block font-bold">Discrepancy</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                        PKR {check.discrepancyAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredChecks.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                No checks match the selected filter.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
