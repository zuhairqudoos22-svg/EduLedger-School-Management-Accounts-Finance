import {
  MonthlyPayrollRun,
  StaffLoan,
  StaffAdvance,
  PayrollAuditLog,
  PayrollSettings,
} from '../types';
import { initialPayrollRuns, initialStaffLoans, initialStaffAdvances } from '../db/seedData';
import { getDB } from '../db/indexedDB';

const STORAGE_KEYS = {
  RUNS: 'eduledger_payroll_runs',
  LOANS: 'eduledger_staff_loans',
  ADVANCES: 'eduledger_staff_advances',
  AUDIT_LOGS: 'eduledger_payroll_audit_logs',
  SETTINGS: 'eduledger_payroll_settings',
};

export const defaultPayrollSettings: PayrollSettings = {
  workingDaysPerMonth: 26,
  overtimeHourlyRate: 250,
  maxLoanSalaryMultiplier: 5,
  allowMultipleActiveLoans: false,
  maxAdvanceSalaryPercent: 50,
  providentFundPercent: 5,
  taxBrackets: [
    { min: 0, max: 50000, ratePercent: 0 },
    { min: 50001, max: 100000, ratePercent: 5 },
    { min: 100001, max: 200000, ratePercent: 10 },
    { min: 200001, max: 999999999, ratePercent: 15 },
  ],
  allowanceTypes: ['House Rent', 'Medical', 'Transport', 'Special Allowance'],
  deductionTypes: ['Tax', 'Provident Fund', 'Loan Installment', 'Advance Recovery', 'Absent/Unpaid Leave'],
};

export const defaultInitialAuditLogs: PayrollAuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-09-28T09:15:00Z',
    action: 'run_created',
    fromStatus: 'none',
    toStatus: 'draft',
    title: 'Payroll Generated',
    details: 'September 2026 payroll run created for 10 employees. Net total: 33,520 PKR.',
    userId: 'usr-fin-01',
    userName: 'Clara Higgins',
    userRole: 'Finance Officer',
  },
  {
    id: 'log-2',
    timestamp: '2026-09-28T14:30:00Z',
    action: 'run_processed',
    fromStatus: 'draft',
    toStatus: 'processed',
    title: 'Payroll Processed',
    details: 'September 2026 payroll processed and locked for administrative sign-off.',
    userId: 'usr-fin-01',
    userName: 'Clara Higgins',
    userRole: 'Finance Officer',
  },
  {
    id: 'log-3',
    timestamp: '2026-09-29T11:00:00Z',
    action: 'run_approved',
    fromStatus: 'processed',
    toStatus: 'approved',
    title: 'Payroll Approved',
    details: 'September 2026 payroll verified and approved by Principal Dr. Arthur Sterling.',
    userId: 'usr-admin-01',
    userName: 'Dr. Arthur Sterling',
    userRole: 'Administrator',
  },
  {
    id: 'log-4',
    timestamp: '2026-09-30T16:00:00Z',
    action: 'salary_paid',
    fromStatus: 'approved',
    toStatus: 'paid',
    title: 'Payroll Disbursed',
    details: 'September 2026 salaries marked as Paid via Bank Transfer. Accounts expense voucher posted.',
    userId: 'usr-fin-01',
    userName: 'Clara Higgins',
    userRole: 'Finance Officer',
  },
  {
    id: 'log-5',
    timestamp: '2026-10-14T09:00:00Z',
    action: 'run_created',
    fromStatus: 'none',
    toStatus: 'draft',
    title: 'Draft Payroll Generated',
    details: 'October 2026 draft payroll run initiated for 10 active faculty and staff members.',
    userId: 'usr-fin-01',
    userName: 'Clara Higgins',
    userRole: 'Finance Officer',
  },
];

// Helper to write to IndexedDB safely with fallback
async function saveToDB(storeName: string, item: any) {
  try {
    const db = await getDB();
    if (db.objectStoreNames.contains(storeName)) {
      await db.put(storeName, item);
    }
  } catch (err) {
    console.warn(`IndexedDB put to ${storeName} skipped:`, err);
  }
}

async function deleteFromDB(storeName: string, key: string) {
  try {
    const db = await getDB();
    if (db.objectStoreNames.contains(storeName)) {
      await db.delete(storeName, key);
    }
  } catch (err) {
    console.warn(`IndexedDB delete from ${storeName} skipped:`, err);
  }
}

export const payrollStorage = {
  // PAYROLL RUNS
  loadRuns(): MonthlyPayrollRun[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RUNS);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading payroll runs from localStorage:', e);
    }
    // Do not return seed data by default; empty by default on fresh installation
    return [];
  },

  saveRuns(runs: MonthlyPayrollRun[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.RUNS, JSON.stringify(runs));
      runs.forEach(run => saveToDB('payrollRuns', run));
    } catch (e) {
      console.error('Failed to save payroll runs:', e);
    }
  },

  saveSingleRun(run: MonthlyPayrollRun) {
    const current = this.loadRuns();
    const index = current.findIndex(r => r.id === run.id || (r.month === run.month && r.fiscalYear === run.fiscalYear));
    let updated: MonthlyPayrollRun[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = run;
    } else {
      updated = [run, ...current];
    }
    this.saveRuns(updated);
    return updated;
  },

  deleteRun(id: string) {
    const current = this.loadRuns();
    const updated = current.filter(r => r.id !== id);
    this.saveRuns(updated);
    deleteFromDB('payrollRuns', id);
    return updated;
  },

  // LOANS
  loadLoans(): StaffLoan[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOANS);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading staff loans from localStorage:', e);
    }
    // Do not return seed data by default; empty by default on fresh installation
    return [];
  },

  saveLoans(loans: StaffLoan[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
      loans.forEach(loan => saveToDB('payrollLoans', loan));
    } catch (e) {
      console.error('Failed to save staff loans:', e);
    }
  },

  saveSingleLoan(loan: StaffLoan) {
    const current = this.loadLoans();
    const index = current.findIndex(l => l.id === loan.id);
    let updated: StaffLoan[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = loan;
    } else {
      updated = [loan, ...current];
    }
    this.saveLoans(updated);
    return updated;
  },

  deleteLoan(id: string) {
    const current = this.loadLoans();
    const updated = current.filter(l => l.id !== id);
    this.saveLoans(updated);
    deleteFromDB('payrollLoans', id);
    return updated;
  },

  // ADVANCES
  loadAdvances(): StaffAdvance[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ADVANCES);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading advances from localStorage:', e);
    }
    // Do not return seed data by default; empty by default on fresh installation
    return [];
  },

  saveAdvances(advances: StaffAdvance[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.ADVANCES, JSON.stringify(advances));
      advances.forEach(adv => saveToDB('payrollAdvances', adv));
    } catch (e) {
      console.error('Failed to save staff advances:', e);
    }
  },

  saveSingleAdvance(advance: StaffAdvance) {
    const current = this.loadAdvances();
    const index = current.findIndex(a => a.id === advance.id);
    let updated: StaffAdvance[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = advance;
    } else {
      updated = [advance, ...current];
    }
    this.saveAdvances(updated);
    return updated;
  },

  deleteAdvance(id: string) {
    const current = this.loadAdvances();
    const updated = current.filter(a => a.id !== id);
    this.saveAdvances(updated);
    deleteFromDB('payrollAdvances', id);
    return updated;
  },

  // AUDIT LOGS
  loadAuditLogs(): PayrollAuditLog[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading payroll audit logs from localStorage:', e);
    }
    return [];
  },

  seedDemoPayrollData() {
    const taggedRuns: MonthlyPayrollRun[] = initialPayrollRuns.map(r => ({
      ...r,
      isDemo: true,
      employees: r.employees.map(e => ({ ...e, isDemo: true })),
    }));
    const taggedLoans: StaffLoan[] = initialStaffLoans.map(l => ({ ...l, isDemo: true }));
    const taggedAdvances: StaffAdvance[] = initialStaffAdvances.map(a => ({ ...a, isDemo: true }));

    this.saveRuns(taggedRuns);
    this.saveLoans(taggedLoans);
    this.saveAdvances(taggedAdvances);
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(defaultInitialAuditLogs));
    } catch {}
  },

  removeDemoPayrollData(): { removedRuns: number; removedLoans: number; removedAdvances: number } {
    const runs = this.loadRuns();
    const loans = this.loadLoans();
    const advances = this.loadAdvances();

    const realRuns = runs.filter(r => !r.isDemo);
    const realLoans = loans.filter(l => !l.isDemo);
    const realAdvances = advances.filter(a => !a.isDemo);

    const removedRuns = runs.length - realRuns.length;
    const removedLoans = loans.length - realLoans.length;
    const removedAdvances = advances.length - realAdvances.length;

    this.saveRuns(realRuns);
    this.saveLoans(realLoans);
    this.saveAdvances(realAdvances);

    return { removedRuns, removedLoans, removedAdvances };
  },

  clearAllPayrollData(): { clearedRuns: number; clearedLoans: number; clearedAdvances: number } {
    const runs = this.loadRuns();
    const loans = this.loadLoans();
    const advances = this.loadAdvances();

    const clearedRuns = runs.length;
    const clearedLoans = loans.length;
    const clearedAdvances = advances.length;

    this.saveRuns([]);
    this.saveLoans([]);
    this.saveAdvances([]);

    return { clearedRuns, clearedLoans, clearedAdvances };
  },

  addAuditLog(entry: Omit<PayrollAuditLog, 'id' | 'timestamp'>) {
    const current = this.loadAuditLogs();
    const newEntry: PayrollAuditLog = {
      ...entry,
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
    };
    const updated = [newEntry, ...current].slice(0, 100);
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated));
      saveToDB('payrollAuditLogs', newEntry);
    } catch (e) {
      console.error('Failed to save audit log:', e);
    }
    return updated;
  },

  // SETTINGS
  loadSettings(): PayrollSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        return { ...defaultPayrollSettings, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Error reading payroll settings:', e);
    }
    return defaultPayrollSettings;
  },

  saveSettings(settings: PayrollSettings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save payroll settings:', e);
    }
  },
};
