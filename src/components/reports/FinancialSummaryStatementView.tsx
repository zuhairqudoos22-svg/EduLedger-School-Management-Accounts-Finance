import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { formatCurrency, formatDate, getTodayDateString } from '../../utils/formatters';
import { exportToCSV, exportToExcel } from '../../utils/exportUtils';
import {
  generateFinancialSummaryStatementPdf,
  FinancialSummaryStatementRow,
  FinancialSummaryStatementTotals,
} from '../../utils/financialPdf';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Printer,
  Calendar,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  Building,
  Eye,
  X,
  CreditCard,
  Layers,
  ChevronRight,
  ShieldCheck,
  Scale,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const FinancialSummaryStatementView: React.FC = () => {
  const { feePayments, expenses, bookSales, settings } = useSchool();

  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'profit' | 'loss'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [drilldownMonth, setDrilldownMonth] = useState<string | null>(null);
  const [isPrintLayoutActive, setIsPrintLayoutActive] = useState<boolean>(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const currencySymbol = settings.currencySymbol || '$';
  const schoolName = settings.schoolName || 'St. Augustine International Academy';
  const academicYear = settings.currentAcademicYear || '2026-2027';

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 4000);
  };

  // Helper to resolve month key and name
  const getMonthKeyAndName = (dateStr?: string, monthForStr?: string): { key: string; name: string; year: string } => {
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

  // Aggregate raw transactions into structured monthly ledger rows
  const monthlyLedgerData = useMemo(() => {
    const map = new Map<
      string,
      {
        monthKey: string;
        monthName: string;
        year: string;
        feeRevenue: number;
        bookshopRevenue: number;
        otherRevenue: number;
        totalRevenue: number;
        staffExpenses: number;
        operationalExpenses: number;
        totalExpenses: number;
        receiptCount: number;
        voucherCount: number;
        payments: typeof feePayments;
        expenseList: typeof expenses;
      }
    >();

    const getOrCreate = (key: string, name: string, year: string) => {
      if (!map.has(key)) {
        map.set(key, {
          monthKey: key,
          monthName: name,
          year,
          feeRevenue: 0,
          bookshopRevenue: 0,
          otherRevenue: 0,
          totalRevenue: 0,
          staffExpenses: 0,
          operationalExpenses: 0,
          totalExpenses: 0,
          receiptCount: 0,
          voucherCount: 0,
          payments: [],
          expenseList: [],
        });
      }
      return map.get(key)!;
    };

    // 1. Ingest Fee Collections
    feePayments.forEach(p => {
      const { key, name, year } = getMonthKeyAndName(p.date, p.monthFor);
      const bucket = getOrCreate(key, name, year);
      const cat = (p.category || '').toLowerCase();
      if (cat.includes('book') || cat.includes('uniform')) {
        bucket.bookshopRevenue += p.totalAmount;
      } else if (cat.includes('other') || cat.includes('donation') || cat.includes('grant') || cat.includes('rental')) {
        bucket.otherRevenue += p.totalAmount;
      } else {
        bucket.feeRevenue += p.totalAmount;
      }
      bucket.totalRevenue += p.totalAmount;
      bucket.receiptCount += 1;
      bucket.payments.push(p);
    });

    // 2. Ingest Bookshop Sales
    (bookSales || []).forEach(b => {
      const { key, name, year } = getMonthKeyAndName(b.timestamp ? b.timestamp.slice(0, 10) : undefined);
      const bucket = getOrCreate(key, name, year);
      bucket.bookshopRevenue += b.totalAmount;
      bucket.totalRevenue += b.totalAmount;
      bucket.receiptCount += 1;
    });

    // 3. Ingest Operational Expenses
    expenses.forEach(e => {
      const { key, name, year } = getMonthKeyAndName(e.date);
      const bucket = getOrCreate(key, name, year);
      const cat = (e.category || '').toLowerCase();
      if (cat.includes('salary') || cat.includes('salaries') || cat.includes('payroll') || cat.includes('staff')) {
        bucket.staffExpenses += e.amount;
      } else {
        bucket.operationalExpenses += e.amount;
      }
      bucket.totalExpenses += e.amount;
      bucket.voucherCount += 1;
      bucket.expenseList.push(e);
    });

    // Sort chronologically ascending
    const sorted = Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    // Calculate Net Profit, Operating Margin, and Cumulative YTD Ledger Balance
    let runningCumulativeBalance = 0;
    const finalRows: (FinancialSummaryStatementRow & {
      payments: typeof feePayments;
      expenseList: typeof expenses;
    })[] = [];

    sorted.forEach(item => {
      const netProfit = item.totalRevenue - item.totalExpenses;
      const marginPercent = item.totalRevenue > 0 ? (netProfit / item.totalRevenue) * 100 : 0;
      runningCumulativeBalance += netProfit;

      finalRows.push({
        monthKey: item.monthKey,
        monthName: item.monthName,
        year: item.year,
        feeRevenue: item.feeRevenue,
        bookshopRevenue: item.bookshopRevenue,
        otherRevenue: item.otherRevenue,
        totalRevenue: item.totalRevenue,
        staffExpenses: item.staffExpenses,
        operationalExpenses: item.operationalExpenses,
        totalExpenses: item.totalExpenses,
        netProfit,
        marginPercent,
        cumulativeBalance: runningCumulativeBalance,
        receiptCount: item.receiptCount,
        voucherCount: item.voucherCount,
        payments: item.payments,
        expenseList: item.expenseList,
      });
    });

    return finalRows;
  }, [feePayments, expenses, bookSales]);

  // Distinct Years for filtering
  const availableYears = useMemo(() => {
    const set = new Set(monthlyLedgerData.map(r => r.year));
    return ['All', ...Array.from(set).sort().reverse()];
  }, [monthlyLedgerData]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return monthlyLedgerData.filter(row => {
      const matchYear = selectedYear === 'All' || row.year === selectedYear;
      const matchStatus =
        selectedStatus === 'all'
          ? true
          : selectedStatus === 'profit'
          ? row.netProfit >= 0
          : row.netProfit < 0;
      const matchSearch =
        searchQuery.trim() === '' ||
        row.monthName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.monthKey.includes(searchQuery);

      return matchYear && matchStatus && matchSearch;
    });
  }, [monthlyLedgerData, selectedYear, selectedStatus, searchQuery]);

  // Overall Statement Totals
  const totals: FinancialSummaryStatementTotals = useMemo(() => {
    const totalRevenue = filteredRows.reduce((s, r) => s + r.totalRevenue, 0);
    const totalExpenses = filteredRows.reduce((s, r) => s + r.totalExpenses, 0);
    const netProfit = totalRevenue - totalExpenses;
    const overallMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const totalReceiptsCount = filteredRows.reduce((s, r) => s + r.receiptCount, 0);
    const totalVouchersCount = filteredRows.reduce((s, r) => s + r.voucherCount, 0);
    const closingCumulativeBalance =
      filteredRows.length > 0 ? filteredRows[filteredRows.length - 1].cumulativeBalance : 0;

    const startMonth = filteredRows.length > 0 ? filteredRows[0].monthName : 'N/A';
    const endMonth = filteredRows.length > 0 ? filteredRows[filteredRows.length - 1].monthName : 'N/A';
    const reportingPeriod = filteredRows.length > 1 ? `${startMonth} – ${endMonth}` : startMonth;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      overallMargin,
      closingCumulativeBalance,
      totalReceiptsCount,
      totalVouchersCount,
      reportingPeriod,
      preparedBy: 'Chief Financial Bursar',
      approvedBy: 'Principal & Governing Board',
    };
  }, [filteredRows]);

  // Performance Highlights
  const performanceStats = useMemo(() => {
    if (filteredRows.length === 0) return { bestMonth: null, worstMonth: null, avgMonthlyNet: 0 };
    const sortedByProfit = [...filteredRows].sort((a, b) => b.netProfit - a.netProfit);
    const bestMonth = sortedByProfit[0];
    const worstMonth = sortedByProfit[sortedByProfit.length - 1];
    const avgMonthlyNet = Math.round(totals.netProfit / filteredRows.length);
    return { bestMonth, worstMonth, avgMonthlyNet };
  }, [filteredRows, totals.netProfit]);

  // Selected Month for Drilldown Inspection
  const drilldownData = useMemo(() => {
    if (!drilldownMonth) return null;
    return monthlyLedgerData.find(r => r.monthKey === drilldownMonth) || null;
  }, [drilldownMonth, monthlyLedgerData]);

  // Chart data
  const chartData = useMemo(() => {
    return filteredRows.map(r => ({
      month: r.monthName.split(' ')[0],
      Revenue: r.totalRevenue,
      Expenses: r.totalExpenses,
      NetProfit: r.netProfit,
    }));
  }, [filteredRows]);

  // Handlers for Export & Print
  const handleDownloadPdf = () => {
    if (filteredRows.length === 0) {
      showNotice('No ledger rows to export.');
      return;
    }
    generateFinancialSummaryStatementPdf(settings, filteredRows, totals);
    showNotice('Downloaded official Financial Summary Statement PDF.');
  };

  const handlePrint = () => {
    if (!isPrintLayoutActive) {
      setIsPrintLayoutActive(true);
      setTimeout(() => {
        document.body.classList.add('print-mode-summary-statement');
        window.print();
        setTimeout(() => {
          document.body.classList.remove('print-mode-summary-statement');
        }, 1200);
      }, 180);
    } else {
      document.body.classList.add('print-mode-summary-statement');
      window.print();
      setTimeout(() => {
        document.body.classList.remove('print-mode-summary-statement');
      }, 1200);
    }
  };

  const handleExportCSV = () => {
    if (filteredRows.length === 0) {
      showNotice('No ledger rows to export.');
      return;
    }

    const rows = filteredRows.map(r => ({
      'Month / Period': r.monthName,
      'Fee Revenue': r.feeRevenue,
      'Bookshop & Other Inflows': r.bookshopRevenue + r.otherRevenue,
      'Gross Total Revenue': r.totalRevenue,
      'Staff Payroll & Salaries': r.staffExpenses,
      'Operating & Maintenance Expenses': r.operationalExpenses,
      'Total Operating Expenditure': r.totalExpenses,
      'Net Profit / Operating Surplus': r.netProfit,
      'Operating Margin (%)': `${r.marginPercent.toFixed(2)}%`,
      'Cumulative Closing Balance': r.cumulativeBalance,
      'Total Receipts Count': r.receiptCount,
      'Total Vouchers Count': r.voucherCount,
    }));

    exportToCSV(`Financial_Summary_Statement_${academicYear}_${totals.reportingPeriod.replace(/[^a-zA-Z0-9]/g, '_')}`, rows);
    showNotice(`Exported ${filteredRows.length} monthly ledger records to CSV.`);
  };

  const handleExportExcel = () => {
    if (filteredRows.length === 0) {
      showNotice('No ledger rows to export.');
      return;
    }

    const rows = filteredRows.map(r => ({
      'Month / Period': r.monthName,
      'Fee Revenue': r.feeRevenue,
      'Bookshop & Other Inflows': r.bookshopRevenue + r.otherRevenue,
      'Gross Total Revenue': r.totalRevenue,
      'Staff Payroll & Salaries': r.staffExpenses,
      'Operating & Maintenance Expenses': r.operationalExpenses,
      'Total Operating Expenditure': r.totalExpenses,
      'Net Profit / Operating Surplus': r.netProfit,
      'Operating Margin (%)': Number(r.marginPercent.toFixed(2)),
      'Cumulative Closing Balance': r.cumulativeBalance,
      'Total Receipts Count': r.receiptCount,
      'Total Vouchers Count': r.voucherCount,
    }));

    exportToExcel(
      `Financial_Summary_Statement_${academicYear}`,
      'Monthly Financial Statement',
      rows
    );
    showNotice(`Exported ${filteredRows.length} monthly ledger records to Excel (.xlsx).`);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {noticeMessage && (
        <div className="print:hidden p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2.5 shadow-lg animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* Top Header & Export Controls */}
      <div className="print:hidden p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Financial Summary Statement
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Monthly Ledger Report
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Consolidated monthly ledger aggregating institutional revenue streams, operational expenditures, and net surplus with cumulative balance audits.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
            title="Download publication-grade Financial Summary Statement as PDF"
          >
            <FileText className="w-4 h-4 text-white" />
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition active:scale-95 cursor-pointer"
            title="Print statement using official institutional layout"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>Print Statement</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
            title="Export monthly summary ledger to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer"
            title="Export standard CSV for external accounting software"
          >
            <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrintLayoutActive(!isPrintLayoutActive)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
              isPrintLayoutActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800'
            }`}
            title="Toggle Formal A4 Print Layout Sheet Preview"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{isPrintLayoutActive ? 'Interactive Mode' : 'Printable Sheet View'}</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE OFFICIAL LETTERHEAD DOCUMENT MODE */}
      {isPrintLayoutActive ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl space-y-8 max-w-6xl mx-auto printable-statement-sheet">
          {/* Printable Header Bar */}
          <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-5 flex items-start justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                {schoolName}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {settings.schoolAddress || '742 Evergreen Boulevard, Springfield, IL 62704'}
              </p>
              <p className="text-xs text-slate-500 font-mono">
                Official Institutional Registry  •  Email: {settings.schoolEmail || 'admin@school.edu'}  •  Tel: {settings.schoolPhone || '+1 (555) 234-5678'}
              </p>
            </div>

            <div className="text-right shrink-0">
              <div className="px-3 py-1 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold uppercase inline-block">
                AUDITED FINANCIAL STATEMENT
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2">
                Session: {academicYear}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                Period: {totals.reportingPeriod}
              </p>
            </div>
          </div>

          {/* Formal Document Title */}
          <div className="text-center py-2 space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Comprehensive Financial Summary Statement &amp; Monthly Ledger
            </h2>
            <p className="text-xs text-slate-500 italic">
              Formal audit ledger of all aggregated monthly fee revenues, ancillary credits, and operational disbursements
            </p>
          </div>

          {/* KPI Snapshot Bar in Print Mode */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Gross Revenue</span>
              <span className="text-lg font-black text-emerald-600 font-mono">
                {formatCurrency(totals.totalRevenue, currencySymbol)}
              </span>
              <span className="text-[10px] text-slate-400 block">{totals.totalReceiptsCount} credits posted</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Expenditures</span>
              <span className="text-lg font-black text-rose-600 font-mono">
                {formatCurrency(totals.totalExpenses, currencySymbol)}
              </span>
              <span className="text-[10px] text-slate-400 block">{totals.totalVouchersCount} vouchers processed</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Net Operating Surplus</span>
              <span className={`text-lg font-black font-mono ${totals.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(totals.netProfit, currencySymbol)}
              </span>
              <span className="text-[10px] text-slate-400 block">{totals.overallMargin.toFixed(1)}% operating margin</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Closing Ledger Position</span>
              <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {formatCurrency(totals.closingCumulativeBalance, currencySymbol)}
              </span>
              <span className="text-[10px] text-slate-400 block">Cumulative YTD position</span>
            </div>
          </div>

          {/* Printable Structured Monthly Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-2.5 px-3">Month / Period</th>
                  <th className="py-2.5 px-3 text-right">Fee Collections</th>
                  <th className="py-2.5 px-3 text-right">Ancillary / Other</th>
                  <th className="py-2.5 px-3 text-right">Total Revenue</th>
                  <th className="py-2.5 px-3 text-right">Staff Payroll</th>
                  <th className="py-2.5 px-3 text-right">Operating Costs</th>
                  <th className="py-2.5 px-3 text-right">Total Expenses</th>
                  <th className="py-2.5 px-3 text-right">Net Profit / (Loss)</th>
                  <th className="py-2.5 px-3 text-center">Margin %</th>
                  <th className="py-2.5 px-3 text-right">Cumulative Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredRows.map((r, idx) => (
                  <tr key={r.monthKey} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{r.monthName}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                      {formatCurrency(r.feeRevenue, currencySymbol)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                      {formatCurrency(r.bookshopRevenue + r.otherRevenue, currencySymbol)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(r.totalRevenue, currencySymbol)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                      {formatCurrency(r.staffExpenses, currencySymbol)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                      {formatCurrency(r.operationalExpenses, currencySymbol)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(r.totalExpenses, currencySymbol)}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${r.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(r.netProfit, currencySymbol)}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                      {r.marginPercent.toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(r.cumulativeBalance, currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-900 dark:border-slate-100">
                  <td className="py-2.5 px-3 uppercase text-slate-900 dark:text-white">GRAND TOTALS</td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {formatCurrency(filteredRows.reduce((s, r) => s + r.feeRevenue, 0), currencySymbol)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {formatCurrency(filteredRows.reduce((s, r) => s + r.bookshopRevenue + r.otherRevenue, 0), currencySymbol)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white">
                    {formatCurrency(totals.totalRevenue, currencySymbol)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {formatCurrency(filteredRows.reduce((s, r) => s + r.staffExpenses, 0), currencySymbol)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {formatCurrency(filteredRows.reduce((s, r) => s + r.operationalExpenses, 0), currencySymbol)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white">
                    {formatCurrency(totals.totalExpenses, currencySymbol)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono ${totals.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(totals.netProfit, currencySymbol)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    {totals.overallMargin.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white">
                    {formatCurrency(totals.closingCumulativeBalance, currencySymbol)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Statutory Signatures */}
          <div className="pt-8 grid grid-cols-3 gap-8 text-center text-xs border-t border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <div className="border-t border-slate-400 pt-2 font-bold text-slate-900 dark:text-white">
                Chief Financial Bursar
              </div>
              <p className="text-[10px] text-slate-500">Accounts &amp; Ledger Certification</p>
              <p className="text-[10px] text-slate-400 font-mono">Date: {formatDate(getTodayDateString())}</p>
            </div>

            <div className="space-y-1">
              <div className="border-t border-slate-400 pt-2 font-bold text-slate-900 dark:text-white">
                Senior Internal Auditor
              </div>
              <p className="text-[10px] text-slate-500">Audit &amp; Reconciliation Verified</p>
              <p className="text-[10px] text-slate-400 font-mono">Status: Verified Approved</p>
            </div>

            <div className="space-y-1">
              <div className="border-t border-slate-400 pt-2 font-bold text-slate-900 dark:text-white">
                Principal &amp; Governing Board
              </div>
              <p className="text-[10px] text-slate-500">Executive Sanction &amp; Seal</p>
              <p className="text-[10px] text-slate-400 font-mono">[ OFFICIAL SEAL REGISTER ]</p>
            </div>
          </div>
        </div>
      ) : (
        /* INTERACTIVE DASHBOARD MODE */
        <>
          {/* Executive KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Gross Revenue</span>
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {formatCurrency(totals.totalRevenue, currencySymbol)}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2">
                <CreditCard className="w-3.5 h-3.5" />
                <span>{totals.totalReceiptsCount} fee &amp; bookstore credits</span>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Expenditures</span>
                <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60">
                  <TrendingDown className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {formatCurrency(totals.totalExpenses, currencySymbol)}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2">
                <Layers className="w-3.5 h-3.5" />
                <span>{totals.totalVouchersCount} expense disbursements</span>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Net Operating Surplus</span>
                <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className={`text-xl sm:text-2xl font-black font-mono ${totals.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatCurrency(totals.netProfit, currencySymbol)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${totals.overallMargin >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                  {totals.overallMargin.toFixed(1)}% Margin
                </span>
                <span className="text-[11px] text-slate-500">Avg {formatCurrency(performanceStats.avgMonthlyNet, currencySymbol)}/mo</span>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Cumulative Position</span>
                <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {formatCurrency(totals.closingCumulativeBalance, currencySymbol)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 truncate">
                {performanceStats.bestMonth ? (
                  <span>Best: <strong>{performanceStats.bestMonth.monthName}</strong></span>
                ) : (
                  <span>Period: {totals.reportingPeriod}</span>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Visual Trend Chart (Recharts) */}
          {chartData.length > 0 && (
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>Month-over-Month Revenue vs. Expenses vs. Net Profit</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Visual comparison of monthly gross fee &amp; sales inflows against operational outflows and resulting net margin
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="w-3 h-3 rounded bg-emerald-500" />
                    Revenue
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                    <span className="w-3 h-3 rounded bg-rose-500" />
                    Expenses
                  </span>
                  <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <span className="w-3 h-3 rounded-full bg-indigo-600" />
                    Net Profit
                  </span>
                </div>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={val => `${currencySymbol}${Math.round(val / 1000)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => formatCurrency(Number(val), currencySymbol)}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '12px',
                        border: 'none',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Revenue" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="Expenses" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    <Line
                      type="monotone"
                      dataKey="NetProfit"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#6366f1' }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter month (e.g. September)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Year Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <Calendar className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 text-xs"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>
                      {y === 'All' ? 'All Fiscal Years' : `Year ${y}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Performance Status Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 text-xs"
                >
                  <option value="all">All Monthly Results</option>
                  <option value="profit">Operating Surplus Only (Profit)</option>
                  <option value="loss">Operating Deficit Only (Loss)</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Showing <strong>{filteredRows.length}</strong> monthly ledger cycles
            </div>
          </div>

          {/* Main Monthly Ledger Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Monthly Ledger Audit Register
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Detailed monthly line-item ledger showing inflows, outflows, operating surplus, and running balances.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Month / Period</th>
                    <th className="py-3 px-4 text-right">Fee Collections</th>
                    <th className="py-3 px-4 text-right">Other &amp; Bookshop</th>
                    <th className="py-3 px-4 text-right">Gross Revenue</th>
                    <th className="py-3 px-4 text-right">Staff Salaries</th>
                    <th className="py-3 px-4 text-right">Operating Costs</th>
                    <th className="py-3 px-4 text-right">Total Expenses</th>
                    <th className="py-3 px-4 text-right">Net Profit / Surplus</th>
                    <th className="py-3 px-4 text-center">Margin</th>
                    <th className="py-3 px-4 text-right">Cumulative Balance</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        No financial records found matching the active criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map(row => (
                      <tr
                        key={row.monthKey}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{row.monthName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                          {formatCurrency(row.feeRevenue, currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                          {formatCurrency(row.bookshopRevenue + row.otherRevenue, currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(row.totalRevenue, currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                          {formatCurrency(row.staffExpenses, currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                          {formatCurrency(row.operationalExpenses, currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(row.totalExpenses, currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold inline-block ${
                              row.netProfit >= 0
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {formatCurrency(row.netProfit, currencySymbol)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs">
                          <span
                            className={
                              row.marginPercent >= 20
                                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                : row.marginPercent > 0
                                ? 'text-slate-700 dark:text-slate-300'
                                : 'text-rose-600 dark:text-rose-400 font-bold'
                            }
                          >
                            {row.marginPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(row.cumulativeBalance, currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setDrilldownMonth(row.monthKey)}
                            className="p-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 transition"
                            title={`Inspect ${row.monthName} breakdown`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Grand Totals Footer */}
                {filteredRows.length > 0 && (
                  <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                    <tr>
                      <td className="py-3 px-4 text-slate-900 dark:text-white uppercase font-black">
                        Total ({filteredRows.length} Months)
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatCurrency(filteredRows.reduce((s, r) => s + r.feeRevenue, 0), currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatCurrency(filteredRows.reduce((s, r) => s + r.bookshopRevenue + r.otherRevenue, 0), currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(totals.totalRevenue, currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatCurrency(filteredRows.reduce((s, r) => s + r.staffExpenses, 0), currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatCurrency(filteredRows.reduce((s, r) => s + r.operationalExpenses, 0), currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                        {formatCurrency(totals.totalExpenses, currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-black inline-block ${
                            totals.netProfit >= 0
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {formatCurrency(totals.netProfit, currencySymbol)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {totals.overallMargin.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                        {formatCurrency(totals.closingCumulativeBalance, currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 text-[11px]">—</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* MONTH DETAIL DRILLDOWN MODAL */}
      {drilldownData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {drilldownData.monthName} — Month Ledger Audit
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Disaggregated line-item analysis of all posted collections and operational vouchers
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrilldownMonth(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Top Monthly Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Gross Revenue</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {formatCurrency(drilldownData.totalRevenue, currencySymbol)}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{drilldownData.receiptCount} receipts</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                  <span className="text-[10px] uppercase font-bold text-rose-600 block">Total Outflows</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {formatCurrency(drilldownData.totalExpenses, currencySymbol)}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{drilldownData.voucherCount} vouchers</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 block">Net Surplus / Margin</span>
                  <span className={`text-base font-black font-mono ${drilldownData.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(drilldownData.netProfit, currencySymbol)}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{drilldownData.marginPercent.toFixed(1)}% margin</span>
                </div>
              </div>

              {/* Inflows breakdown */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Fee Collections &amp; Revenues ({drilldownData.payments.length} transactions)</span>
                </h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 sticky top-0 font-bold">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Student / Payer</th>
                        <th className="py-2 px-3">Receipt #</th>
                        <th className="py-2 px-3">Mode</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {drilldownData.payments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            No receipts recorded for this month.
                          </td>
                        </tr>
                      ) : (
                        drilldownData.payments.slice(0, 50).map(p => (
                          <tr key={p.id}>
                            <td className="py-1.5 px-3">{formatDate(p.date)}</td>
                            <td className="py-1.5 px-3 font-semibold">{p.studentName}</td>
                            <td className="py-1.5 px-3 font-mono text-[10px] text-slate-500">{p.receiptNumber}</td>
                            <td className="py-1.5 px-3">{p.paymentMode}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-600">
                              {formatCurrency(p.totalAmount, currencySymbol)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Outflows breakdown */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                  <span>Operational Vouchers &amp; Salaries ({drilldownData.expenseList.length} items)</span>
                </h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 sticky top-0 font-bold">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Ref #</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {drilldownData.expenseList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            No expense vouchers recorded for this month.
                          </td>
                        </tr>
                      ) : (
                        drilldownData.expenseList.slice(0, 50).map(e => (
                          <tr key={e.id}>
                            <td className="py-1.5 px-3">{formatDate(e.date)}</td>
                            <td className="py-1.5 px-3 font-semibold">{e.title}</td>
                            <td className="py-1.5 px-3">{e.category}</td>
                            <td className="py-1.5 px-3 font-mono text-[10px] text-slate-500">{e.referenceNumber || '—'}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-600">
                              {formatCurrency(e.amount, currencySymbol)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/70 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => setDrilldownMonth(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-bold text-slate-800 dark:text-slate-100 text-xs transition"
              >
                Close Audit Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
