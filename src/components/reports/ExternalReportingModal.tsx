import React, { useState, useMemo, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { formatCurrency, formatDate, getTodayDateString } from '../../utils/formatters';
import {
  exportToCSV,
  exportToExcel,
  formatMonthwiseProfitLossForExport,
  formatStudentAttendanceSummaryForExport,
  formatStudentAttendanceForExport,
} from '../../utils/exportUtils';
import { generateMonthwiseProfitLossPdf, MonthlyProfitLossPdfRow } from '../../utils/financialPdf';
import { generateStudentAttendanceAuditPdf } from '../../utils/studentPdf';
import {
  FileText,
  FileSpreadsheet,
  Download,
  X,
  Building,
  CheckCircle,
  AlertCircle,
  Calendar,
  Layers,
  Filter,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  Briefcase,
  Check,
  Sparkles,
} from 'lucide-react';

interface ExternalReportingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReportType?: 'profit_loss' | 'attendance' | 'bundle';
  initialClass?: string;
  initialYear?: string;
}

export const ExternalReportingModal: React.FC<ExternalReportingModalProps> = ({
  isOpen,
  onClose,
  initialReportType = 'profit_loss',
  initialClass = 'All',
  initialYear = 'All',
}) => {
  const { students, studentAttendance, feePayments, expenses, bookSales, settings } = useSchool();

  const [reportType, setReportType] = useState<'profit_loss' | 'attendance' | 'bundle'>(initialReportType);
  const [recipientPreset, setRecipientPreset] = useState<string>('Board of Governors & Trustees');
  const [customRecipient, setCustomRecipient] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [attendanceViewMode, setAttendanceViewMode] = useState<'summary' | 'detailed'>('summary');
  const [auditorNotes, setAuditorNotes] = useState<string>(
    'Certified under institutional governance standards. Records verified against primary journals and daily rolls.'
  );
  const [preparedBy, setPreparedBy] = useState<string>('Bursar / Financial Officer');
  const [certifiedBy, setCertifiedBy] = useState<string>('Principal / Dean of Institution');
  const [notice, setNotice] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (initialReportType) setReportType(initialReportType);
      if (initialClass) setSelectedClass(initialClass);
      if (initialYear) setSelectedYear(initialYear);
    }
  }, [isOpen, initialReportType, initialClass, initialYear]);

  const currencySymbol = settings.currencySymbol || '$';

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4500);
  };

  // Resolved recipient string
  const resolvedRecipient = useMemo(() => {
    if (recipientPreset === 'Custom') {
      return customRecipient.trim() || 'External Regulatory & Audit Directorate';
    }
    return recipientPreset;
  }, [recipientPreset, customRecipient]);

  // Available classes
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

  // 1. Process Monthly Profit & Loss Data
  const { monthlyRows, pnlTotals } = useMemo(() => {
    const map = new Map<
      string,
      {
        monthKey: string;
        monthName: string;
        year: string;
        feeInflows: number;
        bookshopInflows: number;
        otherInflows: number;
        staffExpenses: number;
        utilityExpenses: number;
        maintenanceExpenses: number;
        suppliesExpenses: number;
        otherExpenses: number;
      }
    >();

    const getMonthInfo = (dateStr?: string, monthForStr?: string) => {
      if (dateStr && dateStr.length >= 7) {
        const year = dateStr.slice(0, 4);
        const monthNum = parseInt(dateStr.slice(5, 7), 10);
        const dateObj = new Date(parseInt(year, 10), monthNum - 1, 1);
        const name = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        return { key: dateStr.slice(0, 7), name, year };
      }
      if (monthForStr) {
        return { key: monthForStr, name: monthForStr, year: monthForStr.slice(-4) };
      }
      return { key: '2026-09', name: 'September 2026', year: '2026' };
    };

    const getOrCreate = (key: string, name: string, year: string) => {
      if (!map.has(key)) {
        map.set(key, {
          monthKey: key,
          monthName: name,
          year,
          feeInflows: 0,
          bookshopInflows: 0,
          otherInflows: 0,
          staffExpenses: 0,
          utilityExpenses: 0,
          maintenanceExpenses: 0,
          suppliesExpenses: 0,
          otherExpenses: 0,
        });
      }
      return map.get(key)!;
    };

    // Fee Payments
    feePayments.forEach(p => {
      const { key, name, year } = getMonthInfo(p.date, p.monthFor);
      const e = getOrCreate(key, name, year);
      e.feeInflows += p.totalAmount;
    });

    // Bookshop Sales
    (bookSales || []).forEach(s => {
      const { key, name, year } = getMonthInfo(s.timestamp || s.date);
      const e = getOrCreate(key, name, year);
      e.bookshopInflows += s.totalAmount;
    });

    // Operational Expenses
    expenses.forEach(exp => {
      const { key, name, year } = getMonthInfo(exp.date, exp.monthForSalary);
      const e = getOrCreate(key, name, year);
      const catLower = (exp.category || '').toLowerCase();
      if (catLower.includes('salary') || catLower.includes('payroll') || catLower.includes('staff')) {
        e.staffExpenses += exp.amount;
      } else if (catLower.includes('util') || catLower.includes('electric') || catLower.includes('water') || catLower.includes('internet')) {
        e.utilityExpenses += exp.amount;
      } else if (catLower.includes('maint') || catLower.includes('repair') || catLower.includes('facility')) {
        e.maintenanceExpenses += exp.amount;
      } else if (catLower.includes('suppl') || catLower.includes('book') || catLower.includes('stationery') || catLower.includes('lab')) {
        e.suppliesExpenses += exp.amount;
      } else {
        e.otherExpenses += exp.amount;
      }
    });

    const rows: MonthlyProfitLossPdfRow[] = [];
    map.forEach(item => {
      if (selectedYear !== 'All' && item.year !== selectedYear) return;

      const totalInflow = item.feeInflows + item.bookshopInflows + item.otherInflows;
      const totalExpense =
        item.staffExpenses +
        item.utilityExpenses +
        item.maintenanceExpenses +
        item.suppliesExpenses +
        item.otherExpenses;
      const netProfit = totalInflow - totalExpense;
      const profitMargin = totalInflow > 0 ? (netProfit / totalInflow) * 100 : 0;
      const status: 'profit' | 'loss' | 'breakeven' =
        netProfit > 0 ? 'profit' : netProfit < 0 ? 'loss' : 'breakeven';

      rows.push({
        monthName: item.monthName,
        feeInflows: item.feeInflows,
        bookshopInflows: item.bookshopInflows,
        otherInflows: item.otherInflows,
        totalInflow,
        staffExpenses: item.staffExpenses,
        utilityExpenses: item.utilityExpenses,
        maintenanceExpenses: item.maintenanceExpenses,
        suppliesExpenses: item.suppliesExpenses,
        otherExpenses: item.otherExpenses,
        totalExpense,
        netProfit,
        profitMargin,
        status,
      });
    });

    rows.sort((a, b) => b.monthName.localeCompare(a.monthName));

    const totalRevenue = rows.reduce((s, r) => s + r.totalInflow, 0);
    const totalExpenditure = rows.reduce((s, r) => s + r.totalExpense, 0);
    const netProfit = totalRevenue - totalExpenditure;
    const overallMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      monthlyRows: rows,
      pnlTotals: {
        totalRevenue,
        totalExpenditure,
        netProfit,
        overallMargin,
        reportingPeriod:
          selectedYear === 'All' ? 'Consolidated Academic Session' : `Calendar Year ${selectedYear}`,
      },
    };
  }, [feePayments, expenses, bookSales, selectedYear]);

  // 2. Process Student Attendance Data
  const { filteredStudentsList, filteredAttendanceRecords, attendanceSummaryRows } = useMemo(() => {
    const list = students.filter(s => {
      const matchStatus = s.status === 'active';
      const matchClass = selectedClass === 'All' || s.className === selectedClass;
      const matchSection = selectedSection === 'All' || s.section === selectedSection;
      return matchStatus && matchClass && matchSection;
    });

    const records = (studentAttendance || []).filter(r => {
      const matchClass = selectedClass === 'All' || r.className === selectedClass;
      const matchSection = selectedSection === 'All' || r.section === selectedSection;
      return matchClass && matchSection;
    });

    const summary = formatStudentAttendanceSummaryForExport(list, records, {
      externalRecipient: resolvedRecipient,
      academicSession: settings.currentAcademicYear || '2026-2027',
    });

    return {
      filteredStudentsList: list,
      filteredAttendanceRecords: records,
      attendanceSummaryRows: summary,
    };
  }, [students, studentAttendance, selectedClass, selectedSection, resolvedRecipient, settings]);

  if (!isOpen) return null;

  // Handle Export PDF
  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      if (reportType === 'profit_loss' || reportType === 'bundle') {
        if (monthlyRows.length === 0) {
          showNotice('No monthly financial rows found for the selected period.');
          return;
        }
        generateMonthwiseProfitLossPdf(settings, monthlyRows, {
          totalRevenue: pnlTotals.totalRevenue,
          totalExpenditure: pnlTotals.totalExpenditure,
          netProfit: pnlTotals.netProfit,
          overallMargin: pnlTotals.overallMargin,
          reportingPeriod: pnlTotals.reportingPeriod,
          externalRecipient: resolvedRecipient,
          auditorNotes: auditorNotes.trim(),
          preparedBy: preparedBy.trim(),
          certifiedBy: certifiedBy.trim(),
        });
      }

      if (reportType === 'attendance' || reportType === 'bundle') {
        if (filteredStudentsList.length === 0) {
          showNotice('No enrolled students matching the selected demographic scope.');
          return;
        }
        generateStudentAttendanceAuditPdf(
          settings,
          filteredStudentsList,
          filteredAttendanceRecords,
          {
            title: `OFFICIAL STUDENT ATTENDANCE & ACCREDITATION AUDIT REPORT`,
            className: selectedClass === 'All' ? undefined : selectedClass,
            section: selectedSection === 'All' ? undefined : selectedSection,
            externalRecipient: resolvedRecipient,
            auditorNotes: auditorNotes.trim(),
            preparedBy: preparedBy.trim(),
            certifiedBy: certifiedBy.trim(),
          }
        );
      }

      showNotice(`Successfully generated and downloaded official External Audit PDF statement.`);
    } catch (err) {
      console.error(err);
      showNotice('Failed to generate PDF. Please verify parameters.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      if (reportType === 'profit_loss' || reportType === 'bundle') {
        if (monthlyRows.length === 0) {
          showNotice('No monthly rows found.');
          return;
        }
        const rows = formatMonthwiseProfitLossForExport(monthlyRows, currencySymbol, {
          externalRecipient: resolvedRecipient,
          academicSession: settings.currentAcademicYear || '2026-2027',
        });
        exportToCSV(
          `External_Audit_Monthwise_Profit_Loss_${selectedYear}_${sanitizeFilename(resolvedRecipient)}`,
          rows
        );
      }

      if (reportType === 'attendance' || reportType === 'bundle') {
        if (filteredStudentsList.length === 0) {
          showNotice('No student records found.');
          return;
        }

        if (attendanceViewMode === 'summary') {
          exportToCSV(
            `External_Audit_Attendance_Summary_${selectedClass}_${sanitizeFilename(resolvedRecipient)}`,
            attendanceSummaryRows
          );
        } else {
          const detailRows = formatStudentAttendanceForExport(
            filteredAttendanceRecords,
            filteredStudentsList
          );
          exportToCSV(
            `External_Audit_Attendance_Detailed_Journal_${selectedClass}_${sanitizeFilename(resolvedRecipient)}`,
            detailRows
          );
        }
      }

      showNotice(`Successfully generated and downloaded external reporting CSV data file.`);
    } catch (err) {
      console.error(err);
      showNotice('Failed to export CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Export Excel
  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      if (reportType === 'profit_loss') {
        const rows = formatMonthwiseProfitLossForExport(monthlyRows, currencySymbol, {
          externalRecipient: resolvedRecipient,
        });
        exportToExcel(
          `External_Report_Profit_Loss_${selectedYear}_${sanitizeFilename(resolvedRecipient)}`,
          'Monthly P&L Audit',
          rows
        );
      } else if (reportType === 'attendance') {
        exportToExcel(
          `External_Report_Student_Attendance_${selectedClass}_${sanitizeFilename(resolvedRecipient)}`,
          'Attendance Turnout Audit',
          attendanceSummaryRows
        );
      } else {
        // Bundle
        const pnlRows = formatMonthwiseProfitLossForExport(monthlyRows, currencySymbol, {
          externalRecipient: resolvedRecipient,
        });
        exportToExcel(
          `External_Report_Consolidated_Bundle_${selectedYear}_${sanitizeFilename(resolvedRecipient)}`,
          'Profit and Loss',
          pnlRows
        );
      }
      showNotice(`Exported Excel (.xlsx) workbook for external submission.`);
    } catch (err) {
      console.error(err);
      showNotice('Failed to export Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  function sanitizeFilename(str: string): string {
    return str.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-6 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Building className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Export for External Reporting &amp; Audit
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Compliance Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate authenticated CSV and PDF documents configured for boards, education ministries, auditors, and lenders
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Alert */}
        {notice && (
          <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* 1. Report Category Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            1. Select External Reporting Document Package
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Monthly Profit & Loss */}
            <button
              type="button"
              onClick={() => setReportType('profit_loss')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                reportType === 'profit_loss'
                  ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-white shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300">
                  <TrendingUp className="w-4 h-4" />
                </span>
                {reportType === 'profit_loss' && (
                  <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <div className="mt-2.5">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Monthly Profit &amp; Loss
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Income schedules, operational disbursements, surplus margin %
                </p>
              </div>
            </button>

            {/* Student Attendance */}
            <button
              type="button"
              onClick={() => setReportType('attendance')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                reportType === 'attendance'
                  ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-white shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                  <UserCheck className="w-4 h-4" />
                </span>
                {reportType === 'attendance' && (
                  <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <div className="mt-2.5">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Student Attendance Turnout
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Turnout percentages, absences, leaves, ratings per student
                </p>
              </div>
            </button>

            {/* Combined Bundle */}
            <button
              type="button"
              onClick={() => setReportType('bundle')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                reportType === 'bundle'
                  ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-white shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="p-1.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300">
                  <Layers className="w-4 h-4" />
                </span>
                {reportType === 'bundle' && (
                  <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <div className="mt-2.5">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Consolidated Audit Bundle
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Packages both P&amp;L Financials and Student Attendance together
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Target Recipient / Authority */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            2. External Recipient &amp; Regulatory Authority
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <select
              value={recipientPreset}
              onChange={e => setRecipientPreset(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
            >
              <option value="Board of Governors & Trustees">Board of Governors &amp; Trustees</option>
              <option value="Ministry of Education & District Directorate">Ministry of Education &amp; District Directorate</option>
              <option value="Independent External Financial Auditor">Independent External Financial Auditor</option>
              <option value="Academic Accreditation & Inspection Bureau">Academic Accreditation &amp; Inspection Bureau</option>
              <option value="Banking & Financial Lending Partner">Banking &amp; Financial Lending Partner</option>
              <option value="Grant Agency / Institutional Donor Council">Grant Agency / Institutional Donor Council</option>
              <option value="Custom">Custom Recipient Entity...</option>
            </select>

            {recipientPreset === 'Custom' ? (
              <input
                type="text"
                value={customRecipient}
                onChange={e => setCustomRecipient(e.target.value)}
                placeholder="Enter recipient authority name..."
                className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white focus:outline-hidden"
              />
            ) : (
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-500 text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Document will be authenticated for: <strong>{resolvedRecipient}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Scope & Demographic Filters */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
            3. Scope, Parameters &amp; Demographic Filters
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Year */}
            {(reportType === 'profit_loss' || reportType === 'bundle') && (
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Accounting Session:
                </label>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:outline-hidden cursor-pointer"
                >
                  <option value="All">All Accounting Periods</option>
                  <option value="2026">Calendar Year 2026</option>
                  <option value="2025">Calendar Year 2025</option>
                </select>
              </div>
            )}

            {/* Class Filter */}
            {(reportType === 'attendance' || reportType === 'bundle') && (
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Class Demographic:
                </label>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:outline-hidden cursor-pointer"
                >
                  <option value="All">All Classes Combined</option>
                  {classOptions.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Attendance Format Mode */}
            {reportType === 'attendance' && (
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Attendance CSV Format:
                </label>
                <select
                  value={attendanceViewMode}
                  onChange={e => setAttendanceViewMode(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:outline-hidden cursor-pointer"
                >
                  <option value="summary">Turnout Summary (By Student)</option>
                  <option value="detailed">Daily Session Roll Journal</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 4. Auditor Notes & Sign-off Details */}
        <div className="space-y-3 text-xs">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            4. External Audit Opinion &amp; Sign-off Authentication
          </label>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
              External Compliance Remarks &amp; Certification Note:
            </label>
            <textarea
              rows={2}
              value={auditorNotes}
              onChange={e => setAuditorNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Add official auditor remarks or compliance declaration..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Prepared By Designation:
              </label>
              <input
                type="text"
                value={preparedBy}
                onChange={e => setPreparedBy(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Certified By / Head of Institution:
              </label>
              <input
                type="text"
                value={certifiedBy}
                onChange={e => setCertifiedBy(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* 5. Summary Preview Box */}
        <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="font-bold text-indigo-950 dark:text-indigo-200">
              Output Standards &amp; File Encoding:
            </span>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              • PDF: ISO 32000-1 vector print standard with institution seal &amp; signatures<br />
              • CSV: RFC 4180 with UTF-8 BOM prefix for Microsoft Excel &amp; government portals
            </p>
          </div>
          <div className="text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
            {reportType === 'profit_loss'
              ? `${monthlyRows.length} Monthly Periods`
              : reportType === 'attendance'
              ? `${filteredStudentsList.length} Student Turnouts`
              : 'Full Dual Package'}
          </div>
        </div>

        {/* 6. Action Export Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap justify-end">
            {/* Export as CSV */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Download standardized CSV file with UTF-8 BOM for external spreadsheets and regulatory filing"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export as CSV</span>
            </button>

            {/* Export as PDF */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportPDF}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Download official audit-grade Landscape PDF with signatures and header"
            >
              <FileText className="w-4 h-4" />
              <span>Export as PDF</span>
            </button>

            {/* Export as Excel */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportExcel}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Download Excel spreadsheet"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
