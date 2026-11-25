import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Percent,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Download,
  BarChart2,
  Table as TableIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Expense, ExpenseCategory, SchoolSettings } from '../../types';
import { formatCurrency, exportToCSV, getTodayDateString } from '../../utils/formatters';
import {
  DateRange,
  DateRangePreset,
  calculateDateRange,
  formatDateRangeDisplay,
  getMonthsInDateRange,
} from '../../utils/dateRangeUtils';
import { DateRangePicker } from '../common/DateRangePicker';

interface MonthlyExpenseTrendChartProps {
  expenses: Expense[];
  settings: SchoolSettings;
  categories: ExpenseCategory[];
  activeCategoryFilter?: string;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
}

export type ChartMetricMode = 'amount_only' | 'mom_rate' | 'with_volume' | 'table';

interface MonthlyTrendPoint {
  monthKey: string; // YYYY-MM
  shortName: string; // "Sep '26"
  fullName: string; // "September 2026"
  year: number;
  monthIndex: number; // 0-11
  amount: number;
  count: number;
  averageVoucher: number;
  topCategory: string;
  topCategoryAmount: number;
  previousMonthAmount: number | null;
  momChangeAmount: number | null;
  momChangePercent: number | null;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const MonthlyExpenseTrendChart: React.FC<MonthlyExpenseTrendChartProps> = ({
  expenses,
  settings,
  categories,
  activeCategoryFilter,
  dateRange: controlledDateRange,
  onDateRangeChange,
}) => {
  // If no external date range is supplied, default to 'last_3_months'
  const [internalDateRange, setInternalDateRange] = useState<DateRange>(() =>
    calculateDateRange('last_3_months', settings.currentAcademicYear)
  );

  const activeDateRange = controlledDateRange || internalDateRange;

  const handleRangeUpdate = (newRange: DateRange) => {
    if (onDateRangeChange) {
      onDateRangeChange(newRange);
    } else {
      setInternalDateRange(newRange);
    }
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [metricMode, setMetricMode] = useState<ChartMetricMode>('amount_only');
  const [showAverageLine, setShowAverageLine] = useState<boolean>(true);

  // Synchronize internal category selection if activeCategoryFilter is passed from parent and changed
  React.useEffect(() => {
    if (activeCategoryFilter !== undefined) {
      setSelectedCategory(activeCategoryFilter);
    }
  }, [activeCategoryFilter]);

  // Generate continuous monthly dataset dynamically based on activeDateRange and selectedCategory
  const trendData = useMemo(() => {
    // 0. Build an all-time monthly map for category to support accurate MoM calculation on initial months
    const allMonthlyMap = new Map<string, number>();
    for (const exp of expenses) {
      if (!exp.date) continue;
      if (selectedCategory !== 'All' && exp.category !== selectedCategory) continue;
      const parts = exp.date.split('-');
      if (parts.length >= 2) {
        const key = `${parts[0]}-${parts[1].padStart(2, '0')}`;
        allMonthlyMap.set(key, (allMonthlyMap.get(key) || 0) + (exp.amount || 0));
      }
    }

    // 1. Filter expenses by category and date range boundaries
    const filtered = expenses.filter(e => {
      if (!e.date) return false;
      const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
      const matchesDate =
        activeDateRange.preset === 'all' ||
        ((!activeDateRange.startDate || e.date >= activeDateRange.startDate) &&
          (!activeDateRange.endDate || e.date <= activeDateRange.endDate));

      return matchesCategory && matchesDate;
    });

    // 2. Group filtered expenses by YYYY-MM
    const monthlyMap = new Map<
      string,
      {
        total: number;
        count: number;
        categoriesMap: Record<string, number>;
      }
    >();

    for (const exp of filtered) {
      const parts = exp.date.split('-');
      if (parts.length >= 2) {
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const key = `${year}-${month}`;

        if (!monthlyMap.has(key)) {
          monthlyMap.set(key, { total: 0, count: 0, categoriesMap: {} });
        }
        const data = monthlyMap.get(key)!;
        data.total += exp.amount || 0;
        data.count += 1;
        data.categoriesMap[exp.category] = (data.categoriesMap[exp.category] || 0) + (exp.amount || 0);
      }
    }

    // 3. Determine target timeline months based on activeDateRange
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed: 9 for October

    let targetMonths: { year: number; month: number; key: string }[] = [];

    if (activeDateRange.preset === 'last_3_months') {
      // Exactly the last 3 months
      for (let i = 2; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        targetMonths.push({ year: y, month: m, key });
      }
    } else if (activeDateRange.preset === 'this_academic_year') {
      // All 12 months of the Academic Year (July to June)
      if (activeDateRange.startDate && activeDateRange.endDate) {
        targetMonths = getMonthsInDateRange(activeDateRange.startDate, activeDateRange.endDate);
      } else {
        // Fallback for academic year
        const startYear = currentYear;
        const endYear = currentYear + 1;
        targetMonths = getMonthsInDateRange(`${startYear}-07-01`, `${endYear}-06-30`);
      }
    } else if (activeDateRange.preset === 'this_month') {
      // Current month plus previous 2 months for trend trajectory context
      for (let i = 2; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        targetMonths.push({ year: y, month: m, key });
      }
    } else if (activeDateRange.preset === 'last_month') {
      // Last month plus preceding 2 months
      for (let i = 3; i >= 1; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        targetMonths.push({ year: y, month: m, key });
      }
    } else if (activeDateRange.preset === 'last_6_months') {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        targetMonths.push({ year: y, month: m, key });
      }
    } else if (activeDateRange.preset === 'last_12_months') {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        targetMonths.push({ year: y, month: m, key });
      }
    } else if (activeDateRange.preset === 'this_year') {
      // Calendar year (Jan to Dec)
      for (let m = 0; m < 12; m++) {
        const key = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
        targetMonths.push({ year: currentYear, month: m, key });
      }
    } else if (activeDateRange.preset === 'custom') {
      // Compute from custom start & end dates
      if (activeDateRange.startDate && activeDateRange.endDate) {
        targetMonths = getMonthsInDateRange(activeDateRange.startDate, activeDateRange.endDate);
      }
      if (targetMonths.length === 0) {
        // Fallback if dates incomplete
        for (let i = 2; i >= 0; i--) {
          const d = new Date(currentYear, currentMonth - i, 1);
          const y = d.getFullYear();
          const m = d.getMonth();
          const key = `${y}-${String(m + 1).padStart(2, '0')}`;
          targetMonths.push({ year: y, month: m, key });
        }
      }
    } else {
      // 'all': Span from earliest expense month to latest expense month
      const keys = Array.from(monthlyMap.keys()).sort();
      if (keys.length > 0) {
        const [firstY, firstM] = keys[0].split('-').map(Number);
        const [lastY, lastM] = keys[keys.length - 1].split('-').map(Number);
        const start = new Date(firstY, firstM - 1, 1);
        const end = new Date(lastY, lastM - 1, 1);

        const cur = new Date(start);
        while (cur <= end) {
          const y = cur.getFullYear();
          const m = cur.getMonth();
          const key = `${y}-${String(m + 1).padStart(2, '0')}`;
          targetMonths.push({ year: y, month: m, key });
          cur.setMonth(cur.getMonth() + 1);
        }
      } else {
        // Default to last 6 months if no expenses exist yet
        for (let i = 5; i >= 0; i--) {
          const d = new Date(currentYear, currentMonth - i, 1);
          const y = d.getFullYear();
          const m = d.getMonth();
          const key = `${y}-${String(m + 1).padStart(2, '0')}`;
          targetMonths.push({ year: y, month: m, key });
        }
      }
    }

    // 4. Map target months into MonthlyTrendPoint[] with MoM metrics
    const points: MonthlyTrendPoint[] = [];

    for (let i = 0; i < targetMonths.length; i++) {
      const tm = targetMonths[i];
      const entry = monthlyMap.get(tm.key) || { total: 0, count: 0, categoriesMap: {} };

      // Find top category in that month
      let topCategory = 'None';
      let topCategoryAmount = 0;
      for (const [cat, amt] of Object.entries(entry.categoriesMap)) {
        if (amt > topCategoryAmount) {
          topCategoryAmount = amt;
          topCategory = cat;
        }
      }

      // Determine previous calendar month amount
      let prevAmount: number | null = null;
      if (i > 0) {
        prevAmount = points[i - 1].amount;
      } else {
        // Calculate prior calendar month key
        const prevMonthDate = new Date(tm.year, tm.month - 1, 1);
        const prevKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
        if (allMonthlyMap.has(prevKey)) {
          prevAmount = Math.round(allMonthlyMap.get(prevKey)!);
        }
      }

      let momChangeAmount: number | null = null;
      let momChangePercent: number | null = null;

      if (prevAmount !== null) {
        const diff = Math.round(entry.total) - prevAmount;
        momChangeAmount = diff;
        if (prevAmount > 0) {
          momChangePercent = Math.round((diff / prevAmount) * 100);
        } else if (Math.round(entry.total) > 0) {
          momChangePercent = 100;
        } else {
          momChangePercent = 0;
        }
      }

      const point: MonthlyTrendPoint = {
        monthKey: tm.key,
        shortName: `${MONTH_SHORT[tm.month]} '${String(tm.year).slice(-2)}`,
        fullName: `${MONTH_NAMES[tm.month]} ${tm.year}`,
        year: tm.year,
        monthIndex: tm.month,
        amount: Math.round(entry.total),
        count: entry.count,
        averageVoucher: entry.count > 0 ? Math.round(entry.total / entry.count) : 0,
        topCategory,
        topCategoryAmount: Math.round(topCategoryAmount),
        previousMonthAmount: prevAmount,
        momChangeAmount,
        momChangePercent,
      };

      points.push(point);
    }

    return points;
  }, [expenses, selectedCategory, activeDateRange]);

  // Aggregate summary analytics across the selected period
  const analytics = useMemo(() => {
    if (trendData.length === 0) {
      return {
        totalPeriodSpend: 0,
        totalVouchers: 0,
        monthlyAverage: 0,
        peakMonth: null as MonthlyTrendPoint | null,
        lowestMonth: null as MonthlyTrendPoint | null,
        latestMonth: null as MonthlyTrendPoint | null,
        netMomChangePercent: 0,
      };
    }

    const totalPeriodSpend = trendData.reduce((sum, p) => sum + p.amount, 0);
    const totalVouchers = trendData.reduce((sum, p) => sum + p.count, 0);
    const activeMonthsCount = trendData.filter(p => p.amount > 0).length || trendData.length;
    const monthlyAverage = Math.round(totalPeriodSpend / Math.max(1, trendData.length));

    let peakMonth = trendData[0];
    let lowestMonth = trendData[0];

    for (const p of trendData) {
      if (p.amount > peakMonth.amount) peakMonth = p;
      if (p.amount < lowestMonth.amount) lowestMonth = p;
    }

    const latestMonth = trendData[trendData.length - 1];
    const prevMonth = trendData.length >= 2 ? trendData[trendData.length - 2] : null;

    let netMomChangePercent = 0;
    if (prevMonth && prevMonth.amount > 0) {
      netMomChangePercent = Math.round(
        ((latestMonth.amount - prevMonth.amount) / prevMonth.amount) * 100
      );
    }

    return {
      totalPeriodSpend,
      totalVouchers,
      monthlyAverage,
      peakMonth,
      lowestMonth,
      latestMonth,
      netMomChangePercent,
    };
  }, [trendData]);

  // Fast preset button click handler
  const handleQuickPreset = (preset: DateRangePreset) => {
    const calculated = calculateDateRange(preset, settings.currentAcademicYear);
    handleRangeUpdate(calculated);
  };

  // Export current monthly trend data to CSV
  const handleExportTrendCSV = () => {
    if (trendData.length === 0) return;
    const rows = trendData.map(d => ({
      'Month Period': d.fullName,
      'Total Expenditure': `${settings.currencySymbol || '$'}${d.amount.toLocaleString()}`,
      'Voucher Count': d.count,
      'Average Per Voucher': `${settings.currencySymbol || '$'}${d.averageVoucher.toLocaleString()}`,
      'Top Expense Category': d.topCategory,
      'Top Category Spend': `${settings.currencySymbol || '$'}${d.topCategoryAmount.toLocaleString()}`,
      'MoM Variance Amount': d.momChangeAmount !== null ? `${settings.currencySymbol || '$'}${d.momChangeAmount.toLocaleString()}` : 'N/A',
      'MoM Variance %': d.momChangePercent !== null ? `${d.momChangePercent}%` : 'N/A',
    }));

    exportToCSV(`Monthly_Expenditure_Trends_${activeDateRange.preset}_${getTodayDateString()}`, rows);
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Top Header & Interactive Filter Bar */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
              <TrendingDown className="w-4 h-4" />
            </span>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Monthly Expenditure Trends
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
              {activeDateRange.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualize recurring operational disbursements, monthly burn rates, and spending velocity over {formatDateRangeDisplay(activeDateRange)}
          </p>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex items-center gap-2 flex-wrap self-stretch lg:self-auto justify-between lg:justify-end">
          {/* Quick Preset Segmented Buttons */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleQuickPreset('last_3_months')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] ${
                activeDateRange.preset === 'last_3_months'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Last 3M
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset('this_academic_year')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] ${
                activeDateRange.preset === 'this_academic_year'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Academic Year
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset('last_6_months')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] hidden sm:inline-block ${
                activeDateRange.preset === 'last_6_months'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Last 6M
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] ${
                activeDateRange.preset === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All
            </button>
          </div>

          {/* Date Range Picker Dropdown */}
          <DateRangePicker
            value={activeDateRange}
            onChange={handleRangeUpdate}
            academicYear={settings.currentAcademicYear}
          />

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-transparent font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer text-xs max-w-[120px] sm:max-w-[150px] truncate"
            >
              <option value="All">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode: Amount vs Dual Volume vs Table */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setMetricMode('amount_only')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                metricMode === 'amount_only'
                  ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Spend Trend Line Only"
            >
              <TrendingDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('mom_rate')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                metricMode === 'mom_rate'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Month-over-Month (MoM) Expenditure Variance Rate (%)"
            >
              <Percent className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('with_volume')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                metricMode === 'with_volume'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Spend Line + Voucher Count Dual Axis"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                metricMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Audit Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* CSV Export Button */}
          <button
            type="button"
            onClick={handleExportTrendCSV}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition shadow-2xs cursor-pointer"
            title="Export Monthly Trend Data to CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Metrics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/80">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Average Monthly Burn
          </span>
          <p className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
            {formatCurrency(analytics.monthlyAverage, settings.currencySymbol)}
          </p>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
            Over {trendData.length} months plotted
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Peak Spending Month
          </span>
          <p className="text-base sm:text-lg font-black font-mono text-red-600 dark:text-red-400 mt-0.5 truncate">
            {analytics.peakMonth
              ? formatCurrency(analytics.peakMonth.amount, settings.currencySymbol)
              : '—'}
          </p>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5 truncate">
            {analytics.peakMonth ? analytics.peakMonth.fullName : 'No data'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Latest Month (MoM Trend)
          </span>
          <p className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
            {analytics.latestMonth
              ? formatCurrency(analytics.latestMonth.amount, settings.currencySymbol)
              : '—'}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            {analytics.latestMonth?.momChangePercent !== null && analytics.latestMonth?.momChangePercent !== undefined ? (
              analytics.latestMonth.momChangePercent > 0 ? (
                <span className="flex items-center text-[10px] font-bold text-red-600 dark:text-red-400">
                  <ArrowUpRight className="w-3 h-3" />
                  +{analytics.latestMonth.momChangePercent}% MoM
                </span>
              ) : analytics.latestMonth.momChangePercent < 0 ? (
                <span className="flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <ArrowDownRight className="w-3 h-3" />
                  {analytics.latestMonth.momChangePercent}% MoM
                </span>
              ) : (
                <span className="flex items-center text-[10px] font-bold text-slate-400">
                  <Minus className="w-3 h-3" />
                  0% MoM
                </span>
              )
            ) : (
              <span className="text-[10px] text-slate-400">Baseline period</span>
            )}
            <span className="text-[10px] text-slate-400">vs prior month</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Horizon Spend
          </span>
          <p className="text-base sm:text-lg font-black font-mono text-red-600 dark:text-red-400 mt-0.5">
            {formatCurrency(analytics.totalPeriodSpend, settings.currencySymbol)}
          </p>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
            {analytics.totalVouchers} verified vouchers
          </span>
        </div>
      </div>

      {/* Main Chart Body */}
      {metricMode !== 'table' ? (
        <div className="p-5">
          {/* Chart Controls Bar */}
          <div className="flex items-center justify-between pb-3 text-xs text-slate-500 flex-wrap gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              {metricMode === 'mom_rate' ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-blue-600 rounded-full inline-block" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                    Month-over-Month (MoM) Growth Rate (%)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-red-500 rounded-full inline-block" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                    Total Expenditure ({settings.currencySymbol || '$'})
                  </span>
                </div>
              )}

              {metricMode === 'with_volume' && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-indigo-500 rounded-full inline-block border-t border-dashed border-indigo-400" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                    Vouchers Count
                  </span>
                </div>
              )}
            </div>

            {metricMode !== 'mom_rate' && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showAverageLine}
                    onChange={e => setShowAverageLine(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Show Average Benchmark</span>
                </label>
              </div>
            )}
          </div>

          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {metricMode === 'mom_rate' ? (
                <ComposedChart
                  data={trendData}
                  margin={{ top: 15, right: 15, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />

                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                  />

                  <YAxis
                    tickFormatter={val => `${val > 0 ? '+' : ''}${val}%`}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <ReferenceLine
                    y={0}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    label={{
                      value: '0% MoM Parity',
                      position: 'insideTopRight',
                      fill: '#64748b',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload as MonthlyTrendPoint;

                      return (
                        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3 text-xs min-w-[220px] space-y-2">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-blue-500" />
                              {data.fullName}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                              {data.count} vchs
                            </span>
                          </div>

                          <div className="space-y-1.5 font-mono">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500">Expenditure:</span>
                              <span className="font-black text-slate-900 dark:text-white">
                                {formatCurrency(data.amount, settings.currencySymbol)}
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
                              <span className="text-slate-500">MoM Growth Rate:</span>
                              {data.momChangePercent !== null ? (
                                <span
                                  className={`font-black flex items-center gap-0.5 ${
                                    data.momChangePercent > 0
                                      ? 'text-red-600 dark:text-red-400'
                                      : data.momChangePercent < 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {data.momChangePercent > 0 ? (
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  ) : data.momChangePercent < 0 ? (
                                    <ArrowDownRight className="w-3.5 h-3.5" />
                                  ) : (
                                    <Minus className="w-3.5 h-3.5" />
                                  )}
                                  <span>
                                    {data.momChangePercent > 0 ? '+' : ''}
                                    {data.momChangePercent}%
                                  </span>
                                </span>
                              ) : (
                                <span className="text-slate-400">Baseline</span>
                              )}
                            </div>

                            {data.momChangeAmount !== null && (
                              <div className="flex justify-between items-center text-[11px] text-slate-400">
                                <span>MoM Variance:</span>
                                <span className="font-semibold">
                                  {data.momChangeAmount > 0 ? '+' : ''}
                                  {formatCurrency(data.momChangeAmount, settings.currencySymbol)}
                                </span>
                              </div>
                            )}

                            {data.previousMonthAmount !== null && (
                              <div className="flex justify-between items-center text-[10px] text-slate-400">
                                <span>Prior Month:</span>
                                <span>{formatCurrency(data.previousMonthAmount, settings.currencySymbol)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />

                  <Legend
                    verticalAlign="top"
                    height={32}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '2px' }}
                  />

                  <Line
                    type="monotone"
                    dataKey="momChangePercent"
                    name="MoM Variance %"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#2563EB', strokeWidth: 1.5, stroke: '#fff' }}
                    activeDot={{ r: 7, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }}
                  />
                </ComposedChart>
              ) : (
                <ComposedChart
                  data={trendData}
                  margin={{ top: 15, right: metricMode === 'with_volume' ? 20 : 15, left: 10, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="expenseTrendArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />

                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                  />

                  <YAxis
                    yAxisId="amount"
                    tickFormatter={val =>
                      val >= 1000
                        ? `${settings.currencySymbol || '$'}${Math.round(val / 1000)}k`
                        : `${settings.currencySymbol || '$'}${val}`
                    }
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                  />

                  {metricMode === 'with_volume' && (
                    <YAxis
                      yAxisId="count"
                      orientation="right"
                      tickFormatter={val => `${val} vch`}
                      tick={{ fontSize: 11, fill: '#6366f1' }}
                      tickLine={false}
                      axisLine={false}
                    />
                  )}

                  {showAverageLine && analytics.monthlyAverage > 0 && (
                    <ReferenceLine
                      yAxisId="amount"
                      y={analytics.monthlyAverage}
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      label={{
                        value: `Avg ${formatCurrency(analytics.monthlyAverage, settings.currencySymbol)}`,
                        position: 'insideTopRight',
                        fill: '#64748b',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    />
                  )}

                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload as MonthlyTrendPoint;
                      const vsAvg =
                        analytics.monthlyAverage > 0
                          ? Math.round(
                              ((data.amount - analytics.monthlyAverage) /
                                analytics.monthlyAverage) *
                                100
                            )
                          : 0;

                      return (
                        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3 text-xs min-w-[220px] space-y-2">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-red-500" />
                              {data.fullName}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                              {data.count} {data.count === 1 ? 'vch' : 'vchs'}
                            </span>
                          </div>

                          <div className="space-y-1 font-mono">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500">Expenditure:</span>
                              <span className="font-black text-red-600 dark:text-red-400">
                                {formatCurrency(data.amount, settings.currencySymbol)}
                              </span>
                            </div>

                            {/* MoM Variance */}
                            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800/60">
                              <span className="text-slate-400">MoM Variance:</span>
                              {data.momChangePercent !== null ? (
                                <span
                                  className={`font-bold flex items-center gap-0.5 ${
                                    data.momChangePercent > 0
                                      ? 'text-red-600 dark:text-red-400'
                                      : data.momChangePercent < 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {data.momChangePercent > 0 ? (
                                    <ArrowUpRight className="w-3 h-3" />
                                  ) : data.momChangePercent < 0 ? (
                                    <ArrowDownRight className="w-3 h-3" />
                                  ) : (
                                    <Minus className="w-3 h-3" />
                                  )}
                                  <span>
                                    {data.momChangePercent > 0 ? '+' : ''}
                                    {data.momChangePercent}%
                                    {data.momChangeAmount !== null && (
                                      <span className="text-[10px] font-normal ml-1">
                                        ({data.momChangeAmount > 0 ? '+' : ''}
                                        {formatCurrency(data.momChangeAmount, settings.currencySymbol)})
                                      </span>
                                    )}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">Baseline period</span>
                              )}
                            </div>

                            {data.previousMonthAmount !== null && (
                              <div className="flex justify-between items-center text-[10px] text-slate-400">
                                <span>Prior Month:</span>
                                <span>{formatCurrency(data.previousMonthAmount, settings.currencySymbol)}</span>
                              </div>
                            )}

                            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800/60">
                              <span className="text-slate-400">Avg per Voucher:</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {formatCurrency(data.averageVoucher, settings.currencySymbol)}
                              </span>
                            </div>

                            {data.topCategory !== 'None' && (
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-400 truncate max-w-[100px]">Top Category:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[110px]" title={data.topCategory}>
                                  {data.topCategory}
                                </span>
                              </div>
                            )}

                            <div className="flex justify-between items-center text-[10px] pt-1 border-t border-slate-100 dark:border-slate-800/60">
                              <span className="text-slate-400">vs Window Average:</span>
                              <span
                                className={`font-bold ${
                                  vsAvg > 0
                                    ? 'text-red-500'
                                    : vsAvg < 0
                                    ? 'text-emerald-500'
                                    : 'text-slate-400'
                                }`}
                              >
                                {vsAvg > 0 ? `+${vsAvg}% above` : vsAvg < 0 ? `${Math.abs(vsAvg)}% below` : 'Equal'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />

                  <Legend
                    verticalAlign="top"
                    height={32}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '2px' }}
                  />

                  {/* Soft Area underneath the main line */}
                  <Area
                    yAxisId="amount"
                    type="monotone"
                    dataKey="amount"
                    fill="url(#expenseTrendArea)"
                    stroke="none"
                  />

                  {/* Primary Trend Line */}
                  <Line
                    yAxisId="amount"
                    type="monotone"
                    dataKey="amount"
                    name="Monthly Total Spend"
                    stroke="#EF4444"
                    strokeWidth={2.75}
                    dot={{ r: 4, fill: '#EF4444', strokeWidth: 1.5, stroke: '#fff' }}
                    activeDot={{ r: 7, fill: '#EF4444', strokeWidth: 2, stroke: '#fff' }}
                  />

                  {/* Optional Voucher Volume Line */}
                  {metricMode === 'with_volume' && (
                    <Line
                      yAxisId="count"
                      type="monotone"
                      dataKey="count"
                      name="Vouchers Issued"
                      stroke="#6366F1"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: '#6366F1' }}
                    />
                  )}
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>

          <p className="text-[10px] text-center text-slate-400 mt-2">
            Viewing {trendData.length} monthly nodes. Toggle metric modes above (Expenditure Line, MoM Variance %, Volume) or hover over data points to inspect monthly disbursements.
          </p>
        </div>
      ) : (
        /* Detailed Audit Table */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Billing Month</th>
                <th className="py-3 px-4 text-right">Expenditures</th>
                <th className="py-3 px-4 text-center">Vouchers</th>
                <th className="py-3 px-4 text-right">Avg Voucher</th>
                <th className="py-3 px-4">Primary Category</th>
                <th className="py-3 px-4 text-right">MoM Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {trendData.map(d => (
                <tr key={d.monthKey} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-white">
                    {d.fullName}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-red-600 dark:text-red-400">
                    {formatCurrency(d.amount, settings.currencySymbol)}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-300">
                    {d.count}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                    {formatCurrency(d.averageVoucher, settings.currencySymbol)}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {d.topCategory}
                    </span>
                    {d.topCategoryAmount > 0 && (
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {formatCurrency(d.topCategoryAmount, settings.currencySymbol)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {d.momChangePercent !== null ? (
                      <span
                        className={`font-bold ${
                          d.momChangePercent > 0
                            ? 'text-red-600 dark:text-red-400'
                            : d.momChangePercent < 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {d.momChangePercent > 0 ? '+' : ''}
                        {d.momChangePercent}%
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
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
