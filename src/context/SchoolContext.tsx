import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  saveEntityToCloud,
  deleteEntityFromCloud,
  subscribeToSchoolCloudCollections,
  recordFeePaymentAtomic,
  recordBulkPayrollAtomic,
} from '../services/cloudSyncService';
import { isFirebaseConfigured } from '../firebase-config';

import {
  Student,
  StudentStatus,
  Staff,
  AttendanceStatus,
  StudentAttendanceRecord,
  StaffAttendanceRecord,
  FeeStructure,
  FeePayment,
  PaymentMode,
  Expense,
  DailyFinancialActivityInput,
  SchoolSettings,
  User,
  ActiveTab,
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
  StaffLeaveRequest,
  LeaveType,
  LeaveStatus,
  BackupSnapshotRecord,
  BackupTriggerType,
  AutoBackupConfig,
  AutoBackupFrequency,
  BackgroundSyncInfo,
  BackgroundSyncStatus,
  MonthlyPayrollRun,
  SalaryRecord,
  EmployeePayrollItem,
  PayrollRunStatus,
  StaffLoan,
  StaffAdvance,
  ClearableDataModule,
  ResetAllDataOptions,
  SchoolClass,
  ClassStatus,
} from '../types';
import { cleanInitialSchoolSettings } from '../db/seedData';
import { clearStoredRecurringTemplates } from '../utils/recurringExpensesService';
import { clearStoredBudgetThresholds } from '../utils/budgetThresholdStorage';
import { payrollStorage } from '../utils/payrollStorage';
import {
  getInitialSyncInfo,
  performServerBackgroundSync,
  subscribeToSyncChanges,
} from '../utils/backgroundSyncService';
import {
  initDatabase,
  getDB,
  validateFeeDiscount,
  exportFullDatabaseJson,
  importFullDatabaseJson,
  inspectBackupJson,
  BackupInspectionResult,
  seedDatabase,
  clearStoresDB,
  resetEntireSchoolDatabaseDB,
  addExamDB,
  updateExamDB,
  deleteExamDB,
  saveExamResultDB,
  saveBulkExamResultsDB,
  deleteExamResultDB,
  addBudgetDB,
  updateBudgetDB,
  deleteBudgetDB,
  saveBulkBudgetsDB,
  saveBookDB,
  deleteBookDB,
  saveBookSaleDB,
  deleteBookSaleDB,
  saveBookSupplierDB,
  deleteBookSupplierDB,
  saveSupplierPaymentDB,
  deleteSupplierPaymentDB,
  saveActivityLogDB,
  clearActivityLogsDB,
  saveCertificateDB,
  deleteCertificateDB,
  getCertificatesDB,
  saveAssetDB,
  deleteAssetDB,
  saveStaffLeaveDB,
  deleteStaffLeaveDB,
  getAllBackupSnapshotsDB,
  deleteBackupSnapshotDB,
  savePayrollRunDB,
  saveBulkPayrollRunsDB,
  deletePayrollRunDB,
  getPayrollRunsDB,
  saveSalaryRecordDB,
  saveBulkSalaryRecordsDB,
  deleteSalaryRecordDB,
  deleteSalaryRecordsByRunDB,
  getSalaryRecordsDB,
  saveClassDB,
  saveBulkClassesDB,
  deleteClassDB,
} from '../db/indexedDB';
import {
  loadAutoBackupConfig,
  saveAutoBackupConfigToStorage,
  calculateNextBackupTime,
  isBackupDue,
  downloadJsonFile,
  createAndSaveSnapshot,
  enforceSnapshotRetention,
  DEFAULT_AUTO_BACKUP_CONFIG,
} from '../utils/autoBackupService';
import { getTodayDateString, getCurrentMonthName } from '../utils/formatters';

interface SchoolContextType {
  isLoading: boolean;
  classes: SchoolClass[];
  activeClasses: SchoolClass[];
  students: Student[];
  staff: Staff[];
  studentAttendance: StudentAttendanceRecord[];
  staffAttendance: StaffAttendanceRecord[];
  feeStructures: FeeStructure[];
  feePayments: FeePayment[];
  expenses: Expense[];
  settings: SchoolSettings;
  allUsers: User[];
  exams: Exam[];
  examResults: ExamResult[];
  budgets: DepartmentBudget[];
  books: BookItem[];
  bookSales: BookSale[];
  bookSuppliers: BookSupplier[];
  supplierPayments: SupplierPayment[];
  
  // Navigation & Drilldown
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  navigateToTab: (tab: ActiveTab) => void;
  goBackTab: () => boolean;
  canGoBack: boolean;
  tabHistory: ActiveTab[];
  selectedStudentIdForDetail: string | null;
  setSelectedStudentIdForDetail: (id: string | null) => void;
  selectedStaffIdForDetail: string | null;
  setSelectedStaffIdForDetail: (id: string | null) => void;
  receiptToPrint: FeePayment | null;
  setReceiptToPrint: (receipt: FeePayment | null) => void;
  idCardStudent: Student | null;
  setIdCardStudent: (student: Student | null) => void;
  resultCardToPrint: ExamResult | null;
  setResultCardToPrint: (result: ExamResult | null) => void;
  saleReceiptToPrint: BookSale | null;
  setSaleReceiptToPrint: (sale: BookSale | null) => void;

  // Activity Log & Audit Trail
  activityLogs: ActivityLog[];
  logActivity: (entry: Omit<ActivityLog, 'id' | 'timestamp'>) => Promise<ActivityLog>;
  clearActivityLogs: () => Promise<boolean>;

  // Theme Management
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;

  // Bookshop Actions
  addBook: (book: Omit<BookItem, 'id' | 'createdAt'>) => Promise<BookItem>;
  updateBook: (book: BookItem) => Promise<boolean>;
  deleteBook: (id: string) => Promise<boolean>;
  recordBookSale: (sale: Omit<BookSale, 'id' | 'invoiceNo' | 'timestamp'>) => Promise<BookSale>;
  deleteBookSale: (id: string) => Promise<boolean>;
  addBookSupplier: (supplier: Omit<BookSupplier, 'id' | 'createdAt'>) => Promise<BookSupplier>;
  updateBookSupplier: (supplier: BookSupplier) => Promise<boolean>;
  deleteBookSupplier: (id: string) => Promise<boolean>;
  recordSupplierPayment: (payment: Omit<SupplierPayment, 'id' | 'createdAt'>) => Promise<SupplierPayment>;
  deleteSupplierPayment: (id: string) => Promise<boolean>;

  // Exam Actions
  addExam: (exam: Omit<Exam, 'id' | 'createdAt'>) => Promise<Exam>;
  updateExam: (exam: Exam) => Promise<boolean>;
  deleteExam: (id: string) => Promise<boolean>;

  // Results Actions
  saveExamResult: (result: Omit<ExamResult, 'id'> | ExamResult) => Promise<ExamResult>;
  saveBulkExamResults: (results: ExamResult[]) => Promise<boolean>;
  deleteExamResult: (id: string) => Promise<boolean>;

  // Budget Actions
  addBudget: (budget: Omit<DepartmentBudget, 'id' | 'createdAt'>) => Promise<DepartmentBudget>;
  updateBudget: (budget: DepartmentBudget) => Promise<boolean>;
  deleteBudget: (id: string) => Promise<boolean>;
  copyBudgetsToMonth: (sourceMonth: string, targetMonth: string) => Promise<boolean>;

  // Student Actions
  addStudent: (student: Omit<Student, 'id'>) => Promise<Student>;
  bulkAddStudents: (
    studentsData: Omit<Student, 'id'>[]
  ) => Promise<{ addedCount: number; students: Student[] }>;
  updateStudent: (student: Student) => Promise<boolean>;
  deleteStudent: (id: string) => Promise<boolean>;
  bulkDeleteStudents: (studentIds: string[]) => Promise<boolean>;
  promoteStudents: (studentIds: string[], targetClass: string) => Promise<boolean>;
  bulkUpdateStudentStatus: (studentIds: string[], status: StudentStatus) => Promise<boolean>;
  bulkRecordStudentAttendance: (studentIds: string[], date: string, status: AttendanceStatus, remarks?: string) => Promise<boolean>;
  bulkRecordFeePayments: (
    studentIds: string[],
    monthFor: string,
    paymentMode: PaymentMode,
    remarks?: string,
    options?: {
      customAmount?: number;
      feeBreakdown?: { headName: string; amount: number }[];
      date?: string;
      collectedBy?: string;
      transactionRef?: string;
      studentAmounts?: Record<string, { totalAmount: number; breakdown?: { headName: string; amount: number }[] }>;
    }
  ) => Promise<FeePayment[]>;

  // Staff Actions
  addStaff: (staff: Omit<Staff, 'id'>) => Promise<Staff>;
  updateStaff: (staff: Staff) => Promise<boolean>;
  deleteStaff: (id: string) => Promise<boolean>;
  bulkDeleteStaff: (staffIds: string[]) => Promise<boolean>;
  bulkRecordStaffAttendance: (staffIds: string[], date: string, status: AttendanceStatus, leaveType?: 'casual' | 'sick' | 'paid', remarks?: string) => Promise<boolean>;
  bulkPayStaffSalaries: (staffIds: string[], month: string, paymentMode: Expense['paymentMode']) => Promise<number>;
  bulkUpdateStaffDepartment: (staffIds: string[], department: string) => Promise<boolean>;

  // HR & Leave Management
  staffLeaves: StaffLeaveRequest[];
  applyStaffLeave: (request: Omit<StaffLeaveRequest, 'id' | 'appliedDate' | 'status'>) => Promise<StaffLeaveRequest>;
  updateStaffLeaveStatus: (
    id: string,
    status: LeaveStatus,
    approverName: string,
    rejectionReason?: string
  ) => Promise<boolean>;
  deleteStaffLeave: (id: string) => Promise<boolean>;
  updateStaffLeaveQuota: (staffId: string, leaveBalance: Staff['leaveBalance']) => Promise<boolean>;

  // Attendance Actions
  saveStudentAttendance: (records: StudentAttendanceRecord[]) => Promise<boolean>;
  saveStaffAttendance: (records: StaffAttendanceRecord[]) => Promise<boolean>;

  // Finance Actions
  saveFeeStructure: (structure: FeeStructure) => Promise<boolean>;
  recordFeePayment: (payment: Omit<FeePayment, 'id' | 'receiptNumber'>) => Promise<FeePayment>;
  updateFeePayment: (payment: FeePayment) => Promise<boolean>;
  deleteFeePayment: (id: string) => Promise<boolean>;
  recordExpense: (expense: Omit<Expense, 'id'>) => Promise<Expense>;
  updateExpense: (expense: Expense) => Promise<boolean>;
  deleteExpense: (id: string) => Promise<boolean>;
  recordDailyFinancialActivity: (activity: {
    type: 'INCOME' | 'EXPENSE';
    date: string;
    title: string;
    category: string;
    amount: number;
    paymentMode: PaymentMode;
    referenceNumber?: string;
    studentId?: string;
    studentName?: string;
    staffId?: string;
    staffName?: string;
    notes?: string;
    recordedBy?: string;
    source?: 'system' | 'manual';
    createdAt?: string;
    createdBy?: string;
  }) => Promise<{ id: string; type: 'INCOME' | 'EXPENSE' }>;
  bulkRecordDailyFinancialActivities: (
    activities: DailyFinancialActivityInput[]
  ) => Promise<{ successCount: number; incomeCount: number; expenseCount: number }>;
  payStaffSalary: (
    staffId: string,
    month: string,
    amount: number,
    paymentMode: Expense['paymentMode'],
    refNo?: string,
    processedBy?: string
  ) => Promise<boolean>;

  // Settings & DB
  updateSettings: (newSettings: SchoolSettings) => Promise<boolean>;
  addClassEntity: (input: {
    name: string;
    display_order?: number;
    sections?: string[];
    status?: ClassStatus;
  }) => Promise<{ success: boolean; classItem?: SchoolClass; error?: string }>;
  updateClassEntity: (
    updated: SchoolClass
  ) => Promise<{ success: boolean; error?: string }>;
  deleteClassEntity: (
    classId: string
  ) => Promise<{ success: boolean; blockedByStudents?: number; error?: string }>;
  reorderClassEntities: (orderedIds: string[]) => Promise<boolean>;
  addClass: (newClassName: string) => Promise<boolean>;
  addMultipleClasses: (
    classNames: string[]
  ) => Promise<{ added: string[]; duplicates: string[] }>;
  removeClass: (className: string) => Promise<boolean>;
  renameClass: (oldName: string, newName: string) => Promise<boolean>;
  reorderClasses: (classes: string[]) => Promise<boolean>;
  addSection: (newSectionName: string) => Promise<boolean>;
  removeSection: (sectionName: string) => Promise<boolean>;
  refreshAllUsers: () => Promise<void>;
  backupDatabase: () => Promise<{ filename: string; sizeBytes: number; recordsCount: number }>;
  restoreDatabase: (jsonContent: string) => Promise<boolean>;
  inspectBackup: (jsonContent: string) => BackupInspectionResult;
  getBackupJsonString: () => Promise<string>;
  resetToDemo: () => Promise<boolean>;
  resetAllSchoolData: (options?: ResetAllDataOptions) => Promise<boolean>;
  clearModuleData: (moduleKey: ClearableDataModule) => Promise<boolean>;
  isCleanSlate: boolean;

  // Automated Backup & Snapshot Vault Actions
  autoBackupConfig: AutoBackupConfig;
  updateAutoBackupConfig: (newConfig: AutoBackupConfig) => Promise<boolean>;
  backupSnapshots: BackupSnapshotRecord[];
  refreshBackupSnapshots: () => Promise<void>;
  runAutomatedBackupNow: (trigger?: BackupTriggerType, autoDownload?: boolean) => Promise<BackupSnapshotRecord>;
  deleteBackupSnapshot: (id: string) => Promise<boolean>;
  restoreFromSnapshot: (snapshot: BackupSnapshotRecord) => Promise<boolean>;
  isAutoBackupRunning: boolean;

  // Offline-First Server Sync
  serverSyncInfo: BackgroundSyncInfo;
  triggerServerSync: () => Promise<BackgroundSyncInfo>;
  isServerSyncing: boolean;

  // Certificate Actions
  certificates: IssuedCertificate[];
  addCertificate: (cert: Omit<IssuedCertificate, 'id' | 'createdAt'> | IssuedCertificate) => Promise<IssuedCertificate>;
  updateCertificate: (cert: IssuedCertificate) => Promise<boolean>;
  cancelCertificate: (id: string, reason: string, actorName?: string, actorRole?: string) => Promise<boolean>;
  deleteCertificate: (id: string) => Promise<boolean>;
  bulkAddCertificates: (certs: IssuedCertificate[], actorName?: string, actorRole?: string) => Promise<number>;
  logCertificateEvent: (action: string, details: string, actorName?: string, actorRole?: string, entityId?: string) => Promise<void>;
  logAdmissionEvent: (action: string, details: string, actorName?: string, actorRole?: string, entityId?: string, entityName?: string) => Promise<void>;

  // School Assets Actions
  assets: SchoolAsset[];
  addAsset: (asset: Omit<SchoolAsset, 'id' | 'createdAt'>) => Promise<SchoolAsset>;
  updateAsset: (asset: SchoolAsset) => Promise<boolean>;
  deleteAsset: (id: string) => Promise<boolean>;

  // Computed Financials
  getStudentPendingFee: (student: Student) => number;
  getDefaultersList: () => { student: Student; pendingAmount: number; lastPaymentDate?: string }[];
  getMonthlyStats: () => {
    totalFeeCollectedThisMonth: number;
    totalExpectedThisMonth: number;
    totalPendingThisMonth: number;
    collectionPercentage: number;
    totalExpensesThisMonth: number;
    netBalanceThisMonth: number;
  };

  // Payroll & Salary Records
  payrollRuns: MonthlyPayrollRun[];
  salaryRecords: SalaryRecord[];

  // Payroll Runs CRUD
  addPayrollRun: (run: MonthlyPayrollRun) => Promise<MonthlyPayrollRun>;
  updatePayrollRun: (run: MonthlyPayrollRun) => Promise<boolean>;
  deletePayrollRun: (id: string) => Promise<boolean>;
  getPayrollRunById: (id: string) => MonthlyPayrollRun | undefined;

  // Salary Records CRUD
  addSalaryRecord: (record: SalaryRecord) => Promise<SalaryRecord>;
  updateSalaryRecord: (record: SalaryRecord) => Promise<boolean>;
  deleteSalaryRecord: (id: string) => Promise<boolean>;
  getSalaryRecordsByRun: (runId: string) => SalaryRecord[];

  // Salary Calculation Formulas & Bulk Generation
  calculateEmployeeSalary: (params: {
    staff: Staff;
    month: string;
    year?: number;
    workingDays?: number;
    unpaidAbsentDays?: number;
    activeLoan?: StaffLoan;
    pendingAdvance?: StaffAdvance;
    customAllowances?: number;
    customBonuses?: number;
    customOvertimeHours?: number;
    customOvertimeRate?: number;
    customTaxDeduction?: number;
    customProvidentFund?: number;
    customOtherDeductions?: number;
  }) => EmployeePayrollItem;
  recalculateRunTotals: (employees: EmployeePayrollItem[]) => {
    totalEmployees: number;
    paidEmployees: number;
    totalBasicSalary: number;
    totalAllowances: number;
    totalBonuses: number;
    totalOvertime: number;
    totalDeductions: number;
    totalNetPayroll: number;
  };
  generatePayrollRun: (options: {
    month: string;
    fiscalYear: string;
    scope?: 'all' | 'department' | 'selected';
    departmentFilter?: string;
    selectedStaffIds?: string[];
    notes?: string;
    processedBy?: string;
  }) => Promise<{ run: MonthlyPayrollRun; records: SalaryRecord[] }>;

  // Status Workflow Transitions (Draft -> Processed -> Approved -> Paid) & Unlock
  processPayrollRun: (runId: string, processedBy?: string) => Promise<MonthlyPayrollRun>;
  approvePayrollRun: (runId: string, approvedBy?: string) => Promise<MonthlyPayrollRun>;
  disbursePayrollRun: (
    runId: string,
    paymentDetails: {
      paymentMethod: PaymentMode;
      paymentDate: string;
      paidBy?: string;
      remarks?: string;
    }
  ) => Promise<{ run: MonthlyPayrollRun; expenseId?: string }>;
  unlockPayrollRun: (runId: string, reason: string, unlockedBy?: string) => Promise<MonthlyPayrollRun>;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffLeaves, setStaffLeaves] = useState<StaffLeaveRequest[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<StudentAttendanceRecord[]>([]);
  const [staffAttendance, setStaffAttendance] = useState<StaffAttendanceRecord[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<SchoolSettings>({} as SchoolSettings);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [budgets, setBudgets] = useState<DepartmentBudget[]>([]);
  const [books, setBooks] = useState<BookItem[]>([]);
  const [bookSales, setBookSales] = useState<BookSale[]>([]);
  const [bookSuppliers, setBookSuppliers] = useState<BookSupplier[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [certificates, setCertificates] = useState<IssuedCertificate[]>([]);
  const [assets, setAssets] = useState<SchoolAsset[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<MonthlyPayrollRun[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [autoBackupConfig, setAutoBackupConfig] = useState<AutoBackupConfig>(() =>
    loadAutoBackupConfig()
  );
  const [backupSnapshots, setBackupSnapshots] = useState<BackupSnapshotRecord[]>([]);
  const [isAutoBackupRunning, setIsAutoBackupRunning] = useState(false);
  const [serverSyncInfo, setServerSyncInfo] = useState<BackgroundSyncInfo>(getInitialSyncInfo);
  const [isServerSyncing, setIsServerSyncing] = useState<boolean>(false);
  const [isCleanSlate, setIsCleanSlate] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('eduledger_is_clean_slate') === 'true';
  });


  const getResolvedSchoolId = () => {
    return settings?.schoolName
      ? settings.schoolName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
      : 'main';
  };

  const syncToCloud = (collectionName: string, entity: any) => {
    if (isFirebaseConfigured()) {
      saveEntityToCloud(getResolvedSchoolId(), collectionName, entity).catch((e: unknown) => {
        console.warn("Cloud sync error:", e);
      });
    }
  };

  const removeFromCloud = (collectionName: string, id: string) => {
    if (isFirebaseConfigured()) {
      deleteEntityFromCloud(getResolvedSchoolId(), collectionName, id).catch((e: unknown) => {
        console.warn("Cloud sync error:", e);
      });
    }
  };

  // Dark Mode Theme Management
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('eduledger_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('eduledger_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('eduledger_theme', 'light');
      }
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const setDarkMode = (enabled: boolean) => {
    setIsDarkMode(enabled);
  };

  const logActivity = async (entry: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> => {
    let activeUserName: string | null = null;
    let activeUserRole: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('eduledger_ephemeral_session_v2');
        if (raw) {
          const parsed = JSON.parse(raw);
          activeUserName = parsed.username || null;
          activeUserRole = parsed.role || null;
        }
      } catch {
        // fallback to localStorage
      }
      if (!activeUserName) {
        activeUserName = localStorage.getItem('eduledger_current_user_name');
        activeUserRole = localStorage.getItem('eduledger_current_user_role') as any;
      }
    }

    const resolvedUserName = activeUserName
      ? (entry.userName && !entry.userName.includes('Administrator') ? `${activeUserName} (${entry.userName})` : activeUserName)
      : (entry.userName || 'Administrator');

    const newLog: ActivityLog = {
      ...entry,
      userName: resolvedUserName,
      userRole: entry.userRole || activeUserRole || 'admin',
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      ipAddress: entry.ipAddress || (typeof window !== 'undefined' ? '127.0.0.1 (Local Client Session)' : undefined),
    };
    try {
      await saveActivityLogDB(newLog);
      setActivityLogs(prev => [newLog, ...prev]);
    } catch (err) {
      console.error('Failed to persist activity log:', err);
      setActivityLogs(prev => [newLog, ...prev]);
    }
    return newLog;
  };

  const clearActivityLogs = async (): Promise<boolean> => {
    try {
      await clearActivityLogsDB();
      setActivityLogs([]);
      return true;
    } catch (err) {
      console.error('Failed to clear activity logs:', err);
      return false;
    }
  };

  // Navigation & Drill-down
  const [activeTab, setActiveTabRaw] = useState<ActiveTab>('dashboard');
  const [tabHistory, setTabHistory] = useState<ActiveTab[]>([]);
  const [selectedStudentIdForDetail, setSelectedStudentIdForDetail] = useState<string | null>(null);
  const [selectedStaffIdForDetail, setSelectedStaffIdForDetail] = useState<string | null>(null);
  const [receiptToPrint, setReceiptToPrint] = useState<FeePayment | null>(null);
  const [idCardStudent, setIdCardStudent] = useState<Student | null>(null);
  const [resultCardToPrint, setResultCardToPrint] = useState<ExamResult | null>(null);
  const [saleReceiptToPrint, setSaleReceiptToPrint] = useState<BookSale | null>(null);

  const setActiveTab = (newTab: ActiveTab) => {
    setActiveTabRaw(current => {
      if (newTab !== current) {
        setTabHistory(prev => [...prev, current]);
        if (typeof window !== 'undefined' && window.history) {
          window.history.pushState({ tab: newTab }, '', '');
        }
      }
      return newTab;
    });
  };

  const navigateToTab = (newTab: ActiveTab) => {
    setActiveTab(newTab);
  };

  const goBackTab = (): boolean => {
    if (idCardStudent) {
      setIdCardStudent(null);
      return true;
    }
    if (receiptToPrint) {
      setReceiptToPrint(null);
      return true;
    }
    if (resultCardToPrint) {
      setResultCardToPrint(null);
      return true;
    }
    if (saleReceiptToPrint) {
      setSaleReceiptToPrint(null);
      return true;
    }
    if (selectedStudentIdForDetail) {
      setSelectedStudentIdForDetail(null);
      return true;
    }
    if (selectedStaffIdForDetail) {
      setSelectedStaffIdForDetail(null);
      return true;
    }

    if (tabHistory.length > 0) {
      const prev = tabHistory[tabHistory.length - 1];
      setTabHistory(h => h.slice(0, -1));
      setActiveTabRaw(prev);
      return true;
    }

    if (activeTab !== 'dashboard') {
      setActiveTabRaw('dashboard');
      return true;
    }
    return false;
  };

  // Global browser/phone back button (popstate) & Escape key listeners for modals/tabs
  useEffect(() => {
    const handlePopState = () => {
      if (idCardStudent) {
        setIdCardStudent(null);
        return;
      }
      if (receiptToPrint) {
        setReceiptToPrint(null);
        return;
      }
      if (resultCardToPrint) {
        setResultCardToPrint(null);
        return;
      }
      if (saleReceiptToPrint) {
        setSaleReceiptToPrint(null);
        return;
      }
      if (selectedStudentIdForDetail) {
        setSelectedStudentIdForDetail(null);
        return;
      }
      if (selectedStaffIdForDetail) {
        setSelectedStaffIdForDetail(null);
        return;
      }

      if (tabHistory.length > 0) {
        const prev = tabHistory[tabHistory.length - 1];
        setTabHistory(h => h.slice(0, -1));
        setActiveTabRaw(prev);
      } else if (activeTab !== 'dashboard') {
        setActiveTabRaw('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    idCardStudent,
    receiptToPrint,
    resultCardToPrint,
    saleReceiptToPrint,
    selectedStudentIdForDetail,
    selectedStaffIdForDetail,
    tabHistory,
    activeTab,
  ]);

  const canGoBack =
    !!idCardStudent ||
    !!receiptToPrint ||
    !!resultCardToPrint ||
    !!saleReceiptToPrint ||
    !!selectedStudentIdForDetail ||
    !!selectedStaffIdForDetail ||
    tabHistory.length > 0 ||
    activeTab !== 'dashboard';

  // Initialize DB
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const data = await initDatabase();
        setClasses(
          [...(data.classes || [])].sort((a, b) => a.display_order - b.display_order)
        );
        setStudents(data.students);
        setStaff(data.staff);
        setStaffLeaves(data.staffLeaves || []);
        setStudentAttendance(data.studentAttendance);
        setStaffAttendance(data.staffAttendance);
        setFeeStructures(data.feeStructures);
        setFeePayments(data.feePayments);
        setExpenses(data.expenses);
        setSettings(data.settings);
        setAllUsers(data.users);
        setExams(data.exams || []);
        setExamResults(data.examResults || []);
        setBudgets(data.budgets || []);
        setBooks(data.books || []);
        setBookSales(data.bookSales || []);
        setBookSuppliers(data.bookSuppliers || []);
        setSupplierPayments(data.supplierPayments || []);
        setActivityLogs(data.activityLogs || []);
        setCertificates(data.certificates || []);
        setAssets(data.assets || []);
        setPayrollRuns(data.payrollRuns || []);
        setSalaryRecords(data.salaryRecords || []);

        try {
          const snaps = await getAllBackupSnapshotsDB();
          setBackupSnapshots(snaps);
          if (data.settings?.autoBackupConfig) {
            setAutoBackupConfig(loadAutoBackupConfig(data.settings.autoBackupConfig));
          }
        } catch (snapErr) {
          console.warn('Failed to load backup snapshots vault:', snapErr);
        }
      } catch (err) {
        console.error('Failed to load DB:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const refreshAllUsers = async () => {
    try {
      const db = await getDB();
      const users = await db.getAll('users');
      setAllUsers(users);
    } catch (err) {
      console.error(err);
    }
  };

  // Student Actions
  const sanitizeStudentRecord = <T extends Record<string, any>>(record: T): T => {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(record)) {
      if (v !== undefined) clean[k] = v;
    }
    return clean as T;
  };

  const addStudent = async (studentData: Omit<Student, 'id'>): Promise<Student> => {
    const db = await getDB();
    const newStudent: Student = sanitizeStudentRecord({
      ...studentData,
      id: 'stu-' + Date.now(),
    });
    await db.put('students', newStudent);
    setStudents(prev => [newStudent, ...prev]);
    return newStudent;
  };

  const updateStudent = async (student: Student): Promise<boolean> => {
    const db = await getDB();
    const cleanStudent = sanitizeStudentRecord(student);
    await db.put('students', cleanStudent);
    setStudents(prev => prev.map(s => (s.id === cleanStudent.id ? cleanStudent : s)));
    return true;
  };

  const deleteStudent = async (id: string): Promise<boolean> => {
    const db = await getDB();
    const existing = students.find(s => s.id === id);
    await db.delete('students', id);
    setStudents(prev => prev.filter(s => s.id !== id));
    if (existing) {
      await logActivity({
        userName: 'Administrator',
        userRole: 'admin',
        action: 'Admission / Student Record Deleted',
        category: 'system_action',
        severity: 'warning',
        details: `Deleted student admission record "${existing.fullName}" (Roll #${existing.rollNo}, ${existing.className}).`,
        entityId: existing.id,
        entityName: existing.fullName,
      });
    }
    return true;
  };

  const bulkDeleteStudents = async (studentIds: string[]): Promise<boolean> => {
    try {
      const db = await getDB();
      const tx = db.transaction('students', 'readwrite');
      for (const id of studentIds) {
        await tx.store.delete(id);
      }
      await tx.done;
      setStudents(prev => prev.filter(s => !studentIds.includes(s.id)));
      return true;
    } catch (err) {
      console.error('Failed to bulk delete students:', err);
      return false;
    }
  };

  const bulkAddStudents = async (
    newStudentsData: Omit<Student, 'id'>[]
  ): Promise<{ addedCount: number; students: Student[] }> => {
    try {
      const db = await getDB();
      const tx = db.transaction('students', 'readwrite');
      const addedStudents: Student[] = [];
      const timestamp = Date.now();

      for (let i = 0; i < newStudentsData.length; i++) {
        const data = newStudentsData[i];
        const newStudent: Student = {
          ...data,
          id: `stu-${timestamp}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        };
        await tx.store.put(newStudent);
        addedStudents.push(newStudent);
      }
      await tx.done;

      setStudents(prev => [...addedStudents, ...prev]);
      return { addedCount: addedStudents.length, students: addedStudents };
    } catch (err) {
      console.error('Failed to bulk add students:', err);
      return { addedCount: 0, students: [] };
    }
  };

  const promoteStudents = async (studentIds: string[], targetClass: string): Promise<boolean> => {
    const db = await getDB();
    const updatedStudents = students.map(s => {
      if (studentIds.includes(s.id)) {
        return { ...s, className: targetClass };
      }
      return s;
    });

    const tx = db.transaction('students', 'readwrite');
    for (const id of studentIds) {
      const s = updatedStudents.find(item => item.id === id);
      if (s) await tx.store.put(s);
    }
    await tx.done;

    setStudents(updatedStudents);
    return true;
  };

  // Staff Actions
  const addStaff = async (staffData: Omit<Staff, 'id'>): Promise<Staff> => {
    const db = await getDB();
    const newStaff: Staff = {
      ...staffData,
      id: 'stf-' + Date.now(),
    };
    await db.put('staff', newStaff);
    setStaff(prev => [newStaff, ...prev]);
    return newStaff;
  };

  const updateStaff = async (staffMember: Staff): Promise<boolean> => {
    const prevStaff = staff.find(s => s.id === staffMember.id);
    const db = await getDB();
    await db.put('staff', staffMember);
    setStaff(prev => prev.map(s => (s.id === staffMember.id ? staffMember : s)));

    // Track sensitive salary modifications
    if (prevStaff && prevStaff.monthlySalary !== staffMember.monthlySalary) {
      logActivity({
        userName: 'Administrator / Bursar',
        userRole: 'admin',
        category: 'salary_modification',
        severity: 'warning',
        action: 'Staff Compensation Package Adjusted',
        details: `Adjusted base compensation for ${staffMember.fullName} (${staffMember.designation}).`,
        entityId: staffMember.id,
        entityName: staffMember.fullName,
        previousValue: `Monthly Salary: ${settings.currencySymbol || '$'}${prevStaff.monthlySalary.toLocaleString()}`,
        newValue: `Monthly Salary: ${settings.currencySymbol || '$'}${staffMember.monthlySalary.toLocaleString()}`,
      });
    }
    return true;
  };

  const deleteStaff = async (id: string): Promise<boolean> => {
    const db = await getDB();
    await db.delete('staff', id);
    setStaff(prev => prev.filter(s => s.id !== id));
    return true;
  };

  const bulkDeleteStaff = async (staffIds: string[]): Promise<boolean> => {
    try {
      const db = await getDB();
      const tx = db.transaction('staff', 'readwrite');
      for (const id of staffIds) {
        await tx.store.delete(id);
      }
      await tx.done;
      setStaff(prev => prev.filter(s => !staffIds.includes(s.id)));
      return true;
    } catch (err) {
      console.error('Failed to bulk delete staff:', err);
      return false;
    }
  };

  // HR & Leave Management Actions
  const applyStaffLeave = async (
    requestData: Omit<StaffLeaveRequest, 'id' | 'appliedDate' | 'status'>
  ): Promise<StaffLeaveRequest> => {
    const newLeave: StaffLeaveRequest = {
      ...requestData,
      id: 'leave-' + Date.now(),
      appliedDate: getTodayDateString(),
      status: 'pending',
    };
    await saveStaffLeaveDB(newLeave);
    setStaffLeaves(prev => [newLeave, ...prev]);

    logActivity({
      userName: 'HR / Staff Portal',
      userRole: 'admin',
      category: 'staff_leave',
      severity: 'info',
      action: 'Staff Leave Request Submitted',
      details: `${newLeave.staffName} (${newLeave.department}) submitted a request for ${newLeave.daysCount} day(s) of ${newLeave.leaveType.toUpperCase()} leave (${newLeave.startDate} to ${newLeave.endDate}).`,
      entityId: newLeave.staffId,
      entityName: newLeave.staffName,
      newValue: `${newLeave.daysCount} Days [${newLeave.leaveType}]`,
    });

    return newLeave;
  };

  const updateStaffLeaveStatus = async (
    id: string,
    status: LeaveStatus,
    approverName: string,
    rejectionReason?: string
  ): Promise<boolean> => {
    const targetLeave = staffLeaves.find(l => l.id === id);
    if (!targetLeave) return false;

    const actionDate = getTodayDateString();
    const updatedLeave: StaffLeaveRequest = {
      ...targetLeave,
      status,
      approvedBy: approverName,
      actionDate,
      rejectionReason: rejectionReason || undefined,
    };

    await saveStaffLeaveDB(updatedLeave);
    setStaffLeaves(prev => prev.map(l => (l.id === id ? updatedLeave : l)));

    // If approved, update staff's leave balances & update today's status if active
    if (status === 'approved') {
      const staffMember = staff.find(s => s.id === targetLeave.staffId);
      if (staffMember) {
        const curBalance = { ...(staffMember.leaveBalance || { casual: 8, sick: 10, paid: 15 }) };
        const days = targetLeave.daysCount || 1;

        if (targetLeave.leaveType === 'casual') {
          curBalance.casual = Math.max(0, (curBalance.casual ?? 0) - days);
        } else if (targetLeave.leaveType === 'sick') {
          curBalance.sick = Math.max(0, (curBalance.sick ?? 0) - days);
        } else if (targetLeave.leaveType === 'annual') {
          if (curBalance.annual !== undefined) {
            curBalance.annual = Math.max(0, curBalance.annual - days);
          }
          curBalance.paid = Math.max(0, (curBalance.paid ?? 0) - days);
        } else if (targetLeave.leaveType === 'emergency') {
          if (curBalance.emergency !== undefined) {
            curBalance.emergency = Math.max(0, curBalance.emergency - days);
          }
        }

        const updatedStaff: Staff = {
          ...staffMember,
          leaveBalance: curBalance,
        };

        const db = await getDB();
        await db.put('staff', updatedStaff);
        setStaff(prev => prev.map(s => (s.id === updatedStaff.id ? updatedStaff : s)));
      }
    }

    logActivity({
      userName: approverName || 'Administrator',
      userRole: 'admin',
      category: 'staff_leave',
      severity: status === 'rejected' ? 'warning' : 'info',
      action: `Staff Leave ${status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Updated'}`,
      details: `Leave application for ${targetLeave.staffName} (${targetLeave.daysCount} days, ${targetLeave.leaveType}) was marked as ${status.toUpperCase()} by ${approverName}.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`,
      entityId: targetLeave.staffId,
      entityName: targetLeave.staffName,
      previousValue: `Status: ${targetLeave.status}`,
      newValue: `Status: ${status}`,
    });

    return true;
  };

  const deleteStaffLeave = async (id: string): Promise<boolean> => {
    await deleteStaffLeaveDB(id);
    setStaffLeaves(prev => prev.filter(l => l.id !== id));
    return true;
  };

  const updateStaffLeaveQuota = async (
    staffId: string,
    leaveBalance: Staff['leaveBalance']
  ): Promise<boolean> => {
    const member = staff.find(s => s.id === staffId);
    if (!member) return false;
    const updated: Staff = {
      ...member,
      leaveBalance,
    };
    const db = await getDB();
    await db.put('staff', updated);
    setStaff(prev => prev.map(s => (s.id === staffId ? updated : s)));
    return true;
  };

  // Attendance Actions
  const saveStudentAttendance = async (records: StudentAttendanceRecord[]): Promise<boolean> => {
    const db = await getDB();
    const tx = db.transaction('studentAttendance', 'readwrite');
    for (const rec of records) {
      await tx.store.put(rec);
    }
    await tx.done;

    // Detect manual overrides (e.g. absent -> present or excused)
    const prevMap = new Map(studentAttendance.map(r => [`${r.date}_${r.studentId}`, r]));
    for (const rec of records) {
      const prev = prevMap.get(`${rec.date}_${rec.studentId}`);
      if (prev && prev.status !== rec.status && (prev.status === 'absent' || rec.status === 'leave')) {
        logActivity({
          userName: 'Administrator / Faculty',
          userRole: 'admin',
          category: 'attendance_override',
          severity: 'warning',
          action: 'Student Attendance Override',
          details: `Attendance status for ${rec.studentName} (${rec.className}-${rec.section}) on ${rec.date} changed from '${prev.status.toUpperCase()}' to '${rec.status.toUpperCase()}'. ${rec.remarks ? 'Remarks: ' + rec.remarks : ''}`,
          entityId: rec.studentId,
          entityName: rec.studentName,
          previousValue: `Status: ${prev.status}`,
          newValue: `Status: ${rec.status}`,
        });
      }
    }

    // Merge in state
    setStudentAttendance(prev => {
      const newMap = new Map(prev.map(r => [`${r.date}_${r.studentId}`, r]));
      for (const rec of records) {
        newMap.set(`${rec.date}_${rec.studentId}`, rec);
      }
      return Array.from(newMap.values());
    });
    return true;
  };

  const saveStaffAttendance = async (records: StaffAttendanceRecord[]): Promise<boolean> => {
    const db = await getDB();
    const tx = db.transaction('staffAttendance', 'readwrite');
    for (const rec of records) {
      await tx.store.put(rec);
    }
    await tx.done;

    // Detect manual staff attendance overrides
    const prevMap = new Map(staffAttendance.map(r => [`${r.date}_${r.staffId}`, r]));
    for (const rec of records) {
      const prev = prevMap.get(`${rec.date}_${rec.staffId}`);
      if (prev && prev.status !== rec.status && (prev.status === 'absent' || rec.status === 'leave')) {
        logActivity({
          userName: 'Administrator / HR',
          userRole: 'admin',
          category: 'attendance_override',
          severity: 'warning',
          action: 'Staff Attendance Override',
          details: `Attendance for ${rec.staffName} (${rec.designation}) on ${rec.date} adjusted from '${prev.status.toUpperCase()}' to '${rec.status.toUpperCase()}'. ${rec.remarks ? 'Remarks: ' + rec.remarks : ''}`,
          entityId: rec.staffId,
          entityName: rec.staffName,
          previousValue: `Status: ${prev.status}`,
          newValue: `Status: ${rec.status}`,
        });
      }
    }

    setStaffAttendance(prev => {
      const newMap = new Map(prev.map(r => [`${r.date}_${r.staffId}`, r]));
      for (const rec of records) {
        newMap.set(`${rec.date}_${rec.staffId}`, rec);
      }
      return Array.from(newMap.values());
    });
    return true;
  };

  // Finance Actions
  const saveFeeStructure = async (structure: FeeStructure): Promise<boolean> => {
    const db = await getDB();
    const matchedClass = classes.find(
      c =>
        (structure.class_id && c.id === structure.class_id) ||
        c.name.toLowerCase() === structure.className.toLowerCase()
    );
    const enriched: FeeStructure = {
      ...structure,
      class_id: structure.class_id || matchedClass?.id,
      className: matchedClass ? matchedClass.name : structure.className,
      updatedAt: new Date().toISOString(),
    };
    await db.put('feeStructures', enriched);
    setFeeStructures(prev => {
      const exists = prev.some(
        f =>
          f.id === enriched.id ||
          (enriched.class_id && f.class_id === enriched.class_id) ||
          f.className.toLowerCase() === enriched.className.toLowerCase()
      );
      if (exists) {
        return prev.map(f =>
          f.id === enriched.id ||
          (enriched.class_id && f.class_id === enriched.class_id) ||
          f.className.toLowerCase() === enriched.className.toLowerCase()
            ? enriched
            : f
        );
      }
      return [...prev, enriched];
    });
    syncToCloud('feeStructures', enriched);
    return true;
  };

  const recordFeePayment = async (
    paymentData: Omit<FeePayment, 'id' | 'receiptNumber'> & { receiptNumber?: string }
  ): Promise<FeePayment> => {
    const gross_fee =
      typeof paymentData.gross_fee === 'number'
        ? paymentData.gross_fee
        : (paymentData.feeBreakdown?.reduce((s, b) => s + b.amount, 0) || paymentData.totalAmount);
    const discount_amount =
      typeof paymentData.discount_amount === 'number' ? paymentData.discount_amount : 0;
    const discount_reason =
      typeof paymentData.discount_reason === 'string' ? paymentData.discount_reason.trim() : '';

    // Data-access level validation
    if (discount_amount !== 0 || discount_reason !== '') {
      const val = validateFeeDiscount(gross_fee, discount_amount, discount_reason);
      if (!val.isValid) {
        throw new Error(val.error || 'Invalid discount amount or reason.');
      }
    }

    const net_fee =
      typeof paymentData.net_fee === 'number'
        ? paymentData.net_fee
        : Math.max(0, Math.round((gross_fee - discount_amount) * 100) / 100);

    const db = await getDB();
    const count = feePayments.length + 1;
    const prefix = settings.receiptPrefix || 'REC-2026';
    const receiptNumber = paymentData.receiptNumber || `${prefix}-${String(count).padStart(4, '0')}`;

    const newPayment: FeePayment = {
      ...paymentData,
      id: 'pay-' + Date.now(),
      receiptNumber,
      gross_fee,
      discount_amount,
      discount_reason,
      net_fee,
      totalAmount: paymentData.totalAmount,
      source: paymentData.source || (paymentData.studentId && paymentData.studentId !== '' && paymentData.studentId !== 'general' ? 'system' : 'manual'),
      createdAt: paymentData.createdAt || new Date().toISOString(),
      createdBy: paymentData.collectedBy,
    };

    // Use atomic transaction write to prevent half-saved records
    const tx = db.transaction('feePayments', 'readwrite');
    await tx.store.put(newPayment);
    await tx.done;

    // Reload / confirm record from IndexedDB
    const savedRecord = await db.get('feePayments', newPayment.id);
    const confirmedPayment: FeePayment = savedRecord || newPayment;

    setFeePayments(prev => [confirmedPayment, ...prev]);

    // Audit log if discount was applied
    if (discount_amount > 0) {
      logActivity({
        userName: paymentData.collectedBy || 'Accounts Bursar',
        userRole: 'finance',
        category: 'fee_modification',
        severity: discount_amount > (gross_fee * 0.5) ? 'warning' : 'info',
        action: 'Fee Discount Granted',
        details: `Concession of ${settings.currencySymbol || 'Rs.'}${discount_amount} applied for ${paymentData.studentName} (${paymentData.className}-${paymentData.section}). Reason: "${discount_reason}". Gross: ${settings.currencySymbol || 'Rs.'}${gross_fee}, Net: ${settings.currencySymbol || 'Rs.'}${net_fee}, Paid: ${settings.currencySymbol || 'Rs.'}${paymentData.totalAmount}. Receipt #${receiptNumber}`,
        entityId: paymentData.studentId,
        entityName: paymentData.studentName,
        previousValue: `Gross: ${settings.currencySymbol || 'Rs.'}${gross_fee}`,
        newValue: `Net: ${settings.currencySymbol || 'Rs.'}${net_fee} (Saved: ${settings.currencySymbol || 'Rs.'}${discount_amount})`,
      });
    }

    // Atomic cloud sync
    if (isFirebaseConfigured()) {
      try {
        await recordFeePaymentAtomic(settings.schoolName || 'main', confirmedPayment, paymentData.collectedBy);
      } catch (syncErr) {
        console.warn('Background sync note for fee payment:', syncErr);
      }
    }

    return confirmedPayment;
  };

  const updateFeePayment = async (updatedPayment: FeePayment): Promise<boolean> => {
    const db = await getDB();
    const toSave: FeePayment = {
      ...updatedPayment,
      updatedAt: new Date().toISOString(),
    };
    await db.put('feePayments', toSave);
    setFeePayments(prev => prev.map(p => (p.id === updatedPayment.id ? toSave : p)));
    return true;
  };

  const deleteFeePayment = async (id: string): Promise<boolean> => {
    const existing = feePayments.find(p => p.id === id);
    const db = await getDB();
    await db.delete('feePayments', id);
    setFeePayments(prev => prev.filter(p => p.id !== id));

    if (existing) {
      logActivity({
        userName: 'Administrator / Finance',
        userRole: 'admin',
        category: 'fee_deletion',
        severity: 'critical',
        action: 'Fee Payment Voucher Deleted',
        details: `Deleted fee voucher #${existing.receiptNumber} for student ${existing.studentName} (${existing.className}-${existing.section}). Amount: ${settings.currencySymbol || '$'}${existing.totalAmount}. Mode: ${existing.paymentMode}.`,
        entityId: existing.studentId,
        entityName: existing.studentName,
        previousValue: `Receipt: #${existing.receiptNumber} | Amount: ${settings.currencySymbol || '$'}${existing.totalAmount}`,
        newValue: 'Permanently deleted from active ledger',
      });
    }
    return true;
  };

  const recordExpense = async (expenseData: Omit<Expense, 'id'>): Promise<Expense> => {
    const db = await getDB();
    const newExpense: Expense = {
      ...expenseData,
      id: 'exp-' + Date.now(),
      source: expenseData.source || (expenseData.staffId || expenseData.monthForSalary ? 'system' : 'manual'),
      createdAt: expenseData.createdAt || new Date().toISOString(),
      createdBy: expenseData.recordedBy,
    };
    await db.put('expenses', newExpense);
    setExpenses(prev => [newExpense, ...prev]);
    return newExpense;
  };

  const updateExpense = async (updatedExpense: Expense): Promise<boolean> => {
    const db = await getDB();
    const toSave: Expense = {
      ...updatedExpense,
      updatedAt: new Date().toISOString(),
    };
    await db.put('expenses', toSave);
    setExpenses(prev => prev.map(e => (e.id === updatedExpense.id ? toSave : e)));
    return true;
  };

  const deleteExpense = async (id: string): Promise<boolean> => {
    const db = await getDB();
    await db.delete('expenses', id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    return true;
  };

  const recordDailyFinancialActivity = async (activity: {
    type: 'INCOME' | 'EXPENSE';
    date: string;
    title: string;
    category: string;
    amount: number;
    paymentMode: PaymentMode;
    referenceNumber?: string;
    studentId?: string;
    studentName?: string;
    staffId?: string;
    staffName?: string;
    notes?: string;
    recordedBy?: string;
    source?: 'system' | 'manual';
    createdAt?: string;
    createdBy?: string;
  }): Promise<{ id: string; type: 'INCOME' | 'EXPENSE' }> => {
    const nowIso = new Date().toISOString();
    if (activity.type === 'EXPENSE') {
      const newExp = await recordExpense({
        title: activity.title,
        category: (activity.category as any) || 'Miscellaneous',
        amount: activity.amount,
        date: activity.date,
        paymentMode: activity.paymentMode,
        referenceNumber: activity.referenceNumber,
        staffId: activity.staffId,
        staffName: activity.staffName,
        notes: activity.notes,
        recordedBy: activity.recordedBy || 'Finance Bursar',
        source: activity.source || 'manual',
        createdAt: activity.createdAt || nowIso,
        createdBy: activity.recordedBy || 'Finance Bursar',
      });
      return { id: newExp.id, type: 'EXPENSE' };
    } else {
      const db = await getDB();
      const prefix = settings.receiptPrefix || 'REC-2026';
      const count = feePayments.length + 1;
      const receiptNumber = activity.referenceNumber || `${prefix}-${String(count).padStart(4, '0')}`;
      
      const newPayment: FeePayment = {
        id: 'pay-' + Date.now(),
        receiptNumber,
        studentId: activity.studentId || '',
        studentName: activity.studentName || activity.title,
        className: activity.studentId
          ? (students.find(s => s.id === activity.studentId)?.className || 'General')
          : 'School-Wide',
        section: activity.studentId
          ? (students.find(s => s.id === activity.studentId)?.section || 'A')
          : 'General',
        date: activity.date,
        monthFor: getCurrentMonthName() + ' ' + (settings.currentAcademicYear || '2026-2027'),
        category: activity.category || 'Other Revenue',
        feeBreakdown: [{ headName: activity.category || 'General Inflow', amount: activity.amount }],
        totalAmount: activity.amount,
        paymentMode: activity.paymentMode,
        transactionRef: activity.referenceNumber,
        remarks: activity.notes || activity.title,
        collectedBy: activity.recordedBy || 'Finance Bursar',
        source: activity.source || 'manual',
        createdAt: activity.createdAt || nowIso,
        createdBy: activity.recordedBy || 'Finance Bursar',
      };
      await db.put('feePayments', newPayment);
      setFeePayments(prev => [newPayment, ...prev]);
      return { id: newPayment.id, type: 'INCOME' };
    }
  };

  const bulkRecordDailyFinancialActivities = async (
    activities: DailyFinancialActivityInput[]
  ): Promise<{ successCount: number; incomeCount: number; expenseCount: number }> => {
    if (!activities.length) {
      return { successCount: 0, incomeCount: 0, expenseCount: 0 };
    }

    const db = await getDB();
    const prefix = settings.receiptPrefix || 'REC-2026';
    let baseCount = feePayments.length;

    const newExpenses: Expense[] = [];
    const newPayments: FeePayment[] = [];

    const now = Date.now();
    activities.forEach((act, idx) => {
      const uniqueSuffix = `${now}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
      if (act.type === 'EXPENSE') {
        const exp: Expense = {
          id: `exp-bulk-${uniqueSuffix}`,
          title: act.title,
          category: (act.category as any) || 'Miscellaneous',
          amount: act.amount,
          date: act.date || getTodayDateString(),
          paymentMode: act.paymentMode || 'Cash',
          referenceNumber: act.referenceNumber,
          staffId: act.staffId,
          staffName: act.staffName,
          notes: act.notes,
          recordedBy: act.recordedBy || 'Finance Bursar',
        };
        newExpenses.push(exp);
      } else {
        baseCount += 1;
        const receiptNumber = act.referenceNumber || `${prefix}-${String(baseCount).padStart(4, '0')}`;
        
        let student = act.studentId ? students.find(s => s.id === act.studentId) : undefined;
        if (!student && act.studentName) {
          student = students.find(
            s =>
              s.fullName.toLowerCase() === act.studentName!.toLowerCase() ||
              s.rollNo.toLowerCase() === act.studentName!.toLowerCase()
          );
        }

        const pay: FeePayment = {
          id: `pay-bulk-${uniqueSuffix}`,
          receiptNumber,
          studentId: student ? student.id : (act.studentId || ''),
          studentName: student ? student.fullName : (act.studentName || act.title),
          className: student ? student.className : (act.studentId ? 'General' : 'School-Wide'),
          section: student ? student.section : 'General',
          date: act.date || getTodayDateString(),
          monthFor: getCurrentMonthName() + ' ' + (settings.currentAcademicYear || '2026-2027'),
          category: act.category || 'Other Revenue',
          feeBreakdown: [{ headName: act.category || 'General Inflow', amount: act.amount }],
          totalAmount: act.amount,
          paymentMode: act.paymentMode || 'Cash',
          transactionRef: act.referenceNumber,
          remarks: act.notes || act.title,
          collectedBy: act.recordedBy || 'Finance Bursar',
        };
        newPayments.push(pay);
      }
    });

    if (newExpenses.length > 0) {
      const txExp = db.transaction('expenses', 'readwrite');
      for (const e of newExpenses) {
        await txExp.store.put(e);
      }
      await txExp.done;
      setExpenses(prev => [...newExpenses, ...prev]);
    }

    if (newPayments.length > 0) {
      const txPay = db.transaction('feePayments', 'readwrite');
      for (const p of newPayments) {
        await txPay.store.put(p);
      }
      await txPay.done;
      setFeePayments(prev => [...newPayments, ...prev]);
    }

    return {
      successCount: activities.length,
      incomeCount: newPayments.length,
      expenseCount: newExpenses.length,
    };
  };

  const payStaffSalary = async (
    staffId: string,
    month: string,
    amount: number,
    paymentMode: Expense['paymentMode'],
    refNo?: string,
    processedBy?: string
  ): Promise<boolean> => {
    const targetStaff = staff.find(s => s.id === staffId);
    if (!targetStaff) return false;

    const authorizer = processedBy || 'Accounts Bursar';
    const nowIso = new Date().toISOString();

    await recordExpense({
      title: `Salary Disbursal: ${targetStaff.fullName}`,
      category: 'Staff Salaries',
      amount,
      date: getTodayDateString(),
      paymentMode,
      staffId: targetStaff.id,
      staffName: targetStaff.fullName,
      monthForSalary: month,
      referenceNumber: refNo || `SAL-${Date.now().toString().slice(-6)}`,
      notes: `Monthly compensation for ${month}. Basic: $${targetStaff.monthlySalary}, Allowances: $${targetStaff.allowances}, Deductions: $${targetStaff.deductions}`,
      recordedBy: authorizer,
      createdAt: nowIso,
      createdBy: authorizer,
    });
    return true;
  };

  // Bulk Student Actions
  const bulkUpdateStudentStatus = async (studentIds: string[], status: StudentStatus): Promise<boolean> => {
    const db = await getDB();
    const updated = students.map(s => {
      if (studentIds.includes(s.id)) {
        return { ...s, status };
      }
      return s;
    });

    const tx = db.transaction('students', 'readwrite');
    for (const id of studentIds) {
      const s = updated.find(item => item.id === id);
      if (s) await tx.store.put(s);
    }
    await tx.done;

    setStudents(updated);
    return true;
  };

  const bulkRecordStudentAttendance = async (
    studentIds: string[],
    date: string,
    status: AttendanceStatus,
    remarks?: string
  ): Promise<boolean> => {
    const selectedStudents = students.filter(s => studentIds.includes(s.id));
    const records: StudentAttendanceRecord[] = selectedStudents.map(s => ({
      id: `att-s-${date}-${s.id}`,
      date,
      studentId: s.id,
      studentName: s.fullName,
      className: s.className,
      section: s.section,
      status,
      remarks: remarks || `Bulk marked as ${status}`,
    }));

    return await saveStudentAttendance(records);
  };

  const bulkRecordFeePayments = async (
    studentIds: string[],
    monthFor: string,
    paymentMode: PaymentMode,
    remarks?: string,
    options?: {
      customAmount?: number;
      feeBreakdown?: { headName: string; amount: number }[];
      date?: string;
      collectedBy?: string;
      transactionRef?: string;
      studentAmounts?: Record<string, { totalAmount: number; breakdown?: { headName: string; amount: number }[] }>;
    }
  ): Promise<FeePayment[]> => {
    const db = await getDB();
    const createdPayments: FeePayment[] = [];
    const prefix = settings.receiptPrefix || 'REC-2026';
    let baseCount = feePayments.length;

    const tx = db.transaction('feePayments', 'readwrite');

    for (const studentId of studentIds) {
      const student = students.find(s => s.id === studentId);
      if (!student) continue;

      baseCount += 1;
      const receiptNumber = `${prefix}-${String(baseCount).padStart(4, '0')}`;

      // Get fee breakdown based on studentAmounts, class structure, or custom options
      const classStruct = feeStructures.find(
        f => f.className.toLowerCase() === student.className.toLowerCase()
      );

      let totalAmount = 450;
      let breakdown: { headName: string; amount: number }[] = [];

      if (options?.studentAmounts && options.studentAmounts[student.id]) {
        const item = options.studentAmounts[student.id];
        totalAmount = item.totalAmount;
        breakdown = item.breakdown && item.breakdown.length > 0
          ? item.breakdown
          : [{ headName: 'Tuition & Outstanding Fee Clearance', amount: item.totalAmount }];
      } else if (options?.customAmount !== undefined && options.customAmount > 0) {
        totalAmount = options.customAmount;
        breakdown = options.feeBreakdown && options.feeBreakdown.length > 0
          ? options.feeBreakdown
          : [{ headName: 'Monthly Tuition Fee', amount: options.customAmount }];
      } else if (classStruct) {
        totalAmount = classStruct.totalAmount;
        breakdown = classStruct.heads.map(h => ({ headName: h.name, amount: h.amount }));
      } else {
        totalAmount = 450;
        breakdown = [{ headName: 'Tuition Fee', amount: totalAmount }];
      }

      const newPayment: FeePayment = {
        id: `pay-bulk-${Date.now()}-${student.id}`,
        receiptNumber,
        studentId: student.id,
        studentName: student.fullName,
        className: student.className,
        section: student.section,
        date: options?.date || getTodayDateString(),
        monthFor,
        feeBreakdown: breakdown,
        totalAmount,
        paymentMode,
        transactionRef: options?.transactionRef,
        remarks: remarks || `Bulk recorded for ${monthFor}`,
        collectedBy: options?.collectedBy || 'Accounts Bursar',
        source: 'system',
        createdAt: new Date().toISOString(),
        createdBy: options?.collectedBy || 'Accounts Bursar',
      };

      await tx.store.put(newPayment);
      createdPayments.push(newPayment);
    }

    await tx.done;
    setFeePayments(prev => [...createdPayments, ...prev]);

    if (createdPayments.length > 0) {
      await logActivity({
        userName: options?.collectedBy || 'Accounts Administrator',
        userRole: 'admin',
        action: 'Batch Fee Collection Processed',
        category: 'system_action',
        severity: 'info',
        details: `Processed bulk fee transaction for ${createdPayments.length} students totaling ${createdPayments.reduce((s, p) => s + p.totalAmount, 0)} (${monthFor}, Mode: ${paymentMode}).`,
        entityName: `${createdPayments[0]?.receiptNumber} - ${createdPayments[createdPayments.length - 1]?.receiptNumber}`,
      });
    }

    return createdPayments;
  };

  // Bulk Staff Actions
  const bulkRecordStaffAttendance = async (
    staffIds: string[],
    date: string,
    status: AttendanceStatus,
    leaveType?: 'casual' | 'sick' | 'paid',
    remarks?: string
  ): Promise<boolean> => {
    const selectedStaff = staff.filter(s => staffIds.includes(s.id));
    const records: StaffAttendanceRecord[] = selectedStaff.map(s => ({
      id: `att-st-${date}-${s.id}`,
      date,
      staffId: s.id,
      staffName: s.fullName,
      designation: s.designation,
      status,
      leaveType: status === 'leave' ? (leaveType || 'casual') : undefined,
      remarks: remarks || `Bulk marked as ${status}`,
    }));

    return await saveStaffAttendance(records);
  };

  const bulkPayStaffSalaries = async (
    staffIds: string[],
    month: string,
    paymentMode: Expense['paymentMode']
  ): Promise<number> => {
    let disbursedCount = 0;
    for (const staffId of staffIds) {
      const member = staff.find(s => s.id === staffId);
      if (!member) continue;

      // Check if already paid
      const alreadyPaid = expenses.some(
        e => e.category === 'Staff Salaries' && e.staffId === member.id && e.monthForSalary === month
      );
      if (alreadyPaid) continue;

      const netSalary = member.monthlySalary + member.allowances - member.deductions;
      await payStaffSalary(member.id, month, netSalary, paymentMode);
      disbursedCount++;
    }
    return disbursedCount;
  };

  const bulkUpdateStaffDepartment = async (
    staffIds: string[],
    department: string
  ): Promise<boolean> => {
    const db = await getDB();
    const updated = staff.map(s => {
      if (staffIds.includes(s.id)) {
        return { ...s, department };
      }
      return s;
    });

    const tx = db.transaction('staff', 'readwrite');
    for (const id of staffIds) {
      const s = updated.find(item => item.id === id);
      if (s) await tx.store.put(s);
    }
    await tx.done;

    setStaff(updated);
    return true;
  };

  // Settings & DB
  const updateSettings = async (newSettings: SchoolSettings): Promise<boolean> => {
    const db = await getDB();
    await db.put('schoolSettings', { key: 'main', data: newSettings });
    setSettings(newSettings);
    return true;
  };

  // Dynamic Class Management Helpers
  const activeClasses = React.useMemo(
    () =>
      [...classes]
        .filter(c => c.status === 'active')
        .sort((a, b) => a.display_order - b.display_order),
    [classes]
  );

  const syncStandardClassesSetting = async (
    nextClasses: SchoolClass[],
    baseSettings?: SchoolSettings
  ): Promise<void> => {
    const sortedActiveNames = [...nextClasses]
      .filter(c => c.status === 'active')
      .sort((a, b) => a.display_order - b.display_order)
      .map(c => c.name);
    const targetSettings = baseSettings || settings;
    await updateSettings({
      ...targetSettings,
      standardClasses: sortedActiveNames,
    });
  };

  const addClassEntity = async (input: {
    name: string;
    display_order?: number;
    sections?: string[];
    status?: ClassStatus;
  }): Promise<{ success: boolean; classItem?: SchoolClass; error?: string }> => {
    const trimmed = input.name.trim();
    if (!trimmed) {
      return { success: false, error: 'Class name is required.' };
    }
    if (classes.some(c => c.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      return { success: false, error: `Class "${trimmed}" already exists.` };
    }

    const now = new Date().toISOString();
    const maxOrder = classes.reduce((m, c) => Math.max(m, c.display_order), 0);
    const desiredOrder =
      typeof input.display_order === 'number' && !Number.isNaN(input.display_order) && input.display_order > 0
        ? Math.floor(input.display_order)
        : maxOrder + 1;

    const cleanSections =
      input.sections && input.sections.length > 0
        ? Array.from(new Set(input.sections.map(s => s.trim().toUpperCase()).filter(Boolean)))
        : settings.standardSections || ['A', 'B', 'C'];

    const newClass: SchoolClass = {
      id: `cls-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      display_order: desiredOrder,
      sections: cleanSections,
      status: input.status || 'active',
      created_at: now,
      updated_at: now,
    };

    const nextClasses = [...classes, newClass].sort((a, b) => a.display_order - b.display_order);
    await saveClassDB(newClass);
    setClasses(nextClasses);
    syncToCloud('classes', newClass);
    await syncStandardClassesSetting(nextClasses);

    return { success: true, classItem: newClass };
  };

  const updateClassEntity = async (
    updated: SchoolClass
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmed = updated.name.trim();
    if (!trimmed) {
      return { success: false, error: 'Class name cannot be empty.' };
    }
    const existing = classes.find(c => c.id === updated.id);
    if (!existing) {
      return { success: false, error: 'Target class record not found.' };
    }
    if (
      classes.some(
        c => c.id !== updated.id && c.name.trim().toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      return { success: false, error: `Another class named "${trimmed}" already exists.` };
    }

    const now = new Date().toISOString();
    const cleanSections =
      updated.sections && updated.sections.length > 0
        ? Array.from(new Set(updated.sections.map(s => s.trim().toUpperCase()).filter(Boolean)))
        : existing.sections;

    const savedClass: SchoolClass = {
      ...existing,
      ...updated,
      name: trimmed,
      display_order: Math.max(1, Math.floor(updated.display_order || existing.display_order)),
      sections: cleanSections,
      updated_at: now,
    };

    const oldName = existing.name;
    let nextSettings = settings;

    // Cascade class rename across all linked modules if name changed
    if (oldName !== trimmed) {
      const db = await getDB();

      const stuToUpdate = students.filter(s => s.className === oldName);
      if (stuToUpdate.length > 0) {
        const tx = db.transaction('students', 'readwrite');
        for (const s of stuToUpdate) await tx.store.put({ ...s, className: trimmed });
        await tx.done;
        setStudents(prev => prev.map(s => (s.className === oldName ? { ...s, className: trimmed } : s)));
      }

      const attToUpdate = studentAttendance.filter(a => a.className === oldName);
      if (attToUpdate.length > 0) {
        const tx = db.transaction('studentAttendance', 'readwrite');
        for (const a of attToUpdate) await tx.store.put({ ...a, className: trimmed });
        await tx.done;
        setStudentAttendance(prev => prev.map(a => (a.className === oldName ? { ...a, className: trimmed } : a)));
      }

      const feeStructToUpdate = feeStructures.filter(
        f => f.class_id === existing.id || f.className === oldName
      );
      if (feeStructToUpdate.length > 0) {
        const tx = db.transaction('feeStructures', 'readwrite');
        for (const fs of feeStructToUpdate) {
          const nextFs = { ...fs, class_id: existing.id, className: trimmed, updatedAt: now };
          await tx.store.put(nextFs);
          syncToCloud('feeStructures', nextFs);
        }
        await tx.done;
        setFeeStructures(prev =>
          prev.map(fs =>
            fs.class_id === existing.id || fs.className === oldName
              ? { ...fs, class_id: existing.id, className: trimmed, updatedAt: now }
              : fs
          )
        );
      }

      const paymentsToUpdate = feePayments.filter(p => p.className === oldName);
      if (paymentsToUpdate.length > 0) {
        const tx = db.transaction('feePayments', 'readwrite');
        for (const p of paymentsToUpdate) await tx.store.put({ ...p, className: trimmed });
        await tx.done;
        setFeePayments(prev => prev.map(p => (p.className === oldName ? { ...p, className: trimmed } : p)));
      }

      const examsToUpdate = exams.filter(e => e.className === oldName);
      if (examsToUpdate.length > 0) {
        const tx = db.transaction('exams', 'readwrite');
        for (const ex of examsToUpdate) await tx.store.put({ ...ex, className: trimmed });
        await tx.done;
        setExams(prev => prev.map(ex => (ex.className === oldName ? { ...ex, className: trimmed } : ex)));
      }

      const resultsToUpdate = examResults.filter(r => r.className === oldName);
      if (resultsToUpdate.length > 0) {
        const tx = db.transaction('examResults', 'readwrite');
        for (const res of resultsToUpdate) await tx.store.put({ ...res, className: trimmed });
        await tx.done;
        setExamResults(prev => prev.map(res => (res.className === oldName ? { ...res, className: trimmed } : res)));
      }

      const booksToUpdate = books.filter(b => b.className === oldName);
      if (booksToUpdate.length > 0) {
        const tx = db.transaction('books', 'readwrite');
        for (const b of booksToUpdate) await tx.store.put({ ...b, className: trimmed });
        await tx.done;
        setBooks(prev => prev.map(b => (b.className === oldName ? { ...b, className: trimmed } : b)));
      }

      const certsToUpdate = certificates.filter(
        c => c.classEnrolled === oldName || c.classLeaving === oldName
      );
      if (certsToUpdate.length > 0) {
        const tx = db.transaction('certificates', 'readwrite');
        for (const c of certsToUpdate) {
          await tx.store.put({
            ...c,
            classEnrolled: c.classEnrolled === oldName ? trimmed : c.classEnrolled,
            classLeaving: c.classLeaving === oldName ? trimmed : c.classLeaving,
          });
        }
        await tx.done;
        setCertificates(prev =>
          prev.map(c =>
            c.classEnrolled === oldName || c.classLeaving === oldName
              ? {
                  ...c,
                  classEnrolled: c.classEnrolled === oldName ? trimmed : c.classEnrolled,
                  classLeaving: c.classLeaving === oldName ? trimmed : c.classLeaving,
                }
              : c
          )
        );
      }

      if (typeof window !== 'undefined') {
        try {
          const rawSlots = localStorage.getItem('eduledger_timetable_schedules');
          if (rawSlots) {
            const parsed = JSON.parse(rawSlots);
            if (Array.isArray(parsed) && parsed.some((t: { className?: string }) => t.className === oldName)) {
              const updatedSlots = parsed.map((t: { className?: string }) =>
                t.className === oldName ? { ...t, className: trimmed } : t
              );
              localStorage.setItem('eduledger_timetable_schedules', JSON.stringify(updatedSlots));
              window.dispatchEvent(new CustomEvent('eduledger-timetable-updated', { detail: updatedSlots }));
            }
          }
        } catch {
          // Ignore malformed timetable JSON cleanly
        }
      }
    }

    const nextClasses = classes
      .map(c => (c.id === savedClass.id ? savedClass : c))
      .sort((a, b) => a.display_order - b.display_order);

    await saveClassDB(savedClass);
    setClasses(nextClasses);
    syncToCloud('classes', savedClass);
    await syncStandardClassesSetting(nextClasses, nextSettings);

    return { success: true };
  };

  const deleteClassEntity = async (
    classId: string
  ): Promise<{ success: boolean; blockedByStudents?: number; error?: string }> => {
    const target = classes.find(c => c.id === classId);
    if (!target) {
      return { success: false, error: 'Class not found.' };
    }

    const enrolledCount = students.filter(
      s => s.className.trim().toLowerCase() === target.name.trim().toLowerCase()
    ).length;

    if (enrolledCount > 0) {
      return {
        success: false,
        blockedByStudents: enrolledCount,
        error: `Cannot delete "${target.name}" because ${enrolledCount} student${enrolledCount === 1 ? ' is' : 's are'} currently enrolled. Deactivate it instead.`,
      };
    }

    await deleteClassDB(classId);
    removeFromCloud('classes', classId);
    const nextClasses = classes
      .filter(c => c.id !== classId)
      .sort((a, b) => a.display_order - b.display_order);
    setClasses(nextClasses);

    // Clean up any associated fee structure if user confirmed deletion
    const linkedFee = feeStructures.find(
      f => f.class_id === classId || f.className.toLowerCase() === target.name.toLowerCase()
    );
    if (linkedFee) {
      const db = await getDB();
      await db.delete('feeStructures', linkedFee.id);
      removeFromCloud('feeStructures', linkedFee.id);
      setFeeStructures(prev => prev.filter(f => f.id !== linkedFee.id));
    }

    await syncStandardClassesSetting(nextClasses);
    return { success: true };
  };

  const reorderClassEntities = async (orderedIds: string[]): Promise<boolean> => {
    const now = new Date().toISOString();
    const orderMap = new Map<string, number>();
    orderedIds.forEach((id, idx) => orderMap.set(id, idx + 1));

    let nextOrderCounter = orderedIds.length + 1;
    const updatedClasses: SchoolClass[] = [...classes]
      .map(c => ({
        ...c,
        display_order: orderMap.has(c.id) ? (orderMap.get(c.id) as number) : nextOrderCounter++,
        updated_at: now,
      }))
      .sort((a, b) => a.display_order - b.display_order);

    await saveBulkClassesDB(updatedClasses);
    setClasses(updatedClasses);
    for (const c of updatedClasses) {
      syncToCloud('classes', c);
    }
    await syncStandardClassesSetting(updatedClasses);
    return true;
  };

  // Legacy-compatible class wrappers backed by dynamic `classes` table
  const addClass = async (newClassName: string): Promise<boolean> => {
    const res = await addClassEntity({ name: newClassName });
    return res.success;
  };

  const addMultipleClasses = async (
    classNames: string[]
  ): Promise<{ added: string[]; duplicates: string[] }> => {
    const added: string[] = [];
    const duplicates: string[] = [];
    const working = [...classes];
    let maxOrder = working.reduce((m, c) => Math.max(m, c.display_order), 0);
    const now = new Date().toISOString();
    const newlyCreated: SchoolClass[] = [];

    for (const raw of classNames) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (working.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
        duplicates.push(trimmed);
      } else {
        maxOrder += 1;
        const item: SchoolClass = {
          id: `cls-${Date.now()}-${maxOrder}-${Math.random().toString(36).slice(2, 5)}`,
          name: trimmed,
          display_order: maxOrder,
          sections: settings.standardSections || ['A', 'B', 'C'],
          status: 'active',
          created_at: now,
          updated_at: now,
        };
        working.push(item);
        newlyCreated.push(item);
        added.push(trimmed);
      }
    }

    if (newlyCreated.length > 0) {
      await saveBulkClassesDB(newlyCreated);
      const sorted = working.sort((a, b) => a.display_order - b.display_order);
      setClasses(sorted);
      for (const c of newlyCreated) syncToCloud('classes', c);
      await syncStandardClassesSetting(sorted);
    }

    return { added, duplicates };
  };

  const removeClass = async (className: string): Promise<boolean> => {
    const found = classes.find(c => c.name.toLowerCase() === className.toLowerCase());
    if (found) {
      const res = await deleteClassEntity(found.id);
      return res.success;
    }
    const currentClasses = settings.standardClasses || [];
    const updatedClasses = currentClasses.filter(c => c !== className);
    return await updateSettings({
      ...settings,
      standardClasses: updatedClasses,
    });
  };

  const renameClass = async (oldName: string, newName: string): Promise<boolean> => {
    const found = classes.find(c => c.name.toLowerCase() === oldName.toLowerCase());
    if (found) {
      const res = await updateClassEntity({ ...found, name: newName });
      return res.success;
    }
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return false;
    const currentClasses = settings.standardClasses || [];
    const updatedClasses = currentClasses.map(c => (c === oldName ? trimmed : c));
    return await updateSettings({
      ...settings,
      standardClasses: updatedClasses,
    });
  };

  const reorderClasses = async (orderedNames: string[]): Promise<boolean> => {
    const orderedIds = orderedNames
      .map(name => classes.find(c => c.name.toLowerCase() === name.toLowerCase())?.id)
      .filter((id): id is string => Boolean(id));
    if (orderedIds.length > 0) {
      return await reorderClassEntities(orderedIds);
    }
    return await updateSettings({
      ...settings,
      standardClasses: orderedNames,
    });
  };

  const addSection = async (newSectionName: string): Promise<boolean> => {
    const trimmed = newSectionName.trim().toUpperCase();
    if (!trimmed) return false;
    const currentSections = settings.standardSections || ['A', 'B', 'C'];
    if (currentSections.includes(trimmed)) return false;
    return await updateSettings({
      ...settings,
      standardSections: [...currentSections, trimmed],
    });
  };

  const removeSection = async (sectionName: string): Promise<boolean> => {
    const currentSections = settings.standardSections || ['A', 'B', 'C'];
    const updatedSections = currentSections.filter(s => s !== sectionName);
    return await updateSettings({
      ...settings,
      standardSections: updatedSections,
    });
  };

  const refreshBackupSnapshots = async () => {
    try {
      const snaps = await getAllBackupSnapshotsDB();
      setBackupSnapshots(snaps);
    } catch (e) {
      console.warn('Failed to refresh backup snapshots:', e);
    }
  };

  const updateAutoBackupConfig = async (newConfig: AutoBackupConfig): Promise<boolean> => {
    try {
      const updated: AutoBackupConfig = {
        ...newConfig,
        nextScheduledBackupTimestamp: calculateNextBackupTime(
          newConfig.frequency,
          newConfig.lastAutoBackupTimestamp
        ),
      };
      setAutoBackupConfig(updated);
      saveAutoBackupConfigToStorage(updated);
      if (settings && Object.keys(settings).length > 0) {
        await updateSettings({
          ...settings,
          autoBackupConfig: updated,
        });
      }
      return true;
    } catch (e) {
      console.error('Failed to update auto backup config:', e);
      return false;
    }
  };

  const runAutomatedBackupNow = async (
    trigger: BackupTriggerType = 'automated_scheduled',
    autoDownload?: boolean
  ): Promise<BackupSnapshotRecord> => {
    setIsAutoBackupRunning(true);
    try {
      const isScheduled = trigger === 'automated_scheduled';
      const isSafety = trigger === 'pre_restore_safety';
      const title = isScheduled
        ? `Automated Scheduled Backup (${autoBackupConfig.frequency})`
        : isSafety
        ? `Pre-Restore Safety Checkpoint`
        : `Manual Vault Snapshot`;

      const snapshot = await createAndSaveSnapshot(trigger, title);

      await enforceSnapshotRetention(autoBackupConfig.maxStoredSnapshots || 10);
      await refreshBackupSnapshots();

      const nowIso = new Date().toISOString();
      const nextIso = calculateNextBackupTime(autoBackupConfig.frequency, nowIso);
      const updatedConfig: AutoBackupConfig = {
        ...autoBackupConfig,
        lastAutoBackupTimestamp: nowIso,
        nextScheduledBackupTimestamp: nextIso,
      };
      setAutoBackupConfig(updatedConfig);
      saveAutoBackupConfigToStorage(updatedConfig);

      const shouldDownload =
        typeof autoDownload === 'boolean'
          ? autoDownload
          : autoBackupConfig.autoPromptDownload;

      if (shouldDownload) {
        downloadJsonFile(snapshot.jsonData, undefined, settings.schoolName);
      }

      await logActivity({
        userName: 'Automated Backup Engine',
        userRole: 'admin',
        action: 'Automated Client-Side Backup Created',
        category: 'system_action',
        severity: 'info',
        details: `Automated snapshot created and saved to offline local vault (${snapshot.recordsCount} total entities, ${(snapshot.sizeBytes / 1024).toFixed(1)} KB). Trigger: ${trigger}.`,
        entityName: snapshot.title,
      });

      return snapshot;
    } finally {
      setIsAutoBackupRunning(false);
    }
  };

  const deleteBackupSnapshot = async (id: string): Promise<boolean> => {
    try {
      await deleteBackupSnapshotDB(id);
      await refreshBackupSnapshots();
      return true;
    } catch (e) {
      console.error('Failed to delete backup snapshot:', e);
      return false;
    }
  };

  const restoreFromSnapshot = async (snapshot: BackupSnapshotRecord): Promise<boolean> => {
    return await restoreDatabase(snapshot.jsonData);
  };

  // Background Automated Backup Engine
  useEffect(() => {
    if (!autoBackupConfig.enabled || autoBackupConfig.frequency === 'disabled') {
      return;
    }

    const checkAndRunAutoBackup = async () => {
      if (isLoading || isAutoBackupRunning) return;
      if (isBackupDue(autoBackupConfig)) {
        try {
          await runAutomatedBackupNow('automated_scheduled');
        } catch (err) {
          console.error('Background automated backup error:', err);
        }
      }
    };

    // Check on startup/mount after brief delay
    const initialTimer = setTimeout(() => {
      checkAndRunAutoBackup();
    }, 4000);

    // Periodic interval check every 60 seconds
    const intervalTimer = setInterval(() => {
      checkAndRunAutoBackup();
    }, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [
    autoBackupConfig.enabled,
    autoBackupConfig.frequency,
    autoBackupConfig.lastAutoBackupTimestamp,
    isLoading,
    isAutoBackupRunning,
  ]);

  // Offline-First Background Server Sync Implementation
  const triggerServerSync = async (): Promise<BackgroundSyncInfo> => {
    setIsServerSyncing(true);
    try {
      const totalRecords =
        (students?.length || 0) +
        (staff?.length || 0) +
        (feePayments?.length || 0) +
        (expenses?.length || 0) +
        800;
      const result = await performServerBackgroundSync(totalRecords);
      setServerSyncInfo(result);
      return result;
    } catch (e) {
      console.error('Failed to execute server background sync:', e);
      const fallback = getInitialSyncInfo();
      setServerSyncInfo(fallback);
      return fallback;
    } finally {
      setIsServerSyncing(false);
    }
  };

  // Subscribe to background sync updates
  useEffect(() => {
    const unsubscribe = subscribeToSyncChanges(info => {
      setServerSyncInfo(info);
    });
    return unsubscribe;
  }, []);

  // Online / Offline window network listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      triggerServerSync();
    };
    const handleOffline = () => {
      setServerSyncInfo(prev => ({
        ...prev,
        isOnline: false,
        status: 'offline',
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [students.length, staff.length, feePayments.length, expenses.length]);

  // Periodic silent background sync pulse every 3 minutes when online
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine && !isServerSyncing) {
        triggerServerSync();
      }
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isServerSyncing, students.length, staff.length, feePayments.length, expenses.length]);

  const backupDatabase = async (): Promise<{ filename: string; sizeBytes: number; recordsCount: number }> => {
    const jsonStr = await exportFullDatabaseJson();
    const safeSchoolName = (settings.schoolName || 'EduLedger').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const dateStr = getTodayDateString();
    const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
    const filename = `eduledger_full_backup_${safeSchoolName}_${dateStr}_${timeStr}.json`;

    // Download to user's local disk
    const result = downloadJsonFile(jsonStr, filename, settings.schoolName);

    const inspection = inspectBackupJson(jsonStr);
    const totalRecords = Object.values(inspection.entityCounts).reduce((a, b) => (a || 0) + (b || 0), 0);

    if (typeof window !== 'undefined') {
      localStorage.setItem('eduledger_last_backup_timestamp', new Date().toISOString());
      localStorage.setItem('eduledger_last_backup_filename', filename);
    }

    // Also record a manual export snapshot into the local offline vault
    try {
      await createAndSaveSnapshot(
        'manual_export',
        `Manual Export (${filename})`,
        `Exported full application state containing ${totalRecords} records across all database stores.`
      );
      await enforceSnapshotRetention(autoBackupConfig.maxStoredSnapshots || 10);
      await refreshBackupSnapshots();
    } catch (snapErr) {
      console.warn('Could not save manual export to snapshot vault:', snapErr);
    }

    await logActivity({
      userName: 'Administrator / IT System',
      userRole: 'admin',
      action: 'Entire Application State Exported',
      category: 'system_action',
      severity: 'info',
      details: `Administrator exported entire application state to local file "${filename}" (${totalRecords} records across all stores, ${(result.sizeBytes / 1024).toFixed(1)} KB).`,
      entityName: filename,
    });

    return {
      filename,
      sizeBytes: result.sizeBytes,
      recordsCount: totalRecords,
    };
  };

  const inspectBackup = (jsonContent: string): BackupInspectionResult => {
    return inspectBackupJson(jsonContent);
  };

  const getBackupJsonString = async (): Promise<string> => {
    return await exportFullDatabaseJson();
  };

  const restoreDatabase = async (jsonContent: string): Promise<boolean> => {
    try {
      // First, take an automatic safety snapshot of current state before applying changes!
      try {
        await createAndSaveSnapshot(
          'pre_restore_safety',
          'Pre-Restore Safety Checkpoint',
          'Automatic safety checkpoint created right before restoring application state from backup file.'
        );
        await enforceSnapshotRetention(autoBackupConfig.maxStoredSnapshots || 10);
        await refreshBackupSnapshots();
      } catch (safetyErr) {
        console.warn('Could not record pre-restore safety snapshot:', safetyErr);
      }

      const data = await importFullDatabaseJson(jsonContent);
      setClasses([...(data.classes || [])].sort((a, b) => a.display_order - b.display_order));
      setStudents(data.students || []);
      setStaff(data.staff || []);
      setStaffLeaves(data.staffLeaves || []);
      setStudentAttendance(data.studentAttendance || []);
      setStaffAttendance(data.staffAttendance || []);
      setFeeStructures(data.feeStructures || []);
      setFeePayments(data.feePayments || []);
      setExpenses(data.expenses || []);
      setSettings(data.settings);
      setAllUsers(data.users || []);
      setExams(data.exams || []);
      setExamResults(data.examResults || []);
      setBudgets(data.budgets || []);
      setBooks(data.books || []);
      setBookSales(data.bookSales || []);
      setBookSuppliers(data.bookSuppliers || []);
      setSupplierPayments(data.supplierPayments || []);
      setActivityLogs(data.activityLogs || []);
      setCertificates(data.certificates || []);
      setAssets(data.assets || []);
      setPayrollRuns(data.payrollRuns || []);
      setSalaryRecords(data.salaryRecords || []);

      if (typeof window !== 'undefined') {
        localStorage.setItem('eduledger_last_restore_timestamp', new Date().toISOString());
      }

      await logActivity({
        userName: 'Administrator / IT System',
        userRole: 'admin',
        action: 'Database Restored from Backup File',
        category: 'system_action',
        severity: 'warning',
        details: `Administrator restored entire application state from JSON backup snapshot. Restored ${data.students?.length || 0} students, ${data.staff?.length || 0} faculty, ${data.feePayments?.length || 0} fee transactions, ${data.assets?.length || 0} assets, ${data.payrollRuns?.length || 0} payroll runs, and system settings.`,
        entityName: 'Full Database Restore',
      });

      return true;
    } catch (e) {
      console.error('Failed to import database:', e);
      return false;
    }
  };

  const resetToDemo = async (): Promise<boolean> => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('eduledger_is_clean_slate');
        localStorage.removeItem('eduledger_db_initialized');
      }
      setIsCleanSlate(false);
      const data = await seedDatabase();
      setClasses([...(data.classes || [])].sort((a, b) => a.display_order - b.display_order));
      setStudents(data.students);
      setStaff(data.staff);
      setStudentAttendance(data.studentAttendance);
      setStaffAttendance(data.staffAttendance);
      setFeeStructures(data.feeStructures);
      setFeePayments(data.feePayments);
      setExpenses(data.expenses);
      setSettings(data.settings);
      setAllUsers(data.users);
      setExams(data.exams || []);
      setExamResults(data.examResults || []);
      setBudgets(data.budgets || []);
      setBooks(data.books || []);
      setBookSales(data.bookSales || []);
      setCertificates(data.certificates || []);
      setAssets(data.assets || []);
      setPayrollRuns(data.payrollRuns || []);
      setSalaryRecords(data.salaryRecords || []);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };


  const clearModuleData = async (moduleKey: ClearableDataModule): Promise<boolean> => {
    try {
      switch (moduleKey) {
        case 'students':
          await clearStoresDB(['students']);
          setStudents([]);
          break;
        case 'staff':
          await clearStoresDB(['staff', 'staffLeaves', 'staffAttendance']);
          setStaff([]);
          setStaffLeaves([]);
          setStaffAttendance([]);
          break;
        case 'attendance':
          await clearStoresDB(['studentAttendance', 'staffAttendance']);
          setStudentAttendance([]);
          setStaffAttendance([]);
          break;
        case 'feeCollections':
          await clearStoresDB(['feePayments']);
          setFeePayments([]);
          break;
        case 'feeStructures':
          await clearStoresDB(['feeStructures']);
          setFeeStructures([]);
          break;
        case 'expenses':
          await clearStoresDB(['expenses']);
          clearStoredRecurringTemplates();
          clearStoredBudgetThresholds();
          setExpenses([]);
          break;
        case 'books':
          await clearStoresDB(['books', 'bookSales', 'bookSuppliers', 'supplierPayments']);
          setBooks([]);
          setBookSales([]);
          setBookSuppliers([]);
          setSupplierPayments([]);
          break;
        case 'exams':
          await clearStoresDB(['exams', 'examResults']);
          setExams([]);
          setExamResults([]);
          break;
        case 'budgets':
          await clearStoresDB(['budgets']);
          clearStoredBudgetThresholds();
          setBudgets([]);
          break;
        case 'certificates':
          await clearStoresDB(['certificates']);
          setCertificates([]);
          break;
        case 'assets':
          await clearStoresDB(['assets']);
          setAssets([]);
          break;
        case 'payroll':
          await clearStoresDB(['payrollRuns', 'salaryRecords']);
          payrollStorage.clearAllPayrollData();
          setPayrollRuns([]);
          setSalaryRecords([]);
          break;
        case 'timetable':
          if (settings) {
            const updated = { ...settings, timetable: [] };
            await updateSettings(updated);
          }
          break;
        case 'logs':
          await clearStoresDB(['activityLogs']);
          setActivityLogs([]);
          break;
        case 'all':
          return await resetAllSchoolData();
        default:
          return false;
      }
      return true;
    } catch (err) {
      console.error('Failed to clear module data for ' + moduleKey, err);
      return false;
    }
  };

  const resetAllSchoolData = async (options?: ResetAllDataOptions): Promise<boolean> => {
    try {
      if (options?.downloadBackupFirst) {
        try {
          await backupDatabase();
        } catch (backupErr) {
          console.warn('Backup download failed or skipped prior to reset:', backupErr);
        }
      }

      // Determine users to keep
      let usersToKeep: User[] = [];
      if (options?.keepAdminAccount && allUsers.length > 0) {
        const adminUser = allUsers.find(u => u.role === 'admin') || allUsers[0];
        if (adminUser) {
          usersToKeep = [adminUser];
        }
      }

      const newSettings: SchoolSettings = {
        ...cleanInitialSchoolSettings,
        schoolName: options?.newSchoolName?.trim() || cleanInitialSchoolSettings.schoolName,
        schoolTagline: options?.newSchoolTagline?.trim() || cleanInitialSchoolSettings.schoolTagline,
        currencyCode: options?.newCurrency?.trim() || cleanInitialSchoolSettings.currencyCode,
      };

      const resetData = await resetEntireSchoolDatabaseDB({
        keepCurrentUser: options?.keepAdminAccount,
        newSchoolName: options?.newSchoolName?.trim(),
        newSchoolTagline: options?.newSchoolTagline?.trim(),
        newCurrency: options?.newCurrency?.trim(),
      });

      // Clean localStorage items
      clearStoredRecurringTemplates();
      clearStoredBudgetThresholds();
      payrollStorage.clearAllPayrollData();

      if (typeof window !== 'undefined') {
        localStorage.setItem('eduledger_is_clean_slate', 'true');
        localStorage.setItem('eduledger_db_initialized', 'true');
      }

      // Reset state
      setClasses([...(resetData.classes || [])].sort((a, b) => a.display_order - b.display_order));
      setStudents([]);
      setStaff([]);
      setStudentAttendance([]);
      setStaffAttendance([]);
      setStaffLeaves([]);
      setFeeStructures([]);
      setFeePayments([]);
      setExpenses([]);
      setExams([]);
      setExamResults([]);
      setBudgets([]);
      setBooks([]);
      setBookSales([]);
      setBookSuppliers([]);
      setSupplierPayments([]);
      setCertificates([]);
      setAssets([]);
      setPayrollRuns([]);
      setSalaryRecords([]);
      setActivityLogs([]);
      setSettings(newSettings);
      setAllUsers(usersToKeep);
      setIsCleanSlate(true);

      return true;
    } catch (err) {
      console.error('Failed to reset all school data:', err);
      return false;
    }
  };

  // Exam Actions
  const addExam = async (examData: Omit<Exam, 'id' | 'createdAt'>): Promise<Exam> => {
    const newExam: Exam = {
      ...examData,
      id: 'exam-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    await addExamDB(newExam);
    setExams(prev => [newExam, ...prev]);
    return newExam;
  };

  const updateExam = async (exam: Exam): Promise<boolean> => {
    await updateExamDB(exam);
    setExams(prev => prev.map(e => (e.id === exam.id ? exam : e)));
    return true;
  };

  const deleteExam = async (id: string): Promise<boolean> => {
    await deleteExamDB(id);
    setExams(prev => prev.filter(e => e.id !== id));
    setExamResults(prev => prev.filter(r => r.examId !== id));
    return true;
  };

  // Exam Results Actions
  const saveExamResult = async (resultData: Omit<ExamResult, 'id'> | ExamResult): Promise<ExamResult> => {
    const resultToSave: ExamResult =
      'id' in resultData && resultData.id
        ? (resultData as ExamResult)
        : {
            ...resultData,
            id: 'res-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          };
    await saveExamResultDB(resultToSave);
    setExamResults(prev => {
      const idx = prev.findIndex(
        r => r.id === resultToSave.id || (r.examId === resultToSave.examId && r.studentId === resultToSave.studentId)
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = resultToSave;
        return copy;
      }
      return [resultToSave, ...prev];
    });
    return resultToSave;
  };

  const saveBulkExamResults = async (results: ExamResult[]): Promise<boolean> => {
    await saveBulkExamResultsDB(results);
    setExamResults(prev => {
      const newMap = new Map(prev.map(r => [r.id, r]));
      const compoundMap = new Map(prev.map(r => [`${r.examId}_${r.studentId}`, r.id]));

      for (const res of results) {
        if (compoundMap.has(`${res.examId}_${res.studentId}`)) {
          const existingId = compoundMap.get(`${res.examId}_${res.studentId}`)!;
          newMap.set(existingId, { ...res, id: existingId });
        } else {
          newMap.set(res.id, res);
        }
      }
      return Array.from(newMap.values());
    });
    return true;
  };

  const deleteExamResult = async (id: string): Promise<boolean> => {
    await deleteExamResultDB(id);
    setExamResults(prev => prev.filter(r => r.id !== id));
    return true;
  };

  // Budget Actions
  const addBudget = async (budgetData: Omit<DepartmentBudget, 'id' | 'createdAt'>): Promise<DepartmentBudget> => {
    const newBudget: DepartmentBudget = {
      ...budgetData,
      id: 'bgt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
    };
    await addBudgetDB(newBudget);
    setBudgets(prev => [newBudget, ...prev]);
    return newBudget;
  };

  const updateBudget = async (budget: DepartmentBudget): Promise<boolean> => {
    await updateBudgetDB(budget);
    setBudgets(prev => prev.map(b => (b.id === budget.id ? budget : b)));
    return true;
  };

  const deleteBudget = async (id: string): Promise<boolean> => {
    await deleteBudgetDB(id);
    setBudgets(prev => prev.filter(b => b.id !== id));
    return true;
  };

  const copyBudgetsToMonth = async (sourceMonth: string, targetMonth: string): Promise<boolean> => {
    const sourceList = budgets.filter(b => b.month === sourceMonth);
    if (sourceList.length === 0) return false;

    const existingDeptsInTarget = new Set(
      budgets.filter(b => b.month === targetMonth).map(b => b.department)
    );

    const newBudgets: DepartmentBudget[] = sourceList
      .filter(b => !existingDeptsInTarget.has(b.department))
      .map((b, idx) => ({
        ...b,
        id: `bgt-${Date.now()}-${idx}`,
        month: targetMonth,
        createdAt: new Date().toISOString(),
      }));

    if (newBudgets.length === 0) return false;

    await saveBulkBudgetsDB(newBudgets);
    setBudgets(prev => [...newBudgets, ...prev]);
    return true;
  };

  // Bookshop Inventory & Sales Actions
  const addBook = async (bookData: Omit<BookItem, 'id' | 'createdAt'>): Promise<BookItem> => {
    const newBook: BookItem = {
      ...bookData,
      id: 'book-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    await saveBookDB(newBook);
    setBooks(prev => [newBook, ...prev]);
    return newBook;
  };

  const updateBook = async (book: BookItem): Promise<boolean> => {
    const updated: BookItem = { ...book, updatedAt: new Date().toISOString() };
    await saveBookDB(updated);
    setBooks(prev => prev.map(b => (b.id === book.id ? updated : b)));
    return true;
  };

  const deleteBook = async (id: string): Promise<boolean> => {
    await deleteBookDB(id);
    setBooks(prev => prev.filter(b => b.id !== id));
    return true;
  };

  const recordBookSale = async (
    saleData: Omit<BookSale, 'id' | 'invoiceNo' | 'timestamp'>
  ): Promise<BookSale> => {
    const nextInvoice = `BS-${new Date().getFullYear()}-${String(bookSales.length + 1).padStart(4, '0')}`;
    const newSale: BookSale = {
      ...saleData,
      id: 'sale-' + Date.now(),
      invoiceNo: nextInvoice,
      timestamp: new Date().toISOString(),
    };

    // Decrement stock for the target book
    const targetBook = books.find(b => b.id === saleData.bookId);
    if (targetBook) {
      const updatedBook: BookItem = {
        ...targetBook,
        stock: Math.max(0, targetBook.stock - saleData.quantity),
        updatedAt: new Date().toISOString(),
      };
      await saveBookDB(updatedBook);
      setBooks(prev => prev.map(b => (b.id === updatedBook.id ? updatedBook : b)));
    }

    await saveBookSaleDB(newSale);
    setBookSales(prev => [newSale, ...prev]);
    return newSale;
  };

  const deleteBookSale = async (id: string): Promise<boolean> => {
    const targetSale = bookSales.find(s => s.id === id);
    if (targetSale) {
      // Restore stock
      const targetBook = books.find(b => b.id === targetSale.bookId);
      if (targetBook) {
        const updatedBook: BookItem = {
          ...targetBook,
          stock: targetBook.stock + targetSale.quantity,
          updatedAt: new Date().toISOString(),
        };
        await saveBookDB(updatedBook);
        setBooks(prev => prev.map(b => (b.id === updatedBook.id ? updatedBook : b)));
      }
    }
    await deleteBookSaleDB(id);
    setBookSales(prev => prev.filter(s => s.id !== id));
    return true;
  };

  // Bookshop Suppliers & Procurement Actions
  const addBookSupplier = async (
    supplierData: Omit<BookSupplier, 'id' | 'createdAt'>
  ): Promise<BookSupplier> => {
    const newSupplier: BookSupplier = {
      ...supplierData,
      id: 'sup-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    await saveBookSupplierDB(newSupplier);
    setBookSuppliers(prev => [newSupplier, ...prev]);
    return newSupplier;
  };

  const updateBookSupplier = async (supplier: BookSupplier): Promise<boolean> => {
    const updated: BookSupplier = { ...supplier, updatedAt: new Date().toISOString() };
    await saveBookSupplierDB(updated);
    setBookSuppliers(prev => prev.map(s => (s.id === supplier.id ? updated : s)));
    return true;
  };

  const deleteBookSupplier = async (id: string): Promise<boolean> => {
    await deleteBookSupplierDB(id);
    setBookSuppliers(prev => prev.filter(s => s.id !== id));
    return true;
  };

  const recordSupplierPayment = async (
    paymentData: Omit<SupplierPayment, 'id' | 'createdAt'>
  ): Promise<SupplierPayment> => {
    const newPayment: SupplierPayment = {
      ...paymentData,
      id: 'spay-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    await saveSupplierPaymentDB(newPayment);
    setSupplierPayments(prev => [newPayment, ...prev]);
    return newPayment;
  };

  const deleteSupplierPayment = async (id: string): Promise<boolean> => {
    await deleteSupplierPaymentDB(id);
    setSupplierPayments(prev => prev.filter(p => p.id !== id));
    return true;
  };

  // Computations
  const getExpectedMonthlyFeeForClass = (className: string): number => {
    const cls = classes.find(c => c.name.toLowerCase() === className.toLowerCase() || c.id === className);
    const structure = feeStructures.find(
      f =>
        (cls && f.class_id && f.class_id === cls.id) ||
        f.className.toLowerCase() === className.toLowerCase()
    );
    return structure ? structure.totalAmount : 450; // default baseline if not configured
  };

  const getStudentPendingFee = (student: Student): number => {
    const expected = getExpectedMonthlyFeeForClass(student.className);
    const currentMonth = getCurrentMonthName();
    const currentPrefix = getTodayDateString().slice(0, 7);
    
    // Sum payments and discounts made by this student for this month
    const matchingPayments = feePayments.filter(
      p =>
        p.studentId === student.id &&
        (p.monthFor === currentMonth || p.date.startsWith(currentPrefix) || p.date.startsWith('2026-09'))
    );

    const paidThisMonth = matchingPayments.reduce((sum, p) => sum + p.totalAmount, 0);
    const discountThisMonth = matchingPayments.reduce((sum, p) => sum + (p.discount_amount || 0), 0);

    return Math.max(0, expected - discountThisMonth - paidThisMonth);
  };

  const getDefaultersList = () => {
    const activeStudents = students.filter(s => s.status === 'active');
    const defaulters: { student: Student; pendingAmount: number; lastPaymentDate?: string }[] = [];

    for (const student of activeStudents) {
      const pending = getStudentPendingFee(student);
      if (pending > 0) {
        const studentPayments = feePayments.filter(p => p.studentId === student.id);
        const lastPayment = studentPayments.length > 0 ? studentPayments[0].date : undefined;
        defaulters.push({
          student,
          pendingAmount: pending,
          lastPaymentDate: lastPayment,
        });
      }
    }

    return defaulters.sort((a, b) => b.pendingAmount - a.pendingAmount);
  };

  const getMonthlyStats = () => {
    const currentMonth = getCurrentMonthName();
    const currentMonthPrefix = getTodayDateString().slice(0, 7); // e.g., '2026-09'

    // Fee collected this month
    const feePaymentsThisMonth = feePayments.filter(
      p => p.monthFor === currentMonth || p.date.startsWith(currentMonthPrefix)
    );
    const totalFeeCollectedThisMonth = feePaymentsThisMonth.reduce(
      (sum, p) => sum + p.totalAmount,
      0
    );

    // Total expected from active students
    const activeStudents = students.filter(s => s.status === 'active');
    const totalExpectedThisMonth = activeStudents.reduce(
      (sum, s) => sum + getExpectedMonthlyFeeForClass(s.className),
      0
    );

    const totalPendingThisMonth = Math.max(0, totalExpectedThisMonth - totalFeeCollectedThisMonth);
    const collectionPercentage =
      totalExpectedThisMonth > 0
        ? Math.min(100, Math.round((totalFeeCollectedThisMonth / totalExpectedThisMonth) * 100))
        : 0;

    // Expenses this month
    const expensesThisMonth = expenses.filter(e => e.date.startsWith(currentMonthPrefix));
    const totalExpensesThisMonth = expensesThisMonth.reduce((sum, e) => sum + e.amount, 0);

    const netBalanceThisMonth = totalFeeCollectedThisMonth - totalExpensesThisMonth;

    return {
      totalFeeCollectedThisMonth,
      totalExpectedThisMonth,
      totalPendingThisMonth,
      collectionPercentage,
      totalExpensesThisMonth,
      netBalanceThisMonth,
    };
  };

  // Certificate Actions (IndexedDB + Cloud Firestore metadata sync + Audit Trail)
  const stripLargeCertLogoForCloud = (cert: IssuedCertificate): IssuedCertificate => {
    // Store metadata only (keep cloud payload compact; logo loads dynamically from Settings)
    if (cert.schoolLogo && cert.schoolLogo.length > 45_000) {
      const { schoolLogo: _omit, ...rest } = cert;
      return rest as IssuedCertificate;
    }
    return cert;
  };

  const addCertificate = async (
    certData: Omit<IssuedCertificate, 'id' | 'createdAt'> | IssuedCertificate
  ): Promise<IssuedCertificate> => {
    const newCert: IssuedCertificate = {
      ...certData,
      id: 'id' in certData && certData.id ? certData.id : 'cert-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      status: certData.status || 'Issued',
      createdAt: 'createdAt' in certData && certData.createdAt ? certData.createdAt : new Date().toISOString(),
    };
    await saveCertificateDB(newCert);
    syncToCloud('certificates', stripLargeCertLogoForCloud(newCert));
    setCertificates(prev => [newCert, ...prev]);
    await logActivity({
      userName: newCert.issuedBy || 'Administrator / Academic Office',
      userRole: 'admin',
      action: newCert.status === 'Re-issued' ? 'Re-issued Official Certificate' : 'Issued Official Certificate',
      category: 'system_action',
      severity: 'info',
      details: `${newCert.status === 'Re-issued' ? 'Re-issued' : 'Issued'} 1 certificate: ${newCert.certificateTitle} (${newCert.certificateNumber}) to ${newCert.recipientName} (${newCert.recipientType}).`,
      entityName: newCert.recipientName,
      entityId: newCert.id,
    });
    return newCert;
  };

  const updateCertificate = async (cert: IssuedCertificate): Promise<boolean> => {
    await saveCertificateDB(cert);
    syncToCloud('certificates', stripLargeCertLogoForCloud(cert));
    setCertificates(prev => prev.map(c => (c.id === cert.id ? cert : c)));
    await logActivity({
      userName: cert.issuedBy || 'Administrator / Academic Office',
      userRole: 'admin',
      action: 'Updated Certificate Record',
      category: 'system_action',
      severity: 'info',
      details: `Updated certificate ${cert.certificateNumber} for ${cert.recipientName} (Status: ${cert.status || 'Issued'}).`,
      entityName: cert.recipientName,
      entityId: cert.id,
    });
    return true;
  };

  const cancelCertificate = async (
    id: string,
    reason: string,
    actorName?: string,
    actorRole?: string
  ): Promise<boolean> => {
    const target = certificates.find(c => c.id === id);
    if (!target) return false;
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 2) return false;

    const cancelledCert: IssuedCertificate = {
      ...target,
      status: 'Cancelled',
      cancelReason: trimmedReason,
      cancelledAt: new Date().toISOString(),
      cancelledBy: actorName || 'Administrator',
    };

    await saveCertificateDB(cancelledCert);
    syncToCloud('certificates', stripLargeCertLogoForCloud(cancelledCert));
    setCertificates(prev => prev.map(c => (c.id === id ? cancelledCert : c)));
    await logActivity({
      userName: actorName || 'Administrator',
      userRole: actorRole || 'admin',
      action: 'Cancelled Official Certificate',
      category: 'system_action',
      severity: 'warning',
      details: `Cancelled certificate ${cancelledCert.certificateNumber} for ${cancelledCert.recipientName}. Reason: ${trimmedReason}`,
      entityName: cancelledCert.recipientName,
      entityId: cancelledCert.id,
    });
    return true;
  };

  const deleteCertificate = async (id: string): Promise<boolean> => {
    const certToDelete = certificates.find(c => c.id === id);
    await deleteCertificateDB(id);
    setCertificates(prev => prev.filter(c => c.id !== id));
    await logActivity({
      userName: 'Administrator',
      userRole: 'admin',
      action: 'Revoked Certificate Record',
      category: 'system_action',
      severity: 'warning',
      details: `Revoked certificate ID: ${id} (${certToDelete?.recipientName || 'Unknown'}).`,
      entityId: id,
    });
    return true;
  };

  const bulkAddCertificates = async (
    certs: IssuedCertificate[],
    actorName?: string,
    actorRole?: string
  ): Promise<number> => {
    const normalized = certs.map(c => ({
      ...c,
      status: c.status || ('Issued' as const),
    }));
    for (const cert of normalized) {
      await saveCertificateDB(cert);
      syncToCloud('certificates', stripLargeCertLogoForCloud(cert));
    }
    setCertificates(prev => [...normalized, ...prev]);
    await logActivity({
      userName: actorName || 'Administrator / Academic Office',
      userRole: actorRole || 'admin',
      action: 'Bulk Certificates Generated',
      category: 'system_action',
      severity: 'info',
      details: `Bulk generated ${normalized.length} certificates (${normalized[0]?.certificateNumber || ''} to ${normalized[normalized.length - 1]?.certificateNumber || ''}).`,
      entityName: 'Bulk Certification',
    });
    return normalized.length;
  };

  const logCertificateEvent = async (
    action: string,
    details: string,
    actorName?: string,
    actorRole?: string,
    entityId?: string
  ): Promise<void> => {
    await logActivity({
      userName: actorName || 'Administrator',
      userRole: actorRole || 'admin',
      action,
      category: 'system_action',
      severity: 'info',
      details,
      entityId,
    });
  };

  const logAdmissionEvent = async (
    action: string,
    details: string,
    actorName?: string,
    actorRole?: string,
    entityId?: string,
    entityName?: string
  ): Promise<void> => {
    await logActivity({
      userName: actorName || 'Administrator',
      userRole: actorRole || 'admin',
      action,
      category: 'system_action',
      severity: 'info',
      details,
      entityId,
      entityName,
    });
  };

  // School Assets Actions
  const addAsset = async (
    assetData: Omit<SchoolAsset, 'id' | 'createdAt'>
  ): Promise<SchoolAsset> => {
    const newAsset: SchoolAsset = {
      ...assetData,
      id: 'ast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
    };
    await saveAssetDB(newAsset);
    setAssets(prev => [newAsset, ...prev]);
    await logActivity({
      userName: 'Administrator / Inventory Store',
      userRole: 'admin',
      action: 'Registered School Asset',
      category: 'system_action',
      severity: 'info',
      details: `Added new asset "${newAsset.name}" (${newAsset.assetId}) in category ${newAsset.category}.`,
      entityName: newAsset.name,
      entityId: newAsset.id,
    });
    return newAsset;
  };

  const updateAsset = async (asset: SchoolAsset): Promise<boolean> => {
    const updated: SchoolAsset = {
      ...asset,
      updatedAt: new Date().toISOString(),
    };
    await saveAssetDB(updated);
    setAssets(prev => prev.map(a => (a.id === asset.id ? updated : a)));
    await logActivity({
      userName: 'Administrator / Inventory Store',
      userRole: 'admin',
      action: 'Updated School Asset Record',
      category: 'system_action',
      severity: 'info',
      details: `Updated asset "${asset.name}" (${asset.assetId}) - Status: ${asset.status}.`,
      entityName: asset.name,
      entityId: asset.id,
    });
    return true;
  };

  const deleteAsset = async (id: string): Promise<boolean> => {
    const target = assets.find(a => a.id === id);
    await deleteAssetDB(id);
    setAssets(prev => prev.filter(a => a.id !== id));
    await logActivity({
      userName: 'Administrator',
      userRole: 'admin',
      action: 'Removed School Asset',
      category: 'system_action',
      severity: 'warning',
      details: `Deleted asset record "${target?.name || id}" (${target?.assetId || 'ID: ' + id}).`,
      entityId: id,
    });
    return true;
  };

  // =========================================================================
  // Payroll & Salary Records: Calculations, CRUD, and Workflow Transitions
  // =========================================================================

  const getMonthNumberFromName = (monthStr: string): number => {
    if (!monthStr) return 0;
    const lower = monthStr.toLowerCase();
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    for (let i = 0; i < monthNames.length; i++) {
      if (lower.includes(monthNames[i])) {
        return i + 1;
      }
    }
    return 0;
  };

  // 1. Salary Calculation Formulas (Earnings / Deductions)
  const calculateEmployeeSalary = (params: {
    staff: Staff;
    month: string;
    year?: number;
    workingDays?: number;
    unpaidAbsentDays?: number;
    activeLoan?: StaffLoan;
    pendingAdvance?: StaffAdvance;
    customAllowances?: number;
    customBonuses?: number;
    customOvertimeHours?: number;
    customOvertimeRate?: number;
    customTaxDeduction?: number;
    customProvidentFund?: number;
    customOtherDeductions?: number;
  }): EmployeePayrollItem => {
    const {
      staff: emp,
      month,
      year = new Date().getFullYear(),
      workingDays = 26,
      unpaidAbsentDays,
      activeLoan,
      pendingAdvance,
      customAllowances,
      customBonuses,
      customOvertimeHours,
      customOvertimeRate = 250,
      customTaxDeduction,
      customProvidentFund,
      customOtherDeductions,
    } = params;

    // --- Earnings ---
    const basicSalary = emp.monthlySalary || 0;
    const allowances = customAllowances !== undefined ? customAllowances : (emp.allowances || 0);
    const houseRentAllowance = Math.round(allowances * 0.5);
    const medicalAllowance = Math.round(allowances * 0.3);
    const transportAllowance = Math.round(allowances * 0.2);
    const otherAllowances = 0;
    const bonuses = customBonuses !== undefined ? customBonuses : ((emp as any).bonuses || 0);
    const overtimeHours = customOvertimeHours !== undefined ? customOvertimeHours : ((emp as any).overtimeHours || 0);
    const overtimeRate = customOvertimeRate;
    const overtimeAmount = overtimeHours * overtimeRate;
    const grossSalary = basicSalary + allowances + bonuses + overtimeAmount;

    // --- Deductions ---
    let absentDays = 0;
    if (unpaidAbsentDays !== undefined) {
      absentDays = unpaidAbsentDays;
    } else {
      const monthNum = getMonthNumberFromName(month);
      const datePrefix = monthNum ? `${year}-${String(monthNum).padStart(2, '0')}` : '';
      const absentRecords = staffAttendance.filter(
        a => a.staffId === emp.id && a.status === 'absent' && (!datePrefix || a.date.startsWith(datePrefix))
      );
      absentDays = absentRecords.length;
    }
    const dailyRate = workingDays > 0 ? Math.round(basicSalary / workingDays) : 0;
    const absentDeduction = absentDays * dailyRate;

    // Active loan installment deduction
    const loanDeduction = activeLoan && (activeLoan.balanceRemaining ?? 0) > 0
      ? Math.min(activeLoan.monthlyInstallment, activeLoan.balanceRemaining ?? 0)
      : 0;

    // Advance recovery deduction
    const advanceDeduction = pendingAdvance && (pendingAdvance.balanceRemaining ?? (pendingAdvance.requestedAmount - pendingAdvance.recoveredAmount)) > 0
      ? Math.min(
          pendingAdvance.requestedAmount,
          pendingAdvance.balanceRemaining ?? (pendingAdvance.requestedAmount - pendingAdvance.recoveredAmount)
        )
      : 0;

    // Progressive income tax calculation
    let taxDeduction = 0;
    if (customTaxDeduction !== undefined) {
      taxDeduction = customTaxDeduction;
    } else {
      if (grossSalary > 100000) {
        taxDeduction = Math.round(grossSalary * 0.08);
      } else if (grossSalary > 50000) {
        taxDeduction = Math.round(grossSalary * 0.04);
      }
    }

    // Provident Fund (default 5% of basic salary)
    const providentFundDeduction = customProvidentFund !== undefined
      ? customProvidentFund
      : Math.round(basicSalary * 0.05);

    // Other deductions from staff profile or adjustments
    const otherDeductions = customOtherDeductions !== undefined
      ? customOtherDeductions
      : (emp.deductions ? Math.max(0, emp.deductions - absentDeduction) : 0);

    const totalDeductions =
      absentDeduction + loanDeduction + advanceDeduction + taxDeduction + providentFundDeduction + otherDeductions;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    return {
      staffId: emp.id,
      employeeCode: emp.employeeCode || `EMP-${emp.id.slice(-4).toUpperCase()}`,
      fullName: emp.fullName,
      designation: emp.designation,
      department: emp.department,
      employmentType: emp.employmentType === 'contract' ? 'Contract' : 'Permanent',
      paymentMode: emp.paymentMode || 'Bank Transfer',
      bankName: emp.bankDetails?.bankName || emp.bankName || 'Meezan Bank Ltd',
      accountTitle: emp.bankDetails?.accountTitle || emp.fullName,
      accountNumber: emp.bankDetails?.accountNumber || emp.bankAccount || '',
      basicSalary,
      houseRentAllowance,
      medicalAllowance,
      transportAllowance,
      otherAllowances,
      allowances,
      bonuses,
      overtimeHours,
      overtimeRate,
      overtimeAmount,
      absentDays,
      absentDeduction,
      taxDeduction,
      providentFundDeduction,
      loanDeduction,
      loanId: activeLoan?.id,
      advanceDeduction,
      advanceId: pendingAdvance?.id,
      otherDeductions,
      grossSalary,
      totalDeductions,
      netSalary,
      status: 'pending',
      remarks: absentDays > 0 ? `${absentDays} day(s) absent attendance deduction applied` : '',
    };
  };

  const recalculateRunTotals = (employees: EmployeePayrollItem[]) => {
    const totalEmployees = employees.length;
    const paidEmployees = employees.filter(e => e.status === 'paid').length;
    const totalBasicSalary = employees.reduce((sum, e) => sum + (e.basicSalary || 0), 0);
    const totalAllowances = employees.reduce((sum, e) => sum + (e.allowances || 0), 0);
    const totalBonuses = employees.reduce((sum, e) => sum + (e.bonuses || 0), 0);
    const totalOvertime = employees.reduce((sum, e) => sum + (e.overtimeAmount || 0), 0);
    const totalDeductions = employees.reduce((sum, e) => sum + (e.totalDeductions || 0), 0);
    const totalNetPayroll = employees.reduce((sum, e) => sum + (e.netSalary || 0), 0);

    return {
      totalEmployees,
      paidEmployees,
      totalBasicSalary,
      totalAllowances,
      totalBonuses,
      totalOvertime,
      totalDeductions,
      totalNetPayroll,
    };
  };

  // 2. Payroll Runs CRUD
  const addPayrollRun = async (run: MonthlyPayrollRun): Promise<MonthlyPayrollRun> => {
    await savePayrollRunDB(run);
    const records: SalaryRecord[] = run.employees.map(emp => ({
      ...emp,
      id: `${run.id}_${emp.staffId}`,
      runId: run.id,
      month: run.month,
      fiscalYear: run.fiscalYear,
      createdAt: run.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    await saveBulkSalaryRecordsDB(records);
    payrollStorage.saveSingleRun(run);

    setPayrollRuns(prev => {
      const idx = prev.findIndex(r => r.id === run.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = run;
        return copy;
      }
      return [run, ...prev];
    });

    setSalaryRecords(prev => {
      const other = prev.filter(r => r.runId !== run.id);
      return [...records, ...other];
    });

    await logActivity({
      userName: 'Finance Officer',
      userRole: 'finance',
      action: `Payroll Run Created: ${run.month}`,
      category: 'salary_modification',
      severity: 'info',
      details: `Initiated payroll run for ${run.month} covering ${run.totalEmployees} employees with total net amount of ${run.totalNetPayroll}.`,
      entityName: `PayrollRun-${run.id}`,
    });

    return run;
  };

  const updatePayrollRun = async (updatedRun: MonthlyPayrollRun): Promise<boolean> => {
    const totals = recalculateRunTotals(updatedRun.employees);
    const fullRun: MonthlyPayrollRun = {
      ...updatedRun,
      ...totals,
      updatedAt: new Date().toISOString(),
    };

    await savePayrollRunDB(fullRun);
    const records: SalaryRecord[] = fullRun.employees.map(emp => ({
      ...emp,
      id: `${fullRun.id}_${emp.staffId}`,
      runId: fullRun.id,
      month: fullRun.month,
      fiscalYear: fullRun.fiscalYear,
      createdAt: fullRun.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    await saveBulkSalaryRecordsDB(records);
    payrollStorage.saveSingleRun(fullRun);

    setPayrollRuns(prev => prev.map(r => (r.id === fullRun.id ? fullRun : r)));
    setSalaryRecords(prev => {
      const other = prev.filter(r => r.runId !== fullRun.id);
      return [...records, ...other];
    });

    return true;
  };

  const deletePayrollRun = async (id: string): Promise<boolean> => {
    const runToDelete = payrollRuns.find(r => r.id === id);
    if (!runToDelete) return false;

    // Delete linked expense if posted
    if (runToDelete.expensePostedId) {
      try {
        await deleteExpense(runToDelete.expensePostedId);
      } catch (e) {
        console.warn('Could not delete posted expense on payroll run deletion:', e);
      }
    }

    await deletePayrollRunDB(id);
    await deleteSalaryRecordsByRunDB(id);
    payrollStorage.deleteRun(id);

    setPayrollRuns(prev => prev.filter(r => r.id !== id));
    setSalaryRecords(prev => prev.filter(r => r.runId !== id));

    await logActivity({
      userName: 'Administrator / Finance',
      userRole: 'finance',
      action: `Payroll Run Deleted: ${runToDelete.month}`,
      category: 'salary_modification',
      severity: 'warning',
      details: `Payroll run for ${runToDelete.month} (${runToDelete.totalEmployees} employees, Net: ${runToDelete.totalNetPayroll}) was deleted from records.`,
      entityName: `PayrollRun-${id}`,
    });

    return true;
  };

  const getPayrollRunById = (id: string): MonthlyPayrollRun | undefined => {
    return payrollRuns.find(r => r.id === id);
  };

  // 3. Salary Records CRUD
  const addSalaryRecord = async (record: SalaryRecord): Promise<SalaryRecord> => {
    await saveSalaryRecordDB(record);
    setSalaryRecords(prev => {
      const idx = prev.findIndex(r => r.id === record.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = record;
        return copy;
      }
      return [record, ...prev];
    });
    return record;
  };

  const updateSalaryRecord = async (record: SalaryRecord): Promise<boolean> => {
    await saveSalaryRecordDB(record);
    setSalaryRecords(prev => prev.map(r => (r.id === record.id ? record : r)));

    // Synchronize to parent payrollRun if exists
    setPayrollRuns(prevRuns => {
      const parentRun = prevRuns.find(r => r.id === record.runId);
      if (!parentRun) return prevRuns;
      const empIndex = parentRun.employees.findIndex(e => e.staffId === record.staffId);
      if (empIndex < 0) return prevRuns;
      const updatedEmployees = [...parentRun.employees];
      updatedEmployees[empIndex] = { ...record };
      const totals = recalculateRunTotals(updatedEmployees);
      const updatedRun: MonthlyPayrollRun = {
        ...parentRun,
        ...totals,
        employees: updatedEmployees,
        updatedAt: new Date().toISOString(),
      };
      savePayrollRunDB(updatedRun);
      payrollStorage.saveSingleRun(updatedRun);
      return prevRuns.map(r => (r.id === updatedRun.id ? updatedRun : r));
    });

    return true;
  };

  const deleteSalaryRecord = async (id: string): Promise<boolean> => {
    await deleteSalaryRecordDB(id);
    const recToDelete = salaryRecords.find(r => r.id === id);
    setSalaryRecords(prev => prev.filter(r => r.id !== id));
    if (recToDelete) {
      setPayrollRuns(prevRuns => {
        const parentRun = prevRuns.find(r => r.id === recToDelete.runId);
        if (!parentRun) return prevRuns;
        const updatedEmployees = parentRun.employees.filter(e => e.staffId !== recToDelete.staffId);
        const totals = recalculateRunTotals(updatedEmployees);
        const updatedRun: MonthlyPayrollRun = {
          ...parentRun,
          ...totals,
          employees: updatedEmployees,
          updatedAt: new Date().toISOString(),
        };
        savePayrollRunDB(updatedRun);
        payrollStorage.saveSingleRun(updatedRun);
        return prevRuns.map(r => (r.id === updatedRun.id ? updatedRun : r));
      });
    }
    return true;
  };

  const getSalaryRecordsByRun = (runId: string): SalaryRecord[] => {
    return salaryRecords.filter(r => r.runId === runId);
  };

  // 4. Bulk Payroll Run Generation
  const generatePayrollRun = async (options: {
    month: string;
    fiscalYear: string;
    scope?: 'all' | 'department' | 'selected';
    departmentFilter?: string;
    selectedStaffIds?: string[];
    notes?: string;
    processedBy?: string;
  }): Promise<{ run: MonthlyPayrollRun; records: SalaryRecord[] }> => {
    const {
      month,
      fiscalYear,
      scope = 'all',
      departmentFilter,
      selectedStaffIds = [],
      notes,
      processedBy = 'Finance Officer',
    } = options;

    let candidateStaff = staff.filter(s => s.status === 'active');
    if (scope === 'department' && departmentFilter) {
      candidateStaff = candidateStaff.filter(s => s.department === departmentFilter);
    } else if (scope === 'selected' && selectedStaffIds.length > 0) {
      candidateStaff = candidateStaff.filter(s => selectedStaffIds.includes(s.id));
    }

    const validStaff = candidateStaff.filter(s => (s.monthlySalary || 0) > 0);
    if (validStaff.length === 0) {
      throw new Error('No active staff with valid salary structures were found for the selected scope.');
    }

    const loans = payrollStorage.loadLoans();
    const advances = payrollStorage.loadAdvances();

    const employeeItems: EmployeePayrollItem[] = validStaff.map(emp => {
      const activeLoan = loans.find(l => l.staffId === emp.id && l.status === 'active' && (l.balanceRemaining ?? 0) > 0);
      const pendingAdvance = advances.find(
        a =>
          a.staffId === emp.id &&
          a.status === 'approved' &&
          (a.balanceRemaining ?? (a.requestedAmount - a.recoveredAmount)) > 0 &&
          (!a.recoveryMonth || a.recoveryMonth.toLowerCase() === month.toLowerCase())
      );

      return calculateEmployeeSalary({
        staff: emp,
        month,
        activeLoan,
        pendingAdvance,
      });
    });

    const totals = recalculateRunTotals(employeeItems);
    const runId = `pr-${month.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`;

    const newRun: MonthlyPayrollRun = {
      id: runId,
      month,
      fiscalYear,
      status: 'draft',
      scope,
      departmentFilter: scope === 'department' ? departmentFilter : undefined,
      ...totals,
      isLocked: false,
      notes: notes || `Draft payroll run generated for ${employeeItems.length} staff members.`,
      employees: employeeItems,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const savedRun = await addPayrollRun(newRun);
    const runRecords = salaryRecords.filter(r => r.runId === newRun.id);

    return { run: savedRun, records: runRecords };
  };

  // 5. Status Workflow Transitions: (Draft -> Processed -> Approved -> Paid) & Unlock

  // Transition 1: Draft -> Processed
  const processPayrollRun = async (
    runId: string,
    processedBy: string = 'Finance Officer'
  ): Promise<MonthlyPayrollRun> => {
    const currentRun = payrollRuns.find(r => r.id === runId);
    if (!currentRun) throw new Error(`Payroll run ${runId} not found`);
    if (currentRun.status !== 'draft') {
      throw new Error(`Only Draft payroll runs can be processed. Current status is ${currentRun.status}.`);
    }

    const loans = payrollStorage.loadLoans();
    const advances = payrollStorage.loadAdvances();
    const updatedLoans = [...loans];
    const updatedAdvances = [...advances];

    currentRun.employees.forEach(emp => {
      if (emp.loanId && emp.loanDeduction > 0) {
        const lIdx = updatedLoans.findIndex(l => l.id === emp.loanId);
        if (lIdx >= 0) {
          const l = updatedLoans[lIdx];
          const newBal = Math.max(0, (l.balanceRemaining ?? l.principalAmount) - emp.loanDeduction);
          updatedLoans[lIdx] = {
            ...l,
            balanceRemaining: newBal,
            status: newBal === 0 ? 'completed' : 'active',
            repaymentHistory: [
              ...(l.repaymentHistory || []),
              {
                id: `rep-${Date.now()}-${emp.staffId.slice(-3)}`,
                date: getTodayDateString(),
                payrollMonth: currentRun.month,
                amount: emp.loanDeduction,
                type: 'payroll_deduction',
                notes: `Deducted in ${currentRun.month} payroll run`,
              },
            ],
          };
        }
      }

      if (emp.advanceId && emp.advanceDeduction > 0) {
        const aIdx = updatedAdvances.findIndex(a => a.id === emp.advanceId);
        if (aIdx >= 0) {
          const a = updatedAdvances[aIdx];
          const newRec = a.recoveredAmount + emp.advanceDeduction;
          const newBal = Math.max(0, (a.balanceRemaining ?? a.requestedAmount) - emp.advanceDeduction);
          updatedAdvances[aIdx] = {
            ...a,
            recoveredAmount: newRec,
            balanceRemaining: newBal,
            status: newBal === 0 ? 'recovered' : 'approved',
          };
        }
      }
    });

    payrollStorage.saveLoans(updatedLoans);
    payrollStorage.saveAdvances(updatedAdvances);

    const processedRun: MonthlyPayrollRun = {
      ...currentRun,
      status: 'processed',
      isLocked: true,
      processedDate: getTodayDateString(),
      processedBy,
      updatedAt: new Date().toISOString(),
    };

    await updatePayrollRun(processedRun);

    payrollStorage.addAuditLog({
      action: 'run_processed',
      fromStatus: 'draft',
      toStatus: 'processed',
      userId: 'usr-fin-01',
      title: `Payroll Processed: ${processedRun.month}`,
      details: `Status changed from DRAFT to PROCESSED. Locked ${processedRun.totalEmployees} employee salary records. Loan and advance balances officially updated.`,
      userName: processedBy,
      userRole: 'Finance',
      targetId: processedRun.id,
      amount: processedRun.totalNetPayroll,
    });

    await logActivity({
      userName: processedBy,
      userRole: 'finance',
      action: `Payroll Processed: ${processedRun.month}`,
      category: 'salary_modification',
      severity: 'info',
      details: `Processed and locked payroll run for ${processedRun.month} (${processedRun.totalEmployees} employees, Net: ${processedRun.totalNetPayroll}). Ready for Admin Approval.`,
      entityName: `PayrollRun-${runId}`,
    });

    return processedRun;
  };

  // Transition 2: Processed -> Approved
  const approvePayrollRun = async (
    runId: string,
    approvedBy: string = 'Administrator'
  ): Promise<MonthlyPayrollRun> => {
    const currentRun = payrollRuns.find(r => r.id === runId);
    if (!currentRun) throw new Error(`Payroll run ${runId} not found`);
    if (currentRun.status !== 'processed') {
      throw new Error(`Only Processed payroll runs can be approved. Current status is ${currentRun.status}.`);
    }

    const approvedRun: MonthlyPayrollRun = {
      ...currentRun,
      status: 'approved',
      approvedDate: getTodayDateString(),
      approvedBy,
      updatedAt: new Date().toISOString(),
    };

    await updatePayrollRun(approvedRun);

    payrollStorage.addAuditLog({
      action: 'run_approved',
      fromStatus: currentRun.status,
      toStatus: 'approved',
      userId: 'usr-admin-01',
      title: `Payroll Approved: ${approvedRun.month}`,
      details: `Status changed from ${currentRun.status.toUpperCase()} to APPROVED. Administrative approval verified for ${approvedRun.totalEmployees} employees. Ready for disbursement.`,
      userName: approvedBy,
      userRole: 'Administrator',
      targetId: approvedRun.id,
      amount: approvedRun.totalNetPayroll,
    });

    await logActivity({
      userName: approvedBy,
      userRole: 'admin',
      action: `Payroll Approved: ${approvedRun.month}`,
      category: 'salary_modification',
      severity: 'info',
      details: `Admin approval confirmed for ${approvedRun.month} payroll run. Authorization complete for salary disbursement.`,
      entityName: `PayrollRun-${runId}`,
    });

    return approvedRun;
  };

  // Transition 3: Approved -> Paid
  const disbursePayrollRun = async (
    runId: string,
    paymentDetails: {
      paymentMethod: PaymentMode;
      paymentDate: string;
      paidBy?: string;
      remarks?: string;
    }
  ): Promise<{ run: MonthlyPayrollRun; expenseId?: string }> => {
    const currentRun = payrollRuns.find(r => r.id === runId);
    if (!currentRun) throw new Error(`Payroll run ${runId} not found`);
    if (currentRun.status !== 'approved') {
      throw new Error(`Only Approved payroll runs can be marked as Paid. Current status is ${currentRun.status}.`);
    }

    const { paymentMethod, paymentDate, paidBy = 'Finance Officer', remarks } = paymentDetails;

    // Automatically post expense in Accounts & Finance
    let createdExpenseId: string | undefined;
    try {
      const expense = await recordExpense({
        title: `Staff Salaries Disbursement - ${currentRun.month}`,
        category: 'Staff Salaries',
        amount: currentRun.totalNetPayroll,
        date: paymentDate || getTodayDateString(),
        paymentMode: paymentMethod || 'Bank Transfer',
        recordedBy: paidBy,
        source: 'system',
        notes: remarks || `Disbursement for ${currentRun.totalEmployees} staff members in payroll run ${currentRun.id}.`,
      });
      createdExpenseId = expense.id;
    } catch (err) {
      console.error('Failed to automatically post salary expense:', err);
    }

    // Mark employees as paid
    const updatedEmployees = currentRun.employees.map(e => ({
      ...e,
      status: 'paid' as const,
      paidDate: paymentDate || getTodayDateString(),
      paymentMethodUsed: paymentMethod,
      remarks: remarks || e.remarks,
    }));

    const paidRun: MonthlyPayrollRun = {
      ...currentRun,
      status: 'paid',
      paidEmployees: updatedEmployees.length,
      paidDate: paymentDate || getTodayDateString(),
      expensePostedId: createdExpenseId,
      employees: updatedEmployees,
      updatedAt: new Date().toISOString(),
    };

    await updatePayrollRun(paidRun);

    payrollStorage.addAuditLog({
      action: 'salary_paid',
      fromStatus: 'approved',
      toStatus: 'paid',
      userId: 'usr-fin-01',
      title: `Salaries Disbursed: ${paidRun.month}`,
      details: `Status changed from APPROVED to PAID. All ${paidRun.totalEmployees} salaries paid via ${paymentMethod} on ${paymentDate}. Expense voucher ${createdExpenseId || ''} posted in Accounts.`,
      userName: paidBy,
      userRole: 'Finance',
      targetId: paidRun.id,
      amount: paidRun.totalNetPayroll,
    });

    await logActivity({
      userName: paidBy,
      userRole: 'finance',
      action: `Salaries Disbursed: ${paidRun.month}`,
      category: 'salary_modification',
      severity: 'info',
      details: `Disbursed ${paidRun.totalNetPayroll} for ${paidRun.totalEmployees} employees via ${paymentMethod}. Accounts expense voucher created.`,
      entityName: `PayrollRun-${runId}`,
    });

    return { run: paidRun, expenseId: createdExpenseId };
  };

  // Transition 4: Unlock / Revert (Processed/Approved -> Draft)
  const unlockPayrollRun = async (
    runId: string,
    reason: string,
    unlockedBy: string = 'Administrator'
  ): Promise<MonthlyPayrollRun> => {
    const currentRun = payrollRuns.find(r => r.id === runId);
    if (!currentRun) throw new Error(`Payroll run ${runId} not found`);
    if (currentRun.status === 'paid') {
      throw new Error('Paid payroll runs cannot be unlocked directly; refund or adjustment must be made.');
    }

    // If was processed or approved, reverse loan and advance balances
    if (currentRun.status === 'processed' || currentRun.status === 'approved') {
      const loans = payrollStorage.loadLoans();
      const advances = payrollStorage.loadAdvances();
      const updatedLoans = [...loans];
      const updatedAdvances = [...advances];

      currentRun.employees.forEach(emp => {
        if (emp.loanId && emp.loanDeduction > 0) {
          const lIdx = updatedLoans.findIndex(l => l.id === emp.loanId);
          if (lIdx >= 0) {
            const l = updatedLoans[lIdx];
            const newBal = (l.balanceRemaining ?? 0) + emp.loanDeduction;
            const filteredHistory = (l.repaymentHistory || []).filter(
              r => !(r.payrollMonth === currentRun.month && r.amount === emp.loanDeduction)
            );
            updatedLoans[lIdx] = {
              ...l,
              balanceRemaining: newBal,
              status: 'active',
              repaymentHistory: filteredHistory,
            };
          }
        }

        if (emp.advanceId && emp.advanceDeduction > 0) {
          const aIdx = updatedAdvances.findIndex(a => a.id === emp.advanceId);
          if (aIdx >= 0) {
            const a = updatedAdvances[aIdx];
            const newRec = Math.max(0, a.recoveredAmount - emp.advanceDeduction);
            const newBal = (a.balanceRemaining ?? 0) + emp.advanceDeduction;
            updatedAdvances[aIdx] = {
              ...a,
              recoveredAmount: newRec,
              balanceRemaining: newBal,
              status: 'approved',
            };
          }
        }
      });

      payrollStorage.saveLoans(updatedLoans);
      payrollStorage.saveAdvances(updatedAdvances);
    }

    const unlockedRun: MonthlyPayrollRun = {
      ...currentRun,
      status: 'draft',
      isLocked: false,
      notes: `${currentRun.notes ? currentRun.notes + ' | ' : ''}Unlocked: ${reason} (by ${unlockedBy})`,
      updatedAt: new Date().toISOString(),
    };

    await updatePayrollRun(unlockedRun);

    payrollStorage.addAuditLog({
      action: 'run_unlocked',
      fromStatus: currentRun.status,
      toStatus: 'draft',
      userId: 'usr-admin-01',
      title: `Payroll Unlocked: ${unlockedRun.month}`,
      details: `Status changed from ${currentRun.status.toUpperCase()} to DRAFT. Run unlocked back to Draft status. Reason: ${reason}`,
      userName: unlockedBy,
      userRole: 'Administrator',
      targetId: unlockedRun.id,
      amount: unlockedRun.totalNetPayroll,
    });

    await logActivity({
      userName: unlockedBy,
      userRole: 'admin',
      action: `Payroll Unlocked: ${unlockedRun.month}`,
      category: 'system_action',
      severity: 'warning',
      details: `Payroll run for ${unlockedRun.month} reverted to Draft by ${unlockedBy}. Reason: ${reason}`,
      entityName: `PayrollRun-${runId}`,
    });

    return unlockedRun;
  };

  return (
    <SchoolContext.Provider
      value={{
        isLoading,
        classes,
        activeClasses,
        students,
        staff,
        studentAttendance,
        staffAttendance,
        feeStructures,
        feePayments,
        expenses,
        settings,
        allUsers,
        activeTab,
        setActiveTab,
        navigateToTab,
        goBackTab,
        canGoBack,
        tabHistory,
        selectedStudentIdForDetail,
        setSelectedStudentIdForDetail,
        selectedStaffIdForDetail,
        setSelectedStaffIdForDetail,
        receiptToPrint,
        setReceiptToPrint,
        idCardStudent,
        setIdCardStudent,
        resultCardToPrint,
        setResultCardToPrint,
        exams,
        examResults,
        addExam,
        updateExam,
        deleteExam,
        saveExamResult,
        saveBulkExamResults,
        deleteExamResult,
        budgets,
        addBudget,
        updateBudget,
        deleteBudget,
        copyBudgetsToMonth,
        books,
        bookSales,
        saleReceiptToPrint,
        setSaleReceiptToPrint,
        addBook,
        updateBook,
        deleteBook,
        recordBookSale,
        deleteBookSale,
        bookSuppliers,
        supplierPayments,
        addBookSupplier,
        updateBookSupplier,
        deleteBookSupplier,
        recordSupplierPayment,
        deleteSupplierPayment,
        addStudent,
        bulkAddStudents,
        updateStudent,
        deleteStudent,
        bulkDeleteStudents,
        promoteStudents,
        bulkUpdateStudentStatus,
        bulkRecordStudentAttendance,
        bulkRecordFeePayments,
        addStaff,
        updateStaff,
        deleteStaff,
        bulkDeleteStaff,
        bulkRecordStaffAttendance,
        bulkPayStaffSalaries,
        bulkUpdateStaffDepartment,
        staffLeaves,
        applyStaffLeave,
        updateStaffLeaveStatus,
        deleteStaffLeave,
        updateStaffLeaveQuota,
        saveStudentAttendance,
        saveStaffAttendance,
        saveFeeStructure,
        recordFeePayment,
        updateFeePayment,
        deleteFeePayment,
        recordExpense,
        updateExpense,
        deleteExpense,
        recordDailyFinancialActivity,
        bulkRecordDailyFinancialActivities,
        payStaffSalary,
        updateSettings,
        addClassEntity,
        updateClassEntity,
        deleteClassEntity,
        reorderClassEntities,
        addClass,
        addMultipleClasses,
        removeClass,
        renameClass,
        reorderClasses,
        addSection,
        removeSection,
        refreshAllUsers,
        backupDatabase,
        restoreDatabase,
        inspectBackup,
        getBackupJsonString,
        resetToDemo,
        resetAllSchoolData,
        clearModuleData,
        isCleanSlate,
        autoBackupConfig,
        updateAutoBackupConfig,
        backupSnapshots,
        refreshBackupSnapshots,
        runAutomatedBackupNow,
        deleteBackupSnapshot,
        restoreFromSnapshot,
        isAutoBackupRunning,
        serverSyncInfo,
        triggerServerSync,
        isServerSyncing,
        getStudentPendingFee,
        getDefaultersList,
        getMonthlyStats,
        activityLogs,
        logActivity,
        clearActivityLogs,
        certificates,
        addCertificate,
        updateCertificate,
        cancelCertificate,
        deleteCertificate,
        bulkAddCertificates,
        logCertificateEvent,
        logAdmissionEvent,
        assets,
        addAsset,
        updateAsset,
        deleteAsset,
        payrollRuns,
        salaryRecords,
        addPayrollRun,
        updatePayrollRun,
        deletePayrollRun,
        getPayrollRunById,
        addSalaryRecord,
        updateSalaryRecord,
        deleteSalaryRecord,
        getSalaryRecordsByRun,
        calculateEmployeeSalary,
        recalculateRunTotals,
        generatePayrollRun,
        processPayrollRun,
        approvePayrollRun,
        disbursePayrollRun,
        unlockPayrollRun,
        isDarkMode,
        toggleDarkMode,
        setDarkMode,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
};
