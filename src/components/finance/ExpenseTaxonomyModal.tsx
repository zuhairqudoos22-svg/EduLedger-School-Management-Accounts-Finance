import React, { useState } from 'react';
import {
  X,
  Tags,
  FolderTree,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Tag as TagIcon,
} from 'lucide-react';
import {
  ExpenseTaxonomyConfig,
} from '../../types';
import {
  PRESET_COLOR_SWATCHES,
  addCategory,
  deleteCategory,
  addSubCategory,
  removeSubCategory,
  addTag,
  deleteTag,
  resetTaxonomyToDefaults,
} from '../../utils/expenseTaxonomyStorage';

interface ExpenseTaxonomyModalProps {
  isOpen: boolean;
  onClose: () => void;
  taxonomy: ExpenseTaxonomyConfig;
  onTaxonomyChange: (newConfig: ExpenseTaxonomyConfig) => void;
  initialTab?: 'categories' | 'tags';
}

export const ExpenseTaxonomyModal: React.FC<ExpenseTaxonomyModalProps> = ({
  isOpen,
  onClose,
  taxonomy,
  onTaxonomyChange,
  initialTab = 'categories',
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'tags'>(initialTab);

  // New Category Form State
  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLOR_SWATCHES[0]);
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatSubcategories, setNewCatSubcategories] = useState<string[]>([]);
  const [tempSubcatInput, setTempSubcatInput] = useState('');

  // Inline Subcategory additions per category
  const [inlineSubcatInputs, setInlineSubcatInputs] = useState<Record<string, string>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // New Tag Form State
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLOR_SWATCHES[4]);
  const [newTagDesc, setNewTagDesc] = useState('');

  // Reset confirmation state
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleAddTempSubcategory = () => {
    const val = tempSubcatInput.trim();
    if (!val) return;
    if (newCatSubcategories.some(s => s.toLowerCase() === val.toLowerCase())) return;
    setNewCatSubcategories([...newCatSubcategories, val]);
    setTempSubcatInput('');
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const { config } = addCategory({
      name: newCatName.trim(),
      color: newCatColor,
      description: newCatDesc.trim() || undefined,
      subCategories: newCatSubcategories,
    });

    onTaxonomyChange(config);
    setNewCatName('');
    setNewCatDesc('');
    setNewCatSubcategories([]);
    setShowNewCatForm(false);
    showStatus(`Created custom category "${newCatName.trim()}" with ${newCatSubcategories.length} sub-categories.`);
  };

  const handleAddInlineSubcategory = (categoryId: string) => {
    const val = (inlineSubcatInputs[categoryId] || '').trim();
    if (!val) return;

    const updated = addSubCategory(categoryId, val);
    onTaxonomyChange(updated);
    setInlineSubcatInputs(prev => ({ ...prev, [categoryId]: '' }));
    showStatus(`Added sub-category "${val}".`);
  };

  const handleRemoveSubcategory = (categoryId: string, subCategoryName: string) => {
    const updated = removeSubCategory(categoryId, subCategoryName);
    onTaxonomyChange(updated);
    showStatus(`Removed sub-category "${subCategoryName}".`);
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    if (confirm(`Are you sure you want to delete category "${categoryName}"? Existing expense records will retain their name.`)) {
      const updated = deleteCategory(categoryId);
      onTaxonomyChange(updated);
      showStatus(`Deleted category "${categoryName}".`);
    }
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    const cleanName = newTagName.trim().replace(/^#+/, '');
    const { config } = addTag({
      name: cleanName,
      color: newTagColor,
      description: newTagDesc.trim() || undefined,
    });

    onTaxonomyChange(config);
    setNewTagName('');
    setNewTagDesc('');
    setShowNewTagForm(false);
    showStatus(`Created tag "#${cleanName}".`);
  };

  const handleDeleteTag = (tagId: string, tagName: string) => {
    if (confirm(`Remove custom tag "#${tagName}"?`)) {
      const updated = deleteTag(tagId);
      onTaxonomyChange(updated);
      showStatus(`Deleted tag "#${tagName}".`);
    }
  };

  const handleResetDefaults = () => {
    const defaults = resetTaxonomyToDefaults();
    onTaxonomyChange(defaults);
    setIsResetConfirming(false);
    showStatus('Reset all categories and tags to institutional defaults.');
  };

  const totalSubcategories = taxonomy.categories.reduce(
    (sum, c) => sum + (c.subCategories?.length || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/70">
              <FolderTree className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Expense Categories & Custom Tags
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  Granular Taxonomy
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Define custom categories, sub-categories, and tags for precision Recharts breakdowns and budget reports.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status banner */}
        {statusMessage && (
          <div className="px-6 py-2 bg-emerald-500 text-white text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{statusMessage}</span>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'categories'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span>Categories & Sub-Categories</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                {taxonomy.categories.length} ({totalSubcategories} sub)
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tags')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'tags'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Tags className="w-4 h-4" />
              <span>Custom Expense Tags</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                {taxonomy.tags.length}
              </span>
            </button>
          </div>

          <div className="pb-2">
            {!isResetConfirming ? (
              <button
                type="button"
                onClick={() => setIsResetConfirming(true)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer"
                title="Reset categories and tags to standard defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Defaults</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in">
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  Restore standard defaults?
                </span>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 cursor-pointer"
                >
                  Yes, Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsResetConfirming(false)}
                  className="px-2 py-1 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-[11px] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'categories' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Operational Expense Categories & Sub-Categories
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sub-categories appear as nested drill-down slices in the Recharts expense distribution chart and budget allocations.
                  </p>
                </div>

                {!showNewCatForm && (
                  <button
                    type="button"
                    onClick={() => setShowNewCatForm(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Custom Category</span>
                  </button>
                )}
              </div>

              {/* Create Category Form */}
              {showNewCatForm && (
                <form
                  onSubmit={handleCreateCategory}
                  className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/80 space-y-4 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/50 pb-2">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>New Operational Category Setup</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNewCatForm(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Science Fair & Olympiads"
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Chart Accent Color
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {PRESET_COLOR_SWATCHES.slice(0, 8).map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewCatColor(c)}
                              className={`w-6 h-6 rounded-full transition cursor-pointer flex items-center justify-center ${
                                newCatColor === c ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                              }`}
                              style={{ backgroundColor: c }}
                            >
                              {newCatColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                          ))}
                        </div>
                        <input
                          type="color"
                          value={newCatColor}
                          onChange={e => setNewCatColor(e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                          title="Custom Color"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Annual science competitions, judge travel, and participant materials"
                      value={newCatDesc}
                      onChange={e => setNewCatDesc(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Sub-Categories (Optional)
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add sub-category (e.g. Lab Chemicals) and press Enter"
                        value={tempSubcatInput}
                        onChange={e => setTempSubcatInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTempSubcategory();
                          }
                        }}
                        className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddTempSubcategory}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 cursor-pointer"
                      >
                        + Add Sub
                      </button>
                    </div>

                    {newCatSubcategories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
                        {newCatSubcategories.map(sc => (
                          <span
                            key={sc}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200"
                          >
                            <span>{sc}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setNewCatSubcategories(newCatSubcategories.filter(s => s !== sc))
                              }
                              className="text-indigo-500 hover:text-indigo-700 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowNewCatForm(false)}
                      className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm cursor-pointer"
                    >
                      Save Category
                    </button>
                  </div>
                </form>
              )}

              {/* Categories Accordion List */}
              <div className="space-y-3">
                {taxonomy.categories.map(cat => {
                  const isExpanded = expandedCategories[cat.id] ?? true;
                  const inlineInput = inlineSubcatInputs[cat.id] || '';

                  return (
                    <div
                      key={cat.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition"
                    >
                      <div className="p-4 flex items-center justify-between gap-3 flex-wrap bg-slate-50/50 dark:bg-slate-800/30">
                        <div
                          onClick={() => toggleCategoryExpand(cat.id)}
                          className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                        >
                          <span
                            className="w-4 h-4 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: cat.color }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                {cat.name}
                              </h4>
                              {cat.isDefault && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                                  Standard
                                </span>
                              )}
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold font-mono">
                                {cat.subCategories.length} sub-categories
                              </span>
                            </div>
                            {cat.description && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {cat.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!cat.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition cursor-pointer"
                              title="Delete custom category"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleCategoryExpand(cat.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                              Configured Sub-Categories:
                            </span>

                            {cat.subCategories.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">
                                No sub-categories created yet. Add one below to enable fine-grained reporting.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {cat.subCategories.map(sc => (
                                  <span
                                    key={sc}
                                    className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition"
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{ backgroundColor: cat.color }}
                                    />
                                    <span>{sc}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSubcategory(cat.id, sc)}
                                      className="text-slate-400 hover:text-red-500 opacity-60 group-hover:opacity-100 transition cursor-pointer"
                                      title={`Remove sub-category "${sc}"`}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-1 max-w-md">
                            <input
                              type="text"
                              placeholder={`Add sub-category to ${cat.name}...`}
                              value={inlineInput}
                              onChange={e =>
                                setInlineSubcatInputs({
                                  ...inlineSubcatInputs,
                                  [cat.id]: e.target.value,
                                })
                              }
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddInlineSubcategory(cat.id);
                                }
                              }}
                              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddInlineSubcategory(cat.id)}
                              disabled={!inlineInput.trim()}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition disabled:opacity-40 cursor-pointer"
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Custom Expense Analytical Tags
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Apply tags across different categories (e.g. #Urgent, #Grant-Funded, #Tax-Deductible) to visualize multi-dimensional expenditures.
                  </p>
                </div>

                {!showNewTagForm && (
                  <button
                    type="button"
                    onClick={() => setShowNewTagForm(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Custom Tag</span>
                  </button>
                )}
              </div>

              {/* Create Tag Form */}
              {showNewTagForm && (
                <form
                  onSubmit={handleCreateTag}
                  className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/80 space-y-4 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/50 pb-2">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      <TagIcon className="w-4 h-4" />
                      <span>New Analytical Tag Setup</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNewTagForm(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tag Name / Identifier *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-bold">#</span>
                        <input
                          type="text"
                          required
                          placeholder="e.g. STEM-Grant-2026"
                          value={newTagName}
                          onChange={e => setNewTagName(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Badge Color
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {PRESET_COLOR_SWATCHES.slice(0, 8).map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewTagColor(c)}
                              className={`w-6 h-6 rounded-full transition cursor-pointer flex items-center justify-center ${
                                newTagColor === c ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                              }`}
                              style={{ backgroundColor: c }}
                            >
                              {newTagColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                          ))}
                        </div>
                        <input
                          type="color"
                          value={newTagColor}
                          onChange={e => setNewTagColor(e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                          title="Custom Color"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Description / Accounting Purpose
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Expenditures earmarked for the National STEM Development Grant"
                      value={newTagDesc}
                      onChange={e => setNewTagDesc(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowNewTagForm(false)}
                      className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm cursor-pointer"
                    >
                      Save Tag
                    </button>
                  </div>
                </form>
              )}

              {/* Tags Grid / Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {taxonomy.tags.map(t => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono text-white shadow-xs"
                          style={{ backgroundColor: t.color }}
                        >
                          <TagIcon className="w-3 h-3" />
                          <span>#{t.name}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteTag(t.id, t.name)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title={`Delete tag #${t.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {t.description ? (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                          {t.description}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic mt-2">
                          No description provided
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>ID: {t.id}</span>
                      <span className="uppercase font-bold" style={{ color: t.color }}>
                        {t.color}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-slate-400" />
            <span>Changes persist automatically across all financial charts, ledgers, and reports.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 transition shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
