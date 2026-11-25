export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'principal'
  | 'accountant'
  | 'hr_manager'
  | 'teacher'
  | 'receptionist'
  | 'librarian'
  | 'finance';

export type SystemModule =
  | 'dashboard'
  | 'students'
  | 'admissions'
  | 'attendance'
  | 'fee_collection'
  | 'finance'
  | 'expenses'
  | 'exams'
  | 'staff'
  | 'payroll'
  | 'certificates'
  | 'inventory'
  | 'users'
  | 'reports'
  | 'settings'
  | 'about'
  | 'data_management';

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
  approve: boolean;
  apply_discount?: boolean;
  // Granular Certificate Studio & Admission permissions
  generate?: boolean;
  bulk_generate?: boolean;
  cancel?: boolean;
  edit_templates?: boolean;
  print_forms?: boolean;
}

export type CertificatePermissionAction =
  | 'view'
  | 'generate'
  | 'bulk_generate'
  | 'cancel'
  | 'edit_templates';

/**
 * Enforces role-based and custom permissions for Official Certification Studio actions.
 * Must be checked inside handler functions, not only by hiding UI buttons.
 */
export function canUserCertificateAction(
  user: { role?: string; customPermissions?: any; assignedClasses?: string[] } | null | undefined,
  action: CertificatePermissionAction,
  options?: {
    allowTeacherOwnClass?: boolean;
    targetClassName?: string;
  }
): boolean {
  if (!user || !user.role) return false;
  const role = user.role;

  // Main Admins, Super Admins, and Principals have full certificate studio authority
  if (role === 'super_admin' || role === 'admin' || role === 'principal') {
    return true;
  }

  const certPerm = user.customPermissions?.certificates;
  if (certPerm) {
    if (action === 'view' && certPerm.view !== undefined) return Boolean(certPerm.view);
    if (action === 'generate' && (certPerm.generate !== undefined || certPerm.create !== undefined)) {
      return Boolean(certPerm.generate ?? certPerm.create);
    }
    if (action === 'bulk_generate' && certPerm.bulk_generate !== undefined) {
      return Boolean(certPerm.bulk_generate);
    }
    if (action === 'cancel' && (certPerm.cancel !== undefined || certPerm.delete !== undefined)) {
      return Boolean(certPerm.cancel ?? certPerm.delete);
    }
    if (action === 'edit_templates' && (certPerm.edit_templates !== undefined || certPerm.edit !== undefined)) {
      return Boolean(certPerm.edit_templates ?? certPerm.edit);
    }
  }

  // Default role fallbacks
  if (action === 'view') {
    return ['teacher', 'hr_manager', 'receptionist', 'accountant', 'finance', 'librarian'].includes(role);
  }

  if (role === 'hr_manager') {
    return action === 'generate' || action === 'bulk_generate';
  }

  // Teacher: allowed to generate only for own class if Admin enabled it
  if (role === 'teacher' && (action === 'generate' || action === 'bulk_generate')) {
    if (!options?.allowTeacherOwnClass) return false;
    if (options.targetClassName && Array.isArray(user.assignedClasses) && user.assignedClasses.length > 0) {
      return user.assignedClasses.some(
        c => c.trim().toLowerCase() === options.targetClassName!.trim().toLowerCase()
      );
    }
    return true;
  }

  return false;
}

export type AdmissionTemplateId = 'standard' | 'habitat_a4_portrait';

export type AdmissionPermissionAction =
  | 'view'
  | 'add'
  | 'edit'
  | 'print_forms'
  | 'edit_templates';

export interface AdmissionFormSettings {
  defaultTemplateId: AdmissionTemplateId;
  schoolPhone2?: string;
  startDateLabel: string;
  showUndertaking: boolean;
  undertakingText: string;
  showFeeNote: boolean;
  feeNoteText: string;
  documentsRequiredText: string;
  footerThankYouText: string;
  bilingualLabels: boolean;
}

/**
 * Enforces role-based and custom permissions for Student Admission & Registration Form actions.
 * Must be checked inside handler functions, not only by hiding UI buttons.
 */
export function canUserAdmissionAction(
  user: { role?: string; customPermissions?: any; isPrimaryAdmin?: boolean } | null | undefined,
  action: AdmissionPermissionAction
): boolean {
  if (!user || !user.role) return false;
  const role = user.role;

  // Main Admin / Super Admin have full admission & template authority
  if (role === 'super_admin' || role === 'admin') {
    return true;
  }

  // Only Main Admin can edit school-wide templates/defaults unless explicitly granted
  if (action === 'edit_templates') {
    const admPerm = user.customPermissions?.admissions;
    if (admPerm && admPerm.edit_templates !== undefined) {
      return Boolean(admPerm.edit_templates);
    }
    return false;
  }

  if (role === 'principal') {
    return true;
  }

  const admPerm = user.customPermissions?.admissions;
  if (admPerm) {
    if (action === 'view' && admPerm.view !== undefined) return Boolean(admPerm.view);
    if (action === 'add' && admPerm.create !== undefined) return Boolean(admPerm.create);
    if (action === 'edit' && admPerm.edit !== undefined) return Boolean(admPerm.edit);
    if (action === 'print_forms' && (admPerm.print_forms !== undefined || admPerm.export !== undefined)) {
      return Boolean(admPerm.print_forms ?? admPerm.export);
    }
  }

  // Default role fallbacks
  if (role === 'receptionist') {
    return action === 'view' || action === 'add' || action === 'edit' || action === 'print_forms';
  }
  if (role === 'accountant' || role === 'finance' || role === 'hr_manager') {
    return action === 'view' || action === 'print_forms';
  }
  if (role === 'teacher' || role === 'librarian') {
    return action === 'view';
  }

  return false;
}

export type RolePermissions = Record<SystemModule, ModulePermission>;

export interface UserSecurityQuestion {
  question: string;
  answerHash: string;
  salt?: string;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  passwordHash: string;
  passwordSalt?: string;
  securityQuestion: string; // legacy fallback
  securityAnswerHash: string; // legacy fallback
  securityQuestions?: UserSecurityQuestion[]; // 3 security questions
  recoveryKeyHash?: string; // PBKDF2 hash of one-time recovery key
  recoveryKeySalt?: string;
  forcePasswordChange?: boolean; // Force user to change temporary password on login
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  previousLogin?: string; // Stored previous login time shown to user
  failedLoginAttempts?: number;
  lockUntil?: number; // Timestamp in milliseconds until which account is locked
  lockoutMultiplier?: number; // Backoff multiplier (1, 2, 4...)
  avatarUrl?: string;
  customPermissions?: Partial<RolePermissions>;
  emailVerified?: boolean;
  pendingEmail?: string;
  emailMigrationSkippedCount?: number;
  backupRecoveryCodes?: { codeHash: string; used: boolean; usedAt?: string }[];
  backupRecoveryCodesSalt?: string;
  isPrimaryAdmin?: boolean;
  assignedClasses?: string[];
}

export type StudentStatus = 'active' | 'graduated' | 'transferred' | 'inactive';

export interface Student {
  id: string;
  rollNo: string;
  fullName: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string;
  className: string;
  section: string;
  admissionDate: string;
  guardianName: string;
  guardianRelation: string;
  contactNumber: string;
  email?: string;
  address: string;
  photoUrl?: string; // base64 or URL
  status: StudentStatus;
  bloodGroup?: string;
  fatherName?: string;
  motherName?: string;
  idNumber?: string;
  isDemo?: boolean;
  monthlyFee?: number;
  feeDiscount?: number;
  concessionReason?: string;
  // Extended Admission & Registration Form optional fields (backward-compatible)
  nationality?: string;
  domicile?: string;
  religion?: string;
  country?: string;
  startDate?: string;
  occupation?: string;
  education?: string;
  monthlyIncome?: number;
  phone2?: string;
  registrationDate?: string;
  undertakingAccepted?: boolean;
  officerName?: string;
  formTemplateId?: AdmissionTemplateId;
  addressLine2?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'leave';

export interface StudentAttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  status: AttendanceStatus;
  remarks?: string;
  isDemo?: boolean;
}

export interface StaffDocument {
  id: string;
  name: string;
  type: 'cnic_id' | 'resume' | 'degree' | 'contract' | 'medical' | 'police_clearance' | 'other';
  uploadDate: string;
  verified: boolean;
  notes?: string;
}

export interface Staff {
  id: string;
  employeeCode: string;
  fullName: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  bloodGroup?: string;
  nationalId?: string;
  designation: string;
  department: string;
  isTeaching: boolean;
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'probation' | 'intern';
  joiningDate: string;
  contractEndDate?: string;
  contactNumber: string;
  fatherOrSpouseName?: string;
  idNumber?: string;
  email: string;
  address: string;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  qualification?: string;
  experienceYears?: number;
  photoUrl?: string;
  monthlySalary: number;
  allowances: number;
  deductions: number;
  paymentMode?: PaymentMode;
  bankAccount?: string;
  bankName?: string;
  bankDetails?: {
    bankName?: string;
    accountTitle?: string;
    accountNumber?: string;
  };
  status: 'active' | 'resigned' | 'on_leave';
  performanceRating?: number; // 1 to 5
  performanceNotes?: string;
  documents?: StaffDocument[];
  leaveBalance: {
    casual: number;
    sick: number;
    paid: number;
    annual?: number;
    emergency?: number;
    unpaid?: number;
  };
  isDemo?: boolean;
}

export type LeaveType =
  | 'casual'
  | 'sick'
  | 'annual'
  | 'maternity'
  | 'paternity'
  | 'emergency'
  | 'unpaid';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface StaffLeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  employeeCode: string;
  department: string;
  designation: string;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysCount: number;
  isHalfDay?: boolean;
  halfDayPeriod?: 'first_half' | 'second_half';
  reason: string;
  appliedDate: string; // YYYY-MM-DD
  status: LeaveStatus;
  approvedBy?: string;
  actionDate?: string;
  rejectionReason?: string;
  emergencyContactPhone?: string;
  attachmentName?: string;
  isDemo?: boolean;
}

export interface StaffAttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  staffId: string;
  staffName: string;
  designation: string;
  status: AttendanceStatus;
  leaveType?: 'casual' | 'sick' | 'paid' | 'annual' | 'emergency';
  remarks?: string;
  isDemo?: boolean;
}

export type ClassStatus = 'active' | 'inactive';

export interface SchoolClass {
  id: string;
  name: string;
  display_order: number;
  sections?: string[];
  status: ClassStatus;
  created_at: string;
  updated_at: string;
  isDemo?: boolean;
}

export type BillingFrequency = 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';

export interface FeeHead {
  id: string;
  name: string;
  amount: number;
  isOptional?: boolean;
}

export interface FeeStructure {
  id: string;
  class_id?: string; // Foreign key to SchoolClass.id
  className: string; // Human-readable class name for display & backward compatibility
  termOrMonth: string; // Billing frequency: "Monthly", "Quarterly", "Half-Yearly", "Yearly"
  billing_frequency?: BillingFrequency;
  heads: FeeHead[];
  totalAmount: number;
  updatedAt?: string;
  isDemo?: boolean;
}

export type PaymentMode = 'Cash' | 'Bank Transfer' | 'Online/UPI' | 'Cheque' | 'Card' | 'Other';

export type IncomeCategory =
  | 'Student Fees'
  | 'Other Income'
  | 'Donation'
  | 'Security Received'
  | 'Annual Charges'
  | 'Registration Charges'
  | 'Admission Charges'
  | 'Book Shop Income'
  | 'Miscellaneous Income'
  | 'Other Revenue'
  | 'Admission & Registration'
  | 'Grants & Subsidies'
  | 'Donations & Sponsorships'
  | 'Bookstore & Uniforms'
  | 'Cafeteria & Canteen'
  | 'Transport Services'
  | 'Facility & Hall Rental'
  | 'Events & Competitions';

export interface FeePayment {
  id: string;
  receiptNumber: string;
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  date: string; // YYYY-MM-DD
  monthFor: string; // e.g. "September 2026"
  category?: IncomeCategory | string;
  feeBreakdown?: {
    headName: string;
    amount: number;
  }[];
  totalAmount: number; // Net amount collected/paid
  gross_fee?: number; // Total fee before discount
  discount_amount?: number; // Concession/discount amount (default 0)
  discount_reason?: string; // Reason for discount (min 3 chars if discount > 0)
  net_fee?: number; // Net payable fee after discount (gross_fee - discount_amount)
  paymentMode: PaymentMode;
  transactionRef?: string;
  remarks?: string;
  collectedBy: string;
  source?: 'system' | 'manual';
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  isDemo?: boolean;
}

/**
 * Checks if a user has permission to apply fee discounts.
 * Main Admin / Super Admin has it by default.
 * Accounts/Finance role template gets it by default.
 * Other roles require customPermissions.fee_collection.apply_discount === true.
 */
export function canUserApplyDiscount(user: { role?: string; customPermissions?: any } | null | undefined): boolean {
  if (!user) return false;
  const role = user.role;
  if (role === 'admin' || role === 'super_admin') return true;
  if (role === 'finance' || role === 'accountant') {
    if (user.customPermissions?.fee_collection?.apply_discount !== undefined) {
      return Boolean(user.customPermissions.fee_collection.apply_discount);
    }
    return true; // Default enabled for Finance & Accounts
  }
  return Boolean(user.customPermissions?.fee_collection?.apply_discount);
}

export type ExpenseCategory =
  | 'Utilities'
  | 'Building Maintenance'
  | 'Repairs & Maintenance'
  | 'Transport & Fuel'
  | 'Stationery'
  | 'Educational Supplies'
  | 'Examination & Events'
  | 'IT & Software'
  | 'Lab & Sports Equipment'
  | 'Office Expenses'
  | 'Bank Charges'
  | 'Miscellaneous Expense'
  | 'Other Expense'
  | 'Staff Salaries'
  | 'Utilities (Electricity/Water)'
  | 'Marketing & Advertising'
  | 'Exam & Events'
  | 'Miscellaneous';

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory | string;
  subCategory?: string;
  tags?: string[];
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMode: PaymentMode;
  referenceNumber?: string;
  staffId?: string; // If salary disbursement
  staffName?: string;
  monthForSalary?: string;
  recurringTemplateId?: string; // If auto-populated from recurring template
  notes?: string;
  recordedBy: string;
  source?: 'system' | 'manual';
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  isDemo?: boolean;
}

export type RecurrenceFrequency = 'monthly' | 'quarterly' | 'bi-weekly' | 'weekly' | 'annual';

export interface RecurringExpenseTemplate {
  id: string;
  title: string;
  category: ExpenseCategory | string;
  subCategory?: string;
  tags?: string[];
  amount: number;
  paymentMode: PaymentMode;
  frequency: RecurrenceFrequency;
  dayOfMonth: number; // 1-31 (or day of week for weekly)
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (optional cutoff date)
  isActive: boolean;
  autoPost: boolean; // if true, automatically posts to expense list when due; if false, requires manual trigger/approval
  payeeName?: string;
  referencePrefix?: string;
  notes?: string;
  lastGeneratedDate?: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt?: string;
}

export interface CustomExpenseCategory {
  id: string;
  name: string;
  color: string;
  subCategories: string[];
  description?: string;
  isDefault?: boolean;
}

export interface CustomExpenseTag {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface ExpenseTaxonomyConfig {
  categories: CustomExpenseCategory[];
  tags: CustomExpenseTag[];
}

export interface RecurringExpenseGenerationResult {
  templateId: string;
  templateTitle: string;
  expenseId: string;
  amount: number;
  category: string;
  date: string;
  cycleKey: string;
}

export interface DailyFinancialActivityInput {
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
  updatedAt?: string;
  updatedBy?: string;
}

export interface SchoolSettings {
  schoolName: string;
  schoolTagline: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  schoolWebsite: string;
  logoUrl?: string;
  currencySymbol: string;
  currencyCode: string;
  currentAcademicYear: string;
  autoLogoutMinutes: number; // 0 = disabled
  receiptPrefix: string;
  standardClasses: string[];
  standardSections: string[];
  principalSignatureUrl?: string;
  principalName?: string;
  autoBackupConfig?: AutoBackupConfig;
  payrollSettings?: PayrollSettings;
  preferredLanguage?: string;
  localeMetadata?: {
    code: string;
    name: string;
    nativeName: string;
    direction: 'ltr' | 'rtl';
    flag?: string;
    updatedAt?: string;
  };
  isDemoActive?: boolean;
  schoolDataVersion?: number;
  resetEpoch?: number;
  schoolId?: string;
  showDeveloperCreditOnPrint?: boolean;
  certificatePrefix?: string;
  allowTeacherOwnClassCertificates?: boolean;
  admissionFormSettings?: AdmissionFormSettings;
}

export type ExamStatus = 'Scheduled' | 'Ongoing' | 'Completed' | 'Published';

export interface ExamSubject {
  id: string;
  subjectName: string;
  examDate: string; // YYYY-MM-DD
  startTime?: string; // e.g. "09:00 AM"
  endTime?: string; // e.g. "12:00 PM"
  totalMarks: number;
  passingMarks: number;
}

export interface Exam {
  id: string;
  title: string; // e.g. "Midterm Examination 2026-2027"
  academicYear: string;
  className: string; // Target class, e.g. "Grade 10" or "All"
  startDate: string;
  endDate: string;
  status: ExamStatus;
  subjects: ExamSubject[];
  instructions?: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface StudentSubjectMark {
  subjectName: string;
  totalMarks: number;
  passingMarks: number;
  obtainedMarks: number;
  isAbsent?: boolean;
  grade?: string; // e.g. "A+", "A", "B", "C", "D", "F"
  remarks?: string;
}

export interface ExamResult {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentRollNo: string;
  studentName: string;
  className: string;
  section: string;
  academicYear: string;
  guardianName?: string;
  subjectMarks: StudentSubjectMark[];
  totalMaxMarks: number;
  totalObtainedMarks: number;
  percentage: number;
  overallGrade: string; // "A+", "A", "B", "C", "D", "F"
  status: 'Pass' | 'Fail';
  rank?: number;
  teacherRemarks?: string;
  attendancePercentage?: number;
  issueDate: string; // YYYY-MM-DD
  published: boolean;
  isDemo?: boolean;
}

export interface DepartmentBudget {
  id: string;
  department: string;
  month: string; // e.g. "2026-09"
  allocatedAmount: number;
  categories: string[]; // Linked expense categories
  departmentHead?: string;
  fiscalYear?: string;
  alertThresholdPct?: number; // default 90%
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  isDemo?: boolean;
}

export interface CategoryBudgetThreshold {
  category: string;
  monthlyLimit: number;
  warningThresholdPct: number; // default 85%
  enabled: boolean;
  notes?: string;
  updatedAt?: string;
}

export type ThresholdAlertLevel = 'healthy' | 'warning' | 'exceeded';

export interface CategoryThresholdEvaluation {
  threshold: CategoryBudgetThreshold;
  currentSpend: number;
  limit: number;
  variance: number; // currentSpend - limit (positive = over budget)
  percentage: number;
  status: ThresholdAlertLevel;
  month: string; // YYYY-MM
  voucherCount: number;
}

export interface BookItem {
  id: string;
  title: string;
  authorPublisher: string; // Author / Publisher
  className: string; // Class / Grade Level (e.g. "3" or "Grade 3")
  price: number; // Price (PKR)
  stock: number; // In-stock quantity
  isbn?: string;
  category?: string; // Legacy/fallback category
  genre?: string; // e.g. Textbook, Workbook, Reference, Literature, Exam Prep
  subject?: string; // e.g. English, Mathematics, Science, Urdu, Computer
  tags?: string[]; // Custom tags e.g. ["Oxford", "Syllabus 2026", "Prescribed"]
  supplierId?: string; // Associated Vendor / Supplier ID
  supplierName?: string; // Associated Vendor / Supplier Name
  costPrice?: number; // Purchase / Procurement Cost Price
  reorderLevel?: number; // Custom item-level reorder threshold
  createdAt: string;
  updatedAt?: string;
  isDemo?: boolean;
}

export interface BookSupplier {
  id: string;
  name: string; // Company / Vendor name
  contactPerson: string;
  phone: string;
  email: string;
  address?: string;
  suppliedCategories: string[]; // e.g. ["Textbooks", "Note Books", "Stationery"]
  paymentTerms?: string; // e.g. "Net 30", "Cash on Delivery", "Advance 50%"
  bankDetails?: string; // e.g. "HBL A/C # 1234567890"
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  isDemo?: boolean;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string; // YYYY-MM-DD
  amount: number;
  paymentMode: PaymentMode;
  referenceNo: string; // Invoice / Cheque / PO ref
  bookId?: string; // Optional linked book
  bookTitle?: string; // Optional linked book title
  quantitySupplied?: number;
  unitCost?: number;
  status: 'Paid' | 'Partial' | 'Pending';
  notes?: string;
  createdAt: string;
  isDemo?: boolean;
}

export type AssetCategory =
  | 'All'
  | 'Furniture'
  | 'Computers'
  | 'Laboratory Equipment'
  | 'Sports Equipment'
  | 'Office Assets'
  | 'Other';

export type AssetStatus = 'Active' | 'Under Maintenance' | 'Decommissioned' | 'Disposed';

export interface SchoolAsset {
  id: string; // e.g. "AST-1001" or "asset-xxx"
  assetId: string; // Asset ID visible code e.g. "AST-FUR-01"
  name: string; // Asset item name e.g. "Executive Ergonomic Chairs"
  category: 'Furniture' | 'Computers' | 'Laboratory Equipment' | 'Sports Equipment' | 'Office Assets' | 'Other';
  quantity: number;
  purchaseDate: string; // YYYY-MM-DD
  purchasePrice: number; // Initial unit cost/price
  currentValue: number; // Current depreciated/market value
  supplier: string; // Supplier / Vendor name
  warrantyExpiry: string; // YYYY-MM-DD or "No Warranty"
  isUnderWarranty?: boolean;
  status: AssetStatus;
  location?: string; // e.g. "Room 102", "Physics Lab", "Main Hall"
  maintenanceCost?: number; // Total accumulated maintenance cost
  maintenanceNotes?: string;
  condition?: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  serialNumber?: string;
  createdAt: string;
  updatedAt?: string;
  isDemo?: boolean;
}

export interface BookSale {
  id: string;
  invoiceNo: string;
  bookId: string;
  bookTitle: string;
  className: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO
  customerName?: string;
  studentId?: string;
  paymentMode: PaymentMode;
  notes?: string;
  soldBy: string;
  isDemo?: boolean;
}

export type ActiveTab =
  | 'dashboard'
  | 'students'
  | 'admission-form'
  | 'student-attendance'
  | 'staff'
  | 'hr-management'
  | 'staff-attendance'
  | 'exams'
  | 'timetable'
  | 'certificates'
  | 'certification'
  | 'certificate-registry'
  | 'fee-structure'
  | 'fee-collection'
  | 'due-fees'
  | 'expenses'
  | 'budget'
  | 'payroll'
  | 'ledger'
  | 'reports'
  | 'settings'
  | 'profile'
  | 'bookshop'
  | 'inventory'
  | 'users'
  | 'about'
  | 'backup'
  | 'assets'
  | 'leaderboard'
  | 'activity-log'
  | 'attendance-qr'
  | 'data-management'
  | 'integrity'
  | 'data-integrity';

// Activity Log & Audit Trail Types
export type ActivityLogCategory =
  | 'fee_deletion'
  | 'fee_modification'
  | 'salary_modification'
  | 'attendance_override'
  | 'student_edit'
  | 'student_deletion'
  | 'staff_edit'
  | 'staff_leave'
  | 'user_security'
  | 'system_action';

export type ActivityLogSeverity = 'critical' | 'warning' | 'info';

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO string e.g. 2026-10-04T14:32:00.000Z
  userName: string;
  userRole: 'admin' | 'finance' | 'superadmin' | string;
  category: ActivityLogCategory;
  severity: ActivityLogSeverity;
  action: string; // e.g. "Fee Voucher Deleted", "Staff Salary Modified", "Attendance Override"
  details: string; // Full audit summary
  entityId?: string; // ID of the affected student, staff, fee voucher, etc.
  entityName?: string; // Human readable name (e.g. "Ethan Miller", "Sarah Jenkins")
  previousValue?: string; // e.g. "Base Salary: $3,200.00"
  newValue?: string; // e.g. "Base Salary: $3,600.00"
  ipAddress?: string; // e.g. "127.0.0.1 (Local Offline Session)"
  isDemo?: boolean;
}

// Gamification System Types
export interface GamificationBadge {
  id: string;
  code: string;
  name: string;
  description: string;
  iconName: string;
  category: 'attendance' | 'academic' | 'finance' | 'diligence' | 'special';
  badgeLevel: 'bronze' | 'silver' | 'gold' | 'diamond';
  unlockedAt?: string;
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  points: number;
  category: string;
  date: string;
}

export interface StudentGamificationProfile {
  studentId: string;
  studentName: string;
  rollNo: string;
  className: string;
  section: string;
  photoUrl?: string;
  totalPoints: number;
  attendancePoints: number;
  academicPoints: number;
  activityPoints: number;
  level: number;
  rank: number;
  streakDays: number;
  badges: GamificationBadge[];
  recentAchievements: AchievementItem[];
}

export interface StaffGamificationProfile {
  staffId: string;
  staffName: string;
  employeeCode: string;
  department: string;
  designation: string;
  photoUrl?: string;
  totalPoints: number;
  collectionPoints: number;
  recordKeepingPoints: number;
  attendancePoints: number;
  level: number;
  rank: number;
  streakDays: number;
  badges: GamificationBadge[];
  recentAchievements: AchievementItem[];
}

// Certificate & Credential Generation Types
export type CertificateType =
  | 'achievement'        // Specific Achievement / Merit / Excellence
  | 'school_leaving'     // School Leaving Certificate (SLC / Transfer Certificate)
  | 'employee_award'     // Employee Excellence / Best Employee
  | 'employee_service'   // Experience / Relieving / Service Certificate
  | 'appreciation'       // General Certificate of Appreciation
  | 'science_olympiad'   // Science & STEM Olympiad
  | 'academic_honors'    // Academic Honors / Excellence
  | 'perfect_attendance' // 100% Attendance
  | 'sports_festival'    // Annual Sports Festival Appreciation / Achievement
  | 'extracurricular'    // Debate, Quiz, Art, Drama, Qirat/Naat, Scouts, etc.
  | 'custom';            // Custom Certificate

export type CertificateRecipientType = 'student' | 'employee' | 'custom';

export type CertificateDesignId =
  | 'geometric_triangles'  // Design A: White with green/yellow/black geometric triangles
  | 'diagonal_stripes'     // Design B: White with dark green/green/gold diagonal stripes + medal
  | 'classic_ribbon_gold'; // Design C: Cream with green/gold double border, stars & curled ribbons

export type CertificateStatus = 'Issued' | 'Cancelled' | 'Re-issued';

export type CertificateQuality = 'standard' | 'high';

export type CertificateTheme =
  | 'royal_gold'       // Classic Royal Gold with ornate double border
  | 'sapphire_navy'    // Deep sapphire & gold prestige border
  | 'emerald_honors'   // Forest green & gold academic honors
  | 'burgundy_vintage' // Regal burgundy vintage formal border
  | 'modern_minimal';  // Clean crisp slate & gold typography

export type CertificateSealColor = 'gold' | 'silver' | 'bronze' | 'ruby' | 'none';

export interface IssuedCertificate {
  id: string;
  certificateNumber: string; // e.g. "CERT-2026-00042"
  type: CertificateType;
  recipientType: CertificateRecipientType;
  recipientId?: string; // studentId or staffId
  recipientName: string; // e.g. "Miss Fatima Shafiq" or "Liam Chen"

  // School Branding (on certificate)
  schoolName: string;
  schoolTagline?: string;
  schoolAddress?: string;
  schoolAffiliation?: string; // e.g. "Affiliated with State Board of Secondary Education"
  schoolLogo?: string; // base64 or URL
  logoPreset?: 'crest' | 'torch' | 'shield' | 'star' | 'none';
  logoSize?: 'sm' | 'md' | 'lg';
  logoPosition?: 'center' | 'left';

  // Certificate Headers & Content
  certificateTitle: string; // e.g. "CERTIFICATE", "CERTIFICATE OF APPRECIATION"
  subtitle?: string; // e.g. "of Appreciation", "OF ACHIEVEMENT", "is proudly presented to"
  academicYear?: string; // e.g. "2026-2027"

  // Specific Achievement details
  achievementTitle?: string; // e.g. "1st Place - Science Olympiad"
  competitionOrEvent?: string; // e.g. "Annual Sports Festival 2026"
  activityName?: string; // e.g. "Debate", "Quiz", "Art", "Drama", "Qirat/Naat", "Scouts"
  rankOrGrade?: string; // e.g. "1st Position" / "Gold Medal"
  citationText: string; // Primary descriptive paragraph
  secondParagraph?: string; // Optional closing paragraph (Design A)
  language?: 'en' | 'ur'; // Certificate wording language

  // School Leaving Certificate specific fields (when type === 'school_leaving')
  admissionNo?: string;
  rollNo?: string;
  classEnrolled?: string;
  section?: string;
  guardianName?: string;
  guardianRelation?: string;
  dateOfBirth?: string;
  dateOfAdmission?: string;
  dateOfLeaving?: string;
  classLeaving?: string;
  reasonForLeaving?: string; // e.g. "Relocation of parents", "Course completion"
  generalConduct?: string; // "Exemplary", "Very Good", "Good"
  duesCleared?: boolean;
  remarks?: string;

  // Employee specific fields (when recipientType === 'employee')
  employeeCode?: string;
  designation?: string;
  department?: string;
  tenureDates?: string; // e.g. "August 2021 to June 2026"

  // Visual Styling & Design Template
  designId?: CertificateDesignId; // Built-in vector template A / B / C
  accentColorOverride?: string; // Optional accent color hex override
  theme: CertificateTheme;
  sealColor: CertificateSealColor;
  showQrCode: boolean;
  qrPayload?: string;
  verificationToken?: string; // Extension point for signed public QR verification

  // Signatories
  signatory1Title: string; // e.g. "Principal"
  signatory1Name: string;  // e.g. "Dr. Arthur Sterling, Ph.D."
  signatory2Title?: string; // e.g. "Sports In-charge" or "Class Teacher"
  signatory2Name?: string;
  signatory3Title?: string; // e.g. "Date" or "Controller of Examinations"
  signatory3Name?: string;

  // Register Governance & Lifecycle
  status?: CertificateStatus; // Default 'Issued'
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  reissuedFrom?: string;

  issueDate: string; // YYYY-MM-DD
  issuedBy?: string; // User who generated it
  createdAt: string; // ISO string
  isDemo?: boolean;
}

// ==========================================
// INVENTORY MANAGEMENT MODULE TYPES
// ==========================================
export type InventoryCategory =
  | 'Furniture'
  | 'Computers'
  | 'Laboratory'
  | 'Equipment'
  | 'Sports Equipment'
  | 'Office Assets'
  | 'Other Assets';

export type InventoryCondition =
  | 'New'
  | 'Good'
  | 'Needs Repair'
  | 'Damaged'
  | 'Disposed';

export interface InventoryItem {
  id: string;
  itemCode: string; // e.g. "INV-001"
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string; // "pcs", "sets", "units", "boxes"
  purchaseDate: string; // YYYY-MM-DD
  purchasePrice: number;
  vendor: string;
  condition: InventoryCondition;
  location: string;
  assignedTo?: string;
  photoUrl?: string;
  notes?: string;
  minThreshold?: number;
  updatedAt?: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  type: 'stock_in' | 'stock_out' | 'issue' | 'return' | 'transfer' | 'repair' | 'dispose';
  quantity: number;
  date: string;
  staffName?: string;
  department?: string;
  fromLocation?: string;
  toLocation?: string;
  remarks?: string;
  performedBy: string;
}

// ==========================================
// ==========================================
// PAYROLL, LOANS & ADVANCES MODULE TYPES
// ==========================================
export type LoanStatus = 'active' | 'completed' | 'cancelled' | 'paused';

export interface LoanRepaymentEntry {
  id: string;
  payrollMonth?: string;
  installmentNumber?: number;
  amount: number;
  date: string;
  type: 'payroll_deduction' | 'manual_repayment' | 'early_settlement';
  receiptRef?: string;
  notes?: string;
  recordedBy?: string;
}

export interface LoanSkipEntry {
  id: string;
  month: string;
  reason: string;
  skippedDate: string;
  approvedBy: string;
}

export interface StaffLoan {
  id: string;
  loanNumber: string; // e.g. "LOAN-101"
  staffId: string;
  staffName: string;
  employeeCode: string;
  department: string;
  designation?: string;
  principalAmount: number;
  totalAmount: number;
  monthlyInstallment: number;
  totalInstallments: number;
  paidInstallments: number;
  amountRepaid: number;
  balanceRemaining: number;
  disbursementDate: string; // YYYY-MM-DD
  startMonth: string; // e.g. "October 2026"
  status: LoanStatus;
  paymentMode: PaymentMode;
  reason: string;
  notes?: string;
  approvedBy: string;
  repaymentHistory: LoanRepaymentEntry[];
  skipHistory?: LoanSkipEntry[];
  createdAt?: string;
  updatedAt?: string;
  isDemo?: boolean;
}

export type AdvanceStatus = 'pending' | 'approved' | 'rejected' | 'recovered';

export interface StaffAdvance {
  id: string;
  advanceNumber: string; // e.g. "ADV-201"
  staffId: string;
  staffName: string;
  employeeCode: string;
  department: string;
  designation?: string;
  requestedAmount: number;
  recoveryMonth: string; // e.g. "October 2026"
  recoveryMethod: 'next_payroll' | 'split';
  splitMonthsCount?: number;
  status: AdvanceStatus;
  reason: string;
  notes?: string;
  appliedDate: string;
  approvedBy?: string;
  actionDate?: string;
  rejectionReason?: string;
  recoveredAmount: number;
  balanceRemaining?: number;
  recoveryDate?: string;
  createdAt?: string;
  isDemo?: boolean;
}

export type PayrollRunStatus = 'draft' | 'processed' | 'approved' | 'paid';

export interface EmployeePayrollItem {
  staffId: string;
  employeeCode: string;
  fullName: string;
  designation: string;
  department: string;
  employmentType: 'Permanent' | 'Contract' | 'Probation' | 'Part-Time' | string;
  paymentMode: PaymentMode;
  paymentMethod?: 'bank' | 'cash' | 'cheque';
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  branchName?: string;
  basicSalary: number;
  houseRentAllowance?: number;
  medicalAllowance?: number;
  transportAllowance?: number;
  otherAllowances?: number;
  allowances: number;
  bonuses: number;
  overtimeHours: number;
  overtimeRate: number;
  overtimeAmount: number;
  absentDays: number;
  absentDeduction: number;
  taxDeduction: number;
  providentFundDeduction?: number;
  loanDeduction: number;
  loanId?: string;
  advanceDeduction: number;
  advanceId?: string;
  otherDeductions: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  status: 'pending' | 'paid';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  approvedBy?: string;
  approvedDate?: string;
  paidDate?: string;
  transactionRef?: string;
  paymentMethodUsed?: PaymentMode;
  transferStatus?: 'pending' | 'transferred' | 'failed';
  transferRef?: string;
  transferDate?: string;
  remarks?: string;
}

export interface SalaryRecord extends EmployeePayrollItem {
  id: string; // unique identifier, e.g. `${runId}_${staffId}` or `sal-${Date.now()}`
  runId: string;
  month: string;
  fiscalYear?: string;
  createdAt?: string;
  updatedAt?: string;
  isDemo?: boolean;
}

export interface MonthlyPayrollRun {
  id: string;
  month: string; // e.g. "October 2026"
  fiscalYear: string; // e.g. "2026-2027"
  status: PayrollRunStatus;
  scope?: 'all' | 'department' | 'selected';
  departmentFilter?: string;
  totalEmployees: number;
  paidEmployees: number;
  totalBasicSalary: number;
  totalAllowances: number;
  totalBonuses: number;
  totalOvertime: number;
  totalDeductions: number;
  totalNetPayroll: number;
  processedDate?: string;
  processedBy?: string;
  approvedDate?: string;
  approvedBy?: string;
  paidDate?: string;
  expensePostedId?: string;
  isLocked: boolean;
  notes?: string;
  employees: EmployeePayrollItem[];
  statusAuditLog?: PayrollStatusAuditEntry[];
  createdAt?: string;
  updatedAt?: string;
  isDemo?: boolean;
}

export interface PayrollStatusAuditEntry {
  id: string;
  timestamp: string; // ISO string e.g. "2026-10-18T00:23:37.000Z"
  action: 'run_created' | 'run_processed' | 'run_approved' | 'salary_paid' | 'run_unlocked' | 'run_deleted' | string;
  fromStatus: PayrollRunStatus | 'none';
  toStatus: PayrollRunStatus | 'deleted';
  userId: string;
  userName: string;
  userRole?: string;
  notes?: string;
}

export interface PayrollTaxBracket {
  min: number;
  max: number;
  ratePercent: number;
}


export interface PayrollSettings {
  workingDaysPerMonth: number;
  overtimeHourlyRate: number;
  maxLoanSalaryMultiplier: number;
  allowMultipleActiveLoans: boolean;
  maxAdvanceSalaryPercent: number;
  providentFundPercent: number;
  taxBrackets: PayrollTaxBracket[];
  allowanceTypes: string[];
  deductionTypes: string[];
  customAnnualBudget?: number;
  projectionMode?: 'realtime' | 'custom' | 'zero';
}

export type PayrollAuditAction =
  | 'run_created'
  | 'run_processed'
  | 'run_approved'
  | 'run_rejected'
  | 'run_unlocked'
  | 'run_deleted'
  | 'salary_paid'
  | 'record_approved'
  | 'record_rejected'
  | 'loan_added'
  | 'loan_repaid'
  | 'loan_skipped'
  | 'loan_settled'
  | 'loan_deleted'
  | 'advance_requested'
  | 'advance_approved'
  | 'advance_rejected'
  | 'advance_recovered'
  | 'advance_deleted'
  | 'bank_transfer_generated'
  | 'bank_transfer_updated'
  | 'settings_updated';

export interface PayrollAuditLog {
  id: string;
  timestamp: string; // ISO string
  action: PayrollAuditAction;
  title: string;
  details: string;
  userId?: string; // ID of the user who performed the action
  userName: string;
  userRole: string;
  fromStatus?: string; // e.g., 'Draft', 'Processed', 'Approved', 'Paid'
  toStatus?: string;   // e.g., 'Approved', 'Paid'
  targetId?: string;
  targetName?: string;
  amount?: number;
}

// Timetable Management Types
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export type PeriodType = 'Lecture' | 'Lab' | 'Break' | 'Assembly' | 'Sports' | 'Library';

export interface TimetableSlot {
  id: string;
  className: string;
  section: string;
  day: DayOfWeek;
  periodNumber: number;
  periodLabel: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId?: string;
  teacherName: string;
  room?: string;
  periodType: PeriodType;
  color?: string;
  notes?: string;
  createdAt?: string;
  isDemo?: boolean;
}

// Automated Client-Side Data Backup & Disaster Recovery Types
export type BackupTriggerType =
  | 'automated_scheduled'
  | 'pre_restore_safety'
  | 'manual_export'
  | 'session_checkpoint';

export type AutoBackupFrequency =
  | 'hourly'
  | 'every_6_hours'
  | 'every_12_hours'
  | 'daily'
  | 'every_3_days'
  | 'weekly'
  | 'disabled';

export interface AutoBackupConfig {
  enabled: boolean;
  frequency: AutoBackupFrequency;
  maxStoredSnapshots: number;
  autoPromptDownload: boolean;
  lastAutoBackupTimestamp?: string;
  lastAutoBackupFilename?: string;
  nextScheduledBackupTimestamp?: string;
  folderBackupEnabled?: boolean;
  backupFolderName?: string;
  backupOnLogout?: boolean;
  backupDaily?: boolean;
  keepLastBackupsCount?: number;
  encryptWithPassword?: boolean;
  backupPassword?: string;
  lastComputerBackupTimestamp?: string;
  lastComputerBackupFilename?: string;
}

export interface BackupEntityCounts {
  classes?: number;
  students: number;
  staff: number;
  staffLeaves?: number;
  feePayments: number;
  feeStructures?: number;
  expenses: number;
  studentAttendance: number;
  staffAttendance: number;
  users: number;
  exams: number;
  examResults: number;
  budgets: number;
  books: number;
  bookSales: number;
  bookSuppliers?: number;
  supplierPayments?: number;
  activityLogs: number;
  certificates?: number;
  assets?: number;
  timetableSlots?: number;
  payrollRuns?: number;
  salaryRecords?: number;
}

export interface BackupSnapshotRecord {
  id: string;
  timestamp: string;
  trigger: BackupTriggerType;
  title: string;
  notes?: string;
  sizeBytes: number;
  recordsCount: number;
  entityCounts: BackupEntityCounts;
  jsonData: string;
}

// Background Sync & Offline-First Types
export type BackgroundSyncStatus = 'synced' | 'syncing' | 'offline' | 'pending' | 'error';

export interface BackgroundSyncInfo {
  lastSyncTimestamp: string; // ISO-8601 string of last successful sync
  status: BackgroundSyncStatus;
  isOnline: boolean;
  pendingChangesCount: number;
  lastLatencyMs?: number;
  lastSyncRecordsCount?: number;
  errorMessage?: string;
  syncMode?: 'indexeddb_mirror' | 'server_endpoint';
}

// In-App Notification & Toast Alert System Types
export type NotificationCategory =
  | 'fee_deadline'
  | 'low_inventory'
  | 'staff_attendance'
  | 'general'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  timestamp: string; // ISO-8601
  read: boolean;
  targetTab?: ActiveTab;
  actionLabel?: string;
  autoDismissMs?: number; // milliseconds before toast auto-hides, default 5000
}

// Data Purge & School Reset Types
export type ClearableDataModule =
  | 'all'
  | 'students'
  | 'staff'
  | 'attendance'
  | 'feeCollections'
  | 'feeStructures'
  | 'expenses'
  | 'books'
  | 'exams'
  | 'budgets'
  | 'certificates'
  | 'assets'
  | 'payroll'
  | 'timetable'
  | 'logs';

export interface ResetAllDataOptions {
  keepAdminAccount?: boolean;
  newSchoolName?: string;
  newSchoolTagline?: string;
  newCurrency?: string;
  downloadBackupFirst?: boolean;
  deleteEverythingIncludingAccounts?: boolean;
}

// Data Management: Clear & Reset Types
export type DataManagementActionType =
  | 'remove_demo'
  | 'clear_selected'
  | 'clear_selected_modules'
  | 'clear_financial'
  | 'factory_reset'
  | 'clear_device_cache'
  | 'module_purge'
  | 'reset_annual_budget';

export interface ModuleDataCount {
  total: number;
  demo: number;
  real: number;
}

export interface SchoolDataSummary {
  students: ModuleDataCount;
  staff: ModuleDataCount;
  studentAttendance: ModuleDataCount;
  staffAttendance: ModuleDataCount;
  feePayments: ModuleDataCount;
  feeStructures: ModuleDataCount;
  expenses: ModuleDataCount;
  payroll: ModuleDataCount;
  exams: ModuleDataCount;
  timetable: ModuleDataCount;
  certificates: ModuleDataCount;
  assets: ModuleDataCount;
  books: ModuleDataCount;
  activityLogs: ModuleDataCount;
  totalRecords: number;
  totalDemoRecords: number;
  totalRealRecords: number;
  hasDemoData: boolean;
}

export interface DeviceInfoSummary {
  schoolName: string;
  dataSource: string;
  lastSyncTime: string | null;
  totalRecords: number;
  appVersion: string;
  storageEstimate?: { usedMB: number; quotaMB: number };
}



