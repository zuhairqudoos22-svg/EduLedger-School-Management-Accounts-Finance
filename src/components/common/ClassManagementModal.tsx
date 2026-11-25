import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Check,
  AlertCircle,
  X,
  Layers,
  Users,
  Sparkles,
  Search,
  BookOpen,
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';

interface ClassManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClassAdded?: (newClassName: string) => void;
}

export const ClassManagementModal: React.FC<ClassManagementModalProps> = ({
  isOpen,
  onClose,
  onClassAdded,
}) => {
  const {
    settings,
    students,
    addClass,
    removeClass,
    renameClass,
    reorderClasses,
    addSection,
    removeSection,
    addMultipleClasses,
  } = useSchool();
  const { currentUser, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'classes' | 'sections'>('classes');
  const [newClassName, setNewClassName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchClassInput, setBatchClassInput] = useState('');

  // Editing class state
  const [editingClassName, setEditingClassName] = useState<string | null>(null);
  const [editInputVal, setEditInputVal] = useState('');

  // New section state
  const [newSectionName, setNewSectionName] = useState('');

  // Notification / error feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 3500);
  };

  const currentClasses = useMemo(() => {
    return settings.standardClasses || [];
  }, [settings.standardClasses]);

  const currentSections = useMemo(() => {
    return settings.standardSections || ['A', 'B', 'C'];
  }, [settings.standardSections]);

  // Calculate enrolled students per class
  const studentCountPerClass = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of currentClasses) {
      counts[c] = 0;
    }
    for (const s of students) {
      if (counts[s.className] !== undefined) {
        counts[s.className]++;
      } else {
        counts[s.className] = 1;
      }
    }
    return counts;
  }, [currentClasses, students]);

  // Common quick presets
  const popularPresets = [
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

  const availablePresets = popularPresets.filter(
    preset => !currentClasses.some(c => c.toLowerCase() === preset.toLowerCase())
  );

  // Filtered classes by search
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return currentClasses;
    return currentClasses.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase().trim()));
  }, [currentClasses, searchQuery]);

  if (!isOpen) return null;

  const handleAddSingleClass = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) {
      showFeedback('error', 'Administrator authority required to add classes.');
      return;
    }

    const trimmed = newClassName.trim();
    if (!trimmed) {
      showFeedback('error', 'Please enter a valid class name.');
      return;
    }

    if (currentClasses.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      showFeedback('error', `Class "${trimmed}" already exists in the academic catalog.`);
      return;
    }

    const ok = await addClass(trimmed);
    if (ok) {
      showFeedback('success', `Class "${trimmed}" successfully added to academic curriculum!`);
      setNewClassName('');
      if (onClassAdded) {
        onClassAdded(trimmed);
      }
    } else {
      showFeedback('error', 'Failed to add class. Please try again.');
    }
  };

  const handleAddPreset = async (presetName: string) => {
    if (!isAdmin) {
      showFeedback('error', 'Administrator authority required to add classes.');
      return;
    }
    const ok = await addClass(presetName);
    if (ok) {
      showFeedback('success', `Class "${presetName}" successfully added!`);
      if (onClassAdded) {
        onClassAdded(presetName);
      }
    } else {
      showFeedback('error', `Failed to add "${presetName}".`);
    }
  };

  const handleAddBatchClasses = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showFeedback('error', 'Administrator authority required to add classes.');
      return;
    }

    const names = batchClassInput
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (names.length === 0) {
      showFeedback('error', 'Please enter at least one class name.');
      return;
    }

    if (addMultipleClasses) {
      const res = await addMultipleClasses(names);
      if (res.added.length > 0) {
        let msg = `Successfully added ${res.added.length} new class(es): ${res.added.join(', ')}.`;
        if (res.duplicates.length > 0) {
          msg += ` (${res.duplicates.length} duplicate(s) skipped).`;
        }
        showFeedback('success', msg);
        setBatchClassInput('');
        setIsBatchMode(false);
        if (onClassAdded && res.added[0]) {
          onClassAdded(res.added[0]);
        }
      } else {
        showFeedback('error', 'All entered class names already exist.');
      }
    } else {
      let count = 0;
      for (const name of names) {
        const ok = await addClass(name);
        if (ok) count++;
      }
      showFeedback('success', `Added ${count} new class(es).`);
      setBatchClassInput('');
      setIsBatchMode(false);
    }
  };

  const handleStartRename = (className: string) => {
    setEditingClassName(className);
    setEditInputVal(className);
  };

  const handleSaveRename = async () => {
    if (!isAdmin) {
      showFeedback('error', 'Administrator authority required to modify classes.');
      return;
    }
    if (!editingClassName) return;
    const trimmed = editInputVal.trim();
    if (!trimmed || trimmed === editingClassName) {
      setEditingClassName(null);
      return;
    }

    if (currentClasses.some(c => c.toLowerCase() === trimmed.toLowerCase() && c !== editingClassName)) {
      showFeedback('error', `A class named "${trimmed}" already exists.`);
      return;
    }

    const enrolled = studentCountPerClass[editingClassName] || 0;
    const ok = await renameClass(editingClassName, trimmed);
    if (ok) {
      showFeedback(
        'success',
        `Renamed "${editingClassName}" to "${trimmed}". ${
          enrolled > 0 ? `Updated ${enrolled} enrolled student record(s).` : ''
        }`
      );
      setEditingClassName(null);
    } else {
      showFeedback('error', 'Failed to rename class.');
    }
  };

  const handleDeleteClass = async (className: string) => {
    if (!isAdmin) {
      showFeedback('error', 'Administrator authority required to delete classes.');
      return;
    }
    const count = studentCountPerClass[className] || 0;
    if (count > 0) {
      const confirmForce = window.confirm(
        `Warning: There are currently ${count} student(s) enrolled in ${className}.\n\nAre you sure you want to remove this class from standard classes? Existing student records will retain this name until updated, but it will no longer appear in future class selections.`
      );
      if (!confirmForce) return;
    } else {
      const confirmNormal = window.confirm(
        `Are you sure you want to remove the class "${className}"?`
      );
      if (!confirmNormal) return;
    }

    const ok = await removeClass(className);
    if (ok) {
      showFeedback('success', `Class "${className}" removed.`);
    } else {
      showFeedback('error', 'Failed to remove class.');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (!isAdmin) {
      showFeedback('error', 'Administrator authority required to reorder classes.');
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentClasses.length) return;

    const copy = [...currentClasses];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);

    await reorderClasses(copy);
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showFeedback('error', 'Administrator authority required to add sections.');
      return;
    }
    const trimmed = newSectionName.trim().toUpperCase();
    if (!trimmed) {
      showFeedback('error', 'Please enter a section identifier (e.g. D or Section 1).');
      return;
    }
    if (currentSections.includes(trimmed)) {
      showFeedback('error', `Section "${trimmed}" already exists.`);
      return;
    }
    const ok = await addSection(trimmed);
    if (ok) {
      showFeedback('success', `Section "${trimmed}" added!`);
      setNewSectionName('');
    } else {
      showFeedback('error', 'Failed to add section.');
    }
  };

  const handleRemoveSection = async (section: string) => {
    if (!isAdmin) {
      showFeedback('error', 'Administrator authority required to delete sections.');
      return;
    }
    if (currentSections.length <= 1) {
      showFeedback('error', 'The institution must keep at least one active section.');
      return;
    }
    const ok = await removeSection(section);
    if (ok) {
      showFeedback('success', `Section "${section}" removed.`);
    } else {
      showFeedback('error', 'Failed to remove section.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Academic Classes &amp; Sections Authority
                </h3>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    <ShieldCheck className="w-3 h-3" />
                    Admin Authority
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                    Read Only
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure grade levels, class names, curriculum cohorts, and standard classroom sections
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Authority Banner */}
        <div className="px-6 py-3 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              {isAdmin ? (
                <>
                  Logged in as <strong className="font-bold">{currentUser?.fullName || 'Administrator'}</strong> with full authority to add, rename, reorder, and configure academic classes.
                </>
              ) : (
                <>
                  You are logged in as a finance/staff user. Adding or deleting classes requires administrator authority.
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {currentClasses.length} Active Classes
            </span>
            <span className="px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {currentSections.length} Standard Sections
            </span>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-sm animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="p-1 hover:bg-white/20 rounded-md transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <button
            onClick={() => setActiveTab('classes')}
            className={`pb-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
              activeTab === 'classes'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Academic Classes ({currentClasses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`pb-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
              activeTab === 'sections'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Standard Sections ({currentSections.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'classes' && (
            <>
              {/* Add Class Panel (Admin Only) */}
              {isAdmin ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        {isBatchMode ? 'Batch Add Multiple Classes' : 'Add New Class to Curriculum'}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBatchMode(!isBatchMode)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {isBatchMode ? 'Switch to Single Entry' : '+ Batch Add Multiple'}
                    </button>
                  </div>

                  {!isBatchMode ? (
                    <form onSubmit={handleAddSingleClass} className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="Enter class name (e.g. Grade 11, Pre-K, O-Level Biology)..."
                            value={newClassName}
                            onChange={e => setNewClassName(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Class</span>
                        </button>
                      </div>

                      {/* Quick Presets */}
                      {availablePresets.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            Quick Presets (Click to Add):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {availablePresets.map(preset => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => handleAddPreset(preset)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition"
                              >
                                + {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </form>
                  ) : (
                    <form onSubmit={handleAddBatchClasses} className="space-y-3">
                      <p className="text-xs text-slate-500">
                        Enter multiple class names separated by commas or on separate lines:
                      </p>
                      <textarea
                        rows={3}
                        placeholder="Grade 11, Grade 12, Pre-K, Kindergarten, O-Level 1..."
                        value={batchClassInput}
                        onChange={e => setBatchClassInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsBatchMode(false)}
                          className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-95"
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
                  <span>
                    Class creation is restricted to System Administrators. Please contact an institutional admin to add new grade levels.
                  </span>
                </div>
              )}

              {/* Class Inventory Header and Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Existing Classes Catalog ({filteredClasses.length})
                  </h4>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search classes..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden w-36 sm:w-48"
                  />
                </div>
              </div>

              {/* Class List Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      {isAdmin && <th className="py-3 px-3 w-16 text-center">Order</th>}
                      <th className="py-3 px-4">Class / Grade Name</th>
                      <th className="py-3 px-4 text-center">Enrolled Students</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      {isAdmin && <th className="py-3 px-4 text-right">Admin Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredClasses.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 6 : 4} className="py-8 text-center text-slate-400">
                          No classes found matching "{searchQuery}".
                        </td>
                      </tr>
                    ) : (
                      filteredClasses.map((className, index) => {
                        const originalIndex = currentClasses.indexOf(className);
                        const enrolled = studentCountPerClass[className] || 0;
                        const isEditing = editingClassName === className;

                        return (
                          <tr
                            key={className}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                          >
                            <td className="py-3 px-4 text-center font-mono text-slate-400">
                              {originalIndex + 1}
                            </td>

                            {isAdmin && (
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-0.5">
                                  <button
                                    onClick={() => handleMove(originalIndex, 'up')}
                                    disabled={originalIndex === 0}
                                    title="Move up in dropdowns"
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleMove(originalIndex, 'down')}
                                    disabled={originalIndex === currentClasses.length - 1}
                                    title="Move down in dropdowns"
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}

                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                              {isEditing ? (
                                <div className="flex items-center gap-2 max-w-xs">
                                  <input
                                    type="text"
                                    value={editInputVal}
                                    onChange={e => setEditInputVal(e.target.value)}
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleSaveRename();
                                      if (e.key === 'Escape') setEditingClassName(null);
                                    }}
                                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden"
                                  />
                                  <button
                                    onClick={handleSaveRename}
                                    className="px-2 py-1 bg-emerald-600 text-white rounded-md text-[11px] font-bold"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingClassName(null)}
                                    className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-[11px]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-900 dark:text-slate-100 font-bold">
                                    {className}
                                  </span>
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
                                {enrolled} {enrolled === 1 ? 'student' : 'students'}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                Active Curriculum
                              </span>
                            </td>

                            {isAdmin && (
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleStartRename(className)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
                                    title={`Rename ${className}`}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClass(className)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                    title={`Remove ${className}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'sections' && (
            <div className="space-y-6">
              {isAdmin && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    Add Standard Section Identifier
                  </h4>
                  <form onSubmit={handleAddSection} className="flex gap-2 max-w-md">
                    <input
                      type="text"
                      placeholder="e.g. D, E, Blue, Gold..."
                      value={newSectionName}
                      onChange={e => setNewSectionName(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-95"
                    >
                      Add Section
                    </button>
                  </form>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentSections.map(sec => (
                  <div
                    key={sec}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-200 dark:border-indigo-800">
                        {sec}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Section {sec}
                        </span>
                        <p className="text-[10px] text-slate-400">Available across all classes</p>
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => handleRemoveSection(sec)}
                        disabled={currentSections.length <= 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remove section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Changes apply instantly to Student Enrollment, Fees, Attendance, and Exam Result sheets.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition active:scale-95 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
