import React, { useState, useMemo, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useNotifications } from '../../context/NotificationContext';
import { ManageClassesPanel } from '../settings/ManageClassesPanel';
import { FeeStructure, FeeHead, BillingFrequency } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Check,
  Copy,
  Settings2,
  AlertCircle,
  Calendar,
} from 'lucide-react';

const BILLING_FREQUENCIES: { value: BillingFrequency; label: string; annualMultiplier: number }[] = [
  { value: 'Monthly', label: 'Monthly', annualMultiplier: 12 },
  { value: 'Quarterly', label: 'Quarterly', annualMultiplier: 4 },
  { value: 'Half-Yearly', label: 'Half-Yearly', annualMultiplier: 2 },
  { value: 'Yearly', label: 'Yearly', annualMultiplier: 1 },
];

const QUICK_FEE_HEAD_PRESETS = [
  { name: 'Tuition Fee', amount: 300, isOptional: false },
  { name: 'Admission Fee', amount: 500, isOptional: false },
  { name: 'Annual Fund', amount: 250, isOptional: false },
  { name: 'Examinations & Library', amount: 40, isOptional: false },
  { name: 'Computer & Science Lab', amount: 50, isOptional: false },
  { name: 'Transport Service', amount: 80, isOptional: true },
];

const normalizeFrequency = (raw?: string): BillingFrequency => {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('quarter') || lower.includes('term')) return 'Quarterly';
  if (lower.includes('half')) return 'Half-Yearly';
  if (lower.includes('year') || lower.includes('annual')) return 'Yearly';
  return 'Monthly';
};

export const FeeStructureView: React.FC = () => {
  const {
    activeClasses,
    feeStructures,
    settings,
    saveFeeStructure,
    addClassEntity,
  } = useSchool();
  const { notify } = useNotifications();

  const [selectedClassId, setSelectedClassId] = useState<string>(
    activeClasses[0]?.id || ''
  );

  // Ensure selectedClassId always points to an existing active class
  useEffect(() => {
    if (activeClasses.length === 0) {
      setSelectedClassId('');
      return;
    }
    if (!activeClasses.some(c => c.id === selectedClassId)) {
      setSelectedClassId(activeClasses[0].id);
    }
  }, [activeClasses, selectedClassId]);

  const selectedClassObj = useMemo(
    () => activeClasses.find(c => c.id === selectedClassId) || activeClasses[0],
    [activeClasses, selectedClassId]
  );

  const selectedClassName = selectedClassObj?.name || '';

  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>('Monthly');
  const [heads, setHeads] = useState<FeeHead[]>([]);

  // New head inputs
  const [newHeadName, setNewHeadName] = useState('');
  const [newHeadAmount, setNewHeadAmount] = useState<string>('');
  const [newHeadOptional, setNewHeadOptional] = useState<boolean>(false);

  // Inline editing of a head
  const [editingHeadId, setEditingHeadId] = useState<string | null>(null);
  const [editingHeadName, setEditingHeadName] = useState('');
  const [editingHeadOptional, setEditingHeadOptional] = useState(false);

  // Modals: Quick Add Class, Manage Classes, Copy Fee Structure
  const [isQuickAddClassOpen, setIsQuickAddClassOpen] = useState(false);
  const [quickClassName, setQuickClassName] = useState('');
  const [isManageClassesOpen, setIsManageClassesOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySourceClassId, setCopySourceClassId] = useState<string>('');

  // Status banner
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Load saved structure linked by class_id (with fallback to legacy className)
  useEffect(() => {
    if (!selectedClassObj) {
      setHeads([]);
      return;
    }
    const existing = feeStructures.find(
      f =>
        (f.class_id && f.class_id === selectedClassObj.id) ||
        f.className.trim().toLowerCase() === selectedClassObj.name.trim().toLowerCase()
    );
    if (existing) {
      setHeads(existing.heads || []);
      setBillingFrequency(
        existing.billing_frequency || normalizeFrequency(existing.termOrMonth)
      );
    } else {
      setHeads([]);
      setBillingFrequency('Monthly');
    }
    setEditingHeadId(null);
  }, [selectedClassObj, feeStructures]);

  const handleAddHead = () => {
    const trimmed = newHeadName.trim();
    const parsedAmount = Number(newHeadAmount);
    if (!trimmed) {
      notify({
        title: 'Fee Head Required',
        message: 'Please enter a valid fee head name.',
        category: 'system',
        priority: 'high',
        autoDismissMs: 3500,
      });
      return;
    }
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      notify({
        title: 'Invalid Amount',
        message: 'Fee head amount must be 0 or greater.',
        category: 'system',
        priority: 'high',
        autoDismissMs: 3500,
      });
      return;
    }
    if (heads.some(h => h.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      notify({
        title: 'Duplicate Fee Head',
        message: `"${trimmed}" already exists in this class fee structure.`,
        category: 'system',
        priority: 'high',
        autoDismissMs: 3500,
      });
      return;
    }

    const newHead: FeeHead = {
      id: `fh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      amount: Math.round(parsedAmount * 100) / 100,
      isOptional: newHeadOptional,
    };
    setHeads(prev => [...prev, newHead]);
    setNewHeadName('');
    setNewHeadAmount('');
    setNewHeadOptional(false);
  };

  const handleAddPresetHead = (preset: { name: string; amount: number; isOptional: boolean }) => {
    if (heads.some(h => h.name.trim().toLowerCase() === preset.name.toLowerCase())) {
      return;
    }
    setHeads(prev => [
      ...prev,
      {
        id: `fh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: preset.name,
        amount: preset.amount,
        isOptional: preset.isOptional,
      },
    ]);
  };

  const handleRemoveHead = (headId: string) => {
    setHeads(prev => prev.filter(h => h.id !== headId));
  };

  const handleUpdateAmount = (headId: string, amount: number) => {
    setHeads(prev =>
      prev.map(h => (h.id === headId ? { ...h, amount: Math.max(0, amount || 0) } : h))
    );
  };

  const handleStartEditHead = (head: FeeHead) => {
    setEditingHeadId(head.id);
    setEditingHeadName(head.name);
    setEditingHeadOptional(Boolean(head.isOptional));
  };

  const handleSaveHeadEdit = () => {
    if (!editingHeadId) return;
    const trimmed = editingHeadName.trim();
    if (!trimmed) return;
    setHeads(prev =>
      prev.map(h =>
        h.id === editingHeadId
          ? { ...h, name: trimmed, isOptional: editingHeadOptional }
          : h
      )
    );
    setEditingHeadId(null);
  };

  const mandatoryTotal = heads
    .filter(h => !h.isOptional)
    .reduce((sum, h) => sum + (h.amount || 0), 0);
  const optionalTotal = heads
    .filter(h => h.isOptional)
    .reduce((sum, h) => sum + (h.amount || 0), 0);
  const totalFeeAmount = mandatoryTotal + optionalTotal;

  const currentFreqMeta =
    BILLING_FREQUENCIES.find(b => b.value === billingFrequency) || BILLING_FREQUENCIES[0];

  const handleSaveStructure = async () => {
    if (!selectedClassObj) {
      const msg = 'No active target class selected.';
      setStatusBanner({ type: 'error', message: msg });
      notify({ title: 'Save Failed', message: msg, category: 'system', priority: 'high' });
      return;
    }

    if (heads.length === 0) {
      const msg = `Add at least one fee head for ${selectedClassObj.name} before saving.`;
      setStatusBanner({ type: 'error', message: msg });
      notify({ title: 'Validation Required', message: msg, category: 'system', priority: 'high' });
      return;
    }

    if (heads.some(h => !h.name.trim() || h.amount < 0)) {
      const msg = 'Every fee head must have a non-empty name and non-negative amount.';
      setStatusBanner({ type: 'error', message: msg });
      notify({ title: 'Validation Required', message: msg, category: 'system', priority: 'high' });
      return;
    }

    const existing = feeStructures.find(
      f =>
        (f.class_id && f.class_id === selectedClassObj.id) ||
        f.className.trim().toLowerCase() === selectedClassObj.name.trim().toLowerCase()
    );

    const structure: FeeStructure = {
      id: existing ? existing.id : `fs-${selectedClassObj.id}`,
      class_id: selectedClassObj.id,
      className: selectedClassObj.name,
      termOrMonth: billingFrequency,
      billing_frequency: billingFrequency,
      heads,
      totalAmount: totalFeeAmount,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveFeeStructure(structure);
      const msg = `Fee structure for ${selectedClassObj.name} (${billingFrequency}) saved: ${formatCurrency(
        totalFeeAmount,
        settings.currencySymbol
      )}.`;
      setStatusBanner({ type: 'success', message: msg });
      notify({
        title: 'Fee Structure Saved',
        message: msg,
        category: 'system',
        priority: 'normal',
        autoDismissMs: 4000,
      });
      setTimeout(() => setStatusBanner(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save fee structure.';
      setStatusBanner({ type: 'error', message: msg });
      notify({ title: 'Save Error', message: msg, category: 'system', priority: 'high' });
    }
  };

  const handleQuickAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await addClassEntity({ name: quickClassName });
    if (res.success && res.classItem) {
      setQuickClassName('');
      setIsQuickAddClassOpen(false);
      setSelectedClassId(res.classItem.id);
      notify({
        title: 'Class Created',
        message: `Added "${res.classItem.name}". Configure its fee heads now.`,
        category: 'system',
        priority: 'normal',
      });
    } else {
      notify({
        title: 'Could Not Add Class',
        message: res.error || 'Class creation failed.',
        category: 'system',
        priority: 'high',
      });
    }
  };

  const copyCandidates = useMemo(() => {
    return feeStructures.filter(
      f =>
        f.heads &&
        f.heads.length > 0 &&
        (!selectedClassObj ||
          (f.class_id !== selectedClassObj.id &&
            f.className.toLowerCase() !== selectedClassObj.name.toLowerCase()))
    );
  }, [feeStructures, selectedClassObj]);

  const handleOpenCopyModal = () => {
    if (copyCandidates.length > 0) {
      setCopySourceClassId(copyCandidates[0].id);
    }
    setIsCopyModalOpen(true);
  };

  const handleApplyCopyStructure = () => {
    const src = feeStructures.find(f => f.id === copySourceClassId);
    if (!src || !selectedClassObj) return;
    const clonedHeads: FeeHead[] = src.heads.map((h, idx) => ({
      ...h,
      id: `fh-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
    }));
    setHeads(clonedHeads);
    setBillingFrequency(src.billing_frequency || normalizeFrequency(src.termOrMonth));
    setIsCopyModalOpen(false);
    notify({
      title: 'Fee Structure Copied',
      message: `Copied ${clonedHeads.length} fee heads from ${src.className} into ${selectedClassObj.name}. Click "Save Fee Structure" to persist.`,
      category: 'system',
      priority: 'normal',
    });
  };

  const configuredClassIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of activeClasses) {
      const match = feeStructures.some(
        f =>
          f.heads.length > 0 &&
          ((f.class_id && f.class_id === c.id) ||
            f.className.trim().toLowerCase() === c.name.trim().toLowerCase())
      );
      if (match) set.add(c.id);
    }
    return set;
  }, [activeClasses, feeStructures]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            <span>Class Fee Structure Configuration</span>
          </h2>
          <p className="text-xs text-slate-500">
            Configure itemized fee heads and billing schedules linked to each active class ({activeClasses.length} active classes)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsManageClassesOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
          >
            <Settings2 className="w-4 h-4 text-indigo-600" />
            <span>Manage Classes</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCopyModal}
            disabled={copyCandidates.length === 0 || !selectedClassObj}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-xs transition disabled:opacity-40 cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            <span>Copy from Class</span>
          </button>

          <button
            type="button"
            onClick={handleSaveStructure}
            disabled={!selectedClassObj}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Fee Structure</span>
          </button>
        </div>
      </div>

      {statusBanner && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-lg animate-in fade-in ${
            statusBanner.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusBanner.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="p-1 hover:bg-white/20 rounded-md cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Dynamic Class Selector Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase mr-1">
              Select Target Class:
            </span>
            {activeClasses.length === 0 ? (
              <span className="text-xs text-amber-600 font-semibold">
                No active classes found — add a class to configure fees.
              </span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {activeClasses.map(cls => {
                  const isConfigured = configuredClassIds.has(cls.id);
                  const isSelected = selectedClassObj?.id === cls.id;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedClassId(cls.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{cls.name}</span>
                      {isConfigured && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-emerald-300' : 'bg-emerald-500'
                          }`}
                          title="Fee structure configured"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsQuickAddClassOpen(true)}
              className="px-2.5 py-1.5 rounded-xl border border-dashed border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Class</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-semibold">Billing Frequency:</span>
            <select
              value={billingFrequency}
              onChange={e => setBillingFrequency(e.target.value as BillingFrequency)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
            >
              {BILLING_FREQUENCIES.map(freq => (
                <option key={freq.value} value={freq.value}>
                  {freq.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Per-Class Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Mandatory Fee Heads
          </p>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-1 font-mono">
            {formatCurrency(mandatoryTotal, settings.currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {heads.filter(h => !h.isOptional).length} required head(s) per {billingFrequency.toLowerCase()} cycle
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Optional / Elective Heads
          </p>
          <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
            {formatCurrency(optionalTotal, settings.currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {heads.filter(h => h.isOptional).length} optional head(s) (e.g. transport)
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Total Class Fee ({selectedClassName || '—'})
          </p>
          <p className="text-lg font-black text-indigo-700 dark:text-indigo-300 mt-1 font-mono">
            {formatCurrency(totalFeeAmount, settings.currencySymbol)}{' '}
            <span className="text-xs font-semibold">/ {billingFrequency}</span>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Annualized baseline:{' '}
            {formatCurrency(
              totalFeeAmount * currentFreqMeta.annualMultiplier,
              settings.currencySymbol
            )}
            /yr
          </p>
        </div>
      </div>

      {/* Fee Heads List & Adder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Heads List */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Configured Fee Heads for {selectedClassName || 'Selected Class'}
            </span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
              Total: {formatCurrency(totalFeeAmount, settings.currencySymbol)}
            </span>
          </div>

          {heads.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-xs font-semibold text-slate-500">
                No fee heads configured for <strong>{selectedClassName || 'this class'}</strong> yet.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {QUICK_FEE_HEAD_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleAddPresetHead(preset)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {heads.map((head, idx) => {
                const isEditing = editingHeadId === head.id;
                return (
                  <div
                    key={head.id}
                    className="p-4 flex flex-wrap sm:flex-nowrap items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition gap-4"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      {isEditing ? (
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingHeadName}
                            onChange={e => setEditingHeadName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveHeadEdit();
                              if (e.key === 'Escape') setEditingHeadId(null);
                            }}
                            autoFocus
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-indigo-500 bg-white dark:bg-slate-900"
                          />
                          <label className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={editingHeadOptional}
                              onChange={e => setEditingHeadOptional(e.target.checked)}
                              className="rounded text-indigo-600"
                            />
                            Optional
                          </label>
                          <button
                            type="button"
                            onClick={handleSaveHeadEdit}
                            className="px-2 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
                            {head.name}
                          </p>
                          {head.isOptional && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                              Optional / Elective
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">{settings.currencySymbol}</span>
                        <input
                          type="number"
                          min="0"
                          value={head.amount}
                          onChange={e => handleUpdateAmount(head.id, Number(e.target.value))}
                          className="w-24 px-2 py-1 text-xs font-mono font-bold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-right"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartEditHead(head)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                        title="Edit fee head"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveHead(head.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                        title="Remove fee head"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Add New Fee Head Form */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs h-fit space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Plus className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Add Custom Fee Head
            </h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Fee Head Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Science Laboratory Fee"
              value={newHeadName}
              onChange={e => setNewHeadName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Amount ({settings.currencySymbol}) *
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={newHeadAmount}
              onChange={e => setNewHeadAmount(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="optHead"
              checked={newHeadOptional}
              onChange={e => setNewHeadOptional(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="optHead" className="text-xs text-slate-600 dark:text-slate-300">
              Optional fee (e.g. Bus transport)
            </label>
          </div>

          <button
            type="button"
            onClick={handleAddHead}
            className="w-full py-2 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add to Structure</span>
          </button>

          {heads.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Quick Add Preset</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_FEE_HEAD_PRESETS.filter(
                  p => !heads.some(h => h.name.toLowerCase() === p.name.toLowerCase())
                ).map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleAddPresetHead(p)}
                    className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition cursor-pointer"
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Class Modal */}
      {isQuickAddClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleQuickAddClass}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Add New Class
              </h4>
              <button
                type="button"
                onClick={() => setIsQuickAddClassOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Class Name *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Pre-Nursery, Grade 11"
                value={quickClassName}
                onChange={e => setQuickClassName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsQuickAddClassOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Create &amp; Select
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Copy Fee Structure Modal */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Copy className="w-4 h-4 text-indigo-600" />
                <span>Copy Fee Structure</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Select a configured class to copy all of its fee heads and billing frequency into{' '}
              <strong>{selectedClassName}</strong>.
            </p>
            <select
              value={copySourceClassId}
              onChange={e => setCopySourceClassId(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              {copyCandidates.map(c => (
                <option key={c.id} value={c.id}>
                  {c.className} — {c.heads.length} heads (
                  {formatCurrency(c.totalAmount, settings.currencySymbol)} /{' '}
                  {c.billing_frequency || c.termOrMonth})
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCopyStructure}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Copy Heads
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Manage Classes Modal */}
      {isManageClassesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
            <ManageClassesPanel
              compact
              onCloseModal={() => setIsManageClassesOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
