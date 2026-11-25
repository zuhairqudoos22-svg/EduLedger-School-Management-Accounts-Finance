import React, { useState } from 'react';
import { Staff, StaffLeaveRequest, SchoolSettings } from '../../types';
import { formatDate } from '../../utils/formatters';
import { computeStaffLeaveSummary, generateStaffLeaveBalancePdf } from '../../utils/leaveBalancePdf';
import {
  Printer,
  Download,
  X,
  Calendar,
  Building2,
  User,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mail,
  Phone,
  CalendarDays,
} from 'lucide-react';

interface EmployeeLeaveBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  leaves: StaffLeaveRequest[];
  settings: SchoolSettings;
  onAdjustQuota?: (staff: Staff) => void;
}

export const EmployeeLeaveBalanceModal: React.FC<EmployeeLeaveBalanceModalProps> = ({
  isOpen,
  onClose,
  staff,
  leaves,
  settings,
  onAdjustQuota,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen || !staff) return null;

  const { summaries, totalAllocated, totalUsed, totalRemaining } = computeStaffLeaveSummary(staff, leaves);
  const staffLeaves = leaves.filter(l => l.staffId === staff.id);
  const academicYear = settings.currentAcademicYear || '2026-2027';

  const handlePrint = () => {
    // Add print class to body for isolated print styling
    document.body.classList.add('print-mode-leave-balance');
    window.print();
    // Remove after print dialog closes
    setTimeout(() => {
      document.body.classList.remove('print-mode-leave-balance');
    }, 1000);
  };

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      generateStaffLeaveBalancePdf(staff, leaves, settings, academicYear);
    } catch (e) {
      console.error('Failed to generate leave balance PDF:', e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Action Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Leave Balance &amp; Entitlement Statement
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {staff.fullName} ({staff.employeeCode}) • Academic Session {academicYear}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs cursor-pointer transition"
              title="Print official Leave Balance statement on paper or printer"
            >
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>Take Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 cursor-pointer transition disabled:opacity-50"
              title="Save official Leave Balance Statement as PDF file"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Save as PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content: Printable Statement Sheet */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div
            id="printable-leave-balance"
            className="p-6 sm:p-8 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0"
          >
            {/* Institution Letterhead */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                    {settings.schoolName || 'EduLedger International School'}
                  </h1>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl">
                    {settings.schoolAddress || 'School Administrative Registry & Human Resources Office'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">
                    Official Personnel &amp; Faculty Leave Registry Statement
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    ACADEMIC YEAR {academicYear}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-2 font-mono">
                    Ref: LBS-{staff.employeeCode}-{new Date().getFullYear()}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Issued: {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Employee Profile Header Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6 text-xs">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee Name</p>
                <p className="font-extrabold text-sm text-slate-900 mt-0.5">{staff.fullName}</p>
                <p className="text-slate-500 font-mono mt-0.5">ID: {staff.employeeCode}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department &amp; Role</p>
                <p className="font-bold text-slate-800 mt-0.5">{staff.department}</p>
                <p className="text-slate-500 mt-0.5">{staff.designation}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact &amp; Status</p>
                <p className="text-slate-700 mt-0.5 font-mono">{staff.contactNumber}</p>
                <p className="text-slate-500 truncate">{staff.email}</p>
              </div>
            </div>

            {/* Key Metric KPI Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-center">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
                  Total Quota Granted
                </span>
                <span className="text-2xl font-black text-indigo-900 mt-1 block">
                  {totalAllocated} <span className="text-xs font-normal">Days</span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-100 text-center">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
                  Utilized / Taken
                </span>
                <span className="text-2xl font-black text-rose-900 mt-1 block">
                  {totalUsed} <span className="text-xs font-normal">Days</span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Remaining Available
                </span>
                <span className="text-2xl font-black text-emerald-900 mt-1 block">
                  {totalRemaining} <span className="text-xs font-normal">Days</span>
                </span>
              </div>
            </div>

            {/* Quota & Balances Table */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  1. Annual Leave Entitlement &amp; Quota Breakdown
                </h3>
                {onAdjustQuota && (
                  <button
                    type="button"
                    onClick={() => {
                      onAdjustQuota(staff);
                      onClose();
                    }}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Adjust Quotas
                  </button>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Leave Category</th>
                      <th className="py-2.5 px-3 text-center">Annual Quota</th>
                      <th className="py-2.5 px-3 text-center">Utilized</th>
                      <th className="py-2.5 px-3 text-center">Pending Review</th>
                      <th className="py-2.5 px-3 text-center">Available Balance</th>
                      <th className="py-2.5 px-3 text-right">Quota Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summaries.map(item => {
                      const utilPct = item.allocated > 0 ? Math.round((item.used / item.allocated) * 100) : 0;
                      return (
                        <tr key={item.type} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{item.label}</td>
                          <td className="py-2.5 px-3 text-center text-slate-700">{item.allocated} Days</td>
                          <td className="py-2.5 px-3 text-center text-rose-600 font-semibold">{item.used} Days</td>
                          <td className="py-2.5 px-3 text-center text-amber-600 font-medium">{item.pending} Days</td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                                item.remaining <= 2
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {item.remaining} Days
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    utilPct >= 90
                                      ? 'bg-rose-500'
                                      : utilPct >= 60
                                      ? 'bg-amber-500'
                                      : 'bg-indigo-500'
                                  }`}
                                  style={{ width: `${Math.min(100, utilPct)}%` }}
                                />
                              </div>
                              <span className="font-mono text-[11px] text-slate-500 w-8 text-right">{utilPct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-indigo-50/50 font-bold text-slate-900 border-t border-indigo-100">
                      <td className="py-2.5 px-3">Total Consolidated Leave</td>
                      <td className="py-2.5 px-3 text-center">{totalAllocated} Days</td>
                      <td className="py-2.5 px-3 text-center text-rose-700">{totalUsed} Days</td>
                      <td className="py-2.5 px-3 text-center text-amber-700">
                        {summaries.reduce((s, c) => s + c.pending, 0)} Days
                      </td>
                      <td className="py-2.5 px-3 text-center text-emerald-800">{totalRemaining} Days</td>
                      <td className="py-2.5 px-3 text-right">
                        {totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Leave Applications History */}
            <div className="mb-8">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-2">
                2. Leave Applications &amp; Recorded Leaves ({staffLeaves.length} Records)
              </h3>
              {staffLeaves.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  No leave requests recorded for this employee in the current session.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">From - To</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3 text-center">Duration</th>
                        <th className="py-2 px-3">Reason</th>
                        <th className="py-2 px-3 text-center">Status</th>
                        <th className="py-2 px-3">Approver / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staffLeaves.map(leave => (
                        <tr key={leave.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                            {leave.startDate} to {leave.endDate}
                          </td>
                          <td className="py-2 px-3 capitalize font-semibold text-slate-800">
                            {leave.leaveType}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-700">
                            {leave.daysCount} d
                          </td>
                          <td className="py-2 px-3 text-slate-600 max-w-xs truncate" title={leave.reason}>
                            {leave.reason || 'Personal'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                leave.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : leave.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {leave.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-[11px] truncate max-w-[140px]">
                            {leave.approvedBy ? `By: ${leave.approvedBy}` : leave.rejectionReason || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Official Signatures & Verification Block */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <div className="h-12 border-b border-dashed border-slate-400 mb-1" />
                <p className="font-bold text-slate-800">{staff.fullName}</p>
                <p className="text-[10px] text-slate-500">Employee Signature</p>
              </div>

              <div>
                <div className="h-12 border-b border-dashed border-slate-400 mb-1" />
                <p className="font-bold text-slate-800">HR &amp; Payroll Officer</p>
                <p className="text-[10px] text-slate-500">Verified &amp; Authenticated</p>
              </div>

              <div>
                <div className="h-12 border-b border-dashed border-slate-400 mb-1" />
                <p className="font-bold text-slate-800">Principal / Director</p>
                <p className="text-[10px] text-slate-500">Institutional Stamp &amp; Approval</p>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-6 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
              <span>EduLedger ERP Official HR System • Confidential</span>
              <span>Generated on {new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
