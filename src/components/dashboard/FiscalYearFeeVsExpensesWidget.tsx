import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ReferenceLine,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { useSchool } from '../../context/SchoolContext';
import { FeePayment, Expense, Student, SchoolSettings } from '../../types';
import { formatCurrency, exportToCSV } from '../../utils/formatters';
import { getFiscalFeeVsExpensesSeries } from '../../utils/dashboardMetricsSelector';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  FileSpreadsheet,
  PieChart as PieIcon,
  BarChart3,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Percent,
} from 'lucide-react';

export type FiscalChartMode = 'stackedStatus' | 'areaStream' | 'efficiencyRatios';
export type FiscalTimeframe = 'FULL_FY' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'YTD';

export interface FiscalMonthData {
  monthKey: string; // e.g. "2026-08"
  shortName: string; // e.g. "Aug '26"
  fullName: string; // e.g. "August 2026"
  feesCollected: number; // Actual realized collections
  feesPending: number; // Billed but uncollected/overdue
  totalBilled: number; // feesCollected + feesPending
  expenses: number; // Total operational outflows
  netMargin: number; // feesCollected - expenses
  collectionRate: number; // (feesCollected / totalBilled) * 100
  expenseCoverage: number; // (feesCollected / expenses) * 100
  isProjected: boolean;
}

export interface FiscalYearFeeVsExpensesWidgetProps {
  feePayments?: FeePayment[];
  expenses?: Expense[];
  students?: Student[];
  settings?: SchoolSettings;
  fiscalYear?: string;
}

export const FiscalYearFeeVsExpensesWidget: React.FC<FiscalYearFeeVsExpensesWidgetProps> = ({
  feePayments: propFeePayments,
  expenses: propExpenses,
  students: propStudents,
  settings: propSettings,
  fiscalYear: propFiscalYear,
}) => {
  const context = useSchool();
  const feePayments = propFeePayments || context.feePayments || [];
  const expenses = propExpenses || context.expenses || [];
  const students = propStudents || context.students || [];
  const settings = propSettings || context.settings;
  const setActiveTab = context.setActiveTab;
  const getDefaultersList = context.getDefaultersList;

  const currentFiscalYear = propFiscalYear || settings?.currentAcademicYear || '2026-2027';
  const currencySymbol = settings?.currencySymbol || '$';

  // Interactive View Controls
  const [chartMode, setChartMode] = useState<FiscalChartMode>('stackedStatus');
  const [timeframe, setTimeframe] = useState<FiscalTimeframe>('FULL_FY');
  const [showCollected, setShowCollected] = useState(true);
  const [showPending, setShowPending] = useState(true);
  const [showExpenses, setShowExpenses] = useState(true);
  const [showNetMargin, setShowNetMargin] = useState(true);
  const [showAuditTable, setShowAuditTable] = useState(false);

  // Compute 12 fiscal year months: August 2026 through July 2027
  const fiscalMonths = useMemo(() => {
    const startYearMatch = currentFiscalYear.match(/^(\d{4})/);
    const startYear = startYearMatch ? parseInt(startYearMatch[1], 10) : 2026;

    return [
      { key: `${startYear}-08`, shortName: "Aug '26", fullName: 'August 2026', quarter: 'Q1' },
      { key: `${startYear}-09`, shortName: "Sep '26", fullName: 'September 2026', quarter: 'Q1' },
      { key: `${startYear}-10`, shortName: "Oct '26", fullName: 'October 2026', quarter: 'Q1' },
      { key: `${startYear}-11`, shortName: "Nov '26", fullName: 'November 2026', quarter: 'Q2' },
      { key: `${startYear}-12`, shortName: "Dec '26", fullName: 'December 2026', quarter: 'Q2' },
      { key: `${startYear + 1}-01`, shortName: "Jan '27", fullName: 'January 2027', quarter: 'Q2' },
      { key: `${startYear + 1}-02`, shortName: "Feb '27", fullName: 'February 2027', quarter: 'Q3' },
      { key: `${startYear + 1}-03`, shortName: "Mar '27", fullName: 'March 2027', quarter: 'Q3' },
      { key: `${startYear + 1}-04`, shortName: "Apr '27", fullName: 'April 2027', quarter: 'Q3' },
      { key: `${startYear + 1}-05`, shortName: "May '27", fullName: 'May 2027', quarter: 'Q4' },
      { key: `${startYear + 1}-06`, shortName: "Jun '27", fullName: 'June 2027', quarter: 'Q4' },
      { key: `${startYear + 1}-07`, shortName: "Jul '27", fullName: 'July 2027', quarter: 'Q4' },
    ];
  }, [currentFiscalYear]);

  // Aggregate monthly fee status & expenses across the fiscal year (strictly real records)
  const allFiscalData: FiscalMonthData[] = useMemo(() => {
    const rawMetrics = getFiscalFeeVsExpensesSeries(
      feePayments,
      expenses,
      students,
      context.feeStructures || [],
      currentFiscalYear
    );

    return rawMetrics.map(m => ({
      monthKey: m.monthKey,
      shortName: m.shortName,
      fullName: m.fullName,
      feesCollected: m.feesCollected,
      feesPending: m.feesPending,
      totalBilled: m.totalBilled,
      expenses: m.expenses,
      netMargin: m.netMargin,
      collectionRate: m.collectionRate ?? 0,
      expenseCoverage: m.expenseCoverage ?? 0,
      isProjected: m.isProjected,
    }));
  }, [feePayments, expenses, students, context.feeStructures, currentFiscalYear]);

  // Filter dataset by active timeframe
  const filteredData = useMemo(() => {
    switch (timeframe) {
      case 'Q1':
        return allFiscalData.slice(0, 3); // Aug, Sep, Oct
      case 'Q2':
        return allFiscalData.slice(3, 6); // Nov, Dec, Jan
      case 'Q3':
        return allFiscalData.slice(6, 9); // Feb, Mar, Apr
      case 'Q4':
        return allFiscalData.slice(9, 12); // May, Jun, Jul
      case 'YTD': {
        const todayYm = new Date().toISOString().substring(0, 7);
        const ytd = allFiscalData.filter(d => d.monthKey <= todayYm);
        return ytd.length > 0 ? ytd : allFiscalData.slice(0, 4);
      }
      case 'FULL_FY':
      default:
        return allFiscalData;
    }
  }, [allFiscalData, timeframe]);

  // Overall Financial KPIs for the selected timeframe
  const summaryKPIs = useMemo(() => {
    const totalCollected = filteredData.reduce((acc, d) => acc + d.feesCollected, 0);
    const totalPending = filteredData.reduce((acc, d) => acc + d.feesPending, 0);
    const totalBilled = totalCollected + totalPending;
    const totalExpenses = filteredData.reduce((acc, d) => acc + d.expenses, 0);
    const netSurplus = totalCollected - totalExpenses;
    const overallCollectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;
    const overallExpenseCoverage = totalExpenses > 0 ? Math.round((totalCollected / totalExpenses) * 100) : 0;

    return {
      totalCollected,
      totalPending,
      totalBilled,
      totalExpenses,
      netSurplus,
      overallCollectionRate,
      overallExpenseCoverage,
    };
  }, [filteredData]);

  // Donut distribution data for Fee Status vs Expenses
  const pieDistributionData = useMemo(() => {
    return [
      { name: 'Fees Collected (Realized)', value: summaryKPIs.totalCollected, color: '#10b981' },
      { name: 'Fees Pending / Overdue', value: summaryKPIs.totalPending, color: '#f59e0b' },
      { name: 'Operating Expenses Paid', value: summaryKPIs.totalExpenses, color: '#f43f5e' },
    ];
  }, [summaryKPIs]);

  // Export CSV
  const handleExportCSV = () => {
    const rows: Record<string, unknown>[] = filteredData.map(d => ({
      Month: d.fullName,
      [`Fees Collected (${currencySymbol})`]: d.feesCollected,
      [`Fees Pending (${currencySymbol})`]: d.feesPending,
      [`Total Billed Fees (${currencySymbol})`]: d.totalBilled,
      [`Expenses (${currencySymbol})`]: d.expenses,
      [`Net Margin (${currencySymbol})`]: d.netMargin,
      'Collection Efficiency (%)': `${d.collectionRate}%`,
      'Expense Coverage (%)': `${d.expenseCoverage}%`,
      Status: d.isProjected ? 'Projected' : 'Actuals',
    }));
    exportToCSV(`fiscal_year_fee_status_vs_expenses_${currentFiscalYear}`, rows);
  };

  const isAllEmpty = summaryKPIs.totalCollected === 0 && summaryKPIs.totalPending === 0 && summaryKPIs.totalExpenses === 0;

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      {/* Top Header & Interactive Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                <Receipt className="w-4 h-4" />
              </span>
              <span>Fee Collection Status vs. Operating Expenses</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">·</span>
            <span className="text-xs text-slate-500 font-bold">Recharts Dynamic Engine</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Fiscal Year {currentFiscalYear} cash realization analytics comparing collected fees, pending delinquent balances, and monthly operational expenditures.
          </p>
        </div>

        {/* Dynamic Controls Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chart Display Mode Segmented Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setChartMode('stackedStatus')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                chartMode === 'stackedStatus'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Stacked Fee Status vs Expenses Bar Chart"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Status Bars</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('areaStream')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                chartMode === 'areaStream'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Cash Flow Area Spread"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Cash Flow Area</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('efficiencyRatios')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                chartMode === 'efficiencyRatios'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Collection & Coverage Efficiency Percentages"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Efficiency %</span>
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setTimeframe('FULL_FY')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                timeframe === 'FULL_FY'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Full FY (12M)
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('Q1')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                timeframe === 'Q1'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Q1
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('Q2')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                timeframe === 'Q2'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Q2
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('Q3')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                timeframe === 'Q3'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Q3
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('Q4')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                timeframe === 'Q4'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Q4
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('YTD')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                timeframe === 'YTD'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              YTD
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition shadow-xs cursor-pointer"
            title="Export fiscal fee vs expense dataset as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Financial Status KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Fees Collected (Realized) */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Fees Collected</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-600">
              {summaryKPIs.overallCollectionRate}% Realized
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
            {formatCurrency(summaryKPIs.totalCollected, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Out of {formatCurrency(summaryKPIs.totalBilled, currencySymbol)} total billed fees
          </p>
        </div>

        {/* Metric 2: Pending / Overdue Dues */}
        <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Pending Fee Dues</span>
            </span>
            <span className="text-[11px] font-mono text-amber-600">
              {summaryKPIs.totalBilled > 0 ? `${100 - summaryKPIs.overallCollectionRate}% Unpaid` : '0% Unpaid'}
            </span>
          </div>
          <p className="text-2xl font-black text-amber-900 dark:text-amber-100">
            {formatCurrency(summaryKPIs.totalPending, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Accounts requiring follow-up / reminder notices
          </p>
        </div>

        {/* Metric 3: Total Expenses */}
        <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-300 text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              <span>Operating Expenses</span>
            </span>
            <span className="text-[11px] font-mono text-rose-600">Outflows</span>
          </div>
          <p className="text-2xl font-black text-rose-900 dark:text-rose-100">
            {formatCurrency(summaryKPIs.totalExpenses, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Faculty salaries, facilities, labs &amp; utilities
          </p>
        </div>

        {/* Metric 4: Net Surplus / Cash Recovery */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5">
              {summaryKPIs.netSurplus >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
              )}
              <span>Net Operating Margin</span>
            </span>
            <span
              className={`text-[11px] font-bold ${
                summaryKPIs.netSurplus >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {summaryKPIs.totalExpenses > 0 ? `${summaryKPIs.overallExpenseCoverage}% Coverage` : 'N/A'}
            </span>
          </div>
          <p
            className={`text-2xl font-black ${
              summaryKPIs.netSurplus >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {summaryKPIs.netSurplus >= 0 ? '+' : ''}
            {formatCurrency(summaryKPIs.netSurplus, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Realized cash collections minus total expenses
          </p>
        </div>
      </div>

      {/* Dataset Filter Toggles Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 text-xs pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-semibold mr-1">Visible Series:</span>

          <button
            type="button"
            onClick={() => setShowCollected(!showCollected)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              showCollected
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>Fees Collected</span>
            {showCollected ? <Eye className="w-3 h-3 ml-1" /> : <EyeOff className="w-3 h-3 ml-1" />}
          </button>

          <button
            type="button"
            onClick={() => setShowPending(!showPending)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              showPending
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Pending / Overdue Fees</span>
            {showPending ? <Eye className="w-3 h-3 ml-1" /> : <EyeOff className="w-3 h-3 ml-1" />}
          </button>

          <button
            type="button"
            onClick={() => setShowExpenses(!showExpenses)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              showExpenses
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span>Operating Expenses</span>
            {showExpenses ? <Eye className="w-3 h-3 ml-1" /> : <EyeOff className="w-3 h-3 ml-1" />}
          </button>

          <button
            type="button"
            onClick={() => setShowNetMargin(!showNetMargin)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              showNetMargin
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <span>Net Margin Line</span>
            {showNetMargin ? <Eye className="w-3 h-3 ml-1" /> : <EyeOff className="w-3 h-3 ml-1" />}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAuditTable(!showAuditTable)}
          className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
        >
          <span>{showAuditTable ? 'Hide Audit Table' : 'View Monthly Breakdown Table'}</span>
          {showAuditTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Main Dynamic Recharts Visualization Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Primary Dynamic Recharts Chart (8 cols) */}
        <div className="lg:col-span-8 h-80 sm:h-96 w-full pt-2">
          {isAllEmpty ? (
            <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Receipt className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Financial Transactions Recorded Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                Record a fee payment or operational expense to see your monthly collections, dues, and operating margins.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('fee-collection')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  Collect Fee
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('expenses')}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  Record Expense
                </button>
              </div>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'stackedStatus' ? (
              /* MODE A: Stacked Fee Status (Collected + Pending) vs Operating Expenses Bar Chart */
              <ComposedChart data={filteredData} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="shortName" tick={{ fontSize: 11, fontWeight: 600 }} stroke="#94a3b8" />
                <YAxis
                  yAxisId="currency"
                  tick={{ fontSize: 10, fontWeight: 500 }}
                  stroke="#94a3b8"
                  tickFormatter={val => {
                    if (val >= 1000) return `${currencySymbol}${Math.round(val / 1000)}k`;
                    return `${currencySymbol}${val}`;
                  }}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as FiscalMonthData;
                      return (
                        <div className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-48">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                            <span className="font-bold text-slate-200">{data.fullName}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                              {data.isProjected ? 'Projected' : 'Actuals'}
                            </span>
                          </div>
                          <div className="space-y-1 font-mono text-[11px]">
                            <div className="flex justify-between gap-4 text-emerald-400">
                              <span>Fees Collected:</span>
                              <span className="font-bold">{formatCurrency(data.feesCollected, currencySymbol)}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-amber-400">
                              <span>Pending Dues:</span>
                              <span className="font-bold">{formatCurrency(data.feesPending, currencySymbol)}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-slate-300 border-t border-slate-800 pt-1">
                              <span>Total Billed:</span>
                              <span>{formatCurrency(data.totalBilled, currencySymbol)}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-rose-400">
                              <span>Total Expenses:</span>
                              <span className="font-bold">{formatCurrency(data.expenses, currencySymbol)}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-indigo-400 border-t border-slate-800 pt-1">
                              <span>Net Cash Margin:</span>
                              <span className="font-bold">
                                {data.netMargin >= 0 ? '+' : ''}
                                {formatCurrency(data.netMargin, currencySymbol)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4 text-teal-300 text-[10px] pt-0.5">
                              <span>Realization Rate:</span>
                              <span>{data.collectionRate}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <RechartsLegend verticalAlign="top" height={34} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />

                {/* Stacked Fee Status Bars */}
                {showCollected && (
                  <Bar
                    yAxisId="currency"
                    dataKey="feesCollected"
                    name="Fees Collected"
                    stackId="feeStatus"
                    fill="#10b981"
                    radius={[0, 0, 0, 0]}
                  />
                )}
                {showPending && (
                  <Bar
                    yAxisId="currency"
                    dataKey="feesPending"
                    name="Pending / Overdue Fees"
                    stackId="feeStatus"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                )}

                {/* Operating Expenses Bar */}
                {showExpenses && (
                  <Bar
                    yAxisId="currency"
                    dataKey="expenses"
                    name="Operating Expenses"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                  />
                )}

                {/* Net Margin Line */}
                {showNetMargin && (
                  <Line
                    yAxisId="currency"
                    type="monotone"
                    dataKey="netMargin"
                    name="Net Cash Margin"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 1.5 }}
                    activeDot={{ r: 6 }}
                  />
                )}
                <ReferenceLine yAxisId="currency" y={0} stroke="#94a3b8" strokeDasharray="2 2" />
              </ComposedChart>
            ) : chartMode === 'areaStream' ? (
              /* MODE B: Area Cash Realization Stream */
              <AreaChart data={filteredData} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="shortName" tick={{ fontSize: 11, fontWeight: 600 }} stroke="#94a3b8" />
                <YAxis
                  tick={{ fontSize: 10, fontWeight: 500 }}
                  stroke="#94a3b8"
                  tickFormatter={val => `${currencySymbol}${Math.round(val / 1000)}k`}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as FiscalMonthData;
                      return (
                        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1 border border-slate-700">
                          <p className="font-bold text-slate-200">{data.fullName}</p>
                          <p className="text-emerald-400 font-mono">
                            Collected: {formatCurrency(data.feesCollected, currencySymbol)}
                          </p>
                          <p className="text-rose-400 font-mono">
                            Expenses: {formatCurrency(data.expenses, currencySymbol)}
                          </p>
                          <p className="text-indigo-400 font-mono pt-1 border-t border-slate-800">
                            Net Cash Margin: {data.netMargin >= 0 ? '+' : ''}
                            {formatCurrency(data.netMargin, currencySymbol)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <RechartsLegend verticalAlign="top" height={34} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />

                {showCollected && (
                  <Area
                    type="monotone"
                    dataKey="feesCollected"
                    name="Fees Collected (Cash Inflow)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCollected)"
                  />
                )}
                {showExpenses && (
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Operating Expenses (Cash Outflow)"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorExpenses)"
                  />
                )}
                {showNetMargin && (
                  <Line
                    type="monotone"
                    dataKey="netMargin"
                    name="Net Cash Realization"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#6366f1' }}
                  />
                )}
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              </AreaChart>
            ) : (
              /* MODE C: Efficiency & Coverage Ratios Line Chart */
              <LineChart data={filteredData} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="shortName" tick={{ fontSize: 11, fontWeight: 600 }} stroke="#94a3b8" />
                <YAxis
                  domain={[50, 160]}
                  tick={{ fontSize: 10, fontWeight: 500 }}
                  stroke="#94a3b8"
                  tickFormatter={val => `${val}%`}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as FiscalMonthData;
                      return (
                        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1 border border-slate-700">
                          <p className="font-bold text-slate-200">{data.fullName}</p>
                          <p className="text-emerald-400 font-mono">
                            Fee Collection Rate: {data.collectionRate}%
                          </p>
                          <p className="text-cyan-400 font-mono">
                            Expense Coverage Ratio: {data.expenseCoverage}%
                          </p>
                          <p className="text-amber-300 font-mono text-[10px] pt-1 border-t border-slate-800">
                            Break-even Benchmark: 100%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <RechartsLegend verticalAlign="top" height={34} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                <ReferenceLine
                  y={100}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{ value: '100% Break-Even', position: 'insideTopRight', fill: '#d97706', fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="collectionRate"
                  name="Fee Realization Rate (%)"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981' }}
                />
                <Line
                  type="monotone"
                  dataKey="expenseCoverage"
                  name="Expense Coverage Ratio (%)"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#06b6d4' }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
          )}
        </div>

        {/* Right Column: Recharts Donut & Monthly Waterfall Summary (4 cols) */}
        <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <PieIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Fiscal Fee Status Share</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {summaryKPIs.overallCollectionRate}% Collected
              </span>
            </div>

            {/* Recharts Pie Donut */}
            <div className="h-44 w-full relative flex items-center justify-center">
              {isAllEmpty ? (
                <div className="flex flex-col items-center justify-center text-center p-3">
                  <PieIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1" />
                  <span className="text-xs font-bold text-slate-500">Zero Balances</span>
                  <span className="text-[11px] text-slate-400">All fiscal categories at 0 PKR</span>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieDistributionData.map((entry, index) => (
                          <Cell key={`slice-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0];
                            return (
                              <div className="p-2 bg-slate-900 text-white rounded-lg shadow-md text-xs font-mono">
                                <p className="font-bold">{data.name}</p>
                                <p>{formatCurrency(Number(data.value), currencySymbol)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered Donut Badge */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {summaryKPIs.overallCollectionRate}%
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Realized</span>
                  </div>
                </>
              )}
            </div>

            {/* Donut Legend */}
            <div className="space-y-1.5 text-xs pt-1">
              {pieDistributionData.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 dark:text-slate-400 text-[11px] truncate max-w-44">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">
                    {formatCurrency(item.value, currencySymbol)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Operating Health Summary Banner */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">Recovery Status</span>
              <span className="font-mono font-semibold text-emerald-600">
                {summaryKPIs.overallExpenseCoverage}% Coverage
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              {summaryKPIs.netSurplus >= 0
                ? `Institutional fee collections exceed total operational expenses by ${formatCurrency(summaryKPIs.netSurplus, currencySymbol)}.`
                : `Operational expenditures currently exceed realized fee collections by ${formatCurrency(Math.abs(summaryKPIs.netSurplus), currencySymbol)}. Prioritize fee recovery.`}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Audit Breakdown Table (Collapsible) */}
      {showAuditTable && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Fiscal Month</th>
                  <th className="py-2.5 px-3 text-right">Fees Collected</th>
                  <th className="py-2.5 px-3 text-right">Pending Dues</th>
                  <th className="py-2.5 px-3 text-right">Total Billed</th>
                  <th className="py-2.5 px-3 text-right">Expenses</th>
                  <th className="py-2.5 px-3 text-right">Net Margin</th>
                  <th className="py-2.5 px-3 text-center">Collection %</th>
                  <th className="py-2.5 px-3 text-center">Coverage %</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredData.map(m => (
                  <tr key={m.monthKey} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {m.fullName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(m.feesCollected, currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-600 dark:text-amber-400">
                      {formatCurrency(m.feesPending, currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-600 dark:text-slate-400">
                      {formatCurrency(m.totalBilled, currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                      {formatCurrency(m.expenses, currencySymbol)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold ${
                        m.netMargin >= 0
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {m.netMargin >= 0 ? '+' : ''}
                      {formatCurrency(m.netMargin, currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-teal-600">
                      {m.collectionRate}%
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-cyan-600">
                      {m.expenseCoverage}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.isProjected
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        {m.isProjected ? 'Projected' : 'Actual'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Navigation Jump-Links */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>Synchronized with tuition fee structures &amp; expense journals</span>
        </span>

        {setActiveTab && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('fee-collection')}
              className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Collect Fees →
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={() => setActiveTab('due-fees')}
              className="font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              Pending Dues Registry →
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={() => setActiveTab('expenses')}
              className="font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            >
              Expense Tracker →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
