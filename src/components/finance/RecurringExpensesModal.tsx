import React, { useState, useMemo } from 'react';
import {
  X,
  Repeat,
  Calendar,
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  Pause,
  Edit3,
  Trash2,
  Copy,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Building2,
  Check,
  Tag,
  CreditCard,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  RecurringExpenseTemplate,
  RecurrenceFrequency,
  ExpenseCategory,
  PaymentMode,
  SchoolSettings,
  Expense,
} from '../../types';
import { formatCurrency, formatDate, getTodayDateString } from '../../utils/formatters';
import {
  DEFAULT_RECURRING_TEMPLATES,
  saveRecurringTemplates,
  calculateNextDueDate,
  getDueRecurringTemplates,
  executeRecurringExpenseGeneration,
  DueRecurringItem,
  getCycleKey,
} from '../../utils/recurringExpensesService';

interface RecurringExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: RecurringExpenseTemplate[];
  onSaveTemplates: (templates: RecurringExpenseTemplate[]) => void;
  expenses: Expense[];
  onExpenseCreated: (createdExpense: Expense) => void;
  recordExpenseFn: (expense: Omit<Expense, 'id'>) => Promise<Expense>;
  settings: SchoolSettings;
  categories: ExpenseCategory[];
  currentUserName?: string;
  onNotification?: (msg: string) => void;
}

export const RecurringExpensesModal: React.FC<RecurringExpensesModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSaveTemplates,
  expenses,
  onExpenseCreated,
  recordExpenseFn,
  settings,
  categories,
  currentUserName,
  onNotification,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'paused'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('All');

  // Form State for Creating or Editing Template
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    category: ExpenseCategory | string;
    amount: number;
    paymentMode: PaymentMode;
    frequency: RecurrenceFrequency;
    dayOfMonth: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
    autoPost: boolean;
    payeeName: string;
    referencePrefix: string;
    notes: string;
  }>({
    title: '',
    category: 'Building Maintenance',
    amount: 1000,
    paymentMode: 'Bank Transfer',
    frequency: 'monthly',
    dayOfMonth: 1,
    startDate: getTodayDateString(),
    endDate: '',
    isActive: true,
    autoPost: true,
    payeeName: '',
    referencePrefix: 'REC',
    notes: '',
  });

  // State for generating due vouchers
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewDueModalOpen, setPreviewDueModalOpen] = useState(false);

  // Evaluate due items right now
  const dueItems = useMemo(() => {
    return getDueRecurringTemplates(templates, expenses, getTodayDateString());
  }, [templates, expenses]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(tpl => {
      const matchSearch =
        tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tpl.payeeName && tpl.payeeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tpl.referencePrefix && tpl.referencePrefix.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tpl.notes && tpl.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        selectedStatus === 'all'
          ? true
          : selectedStatus === 'active'
          ? tpl.isActive
          : !tpl.isActive;

      const matchCategory = selectedCategory === 'All' || tpl.category === selectedCategory;
      const matchFrequency = selectedFrequency === 'All' || tpl.frequency === selectedFrequency;

      return matchSearch && matchStatus && matchCategory && matchFrequency;
    });
  }, [templates, searchQuery, selectedStatus, selectedCategory, selectedFrequency]);

  // Overall KPI Metrics
  const activeCount = templates.filter(t => t.isActive).length;
  const totalMonthlyCommitment = templates
    .filter(t => t.isActive)
    .reduce((sum, t) => {
      if (t.frequency === 'monthly') return sum + t.amount;
      if (t.frequency === 'quarterly') return sum + t.amount / 3;
      if (t.frequency === 'annual') return sum + t.amount / 12;
      if (t.frequency === 'weekly') return sum + t.amount * 4.33;
      if (t.frequency === 'bi-weekly') return sum + t.amount * 2.16;
      return sum + t.amount;
    }, 0);

  // Next upcoming item
  const nextUpcoming = useMemo(() => {
    const active = templates.filter(t => t.isActive);
    if (active.length === 0) return null;
    return [...active].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))[0];
  }, [templates]);

  if (!isOpen) return null;

  const handleOpenAddForm = () => {
    setEditingTemplateId(null);
    setFormData({
      title: '',
      category: categories[0] || 'Building Maintenance',
      amount: 500,
      paymentMode: 'Bank Transfer',
      frequency: 'monthly',
      dayOfMonth: 1,
      startDate: getTodayDateString(),
      endDate: '',
      isActive: true,
      autoPost: true,
      payeeName: '',
      referencePrefix: 'REC',
      notes: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (tpl: RecurringExpenseTemplate) => {
    setEditingTemplateId(tpl.id);
    setFormData({
      title: tpl.title,
      category: tpl.category,
      amount: tpl.amount,
      paymentMode: tpl.paymentMode,
      frequency: tpl.frequency,
      dayOfMonth: tpl.dayOfMonth,
      startDate: tpl.startDate,
      endDate: tpl.endDate || '',
      isActive: tpl.isActive,
      autoPost: tpl.autoPost,
      payeeName: tpl.payeeName || '',
      referencePrefix: tpl.referencePrefix || 'REC',
      notes: tpl.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Template title is required.');
      return;
    }
    if (formData.amount <= 0) {
      alert('Amount must be greater than zero.');
      return;
    }

    const nextDue = calculateNextDueDate(
      formData.frequency,
      formData.dayOfMonth,
      undefined,
      formData.startDate > getTodayDateString() ? formData.startDate : getTodayDateString()
    );

    let updatedList: RecurringExpenseTemplate[];

    if (editingTemplateId) {
      updatedList = templates.map(t => {
        if (t.id === editingTemplateId) {
          return {
            ...t,
            title: formData.title.trim(),
            category: formData.category,
            amount: Number(formData.amount),
            paymentMode: formData.paymentMode,
            frequency: formData.frequency,
            dayOfMonth: Number(formData.dayOfMonth),
            startDate: formData.startDate,
            endDate: formData.endDate ? formData.endDate : undefined,
            isActive: formData.isActive,
            autoPost: formData.autoPost,
            payeeName: formData.payeeName.trim() || undefined,
            referencePrefix: formData.referencePrefix.trim().toUpperCase() || 'REC',
            notes: formData.notes.trim() || undefined,
            nextDueDate: nextDue,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      });
      if (onNotification) {
        onNotification(`Updated recurring template "${formData.title}".`);
      }
    } else {
      const newTpl: RecurringExpenseTemplate = {
        id: `rec-tpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: formData.title.trim(),
        category: formData.category,
        amount: Number(formData.amount),
        paymentMode: formData.paymentMode,
        frequency: formData.frequency,
        dayOfMonth: Number(formData.dayOfMonth),
        startDate: formData.startDate,
        endDate: formData.endDate ? formData.endDate : undefined,
        isActive: formData.isActive,
        autoPost: formData.autoPost,
        payeeName: formData.payeeName.trim() || undefined,
        referencePrefix: formData.referencePrefix.trim().toUpperCase() || 'REC',
        notes: formData.notes.trim() || undefined,
        nextDueDate: nextDue,
        createdAt: new Date().toISOString(),
      };
      updatedList = [newTpl, ...templates];
      if (onNotification) {
        onNotification(`Created recurring template "${formData.title}".`);
      }
    }

    saveRecurringTemplates(updatedList);
    onSaveTemplates(updatedList);
    setIsFormOpen(false);
  };

  const handleToggleActive = (tpl: RecurringExpenseTemplate) => {
    const updated = templates.map(t =>
      t.id === tpl.id ? { ...t, isActive: !t.isActive, updatedAt: new Date().toISOString() } : t
    );
    saveRecurringTemplates(updated);
    onSaveTemplates(updated);
    if (onNotification) {
      onNotification(
        `${!tpl.isActive ? 'Activated' : 'Paused'} recurring template "${tpl.title}".`
      );
    }
  };

  const handleToggleAutoPost = (tpl: RecurringExpenseTemplate) => {
    const updated = templates.map(t =>
      t.id === tpl.id ? { ...t, autoPost: !t.autoPost, updatedAt: new Date().toISOString() } : t
    );
    saveRecurringTemplates(updated);
    onSaveTemplates(updated);
    if (onNotification) {
      onNotification(
        `Template "${tpl.title}" auto-post set to ${!tpl.autoPost ? 'Enabled (Auto-populate)' : 'Disabled (Requires Approval)'}.`
      );
    }
  };

  const handleDeleteTemplate = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete recurring template "${title}"? This will not remove past vouchers already recorded.`)) {
      const updated = templates.filter(t => t.id !== id);
      saveRecurringTemplates(updated);
      onSaveTemplates(updated);
      if (onNotification) {
        onNotification(`Deleted template "${title}".`);
      }
    }
  };

  const handleDuplicateTemplate = (tpl: RecurringExpenseTemplate) => {
    const dup: RecurringExpenseTemplate = {
      ...tpl,
      id: `rec-tpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `${tpl.title} (Copy)`,
      createdAt: new Date().toISOString(),
      lastGeneratedDate: undefined,
    };
    const updated = [dup, ...templates];
    saveRecurringTemplates(updated);
    onSaveTemplates(updated);
    if (onNotification) {
      onNotification(`Duplicated template "${tpl.title}".`);
    }
  };

  // Execute generation for a single template immediately
  const handleGenerateSingleNow = async (tpl: RecurringExpenseTemplate) => {
    const today = getTodayDateString();
    const cycleKey = getCycleKey(tpl.frequency, today);
    const singleDue: DueRecurringItem = {
      template: tpl,
      dueDate: today,
      cycleKey,
      isOverdue: false,
    };

    setIsGenerating(true);
    try {
      const result = await executeRecurringExpenseGeneration(
        [singleDue],
        recordExpenseFn,
        templates,
        currentUserName || 'Finance Bursar'
      );

      if (result.createdExpenses.length > 0) {
        result.createdExpenses.forEach(exp => onExpenseCreated(exp));
        onSaveTemplates(result.updatedTemplates);
        if (onNotification) {
          onNotification(
            `Successfully posted recurring voucher: "${tpl.title}" (${formatCurrency(
              tpl.amount,
              settings.currencySymbol
            )}).`
          );
        }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Execute batch generation of all due items
  const handleGenerateAllDue = async () => {
    if (dueItems.length === 0) return;
    setIsGenerating(true);
    try {
      const result = await executeRecurringExpenseGeneration(
        dueItems,
        recordExpenseFn,
        templates,
        currentUserName || 'Finance Bursar'
      );

      result.createdExpenses.forEach(exp => onExpenseCreated(exp));
      onSaveTemplates(result.updatedTemplates);
      setPreviewDueModalOpen(false);

      if (onNotification) {
        const totalAmt = result.createdExpenses.reduce((s, e) => s + e.amount, 0);
        onNotification(
          `Generated ${result.createdExpenses.length} recurring expense vouchers totaling ${formatCurrency(
            totalAmt,
            settings.currencySymbol
          )}!`
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetToDefaults = () => {
    if (
      window.confirm(
        'Restore the standard institutional recurring templates (Campus Lease, Security Retainer, IT Fiber, Municipal Water)? Your custom additions will be replaced.'
      )
    ) {
      saveRecurringTemplates(DEFAULT_RECURRING_TEMPLATES);
      onSaveTemplates(DEFAULT_RECURRING_TEMPLATES);
      if (onNotification) {
        onNotification('Restored standard institutional recurring expense templates.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <Repeat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Recurring Expenses & Auto-Disbursements
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {activeCount} Active
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Define recurring operational commitments (leases, utilities, retainers) scheduled to automatically populate the accounts ledger.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {dueItems.length > 0 && (
              <button
                type="button"
                onClick={() => setPreviewDueModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-sm animate-pulse"
              >
                <Sparkles className="w-4 h-4" />
                <span>{dueItems.length} Due to Post</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenAddForm}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Template</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Due Banner if items pending */}
        {dueItems.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>{dueItems.length} scheduled recurring expenses</strong> have reached their due date for the current cycle (Total:{' '}
                <strong>
                  {formatCurrency(
                    dueItems.reduce((s, i) => s + i.template.amount, 0),
                    settings.currencySymbol
                  )}
                </strong>
                ).
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateAllDue}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-sm flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGenerating ? 'Posting Vouchers...' : 'Populate All Due Now'}</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDueModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/70 font-semibold transition"
              >
                Preview List
              </button>
            </div>
          </div>
        )}

        {/* Executive KPI Cards */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-slate-900">
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1">
              <span className="text-xs font-semibold">Monthly Commitment</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {formatCurrency(Math.round(totalMonthlyCommitment), settings.currencySymbol)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Normalized active run-rate
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
              <span className="text-xs font-semibold">Active Templates</span>
              <Repeat className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {activeCount} <span className="text-xs font-normal text-slate-400">/ {templates.length} total</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {templates.length - activeCount} paused
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
              <span className="text-xs font-semibold">Pending Due Vouchers</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {dueItems.length}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Ready for immediate ledger entry
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
              <span className="text-xs font-semibold">Next Scheduled</span>
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-white truncate">
              {nextUpcoming ? nextUpcoming.nextDueDate : 'None scheduled'}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {nextUpcoming ? nextUpcoming.title : 'No active templates'}
            </p>
          </div>
        </div>

        {/* Toolbar: Search & Filters */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates, payees, notes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as any)}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="paused">Paused Only</option>
            </select>

            {/* Frequency Filter */}
            <select
              value={selectedFrequency}
              onChange={e => setSelectedFrequency(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200"
            >
              <option value="All">All Frequencies</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="weekly">Weekly</option>
              <option value="bi-weekly">Bi-Weekly</option>
              <option value="annual">Annual</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200"
            >
              <option value="All">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Restore standard institutional templates"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Defaults</span>
            </button>
          </div>
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                <Repeat className="w-6 h-6" />
              </div>
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                No recurring expense templates found
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery || selectedCategory !== 'All' || selectedStatus !== 'all'
                  ? 'Try adjusting your search criteria or category filter.'
                  : 'Get started by creating a recurring operational expense template.'}
              </p>
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Template</span>
              </button>
            </div>
          ) : (
            filteredTemplates.map(tpl => {
              const isDue = dueItems.some(d => d.template.id === tpl.id);
              const isOverdue = tpl.nextDueDate < getTodayDateString();

              return (
                <div
                  key={tpl.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 ${
                    !tpl.isActive
                      ? 'bg-slate-50/70 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 opacity-75'
                      : isDue
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-sm'
                      : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          !tpl.isActive
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                            : isDue
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        <Repeat className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                            {tpl.title}
                          </h3>
                          <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {tpl.category}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 capitalize">
                            {tpl.frequency} · Day {tpl.dayOfMonth}
                          </span>
                          {tpl.autoPost ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              🤖 Auto-Posts
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              ✋ Review Required
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          {tpl.payeeName && (
                            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium truncate max-w-xs">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              {tpl.payeeName}
                            </span>
                          )}
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            {tpl.paymentMode} ({tpl.referencePrefix || 'REC'})
                          </span>
                          {tpl.lastGeneratedDate && (
                            <span className="text-slate-400 text-[11px]">
                              Last posted: {tpl.lastGeneratedDate}
                            </span>
                          )}
                        </div>

                        {tpl.notes && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 italic">
                            {tpl.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="text-left sm:text-right">
                        <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                          {formatCurrency(tpl.amount, settings.currencySymbol)}
                        </div>
                        <div className="flex items-center sm:justify-end gap-1 mt-0.5">
                          {isDue ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-md">
                              <Clock className="w-3 h-3 animate-spin" />
                              Due Today
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Next: <strong>{tpl.nextDueDate}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        {isDue && (
                          <button
                            type="button"
                            disabled={isGenerating}
                            onClick={() => handleGenerateSingleNow(tpl)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-sm flex items-center gap-1"
                            title="Post expense voucher for current due date"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Post</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleActive(tpl)}
                          className={`p-2 rounded-xl transition ${
                            tpl.isActive
                              ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                          title={tpl.isActive ? 'Active (Click to pause)' : 'Paused (Click to activate)'}
                        >
                          {tpl.isActive ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditForm(tpl)}
                          className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                          title="Edit Template"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateTemplate(tpl)}
                          className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                          title="Duplicate Template"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id, tpl.title)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Delete Template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Total {templates.length} recurring schedules configured · Normalized commit:{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {formatCurrency(Math.round(totalMonthlyCommitment), settings.currencySymbol)}/mo
              </strong>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-bold text-slate-800 dark:text-slate-100 transition"
          >
            Done
          </button>
        </div>
      </div>

      {/* Add / Edit Template Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {editingTemplateId ? 'Edit Recurring Expense Template' : 'New Recurring Expense Template'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Set up automated scheduling parameters for recurring commitments.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Template Title / Expense Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Campus Building Lease, Fiber Internet, Security Retainer"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expense Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Scheduled Amount ({settings.currencySymbol || '$'}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Frequency *
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={e => setFormData({ ...formData, frequency: e.target.value as RecurrenceFrequency })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-Weekly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Execution Day of Month *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={formData.dayOfMonth}
                    onChange={e => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Day 1-31 (auto-adjusted for shorter months)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={formData.paymentMode}
                    onChange={e => setFormData({ ...formData, paymentMode: e.target.value as PaymentMode })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash Voucher</option>
                    <option value="Cheque">Bank Cheque</option>
                    <option value="Online/UPI">Online / Card</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payee / Vendor / Beneficiary (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Trust Name, Telecom Provider, Landlord"
                    value={formData.payeeName}
                    onChange={e => setFormData({ ...formData, payeeName: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Voucher Reference Prefix
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RENT, SEC, UTIL"
                    value={formData.referencePrefix}
                    onChange={e => setFormData({ ...formData, referencePrefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Effective Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date (Optional Cutoff)
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoPost}
                    onChange={e => setFormData({ ...formData, autoPost: e.target.checked })}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Automatic Ledger Posting
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      When checked, the system will automatically create the expense voucher on the scheduled date without requiring manual confirmation.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Active Schedule Status
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Uncheck to temporarily pause this recurring expense without deleting its configuration.
                    </span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contract Notes / Billing Details (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Account details, contract agreement number, periodic review notes"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
                >
                  {editingTemplateId ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Due Vouchers Preview & Batch Execution Modal */}
      {previewDueModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Due Recurring Expenses ({dueItems.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDueModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The following scheduled vouchers have reached their execution date and will be added to the live Expense Registry:
              </p>

              {dueItems.map(({ template, dueDate, cycleKey }) => (
                <div
                  key={template.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{template.title}</div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                      {template.category} · Due: {dueDate} ({cycleKey})
                    </div>
                  </div>
                  <div className="text-right font-black text-slate-900 dark:text-white font-mono">
                    {formatCurrency(template.amount, settings.currencySymbol)}
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm">
                <span>Total Due Disbursement:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(
                    dueItems.reduce((s, i) => s + i.template.amount, 0),
                    settings.currencySymbol
                  )}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/70 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => setPreviewDueModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateAllDue}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGenerating ? 'Generating...' : `Confirm & Populate ${dueItems.length} Vouchers`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
