import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
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
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Wallet,
  Calendar,
  BarChart3,
  Layers,
  Download,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  PlusCircle,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';
import { formatCurrency } from '../../utils/formatters';
import { getMonthlyRevenueExpensesSeries } from '../../utils/dashboardMetricsSelector';

export type TimeframeOption = '6M' | '12M' | 'YTD';
export type ChartDisplayMode = 'groupedBar' | 'areaFlow' | 'netWaterfall';

interface MonthlyCashFlowPoint {
  monthKey: string; // YYYY-MM
  monthName: string; // e.g. "Sep 2026"
  fullName: string; // e.g. "September 2026"
  revenue: number;
  feeRevenue: number;
  otherRevenue: number;
  expenses: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
  profitMargin: number;
  isSurplus: boolean;
  recoveryRatio: number;
}

export const MonthlyRevenueExpensesWidget: React.FC = () => {
  const {
    feePayments,
    expenses,
    bookSales,
    settings,
    setActiveTab,
    getMonthlyStats,
  } = useSchool();

  const monthlyStats = getMonthlyStats();

  const [timeframe, setTimeframe] = useState<TimeframeOption>('6M');
  const [displayMode, setDisplayMode] = useState<ChartDisplayMode>('groupedBar');
  const [showBreakdownTable, setShowBreakdownTable] = useState<boolean>(false);
  const [activeHighlightIndex, setActiveHighlightIndex] = useState<number | string | null>(null);

  const currencySymbol = settings.currencySymbol || '$';

  // Calculate dynamic list of months based on timeframe & actual financial records (zero mock fallbacks)
  const monthlyData = useMemo(() => {
    const series = getMonthlyRevenueExpensesSeries(feePayments, expenses, bookSales || [], timeframe);
    let runningCumulative = 0;

    return series.points.map(pt => {
      runningCumulative += pt.netCashFlow;
      const profitMargin = pt.revenue > 0 ? Math.round((pt.netCashFlow / pt.revenue) * 100 * 10) / 10 : 0;
      const recoveryRatio = pt.expenses > 0 ? Math.round((pt.revenue / pt.expenses) * 100) : (pt.revenue > 0 ? 100 : 0);

      const item: MonthlyCashFlowPoint = {
        monthKey: pt.key,
        monthName: pt.shortName,
        fullName: pt.fullName,
        revenue: pt.revenue,
        feeRevenue: pt.feeRevenue,
        otherRevenue: pt.bookRevenue,
        expenses: pt.expenses,
        netCashFlow: pt.netCashFlow,
        cumulativeCashFlow: runningCumulative,
        profitMargin,
        isSurplus: pt.isSurplus,
        recoveryRatio,
      };

      return item;
    });
  }, [timeframe, feePayments, expenses, bookSales]);

  // Aggregate Key Performance Indicators for the selected timeframe
  const summaryKPIs = useMemo(() => {
    const totalRev = monthlyData.reduce((acc, d) => acc + d.revenue, 0);
    const totalExp = monthlyData.reduce((acc, d) => acc + d.expenses, 0);
    const netTotal = totalRev - totalExp;
    const avgMonthlyRev = totalRev / (monthlyData.length || 1);
    const avgMonthlyExp = totalExp / (monthlyData.length || 1);
    const avgMonthlyNet = netTotal / (monthlyData.length || 1);
    const overallMargin = totalRev > 0 ? Math.round((netTotal / totalRev) * 100 * 10) / 10 : 0;
    const surplusMonthsCount = monthlyData.filter(d => d.isSurplus && (d.revenue > 0 || d.expenses > 0)).length;

    // Latest month snapshot
    const latest = monthlyData[monthlyData.length - 1];
    const prev = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;
    const revenueGrowth = prev && prev.revenue > 0 ? Math.round(((latest.revenue - prev.revenue) / prev.revenue) * 100) : 0;

    return {
      totalRev,
      totalExp,
      netTotal,
      avgMonthlyRev,
      avgMonthlyExp,
      avgMonthlyNet,
      overallMargin,
      surplusMonthsCount,
      totalMonths: monthlyData.length,
      latest,
      revenueGrowth,
    };
  }, [monthlyData]);

  // Export monthly breakdown as CSV
  const handleExportCSV = () => {
    const headers = ['Month', 'Full Name', 'Revenue', 'Expenses', 'Net Cash Flow', 'Margin %', 'Status'];
    const rows = monthlyData.map(d => [
      d.monthName,
      `"${d.fullName}"`,
      d.revenue.toFixed(2),
      d.expenses.toFixed(2),
      d.netCashFlow.toFixed(2),
      `${d.profitMargin}%`,
      d.isSurplus ? 'Surplus' : 'Deficit',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `monthly_revenue_vs_expenses_${timeframe.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-all">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Monthly Revenue vs. Expenses
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Cash Flow Monitor
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time institutional liquidity comparing tuition & auxiliary income against operational expenditure
              </p>
            </div>
          </div>
        </div>

        {/* Control Toolbar: Timeframe + Chart Display Mode + Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Timeframe selector */}
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center text-xs">
            <button
              type="button"
              onClick={() => setTimeframe('6M')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                timeframe === '6M'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              6 Months
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('12M')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                timeframe === '12M'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              12 Months
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('YTD')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                timeframe === 'YTD'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              YTD
            </button>
          </div>

          {/* Chart Display Mode Selector */}
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center text-xs">
            <button
              type="button"
              onClick={() => setDisplayMode('groupedBar')}
              title="Dual Bar Chart with Net Cash Line"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                displayMode === 'groupedBar'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Dual Bar</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('areaFlow')}
              title="Smooth Gradient Area Flow"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                displayMode === 'areaFlow'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Area Flow</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('netWaterfall')}
              title="Net Cash Flow Surplus / Deficit Bars"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                displayMode === 'netWaterfall'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Net Flow</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('fee-collection')}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer ring-1 ring-emerald-400/40"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Collect Fee</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('expenses')}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer ring-1 ring-rose-400/40"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Record Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* Instant Cash Flow KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Revenue */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
            <span>Period Inflows</span>
            <span className="flex items-center text-[10px] text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-3 h-3" />
              {summaryKPIs.revenueGrowth >= 0 ? `+${summaryKPIs.revenueGrowth}%` : `${summaryKPIs.revenueGrowth}%`}
            </span>
          </div>
          <p className="text-lg sm:text-xl font-black font-mono text-emerald-700 dark:text-emerald-300">
            {formatCurrency(summaryKPIs.totalRev, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Avg: <span className="font-mono font-semibold">{formatCurrency(summaryKPIs.avgMonthlyRev, currencySymbol)}</span>/mo
          </p>
        </div>

        {/* KPI 2: Total Operational Expenses */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 space-y-1">
          <div className="flex items-center justify-between text-xs text-rose-800 dark:text-rose-300 font-semibold">
            <span>Operational Burn</span>
            <span className="flex items-center text-[10px] text-rose-600 dark:text-rose-400">
              <ArrowDownRight className="w-3 h-3" />
              Outflows
            </span>
          </div>
          <p className="text-lg sm:text-xl font-black font-mono text-rose-700 dark:text-rose-300">
            {formatCurrency(summaryKPIs.totalExp, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Avg: <span className="font-mono font-semibold">{formatCurrency(summaryKPIs.avgMonthlyExp, currencySymbol)}</span>/mo
          </p>
        </div>

        {/* KPI 3: Net Cash Flow (Surplus / Deficit) */}
        <div
          className={`p-3.5 sm:p-4 rounded-xl border space-y-1 ${
            summaryKPIs.netTotal >= 0
              ? 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40'
              : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={summaryKPIs.netTotal >= 0 ? 'text-indigo-800 dark:text-indigo-300' : 'text-amber-800 dark:text-amber-300'}>
              Net Cash Position
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                summaryKPIs.netTotal >= 0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
              }`}
            >
              {summaryKPIs.netTotal >= 0 ? 'SURPLUS' : 'DEFICIT'}
            </span>
          </div>
          <p
            className={`text-lg sm:text-xl font-black font-mono ${
              summaryKPIs.netTotal >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {summaryKPIs.netTotal >= 0 ? '+' : ''}
            {formatCurrency(summaryKPIs.netTotal, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Net Margin:{' '}
            <span
              className={`font-semibold ${
                summaryKPIs.overallMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {summaryKPIs.overallMargin}%
            </span>
          </p>
        </div>

        {/* KPI 4: Financial Health Score & Ratio */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-semibold">
            <span>Solvency Ratio</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              {summaryKPIs.totalRev === 0 && summaryKPIs.totalExp === 0 ? '0/0 mos' : `${summaryKPIs.surplusMonthsCount}/${summaryKPIs.totalMonths} mos`}
            </span>
          </div>
          <p className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
            {summaryKPIs.totalExp > 0
              ? `${Math.round((summaryKPIs.totalRev / summaryKPIs.totalExp) * 100)}%`
              : (summaryKPIs.totalRev > 0 ? '100%' : 'N/A')}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className={`inline-block w-2 h-2 rounded-full ${summaryKPIs.totalRev > 0 || summaryKPIs.totalExp > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>
              {summaryKPIs.totalExp > 0
                ? `Revenue covers ${(summaryKPIs.totalRev / summaryKPIs.totalExp).toFixed(2)}x cost`
                : (summaryKPIs.totalRev > 0 ? 'No operating costs' : 'No transactions recorded')}
            </span>
          </p>
        </div>
      </div>

      {/* Main Recharts Visualization Viewport */}
      <div className="relative pt-2">
        <div className="h-72 sm:h-80 w-full">
          {summaryKPIs.totalRev === 0 && summaryKPIs.totalExp === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <Wallet className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Monthly Cash Flow Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                Record fee collections or expenses to unlock automated monthly revenue versus expense comparisons and solvency metrics.
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
            {displayMode === 'groupedBar' ? (
              /* DUAL BAR COMPARISON: REVENUE VS EXPENSES + OVERLAID NET FLOW LINE */
              <BarChart
                data={monthlyData}
                margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
                onMouseMove={state => {
                  if (state && state.activeTooltipIndex !== undefined) {
                    setActiveHighlightIndex(state.activeTooltipIndex);
                  }
                }}
                onMouseLeave={() => setActiveHighlightIndex(null)}
              >
                <defs>
                  <linearGradient id="barRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.75} />
                  </linearGradient>
                  <linearGradient id="barExpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.75} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                <XAxis
                  dataKey="monthName"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.4 }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={val => `${currencySymbol}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as MonthlyCashFlowPoint;
                      return (
                        <div className="p-3.5 bg-slate-900 text-white rounded-xl shadow-2xl text-xs space-y-2 border border-slate-700 min-w-[210px] animate-in fade-in duration-150">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                            <span className="font-bold text-slate-100 text-sm">{item.fullName}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                item.isSurplus ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                              }`}
                            >
                              {item.isSurplus ? 'Surplus' : 'Deficit'}
                            </span>
                          </div>
                          <div className="space-y-1 font-mono">
                            <div className="flex items-center justify-between gap-4 text-emerald-400">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span>Total Revenue:</span>
                              </span>
                              <span className="font-bold">{formatCurrency(item.revenue, currencySymbol)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-rose-400">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-400" />
                                <span>Total Expenses:</span>
                              </span>
                              <span className="font-bold">{formatCurrency(item.expenses, currencySymbol)}</span>
                            </div>
                            <div className="pt-1.5 mt-1 border-t border-slate-800 flex items-center justify-between gap-4">
                              <span className="text-slate-300 font-sans">Net Cash Flow:</span>
                              <span
                                className={`font-bold ${
                                  item.isSurplus ? 'text-indigo-300' : 'text-rose-400'
                                }`}
                              >
                                {item.isSurplus ? '+' : ''}
                                {formatCurrency(item.netCashFlow, currencySymbol)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400 font-sans">
                              <span>Operating Margin:</span>
                              <span className="font-semibold text-slate-200">{item.profitMargin}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <RechartsLegend
                  verticalAlign="top"
                  align="right"
                  height={32}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                />
                <Bar
                  dataKey="revenue"
                  name="Monthly Revenue"
                  fill="url(#barRevGrad)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={42}
                />
                <Bar
                  dataKey="expenses"
                  name="Operational Expenses"
                  fill="url(#barExpGrad)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            ) : displayMode === 'areaFlow' ? (
              /* GRADIENT AREA FLOW: REVENUE ENVELOPE VS EXPENSES */
              <AreaChart
                data={monthlyData}
                margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="areaRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="areaExpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                <XAxis
                  dataKey="monthName"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.4 }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={val => `${currencySymbol}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as MonthlyCashFlowPoint;
                      return (
                        <div className="p-3.5 bg-slate-900 text-white rounded-xl shadow-2xl text-xs space-y-1.5 border border-slate-700 min-w-[200px]">
                          <p className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-1">{item.fullName}</p>
                          <div className="flex justify-between gap-4 text-emerald-400 font-mono">
                            <span>Revenue:</span>
                            <span className="font-bold">{formatCurrency(item.revenue, currencySymbol)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-rose-400 font-mono">
                            <span>Expenses:</span>
                            <span className="font-bold">{formatCurrency(item.expenses, currencySymbol)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-indigo-300 font-mono pt-1 border-t border-slate-800">
                            <span>Net Flow:</span>
                            <span className="font-bold">
                              {item.isSurplus ? '+' : ''}
                              {formatCurrency(item.netCashFlow, currencySymbol)}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <RechartsLegend verticalAlign="top" align="right" height={32} wrapperStyle={{ fontSize: '11px' }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Monthly Revenue"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#areaRevGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Operational Expenses"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#areaExpGrad)"
                />
              </AreaChart>
            ) : (
              /* NET WATERFALL: POSITIVE (SURPLUS) / NEGATIVE (DEFICIT) BARS WITH BREAK-EVEN LINE */
              <BarChart
                data={monthlyData}
                margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                <XAxis
                  dataKey="monthName"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.4 }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={val => `${currencySymbol}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} strokeDasharray="2 2" label={{ value: 'Break-Even', position: 'insideTopLeft', fill: '#94a3b8', fontSize: 10 }} />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as MonthlyCashFlowPoint;
                      return (
                        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-[190px]">
                          <p className="font-bold text-slate-100">{item.fullName}</p>
                          <div className="flex justify-between gap-3 text-slate-300">
                            <span>Status:</span>
                            <span className={item.isSurplus ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {item.isSurplus ? 'Cash Surplus' : 'Operating Deficit'}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3 font-mono">
                            <span>Net Flow:</span>
                            <span className={`font-bold ${item.isSurplus ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {item.isSurplus ? '+' : ''}
                              {formatCurrency(item.netCashFlow, currencySymbol)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
                            <span>Rev: {formatCurrency(item.revenue, currencySymbol)}</span>
                            <span>Exp: {formatCurrency(item.expenses, currencySymbol)}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="netCashFlow" name="Net Cash Surplus / (Deficit)" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {monthlyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.netCashFlow >= 0 ? '#10b981' : '#f43f5e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
      </div>

      {/* Footer Strip: Expandable Monthly Cashflow Ledger & Report CTA */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowBreakdownTable(!showBreakdownTable)}
            className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
          >
            <span>{showBreakdownTable ? 'Hide Monthly Table' : 'Show Monthly Breakdown Table'}</span>
            {showBreakdownTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
            title="Download cashflow figures as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px]">Need in-depth auditing?</span>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>Full Profit &amp; Loss Report</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Collapsible Monthly Ledger Table */}
      {showBreakdownTable && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Month</th>
                <th className="py-2.5 px-3 text-right">Revenue</th>
                <th className="py-2.5 px-3 text-right">Expenses</th>
                <th className="py-2.5 px-3 text-right">Net Cash Flow</th>
                <th className="py-2.5 px-3 text-center">Margin</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {monthlyData.map(d => (
                <tr key={d.monthKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <td className="py-2.5 px-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                    {d.fullName}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(d.revenue, currencySymbol)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(d.expenses, currencySymbol)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-black ${
                      d.isSurplus ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {d.isSurplus ? '+' : ''}
                    {formatCurrency(d.netCashFlow, currencySymbol)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans text-slate-600 dark:text-slate-400">
                    {d.profitMargin}%
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        d.isSurplus
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {d.isSurplus ? 'Surplus' : 'Deficit'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
