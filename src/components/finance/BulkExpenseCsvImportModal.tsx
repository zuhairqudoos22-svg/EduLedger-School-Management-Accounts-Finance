import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  RotateCcw,
  Trash2,
  Edit2,
  Tag as TagIcon,
  FolderTree,
  DollarSign,
  Layers,
  HelpCircle,
  FileText,
  Sliders,
  ShieldAlert,
  ArrowDownRight,
  ListFilter,
  CheckCircle,
} from 'lucide-react';
import {
  Expense,
  ExpenseCategory,
  PaymentMode,
  SchoolSettings,
  ExpenseTaxonomyConfig,
  CategoryBudgetThreshold,
} from '../../types';
import { formatCurrency, getTodayDateString } from '../../utils/formatters';
import {
  parseExpenseCsv,
  ParsedExpenseRow,
  ExpenseCsvParseResult,
  generateExpenseSampleCsv,
} from '../../utils/expenseCsvParser';
import {
  analyzeCsvCategories,
  UniqueCategoryMapping,
} from '../../utils/expenseCategoryAutoMapper';
import {
  getStoredTaxonomy,
  getCategoryColor,
  getTagColor,
} from '../../utils/expenseTaxonomyStorage';
import { checkExpenseThresholdBreach } from '../../utils/budgetThresholdStorage';

interface BulkExpenseCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (createdCount: number, totalAmount: number) => void;
  recordExpenseFn: (expense: Omit<Expense, 'id'>) => Promise<Expense>;
  existingExpenses: Expense[];
  settings: SchoolSettings;
  taxonomy?: ExpenseTaxonomyConfig;
  thresholds?: CategoryBudgetThreshold[];
  currentUserName?: string;
}

export const BulkExpenseCsvImportModal: React.FC<BulkExpenseCsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  recordExpenseFn,
  existingExpenses,
  settings,
  taxonomy,
  thresholds = [],
  currentUserName = 'Finance Operator',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTaxonomy = useMemo(() => taxonomy || getStoredTaxonomy(), [taxonomy]);

  // Workflow Steps: 'upload' | 'preview' | 'importing' | 'complete'
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [pastedCsvText, setPastedCsvText] = useState('');
  const [fileName, setFileName] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Parsed rows state
  const [parsedRows, setParsedRows] = useState<ParsedExpenseRow[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<Record<string, string>>({});
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'errors' | 'unmapped' | 'selected'>('all');
  const [isMappingPanelOpen, setIsMappingPanelOpen] = useState(true);

  // Category reconciliation state (maps raw CSV category to target system category)
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});

  // Quick batch resolve unmapped target
  const [bulkUnmappedTargetCategory, setBulkUnmappedTargetCategory] = useState<string>('');

  // Final pre-submission verification dialog state
  const [showPreSubmissionModal, setShowPreSubmissionModal] = useState(false);

  // Import Progress state
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState<{ count: number; totalAmount: number } | null>(null);

  if (!isOpen) return null;

  // Available categories in system
  const systemCategories = activeTaxonomy.categories.map(c => c.name);

  // Helper: check if a row has an unmapped / inferred / fallback category
  const isRowUnmapped = (row: ParsedExpenseRow): boolean => {
    const rawKey = row.rawCategory.trim();
    if (categoryOverrides[rawKey || '(Empty / Inferred from Title)']) return false;
    if (!rawKey) return true; // Missing category in CSV
    if (row.mappingRule?.matchType === 'fallback' || row.mappingRule?.confidence === 'low') return true;
    const directMatch = systemCategories.some(c => c.toLowerCase() === rawKey.toLowerCase());
    return !directMatch && row.mappingRule?.matchType !== 'synonym';
  };

  // Helper: check if a row has format/value errors
  const isRowError = (row: ParsedExpenseRow): boolean => {
    return !row.isValid || row.errors.length > 0;
  };

  // Specific error checkers for field highlighting
  const hasTitleError = (row: ParsedExpenseRow): boolean => !row.title.trim();
  const hasAmountError = (row: ParsedExpenseRow): boolean => row.amount <= 0 || isNaN(row.amount);
  const hasDateError = (row: ParsedExpenseRow): boolean => !/^\d{4}-\d{2}-\d{2}$/.test(row.date);

  // Analyze unique categories detected in CSV
  const uniqueCategoryMappings: UniqueCategoryMapping[] = useMemo(() => {
    return analyzeCsvCategories(
      parsedRows.map(r => ({
        rawCategory: r.rawCategory,
        title: r.title,
        notes: r.notes,
      })),
      activeTaxonomy
    );
  }, [parsedRows, activeTaxonomy]);

  // Counts
  const totalCount = parsedRows.length;
  const errorCount = parsedRows.filter(isRowError).length;
  const unmappedCount = parsedRows.filter(isRowUnmapped).length;
  const validCount = parsedRows.filter(r => r.isValid).length;
  const selectedRows = parsedRows.filter(r => r.selected && r.isValid);
  const totalSelectedAmount = selectedRows.reduce((sum, r) => sum + r.amount, 0);

  // Handle CSV Processing
  const handleProcessCsv = (csvString: string, originName: string) => {
    if (!csvString.trim()) return;

    const result: ExpenseCsvParseResult = parseExpenseCsv(csvString, activeTaxonomy);
    setParsedRows(result.rows);
    setDetectedColumns(result.detectedColumns);
    setFileName(originName);
    setCategoryOverrides({});
    setStep('preview');
    setShowPreSubmissionModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      handleProcessCsv(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type.includes('csv') || file.type.includes('text'))) {
      const reader = new FileReader();
      reader.onload = event => {
        const content = event.target?.result as string;
        handleProcessCsv(content, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleDownloadSample = () => {
    const sample = generateExpenseSampleCsv();
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'EduLedger_Sample_Expenses_Import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Bulk Remap a detected category across all rows
  const handleGlobalCategoryRemap = (rawCategoryKey: string, newTargetCategory: string) => {
    setCategoryOverrides(prev => ({
      ...prev,
      [rawCategoryKey]: newTargetCategory,
    }));

    setParsedRows(prev =>
      prev.map(row => {
        const rowKey = row.rawCategory.trim() || `(Empty / Inferred from Title)`;
        if (rowKey === rawCategoryKey) {
          return {
            ...row,
            category: newTargetCategory,
          };
        }
        return row;
      })
    );
  };

  // Bulk assign all unmapped rows to a specific category
  const handleBulkAssignUnmapped = () => {
    if (!bulkUnmappedTargetCategory) return;

    setParsedRows(prev =>
      prev.map(row => {
        if (isRowUnmapped(row)) {
          return {
            ...row,
            category: bulkUnmappedTargetCategory,
          };
        }
        return row;
      })
    );

    // Also record in overrides
    uniqueCategoryMappings.forEach(u => {
      if (u.confidence !== 'high') {
        setCategoryOverrides(prev => ({ ...prev, [u.rawCsvCategory]: bulkUnmappedTargetCategory }));
      }
    });

    setBulkUnmappedTargetCategory('');
  };

  // Row update handlers with instant re-validation
  const handleRowFieldChange = (
    tempId: string,
    field: keyof ParsedExpenseRow,
    value: any
  ) => {
    setParsedRows(prev =>
      prev.map(row => {
        if (row.tempId !== tempId) return row;

        const updated = { ...row, [field]: value };

        // Re-validate row on change
        const errors: string[] = [];
        if (!updated.title.trim()) errors.push('Missing expense title / payee.');
        if (updated.amount <= 0 || isNaN(updated.amount)) errors.push('Amount must be greater than 0.');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(updated.date)) errors.push('Invalid date format (must be YYYY-MM-DD).');

        const nowValid = errors.length === 0;
        updated.isValid = nowValid;
        updated.errors = errors;
        // Automatically select if row just became valid
        if (nowValid && !row.isValid) {
          updated.selected = true;
        }
        return updated;
      })
    );
  };

  // Delete row
  const handleDeleteRow = (tempId: string) => {
    setParsedRows(prev => prev.filter(r => r.tempId !== tempId));
  };

  // Toggle selection
  const handleToggleSelectRow = (tempId: string) => {
    setParsedRows(prev =>
      prev.map(r => (r.tempId === tempId ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setParsedRows(prev =>
      prev.map(r => (r.isValid ? { ...r, selected: select } : { ...r, selected: false }))
    );
  };

  // Filtered rows for data table
  const displayedRows = useMemo(() => {
    switch (filterMode) {
      case 'valid':
        return parsedRows.filter(r => r.isValid);
      case 'errors':
        return parsedRows.filter(isRowError);
      case 'unmapped':
        return parsedRows.filter(isRowUnmapped);
      case 'selected':
        return parsedRows.filter(r => r.selected);
      default:
        return parsedRows;
    }
  }, [parsedRows, filterMode]);

  // Group selected rows by category for pre-submission breakdown
  const selectedCategoryBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const r of selectedRows) {
      if (!map[r.category]) {
        map[r.category] = { count: 0, total: 0 };
      }
      map[r.category].count += 1;
      map[r.category].total += r.amount;
    }
    return Object.entries(map).map(([name, data]) => ({
      category: name,
      count: data.count,
      total: data.total,
      percentage: totalSelectedAmount > 0 ? (data.total / totalSelectedAmount) * 100 : 0,
      color: getCategoryColor(name, activeTaxonomy),
    })).sort((a, b) => b.total - a.total);
  }, [selectedRows, totalSelectedAmount, activeTaxonomy]);

  // Check if any selected row causes a threshold breach
  const thresholdWarnings = useMemo(() => {
    if (!thresholds.length || !selectedRows.length) return [];

    const categoryTotals: Record<string, { amount: number; sampleDate: string }> = {};
    for (const r of selectedRows) {
      if (!categoryTotals[r.category]) {
        categoryTotals[r.category] = { amount: 0, sampleDate: r.date };
      }
      categoryTotals[r.category].amount += r.amount;
    }

    const warnings: {
      category: string;
      additionalAmount: number;
      projectedSpend: number;
      limit: number;
      overrunAmount: number;
      projectedPercentage: number;
    }[] = [];

    for (const [cat, data] of Object.entries(categoryTotals)) {
      const check = checkExpenseThresholdBreach(
        data.amount,
        cat,
        data.sampleDate,
        existingExpenses,
        thresholds
      );
      if (check.willExceed) {
        warnings.push({
          category: cat,
          additionalAmount: data.amount,
          projectedSpend: check.projectedSpend,
          limit: check.limit,
          overrunAmount: check.overrunAmount,
          projectedPercentage: check.projectedPercentage,
        });
      }
    }

    return warnings;
  }, [selectedRows, existingExpenses, thresholds]);

  // Execute bulk import
  const handleExecuteImport = async () => {
    if (selectedRows.length === 0) return;

    setShowPreSubmissionModal(false);
    setStep('importing');
    setImportProgress({ current: 0, total: selectedRows.length });

    let createdCount = 0;
    let accumulatedTotal = 0;

    for (let i = 0; i < selectedRows.length; i++) {
      const row = selectedRows[i];
      try {
        await recordExpenseFn({
          title: row.title,
          category: row.category,
          subCategory: row.subCategory || undefined,
          tags: row.tags.length > 0 ? row.tags : undefined,
          amount: row.amount,
          date: row.date,
          paymentMode: row.paymentMode,
          referenceNumber: row.referenceNumber || undefined,
          notes: row.notes || undefined,
          recordedBy: currentUserName,
          source: 'manual',
        });
        createdCount++;
        accumulatedTotal += row.amount;
      } catch (err) {
        console.error('Failed to import row index', i, err);
      }

      setImportProgress({ current: i + 1, total: selectedRows.length });
    }

    setImportResults({ count: createdCount, totalAmount: accumulatedTotal });
    setStep('complete');
    onImportSuccess(createdCount, accumulatedTotal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/70">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Bulk Import Operational Expenses via CSV
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                  Auto-Mapping & Error Audit
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Upload expense spreadsheets or accounting exports with automated smart categorization and sub-category detection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSample}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title="Download standardized sample CSV template"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sample Template</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* STEP 1: Upload / Drop Zone */}
          {step === 'upload' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Mode switch */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInputMode('file')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      inputMode === 'file'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Upload CSV File
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('paste')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      inputMode === 'paste'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Paste Raw CSV Text
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="sm:hidden flex items-center gap-1 text-xs text-emerald-600 font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Sample CSV</span>
                </button>
              </div>

              {inputMode === 'file' ? (
                <div>
                  <div
                    onDragOver={e => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                      isDragOver
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                      <FileSpreadsheet className="w-8 h-8" />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">
                        Click to browse or drag and drop your expense CSV file here
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        Supports exports from QuickBooks, Xero, Tally, bank statements, or Excel spreadsheets (.csv)
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                        Auto-detects Date, Payee, Amount & Categories with Error Highlighting
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Paste CSV Data (including header row)
                  </label>
                  <textarea
                    rows={8}
                    placeholder={`Date,Payee,Category,Amount,Payment Method,Notes\n2026-03-01,Electricity Bill,Utilities,1250,Bank Transfer,Campus Power\n2026-03-05,Biology Lab Microscope,Lab Supplies,450,Online,High school lab`}
                    value={pastedCsvText}
                    onChange={e => setPastedCsvText(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white focus:outline-hidden"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!pastedCsvText.trim()}
                      onClick={() => handleProcessCsv(pastedCsvText, 'pasted-expenses.csv')}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                      Parse & Map Categories
                    </button>
                  </div>
                </div>
              )}

              {/* Supported Columns & Feature Highlights */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>Intelligent CSV Ingestion & Auto-Mapping Highlights:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                  <p>• <strong>Automatic Category Mapping:</strong> Identifies aliases like "payroll" → Staff Salaries, "wifi" → Utilities.</p>
                  <p>• <strong>Keyword Payee Inference:</strong> If category is missing, analyzes title (e.g. "bus diesel" → Transport & Fuel).</p>
                  <p>• <strong>Error & Unmapped Callouts:</strong> Highlights non-numeric amounts, missing payees, and unmapped categories in real-time.</p>
                  <p>• <strong>Pre-Submission Verification:</strong> Review the final breakdown before committing expenses to the ledger.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Reconciliation with Rich Highlighting */}
          {step === 'preview' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Summary Stats Strip with Error & Unmapped badges */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    File Parsed
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                    {fileName || 'Uploaded CSV'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {totalCount} total entries
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Ready to Commit
                  </span>
                  <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300 block mt-0.5">
                    {selectedRows.length} / {validCount} valid
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Checked for import
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    Total Import Sum
                  </span>
                  <span className="text-sm sm:text-base font-black font-mono text-indigo-700 dark:text-indigo-300 block mt-0.5">
                    {formatCurrency(totalSelectedAmount, settings.currencySymbol)}
                  </span>
                  <span className="text-[10px] text-indigo-500 font-medium">
                    Selected vouchers
                  </span>
                </div>

                {/* Unmapped Categories Counter */}
                <div
                  onClick={() => setFilterMode('unmapped')}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    unmappedCount > 0
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 ring-1 ring-amber-500/30'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Click to filter by unmapped categories"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                    Unmapped / Inferred
                  </span>
                  <span className={`text-sm sm:text-base font-black block mt-0.5 ${unmappedCount > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    {unmappedCount} {unmappedCount === 1 ? 'category' : 'categories'}
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    {unmappedCount > 0 ? '⚠️ Needs review' : '✓ All classified'}
                  </span>
                </div>

                {/* Errors Counter */}
                <div
                  onClick={() => setFilterMode('errors')}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    errorCount > 0
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 ring-1 ring-rose-500/30'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Click to filter by error rows"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                    Detected Errors
                  </span>
                  <span className={`text-sm sm:text-base font-black block mt-0.5 ${errorCount > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    {errorCount} {errorCount === 1 ? 'row' : 'rows'}
                  </span>
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                    {errorCount > 0 ? '❌ Action required' : '✓ Zero errors'}
                  </span>
                </div>
              </div>

              {/* Pre-Submission Audit Alert Banner */}
              {(errorCount > 0 || unmappedCount > 0) && (
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Pre-Submission Data Quality Checklist:</span>
                    </div>

                    {/* Quick batch assign unmapped dropdown */}
                    {unmappedCount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 font-semibold">
                          Map all {unmappedCount} unmapped rows to:
                        </span>
                        <select
                          value={bulkUnmappedTargetCategory}
                          onChange={e => setBulkUnmappedTargetCategory(e.target.value)}
                          className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold cursor-pointer"
                        >
                          <option value="">-- Choose Category --</option>
                          {systemCategories.map(cat => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!bulkUnmappedTargetCategory}
                          onClick={handleBulkAssignUnmapped}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40 cursor-pointer shadow-2xs"
                        >
                          Apply to All
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-[11px] text-amber-800 dark:text-amber-300 pl-6">
                    {errorCount > 0 && (
                      <p>
                        • <strong>{errorCount} rows have formatting or missing value errors</strong> (highlighted with red borders below). You can edit them inline to fix them, or they will be skipped upon import.
                      </p>
                    )}
                    {unmappedCount > 0 && (
                      <p>
                        • <strong>{unmappedCount} rows have unmapped or auto-inferred categories</strong> (highlighted with amber borders below). Use the category dropdowns or global mapper to reconcile them.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Threshold Warnings Alert Banner */}
              {thresholdWarnings.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-2 text-xs animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold">
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>⚠️ Budget Threshold Impact Alert For Selected Items</span>
                  </div>
                  <div className="space-y-1 text-[11px] pl-6">
                    {thresholdWarnings.map(w => (
                      <p key={w.category}>
                        Importing {formatCurrency(w.additionalAmount, settings.currencySymbol)} to{' '}
                        <strong>{w.category}</strong> will exceed the monthly budget limit of{' '}
                        {formatCurrency(w.limit, settings.currencySymbol)} by{' '}
                        <strong className="underline text-rose-700 dark:text-rose-300">
                          {formatCurrency(w.overrunAmount, settings.currencySymbol)}
                        </strong>{' '}
                        ({w.projectedPercentage}% utilized).
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Reconciliation / Auto-Mapping Summary Accordion */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <div
                  onClick={() => setIsMappingPanelOpen(!isMappingPanelOpen)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Global Category Reconciliation Engine ({uniqueCategoryMappings.length} Unique CSV Categories)
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    {isMappingPanelOpen ? 'Collapse Mapping' : 'Review & Remap All'}
                  </span>
                </div>

                {isMappingPanelOpen && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs">
                    <p className="text-[11px] text-slate-500">
                      The engine analyzed each raw CSV category and payee text. Remap any category below to immediately update all matching rows:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                      {uniqueCategoryMappings.map(item => {
                        const currentTarget = categoryOverrides[item.rawCsvCategory] || item.targetCategory;
                        const isHighConfidence = item.confidence === 'high';

                        return (
                          <div
                            key={item.rawCsvCategory}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${
                              isHighConfidence
                                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                  "{item.rawCsvCategory}"
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  {item.count} {item.count === 1 ? 'row' : 'rows'}
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                                    isHighConfidence
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 flex items-center gap-1'
                                  }`}
                                >
                                  {!isHighConfidence && <AlertTriangle className="w-2.5 h-2.5" />}
                                  {isHighConfidence ? 'Exact/Synonym Match' : 'Unmapped / Inferred'}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1">
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                              <select
                                value={currentTarget}
                                onChange={e =>
                                  handleGlobalCategoryRemap(item.rawCsvCategory, e.target.value)
                                }
                                className={`px-2 py-1 text-xs rounded-lg border font-semibold focus:outline-hidden cursor-pointer ${
                                  isHighConfidence
                                    ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300'
                                    : 'bg-amber-100/60 dark:bg-amber-900/40 border-amber-400 text-amber-900 dark:text-amber-200'
                                }`}
                              >
                                {systemCategories.map(cat => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Filter Tabs & Selection Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      filterMode === 'all'
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    All ({parsedRows.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterMode('valid')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      filterMode === 'valid'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    Valid Ready ({validCount})
                  </button>

                  {/* Dedicated Unmapped Categories Filter */}
                  {unmappedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterMode('unmapped')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        filterMode === 'unmapped'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Unmapped ({unmappedCount})</span>
                    </button>
                  )}

                  {/* Dedicated Error Rows Filter */}
                  {errorCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterMode('errors')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        filterMode === 'errors'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Errors ({errorCount})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setFilterMode('selected')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      filterMode === 'selected'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                    }`}
                  >
                    Selected ({selectedRows.length})
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                  >
                    Select All Valid
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Interactive Data Table Preview with Explicit Error & Unmapped Highlighting */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                <div className="max-h-[380px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              selectedRows.length === validCount && validCount > 0
                            }
                            onChange={e => handleSelectAll(e.target.checked)}
                            className="rounded-md cursor-pointer"
                          />
                        </th>
                        <th className="py-2.5 px-3 w-24">Status</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Date</th>
                        <th className="py-2.5 px-3 min-w-[210px]">Expense Title / Payee</th>
                        <th className="py-2.5 px-3 min-w-[210px]">Category & Auto-Mapping</th>
                        <th className="py-2.5 px-3 min-w-[140px]">Sub-Category</th>
                        <th className="py-2.5 px-3 min-w-[110px] text-right">Amount</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Payment Mode</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Reference #</th>
                        <th className="py-2.5 px-3 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-slate-400">
                            No records match the active filter criteria.
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map(row => {
                          const isError = isRowError(row);
                          const isUnmapped = isRowUnmapped(row);
                          const titleErr = hasTitleError(row);
                          const amtErr = hasAmountError(row);
                          const dateErr = hasDateError(row);

                          return (
                            <tr
                              key={row.tempId}
                              className={`transition ${
                                isError
                                  ? 'bg-rose-50/70 dark:bg-rose-950/30 ring-1 ring-rose-500/30'
                                  : isUnmapped
                                  ? 'bg-amber-50/50 dark:bg-amber-950/20'
                                  : row.selected
                                  ? 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                                  : 'opacity-60 bg-slate-50/20'
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={row.selected}
                                  disabled={!row.isValid}
                                  onChange={() => handleToggleSelectRow(row.tempId)}
                                  className="rounded-md cursor-pointer disabled:opacity-40"
                                />
                              </td>

                              {/* Status Pill Badge */}
                              <td className="py-2 px-3">
                                {isError ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
                                    <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                    <span>Error</span>
                                  </span>
                                ) : isUnmapped ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>Unmapped</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>Ready</span>
                                  </span>
                                )}
                              </td>

                              {/* Date (Highlighted on format error) */}
                              <td className="py-2 px-3">
                                <div className="space-y-0.5">
                                  <input
                                    type="date"
                                    value={row.date}
                                    onChange={e =>
                                      handleRowFieldChange(row.tempId, 'date', e.target.value)
                                    }
                                    className={`w-full px-2 py-1 text-xs rounded-lg text-slate-900 dark:text-white transition ${
                                      dateErr
                                        ? 'border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/60 font-bold'
                                        : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                                    }`}
                                  />
                                  {dateErr && (
                                    <span className="text-[9px] font-bold text-rose-600 block">
                                      Invalid Date
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Title / Payee (Highlighted on missing value) */}
                              <td className="py-2 px-3">
                                <div className="space-y-0.5">
                                  <input
                                    type="text"
                                    value={row.title}
                                    placeholder="Missing Title - Click to type..."
                                    onChange={e =>
                                      handleRowFieldChange(row.tempId, 'title', e.target.value)
                                    }
                                    className={`w-full px-2 py-1 text-xs rounded-lg text-slate-900 dark:text-white font-medium transition ${
                                      titleErr
                                        ? 'border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/60 placeholder:text-rose-500 font-bold'
                                        : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                                    }`}
                                  />
                                  {titleErr && (
                                    <span className="text-[9px] font-bold text-rose-600 block">
                                      ⚠️ Title / Payee is required
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Category Dropdown (Highlighted on Unmapped / Inferred) */}
                              <td className="py-2 px-3">
                                <div className="space-y-1">
                                  <select
                                    value={row.category}
                                    onChange={e =>
                                      handleRowFieldChange(row.tempId, 'category', e.target.value)
                                    }
                                    className={`w-full px-2 py-1 text-xs rounded-lg font-semibold cursor-pointer transition ${
                                      isUnmapped
                                        ? 'border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200'
                                        : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                                    }`}
                                  >
                                    {systemCategories.map(cat => (
                                      <option key={cat} value={cat}>
                                        {cat}
                                      </option>
                                    ))}
                                  </select>

                                  {/* Unmapped or auto-mapped callout banner */}
                                  {isUnmapped ? (
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-300">
                                      <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                      <span className="truncate">
                                        CSV: "{row.rawCategory || 'Blank'}" (verify)
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                                      <Check className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate">
                                        Mapped from "{row.rawCategory || row.mappingRule?.matchedTerm}"
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Sub-Category */}
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.subCategory}
                                  placeholder="Sub-category (optional)"
                                  onChange={e =>
                                    handleRowFieldChange(row.tempId, 'subCategory', e.target.value)
                                  }
                                  className="w-full px-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                              </td>

                              {/* Amount (Highlighted on <= 0 or NaN error) */}
                              <td className="py-2 px-3 text-right">
                                <div className="space-y-0.5">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1 text-slate-400 font-mono text-xs">
                                      {settings.currencySymbol}
                                    </span>
                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={row.amount}
                                      onChange={e =>
                                        handleRowFieldChange(
                                          row.tempId,
                                          'amount',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className={`w-full pl-6 pr-2 py-1 text-xs text-right rounded-lg font-mono font-bold transition ${
                                        amtErr
                                          ? 'border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-700'
                                          : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400'
                                      }`}
                                    />
                                  </div>
                                  {amtErr && (
                                    <span className="text-[9px] font-bold text-rose-600 block text-right">
                                      Must be &gt; 0
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Payment Mode */}
                              <td className="py-2 px-3">
                                <select
                                  value={row.paymentMode}
                                  onChange={e =>
                                    handleRowFieldChange(
                                      row.tempId,
                                      'paymentMode',
                                      e.target.value as PaymentMode
                                    )
                                  }
                                  className="w-full px-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
                                >
                                  <option value="Bank Transfer">Bank Transfer</option>
                                  <option value="Cash">Cash Voucher</option>
                                  <option value="Cheque">Cheque</option>
                                  <option value="Online/UPI">Online / UPI</option>
                                </select>
                              </td>

                              {/* Reference # */}
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.referenceNumber}
                                  placeholder="Ref / Invoice #"
                                  onChange={e =>
                                    handleRowFieldChange(
                                      row.tempId,
                                      'referenceNumber',
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                                />
                              </td>

                              {/* Action */}
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(row.tempId)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                  title="Remove row from import queue"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
            </div>
          )}

          {/* STEP 3: Importing In Progress */}
          {step === 'importing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-bounce shadow-md">
                <Upload className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Importing Operational Expenses into System Ledger...
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Processing and generating institutional expense records ({importProgress.current} of {importProgress.total})
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${
                      importProgress.total > 0
                        ? (importProgress.current / importProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* STEP 4: Import Complete */}
          {step === 'complete' && importResults && (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                <Check className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Bulk Expense Import Completed Successfully!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                  Successfully imported <strong>{importResults.count} operational expense vouchers</strong> totaling{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatCurrency(importResults.totalAmount, settings.currencySymbol)}
                  </strong>{' '}
                  into the school ledger with automatic category allocations.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm cursor-pointer"
                >
                  Return to Expenses Ledger
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <div>
            {step === 'preview' && (
              <button
                type="button"
                onClick={() => {
                  setStep('upload');
                  setParsedRows([]);
                }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Upload Different File</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>

            {step === 'preview' && (
              <button
                type="button"
                disabled={selectedRows.length === 0}
                onClick={() => setShowPreSubmissionModal(true)}
                className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm disabled:opacity-40 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  Review & Submit {selectedRows.length} {selectedRows.length === 1 ? 'Expense' : 'Expenses'} (
                  {formatCurrency(totalSelectedAmount, settings.currencySymbol)})
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FINAL PRE-SUBMISSION VERIFICATION MODAL */}
      {showPreSubmissionModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Verification Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Final Pre-Submission Verification
                  </h3>
                  <p className="text-xs text-slate-500">
                    Confirm expenditure posting parameters before writing to the general ledger.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreSubmissionModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Verification Content */}
            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              {/* Key Metric Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    Vouchers to Create
                  </span>
                  <span className="text-xl font-black text-indigo-950 dark:text-indigo-200 block mt-0.5">
                    {selectedRows.length} records
                  </span>
                  <span className="text-[10px] text-indigo-500">
                    From "{fileName || 'CSV File'}"
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Total Monetary Sum
                  </span>
                  <span className="text-xl font-black font-mono text-emerald-950 dark:text-emerald-200 block mt-0.5">
                    {formatCurrency(totalSelectedAmount, settings.currencySymbol)}
                  </span>
                  <span className="text-[10px] text-emerald-600">
                    Calculated for ledger
                  </span>
                </div>
              </div>

              {/* Warnings check in confirmation */}
              {errorCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Note: <strong>{errorCount} unselected rows with errors</strong> will NOT be imported.
                  </span>
                </div>
              )}

              {/* Category Breakdown Table */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">
                  Expenditure Breakdown by Chart of Accounts Category:
                </span>
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedCategoryBreakdown.map(item => (
                    <div
                      key={item.category}
                      className="p-3 flex items-center justify-between gap-3 text-xs bg-white dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {item.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({item.count} {item.count === 1 ? 'voucher' : 'vouchers'})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-mono shrink-0">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.total, settings.currencySymbol)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Budget limit impact note */}
              {thresholdWarnings.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs">
                  <p className="font-bold flex items-center gap-1.5 mb-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    <span>Budget Limit Alert Reminder:</span>
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    This import contains categories that will exceed your defined monthly thresholds. Finance operators will receive live threshold alerts in the dashboard.
                  </p>
                </div>
              )}
            </div>

            {/* Verification Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowPreSubmissionModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Back to Grid Editing
              </button>

              <button
                type="button"
                onClick={handleExecuteImport}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-md active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Post {selectedRows.length} Expenses</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
