import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { formatCurrency, formatDate, getTodayDateString } from '../../utils/formatters';
import { exportToCSV, exportToExcel, formatDefaultersForExport } from '../../utils/exportUtils';
import { generateDueFeesAuditPdf } from '../../utils/financialPdf';
import { Student } from '../../types';
import {
  AlertCircle,
  AlertTriangle,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  PhoneCall,
  MessageSquare,
  DollarSign,
  UserCheck,
  CheckCircle,
  ChevronDown,
  ArrowUpDown,
  CreditCard,
  Send,
  X,
  ExternalLink,
  ShieldAlert,
  Users,
} from 'lucide-react';

export const DefaultersReportView: React.FC = () => {
  const {
    students,
    feePayments,
    feeStructures,
    settings,
    getDefaultersList,
    recordFeePayment,
    setActiveTab,
    setSelectedStudentIdForDetail,
  } = useSchool();

  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'critical' | 'high' | 'moderate'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'dues_desc' | 'dues_asc' | 'name' | 'roll'>('dues_desc');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Quick Payment Modal State
  const [paymentModalStudent, setPaymentModalStudent] = useState<{
    student: Student;
    pendingAmount: number;
  } | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'Cash' | 'Bank Transfer' | 'Online/UPI' | 'Cheque'>('Cash');
  const [payRemarks, setPayRemarks] = useState<string>('');
  const [isProcessingPay, setIsProcessingPay] = useState<boolean>(false);

  // Bulk Notice Modal State
  const [isBulkNoticeModalOpen, setIsBulkNoticeModalOpen] = useState<boolean>(false);

  const currencySymbol = settings.currencySymbol || '$';

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 4000);
  };

  // Raw defaulters from school context
  const rawDefaulters = useMemo(() => getDefaultersList(), [getDefaultersList]);

  // Standard Classes
  const classOptions = useMemo(() => {
    const set = new Set<string>();
    if (settings.standardClasses) {
      settings.standardClasses.forEach(c => set.add(c));
    }
    students.forEach(s => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set).sort();
  }, [settings.standardClasses, students]);

  // Filtered & Sorted Defaulters
  const filteredDefaulters = useMemo(() => {
    let result = rawDefaulters.filter(({ student, pendingAmount }) => {
      // Class filter
      if (selectedClass !== 'All' && student.className !== selectedClass) return false;

      // Section filter
      if (selectedSection !== 'All' && student.section !== selectedSection) return false;

      // Severity filter (thresholds: critical >= 1000, high 500-999, moderate < 500)
      if (selectedSeverity === 'critical' && pendingAmount < 1000) return false;
      if (selectedSeverity === 'high' && (pendingAmount < 500 || pendingAmount >= 1000)) return false;
      if (selectedSeverity === 'moderate' && pendingAmount >= 500) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = student.fullName.toLowerCase().includes(q);
        const matchRoll = student.rollNo.toLowerCase().includes(q);
        const matchGuardian = student.guardianName.toLowerCase().includes(q);
        const matchPhone = student.contactNumber.toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchGuardian && !matchPhone) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'dues_desc') return b.pendingAmount - a.pendingAmount;
      if (sortBy === 'dues_asc') return a.pendingAmount - b.pendingAmount;
      if (sortBy === 'name') return a.student.fullName.localeCompare(b.student.fullName);
      if (sortBy === 'roll') return a.student.rollNo.localeCompare(b.student.rollNo);
      return 0;
    });

    return result;
  }, [rawDefaulters, selectedClass, selectedSection, selectedSeverity, searchQuery, sortBy]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const totalDefaultersCount = filteredDefaulters.length;
    const totalPendingAmount = filteredDefaulters.reduce((sum, d) => sum + d.pendingAmount, 0);
    const criticalCount = filteredDefaulters.filter(d => d.pendingAmount >= 1000).length;
    const activeStudentsCount = students.filter(s => s.status === 'active').length;
    const delinquencyRate =
      activeStudentsCount > 0 ? (totalDefaultersCount / activeStudentsCount) * 100 : 0;
    const avgPendingPerDefaulter =
      totalDefaultersCount > 0 ? totalPendingAmount / totalDefaultersCount : 0;

    // Top Class with highest delinquent dues
    const classDueMap: Record<string, number> = {};
    filteredDefaulters.forEach(d => {
      classDueMap[d.student.className] = (classDueMap[d.student.className] || 0) + d.pendingAmount;
    });

    let topClass = 'None';
    let topClassAmount = 0;
    Object.entries(classDueMap).forEach(([cls, amt]) => {
      if (amt > topClassAmount) {
        topClass = cls;
        topClassAmount = amt;
      }
    });

    return {
      totalDefaultersCount,
      totalPendingAmount,
      criticalCount,
      delinquencyRate,
      avgPendingPerDefaulter,
      topClass,
      topClassAmount,
      classDueMap,
    };
  }, [filteredDefaulters, students]);

  // WhatsApp reminder message builder
  const openWhatsAppNotice = (student: Student, pendingAmount: number) => {
    const phone = student.contactNumber.replace(/[^0-9]/g, '');
    const schoolName = settings.schoolName || 'EduLedger International School';
    const text = encodeURIComponent(
      `Dear ${student.guardianName || 'Parent/Guardian'},\n\n` +
        `This is a formal academic fee statement from ${schoolName} regarding ${student.fullName} (${student.className}-${student.section}, Roll #${student.rollNo}).\n\n` +
        `Outstanding Academic Tuition Balance: ${currencySymbol}${pendingAmount.toLocaleString()}.\n\n` +
        `Kindly clear the pending tuition dues at your earliest convenience to avoid examination hall ticket delays. For online transfer details or receipt collection, please contact the bursar accounts desk.\n\n` +
        `Thank you for your prompt cooperation.\n` +
        `Accounts & Finance Department\n${schoolName}`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  // Export PDF
  const handleExportPDF = () => {
    if (filteredDefaulters.length === 0) {
      showNotice('No pending defaulter accounts to compile into PDF.');
      return;
    }
    generateDueFeesAuditPdf(settings, filteredDefaulters, {
      title: 'OFFICIAL PENDING DUES & DEFICIT RECOVERY AUDIT REPORT',
      className: selectedClass === 'All' ? 'All Classes' : selectedClass,
    });
    showNotice(
      `Generated and downloaded Fee Defaulters Audit PDF (${filteredDefaulters.length} accounts).`
    );
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredDefaulters.length === 0) {
      showNotice('No pending defaulter accounts to export.');
      return;
    }
    const rows = formatDefaultersForExport(filteredDefaulters, currencySymbol);
    exportToCSV(`Fee_Defaulters_Delinquency_Report_${getTodayDateString()}`, rows);
    showNotice(`Successfully exported ${filteredDefaulters.length} defaulter accounts to CSV.`);
  };

  // Export Excel
  const handleExportExcel = () => {
    if (filteredDefaulters.length === 0) {
      showNotice('No pending defaulter accounts to export.');
      return;
    }
    const rows = formatDefaultersForExport(filteredDefaulters, currencySymbol);
    exportToExcel(`Fee_Defaulters_Report_${getTodayDateString()}`, 'Fee Defaulters', rows);
    showNotice(`Exported ${filteredDefaulters.length} defaulter accounts to Excel (.xlsx).`);
  };

  // Execute Quick Payment
  const handleQuickPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalStudent || payAmount <= 0) return;

    setIsProcessingPay(true);
    try {
      await recordFeePayment({
        studentId: paymentModalStudent.student.id,
        studentName: paymentModalStudent.student.fullName,
        className: paymentModalStudent.student.className,
        section: paymentModalStudent.student.section,
        date: getTodayDateString(),
        monthFor: 'September 2026',
        totalAmount: payAmount,
        paymentMode: payMode,
        remarks: payRemarks || `Dues clearance by ${paymentModalStudent.student.guardianName}`,
        collectedBy: 'Bursar Counter',
      });

      showNotice(
        `Successfully logged fee payment of ${currencySymbol}${payAmount} for ${paymentModalStudent.student.fullName}.`
      );
      setPaymentModalStudent(null);
    } catch (err) {
      console.error(err);
      showNotice('Failed to record payment. Please retry.');
    } finally {
      setIsProcessingPay(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Notice Banner */}
      {noticeMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Fee Defaulters &amp; Receivables Delinquency Register</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                  {filteredDefaulters.length} Accounts Pending
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time tracking of uncollected tuition balances, parent communications, and recovery aging schedules
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
            title="Download Official Pending Dues Audit PDF Report"
          >
            <FileText className="w-4 h-4" />
            <span>Download Defaulters PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
            title="Export Defaulters to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBulkNoticeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
            title="Preview standard fee reminder communication template"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Bulk Reminder Broadcast</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition active:scale-95 cursor-pointer"
            title="Print view"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Overdue Receivables */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Pending Dues
            </span>
            <span className="p-1.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-red-600 dark:text-red-400 mt-2">
            {formatCurrency(metrics.totalPendingAmount, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Across {metrics.totalDefaultersCount} delinquent accounts
          </p>
        </div>

        {/* Defaulter Population Rate */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Delinquency Rate
            </span>
            <span className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-2">
            {metrics.delinquencyRate.toFixed(1)}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {metrics.totalDefaultersCount} of {students.filter(s => s.status === 'active').length}{' '}
            active students
          </p>
        </div>

        {/* Critical Dues */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Critical Accounts (&ge; {currencySymbol}1,000)
            </span>
            <span className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-2">
            {metrics.criticalCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Urgent recovery follow-up recommended
          </p>
        </div>

        {/* Average Outstanding */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Avg Balance per Defaulter
            </span>
            <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-2">
            {formatCurrency(metrics.avgPendingPerDefaulter, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Top delinquent class: <strong>{metrics.topClass}</strong> (
            {formatCurrency(metrics.topClassAmount, currencySymbol)})
          </p>
        </div>
      </div>

      {/* Filter and Sorting Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Defaulter Filters:</span>
          </span>

          {/* Class Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 font-medium">Class:</span>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Classes</option>
              {classOptions.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 font-medium">Section:</span>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 font-medium">Risk:</span>
            <select
              value={selectedSeverity}
              onChange={e => setSelectedSeverity(e.target.value as any)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Amounts</option>
              <option value="critical">Critical (&ge; {currencySymbol}1,000)</option>
              <option value="high">High ({currencySymbol}500 - 999)</option>
              <option value="moderate">Moderate (&lt; {currencySymbol}500)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
            >
              <option value="dues_desc">Dues (Highest First)</option>
              <option value="dues_asc">Dues (Lowest First)</option>
              <option value="name">Student Name (A-Z)</option>
              <option value="roll">Roll Number</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search student, roll, parent, phone..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Class-wise Delinquency Analytics Bar */}
      {Object.keys(metrics.classDueMap).length > 0 && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Receivables Distribution by Academic Class
            </h3>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {Object.keys(metrics.classDueMap).length} Classes Affected
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(metrics.classDueMap)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([cls, amt]) => {
                const pct =
                  metrics.totalPendingAmount > 0
                    ? Math.round((amt / metrics.totalPendingAmount) * 100)
                    : 0;
                return (
                  <div
                    key={cls}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{cls}</span>
                      <span className="text-[10px] font-mono text-slate-400">{pct}%</span>
                    </div>
                    <p className="text-sm font-black font-mono text-red-600 dark:text-red-400">
                      {formatCurrency(amt, currencySymbol)}
                    </p>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(8, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Defaulter Accounts Master Register Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Official Pending Dues &amp; Defaulter Register
            </h3>
            <p className="text-xs text-slate-500">
              Verified active enrollment accounts with unsettled academic tuition balances
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Showing {filteredDefaulters.length} Accounts
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3.5">Roll No</th>
                <th className="py-3 px-3.5">Student Information</th>
                <th className="py-3 px-3">Class &amp; Section</th>
                <th className="py-3 px-3">Parent / Guardian Contact</th>
                <th className="py-3 px-3 text-right">Standard Fee</th>
                <th className="py-3 px-3.5 text-right font-black text-red-600">
                  Outstanding Dues
                </th>
                <th className="py-3 px-3 text-center">Delinquency Risk</th>
                <th className="py-3 px-3 text-center">Quick Recovery Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDefaulters.map(({ student, pendingAmount, lastPaymentDate }) => {
                const isCritical = pendingAmount >= 1000;
                const isHigh = pendingAmount >= 500 && pendingAmount < 1000;

                return (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition group"
                  >
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-500">
                      {student.rollNo}
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold uppercase shrink-0">
                          {student.fullName.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {student.fullName}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Gender: {student.gender} • Blood: {student.bloodGroup || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {student.className}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px] ml-1">
                        ({student.section})
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {student.guardianName}{' '}
                        <span className="text-[10px] text-slate-400">
                          ({student.guardianRelation})
                        </span>
                      </p>
                      <p className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                        {student.contactNumber}
                      </p>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {formatCurrency(
                        feeStructures.find(
                          f => f.className.toLowerCase() === student.className.toLowerCase()
                        )?.totalAmount || 450,
                        currencySymbol
                      )}
                    </td>

                    <td className="py-3 px-3.5 text-right font-mono font-black text-red-600 dark:text-red-400">
                      {formatCurrency(pendingAmount, currencySymbol)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                          isCritical
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : isHigh
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-yellow-50 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
                        }`}
                      >
                        {isCritical ? 'CRITICAL RISK' : isHigh ? 'HIGH RISK' : 'MODERATE'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* WhatsApp Reminder */}
                        <button
                          type="button"
                          onClick={() => openWhatsAppNotice(student, pendingAmount)}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-300 transition cursor-pointer"
                          title="Send instant WhatsApp tuition balance notice to parent"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        {/* Phone Call */}
                        <a
                          href={`tel:${student.contactNumber}`}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition"
                          title="Call parent phone"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </a>

                        {/* Quick Payment Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentModalStudent({ student, pendingAmount });
                            setPayAmount(pendingAmount);
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition active:scale-95 cursor-pointer"
                          title="Record fee payment directly for this student"
                        >
                          Receive
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredDefaulters.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No defaulter accounts found matching criteria. Tuition receivables are fully in good standing!
                  </td>
                </tr>
              )}
            </tbody>

            {/* Totals Footer */}
            {filteredDefaulters.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-bold text-xs">
                <tr>
                  <td colSpan={5} className="py-3.5 px-3.5 font-black uppercase tracking-wider">
                    Total Delinquent Receivables Across Selected Roster
                  </td>
                  <td className="py-3.5 px-3.5 text-right font-mono font-black text-red-300">
                    {formatCurrency(metrics.totalPendingAmount, currencySymbol)}
                  </td>
                  <td colSpan={2} className="py-3.5 px-3 text-center text-[11px] text-slate-300">
                    {metrics.totalDefaultersCount} Accounts Overdue
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Quick Receive Payment Modal */}
      {paymentModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                  <CreditCard className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Receive Delinquent Fee Payment
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Instant dues reconciliation &amp; voucher generation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalStudent(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">
                {paymentModalStudent.student.fullName} ({paymentModalStudent.student.rollNo})
              </p>
              <p className="text-slate-500">
                Class: {paymentModalStudent.student.className} - {paymentModalStudent.student.section} • Guardian:{' '}
                {paymentModalStudent.student.guardianName}
              </p>
              <p className="text-red-600 font-bold font-mono">
                Current Outstanding Balance:{' '}
                {formatCurrency(paymentModalStudent.pendingAmount, currencySymbol)}
              </p>
            </div>

            <form onSubmit={handleQuickPaymentSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Collection Amount ({currencySymbol}):
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={payAmount}
                  onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Mode:
                </label>
                <select
                  value={payMode}
                  onChange={e => setPayMode(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="Cash">Cash Counter</option>
                  <option value="Bank Transfer">Bank Wire / Transfer</option>
                  <option value="Online/UPI">Online Payment / UPI</option>
                  <option value="Cheque">Bank Cheque / Draft</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Receipt Remarks:
                </label>
                <input
                  type="text"
                  value={payRemarks}
                  onChange={e => setPayRemarks(e.target.value)}
                  placeholder="e.g. Paid in full by father via cash"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalStudent(null)}
                  className="px-4 py-2 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPay}
                  className="px-4 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isProcessingPay ? 'Recording...' : 'Confirm Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Notice Communication Template Modal */}
      {isBulkNoticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                  <Send className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Broadcast Fee Reminder Dispatch
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Standardized formal tuition dues notification template
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkNoticeModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Target Roster: <strong>{filteredDefaulters.length} Accounts</strong> with aggregate pending dues of{' '}
              <strong className="text-red-600">{formatCurrency(metrics.totalPendingAmount, currencySymbol)}</strong>.
            </p>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
{`OFFICIAL FEE BALANCE NOTICE
Institution: ${settings.schoolName || 'EduLedger International School'}
Academic Session: ${settings.currentAcademicYear || '2026-2027'}

Dear Parent / Guardian,

This is an automated administrative notification from the Bursar's Office. Our accounts records reflect unsettled academic tuition fees for your ward.

Please deposit the balance fees before the end of this academic billing cycle. For electronic wire clearance or counter receipts, kindly visit the campus administration counter during office hours (08:00 AM - 03:00 PM).

Regards,
Bursar Office & Fee Department`}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Individual notices can also be dispatched directly via WhatsApp or Phone call in the table.
              </span>
              <button
                type="button"
                onClick={() => {
                  showNotice('Reminder dispatch completed. Notifications queued.');
                  setIsBulkNoticeModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
