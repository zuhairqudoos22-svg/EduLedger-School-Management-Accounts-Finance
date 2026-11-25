import { Expense, ExpenseCategory, PaymentMode, ExpenseTaxonomyConfig } from '../types';
import { autoMapExpenseCategory, CategoryMappingRule } from './expenseCategoryAutoMapper';
import { getTodayDateString } from './formatters';

export interface ParsedExpenseRow {
  tempId: string;
  rowIndex: number;
  date: string;
  title: string;
  rawCategory: string;
  category: string;
  subCategory: string;
  tags: string[];
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber: string;
  notes: string;
  isValid: boolean;
  errors: string[];
  mappingRule: CategoryMappingRule;
  selected: boolean;
}

export interface ExpenseCsvParseResult {
  rows: ParsedExpenseRow[];
  totalParsed: number;
  validCount: number;
  errorCount: number;
  detectedColumns: Record<string, string>;
  rawHeaders: string[];
}

// Split CSV line handling quotes and escaped quotes
export function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ',') {
        fields.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

// Normalize dates from various formats to YYYY-MM-DD
export function normalizeExpenseDate(raw: string): { date: string; valid: boolean } {
  if (!raw) return { date: getTodayDateString(), valid: false };
  const clean = raw.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const d = new Date(clean);
    return { date: clean, valid: !isNaN(d.getTime()) };
  }

  // YYYY/MM/DD
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(clean)) {
    const [y, m, d] = clean.split('/');
    const formatted = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    return { date: formatted, valid: !isNaN(new Date(formatted).getTime()) };
  }

  // DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(clean)) {
    const parts = clean.split(/[-\/]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    // If first part is > 12, definitely DD/MM/YYYY
    if (day > 12 || month <= 12) {
      const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { date: formatted, valid: !isNaN(new Date(formatted).getTime()) };
    }
    // Ambiguous, assume MM/DD/YYYY standard
    const formatted = `${year}-${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`;
    return { date: formatted, valid: !isNaN(new Date(formatted).getTime()) };
  }

  // Fallback to Date parser
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return { date: `${y}-${m}-${d}`, valid: true };
  }

  return { date: getTodayDateString(), valid: false };
}

// Clean and parse monetary amount
export function parseExpenseAmount(raw: string): number {
  if (!raw) return 0;
  // Strip currency symbols ($ € £ ₹ ¥), letters, and thousand commas
  const cleaned = raw.replace(/[^\d.-]/g, '').trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : Math.abs(val);
}

// Standardize Payment Mode
export function normalizePaymentMode(raw: string): PaymentMode {
  if (!raw) return 'Bank Transfer';
  const clean = raw.trim().toLowerCase();

  if (clean.includes('cash')) return 'Cash';
  if (clean.includes('cheque') || clean.includes('check')) return 'Cheque';
  if (clean.includes('online') || clean.includes('upi') || clean.includes('card') || clean.includes('stripe') || clean.includes('paypal')) {
    return 'Online/UPI';
  }
  return 'Bank Transfer';
}

// Normalize tags array from CSV string
export function parseCsvTags(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[;,]/)
    .map(t => t.trim().replace(/^#+/, ''))
    .filter(t => t.length > 0);
}

/**
 * Main parser: takes CSV string and returns structured, validated, auto-mapped rows
 */
export function parseExpenseCsv(
  csvText: string,
  taxonomy?: ExpenseTaxonomyConfig
): ExpenseCsvParseResult {
  // Remove UTF-8 BOM if present
  let cleanText = csvText.replace(/^\uFEFF/, '');
  const lines = cleanText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    return {
      rows: [],
      totalParsed: 0,
      validCount: 0,
      errorCount: 0,
      detectedColumns: {},
      rawHeaders: [],
    };
  }

  const rawHeaders = splitCsvLine(lines[0]);
  const headerLower = rawHeaders.map(h => h.toLowerCase().trim());

  // Find column indices
  const findCol = (synonyms: string[]): number => {
    return headerLower.findIndex(h => synonyms.some(s => h === s || h.includes(s)));
  };

  const colDate = findCol(['date', 'txn date', 'voucher date', 'post date', 'entry date', 'day']);
  const colTitle = findCol(['title', 'payee', 'payee / description', 'description', 'vendor', 'particulars', 'narration', 'item', 'details']);
  const colCategory = findCol(['category', 'expense category', 'account', 'account / expense category', 'head', 'ledger']);
  const colSubCategory = findCol(['sub-category', 'subcategory', 'sub category', 'sub']);
  const colTags = findCol(['tags', 'tag', 'tags / class', 'labels', 'keywords']);
  const colAmount = findCol(['amount', 'debit', 'debit amount', 'cost', 'total', 'net amount', 'price', 'paid']);
  const colPaymentMode = findCol(['payment mode', 'payment method', 'mode', 'method', 'channel']);
  const colReference = findCol(['reference', 'reference number', 'ref', 'ref #', 'voucher number', 'invoice #', 'check #', 'txn id', 'transaction id']);
  const colNotes = findCol(['notes', 'memo', 'remarks', 'comments', 'justification']);

  const detectedColumns: Record<string, string> = {};
  if (colDate >= 0) detectedColumns['Date'] = rawHeaders[colDate];
  if (colTitle >= 0) detectedColumns['Title / Payee'] = rawHeaders[colTitle];
  if (colCategory >= 0) detectedColumns['Category'] = rawHeaders[colCategory];
  if (colSubCategory >= 0) detectedColumns['Sub-Category'] = rawHeaders[colSubCategory];
  if (colTags >= 0) detectedColumns['Tags'] = rawHeaders[colTags];
  if (colAmount >= 0) detectedColumns['Amount'] = rawHeaders[colAmount];
  if (colPaymentMode >= 0) detectedColumns['Payment Mode'] = rawHeaders[colPaymentMode];
  if (colReference >= 0) detectedColumns['Reference #'] = rawHeaders[colReference];

  const parsedRows: ParsedExpenseRow[] = [];
  let validCount = 0;
  let errorCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawFields = splitCsvLine(lines[i]);
    if (rawFields.length === 0 || rawFields.every(f => !f)) continue;

    const errors: string[] = [];

    // Extract values
    const rawDateStr = colDate >= 0 ? rawFields[colDate] || '' : '';
    const rawTitleStr = colTitle >= 0 ? rawFields[colTitle] || '' : '';
    const rawCatStr = colCategory >= 0 ? rawFields[colCategory] || '' : '';
    const rawSubCatStr = colSubCategory >= 0 ? rawFields[colSubCategory] || '' : '';
    const rawTagsStr = colTags >= 0 ? rawFields[colTags] || '' : '';
    const rawAmountStr = colAmount >= 0 ? rawFields[colAmount] || '' : '';
    const rawPaymentModeStr = colPaymentMode >= 0 ? rawFields[colPaymentMode] || '' : '';
    const rawRefStr = colReference >= 0 ? rawFields[colReference] || '' : '';
    const rawNotesStr = colNotes >= 0 ? rawFields[colNotes] || '' : '';

    // Validate title
    const title = rawTitleStr.trim();
    if (!title) {
      errors.push('Missing expense title or payee.');
    }

    // Validate amount
    const amount = parseExpenseAmount(rawAmountStr);
    if (amount <= 0) {
      errors.push('Amount must be a positive number greater than 0.');
    }

    // Validate date
    const dateNorm = normalizeExpenseDate(rawDateStr);
    if (!dateNorm.valid && rawDateStr) {
      errors.push(`Invalid date format "${rawDateStr}".`);
    }

    // Automatic Category Mapping Engine
    const mappingRule = autoMapExpenseCategory(rawCatStr, title, rawNotesStr, taxonomy);
    const category = mappingRule.targetCategory;
    const subCategory = rawSubCatStr.trim() || mappingRule.targetSubCategory || '';

    // Tags
    const tags = parseCsvTags(rawTagsStr);

    // Payment Mode & Reference
    const paymentMode = normalizePaymentMode(rawPaymentModeStr);
    const referenceNumber = rawRefStr.trim() || `CSV-${String(i).padStart(4, '0')}`;

    const isValid = errors.length === 0;
    if (isValid) validCount++;
    else errorCount++;

    parsedRows.push({
      tempId: `row-${Date.now()}-${i}`,
      rowIndex: i,
      date: dateNorm.date,
      title,
      rawCategory: rawCatStr,
      category,
      subCategory,
      tags,
      amount,
      paymentMode,
      referenceNumber,
      notes: rawNotesStr.trim(),
      isValid,
      errors,
      mappingRule,
      selected: isValid, // Select valid rows by default
    });
  }

  return {
    rows: parsedRows,
    totalParsed: parsedRows.length,
    validCount,
    errorCount,
    detectedColumns,
    rawHeaders,
  };
}

/**
 * Generates sample CSV content with realistic school expenses for instant download
 */
export function generateExpenseSampleCsv(): string {
  const headers = [
    'Date',
    'Payee / Description',
    'Category',
    'Sub-Category',
    'Tags',
    'Amount',
    'Payment Method',
    'Reference Number',
    'Notes',
  ];

  const today = getTodayDateString();
  const yearMonth = today.slice(0, 7);

  const sampleRows = [
    [
      `${yearMonth}-03`,
      'Metro Electricity Grid Co - Campus Power Bill',
      'Utilities',
      'Electricity Grid',
      'Urgent; recurring',
      '1480.00',
      'Bank Transfer',
      'INV-UTIL-9021',
      'Monthly main building & classroom air conditioning power consumption',
    ],
    [
      `${yearMonth}-05`,
      'Apex Science Supplies - Chemistry Reagents & Glassware',
      'Lab Supplies',
      'Chemistry Lab Reagents',
      'Grant-Funded; STEM',
      '740.50',
      'Online/UPI',
      'INV-CHEM-2026-8',
      'Organic acids, safety goggles, and test tubes for term 2 lab practicals',
    ],
    [
      `${yearMonth}-10`,
      'Faculty Teaching Staff Monthly Remuneration',
      'Payroll',
      'Teaching Faculty',
      'Board-Approved',
      '4200.00',
      'Bank Transfer',
      'SAL-DISB-2026-M1',
      'Disbursement for science and language departments faculty',
    ],
    [
      `${yearMonth}-12`,
      'School Bus Fleet Diesel - Fuel Service Depot',
      'Fuel & Vehicle',
      'Bus Fleet Fuel / Diesel',
      'Recurring-Scheduled',
      '560.00',
      'Cash',
      'FUEL-REC-112',
      'Fuel for 4 school buses for student transport routes A & B',
    ],
    [
      `${yearMonth}-15`,
      'Universal Paper Mill - 80 GSM Classroom Printing Paper',
      'Stationery Supplies',
      'Printing Paper & Ink Cartridges',
      'Tax-Deductible',
      '310.00',
      'Bank Transfer',
      'INV-PPR-4401',
      '15 reams of A4 paper for examinations and classroom worksheets',
    ],
    [
      `${yearMonth}-18`,
      'Google Workspace for Education & Cloud Licenses',
      'Software',
      'LMS & SaaS Licenses',
      'Recurring-Scheduled',
      '220.00',
      'Online/UPI',
      'GW-SUB-7798',
      'Annual cloud storage & classroom management software licenses',
    ],
    [
      `${yearMonth}-22`,
      'Apex Climate Air Conditioning Compressor Servicing',
      'Repairs & Civil',
      'HVAC & Air Conditioning',
      'Emergency-Repair',
      '480.00',
      'Cheque',
      'CHQ-88901',
      'Emergency maintenance of library and auditorium HVAC chiller units',
    ],
    [
      `${yearMonth}-26`,
      'Standardized Exam Question Papers & Certificates',
      'Exam Expenses',
      'Term Exam Printing & Stationery',
      'Audit-Flagged',
      '390.00',
      'Bank Transfer',
      'EXAM-PRINT-550',
      'Confidential printing of midterm question papers and evaluation ledgers',
    ],
  ];

  const lines = [
    headers.join(','),
    ...sampleRows.map(row =>
      row.map(cell => (cell.includes(',') || cell.includes(';') ? `"${cell}"` : cell)).join(',')
    ),
  ];

  return lines.join('\n');
}
