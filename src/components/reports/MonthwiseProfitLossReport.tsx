import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV, exportToExcel, formatMonthwiseProfitLossForExport } from '../../utils/exportUtils';
import { generateMonthwiseProfitLossPdf, MonthlyProfitLossPdfRow } from '../../utils/financialPdf';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Printer,
  Calendar,
  Filter,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Eye,
  X,
  CreditCard,
  Users,
  Search,
  Sparkles,
  BarChart3,
  Building,
} from 'lucide-react';
import '../../utils/chartSetup';
import { Bar } from 'react-chartjs-2';
import { ExternalReportingModal } from './ExternalReportingModal';

export const MonthwiseProfitLossReport: React.FC = () => {
  const { feePayments, expenses, bookSales, settings } = useSchool();

  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'profit' | 'loss'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [drilldownMonth, setDrilldownMonth] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isExternalModalOpen, setIsExternalModalOpen] = useState<boolean>(false);

  const currencySymbol = settings.currencySymbol || '$';

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 4000);
  };

  // Helper to extract YYYY-MM key and formatted Month Name
  const getMonthInfo = (dateStr?: string, monthForStr?: string): { key: string; name: string; year: string } => {
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

  // Aggregate monthly data
  const monthlyDataMap = useMemo(() => {
    const map = new Map<
      string,
      {
        monthKey: string;
        monthName: string;
        year: string;
        feeInflows: number;
        bookshopInflows: number;
        otherInflows: number;
        feePaymentsList: typeof feePayments;
        staffExpenses: number;
        utilityExpenses: number;
        maintenanceExpenses: number;
        suppliesExpenses: number;
        otherExpenses: number;
        expensesList: typeof expenses;
      }
    >();

    const getOrCreate = (key: string, name: string, year: string) => {
      if (!map.has(key)) {
        map.set(key, {
          monthKey: key,
          monthName: name,
          year,
          feeInflows: 0,
          bookshopInflows: 0,
          otherInflows: 0,
          feePaymentsList: [],
          staffExpenses: 0,
          utilityExpenses: 0,
          maintenanceExpenses: 0,
          suppliesExpenses: 0,
          otherExpenses: 0,
          expensesList: [],
        });
      }
      return map.get(key)!;
    };

    // 1. Fee Payments
    feePayments.forEach(p => {
      const { key, name, year } = getMonthInfo(p.date, p.monthFor);
      const entry = getOrCreate(key, name, year);
      entry.feeInflows += p.totalAmount;
      entry.feePaymentsList.push(p);
    });

    // 2. Bookshop Sales (Auxiliary Inflows)
    (bookSales || []).forEach(s => {
      const { key, name, year } = getMonthInfo(s.timestamp || s.date);
      const entry = getOrCreate(key, name, year);
      entry.bookshopInflows += s.totalAmount;
    });

    // 3. Operational Expenses
    expenses.forEach(e => {
      const { key, name, year } = getMonthInfo(e.date, e.monthForSalary);
      const entry = getOrCreate(key, name, year);
      entry.expensesList.push(e);

      const catLower = (e.category || '').toLowerCase();
      if (catLower.includes('salary') || catLower.includes('payroll') || catLower.includes('staff')) {
        entry.staffExpenses += e.amount;
      } else if (catLower.includes('util') || catLower.includes('electric') || catLower.includes('water') || catLower.includes('internet')) {
        entry.utilityExpenses += e.amount;
      } else if (catLower.includes('maint') || catLower.includes('repair') || catLower.includes('facility')) {
        entry.maintenanceExpenses += e.amount;
      } else if (catLower.includes('suppl') || catLower.includes('book') || catLower.includes('stationery') || catLower.includes('lab')) {
        entry.suppliesExpenses += e.amount;
      } else {
        entry.otherExpenses += e.amount;
      }
    });

    return map;
  }, [feePayments, expenses, bookSales]);

  // Distinct Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    monthlyDataMap.forEach(item => {
      if (item.year) years.add(item.year);
    });
    return Array.from(years).sort().reverse();
  }, [monthlyDataMap]);

  // Computed and Sorted Monthly Rows
  const sortedMonthlyRows: MonthlyProfitLossPdfRow[] = useMemo(() => {
    const list: MonthlyProfitLossPdfRow[] = [];

    monthlyDataMap.forEach(item => {
      // Filter year
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

      // Status filter
      if (selectedStatus === 'profit' && status !== 'profit') return;
      if (selectedStatus === 'loss' && status !== 'loss') return;

      // Search filter
      if (searchQuery.trim() && !item.monthName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }

      list.push({
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

    // Chronological order (most recent first)
    return list.sort((a, b) => b.monthName.localeCompare(a.monthName));
  }, [monthlyDataMap, selectedYear, selectedStatus, searchQuery]);

  // Overall Totals
  const totals = useMemo(() => {
    const totalRevenue = sortedMonthlyRows.reduce((s, r) => s + r.totalInflow, 0);
    const totalExpenditure = sortedMonthlyRows.reduce((s, r) => s + r.totalExpense, 0);
    const netProfit = totalRevenue - totalExpenditure;
    const overallMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const profitableMonths = sortedMonthlyRows.filter(r => r.status === 'profit').length;
    const deficitMonths = sortedMonthlyRows.filter(r => r.status === 'loss').length;
    const avgMonthlyProfit = sortedMonthlyRows.length > 0 ? netProfit / sortedMonthlyRows.length : 0;

    let bestMonth = sortedMonthlyRows[0];
    let worstMonth = sortedMonthlyRows[0];
    sortedMonthlyRows.forEach(r => {
      if (!bestMonth || r.netProfit > bestMonth.netProfit) bestMonth = r;
      if (!worstMonth || r.netProfit < worstMonth.netProfit) worstMonth = r;
    });

    return {
      totalRevenue,
      totalExpenditure,
      netProfit,
      overallMargin,
      profitableMonths,
      deficitMonths,
      avgMonthlyProfit,
      bestMonth,
      worstMonth,
      reportingPeriod:
        selectedYear === 'All'
          ? 'Multi-Year Consolidated'
          : `Calendar Year ${selectedYear} (${sortedMonthlyRows.length} active periods)`,
    };
  }, [sortedMonthlyRows, selectedYear]);

  // Chart data (chronological from oldest to newest)
  const chartRows = useMemo(() => {
    return [...sortedMonthlyRows].reverse();
  }, [sortedMonthlyRows]);

  const barChartData = {
    labels: chartRows.map(r => r.monthName.replace(/\s\d{4}$/, '')),
    datasets: [
      {
        label: `Gross Inflows (${currencySymbol})`,
        data: chartRows.map(r => r.totalInflow),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderRadius: 8,
      },
      {
        label: `Operating Costs (${currencySymbol})`,
        data: chartRows.map(r => r.totalExpense),
        backgroundColor: 'rgba(239, 68, 68, 0.85)',
        borderRadius: 8,
      },
      {
        label: `Net Surplus (${currencySymbol})`,
        data: chartRows.map(r => r.netProfit),
        backgroundColor: 'rgba(99, 102, 241, 0.85)',
        borderRadius: 8,
      },
    ],
  };

  // Export PDF
  const handleExportPDF = () => {
    if (sortedMonthlyRows.length === 0) {
      showNotice('No monthly financial records found to export.');
      return;
    }
    generateMonthwiseProfitLossPdf(settings, sortedMonthlyRows, {
      totalRevenue: totals.totalRevenue,
      totalExpenditure: totals.totalExpenditure,
      netProfit: totals.netProfit,
      overallMargin: totals.overallMargin,
      reportingPeriod: totals.reportingPeriod,
    });
    showNotice(`Downloaded Official Month-wise Profit & Loss PDF Report (${sortedMonthlyRows.length} months).`);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (sortedMonthlyRows.length === 0) {
      showNotice('No monthly financial records found to export.');
      return;
    }
    const rows = formatMonthwiseProfitLossForExport(sortedMonthlyRows, currencySymbol);
    exportToCSV(`EduLedger_Monthwise_Profit_Loss_${selectedYear}`, rows);
    showNotice(`Exported ${sortedMonthlyRows.length} months of P&L ledger data to CSV.`);
  };

  // Export Excel
  const handleExportExcel = () => {
    if (sortedMonthlyRows.length === 0) {
      showNotice('No monthly records found to export.');
      return;
    }
    const rows = formatMonthwiseProfitLossForExport(sortedMonthlyRows, currencySymbol);
    exportToExcel(`EduLedger_Monthwise_Profit_Loss_${selectedYear}`, 'Profit and Loss', rows);
    showNotice(`Exported ${sortedMonthlyRows.length} months of P&L ledger data to Excel (.xlsx).`);
  };

  // Selected drilldown data
  const selectedDrilldownEntry = useMemo(() => {
    if (!drilldownMonth) return null;
    for (const [_, val] of monthlyDataMap.entries()) {
      if (val.monthName === drilldownMonth) return val;
    }
    return null;
  }, [drilldownMonth, monthlyDataMap]);

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
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Month-wise Institutional Profit &amp; Loss Report</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Audit Grade
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monthly comparative income schedule, operating disbursement heads, net surplus margin, and annual trajectory
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsExternalModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
            title="Export Monthly Profit & Loss statement formatted for external authorities and auditors as PDF or CSV"
          >
            <Building className="w-4 h-4 text-white" />
            <span>External Reporting Export (PDF/CSV)</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
            title="Download Official Landscape A4 Month-wise P&L Statement with sign-off blocks"
          >
            <FileText className="w-4 h-4" />
            <span>Download P&amp;L PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
            title="Export Month-wise Profit & Loss workbook to Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer"
            title="Export CSV with UTF-8 BOM"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition active:scale-95 cursor-pointer"
            title="Print statement"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Inflows / Revenue
            </span>
            <span className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {formatCurrency(totals.totalRevenue, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
            <span>Across {sortedMonthlyRows.length} accounting months</span>
          </p>
        </div>

        {/* Operating Costs */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Operating Expenditures
            </span>
            <span className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-red-600 dark:text-red-400 mt-2">
            {formatCurrency(totals.totalExpenditure, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-slate-400">Payroll, utilities &amp; facilities</span>
          </p>
        </div>

        {/* Net Operating Surplus */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Net Operating Profit / Surplus
            </span>
            <span
              className={`p-1.5 rounded-xl ${
                totals.netProfit >= 0
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600'
                  : 'bg-red-50 dark:bg-red-950/50 text-red-600'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <p
            className={`text-2xl font-black font-mono mt-2 ${
              totals.netProfit >= 0
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {totals.netProfit >= 0 ? '+' : ''}
            {formatCurrency(totals.netProfit, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Operating Margin:{' '}
            <strong
              className={`font-mono ${
                totals.overallMargin >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {totals.overallMargin >= 0 ? '+' : ''}
              {totals.overallMargin.toFixed(1)}%
            </strong>
          </p>
        </div>

        {/* Month Run-rate & Health */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Monthly Run-Rate
            </span>
            <span className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mt-2">
            {formatCurrency(totals.avgMonthlyProfit, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            <strong className="text-emerald-600">{totals.profitableMonths}</strong> surplus months •{' '}
            <strong className="text-red-600">{totals.deficitMonths}</strong> deficit
          </p>
        </div>
      </div>

      {/* Filter and Query Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>P&amp;L Filters:</span>
          </span>

          {/* Year Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 font-medium">Year:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Years</option>
              {availableYears.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 font-medium">Position:</span>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as any)}
              className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Positions</option>
              <option value="profit">Surplus / Profit Months</option>
              <option value="loss">Deficit / Loss Months</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search month name (e.g., September)..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Visual Comparative Chart */}
      {sortedMonthlyRows.length > 0 && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <span>Monthly Cashflow Comparison &amp; Operating Trajectory</span>
              </h3>
              <p className="text-xs text-slate-500">
                Visual juxtaposition of recognized revenue vs operational overheads across months
              </p>
            </div>
            {totals.bestMonth && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Peak Surplus Month: <strong>{totals.bestMonth.monthName}</strong> (+
                {formatCurrency(totals.bestMonth.netProfit, currencySymbol)})
              </span>
            )}
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <Bar
              data={barChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } },
                  },
                },
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: 'rgba(200, 200, 200, 0.15)' } },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Month-by-Month Tabular Matrix */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Institutional Month-by-Month Profit &amp; Loss Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Detailed chronological statement with category breakdowns and operating margins
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {sortedMonthlyRows.length} Month Periods
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3.5">Month / Period</th>
                <th className="py-3 px-3 text-right">Fee Inflows</th>
                <th className="py-3 px-3 text-right">Aux &amp; Bookshop</th>
                <th className="py-3 px-3.5 text-right font-black text-emerald-600">
                  Gross Revenue
                </th>
                <th className="py-3 px-3 text-right">Staff Payroll</th>
                <th className="py-3 px-3 text-right">Utilities &amp; Ops</th>
                <th className="py-3 px-3 text-right">Maintenance &amp; Supp.</th>
                <th className="py-3 px-3.5 text-right font-black text-red-600">Total Costs</th>
                <th className="py-3 px-3.5 text-right">Net Profit / Loss</th>
                <th className="py-3 px-3 text-right">Margin %</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedMonthlyRows.map((row, idx) => (
                <tr
                  key={row.monthName}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition group"
                >
                  <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>{row.monthName}</span>
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                    {formatCurrency(row.feeInflows, currencySymbol)}
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-slate-500">
                    {formatCurrency(row.bookshopInflows + row.otherInflows, currencySymbol)}
                  </td>

                  <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(row.totalInflow, currencySymbol)}
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                    {formatCurrency(row.staffExpenses, currencySymbol)}
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-slate-500">
                    {formatCurrency(row.utilityExpenses, currencySymbol)}
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-slate-500">
                    {formatCurrency(
                      row.maintenanceExpenses + row.suppliesExpenses + row.otherExpenses,
                      currencySymbol
                    )}
                  </td>

                  <td className="py-3 px-3.5 text-right font-mono font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(row.totalExpense, currencySymbol)}
                  </td>

                  <td className="py-3 px-3.5 text-right font-mono font-black">
                    <span
                      className={
                        row.netProfit >= 0
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {row.netProfit >= 0 ? '+' : ''}
                      {formatCurrency(row.netProfit, currencySymbol)}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold">
                    <span
                      className={
                        row.profitMargin >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-500'
                      }
                    >
                      {row.profitMargin >= 0 ? '+' : ''}
                      {row.profitMargin.toFixed(1)}%
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                        row.status === 'profit'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : row.status === 'loss'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {row.status === 'profit'
                        ? 'SURPLUS'
                        : row.status === 'loss'
                        ? 'DEFICIT'
                        : 'BALANCED'}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => setDrilldownMonth(row.monthName)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-indigo-600 dark:text-slate-200 transition cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}

              {sortedMonthlyRows.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    No financial records found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Grand Totals Footer */}
            {sortedMonthlyRows.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-bold text-xs">
                <tr>
                  <td className="py-3.5 px-3.5 font-black uppercase tracking-wider">
                    Consolidated Totals
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono">
                    {formatCurrency(
                      sortedMonthlyRows.reduce((s, r) => s + r.feeInflows, 0),
                      currencySymbol
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono">
                    {formatCurrency(
                      sortedMonthlyRows.reduce(
                        (s, r) => s + (r.bookshopInflows + r.otherInflows),
                        0
                      ),
                      currencySymbol
                    )}
                  </td>
                  <td className="py-3.5 px-3.5 text-right font-mono font-black text-emerald-400">
                    {formatCurrency(totals.totalRevenue, currencySymbol)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono">
                    {formatCurrency(
                      sortedMonthlyRows.reduce((s, r) => s + r.staffExpenses, 0),
                      currencySymbol
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono">
                    {formatCurrency(
                      sortedMonthlyRows.reduce((s, r) => s + r.utilityExpenses, 0),
                      currencySymbol
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono">
                    {formatCurrency(
                      sortedMonthlyRows.reduce(
                        (s, r) =>
                          s + (r.maintenanceExpenses + r.suppliesExpenses + r.otherExpenses),
                        0
                      ),
                      currencySymbol
                    )}
                  </td>
                  <td className="py-3.5 px-3.5 text-right font-mono font-black text-rose-300">
                    {formatCurrency(totals.totalExpenditure, currencySymbol)}
                  </td>
                  <td className="py-3.5 px-3.5 text-right font-mono font-black">
                    <span
                      className={
                        totals.netProfit >= 0 ? 'text-indigo-300' : 'text-red-400'
                      }
                    >
                      {totals.netProfit >= 0 ? '+' : ''}
                      {formatCurrency(totals.netProfit, currencySymbol)}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-black">
                    {totals.overallMargin >= 0 ? '+' : ''}
                    {totals.overallMargin.toFixed(1)}%
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-black">
                      {totals.netProfit >= 0 ? 'NET SURPLUS' : 'NET DEFICIT'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Drill-down Transaction Modal */}
      {drilldownMonth && selectedDrilldownEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Financial Drill-down: {selectedDrilldownEntry.monthName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Underlying receipt entries and operating disbursements for this accounting period
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrilldownMonth(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics for the Month */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Fee Collections
                </span>
                <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(selectedDrilldownEntry.feeInflows, currencySymbol)}
                </p>
                <p className="text-[11px] text-emerald-700/80 mt-0.5">
                  {selectedDrilldownEntry.feePaymentsList.length} verified receipts
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Total Disbursements
                </span>
                <p className="text-lg font-black font-mono text-red-600 dark:text-red-400 mt-1">
                  {formatCurrency(
                    selectedDrilldownEntry.staffExpenses +
                      selectedDrilldownEntry.utilityExpenses +
                      selectedDrilldownEntry.maintenanceExpenses +
                      selectedDrilldownEntry.suppliesExpenses +
                      selectedDrilldownEntry.otherExpenses,
                    currencySymbol
                  )}
                </p>
                <p className="text-[11px] text-rose-700/80 mt-0.5">
                  {selectedDrilldownEntry.expensesList.length} expense vouchers
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Net Period Surplus
                </span>
                <p className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                  {formatCurrency(
                    selectedDrilldownEntry.feeInflows -
                      (selectedDrilldownEntry.staffExpenses +
                        selectedDrilldownEntry.utilityExpenses +
                        selectedDrilldownEntry.maintenanceExpenses +
                        selectedDrilldownEntry.suppliesExpenses +
                        selectedDrilldownEntry.otherExpenses),
                    currencySymbol
                  )}
                </p>
                <p className="text-[11px] text-indigo-700/80 mt-0.5">Retained Operating Margin</p>
              </div>
            </div>

            {/* Fee Receipts Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Recognized Fee Receipts ({selectedDrilldownEntry.feePaymentsList.length})
              </h4>
              <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="py-2 px-3">Receipt #</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Student Name</th>
                      <th className="py-2 px-3">Class</th>
                      <th className="py-2 px-3">Mode</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedDrilldownEntry.feePaymentsList.slice(0, 15).map(p => (
                      <tr key={p.id}>
                        <td className="py-2 px-3 font-mono font-bold text-slate-600 dark:text-slate-300">
                          {p.receiptNumber}
                        </td>
                        <td className="py-2 px-3 text-slate-500">{p.date}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                          {p.studentName}
                        </td>
                        <td className="py-2 px-3 text-slate-500">{p.className}</td>
                        <td className="py-2 px-3 text-slate-500">{p.paymentMode}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          {formatCurrency(p.totalAmount, currencySymbol)}
                        </td>
                      </tr>
                    ))}
                    {selectedDrilldownEntry.feePaymentsList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-3 text-center text-slate-400">
                          No direct fee receipts recorded for this month.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expenses Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Operational Expense Vouchers ({selectedDrilldownEntry.expensesList.length})
              </h4>
              <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Description / Title</th>
                      <th className="py-2 px-3">Beneficiary</th>
                      <th className="py-2 px-3 text-right">Disbursed Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedDrilldownEntry.expensesList.map(e => (
                      <tr key={e.id}>
                        <td className="py-2 px-3 text-slate-500">{e.date}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                            {e.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                          {e.title}
                        </td>
                        <td className="py-2 px-3 text-slate-500">{e.staffName || 'Vendor/School'}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-red-600">
                          {formatCurrency(e.amount, currencySymbol)}
                        </td>
                      </tr>
                    ))}
                    {selectedDrilldownEntry.expensesList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-3 text-center text-slate-400">
                          No expenses recorded for this month.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDrilldownMonth(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition cursor-pointer"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* External Reporting Modal */}
      <ExternalReportingModal
        isOpen={isExternalModalOpen}
        onClose={() => setIsExternalModalOpen(false)}
        initialReportType="profit_loss"
        initialYear={selectedYear}
      />
    </div>
  );
};
