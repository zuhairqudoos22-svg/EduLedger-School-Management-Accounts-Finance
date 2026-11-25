import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { DataResetConfirmationModal } from '../common/DataResetConfirmationModal';
import { useAuth } from '../../context/AuthContext';
import {
  DepartmentBudget,
  ExpenseCategory,
  PaymentMode,
} from '../../types';
import {
  formatCurrency,
  formatDate,
  getTodayDateString,
  exportToCSV,
  exportToExcel,
} from '../../utils/formatters';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ReferenceLine,
  Cell,
  PieChart as RechartsPieChart,
  Pie,
} from 'recharts';
import {
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Download,
  Printer,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info,
  Sliders,
  PieChart as PieChartIcon,
  Receipt,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { FiscalYearPayrollProjectionChart } from './FiscalYearPayrollProjectionChart';

// Standard available expense categories for department linking
const AVAILABLE_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Utilities (Electricity/Water)',
  'Building Maintenance',
  'Repairs & Maintenance',
  'Transport & Fuel',
  'IT & Software',
  'Lab & Sports Equipment',
  'Educational Supplies',
  'Stationery',
  'Exam & Events',
  'Marketing & Advertising',
  'Staff Salaries',
  'Office Expenses',
  'Bank Charges',
  'Miscellaneous',
];

// Department Presets with default category mappings
const DEPARTMENT_PRESETS: {
  name: string;
  defaultHead: string;
  categories: ExpenseCategory[];
  defaultSharePct: number;
}[] = [
  {
    name: 'Facilities, Campus & Utilities',
    defaultHead: 'Robert Jenkins (Facilities Manager)',
    categories: ['Utilities (Electricity/Water)', 'Building Maintenance', 'Repairs & Maintenance'],
    defaultSharePct: 15,
  },
  {
    name: 'IT & Digital Infrastructure',
    defaultHead: 'Marcus Sterling (IT Director)',
    categories: ['IT & Software'],
    defaultSharePct: 6,
  },
  {
    name: 'Science, Laboratories & STEM',
    defaultHead: 'Dr. Aris Thorne (Head of Science)',
    categories: ['Lab & Sports Equipment', 'Educational Supplies'],
    defaultSharePct: 8,
  },
  {
    name: 'Transportation, Fleet & Fuel',
    defaultHead: 'Captain Miller (Transport Lead)',
    categories: ['Transport & Fuel'],
    defaultSharePct: 9,
  },
  {
    name: 'Examinations, Events & Graduation',
    defaultHead: 'David Kowalski (Exam Controller)',
    categories: ['Exam & Events'],
    defaultSharePct: 7,
  },
  {
    name: 'Academics, Library & Stationery',
    defaultHead: 'Sarah Jenkins (Academic Dean)',
    categories: ['Stationery', 'Educational Supplies'],
    defaultSharePct: 6,
  },
  {
    name: 'Administration & Operations',
    defaultHead: 'Eleanor Vance (Principal)',
    categories: ['Office Expenses', 'Bank Charges', 'Miscellaneous'],
    defaultSharePct: 6,
  },
  {
    name: 'Marketing & Student Admissions',
    defaultHead: 'Clara Oswald (Admissions Lead)',
    categories: ['Marketing & Advertising'],
    defaultSharePct: 4,
  },
  {
    name: 'Faculty & Staff Payroll',
    defaultHead: 'Thomas Wright (Bursar)',
    categories: ['Staff Salaries'],
    defaultSharePct: 39,
  },
];

export const BudgetPlanningView: React.FC = () => {
  const {
    budgets,
    expenses,
    settings,
    staff,
    payrollRuns,
    updateSettings,
    addBudget,
    updateBudget,
    deleteBudget,
    copyBudgetsToMonth,
    recordExpense,
  } = useSchool();
  const { currentUser, isAdmin, isMainAdmin } = useAuth();
  const canResetAnnualBudget = isMainAdmin || isAdmin || currentUser?.role === 'admin';

  // Sub-tab view: Departmental Budgets vs. Projected vs. Actual Payroll Expenses
  const [activeBudgetTab, setActiveBudgetTab] = useState<'departments' | 'payroll_projections'>('departments');

  // Reset Annual Budget Modal State
  const [isResetAnnualBudgetModalOpen, setIsResetAnnualBudgetModalOpen] = useState(false);

  // Active Selected Month in YYYY-MM format (Default: 2026-09)
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Over' | 'Near' | 'Healthy'>('All');
  const [chartView, setChartView] = useState<'comparison' | 'distribution'>('comparison');

  // Expanded department transaction drilldown
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Modals State
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<DepartmentBudget | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  // Auto Distribute / Bulk Allocation Modal
  const [isAutoDistributeModalOpen, setIsAutoDistributeModalOpen] = useState(false);
  const [totalCapInput, setTotalCapInput] = useState<number>(35000);

  // Quick Log Expense for Dept Modal
  const [quickExpenseDept, setQuickExpenseDept] = useState<DepartmentBudget | null>(null);
  const [quickExpenseForm, setQuickExpenseForm] = useState({
    title: '',
    category: 'Utilities (Electricity/Water)' as ExpenseCategory,
    amount: 100,
    date: getTodayDateString(),
    paymentMode: 'Bank Transfer' as PaymentMode,
    referenceNumber: '',
    notes: '',
  });

  // Budget Form State
  const [budgetForm, setBudgetForm] = useState<{
    department: string;
    month: string;
    allocatedAmount: number;
    categories: ExpenseCategory[];
    departmentHead: string;
    fiscalYear: string;
    alertThresholdPct: number;
    notes: string;
  }>({
    department: '',
    month: selectedMonth,
    allocatedAmount: 1000,
    categories: ['Utilities (Electricity/Water)'],
    departmentHead: '',
    fiscalYear: '2026-2027',
    alertThresholdPct: 90,
    notes: '',
  });

  // Month Navigation helpers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    const nextY = date.getFullYear();
    const nextM = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${nextY}-${nextM}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    const nextY = date.getFullYear();
    const nextM = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${nextY}-${nextM}`);
  };

  // Formatted human readable month title
  const formattedMonthTitle = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  // Expenses filtered to currently selected month
  const monthlyExpenses = useMemo(() => {
    return expenses.filter(e => e.date && e.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  // Filter budgets for the active month
  const activeMonthBudgets = useMemo(() => {
    return budgets.filter(b => b.month === selectedMonth);
  }, [budgets, selectedMonth]);

  // Detailed variance computation per department
  const departmentVarianceData = useMemo(() => {
    return activeMonthBudgets.map(b => {
      // Find matching expenses whose category belongs to this department's configured categories
      const matchingExpenses = monthlyExpenses.filter(e => {
        if (!e.category) return false;
        // Direct category match
        if (b.categories.includes(e.category as ExpenseCategory)) return true;
        // Match department title in expense notes or title as fallback
        if (e.title.toLowerCase().includes(b.department.toLowerCase())) return true;
        return false;
      });

      const actualSpent = matchingExpenses.reduce((sum, e) => sum + e.amount, 0);
      const allocated = b.allocatedAmount;
      const varianceAmount = allocated - actualSpent; // Positive = surplus, Negative = deficit
      const variancePct = allocated > 0 ? ((varianceAmount / allocated) * 100) : 0;
      const utilizationRate = allocated > 0 ? ((actualSpent / allocated) * 100) : 0;
      const threshold = b.alertThresholdPct || 90;

      let status: 'Over' | 'Near' | 'Healthy';
      if (actualSpent > allocated) {
        status = 'Over';
      } else if (utilizationRate >= threshold) {
        status = 'Near';
      } else {
        status = 'Healthy';
      }

      return {
        budget: b,
        department: b.department,
        departmentHead: b.departmentHead || 'N/A',
        categories: b.categories,
        allocatedAmount: allocated,
        actualSpent,
        varianceAmount,
        variancePct,
        utilizationRate,
        status,
        matchingExpenses,
      };
    });
  }, [activeMonthBudgets, monthlyExpenses]);

  // Filtered and searched department variance data
  const filteredDepartments = useMemo(() => {
    return departmentVarianceData.filter(item => {
      const matchesSearch =
        item.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.departmentHead.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus =
        statusFilter === 'All' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [departmentVarianceData, searchQuery, statusFilter]);

  // High-Level KPIs for the selected month
  const kpiSummary = useMemo(() => {
    const totalAllocated = departmentVarianceData.reduce((sum, d) => sum + d.allocatedAmount, 0);
    const totalSpent = departmentVarianceData.reduce((sum, d) => sum + d.actualSpent, 0);
    const netVariance = totalAllocated - totalSpent;
    const overallBurnRate = totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100) : 0;
    const overBudgetCount = departmentVarianceData.filter(d => d.status === 'Over').length;
    const nearLimitCount = departmentVarianceData.filter(d => d.status === 'Near').length;

    return {
      totalAllocated,
      totalSpent,
      netVariance,
      overallBurnRate,
      overBudgetCount,
      nearLimitCount,
      totalDepartments: departmentVarianceData.length,
    };
  }, [departmentVarianceData]);

  // Chart data formatted for Recharts
  const chartData = useMemo(() => {
    return departmentVarianceData.map(d => {
      let shortName = d.department;
      if (shortName.includes(',')) shortName = shortName.split(',')[0];
      if (shortName.includes('&')) shortName = shortName.split('&')[0].trim();
      if (shortName.length > 14) shortName = shortName.slice(0, 14) + '...';

      return {
        name: shortName,
        fullName: d.department,
        Allocated: d.allocatedAmount,
        Actual: d.actualSpent,
        Variance: d.varianceAmount,
        Utilization: Number(d.utilizationRate.toFixed(1)),
        isOver: d.status === 'Over',
      };
    });
  }, [departmentVarianceData]);

  // Department distribution pie chart data
  const pieDistributionData = useMemo(() => {
    const palette = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#64748b', '#0ea5e9'];
    return departmentVarianceData
      .filter(d => d.allocatedAmount > 0)
      .map((d, idx) => ({
        name: d.department.split(',')[0],
        value: d.allocatedAmount,
        spent: d.actualSpent,
        color: palette[idx % palette.length],
      }));
  }, [departmentVarianceData]);

  // Form Handlers
  const handleOpenNewBudget = (preset?: typeof DEPARTMENT_PRESETS[0]) => {
    setEditingBudget(null);
    if (preset) {
      setBudgetForm({
        department: preset.name,
        month: selectedMonth,
        allocatedAmount: Math.round(preset.defaultSharePct * 100),
        categories: [...preset.categories],
        departmentHead: preset.defaultHead,
        fiscalYear: '2026-2027',
        alertThresholdPct: 90,
        notes: '',
      });
    } else {
      setBudgetForm({
        department: '',
        month: selectedMonth,
        allocatedAmount: 1000,
        categories: ['Utilities (Electricity/Water)'],
        departmentHead: '',
        fiscalYear: '2026-2027',
        alertThresholdPct: 90,
        notes: '',
      });
    }
    setIsBudgetModalOpen(true);
  };

  const handleOpenEditBudget = (budget: DepartmentBudget) => {
    setEditingBudget(budget);
    setBudgetForm({
      department: budget.department,
      month: budget.month,
      allocatedAmount: budget.allocatedAmount,
      categories: [...budget.categories] as ExpenseCategory[],
      departmentHead: budget.departmentHead || '',
      fiscalYear: budget.fiscalYear || '2026-2027',
      alertThresholdPct: budget.alertThresholdPct || 90,
      notes: budget.notes || '',
    });
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetForm.department.trim()) {
      showNotification('Please specify a department name', 'error');
      return;
    }

    try {
      if (editingBudget) {
        await updateBudget({
          ...editingBudget,
          department: budgetForm.department,
          month: budgetForm.month,
          allocatedAmount: Number(budgetForm.allocatedAmount),
          categories: budgetForm.categories,
          departmentHead: budgetForm.departmentHead,
          fiscalYear: budgetForm.fiscalYear,
          alertThresholdPct: Number(budgetForm.alertThresholdPct),
          notes: budgetForm.notes,
          updatedAt: new Date().toISOString(),
        });
        showNotification(`Updated spending limit for ${budgetForm.department}`);
      } else {
        await addBudget({
          department: budgetForm.department,
          month: budgetForm.month,
          allocatedAmount: Number(budgetForm.allocatedAmount),
          categories: budgetForm.categories,
          departmentHead: budgetForm.departmentHead,
          fiscalYear: budgetForm.fiscalYear,
          alertThresholdPct: Number(budgetForm.alertThresholdPct),
          notes: budgetForm.notes,
        });
        showNotification(`Added budget limit for ${budgetForm.department}`);
      }
      setIsBudgetModalOpen(false);
    } catch {
      showNotification('Failed to save budget record', 'error');
    }
  };

  const handleDeleteBudgetConfirm = async () => {
    if (!deleteCandidateId) return;
    try {
      await deleteBudget(deleteCandidateId);
      showNotification('Budget limit removed successfully');
      setDeleteCandidateId(null);
    } catch {
      showNotification('Failed to delete budget limit', 'error');
    }
  };

  // Copy from Previous Month
  const handleCopyFromPreviousMonth = async () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevY = prevDate.getFullYear();
    const prevM = String(prevDate.getMonth() + 1).padStart(2, '0');
    const prevMonthKey = `${prevY}-${prevM}`;

    const prevMonthName = prevDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const success = await copyBudgetsToMonth(prevMonthKey, selectedMonth);
    if (success) {
      showNotification(`Successfully copied departmental budgets from ${prevMonthName} into ${formattedMonthTitle}`);
    } else {
      showNotification(`No source budgets found in ${prevMonthName} to copy, or all departments already configured for ${formattedMonthTitle}`, 'error');
    }
  };

  // Auto-Distribute Department Budgets
  const handleApplyAutoDistribute = async () => {
    if (!totalCapInput || totalCapInput <= 0) return;

    try {
      for (const preset of DEPARTMENT_PRESETS) {
        const allocatedAmount = Math.round((preset.defaultSharePct / 100) * totalCapInput);
        const existing = activeMonthBudgets.find(b => b.department === preset.name);

        if (existing) {
          await updateBudget({
            ...existing,
            allocatedAmount,
            categories: preset.categories,
            departmentHead: preset.defaultHead,
            updatedAt: new Date().toISOString(),
          });
        } else {
          await addBudget({
            department: preset.name,
            month: selectedMonth,
            allocatedAmount,
            categories: preset.categories,
            departmentHead: preset.defaultHead,
            fiscalYear: '2026-2027',
            alertThresholdPct: 90,
            notes: `Auto-distributed (${preset.defaultSharePct}% of $${totalCapInput.toLocaleString()})`,
          });
        }
      }
      setIsAutoDistributeModalOpen(false);
      showNotification(`Allocated $${totalCapInput.toLocaleString()} across 9 school departments for ${formattedMonthTitle}`);
    } catch {
      showNotification('Failed to auto-distribute departmental budgets', 'error');
    }
  };

  // Quick Expense submission
  const handleSaveQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickExpenseDept) return;

    try {
      await recordExpense({
        title: quickExpenseForm.title || `${quickExpenseDept.department} Supplies`,
        category: quickExpenseForm.category,
        amount: Number(quickExpenseForm.amount),
        date: quickExpenseForm.date,
        paymentMode: quickExpenseForm.paymentMode,
        referenceNumber: quickExpenseForm.referenceNumber,
        notes: quickExpenseForm.notes || `Logged under ${quickExpenseDept.department} budget`,
        recordedBy: 'Administrator',
      });
      showNotification(`Logged expense of ${formatCurrency(quickExpenseForm.amount, settings.currencySymbol)} for ${quickExpenseDept.department}`);
      setQuickExpenseDept(null);
    } catch {
      showNotification('Failed to record expense', 'error');
    }
  };

  // Export to CSV & Excel
  const handleExportCSV = () => {
    const records = departmentVarianceData.map(d => ({
      Department: d.department,
      'Department Head': d.departmentHead,
      Month: formattedMonthTitle,
      'Allocated Limit': d.allocatedAmount,
      'Actual Expenses': d.actualSpent,
      'Variance Amount': d.varianceAmount,
      'Variance Type': d.varianceAmount >= 0 ? 'Surplus' : 'Deficit',
      'Utilization (%)': Number(d.utilizationRate.toFixed(1)),
      Status: d.status === 'Over' ? 'Exceeded Limit' : d.status === 'Near' ? 'Near Limit' : 'Under Budget',
      'Linked Categories': d.categories.join('; '),
    }));
    exportToCSV(`Budget_Variance_${selectedMonth}`, records);
  };

  const handleExportExcel = () => {
    const records = departmentVarianceData.map(d => ({
      Department: d.department,
      'Department Head': d.departmentHead,
      Month: formattedMonthTitle,
      'Allocated Limit': d.allocatedAmount,
      'Actual Expenses': d.actualSpent,
      'Variance Amount': d.varianceAmount,
      'Variance Type': d.varianceAmount >= 0 ? 'Surplus' : 'Deficit',
      'Utilization (%)': Number(d.utilizationRate.toFixed(1)),
      Status: d.status === 'Over' ? 'Exceeded Limit' : d.status === 'Near' ? 'Near Limit' : 'Under Budget',
      'Linked Categories': d.categories.join('; '),
    }));
    exportToExcel(`Budget_Variance_${selectedMonth}`, 'Budget Variance', records);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header & Month Selector Ribbon */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                <PiggyBank className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Budget Planning &amp; Departmental Variance
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Set monthly spending limits for school departments and track real-time variance against expenses
                </p>
              </div>
            </div>
          </div>

          {/* Month Selector & Global Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Month Navigator Controls */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{formattedMonthTitle}</span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Actions Menu */}
            {(isAdmin || isMainAdmin || canResetAnnualBudget) && (
              <>
                <button
                  type="button"
                  onClick={() => setIsAutoDistributeModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition active:scale-95 cursor-pointer"
                  title="Auto distribute total spending cap"
                >
                  <Sliders className="w-3.5 h-3.5 text-purple-600" />
                  <span>Auto-Distribute</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyFromPreviousMonth}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition active:scale-95 cursor-pointer"
                  title="Copy department limits from prior month"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Prior Month</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenNewBudget()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Set Department Budget</span>
                </button>

                {canResetAnnualBudget && (
                  <button
                    type="button"
                    id="reset-annual-budget-btn"
                    data-testid="reset-annual-budget-btn"
                    onClick={() => setIsResetAnnualBudgetModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition active:scale-95 cursor-pointer"
                    title="Reset Annual Budget & Clear Payroll Expense Projections"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                    <span>Reset Annual Budget</span>
                  </button>
                )}
              </>
            )}

            {/* Export & Print */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportExcel}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                title="Export Excel Summary"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                title="Print Budget Statement"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Departmental Budgets vs. Projected vs. Actual Payroll Expenses */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveBudgetTab('departments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeBudgetTab === 'departments'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          <PiggyBank className="w-4 h-4" />
          <span>Departmental Spending Limits &amp; Variance</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
            {departmentVarianceData.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveBudgetTab('payroll_projections')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeBudgetTab === 'payroll_projections'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Projected vs. Actual Payroll Expenses (Fiscal Year)</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
            12 Mo
          </span>
        </button>
      </div>

      {activeBudgetTab === 'payroll_projections' ? (
        <div className="space-y-4">
          <FiscalYearPayrollProjectionChart
            runs={payrollRuns}
            staff={staff}
            expenses={expenses}
            settings={settings}
            defaultFiscalYear="2026-2027"
            onUpdateSettings={updateSettings}
            onResetPayrollRuns={() => {
              showNotification('Payroll runs reset to empty.');
            }}
            onOpenResetAnnualBudgetModal={() => setIsResetAnnualBudgetModalOpen(true)}
          />
        </div>
      ) : (
        <>
          {/* Top Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Allocated Limit */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Monthly Budget Cap
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {formatCurrency(kpiSummary.totalAllocated, settings.currencySymbol)}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Across {kpiSummary.totalDepartments} active departments
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Actual Spent */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Actual Expenses Incurred
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {formatCurrency(kpiSummary.totalSpent, settings.currencySymbol)}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {monthlyExpenses.length} transactions in {formattedMonthTitle.split(' ')[0]}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Net Variance (Surplus / Deficit) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Net Monthly Variance
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-2xl font-black font-mono ${
                  kpiSummary.netVariance >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {kpiSummary.netVariance >= 0 ? '+' : ''}
                {formatCurrency(kpiSummary.netVariance, settings.currencySymbol)}
              </span>
            </div>
            <span
              className={`text-[11px] font-bold mt-0.5 inline-flex items-center gap-1 ${
                kpiSummary.netVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {kpiSummary.netVariance >= 0 ? (
                <>
                  <TrendingUp className="w-3 h-3" />
                  Remaining Surplus
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  Over-Budget Deficit
                </>
              )}
            </span>
          </div>
          <div
            className={`p-3 rounded-2xl shrink-0 ${
              kpiSummary.netVariance >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600'
            }`}
          >
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Burn Rate & Deficit Count */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Budget Burn &amp; Alerts
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {kpiSummary.overallBurnRate.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">Burn Rate</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              {kpiSummary.overBudgetCount > 0 ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  {kpiSummary.overBudgetCount} Over Limit
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  All Under Cap
                </span>
              )}
              {kpiSummary.nearLimitCount > 0 && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {kpiSummary.nearLimitCount} Near Limit
                </span>
              )}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
            <PieChartIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visual Analytics & Charts Section (Recharts) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Departmental Budget vs. Actual Expenses</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                Interactive Variance Chart
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Comparing allocated monthly limits with recorded expenditures for {formattedMonthTitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setChartView('comparison')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  chartView === 'comparison'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Budget vs Actual
              </button>
              <button
                type="button"
                onClick={() => setChartView('distribution')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  chartView === 'distribution'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Cap Allocation Share
              </button>
            </div>
          </div>
        </div>

        {/* Chart View Canvas */}
        <div className="w-full h-80 pt-2">
          {departmentVarianceData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <PiggyBank className="w-12 h-12 mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No Department Budgets Found for {formattedMonthTitle}</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Click &ldquo;Auto-Distribute&rdquo; to populate default limits or set limits manually for each department.
              </p>
            </div>
          ) : chartView === 'comparison' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 15, right: 20, left: 0, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  interval={0}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={val => `$${val.toLocaleString()}`}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 min-w-[200px]">
                        <div className="font-black text-sm text-indigo-300 border-b border-slate-800 pb-1">
                          {d.fullName}
                        </div>
                        <div className="flex items-center justify-between font-mono">
                          <span className="text-slate-400">Budget Limit:</span>
                          <span className="font-bold text-white">{formatCurrency(d.Allocated, settings.currencySymbol)}</span>
                        </div>
                        <div className="flex items-center justify-between font-mono">
                          <span className="text-slate-400">Actual Expense:</span>
                          <span className={d.isOver ? 'font-bold text-rose-400' : 'font-bold text-emerald-400'}>
                            {formatCurrency(d.Actual, settings.currencySymbol)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between font-mono pt-1 border-t border-slate-800">
                          <span className="text-slate-400">Variance:</span>
                          <span className={d.Variance >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {d.Variance >= 0 ? '+' : ''}{formatCurrency(d.Variance, settings.currencySymbol)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Utilization:</span>
                          <span className="font-bold text-indigo-300">{d.Utilization}%</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <RechartsLegend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="Allocated" name="Budget Limit" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" name="Actual Spent" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isOver ? '#e11d48' : '#10b981'} />
                  ))}
                </Bar>
                <ReferenceLine y={0} stroke="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <RechartsTooltip
                  formatter={(val: any) => [formatCurrency(Number(val), settings.currencySymbol), 'Allocated Limit']}
                />
                <RechartsLegend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Pie
                  data={pieDistributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={105}
                  innerRadius={55}
                  paddingAngle={2}
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''}: ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {pieDistributionData.map((entry, index) => (
                    <Cell key={`slice-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </RechartsPieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Explanatory notes */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
              <span>Allocated Spending Cap</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Actual Expenses (Within Budget)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
              <span>Over Budget (Deficit Spike)</span>
            </span>
          </div>

          <span className="italic text-slate-400">
            Tip: Actual expenses are dynamically calculated from real logged expenditures in the Expense Tracker
          </span>
        </div>
      </div>

      {/* Department Spending Limits Ledger Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Filters Ribbon */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search departments or managers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-transparent focus:outline-hidden"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="bg-transparent font-bold focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Departments</option>
                <option value="Over">Over Budget Only (Deficit)</option>
                <option value="Near">Near Limit Only (&gt;85%)</option>
                <option value="Healthy">Under Budget (Healthy)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {filteredDepartments.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <PiggyBank className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                No Departments Found
              </h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                {activeMonthBudgets.length === 0
                  ? `No department budgets configured yet for ${formattedMonthTitle}.`
                  : 'No departments match your search or filter criteria.'}
              </p>
              {isAdmin && activeMonthBudgets.length === 0 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAutoDistributeModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                  >
                    Quick Auto-Distribute Budgets
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyFromPreviousMonth}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Copy Prior Month
                  </button>
                </div>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Department &amp; Head</th>
                  <th className="py-3 px-3">Linked Categories</th>
                  <th className="py-3 px-3">Monthly Limit</th>
                  <th className="py-3 px-3">Actual Spent</th>
                  <th className="py-3 px-3">Variance ($)</th>
                  <th className="py-3 px-3 min-w-[140px]">Utilization Rate</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredDepartments.map(item => {
                  const isExpanded = expandedDeptId === item.budget.id;
                  const isOver = item.status === 'Over';
                  const isNear = item.status === 'Near';

                  return (
                    <React.Fragment key={item.budget.id}>
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        {/* Department */}
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              isOver ? 'bg-rose-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                            <div>
                              <span className="font-bold block text-slate-900 dark:text-white">
                                {item.department}
                              </span>
                              <span className="text-[11px] text-slate-400 font-normal">
                                {item.departmentHead}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Linked Categories */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1 flex-wrap max-w-xs">
                            {item.categories.slice(0, 2).map(cat => (
                              <span
                                key={cat}
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              >
                                {cat}
                              </span>
                            ))}
                            {item.categories.length > 2 && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                +{item.categories.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Allocated Limit */}
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {formatCurrency(item.allocatedAmount, settings.currencySymbol)}
                        </td>

                        {/* Actual Spent */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                              {formatCurrency(item.actualSpent, settings.currencySymbol)}
                            </span>
                            {item.matchingExpenses.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedDeptId(isExpanded ? null : item.budget.id)}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 hover:bg-indigo-100 flex items-center gap-0.5 cursor-pointer"
                                title="View expense transactions breakdown"
                              >
                                <span>{item.matchingExpenses.length}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Variance */}
                        <td className="py-3.5 px-3 font-mono">
                          <span
                            className={`font-black text-xs ${
                              item.varianceAmount >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {item.varianceAmount >= 0 ? '+' : ''}
                            {formatCurrency(item.varianceAmount, settings.currencySymbol)}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {item.variancePct >= 0 ? '+' : ''}{item.variancePct.toFixed(1)}%
                          </span>
                        </td>

                        {/* Utilization Bar */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-slate-500 font-bold">{item.utilizationRate.toFixed(1)}%</span>
                              <span className="text-slate-400">Cap: 100%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isOver
                                    ? 'bg-rose-500'
                                    : isNear
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, item.utilizationRate)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-3">
                          {isOver ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" />
                              Exceeded
                            </span>
                          ) : isNear ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1 w-fit">
                              Near Limit
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" />
                              Healthy
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Quick Log Expense */}
                            <button
                              type="button"
                              onClick={() => {
                                setQuickExpenseDept(item.budget);
                                setQuickExpenseForm({
                                  title: '',
                                  category: (item.categories[0] as ExpenseCategory) || 'Utilities (Electricity/Water)',
                                  amount: 150,
                                  date: getTodayDateString(),
                                  paymentMode: 'Bank Transfer',
                                  referenceNumber: '',
                                  notes: `Expenses for ${item.department}`,
                                });
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Log Expense for this Department"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>

                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditBudget(item.budget)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                  title="Edit Limit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteCandidateId(item.budget.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                  title="Delete Budget"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Transaction Drilldown Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 dark:bg-slate-800/50">
                          <td colSpan={8} className="p-4">
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                <span>Recorded Expenses for {item.department} ({formattedMonthTitle})</span>
                                <span className="font-mono text-indigo-600">
                                  Total: {formatCurrency(item.actualSpent, settings.currencySymbol)}
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-[11px] text-left">
                                  <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase">
                                      <th className="py-1 px-2">Date</th>
                                      <th className="py-1 px-2">Title</th>
                                      <th className="py-1 px-2">Category</th>
                                      <th className="py-1 px-2">Reference</th>
                                      <th className="py-1 px-2 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                                    {item.matchingExpenses.map(exp => (
                                      <tr key={exp.id}>
                                        <td className="py-1.5 px-2 text-slate-500">{formatDate(exp.date)}</td>
                                        <td className="py-1.5 px-2 font-sans font-medium text-slate-800 dark:text-slate-200">{exp.title}</td>
                                        <td className="py-1.5 px-2 text-slate-500">{exp.category}</td>
                                        <td className="py-1.5 px-2 text-slate-400">{exp.referenceNumber || '-'}</td>
                                        <td className="py-1.5 px-2 text-right font-bold text-slate-900 dark:text-white">
                                          {formatCurrency(exp.amount, settings.currencySymbol)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info note */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Displaying {filteredDepartments.length} of {departmentVarianceData.length} departmental allocations for {formattedMonthTitle}
          </span>
          <span className="font-mono">
            Fiscal Year: 2026-2027 • Currency: {settings.currencyCode || 'USD'} ({settings.currencySymbol || '$'})
          </span>
        </div>
      </div>
      </>
      )}

      {/* ================================================================= */}
      {/* MODAL 1: SET / EDIT DEPARTMENT BUDGET */}
      {/* ================================================================= */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingBudget ? 'Edit Department Budget Limit' : 'Set Monthly Department Budget'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="p-6 space-y-4 text-xs">
              {/* Department Name */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science, Laboratories & STEM"
                  value={budgetForm.department}
                  onChange={e => setBudgetForm(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />

                {/* Quick Presets Picker */}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Presets:</span>
                  {DEPARTMENT_PRESETS.slice(0, 5).map(p => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() =>
                        setBudgetForm(prev => ({
                          ...prev,
                          department: p.name,
                          departmentHead: p.defaultHead,
                          categories: [...p.categories],
                        }))
                      }
                      className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 transition cursor-pointer"
                    >
                      {p.name.split(',')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department Head & Month */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department Head / Manager
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Aris Thorne"
                    value={budgetForm.departmentHead}
                    onChange={e => setBudgetForm(prev => ({ ...prev, departmentHead: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Month (YYYY-MM) *
                  </label>
                  <input
                    type="month"
                    required
                    value={budgetForm.month}
                    onChange={e => setBudgetForm(prev => ({ ...prev, month: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Spending Limit & Alert Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Spending Limit ({settings.currencySymbol || '$'}) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      required
                      min={0}
                      step={50}
                      value={budgetForm.allocatedAmount}
                      onChange={e => setBudgetForm(prev => ({ ...prev, allocatedAmount: Number(e.target.value) }))}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Warning Alert Threshold (%)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={budgetForm.alertThresholdPct}
                    onChange={e => setBudgetForm(prev => ({ ...prev, alertThresholdPct: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Linked Expense Categories Multi-Select */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Linked Expense Categories (for automatic actual expense tracking)
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Expenses logged in the Expense Tracker with these categories will automatically count toward this department.
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  {AVAILABLE_EXPENSE_CATEGORIES.map(cat => {
                    const isChecked = budgetForm.categories.includes(cat);
                    return (
                      <label key={cat} className="flex items-center gap-2 cursor-pointer select-none text-[11px]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setBudgetForm(prev => ({
                                ...prev,
                                categories: prev.categories.filter(c => c !== cat),
                              }));
                            } else {
                              setBudgetForm(prev => ({
                                ...prev,
                                categories: [...prev.categories, cat],
                              }));
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="truncate">{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Budget Notes &amp; Justification
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Approved under annual campus expansion program"
                  value={budgetForm.notes}
                  onChange={e => setBudgetForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                >
                  {editingBudget ? 'Update Budget Limit' : 'Save Spending Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: AUTO DISTRIBUTE / BULK ALLOCATION */}
      {/* ================================================================= */}
      {isAutoDistributeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Auto-Distribute Monthly Spending Cap
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAutoDistributeModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-500">
                Specify a total expenditure ceiling for <strong>{formattedMonthTitle}</strong>. The system will automatically allocate proportional spending limits across 9 standard school departments based on recommended operational ratios.
              </p>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Total Monthly School Budget Ceiling ({settings.currencySymbol || '$'})
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={totalCapInput}
                    onChange={e => setTotalCapInput(Number(e.target.value))}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono font-black text-sm"
                  />
                </div>
              </div>

              {/* Allocation Preview Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800 px-3 py-2 font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>Department Preview</span>
                  <span>Calculated Limit</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto p-1 font-mono text-[11px]">
                  {DEPARTMENT_PRESETS.map(p => {
                    const allocated = Math.round((p.defaultSharePct / 100) * totalCapInput);
                    return (
                      <div key={p.name} className="flex justify-between py-1.5 px-2">
                        <span className="font-sans text-slate-700 dark:text-slate-300 truncate max-w-[240px]">
                          {p.name.split(',')[0]} ({p.defaultSharePct}%)
                        </span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(allocated, settings.currencySymbol)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Existing department budgets for {formattedMonthTitle} will be updated with the newly calculated allocations.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAutoDistributeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyAutoDistribute}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply Auto-Distribution</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: QUICK LOG EXPENSE FOR DEPARTMENT */}
      {/* ================================================================= */}
      {quickExpenseDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Quick Log Expense: {quickExpenseDept.department}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickExpenseDept(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickExpense} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Chemistry Glassware & Reagents"
                  value={quickExpenseForm.title}
                  onChange={e => setQuickExpenseForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Amount ({settings.currencySymbol || '$'}) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={quickExpenseForm.amount}
                    onChange={e => setQuickExpenseForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={quickExpenseForm.category}
                    onChange={e => setQuickExpenseForm(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                  >
                    {quickExpenseDept.categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    {AVAILABLE_EXPENSE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={quickExpenseForm.date}
                    onChange={e => setQuickExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={quickExpenseForm.paymentMode}
                    onChange={e => setQuickExpenseForm(prev => ({ ...prev, paymentMode: e.target.value as PaymentMode }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online/UPI">Online / UPI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reference / Invoice #
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-88124"
                  value={quickExpenseForm.referenceNumber}
                  onChange={e => setQuickExpenseForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setQuickExpenseDept(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteCandidateId}
        title="Remove Department Budget Limit"
        message="Are you sure you want to remove this department's spending allocation? Actual expenses in the expense tracker will remain intact."
        confirmLabel="Remove Budget"
        isDestructive={true}
        onConfirm={handleDeleteBudgetConfirm}
        onCancel={() => setDeleteCandidateId(null)}
      />

      {/* Reset Annual Budget & Payroll Projections Safety Confirmation Modal */}
      {isResetAnnualBudgetModalOpen && (
        <DataResetConfirmationModal
          isOpen={isResetAnnualBudgetModalOpen}
          actionType="reset_annual_budget"
          onClose={() => setIsResetAnnualBudgetModalOpen(false)}
          onSuccess={() => {
            showNotification('Annual budget and projected vs. actual payroll expense data have been successfully reset to 0.');
            setIsResetAnnualBudgetModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
