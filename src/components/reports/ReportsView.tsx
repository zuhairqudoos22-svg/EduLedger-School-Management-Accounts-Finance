import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import {
  formatCurrency,
  formatDate,
  getTodayDateString,
  getCurrentMonthName,
} from '../../utils/formatters';
import {
  exportToCSV,
  exportToExcel,
  formatStudentsForExport,
  formatStudentAttendanceSummaryForExport,
  formatFeePaymentsForExport,
  formatDefaultersForExport,
  formatExpensesForExport,
  formatLedgerForExport,
  formatExamResultsForExport,
  exportMasterSchoolWorkbook,
} from '../../utils/exportUtils';
import {
  generateGeneralLedgerPdf,
  generateFinancialStatementPdf,
  generateStudentStatementPdf,
  generateFeeCollectionAuditPdf,
  generateDueFeesAuditPdf,
  generateExpensesAuditPdf,
  generateCurrentFinancialReportPdf,
  CurrentFinancialReportPdfOptions,
  LedgerPdfEntry,
  FinancialStatementData,
} from '../../utils/financialPdf';
import {
  generateStudentListPdf,
  generateStudentAttendanceAuditPdf,
  generateExamPerformancePdf,
} from '../../utils/studentPdf';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line as RechartsLine,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  CartesianGrid as RechartsCartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from 'recharts';
import {
  BarChart3,
  Calendar,
  Filter,
  Download,
  Printer,
  TrendingUp,
  DollarSign,
  PieChart,
  UserCheck,
  Award,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  Users,
  Search,
  BookOpen,
  AlertCircle,
  Layers,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  HelpCircle,
  ExternalLink,
  PhoneCall,
  MessageSquare,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  Building,
  SlidersHorizontal,
  Scale,
  Eye,
} from 'lucide-react';
import '../../utils/chartSetup';
import { Doughnut, Line } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import { MonthwiseProfitLossReport } from './MonthwiseProfitLossReport';
import { DefaultersReportView } from './DefaultersReportView';
import { ExternalReportingModal } from './ExternalReportingModal';
import { FinancialPrintLayout } from './FinancialPrintLayout';
import { FinancialSummaryStatementView } from './FinancialSummaryStatementView';

type ReportTab = 'financial' | 'summary_statement' | 'profit_loss' | 'defaulters' | 'students' | 'analytics' | 'master';

export const ReportsView: React.FC = () => {
  const {
    students,
    staff,
    feePayments,
    expenses,
    settings,
    getDefaultersList,
    studentAttendance,
    staffAttendance,
    examResults,
    bookSales,
    setActiveTab,
    setSelectedStudentIdForDetail,
  } = useSchool();

  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('financial');
  const [dateRangeStart, setDateRangeStart] = useState('2026-08-01');
  const [dateRangeEnd, setDateRangeEnd] = useState('2026-09-30');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExamTitle, setSelectedExamTitle] = useState('All');
  const [selectedStudentForStatement, setSelectedStudentForStatement] = useState<string>('');
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [isExternalReportModalOpen, setIsExternalReportModalOpen] = useState(false);
  const [externalReportInitialType, setExternalReportInitialType] = useState<'profit_loss' | 'attendance' | 'bundle'>('profit_loss');
  const [showNetSurplusLine, setShowNetSurplusLine] = useState(true);
  const [isPrintLayoutMode, setIsPrintLayoutMode] = useState(false);

  const showNotice = (msg: string) => {
    setBannerNotice(msg);
    setTimeout(() => setBannerNotice(null), 5000);
  };

  // Currency symbol
  const currencySymbol = settings.currencySymbol || '$';

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

  // Available exam titles
  const examTitles = useMemo(() => {
    const titles = new Set<string>();
    (examResults || []).forEach(e => {
      if (e.examTitle) titles.add(e.examTitle);
    });
    return Array.from(titles);
  }, [examResults]);

  // Defaulters list
  const defaulters = useMemo(() => getDefaultersList(), [getDefaultersList]);

  // Filtered Payments within date range & class
  const filteredPayments = useMemo(() => {
    return feePayments.filter(p => {
      const inDate = p.date >= dateRangeStart && p.date <= dateRangeEnd;
      const inClass = selectedClass === 'All' || p.className === selectedClass;
      const matchSearch =
        !searchQuery ||
        p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
      return inDate && inClass && matchSearch;
    });
  }, [feePayments, dateRangeStart, dateRangeEnd, selectedClass, searchQuery]);

  // Filtered Expenses within date range
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const inDate = e.date >= dateRangeStart && e.date <= dateRangeEnd;
      const matchSearch =
        !searchQuery ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.staffName && e.staffName.toLowerCase().includes(searchQuery.toLowerCase()));
      return inDate && matchSearch;
    });
  }, [expenses, dateRangeStart, dateRangeEnd, searchQuery]);

  // Financial summary
  const totalIncome = filteredPayments.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalIncome - totalExpense;
  const operatingMargin = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;

  // Fee Discounts Summary
  const totalDiscountsGiven = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (p.discount_amount || 0), 0);
  }, [filteredPayments]);

  const discountReceiptsCount = useMemo(() => {
    return filteredPayments.filter(p => (p.discount_amount || 0) > 0).length;
  }, [filteredPayments]);

  const discountsBreakdownByReason = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    filteredPayments.forEach(p => {
      if (p.discount_amount && p.discount_amount > 0) {
        const reason = p.discount_reason?.trim() || 'General Concession';
        if (!map[reason]) {
          map[reason] = { count: 0, total: 0 };
        }
        map[reason].count += 1;
        map[reason].total += p.discount_amount;
      }
    });
    return Object.entries(map)
      .map(([reason, data]) => ({ reason, count: data.count, total: data.total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredPayments]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = selectedClass === 'All' || s.className === selectedClass;
      const matchSection = selectedSection === 'All' || s.section === selectedSection;
      const matchStatus = selectedStatus === 'All' || s.status === selectedStatus;
      const matchSearch =
        !searchQuery ||
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.guardianName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contactNumber.includes(searchQuery);
      return matchClass && matchSection && matchStatus && matchSearch;
    });
  }, [students, selectedClass, selectedSection, selectedStatus, searchQuery]);

  // Filtered Defaulters
  const filteredDefaulters = useMemo(() => {
    return defaulters.filter(d => {
      const matchClass = selectedClass === 'All' || d.student.className === selectedClass;
      const matchSearch =
        !searchQuery ||
        d.student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.student.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [defaulters, selectedClass, searchQuery]);

  // Filtered Exam Results
  const filteredExamResults = useMemo(() => {
    return (examResults || []).filter(e => {
      const matchExam = selectedExamTitle === 'All' || e.examTitle === selectedExamTitle;
      const matchClass = selectedClass === 'All' || e.className === selectedClass;
      const matchSearch =
        !searchQuery ||
        e.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.studentRollNo.toLowerCase().includes(searchQuery.toLowerCase());
      return matchExam && matchClass && matchSearch;
    });
  }, [examResults, selectedExamTitle, selectedClass, searchQuery]);

  // Filtered Attendance for Attendance Report
  const filteredAttendanceSummary = useMemo(() => {
    return formatStudentAttendanceSummaryForExport(filteredStudents, studentAttendance || []);
  }, [filteredStudents, studentAttendance]);

  // Recharts Monthly Trends of Revenue and Expenses over the Current Fiscal Year
  const fiscalYearMonthlyData = useMemo(() => {
    // 12-month educational fiscal cycle for 2026-2027 (April 2026 through March 2027)
    const fiscalMonthDefs = [
      { key: '2026-04', label: 'Apr 2026', monthName: 'April' },
      { key: '2026-05', label: 'May 2026', monthName: 'May' },
      { key: '2026-06', label: 'Jun 2026', monthName: 'June' },
      { key: '2026-07', label: 'Jul 2026', monthName: 'July' },
      { key: '2026-08', label: 'Aug 2026', monthName: 'August' },
      { key: '2026-09', label: 'Sep 2026', monthName: 'September' },
      { key: '2026-10', label: 'Oct 2026', monthName: 'October' },
      { key: '2026-11', label: 'Nov 2026', monthName: 'November' },
      { key: '2026-12', label: 'Dec 2026', monthName: 'December' },
      { key: '2027-01', label: 'Jan 2027', monthName: 'January' },
      { key: '2027-02', label: 'Feb 2027', monthName: 'February' },
      { key: '2027-03', label: 'Mar 2027', monthName: 'March' },
    ];

    return fiscalMonthDefs.map(def => {
      // Find matching fee payments
      const matchedPayments = feePayments.filter(p => {
        if (p.date && p.date.startsWith(def.key)) return true;
        if (p.monthFor && p.monthFor.toLowerCase().includes(def.monthName.toLowerCase())) return true;
        return false;
      });
      const actualFeeRevenue = matchedPayments.reduce((sum, p) => sum + p.totalAmount, 0);

      // Find matching bookshop sales
      const matchedSales = (bookSales || []).filter(s => {
        const sDate = s.timestamp || s.date;
        return sDate && sDate.startsWith(def.key);
      });
      const actualBookRevenue = matchedSales.reduce((sum, s) => sum + s.totalAmount, 0);

      // Find matching expenses
      const matchedExpenses = expenses.filter(e => e.date && e.date.startsWith(def.key));
      const actualExpense = matchedExpenses.reduce((sum, e) => sum + e.amount, 0);

      const totalRev = actualFeeRevenue + actualBookRevenue;
      const totalExp = actualExpense;
      const net = totalRev - totalExp;
      const margin = totalRev > 0 ? (net / totalRev) * 100 : 0;

      return {
        month: def.label,
        monthKey: def.key,
        revenue: totalRev,
        expenses: totalExp,
        netSurplus: net,
        margin: parseFloat(margin.toFixed(1)),
        paymentsCount: matchedPayments.length,
        expensesCount: matchedExpenses.length,
      };
    });
  }, [feePayments, expenses, bookSales]);

  const totalFiscalRevenue = useMemo(
    () => fiscalYearMonthlyData.reduce((acc, m) => acc + m.revenue, 0),
    [fiscalYearMonthlyData]
  );
  const totalFiscalExpenses = useMemo(
    () => fiscalYearMonthlyData.reduce((acc, m) => acc + m.expenses, 0),
    [fiscalYearMonthlyData]
  );
  const netFiscalSurplus = totalFiscalRevenue - totalFiscalExpenses;
  const fiscalOperatingMargin = totalFiscalRevenue > 0 ? (netFiscalSurplus / totalFiscalRevenue) * 100 : 0;
  const peakFiscalMonth = useMemo(() => {
    return [...fiscalYearMonthlyData].sort((a, b) => b.revenue - a.revenue)[0];
  }, [fiscalYearMonthlyData]);

  // Target Student for Single Statement
  const statementStudent = useMemo(() => {
    if (!selectedStudentForStatement && students.length > 0) {
      return students[0];
    }
    return students.find(s => s.id === selectedStudentForStatement) || students[0] || null;
  }, [selectedStudentForStatement, students]);

  const statementStudentPayments = useMemo(() => {
    if (!statementStudent) return [];
    return feePayments.filter(p => p.studentId === statementStudent.id);
  }, [statementStudent, feePayments]);

  const statementStudentDues = useMemo(() => {
    if (!statementStudent) return 0;
    const item = defaulters.find(d => d.student.id === statementStudent.id);
    return item ? item.pendingAmount : 0;
  }, [statementStudent, defaulters]);

  const computedIncomeCategories = useMemo(() => {
    const incomeCatMap: Record<string, number> = {};
    filteredPayments.forEach(p => {
      const cat = p.category || 'Tuition & Academic Fees';
      incomeCatMap[cat] = (incomeCatMap[cat] || 0) + p.totalAmount;
    });
    return Object.entries(incomeCatMap).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
    }));
  }, [filteredPayments, totalIncome]);

  const computedExpenseCategories = useMemo(() => {
    const expenseCatMap: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      expenseCatMap[e.category] = (expenseCatMap[e.category] || 0) + e.amount;
    });
    return Object.entries(expenseCatMap).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }));
  }, [filteredExpenses, totalExpense]);

  // =========================================================================
  // FINANCIAL EXPORT HANDLERS (PDF & CSV)
  // =========================================================================

  // 1. Fee Collections
  const handleExportFeeCollectionsCSV = () => {
    if (filteredPayments.length === 0) {
      showNotice('No fee collection records to export for current filter criteria.');
      return;
    }
    const rows = formatFeePaymentsForExport(filteredPayments, currencySymbol);
    exportToCSV(`Fee_Collections_Report_${dateRangeStart}_to_${dateRangeEnd}`, rows);
    showNotice(`Successfully exported ${filteredPayments.length} fee collection records to CSV (compatible with Excel & Sheets).`);
  };

  const handleExportFeeCollectionsExcel = () => {
    if (filteredPayments.length === 0) {
      showNotice('No fee collection records to export.');
      return;
    }
    const rows = formatFeePaymentsForExport(filteredPayments, currencySymbol);
    exportToExcel(`Fee_Collections_Report_${dateRangeStart}_to_${dateRangeEnd}`, 'Fee Collections', rows);
    showNotice(`Exported ${filteredPayments.length} fee collection records to Excel (.xlsx).`);
  };

  const handleExportFeeCollectionsPDF = () => {
    if (filteredPayments.length === 0) {
      showNotice('No fee collection records to compile into PDF.');
      return;
    }
    generateFeeCollectionAuditPdf(settings, filteredPayments, {
      title: 'OFFICIAL FEE COLLECTION & REVENUE AUDIT REPORT',
      period: `${formatDate(dateRangeStart)} to ${formatDate(dateRangeEnd)}`,
      scope: selectedClass === 'All' ? 'All Classes' : `Class ${selectedClass}`,
      filterQuery: searchQuery || undefined,
    });
    showNotice(`Generated and downloaded Fee Collections Audit PDF (${filteredPayments.length} receipts).`);
  };

  // 2. Expenses
  const handleExportExpensesCSV = () => {
    if (filteredExpenses.length === 0) {
      showNotice('No expense records to export.');
      return;
    }
    const rows = formatExpensesForExport(filteredExpenses, currencySymbol);
    exportToCSV(`Operational_Expenses_${dateRangeStart}_to_${dateRangeEnd}`, rows);
    showNotice(`Successfully exported ${filteredExpenses.length} expense records to CSV.`);
  };

  const handleExportExpensesExcel = () => {
    if (filteredExpenses.length === 0) {
      showNotice('No expense records to export.');
      return;
    }
    const rows = formatExpensesForExport(filteredExpenses, currencySymbol);
    exportToExcel(`Operational_Expenses_${dateRangeStart}_to_${dateRangeEnd}`, 'School Expenses', rows);
    showNotice(`Exported ${filteredExpenses.length} expense records to Excel (.xlsx).`);
  };

  const handleExportExpensesPDF = () => {
    if (filteredExpenses.length === 0) {
      showNotice('No expense records to compile into PDF.');
      return;
    }
    generateExpensesAuditPdf(settings, filteredExpenses, {
      title: 'OFFICIAL OPERATIONAL EXPENDITURES AUDIT REPORT',
      period: `${formatDate(dateRangeStart)} to ${formatDate(dateRangeEnd)}`,
    });
    showNotice(`Generated and downloaded Operational Expenses Audit PDF (${filteredExpenses.length} vouchers).`);
  };

  // 3. Due Fees & Defaulters
  const handleExportDefaultersCSV = () => {
    if (filteredDefaulters.length === 0) {
      showNotice('No pending defaulter accounts to export.');
      return;
    }
    const rows = formatDefaultersForExport(filteredDefaulters, currencySymbol);
    exportToCSV(`Fee_Defaulters_Delinquency_Report_${getTodayDateString()}`, rows);
    showNotice(`Successfully exported ${filteredDefaulters.length} defaulter accounts to CSV.`);
  };

  const handleExportDefaultersExcel = () => {
    if (filteredDefaulters.length === 0) {
      showNotice('No pending defaulter accounts to export.');
      return;
    }
    const rows = formatDefaultersForExport(filteredDefaulters, currencySymbol);
    exportToExcel(`Fee_Defaulters_Report_${getTodayDateString()}`, 'Fee Defaulters', rows);
    showNotice(`Exported ${filteredDefaulters.length} defaulter accounts to Excel (.xlsx).`);
  };

  const handleExportDefaultersPDF = () => {
    if (filteredDefaulters.length === 0) {
      showNotice('No pending defaulter accounts to compile into PDF.');
      return;
    }
    generateDueFeesAuditPdf(settings, filteredDefaulters, {
      title: 'OFFICIAL PENDING DUES & DEFICIT RECOVERY AUDIT REPORT',
      className: selectedClass === 'All' ? 'All Classes' : selectedClass,
    });
    showNotice(`Generated and downloaded Fee Defaulters Audit PDF (${filteredDefaulters.length} accounts).`);
  };

  // 4. General Ledger
  const handleExportLedgerCSV = () => {
    const paymentEntries = filteredPayments.map(p => ({
      date: p.date,
      type: 'INCOME' as const,
      description: `Fee: ${p.studentName} (${p.monthFor})`,
      category: p.category || 'Student Fees',
      paymentMode: p.paymentMode,
      referenceNumber: p.receiptNumber,
      credit: p.totalAmount,
      debit: 0,
      balance: 0,
      recordedBy: p.collectedBy,
      notes: p.remarks || '',
    }));

    const expenseEntries = filteredExpenses.map(e => ({
      date: e.date,
      type: 'EXPENSE' as const,
      description: e.title,
      category: e.category,
      paymentMode: e.paymentMode,
      referenceNumber: e.referenceNumber || e.id.slice(-6),
      credit: 0,
      debit: e.amount,
      balance: 0,
      recordedBy: e.recordedBy,
      notes: e.notes || '',
    }));

    const all = [...paymentEntries, ...expenseEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (all.length === 0) {
      showNotice('No transactions found in selected period for General Ledger.');
      return;
    }

    let running = 0;
    const ledger = all.map(t => {
      running += t.credit - t.debit;
      return { ...t, balance: running };
    });

    const rows = formatLedgerForExport(ledger, currencySymbol);
    exportToCSV(`General_Ledger_Cashbook_${dateRangeStart}_to_${dateRangeEnd}`, rows);
    showNotice(`Successfully exported ${ledger.length} ledger transactions to CSV.`);
  };

  const handleExportLedgerPDF = () => {
    const paymentEntries: LedgerPdfEntry[] = filteredPayments.map(p => ({
      date: p.date,
      description: `Fee: ${p.studentName} (${p.monthFor})`,
      category: p.category || 'Student Fees',
      paymentMode: p.paymentMode,
      reference: p.receiptNumber,
      debit: 0,
      credit: p.totalAmount,
      balance: 0,
    }));

    const expenseEntries: LedgerPdfEntry[] = filteredExpenses.map(e => ({
      date: e.date,
      description: e.title,
      category: e.category,
      paymentMode: e.paymentMode,
      reference: e.referenceNumber || e.id.slice(-6),
      debit: e.amount,
      credit: 0,
      balance: 0,
    }));

    const combined = [...paymentEntries, ...expenseEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (combined.length === 0) {
      showNotice('No transactions found in this window to generate audit PDF.');
      return;
    }

    let running = 0;
    const ledgerEntries: LedgerPdfEntry[] = combined.map(item => {
      running += item.credit - item.debit;
      return { ...item, balance: running };
    });

    generateGeneralLedgerPdf(
      settings,
      ledgerEntries,
      { start: dateRangeStart, end: dateRangeEnd },
      { totalCredit: totalIncome, totalDebit: totalExpense, closingBalance: netBalance }
    );
    showNotice('Official Audit Ledger PDF successfully generated and downloaded.');
  };

  // 5. Executive P&L Financial Statement
  const handleExportFinancialStatementPDF = () => {
    const incomeCatMap: Record<string, number> = {};
    filteredPayments.forEach(p => {
      const cat = p.category || 'Tuition & Academic Fees';
      incomeCatMap[cat] = (incomeCatMap[cat] || 0) + p.totalAmount;
    });

    const expenseCatMap: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      expenseCatMap[e.category] = (expenseCatMap[e.category] || 0) + e.amount;
    });

    const incomeCategories = Object.entries(incomeCatMap).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
    }));

    const expenseCategories = Object.entries(expenseCatMap).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }));

    const statementData: FinancialStatementData = {
      title: 'Official Statement of Comprehensive Income & Operating Surplus',
      reportingPeriod: `${formatDate(dateRangeStart)} through ${formatDate(dateRangeEnd)}`,
      academicYear: settings.currentAcademicYear || '2026-2027',
      preparedBy: 'Chief Financial Bursar',
      approvedBy: 'School Principal & Governing Board',
      incomeCategories,
      expenseCategories,
      totalIncome,
      totalExpense,
      netSurplus: netBalance,
      operatingMargin: totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0,
      auditorNotes: 'Compiled in strict compliance with standard educational institutional accounting principles.',
    };

    generateFinancialStatementPdf(settings, statementData);
    showNotice('Executive P&L Financial Statement PDF generated and downloaded.');
  };

  // 6. Comprehensive Current Financial Report PDF Download (jsPDF)
  const handleDownloadCurrentFinancialReportPdf = () => {
    const incomeCatMap: Record<string, number> = {};
    filteredPayments.forEach(p => {
      const cat = p.category || 'Tuition & Academic Fees';
      incomeCatMap[cat] = (incomeCatMap[cat] || 0) + p.totalAmount;
    });

    const expenseCatMap: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      expenseCatMap[e.category] = (expenseCatMap[e.category] || 0) + e.amount;
    });

    const incomeCategories = Object.entries(incomeCatMap).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
    }));

    const expenseCategories = Object.entries(expenseCatMap).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }));

    const pdfData: CurrentFinancialReportPdfOptions = {
      dateRangeStart,
      dateRangeEnd,
      totalIncome,
      totalExpense,
      netBalance,
      operatingMargin: totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0,
      filteredPaymentsCount: filteredPayments.length,
      filteredExpensesCount: filteredExpenses.length,
      totalDefaultersCount: filteredDefaulters.length,
      totalDefaultersAmount: filteredDefaulters.reduce((acc, d) => acc + d.pendingAmount, 0),
      incomeCategories,
      expenseCategories,
      monthlyFiscalTrends: fiscalYearMonthlyData,
    };

    generateCurrentFinancialReportPdf(settings, pdfData);
    showNotice('Official Comprehensive Financial Report PDF generated and downloaded successfully.');
  };

  // =========================================================================
  // STUDENT EXPORT HANDLERS (PDF & CSV)
  // =========================================================================

  // 1. Student Directory / Roster
  const handleExportStudentsCSV = () => {
    if (filteredStudents.length === 0) {
      showNotice('No student records found to export.');
      return;
    }
    const rows = formatStudentsForExport(filteredStudents);
    exportToCSV(`Student_Directory_${selectedClass}_${getTodayDateString()}`, rows);
    showNotice(`Successfully exported ${filteredStudents.length} student records to CSV (UTF-8 BOM compatible with Excel/Sheets).`);
  };

  const handleExportStudentsExcel = () => {
    if (filteredStudents.length === 0) {
      showNotice('No student records found to export.');
      return;
    }
    const rows = formatStudentsForExport(filteredStudents);
    exportToExcel(`Student_Directory_${selectedClass}_${getTodayDateString()}`, 'Students', rows);
    showNotice(`Exported ${filteredStudents.length} student records to Excel (.xlsx).`);
  };

  const handleExportStudentsPDF = () => {
    if (filteredStudents.length === 0) {
      showNotice('No student records found to compile into PDF.');
      return;
    }
    generateStudentListPdf(settings, filteredStudents, {
      title: 'OFFICIAL STUDENT ROSTER & ENROLLMENT AUDIT REPORT',
      className: selectedClass === 'All' ? undefined : selectedClass,
      section: selectedSection === 'All' ? undefined : selectedSection,
      statusFilter: selectedStatus === 'All' ? undefined : selectedStatus,
      searchQuery: searchQuery || undefined,
    });
    showNotice(`Official Student Directory PDF downloaded (${filteredStudents.length} students).`);
  };

  // 2. Student Attendance Audit
  const handleExportAttendanceCSV = () => {
    if (filteredStudents.length === 0) {
      showNotice('No student attendance summary to export.');
      return;
    }
    exportToCSV(`Student_Attendance_Audit_${selectedClass}_${getTodayDateString()}`, filteredAttendanceSummary);
    showNotice(`Successfully exported attendance rate summary for ${filteredStudents.length} students to CSV.`);
  };

  const handleExportAttendanceExcel = () => {
    if (filteredStudents.length === 0) {
      showNotice('No student attendance summary to export.');
      return;
    }
    exportToExcel(`Student_Attendance_Audit_${selectedClass}`, 'Attendance Summary', filteredAttendanceSummary);
    showNotice(`Exported attendance audit for ${filteredStudents.length} students to Excel (.xlsx).`);
  };

  const handleExportAttendancePDF = () => {
    if (filteredStudents.length === 0) {
      showNotice('No students matching criteria for Attendance Audit PDF.');
      return;
    }
    generateStudentAttendanceAuditPdf(settings, filteredStudents, studentAttendance || [], {
      title: 'OFFICIAL STUDENT ATTENDANCE & PUNCTUALITY AUDIT REPORT',
      className: selectedClass === 'All' ? undefined : selectedClass,
    });
    showNotice(`Official Student Attendance Audit PDF generated (${filteredStudents.length} students analyzed).`);
  };

  // 3. Academic Examination Results
  const handleExportExamResultsCSV = () => {
    if (filteredExamResults.length === 0) {
      showNotice('No academic examination records found to export.');
      return;
    }
    const rows = formatExamResultsForExport(filteredExamResults);
    exportToCSV(`Exam_Results_Ledger_${selectedExamTitle.replace(/\s+/g, '_')}_${getTodayDateString()}`, rows);
    showNotice(`Successfully exported ${filteredExamResults.length} exam result records to CSV.`);
  };

  const handleExportExamResultsExcel = () => {
    if (filteredExamResults.length === 0) {
      showNotice('No academic examination records found to export.');
      return;
    }
    const rows = formatExamResultsForExport(filteredExamResults);
    exportToExcel(`Exam_Results_${selectedExamTitle.replace(/\s+/g, '_')}`, 'Exam Results', rows);
    showNotice(`Exported ${filteredExamResults.length} exam marks records to Excel (.xlsx).`);
  };

  const handleExportExamResultsPDF = () => {
    if (filteredExamResults.length === 0) {
      showNotice('No academic examination records found to compile into PDF.');
      return;
    }
    generateExamPerformancePdf(settings, filteredExamResults, {
      examTitle: selectedExamTitle === 'All' ? 'All Examinations Consolidated' : selectedExamTitle,
      className: selectedClass === 'All' ? 'All Classes' : selectedClass,
    });
    showNotice(`Official Academic Examination Marks Ledger PDF generated (${filteredExamResults.length} candidates).`);
  };

  // 4. Individual Student Statement
  const handleExportSingleStudentStatementPDF = () => {
    if (!statementStudent) {
      showNotice('Please select a student to generate statement.');
      return;
    }
    generateStudentStatementPdf(
      settings,
      {
        fullName: statementStudent.fullName,
        rollNo: statementStudent.rollNo,
        className: statementStudent.className,
        section: statementStudent.section,
        guardianName: statementStudent.guardianName,
      },
      statementStudentPayments,
      statementStudentDues
    );
    showNotice(`Official Financial Statement PDF downloaded for ${statementStudent.fullName}.`);
  };

  const handleExportSingleStudentStatementCSV = () => {
    if (!statementStudent) {
      showNotice('Please select a student.');
      return;
    }
    const rows = [
      { Parameter: 'Student Name', Value: statementStudent.fullName },
      { Parameter: 'Roll Number', Value: statementStudent.rollNo },
      { Parameter: 'Class & Section', Value: `${statementStudent.className} - ${statementStudent.section}` },
      { Parameter: 'Guardian Name', Value: statementStudent.guardianName },
      { Parameter: 'Contact Number', Value: statementStudent.contactNumber },
      { Parameter: `Current Outstanding Dues (${currencySymbol})`, Value: statementStudentDues },
      { Parameter: 'Total Lifetime Receipts', Value: statementStudentPayments.length },
      ...statementStudentPayments.map((p, idx) => ({
        Parameter: `Receipt #${p.receiptNumber} (${p.date})`,
        Value: `${p.monthFor} - ${currencySymbol}${p.totalAmount} (${p.paymentMode})`,
      })),
    ];
    exportToCSV(`Student_Statement_${statementStudent.rollNo}_${getTodayDateString()}`, rows);
    showNotice(`Student statement CSV exported for ${statementStudent.fullName}.`);
  };

  // Master Comprehensive Workbook
  const handleExportMasterAuditWorkbook = () => {
    const ok = exportMasterSchoolWorkbook(settings, {
      students,
      staff,
      feePayments,
      expenses,
      defaulters,
      examResults,
      studentAttendance,
    });
    if (ok) {
      showNotice('Master School Workbook (.xlsx) successfully generated with complete financial, student, and audit sheets!');
    }
  };

  // Master CSV Archive export (Summary)
  const handleExportMasterSummaryCSV = () => {
    const totalPendingDues = defaulters.reduce((acc, d) => acc + d.pendingAmount, 0);
    const rows = [
      { Section: 'Report Metadata', Metric: 'School Name', Value: settings.schoolName || 'EduLedger School System' },
      { Section: 'Report Metadata', Metric: 'Academic Year', Value: settings.currentAcademicYear || '2026-2027' },
      { Section: 'Report Metadata', Metric: 'Reporting Start Date', Value: dateRangeStart },
      { Section: 'Report Metadata', Metric: 'Reporting End Date', Value: dateRangeEnd },
      { Section: 'Report Metadata', Metric: 'Target Class Filter', Value: selectedClass },
      { Section: 'Report Metadata', Metric: 'Export Timestamp', Value: new Date().toLocaleString() },
      { Section: 'Financial Overview', Metric: `Gross Fee Collections (${currencySymbol})`, Value: totalIncome },
      { Section: 'Financial Overview', Metric: `Total Operating Expenditures (${currencySymbol})`, Value: totalExpense },
      { Section: 'Financial Overview', Metric: `Net Operating Surplus (${currencySymbol})`, Value: netBalance },
      { Section: 'Financial Overview', Metric: 'Operating Margin %', Value: totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(2) + '%' : '0%' },
      { Section: 'Student Demographics', Metric: 'Active Enrolled Students', Value: students.filter(s => s.status === 'active').length },
      { Section: 'Student Demographics', Metric: 'Total Student Directory', Value: students.length },
      { Section: 'Fee Delinquency', Metric: 'Defaulter Accounts Overdue', Value: defaulters.length },
      { Section: 'Fee Delinquency', Metric: `Total Outstanding Receivables (${currencySymbol})`, Value: totalPendingDues },
      { Section: 'Faculty & Personnel', Metric: 'Total Faculty & Staff', Value: staff.length },
      { Section: 'Academic Assessments', Metric: 'Total Exam Results Logged', Value: (examResults || []).length },
    ];
    exportToCSV(`Master_School_Administrative_Summary_${getTodayDateString()}`, rows);
    showNotice('Master School Administrative Summary CSV file successfully generated and downloaded.');
  };

  // Monthly trends for line chart in Analytics tab
  const months = ['May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026'];
  const incomeTrend = [3800, 4200, 4100, 5230, totalIncome || 4800];
  const expenseTrend = [3100, 3600, 3850, 4800, totalExpense || 4200];

  const financialTrendData = {
    labels: months,
    datasets: [
      {
        label: `Gross Fee Collections (${currencySymbol})`,
        data: incomeTrend,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.35,
        fill: true,
      },
      {
        label: `Operating Expenditures (${currencySymbol})`,
        data: expenseTrend,
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        tension: 0.35,
        fill: true,
      },
    ],
  };

  // Expense breakdown by category
  const expenseCatMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const exp of filteredExpenses) {
      map[exp.category] = (map[exp.category] || 0) + exp.amount;
    }
    return map;
  }, [filteredExpenses]);

  const expensePieData = {
    labels: Object.keys(expenseCatMap),
    datasets: [
      {
        data: Object.values(expenseCatMap).length > 0 ? Object.values(expenseCatMap) : [1],
        backgroundColor: [
          '#EF4444',
          '#F59E0B',
          '#3B82F6',
          '#10B981',
          '#8B5CF6',
          '#EC4899',
          '#6366F1',
          '#14B8A6',
        ],
        borderWidth: 0,
      },
    ],
  };

  // Attendance Trend
  const attendanceComparisonData = {
    labels: ['18 Sep', '19 Sep', '22 Sep', '23 Sep', '24 Sep', '25 Sep (Today)'],
    datasets: [
      {
        label: 'Student Turnout %',
        data: [92, 94, 88, 95, 91, 87],
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.3,
      },
      {
        label: 'Staff Turnout %',
        data: [96, 100, 95, 96, 96, 88],
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        tension: 0.3,
      },
    ],
  };

  // Executive Report Tabs Configuration
  const reportTabsConfig = useMemo(() => [
    {
      id: 'financial' as const,
      label: 'Financial Reports (PDF / CSV)',
      fullTitle: 'Financial Reports (PDF / CSV) - 6 Reports',
      icon: <DollarSign className="w-4 h-4 shrink-0" />,
      chip: (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 dark:bg-slate-800">
          6 Reports
        </span>
      ),
      activeClass: 'bg-indigo-600 text-white shadow-md',
    },
    {
      id: 'summary_statement' as const,
      label: 'Financial Summary Statement',
      fullTitle: 'Financial Summary Statement - Monthly Ledger',
      icon: <Scale className="w-4 h-4 shrink-0 text-indigo-400" />,
      chip: (
        <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-200 font-mono font-bold">
          Monthly Ledger
        </span>
      ),
      activeClass: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30',
    },
    {
      id: 'profit_loss' as const,
      label: 'Month-wise Profit & Loss',
      fullTitle: 'Month-wise Profit & Loss (P&L)',
      icon: <TrendingUp className="w-4 h-4 shrink-0 text-emerald-300" />,
      chip: (
        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-200 font-mono font-bold">
          P&amp;L
        </span>
      ),
      activeClass: 'bg-emerald-600 text-white shadow-md',
    },
    {
      id: 'defaulters' as const,
      label: 'Defaulters Report',
      fullTitle: `Defaulters Report${defaulters.length > 0 ? ` (${defaulters.length} Pending)` : ''}`,
      icon: <AlertCircle className="w-4 h-4 shrink-0 text-amber-300" />,
      chip: defaulters.length > 0 ? (
        <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-black">
          {defaulters.length}
        </span>
      ) : null,
      activeClass: 'bg-amber-600 text-white shadow-md',
    },
    {
      id: 'students' as const,
      label: 'Student Reports (PDF / CSV)',
      fullTitle: 'Student Reports (PDF / CSV) - 4 Reports',
      icon: <Users className="w-4 h-4 shrink-0" />,
      chip: (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 dark:bg-slate-800">
          4 Reports
        </span>
      ),
      activeClass: 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 ring-1 ring-cyan-400/50',
    },
    {
      id: 'analytics' as const,
      label: 'Executive Visual Analytics & Charts',
      fullTitle: 'Executive Visual Analytics & Charts',
      icon: <TrendingUp className="w-4 h-4 shrink-0" />,
      chip: null,
      activeClass: 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400/50',
    },
    {
      id: 'master' as const,
      label: 'Master Audit & Office Compatibility',
      fullTitle: 'Master Audit & Office Compatibility',
      icon: <Layers className="w-4 h-4 shrink-0" />,
      chip: null,
      activeClass: 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-rose-400/50',
    },
  ], [defaulters.length]);

  // Arrow key navigation for tablist
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (index + 1) % reportTabsConfig.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (index - 1 + reportTabsConfig.length) % reportTabsConfig.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = reportTabsConfig.length - 1;
    } else {
      return;
    }
    const nextTab = reportTabsConfig[nextIndex];
    if (nextTab) {
      setActiveReportTab(nextTab.id);
      const btn = document.getElementById(`report-tab-${nextTab.id}`);
      btn?.focus();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="print:hidden flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs w-full box-border min-w-0">
        <div className="flex-[1_1_320px] min-w-0 max-w-full xl:max-w-xl">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white truncate">
              Executive Reports &amp; Data Export Hub
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Export official financial statements, fee collections, student directories, attendance audits, and academic marks ledgers to PDF or CSV format, formatted for seamless compatibility with Microsoft Excel, Google Sheets, LibreOffice Calc, and Apple Numbers.
          </p>
        </div>

        {/* Header Action Buttons (Organized in 3 consistent groups, equal 40px height, balanced rows) */}
        <div className="w-full xl:w-auto shrink-0 flex flex-col gap-2.5 xl:items-end">
          {/* Group 1: Primary Exports (3 equal buttons) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
            <button
              type="button"
              onClick={handleDownloadCurrentFinancialReportPdf}
              className="h-10 px-3.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 whitespace-normal leading-tight text-center"
              title="Download official comprehensive printable document of current financial report as PDF using jsPDF"
            >
              <FileText className="w-4 h-4 shrink-0 text-white" />
              <span className="truncate">Download as PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportMasterAuditWorkbook}
              className="h-10 px-3.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 whitespace-normal leading-tight text-center"
              title="Download Master All-in-One School Audit Excel Workbook (.xlsx) with all financial and student sheets"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0 text-white" />
              <span className="truncate">Export Master Workbook (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setExternalReportInitialType(activeReportTab === 'students' ? 'attendance' : 'profit_loss');
                setIsExternalReportModalOpen(true);
              }}
              className="h-10 px-3.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 whitespace-normal leading-tight text-center"
              title="Export Monthly Profit & Loss and Student Attendance Data as CSV or PDF files for external reporting"
            >
              <Building className="w-4 h-4 shrink-0 text-white" />
              <span className="truncate">External Reporting Export (PDF / CSV)</span>
            </button>
          </div>

          {/* Groups 2 & 3: Summaries (2 buttons) & Print (2 buttons) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full">
            {/* Group 2: Summaries */}
            <button
              type="button"
              onClick={() => setActiveReportTab('summary_statement')}
              className="h-10 px-3 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 whitespace-normal leading-tight text-center"
              title="Open comprehensive Financial Summary Statement & Monthly Ledger"
            >
              <Scale className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span className="truncate">Summary Statement</span>
            </button>

            <button
              type="button"
              onClick={handleExportMasterSummaryCSV}
              className="h-10 px-3 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 whitespace-normal leading-tight text-center"
              title="Export master summary metrics as standard CSV with UTF-8 BOM"
            >
              <Download className="w-4 h-4 shrink-0 text-indigo-600" />
              <span className="truncate">Master Summary (CSV)</span>
            </button>

            {/* Group 3: Print */}
            <button
              type="button"
              onClick={() => setIsPrintLayoutMode(!isPrintLayoutMode)}
              className={`h-10 px-3 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 whitespace-normal leading-tight text-center ${
                isPrintLayoutMode
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800'
              }`}
              title="Toggle Dedicated Print Layout Mode (A4 Sheet Preview & Export)"
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              <span className="truncate">{isPrintLayoutMode ? 'Interactive Dashboard' : 'Print Layout Mode'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPrintLayoutMode(true);
                setTimeout(() => {
                  document.body.classList.add('print-mode-financial');
                  window.print();
                  setTimeout(() => document.body.classList.remove('print-mode-financial'), 1200);
                }, 150);
              }}
              className="h-10 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 whitespace-normal leading-tight text-center"
              title="Print financial report using dedicated professional stylesheet"
            >
              <Printer className="w-4 h-4 shrink-0 text-slate-300" />
              <span className="truncate">Print View</span>
            </button>
          </div>
        </div>
      </div>

      {isPrintLayoutMode ? (
        <FinancialPrintLayout
          settings={settings}
          dateRangeStart={dateRangeStart}
          dateRangeEnd={dateRangeEnd}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          netBalance={netBalance}
          operatingMargin={operatingMargin}
          fiscalYearMonthlyData={fiscalYearMonthlyData}
          incomeCategories={computedIncomeCategories}
          expenseCategories={computedExpenseCategories}
          filteredPayments={filteredPayments}
          filteredExpenses={filteredExpenses}
          filteredDefaulters={filteredDefaulters}
          onClose={() => setIsPrintLayoutMode(false)}
          onDownloadPdf={handleDownloadCurrentFinancialReportPdf}
        />
      ) : (
        <>

      {/* Notification Banner */}
      {bannerNotice && (
        <div className="print:hidden p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2.5 shadow-lg animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{bannerNotice}</span>
        </div>
      )}

      {/* Primary Category Navigation Tabs (Wrapping Grid, Zero Cut-off, Zero Scrollbar) */}
      <div
        role="tablist"
        aria-label="Executive Report Tabs"
        className="print:hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 [@media(min-width:1440px)]:[grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] 2xl:[grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-2.5 sm:gap-3 w-full box-border min-w-0"
      >
        {reportTabsConfig.map((tab, idx) => {
          const isActive = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`report-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`report-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              type="button"
              onClick={() => setActiveReportTab(tab.id)}
              onKeyDown={e => handleTabKeyDown(e, idx)}
              title={tab.fullTitle}
              className={`relative flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition cursor-pointer select-none box-border w-full min-w-0 h-[52px] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isActive
                  ? tab.activeClass
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <span className="shrink-0 flex items-center justify-center">
                {tab.icon}
              </span>
              <span className="flex-1 min-w-0 px-2.5 text-left rtl:text-right leading-tight [text-wrap:balance] line-clamp-2">
                {tab.label}
              </span>
              {tab.chip && (
                <span className="shrink-0 ms-auto">
                  {tab.chip}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Global Filter Toolbar */}
      <div className="print:hidden p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {/* Date range start */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={dateRangeStart}
              onChange={e => setDateRangeStart(e.target.value)}
              className="bg-transparent font-bold focus:outline-hidden"
            />
          </div>

          {/* Date range end */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={dateRangeEnd}
              onChange={e => setDateRangeEnd(e.target.value)}
              className="bg-transparent font-bold focus:outline-hidden"
            />
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Class:</span>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="bg-transparent font-bold focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Grades</option>
              {classOptions.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Search query */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports query..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Office Compatibility Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>UTF-8 BOM Verified • RFC 4180 CSV &amp; ISO 32000 PDF</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FINANCIAL REPORTS EXPORT SUITE                                      */}
      {/* ========================================================================= */}
      {activeReportTab === 'financial' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Financial Statement Suite Toolbar & Direct PDF Download */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Institutional Financial Statements &amp; Audit Suite
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Session: {settings.currentAcademicYear || '2026-2027'} • Filtered Range: {formatDate(dateRangeStart)} – {formatDate(dateRangeEnd)}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleDownloadCurrentFinancialReportPdf}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                title="Generate and download official printable PDF document of current financial report using jsPDF"
              >
                <FileText className="w-4 h-4 text-white" />
                <span>Download as PDF</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Recognized Fee Income
              </span>
              <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(totalIncome, currencySymbol)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{filteredPayments.length} verified receipts</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Discounts Given
              </span>
              <p className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(totalDiscountsGiven, currencySymbol)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{discountReceiptsCount} concession grants</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Operating Expenditures
              </span>
              <p className="text-xl font-black font-mono text-red-600 dark:text-red-400 mt-1">
                {formatCurrency(totalExpense, currencySymbol)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{filteredExpenses.length} expense vouchers</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Net Operating Balance
              </span>
              <p className={`text-xl font-black font-mono mt-1 ${netBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'}`}>
                {formatCurrency(netBalance, currencySymbol)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{netBalance >= 0 ? 'Liquid Operating Surplus' : 'Operating Deficit'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Delinquent Overdue Dues
              </span>
              <p className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(filteredDefaulters.reduce((acc, d) => acc + d.pendingAmount, 0), currencySymbol)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{filteredDefaulters.length} student accounts</p>
            </div>
          </div>

          {/* Institutional Fee Discounts Breakdown by Reason */}
          {discountsBreakdownByReason.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    <Award className="w-4 h-4" />
                  </span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Fee Concessions &amp; Discounts Breakdown ({formatCurrency(totalDiscountsGiven, currencySymbol)})
                  </h4>
                </div>
                <span className="text-xs text-slate-500">
                  {discountReceiptsCount} Beneficiaries
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {discountsBreakdownByReason.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60"
                  >
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate" title={item.reason}>
                      {item.reason}
                    </p>
                    <p className="text-base font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                      {formatCurrency(item.total, currencySymbol)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {item.count} student{item.count > 1 ? 's' : ''} ({totalDiscountsGiven > 0 ? Math.round((item.total / totalDiscountsGiven) * 100) : 0}%)
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recharts Line Chart: Monthly Trends of Revenue & Expenses over Current Fiscal Year */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Monthly Revenue &amp; Expenses Trends (Fiscal Year {settings.currentAcademicYear || '2026-2027'})
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        Recharts
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Visualizing monthly gross revenue inflows, operating expenditures, and net surplus trajectory
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons & Net Surplus Toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowNetSurplusLine(!showNetSurplusLine)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-95 cursor-pointer ${
                    showNetSurplusLine
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {showNetSurplusLine ? '✓ Net Surplus Line' : '+ Show Net Surplus'}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCurrentFinancialReportPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  title="Generate printable PDF of the current financial report using jsPDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download as PDF</span>
                </button>
              </div>
            </div>

            {/* Fiscal Year Summary Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Annual Fiscal Revenue</p>
                <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(totalFiscalRevenue, currencySymbol)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Annual Fiscal Expenses</p>
                <p className="text-base font-black font-mono text-red-600 dark:text-red-400 mt-0.5">
                  {formatCurrency(totalFiscalExpenses, currencySymbol)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Operating Surplus</p>
                <p className={`text-base font-black font-mono mt-0.5 ${netFiscalSurplus >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'}`}>
                  {formatCurrency(netFiscalSurplus, currencySymbol)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fiscal Operating Margin</p>
                <p className="text-base font-black font-mono text-slate-900 dark:text-white mt-0.5">
                  {fiscalOperatingMargin.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Recharts Line Chart Container */}
            <div className="w-full h-72 sm:h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={fiscalYearMonthlyData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <RechartsCartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                  <RechartsXAxis
                    dataKey="month"
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={{ stroke: '#cbd5e1' }}
                  />
                  <RechartsYAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={{ stroke: '#cbd5e1' }}
                    tickFormatter={(val: number) => `${currencySymbol}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }: any) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[210px]">
                            <p className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1">
                              {label} ({settings.currentAcademicYear || '2026-2027'})
                            </p>
                            <div className="flex items-center justify-between gap-4 text-emerald-600 font-semibold">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                Revenue:
                              </span>
                              <span className="font-mono font-bold">{formatCurrency(d.revenue, currencySymbol)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-red-600 font-semibold">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                Expenses:
                              </span>
                              <span className="font-mono font-bold">{formatCurrency(d.expenses, currencySymbol)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-indigo-600 dark:text-indigo-400 font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                Net Surplus:
                              </span>
                              <span className="font-mono font-bold">{formatCurrency(d.netSurplus, currencySymbol)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-slate-500 text-[11px]">
                              <span>Operating Margin:</span>
                              <span className="font-mono font-medium">{d.margin}%</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <RechartsLegend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingBottom: 6 }} />
                  <RechartsLine
                    type="monotone"
                    dataKey="revenue"
                    name={`Total Revenue (${currencySymbol})`}
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ r: 4, stroke: '#10B981', strokeWidth: 2, fill: '#ffffff' }}
                    activeDot={{ r: 7, stroke: '#059669', strokeWidth: 2, fill: '#10B981' }}
                  />
                  <RechartsLine
                    type="monotone"
                    dataKey="expenses"
                    name={`Total Expenses (${currencySymbol})`}
                    stroke="#EF4444"
                    strokeWidth={3}
                    dot={{ r: 4, stroke: '#EF4444', strokeWidth: 2, fill: '#ffffff' }}
                    activeDot={{ r: 7, stroke: '#DC2626', strokeWidth: 2, fill: '#EF4444' }}
                  />
                  {showNetSurplusLine && (
                    <RechartsLine
                      type="monotone"
                      dataKey="netSurplus"
                      name={`Net Operating Surplus (${currencySymbol})`}
                      stroke="#6366F1"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3, stroke: '#6366F1', strokeWidth: 1.5, fill: '#ffffff' }}
                      activeDot={{ r: 6, stroke: '#4F46E5', fill: '#6366F1' }}
                    />
                  )}
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Report 1: Fee Collection & Receipts Audit */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                    <DollarSign className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    1. Fee Collections &amp; Revenue Inflow Report
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed tuition fee payments, receipt numbers, payment methods, and timestamps
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportFeeCollectionsPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  title="Export official printable Fee Collections PDF with audit totals"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportFeeCollectionsCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  title="Export Fee Collections as UTF-8 RFC-4180 CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportFeeCollectionsExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer"
                  title="Export as native Microsoft Excel .xlsx workbook"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Receipt #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Billing Month</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPayments.slice(0, 5).map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{p.receiptNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500">{formatDate(p.date)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{p.studentName}</td>
                      <td className="py-2.5 px-3 text-slate-500">{p.className} - {p.section}</td>
                      <td className="py-2.5 px-3 text-slate-500">{p.monthFor}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-medium">{p.paymentMode}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(p.totalAmount, currencySymbol)}
                      </td>
                    </tr>
                  ))}
                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-slate-400">
                        No fee collection receipts found matching filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredPayments.length > 5 && (
              <p className="text-[11px] text-slate-400 text-right">
                Showing 5 of {filteredPayments.length} recorded payments. Full dataset exported in PDF/CSV.
              </p>
            )}
          </div>

          {/* Report 2: Operational Expenditures & Expense Vouchers */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    2. School Expenditures &amp; Outflow Vouchers Report
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete line-item operational expenses, vendor disbursements, utility payments, and maintenance costs
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportExpensesPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  title="Export official printable Expenses PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExpensesCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  title="Export Expenses as RFC-4180 CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExpensesExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Voucher ID</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Expense Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Payment Mode</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredExpenses.slice(0, 5).map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-500">{e.id.slice(-6)}</td>
                      <td className="py-2.5 px-3 text-slate-500">{formatDate(e.date)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{e.title}</td>
                      <td className="py-2.5 px-3 text-slate-500">{e.category}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-medium">{e.paymentMode}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">
                        {formatCurrency(e.amount, currencySymbol)}
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400">
                        No operational expense vouchers found in selected date window.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Report 3: Due Fees & Defaulters Delinquency Report */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    3. Fee Defaulters &amp; Delinquent Accounts Recovery Report
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Overdue receivables, student guardian contacts, and delinquent accounts breakdown by classroom
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportDefaultersPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  title="Export official Defaulters Recovery PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportDefaultersCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  title="Export Defaulters as CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportDefaultersExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Roll No</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Guardian</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3 text-right">Outstanding Dues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDefaulters.slice(0, 5).map(({ student, pendingAmount }) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-500">{student.rollNo}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{student.fullName}</td>
                      <td className="py-2.5 px-3 text-slate-500">{student.className} - {student.section}</td>
                      <td className="py-2.5 px-3 text-slate-500">{student.guardianName} ({student.guardianRelation})</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{student.contactNumber}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600">
                        {formatCurrency(pendingAmount, currencySymbol)}
                      </td>
                    </tr>
                  ))}
                  {filteredDefaulters.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400">
                        No outstanding defaulters matching criteria. Outstanding tuition accounts are in good standing!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Report 4 & 5: Double-Entry General Ledger & P&L Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* General Ledger Cashbook */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    4. General Ledger Cashbook Audit
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportLedgerPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportLedgerCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Double-entry financial journal combining chronologically verified fee revenue inflows (credit) and operational disbursements (debit) with running balances.
              </p>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Total Credits:</span>
                  <span className="font-bold text-emerald-600 font-mono ml-1">+{formatCurrency(totalIncome, currencySymbol)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Total Debits:</span>
                  <span className="font-bold text-red-600 font-mono ml-1">-{formatCurrency(totalExpense, currencySymbol)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Closing Balance:</span>
                  <span className="font-bold text-indigo-600 font-mono ml-1">{formatCurrency(netBalance, currencySymbol)}</span>
                </div>
              </div>
            </div>

            {/* Official P&L Financial Statement */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                    <PieChart className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    5. Executive P&amp;L Financial Statement
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportFinancialStatementPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Statement PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportMasterSummaryCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Official institutional income statement displaying category contributions, percentage breakdowns, operating surplus margin, and formal board approval sign-off blocks.
              </p>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Reporting Session:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200 ml-1">{settings.currentAcademicYear || '2026-2027'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Operating Margin:</span>
                  <span className="font-bold text-indigo-600 ml-1 font-mono">
                    {totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Report 6: Financial Summary Statement & Monthly Ledger */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-500/5 via-slate-50 to-indigo-500/10 dark:from-indigo-950/30 dark:via-slate-900 dark:to-indigo-950/20 border border-indigo-200 dark:border-indigo-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>6. Financial Summary Statement &amp; Monthly Ledger</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                      Printable Ledger Report
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aggregates monthly gross revenues, operational outflows, and net profit into a printable, professional-grade monthly ledger report.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveReportTab('summary_statement')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Full Monthly Ledger</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: FINANCIAL SUMMARY STATEMENT & MONTHLY LEDGER REPORT                 */}
      {/* ========================================================================= */}
      {activeReportTab === 'summary_statement' && (
        <FinancialSummaryStatementView />
      )}

      {/* ========================================================================= */}
      {/* TAB: MONTH-WISE PROFIT & LOSS REPORT                                      */}
      {/* ========================================================================= */}
      {activeReportTab === 'profit_loss' && (
        <MonthwiseProfitLossReport />
      )}

      {/* ========================================================================= */}
      {/* TAB: DEFAULTERS & PENDING DUES REPORT                                     */}
      {/* ========================================================================= */}
      {activeReportTab === 'defaulters' && (
        <DefaultersReportView />
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STUDENT REPORTS EXPORT SUITE                                       */}
      {/* ========================================================================= */}
      {activeReportTab === 'students' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Quick Demographics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Matching Student Records
              </span>
              <p className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                {filteredStudents.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Total Enrolled: {students.length}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Active Enrolled Ratio
              </span>
              <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {students.length > 0 ? Math.round((students.filter(s => s.status === 'active').length / students.length) * 100) : 0}%
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{students.filter(s => s.status === 'active').length} active students</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Attendance Turnout Rate
              </span>
              <p className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                91.8%
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{studentAttendance?.length || 0} logged attendance sessions</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Academic Results Logged
              </span>
              <p className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
                {(examResults || []).length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{examTitles.length} distinct exams on record</p>
            </div>
          </div>

          {/* Student Secondary Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Student Filters:</span>
            </span>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 font-medium">Status:</span>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="bg-transparent font-bold focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="active">Active Enrolled</option>
                <option value="inactive">Inactive / Withdrawn</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 font-medium">Section:</span>
              <select
                value={selectedSection}
                onChange={e => setSelectedSection(e.target.value)}
                className="bg-transparent font-bold focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>

            {examTitles.length > 0 && (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 font-medium">Exam:</span>
                <select
                  value={selectedExamTitle}
                  onChange={e => setSelectedExamTitle(e.target.value)}
                  className="bg-transparent font-bold focus:outline-hidden cursor-pointer"
                >
                  <option value="All">All Exam Sessions</option>
                  {examTitles.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Report 1: Student Directory & Enrollment Roster */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                    <Users className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    1. Student Directory &amp; Class Enrollment Roster Report
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete official student directory with Roll No, Admission Date, Guardian Details, Contact Numbers, and Enrollment Status
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportStudentsPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  title="Export official printable Student Directory PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportStudentsCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  title="Export Student Directory as UTF-8 CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportStudentsExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Roll No</th>
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Gender</th>
                    <th className="py-2.5 px-3">Guardian</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStudents.slice(0, 5).map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{s.rollNo}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{s.fullName}</td>
                      <td className="py-2.5 px-3 text-slate-500">{s.className} - {s.section}</td>
                      <td className="py-2.5 px-3 text-slate-500">{s.gender}</td>
                      <td className="py-2.5 px-3 text-slate-500">{s.guardianName} ({s.guardianRelation})</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{s.contactNumber}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-slate-400">
                        No students found matching filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredStudents.length > 5 && (
              <p className="text-[11px] text-slate-400 text-right">
                Showing 5 of {filteredStudents.length} matching students. Full roster included in export download.
              </p>
            )}
          </div>

          {/* Report 2: Student Attendance & Turnout Audit */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                    <UserCheck className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    2. Student Attendance &amp; Punctuality Audit Report
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aggregate presence percentages, unexcused absences, approved leaves, and turnout ratings per student
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setExternalReportInitialType('attendance');
                    setIsExternalReportModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  title="Export Student Attendance for External Audit & Reporting as CSV or PDF"
                >
                  <Building className="w-3.5 h-3.5 text-white" />
                  <span>External Reporting (PDF/CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportAttendancePDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  title="Export official printable Student Attendance PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportAttendanceCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  title="Export Attendance summary as CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportAttendanceExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Attendance Preview Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Roll No</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3 text-center">Present</th>
                    <th className="py-2.5 px-3 text-center">Absent</th>
                    <th className="py-2.5 px-3 text-center">Turnout Rate %</th>
                    <th className="py-2.5 px-3">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAttendanceSummary.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-500">{String(row['Roll No'])}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{String(row['Student Name'])}</td>
                      <td className="py-2.5 px-3 text-slate-500">{String(row['Class'])} - {String(row['Section'])}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{String(row['Present Days'])}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-rose-600">{String(row['Absent Days'])}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-600">{String(row['Attendance Rate (%)'])}%</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                          {String(row['Attendance Rating'])}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Report 3: Academic Examination Marks Ledger */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                    <Award className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    3. Academic Examination Marks &amp; Results Ledger Report
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standardized test marks, class ranks, subject scores, percentage grades, and teacher assessment remarks
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportExamResultsPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  title="Export official Examination Marks Ledger PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExamResultsCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  title="Export Exam Results as CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExamResultsExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Roll No</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Exam Session</th>
                    <th className="py-2.5 px-3 text-right">Obtained Marks</th>
                    <th className="py-2.5 px-3 text-right">Score %</th>
                    <th className="py-2.5 px-3 text-center">Grade</th>
                    <th className="py-2.5 px-3">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredExamResults.slice(0, 5).map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-500">#{r.rank || idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-500">{r.studentRollNo}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{r.studentName}</td>
                      <td className="py-2.5 px-3 text-slate-500">{r.examTitle}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-200">
                        {r.totalObtainedMarks} / {r.totalMaxMarks}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-600">
                        {r.percentage}%
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-purple-600">{r.overallGrade}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'Pass' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredExamResults.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-4 text-center text-slate-400">
                        No academic examination marks records found matching current exam session or class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Report 4: Individual Student Fee Statement Generator */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                    <FileText className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    4. Individual Student Account Ledger &amp; Fee Statement
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate official student-specific financial statement for parent conferences, audit proofs, or clearance certificates
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportSingleStudentStatementPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export Statement PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportSingleStudentStatementCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Student Picker */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Target Student:
                </span>
                <select
                  value={statementStudent?.id || ''}
                  onChange={e => setSelectedStudentForStatement(e.target.value)}
                  className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-hidden cursor-pointer w-full sm:w-72"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.rollNo}) — Class {s.className}
                    </option>
                  ))}
                </select>
              </div>

              {statementStudent && (
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Total Payments:</span>
                    <span className="font-bold text-emerald-600 font-mono ml-1">
                      {statementStudentPayments.length} receipts
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Outstanding Balance:</span>
                    <span className="font-bold text-amber-600 font-mono ml-1">
                      {formatCurrency(statementStudentDues, currencySymbol)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EXECUTIVE VISUAL ANALYTICS & CHARTS                                */}
      {/* ========================================================================= */}
      {activeReportTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Quick Action Bar for Analytics */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Executive Cashflow &amp; P&amp;L Margin Trajectory
              </h3>
              <p className="text-xs text-slate-500">
                Visual analytics and operational performance indicators for selected date window
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportFinancialStatementPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Executive P&amp;L PDF</span>
              </button>
              <button
                type="button"
                onClick={handleExportMasterSummaryCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Summary CSV</span>
              </button>
            </div>
          </div>

          {/* P&L Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Recognized Fee Income
              </p>
              <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
                {formatCurrency(totalIncome, currencySymbol)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{filteredPayments.length} verified receipts</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Operational Expenses
              </p>
              <p className="text-2xl font-black font-mono text-red-600 dark:text-red-400 mt-2">
                {formatCurrency(totalExpense, currencySymbol)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{filteredExpenses.length} expense vouchers</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Net Surplus (P&amp;L Margin)
              </p>
              <p
                className={`text-2xl font-black font-mono mt-2 ${
                  netBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'
                }`}
              >
                {formatCurrency(netBalance, currencySymbol)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {netBalance >= 0 ? 'Surplus Operational Capital' : 'Deficit Cashflow Warning'}
              </p>
            </div>
          </div>

          {/* Row 2: Charts (Income vs Expense & Category Pie) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-0.5">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span>Monthly Cashflow Comparison &amp; Trajectory (Recharts)</span>
                  </h3>
                  <p className="text-xs text-slate-500">Historical revenue vs operating expenditures across current fiscal cycle</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCurrentFinancialReportPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                  title="Download official printable PDF of current financial report"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download as PDF</span>
                </button>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={fiscalYearMonthlyData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <RechartsCartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                    <RechartsXAxis
                      dataKey="month"
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={{ stroke: '#cbd5e1' }}
                    />
                    <RechartsYAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={{ stroke: '#cbd5e1' }}
                      tickFormatter={(val: number) => `${currencySymbol}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }: any) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg text-xs space-y-1 min-w-[190px]">
                              <p className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1">
                                {label}
                              </p>
                              <div className="flex items-center justify-between gap-3 text-emerald-600 font-semibold">
                                <span>Revenue:</span>
                                <span className="font-mono">{formatCurrency(d.revenue, currencySymbol)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-red-600 font-semibold">
                                <span>Expenses:</span>
                                <span className="font-mono">{formatCurrency(d.expenses, currencySymbol)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-indigo-600 font-semibold pt-0.5 border-t border-slate-100 dark:border-slate-800">
                                <span>Surplus:</span>
                                <span className="font-mono">{formatCurrency(d.netSurplus, currencySymbol)}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <RechartsLegend verticalAlign="top" height={32} wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                    <RechartsLine
                      type="monotone"
                      dataKey="revenue"
                      name={`Revenue (${currencySymbol})`}
                      stroke="#10B981"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <RechartsLine
                      type="monotone"
                      dataKey="expenses"
                      name={`Expenses (${currencySymbol})`}
                      stroke="#EF4444"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <RechartsLine
                      type="monotone"
                      dataKey="netSurplus"
                      name={`Net Surplus (${currencySymbol})`}
                      stroke="#6366F1"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={{ r: 2 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                  <PieChart className="w-4 h-4 text-amber-500" />
                  <span>Expenditure Category Distribution</span>
                </h3>
                <p className="text-xs text-slate-500 mb-4">Breakdown for selected timeframe</p>
              </div>
              <div className="h-52 flex items-center justify-center">
                <Doughnut
                  data={expensePieData}
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                />
              </div>
              <p className="text-[10px] text-center text-slate-400">
                Highest expenditure: Faculty Compensation &amp; Campus Utilities
              </p>
            </div>
          </div>

          {/* Row 3: Attendance Trend & Defaulters Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                <UserCheck className="w-4 h-4 text-indigo-500" />
                <span>Attendance Turnout Trends (Staff vs Students)</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">Percentage presence over recent school days</p>
              <div className="h-56">
                <Line
                  data={attendanceComparisonData}
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
                />
              </div>
            </div>

            {/* Defaulter Registry Table */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Defaulter Accounts Registry
                  </h3>
                  <p className="text-xs text-slate-500">Students with current pending balances</p>
                </div>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {defaulters.length} Accounts
                </span>
              </div>

              <div className="overflow-x-auto mt-2 max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-2">Student</th>
                      <th className="py-2 px-2">Class</th>
                      <th className="py-2 px-2 text-right">Pending Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {defaulters.map(({ student, pendingAmount }) => (
                      <tr key={student.id}>
                        <td className="py-2 px-2 font-bold text-slate-900 dark:text-white">
                          {student.fullName}
                        </td>
                        <td className="py-2 px-2 text-slate-500">{student.className}</td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-amber-600">
                          {formatCurrency(pendingAmount, currencySymbol)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MASTER AUDIT & OFFICE COMPATIBILITY SPECIFICATION                    */}
      {/* ========================================================================= */}
      {activeReportTab === 'master' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Master Audit Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-2">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Institutional Regulatory Compliance</span>
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Master School Audit Workbook &amp; All-Data Archive
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  One-click extraction of the complete institution database into multi-tab Microsoft Excel workbooks and RFC-4180 standard CSV files.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportMasterAuditWorkbook}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition active:scale-95 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Master Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportMasterSummaryCSV}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Summary CSV</span>
                </button>
              </div>
            </div>

            {/* Sheets Preview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Sheet 1: Executive Summary</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Institutional parameters, key financial balances, student-teacher ratios, and total receivables.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                  <span>Sheet 2: Fee Collections</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Full verified receipt audit log with student names, classes, payment channels, and receipt IDs.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-600" />
                  <span>Sheet 3: School Expenses</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Operational expenditure line-items, category distributions, beneficiary details, and dates.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Sheet 4: Fee Defaulters</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Delinquent account balances, parent phone numbers, guardian relations, and class assignments.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Sheet 5: Student Directory</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Active roster, roll numbers, birthdates, enrollment statuses, contact emails, and blood groups.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-600" />
                  <span>Sheet 6: Exam Results Ledger</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Standardized test marks, subject percentages, letter grades, class ranks, and attendance turnout.
                </p>
              </div>
            </div>
          </div>

          {/* Standard Office Software Compatibility Specification */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Office Software Compatibility Standards &amp; Encoding Specification
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every exported document from EduLedger conforms to international standards for spreadsheet interchange and document fidelity:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>CSV Spreadsheet Standard (RFC 4180 + UTF-8 BOM)</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Includes byte order mark (<code>\uFEFF</code>) prefixing so that <strong>Microsoft Excel (Windows &amp; Mac)</strong>, <strong>Google Sheets</strong>, <strong>Apple Numbers</strong>, and <strong>LibreOffice Calc</strong> immediately recognize non-ASCII characters without encoding dialogs or corrupted formatting. Double quotes and comma delimiters are strictly escaped.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Official PDF Document Standard (ISO 32000-1)</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Compiled using vector typography and standard A4 dimensions (Landscape for tabular audit ledgers, Portrait for financial statements). Fully printable and compatible with <strong>Adobe Acrobat Reader</strong>, <strong>Foxit</strong>, <strong>Preview (macOS)</strong>, and mobile PDF viewers.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Global External Reporting Modal */}
      <ExternalReportingModal
        isOpen={isExternalReportModalOpen}
        onClose={() => setIsExternalReportModalOpen(false)}
        initialReportType={externalReportInitialType}
        initialClass={selectedClass}
      />
    </div>
  );
};
