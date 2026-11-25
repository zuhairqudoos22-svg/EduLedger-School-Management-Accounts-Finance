import { openDB, IDBPDatabase } from 'idb';
import {
  User,
  SchoolClass,
  Student,
  Staff,
  StaffLeaveRequest,
  StudentAttendanceRecord,
  StaffAttendanceRecord,
  FeeStructure,
  FeePayment,
  Expense,
  SchoolSettings,
  Exam,
  ExamResult,
  DepartmentBudget,
  BookItem,
  BookSale,
  BookSupplier,
  SupplierPayment,
  ActivityLog,
  IssuedCertificate,
  SchoolAsset,
  BackupSnapshotRecord,
  BackupEntityCounts,
  TimetableSlot,
  MonthlyPayrollRun,
  SalaryRecord,
  SchoolDataSummary,
  ModuleDataCount,
  ClearableDataModule,
} from '../types';
import { payrollStorage } from '../utils/payrollStorage';
import { clearStoredRecurringTemplates } from '../utils/recurringExpensesService';
import { clearStoredBudgetThresholds } from '../utils/budgetThresholdStorage';
import {
  DEFAULT_SCHOOL_CLASSES,
  initialUsers,
  initialSchoolSettings,
  cleanInitialSchoolSettings,
  initialFeeStructures,
  initialStaff,
  initialStaffLeaves,
  initialStudents,
  getInitialAttendance,
  getInitialFinancialRecords,
  initialExams,
  initialExamResults,
  initialBudgets,
  initialBooks,
  initialBookSales,
  initialBookSuppliers,
  initialSupplierPayments,
  initialActivityLogs,
  initialCertificates,
  initialAssets,
  initialPayrollRuns,
} from './seedData';

const DB_NAME = 'eduledger_school_db';
const DB_VERSION = 14;

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Validates discount values according to institutional financial policies.
 */
export function validateFeeDiscount(
  grossFee: number,
  discountAmount: number,
  discountReason?: string
): { isValid: boolean; error?: string } {
  if (typeof discountAmount !== 'number' || isNaN(discountAmount)) {
    return { isValid: false, error: 'Discount amount must be a valid number.' };
  }
  if (discountAmount < 0) {
    return { isValid: false, error: 'Discount amount cannot be negative.' };
  }
  if (discountAmount > grossFee) {
    return {
      isValid: false,
      error: `Discount amount (${discountAmount}) cannot exceed total gross fee (${grossFee}).`,
    };
  }
  if (discountAmount > 0) {
    const reason = (discountReason || '').trim();
    if (reason.length < 3) {
      return {
        isValid: false,
        error: 'A specific reason for discount is required (minimum 3 characters).',
      };
    }
    if (reason.length > 120) {
      return {
        isValid: false,
        error: 'Discount reason cannot exceed 120 characters.',
      };
    }
  }
  return { isValid: true };
}

export async function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('students')) {
          db.createObjectStore('students', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('staff')) {
          db.createObjectStore('staff', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('staffLeaves')) {
          db.createObjectStore('staffLeaves', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('studentAttendance')) {
          db.createObjectStore('studentAttendance', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('staffAttendance')) {
          db.createObjectStore('staffAttendance', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('feeStructures')) {
          db.createObjectStore('feeStructures', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('feePayments')) {
          db.createObjectStore('feePayments', { keyPath: 'id' });
        }

        // Safe Migration for DB_VERSION 12: Ensure existing fee payments have gross_fee, discount_amount, discount_reason, net_fee
        if (oldVersion < 12 && db.objectStoreNames.contains('feePayments')) {
          try {
            const store = transaction.objectStore('feePayments');
            store.openCursor().then(function updateRecord(cursor) {
              if (!cursor) return;
              const val = cursor.value;
              let modified = false;
              if (val.discount_amount === undefined) {
                val.discount_amount = 0;
                modified = true;
              }
              if (val.discount_reason === undefined) {
                val.discount_reason = '';
                modified = true;
              }
              if (val.gross_fee === undefined) {
                val.gross_fee = val.totalAmount || 0;
                modified = true;
              }
              if (val.net_fee === undefined) {
                val.net_fee = val.totalAmount || 0;
                modified = true;
              }
              if (modified) {
                cursor.update(val);
              }
              cursor.continue().then(updateRecord);
            });
          } catch (migErr) {
            console.warn('Migration for feePayments discount fields skipped:', migErr);
          }
        }
        if (!db.objectStoreNames.contains('expenses')) {
          db.createObjectStore('expenses', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('schoolSettings')) {
          db.createObjectStore('schoolSettings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('exams')) {
          db.createObjectStore('exams', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('examResults')) {
          db.createObjectStore('examResults', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('budgets')) {
          db.createObjectStore('budgets', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('books')) {
          db.createObjectStore('books', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('bookSales')) {
          db.createObjectStore('bookSales', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('bookSuppliers')) {
          db.createObjectStore('bookSuppliers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('supplierPayments')) {
          db.createObjectStore('supplierPayments', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('activityLogs')) {
          db.createObjectStore('activityLogs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('certificates')) {
          db.createObjectStore('certificates', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('assets')) {
          db.createObjectStore('assets', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('backupSnapshots')) {
          db.createObjectStore('backupSnapshots', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('payrollRuns')) {
          db.createObjectStore('payrollRuns', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('salaryRecords')) {
          db.createObjectStore('salaryRecords', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('classes')) {
          db.createObjectStore('classes', { keyPath: 'id' });
        }

        // Safe Migration for DB_VERSION 14: Preserve all existing student records while preparing
        // backward-compatible optional admission template fields (missing fields remain safely optional).
        if (oldVersion < 14 && db.objectStoreNames.contains('students')) {
          try {
            const studentStore = transaction.objectStore('students');
            studentStore.openCursor().then(function migrateStudent(cursor) {
              if (!cursor) return;
              const val = cursor.value;
              let modified = false;
              if (val && typeof val === 'object') {
                if (!val.formTemplateId) {
                  val.formTemplateId = 'standard';
                  modified = true;
                }
                if (val.registrationDate === undefined && val.admissionDate) {
                  val.registrationDate = val.admissionDate;
                  modified = true;
                }
                if (modified) {
                  cursor.update(val);
                }
              }
              cursor.continue().then(migrateStudent);
            });
          } catch (migErr) {
            console.warn('Migration for student admission optional fields skipped:', migErr);
          }
        }
      },
    });
  }
  return dbPromise;
}

const CLASSES_SEEDED_FLAG = 'eduledger_classes_seeded_v1';

function buildClassesFromNames(names: string[], existingSections: string[] = ['A', 'B', 'C']): SchoolClass[] {
  const now = new Date().toISOString();
  const seen = new Set<string>();
  const result: SchoolClass[] = [];
  names.forEach((raw) => {
    const clean = raw.trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push({
      id: `cls-${clean.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: clean,
      display_order: result.length + 1,
      sections: [...existingSections],
      status: 'active',
      created_at: now,
      updated_at: now,
    });
  });
  return result;
}

async function ensureClassesInitialized(
  db: IDBPDatabase,
  settings: SchoolSettings,
  feeStructures: FeeStructure[]
): Promise<{ classes: SchoolClass[]; settings: SchoolSettings; feeStructures: FeeStructure[] }> {
  let classes: SchoolClass[] = db.objectStoreNames.contains('classes')
    ? await db.getAll('classes')
    : [];

  const alreadySeeded =
    typeof window !== 'undefined' && localStorage.getItem(CLASSES_SEEDED_FLAG) === 'true';

  if (classes.length === 0 && !alreadySeeded) {
    const existingNames = settings.standardClasses || [];
    const oldDefault10 = [
      'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
      'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
    ];
    const isExactOldDefault =
      existingNames.length === oldDefault10.length &&
      existingNames.every((n, i) => n.toLowerCase() === oldDefault10[i].toLowerCase());

    if (existingNames.length === 0 || isExactOldDefault) {
      classes = DEFAULT_SCHOOL_CLASSES.map(c => ({ ...c }));
    } else {
      const mergedNames = [
        ...['Play Group', 'Nursery', 'Prep'].filter(
          p => !existingNames.some(e => e.toLowerCase() === p.toLowerCase())
        ),
        ...existingNames,
      ];
      classes = buildClassesFromNames(mergedNames, settings.standardSections || ['A', 'B', 'C']);
    }

    if (db.objectStoreNames.contains('classes')) {
      const tx = db.transaction('classes', 'readwrite');
      for (const cls of classes) {
        await tx.store.put(cls);
      }
      await tx.done;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(CLASSES_SEEDED_FLAG, 'true');
    }
  } else if (classes.length > 0 && typeof window !== 'undefined' && !alreadySeeded) {
    localStorage.setItem(CLASSES_SEEDED_FLAG, 'true');
  }

  classes.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  // Backfill feeStructures.class_id & billing_frequency if missing
  let updatedStructures = feeStructures;
  const structuresToUpdate: FeeStructure[] = [];
  updatedStructures = feeStructures.map(fs => {
    const matchedClass = classes.find(
      c => c.id === fs.class_id || c.name.toLowerCase() === fs.className.toLowerCase()
    );
    const needsClassId = !fs.class_id && matchedClass;
    const needsFreq = !fs.billing_frequency;
    if (needsClassId || needsFreq) {
      const freq =
        fs.billing_frequency ||
        (fs.termOrMonth?.toLowerCase().includes('quarter')
          ? 'Quarterly'
          : fs.termOrMonth?.toLowerCase().includes('half')
          ? 'Half-Yearly'
          : fs.termOrMonth?.toLowerCase().includes('annual') || fs.termOrMonth?.toLowerCase().includes('year')
          ? 'Yearly'
          : 'Monthly');
      const patched: FeeStructure = {
        ...fs,
        class_id: fs.class_id || matchedClass?.id,
        billing_frequency: freq,
        termOrMonth: freq,
      };
      structuresToUpdate.push(patched);
      return patched;
    }
    return fs;
  });

  if (structuresToUpdate.length > 0 && db.objectStoreNames.contains('feeStructures')) {
    try {
      const tx = db.transaction('feeStructures', 'readwrite');
      for (const st of structuresToUpdate) {
        await tx.store.put(st);
      }
      await tx.done;
    } catch (e) {
      console.warn('Note patching feeStructures class_id:', e);
    }
  }

  // Keep settings.standardClasses synced with active sorted classes
  const activeNames = classes.filter(c => c.status === 'active').map(c => c.name);
  const syncedSettings: SchoolSettings = {
    ...settings,
    standardClasses: activeNames,
  };

  return { classes, settings: syncedSettings, feeStructures: updatedStructures };
}

export interface AppStateData {
  users: User[];
  classes: SchoolClass[];
  students: Student[];
  staff: Staff[];
  staffLeaves: StaffLeaveRequest[];
  studentAttendance: StudentAttendanceRecord[];
  staffAttendance: StaffAttendanceRecord[];
  feeStructures: FeeStructure[];
  feePayments: FeePayment[];
  expenses: Expense[];
  settings: SchoolSettings;
  exams: Exam[];
  examResults: ExamResult[];
  budgets: DepartmentBudget[];
  books: BookItem[];
  bookSales: BookSale[];
  bookSuppliers: BookSupplier[];
  supplierPayments: SupplierPayment[];
  activityLogs: ActivityLog[];
  certificates: IssuedCertificate[];
  assets: SchoolAsset[];
  payrollRuns: MonthlyPayrollRun[];
  salaryRecords: SalaryRecord[];
  timetableSlots?: TimetableSlot[];
  appPreferences?: Record<string, unknown>;
}

export async function initDatabase(): Promise<AppStateData> {
  try {
    const db = await getDB();
    const isCleanSlate = typeof window !== 'undefined' && localStorage.getItem('eduledger_is_clean_slate') === 'true';

    // Check if initial users exist
    const existingUsers = await db.getAll('users');
    if (existingUsers.length === 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('eduledger_db_initialized', 'true');
        localStorage.setItem('eduledger_is_clean_slate', 'true');
      }
      const rawSettings = await db.get('schoolSettings', 'main');
      const baseSettings: SchoolSettings = rawSettings ? rawSettings.data : cleanInitialSchoolSettings;
      const { classes, settings } = await ensureClassesInitialized(db, baseSettings, []);
      if (!rawSettings && db.objectStoreNames.contains('schoolSettings')) {
        await db.put('schoolSettings', { key: 'main', data: settings });
      }
      return {
        users: [],
        classes,
        students: [],
        staff: [],
        staffLeaves: [],
        studentAttendance: [],
        staffAttendance: [],
        feeStructures: [],
        feePayments: [],
        expenses: [],
        settings,
        exams: [],
        examResults: [],
        budgets: [],
        books: [],
        bookSales: [],
        bookSuppliers: [],
        supplierPayments: [],
        activityLogs: [],
        certificates: [],
        assets: [],
        payrollRuns: [],
        salaryRecords: [],
      };
    }

    const [
      users,
      students,
      staff,
      rawStaffLeaves,
      studentAttendance,
      staffAttendance,
      rawFeeStructures,
      feePayments,
      expenses,
      rawSettings,
      rawExams,
      rawResults,
      rawBudgets,
      rawBooks,
      rawBookSales,
      rawBookSuppliers,
      rawSupplierPayments,
      rawActivityLogs,
      rawCertificates,
      rawAssets,
      rawPayrollRuns,
      rawSalaryRecords,
    ] = await Promise.all([
      db.getAll('users'),
      db.getAll('students'),
      db.getAll('staff'),
      db.objectStoreNames.contains('staffLeaves') ? db.getAll('staffLeaves') : Promise.resolve([]),
      db.getAll('studentAttendance'),
      db.getAll('staffAttendance'),
      db.getAll('feeStructures'),
      db.getAll('feePayments'),
      db.getAll('expenses'),
      db.get('schoolSettings', 'main'),
      db.getAll('exams'),
      db.getAll('examResults'),
      db.getAll('budgets'),
      db.getAll('books'),
      db.getAll('bookSales'),
      db.getAll('bookSuppliers'),
      db.getAll('supplierPayments'),
      db.getAll('activityLogs'),
      db.objectStoreNames.contains('certificates') ? db.getAll('certificates') : Promise.resolve([]),
      db.objectStoreNames.contains('assets') ? db.getAll('assets') : Promise.resolve([]),
      db.objectStoreNames.contains('payrollRuns') ? db.getAll('payrollRuns') : Promise.resolve([]),
      db.objectStoreNames.contains('salaryRecords') ? db.getAll('salaryRecords') : Promise.resolve([]),
    ]);

    const baseSettings: SchoolSettings = rawSettings
      ? rawSettings.data
      : (isCleanSlate ? cleanInitialSchoolSettings : initialSchoolSettings);

    const { classes, settings, feeStructures } = await ensureClassesInitialized(
      db,
      baseSettings,
      rawFeeStructures || []
    );

    const exams = rawExams || [];
    const examResults = rawResults || [];
    const budgets = rawBudgets || [];
    const books = rawBooks || [];
    const bookSales = rawBookSales || [];
    const bookSuppliers = rawBookSuppliers || [];
    const supplierPayments = rawSupplierPayments || [];
    const finalStudentAttendance = studentAttendance || [];
    const finalStaffAttendance = staffAttendance || [];
    const finalActivityLogs = rawActivityLogs || [];
    const finalCertificates = rawCertificates || [];
    const finalStaffLeaves = rawStaffLeaves || [];
    const finalAssets = rawAssets || [];
    const finalPayrollRuns: MonthlyPayrollRun[] = rawPayrollRuns || [];
    const finalSalaryRecords: SalaryRecord[] = rawSalaryRecords || [];

    return {
      users,
      classes,
      students,
      staff,
      staffLeaves: finalStaffLeaves,
      studentAttendance: finalStudentAttendance,
      staffAttendance: finalStaffAttendance,
      feeStructures,
      feePayments,
      expenses,
      settings,
      exams,
      examResults,
      budgets,
      books,
      bookSales,
      bookSuppliers,
      supplierPayments,
      activityLogs: finalActivityLogs,
      certificates: finalCertificates,
      assets: finalAssets,
      payrollRuns: finalPayrollRuns,
      salaryRecords: finalSalaryRecords,
    };
  } catch (error) {
    console.warn('IndexedDB unavailable or failed, falling back to LocalStorage memory:', error);
    return loadFromLocalStorage();
  }
}

export async function seedDatabase(): Promise<AppStateData> {
  const db = await getDB();
  const tx = db.transaction(
    [
      'users',
      'classes',
      'students',
      'staff',
      'staffLeaves',
      'studentAttendance',
      'staffAttendance',
      'feeStructures',
      'feePayments',
      'expenses',
      'schoolSettings',
      'exams',
      'examResults',
      'budgets',
      'books',
      'bookSales',
      'bookSuppliers',
      'supplierPayments',
      'activityLogs',
      'certificates',
      'assets',
      'payrollRuns',
      'salaryRecords',
    ],
    'readwrite'
  );

  // Clear existing
  await Promise.all([
    tx.objectStore('users').clear(),
    tx.objectStore('classes').clear(),
    tx.objectStore('students').clear(),
    tx.objectStore('staff').clear(),
    tx.objectStore('staffLeaves').clear(),
    tx.objectStore('studentAttendance').clear(),
    tx.objectStore('staffAttendance').clear(),
    tx.objectStore('feeStructures').clear(),
    tx.objectStore('feePayments').clear(),
    tx.objectStore('expenses').clear(),
    tx.objectStore('schoolSettings').clear(),
    tx.objectStore('exams').clear(),
    tx.objectStore('examResults').clear(),
    tx.objectStore('budgets').clear(),
    tx.objectStore('books').clear(),
    tx.objectStore('bookSales').clear(),
    tx.objectStore('bookSuppliers').clear(),
    tx.objectStore('supplierPayments').clear(),
    tx.objectStore('activityLogs').clear(),
    tx.objectStore('certificates').clear(),
    tx.objectStore('assets').clear(),
    tx.objectStore('payrollRuns').clear(),
    tx.objectStore('salaryRecords').clear(),
  ]);

  const { studentAttendance, staffAttendance } = getInitialAttendance();
  const { feePayments, expenses } = getInitialFinancialRecords();

  const demoUsers = initialUsers.map(u => ({ ...u, isDemo: true }));
  const demoStudents = initialStudents.map(s => ({ ...s, isDemo: true }));
  const demoStaff = initialStaff.map(st => ({ ...st, isDemo: true }));
  const demoStaffLeaves = initialStaffLeaves.map(sl => ({ ...sl, isDemo: true }));
  const demoStudentAtt = studentAttendance.map(a => ({ ...a, isDemo: true }));
  const demoStaffAtt = staffAttendance.map(a => ({ ...a, isDemo: true }));
  const demoFeeStructures = initialFeeStructures.map(f => ({ ...f, isDemo: true }));
  const demoFeePayments = feePayments.map(p => ({ ...p, isDemo: true }));
  const demoExpenses = expenses.map(e => ({ ...e, isDemo: true }));
  const demoExams = initialExams.map(ex => ({ ...ex, isDemo: true }));
  const demoExamResults = initialExamResults.map(r => ({ ...r, isDemo: true }));
  const demoBudgets = initialBudgets.map(b => ({ ...b, isDemo: true }));
  const demoBooks = initialBooks.map(bk => ({ ...bk, isDemo: true }));
  const demoBookSales = initialBookSales.map(bs => ({ ...bs, isDemo: true }));
  const demoBookSuppliers = initialBookSuppliers.map(sup => ({ ...sup, isDemo: true }));
  const demoSupplierPayments = initialSupplierPayments.map(sp => ({ ...sp, isDemo: true }));
  const demoActivityLogs = initialActivityLogs.map(l => ({ ...l, isDemo: true }));
  const demoCertificates = initialCertificates.map(c => ({ ...c, isDemo: true }));
  const demoAssets = initialAssets.map(ast => ({ ...ast, isDemo: true }));

  for (const item of DEFAULT_SCHOOL_CLASSES) await tx.objectStore('classes').put(item);
  for (const item of demoUsers) await tx.objectStore('users').put(item);
  for (const item of demoStudents) await tx.objectStore('students').put(item);
  for (const item of demoStaff) await tx.objectStore('staff').put(item);
  for (const item of demoStaffLeaves) await tx.objectStore('staffLeaves').put(item);
  for (const item of demoStudentAtt) await tx.objectStore('studentAttendance').put(item);
  for (const item of demoStaffAtt) await tx.objectStore('staffAttendance').put(item);
  for (const item of demoFeeStructures) await tx.objectStore('feeStructures').put(item);
  for (const item of demoFeePayments) await tx.objectStore('feePayments').put(item);
  for (const item of demoExpenses) await tx.objectStore('expenses').put(item);
  await tx.objectStore('schoolSettings').put({ key: 'main', data: { ...initialSchoolSettings, isDemoActive: true } });
  for (const item of demoExams) await tx.objectStore('exams').put(item);
  for (const item of demoExamResults) await tx.objectStore('examResults').put(item);
  for (const item of demoBudgets) await tx.objectStore('budgets').put(item);
  for (const item of demoBooks) await tx.objectStore('books').put(item);
  for (const item of demoBookSales) await tx.objectStore('bookSales').put(item);
  for (const item of demoBookSuppliers) await tx.objectStore('bookSuppliers').put(item);
  for (const item of demoSupplierPayments) await tx.objectStore('supplierPayments').put(item);
  for (const item of demoActivityLogs) await tx.objectStore('activityLogs').put(item);
  for (const item of demoCertificates) await tx.objectStore('certificates').put(item);
  for (const item of demoAssets) await tx.objectStore('assets').put(item);

  const initialSalaryRecords: SalaryRecord[] = [];
  const taggedPayrollRuns: MonthlyPayrollRun[] = [];

  for (const run of initialPayrollRuns) {
    const taggedRun: MonthlyPayrollRun = {
      ...run,
      isDemo: true,
      employees: run.employees.map(emp => ({ ...emp, isDemo: true })),
    };
    taggedPayrollRuns.push(taggedRun);
    await tx.objectStore('payrollRuns').put(taggedRun);
    for (const emp of taggedRun.employees) {
      const rec: SalaryRecord = {
        id: `${run.id}_${emp.staffId}`,
        runId: run.id,
        month: run.month,
        fiscalYear: run.fiscalYear,
        ...emp,
        isDemo: true,
      };
      initialSalaryRecords.push(rec);
      await tx.objectStore('salaryRecords').put(rec);
    }
  }

  await tx.done;

  // Seed demo payroll loans and advances
  payrollStorage.seedDemoPayrollData();

  if (typeof window !== 'undefined') {
    localStorage.setItem('eduledger_has_demo_data', 'true');
    localStorage.removeItem('eduledger_is_clean_slate');
    localStorage.setItem('eduledger_db_initialized', 'true');
    localStorage.setItem(CLASSES_SEEDED_FLAG, 'true');
  }

  return {
    users: demoUsers,
    classes: DEFAULT_SCHOOL_CLASSES.map(c => ({ ...c })),
    students: demoStudents,
    staff: demoStaff,
    staffLeaves: demoStaffLeaves,
    studentAttendance: demoStudentAtt,
    staffAttendance: demoStaffAtt,
    feeStructures: demoFeeStructures,
    feePayments: demoFeePayments,
    expenses: demoExpenses,
    settings: { ...initialSchoolSettings, isDemoActive: true },
    exams: demoExams,
    examResults: demoExamResults,
    budgets: demoBudgets,
    books: demoBooks,
    bookSales: demoBookSales,
    bookSuppliers: demoBookSuppliers,
    supplierPayments: demoSupplierPayments,
    activityLogs: demoActivityLogs,
    certificates: demoCertificates,
    assets: demoAssets,
    payrollRuns: taggedPayrollRuns,
    salaryRecords: initialSalaryRecords,
  };
}

/**
 * Removes only demo records tagged with isDemo: true from all object stores.
 * Real records created by users are preserved.
 */
export async function removeDemoDataDB(): Promise<{
  deletedCounts: Record<string, number>;
  totalDeleted: number;
}> {
  const db = await getDB();
  const storesToClean = [
    'students',
    'staff',
    'staffLeaves',
    'studentAttendance',
    'staffAttendance',
    'feeStructures',
    'feePayments',
    'expenses',
    'exams',
    'examResults',
    'budgets',
    'books',
    'bookSales',
    'bookSuppliers',
    'supplierPayments',
    'certificates',
    'assets',
    'payrollRuns',
    'salaryRecords',
  ];

  const deletedCounts: Record<string, number> = {};
  let totalDeleted = 0;

  const validStores = storesToClean.filter(s => db.objectStoreNames.contains(s));
  const tx = db.transaction(validStores, 'readwrite');

  for (const storeName of validStores) {
    const store = tx.objectStore(storeName);
    const allItems = await store.getAll();
    let storeDeleted = 0;
    for (const item of allItems) {
      if (item && item.isDemo === true) {
        await store.delete(item.id || item.key);
        storeDeleted++;
      }
    }
    deletedCounts[storeName] = storeDeleted;
    totalDeleted += storeDeleted;
  }
  await tx.done;

  // Also purge demo loans and advances from payrollStorage
  const pResult = payrollStorage.removeDemoPayrollData();
  deletedCounts['payrollLoans'] = pResult.removedLoans;
  deletedCounts['payrollAdvances'] = pResult.removedAdvances;
  totalDeleted += pResult.removedLoans + pResult.removedAdvances;

  // Clear demo status in SchoolSettings
  try {
    const settingsTx = db.transaction('schoolSettings', 'readwrite');
    const existing = await settingsTx.objectStore('schoolSettings').get('main');
    if (existing && existing.data) {
      existing.data.isDemoActive = false;
      await settingsTx.objectStore('schoolSettings').put(existing);
    }
    await settingsTx.done;
  } catch {}

  if (typeof window !== 'undefined') {
    localStorage.removeItem('eduledger_has_demo_data');
  }

  return { deletedCounts, totalDeleted };
}

/**
 * Gathers exact counts of total, demo, and real user records per module.
 */
export async function getSchoolDataSummaryDB(): Promise<SchoolDataSummary> {
  const db = await getDB();

  const getCounts = async (storeName: string): Promise<ModuleDataCount> => {
    if (!db.objectStoreNames.contains(storeName)) {
      return { total: 0, demo: 0, real: 0 };
    }
    const items = await db.getAll(storeName);
    let demo = 0;
    let real = 0;
    for (const it of items) {
      if (it && it.isDemo === true) demo++;
      else real++;
    }
    return { total: items.length, demo, real };
  };

  const students = await getCounts('students');
  const staff = await getCounts('staff');
  const staffLeaves = await getCounts('staffLeaves');
  const studentAttendance = await getCounts('studentAttendance');
  const staffAttendance = await getCounts('staffAttendance');
  const feePayments = await getCounts('feePayments');
  const feeStructures = await getCounts('feeStructures');
  const expenses = await getCounts('expenses');
  const exams = await getCounts('exams');
  const examResults = await getCounts('examResults');
  const budgets = await getCounts('budgets');
  const books = await getCounts('books');
  const bookSales = await getCounts('bookSales');
  const bookSuppliers = await getCounts('bookSuppliers');
  const supplierPayments = await getCounts('supplierPayments');
  const certificates = await getCounts('certificates');
  const assets = await getCounts('assets');
  const payrollRuns = await getCounts('payrollRuns');
  const salaryRecords = await getCounts('salaryRecords');
  const activityLogs = await getCounts('activityLogs');

  const rawSettings = await db.get('schoolSettings', 'main');
  const timetableSlotsCount = rawSettings?.data?.timetable?.length || 0;
  const isDemoActive = rawSettings?.data?.isDemoActive === true;
  const timetable: ModuleDataCount = {
    total: timetableSlotsCount,
    demo: isDemoActive ? timetableSlotsCount : 0,
    real: isDemoActive ? 0 : timetableSlotsCount,
  };

  const combinedStaff: ModuleDataCount = {
    total: staff.total + staffLeaves.total,
    demo: staff.demo + staffLeaves.demo,
    real: staff.real + staffLeaves.real,
  };

  const combinedExams: ModuleDataCount = {
    total: exams.total + examResults.total,
    demo: exams.demo + examResults.demo,
    real: exams.real + examResults.real,
  };

  const combinedBooks: ModuleDataCount = {
    total: books.total + bookSales.total + bookSuppliers.total + supplierPayments.total,
    demo: books.demo + bookSales.demo + bookSuppliers.demo + supplierPayments.demo,
    real: books.real + bookSales.real + bookSuppliers.real + supplierPayments.real,
  };

  const combinedPayroll: ModuleDataCount = {
    total: payrollRuns.total + salaryRecords.total,
    demo: payrollRuns.demo + salaryRecords.demo,
    real: payrollRuns.real + salaryRecords.real,
  };

  const totalRecords =
    students.total +
    combinedStaff.total +
    studentAttendance.total +
    staffAttendance.total +
    feePayments.total +
    feeStructures.total +
    expenses.total +
    combinedPayroll.total +
    combinedExams.total +
    timetable.total +
    certificates.total +
    assets.total +
    combinedBooks.total +
    activityLogs.total;

  const totalDemoRecords =
    students.demo +
    combinedStaff.demo +
    studentAttendance.demo +
    staffAttendance.demo +
    feePayments.demo +
    feeStructures.demo +
    expenses.demo +
    combinedPayroll.demo +
    combinedExams.demo +
    timetable.demo +
    certificates.demo +
    assets.demo +
    combinedBooks.demo +
    activityLogs.demo;

  const totalRealRecords = totalRecords - totalDemoRecords;
  const hasDemoData = totalDemoRecords > 0 || isDemoActive;

  return {
    students,
    staff: combinedStaff,
    studentAttendance,
    staffAttendance,
    feePayments,
    feeStructures,
    expenses,
    payroll: combinedPayroll,
    exams: combinedExams,
    timetable,
    certificates,
    assets,
    books: combinedBooks,
    activityLogs,
    totalRecords,
    totalDemoRecords,
    totalRealRecords,
    hasDemoData,
  };
}

/**
 * Granularly clears selected modules from IndexedDB.
 * Cleans child records atomically (e.g. attendance, payments when students cleared).
 */
export async function clearSelectedModulesDB(
  moduleKeys: ClearableDataModule[]
): Promise<{ clearedModules: string[]; recordsDeleted: number }> {
  const db = await getDB();
  const storesToClear = new Set<string>();
  let recordsDeleted = 0;

  for (const mod of moduleKeys) {
    switch (mod) {
      case 'students':
        storesToClear.add('students');
        storesToClear.add('studentAttendance');
        storesToClear.add('feePayments');
        storesToClear.add('examResults');
        break;
      case 'staff':
        storesToClear.add('staff');
        storesToClear.add('staffLeaves');
        storesToClear.add('staffAttendance');
        break;
      case 'attendance':
        storesToClear.add('studentAttendance');
        storesToClear.add('staffAttendance');
        break;
      case 'feeCollections':
        storesToClear.add('feePayments');
        break;
      case 'feeStructures':
        storesToClear.add('feeStructures');
        break;
      case 'expenses':
        storesToClear.add('expenses');
        clearStoredRecurringTemplates();
        clearStoredBudgetThresholds();
        break;
      case 'books':
        storesToClear.add('books');
        storesToClear.add('bookSales');
        storesToClear.add('bookSuppliers');
        storesToClear.add('supplierPayments');
        break;
      case 'exams':
        storesToClear.add('exams');
        storesToClear.add('examResults');
        break;
      case 'budgets':
        storesToClear.add('budgets');
        clearStoredBudgetThresholds();
        break;
      case 'certificates':
        storesToClear.add('certificates');
        break;
      case 'assets':
        storesToClear.add('assets');
        break;
      case 'payroll':
        storesToClear.add('payrollRuns');
        storesToClear.add('salaryRecords');
        payrollStorage.clearAllPayrollData();
        break;
      case 'timetable':
        try {
          const raw = await db.get('schoolSettings', 'main');
          if (raw && raw.data) {
            raw.data.timetable = [];
            const tx = db.transaction('schoolSettings', 'readwrite');
            await tx.objectStore('schoolSettings').put(raw);
            await tx.done;
          }
        } catch {}
        break;
      case 'logs':
        storesToClear.add('activityLogs');
        break;
    }
  }

  const validStores = Array.from(storesToClear).filter(s => db.objectStoreNames.contains(s));
  if (validStores.length > 0) {
    const tx = db.transaction(validStores, 'readwrite');
    for (const s of validStores) {
      const all = await tx.objectStore(s).getAll();
      recordsDeleted += all.length;
      await tx.objectStore(s).clear();
    }
    await tx.done;
  }

  return { clearedModules: moduleKeys, recordsDeleted };
}

/**
 * Purges financial data only: fees, payments, expenses, payroll runs, loans, budgets.
 * Preserves student and staff profiles and academic records.
 */
export async function clearFinancialDataDB(): Promise<{ recordsDeleted: number }> {
  const db = await getDB();
  const financialStores = [
    'feePayments',
    'expenses',
    'payrollRuns',
    'salaryRecords',
    'budgets',
    'supplierPayments',
    'bookSales',
  ].filter(s => db.objectStoreNames.contains(s));

  let recordsDeleted = 0;
  if (financialStores.length > 0) {
    const tx = db.transaction(financialStores, 'readwrite');
    for (const s of financialStores) {
      const all = await tx.objectStore(s).getAll();
      recordsDeleted += all.length;
      await tx.objectStore(s).clear();
    }
    await tx.done;
  }

  payrollStorage.clearAllPayrollData();
  clearStoredRecurringTemplates();
  clearStoredBudgetThresholds();

  return { recordsDeleted };
}

/**
 * Granularly clear specified IndexedDB tables.
 */
export async function clearStoresDB(storeNames: string[]): Promise<void> {
  const db = await getDB();
  const validStores = storeNames.filter(s => db.objectStoreNames.contains(s));
  if (validStores.length === 0) return;
  const tx = db.transaction(validStores, 'readwrite');
  await Promise.all(validStores.map(s => tx.objectStore(s).clear()));
  await tx.done;
  if (typeof window !== 'undefined') {
    localStorage.setItem('eduledger_db_initialized', 'true');
  }
}

/**
 * Full School Purge / Factory Reset.
 * Resets all operational school records (students, staff, fees, expenses, books, exams, attendance, assets, payroll, timetables)
 * so that a new institution can immediately begin from a completely clean slate.
 */
export async function resetEntireSchoolDatabaseDB(options?: {
  keepCurrentUser?: boolean;
  currentUserId?: string;
  newSchoolName?: string;
  newSchoolTagline?: string;
  newCurrency?: string;
}): Promise<AppStateData> {
  const db = await getDB();

  let userToPreserve: User | null = null;
  if (options?.keepCurrentUser) {
    const allUsers = await db.getAll('users');
    if (options.currentUserId) {
      userToPreserve = allUsers.find(u => u.id === options.currentUserId) || null;
    }
    if (!userToPreserve) {
      userToPreserve = allUsers.find(u => (u.role === 'admin' || u.role === 'super_admin') && u.isActive) || allUsers[0] || null;
    }
  }

  const allStores = [
    'users',
    'classes',
    'students',
    'staff',
    'staffLeaves',
    'studentAttendance',
    'staffAttendance',
    'feeStructures',
    'feePayments',
    'expenses',
    'schoolSettings',
    'exams',
    'examResults',
    'budgets',
    'books',
    'bookSales',
    'bookSuppliers',
    'supplierPayments',
    'activityLogs',
    'certificates',
    'assets',
    'payrollRuns',
    'salaryRecords',
  ].filter(s => db.objectStoreNames.contains(s));

  const tx = db.transaction(allStores, 'readwrite');
  await Promise.all(allStores.map(s => tx.objectStore(s).clear()));

  const preservedUsers: User[] = [];
  if (userToPreserve) {
    preservedUsers.push(userToPreserve);
    await tx.objectStore('users').put(userToPreserve);
  }

  const defaultClasses = DEFAULT_SCHOOL_CLASSES.map(c => ({ ...c }));
  if (db.objectStoreNames.contains('classes')) {
    for (const cls of defaultClasses) {
      await tx.objectStore('classes').put(cls);
    }
  }

  const cleanSettings: SchoolSettings = {
    ...cleanInitialSchoolSettings,
    schoolName: options?.newSchoolName?.trim() || 'My School',
    schoolTagline: options?.newSchoolTagline?.trim() || 'Excellence in Education',
    currencySymbol: options?.newCurrency?.trim() || 'PKR',
    currencyCode: options?.newCurrency?.trim() || 'PKR',
    receiptPrefix: `REC-${new Date().getFullYear()}`,
  };

  await tx.objectStore('schoolSettings').put({ key: 'main', data: cleanSettings });
  await tx.done;

  if (typeof window !== 'undefined') {
    localStorage.setItem('eduledger_is_clean_slate', 'true');
    localStorage.setItem('eduledger_db_initialized', 'true');
    localStorage.setItem(CLASSES_SEEDED_FLAG, 'true');

    // Remove operational localStorage records
    localStorage.removeItem('eduledger_timetable_schedules');
    localStorage.removeItem('eduledger_timetable_slots');
    localStorage.removeItem('eduledger_recurring_expenses');
    localStorage.removeItem('eduledger_budget_thresholds');
    localStorage.removeItem('eduledger_payroll_runs');
    localStorage.removeItem('eduledger_staff_loans');
    localStorage.removeItem('eduledger_staff_advances');
    localStorage.removeItem('eduledger_payroll_audit_logs');
    localStorage.removeItem('eduledger_last_backup_timestamp');
    localStorage.removeItem('eduledger_last_backup_filename');
    localStorage.removeItem('eduledger_last_restore_timestamp');
    localStorage.removeItem('eduledger_local_cache');
    localStorage.removeItem('eduledger_notifications');

    if (!options?.keepCurrentUser) {
      localStorage.removeItem('eduledger_secure_session_v1');
      localStorage.removeItem('eduledger_current_session_id');
      localStorage.removeItem('eduledger_current_user_name');
      localStorage.removeItem('eduledger_current_user_role');
      sessionStorage.clear();
    }

    window.dispatchEvent(new CustomEvent('eduledger-timetable-updated', { detail: [] }));
  }

  return {
    users: preservedUsers,
    classes: defaultClasses,
    students: [],
    staff: [],
    staffLeaves: [],
    studentAttendance: [],
    staffAttendance: [],
    feeStructures: [],
    feePayments: [],
    expenses: [],
    settings: cleanSettings,
    exams: [],
    examResults: [],
    budgets: [],
    books: [],
    bookSales: [],
    bookSuppliers: [],
    supplierPayments: [],
    activityLogs: [],
    certificates: [],
    assets: [],
    payrollRuns: [],
    salaryRecords: [],
    timetableSlots: [],
  };
}

export interface BackupInspectionResult {
  valid: boolean;
  error?: string;
  isEncrypted?: boolean;
  application?: string;
  schemaVersion?: number;
  exportedAt?: string;
  schoolName?: string;
  entityCounts: BackupEntityCounts;
  data?: AppStateData;
}

export async function exportFullDatabaseJson(): Promise<string> {
  const db = await getDB();
  const [
    users,
    classes,
    students,
    staff,
    staffLeaves,
    studentAttendance,
    staffAttendance,
    feeStructures,
    feePayments,
    expenses,
    rawSettings,
    exams,
    examResults,
    budgets,
    books,
    bookSales,
    bookSuppliers,
    supplierPayments,
    activityLogs,
    certificates,
    assets,
    rawPayrollRuns,
    rawSalaryRecords,
  ] = await Promise.all([
    db.getAll('users'),
    db.objectStoreNames.contains('classes') ? db.getAll('classes') : Promise.resolve([]),
    db.getAll('students'),
    db.getAll('staff'),
    db.objectStoreNames.contains('staffLeaves') ? db.getAll('staffLeaves') : Promise.resolve([]),
    db.getAll('studentAttendance'),
    db.getAll('staffAttendance'),
    db.getAll('feeStructures'),
    db.getAll('feePayments'),
    db.getAll('expenses'),
    db.get('schoolSettings', 'main'),
    db.getAll('exams'),
    db.getAll('examResults'),
    db.getAll('budgets'),
    db.getAll('books'),
    db.getAll('bookSales'),
    db.getAll('bookSuppliers'),
    db.getAll('supplierPayments'),
    db.getAll('activityLogs'),
    db.objectStoreNames.contains('certificates') ? db.getAll('certificates') : Promise.resolve([]),
    db.objectStoreNames.contains('assets') ? db.getAll('assets') : Promise.resolve([]),
    db.objectStoreNames.contains('payrollRuns') ? db.getAll('payrollRuns') : Promise.resolve([]),
    db.objectStoreNames.contains('salaryRecords') ? db.getAll('salaryRecords') : Promise.resolve([]),
  ]);

  const resolvedSettings = rawSettings ? rawSettings.data : initialSchoolSettings;

  // Retrieve client-side timetable slots from localStorage
  let timetableSlots: TimetableSlot[] = [];
  try {
    const rawSlots = localStorage.getItem('eduledger_timetable_schedules');
    if (rawSlots) {
      const parsed = JSON.parse(rawSlots);
      if (Array.isArray(parsed)) {
        timetableSlots = parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read timetable schedules for backup export:', e);
  }

  // Retrieve client preferences
  const preferences: Record<string, unknown> = {};
  try {
    preferences['theme'] = localStorage.getItem('eduledger_theme');
    preferences['bookLowStockThreshold'] = localStorage.getItem('eduledger_book_low_stock_threshold');
    preferences['autoBackupConfig'] = localStorage.getItem('eduledger_auto_backup_config');
  } catch {
    // Ignore storage errors in restricted contexts
  }

  const entityCounts: BackupEntityCounts = {
    classes: classes?.length || 0,
    students: students?.length || 0,
    staff: staff?.length || 0,
    staffLeaves: staffLeaves?.length || 0,
    feePayments: feePayments?.length || 0,
    expenses: expenses?.length || 0,
    studentAttendance: studentAttendance?.length || 0,
    staffAttendance: staffAttendance?.length || 0,
    users: users?.length || 0,
    feeStructures: feeStructures?.length || 0,
    exams: exams?.length || 0,
    examResults: examResults?.length || 0,
    budgets: budgets?.length || 0,
    books: books?.length || 0,
    bookSales: bookSales?.length || 0,
    bookSuppliers: bookSuppliers?.length || 0,
    supplierPayments: supplierPayments?.length || 0,
    activityLogs: activityLogs?.length || 0,
    certificates: certificates?.length || 0,
    assets: assets?.length || 0,
    payrollRuns: rawPayrollRuns?.length || 0,
    salaryRecords: rawSalaryRecords?.length || 0,
    timetableSlots: timetableSlots.length,
  };

  const backup = {
    application: 'EduLedger School Management System',
    schemaVersion: DB_VERSION,
    exportedAt: new Date().toISOString(),
    schoolName: resolvedSettings?.schoolName || 'EduLedger International School',
    entityCounts,
    data: {
      users: users || [],
      classes: classes || [],
      students: students || [],
      staff: staff || [],
      staffLeaves: staffLeaves || [],
      studentAttendance: studentAttendance || [],
      staffAttendance: staffAttendance || [],
      feeStructures: feeStructures || [],
      feePayments: feePayments || [],
      expenses: expenses || [],
      settings: resolvedSettings,
      exams: exams || [],
      examResults: examResults || [],
      budgets: budgets || [],
      books: books || [],
      bookSales: bookSales || [],
      bookSuppliers: bookSuppliers || [],
      supplierPayments: supplierPayments || [],
      activityLogs: activityLogs || [],
      certificates: certificates || [],
      assets: assets || [],
      payrollRuns: rawPayrollRuns || [],
      salaryRecords: rawSalaryRecords || [],
      timetableSlots,
      appPreferences: preferences,
    },
  };

  return JSON.stringify(backup, null, 2);
}

export function inspectBackupJson(jsonString: string): BackupInspectionResult {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return {
        valid: false,
        error: 'Uploaded file is not a valid JSON object.',
        entityCounts: {
          students: 0,
          staff: 0,
          feePayments: 0,
          expenses: 0,
          studentAttendance: 0,
          staffAttendance: 0,
          users: 0,
          exams: 0,
          examResults: 0,
          budgets: 0,
          books: 0,
          bookSales: 0,
          activityLogs: 0,
        },
      };
    }

    // Check if this is an AES-GCM password encrypted backup
    if (parsed.encrypted === true && parsed.ciphertext && parsed.salt && parsed.iv) {
      return {
        valid: true,
        isEncrypted: true,
        schoolName: parsed.schoolName || 'Encrypted School Database Backup',
        exportedAt: parsed.exportedAt,
        entityCounts: {
          students: 0,
          staff: 0,
          feePayments: 0,
          expenses: 0,
          studentAttendance: 0,
          staffAttendance: 0,
          users: 0,
          exams: 0,
          examResults: 0,
          budgets: 0,
          books: 0,
          bookSales: 0,
          activityLogs: 0,
        },
      };
    }

    const data = parsed.data || parsed;
    // Check if at least core arrays exist or settings exist
    const hasCoreEntities =
      Array.isArray(data.students) ||
      Array.isArray(data.staff) ||
      Array.isArray(data.feePayments) ||
      Array.isArray(data.assets) ||
      Array.isArray(data.timetableSlots) ||
      Boolean(data.settings);

    if (!hasCoreEntities) {
      return {
        valid: false,
        error: 'JSON file does not contain recognized EduLedger database entity records.',
        entityCounts: {
          students: 0,
          staff: 0,
          feePayments: 0,
          expenses: 0,
          studentAttendance: 0,
          staffAttendance: 0,
          users: 0,
          exams: 0,
          examResults: 0,
          budgets: 0,
          books: 0,
          bookSales: 0,
          activityLogs: 0,
        },
      };
    }

    const schoolName = data.settings?.schoolName || parsed.schoolName || 'EduLedger School';

    const restoredClasses: SchoolClass[] = Array.isArray(data.classes)
      ? data.classes
      : buildClassesFromNames(data.settings?.standardClasses || [], data.settings?.standardSections || ['A', 'B', 'C']);

    const entityCounts: BackupEntityCounts = {
      classes: restoredClasses.length,
      students: Array.isArray(data.students) ? data.students.length : 0,
      staff: Array.isArray(data.staff) ? data.staff.length : 0,
      staffLeaves: Array.isArray(data.staffLeaves) ? data.staffLeaves.length : 0,
      feePayments: Array.isArray(data.feePayments) ? data.feePayments.length : 0,
      expenses: Array.isArray(data.expenses) ? data.expenses.length : 0,
      studentAttendance: Array.isArray(data.studentAttendance) ? data.studentAttendance.length : 0,
      staffAttendance: Array.isArray(data.staffAttendance) ? data.staffAttendance.length : 0,
      users: Array.isArray(data.users) ? data.users.length : 0,
      feeStructures: Array.isArray(data.feeStructures) ? data.feeStructures.length : 0,
      exams: Array.isArray(data.exams) ? data.exams.length : 0,
      examResults: Array.isArray(data.examResults) ? data.examResults.length : 0,
      budgets: Array.isArray(data.budgets) ? data.budgets.length : 0,
      books: Array.isArray(data.books) ? data.books.length : 0,
      bookSales: Array.isArray(data.bookSales) ? data.bookSales.length : 0,
      bookSuppliers: Array.isArray(data.bookSuppliers) ? data.bookSuppliers.length : 0,
      supplierPayments: Array.isArray(data.supplierPayments) ? data.supplierPayments.length : 0,
      activityLogs: Array.isArray(data.activityLogs) ? data.activityLogs.length : 0,
      certificates: Array.isArray(data.certificates) ? data.certificates.length : 0,
      assets: Array.isArray(data.assets) ? data.assets.length : 0,
      timetableSlots: Array.isArray(data.timetableSlots) ? data.timetableSlots.length : 0,
      payrollRuns: Array.isArray(data.payrollRuns) ? data.payrollRuns.length : 0,
      salaryRecords: Array.isArray(data.salaryRecords) ? data.salaryRecords.length : 0,
    };

    return {
      valid: true,
      application: parsed.application || 'EduLedger School Management System',
      schemaVersion: parsed.schemaVersion || parsed.version || DB_VERSION,
      exportedAt: parsed.exportedAt || undefined,
      schoolName,
      entityCounts,
      data: {
        users: data.users || [],
        classes: restoredClasses,
        students: data.students || [],
        staff: data.staff || [],
        staffLeaves: data.staffLeaves || [],
        studentAttendance: data.studentAttendance || [],
        staffAttendance: data.staffAttendance || [],
        feeStructures: data.feeStructures || [],
        feePayments: data.feePayments || [],
        expenses: data.expenses || [],
        settings: data.settings || initialSchoolSettings,
        exams: data.exams || [],
        examResults: data.examResults || [],
        budgets: data.budgets || initialBudgets,
        books: data.books || initialBooks,
        bookSales: data.bookSales || initialBookSales,
        bookSuppliers: data.bookSuppliers || initialBookSuppliers,
        supplierPayments: data.supplierPayments || initialSupplierPayments,
        activityLogs: data.activityLogs || initialActivityLogs,
        certificates: data.certificates || initialCertificates,
        assets: data.assets || initialAssets,
        payrollRuns: data.payrollRuns || [],
        salaryRecords: data.salaryRecords || [],
        timetableSlots: data.timetableSlots || [],
        appPreferences: data.appPreferences || {},
      },
    };
  } catch (err: unknown) {
    return {
      valid: false,
      error: `Failed to parse JSON file: ${err instanceof Error ? err.message : 'Syntax error in JSON file'}`,
      entityCounts: {
        students: 0,
        staff: 0,
        feePayments: 0,
        expenses: 0,
        studentAttendance: 0,
        staffAttendance: 0,
        users: 0,
        exams: 0,
        examResults: 0,
        budgets: 0,
        books: 0,
        bookSales: 0,
        activityLogs: 0,
      },
    };
  }
}

export async function importFullDatabaseJson(jsonString: string): Promise<AppStateData> {
  const inspection = inspectBackupJson(jsonString);
  if (!inspection.valid || !inspection.data) {
    throw new Error(inspection.error || 'Invalid backup data.');
  }

  const data = inspection.data;
  const db = await getDB();
  const allStoreNames = [
    'users',
    'classes',
    'students',
    'staff',
    'staffLeaves',
    'studentAttendance',
    'staffAttendance',
    'feeStructures',
    'feePayments',
    'expenses',
    'schoolSettings',
    'exams',
    'examResults',
    'budgets',
    'books',
    'bookSales',
    'bookSuppliers',
    'supplierPayments',
    'activityLogs',
    'certificates',
    'assets',
    'payrollRuns',
    'salaryRecords',
  ].filter(store => db.objectStoreNames.contains(store));

  const tx = db.transaction(allStoreNames, 'readwrite');

  await Promise.all(allStoreNames.map(name => tx.objectStore(name).clear()));

  if (Array.isArray(data.users) && db.objectStoreNames.contains('users')) {
    for (const item of data.users) await tx.objectStore('users').put(item);
  }
  if (Array.isArray(data.classes) && db.objectStoreNames.contains('classes')) {
    for (const item of data.classes) await tx.objectStore('classes').put(item);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CLASSES_SEEDED_FLAG, 'true');
    }
  }
  if (Array.isArray(data.students) && db.objectStoreNames.contains('students')) {
    for (const item of data.students) {
      if (!item || typeof item !== 'object') continue;
      // Backward-compatible restore: old backups missing optional admission fields restore cleanly
      await tx.objectStore('students').put({
        ...item,
        formTemplateId: item.formTemplateId || 'standard',
      });
    }
  }
  if (Array.isArray(data.staff) && db.objectStoreNames.contains('staff')) {
    for (const item of data.staff) await tx.objectStore('staff').put(item);
  }
  if (Array.isArray(data.staffLeaves) && db.objectStoreNames.contains('staffLeaves')) {
    for (const item of data.staffLeaves) await tx.objectStore('staffLeaves').put(item);
  }
  if (Array.isArray(data.studentAttendance) && db.objectStoreNames.contains('studentAttendance')) {
    for (const item of data.studentAttendance) await tx.objectStore('studentAttendance').put(item);
  }
  if (Array.isArray(data.staffAttendance) && db.objectStoreNames.contains('staffAttendance')) {
    for (const item of data.staffAttendance) await tx.objectStore('staffAttendance').put(item);
  }
  if (Array.isArray(data.feeStructures) && db.objectStoreNames.contains('feeStructures')) {
    for (const item of data.feeStructures) await tx.objectStore('feeStructures').put(item);
  }
  if (Array.isArray(data.feePayments) && db.objectStoreNames.contains('feePayments')) {
    for (const item of data.feePayments) {
      const gross_fee = typeof item.gross_fee === 'number' ? item.gross_fee : (item.totalAmount || 0);
      const discount_amount = typeof item.discount_amount === 'number' ? item.discount_amount : 0;
      const discount_reason = typeof item.discount_reason === 'string' ? item.discount_reason : '';
      const net_fee = typeof item.net_fee === 'number' ? item.net_fee : Math.max(0, gross_fee - discount_amount);
      await tx.objectStore('feePayments').put({
        ...item,
        gross_fee,
        discount_amount,
        discount_reason,
        net_fee,
      });
    }
  }
  if (Array.isArray(data.expenses) && db.objectStoreNames.contains('expenses')) {
    for (const item of data.expenses) await tx.objectStore('expenses').put(item);
  }
  if (data.settings && db.objectStoreNames.contains('schoolSettings')) {
    await tx.objectStore('schoolSettings').put({ key: 'main', data: data.settings });
  }
  if (Array.isArray(data.exams) && db.objectStoreNames.contains('exams')) {
    for (const item of data.exams) await tx.objectStore('exams').put(item);
  }
  if (Array.isArray(data.examResults) && db.objectStoreNames.contains('examResults')) {
    for (const item of data.examResults) await tx.objectStore('examResults').put(item);
  }
  if (Array.isArray(data.budgets) && db.objectStoreNames.contains('budgets')) {
    for (const item of data.budgets) await tx.objectStore('budgets').put(item);
  }
  if (Array.isArray(data.books) && db.objectStoreNames.contains('books')) {
    for (const item of data.books) await tx.objectStore('books').put(item);
  }
  if (Array.isArray(data.bookSales) && db.objectStoreNames.contains('bookSales')) {
    for (const item of data.bookSales) await tx.objectStore('bookSales').put(item);
  }
  if (Array.isArray(data.bookSuppliers) && db.objectStoreNames.contains('bookSuppliers')) {
    for (const item of data.bookSuppliers) await tx.objectStore('bookSuppliers').put(item);
  }
  if (Array.isArray(data.supplierPayments) && db.objectStoreNames.contains('supplierPayments')) {
    for (const item of data.supplierPayments) await tx.objectStore('supplierPayments').put(item);
  }
  if (Array.isArray(data.activityLogs) && db.objectStoreNames.contains('activityLogs')) {
    for (const item of data.activityLogs) await tx.objectStore('activityLogs').put(item);
  }
  if (Array.isArray(data.certificates) && db.objectStoreNames.contains('certificates')) {
    for (const item of data.certificates) await tx.objectStore('certificates').put(item);
  }
  if (Array.isArray(data.assets) && db.objectStoreNames.contains('assets')) {
    for (const item of data.assets) await tx.objectStore('assets').put(item);
  }
  if (Array.isArray(data.payrollRuns) && db.objectStoreNames.contains('payrollRuns')) {
    for (const item of data.payrollRuns) await tx.objectStore('payrollRuns').put(item);
  }
  if (Array.isArray(data.salaryRecords) && db.objectStoreNames.contains('salaryRecords')) {
    for (const item of data.salaryRecords) await tx.objectStore('salaryRecords').put(item);
  }

  await tx.done;

  // Restore client-side Timetable Slots to localStorage and notify components
  if (Array.isArray(data.timetableSlots) && data.timetableSlots.length > 0) {
    try {
      localStorage.setItem('eduledger_timetable_schedules', JSON.stringify(data.timetableSlots));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('eduledger-timetable-updated', { detail: data.timetableSlots })
        );
      }
    } catch (e) {
      console.warn('Failed to restore timetable schedules into localStorage:', e);
    }
  }

  // Restore preferences if present
  if (data.appPreferences && typeof data.appPreferences === 'object') {
    try {
      if (typeof data.appPreferences['theme'] === 'string') {
        localStorage.setItem('eduledger_theme', data.appPreferences['theme']);
      }
      if (typeof data.appPreferences['bookLowStockThreshold'] === 'string') {
        localStorage.setItem('eduledger_book_low_stock_threshold', data.appPreferences['bookLowStockThreshold']);
      }
    } catch {
      // Ignore
    }
  }

  return data;
}

// LocalStorage fallback for edge browser environments
function loadFromLocalStorage(): AppStateData {
  try {
    const raw = localStorage.getItem('eduledger_local_cache');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error(e);
  }
  const { studentAttendance, staffAttendance } = getInitialAttendance();
  const { feePayments, expenses } = getInitialFinancialRecords();
  return {
    users: initialUsers,
    classes: DEFAULT_SCHOOL_CLASSES.map(c => ({ ...c })),
    students: initialStudents,
    staff: initialStaff,
    staffLeaves: initialStaffLeaves,
    studentAttendance,
    staffAttendance,
    feeStructures: initialFeeStructures,
    feePayments,
    expenses,
    settings: initialSchoolSettings,
    exams: initialExams,
    examResults: initialExamResults,
    budgets: initialBudgets,
    books: initialBooks,
    bookSales: initialBookSales,
    bookSuppliers: initialBookSuppliers,
    supplierPayments: initialSupplierPayments,
    activityLogs: initialActivityLogs,
    certificates: initialCertificates,
    assets: initialAssets,
    payrollRuns: initialPayrollRuns,
    salaryRecords: initialPayrollRuns.flatMap(r =>
      r.employees.map(e => ({
        id: `${r.id}_${e.staffId}`,
        runId: r.id,
        month: r.month,
        fiscalYear: r.fiscalYear,
        ...e,
      }))
    ),
  };
}

// Staff Leaves CRUD Operations
export async function saveStaffLeaveDB(leave: StaffLeaveRequest): Promise<void> {
  const db = await getDB();
  await db.put('staffLeaves', leave);
}

export async function deleteStaffLeaveDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('staffLeaves', id);
}

// Exam and Results CRUD Operations
export async function addExamDB(exam: Exam): Promise<void> {
  const db = await getDB();
  await db.put('exams', exam);
}

export async function updateExamDB(exam: Exam): Promise<void> {
  const db = await getDB();
  await db.put('exams', exam);
}

export async function deleteExamDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('exams', id);
}

export async function saveExamResultDB(result: ExamResult): Promise<void> {
  const db = await getDB();
  await db.put('examResults', result);
}

export async function saveBulkExamResultsDB(results: ExamResult[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('examResults', 'readwrite');
  for (const res of results) {
    await tx.store.put(res);
  }
  await tx.done;
}

export async function deleteExamResultDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('examResults', id);
}

// Department Budget Planning CRUD Operations
export async function addBudgetDB(budget: DepartmentBudget): Promise<void> {
  const db = await getDB();
  await db.put('budgets', budget);
}

export async function updateBudgetDB(budget: DepartmentBudget): Promise<void> {
  const db = await getDB();
  await db.put('budgets', budget);
}

export async function deleteBudgetDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('budgets', id);
}

export async function saveBulkBudgetsDB(budgets: DepartmentBudget[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('budgets', 'readwrite');
  for (const b of budgets) {
    await tx.objectStore('budgets').put(b);
  }
  await tx.done;
}

// Bookshop Inventory & Sales CRUD Operations
export async function saveBookDB(book: BookItem): Promise<void> {
  const db = await getDB();
  await db.put('books', book);
}

export async function deleteBookDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('books', id);
}

export async function saveBookSaleDB(sale: BookSale): Promise<void> {
  const db = await getDB();
  await db.put('bookSales', sale);
}

export async function deleteBookSaleDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('bookSales', id);
}

// Bookshop Suppliers & Vendor Payments CRUD Operations
export async function saveBookSupplierDB(supplier: BookSupplier): Promise<void> {
  const db = await getDB();
  await db.put('bookSuppliers', supplier);
}

export async function deleteBookSupplierDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('bookSuppliers', id);
}

export async function saveSupplierPaymentDB(payment: SupplierPayment): Promise<void> {
  const db = await getDB();
  await db.put('supplierPayments', payment);
}

export async function deleteSupplierPaymentDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('supplierPayments', id);
}

// Activity Log & Audit Trail CRUD Operations
export async function saveActivityLogDB(log: ActivityLog): Promise<void> {
  const db = await getDB();
  await db.put('activityLogs', log);
}

export async function clearActivityLogsDB(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('activityLogs', 'readwrite');
  await tx.objectStore('activityLogs').clear();
  await tx.done;
}

// Issued Certificates CRUD Operations
export async function saveCertificateDB(cert: IssuedCertificate): Promise<void> {
  const db = await getDB();
  await db.put('certificates', cert);
}

export async function deleteCertificateDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('certificates', id);
}

export async function getCertificatesDB(): Promise<IssuedCertificate[]> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('certificates')) return [];
  return await db.getAll('certificates');
}

// School Assets & Equipment Inventory CRUD Operations
export async function saveAssetDB(asset: SchoolAsset): Promise<void> {
  const db = await getDB();
  await db.put('assets', asset);
}

export async function deleteAssetDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('assets', id);
}

export async function getAssetsDB(): Promise<SchoolAsset[]> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('assets')) return [];
  return await db.getAll('assets');
}

// Automated Client-Side Backup Snapshots Vault CRUD Operations
export async function saveBackupSnapshotDB(snapshot: BackupSnapshotRecord): Promise<void> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('backupSnapshots')) return;
  await db.put('backupSnapshots', snapshot);
}

export async function getAllBackupSnapshotsDB(): Promise<BackupSnapshotRecord[]> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('backupSnapshots')) return [];
  const records = await db.getAll('backupSnapshots');
  // Return sorted descending by timestamp (newest first)
  return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function deleteBackupSnapshotDB(id: string): Promise<void> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('backupSnapshots')) return;
  await db.delete('backupSnapshots', id);
}

export async function clearBackupSnapshotsDB(): Promise<void> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('backupSnapshots')) return;
  const tx = db.transaction('backupSnapshots', 'readwrite');
  await tx.objectStore('backupSnapshots').clear();
  await tx.done;
}

// ==========================================
// Payroll Runs & Salary Records CRUD Operations
// ==========================================
export async function savePayrollRunDB(run: MonthlyPayrollRun): Promise<void> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('payrollRuns')) return;
  await db.put('payrollRuns', run);
}

export async function saveBulkPayrollRunsDB(runs: MonthlyPayrollRun[]): Promise<void> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('payrollRuns')) return;
  const tx = db.transaction('payrollRuns', 'readwrite');
  for (const run of runs) {
    await tx.objectStore('payrollRuns').put(run);
  }
  await tx.done;
}

export async function deletePayrollRunDB(id: string): Promise<void> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('payrollRuns')) return;
  await db.delete('payrollRuns', id);
}

export async function getPayrollRunsDB(): Promise<MonthlyPayrollRun[]> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('payrollRuns')) return [];
  return await db.getAll('payrollRuns');
}

export async function saveSalaryRecordDB(record: SalaryRecord): Promise<void> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('salaryRecords')) return;
  await db.put('salaryRecords', record);
}

export async function saveBulkSalaryRecordsDB(records: SalaryRecord[]): Promise<void> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('salaryRecords')) return;
  const tx = db.transaction('salaryRecords', 'readwrite');
  for (const record of records) {
    await tx.objectStore('salaryRecords').put(record);
  }
  await tx.done;
}

export async function deleteSalaryRecordDB(id: string): Promise<void> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('salaryRecords')) return;
  await db.delete('salaryRecords', id);
}

export async function deleteSalaryRecordsByRunDB(runId: string): Promise<void> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('salaryRecords')) return;
  const all = await db.getAll('salaryRecords');
  const toDelete = all.filter(r => r.runId === runId);
  const tx = db.transaction('salaryRecords', 'readwrite');
  for (const r of toDelete) {
    await tx.objectStore('salaryRecords').delete(r.id);
  }
  await tx.done;
}

export async function getSalaryRecordsDB(): Promise<SalaryRecord[]> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('salaryRecords')) return [];
  return await db.getAll('salaryRecords');
}

// ==========================================
// Dynamic School Classes CRUD Operations
// ==========================================
export async function getClassesDB(): Promise<SchoolClass[]> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('classes')) return [];
  const all: SchoolClass[] = await db.getAll('classes');
  return all.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
}

export async function saveClassDB(schoolClass: SchoolClass): Promise<void> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('classes')) return;
  await db.put('classes', schoolClass);
}

export async function saveBulkClassesDB(classes: SchoolClass[]): Promise<void> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('classes')) return;
  const tx = db.transaction('classes', 'readwrite');
  for (const cls of classes) {
    await tx.objectStore('classes').put(cls);
  }
  await tx.done;
}

export async function deleteClassDB(id: string): Promise<void> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('classes')) return;
  await db.delete('classes', id);
}




