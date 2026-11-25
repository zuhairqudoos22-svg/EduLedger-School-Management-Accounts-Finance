import React, { useState, useMemo } from 'react';
import '../../utils/chartSetup';
import { Line } from 'react-chartjs-2';
import { ChartOptions, ChartData } from 'chart.js';
import { useSchool } from '../../context/SchoolContext';
import { Student, FeePayment, Expense, SchoolSettings } from '../../types';
import { formatCurrency, exportToCSV } from '../../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  GraduationCap,
  Receipt,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Sparkles,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from 'lucide-react';

export interface DashboardSummaryWidgetProps {
  students?: Student[];
  feePayments?: FeePayment[];
  expenses?: Expense[];
  settings?: SchoolSettings;
  academicYear?: string;
}

export type AcademicTimeframe = 'FULL_YEAR' | 'TERM_1' | 'TERM_2' | 'YTD';

interface MonthlyAcademicSummary {
  monthKey: string; // e.g. "2026-08"
  label: string; // e.g. "Aug '26"
  fullMonthName: string; // e.g. "August 2026"
  enrollment: number;
  newAdmissions: number;
  feeCollection: number;
  expenses: number;
  netMargin: number;
  isProjected: boolean;
}

export const DashboardSummaryWidget: React.FC<DashboardSummaryWidgetProps> = ({
  students: propStudents,
  feePayments: propFeePayments,
  expenses: propExpenses,
  settings: propSettings,
  academicYear: propAcademicYear,
}) => {
  const context = useSchool();
  const students = propStudents || context.students || [];
  const feePayments = propFeePayments || context.feePayments || [];
  const expenses = propExpenses || context.expenses || [];
  const settings = propSettings || context.settings;
  const setActiveTab = context.setActiveTab;

  const currentAcademicYear = propAcademicYear || settings?.currentAcademicYear || '2026-2027';
  const currencySymbol = settings?.currencySymbol || '$';

  // Controls State
  const [timeframe, setTimeframe] = useState<AcademicTimeframe>('FULL_YEAR');
  const [showEnrollmentLine, setShowEnrollmentLine] = useState(true);
  const [showFeeCollectionLine, setShowFeeCollectionLine] = useState(true);
  const [showExpensesLine, setShowExpensesLine] = useState(true);
  const [showDataTable, setShowDataTable] = useState(false);

  // Compute 12 academic year months: August 2026 to July 2027
  const academicMonths = useMemo(() => {
    // Parse year from academic year string (e.g. "2026-2027" -> 2026)
    const startYearMatch = currentAcademicYear.match(/^(\d{4})/);
    const startYear = startYearMatch ? parseInt(startYearMatch[1], 10) : 2026;

    // Academic session starts in August of startYear and finishes in July of startYear + 1
    const months = [
      { key: `${startYear}-08`, label: "Aug '26", fullMonthName: 'August 2026', monthIndex: 7, year: startYear },
      { key: `${startYear}-09`, label: "Sep '26", fullMonthName: 'September 2026', monthIndex: 8, year: startYear },
      { key: `${startYear}-10`, label: "Oct '26", fullMonthName: 'October 2026', monthIndex: 9, year: startYear },
      { key: `${startYear}-11`, label: "Nov '26", fullMonthName: 'November 2026', monthIndex: 10, year: startYear },
      { key: `${startYear}-12`, label: "Dec '26", fullMonthName: 'December 2026', monthIndex: 11, year: startYear },
      { key: `${startYear + 1}-01`, label: "Jan '27", fullMonthName: 'January 2027', monthIndex: 0, year: startYear + 1 },
      { key: `${startYear + 1}-02`, label: "Feb '27", fullMonthName: 'February 2027', monthIndex: 1, year: startYear + 1 },
      { key: `${startYear + 1}-03`, label: "Mar '27", fullMonthName: 'March 2027', monthIndex: 2, year: startYear + 1 },
      { key: `${startYear + 1}-04`, label: "Apr '27", fullMonthName: 'April 2027', monthIndex: 3, year: startYear + 1 },
      { key: `${startYear + 1}-05`, label: "May '27", fullMonthName: 'May 2027', monthIndex: 4, year: startYear + 1 },
      { key: `${startYear + 1}-06`, label: "Jun '27", fullMonthName: 'June 2027', monthIndex: 5, year: startYear + 1 },
      { key: `${startYear + 1}-07`, label: "Jul '27", fullMonthName: 'July 2027', monthIndex: 6, year: startYear + 1 },
    ];

    return months;
  }, [currentAcademicYear]);

  // Aggregate monthly academic dataset
  const allMonthlySummaries: MonthlyAcademicSummary[] = useMemo(() => {
    const activeStudents = students.filter(s => s.status === 'active');

    const currentYearMonth = new Date().toISOString().substring(0, 7);

    return academicMonths.map((m) => {
      // 1. Fee collection for this month
      const actualFeeTotal = feePayments
        .filter(p => {
          if (p.date && p.date.startsWith(m.key)) return true;
          if (p.monthFor && (p.monthFor === m.fullMonthName || p.monthFor.toLowerCase().includes(m.label.toLowerCase()))) {
            return true;
          }
          return false;
        })
        .reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

      // 2. Expenses for this month
      const actualExpenseTotal = expenses
        .filter(e => e.date && e.date.startsWith(m.key))
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      // 3. Enrollment for this month
      const endOfMonthStr = `${m.key}-31`;
      let explicitEnrolled = 0;
      if (activeStudents.length > 0) {
        const datedCount = activeStudents.filter(s => s.admissionDate && s.admissionDate <= endOfMonthStr).length;
        const undatedCount = activeStudents.filter(s => !s.admissionDate).length;
        explicitEnrolled = datedCount + undatedCount;
      }

      // New admissions that joined during this specific month
      const newAdmissions = activeStudents.filter(s => s.admissionDate && s.admissionDate.startsWith(m.key)).length;

      // Determine if month is in the future
      const isProjected = m.key > currentYearMonth;

      const finalFee = actualFeeTotal;
      const finalExp = actualExpenseTotal;

      return {
        monthKey: m.key,
        label: m.label,
        fullMonthName: m.fullMonthName,
        enrollment: explicitEnrolled,
        newAdmissions,
        feeCollection: finalFee,
        expenses: finalExp,
        netMargin: finalFee - finalExp,
        isProjected,
      };
    });
  }, [academicMonths, feePayments, expenses, students]);

  // Filtered list according to active timeframe
  const filteredSummaries = useMemo(() => {
    switch (timeframe) {
      case 'TERM_1':
        // Months 0-4 (August to December)
        return allMonthlySummaries.slice(0, 5);
      case 'TERM_2':
        // Months 5-11 (January to July)
        return allMonthlySummaries.slice(5);
      case 'YTD': {
        const currentYearMonth = new Date().toISOString().substring(0, 7);
        const ytdList = allMonthlySummaries.filter(m => m.monthKey <= currentYearMonth);
        return ytdList.length > 0 ? ytdList : allMonthlySummaries.slice(0, 4);
      }
      case 'FULL_YEAR':
      default:
        return allMonthlySummaries;
    }
  }, [allMonthlySummaries, timeframe]);

  // Aggregate Key Metrics for the active timeframe
  const metrics = useMemo(() => {
    const totalFees = filteredSummaries.reduce((sum, m) => sum + m.feeCollection, 0);
    const totalExp = filteredSummaries.reduce((sum, m) => sum + m.expenses, 0);
    const netSurplus = totalFees - totalExp;
    const avgEnrollment = Math.round(
      filteredSummaries.reduce((sum, m) => sum + m.enrollment, 0) / (filteredSummaries.length || 1)
    );
    const latestEnrollment = filteredSummaries[filteredSummaries.length - 1]?.enrollment || 0;
    const initialEnrollment = filteredSummaries[0]?.enrollment || 0;
    const enrollmentGrowth = latestEnrollment - initialEnrollment;
    const recoveryRatio = totalExp > 0 ? Math.round((totalFees / totalExp) * 100) : (totalFees > 0 ? 100 : 0);

    return {
      totalFees,
      totalExp,
      netSurplus,
      avgEnrollment,
      latestEnrollment,
      enrollmentGrowth,
      recoveryRatio,
    };
  }, [filteredSummaries]);

  const isAllEmpty = useMemo(() => {
    const hasStudents = students && students.length > 0;
    const hasFees = feePayments && feePayments.length > 0;
    const hasExpenses = expenses && expenses.length > 0;
    return !hasStudents && !hasFees && !hasExpenses;
  }, [students, feePayments, expenses]);

  // Chart.js Data Configuration
  const chartData: ChartData<'line'> = useMemo(() => {
    const labels = filteredSummaries.map(m => m.label);

    const datasets = [];

    // Line 1: Student Enrollment (Right Axis)
    if (showEnrollmentLine) {
      datasets.push({
        label: 'Student Enrollment',
        data: filteredSummaries.map(m => m.enrollment),
        yAxisID: 'yEnrollment',
        borderColor: '#6366f1', // Indigo
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        borderWidth: 3,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        tension: 0.35,
        fill: false,
      });
    }

    // Line 2: Fee Collection (Left Axis)
    if (showFeeCollectionLine) {
      datasets.push({
        label: 'Fee Collection',
        data: filteredSummaries.map(m => m.feeCollection),
        yAxisID: 'yCurrency',
        borderColor: '#10b981', // Emerald
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        borderWidth: 3,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        tension: 0.35,
        fill: false,
      });
    }

    // Line 3: Expenses (Left Axis)
    if (showExpensesLine) {
      datasets.push({
        label: 'Total Expenses',
        data: filteredSummaries.map(m => m.expenses),
        yAxisID: 'yCurrency',
        borderColor: '#f43f5e', // Rose
        backgroundColor: 'rgba(244, 63, 94, 0.08)',
        borderWidth: 3,
        pointBackgroundColor: '#f43f5e',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        tension: 0.35,
        fill: false,
      });
    }

    return {
      labels,
      datasets,
    };
  }, [filteredSummaries, showEnrollmentLine, showFeeCollectionLine, showExpensesLine]);

  // Chart.js Options Configuration
  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          align: 'end' as const,
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            padding: 18,
            font: {
              size: 11,
              weight: 'bold' as const,
            },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)', // Slate-900
          titleFont: { size: 12, weight: 'bold' as const },
          bodyFont: { size: 11 },
          padding: 12,
          cornerRadius: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            title: (tooltipItems: any[]) => {
              const idx = tooltipItems[0].dataIndex;
              const item = filteredSummaries[idx];
              return `${item.fullMonthName} ${item.isProjected ? '(Projected)' : ''}`;
            },
            label: (context: any) => {
              const label = context.dataset.label || '';
              const value = Number(context.parsed.y);

              if (label === 'Student Enrollment') {
                return `  ${label}: ${value.toLocaleString()} active students`;
              }
              return `  ${label}: ${formatCurrency(value, currencySymbol)}`;
            },
            afterBody: (tooltipItems: any[]) => {
              const idx = tooltipItems[0].dataIndex;
              const item = filteredSummaries[idx];
              const margin = item.feeCollection - item.expenses;
              const prefix = margin >= 0 ? '+' : '';
              return `\n  Net Operational Margin: ${prefix}${formatCurrency(margin, currencySymbol)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: { size: 11, weight: 'bold' as const },
            color: '#64748b',
          },
        },
        // Left Axis: Financial Currency (Fees & Expenses)
        yCurrency: {
          type: 'linear' as const,
          position: 'left' as const,
          display: showFeeCollectionLine || showExpensesLine,
          beginAtZero: true,
          min: 0,
          title: {
            display: true,
            text: `Financial Amount (${currencySymbol})`,
            color: '#64748b',
            font: { size: 11, weight: 'bold' as const },
          },
          grid: {
            color: 'rgba(226, 232, 240, 0.6)',
          },
          ticks: {
            font: { size: 10, weight: 'normal' as const },
            color: '#64748b',
            callback: (value: any) => {
              const num = Number(value);
              if (num >= 1000000) return `${currencySymbol}${(num / 1000000).toFixed(1)}M`;
              if (num >= 1000) return `${currencySymbol}${Math.round(num / 1000)}k`;
              return `${currencySymbol}${num}`;
            },
          },
        },
        // Right Axis: Student Headcount
        yEnrollment: {
          type: 'linear' as const,
          position: 'right' as const,
          display: showEnrollmentLine,
          beginAtZero: true,
          min: 0,
          title: {
            display: true,
            text: 'Student Enrollment (Headcount)',
            color: '#6366f1',
            font: { size: 11, weight: 'bold' as const },
          },
          grid: {
            drawOnChartArea: false, // Don't draw horizontal lines from right axis across chart
          },
          ticks: {
            font: { size: 10, weight: 'bold' as const },
            color: '#6366f1',
            callback: (value: any) => `${value} std`,
          },
        },
      },
    };
  }, [
    filteredSummaries,
    showEnrollmentLine,
    showFeeCollectionLine,
    showExpensesLine,
    currencySymbol,
  ]);

  const handleExportCSV = () => {
    const data: Record<string, unknown>[] = filteredSummaries.map(m => ({
      Month: m.fullMonthName,
      'Active Enrollment': m.enrollment,
      'New Admissions': m.newAdmissions,
      [`Fee Collection (${currencySymbol})`]: m.feeCollection,
      [`Expenses (${currencySymbol})`]: m.expenses,
      [`Net Margin (${currencySymbol})`]: m.netMargin,
      Status: m.isProjected ? 'Projected' : 'Actuals',
    }));
    exportToCSV(`dashboard_enrollment_vs_finance_${currentAcademicYear}`, data);
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      {/* Top Header & Interactive Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                <TrendingUp className="w-4 h-4" />
              </span>
              <span>Academic Year Performance &amp; Operations Trend</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">·</span>
            <span className="text-xs text-slate-500 font-bold">Chart.js Multi-Line</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Integrated dual-axis trend analysis comparing student enrollment headcount against fee collections and operational expenditures over Academic Year {currentAcademicYear}.
          </p>
        </div>

        {/* Timeframe Segmented Control & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe Selector */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setTimeframe('FULL_YEAR')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                timeframe === 'FULL_YEAR'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Full Year (12M)
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('TERM_1')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                timeframe === 'TERM_1'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Term 1
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('TERM_2')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                timeframe === 'TERM_2'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Term 2
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('YTD')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
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
            title="Export trend series data to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Enrollment */}
        <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
          <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" />
              <span>Active Enrollment</span>
            </span>
            <span className="text-[11px] font-mono text-indigo-600">
              {metrics.enrollmentGrowth >= 0 ? `+${metrics.enrollmentGrowth}` : metrics.enrollmentGrowth} net
            </span>
          </div>
          <p className="text-2xl font-black text-indigo-900 dark:text-indigo-100">
            {metrics.latestEnrollment.toLocaleString()}{' '}
            <span className="text-xs font-normal text-indigo-600 dark:text-indigo-300">Students</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Average headcount of {metrics.avgEnrollment} across period
          </p>
        </div>

        {/* Metric 2: Total Fee Collection */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <Receipt className="w-4 h-4" />
              <span>Total Collections</span>
            </span>
            <span className="text-[11px] text-emerald-600 font-mono">Inflows</span>
          </div>
          <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
            {formatCurrency(metrics.totalFees, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Tuition, transport, events, &amp; exam fees
          </p>
        </div>

        {/* Metric 3: Total Expenses */}
        <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-300 text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              <span>Total Expenses</span>
            </span>
            <span className="text-[11px] text-rose-600 font-mono">Outflows</span>
          </div>
          <p className="text-2xl font-black text-rose-900 dark:text-rose-100">
            {formatCurrency(metrics.totalExp, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Faculty payroll, utilities, maintenance, &amp; labs
          </p>
        </div>

        {/* Metric 4: Net Operating Margin */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5">
              {metrics.netSurplus >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
              )}
              <span>Net Operating Surplus</span>
            </span>
            <span
              className={`text-[11px] font-bold ${
                metrics.netSurplus >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {metrics.recoveryRatio}% recovery
            </span>
          </div>
          <p
            className={`text-2xl font-black ${
              metrics.netSurplus >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {metrics.netSurplus >= 0 ? '+' : ''}
            {formatCurrency(metrics.netSurplus, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Net cash flow variance across period
          </p>
        </div>
      </div>

      {/* Dataset Toggle Filter Chips */}
      <div className="flex items-center justify-between flex-wrap gap-3 text-xs pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-semibold mr-1">Visible Lines:</span>

          <button
            type="button"
            onClick={() => setShowEnrollmentLine(!showEnrollmentLine)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              showEnrollmentLine
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <span>Student Enrollment</span>
            {showEnrollmentLine ? <Eye className="w-3 h-3 ml-1" /> : <EyeOff className="w-3 h-3 ml-1" />}
          </button>

          <button
            type="button"
            onClick={() => setShowFeeCollectionLine(!showFeeCollectionLine)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              showFeeCollectionLine
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>Fee Collections</span>
            {showFeeCollectionLine ? <Eye className="w-3 h-3 ml-1" /> : <EyeOff className="w-3 h-3 ml-1" />}
          </button>

          <button
            type="button"
            onClick={() => setShowExpensesLine(!showExpensesLine)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              showExpensesLine
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span>Operational Expenses</span>
            {showExpensesLine ? <Eye className="w-3 h-3 ml-1" /> : <EyeOff className="w-3 h-3 ml-1" />}
          </button>
        </div>

        {/* Toggle Detailed Breakdown Table */}
        <button
          type="button"
          onClick={() => setShowDataTable(!showDataTable)}
          className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
        >
          <span>{showDataTable ? 'Hide Monthly Table' : 'View Monthly Table'}</span>
          {showDataTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Main Multi-Line Chart Canvas */}
      <div className="h-80 sm:h-96 w-full pt-2 relative">
        {isAllEmpty ? (
          <div className="h-full w-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-xs">
              <Sparkles className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              No Operational Data Recorded Yet
            </h4>
            <p className="text-xs text-slate-500 max-w-md mb-4 leading-relaxed">
              Admissions, fee collections, and operating expenses will build your academic year trend line automatically without simulated figures.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab?.('students')}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Register Student
              </button>
              <button
                type="button"
                onClick={() => setActiveTab?.('fee-collection')}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Collect Fee
              </button>
              <button
                type="button"
                onClick={() => setActiveTab?.('expenses')}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Record Expense
              </button>
            </div>
          </div>
        ) : (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>

      {/* Interactive Monthly Data Table (Collapsible) */}
      {showDataTable && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3 text-center">Enrollment</th>
                  <th className="py-2.5 px-3 text-right">Fee Collection</th>
                  <th className="py-2.5 px-3 text-right">Expenses</th>
                  <th className="py-2.5 px-3 text-right">Net Margin</th>
                  <th className="py-2.5 px-3 text-right">Rev / Student</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSummaries.map(m => {
                  const revPerStudent = m.enrollment > 0 ? Math.round(m.feeCollection / m.enrollment) : 0;
                  return (
                    <tr key={m.monthKey} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {m.fullMonthName}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {m.enrollment.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(m.feeCollection, currencySymbol)}
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
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {formatCurrency(revPerStudent, currencySymbol)}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Navigation Jump-Links */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Real-time academic ledger synchronization</span>
        </span>

        {setActiveTab && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              View Student Registry →
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={() => setActiveTab('fee-collection')}
              className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              View Fee Ledger →
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={() => setActiveTab('expenses')}
              className="font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            >
              View Expense Tracker →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
