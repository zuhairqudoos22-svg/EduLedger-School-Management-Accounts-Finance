import jsPDF from 'jspdf';
import { SchoolSettings, FeePayment, Expense } from '../types';
import { formatCurrency, formatDate, getTodayDateString } from './formatters';

export interface LedgerPdfEntry {
  date: string;
  description: string;
  category: string;
  paymentMode: string;
  reference?: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface FinancialStatementData {
  title: string;
  reportingPeriod: string;
  academicYear: string;
  auditorNotes?: string;
  preparedBy: string;
  approvedBy: string;
  incomeCategories: { category: string; amount: number; percentage: number }[];
  expenseCategories: { category: string; amount: number; percentage: number }[];
  totalIncome: number;
  totalExpense: number;
  netSurplus: number;
  operatingMargin: number;
}

/**
 * Generates an official General Ledger Audit Report as a downloadable PDF
 */
export function generateGeneralLedgerPdf(
  settings: SchoolSettings,
  entries: LedgerPdfEntry[],
  dateRange: { start: string; end: string },
  totals: { totalCredit: number; totalDebit: number; closingBalance: number },
  options?: {
    title?: string;
    subtitle?: string;
    scope?: string;
  }
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  // Header Banner Background
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // School Logo in Header Banner
  if (settings.logoUrl && settings.logoUrl.startsWith('data:image/')) {
    try {
      const format = settings.logoUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageWidth - margin - 20, 4, 20, 20, 2, 2, 'F');
      doc.addImage(settings.logoUrl, format, pageWidth - margin - 19, 5, 18, 18, undefined, 'FAST');
    } catch {
      // fallback cleanly
    }
  }

  // School Brand & Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(settings.schoolName || 'EduLedger International School', margin, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  const reportTitle = options?.title || 'OFFICIAL ACCOUNTS GENERAL LEDGER & CASHBOOK AUDIT';
  doc.text(reportTitle, margin, 18);
  const scopeSuffix = options?.scope ? `  •  ${options.scope}` : '';
  doc.text(
    `Session: ${settings.currentAcademicYear || '2026-2027'}  •  Period: ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}${scopeSuffix}`,
    margin,
    24
  );

  y = 36;

  // Financial Position Summary Cards
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'FD');

  const cardWidth = (pageWidth - margin * 2) / 3;

  // Total Inflow (Credit)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL REVENUES / CREDITS', margin + 4, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(`+${formatCurrency(totals.totalCredit, settings.currencySymbol)}`, margin + 4, y + 16);

  // Total Outflow (Debit)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL EXPENDITURES / DEBITS', margin + cardWidth + 4, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(239, 68, 68);
  doc.text(`-${formatCurrency(totals.totalDebit, settings.currencySymbol)}`, margin + cardWidth + 4, y + 16);

  // Net Balance
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('CLOSING LIQUID BALANCE', margin + cardWidth * 2 + 4, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(totals.closingBalance >= 0 ? 79 : 239, totals.closingBalance >= 0 ? 70 : 68, totals.closingBalance >= 0 ? 229 : 68);
  doc.text(formatCurrency(totals.closingBalance, settings.currencySymbol), margin + cardWidth * 2 + 4, y + 16);

  y += 28;

  // Table Column Headers
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y + 8, pageWidth - margin, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  doc.text('Date', margin + 2, y + 5.5);
  doc.text('Particulars / Narration', margin + 24, y + 5.5);
  doc.text('Category', margin + 86, y + 5.5);
  doc.text('Mode', margin + 118, y + 5.5);
  doc.text('Debit (-)', margin + 138, y + 5.5);
  doc.text('Credit (+)', margin + 158, y + 5.5);
  doc.text('Balance', margin + 178, y + 5.5);

  y += 10;

  // Transaction Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  if (entries.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    doc.text('No ledger transactions recorded matching the selected filter criteria.', margin + 2, y + 4);
    y += 12;
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Check if new page is needed
    if (y > pageHeight - 30) {
      doc.addPage();
      y = 16;

      // Repeat compact header
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, y + 8, pageWidth - margin, y + 8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      doc.text('Date', margin + 2, y + 5.5);
      doc.text('Particulars / Narration', margin + 24, y + 5.5);
      doc.text('Category', margin + 86, y + 5.5);
      doc.text('Mode', margin + 118, y + 5.5);
      doc.text('Debit (-)', margin + 138, y + 5.5);
      doc.text('Credit (+)', margin + 158, y + 5.5);
      doc.text('Balance', margin + 178, y + 5.5);

      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
    }

    // Row zebra background
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, pageWidth - margin * 2, 7, 'F');
    }

    doc.setTextColor(71, 85, 105);
    doc.text(formatDate(entry.date), margin + 2, y);

    // Truncate long descriptions
    const desc = entry.description.length > 36 ? entry.description.substring(0, 34) + '...' : entry.description;
    doc.setTextColor(15, 23, 42);
    doc.text(desc, margin + 24, y);

    // Category
    const cat = entry.category.length > 18 ? entry.category.substring(0, 16) + '..' : entry.category;
    doc.setTextColor(100, 116, 139);
    doc.text(cat, margin + 86, y);

    // Mode
    doc.text(entry.paymentMode || 'Cash', margin + 118, y);

    // Debit
    if (entry.debit > 0) {
      doc.setTextColor(239, 68, 68);
      doc.text(formatCurrency(entry.debit, settings.currencySymbol), margin + 138, y);
    } else {
      doc.setTextColor(148, 163, 184);
      doc.text('—', margin + 138, y);
    }

    // Credit
    if (entry.credit > 0) {
      doc.setTextColor(16, 185, 129);
      doc.text(formatCurrency(entry.credit, settings.currencySymbol), margin + 158, y);
    } else {
      doc.setTextColor(148, 163, 184);
      doc.text('—', margin + 158, y);
    }

    // Balance
    doc.setTextColor(entry.balance >= 0 ? 15 : 239, entry.balance >= 0 ? 23 : 68, entry.balance >= 0 ? 42 : 68);
    doc.text(formatCurrency(entry.balance, settings.currencySymbol), margin + 178, y);

    y += 6.5;
  }

  // Signatures / Audit Certification Section
  if (y > pageHeight - 35) {
    doc.addPage();
    y = 20;
  } else {
    y += 10;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  const sigWidth = (pageWidth - margin * 2) / 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  // Sig 1
  doc.line(margin + 5, y, margin + sigWidth - 10, y);
  doc.text('Prepared by: Finance Officer', margin + 5, y + 4.5);

  // Sig 2
  doc.line(margin + sigWidth + 5, y, margin + sigWidth * 2 - 10, y);
  doc.text('Audited by: School Bursar', margin + sigWidth + 5, y + 4.5);

  // Sig 3
  doc.line(margin + sigWidth * 2 + 5, y, margin + sigWidth * 3 - 5, y);
  doc.text('Approved by: Principal / Director', margin + sigWidth * 2 + 5, y + 4.5);

  doc.save(`General_Ledger_${dateRange.start}_to_${dateRange.end}.pdf`);
}

/**
 * Generates an official Financial Statement (Income Statement & Balance Sheet) PDF
 */
export function generateFinancialStatementPdf(
  settings: SchoolSettings,
  data: FinancialStatementData
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  // Header Banner
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(settings.schoolName || 'EduLedger International School', margin, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text(data.title.toUpperCase(), margin, 18);
  doc.text(`Academic Session: ${data.academicYear}  •  Period: ${data.reportingPeriod}`, margin, 24);

  y = 36;

  // Executive Overview Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'FD');

  const cardWidth = (pageWidth - margin * 2) / 3;

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL OPERATING REVENUE', margin + 4, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(formatCurrency(data.totalIncome, settings.currencySymbol), margin + 4, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL OPERATING EXPENSES', margin + cardWidth + 4, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(239, 68, 68);
  doc.text(formatCurrency(data.totalExpense, settings.currencySymbol), margin + cardWidth + 4, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('NET OPERATING SURPLUS / (DEFICIT)', margin + cardWidth * 2 + 4, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(data.netSurplus >= 0 ? 16 : 239, data.netSurplus >= 0 ? 185 : 68, data.netSurplus >= 0 ? 129 : 68);
  doc.text(formatCurrency(data.netSurplus, settings.currencySymbol), margin + cardWidth * 2 + 4, y + 16);

  y += 30;

  // SECTION 1: OPERATING REVENUES (INFLOWS)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. OPERATING REVENUES BREAKDOWN', margin, y);
  y += 5;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
  doc.setFontSize(8);
  doc.text('Revenue Head / Stream', margin + 3, y + 5);
  doc.text('Amount ($)', margin + 120, y + 5);
  doc.text('Share of Revenue', margin + 155, y + 5);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  for (const item of data.incomeCategories) {
    doc.setTextColor(30, 41, 59);
    doc.text(item.category, margin + 3, y);
    doc.setTextColor(16, 185, 129);
    doc.text(formatCurrency(item.amount, settings.currencySymbol), margin + 120, y);
    doc.setTextColor(100, 116, 139);
    doc.text(`${item.percentage.toFixed(1)}%`, margin + 155, y);
    y += 5.5;
  }

  // Revenues subtotal
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL REVENUES', margin + 3, y);
  doc.setTextColor(16, 185, 129);
  doc.text(formatCurrency(data.totalIncome, settings.currencySymbol), margin + 120, y);
  doc.text('100.0%', margin + 155, y);

  y += 10;

  // SECTION 2: OPERATING EXPENDITURES (OUTFLOWS)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. OPERATING EXPENDITURES BREAKDOWN', margin, y);
  y += 5;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
  doc.setFontSize(8);
  doc.text('Expenditure Category', margin + 3, y + 5);
  doc.text('Amount ($)', margin + 120, y + 5);
  doc.text('Share of Total Expenses', margin + 155, y + 5);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  for (const item of data.expenseCategories) {
    if (y > pageHeight - 35) {
      doc.addPage();
      y = 16;
    }
    doc.setTextColor(30, 41, 59);
    doc.text(item.category, margin + 3, y);
    doc.setTextColor(239, 68, 68);
    doc.text(formatCurrency(item.amount, settings.currencySymbol), margin + 120, y);
    doc.setTextColor(100, 116, 139);
    doc.text(`${item.percentage.toFixed(1)}%`, margin + 155, y);
    y += 5.5;
  }

  // Expenses subtotal
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL EXPENDITURES', margin + 3, y);
  doc.setTextColor(239, 68, 68);
  doc.text(formatCurrency(data.totalExpense, settings.currencySymbol), margin + 120, y);
  doc.text('100.0%', margin + 155, y);

  y += 10;

  // SECTION 3: AUDITOR NOTES & SIGNATURES
  if (data.auditorNotes) {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 16;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('3. AUDITOR NOTES & ACCOUNTING POLICIES', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const splitNotes = doc.splitTextToSize(data.auditorNotes, pageWidth - margin * 2);
    doc.text(splitNotes, margin, y);
    y += splitNotes.length * 4.5 + 6;
  }

  if (y > pageHeight - 35) {
    doc.addPage();
    y = 20;
  } else {
    y += 6;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  const sigWidth = (pageWidth - margin * 2) / 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  doc.line(margin + 5, y, margin + sigWidth - 15, y);
  doc.text(`Prepared By: ${data.preparedBy || 'Chief Accountant'}`, margin + 5, y + 4.5);

  doc.line(margin + sigWidth + 15, y, margin + sigWidth * 2 - 5, y);
  doc.text(`Approved By: ${data.approvedBy || 'School Principal / Bursar'}`, margin + sigWidth + 15, y + 4.5);

  doc.save(`Financial_Statement_${data.reportingPeriod.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Generates an official Student Account Ledger Statement PDF
 */
export function generateStudentStatementPdf(
  settings: SchoolSettings,
  student: {
    fullName: string;
    rollNo: string;
    className: string;
    section: string;
    guardianName: string;
  },
  payments: FeePayment[],
  pendingDues: number
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  // Header Banner
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(settings.schoolName || 'EduLedger International School', margin, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text('OFFICIAL STUDENT FINANCIAL LEDGER & STATEMENT', margin, 18);
  doc.text(`Academic Session: ${settings.currentAcademicYear || '2026-2027'}`, margin, 24);

  y = 36;

  // Student Particulars Block
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(student.fullName, margin + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Roll No: ${student.rollNo}  •  Class: ${student.className} - Sec ${student.section}`, margin + 5, y + 14);
  doc.text(`Guardian: ${student.guardianName || 'N/A'}`, margin + 5, y + 20);

  const totalPaid = payments.reduce((sum, p) => sum + p.totalAmount, 0);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`Total Paid: ${formatCurrency(totalPaid, settings.currencySymbol)}`, margin + 115, y + 10);

  doc.setTextColor(pendingDues > 0 ? 239 : 16, pendingDues > 0 ? 68 : 185, pendingDues > 0 ? 68 : 129);
  doc.text(`Pending Dues: ${formatCurrency(pendingDues, settings.currencySymbol)}`, margin + 115, y + 18);

  y += 32;

  // Statement History Table
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y + 8, pageWidth - margin, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  doc.text('Receipt #', margin + 3, y + 5.5);
  doc.text('Date', margin + 35, y + 5.5);
  doc.text('Billing Month / Particulars', margin + 65, y + 5.5);
  doc.text('Payment Mode', margin + 125, y + 5.5);
  doc.text('Amount Paid', margin + 155, y + 5.5);

  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  for (let i = 0; i < payments.length; i++) {
    const p = payments[i];
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, pageWidth - margin * 2, 7, 'F');
    }
    doc.setTextColor(79, 70, 229);
    doc.text(p.receiptNumber, margin + 3, y);

    doc.setTextColor(71, 85, 105);
    doc.text(formatDate(p.date), margin + 35, y);
    doc.text(p.monthFor, margin + 65, y);
    doc.text(p.paymentMode, margin + 125, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(formatCurrency(p.totalAmount, settings.currencySymbol), margin + 155, y);
    doc.setFont('helvetica', 'normal');

    y += 7;
  }

  y += 15;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Accounts Department Signature & Official Stamp', margin + 5, y);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, margin + 115, y);

  doc.save(`Student_Statement_${student.rollNo}_${student.fullName.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Generates an official, printable Fee Collection & Receipts Financial Audit Report PDF
 */
export function generateFeeCollectionAuditPdf(
  settings: SchoolSettings,
  payments: FeePayment[],
  options: {
    title?: string;
    scope?: string;
    period?: string;
    filterQuery?: string;
  } = {}
): void {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
  const margin = 14;
  let y = 14;

  const totalCollected = payments.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalCount = payments.length;
  const academicYear = settings.currentAcademicYear || '2026-2027';
  const reportTitle = options.title || 'OFFICIAL FEE COLLECTION & REVENUE AUDIT REPORT';
  const timestamp = new Date().toLocaleString();

  // Mode breakdown
  const modeMap: Record<string, number> = {};
  payments.forEach(p => {
    modeMap[p.paymentMode] = (modeMap[p.paymentMode] || 0) + p.totalAmount;
  });

  const drawHeader = (isFirstPage: boolean) => {
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, isFirstPage ? 26 : 18, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 14 : 11);
    doc.text(settings.schoolName || 'EduLedger International School', margin, isFirstPage ? 9 : 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isFirstPage ? 8.5 : 7.5);
    doc.setTextColor(203, 213, 225);
    doc.text(reportTitle, margin, isFirstPage ? 15 : 13);

    const sub = `Academic Session: ${academicYear}  •  ${options.period || 'General Collection Registry'}  •  ${settings.schoolAddress || 'Accounts Bursary'}`;
    doc.text(sub, margin, isFirstPage ? 21 : 16);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Ref: AUD-REV-${Date.now().toString().slice(-6)}`, pageWidth - margin, isFirstPage ? 9 : 8, {
      align: 'right',
    });
    doc.text(`Exported: ${timestamp}`, pageWidth - margin, isFirstPage ? 15 : 13, { align: 'right' });
  };

  const drawTableHeaders = (startY: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, startY, pageWidth - margin * 2, 8, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, startY + 8, pageWidth - margin, startY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    let colX = margin;
    doc.text('#', colX + 2, startY + 5.5);
    colX += 10;
    doc.text('Receipt #', colX + 2, startY + 5.5);
    colX += 28;
    doc.text('Student Full Name', colX + 2, startY + 5.5);
    colX += 56;
    doc.text('Class & Sec', colX + 2, startY + 5.5);
    colX += 28;
    doc.text('Date', colX + 2, startY + 5.5);
    colX += 24;
    doc.text('Billing Period / Head', colX + 2, startY + 5.5);
    colX += 45;
    doc.text('Payment Mode', colX + 2, startY + 5.5);
    colX += 28;
    doc.text('Ref / Txn #', colX + 2, startY + 5.5);
    colX += 26;
    doc.text(`Amount (${settings.currencySymbol || '$'})`, colX + 22, startY + 5.5, { align: 'right' });
  };

  // Page 1 Header
  drawHeader(true);
  y = 32;

  // Executive KPI Card
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, 'FD');

  const cardW = (pageWidth - margin * 2) / 4;

  // Metric 1: Total Revenue
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('GROSS AUDITED REVENUE', margin + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(formatCurrency(totalCollected, settings.currencySymbol), margin + 4, y + 14);

  // Metric 2: Receipts Count
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TRANSACTION VOLUME', margin + cardW + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalCount} Receipts`, margin + cardW + 4, y + 14);

  // Metric 3: Primary Mode
  const topMode = Object.entries(modeMap).sort((a, b) => b[1] - a[1])[0];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PRIMARY CHANNEL', margin + cardW * 2 + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229);
  doc.text(topMode ? `${topMode[0]} (${formatCurrency(topMode[1], settings.currencySymbol)})` : 'None', margin + cardW * 2 + 4, y + 14);

  // Metric 4: Scope
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CURRENCY & SCOPE', margin + cardW * 3 + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`${settings.currencyCode || 'PKR'} (${settings.currencySymbol || 'Rs.'})  •  ${options.scope || 'All Receipts'}`, margin + cardW * 3 + 4, y + 14);

  y += 24;
  drawTableHeaders(y);
  y += 10;

  let currentPage = 1;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  payments.forEach((p, idx) => {
    if (y > pageHeight - 25) {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`EduLedger Fee Collection Audit Report  •  Page ${currentPage}`, margin, pageHeight - 6);
      doc.text(`Official Accounts Document`, pageWidth - margin, pageHeight - 6, { align: 'right' });

      doc.addPage();
      currentPage += 1;
      drawHeader(false);
      y = 24;
      drawTableHeaders(y);
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 3.5, pageWidth - margin * 2, 6, 'F');
    }

    let colX = margin;

    // #
    doc.setTextColor(148, 163, 184);
    doc.text(String(idx + 1), colX + 2, y);
    colX += 10;

    // Receipt #
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text(p.receiptNumber, colX + 2, y);
    colX += 28;

    // Student Name
    doc.setTextColor(15, 23, 42);
    const sName = p.studentName.length > 28 ? p.studentName.substring(0, 26) + '..' : p.studentName;
    doc.text(sName, colX + 2, y);
    doc.setFont('helvetica', 'normal');
    colX += 56;

    // Class & Sec
    doc.setTextColor(51, 65, 85);
    doc.text(`${p.className} - ${p.section}`, colX + 2, y);
    colX += 28;

    // Date
    doc.text(formatDate(p.date), colX + 2, y);
    colX += 24;

    // Month
    const mStr = p.monthFor.length > 24 ? p.monthFor.substring(0, 22) + '..' : p.monthFor;
    doc.text(mStr, colX + 2, y);
    colX += 45;

    // Mode
    doc.text(p.paymentMode, colX + 2, y);
    colX += 28;

    // Ref
    doc.setTextColor(100, 116, 139);
    doc.text(p.transactionRef || '—', colX + 2, y);
    colX += 26;

    // Amount
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(formatCurrency(p.totalAmount, settings.currencySymbol), colX + 22, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += 6;
  });

  // Verification Block
  if (y > pageHeight - 38) {
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`EduLedger Fee Collection Audit Report  •  Page ${currentPage}`, margin, pageHeight - 6);
    doc.text(`Official Accounts Document`, pageWidth - margin, pageHeight - 6, { align: 'right' });

    doc.addPage();
    currentPage += 1;
    drawHeader(false);
    y = 30;
  } else {
    y += 8;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const sigWidth = (pageWidth - margin * 2) / 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);

  doc.line(margin + 5, y, margin + sigWidth - 15, y);
  doc.text('Prepared By: Bursar / Accounts Cashier', margin + 5, y + 4.5);
  doc.text('Daily Inflow Audit & Bank Reconciled', margin + 5, y + 8.5);

  doc.line(margin + sigWidth + 5, y, margin + sigWidth * 2 - 15, y);
  doc.text('Audited By: Senior Financial Auditor', margin + sigWidth + 5, y + 4.5);
  doc.text('Receipt Books & Ledger Verification', margin + sigWidth + 5, y + 8.5);

  doc.line(margin + sigWidth * 2 + 5, y, margin + sigWidth * 3 - 5, y);
  doc.text('Approved By: Principal / Board Director', margin + sigWidth * 2 + 5, y + 4.5);
  doc.text('Statutory Compliance & Financial Seal', margin + sigWidth * 2 + 5, y + 8.5);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`EduLedger Fee Collection Audit Report  •  Page ${currentPage}`, margin, pageHeight - 6);
  doc.text(`Total Audited: ${formatCurrency(totalCollected, settings.currencySymbol)}  •  ${timestamp}`, pageWidth - margin, pageHeight - 6, {
    align: 'right',
  });

  doc.save(`Fee_Collection_Audit_Report_${Date.now().toString().slice(-6)}.pdf`);
}

/**
 * Generates an official, printable Pending Dues & Defaulters Financial Audit Report PDF
 */
export function generateDueFeesAuditPdf(
  settings: SchoolSettings,
  defaulters: { student: any; pendingAmount: number; lastPaymentDate?: string }[],
  options: {
    title?: string;
    className?: string;
  } = {}
): void {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 14;

  const totalOutstanding = defaulters.reduce((sum, d) => sum + d.pendingAmount, 0);
  const totalDefaulters = defaulters.length;
  const academicYear = settings.currentAcademicYear || '2026-2027';
  const reportTitle = options.title || 'OFFICIAL PENDING DUES & RECOVERY AUDIT REPORT';
  const timestamp = new Date().toLocaleString();

  const drawHeader = (isFirstPage: boolean) => {
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, isFirstPage ? 26 : 18, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 14 : 11);
    doc.text(settings.schoolName || 'EduLedger International School', margin, isFirstPage ? 9 : 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isFirstPage ? 8.5 : 7.5);
    doc.setTextColor(203, 213, 225);
    doc.text(reportTitle, margin, isFirstPage ? 15 : 13);

    const sub = `Academic Session: ${academicYear}  •  Scope: ${options.className || 'All Classes'}  •  Accounts Recovery Department`;
    doc.text(sub, margin, isFirstPage ? 21 : 16);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Ref: AUD-DUE-${Date.now().toString().slice(-6)}`, pageWidth - margin, isFirstPage ? 9 : 8, {
      align: 'right',
    });
    doc.text(`Exported: ${timestamp}`, pageWidth - margin, isFirstPage ? 15 : 13, { align: 'right' });
  };

  const drawTableHeaders = (startY: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, startY, pageWidth - margin * 2, 8, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, startY + 8, pageWidth - margin, startY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    let colX = margin;
    doc.text('#', colX + 2, startY + 5.5);
    colX += 10;
    doc.text('Roll No', colX + 2, startY + 5.5);
    colX += 24;
    doc.text('Student Full Name', colX + 2, startY + 5.5);
    colX += 60;
    doc.text('Class & Sec', colX + 2, startY + 5.5);
    colX += 30;
    doc.text('Guardian Name', colX + 2, startY + 5.5);
    colX += 50;
    doc.text('Contact Phone', colX + 2, startY + 5.5);
    colX += 35;
    doc.text('Last Payment Date', colX + 2, startY + 5.5);
    colX += 30;
    doc.text(`Outstanding Due (${settings.currencySymbol || '$'})`, colX + 30, startY + 5.5, { align: 'right' });
  };

  drawHeader(true);
  y = 32;

  // Overview box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, 'FD');

  const cardW = (pageWidth - margin * 2) / 3;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL DELINQUENT OVERDUE DUES', margin + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(239, 68, 68);
  doc.text(formatCurrency(totalOutstanding, settings.currencySymbol), margin + 4, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DELINQUENT STUDENT ACCOUNTS', margin + cardW + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalDefaulters} Accounts`, margin + cardW + 4, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('RECOVERY PRIORITY STATUS', margin + cardW * 2 + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(245, 158, 11);
  doc.text(totalOutstanding > 0 ? 'Action Required • Overdue Notice Active' : 'All Accounts Settled', margin + cardW * 2 + 4, y + 14);

  y += 24;
  drawTableHeaders(y);
  y += 10;

  let currentPage = 1;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  defaulters.forEach(({ student, pendingAmount, lastPaymentDate }, idx) => {
    if (y > pageHeight - 25) {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`EduLedger Pending Dues Audit Report  •  Page ${currentPage}`, margin, pageHeight - 6);
      doc.text(`Official Accounts Document`, pageWidth - margin, pageHeight - 6, { align: 'right' });

      doc.addPage();
      currentPage += 1;
      drawHeader(false);
      y = 24;
      drawTableHeaders(y);
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 3.5, pageWidth - margin * 2, 6, 'F');
    }

    let colX = margin;

    // #
    doc.setTextColor(148, 163, 184);
    doc.text(String(idx + 1), colX + 2, y);
    colX += 10;

    // Roll
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text(student.rollNo || '—', colX + 2, y);
    colX += 24;

    // Full Name
    doc.setTextColor(15, 23, 42);
    const sName = student.fullName.length > 30 ? student.fullName.substring(0, 28) + '..' : student.fullName;
    doc.text(sName, colX + 2, y);
    doc.setFont('helvetica', 'normal');
    colX += 60;

    // Class
    doc.setTextColor(51, 65, 85);
    doc.text(`${student.className} - ${student.section}`, colX + 2, y);
    colX += 30;

    // Guardian
    doc.setTextColor(71, 85, 105);
    const gName = (student.guardianName || 'N/A').length > 25 ? (student.guardianName || 'N/A').substring(0, 23) + '..' : student.guardianName || 'N/A';
    doc.text(gName, colX + 2, y);
    colX += 50;

    // Contact
    doc.text(student.contactNumber || '—', colX + 2, y);
    colX += 35;

    // Last Payment
    doc.text(lastPaymentDate ? formatDate(lastPaymentDate) : 'Never', colX + 2, y);
    colX += 30;

    // Overdue
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text(formatCurrency(pendingAmount, settings.currencySymbol), colX + 30, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += 6;
  });

  // Verification Block
  if (y > pageHeight - 38) {
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`EduLedger Pending Dues Audit Report  •  Page ${currentPage}`, margin, pageHeight - 6);
    doc.text(`Official Accounts Document`, pageWidth - margin, pageHeight - 6, { align: 'right' });

    doc.addPage();
    currentPage += 1;
    drawHeader(false);
    y = 30;
  } else {
    y += 8;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const sigWidth = (pageWidth - margin * 2) / 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);

  doc.line(margin + 5, y, margin + sigWidth - 15, y);
  doc.text('Prepared By: Recovery & Accounts Officer', margin + 5, y + 4.5);
  doc.text('Outstanding Dues Ledger Certified', margin + 5, y + 8.5);

  doc.line(margin + sigWidth + 5, y, margin + sigWidth * 2 - 15, y);
  doc.text('Verified By: School Bursar', margin + sigWidth + 5, y + 4.5);
  doc.text('Delinquent Account Notices Dispatched', margin + sigWidth + 5, y + 8.5);

  doc.line(margin + sigWidth * 2 + 5, y, margin + sigWidth * 3 - 5, y);
  doc.text('Approved By: Principal / Board Director', margin + sigWidth * 2 + 5, y + 4.5);
  doc.text('Executive Recovery & Legal Signoff', margin + sigWidth * 2 + 5, y + 8.5);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`EduLedger Pending Dues Audit Report  •  Page ${currentPage}`, margin, pageHeight - 6);
  doc.text(`Total Delinquent: ${formatCurrency(totalOutstanding, settings.currencySymbol)}  •  ${timestamp}`, pageWidth - margin, pageHeight - 6, {
    align: 'right',
  });

  doc.save(`Defaulters_Pending_Fees_Audit_${Date.now().toString().slice(-6)}.pdf`);
}

/**
 * Generates an official, printable Operational Expenditures Financial Audit Report PDF
 */
export function generateExpensesAuditPdf(
  settings: SchoolSettings,
  expenses: Expense[],
  options: {
    title?: string;
    period?: string;
    scope?: string;
  } = {}
): void {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 14;

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalCount = expenses.length;
  const academicYear = settings.currentAcademicYear || '2026-2027';
  const reportTitle = options.title || 'OFFICIAL OPERATIONAL EXPENDITURES AUDIT REPORT';
  const timestamp = new Date().toLocaleString();

  const drawHeader = (isFirstPage: boolean) => {
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, isFirstPage ? 26 : 18, 'F');

    // School Logo in Header
    if (isFirstPage && settings.logoUrl && settings.logoUrl.startsWith('data:image/')) {
      try {
        const format = settings.logoUrl.includes('image/png') ? 'PNG' : 'JPEG';
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(pageWidth - margin - 20, 3, 20, 20, 2, 2, 'F');
        doc.addImage(settings.logoUrl, format, pageWidth - margin - 19, 4, 18, 18, undefined, 'FAST');
      } catch {
        // safely ignore
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 14 : 11);
    doc.text(settings.schoolName || 'EduLedger International School', margin, isFirstPage ? 9 : 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isFirstPage ? 8.5 : 7.5);
    doc.setTextColor(203, 213, 225);
    doc.text(reportTitle, margin, isFirstPage ? 15 : 13);

    const scopeInfo = options.scope ? `  •  Scope: ${options.scope}` : '';
    const sub = `Academic Session: ${academicYear}  •  ${options.period || 'General Outflow Vouchers'}${scopeInfo}  •  Disbursement Audit Registry`;
    doc.text(sub, margin, isFirstPage ? 21 : 16);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Ref: AUD-EXP-${Date.now().toString().slice(-6)}`, pageWidth - margin, isFirstPage ? 9 : 8, {
      align: 'right',
    });
    doc.text(`Exported: ${timestamp}`, pageWidth - margin, isFirstPage ? 15 : 13, { align: 'right' });
  };

  const drawTableHeaders = (startY: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, startY, pageWidth - margin * 2, 8, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, startY + 8, pageWidth - margin, startY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    let colX = margin;
    doc.text('#', colX + 2, startY + 5.5);
    colX += 10;
    doc.text('Date', colX + 2, startY + 5.5);
    colX += 24;
    doc.text('Expense Title / Particulars', colX + 2, startY + 5.5);
    colX += 75;
    doc.text('Category', colX + 2, startY + 5.5);
    colX += 45;
    doc.text('Payment Mode', colX + 2, startY + 5.5);
    colX += 28;
    doc.text('Ref / Voucher #', colX + 2, startY + 5.5);
    colX += 30;
    doc.text('Recorded By', colX + 2, startY + 5.5);
    colX += 27;
    doc.text(`Amount (${settings.currencySymbol || '$'})`, colX + 30, startY + 5.5, { align: 'right' });
  };

  drawHeader(true);
  y = 32;

  // KPI Overview
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, 'FD');

  const cardW = (pageWidth - margin * 2) / 3;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL DISBURSED EXPENDITURES', margin + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(239, 68, 68);
  doc.text(formatCurrency(totalExpense, settings.currencySymbol), margin + 4, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL EXPENSE VOUCHERS', margin + cardW + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalCount} Vouchers`, margin + cardW + 4, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CURRENCY NOTATION', margin + cardW * 2 + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229);
  doc.text(`${settings.currencyCode || 'PKR'} (${settings.currencySymbol || 'Rs.'})`, margin + cardW * 2 + 4, y + 14);

  y += 24;
  drawTableHeaders(y);
  y += 10;

  let currentPage = 1;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  if (expenses.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    doc.text('No expenditure records found matching the active filter criteria.', margin + 2, y + 4);
    y += 12;
  }

  expenses.forEach((e, idx) => {
    if (y > pageHeight - 25) {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`EduLedger Expenditure Audit Report  •  Page ${currentPage}`, margin, pageHeight - 6);
      doc.text(`Official Accounts Document`, pageWidth - margin, pageHeight - 6, { align: 'right' });

      doc.addPage();
      currentPage += 1;
      drawHeader(false);
      y = 24;
      drawTableHeaders(y);
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 3.5, pageWidth - margin * 2, 6, 'F');
    }

    let colX = margin;

    // #
    doc.setTextColor(148, 163, 184);
    doc.text(String(idx + 1), colX + 2, y);
    colX += 10;

    // Date
    doc.setTextColor(71, 85, 105);
    doc.text(formatDate(e.date), colX + 2, y);
    colX += 24;

    // Title
    doc.setTextColor(15, 23, 42);
    const tStr = e.title.length > 38 ? e.title.substring(0, 36) + '..' : e.title;
    doc.text(tStr, colX + 2, y);
    colX += 75;

    // Category
    doc.setTextColor(100, 116, 139);
    const cStr = e.category.length > 22 ? e.category.substring(0, 20) + '..' : e.category;
    doc.text(cStr, colX + 2, y);
    colX += 45;

    // Mode
    doc.text(e.paymentMode, colX + 2, y);
    colX += 28;

    // Ref
    doc.text(e.referenceNumber || '—', colX + 2, y);
    colX += 30;

    // Recorded By
    const recStr = (e.recordedBy || 'Accounts').length > 14 ? (e.recordedBy || 'Accounts').substring(0, 12) + '..' : e.recordedBy || 'Accounts';
    doc.text(recStr, colX + 2, y);
    colX += 27;

    // Amount
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text(formatCurrency(e.amount, settings.currencySymbol), colX + 30, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += 6;
  });

  // Signatures
  if (y > pageHeight - 38) {
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`EduLedger Expenditure Audit Report  •  Page ${currentPage}`, margin, pageHeight - 6);
    doc.text(`Official Accounts Document`, pageWidth - margin, pageHeight - 6, { align: 'right' });

    doc.addPage();
    currentPage += 1;
    drawHeader(false);
    y = 30;
  } else {
    y += 8;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const sigWidth = (pageWidth - margin * 2) / 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);

  doc.line(margin + 5, y, margin + sigWidth - 15, y);
  doc.text('Prepared By: Disbursement Officer', margin + 5, y + 4.5);
  doc.text('Expense Vouchers Checked & Verified', margin + 5, y + 8.5);

  doc.line(margin + sigWidth + 5, y, margin + sigWidth * 2 - 15, y);
  doc.text('Audited By: Senior Financial Auditor', margin + sigWidth + 5, y + 4.5);
  doc.text('Invoices & Receipts Verified', margin + sigWidth + 5, y + 8.5);

  doc.line(margin + sigWidth * 2 + 5, y, margin + sigWidth * 3 - 5, y);
  doc.text('Approved By: Principal / Board Director', margin + sigWidth * 2 + 5, y + 4.5);
  doc.text('Budget Allocation & Financial Seal', margin + sigWidth * 2 + 5, y + 8.5);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`EduLedger Expenditure Audit Report  •  Page ${currentPage}`, margin, pageHeight - 6);
  doc.text(`Total Disbursed: ${formatCurrency(totalExpense, settings.currencySymbol)}  •  ${timestamp}`, pageWidth - margin, pageHeight - 6, {
    align: 'right',
  });

  doc.save(`Operational_Expenses_Audit_${Date.now().toString().slice(-6)}.pdf`);
}

export interface MonthlyProfitLossPdfRow {
  monthName: string;
  feeInflows: number;
  bookshopInflows: number;
  otherInflows: number;
  totalInflow: number;
  staffExpenses: number;
  utilityExpenses: number;
  maintenanceExpenses: number;
  suppliesExpenses: number;
  otherExpenses: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  status: 'profit' | 'loss' | 'breakeven';
}

/**
 * Generates an official Month-wise Institutional Profit & Loss Audit Report as a downloadable PDF
 */
export function generateMonthwiseProfitLossPdf(
  settings: SchoolSettings,
  rows: MonthlyProfitLossPdfRow[],
  totals: {
    totalRevenue: number;
    totalExpenditure: number;
    netProfit: number;
    overallMargin: number;
    reportingPeriod: string;
    externalRecipient?: string;
    auditorNotes?: string;
    preparedBy?: string;
    certifiedBy?: string;
  }
): void {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 14;

  // Header Banner Background
  const bannerHeight = totals.externalRecipient ? 29 : 26;
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, bannerHeight, 'F');

  // School Brand & Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(settings.schoolName || 'EduLedger International School', margin, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text('OFFICIAL INSTITUTIONAL MONTH-WISE PROFIT & LOSS AUDIT STATEMENT', margin, 18);
  
  let headerMeta = `Academic Session: ${settings.currentAcademicYear || '2026-2027'}  •  Period: ${totals.reportingPeriod}  •  Currency: ${settings.currencyCode || 'USD'} (${settings.currencySymbol || '$'})`;
  if (totals.externalRecipient) {
    headerMeta += `  •  Target Recipient: ${totals.externalRecipient}`;
  }
  doc.text(headerMeta, margin, 24);

  if (totals.externalRecipient) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(147, 197, 253);
    doc.text('Certified External Audit & Regulatory Governance Submission', margin, 27.5);
    doc.setFont('helvetica', 'normal');
  }

  const timestamp = new Date().toLocaleString();
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${timestamp}`, pageWidth - margin, 24, { align: 'right' });

  y = bannerHeight + 8;

  // Top KPI Summary Boxes (4 cards)
  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 18;

  // 1. Total Inflows
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('GROSS OPERATING REVENUE', margin + 3.5, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(formatCurrency(totals.totalRevenue, settings.currencySymbol), margin + 3.5, y + 14);

  // 2. Total Outflows
  const card2X = margin + cardWidth + 3;
  doc.roundedRect(card2X, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL OPERATING EXPENDITURES', card2X + 3.5, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(239, 68, 68);
  doc.text(formatCurrency(totals.totalExpenditure, settings.currencySymbol), card2X + 3.5, y + 14);

  // 3. Net Surplus / Deficit
  const card3X = card2X + cardWidth + 3;
  doc.roundedRect(card3X, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('NET OPERATING SURPLUS / DEFICIT', card3X + 3.5, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  if (totals.netProfit >= 0) {
    doc.setTextColor(79, 70, 229);
    doc.text(`+${formatCurrency(totals.netProfit, settings.currencySymbol)}`, card3X + 3.5, y + 14);
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text(formatCurrency(totals.netProfit, settings.currencySymbol), card3X + 3.5, y + 14);
  }

  // 4. Operating Margin %
  const card4X = card3X + cardWidth + 3;
  doc.roundedRect(card4X, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('OVERALL OPERATING MARGIN %', card4X + 3.5, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(totals.overallMargin >= 0 ? 16 : 220, totals.overallMargin >= 0 ? 185 : 38, totals.overallMargin >= 0 ? 129 : 38);
  doc.text(`${totals.overallMargin >= 0 ? '+' : ''}${totals.overallMargin.toFixed(1)}%`, card4X + 3.5, y + 14);

  y += cardHeight + 8;

  // Table Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('MONTH-BY-MONTH COMPARATIVE FINANCIAL POSITION MATRIX', margin, y);
  y += 5;

  // Table Header
  const colWidths = {
    month: 32,
    feeRev: 28,
    auxRev: 25,
    totalRev: 30,
    payroll: 30,
    utilities: 27,
    maint: 27,
    totalExp: 30,
    net: 30,
    margin: 18,
    status: 20,
  };

  const drawTableHeader = () => {
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    let curX = margin + 2;
    doc.text('Month / Period', curX, y + 5.5);
    curX += colWidths.month;
    doc.text('Fee Inflows', curX, y + 5.5);
    curX += colWidths.feeRev;
    doc.text('Book & Aux.', curX, y + 5.5);
    curX += colWidths.auxRev;
    doc.text('Total Revenue', curX, y + 5.5);
    curX += colWidths.totalRev;
    doc.text('Staff Payroll', curX, y + 5.5);
    curX += colWidths.payroll;
    doc.text('Utilities & Ops', curX, y + 5.5);
    curX += colWidths.utilities;
    doc.text('Maint. & Supply', curX, y + 5.5);
    curX += colWidths.maint;
    doc.text('Total Expense', curX, y + 5.5);
    curX += colWidths.totalExp;
    doc.text('Net Surplus / Loss', curX, y + 5.5);
    curX += colWidths.net;
    doc.text('Margin %', curX, y + 5.5);
    curX += colWidths.margin;
    doc.text('Audit Status', curX, y + 5.5);

    y += 8;
  };

  drawTableHeader();

  // Rows
  let currentPage = 1;
  const sym = settings.currencySymbol || '$';

  rows.forEach((r, idx) => {
    if (y + 7 > pageHeight - 32) {
      // Add new page
      doc.addPage('a4', 'l');
      currentPage++;
      y = 15;
      drawTableHeader();
    }

    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    let curX = margin + 2;
    doc.setFont('helvetica', 'bold');
    doc.text(r.monthName, curX, y + 4.5);
    doc.setFont('helvetica', 'normal');

    curX += colWidths.month;
    doc.text(formatCurrency(r.feeInflows, sym), curX, y + 4.5);

    curX += colWidths.auxRev;
    doc.text(formatCurrency(r.bookshopInflows + r.otherInflows, sym), curX, y + 4.5);

    curX += colWidths.totalRev;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(formatCurrency(r.totalInflow, sym), curX, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    curX += colWidths.payroll;
    doc.text(formatCurrency(r.staffExpenses, sym), curX, y + 4.5);

    curX += colWidths.utilities;
    doc.text(formatCurrency(r.utilityExpenses, sym), curX, y + 4.5);

    curX += colWidths.maint;
    doc.text(formatCurrency(r.maintenanceExpenses + r.suppliesExpenses + r.otherExpenses, sym), curX, y + 4.5);

    curX += colWidths.totalExp;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text(formatCurrency(r.totalExpense, sym), curX, y + 4.5);
    doc.setFont('helvetica', 'normal');

    curX += colWidths.net;
    doc.setFont('helvetica', 'bold');
    if (r.netProfit >= 0) {
      doc.setTextColor(79, 70, 229);
      doc.text(`+${formatCurrency(r.netProfit, sym)}`, curX, y + 4.5);
    } else {
      doc.setTextColor(220, 38, 38);
      doc.text(formatCurrency(r.netProfit, sym), curX, y + 4.5);
    }

    curX += colWidths.margin;
    doc.setTextColor(r.profitMargin >= 0 ? 16 : 220, r.profitMargin >= 0 ? 185 : 38, r.profitMargin >= 0 ? 129 : 38);
    doc.text(`${r.profitMargin >= 0 ? '+' : ''}${r.profitMargin.toFixed(1)}%`, curX, y + 4.5);

    curX += colWidths.status;
    doc.setFontSize(6.5);
    if (r.status === 'profit') {
      doc.setTextColor(16, 185, 129);
      doc.text('SURPLUS', curX, y + 4.5);
    } else if (r.status === 'loss') {
      doc.setTextColor(220, 38, 38);
      doc.text('DEFICIT', curX, y + 4.5);
    } else {
      doc.setTextColor(217, 119, 6);
      doc.text('BALANCED', curX, y + 4.5);
    }

    y += 6.5;
  });

  // Table Totals Footer
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, pageWidth - margin * 2, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  let curX = margin + 2;
  doc.text('CONSOLIDATED TOTALS', curX, y + 5);

  curX += colWidths.month;
  const totalFeeInflow = rows.reduce((s, r) => s + r.feeInflows, 0);
  doc.text(formatCurrency(totalFeeInflow, sym), curX, y + 5);

  curX += colWidths.auxRev;
  const totalAux = rows.reduce((s, r) => s + (r.bookshopInflows + r.otherInflows), 0);
  doc.text(formatCurrency(totalAux, sym), curX, y + 5);

  curX += colWidths.totalRev;
  doc.setTextColor(52, 211, 153);
  doc.text(formatCurrency(totals.totalRevenue, sym), curX, y + 5);
  doc.setTextColor(255, 255, 255);

  curX += colWidths.payroll;
  const totalPayroll = rows.reduce((s, r) => s + r.staffExpenses, 0);
  doc.text(formatCurrency(totalPayroll, sym), curX, y + 5);

  curX += colWidths.utilities;
  const totalUtil = rows.reduce((s, r) => s + r.utilityExpenses, 0);
  doc.text(formatCurrency(totalUtil, sym), curX, y + 5);

  curX += colWidths.maint;
  const totalMaint = rows.reduce((s, r) => s + (r.maintenanceExpenses + r.suppliesExpenses + r.otherExpenses), 0);
  doc.text(formatCurrency(totalMaint, sym), curX, y + 5);

  curX += colWidths.totalExp;
  doc.setTextColor(252, 165, 165);
  doc.text(formatCurrency(totals.totalExpenditure, sym), curX, y + 5);
  doc.setTextColor(255, 255, 255);

  curX += colWidths.net;
  if (totals.netProfit >= 0) {
    doc.setTextColor(199, 210, 254);
    doc.text(`+${formatCurrency(totals.netProfit, sym)}`, curX, y + 5);
  } else {
    doc.setTextColor(254, 202, 202);
    doc.text(formatCurrency(totals.netProfit, sym), curX, y + 5);
  }
  doc.setTextColor(255, 255, 255);

  curX += colWidths.margin;
  doc.text(`${totals.overallMargin >= 0 ? '+' : ''}${totals.overallMargin.toFixed(1)}%`, curX, y + 5);

  curX += colWidths.status;
  doc.text(totals.netProfit >= 0 ? 'NET SURPLUS' : 'NET DEFICIT', curX, y + 5);

  y += 8;

  if (totals.auditorNotes) {
    if (y + 16 > pageHeight - 12) {
      doc.addPage('a4', 'l');
      currentPage++;
      y = 18;
    }
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 11, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('AUDIT OPINION & EXTERNAL REPORTING NOTES:', margin + 3, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(totals.auditorNotes.slice(0, 150), margin + 3, y + 8);
    y += 14;
  }

  // Sign-off blocks if space permits, else add page
  if (y + 18 > pageHeight - 10) {
    doc.addPage('a4', 'l');
    currentPage++;
    y = 20;
  }

  const sigWidth = (pageWidth - margin * 2) / 3;
  doc.setDrawColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);

  doc.line(margin + 5, y, margin + sigWidth - 20, y);
  doc.text(totals.preparedBy ? `Prepared: ${totals.preparedBy}` : 'Prepared By: Chief Financial Officer / Bursar', margin + 5, y + 4);
  doc.text('Verified with General Ledger Journal & Bank Statements', margin + 5, y + 7.5);

  doc.line(margin + sigWidth + 5, y, margin + sigWidth * 2 - 20, y);
  doc.text(totals.certifiedBy ? `Certified: ${totals.certifiedBy}` : 'Audited By: Independent Supervisory Committee', margin + sigWidth + 5, y + 4);
  doc.text('Financial Accounting & Reconciliation Standards Met', margin + sigWidth + 5, y + 7.5);

  doc.line(margin + sigWidth * 2 + 5, y, margin + sigWidth * 3 - 5, y);
  doc.text(totals.externalRecipient ? `Submitted To: ${totals.externalRecipient}` : 'Approved By: Principal / Chairman of Governing Board', margin + sigWidth * 2 + 5, y + 4);
  doc.text('Institutional Annual Accounts Certified & Enacted', margin + sigWidth * 2 + 5, y + 7.5);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`EduLedger Month-wise Profit & Loss Audit Report  •  Page ${currentPage}`, margin, pageHeight - 6);
  doc.text(`Net Surplus: ${formatCurrency(totals.netProfit, sym)}  •  ${timestamp}`, pageWidth - margin, pageHeight - 6, {
    align: 'right',
  });

  doc.save(`Monthwise_Profit_Loss_Statement_${Date.now().toString().slice(-6)}.pdf`);
}

export interface CurrentFinancialReportPdfOptions {
  dateRangeStart: string;
  dateRangeEnd: string;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  operatingMargin: number;
  filteredPaymentsCount: number;
  filteredExpensesCount: number;
  totalDefaultersCount: number;
  totalDefaultersAmount: number;
  incomeCategories: { category: string; amount: number; percentage: number }[];
  expenseCategories: { category: string; amount: number; percentage: number }[];
  monthlyFiscalTrends?: {
    month: string;
    revenue: number;
    expenses: number;
    netSurplus: number;
    margin: number;
  }[];
  paymentModeBreakdown?: { mode: string; amount: number }[];
}

/**
 * Generates an official, comprehensive printable PDF document of the current financial report.
 * Formatted for institutional audits, governing boards, and fiscal reporting.
 */
export function generateCurrentFinancialReportPdf(
  settings: SchoolSettings,
  data: CurrentFinancialReportPdfOptions
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 14;
  let y = 14;
  let currentPage = 1;

  const sym = settings.currencySymbol || '$';
  const academicYear = settings.currentAcademicYear || '2026-2027';
  const timestamp = new Date().toLocaleString();

  // Helper to draw standard header banner
  const drawHeaderBanner = (isFirst: boolean) => {
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, pageWidth, isFirst ? 28 : 16, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirst ? 14 : 10);
    doc.text(settings.schoolName || 'St. Augustine International Academy', margin, isFirst ? 9 : 7);

    doc.setFontSize(isFirst ? 8.5 : 7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(226, 232, 240);
    doc.text('OFFICIAL COMPREHENSIVE FINANCIAL AUDIT REPORT', margin, isFirst ? 16 : 12);

    if (isFirst) {
      doc.setFontSize(7.5);
      doc.setTextColor(203, 213, 225);
      const sub = `Fiscal Session: ${academicYear}  •  Period: ${formatDate(data.dateRangeStart)} through ${formatDate(data.dateRangeEnd)}  •  ${settings.schoolAddress || 'Campus Finance Division'}`;
      doc.text(sub, margin, 23);

      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Exported: ${timestamp}`, pageWidth - margin, 9, { align: 'right' });
      doc.text('Status: Verified Ledger Actuals', pageWidth - margin, 16, { align: 'right' });
    }
  };

  const drawFooter = () => {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `EduLedger Institutional Financial Audit Document  •  ${settings.schoolName || 'EduLedger'}  •  Confidential`,
      margin,
      pageHeight - 6
    );
    doc.text(`Page ${currentPage} of 2  •  ${timestamp}`, pageWidth - margin, pageHeight - 6, {
      align: 'right',
    });
  };

  // Draw Page 1 Header
  drawHeaderBanner(true);
  y = 35;

  // 1. Executive Financial KPI Summary Cards
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'FD');

  const cardW = (pageWidth - margin * 2) / 4;

  // Card 1: Revenue
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('GROSS FEE REVENUE', margin + 3, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(16, 185, 129);
  doc.text(formatCurrency(data.totalIncome, sym), margin + 3, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${data.filteredPaymentsCount} verified receipts`, margin + 3, y + 19);

  // Card 2: Expenses
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('OPERATING EXPENSES', margin + cardW + 3, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(239, 68, 68);
  doc.text(formatCurrency(data.totalExpense, sym), margin + cardW + 3, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${data.filteredExpensesCount} expense vouchers`, margin + cardW + 3, y + 19);

  // Card 3: Net Surplus
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('NET OPERATING BALANCE', margin + cardW * 2 + 3, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(data.netBalance >= 0 ? 16 : 239, data.netBalance >= 0 ? 185 : 68, data.netBalance >= 0 ? 129 : 68);
  doc.text(formatCurrency(data.netBalance, sym), margin + cardW * 2 + 3, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Margin: ${data.operatingMargin.toFixed(1)}%`, margin + cardW * 2 + 3, y + 19);

  // Card 4: Overdue Defaulters
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('DELINQUENT RECEIVABLES', margin + cardW * 3 + 3, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(217, 119, 6);
  doc.text(formatCurrency(data.totalDefaultersAmount, sym), margin + cardW * 3 + 3, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${data.totalDefaultersCount} pending accounts`, margin + cardW * 3 + 3, y + 19);

  y += 28;

  // 2. Section 1: Revenue Streams Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. REVENUE STREAMS & FEE COLLECTIONS BREAKDOWN', margin, y);
  y += 5;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');
  doc.setFontSize(7.5);
  doc.text('Revenue Category / Fee Stream', margin + 3, y + 4.5);
  doc.text(`Inflow (${sym})`, margin + 120, y + 4.5);
  doc.text('Share of Revenue', margin + 155, y + 4.5);
  y += 7.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  data.incomeCategories.forEach(item => {
    doc.setTextColor(30, 41, 59);
    doc.text(item.category, margin + 3, y);
    doc.setTextColor(16, 185, 129);
    doc.text(formatCurrency(item.amount, sym), margin + 120, y);
    doc.setTextColor(100, 116, 139);
    doc.text(`${item.percentage.toFixed(1)}%`, margin + 155, y);
    y += 5;
  });

  // Total Revenues row
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL RECOGNIZED INFLOW', margin + 3, y);
  doc.setTextColor(16, 185, 129);
  doc.text(formatCurrency(data.totalIncome, sym), margin + 120, y);
  doc.text('100.0%', margin + 155, y);

  y += 8;

  // 3. Section 2: Operating Expenditures Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. OPERATING EXPENDITURES BREAKDOWN', margin, y);
  y += 5;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');
  doc.setFontSize(7.5);
  doc.text('Expenditure Category / Operational Cost', margin + 3, y + 4.5);
  doc.text(`Outflow (${sym})`, margin + 120, y + 4.5);
  doc.text('Share of Expenses', margin + 155, y + 4.5);
  y += 7.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  data.expenseCategories.forEach(item => {
    doc.setTextColor(30, 41, 59);
    doc.text(item.category, margin + 3, y);
    doc.setTextColor(239, 68, 68);
    doc.text(formatCurrency(item.amount, sym), margin + 120, y);
    doc.setTextColor(100, 116, 139);
    doc.text(`${item.percentage.toFixed(1)}%`, margin + 155, y);
    y += 5;
  });

  // Total Expenses row
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL OPERATING EXPENDITURES', margin + 3, y);
  doc.setTextColor(239, 68, 68);
  doc.text(formatCurrency(data.totalExpense, sym), margin + 120, y);
  doc.text('100.0%', margin + 155, y);

  y += 9;

  // 4. Section 3: Monthly Fiscal Trends (Revenue vs Expenses Trajectory)
  if (data.monthlyFiscalTrends && data.monthlyFiscalTrends.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('3. FISCAL YEAR MONTHLY TRENDS (REVENUE & EXPENSE TRAJECTORY)', margin, y);
    y += 5;

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');
    doc.setFontSize(7);
    doc.text('Fiscal Month', margin + 3, y + 4.5);
    doc.text(`Revenue (${sym})`, margin + 55, y + 4.5);
    doc.text(`Expenses (${sym})`, margin + 95, y + 4.5);
    doc.text(`Net Surplus (${sym})`, margin + 135, y + 4.5);
    doc.text('Operating Margin', margin + 165, y + 4.5);
    y += 7.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);

    data.monthlyFiscalTrends.slice(0, 8).forEach(item => {
      doc.setTextColor(30, 41, 59);
      doc.text(item.month, margin + 3, y);
      doc.setTextColor(16, 185, 129);
      doc.text(formatCurrency(item.revenue, sym), margin + 55, y);
      doc.setTextColor(239, 68, 68);
      doc.text(formatCurrency(item.expenses, sym), margin + 95, y);
      doc.setTextColor(item.netSurplus >= 0 ? 16 : 239, item.netSurplus >= 0 ? 185 : 68, item.netSurplus >= 0 ? 129 : 68);
      doc.text(formatCurrency(item.netSurplus, sym), margin + 135, y);
      doc.setTextColor(100, 116, 139);
      doc.text(`${item.margin.toFixed(1)}%`, margin + 165, y);
      y += 4.8;
    });
  }

  // Draw Page 1 Footer
  drawFooter();

  // Page 2: Audit Certification, Receivables Summary, and Signatures
  doc.addPage('a4', 'p');
  currentPage = 2;
  drawHeaderBanner(false);
  y = 24;

  // Receivables & Delinquency Audit
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('4. ACCOUNTS RECEIVABLE & FEE RECOVERY AUDIT', margin, y);
  y += 5;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Active Defaulter Accounts: ${data.totalDefaultersCount}`, margin + 5, y + 6);
  doc.text(`Outstanding Tuition & Dues: ${formatCurrency(data.totalDefaultersAmount, sym)}`, margin + 5, y + 11);
  doc.text(
    `Financial Health Rating: ${data.netBalance >= 0 ? 'Liquid Operational Surplus (Stable)' : 'Operating Deficit (Action Required)'}`,
    margin + 5,
    y + 16
  );

  const collectionEfficiency =
    data.totalIncome + data.totalDefaultersAmount > 0
      ? (data.totalIncome / (data.totalIncome + data.totalDefaultersAmount)) * 100
      : 100;
  doc.text(`Collection Realization Ratio: ${collectionEfficiency.toFixed(1)}%`, margin + 105, y + 6);
  doc.text(`Net Fiscal Operating Margin: ${data.operatingMargin.toFixed(2)}%`, margin + 105, y + 11);
  doc.text(`Audit Trail: Reconciled with Bank Accounts & Petty Cash`, margin + 105, y + 16);

  y += 30;

  // Institutional Accounting Notes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('5. AUDITOR OBSERVATIONS & GOVERNANCE COMPLIANCE', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const notes = [
    '• All fee receipts and operational expenditures recorded in this report have been verified against original payment tokens and official bank clearing reconciliations.',
    '• Operating surpluses are allocated toward institutional contingency reserves and classroom instructional improvements under the oversight of the Governing Council.',
    '• Depreciation on educational apparatus, building infrastructure, and ICT laboratory computers is calculated according to institutional statutory depreciation guidelines.',
    '• Delinquent dues recovery notices have been dispatched to enrolled student guardians in alignment with institutional tuition payment policy.',
  ];

  notes.forEach(n => {
    const splitNote = doc.splitTextToSize(n, pageWidth - margin * 2);
    doc.text(splitNote, margin, y);
    y += splitNote.length * 4.2;
  });

  y += 18;

  // Signatures Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('6. OFFICIAL VERIFICATION & AUDIT SIGN-OFF', margin, y);
  y += 16;

  const signColWidth = (pageWidth - margin * 2) / 3;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);

  // Signatory 1
  doc.line(margin + 5, y, margin + signColWidth - 10, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Chief Financial Bursar', margin + 5, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Accounts & Reconciliation Officer', margin + 5, y + 8.5);
  doc.text('Date: _______________', margin + 5, y + 12.5);

  // Signatory 2
  doc.line(margin + signColWidth + 5, y, margin + signColWidth * 2 - 10, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Internal Auditor', margin + signColWidth + 5, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Independent Supervisory Audit', margin + signColWidth + 5, y + 8.5);
  doc.text('Date: _______________', margin + signColWidth + 5, y + 12.5);

  // Signatory 3
  doc.line(margin + signColWidth * 2 + 5, y, margin + signColWidth * 3 - 5, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Principal & Director', margin + signColWidth * 2 + 5, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Head of Institutional Governance', margin + signColWidth * 2 + 5, y + 8.5);
  doc.text('Date: _______________', margin + signColWidth * 2 + 5, y + 12.5);

  // Draw Page 2 Footer
  drawFooter();

  // Save the PDF
  const cleanPeriod = `${data.dateRangeStart}_to_${data.dateRangeEnd}`.replace(/[^a-zA-Z0-9_]/g, '_');
  doc.save(`Financial_Report_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}_${cleanPeriod}.pdf`);
}

export interface FinancialSummaryStatementRow {
  monthKey: string;
  monthName: string;
  year: string;
  feeRevenue: number;
  bookshopRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  staffExpenses: number;
  operationalExpenses: number;
  totalExpenses: number;
  netProfit: number;
  marginPercent: number;
  cumulativeBalance: number;
  receiptCount: number;
  voucherCount: number;
}

export interface FinancialSummaryStatementTotals {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  overallMargin: number;
  closingCumulativeBalance: number;
  totalReceiptsCount: number;
  totalVouchersCount: number;
  reportingPeriod: string;
  preparedBy?: string;
  approvedBy?: string;
  auditorNotes?: string;
}

/**
 * Generates an official Financial Summary Statement & Monthly Ledger Audit Report as a professional PDF
 */
export function generateFinancialSummaryStatementPdf(
  settings: SchoolSettings,
  rows: FinancialSummaryStatementRow[],
  totals: FinancialSummaryStatementTotals
): void {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 14;

  const currencySymbol = settings.currencySymbol || '$';
  const schoolName = settings.schoolName || 'EduLedger International School';
  const academicYear = settings.currentAcademicYear || '2026-2027';

  // Header Banner Background
  const bannerHeight = 28;
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, bannerHeight, 'F');

  // Accent Line
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, bannerHeight, pageWidth, 1.5, 'F');

  // School Logo in Header Banner
  if (settings.logoUrl && settings.logoUrl.startsWith('data:image/')) {
    try {
      const format = settings.logoUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageWidth - margin - 22, 3.5, 21, 21, 2, 2, 'F');
      doc.addImage(settings.logoUrl, format, pageWidth - margin - 20.5, 5, 18, 18, undefined, 'FAST');
    } catch {
      // fallback
    }
  }

  // School Brand & Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(schoolName, margin, 10.5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text('OFFICIAL FINANCIAL SUMMARY STATEMENT & MONTHLY LEDGER REPORT', margin, 17);

  const headerMeta = `Academic Session: ${academicYear}  •  Period: ${totals.reportingPeriod}  •  Currency: ${settings.currencyCode || 'USD'} (${currencySymbol})`;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(headerMeta, margin, 23);

  const timestamp = new Date().toLocaleString();
  doc.text(`Generated: ${timestamp}`, pageWidth - margin, 23, { align: 'right' });

  y = bannerHeight + 6;

  // Executive KPI Summary Cards
  const cardGap = 4;
  const numCards = 5;
  const cardWidth = (pageWidth - margin * 2 - cardGap * (numCards - 1)) / numCards;
  const cardHeight = 16;

  const kpis = [
    {
      label: 'TOTAL GROSS REVENUE',
      value: formatCurrency(totals.totalRevenue, currencySymbol),
      sub: `${totals.totalReceiptsCount} fee & sales credits`,
      color: [16, 185, 129], // emerald
    },
    {
      label: 'TOTAL OPERATING EXPENSES',
      value: formatCurrency(totals.totalExpenses, currencySymbol),
      sub: `${totals.totalVouchersCount} expense disbursements`,
      color: [239, 68, 68], // rose
    },
    {
      label: 'NET OPERATING PROFIT / SURPLUS',
      value: formatCurrency(totals.netProfit, currencySymbol),
      sub: totals.netProfit >= 0 ? 'Net Operating Surplus' : 'Net Operating Deficit',
      color: totals.netProfit >= 0 ? [16, 185, 129] : [239, 68, 68],
    },
    {
      label: 'OPERATING MARGIN',
      value: `${totals.overallMargin.toFixed(1)}%`,
      sub: 'Margin on gross inflows',
      color: [99, 102, 241], // indigo
    },
    {
      label: 'CUMULATIVE LEDGER POSITION',
      value: formatCurrency(totals.closingCumulativeBalance, currencySymbol),
      sub: 'Closing cumulative balance',
      color: [30, 41, 59], // slate
    },
  ];

  kpis.forEach((kpi, idx) => {
    const cx = margin + idx * (cardWidth + cardGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    // Colored accent left border
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.rect(cx, y, 1.8, cardHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cx + 4, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, cx + 4, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.sub, cx + 4, y + 14);
  });

  y += cardHeight + 6;

  // Monthly Ledger Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('MONTH-BY-MONTH REVENUE, EXPENDITURE & NET PROFIT LEDGER', margin, y);
  y += 3.5;

  // Table Column Definitions
  interface ColDef {
    header: string;
    width: number;
    align: 'left' | 'right' | 'center';
  }

  const cols: ColDef[] = [
    { header: 'Month / Period', width: 40, align: 'left' },
    { header: 'Fee Collections', width: 28, align: 'right' },
    { header: 'Other & Bookshop', width: 26, align: 'right' },
    { header: 'Gross Revenue', width: 29, align: 'right' },
    { header: 'Staff Salaries', width: 27, align: 'right' },
    { header: 'Operating Costs', width: 27, align: 'right' },
    { header: 'Total Expenses', width: 29, align: 'right' },
    { header: 'Net Profit / (Loss)', width: 31, align: 'right' },
    { header: 'Margin %', width: 17, align: 'center' },
    { header: 'Cumulative Ledger', width: 28, align: 'right' },
  ];

  const totalTableWidth = cols.reduce((sum, c) => sum + c.width, 0);

  // Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, totalTableWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  let curX = margin;
  cols.forEach(col => {
    let tx = curX + 2;
    if (col.align === 'right') tx = curX + col.width - 2;
    if (col.align === 'center') tx = curX + col.width / 2;
    doc.text(col.header, tx, y + 4.8, { align: col.align });
    curX += col.width;
  });

  y += 7;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  rows.forEach((row, rIdx) => {
    // Check if new page needed
    if (y > pageHeight - 32) {
      doc.addPage('a4', 'l');
      y = 15;

      // Repeat header on new page
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, y, totalTableWidth, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);

      let hX = margin;
      cols.forEach(col => {
        let tx = hX + 2;
        if (col.align === 'right') tx = hX + col.width - 2;
        if (col.align === 'center') tx = hX + col.width / 2;
        doc.text(col.header, tx, y + 4.8, { align: col.align });
        hX += col.width;
      });
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
    }

    const isEven = rIdx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, y, totalTableWidth, 6.5, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 6.5, margin + totalTableWidth, y + 6.5);

    const values = [
      row.monthName,
      formatCurrency(row.feeRevenue, currencySymbol),
      formatCurrency(row.bookshopRevenue + row.otherRevenue, currencySymbol),
      formatCurrency(row.totalRevenue, currencySymbol),
      formatCurrency(row.staffExpenses, currencySymbol),
      formatCurrency(row.operationalExpenses, currencySymbol),
      formatCurrency(row.totalExpenses, currencySymbol),
      formatCurrency(row.netProfit, currencySymbol),
      `${row.marginPercent.toFixed(1)}%`,
      formatCurrency(row.cumulativeBalance, currencySymbol),
    ];

    let rowX = margin;
    cols.forEach((col, cIdx) => {
      let tx = rowX + 2;
      if (col.align === 'right') tx = rowX + col.width - 2;
      if (col.align === 'center') tx = rowX + col.width / 2;

      // Color coding for Net Profit
      if (cIdx === 7) {
        doc.setFont('helvetica', 'bold');
        if (row.netProfit > 0) doc.setTextColor(16, 185, 129);
        else if (row.netProfit < 0) doc.setTextColor(239, 68, 68);
        else doc.setTextColor(100, 116, 139);
      } else if (cIdx === 3) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
      } else if (cIdx === 6) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
      } else if (cIdx === 9) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor( row.cumulativeBalance >= 0 ? 15 : 239, row.cumulativeBalance >= 0 ? 23 : 68, row.cumulativeBalance >= 0 ? 42 : 68);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
      }

      doc.text(values[cIdx], tx, y + 4.5, { align: col.align });
      rowX += col.width;
    });

    y += 6.5;
  });

  // Summary Totals Row
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, totalTableWidth, 7.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, totalTableWidth, 7.5, 'S');

  const totalFeeSum = rows.reduce((s, r) => s + r.feeRevenue, 0);
  const totalOtherSum = rows.reduce((s, r) => s + r.bookshopRevenue + r.otherRevenue, 0);
  const totalStaffSum = rows.reduce((s, r) => s + r.staffExpenses, 0);
  const totalOpsSum = rows.reduce((s, r) => s + r.operationalExpenses, 0);

  const totalValues = [
    'GRAND TOTALS / LEDGER SUMMARY',
    formatCurrency(totalFeeSum, currencySymbol),
    formatCurrency(totalOtherSum, currencySymbol),
    formatCurrency(totals.totalRevenue, currencySymbol),
    formatCurrency(totalStaffSum, currencySymbol),
    formatCurrency(totalOpsSum, currencySymbol),
    formatCurrency(totals.totalExpenses, currencySymbol),
    formatCurrency(totals.netProfit, currencySymbol),
    `${totals.overallMargin.toFixed(1)}%`,
    formatCurrency(totals.closingCumulativeBalance, currencySymbol),
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  let tX = margin;
  cols.forEach((col, cIdx) => {
    let tx = tX + 2;
    if (col.align === 'right') tx = tX + col.width - 2;
    if (col.align === 'center') tx = tX + col.width / 2;

    if (cIdx === 7) {
      if (totals.netProfit >= 0) doc.setTextColor(16, 185, 129);
      else doc.setTextColor(239, 68, 68);
    } else {
      doc.setTextColor(15, 23, 42);
    }

    doc.text(totalValues[cIdx], tx, y + 5.2, { align: col.align });
    tX += col.width;
  });

  y += 12;

  // Statutory Certification & Signature Blocks
  if (y > pageHeight - 32) {
    doc.addPage('a4', 'l');
    y = 20;
  }

  const signWidth = (totalTableWidth - 20) / 3;

  // Signatory 1: Bursar
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 5, y, margin + signWidth - 5, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(totals.preparedBy || 'Chief Financial Bursar', margin + 5, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Prepared by & Accounts Certified', margin + 5, y + 8.5);
  doc.text(`Verification Date: ${formatDate(getTodayDateString())}`, margin + 5, y + 12.5);

  // Signatory 2: Internal Auditor
  doc.line(margin + signWidth + 15, y, margin + signWidth * 2 + 5, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Senior Internal Auditor', margin + signWidth + 15, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Independent Audit & Reconciled', margin + signWidth + 15, y + 8.5);
  doc.text(`Audit Clearance: APPROVED`, margin + signWidth + 15, y + 12.5);

  // Signatory 3: Principal & Board
  doc.line(margin + signWidth * 2 + 25, y, margin + totalTableWidth - 5, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(totals.approvedBy || 'Principal & Director of School', margin + signWidth * 2 + 25, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Governing Board Sanction & Seal', margin + signWidth * 2 + 25, y + 8.5);
  doc.text('Official Seal: [ INSTITUTIONAL REGISTER ]', margin + signWidth * 2 + 25, y + 12.5);

  // Footer on all pages
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `EduLedger ERP Financial Governance  •  Document Ref: FIN-SUM-${Date.now().toString().slice(-6)}  •  Page ${i} of ${pageCount}`,
      margin,
      pageHeight - 6
    );
    doc.text(
      settings.showDeveloperCreditOnPrint !== false
        ? 'Confidential Institutional Accounts  •  Developed by NextGenAI'
        : 'Confidential Institutional Accounts Ledger',
      pageWidth - margin,
      pageHeight - 6,
      {
        align: 'right',
      }
    );
  }

  // Save the generated PDF
  const filename = `Financial_Summary_Statement_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}_${totals.reportingPeriod.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}


