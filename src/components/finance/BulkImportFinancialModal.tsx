import React, { useState, useRef } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, getTodayDateString } from '../../utils/formatters';
import { PaymentMode, DailyFinancialActivityInput } from '../../types';
import { BackButton } from '../common/BackButton';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Check,
  RefreshCw,
  Info,
} from 'lucide-react';

interface ParsedActivityRow {
  id: string;
  originalIndex: number;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  title: string;
  category: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber: string;
  studentName: string;
  notes: string;
  isValid: boolean;
  errors: string[];
  selected: boolean;
}

interface BulkImportFinancialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number, incomeCount: number, expenseCount: number) => void;
  defaultDate?: string;
}

// Robust CSV Line Splitter that handles quoted fields with commas and escaped quotes
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Escaped double quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ',') {
        fields.push(currentField.trim());
        currentField = '';
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  fields.push(currentField.trim());
  return fields;
}

// Normalize various date formats into YYYY-MM-DD
function normalizeDate(raw: string, fallbackDate: string): string {
  if (!raw) return fallbackDate;
  const clean = raw.trim();

  // Standard ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // MM/DD/YYYY (if day > 12 it's definitely not month, but let's parse with standard JS Date if valid)
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return fallbackDate;
}

// Normalize payment mode
function normalizePaymentMode(raw: string): PaymentMode {
  if (!raw) return 'Cash';
  const lower = raw.trim().toLowerCase();
  if (lower.includes('bank') || lower.includes('transfer') || lower.includes('wire') || lower.includes('neft')) {
    return 'Bank Transfer';
  }
  if (lower.includes('online') || lower.includes('upi') || lower.includes('card') || lower.includes('stripe') || lower.includes('qr')) {
    return 'Online/UPI';
  }
  if (lower.includes('cheque') || lower.includes('check')) {
    return 'Cheque';
  }
  return 'Cash';
}

// Normalize type: INCOME or EXPENSE
function normalizeType(raw: string, titleHint = ''): 'INCOME' | 'EXPENSE' {
  const lower = (raw || '').trim().toLowerCase();
  if (
    lower.startsWith('inc') ||
    lower === 'credit' ||
    lower === 'cr' ||
    lower === 'inflow' ||
    lower === 'revenue' ||
    lower === '+'
  ) {
    return 'INCOME';
  }
  if (
    lower.startsWith('exp') ||
    lower === 'debit' ||
    lower === 'dr' ||
    lower === 'outflow' ||
    lower === 'payment' ||
    lower === '-'
  ) {
    return 'EXPENSE';
  }

  // Infer from title hint
  const titleLower = titleHint.toLowerCase();
  if (
    titleLower.includes('salary') ||
    titleLower.includes('repair') ||
    titleLower.includes('utility') ||
    titleLower.includes('diesel') ||
    titleLower.includes('maintenance') ||
    titleLower.includes('bill') ||
    titleLower.includes('purchase')
  ) {
    return 'EXPENSE';
  }

  return 'INCOME';
}

export const BulkImportFinancialModal: React.FC<BulkImportFinancialModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultDate = getTodayDateString(),
}) => {
  const { bulkRecordDailyFinancialActivities, settings } = useSchool();
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputTab, setInputTab] = useState<'upload' | 'paste'>('upload');
  const [pasteContent, setPasteContent] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Parsed rows
  const [parsedRows, setParsedRows] = useState<ParsedActivityRow[]>([]);
  const [overrideDate, setOverrideDate] = useState(false);
  const [globalDate, setGlobalDate] = useState(defaultDate);
  const [filterType, setFilterType] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  if (!isOpen) return null;

  // Process raw CSV string into parsed rows
  const parseCSVData = (csvText: string) => {
    setIsProcessing(true);
    try {
      // Remove BOM if present
      const cleanText = csvText.replace(/^\uFEFF/, '').trim();
      if (!cleanText) {
        setParsedRows([]);
        setIsProcessing(false);
        return;
      }

      const rawLines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (rawLines.length === 0) {
        setParsedRows([]);
        setIsProcessing(false);
        return;
      }

      // First line: header detection
      const headerFields = parseCsvLine(rawLines[0]).map(h => h.trim().toLowerCase());
      
      // Determine column indices
      const colMap = {
        date: -1,
        type: -1,
        title: -1,
        category: -1,
        amount: -1,
        mode: -1,
        ref: -1,
        student: -1,
        notes: -1,
      };

      headerFields.forEach((h, idx) => {
        if (h.includes('date')) colMap.date = idx;
        else if (h.includes('type') || h.includes('credit') || h.includes('debit') || h.includes('flow')) colMap.type = idx;
        else if (h.includes('title') || h.includes('desc') || h.includes('particular') || h.includes('purpose') || h.includes('item')) colMap.title = idx;
        else if (h.includes('category') || h.includes('head')) colMap.category = idx;
        else if (h.includes('amount') || h.includes('total') || h.includes('value') || h.includes('sum') || h.includes('price')) colMap.amount = idx;
        else if (h.includes('mode') || h.includes('method') || h.includes('payment')) colMap.mode = idx;
        else if (h.includes('ref') || h.includes('receipt') || h.includes('voucher') || h.includes('txn') || h.includes('chq')) colMap.ref = idx;
        else if (h.includes('student') || h.includes('roll') || h.includes('pupil')) colMap.student = idx;
        else if (h.includes('note') || h.includes('remark') || h.includes('comment') || h.includes('narration')) colMap.notes = idx;
      });

      // If headers not cleanly recognized, assume default standard ordering:
      // Date, Type, Title, Category, Amount, Mode, Ref, Student, Notes
      const hasRecognizedCols = colMap.title !== -1 || colMap.amount !== -1;
      const startIndex = hasRecognizedCols ? 1 : 0;

      if (!hasRecognizedCols) {
        colMap.date = 0;
        colMap.type = 1;
        colMap.title = 2;
        colMap.category = 3;
        colMap.amount = 4;
        colMap.mode = 5;
        colMap.ref = 6;
        colMap.student = 7;
        colMap.notes = 8;
      }

      const rows: ParsedActivityRow[] = [];

      for (let i = startIndex; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line) continue;

        const fields = parseCsvLine(line);
        const rawDate = colMap.date !== -1 && fields[colMap.date] !== undefined ? fields[colMap.date] : '';
        const rawType = colMap.type !== -1 && fields[colMap.type] !== undefined ? fields[colMap.type] : '';
        const rawTitle = colMap.title !== -1 && fields[colMap.title] !== undefined ? fields[colMap.title] : '';
        const rawCat = colMap.category !== -1 && fields[colMap.category] !== undefined ? fields[colMap.category] : '';
        const rawAmount = colMap.amount !== -1 && fields[colMap.amount] !== undefined ? fields[colMap.amount] : '';
        const rawMode = colMap.mode !== -1 && fields[colMap.mode] !== undefined ? fields[colMap.mode] : '';
        const rawRef = colMap.ref !== -1 && fields[colMap.ref] !== undefined ? fields[colMap.ref] : '';
        const rawStudent = colMap.student !== -1 && fields[colMap.student] !== undefined ? fields[colMap.student] : '';
        const rawNotes = colMap.notes !== -1 && fields[colMap.notes] !== undefined ? fields[colMap.notes] : '';

        // Validation
        const errors: string[] = [];
        const title = rawTitle.trim();
        if (!title) {
          errors.push('Title/Particulars is required');
        }

        // Clean amount: strip currency symbols, commas, spaces
        const cleanAmountStr = rawAmount.replace(/[^0-9.-]+/g, '');
        const amount = parseFloat(cleanAmountStr);
        if (isNaN(amount) || amount <= 0) {
          errors.push('Amount must be a positive number');
        }

        const type = normalizeType(rawType, title);
        const date = normalizeDate(rawDate, defaultDate);
        const paymentMode = normalizePaymentMode(rawMode);
        const category = rawCat.trim() || (type === 'INCOME' ? 'Other Revenue' : 'Miscellaneous');

        rows.push({
          id: `row-${i}-${Date.now()}`,
          originalIndex: i + 1,
          date,
          type,
          title: title || 'Untitled Entry',
          category,
          amount: isNaN(amount) ? 0 : amount,
          paymentMode,
          referenceNumber: rawRef.trim(),
          studentName: rawStudent.trim(),
          notes: rawNotes.trim(),
          isValid: errors.length === 0,
          errors,
          selected: errors.length === 0,
        });
      }

      setParsedRows(rows);
    } catch (err) {
      console.error('CSV Parsing error:', err);
      alert('Error parsing CSV content. Please verify file format.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle File Input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      parseCSVData(content);
    };
    reader.readAsText(file);
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type.includes('csv') || file.type.includes('text'))) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = evt => {
        const content = evt.target?.result as string;
        parseCSVData(content);
      };
      reader.readAsText(file);
    } else {
      alert('Please upload a valid CSV file.');
    }
  };

  // Handle Textarea Parse
  const handleParsePastedText = () => {
    if (!pasteContent.trim()) {
      alert('Please paste CSV formatted text before parsing.');
      return;
    }
    setFileName('Pasted CSV Data');
    parseCSVData(pasteContent);
  };

  // Sample CSV Generator & Download
  const handleDownloadSampleTemplate = () => {
    const headers = 'Date,Type,Title,Category,Amount,Payment Mode,Reference Number,Student Name,Notes';
    const sampleRows = [
      `${defaultDate},INCOME,Monthly Tuition Fee,Student Fees,450.00,Bank Transfer,TXN-90210,Ethan Davis,Term 1 tuition payment`,
      `${defaultDate},EXPENSE,Science Lab Chemicals & Glassware,Lab & Sports Equipment,320.50,Online/UPI,VCH-EXP-101,,Sigma Aldrich invoice #784`,
      `${defaultDate},INCOME,School Bookstore & Workbook Sales,Bookstore & Uniforms,185.00,Cash,REC-BKS-04,,Grade 9 biology textbooks`,
      `${defaultDate},EXPENSE,Campus Water Tank Cleaning & Sanitation,Utilities (Electricity/Water),140.00,Cash,VCH-EXP-102,,Quarterly preventative service`,
      `${defaultDate},INCOME,Sports Ground Weekend Rental,Facility & Hall Rental,500.00,Cheque,CHQ-88210,,Local youth league booking`,
      `${defaultDate},EXPENSE,Office Printing Paper & Cartridges,Educational Supplies,95.00,Online/UPI,VCH-EXP-103,,Admin stationery refill`,
      `${defaultDate},INCOME,Library Late Return Fines,Other Revenue,25.00,Cash,REC-LIB-12,,Collected at library desk`,
    ];

    const csvContent = `${headers}\n${sampleRows.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EduLedger_Daily_Activities_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Selection helpers
  const handleToggleRow = (id: string) => {
    setParsedRows(prev =>
      prev.map(r => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setParsedRows(prev =>
      prev.map(r => (r.isValid ? { ...r, selected: select } : r))
    );
  };

  // Computed summary metrics
  const validRows = parsedRows.filter(r => r.isValid);
  const invalidRows = parsedRows.filter(r => !r.isValid);
  const selectedRows = parsedRows.filter(r => r.selected && r.isValid);

  const selectedInflow = selectedRows
    .filter(r => r.type === 'INCOME')
    .reduce((sum, r) => sum + r.amount, 0);

  const selectedOutflow = selectedRows
    .filter(r => r.type === 'EXPENSE')
    .reduce((sum, r) => sum + r.amount, 0);

  const netMovement = selectedInflow - selectedOutflow;

  // Filtered rows for table view
  const displayedRows = parsedRows.filter(r => {
    if (filterType === 'VALID' && !r.isValid) return false;
    if (filterType === 'INVALID' && r.isValid) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchCat = r.category.toLowerCase().includes(q);
      const matchRef = r.referenceNumber.toLowerCase().includes(q);
      const matchStudent = r.studentName.toLowerCase().includes(q);
      if (!matchTitle && !matchCat && !matchRef && !matchStudent) return false;
    }
    return true;
  });

  // Execute Bulk Import into SchoolContext
  const handleConfirmImport = async () => {
    if (selectedRows.length === 0) {
      alert('Please select at least one valid record to import.');
      return;
    }

    setIsImporting(true);
    try {
      const payload: DailyFinancialActivityInput[] = selectedRows.map(r => ({
        type: r.type,
        date: overrideDate ? globalDate : r.date,
        title: r.title,
        category: r.category,
        amount: r.amount,
        paymentMode: r.paymentMode,
        referenceNumber: r.referenceNumber || undefined,
        studentName: r.studentName || undefined,
        notes: r.notes || undefined,
        recordedBy: currentUser?.fullName || 'Finance Bursar',
      }));

      const res = await bulkRecordDailyFinancialActivities(payload);
      onSuccess(res.successCount, res.incomeCount, res.expenseCount);
      onClose();
    } catch (err) {
      console.error('Failed to import financial activities:', err);
      alert('An error occurred during bulk import. Please check console for details.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setParsedRows([]);
    setFileName(null);
    setPasteContent('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <BackButton onClick={onClose} label="Back" variant="modal" />
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Bulk Import Daily Financial Activities</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  CSV Engine
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Import batch revenues, fees, and expenditures directly into the local ledger database.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSampleTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-xs"
              title="Download pre-formatted CSV sample template"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Sample CSV Template</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {/* STEP 1: Input method if no rows parsed yet */}
          {parsedRows.length === 0 ? (
            <div className="space-y-4">
              {/* Tab Selector: Upload File or Paste CSV */}
              <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/60 max-w-sm">
                <button
                  onClick={() => setInputTab('upload')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    inputTab === 'upload'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
                <button
                  onClick={() => setInputTab('paste')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    inputTab === 'paste'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste CSV Text</span>
                </button>
              </div>

              {inputTab === 'upload' ? (
                /* Drag and drop upload zone */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Drag & Drop your CSV file here, or{' '}
                      <span className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2">
                        browse computer
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports comma-separated files (.csv) containing daily inflows and disbursements.
                    </p>
                  </div>
                </div>
              ) : (
                /* Direct text paste area */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Paste Comma-Separated Values (CSV) or Table Data:
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setPasteContent(
                          `Date,Type,Title,Category,Amount,Payment Mode,Reference Number,Student Name,Notes\n${defaultDate},INCOME,Uniform & Badge Sales,Bookstore & Uniforms,220.00,Cash,REC-UNF-01,,New term student kits\n${defaultDate},EXPENSE,Internet Fiber Optics Subscription,IT & Software,85.00,Online/UPI,VCH-EXP-105,,Monthly campus broadband`
                        )
                      }
                      className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Load Demo Paste Example
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={pasteContent}
                    onChange={e => setPasteContent(e.target.value)}
                    placeholder="Date,Type,Title,Category,Amount,Payment Mode,Reference Number,Student Name,Notes&#10;2026-09-27,INCOME,Science Lab Fees,Student Fees,450.00,Bank Transfer,TXN-101,John Doe,Term fee&#10;2026-09-27,EXPENSE,Classroom Markers,Educational Supplies,35.00,Cash,VCH-88,,Whiteboard supplies"
                    className="w-full p-3 text-xs font-mono rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleParsePastedText}
                      disabled={!pasteContent.trim()}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      Parse & Preview Data
                    </button>
                  </div>
                </div>
              )}

              {/* Supported Columns Guide Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Info className="w-4 h-4 text-indigo-600" />
                  <span>Expected CSV Column Layout (Smart Auto-Detection Supported):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Date:</span> YYYY-MM-DD or DD/MM/YYYY
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Type:</span> INCOME or EXPENSE
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Title:</span> Purpose / Particulars
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Amount:</span> Numeric (e.g. 150.00)
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Category:</span> Head name (optional)
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Payment Mode:</span> Cash, Bank, UPI, Cheque
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Reference #:</span> Voucher / Receipt #
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Student / Notes:</span> Additional context
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: Interactive Preview and Verification Grid */
            <div className="space-y-4">
              {/* Top Banner / File Meta */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{fileName}</span>
                    <span className="text-[11px] text-slate-400 ml-2">({parsedRows.length} rows parsed)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Upload Different File</span>
                  </button>
                </div>
              </div>

              {/* Financial Metrics from Selected Rows */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rows Selected</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-black text-slate-900 dark:text-white">{selectedRows.length}</span>
                    <span className="text-xs text-slate-400">of {validRows.length} valid</span>
                  </div>
                  {invalidRows.length > 0 && (
                    <span className="text-[10px] text-red-500 font-semibold">{invalidRows.length} with format errors</span>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                      Selected Inflows
                    </span>
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                    +{formatCurrency(selectedInflow, settings.currencySymbol)}
                  </p>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                    {selectedRows.filter(r => r.type === 'INCOME').length} receipts to add
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-red-800 dark:text-red-300 uppercase tracking-wider">
                      Selected Outflows
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-red-600" />
                  </div>
                  <p className="text-xl font-black font-mono text-red-700 dark:text-red-400 mt-1">
                    -{formatCurrency(selectedOutflow, settings.currencySymbol)}
                  </p>
                  <p className="text-[10px] text-red-700/80 dark:text-red-400/80">
                    {selectedRows.filter(r => r.type === 'EXPENSE').length} vouchers to add
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40">
                  <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                    Net Drawer Movement
                  </span>
                  <p
                    className={`text-xl font-black font-mono mt-1 ${
                      netMovement >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(netMovement, settings.currencySymbol)}
                  </p>
                  <p className="text-[10px] text-indigo-700/80 dark:text-indigo-400/80">Net impact on ledger</p>
                </div>
              </div>

              {/* Controls & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
                {/* Status Filter & Search */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-700">
                    <button
                      onClick={() => setFilterType('ALL')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        filterType === 'ALL'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      All ({parsedRows.length})
                    </button>
                    <button
                      onClick={() => setFilterType('VALID')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        filterType === 'VALID'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Valid ({validRows.length})
                    </button>
                    {invalidRows.length > 0 && (
                      <button
                        onClick={() => setFilterType('INVALID')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                          filterType === 'INVALID'
                            ? 'bg-white dark:bg-slate-900 text-red-600 shadow-xs'
                            : 'text-red-500'
                        }`}
                      >
                        Errors ({invalidRows.length})
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search preview rows..."
                      value={searchFilter}
                      onChange={e => setSearchFilter(e.target.value)}
                      className="pl-3 pr-8 py-1 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    {searchFilter && (
                      <button
                        onClick={() => setSearchFilter('')}
                        className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Bulk Select & Date Override */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSelectAll(true)}
                      className="px-2.5 py-1 rounded-lg font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Select All Valid
                    </button>
                    <button
                      onClick={() => handleSelectAll(false)}
                      className="px-2.5 py-1 rounded-lg font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideDate}
                      onChange={e => setOverrideDate(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Set uniform date:</span>
                  </label>
                  {overrideDate && (
                    <input
                      type="date"
                      value={globalDate}
                      onChange={e => setGlobalDate(e.target.value)}
                      className="px-2 py-1 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    />
                  )}
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={validRows.length > 0 && selectedRows.length === validRows.length}
                          onChange={e => handleSelectAll(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                      </th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Title / Particulars</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Payment Mode</th>
                      <th className="py-2.5 px-3">Ref / Voucher #</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          No rows match current filter.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map(row => (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                            !row.isValid ? 'bg-red-50/40 dark:bg-red-950/10' : ''
                          } ${row.selected ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : ''}`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              disabled={!row.isValid}
                              onChange={() => handleToggleRow(row.id)}
                              className="rounded text-indigo-600 cursor-pointer disabled:opacity-30"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Ready</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500"
                                title={row.errors.join(', ')}
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>{row.errors[0]}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                            {overrideDate ? globalDate : row.date}
                          </td>
                          <td className="py-2.5 px-3">
                            {row.type === 'INCOME' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Income
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                                Expense
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white max-w-[220px] truncate">
                            {row.title}
                            {row.studentName && (
                              <span className="block text-[10px] text-slate-400">Student: {row.studentName}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 max-w-[140px] truncate">{row.category}</td>
                          <td className="py-2.5 px-3 text-slate-500">{row.paymentMode}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">{row.referenceNumber || '—'}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span
                              className={
                                row.type === 'INCOME'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-500'
                              }
                            >
                              {row.type === 'INCOME' ? '+' : '-'}
                              {formatCurrency(row.amount, settings.currencySymbol)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {parsedRows.length > 0 ? (
              <span>
                Ready to import <strong className="text-slate-900 dark:text-white">{selectedRows.length}</strong> of{' '}
                {validRows.length} valid entries into SchoolContext.
              </span>
            ) : (
              <span>Need help? Download the sample CSV template above for standard headers.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>

            {parsedRows.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={selectedRows.length === 0 || isImporting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm shadow-indigo-500/20"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Writing to Database...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Import ({selectedRows.length} Entries)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
