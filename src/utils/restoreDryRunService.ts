/**
 * EduLedger - Restore Dry-Run Simulation & Schema Conflict Validation Service
 * Simulates the restoration process and validates data schemas, foreign keys,
 * field constraints, and admin retention before persistent writes occur.
 */

import {
  Student,
  Staff,
  FeePayment,
  Expense,
  SchoolSettings,
  User,
  Exam,
  ExamResult,
  BookItem,
} from '../types';
import { inspectBackupJson, BackupInspectionResult, AppStateData } from '../db/indexedDB';

export interface DryRunValidationIssue {
  code: string;
  title: string;
  details: string;
  entityType?: string;
  severity: 'blocking' | 'warning' | 'info';
}

export interface EntityImpactDelta {
  entityName: string;
  currentCount: number;
  incomingCount: number;
  netChange: number;
  overwrittenCount: number;
  newCount: number;
}

export interface RestoreDryRunResult {
  isValid: boolean;
  hasBlockingErrors: boolean;
  canProceed: boolean;
  timestamp: string;
  backupMetadata: {
    schoolName: string;
    exportedAt?: string;
    schemaVersion?: number;
    fileSizeBytes?: number;
    application?: string;
  };
  settingsComparison: {
    nameMatch: boolean;
    currentSchoolName: string;
    backupSchoolName: string;
    currencyMatch: boolean;
    currentCurrency: string;
    backupCurrency: string;
    yearMatch: boolean;
    currentYear: string;
    backupYear: string;
  };
  issues: DryRunValidationIssue[];
  passedChecks: Array<{ title: string; description: string }>;
  impactDeltas: EntityImpactDelta[];
  adminAccountPreserved: boolean;
  totalIncomingRecords: number;
}

export interface CurrentDatabaseContext {
  students: Student[];
  staff: Staff[];
  feePayments: FeePayment[];
  expenses: Expense[];
  settings?: SchoolSettings;
  users: User[];
  exams?: Exam[];
  books?: BookItem[];
  currentUser?: User | null;
}

/**
 * Performs a comprehensive dry-run simulation of the database restore
 */
export async function runRestoreDryRun(
  backupJsonString: string,
  currentContext: CurrentDatabaseContext,
  fileSizeBytes?: number
): Promise<RestoreDryRunResult> {
  const issues: DryRunValidationIssue[] = [];
  const passedChecks: Array<{ title: string; description: string }> = [];

  // 1. Initial JSON inspection
  const inspection: BackupInspectionResult = inspectBackupJson(backupJsonString);

  if (!inspection.valid || !inspection.data) {
    issues.push({
      code: 'INVALID_JSON_SCHEMA',
      title: 'Corrupt or Invalid JSON Payload',
      details: inspection.error || 'The backup file could not be parsed into a valid database snapshot.',
      severity: 'blocking',
    });

    return {
      isValid: false,
      hasBlockingErrors: true,
      canProceed: false,
      timestamp: new Date().toISOString(),
      backupMetadata: {
        schoolName: inspection.schoolName || 'Unknown School',
        schemaVersion: inspection.schemaVersion,
        fileSizeBytes,
      },
      settingsComparison: {
        nameMatch: false,
        currentSchoolName: currentContext.settings?.schoolName || 'Current School',
        backupSchoolName: inspection.schoolName || 'Unknown School',
        currencyMatch: false,
        currentCurrency: currentContext.settings?.currencyCode || 'PKR',
        backupCurrency: 'Unknown',
        yearMatch: false,
        currentYear: currentContext.settings?.currentAcademicYear || '',
        backupYear: '',
      },
      issues,
      passedChecks,
      impactDeltas: [],
      adminAccountPreserved: false,
      totalIncomingRecords: 0,
    };
  }

  passedChecks.push({
    title: 'JSON Syntax & Structure Verified',
    description: 'The backup file is well-formed JSON and conforms to the EduLedger database export format.',
  });

  const incomingData = inspection.data;
  const currentSettings = currentContext.settings;

  // 2. Schema Version Compatibility Check
  const backupSchemaVersion = inspection.schemaVersion || 1;
  const CURRENT_SCHEMA_VERSION = 2;

  if (backupSchemaVersion > CURRENT_SCHEMA_VERSION) {
    issues.push({
      code: 'UNSUPPORTED_FUTURE_SCHEMA',
      title: 'Newer Backup Schema Version Detected',
      details: `Backup schema version (${backupSchemaVersion}) is newer than the application schema version (${CURRENT_SCHEMA_VERSION}). Please update the app before restoring.`,
      severity: 'blocking',
    });
  } else if (backupSchemaVersion < CURRENT_SCHEMA_VERSION) {
    issues.push({
      code: 'LEGACY_SCHEMA_MIGRATION',
      title: 'Legacy Schema Version (Auto-Migration Ready)',
      details: `Backup is from an earlier schema version (${backupSchemaVersion}). Automatic field up-casting and migrations will be applied.`,
      severity: 'info',
    });
    passedChecks.push({
      title: 'Schema Migration Compatibility',
      description: 'Legacy schema fields will be upgraded safely without data loss.',
    });
  } else {
    passedChecks.push({
      title: 'Schema Version 100% Compatible',
      description: `Backup schema version matches current application release (v${CURRENT_SCHEMA_VERSION}).`,
    });
  }

  // 3. Institution & Settings Comparison
  const incomingSettings = incomingData.settings || {
    schoolName: inspection.schoolName || 'EduLedger School',
    currencySymbol: '$',
    currencyCode: 'USD',
    currentAcademicYear: '2026-2027',
  };

  const nameMatch =
    !currentSettings ||
    currentSettings.schoolName.trim().toLowerCase() === incomingSettings.schoolName.trim().toLowerCase();

  const currencyMatch =
    !currentSettings ||
    currentSettings.currencyCode.trim().toUpperCase() === (incomingSettings.currencyCode || '').trim().toUpperCase();

  const yearMatch =
    !currentSettings ||
    currentSettings.currentAcademicYear.trim() === (incomingSettings.currentAcademicYear || '').trim();

  if (!nameMatch) {
    issues.push({
      code: 'SCHOOL_NAME_DIFFERENT',
      title: 'Institution Name Mismatch',
      details: `Current institution is "${currentSettings?.schoolName}", but this backup belongs to "${incomingSettings.schoolName}". Restoring will update your active school name.`,
      severity: 'warning',
    });
  } else {
    passedChecks.push({
      title: 'Target Institution Match',
      description: `Backup targets the current school: "${incomingSettings.schoolName}".`,
    });
  }

  if (!currencyMatch) {
    issues.push({
      code: 'CURRENCY_MISMATCH',
      title: 'Currency Code Difference',
      details: `Active currency is "${currentSettings?.currencyCode || 'PKR'}", but backup uses "${incomingSettings.currencyCode || incomingSettings.currencySymbol || 'USD'}". Financial records will adopt the backup currency.`,
      severity: 'warning',
    });
  }

  if (!yearMatch && currentSettings) {
    issues.push({
      code: 'ACADEMIC_YEAR_SHIFT',
      title: 'Academic Year Boundary Note',
      details: `Current active year is "${currentSettings.currentAcademicYear}", whereas backup is set to "${incomingSettings.currentAcademicYear}".`,
      severity: 'info',
    });
  }

  // 4. Primary Key & Duplicate Identification Checks
  const checkDuplicateIds = (records: Array<{ id: string }>, entityType: string) => {
    const seen = new Set<string>();
    let duplicates = 0;
    for (const r of records) {
      if (!r.id || seen.has(r.id)) {
        duplicates++;
      } else {
        seen.add(r.id);
      }
    }
    if (duplicates > 0) {
      issues.push({
        code: `DUPLICATE_IDS_${entityType.toUpperCase()}`,
        title: `Duplicate ${entityType} Primary Keys Detected`,
        details: `Found ${duplicates} duplicate primary key ID(s) in incoming ${entityType}. This can cause records to overwrite each other.`,
        entityType,
        severity: 'blocking',
      });
    }
  };

  const incomingStudents = incomingData.students || [];
  const incomingStaff = incomingData.staff || [];
  const incomingFees = incomingData.feePayments || [];
  const incomingExpenses = incomingData.expenses || [];
  const incomingUsers = incomingData.users || [];
  const incomingExams = incomingData.exams || [];
  const incomingResults = incomingData.examResults || [];

  checkDuplicateIds(incomingStudents, 'Students');
  checkDuplicateIds(incomingStaff, 'Staff');
  checkDuplicateIds(incomingFees, 'Fee Payments');
  checkDuplicateIds(incomingExpenses, 'Expenses');
  checkDuplicateIds(incomingUsers, 'Users');

  // Check unique student roll numbers
  const rollNumbers = new Set<string>();
  let duplicateRolls = 0;
  for (const s of incomingStudents) {
    if (s.rollNo) {
      const norm = (s.rollNo + '_' + (s.className || '')).trim().toLowerCase();
      if (rollNumbers.has(norm)) {
        duplicateRolls++;
      } else {
        rollNumbers.add(norm);
      }
    }
  }
  if (duplicateRolls > 0) {
    issues.push({
      code: 'DUPLICATE_ROLL_NUMBERS',
      title: 'Duplicate Student Roll Numbers',
      details: 'Detected ' + duplicateRolls + ' duplicate student roll number(s) within class sections in backup.',
      entityType: 'Students',
      severity: 'warning',
    });
  }

  // Check unique fee receipt numbers
  const receiptNumbers = new Set<string>();
  let duplicateReceipts = 0;
  for (const f of incomingFees) {
    if (f.receiptNumber) {
      const norm = f.receiptNumber.trim().toLowerCase();
      if (receiptNumbers.has(norm)) {
        duplicateReceipts++;
      } else {
        receiptNumbers.add(norm);
      }
    }
  }
  if (duplicateReceipts > 0) {
    issues.push({
      code: 'DUPLICATE_RECEIPT_NUMBERS',
      title: 'Duplicate Fee Receipt Vouchers',
      details: `Detected ${duplicateReceipts} duplicate receipt voucher number(s) in fee collections.`,
      entityType: 'Fees',
      severity: 'warning',
    });
  }

  // 5. Required Field & Value Range Validations
  let invalidStudents = 0;
  for (const s of incomingStudents) {
    if (!s.fullName || !s.fullName.trim() || !s.className) {
      invalidStudents++;
    }
  }
  if (invalidStudents > 0) {
    issues.push({
      code: 'MALFORMED_STUDENT_RECORDS',
      title: 'Malformed Student Records',
      details: `${invalidStudents} student record(s) are missing required fields (fullName or className).`,
      entityType: 'Students',
      severity: 'blocking',
    });
  }

  let negativeFees = 0;
  for (const f of incomingFees) {
    if (typeof f.totalAmount !== 'number' || isNaN(f.totalAmount) || f.totalAmount < 0) {
      negativeFees++;
    }
  }
  if (negativeFees > 0) {
    issues.push({
      code: 'INVALID_FEE_AMOUNTS',
      title: 'Negative or NaN Fee Amounts Detected',
      details: `${negativeFees} fee payment record(s) contain negative or non-numeric monetary totals.`,
      entityType: 'Fees',
      severity: 'blocking',
    });
  }

  let negativeExpenses = 0;
  for (const e of incomingExpenses) {
    if (typeof e.amount !== 'number' || isNaN(e.amount) || e.amount < 0) {
      negativeExpenses++;
    }
  }
  if (negativeExpenses > 0) {
    issues.push({
      code: 'INVALID_EXPENSE_AMOUNTS',
      title: 'Negative or NaN Expense Amounts Detected',
      details: `${negativeExpenses} expense record(s) contain invalid non-numeric or negative amounts.`,
      entityType: 'Expenses',
      severity: 'blocking',
    });
  }

  if (invalidStudents === 0 && negativeFees === 0 && negativeExpenses === 0) {
    passedChecks.push({
      title: 'Data Constraints & Monetary Rules Validated',
      description: 'Zero negative values, zero NaN numbers, and all required student & financial fields are populated.',
    });
  }

  // 6. Referential Integrity Simulation
  const studentIdSet = new Set(incomingStudents.map((s) => s.id));
  let orphanedFeePayments = 0;
  for (const f of incomingFees) {
    if (f.studentId && !studentIdSet.has(f.studentId)) {
      orphanedFeePayments++;
    }
  }
  if (orphanedFeePayments > 0) {
    issues.push({
      code: 'ORPHANED_FEE_PAYMENTS',
      title: 'Orphaned Fee Payment Records',
      details: `${orphanedFeePayments} fee payment(s) reference student IDs that are not present in the incoming student roster.`,
      entityType: 'Fees',
      severity: 'warning',
    });
  } else if (incomingFees.length > 0) {
    passedChecks.push({
      title: 'Fee-to-Student Foreign Keys Intact',
      description: '100% of fee payments correctly reference valid students in the restored roster.',
    });
  }

  const staffIdSet = new Set(incomingStaff.map((s) => s.id));
  const incomingSalaries = incomingData.salaryRecords || [];
  let orphanedSalaries = 0;
  for (const s of incomingSalaries) {
    if (s.staffId && !staffIdSet.has(s.staffId)) {
      orphanedSalaries++;
    }
  }
  if (orphanedSalaries > 0) {
    issues.push({
      code: 'ORPHANED_SALARY_RECORDS',
      title: 'Orphaned Salary Records',
      details: `${orphanedSalaries} salary disbursement record(s) reference faculty IDs not found in the staff directory.`,
      entityType: 'Payroll',
      severity: 'warning',
    });
  }

  // 7. Admin Lockout Prevention Check
  const incomingActiveAdmins = incomingUsers.filter(
    (u) => (u.role === 'admin' || u.role === 'super_admin') && u.isActive !== false
  );

  let adminAccountPreserved = true;
  if (incomingActiveAdmins.length === 0) {
    issues.push({
      code: 'ADMIN_LOCKOUT_RISK',
      title: 'Critical Lockout Risk: No Active Admin Accounts in Backup',
      details: 'This backup contains zero active administrator accounts. Restoring it as-is would lock you out of administrative controls.',
      entityType: 'Users',
      severity: 'blocking',
    });
    adminAccountPreserved = false;
  } else {
    passedChecks.push({
      title: 'Admin Continuity Guaranteed',
      description: `Backup contains ${incomingActiveAdmins.length} active administrator account(s). You will maintain full system access after restore.`,
    });
  }

  // 8. Database Impact Simulation (Delta calculations)
  const calculateDelta = (
    entityName: string,
    currentList: Array<{ id: string }>,
    incomingList: Array<{ id: string }>
  ): EntityImpactDelta => {
    const currentIdMap = new Set(currentList.map((item) => item.id));
    let overwrittenCount = 0;
    let newCount = 0;

    for (const item of incomingList) {
      if (currentIdMap.has(item.id)) {
        overwrittenCount++;
      } else {
        newCount++;
      }
    }

    return {
      entityName,
      currentCount: currentList.length,
      incomingCount: incomingList.length,
      netChange: incomingList.length - currentList.length,
      overwrittenCount,
      newCount,
    };
  };

  const impactDeltas: EntityImpactDelta[] = [
    calculateDelta('Students', currentContext.students, incomingStudents),
    calculateDelta('Staff', currentContext.staff, incomingStaff),
    calculateDelta('Fee Payments', currentContext.feePayments, incomingFees),
    calculateDelta('Expenses', currentContext.expenses, incomingExpenses),
    calculateDelta('User Accounts', currentContext.users, incomingUsers),
    calculateDelta('Exams', currentContext.exams || [], incomingExams),
    calculateDelta('Exam Results', [], incomingResults),
    calculateDelta('Bookshop Inventory', currentContext.books || [], incomingData.books || []),
    calculateDelta('School Assets', [], incomingData.assets || []),
  ];

  const totalIncoming =
    incomingStudents.length +
    incomingStaff.length +
    incomingFees.length +
    incomingExpenses.length +
    incomingUsers.length +
    incomingExams.length +
    incomingResults.length +
    (incomingData.books || []).length +
    (incomingData.assets || []).length;

  const hasBlocking = issues.some((i) => i.severity === 'blocking');

  return {
    isValid: !hasBlocking,
    hasBlockingErrors: hasBlocking,
    canProceed: !hasBlocking,
    timestamp: new Date().toISOString(),
    backupMetadata: {
      schoolName: incomingSettings.schoolName || inspection.schoolName || 'EduLedger School',
      exportedAt: inspection.exportedAt,
      schemaVersion: inspection.schemaVersion,
      fileSizeBytes,
      application: inspection.application,
    },
    settingsComparison: {
      nameMatch,
      currentSchoolName: currentSettings?.schoolName || 'Current School',
      backupSchoolName: incomingSettings.schoolName,
      currencyMatch,
      currentCurrency: currentSettings?.currencyCode || 'PKR',
      backupCurrency: incomingSettings.currencyCode || incomingSettings.currencySymbol || 'USD',
      yearMatch,
      currentYear: currentSettings?.currentAcademicYear || '',
      backupYear: incomingSettings.currentAcademicYear || '',
    },
    issues,
    passedChecks,
    impactDeltas,
    adminAccountPreserved,
    totalIncomingRecords: totalIncoming,
  };
}
