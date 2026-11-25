import jsPDF from 'jspdf';
import { Staff, StaffLeaveRequest, SchoolSettings } from '../types';
import { formatDate } from './formatters';

export interface LeaveBalanceSummary {
  type: string;
  label: string;
  allocated: number;
  used: number;
  pending: number;
  remaining: number;
}

export function computeStaffLeaveSummary(
  staff: Staff,
  leaves: StaffLeaveRequest[]
): {
  summaries: LeaveBalanceSummary[];
  totalAllocated: number;
  totalUsed: number;
  totalRemaining: number;
} {
  const staffLeaves = leaves.filter(l => l.staffId === staff.id);

  const approvedLeaves = staffLeaves.filter(l => l.status === 'approved');
  const pendingLeaves = staffLeaves.filter(l => l.status === 'pending');

  const countDays = (list: StaffLeaveRequest[], type: string) => {
    return list
      .filter(l => l.leaveType === type)
      .reduce((sum, item) => sum + (item.daysCount || 1), 0);
  };

  const balance = staff.leaveBalance || { casual: 8, sick: 10, paid: 15 };

  // Standard quota allocations
  const casualAllocated = 12;
  const sickAllocated = 12;
  const annualAllocated = 20;
  const emergencyAllocated = 3;
  const paidAllocated = 15;

  const casualUsed = countDays(approvedLeaves, 'casual');
  const casualPending = countDays(pendingLeaves, 'casual');
  const casualRemaining = balance.casual ?? Math.max(0, casualAllocated - casualUsed);

  const sickUsed = countDays(approvedLeaves, 'sick');
  const sickPending = countDays(pendingLeaves, 'sick');
  const sickRemaining = balance.sick ?? Math.max(0, sickAllocated - sickUsed);

  const annualUsed = countDays(approvedLeaves, 'annual');
  const annualPending = countDays(pendingLeaves, 'annual');
  const annualRemaining = balance.annual ?? Math.max(0, annualAllocated - annualUsed);

  const emergencyUsed = countDays(approvedLeaves, 'emergency');
  const emergencyPending = countDays(pendingLeaves, 'emergency');
  const emergencyRemaining = balance.emergency ?? Math.max(0, emergencyAllocated - emergencyUsed);

  const paidUsed = countDays(approvedLeaves, 'paid');
  const paidPending = countDays(pendingLeaves, 'paid');
  const paidRemaining = balance.paid ?? Math.max(0, paidAllocated - paidUsed);

  const summaries: LeaveBalanceSummary[] = [
    {
      type: 'casual',
      label: 'Casual Leave (CL)',
      allocated: casualAllocated,
      used: casualUsed,
      pending: casualPending,
      remaining: casualRemaining,
    },
    {
      type: 'sick',
      label: 'Sick / Medical Leave (SL)',
      allocated: sickAllocated,
      used: sickUsed,
      pending: sickPending,
      remaining: sickRemaining,
    },
    {
      type: 'annual',
      label: 'Annual Vacation Leave (AL)',
      allocated: annualAllocated,
      used: annualUsed,
      pending: annualPending,
      remaining: annualRemaining,
    },
    {
      type: 'emergency',
      label: 'Emergency Leave (EL)',
      allocated: emergencyAllocated,
      used: emergencyUsed,
      pending: emergencyPending,
      remaining: emergencyRemaining,
    },
    {
      type: 'paid',
      label: 'Earned / Paid Leave (PL)',
      allocated: paidAllocated,
      used: paidUsed,
      pending: paidPending,
      remaining: paidRemaining,
    },
  ];

  const totalAllocated = summaries.reduce((s, c) => s + c.allocated, 0);
  const totalUsed = summaries.reduce((s, c) => s + c.used, 0);
  const totalRemaining = summaries.reduce((s, c) => s + c.remaining, 0);

  return { summaries, totalAllocated, totalUsed, totalRemaining };
}

/**
 * Generates an official, printable Leave Balance & Entitlement Statement as a downloadable PDF.
 */
export function generateStaffLeaveBalancePdf(
  staff: Staff,
  leaves: StaffLeaveRequest[],
  settings: SchoolSettings,
  academicYear: string = '2026-2027'
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 15;
  let y = 14;

  const { summaries, totalAllocated, totalUsed, totalRemaining } = computeStaffLeaveSummary(staff, leaves);
  const staffLeaves = leaves.filter(l => l.staffId === staff.id);

  // Top header banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Institution title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(settings.schoolName || 'EduLedger International School', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text('OFFICIAL EMPLOYEE LEAVE BALANCE & ENTITLEMENT STATEMENT', margin, 18);

  const subBanner = `${settings.schoolAddress || 'School Administrative Registry'}  •  Session: ${academicYear}`;
  doc.text(subBanner, margin, 24);

  // Reference & Date on right
  doc.setFontSize(7.5);
  doc.text(`Doc Ref: LBS-${staff.employeeCode}-${new Date().getFullYear()}`, pageWidth - margin, 12, { align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, 18, { align: 'right' });
  doc.text(`Status: Official Record`, pageWidth - margin, 24, { align: 'right' });

  y = 36;

  // Employee Information Box
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(margin, y, pageWidth - margin * 2, 34, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(staff.fullName, margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Employee Code: ${staff.employeeCode}`, margin + 4, y + 14);
  doc.text(`Department: ${staff.department}`, margin + 4, y + 20);
  doc.text(`Designation: ${staff.designation}`, margin + 4, y + 26);

  const col2X = margin + 65;
  doc.text(`Date of Joining: ${formatDate(staff.joiningDate)}`, col2X, y + 14);
  doc.text(`Contact: ${staff.contactNumber}`, col2X, y + 20);
  doc.text(`Email: ${staff.email}`, col2X, y + 26);

  // Status Badge on right
  const badgeX = pageWidth - margin - 35;
  doc.setFillColor(240, 253, 244); // Green-50
  doc.setDrawColor(187, 247, 208); // Green-200
  doc.roundedRect(badgeX, y + 5, 30, 8, 1, 1, 'FD');
  doc.setTextColor(22, 101, 52); // Green-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(staff.status.toUpperCase(), badgeX + 15, y + 10.5, { align: 'center' });

  // Total leave remaining stat
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Remaining Quota:', badgeX + 15, y + 20, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text(`${totalRemaining} Days`, badgeX + 15, y + 27, { align: 'center' });

  y += 42;

  // Section Heading: Leave Quota & Balances
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. ANNUAL LEAVE ENTITLEMENT & BALANCE SUMMARY', margin, y);
  y += 5;

  // Table Header
  const tableHeaders = ['Leave Category', 'Quota (Days)', 'Utilized', 'Pending', 'Remaining Balance', 'Usage %'];
  const colWidths = [60, 24, 24, 24, 30, 18];
  let curX = margin;

  doc.setFillColor(241, 245, 249); // Slate-100
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  tableHeaders.forEach((h, i) => {
    const align = i === 0 ? 'left' : 'center';
    const xPos = i === 0 ? curX + 2 : curX + colWidths[i] / 2;
    doc.text(h, xPos, y + 5, { align });
    curX += colWidths[i];
  });

  y += 7;

  // Table Rows
  summaries.forEach((row, idx) => {
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, y, pageWidth - margin * 2, 7, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    let x = margin;
    // Category
    doc.text(row.label, x + 2, y + 4.8);
    x += colWidths[0];

    // Allocated
    doc.text(String(row.allocated), x + colWidths[1] / 2, y + 4.8, { align: 'center' });
    x += colWidths[1];

    // Used
    doc.setTextColor(row.used > 0 ? 180 : 100, 30, 30);
    doc.text(String(row.used), x + colWidths[2] / 2, y + 4.8, { align: 'center' });
    x += colWidths[2];

    // Pending
    doc.setTextColor(row.pending > 0 ? 217 : 100, 119, 6);
    doc.text(String(row.pending), x + colWidths[3] / 2, y + 4.8, { align: 'center' });
    x += colWidths[3];

    // Remaining
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(row.remaining <= 2 ? 220 : 22, row.remaining <= 2 ? 38 : 101, row.remaining <= 2 ? 38 : 52);
    doc.text(`${row.remaining} Days`, x + colWidths[4] / 2, y + 4.8, { align: 'center' });
    x += colWidths[4];

    // Usage %
    const pct = row.allocated > 0 ? Math.round((row.used / row.allocated) * 100) : 0;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${pct}%`, x + colWidths[5] / 2, y + 4.8, { align: 'center' });

    y += 7;
  });

  // Total Summary Row
  doc.setFillColor(238, 242, 255); // Indigo-50
  doc.rect(margin, y, pageWidth - margin * 2, 7.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(49, 46, 129); // Indigo-900

  let totX = margin;
  doc.text('TOTAL LEAVE ENTITLEMENTS', totX + 2, y + 5);
  totX += colWidths[0];
  doc.text(String(totalAllocated), totX + colWidths[1] / 2, y + 5, { align: 'center' });
  totX += colWidths[1];
  doc.text(String(totalUsed), totX + colWidths[2] / 2, y + 5, { align: 'center' });
  totX += colWidths[2];
  const totalPending = summaries.reduce((s, c) => s + c.pending, 0);
  doc.text(String(totalPending), totX + colWidths[3] / 2, y + 5, { align: 'center' });
  totX += colWidths[3];
  doc.text(`${totalRemaining} Days Available`, totX + colWidths[4] / 2, y + 5, { align: 'center' });
  totX += colWidths[4];
  const overallPct = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;
  doc.text(`${overallPct}%`, totX + colWidths[5] / 2, y + 5, { align: 'center' });

  y += 15;

  // Section 2: Recent Leave Applications & Audit Trail
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. LEAVE APPLICATIONS & ACTIVITY AUDIT TRAIL', margin, y);
  y += 5;

  const appColHeaders = ['Period (Dates)', 'Type', 'Days', 'Reason / Purpose', 'Status', 'Approved By / Date'];
  const appColWidths = [38, 25, 14, 45, 22, 36];
  let hX = margin;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  appColHeaders.forEach((h, i) => {
    const align = i === 3 ? 'left' : 'center';
    const xPos = i === 3 ? hX + 2 : hX + appColWidths[i] / 2;
    doc.text(h, xPos, y + 5, { align });
    hX += appColWidths[i];
  });

  y += 7;

  if (staffLeaves.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, pageWidth - margin * 2, 10, 'FD');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('No recorded leave applications for this employee during the current academic period.', pageWidth / 2, y + 6.5, { align: 'center' });
    y += 10;
  } else {
    // Show up to 10 recent leave requests
    const recentLeaves = [...staffLeaves].slice(0, 8);
    recentLeaves.forEach((leave, idx) => {
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, y, pageWidth - margin * 2, 7, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);

      let lx = margin;
      // Dates
      const dateRange = `${leave.startDate} to ${leave.endDate}`;
      doc.text(dateRange, lx + appColWidths[0] / 2, y + 4.8, { align: 'center' });
      lx += appColWidths[0];

      // Type
      doc.text(leave.leaveType.toUpperCase(), lx + appColWidths[1] / 2, y + 4.8, { align: 'center' });
      lx += appColWidths[1];

      // Days
      doc.text(`${leave.daysCount} d`, lx + appColWidths[2] / 2, y + 4.8, { align: 'center' });
      lx += appColWidths[2];

      // Reason (truncated)
      const cleanReason = (leave.reason || 'Personal').substring(0, 32);
      doc.text(cleanReason, lx + 2, y + 4.8);
      lx += appColWidths[3];

      // Status
      doc.setFont('helvetica', 'bold');
      if (leave.status === 'approved') {
        doc.setTextColor(22, 101, 52);
      } else if (leave.status === 'pending') {
        doc.setTextColor(180, 83, 9);
      } else {
        doc.setTextColor(185, 28, 28);
      }
      doc.text(leave.status.toUpperCase(), lx + appColWidths[4] / 2, y + 4.8, { align: 'center' });
      lx += appColWidths[4];

      // Approver
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      const appBy = leave.approvedBy ? `${leave.approvedBy}` : (leave.actionDate || 'Pending');
      doc.text(appBy.substring(0, 22), lx + appColWidths[5] / 2, y + 4.8, { align: 'center' });

      y += 7;
    });
  }

  // Institutional Verification / Disclaimers
  y = Math.max(y + 10, 225);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 16, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Institutional Policy & Notes:', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    '1. Unused Casual Leave lapses at the end of the fiscal year unless approved for carry-over by the School Board.',
    margin + 4,
    y + 9.5
  );
  doc.text(
    '2. Medical / Sick leaves exceeding 2 consecutive days require an authenticated medical certificate from an accredited physician.',
    margin + 4,
    y + 13.5
  );

  // Signatures Section
  const sigY = 255;
  const sigWidth = 48;

  // Employee Signature
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 5, sigY + 12, margin + 5 + sigWidth, sigY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Employee Signature', margin + 5 + sigWidth / 2, sigY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Date: _______________', margin + 5 + sigWidth / 2, sigY + 20, { align: 'center' });

  // HR Manager Signature
  const hrX = (pageWidth - sigWidth) / 2;
  doc.line(hrX, sigY + 12, hrX + sigWidth, sigY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('HR / Payroll Officer', hrX + sigWidth / 2, sigY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Verified & Signed', hrX + sigWidth / 2, sigY + 20, { align: 'center' });

  // Principal Stamp
  const prinX = pageWidth - margin - 5 - sigWidth;
  doc.line(prinX, sigY + 12, prinX + sigWidth, sigY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Principal / Administrator', prinX + sigWidth / 2, sigY + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Official Institutional Stamp', prinX + sigWidth / 2, sigY + 20, { align: 'center' });

  // Footer bar
  doc.setFillColor(30, 41, 59);
  doc.rect(0, pageHeight - 6, pageWidth, 6, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `EduLedger School Management ERP • Confidential Personnel Document • Page 1 of 1`,
    pageWidth / 2,
    pageHeight - 2,
    { align: 'center' }
  );

  // Trigger download
  const safeName = staff.fullName.replace(/\s+/g, '_').toLowerCase();
  const safeCode = staff.employeeCode.replace(/\s+/g, '_');
  doc.save(`leave_balance_${safeCode}_${safeName}.pdf`);
}
