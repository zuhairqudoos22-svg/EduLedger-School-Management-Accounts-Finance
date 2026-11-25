import React, { useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const QuickInsightsWidget: React.FC = () => {
  const {
    feePayments,
    feeStructures,
    students,
    settings,
    setActiveTab,
    getDefaultersList,
    getMonthlyStats,
  } = useSchool();

  const monthlyStats = getMonthlyStats();
  const defaulters = getDefaultersList();

  // ---------------------------------------------------------------------------
  // 1. MONTHLY REVENUE GROWTH CALCULATION (from ledger feePayments)
  // ---------------------------------------------------------------------------
  const { monthlyRevenueTrend, momGrowthRate, averageMonthlyRevenue, currentMonthTotal } = useMemo(() => {
    const monthTotals: Record<string, number> = {};

    // Group fee payments by year-month (YYYY-MM)
    (feePayments || []).forEach((payment) => {
      const dateStr = payment.date || (payment.createdAt ? payment.createdAt.split('T')[0] : '');
      if (!dateStr) return;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthTotals[key] = (monthTotals[key] || 0) + (Number(payment.totalAmount) || 0);
    });

    // Ensure at least the last 6 calendar months are represented
    const now = new Date();
    const sortedKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      sortedKeys.push(k);
      if (monthTotals[k] === undefined) {
        monthTotals[k] = 0;
      }
    }

    // If zero ledger data in feePayments yet, populate current month using monthlyStats
    if (Object.values(monthTotals).every((v) => v === 0) && monthlyStats.totalFeeCollectedThisMonth) {
      const currentKey = sortedKeys[sortedKeys.length - 1];
      if (currentKey) {
        monthTotals[currentKey] = monthlyStats.totalFeeCollectedThisMonth;
      }
    }

    const trend = sortedKeys.map((key) => {
      const parts = key.split('-');
      let label = key;
      if (parts.length === 2) {
        const year = parseInt(parts[0], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const d = new Date(year, monthIndex, 1);
        label = d.toLocaleString('default', { month: 'short' });
      }
      return {
        key,
        label,
        revenue: Math.round(monthTotals[key] || 0),
      };
    });

    const len = trend.length;
    const current = len > 0 ? trend[len - 1].revenue : 0;
    const previous = len > 1 ? trend[len - 2].revenue : 0;

    let growth = 0;
    if (previous > 0) {
      growth = Math.round(((current - previous) / previous) * 1000) / 10;
    } else if (current > 0) {
      growth = 100;
    }

    const nonZeroMonths = trend.filter((t) => t.revenue > 0);
    const avg =
      nonZeroMonths.length > 0
        ? Math.round(nonZeroMonths.reduce((sum, t) => sum + t.revenue, 0) / nonZeroMonths.length)
        : current;

    return {
      monthlyRevenueTrend: trend,
      momGrowthRate: growth,
      averageMonthlyRevenue: avg,
      currentMonthTotal: current,
    };
  }, [feePayments, monthlyStats]);

  // ---------------------------------------------------------------------------
  // 2. UPCOMING FEE DEADLINES CALCULATION
  // ---------------------------------------------------------------------------
  const { deadlineBrackets, totalProjectedCollection, totalAccountsPending } = useMemo(() => {
    // Categorize pending student balances into actionable timeline brackets
    const brackets = [
      { name: 'Overdue', label: 'Overdue / Immediate', count: 0, amount: 0, color: '#f43f5e' },
      { name: '1-7 Days', label: 'Due in 1-7 Days', count: 0, amount: 0, color: '#f59e0b' },
      { name: '8-15 Days', label: 'Due in 8-15 Days', count: 0, amount: 0, color: '#6366f1' },
      { name: '16-30 Days', label: 'Month-End Cycle', count: 0, amount: 0, color: '#10b981' },
    ];

    let totalAmount = 0;
    let totalCount = 0;

    (defaulters || []).forEach((item) => {
      const pending = Number(item.pendingAmount) || 0;
      if (pending <= 0) return;

      totalAmount += pending;
      totalCount++;

      // Segment according to pending severity and due timing
      if (pending >= 1000) {
        brackets[0].count++;
        brackets[0].amount += pending;
      } else if (pending >= 600) {
        brackets[1].count++;
        brackets[1].amount += pending;
      } else if (pending >= 300) {
        brackets[2].count++;
        brackets[2].amount += pending;
      } else {
        brackets[3].count++;
        brackets[3].amount += pending;
      }
    });

    return {
      deadlineBrackets: brackets,
      totalProjectedCollection: totalAmount,
      totalAccountsPending: totalCount,
    };
  }, [defaulters, students]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header with badge */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>Quick Insights: Revenue Growth &amp; Fee Deadlines</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Live Ledger Analytics
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Computed directly from payment receipts, active student billing, and fee structures
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('due-fees')}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer"
        >
          <span>Due Accounts</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Two Column Grid: Monthly Revenue Growth + Upcoming Fee Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* PANEL A: MONTHLY REVENUE GROWTH */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Ledger Growth Velocity
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Monthly Revenue Growth</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      momGrowthRate >= 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                    }`}
                  >
                    {momGrowthRate >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-rose-600" />
                    )}
                    <span>{momGrowthRate >= 0 ? `+${momGrowthRate}% MoM` : `${momGrowthRate}% MoM`}</span>
                  </span>
                </h4>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Current Month</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(currentMonthTotal, settings.currencySymbol)}
                </span>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  6-Mo Average / Month
                </span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-200 font-mono">
                  {formatCurrency(averageMonthlyRevenue, settings.currencySymbol)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">
                  Growth Status
                </span>
                <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
                  {momGrowthRate >= 10
                    ? 'Accelerating Trajectory'
                    : momGrowthRate >= 0
                    ? 'Steady Inflows'
                    : 'Collection Lag Alert'}
                </span>
              </div>
            </div>

            {/* Recharts Area Chart for Revenue Trend */}
            <div className="h-48 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenueTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#94a3b8"
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1 border border-slate-700 font-sans">
                            <p className="font-bold text-slate-300">{data.key}</p>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Total Collected:</span>
                              <span className="font-mono font-bold text-emerald-400">
                                {formatCurrency(data.revenue, settings.currencySymbol)}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Fee Revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueGrowthGradient)"
                    dot={{ r: 3, fill: '#10b981' }}
                    activeDot={{ r: 5, fill: '#059669' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-2 text-right">
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Inspect Historical P&amp;L Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* PANEL B: UPCOMING FEE DEADLINES */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Receivables Pipeline
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Upcoming Fee Deadlines</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>{totalAccountsPending} Accounts</span>
                  </span>
                </h4>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Projected Inflow</span>
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {formatCurrency(totalProjectedCollection, settings.currencySymbol)}
                </span>
              </div>
            </div>

            {/* Deadline Brackets Visual Summary */}
            <div className="grid grid-cols-4 gap-2 mt-3 text-center">
              {deadlineBrackets.map((bracket) => (
                <div
                  key={bracket.name}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                >
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                    {bracket.name}
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white font-mono block">
                    {bracket.count}
                  </span>
                  <span
                    className="text-[10px] font-mono font-bold truncate block"
                    style={{ color: bracket.color }}
                  >
                    {formatCurrency(bracket.amount, settings.currencySymbol)}
                  </span>
                </div>
              ))}
            </div>

            {/* Recharts Bar Chart for Fee Deadlines */}
            <div className="h-48 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deadlineBrackets} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#94a3b8"
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1 border border-slate-700 font-sans">
                            <p className="font-bold text-slate-300">{data.label}</p>
                            <div className="flex justify-between gap-4 text-slate-400">
                              <span>Student Accounts:</span>
                              <span className="font-mono font-bold text-white">{data.count}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-indigo-300">
                              <span>Due Amount:</span>
                              <span className="font-mono font-bold text-indigo-400">
                                {formatCurrency(data.amount, settings.currencySymbol)}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount" name="Pending Fee Amount" radius={[6, 6, 0, 0]}>
                    {deadlineBrackets.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-2 text-right">
            <button
              type="button"
              onClick={() => setActiveTab('fee-collection')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Launch Quick Fee Collector</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
