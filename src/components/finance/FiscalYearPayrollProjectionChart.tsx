import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Table as TableIcon,
  Download,
  Info,
  RotateCcw,
  Sparkles,
  Sliders,
  X,
  AlertTriangle,
  Check,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ReferenceLine,
} from 'recharts';
import { MonthlyPayrollRun, Staff, Expense, SchoolSettings } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { payrollStorage } from '../../utils/payrollStorage';
import { useSchool } from '../../context/SchoolContext';

interface FiscalYearPayrollProjectionChartProps {
  runs: MonthlyPayrollRun[];
  staff: Staff[];
  expenses: Expense[];
  settings: SchoolSettings;
  defaultFiscalYear?: string;
  onNavigateToMonth?: (monthName: string) => void;
  onUpdateSettings?: (settings: SchoolSettings) => void;
  onResetPayrollRuns?: () => void;
  onOpenResetAnnualBudgetModal?: () => void;
}

interface MonthProjectionData {
  monthKey: string;
  shortName: string;
  fullMonth: string;
  fiscalMonthIndex: number;
  calendarYear: number;
  projected: number;
  actual: number | null;
  variance: number | null;
  variancePercent: number | null;
  status: 'paid' | 'approved' | 'processed' | 'draft' | 'forecast' | 'unprocessed';
  statusLabel: string;
  employeeCount: number;
  notes?: string;
}

export const FiscalYearPayrollProjectionChart: React.FC<FiscalYearPayrollProjectionChartProps> = ({
  runs,
  staff,
  expenses,
  settings,
  defaultFiscalYear = '2026-2027',
  onNavigateToMonth,
  onUpdateSettings,
  onResetPayrollRuns,
  onOpenResetAnnualBudgetModal,
}) => {
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(defaultFiscalYear);
  const [chartViewMode, setChartViewMode] = useState<'combo' | 'area' | 'table'>('combo');

  const schoolContext = useSchool();
  const updateSettingsFn = onUpdateSettings || schoolContext?.updateSettings;

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isClearingRuns, setIsClearingRuns] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const projectionMode = settings.payrollSettings?.projectionMode || 'realtime';
  const customAnnualBudget = settings.payrollSettings?.customAnnualBudget || 0;

  const [modalMode, setModalMode] = useState<'realtime' | 'custom' | 'zero'>(projectionMode);
  const [modalBudgetInput, setModalBudgetInput] = useState<string>(
    customAnnualBudget > 0 ? String(customAnnualBudget) : ''
  );

  // Compute base active staff monthly payroll baseline using STRICT LIVE DATA
  const activeStaffBaseline = useMemo(() => {
    const activeStaff = staff.filter(s => s.status === 'active');
    const basicSum = activeStaff.reduce((sum, s) => sum + (s.monthlySalary || 0), 0);
    const allowancesSum = activeStaff.reduce((sum, s) => sum + (s.allowances || 0), 0);
    // Baseline deductions: ~5% PF + approx 4% tax
    const expectedDeductions = Math.round(basicSum * 0.05 + (basicSum + allowancesSum) * 0.04);
    const netBaseline = Math.max(0, basicSum + allowancesSum - expectedDeductions);
    return {
      count: activeStaff.length,
      basic: basicSum,
      allowances: allowancesSum,
      expectedDeductions,
      net: netBaseline, // Strict real-time: 0 if no active staff
    };
  }, [staff]);

  // Construct 12 fiscal months for the selected fiscal year (July to June)
  const chartData = useMemo<MonthProjectionData[]>(() => {
    const parts = selectedFiscalYear.split('-');
    const startYear = parseInt(parts[0], 10) || 2026;
    const endYear = parseInt(parts[1], 10) || startYear + 1;

    const fiscalMonthsConfig = [
      { name: 'July', key: 'Jul', year: startYear, idx: 1 },
      { name: 'August', key: 'Aug', year: startYear, idx: 2 },
      { name: 'September', key: 'Sep', year: startYear, idx: 3 },
      { name: 'October', key: 'Oct', year: startYear, idx: 4 },
      { name: 'November', key: 'Nov', year: startYear, idx: 5 },
      { name: 'December', key: 'Dec', year: startYear, idx: 6 },
      { name: 'January', key: 'Jan', year: endYear, idx: 7 },
      { name: 'February', key: 'Feb', year: endYear, idx: 8 },
      { name: 'March', key: 'Mar', year: endYear, idx: 9 },
      { name: 'April', key: 'Apr', year: endYear, idx: 10 },
      { name: 'May', key: 'May', year: endYear, idx: 11 },
      { name: 'June', key: 'Jun', year: endYear, idx: 12 },
    ];

    // Reference today date to distinguish past vs future
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonthNum = currentDate.getMonth() + 1; // 1-12

    return fiscalMonthsConfig.map(m => {
      const fullMonthName = `${m.name} ${m.year}`;
      const shortLabel = `${m.key} '${String(m.year).slice(-2)}`;

      // 1. Determine projected expense based on selected projection mode
      let projectedAmount = 0;
      if (projectionMode === 'zero') {
        projectedAmount = 0;
      } else if (projectionMode === 'custom' && customAnnualBudget > 0) {
        projectedAmount = Math.round(customAnnualBudget / 12);
      } else {
        // realtime
        if (activeStaffBaseline.count > 0 && activeStaffBaseline.net > 0) {
          projectedAmount = activeStaffBaseline.net;
          if (m.name === 'March' || m.name === 'September') {
            projectedAmount = Math.round(projectedAmount * 1.03); // periodic increment/bonus allowance
          }
        } else {
          projectedAmount = 0;
        }
      }

      // 2. Determine actual expense from payrollRuns and accounts expenses
      const matchedRun = runs.find(
        r =>
          r.month.toLowerCase() === fullMonthName.toLowerCase() ||
          (r.month.toLowerCase().startsWith(m.name.toLowerCase()) && r.fiscalYear === selectedFiscalYear)
      );

      let actualAmount: number | null = null;
      let status: MonthProjectionData['status'] = 'forecast';
      let statusLabel = 'Forecast';
      let empCount = activeStaffBaseline.count;

      if (matchedRun) {
        empCount = matchedRun.totalEmployees;
        if (matchedRun.status === 'paid') {
          actualAmount = matchedRun.totalNetPayroll;
          status = 'paid';
          statusLabel = 'Paid';
        } else if (matchedRun.status === 'approved') {
          actualAmount = matchedRun.totalNetPayroll;
          status = 'approved';
          statusLabel = 'Approved';
        } else if (matchedRun.status === 'processed') {
          actualAmount = matchedRun.totalNetPayroll;
          status = 'processed';
          statusLabel = 'Processed';
        } else if (matchedRun.status === 'draft') {
          actualAmount = matchedRun.totalNetPayroll;
          status = 'draft';
          statusLabel = 'Draft';
        }
      } else {
        // Look up direct expenses in accounts
        const matchedExpenses = expenses.filter(
          e =>
            (e.category === 'Staff Salaries' || e.title.toLowerCase().includes('salary')) &&
            (e.monthForSalary === fullMonthName || e.title.includes(fullMonthName))
        );
        const sumExp = matchedExpenses.reduce((sum, e) => sum + e.amount, 0);
        if (sumExp > 0) {
          actualAmount = sumExp;
          status = 'paid';
          statusLabel = 'Disbursed (Accounts)';
        } else {
          // Check if this month is in the past
          const monthCalIndex = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ].indexOf(m.name) + 1;

          const isPastMonth = m.year < currentYear || (m.year === currentYear && monthCalIndex < currentMonthNum);

          if (isPastMonth) {
            status = 'unprocessed';
            statusLabel = 'Unprocessed';
            actualAmount = null;
          } else {
            status = 'forecast';
            statusLabel = 'Forecast';
            actualAmount = null;
          }
        }
      }

      // Variance calculation: Projected - Actual (Positive = Savings/Under budget, Negative = Over budget)
      let variance: number | null = null;
      let variancePercent: number | null = null;
      if (actualAmount !== null) {
        variance = projectedAmount - actualAmount;
        variancePercent = projectedAmount > 0 ? Math.round((variance / projectedAmount) * 100) : 0;
      }

      return {
        monthKey: m.key,
        shortName: shortLabel,
        fullMonth: fullMonthName,
        fiscalMonthIndex: m.idx,
        calendarYear: m.year,
        projected: projectedAmount,
        actual: actualAmount,
        variance,
        variancePercent,
        status,
        statusLabel,
        employeeCount: empCount,
      };
    });
  }, [selectedFiscalYear, runs, expenses, activeStaffBaseline]);

  // Aggregate Summary KPIs for the Fiscal Year
  const summaryKPIs = useMemo(() => {
    const totalProjectedFY = chartData.reduce((sum, m) => sum + m.projected, 0);
    const monthsWithActuals = chartData.filter(m => m.actual !== null);
    const totalActualYTD = monthsWithActuals.reduce((sum, m) => sum + (m.actual || 0), 0);
    const totalProjectedYTD = monthsWithActuals.reduce((sum, m) => sum + m.projected, 0);
    const netVarianceYTD = totalProjectedYTD - totalActualYTD;
    const remainingForecast = chartData
      .filter(m => m.actual === null)
      .reduce((sum, m) => sum + m.projected, 0);
    const yearEndForecastTotal = totalActualYTD + remainingForecast;

    return {
      totalProjectedFY,
      totalActualYTD,
      netVarianceYTD,
      monthsProcessedCount: monthsWithActuals.length,
      remainingForecast,
      yearEndForecastTotal,
      savingsRate: totalProjectedYTD > 0 ? ((netVarianceYTD / totalProjectedYTD) * 100).toFixed(1) : '0',
    };
  }, [chartData]);

  // CSV Export for Fiscal Year Payroll Projection
  const handleExportCSV = () => {
    const headers = ['Fiscal Month', 'Month & Year', 'Projected (PKR)', 'Actual (PKR)', 'Variance (PKR)', 'Variance (%)', 'Status', 'Employees'];
    const rows = chartData.map(d => [
      `M${d.fiscalMonthIndex}`,
      `"${d.fullMonth}"`,
      d.projected,
      d.actual !== null ? d.actual : '',
      d.variance !== null ? d.variance : '',
      d.variancePercent !== null ? `${d.variancePercent}%` : '',
      `"${d.statusLabel}"`,
      d.employeeCount,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payroll_Projection_vs_Actual_${selectedFiscalYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save projection settings
  const handleSaveProjectionConfig = async () => {
    try {
      const budgetNum = modalMode === 'custom' ? Math.max(0, Number(modalBudgetInput) || 0) : 0;
      const updatedPayrollSettings = {
        ...(settings.payrollSettings || {
          workingDaysPerMonth: 26,
          overtimeHourlyRate: 250,
          maxLoanSalaryMultiplier: 5,
          allowMultipleActiveLoans: false,
          maxAdvanceSalaryPercent: 50,
          providentFundPercent: 5,
          taxBrackets: [],
          allowanceTypes: [],
          deductionTypes: [],
        }),
        projectionMode: modalMode,
        customAnnualBudget: budgetNum,
      };

      const updatedSchoolSettings: SchoolSettings = {
        ...settings,
        payrollSettings: updatedPayrollSettings,
      };

      if (updateSettingsFn) {
        await updateSettingsFn(updatedSchoolSettings);
      }
      payrollStorage.saveSettings(updatedPayrollSettings);
      setActionFeedback('Budget projection settings saved successfully!');
      setTimeout(() => {
        setActionFeedback(null);
        setIsResetModalOpen(false);
      }, 1000);
    } catch (err) {
      console.error('Failed to save projection configuration:', err);
      setActionFeedback('Failed to save configuration. Please try again.');
    }
  };

  // Factory reset payroll runs and clear all dummy data
  const handleFactoryResetPayrollData = async () => {
    if (resetConfirmText.trim().toUpperCase() !== 'RESET') {
      alert('Please type "RESET" to confirm.');
      return;
    }
    setIsClearingRuns(true);
    try {
      const res = payrollStorage.clearAllPayrollData();
      if (onResetPayrollRuns) {
        onResetPayrollRuns();
      }

      const updatedPayrollSettings = {
        ...(settings.payrollSettings || {
          workingDaysPerMonth: 26,
          overtimeHourlyRate: 250,
          maxLoanSalaryMultiplier: 5,
          allowMultipleActiveLoans: false,
          maxAdvanceSalaryPercent: 50,
          providentFundPercent: 5,
          taxBrackets: [],
          allowanceTypes: [],
          deductionTypes: [],
        }),
        projectionMode: 'realtime' as const,
        customAnnualBudget: 0,
      };
      const updatedSchoolSettings: SchoolSettings = {
        ...settings,
        payrollSettings: updatedPayrollSettings,
      };
      if (updateSettingsFn) {
        await updateSettingsFn(updatedSchoolSettings);
      }
      payrollStorage.saveSettings(updatedPayrollSettings);

      setActionFeedback(
        `Factory Reset complete: Cleared ${res.clearedRuns} payroll runs, ${res.clearedLoans} loans, and ${res.clearedAdvances} advances. Projections reset to 0!`
      );
      setTimeout(() => {
        setActionFeedback(null);
        setIsClearingRuns(false);
        setIsResetModalOpen(false);
        setResetConfirmText('');
      }, 1500);
    } catch (err) {
      console.error('Error resetting payroll data:', err);
      setIsClearingRuns(false);
      setActionFeedback('Failed to reset payroll runs.');
    }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Header with Title & Controls */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Projected vs. Actual Payroll Expenses
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
              FY {selectedFiscalYear}
            </span>
            {projectionMode === 'zero' && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Reset: Zero Base
              </span>
            )}
            {projectionMode === 'custom' && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                Custom Budget
              </span>
            )}
            {projectionMode === 'realtime' && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                Strict Real-time ({activeStaffBaseline.count} Staff)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visualizes planned compensation budget versus realized staff payroll disbursements across all 12 fiscal months.
          </p>
        </div>

        {/* View Mode & Fiscal Year Toggles */}
        <div className="flex items-center gap-2 flex-wrap self-stretch md:self-auto justify-between md:justify-end">
          {/* Fiscal Year Picker */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedFiscalYear}
              onChange={e => setSelectedFiscalYear(e.target.value)}
              className="bg-transparent font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer text-xs"
            >
              <option value="2026-2027">FY 2026-2027</option>
              <option value="2025-2026">FY 2025-2026</option>
              <option value="2027-2028">FY 2027-2028</option>
            </select>
          </div>

          {/* View Mode Segmented Control */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setChartViewMode('combo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                chartViewMode === 'combo'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Bar &amp; Line</span>
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('area')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                chartViewMode === 'area'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Area Trend</span>
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                chartViewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Breakdown</span>
            </button>
          </div>

          {/* Reset Annual Budget Button */}
          <button
            type="button"
            id="reset-annual-budget-chart-btn"
            data-testid="reset-annual-budget-chart-btn"
            onClick={() => {
              if (onOpenResetAnnualBudgetModal) {
                onOpenResetAnnualBudgetModal();
              } else {
                setModalMode(projectionMode);
                setModalBudgetInput(customAnnualBudget > 0 ? String(customAnnualBudget) : '');
                setResetConfirmText('');
                setActionFeedback(null);
                setIsResetModalOpen(true);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 shadow-2xs cursor-pointer transition active:scale-95"
            title="Reset Annual Budget: clears projected and actual payroll expense data with admin re-authentication"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Annual Budget</span>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Export Projection Report to CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-xs">
        {/* Card 1: Annual FY Budget (Projected) with Factory Reset / Clear All button */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Annual FY Budget (Projected)
              </span>
              <button
                type="button"
                onClick={() => {
                  setModalMode(projectionMode);
                  setModalBudgetInput(customAnnualBudget > 0 ? String(customAnnualBudget) : '');
                  setResetConfirmText('');
                  setActionFeedback(null);
                  setIsResetModalOpen(true);
                }}
                className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
                title="Reset or configure Annual FY Budget"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            </div>
            <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {formatCurrency(summaryKPIs.totalProjectedFY, settings.currencySymbol)}
            </p>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
            <span className="truncate">
              {projectionMode === 'custom'
                ? 'Custom Annual Allocation'
                : projectionMode === 'zero'
                ? 'Reset to 0 (Clean)'
                : `${activeStaffBaseline.count} Active Staff`}
            </span>
            {summaryKPIs.totalProjectedFY === 0 && (
              <span className="text-amber-500 font-bold shrink-0">Clean (PKR 0)</span>
            )}
          </div>
        </div>

        {/* Card 2: Actual Disbursed (YTD) */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Actual Disbursed (YTD)
            </span>
            <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(summaryKPIs.totalActualYTD, settings.currencySymbol)}
            </p>
          </div>
          <span className="text-[10px] text-emerald-600/80 font-medium block mt-1">
            {summaryKPIs.monthsProcessedCount} of 12 months realized
          </span>
        </div>

        {/* Card 3: Budget Variance (YTD) */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Budget Variance (YTD)
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              {summaryKPIs.netVarianceYTD >= 0 ? (
                <ArrowDownRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <ArrowUpRight className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <p
                className={`text-base sm:text-lg font-black truncate ${
                  summaryKPIs.netVarianceYTD >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {summaryKPIs.netVarianceYTD >= 0 ? '+' : ''}
                {formatCurrency(summaryKPIs.netVarianceYTD, settings.currencySymbol)}
              </p>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {summaryKPIs.totalActualYTD === 0 && summaryKPIs.totalProjectedFY === 0
              ? 'On Track'
              : summaryKPIs.netVarianceYTD >= 0
              ? `${summaryKPIs.savingsRate}% Under Budget`
              : 'Over Budget'}
          </span>
        </div>

        {/* Card 4: Year-End Estimated Total with Factory Reset / Configure button */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Year-End Estimated Total
              </span>
              <button
                type="button"
                onClick={() => {
                  setModalMode(projectionMode);
                  setModalBudgetInput(customAnnualBudget > 0 ? String(customAnnualBudget) : '');
                  setResetConfirmText('');
                  setActionFeedback(null);
                  setIsResetModalOpen(true);
                }}
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
                title="Configure live forecast or clear dummy runs"
              >
                <Sliders className="w-2.5 h-2.5" />
                <span>Adjust</span>
              </button>
            </div>
            <p className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              {formatCurrency(summaryKPIs.yearEndForecastTotal, settings.currencySymbol)}
            </p>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {summaryKPIs.yearEndForecastTotal === 0
              ? 'Clean Slate (PKR 0)'
              : 'Actual YTD + Future Forecast'}
          </span>
        </div>
      </div>

      {/* Main Chart Area */}
      {chartViewMode !== 'table' ? (
        <div className="p-5">
          {summaryKPIs.totalProjectedFY === 0 && summaryKPIs.totalActualYTD === 0 && (
            <div className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    Clean Slate Active: Real-time Data Only (0 PKR Budget &amp; Forecast)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Dummy data has been cleared. Register staff in Staff Directory to generate live projections, or configure an approved annual budget.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('custom');
                    setModalBudgetInput('');
                    setResetConfirmText('');
                    setActionFeedback(null);
                    setIsResetModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer text-xs"
                >
                  Set Annual Budget
                </button>
              </div>
            </div>
          )}
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartViewMode === 'combo' ? (
                <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: 10, bottom: 25 }}>
                  <defs>
                    <linearGradient id="actualBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="projectedLineArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
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
                    tickFormatter={val => `${Math.round(val / 1000)}k`}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload as MonthProjectionData;
                      return (
                        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs border border-slate-700 min-w-48">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                            <span className="font-black text-slate-100">{data.fullMonth}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                data.status === 'paid'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : data.status === 'approved'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : data.status === 'processed'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : data.status === 'draft'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-slate-700 text-slate-400'
                              }`}
                            >
                              {data.statusLabel}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-slate-300">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                <span>Projected Budget:</span>
                              </span>
                              <span className="font-mono font-bold text-white">
                                {formatCurrency(data.projected, settings.currencySymbol)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-slate-300">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <span>Actual Expense:</span>
                              </span>
                              <span className="font-mono font-bold text-emerald-400">
                                {data.actual !== null
                                  ? formatCurrency(data.actual, settings.currencySymbol)
                                  : 'Pending'}
                              </span>
                            </div>

                            {data.variance !== null && (
                              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                                <span className="text-slate-400">Variance (Diff):</span>
                                <span
                                  className={`font-mono font-bold ${
                                    data.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {data.variance >= 0 ? '+' : ''}
                                  {formatCurrency(data.variance, settings.currencySymbol)} (
                                  {data.variancePercent}%)
                                </span>
                              </div>
                            )}

                            <div className="text-[10px] text-slate-400 pt-1">
                              Staff on Payroll: <strong className="text-white">{data.employeeCount}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <RechartsLegend
                    verticalAlign="bottom"
                    iconType="circle"
                    height={36}
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  />
                  {/* Background Projected Area Shade */}
                  <Area
                    type="monotone"
                    dataKey="projected"
                    fill="url(#projectedLineArea)"
                    stroke="none"
                    name="Projected Baseline Range"
                  />
                  {/* Actual Expense Bar */}
                  <Bar
                    dataKey="actual"
                    name="Actual Disbursed"
                    fill="url(#actualBarGrad)"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={36}
                  />
                  {/* Projected Line */}
                  <Line
                    type="monotone"
                    dataKey="projected"
                    name="Projected Budget Goal"
                    stroke="#6366f1"
                    strokeWidth={3}
                    strokeDasharray="4 4"
                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 1, stroke: '#ffffff' }}
                    activeDot={{ r: 6, fill: '#4f46e5' }}
                  />
                </ComposedChart>
              ) : (
                <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: 10, bottom: 25 }}>
                  <defs>
                    <linearGradient id="areaActualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="areaProjectedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                  <XAxis dataKey="shortName" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={val => `${Math.round(val / 1000)}k`} tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    formatter={(val: any, name: any) => [
                      val !== null ? formatCurrency(Number(val), settings.currencySymbol) : 'Pending',
                      name,
                    ]}
                  />
                  <RechartsLegend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="projected"
                    name="Projected Budget"
                    stroke="#6366f1"
                    fill="url(#areaProjectedGrad)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    name="Actual Disbursed"
                    stroke="#10b981"
                    fill="url(#areaActualGrad)"
                    strokeWidth={2.5}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        /* Tabular Breakdown View */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Fiscal Period</th>
                <th className="py-3 px-4">Calendar Month</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Staff Count</th>
                <th className="py-3 px-4 text-right">Projected (PKR)</th>
                <th className="py-3 px-4 text-right">Actual (PKR)</th>
                <th className="py-3 px-4 text-right">Variance</th>
                <th className="py-3 px-4 text-right">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {chartData.map(item => (
                <tr key={item.fullMonth} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-500">M{item.fiscalMonthIndex}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {onNavigateToMonth ? (
                      <button
                        type="button"
                        onClick={() => onNavigateToMonth(item.fullMonth)}
                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer font-bold text-left"
                      >
                        {item.fullMonth}
                      </button>
                    ) : (
                      item.fullMonth
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'paid'
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          : item.status === 'approved'
                          ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                          : item.status === 'processed'
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                          : item.status === 'draft'
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {item.status === 'paid' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {item.status === 'processed' && <Clock className="w-3 h-3 text-amber-600" />}
                      <span>{item.statusLabel}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400 font-mono">
                    {item.employeeCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                    {formatCurrency(item.projected, settings.currencySymbol)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {item.actual !== null ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.actual, settings.currencySymbol)}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Pending</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {item.variance !== null ? (
                      <span
                        className={`font-bold ${
                          item.variance >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {item.variance >= 0 ? '+' : ''}
                        {formatCurrency(item.variance, settings.currencySymbol)}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {item.variancePercent !== null ? (
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          item.variancePercent >= 0
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}
                      >
                        {item.variancePercent >= 0 ? `${item.variancePercent}% Saved` : `${Math.abs(item.variancePercent)}% Over`}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Forecasted</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50/80 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
              <tr>
                <td colSpan={4} className="py-3 px-4 text-slate-700 dark:text-slate-300">
                  Fiscal Year Total (Realized YTD + Forecast)
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-white">
                  {formatCurrency(summaryKPIs.totalProjectedFY, settings.currencySymbol)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(summaryKPIs.totalActualYTD, settings.currencySymbol)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                  {summaryKPIs.netVarianceYTD >= 0 ? '+' : ''}
                  {formatCurrency(summaryKPIs.netVarianceYTD, settings.currencySymbol)}
                </td>
                <td className="py-3 px-4 text-right text-[10px] text-emerald-600 font-black">
                  {summaryKPIs.savingsRate}% YTD Savings
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Footer Insight Note */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>
            Projected expense includes active staff salaries, statutory allowances, and scheduled adjustments. Actual amounts reflect verified payroll disbursements.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 font-medium">
          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            Projected Budget
          </span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            Actual Disbursed
          </span>
        </div>
      </div>

      {/* Factory Reset & Budget Configuration Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Payroll Budget &amp; Projections Control
                  </h3>
                  <p className="text-xs text-slate-500">
                    Factory reset dummy projections or configure real-time budget for FY {selectedFiscalYear}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {actionFeedback && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{actionFeedback}</span>
                </div>
              )}

              {/* Status Snapshot Strip */}
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Staff</span>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">
                    {activeStaffBaseline.count} Employees
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Live Net / Mo</span>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatCurrency(activeStaffBaseline.net, settings.currencySymbol)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Actual YTD Paid</span>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(summaryKPIs.totalActualYTD, settings.currencySymbol)}
                  </p>
                </div>
              </div>

              {/* Section 1: Projection Mode Choice */}
              <div>
                <label className="font-black text-slate-900 dark:text-white block mb-2">
                  Select Annual FY Budget (Projected) Calculation Mode:
                </label>
                <div className="space-y-2">
                  {/* Option 1: Strict Live Real-Time Data */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      modalMode === 'realtime'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="projMode"
                      value="realtime"
                      checked={modalMode === 'realtime'}
                      onChange={() => setModalMode('realtime')}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Strict Live Real-time (Recommended)
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                          Dynamic
                        </span>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        Calculates directly from active faculty &amp; staff on roster ({activeStaffBaseline.count} staff = {formatCurrency(activeStaffBaseline.net * 12, settings.currencySymbol)}/yr). If 0 staff are registered, annual projected budget will be 0 PKR.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Clean Slate / Reset to 0 */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      modalMode === 'zero'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="projMode"
                      value="zero"
                      checked={modalMode === 'zero'}
                      onChange={() => setModalMode('zero')}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        Reset Projections to Zero (0 PKR Clean Slate)
                      </span>
                      <p className="text-slate-500 mt-0.5">
                        Forces Annual FY Budget (Projected) and Year-End Estimated Total to 0 PKR until you explicitly allocate funds. Ideal for new schools setting up accounts from scratch.
                      </p>
                    </div>
                  </label>

                  {/* Option 3: Custom Approved Budget */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      modalMode === 'custom'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="projMode"
                      value="custom"
                      checked={modalMode === 'custom'}
                      onChange={() => setModalMode('custom')}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-slate-900 dark:text-white">
                        Set Custom Annual FY Approved Budget
                      </span>
                      <p className="text-slate-500 mt-0.5">
                        Set a predetermined annual compensation limit approved by the school board or trust committee, distributed evenly across the 12 fiscal months.
                      </p>
                      {modalMode === 'custom' && (
                        <div className="mt-2.5">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Total Approved Annual Budget ({settings.currencySymbol}):
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="e.g. 600000"
                            value={modalBudgetInput}
                            onChange={e => setModalBudgetInput(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                          />
                          {modalBudgetInput && Number(modalBudgetInput) > 0 && (
                            <span className="text-[11px] text-slate-500 mt-1 block">
                              Approx. {formatCurrency(Math.round(Number(modalBudgetInput) / 12), settings.currencySymbol)} per month
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Section 2: Danger Zone - Clear All Mock / Draft Payroll Runs */}
              <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-3">
                <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-black">Factory Reset All Stored Payroll Runs</h4>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                      Clears dummy and prior payroll runs ({runs.length} runs on record), active loans, and salary advance requests so that "Actual Disbursed (YTD)" and "Year-End Estimated Total" calculate purely from real new transactions.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-rose-800 dark:text-rose-300 mb-1">
                    Type <span className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-rose-300 dark:border-rose-800">RESET</span> to confirm factory clearing:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type RESET"
                      value={resetConfirmText}
                      onChange={e => setResetConfirmText(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 font-mono text-xs focus:outline-hidden uppercase"
                    />
                    <button
                      type="button"
                      disabled={resetConfirmText.trim().toUpperCase() !== 'RESET' || isClearingRuns}
                      onClick={() => {
                        if (onOpenResetAnnualBudgetModal) {
                          setIsResetModalOpen(false);
                          onOpenResetAnnualBudgetModal();
                        } else {
                          handleFactoryResetPayrollData();
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs cursor-pointer transition flex items-center gap-1.5"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isClearingRuns ? 'animate-spin' : ''}`} />
                      <span>{isClearingRuns ? 'Clearing...' : 'Factory Reset Runs'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProjectionConfig}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Apply &amp; Save Projections
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
