import React, { useState, useMemo } from 'react';
import {
  X,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  DollarSign,
  Calendar,
  Check,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  CategoryBudgetThreshold,
  CategoryThresholdEvaluation,
  Expense,
  ExpenseCategory,
  SchoolSettings,
} from '../../types';
import { formatCurrency, getTodayDateString } from '../../utils/formatters';
import {
  DEFAULT_CATEGORY_THRESHOLDS,
  saveBudgetThresholds,
  evaluateBudgetThresholds,
} from '../../utils/budgetThresholdStorage';

interface BudgetThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  thresholds: CategoryBudgetThreshold[];
  onSaveThresholds: (updated: CategoryBudgetThreshold[]) => void;
  expenses: Expense[];
  settings: SchoolSettings;
  categories: ExpenseCategory[];
  activeMonth: string; // YYYY-MM
  onMonthChange: (month: string) => void;
}

export const BudgetThresholdModal: React.FC<BudgetThresholdModalProps> = ({
  isOpen,
  onClose,
  thresholds,
  onSaveThresholds,
  expenses,
  settings,
  categories,
  activeMonth,
  onMonthChange,
}) => {
  const [editableThresholds, setEditableThresholds] = useState<CategoryBudgetThreshold[]>(() =>
    JSON.parse(JSON.stringify(thresholds))
  );

  const [filterSearch, setFilterSearch] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'exceeded' | 'warning' | 'healthy'>('all');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // New category threshold form state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState<string>(categories[0] || 'Utilities (Electricity/Water)');
  const [newLimitAmount, setNewLimitAmount] = useState<number>(1000);
  const [newWarningPct, setNewWarningPct] = useState<number>(85);

  // Re-sync editable thresholds when modal opens or parent thresholds update
  React.useEffect(() => {
    if (isOpen) {
      setEditableThresholds(JSON.parse(JSON.stringify(thresholds)));
    }
  }, [isOpen, thresholds]);

  // Compute available months from expenses data
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    const currentMonthKey = getTodayDateString().slice(0, 7);
    monthSet.add(currentMonthKey);
    for (const exp of expenses) {
      if (exp.date && exp.date.length >= 7) {
        monthSet.add(exp.date.slice(0, 7));
      }
    }
    return Array.from(monthSet).sort().reverse();
  }, [expenses]);

  // Evaluate current draft thresholds against the selected month
  const evaluations: CategoryThresholdEvaluation[] = useMemo(() => {
    return evaluateBudgetThresholds(expenses, editableThresholds, activeMonth);
  }, [expenses, editableThresholds, activeMonth]);

  // Analytics summary for the month
  const summary = useMemo(() => {
    const totalCap = editableThresholds.reduce((sum, t) => (t.enabled ? sum + t.monthlyLimit : sum), 0);
    const totalSpend = evaluations.reduce((sum, ev) => sum + ev.currentSpend, 0);
    const exceeded = evaluations.filter(ev => ev.status === 'exceeded' && ev.threshold.enabled);
    const warning = evaluations.filter(ev => ev.status === 'warning' && ev.threshold.enabled);
    const healthy = evaluations.filter(ev => ev.status === 'healthy' && ev.threshold.enabled);

    return {
      totalCap,
      totalSpend,
      exceededCount: exceeded.length,
      warningCount: warning.length,
      healthyCount: healthy.length,
    };
  }, [editableThresholds, evaluations]);

  if (!isOpen) return null;

  const handleLimitChange = (index: number, newLimit: number) => {
    setEditableThresholds(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], monthlyLimit: Math.max(0, newLimit) };
      return copy;
    });
  };

  const handleWarningPctChange = (index: number, newPct: number) => {
    setEditableThresholds(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], warningThresholdPct: Math.min(100, Math.max(50, newPct)) };
      return copy;
    });
  };

  const handleToggleEnabled = (index: number) => {
    setEditableThresholds(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], enabled: !copy[index].enabled };
      return copy;
    });
  };

  const handleDeleteThreshold = (index: number) => {
    setEditableThresholds(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    saveBudgetThresholds(editableThresholds);
    onSaveThresholds(editableThresholds);
    setSaveFeedback('Category budget thresholds successfully updated and active.');
    setTimeout(() => {
      setSaveFeedback(null);
      onClose();
    }, 1200);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all category thresholds to recommended institutional defaults?')) {
      setEditableThresholds(JSON.parse(JSON.stringify(DEFAULT_CATEGORY_THRESHOLDS)));
    }
  };

  const handleAddNewThreshold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    // Check if category already has a threshold configured
    const existing = editableThresholds.find(
      t => t.category.toLowerCase() === newCategoryName.trim().toLowerCase()
    );
    if (existing) {
      alert(`A budget threshold for "${newCategoryName}" is already defined. Please update its existing row.`);
      return;
    }

    const newThresh: CategoryBudgetThreshold = {
      category: newCategoryName.trim(),
      monthlyLimit: Number(newLimitAmount),
      warningThresholdPct: Number(newWarningPct),
      enabled: true,
      updatedAt: new Date().toISOString(),
    };

    setEditableThresholds(prev => [newThresh, ...prev]);
    setIsAddingNew(false);
    setNewLimitAmount(1000);
  };

  // Filter evaluations for the UI table
  const filteredEvaluations = evaluations.filter(ev => {
    const matchesSearch = ev.threshold.category.toLowerCase().includes(filterSearch.toLowerCase());
    const matchesStatus =
      selectedStatusFilter === 'all' || ev.status === selectedStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/60 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Category Budget Thresholds &amp; Limit Alerts
                </h3>
                {summary.exceededCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 animate-pulse">
                    {summary.exceededCount} Over Limit
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Define monthly expenditure ceilings per category. Automated alerts immediately flag departmental overspends.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message */}
        {saveFeedback && (
          <div className="p-3.5 bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-inner shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveFeedback}</span>
          </div>
        )}

        {/* Month Selector & KPI Metrics Ribbon */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Target Month Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Evaluation Period:
              </span>
              <select
                value={activeMonth}
                onChange={e => onMonthChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white cursor-pointer focus:outline-hidden"
              >
                {availableMonths.map(m => {
                  const [y, mon] = m.split('-');
                  const d = new Date(Number(y), Number(mon) - 1, 1);
                  const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                  return (
                    <option key={m} value={m}>
                      {label} ({m})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                title="Restore default threshold limits"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Defaults</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category Limit</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Budget Ceiling
              </span>
              <p className="text-base font-black font-mono text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(summary.totalCap, settings.currencySymbol)}
              </p>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                {editableThresholds.filter(t => t.enabled).length} active category limits
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Tracked Disbursements
              </span>
              <p className="text-base font-black font-mono text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(summary.totalSpend, settings.currencySymbol)}
              </p>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                In period {activeMonth}
              </span>
            </div>

            <div
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'exceeded' ? 'all' : 'exceeded')}
              className={`p-3 rounded-2xl border transition cursor-pointer ${
                selectedStatusFilter === 'exceeded'
                  ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 ring-1 ring-red-500'
                  : 'bg-red-50/50 dark:bg-red-950/30 border-red-200/60 dark:border-red-900/40 hover:bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                  Breached Limits
                </span>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </div>
              <p className="text-base font-black font-mono text-red-600 dark:text-red-400 mt-0.5">
                {summary.exceededCount} Categories
              </p>
              <span className="text-[10px] text-red-500/80 font-medium block mt-0.5">
                &gt;100% of defined budget
              </span>
            </div>

            <div
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'warning' ? 'all' : 'warning')}
              className={`p-3 rounded-2xl border transition cursor-pointer ${
                selectedStatusFilter === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 ring-1 ring-amber-500'
                  : 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-900/40 hover:bg-amber-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Approaching Cap
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <p className="text-base font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                {summary.warningCount} Categories
              </p>
              <span className="text-[10px] text-amber-500/80 font-medium block mt-0.5">
                &ge;85% warning threshold
              </span>
            </div>
          </div>
        </div>

        {/* Modal Form for Adding a New Threshold */}
        {isAddingNew && (
          <form onSubmit={handleAddNewThreshold} className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/60 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600" />
                Configure New Category Monthly Limit
              </span>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Category
                </label>
                <select
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Limit ({settings.currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newLimitAmount}
                  onChange={e => setNewLimitAmount(Number(e.target.value))}
                  placeholder="e.g. 1000"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Warning Alert Threshold (%)
                </label>
                <select
                  value={newWarningPct}
                  onChange={e => setNewWarningPct(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value={75}>75% of Limit</option>
                  <option value={80}>80% of Limit</option>
                  <option value={85}>85% of Limit (Recommended)</option>
                  <option value={90}>90% of Limit</option>
                  <option value={95}>95% of Limit</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
              >
                Add Threshold Row
              </button>
            </div>
          </form>
        )}

        {/* Filter & Search Bar */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
          <input
            type="text"
            placeholder="Search category limits..."
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            className="w-full max-w-xs px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
          />

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Filter:</span>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('all')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                selectedStatusFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All ({evaluations.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('exceeded')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                selectedStatusFilter === 'exceeded'
                  ? 'bg-red-600 text-white'
                  : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
              }`}
            >
              Over Limit ({summary.exceededCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('warning')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                selectedStatusFilter === 'warning'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              Warning ({summary.warningCount})
            </button>
          </div>
        </div>

        {/* Threshold Rows List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredEvaluations.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Sliders className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold">No category budget limits match the current filter.</p>
              <button
                type="button"
                onClick={() => {
                  setFilterSearch('');
                  setSelectedStatusFilter('all');
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            filteredEvaluations.map(ev => {
              const origIndex = editableThresholds.findIndex(
                t => t.category === ev.threshold.category
              );
              const thresh = editableThresholds[origIndex];
              if (!thresh) return null;

              const isExceeded = ev.status === 'exceeded' && thresh.enabled;
              const isWarning = ev.status === 'warning' && thresh.enabled;
              const progressPct = Math.min(100, ev.percentage);

              return (
                <div key={thresh.category} className="pt-3 first:pt-0">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition space-y-3">
                    {/* Top Row: Category Name, Status Badge, and Toggle */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={thresh.enabled}
                            onChange={() => handleToggleEnabled(origIndex)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                        </label>

                        <div>
                          <span className={`font-bold text-sm ${thresh.enabled ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>
                            {thresh.category}
                          </span>
                          {thresh.notes && (
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                              {thresh.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {thresh.enabled ? (
                          isExceeded ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                              <span>{ev.percentage}% • Exceeded by {formatCurrency(ev.variance, settings.currencySymbol)}</span>
                            </span>
                          ) : isWarning ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span>{ev.percentage}% • Approaching Cap</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{ev.percentage}% • Within Cap</span>
                            </span>
                          )
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400">
                            Monitoring Inactive
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteThreshold(origIndex)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                          title="Remove this threshold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-500">
                          Current Spend: <strong className={isExceeded ? 'text-red-600 dark:text-red-400 font-black' : 'text-slate-900 dark:text-white'}>
                            {formatCurrency(ev.currentSpend, settings.currencySymbol)}
                          </strong>
                          <span className="text-slate-400 font-sans text-[10px] ml-1">({ev.voucherCount} vouchers)</span>
                        </span>
                        <span className="text-slate-500">
                          Monthly Limit: <strong className="text-slate-900 dark:text-white font-black">{formatCurrency(thresh.monthlyLimit, settings.currencySymbol)}</strong>
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isExceeded
                              ? 'bg-red-600 dark:bg-red-500'
                              : isWarning
                              ? 'bg-amber-500 dark:bg-amber-400'
                              : 'bg-emerald-500 dark:bg-emerald-400'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Controls Row: Edit limit & Warning threshold */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs border-t border-slate-100 dark:border-slate-800/40">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500">Set Monthly Limit:</span>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono font-bold">
                            {settings.currencySymbol}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={thresh.monthlyLimit}
                            onChange={e => handleLimitChange(origIndex, Number(e.target.value))}
                            className="w-32 pl-7 pr-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500">Alert at:</span>
                        <select
                          value={thresh.warningThresholdPct || 85}
                          onChange={e => handleWarningPctChange(origIndex, Number(e.target.value))}
                          className="px-2 py-1 text-[11px] rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer focus:outline-hidden"
                        >
                          <option value={75}>75% of Limit</option>
                          <option value={80}>80% of Limit</option>
                          <option value={85}>85% of Limit</option>
                          <option value={90}>90% of Limit</option>
                          <option value={95}>95% of Limit</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-[11px] hidden sm:inline">
              Changes take effect immediately and notify operators upon expenditure recording.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Apply &amp; Save Thresholds</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
