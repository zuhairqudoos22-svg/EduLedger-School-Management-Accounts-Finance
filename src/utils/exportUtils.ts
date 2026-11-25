import * as XLSX from 'xlsx';
import { getTodayDateString } from './formatters';
import { Student, Staff, FeePayment, Expense, StudentAttendanceRecord, StaffAttendanceRecord, SchoolSettings, ExamResult } from '../types';

/**
 * Cleanly triggers a browser download for a Blob object.
 */
function triggerDownload(blob: Blob, fullFilename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fullFilename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Sanitizes a filename to avoid problematic filesystem characters.
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/_+/g, '_');
}

/**
 * Universal CSV Exporter with UTF-8 BOM support.
 */
export function exportToCSV(
  filename: string,
  rows: Record<string, unknown>[],
  options?: { appendDate?: boolean }
): boolean {
  if (!rows || rows.length === 0) {
    return false;
  }

  const separator = ',';
  const keys = Object.keys(rows[0]);

  const csvRows = [
    // Header row
    keys.map(k => `"${String(k).replace(/"/g, '""')}"`).join(separator),
    // Data rows
    ...rows.map(row =>
      keys
        .map(k => {
          const cell = row[k] === null || row[k] === undefined ? '' : row[k];
          let cellStr = typeof cell === 'object' ? JSON.stringify(cell) : String(cell);
          // Mitigate CSV Formula Injection (CWE-1236 / OWASP)
          // If a text string starts with =, +, -, @, \t, or \r and is not a plain number, prepend a single quote
          if (typeof cell === 'string') {
            const trimmed = cell.trim();
            if (/^[=+\-@\t\r]/.test(trimmed) && isNaN(Number(trimmed))) {
              cellStr = `'${cellStr}`;
            }
          }
          cellStr = cellStr.replace(/"/g, '""');
          return `"${cellStr}"`;
        })
        .join(separator)
    ),
  ];

  // \uFEFF is UTF-8 Byte Order Mark for proper Excel character recognition
  const bom = '\uFEFF';
  const csvContent = bom + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const baseName = sanitizeFilename(filename);
  const appendDate = options?.appendDate !== false;
  const fullName = appendDate ? `${baseName}_${getTodayDateString()}.csv` : `${baseName}.csv`;

  triggerDownload(blob, fullName);
  return true;
}

/**
 * Universal Excel (.xlsx) Exporter with column auto-sizing and number formatting.
 */
export function exportToExcel(
  filename: string,
  sheetName: string,
  rows: Record<string, unknown>[],
  options?: { appendDate?: boolean }
): boolean {
  if (!rows || rows.length === 0) {
    return false;
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-calculate column widths
  const keys = Object.keys(rows[0]);
  const colWidths = keys.map(k => {
    let maxLen = k.length;
    for (let i = 0; i < Math.min(rows.length, 500); i++) {
      const val = rows[i][k];
      const len = val !== null && val !== undefined ? String(val).length : 0;
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.min(Math.max(maxLen + 3, 10), 60) };
  });
  ws['!cols'] = colWidths;

  const validSheetName = sheetName.replace(/[:\\/?*\[\]]/g, '').slice(0, 31) || 'Sheet1';
  XLSX.utils.book_append_sheet(wb, ws, validSheetName);

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const baseName = sanitizeFilename(filename);
  const appendDate = options?.appendDate !== false;
  const fullName = appendDate ? `${baseName}_${getTodayDateString()}.xlsx` : `${baseName}.xlsx`;

  triggerDownload(blob, fullName);
  return true;
}

/**
 * Multi-Sheet Excel Workbook Exporter.
 */
export function exportMultiSheetExcel(
  filename: string,
  sheets: { sheetName: string; rows: Record<string, unknown>[] }[],
  options?: { appendDate?: boolean }
): boolean {
  if (!sheets || sheets.length === 0) return false;

  const wb = XLSX.utils.book_new();

  for (const { sheetName, rows } of sheets) {
    if (!rows || rows.length === 0) continue;
    const ws = XLSX.utils.json_to_sheet(rows);

    const keys = Object.keys(rows[0]);
    const colWidths = keys.map(k => {
      let maxLen = k.length;
      for (let i = 0; i < Math.min(rows.length, 250); i++) {
        const val = rows[i][k];
        const len = val !== null && val !== undefined ? String(val).length : 0;
        if (len > maxLen) maxLen = len;
      }
      return { wch: Math.min(Math.max(maxLen + 3, 10), 60) };
    });
    ws['!cols'] = colWidths;

    const validSheetName = sheetName.replace(/[:\\/?*\[\]]/g, '').slice(0, 31) || 'Sheet';
    XLSX.utils.book_append_sheet(wb, ws, validSheetName);
  }

  if (wb.SheetNames.length === 0) return false;

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const baseName = sanitizeFilename(filename);
  const appendDate = options?.appendDate !== false;
  const fullName = appendDate ? `${baseName}_${getTodayDateString()}.xlsx` : `${baseName}.xlsx`;

  triggerDownload(blob, fullName);
  return true;
}

// =========================================================================
// Specialized Domain Exporters for Students, Staff, and Finance
// =========================================================================

/**
 * Transforms Student records into standardized tabular format.
 */
export function formatStudentsForExport(students: Student[]): Record<string, unknown>[] {
  return students.map(s => ({
    'Roll No': s.rollNo,
    'Full Name': s.fullName,
    Gender: s.gender,
    Class: s.className,
    Section: s.section,
    'Date of Birth': s.dateOfBirth,
    'Admission Date': s.admissionDate,
    'Blood Group': s.bloodGroup || 'N/A',
    'Guardian Name': s.guardianName,
    'Guardian Relation': s.guardianRelation,
    'Contact Number': s.contactNumber,
    Email: s.email || 'N/A',
    Address: s.address,
    Status: s.status.toUpperCase(),
  }));
}

/**
 * Transforms Student Attendance records into tabular format.
 */
export function formatStudentAttendanceForExport(
  records: StudentAttendanceRecord[],
  students: Student[]
): Record<string, unknown>[] {
  const studentMap = new Map(students.map(s => [s.id, s]));
  return records.map(r => {
    const student = studentMap.get(r.studentId);
    return {
      Date: r.date,
      'Roll No': student?.rollNo || 'N/A',
      'Student Name': r.studentName,
      Class: r.className,
      Section: r.section,
      Status: r.status.toUpperCase(),
      Remarks: r.remarks || 'None',
    };
  });
}

/**
 * Transforms Staff records into standardized tabular format.
 */
export function formatStaffForExport(staff: Staff[]): Record<string, unknown>[] {
  return staff.map(s => {
    const netSalary = s.monthlySalary + s.allowances - s.deductions;
    return {
      'Employee Code': s.employeeCode,
      'Full Name': s.fullName,
      Gender: s.gender,
      Designation: s.designation,
      Department: s.department,
      'Staff Classification': s.isTeaching ? 'Teaching Faculty' : 'Non-Teaching',
      'Joining Date': s.joiningDate,
      'Contact Number': s.contactNumber,
      Email: s.email,
      'Base Monthly Salary': s.monthlySalary,
      Allowances: s.allowances,
      Deductions: s.deductions,
      'Net Salary': netSalary,
      'Bank Account': s.bankAccount || 'N/A',
      'Employment Status': s.status.toUpperCase(),
      'Casual Leaves Balance': s.leaveBalance.casual,
      'Sick Leaves Balance': s.leaveBalance.sick,
      'Paid Leaves Balance': s.leaveBalance.paid,
      Address: s.address,
    };
  });
}

/**
 * Transforms Staff Attendance records into tabular format.
 */
export function formatStaffAttendanceForExport(
  records: StaffAttendanceRecord[],
  staffList: Staff[]
): Record<string, unknown>[] {
  const staffMap = new Map(staffList.map(s => [s.id, s]));
  return records.map(r => {
    const member = staffMap.get(r.staffId);
    return {
      Date: r.date,
      'Employee Code': member?.employeeCode || 'N/A',
      'Staff Name': r.staffName,
      Designation: r.designation,
      Department: member?.department || 'N/A',
      Status: r.status.toUpperCase(),
      'Leave Type': r.status === 'leave' ? (r.leaveType ? r.leaveType.toUpperCase() : 'CASUAL') : 'N/A',
      Remarks: r.remarks || 'None',
    };
  });
}

/**
 * Transforms Fee Payments into standardized financial table format.
 */
export function formatFeePaymentsForExport(
  payments: FeePayment[],
  currency = '$'
): Record<string, unknown>[] {
  return payments.map(p => ({
    'Receipt Number': p.receiptNumber,
    Date: p.date,
    'Billing Month': p.monthFor,
    'Student Name': p.studentName,
    Class: `${p.className} - ${p.section}`,
    'Income Category': p.category || 'Student Fees',
    'Payment Mode': p.paymentMode,
    'Transaction Reference': p.transactionRef || 'N/A',
    [`Gross Fee (${currency})`]: p.gross_fee ?? (p.totalAmount + (p.discount_amount || 0)),
    [`Discount / Concession (${currency})`]: p.discount_amount || 0,
    'Discount Reason': p.discount_reason || 'None',
    [`Net Payable (${currency})`]: p.net_fee ?? p.totalAmount,
    [`Amount Paid (${currency})`]: p.totalAmount,
    'Collected By': p.collectedBy,
    Remarks: p.remarks || 'Standard Tuition Fee Payment',
  }));
}

/**
 * Transforms Due Fees / Defaulters into standardized tabular format.
 */
export function formatDefaultersForExport(
  defaulters: { student: Student; pendingAmount: number; lastPaymentDate?: string }[],
  currency = '$'
): Record<string, unknown>[] {
  return defaulters.map(({ student, pendingAmount, lastPaymentDate }) => ({
    'Roll No': student.rollNo,
    'Student Name': student.fullName,
    Class: student.className,
    Section: student.section,
    'Guardian Name': student.guardianName,
    'Guardian Relation': student.guardianRelation,
    'Contact Phone': student.contactNumber,
    'Guardian Email': student.email || 'N/A',
    [`Outstanding Dues (${currency})`]: pendingAmount,
    'Last Payment Date': lastPaymentDate || 'Never',
    'Account Status': student.status.toUpperCase(),
  }));
}

/**
 * Transforms Expenses into standardized financial tabular format.
 */
export function formatExpensesForExport(
  expenses: Expense[],
  currency = '$'
): Record<string, unknown>[] {
  return expenses.map(e => ({
    'Voucher ID': e.id,
    Date: e.date,
    'Expense Title': e.title,
    Category: e.category,
    'Sub-Category': e.subCategory || 'N/A',
    Tags: e.tags && e.tags.length > 0 ? e.tags.join(', ') : 'None',
    [`Amount (${currency})`]: e.amount,
    'Payment Mode': e.paymentMode,
    'Reference / Check #': e.referenceNumber || 'N/A',
    'Staff / Beneficiary': e.staffName || 'School Operations',
    'Salary Month': e.monthForSalary || 'N/A',
    'Recorded By': e.recordedBy,
    Notes: e.notes || 'None',
  }));
}

/**
 * Transforms expenses into a standardized CSV schema strictly formatted for
 * external accounting software (QuickBooks, Xero, Tally Prime, Sage, Zoho Books, Wave).
 * Uses ISO dates, numeric decimals without currency symbols for robust parsing,
 * and standard Chart of Accounts naming conventions.
 */
export function formatExpensesForAccountingSoftware(
  expenses: Expense[],
  currencyCode = 'USD'
): Record<string, unknown>[] {
  return expenses.map(e => ({
    Date: e.date,
    'Voucher Number': e.referenceNumber || `VCH-${e.id.slice(-6).toUpperCase()}`,
    'Payee / Description': e.title,
    'Account / Expense Category': e.category,
    'Sub-Category': e.subCategory || '',
    'Tags / Class': e.tags && e.tags.length > 0 ? e.tags.join('; ') : '',
    'Payment Method': e.paymentMode,
    'Debit Amount': Number(e.amount.toFixed(2)),
    Currency: currencyCode,
    'Beneficiary / Vendor': e.staffName || 'Institutional Disbursement',
    'Recorded By': e.recordedBy || 'Accounts Department',
    'Notes / Memo': e.notes || '',
  }));
}

/**
 * Transforms Payroll Status items into standardized payroll sheet format.
 */
export function formatPayrollForExport(
  items: {
    member: Staff;
    netSalary: number;
    isPaid: boolean;
    paidDate?: string;
    paymentRef?: string;
    paymentMode?: string;
  }[],
  monthName: string,
  currency = '$'
): Record<string, unknown>[] {
  return items.map(({ member, netSalary, isPaid, paidDate, paymentRef, paymentMode }) => ({
    'Payroll Month': monthName,
    'Employee Code': member.employeeCode,
    'Staff Name': member.fullName,
    Designation: member.designation,
    Department: member.department,
    [`Base Salary (${currency})`]: member.monthlySalary,
    [`Allowances (${currency})`]: member.allowances,
    [`Deductions (${currency})`]: member.deductions,
    [`Net Payable (${currency})`]: netSalary,
    'Disbursal Status': isPaid ? 'PAID' : 'PENDING',
    'Payment Date': paidDate || 'Pending Disbursal',
    'Payment Mode': paymentMode || 'N/A',
    'Transaction Reference': paymentRef || 'N/A',
    'Bank Account': member.bankAccount || 'N/A',
  }));
}

/**
 * Transforms General Ledger transactions into standardized double-entry tabular format.
 */
export function formatLedgerForExport(
  transactions: {
    date: string;
    type: 'INCOME' | 'EXPENSE';
    description: string;
    category: string;
    paymentMode: string;
    referenceNumber: string;
    credit: number;
    debit: number;
    balance: number;
    notes?: string;
    recordedBy?: string;
  }[],
  currency = '$'
): Record<string, unknown>[] {
  return transactions.map(tx => ({
    Date: tx.date,
    'Transaction Type': tx.type,
    'Particulars / Narration': tx.description,
    Category: tx.category,
    'Payment Mode': tx.paymentMode,
    'Ref / Receipt #': tx.referenceNumber,
    [`Credit - Inflow (${currency})`]: tx.credit || 0,
    [`Debit - Outflow (${currency})`]: tx.debit || 0,
    [`Running Balance (${currency})`]: tx.balance,
    'Recorded By': tx.recordedBy || 'Accounts Department',
    Notes: tx.notes || '',
  }));
}

/**
 * Transforms Student Academic Exam Results into standardized office-compatible tabular records.
 */
export function formatExamResultsForExport(
  results: ExamResult[]
): Record<string, unknown>[] {
  return results.map((r, i) => {
    const row: Record<string, unknown> = {
      Rank: r.rank || i + 1,
      'Roll No': r.studentRollNo,
      'Student Name': r.studentName,
      Class: r.className,
      Section: r.section,
      'Exam Title': r.examTitle,
      'Max Marks': r.totalMaxMarks,
      'Obtained Marks': r.totalObtainedMarks,
      'Percentage (%)': r.percentage,
      Grade: r.overallGrade,
      Result: r.status,
      'Attendance Turnout (%)': r.attendancePercentage || 100,
      'Teacher Remarks': r.teacherRemarks || 'Satisfactory',
    };
    if (r.subjectMarks && r.subjectMarks.length > 0) {
      r.subjectMarks.forEach(s => {
        row[`${s.subjectName} (Marks)`] = s.isAbsent ? 'ABSENT' : s.obtainedMarks;
        row[`${s.subjectName} (Grade)`] = s.grade || 'N/A';
      });
    }
    return row;
  });
}

/**
 * Transforms Student Attendance summary by student into office-compatible tabular records.
 */
export function formatStudentAttendanceSummaryForExport(
  students: Student[],
  records: StudentAttendanceRecord[],
  options?: { externalRecipient?: string; academicSession?: string }
): Record<string, unknown>[] {
  return students.map(s => {
    const studentRecords = records.filter(r => r.studentId === s.id);
    const present = studentRecords.filter(r => r.status === 'present').length;
    const absent = studentRecords.filter(r => r.status === 'absent').length;
    const leave = studentRecords.filter(r => r.status === 'leave').length;
    const total = studentRecords.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 100;
    const row: Record<string, unknown> = {
      'Roll No': s.rollNo,
      'Student Name': s.fullName,
      Class: s.className,
      Section: s.section,
      'Present Days': present,
      'Absent Days': absent,
      'Approved Leaves': leave,
      'Logged Sessions': total,
      'Attendance Rate (%)': rate,
      'Attendance Rating': rate >= 90 ? 'EXCELLENT' : rate >= 75 ? 'SATISFACTORY' : 'NEEDS IMPROVEMENT',
      'Guardian Name': s.guardianName || 'N/A',
      'Contact Phone': s.contactNumber || 'N/A',
    };
    if (options?.externalRecipient) {
      row['External Authority / Recipient'] = options.externalRecipient;
    }
    if (options?.academicSession) {
      row['Academic Session'] = options.academicSession;
    }
    return row;
  });
}

/**
 * Generates an All-In-One Master Financial & Administrative Excel Workbook (.xlsx)
 * with dedicated tabs for Executive Summary, Student Fees, School Expenses, Defaulters, and Staff Payroll.
 */
export function exportMasterSchoolWorkbook(
  settings: SchoolSettings,
  data: {
    students: Student[];
    staff: Staff[];
    feePayments: FeePayment[];
    expenses: Expense[];
    defaulters: { student: Student; pendingAmount: number; lastPaymentDate?: string }[];
    examResults?: ExamResult[];
    studentAttendance?: StudentAttendanceRecord[];
    currentMonth?: string;
  }
): boolean {
  const currency = settings.currencySymbol || '$';
  const totalCollections = data.feePayments.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalDues = data.defaulters.reduce((sum, d) => sum + d.pendingAmount, 0);
  const totalStaffPayroll = data.staff.reduce(
    (sum, s) => sum + (s.monthlySalary + s.allowances - s.deductions),
    0
  );

  // Sheet 1: Executive Overview
  const summarySheet = [
    { Parameter: 'School Name', Value: settings.schoolName || 'EduLedger School Management' },
    { Parameter: 'Current Academic Year', Value: settings.currentAcademicYear || '2026-2027' },
    { Parameter: 'Export Date', Value: new Date().toLocaleString() },
    { Parameter: 'Currency Standard', Value: `${settings.currencyCode || 'USD'} (${currency})` },
    { Parameter: 'Total Active Students', Value: data.students.filter(s => s.status === 'active').length },
    { Parameter: 'Total Faculty & Staff', Value: data.staff.filter(s => s.status === 'active').length },
    { Parameter: `Total Gross Fee Inflows (${currency})`, Value: totalCollections },
    { Parameter: `Total Operating Expenditures (${currency})`, Value: totalExpenses },
    { Parameter: `Net Operating Balance (${currency})`, Value: totalCollections - totalExpenses },
    { Parameter: 'Delinquent Defaulter Accounts', Value: data.defaulters.length },
    { Parameter: `Total Outstanding Receivables (${currency})`, Value: totalDues },
    { Parameter: `Estimated Monthly Staff Payroll (${currency})`, Value: totalStaffPayroll },
  ];

  // Sheet 2: Student Directory
  const studentSheet = formatStudentsForExport(data.students);

  // Sheet 3: Staff Roster
  const staffSheet = formatStaffForExport(data.staff);

  // Sheet 4: Fee Payments
  const feeSheet = formatFeePaymentsForExport(data.feePayments, currency);

  // Sheet 5: Expenses
  const expenseSheet = formatExpensesForExport(data.expenses, currency);

  // Sheet 6: Defaulters
  const defaulterSheet = formatDefaultersForExport(data.defaulters, currency);

  const sheets: { sheetName: string; rows: Record<string, unknown>[] }[] = [
    { sheetName: 'Executive Summary', rows: summarySheet },
    { sheetName: 'Fee Collections', rows: feeSheet.length ? feeSheet : [{ 'Status': 'No fee payments recorded' }] },
    { sheetName: 'School Expenses', rows: expenseSheet.length ? expenseSheet : [{ 'Status': 'No expenses recorded' }] },
    { sheetName: 'Pending Fee Defaulters', rows: defaulterSheet.length ? defaulterSheet : [{ 'Status': 'No pending dues' }] },
    { sheetName: 'Student Directory', rows: studentSheet.length ? studentSheet : [{ 'Status': 'No students enrolled' }] },
    { sheetName: 'Staff Directory', rows: staffSheet.length ? staffSheet : [{ 'Status': 'No staff records' }] },
  ];

  if (data.examResults && data.examResults.length > 0) {
    sheets.push({
      sheetName: 'Exam Results Ledger',
      rows: formatExamResultsForExport(data.examResults),
    });
  }

  if (data.studentAttendance && data.studentAttendance.length > 0) {
    sheets.push({
      sheetName: 'Attendance Summary',
      rows: formatStudentAttendanceSummaryForExport(data.students, data.studentAttendance),
    });
  }

  return exportMultiSheetExcel(`EduLedger_Master_Audit_Report`, sheets);
}

/**
 * Transforms Month-wise Profit & Loss rows into standardized tabular format for CSV/Excel
 */
export function formatMonthwiseProfitLossForExport(
  rows: {
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
  }[],
  currency = '$',
  options?: { externalRecipient?: string; academicSession?: string }
): Record<string, unknown>[] {
  return rows.map(r => {
    const row: Record<string, unknown> = {
      'Month / Period': r.monthName,
      [`Fee Inflows (${currency})`]: r.feeInflows,
      [`Bookshop & Aux Inflows (${currency})`]: r.bookshopInflows + r.otherInflows,
      [`Total Gross Revenue (${currency})`]: r.totalInflow,
      [`Staff Salaries & Payroll (${currency})`]: r.staffExpenses,
      [`Utilities & Campus Operations (${currency})`]: r.utilityExpenses,
      [`Maintenance, Supplies & Misc (${currency})`]: r.maintenanceExpenses + r.suppliesExpenses + r.otherExpenses,
      [`Total Operating Expenses (${currency})`]: r.totalExpense,
      [`Net Operating Surplus / Loss (${currency})`]: r.netProfit,
      'Operating Margin (%)': `${r.profitMargin >= 0 ? '+' : ''}${r.profitMargin.toFixed(2)}%`,
      'Financial Status': r.status === 'profit' ? 'SURPLUS' : r.status === 'loss' ? 'DEFICIT' : 'BREAK-EVEN',
    };
    if (options?.externalRecipient) {
      row['Reporting Recipient'] = options.externalRecipient;
    }
    if (options?.academicSession) {
      row['Academic Session'] = options.academicSession;
    }
    return row;
  });
}
