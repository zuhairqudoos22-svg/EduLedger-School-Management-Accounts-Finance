import jsPDF from 'jspdf';
import { SchoolSettings, FeePayment, Student, Staff } from '../types';
import { formatCurrency, formatDate } from './formatters';

export type PaperSizeFormat = 'a4' | 'a5' | 'a6';

export interface FeeVoucherPdfOptions {
  layout?: '2-per-page' | '1-per-page';
  paperSize?: PaperSizeFormat;
  orientation?: 'p' | 'portrait' | 'l' | 'landscape';
  dueDate?: string;
  notes?: string;
}

export interface PaySlipPdfOptions {
  layout?: '2-per-page' | '1-per-page';
  paperSize?: PaperSizeFormat;
  orientation?: 'p' | 'portrait';
  notes?: string;
}

export interface PaySlipData {
  staff: Staff;
  selectedMonth: string;
  isPaid: boolean;
  paidDate?: string;
  paymentRef?: string;
  paymentMode?: string;
  basicSalary?: number;
  allowances?: number;
  deductions?: number;
  bonus?: number;
  netSalary?: number;
}

/**
 * Draws a single fee voucher inside a designated bounding box on a jsPDF page.
 * Box: (x, y, width, height) in mm
 */
function drawSingleFeeVoucher(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  receipt: FeePayment,
  settings: SchoolSettings,
  student?: Student | null
): void {
  const pad = 6;
  const innerX = x + pad;
  const innerY = y + pad;
  const innerW = width - pad * 2;

  // Outer border with subtle rounded styling
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.roundedRect(x + 1, y + 1, width - 2, height - 2, 2.5, 2.5, 'S');

  // Top institution header bar
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(x + 1, y + 1, width - 2, 2.5, 'F');

  // Institution Branding & Voucher Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  const schoolName = (settings.schoolName || 'St. Augustine International Academy').toUpperCase();
  doc.text(schoolName, innerX, innerY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  const subline = `${settings.schoolTagline || 'Excellence in Education'} • Tel: ${settings.schoolPhone || '+92 51 1234567'}`;
  doc.text(subline, innerX, innerY + 8);

  // Voucher Badge & Number on Right
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.setDrawColor(199, 210, 254); // indigo-200
  doc.roundedRect(x + width - pad - 42, innerY, 42, 11, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(67, 56, 202); // indigo-700
  doc.text('OFFICIAL FEE VOUCHER', x + width - pad - 21, innerY + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(`No: ${receipt.receiptNumber}`, x + width - pad - 21, innerY + 8.5, { align: 'center' });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(innerX, innerY + 12, innerX + innerW, innerY + 12);

  // Student & Payment Details Box (2 Columns)
  const metaY = innerY + 15;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(innerX, metaY, innerW, 18, 1.5, 1.5, 'F');

  doc.setFontSize(7.5);
  // Column 1
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Student Name:', innerX + 3, metaY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.studentName || 'Student Record', innerX + 24, metaY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Roll / ID No:', innerX + 3, metaY + 9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const roll = student?.rollNo || receipt.studentId || '2026-N/A';
  doc.text(roll, innerX + 24, metaY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Guardian:', innerX + 3, metaY + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const guardian = student?.guardianName || 'Parent / Guardian';
  doc.text(guardian, innerX + 24, metaY + 13.5);

  // Column 2
  const col2X = innerX + innerW / 2 + 2;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Class & Sec:', col2X, metaY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${receipt.className} — Section ${receipt.section}`, col2X + 20, metaY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Billing Month:', col2X, metaY + 9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.monthFor || 'Current Term', col2X + 20, metaY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Issue Date:', col2X, metaY + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(formatDate(receipt.date), col2X + 20, metaY + 13.5);

  // Fee Particulars Table
  const tableY = metaY + 21;
  const tableH = 34;
  doc.setFillColor(241, 245, 249);
  doc.rect(innerX, tableY, innerW, 6, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(innerX, tableY + 6, innerX + innerW, tableY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('#', innerX + 3, tableY + 4.2);
  doc.text('Fee Head / Particulars', innerX + 12, tableY + 4.2);
  doc.text('Payment Channel', innerX + innerW - 48, tableY + 4.2);
  doc.text('Amount', innerX + innerW - 4, tableY + 4.2, { align: 'right' });

  // Rows
  let curY = tableY + 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);

  const breakdown =
    receipt.feeBreakdown && receipt.feeBreakdown.length > 0
      ? receipt.feeBreakdown
      : [{ headName: 'Tuition & Academic Term Charges', amount: receipt.totalAmount }];

  const maxVisibleHeads = 4;
  const displayItems = breakdown.slice(0, maxVisibleHeads);

  displayItems.forEach((item, idx) => {
    doc.text(String(idx + 1), innerX + 3, curY);
    doc.text(item.headName, innerX + 12, curY);
    doc.text(idx === 0 ? receipt.paymentMode : '—', innerX + innerW - 48, curY);
    doc.text(formatCurrency(item.amount, settings.currencySymbol), innerX + innerW - 4, curY, {
      align: 'right',
    });
    curY += 5.5;
  });

  if (breakdown.length > maxVisibleHeads) {
    const remCount = breakdown.length - maxVisibleHeads;
    const remTotal = breakdown.slice(maxVisibleHeads).reduce((acc, curr) => acc + curr.amount, 0);
    doc.text(`+ ${remCount} other ancillary heads`, innerX + 12, curY);
    doc.text(formatCurrency(remTotal, settings.currencySymbol), innerX + innerW - 4, curY, {
      align: 'right',
    });
    curY += 5.5;
  }

  // Total Summary Row
  const totalRowY = tableY + tableH;
  doc.setFillColor(238, 242, 255);
  doc.rect(innerX, totalRowY, innerW, 7, 'F');
  doc.setDrawColor(99, 102, 241);
  doc.line(innerX, totalRowY, innerX + innerW, totalRowY);
  doc.line(innerX, totalRowY + 7, innerX + innerW, totalRowY + 7);

  // If discount applied, display on the left side of summary row
  if (receipt.discount_amount && receipt.discount_amount > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(180, 83, 9);
    doc.text(
      `Concession: -${formatCurrency(receipt.discount_amount, settings.currencySymbol)} (${receipt.discount_reason || 'Scholarship'}) • Saved!`,
      innerX + 3,
      totalRowY + 4.5
    );
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('TOTAL AMOUNT PAID:', innerX + innerW - 55, totalRowY + 5);
  doc.setTextColor(67, 56, 202);
  doc.text(formatCurrency(receipt.totalAmount, settings.currencySymbol), innerX + innerW - 4, totalRowY + 5, {
    align: 'right',
  });

  // Footer / Authorization & Stamp
  const footY = totalRowY + 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Collected by: ${receipt.collectedBy || 'Accounts Bureau'} • Verified System Voucher`,
    innerX,
    footY
  );
  if (receipt.remarks) {
    doc.text(`Remarks: ${receipt.remarks}`, innerX, footY + 4);
  } else {
    doc.text(
      'Payment is non-refundable. Please preserve this computer-generated voucher for your records.',
      innerX,
      footY + 4
    );
  }

  if (settings.showDeveloperCreditOnPrint !== false) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(148, 163, 184);
    doc.text('Developed by NextGenAI', innerX, footY + 7.5);
  }

  // Signature Line on Right
  doc.setDrawColor(148, 163, 184);
  doc.line(innerX + innerW - 42, footY + 4, innerX + innerW, footY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Authorized Signature & Stamp', innerX + innerW - 21, footY + 8, { align: 'center' });
}

/**
 * Generates an official, print-ready PDF containing fee vouchers.
 * Supports Paper-Saving 2-per-page A4 layout with dashed cutting lines!
 */
export function generateFeeVouchersPdf(
  receipts: FeePayment[],
  settings: SchoolSettings,
  studentsMap: Record<string, Student> = {},
  options: FeeVoucherPdfOptions = {}
): jsPDF {
  const paper = options.paperSize || 'a4';
  const layout = paper === 'a6' ? '1-per-page' : (options.layout || '2-per-page');
  const doc = new jsPDF('p', 'mm', paper);

  const pageWidth = paper === 'a4' ? 210 : paper === 'a5' ? 148 : 105;
  const pageHeight = paper === 'a4' ? 297 : paper === 'a5' ? 210 : 148;
  const marginX = paper === 'a6' ? 5 : paper === 'a5' ? 8 : 10;
  const marginY = paper === 'a6' ? 5 : 8;
  const usableWidth = pageWidth - marginX * 2;

  if (layout === '2-per-page' && paper !== 'a6') {
    // 2 Vouchers Per Page (Paper Saver - A4 or A5)
    const gap = paper === 'a5' ? 6 : 10;
    const voucherHeight = (pageHeight - marginY * 2 - gap) / 2;

    for (let i = 0; i < receipts.length; i++) {
      const slotIndex = i % 2; // 0 = top, 1 = bottom

      if (i > 0 && slotIndex === 0) {
        doc.addPage();
      }

      const receipt = receipts[i];
      const student =
        studentsMap[receipt.studentId] ||
        Object.values(studentsMap).find(s => s.fullName === receipt.studentName) ||
        null;

      const yPos = marginY + slotIndex * (voucherHeight + gap);

      // Draw Voucher
      drawSingleFeeVoucher(doc, marginX, yPos, usableWidth, voucherHeight, receipt, settings, student);

      // If top voucher and there's space for a middle cutting line
      if (slotIndex === 0) {
        const cutY = marginY + voucherHeight + gap / 2;
        doc.setDrawColor(148, 163, 184); // slate-400
        doc.setLineDashPattern([2, 2], 0);
        doc.line(marginX, cutY, marginX + usableWidth, cutY);
        doc.setLineDashPattern([], 0); // reset dash

        // Scissor cutting icon / text label
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text('✂ - - - - - - - - - - - - - - - - - - - - Cut Along Dashed Line - - - - - - - - - - - - - - - - - - - - ✂', pageWidth / 2, cutY + 1.2, {
          align: 'center',
        });
      }
    }
  } else {
    // 1 Voucher Per Page (A4, A5, or A6)
    const voucherHeight = pageHeight - marginY * 2 - (paper === 'a4' ? 30 : 10);

    for (let i = 0; i < receipts.length; i++) {
      if (i > 0) doc.addPage();
      const receipt = receipts[i];
      const student =
        studentsMap[receipt.studentId] ||
        Object.values(studentsMap).find(s => s.fullName === receipt.studentName) ||
        null;

      const yPos = paper === 'a4' ? marginY + 15 : marginY + 5;
      drawSingleFeeVoucher(doc, marginX, yPos, usableWidth, voucherHeight, receipt, settings, student);
    }
  }

  return doc;
}

/**
 * Downloads the Fee Vouchers PDF with appropriate file naming
 */
export function downloadFeeVouchersPdf(
  receipts: FeePayment[],
  settings: SchoolSettings,
  studentsMap: Record<string, Student> = {},
  options: FeeVoucherPdfOptions = {},
  filename?: string
): void {
  const doc = generateFeeVouchersPdf(receipts, settings, studentsMap, options);
  const layoutLabel = options.layout === '1-per-page' ? 'FullPage' : '2PerA4';
  const name =
    filename ||
    (receipts.length === 1
      ? `Fee_Voucher_${receipts[0].receiptNumber}_${receipts[0].studentName.replace(/\s+/g, '_')}.pdf`
      : `Fee_Vouchers_Batch_${receipts.length}_${layoutLabel}.pdf`);
  doc.save(name);
}

/**
 * Draws a single employee pay slip in a designated bounding box.
 */
function drawSinglePaySlip(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  data: PaySlipData,
  settings: SchoolSettings
): void {
  const pad = 6;
  const innerX = x + pad;
  const innerY = y + pad;
  const innerW = width - pad * 2;

  // Outer border with subtle rounded styling
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(x + 1, y + 1, width - 2, height - 2, 2.5, 2.5, 'S');

  // Top header color accent bar (Emerald for salary/payroll)
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(x + 1, y + 1, width - 2, 2.5, 'F');

  // Institution Branding & Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const schoolName = (settings.schoolName || 'St. Augustine International Academy').toUpperCase();
  doc.text(schoolName, innerX, innerY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Institutional Payroll & Human Resources Directorate', innerX, innerY + 8);

  // Pay Slip Badge on Right
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(x + width - pad - 46, innerY, 46, 11, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('SALARY PAY SLIP', x + width - pad - 23, innerY + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(data.selectedMonth || 'Salary Period', x + width - pad - 23, innerY + 8.5, { align: 'center' });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(innerX, innerY + 12, innerX + innerW, innerY + 12);

  // Employee Metadata Box
  const metaY = innerY + 15;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(innerX, metaY, innerW, 18, 1.5, 1.5, 'F');

  doc.setFontSize(7.5);
  // Column 1
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Employee Name:', innerX + 3, metaY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.staff.fullName, innerX + 26, metaY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Employee ID:', innerX + 3, metaY + 9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(data.staff.employeeCode, innerX + 26, metaY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Designation:', innerX + 3, metaY + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(data.staff.designation, innerX + 26, metaY + 13.5);

  // Column 2
  const col2X = innerX + innerW / 2 + 2;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Department:', col2X, metaY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(data.staff.department, col2X + 22, metaY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Disbursed Date:', col2X, metaY + 9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(data.paidDate ? formatDate(data.paidDate) : formatDate(new Date().toISOString().split('T')[0]), col2X + 22, metaY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Payment Status:', col2X, metaY + 13.5);
  doc.setFont('helvetica', 'bold');
  if (data.isPaid) {
    doc.setTextColor(16, 185, 129);
    doc.text('PAID / DISBURSED', col2X + 22, metaY + 13.5);
  } else {
    doc.setTextColor(217, 119, 6);
    doc.text('PENDING DISBURSEMENT', col2X + 22, metaY + 13.5);
  }

  // Earnings & Deductions Tables (2 side-by-side columns)
  const earningsY = metaY + 21;
  const halfW = (innerW - 4) / 2;

  const basic = data.basicSalary ?? data.staff.monthlySalary;
  const allowances = data.allowances ?? data.staff.allowances;
  const bonus = data.bonus ?? 0;
  const deductions = data.deductions ?? data.staff.deductions;
  const net = data.netSalary ?? basic + allowances + bonus - deductions;

  // Earnings Box
  doc.setFillColor(241, 245, 249);
  doc.rect(innerX, earningsY, halfW, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('EARNINGS & ALLOWANCES', innerX + 3, earningsY + 4);
  doc.text('AMOUNT', innerX + halfW - 3, earningsY + 4, { align: 'right' });

  let eY = earningsY + 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('Basic Contractual Salary', innerX + 3, eY);
  doc.text(formatCurrency(basic, settings.currencySymbol), innerX + halfW - 3, eY, { align: 'right' });

  eY += 5;
  doc.text('Allowances & Utilities', innerX + 3, eY);
  doc.text(formatCurrency(allowances, settings.currencySymbol), innerX + halfW - 3, eY, { align: 'right' });

  if (bonus > 0) {
    eY += 5;
    doc.text('Performance Bonus / Incentive', innerX + 3, eY);
    doc.text(formatCurrency(bonus, settings.currencySymbol), innerX + halfW - 3, eY, { align: 'right' });
  }

  // Deductions Box
  const dedX = innerX + halfW + 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(dedX, earningsY, halfW, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('DEDUCTIONS & TAXES', dedX + 3, earningsY + 4);
  doc.text('AMOUNT', dedX + halfW - 3, earningsY + 4, { align: 'right' });

  let dY = earningsY + 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('Tax & Statutory Deductions', dedX + 3, dY);
  doc.text(formatCurrency(deductions, settings.currencySymbol), dedX + halfW - 3, dY, { align: 'right' });

  dY += 5;
  doc.text('Absences / Unpaid Leaves', dedX + 3, dY);
  doc.text(formatCurrency(0, settings.currencySymbol), dedX + halfW - 3, dY, { align: 'right' });

  // Total Summary Banner
  const totalY = earningsY + 24;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.rect(innerX, totalY, innerW, 7, 'F');
  doc.setDrawColor(16, 185, 129);
  doc.line(innerX, totalY, innerX + innerW, totalY);
  doc.line(innerX, totalY + 7, innerX + innerW, totalY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('NET SALARY PAYABLE:', innerX + innerW - 60, totalY + 5);
  doc.setTextColor(5, 150, 105);
  doc.text(formatCurrency(net, settings.currencySymbol), innerX + innerW - 4, totalY + 5, {
    align: 'right',
  });

  // Footer & Authorization
  const footY = totalY + 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Payment Mode: ${data.paymentMode || 'Bank Transfer'} • Ref: ${data.paymentRef || 'SYS-' + data.staff.employeeCode}`,
    innerX,
    footY
  );
  doc.text(
    'This is a digitally verified institutional pay slip. Generated through EduLedger School Management.',
    innerX,
    footY + 4
  );

  if (settings.showDeveloperCreditOnPrint !== false) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(148, 163, 184);
    doc.text('Developed by NextGenAI', innerX, footY + 7.5);
  }

  // Signatures on Right
  doc.setDrawColor(148, 163, 184);
  doc.line(innerX + innerW - 42, footY + 4, innerX + innerW, footY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Authorized Finance Officer', innerX + innerW - 21, footY + 8, { align: 'center' });
}

/**
 * Generates an official, print-ready PDF containing Employee Pay Slips.
 * Supports Paper-Saving 2-per-page A4 layout with dashed cutting lines!
 */
export function generatePaySlipsPdf(
  staffEntries: PaySlipData[],
  settings: SchoolSettings,
  options: PaySlipPdfOptions = {}
): jsPDF {
  const paper = options.paperSize || 'a4';
  const layout = paper === 'a6' ? '1-per-page' : (options.layout || '2-per-page');
  const doc = new jsPDF('p', 'mm', paper);

  const pageWidth = paper === 'a4' ? 210 : paper === 'a5' ? 148 : 105;
  const pageHeight = paper === 'a4' ? 297 : paper === 'a5' ? 210 : 148;
  const marginX = paper === 'a6' ? 5 : paper === 'a5' ? 8 : 10;
  const marginY = paper === 'a6' ? 5 : 8;
  const usableWidth = pageWidth - marginX * 2;

  if (layout === '2-per-page' && paper !== 'a6') {
    // 2 Pay Slips Per Page (Paper Saver - A4 or A5)
    const gap = paper === 'a5' ? 6 : 10;
    const slipHeight = (pageHeight - marginY * 2 - gap) / 2;

    for (let i = 0; i < staffEntries.length; i++) {
      const slotIndex = i % 2; // 0 = top, 1 = bottom

      if (i > 0 && slotIndex === 0) {
        doc.addPage();
      }

      const entry = staffEntries[i];
      const yPos = marginY + slotIndex * (slipHeight + gap);

      // Draw Pay Slip
      drawSinglePaySlip(doc, marginX, yPos, usableWidth, slipHeight, entry, settings);

      // Middle cutting line
      if (slotIndex === 0) {
        const cutY = marginY + slipHeight + gap / 2;
        doc.setDrawColor(148, 163, 184);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(marginX, cutY, marginX + usableWidth, cutY);
        doc.setLineDashPattern([], 0);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text('✂ - - - - - - - - - - - - - - - - - - - - Cut Along Dashed Line - - - - - - - - - - - - - - - - - - - - ✂', pageWidth / 2, cutY + 1.2, {
          align: 'center',
        });
      }
    }
  } else {
    // 1 Pay Slip Per Page (A4, A5, or A6)
    const slipHeight = pageHeight - marginY * 2 - (paper === 'a4' ? 30 : 10);

    for (let i = 0; i < staffEntries.length; i++) {
      if (i > 0) doc.addPage();
      const yPos = paper === 'a4' ? marginY + 15 : marginY + 5;
      drawSinglePaySlip(doc, marginX, yPos, usableWidth, slipHeight, staffEntries[i], settings);
    }
  }

  return doc;
}

/**
 * Downloads Employee Pay Slips PDF
 */
export function downloadPaySlipsPdf(
  staffEntries: PaySlipData[],
  settings: SchoolSettings,
  options: PaySlipPdfOptions = {},
  filename?: string
): void {
  const doc = generatePaySlipsPdf(staffEntries, settings, options);
  const layoutLabel = options.layout === '1-per-page' ? 'FullPage' : '2PerA4';
  const paperLabel = (options.paperSize || 'a4').toUpperCase();
  const name =
    filename ||
    (staffEntries.length === 1
      ? `PaySlip_${staffEntries[0].staff.employeeCode}_${staffEntries[0].staff.fullName.replace(/\s+/g, '_')}_${paperLabel}.pdf`
      : `PaySlips_Batch_${staffEntries.length}_${layoutLabel}_${paperLabel}.pdf`);
  doc.save(name);
}

/**
 * Generates a mixed PDF with 1 Fee Voucher and 1 Pay Slip on the same page (2-in-1 layout)
 */
export function generateMixedSlipsPdf(
  receipt: FeePayment,
  paySlip: PaySlipData,
  settings: SchoolSettings,
  studentsMap: Record<string, Student> = {},
  options: { paperSize?: PaperSizeFormat } = {}
): jsPDF {
  const paper = options.paperSize || 'a4';
  const doc = new jsPDF('p', 'mm', paper);
  const pageWidth = paper === 'a4' ? 210 : paper === 'a5' ? 148 : 105;
  const pageHeight = paper === 'a4' ? 297 : paper === 'a5' ? 210 : 148;
  const marginX = paper === 'a6' ? 5 : paper === 'a5' ? 8 : 10;
  const marginY = paper === 'a6' ? 5 : 8;
  const usableWidth = pageWidth - marginX * 2;
  const gap = paper === 'a5' ? 6 : 10;
  const slipHeight = (pageHeight - marginY * 2 - gap) / 2;

  const student =
    studentsMap[receipt.studentId] ||
    Object.values(studentsMap).find(s => s.fullName === receipt.studentName) ||
    null;

  // Top: Fee Voucher
  drawSingleFeeVoucher(doc, marginX, marginY, usableWidth, slipHeight, receipt, settings, student);

  // Perforation cutting line
  const cutY = marginY + slipHeight + gap / 2;
  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(marginX, cutY, marginX + usableWidth, cutY);
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('✂ - - - - - - - - - - - - - - - - - - - - Cut Along Dashed Line - - - - - - - - - - - - - - - - - - - - ✂', pageWidth / 2, cutY + 1.2, {
    align: 'center',
  });

  // Bottom: Pay Slip
  drawSinglePaySlip(doc, marginX, cutY + gap / 2, usableWidth, slipHeight, paySlip, settings);

  return doc;
}

/**
 * Downloads Mixed Fee Voucher & Pay Slip 2-in-1 PDF
 */
export function downloadMixedSlipsPdf(
  receipt: FeePayment,
  paySlip: PaySlipData,
  settings: SchoolSettings,
  studentsMap: Record<string, Student> = {},
  options: { paperSize?: PaperSizeFormat } = {},
  filename?: string
): void {
  const doc = generateMixedSlipsPdf(receipt, paySlip, settings, studentsMap, options);
  const paperLabel = (options.paperSize || 'a4').toUpperCase();
  const name = filename || `Combined_Receipt_And_PaySlip_2in1_${paperLabel}.pdf`;
  doc.save(name);
}
