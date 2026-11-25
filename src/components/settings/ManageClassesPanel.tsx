import React, { useMemo, useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ClassStatus, SchoolClass } from '../../types';
import {
  GraduationCap,
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Check,
  X,
  AlertTriangle,
  AlertCircle,
  BookOpen,
  Users,
  Power,
  Sparkles,
  Layers,
} from 'lucide-react';

interface ManageClassesPanelProps {
  compact?: boolean;
  onClassCreated?: (className: string) => void;
  onCloseModal?: () => void;
}

const POPULAR_PRESETS = [
  'Play Group',
  'Nursery',
  'Prep',
  'KG-1',
  'KG-2',
  'Grade 11',
  'Grade 12',
  'O-Level 1',
  'O-Level 2',
  'A-Level 1',
  'A-Level 2',
];

export const ManageClassesPanel: React.FC<ManageClassesPanelProps> = ({
  compact = false,
  onClassCreated,
  onCloseModal,
}) => {
  const {
    classes,
    students,
    feeStructures,
    settings,
    addClassEntity,
    addMultipleClasses,
    updateClassEntity,
    deleteClassEntity,
    reorderClassEntities,
  } = useSchool();
  const { isAdmin } = useAuth();
  const { notify } = useNotifications();

  // Add class state
  const [newClassName, setNewClassName] = useState('');
  const [newClassOrder, setNewClassOrder] = useState<string>('');
  const [newClassSections, setNewClassSections] = useState(
    (settings.standardSections || ['A', 'B', 'C']).join(', ')
  );
  const [newClassStatus, setNewClassStatus] = useState<ClassStatus>('active');
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchInput, setBatchInput] = useState('');

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState<number>(1);
  const [editSections, setEditSections] = useState('');
  const [editStatus, setEditStatus] = useState<ClassStatus>('active');

  // Drag-and-drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Safety dialog state (blocked by students OR confirmation for existing fee structure)
  const [deleteDialog, setDeleteDialog] = useState<{
    cls: SchoolClass;
    enrolledCount: number;
    hasFeeStructure: boolean;
  } | null>(null);

  // Feedback banner
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (type: 'success' | 'error', message: string, title?: string) => {
    setNotice({ type, message });
    notify({
      title: title || (type === 'success' ? 'Class Catalog Updated' : 'Class Action Blocked'),
      message,
      category: 'system',
      priority: type === 'error' ? 'high' : 'normal',
      autoDismissMs: 4000,
    });
    setTimeout(() => setNotice(prev => (prev?.message === message ? null : prev)), 4000);
  };

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => a.display_order - b.display_order),
    [classes]
  );

  const filteredClasses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedClasses.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.sections || []).some(sec => sec.toLowerCase().includes(q))
      );
    });
  }, [sortedClasses, searchQuery, statusFilter]);

  const studentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of students) {
      const key = s.className.trim().toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [students]);

  const feeStructureByClass = useMemo(() => {
    const set = new Set<string>();
    for (const cls of classes) {
      const hasFs = feeStructures.some(
        f => f.class_id === cls.id || f.className.trim().toLowerCase() === cls.name.trim().toLowerCase()
      );
      if (hasFs) set.add(cls.id);
    }
    return set;
  }, [classes, feeStructures]);

  const availablePresets = useMemo(
    () =>
      POPULAR_PRESETS.filter(
        p => !classes.some(c => c.name.trim().toLowerCase() === p.toLowerCase())
      ),
    [classes]
  );

  const parseSections = (raw: string): string[] => {
    const parts = raw
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);
    return parts.length > 0 ? Array.from(new Set(parts)) : settings.standardSections || ['A', 'B', 'C'];
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showNotice('error', 'Administrator access is required to manage classes.');
      return;
    }
    const trimmed = newClassName.trim();
    if (!trimmed) {
      showNotice('error', 'Please enter a valid class name.');
      return;
    }
    const parsedOrder = newClassOrder.trim() ? Number(newClassOrder) : undefined;
    const res = await addClassEntity({
      name: trimmed,
      display_order: parsedOrder,
      sections: parseSections(newClassSections),
      status: newClassStatus,
    });
    if (res.success && res.classItem) {
      setNewClassName('');
      setNewClassOrder('');
      showNotice('success', `Class "${res.classItem.name}" added at order #${res.classItem.display_order}.`);
      onClassCreated?.(res.classItem.name);
    } else {
      showNotice('error', res.error || 'Could not add class.');
    }
  };

  const handleAddPreset = async (preset: string) => {
    if (!isAdmin) return;
    const res = await addClassEntity({
      name: preset,
      sections: settings.standardSections || ['A', 'B', 'C'],
      status: 'active',
    });
    if (res.success && res.classItem) {
      showNotice('success', `Added "${res.classItem.name}" to school classes.`);
      onClassCreated?.(res.classItem.name);
    } else {
      showNotice('error', res.error || `Could not add "${preset}".`);
    }
  };

  const handleBatchAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const parsed = batchInput
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (parsed.length === 0) {
      showNotice('error', 'Please enter at least one class name.');
      return;
    }
    const res = await addMultipleClasses(parsed);
    if (res.added.length > 0) {
      setBatchInput('');
      setIsBatchOpen(false);
      showNotice(
        'success',
        `Added ${res.added.length} classes (${res.added.join(', ')})${
          res.duplicates.length > 0 ? `. Skipped duplicates: ${res.duplicates.join(', ')}` : ''
        }.`
      );
      onClassCreated?.(res.added[0]);
    } else {
      showNotice('error', 'All entered classes already exist in the catalog.');
    }
  };

  const startEdit = (cls: SchoolClass) => {
    setEditingId(cls.id);
    setEditName(cls.name);
    setEditOrder(cls.display_order);
    setEditSections((cls.sections || []).join(', '));
    setEditStatus(cls.status);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const target = classes.find(c => c.id === editingId);
    if (!target) return;

    const res = await updateClassEntity({
      ...target,
      name: editName.trim(),
      display_order: Math.max(1, Number(editOrder) || target.display_order),
      sections: parseSections(editSections),
      status: editStatus,
    });

    if (res.success) {
      setEditingId(null);
      showNotice('success', `Class "${editName.trim()}" updated successfully.`);
    } else {
      showNotice('error', res.error || 'Could not update class.');
    }
  };

  const handleToggleStatus = async (cls: SchoolClass) => {
    if (!isAdmin) return;
    const nextStatus: ClassStatus = cls.status === 'active' ? 'inactive' : 'active';
    const res = await updateClassEntity({
      ...cls,
      status: nextStatus,
    });
    if (res.success) {
      showNotice(
        'success',
        `Class "${cls.name}" is now ${nextStatus === 'active' ? 'Active' : 'Inactive'}.`
      );
    } else {
      showNotice('error', res.error || 'Status update failed.');
    }
  };

  const handleRequestDelete = (cls: SchoolClass) => {
    if (!isAdmin) return;
    const enrolledCount = studentCounts[cls.name.trim().toLowerCase()] || 0;
    const hasFeeStructure = feeStructureByClass.has(cls.id);
    setDeleteDialog({
      cls,
      enrolledCount,
      hasFeeStructure,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog) return;
    const { cls } = deleteDialog;
    const res = await deleteClassEntity(cls.id);
    if (res.success) {
      setDeleteDialog(null);
      showNotice('success', `Class "${cls.name}" deleted from curriculum.`);
    } else {
      showNotice('error', res.error || 'Could not delete class.');
    }
  };

  const handleDeactivateInstead = async () => {
    if (!deleteDialog) return;
    const { cls } = deleteDialog;
    const res = await updateClassEntity({ ...cls, status: 'inactive' });
    setDeleteDialog(null);
    if (res.success) {
      showNotice(
        'success',
        `Class "${cls.name}" deactivated. Existing student records remain intact.`
      );
    }
  };

  const handleMoveUpDown = async (indexInSorted: number, direction: 'up' | 'down') => {
    if (!isAdmin) return;
    const targetIdx = direction === 'up' ? indexInSorted - 1 : indexInSorted + 1;
    if (targetIdx < 0 || targetIdx >= sortedClasses.length) return;
    const copy = [...sortedClasses];
    const [moved] = copy.splice(indexInSorted, 1);
    copy.splice(targetIdx, 0, moved);
    await reorderClassEntities(copy.map(c => c.id));
  };

  const handleDropOnRow = async (targetId: string) => {
    if (!isAdmin || !draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const copy = [...sortedClasses];
    const fromIdx = copy.findIndex(c => c.id === draggedId);
    const toIdx = copy.findIndex(c => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    setDraggedId(null);
    setDragOverId(null);
    await reorderClassEntities(copy.map(c => c.id));
    showNotice('success', 'Class display order updated.');
  };

  const activeCount = classes.filter(c => c.status === 'active').length;
  const inactiveCount = classes.filter(c => c.status === 'inactive').length;
  const canDragReorder = isAdmin && searchQuery.trim() === '' && statusFilter === 'all';

  return (
    <div className="space-y-4">
      {/* Header Summary */}
      <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Dynamic Class &amp; Grade Management
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Add, rename, reorder (drag or arrows), activate/deactivate classes from preschool through senior grades.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-emerald-700 dark:text-emerald-400 shadow-xs">
            {activeCount} Active
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-500 shadow-xs">
            {inactiveCount} Inactive
          </span>
          {onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {notice && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-sm animate-in fade-in ${
            notice.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="p-1 hover:bg-white/20 rounded-md cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Add Class Form */}
      {isAdmin ? (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {isBatchOpen ? 'Batch Add Multiple Classes' : 'Add New Class'}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsBatchOpen(!isBatchOpen)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {isBatchOpen ? '← Single Class Form' : '+ Batch Add Multiple'}
            </button>
          </div>

          {!isBatchOpen ? (
            <form onSubmit={handleAddClass} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Class Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Play Group, Nursery, Grade 11"
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder={String(classes.length + 1)}
                    value={newClassOrder}
                    onChange={e => setNewClassOrder(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Sections (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="A, B, C"
                    value={newClassSections}
                    onChange={e => setNewClassSections(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Status
                  </label>
                  <select
                    value={newClassStatus}
                    onChange={e => setNewClassStatus(e.target.value as ClassStatus)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {!compact && availablePresets.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Quick Add:
                    </span>
                    {availablePresets.slice(0, 6).map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleAddPreset(preset)}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Class</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleBatchAdd} className="space-y-3">
              <textarea
                rows={3}
                placeholder="Enter class names separated by commas or new lines (e.g. Grade 11, Grade 12, O-Level 1)..."
                value={batchInput}
                onChange={e => setBatchInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  Add All Classes
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Adding, renaming, reordering, or deleting classes requires Administrator authority.</span>
        </div>
      )}

      {/* Search, Filter & Catalog Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Curriculum Classes Catalog ({filteredClasses.length})
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-[11px] font-bold">
              {(['all', 'active', 'inactive'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                {isAdmin && <th className="py-3 px-3 w-24 text-center">Order</th>}
                <th className="py-3 px-4">Class Name</th>
                <th className="py-3 px-4">Sections</th>
                <th className="py-3 px-4 text-center">Students</th>
                <th className="py-3 px-4 text-center">Fee Link</th>
                <th className="py-3 px-4 text-center">Status</th>
                {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 5} className="py-8 text-center text-slate-400">
                    No classes match the current filter.
                  </td>
                </tr>
              ) : (
                filteredClasses.map(cls => {
                  const sortedIndex = sortedClasses.findIndex(c => c.id === cls.id);
                  const enrolled = studentCounts[cls.name.trim().toLowerCase()] || 0;
                  const hasFee = feeStructureByClass.has(cls.id);
                  const isEditing = editingId === cls.id;

                  return (
                    <tr
                      key={cls.id}
                      draggable={canDragReorder && !isEditing}
                      onDragStart={() => setDraggedId(cls.id)}
                      onDragOver={e => {
                        if (!canDragReorder) return;
                        e.preventDefault();
                        setDragOverId(cls.id);
                      }}
                      onDragLeave={() => setDragOverId(null)}
                      onDrop={e => {
                        e.preventDefault();
                        handleDropOnRow(cls.id);
                      }}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setDragOverId(null);
                      }}
                      className={`transition ${
                        dragOverId === cls.id
                          ? 'bg-indigo-50 dark:bg-indigo-950/40'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      } ${cls.status === 'inactive' ? 'opacity-75' : ''}`}
                    >
                      {isAdmin && (
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {canDragReorder && (
                              <span
                                className="cursor-grab text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                title="Drag to reorder"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </span>
                            )}
                            <span className="font-mono text-[11px] font-bold text-slate-500 w-5">
                              {cls.display_order}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleMoveUpDown(sortedIndex, 'up')}
                                disabled={sortedIndex === 0}
                                title="Move up"
                                className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveUpDown(sortedIndex, 'down')}
                                disabled={sortedIndex === sortedClasses.length - 1}
                                title="Move down"
                                className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      )}

                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {isEditing ? (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="px-2.5 py-1 text-xs rounded-lg border border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                            <input
                              type="number"
                              min="1"
                              value={editOrder}
                              onChange={e => setEditOrder(Number(e.target.value))}
                              className="w-16 px-2 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                              title="Display order"
                            />
                          </div>
                        ) : (
                          <span className="font-bold">{cls.name}</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editSections}
                            onChange={e => setEditSections(e.target.value)}
                            placeholder="A, B, C"
                            className="w-28 px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(cls.sections || []).map(sec => (
                              <span
                                key={sec}
                                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300"
                              >
                                {sec}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            enrolled > 0
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Users className="w-3 h-3" />
                          {enrolled}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            hasFee
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Layers className="w-3 h-3" />
                          {hasFee ? 'Configured' : 'Not Set'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <select
                            value={editStatus}
                            onChange={e => setEditStatus(e.target.value as ClassStatus)}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        ) : (
                          <button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => handleToggleStatus(cls)}
                            title={isAdmin ? 'Click to toggle Active/Inactive' : undefined}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                              cls.status === 'active'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                            } ${isAdmin ? 'cursor-pointer hover:opacity-80' : ''}`}
                          >
                            {cls.status === 'active' ? 'Active' : 'Inactive'}
                          </button>
                        )}
                      </td>

                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(cls)}
                                title={`Edit ${cls.name}`}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(cls)}
                                title={cls.status === 'active' ? 'Deactivate class' : 'Activate class'}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition cursor-pointer"
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRequestDelete(cls)}
                                title={`Delete ${cls.name}`}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Safety Modal */}
      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  deleteDialog.enrolledCount > 0
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  {deleteDialog.enrolledCount > 0
                    ? `Cannot Delete "${deleteDialog.cls.name}"`
                    : `Delete Class "${deleteDialog.cls.name}"?`}
                </h4>

                {deleteDialog.enrolledCount > 0 ? (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <strong>{deleteDialog.enrolledCount}</strong> student
                    {deleteDialog.enrolledCount === 1 ? ' is' : 's are'} currently enrolled in{' '}
                    <strong>{deleteDialog.cls.name}</strong>. Deleting this class would orphan student and attendance history.
                    We recommend <strong>Deactivating</strong> it instead so it hides from new admissions while preserving historical records.
                  </p>
                ) : deleteDialog.hasFeeStructure ? (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Warning: <strong>{deleteDialog.cls.name}</strong> has an existing{' '}
                    <strong>Fee Structure</strong> linked to it. Deleting this class will permanently remove both the class and its linked fee structure.
                  </p>
                ) : (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    No students or fee structures are currently blocked on{' '}
                    <strong>{deleteDialog.cls.name}</strong>. This action removes the class from dropdowns and reports.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteDialog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>

              {deleteDialog.enrolledCount > 0 ? (
                <button
                  type="button"
                  onClick={handleDeactivateInstead}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Deactivate Instead
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  {deleteDialog.hasFeeStructure ? 'Delete Class & Fee Structure' : 'Delete Class'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
