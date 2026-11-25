import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { Expense, ExpenseCategory, PaymentMode } from '../../types';
import { formatCurrency, formatDate, getTodayDateString, exportToCSV, exportToExcel } from '../../utils/formatters';
import { formatExpensesForExport, formatExpensesForAccountingSoftware } from '../../utils/exportUtils';
import { ExportDropdown } from '../common/ExportDropdown';
import { generateExpensesAuditPdf } from '../../utils/financialPdf';
import {
  TrendingDown,
  Plus,
  Search,
  Filter,
  Trash2,
  Download,
  Calendar,
  DollarSign,
  PieChart,
  Tag,
  CheckCircle,
  X,
  FileText,
  FileSpreadsheet,
  Sliders,
  AlertTriangle,
  ShieldAlert,
  AlertCircle,
  Bell,
  ChevronRight,
  Repeat,
  Sparkles,
  FolderTree,
  Tag as TagIcon,
  Tags,
  Upload,
  Check,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { MonthlyExpenseTrendChart } from './MonthlyExpenseTrendChart';
import { ExpenseCategoryPieChart } from './ExpenseCategoryPieChart';
import { BudgetThresholdModal } from './BudgetThresholdModal';
import { RecurringExpensesModal } from './RecurringExpensesModal';
import { ExpenseTaxonomyModal } from './ExpenseTaxonomyModal';
import { BulkExpenseCsvImportModal } from './BulkExpenseCsvImportModal';
import { DataResetConfirmationModal } from '../common/DataResetConfirmationModal';
import { DateRangePicker } from '../common/DateRangePicker';
import {
  DateRange,
  calculateDateRange,
  formatDateRangeDisplay,
} from '../../utils/dateRangeUtils';
import {
  CategoryBudgetThreshold,
  CategoryThresholdEvaluation,
  RecurringExpenseTemplate,
  CustomExpenseCategory,
  CustomExpenseTag,
  ExpenseTaxonomyConfig,
} from '../../types';
import {
  getStoredBudgetThresholds,
  saveBudgetThresholds,
  evaluateBudgetThresholds,
  checkExpenseThresholdBreach,
} from '../../utils/budgetThresholdStorage';
import {
  getStoredRecurringTemplates,
  getDueRecurringTemplates,
  executeRecurringExpenseGeneration,
} from '../../utils/recurringExpensesService';
import {
  getStoredTaxonomy,
  getCategoryColor,
  getTagColor,
  getSubCategoriesForCategory,
} from '../../utils/expenseTaxonomyStorage';

export const ExpensesView: React.FC = () => {
  const { expenses, settings, recordExpense, deleteExpense } = useSchool();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    calculateDateRange('last_3_months', settings.currentAcademicYear)
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  // Custom Categories & Tags Taxonomy State
  const [taxonomy, setTaxonomy] = useState<ExpenseTaxonomyConfig>(() => getStoredTaxonomy());
  const [isTaxonomyModalOpen, setIsTaxonomyModalOpen] = useState(false);
  const [taxonomyInitialTab, setTaxonomyInitialTab] = useState<'categories' | 'tags'>('categories');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isClearExpensesModalOpen, setIsClearExpensesModalOpen] = useState(false);

  // Synchronize taxonomy state when modified
  React.useEffect(() => {
    const handleTaxonomyEvent = (e: any) => {
      if (e.detail) setTaxonomy(e.detail);
    };
    window.addEventListener('eduledger:taxonomy-updated', handleTaxonomyEvent);
    return () => window.removeEventListener('eduledger:taxonomy-updated', handleTaxonomyEvent);
  }, []);

  // Budget Threshold Alert Feature State
  const [thresholds, setThresholds] = useState<CategoryBudgetThreshold[]>(() =>
    getStoredBudgetThresholds()
  );
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [isThresholdBannerDismissed, setIsThresholdBannerDismissed] = useState(false);

  // Recurring Expenses Feature State & Automated Scheduler
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringExpenseTemplate[]>(() =>
    getStoredRecurringTemplates()
  );
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isAutoPopulatingRecurring, setIsAutoPopulatingRecurring] = useState(false);

  // Compute live due recurring items that have reached their scheduled execution date
  const dueRecurringItems = useMemo(() => {
    return getDueRecurringTemplates(recurringTemplates, expenses, getTodayDateString());
  }, [recurringTemplates, expenses]);

  // Automated background population for templates marked with autoPost: true
  React.useEffect(() => {
    const autoDue = dueRecurringItems.filter(item => item.template.autoPost);
    if (autoDue.length > 0 && !isAutoPopulatingRecurring) {
      setIsAutoPopulatingRecurring(true);
      executeRecurringExpenseGeneration(
        autoDue,
        recordExpense,
        recurringTemplates,
        currentUser?.fullName || 'Automated Recurring Scheduler'
      )
        .then(res => {
          if (res.createdExpenses.length > 0) {
            setRecurringTemplates(res.updatedTemplates);
            const totalPosted = res.createdExpenses.reduce((s, e) => s + e.amount, 0);
            showExportNotice(
              `🤖 Automated Scheduler: Automatically posted ${res.createdExpenses.length} recurring expense vouchers for ${getTodayDateString().slice(0, 7)} (${formatCurrency(totalPosted, settings.currencySymbol)}).`
            );
          }
        })
        .catch(err => {
          console.error('Error auto-generating recurring expenses:', err);
        })
        .finally(() => {
          setIsAutoPopulatingRecurring(false);
        });
    }
  }, [expenses.length]);

  // Default evaluation month: syncs with dateRange if specific month, otherwise current month
  const defaultMonth = useMemo(() => {
    if (dateRange.startDate && (dateRange.preset === 'this_month' || dateRange.preset === 'last_month')) {
      return dateRange.startDate.slice(0, 7);
    }
    return getTodayDateString().slice(0, 7);
  }, [dateRange]);

  const [activeThresholdMonth, setActiveThresholdMonth] = useState<string>(defaultMonth);

  // Update activeThresholdMonth if date range changes to a specific month preset
  React.useEffect(() => {
    if (dateRange.startDate && (dateRange.preset === 'this_month' || dateRange.preset === 'last_month')) {
      setActiveThresholdMonth(dateRange.startDate.slice(0, 7));
    }
  }, [dateRange]);

  // Compute live evaluations for all categories
  const thresholdEvaluations: CategoryThresholdEvaluation[] = useMemo(() => {
    return evaluateBudgetThresholds(expenses, thresholds, activeThresholdMonth);
  }, [expenses, thresholds, activeThresholdMonth]);

  const exceededThresholds = useMemo(() => {
    return thresholdEvaluations.filter(e => e.status === 'exceeded' && e.threshold.enabled);
  }, [thresholdEvaluations]);

  const warningThresholds = useMemo(() => {
    return thresholdEvaluations.filter(e => e.status === 'warning' && e.threshold.enabled);
  }, [thresholdEvaluations]);

  // Dynamic Categories from custom taxonomy + existing expense records
  const categories: string[] = useMemo(() => {
    const set = new Set<string>();
    taxonomy.categories.forEach(c => set.add(c.name));
    expenses.forEach(e => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [taxonomy, expenses]);

  // Sub-categories available for filtering
  const availableSubCategories = useMemo(() => {
    const set = new Set<string>();
    if (selectedCategory !== 'All') {
      const match = taxonomy.categories.find(
        c => c.name.toLowerCase() === selectedCategory.toLowerCase()
      );
      if (match) {
        match.subCategories.forEach(s => set.add(s));
      }
      expenses
        .filter(e => e.category === selectedCategory && e.subCategory)
        .forEach(e => set.add(e.subCategory!));
    } else {
      taxonomy.categories.forEach(c => c.subCategories.forEach(s => set.add(s)));
      expenses.forEach(e => {
        if (e.subCategory) set.add(e.subCategory);
      });
    }
    return Array.from(set);
  }, [taxonomy, expenses, selectedCategory]);

  // Available tags for filtering
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    taxonomy.tags.forEach(t => set.add(t.name));
    expenses.forEach(e => {
      if (e.tags) {
        e.tags.forEach(t => set.add(t.replace(/^#+/, '')));
      }
    });
    return Array.from(set);
  }, [taxonomy, expenses]);

  // Form State with subCategory and tags
  const [formData, setFormData] = useState({
    title: '',
    category: 'Utilities (Electricity/Water)' as ExpenseCategory | string,
    subCategory: '',
    tags: [] as string[],
    amount: 150,
    date: getTodayDateString(),
    paymentMode: 'Bank Transfer' as PaymentMode,
    referenceNumber: '',
    notes: '',
  });

  // Pre-calculate real-time threshold impact when filling the expense form
  const thresholdBreachCheck = useMemo(() => {
    if (!isFormOpen || !formData.category || !formData.amount || formData.amount <= 0) {
      return null;
    }
    return checkExpenseThresholdBreach(
      formData.amount,
      formData.category,
      formData.date,
      expenses,
      thresholds
    );
  }, [isFormOpen, formData.category, formData.amount, formData.date, expenses, thresholds]);

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.subCategory && e.subCategory.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.tags && e.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (e.referenceNumber && e.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;

    const matchesSubCategory =
      selectedSubCategory === 'All' ||
      (e.subCategory && e.subCategory.toLowerCase() === selectedSubCategory.toLowerCase());

    const matchesTag =
      selectedTag === 'All' ||
      (e.tags && e.tags.some(t => t.replace(/^#+/, '').toLowerCase() === selectedTag.toLowerCase()));

    const matchesDate =
      dateRange.preset === 'all' ||
      ((!dateRange.startDate || e.date >= dateRange.startDate) &&
        (!dateRange.endDate || e.date <= dateRange.endDate));

    return matchesSearch && matchesCategory && matchesSubCategory && matchesTag && matchesDate;
  });

  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Expense title / description is required.');
      return;
    }
    if (formData.amount <= 0) {
      alert('Amount must be positive.');
      return;
    }

    // Check if recording this expense triggers an overrun
    const breachCheck = checkExpenseThresholdBreach(
      formData.amount,
      formData.category,
      formData.date,
      expenses,
      thresholds
    );

    await recordExpense({
      ...formData,
      recordedBy: currentUser?.fullName || 'Finance User',
    });

    setIsFormOpen(false);
    setFormData({
      title: '',
      category: 'Utilities (Electricity/Water)',
      subCategory: '',
      tags: [],
      amount: 150,
      date: getTodayDateString(),
      paymentMode: 'Bank Transfer',
      referenceNumber: '',
      notes: '',
    });

    // Notify finance operators if threshold limit is breached or approached
    if (breachCheck.willExceed) {
      showExportNotice(
        `🚨 BUDGET THRESHOLD ALERT: Recording $${formData.amount} pushed "${formData.category}" to ${formatCurrency(
          breachCheck.projectedSpend,
          settings.currencySymbol
        )}, exceeding the monthly limit of ${formatCurrency(
          breachCheck.limit,
          settings.currencySymbol
        )} by ${formatCurrency(breachCheck.overrunAmount, settings.currencySymbol)} (${breachCheck.projectedPercentage}%)!`
      );
      setIsThresholdBannerDismissed(false);
    } else {
      showExportNotice(`Recorded expense: "${formData.title}" (${formatCurrency(formData.amount, settings.currencySymbol)}).`);
    }
  };

  const handleDelete = async () => {
    if (deleteCandidateId) {
      await deleteExpense(deleteCandidateId);
      setDeleteCandidateId(null);
    }
  };

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const showExportNotice = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      showExportNotice('No expense records found to export.');
      return;
    }
    const currency = settings.currencyCode || 'USD';
    const rows = formatExpensesForAccountingSoftware(filteredExpenses, currency);
    const catSuffix = selectedCategory !== 'All' ? `_${selectedCategory.replace(/[^a-zA-Z0-9]/g, '')}` : '';
    const filename = `Expenses_Accounting_Export_${dateRange.preset}${catSuffix}`;
    exportToCSV(filename, rows);
    showExportNotice(
      `Exported ${filteredExpenses.length} expense records as CSV for external accounting software (QuickBooks / Xero / Tally).`
    );
  };

  const handleExportExcel = () => {
    if (filteredExpenses.length === 0) return;
    const rows = formatExpensesForExport(filteredExpenses, settings.currencySymbol || '$');
    exportToExcel(`School_Expenses_${dateRange.preset}`, 'School Expenses', rows);
    showExportNotice(`Exported ${filteredExpenses.length} expense records (${dateRange.label}) to Excel (.xlsx).`);
  };

  const handleDownloadPdf = () => {
    if (filteredExpenses.length === 0) {
      showExportNotice('No expense records found to generate audit PDF.');
      return;
    }
    const filterParts: string[] = [];
    if (selectedCategory !== 'All') filterParts.push(`Category: ${selectedCategory}`);
    if (searchQuery.trim()) filterParts.push(`Search: "${searchQuery.trim()}"`);
    filterParts.push(`Range: ${dateRange.label}`);

    generateExpensesAuditPdf(settings, filteredExpenses, {
      title: 'OFFICIAL OPERATIONAL EXPENDITURES AUDIT REPORT',
      period: `Disbursement Registry: ${dateRange.label} (${formatDateRangeDisplay(dateRange)}) · ${filteredExpenses.length} Vouchers`,
      scope: filterParts.join(' • '),
    });
    showExportNotice(`Downloaded operational expenditures audit PDF (${dateRange.label}).`);
  };

  return (
    <div className="space-y-6">
      {exportNotice && (
        <div className="p-3.5 rounded-xl bg-red-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-red-500" />
            <span>School Expense Management</span>
          </h2>
          <p className="text-xs text-slate-500">
            Log facility expenditures, lab reagents, utility bills, maintenance, and departmental disbursements
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Direct CSV Export for Accounting Software */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer"
            title="Export filtered expense list as a standard CSV file for external accounting software (QuickBooks, Xero, Tally Prime)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
          </button>

          {/* Bulk CSV Import with Auto Category Mapping */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 shadow-xs transition active:scale-95 cursor-pointer"
            title="Upload and parse expense CSV file with automatic category mapping"
          >
            <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Import CSV</span>
          </button>

          {/* Download Audit PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer"
            title="Download printable official operational expenditures audit PDF"
          >
            <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span>Download PDF</span>
          </button>

          <ExportDropdown
            label="More Formats"
            totalCount={filteredExpenses.length}
            onExportExcel={handleExportExcel}
            onExportCSV={handleExportCSV}
            onExportPDF={handleDownloadPdf}
            onExportExternal={handleExportCSV}
            size="md"
          />

                    {/* Clear All Expenses Button */}
          {expenses.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearExpensesModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 shadow-xs transition active:scale-95 cursor-pointer"
              title="Clear all expense records for new school onboarding"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}

{/* Custom Categories & Tags Taxonomy Button */}
          <button
            type="button"
            onClick={() => {
              setTaxonomyInitialTab('categories');
              setIsTaxonomyModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer"
            title="Manage custom expense categories, personal sub-categories, and analytical tags"
          >
            <FolderTree className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Categories & Tags</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              {taxonomy.categories.length}
            </span>
          </button>

          {/* Budget Limits & Thresholds Button */}
          <button
            type="button"
            onClick={() => setIsThresholdModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer"
            title="Configure category budget thresholds and monthly limits"
          >
            <Sliders className="w-4 h-4 text-amber-500" />
            <span>Budget Limits</span>
            {exceededThresholds.length > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse">
                {exceededThresholds.length} Over Limit
              </span>
            ) : warningThresholds.length > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {warningThresholds.length} Warning
              </span>
            ) : null}
          </button>

          {/* Recurring Expenses & Automated Disbursements Button */}
          <button
            type="button"
            onClick={() => setIsRecurringModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer"
            title="Manage scheduled recurring expenses (rent, salaries, utility retainers)"
          >
            <Repeat className="w-4 h-4 text-indigo-500" />
            <span>Recurring Expenses</span>
            {dueRecurringItems.length > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                {dueRecurringItems.length} Due
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                {recurringTemplates.filter(t => t.isActive).length} Active
              </span>
            )}
          </button>

          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Expense</span>
          </button>
        </div>
      </div>

      {/* Due Recurring Expenses Notification Banner (When templates are due for generation) */}
      {dueRecurringItems.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-amber-500/10 to-indigo-500/5 dark:from-indigo-950/50 dark:via-amber-950/40 dark:to-slate-900/50 border border-indigo-200 dark:border-indigo-800/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{dueRecurringItems.length} Scheduled Recurring Expenses Ready For Disbursement</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold text-[10px] animate-pulse">
                  Due Now
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Scheduled commitments due for {getTodayDateString().slice(0, 7)}:{' '}
                <strong>{dueRecurringItems.map(d => d.template.title).join(', ')}</strong> (Total:{' '}
                <strong>
                  {formatCurrency(
                    dueRecurringItems.reduce((s, i) => s + i.template.amount, 0),
                    settings.currencySymbol
                  )}
                </strong>
                ).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 w-full md:w-auto justify-end">
            <button
              type="button"
              disabled={isAutoPopulatingRecurring}
              onClick={async () => {
                setIsAutoPopulatingRecurring(true);
                try {
                  const res = await executeRecurringExpenseGeneration(
                    dueRecurringItems,
                    recordExpense,
                    recurringTemplates,
                    currentUser?.fullName || 'Finance Bursar'
                  );
                  if (res.createdExpenses.length > 0) {
                    setRecurringTemplates(res.updatedTemplates);
                    showExportNotice(
                      `Successfully populated ${res.createdExpenses.length} recurring expense vouchers to ledger.`
                    );
                  }
                } finally {
                  setIsAutoPopulatingRecurring(false);
                }
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAutoPopulatingRecurring ? 'Posting Vouchers...' : 'Populate All Due Now'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRecurringModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 font-semibold transition"
            >
              Manage Templates
            </button>
          </div>
        </div>
      )}

      {/* Executive Budget Threshold Alert Banner (When Limits are Breached or Approached) */}
      {(exceededThresholds.length > 0 || warningThresholds.length > 0) && !isThresholdBannerDismissed && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border shadow-md transition-all animate-in fade-in slide-in-from-top-2 ${
            exceededThresholds.length > 0
              ? 'bg-gradient-to-r from-red-500/10 via-rose-500/10 to-red-500/5 dark:from-red-950/50 dark:via-rose-950/40 dark:to-slate-900/50 border-red-300 dark:border-red-800/80 text-red-900 dark:text-red-200'
              : 'bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/5 dark:from-amber-950/50 dark:via-yellow-950/40 dark:to-slate-900/50 border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
          }`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-2xl shrink-0 ${
                  exceededThresholds.length > 0
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 animate-pulse'
                    : 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                }`}
              >
                {exceededThresholds.length > 0 ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm tracking-tight flex items-center gap-1.5">
                    {exceededThresholds.length > 0
                      ? 'BUDGET THRESHOLD BREACH DETECTED'
                      : 'BUDGET THRESHOLD ADVISORY'}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md font-bold bg-white/70 dark:bg-slate-800/80 border border-current/20">
                    Period: {activeThresholdMonth}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {exceededThresholds.length > 0 ? (
                    <>
                      <strong>{exceededThresholds.length} operational {exceededThresholds.length === 1 ? 'category has' : 'categories have'} exceeded</strong> user-defined monthly budget limits. Please review authorizations and expenditure vouchers below.
                    </>
                  ) : (
                    <>
                      <strong>{warningThresholds.length} operational {warningThresholds.length === 1 ? 'category is' : 'categories are'} approaching</strong> the user-defined budget limit threshold (&ge;85%).
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={() => setIsThresholdModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold shadow-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                <span>Adjust Limits</span>
              </button>
              <button
                type="button"
                onClick={() => setIsThresholdBannerDismissed(true)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                title="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List of Breached / Warning Categories Badges */}
          <div className="mt-3 pt-3 border-t border-current/15 flex flex-wrap gap-2 text-xs">
            {exceededThresholds.map(ev => (
              <div
                key={ev.threshold.category}
                onClick={() => setSelectedCategory(ev.threshold.category)}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-100/90 dark:bg-red-950/90 border border-red-300/80 dark:border-red-800 text-red-950 dark:text-red-200 cursor-pointer hover:shadow-xs transition"
                title={`Click to filter expense list by ${ev.threshold.category}`}
              >
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                <span className="font-bold">{ev.threshold.category}:</span>
                <span className="font-mono font-black text-red-700 dark:text-red-300">
                  {formatCurrency(ev.currentSpend, settings.currencySymbol)}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  / {formatCurrency(ev.limit, settings.currencySymbol)}
                </span>
                <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white">
                  +{ev.percentage}% (+{formatCurrency(ev.variance, settings.currencySymbol)})
                </span>
                <ChevronRight className="w-3 h-3 text-red-400 group-hover:translate-x-0.5 transition" />
              </div>
            ))}

            {warningThresholds.map(ev => (
              <div
                key={ev.threshold.category}
                onClick={() => setSelectedCategory(ev.threshold.category)}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100/90 dark:bg-amber-950/90 border border-amber-300/80 dark:border-amber-800 text-amber-950 dark:text-amber-200 cursor-pointer hover:shadow-xs transition"
                title={`Click to filter expense list by ${ev.threshold.category}`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-bold">{ev.threshold.category}:</span>
                <span className="font-mono font-black text-amber-700 dark:text-amber-300">
                  {formatCurrency(ev.currentSpend, settings.currencySymbol)}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  / {formatCurrency(ev.limit, settings.currencySymbol)}
                </span>
                <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-amber-600 text-white">
                  {ev.percentage}% of cap
                </span>
                <ChevronRight className="w-3 h-3 text-amber-400 group-hover:translate-x-0.5 transition" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Analytics: Total Expenses & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Tracked Expenditures
              </p>
              <p className="text-2xl sm:text-3xl font-black font-mono text-red-600 dark:text-red-400 mt-1">
                {formatCurrency(totalExpenseAmount, settings.currencySymbol)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-semibold block">
                {filteredExpenses.length} Records
              </span>
              <span className="text-[10px] text-slate-400 font-medium block mt-1">
                {dateRange.label}
              </span>
            </div>
          </div>

          {/* Quick Metrics for Key Categories: Salaries, Maintenance, Utilities with Threshold Utilization */}
          <div className="space-y-2 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Core Operational Cost Drivers &amp; Limits
              </span>
              <button
                type="button"
                onClick={() => setIsThresholdModalOpen(true)}
                className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
              >
                <Sliders className="w-2.5 h-2.5" />
                <span>Limits ({activeThresholdMonth})</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {/* Salaries Card */}
              {(() => {
                const ev = thresholdEvaluations.find(e => e.threshold.category.toLowerCase().includes('salar'));
                const amount = filteredExpenses
                  .filter(e => e.category.toLowerCase().includes('salar'))
                  .reduce((s, e) => s + e.amount, 0);
                const isSelected = selectedCategory === 'Staff Salaries';

                return (
                  <div
                    onClick={() => setSelectedCategory(isSelected ? 'All' : 'Staff Salaries')}
                    className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-500/50'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Filter by Salaries"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Salaries</span>
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-xs" />
                      </div>
                      <p className="font-mono font-bold text-slate-900 dark:text-white mt-1 text-sm">
                        {formatCurrency(amount, settings.currencySymbol)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {filteredExpenses.filter(e => e.category.toLowerCase().includes('salar')).length} vouchers
                      </p>
                    </div>

                    {ev && ev.threshold.enabled && (
                      <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-400">Cap: {formatCurrency(ev.limit, settings.currencySymbol)}</span>
                          <span className={`font-bold ${ev.status === 'exceeded' ? 'text-red-600 dark:text-red-400' : ev.status === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {ev.percentage}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700/80 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              ev.status === 'exceeded' ? 'bg-red-500' : ev.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, ev.percentage)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Building Maintenance Card */}
              {(() => {
                const ev = thresholdEvaluations.find(e => e.threshold.category.toLowerCase().includes('mainten'));
                const amount = filteredExpenses
                  .filter(e => e.category.toLowerCase().includes('mainten'))
                  .reduce((s, e) => s + e.amount, 0);
                const isSelected = selectedCategory === 'Building Maintenance';

                return (
                  <div
                    onClick={() => setSelectedCategory(isSelected ? 'All' : 'Building Maintenance')}
                    className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 ring-1 ring-amber-500/50'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Filter by Maintenance"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Maintenance</span>
                        <span className="w-2 h-2 rounded-full bg-amber-500 shadow-xs" />
                      </div>
                      <p className="font-mono font-bold text-slate-900 dark:text-white mt-1 text-sm">
                        {formatCurrency(amount, settings.currencySymbol)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {filteredExpenses.filter(e => e.category.toLowerCase().includes('mainten')).length} vouchers
                      </p>
                    </div>

                    {ev && ev.threshold.enabled && (
                      <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-400">Cap: {formatCurrency(ev.limit, settings.currencySymbol)}</span>
                          <span className={`font-bold ${ev.status === 'exceeded' ? 'text-red-600 dark:text-red-400' : ev.status === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {ev.percentage}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700/80 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              ev.status === 'exceeded' ? 'bg-red-500' : ev.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, ev.percentage)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Utilities Card */}
              {(() => {
                const ev = thresholdEvaluations.find(e => e.threshold.category.toLowerCase().includes('utilit'));
                const amount = filteredExpenses
                  .filter(e => e.category.toLowerCase().includes('utilit'))
                  .reduce((s, e) => s + e.amount, 0);
                const isSelected = selectedCategory === 'Utilities (Electricity/Water)';

                return (
                  <div
                    onClick={() => setSelectedCategory(isSelected ? 'All' : 'Utilities (Electricity/Water)')}
                    className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 ring-1 ring-sky-500/50'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Filter by Utilities"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Utilities</span>
                        <span className="w-2 h-2 rounded-full bg-sky-500 shadow-xs" />
                      </div>
                      <p className="font-mono font-bold text-slate-900 dark:text-white mt-1 text-sm">
                        {formatCurrency(amount, settings.currencySymbol)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {filteredExpenses.filter(e => e.category.toLowerCase().includes('utilit')).length} vouchers
                      </p>
                    </div>

                    {ev && ev.threshold.enabled && (
                      <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-400">Cap: {formatCurrency(ev.limit, settings.currencySymbol)}</span>
                          <span className={`font-bold ${ev.status === 'exceeded' ? 'text-red-600 dark:text-red-400' : ev.status === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {ev.percentage}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700/80 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              ev.status === 'exceeded' ? 'bg-red-500' : ev.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, ev.percentage)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Filter Active: <strong className="text-slate-900 dark:text-white">{selectedCategory}</strong></span>
            {selectedCategory !== 'All' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
              >
                Reset Filter (Show All)
              </button>
            )}
          </div>
        </div>

        {/* Recharts Pie Chart Distribution */}
        <div className="lg:col-span-7">
          <ExpenseCategoryPieChart
            expenses={filteredExpenses}
            settings={settings}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            taxonomy={taxonomy}
            onSelectGranularItem={(mode, val) => {
              if (mode === 'category') {
                setSelectedCategory(selectedCategory === val ? 'All' : val);
                setSelectedSubCategory('All');
              } else if (mode === 'subCategory') {
                setSelectedSubCategory(selectedSubCategory === val ? 'All' : val);
              } else if (mode === 'tag') {
                const clean = val.replace(/^#+/, '');
                setSelectedTag(selectedTag === clean ? 'All' : clean);
              }
            }}
          />
        </div>
      </div>

      {/* Monthly Expenditure Trends Line Chart (Recharts) */}
      <MonthlyExpenseTrendChart
        expenses={expenses}
        settings={settings}
        categories={categories as ExpenseCategory[]}
        activeCategoryFilter={selectedCategory}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, sub-category, #tag, ref #, or notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date-Range Picker with Presets like 'Last 3 Months', 'This Academic Year' */}
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            academicYear={settings.currentAcademicYear}
          />

          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Category:</span>
            <select
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value);
                setSelectedSubCategory('All');
              }}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Sub-Category Filter */}
          {availableSubCategories.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 font-medium">Sub-Category:</span>
              <select
                value={selectedSubCategory}
                onChange={e => setSelectedSubCategory(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Sub-Categories</option>
                {availableSubCategories.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tag Filter */}
          {availableTags.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <TagIcon className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">Tag:</span>
              <select
                value={selectedTag}
                onChange={e => setSelectedTag(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Tags</option>
                {availableTags.map(t => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(selectedCategory !== 'All' || selectedSubCategory !== 'All' || selectedTag !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSelectedSubCategory('All');
                setSelectedTag('All');
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Subheader Bar with Accounting CSV Export & Import */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <span>Expense Vouchers & Ledger Items</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {filteredExpenses.length} {filteredExpenses.length === 1 ? 'voucher' : 'vouchers'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Filtered by <span className="font-semibold text-slate-700 dark:text-slate-300">{dateRange.label}</span>
              {selectedCategory !== 'All' ? <> • Category: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedCategory}</span></> : ''}
              {selectedSubCategory !== 'All' ? <> • Sub: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedSubCategory}</span></> : ''}
              {selectedTag !== 'All' ? <> • Tag: <span className="font-semibold text-slate-700 dark:text-slate-300">#{selectedTag}</span></> : ''}
              {searchQuery.trim() ? <> • Query: <span className="font-semibold text-slate-700 dark:text-slate-300">"{searchQuery.trim()}"</span></> : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 transition cursor-pointer active:scale-95"
              title="Bulk import expenses via CSV with automatic category mapping"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Bulk Import CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredExpenses.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:scale-95"
              title="Export current filtered expense records as a CSV file for external accounting software"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Expense Title & Details</th>
                <th className="py-3 px-4">Category & Sub-Category</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Mode / Ref #</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(expense => {
                  const catColor = getCategoryColor(expense.category, taxonomy);

                  return (
                    <tr
                      key={expense.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-slate-900 dark:text-white">{expense.title}</p>
                          {expense.recurringTemplateId && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                              title="Auto-populated recurring expense voucher"
                            >
                              <Repeat className="w-2.5 h-2.5" />
                              <span>Recurring</span>
                            </span>
                          )}
                        </div>

                        {/* Tags Badges */}
                        {expense.tags && expense.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap mt-1">
                            {expense.tags.map(t => {
                              const tagColor = getTagColor(t, taxonomy);
                              return (
                                <span
                                  key={t}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-bold text-white shadow-2xs font-mono"
                                  style={{ backgroundColor: tagColor }}
                                >
                                  #{t.replace(/^#+/, '')}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {expense.notes && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{expense.notes}</p>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: catColor }}
                          >
                            <span>{expense.category}</span>
                          </span>

                          {expense.subCategory && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                              <span className="text-slate-400">↳</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {expense.subCategory}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-500">{formatDate(expense.date)}</td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {expense.paymentMode}
                        </p>
                        {expense.referenceNumber && (
                          <p className="font-mono text-[10px] text-slate-400">
                            {expense.referenceNumber}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{expense.recordedBy}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(expense.amount, settings.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setDeleteCandidateId(expense.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Delete Expense Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                <span>Record Operational Expense</span>
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="p-5 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Title / Payee *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Chemistry Lab Reagents"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => {
                      const newCat = e.target.value;
                      setFormData({
                        ...formData,
                        category: newCat,
                        subCategory: '', // reset subCategory on category change
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold cursor-pointer"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount ({settings.currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-red-600 dark:text-red-400"
                  />
                </div>
              </div>

              {/* Sub-Category Selector */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sub-Category (Optional)
                </label>
                {(() => {
                  const match = taxonomy.categories.find(
                    c => c.name.toLowerCase() === formData.category.toLowerCase()
                  );
                  const subCats = match?.subCategories || [];

                  return (
                    <div className="space-y-1.5">
                      {subCats.length > 0 ? (
                        <div className="flex gap-2">
                          <select
                            value={formData.subCategory}
                            onChange={e => setFormData({ ...formData, subCategory: e.target.value })}
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
                          >
                            <option value="">-- Select Sub-Category (Optional) --</option>
                            {subCats.map(sc => (
                              <option key={sc} value={sc}>
                                {sc}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Or type custom sub..."
                            value={formData.subCategory && !subCats.includes(formData.subCategory) ? formData.subCategory : ''}
                            onChange={e => setFormData({ ...formData, subCategory: e.target.value })}
                            className="w-40 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="e.g. Electricity Grid, Laboratory Reagents"
                          value={formData.subCategory}
                          onChange={e => setFormData({ ...formData, subCategory: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Tags Multi-Select */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Tags (Optional)
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  {taxonomy.tags.map(t => {
                    const isSelected = formData.tags?.includes(t.name);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          const current = formData.tags || [];
                          const updated = isSelected
                            ? current.filter(tag => tag !== t.name)
                            : [...current, t.name];
                          setFormData({ ...formData, tags: updated });
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? 'text-white shadow-xs font-bold'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                        style={isSelected ? { backgroundColor: t.color } : {}}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                        <span>#{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={formData.paymentMode}
                    onChange={e =>
                      setFormData({ ...formData, paymentMode: e.target.value as PaymentMode })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash Voucher</option>
                    <option value="Cheque">Bank Cheque</option>
                    <option value="Online/UPI">Online / Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reference / Invoice # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-99"
                  value={formData.referenceNumber}
                  onChange={e => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Internal Notes & Justification
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Real-time Budget Threshold Impact Preview */}
              {thresholdBreachCheck && thresholdBreachCheck.threshold && (
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    thresholdBreachCheck.willExceed
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                      : thresholdBreachCheck.projectedPercentage >=
                        (thresholdBreachCheck.threshold.warningThresholdPct || 85)
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {thresholdBreachCheck.willExceed ? (
                      <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    ) : thresholdBreachCheck.projectedPercentage >=
                      (thresholdBreachCheck.threshold.warningThresholdPct || 85) ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between font-bold text-sm mb-1">
                        <span>
                          {thresholdBreachCheck.willExceed
                            ? '⚠️ Monthly Budget Limit Breach Alert'
                            : thresholdBreachCheck.projectedPercentage >=
                              (thresholdBreachCheck.threshold.warningThresholdPct || 85)
                            ? '⚡ Approaching Monthly Budget Limit'
                            : '✓ Budget Threshold On Track'}
                        </span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/30 border border-current">
                          {thresholdBreachCheck.projectedPercentage}% utilized
                        </span>
                      </div>
                      <p className="leading-relaxed">
                        {thresholdBreachCheck.willExceed ? (
                          <>
                            Recording this expenditure will push <strong>{formData.category}</strong>{' '}
                            spending for {formData.date.slice(0, 7)} to{' '}
                            <strong>
                              {formatCurrency(
                                thresholdBreachCheck.projectedSpend,
                                settings.currencySymbol
                              )}
                            </strong>
                            , exceeding your monthly cap of{' '}
                            <strong>
                              {formatCurrency(thresholdBreachCheck.limit, settings.currencySymbol)}
                            </strong>{' '}
                            by{' '}
                            <span className="font-bold underline text-rose-700 dark:text-rose-300">
                              {formatCurrency(
                                thresholdBreachCheck.overrunAmount,
                                settings.currencySymbol
                              )}
                            </span>
                            .
                          </>
                        ) : thresholdBreachCheck.projectedPercentage >=
                          (thresholdBreachCheck.threshold.warningThresholdPct || 85) ? (
                          <>
                            This voucher will bring <strong>{formData.category}</strong> to{' '}
                            <strong>
                              {formatCurrency(
                                thresholdBreachCheck.projectedSpend,
                                settings.currencySymbol
                              )}
                            </strong>{' '}
                            of its{' '}
                            {formatCurrency(thresholdBreachCheck.limit, settings.currencySymbol)}{' '}
                            monthly budget cap. Remaining buffer:{' '}
                            <strong>
                              {formatCurrency(
                                Math.max(0, thresholdBreachCheck.limit - thresholdBreachCheck.projectedSpend),
                                settings.currencySymbol
                              )}
                            </strong>
                            .
                          </>
                        ) : (
                          <>
                            Projected total after voucher:{' '}
                            <strong>
                              {formatCurrency(
                                thresholdBreachCheck.projectedSpend,
                                settings.currencySymbol
                              )}
                            </strong>{' '}
                            of{' '}
                            {formatCurrency(thresholdBreachCheck.limit, settings.currencySymbol)}{' '}
                            monthly limit. Remaining budget:{' '}
                            <strong>
                              {formatCurrency(
                                Math.max(0, thresholdBreachCheck.limit - thresholdBreachCheck.projectedSpend),
                                settings.currencySymbol
                              )}
                            </strong>
                            .
                          </>
                        )}
                      </p>

                      {/* Mini bar */}
                      <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            thresholdBreachCheck.willExceed
                              ? 'bg-rose-600'
                              : thresholdBreachCheck.projectedPercentage >=
                                (thresholdBreachCheck.threshold.warningThresholdPct || 85)
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(thresholdBreachCheck.projectedPercentage, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition shadow-sm"
                >
                  Save Expense Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteCandidateId}
        title="Delete Expense Record"
        message="Are you sure you want to delete this recorded expenditure entry? This will adjust your net cashflow balance."
        confirmLabel="Delete Record"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteCandidateId(null)}
      />

      {/* Budget Threshold Configuration & Alerts Modal */}
      <BudgetThresholdModal
        isOpen={isThresholdModalOpen}
        onClose={() => setIsThresholdModalOpen(false)}
        thresholds={thresholds}
        onSaveThresholds={setThresholds}
        expenses={expenses}
        settings={settings}
        categories={categories as ExpenseCategory[]}
        activeMonth={activeThresholdMonth}
        onMonthChange={setActiveThresholdMonth}
      />

      {/* Recurring Expense Templates & Automated Disbursements Modal */}
      <RecurringExpensesModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        templates={recurringTemplates}
        onSaveTemplates={setRecurringTemplates}
        expenses={expenses}
        onExpenseCreated={() => {}}
        recordExpenseFn={recordExpense}
        settings={settings}
        categories={categories as ExpenseCategory[]}
        currentUserName={currentUser?.fullName}
        onNotification={showExportNotice}
      />

      {/* Bulk CSV Import with Auto Category Mapping Modal */}
      <BulkExpenseCsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={(createdCount, totalAmount) => {
          showExportNotice(
            `Successfully imported ${createdCount} operational expense vouchers (${formatCurrency(
              totalAmount,
              settings.currencySymbol
            )}) with automated category mapping!`
          );
        }}
        recordExpenseFn={recordExpense}
        existingExpenses={expenses}
        settings={settings}
        taxonomy={taxonomy}
        thresholds={thresholds}
        currentUserName={currentUser?.fullName || 'Finance Operator'}
      />

      {/* Custom Categories, Sub-Categories & Tags Taxonomy Modal */}
      <ExpenseTaxonomyModal
        isOpen={isTaxonomyModalOpen}
        onClose={() => setIsTaxonomyModalOpen(false)}
        taxonomy={taxonomy}
        onTaxonomyChange={setTaxonomy}
        initialTab={taxonomyInitialTab}
      />
          {/* Clear All Expenses Confirmation Modal */}
      {isClearExpensesModalOpen && (
        <DataResetConfirmationModal
          isOpen={isClearExpensesModalOpen}
          targetModule="expenses"
          onClose={() => setIsClearExpensesModalOpen(false)}
        />
      )}

    </div>
  );
};
