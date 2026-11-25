import { Expense, RecurringExpenseTemplate, RecurrenceFrequency, PaymentMode, ExpenseCategory } from '../types';
import { getTodayDateString } from './formatters';

const STORAGE_KEY = 'eduledger_recurring_expense_templates';

/**
 * Standard seed recurring expenses for an educational institution.
 */
export const DEFAULT_RECURRING_TEMPLATES: RecurringExpenseTemplate[] = [
  {
    id: 'rec-tpl-rent-01',
    title: 'Main Campus Building & Land Lease',
    category: 'Building Maintenance',
    amount: 3200,
    paymentMode: 'Bank Transfer',
    frequency: 'monthly',
    dayOfMonth: 1,
    startDate: '2026-01-01',
    isActive: true,
    autoPost: true,
    payeeName: 'Metropolitan Educational Properties Trust',
    referencePrefix: 'RENT',
    notes: 'Primary institutional lease payment for academic wings and administrative offices.',
    lastGeneratedDate: '2026-09-01',
    nextDueDate: '2026-10-01',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'rec-tpl-sec-02',
    title: 'Campus Security & Guard Staff Retainer',
    category: 'Staff Salaries',
    amount: 1850,
    paymentMode: 'Bank Transfer',
    frequency: 'monthly',
    dayOfMonth: 28,
    startDate: '2026-01-01',
    isActive: true,
    autoPost: true,
    payeeName: 'ShieldForce Institutional Security Corp',
    referencePrefix: 'SEC',
    notes: '24/7 campus surveillance, perimeter patrol, and entry gate security personnel.',
    lastGeneratedDate: '2026-09-28',
    nextDueDate: '2026-10-28',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'rec-tpl-it-03',
    title: 'Campus Leased Line Fiber & Cloud ERP Server',
    category: 'IT & Software',
    amount: 240,
    paymentMode: 'Online/UPI',
    frequency: 'monthly',
    dayOfMonth: 5,
    startDate: '2026-01-01',
    isActive: true,
    autoPost: true,
    payeeName: 'NextGen Telecom & Cloud Services',
    referencePrefix: 'IT-SUB',
    notes: 'Dedicated 1Gbps fiber internet connection and daily automated cloud database backups.',
    lastGeneratedDate: '2026-09-05',
    nextDueDate: '2026-10-05',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'rec-tpl-util-04',
    title: 'Municipal Water & Sanitation Fixed Retainer',
    category: 'Utilities (Electricity/Water)',
    amount: 420,
    paymentMode: 'Bank Transfer',
    frequency: 'monthly',
    dayOfMonth: 10,
    startDate: '2026-01-01',
    isActive: true,
    autoPost: false,
    payeeName: 'City Water & Public Works Board',
    referencePrefix: 'WATER',
    notes: 'Scheduled monthly campus water supply and sanitation filtration maintenance.',
    lastGeneratedDate: '2026-09-10',
    nextDueDate: '2026-10-10',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
];

/**
 * Retrieve saved recurring expense templates from localStorage.
 */
export function getStoredRecurringTemplates(): RecurringExpenseTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    const isCleanSlate = localStorage.getItem('eduledger_is_clean_slate') === 'true';
    if (isCleanSlate) return [];
    saveRecurringTemplates(DEFAULT_RECURRING_TEMPLATES);
    return DEFAULT_RECURRING_TEMPLATES;
  } catch (err) {
    console.warn('Failed to parse recurring templates from localStorage:', err);
    return [];
  }
}

/**
 * Persist recurring expense templates to localStorage.
 */
export function saveRecurringTemplates(templates: RecurringExpenseTemplate[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Failed to save recurring templates to localStorage:', err);
  }
}

/**
 * Clear all stored recurring expense templates.
 */
export function clearStoredRecurringTemplates(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch (err) {
    console.error('Failed to clear recurring templates:', err);
  }
}

/**
 * Helper to safely clamp dayOfMonth for the target year and month.
 */
function getClampedDate(year: number, monthIndex0: number, desiredDay: number): string {
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const actualDay = Math.min(Math.max(1, desiredDay), lastDay);
  const m = String(monthIndex0 + 1).padStart(2, '0');
  const d = String(actualDay).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Calculates a standardized cycle key for duplicate tracking.
 */
export function getCycleKey(frequency: RecurrenceFrequency, dateStr: string): string {
  const parts = dateStr.split('-');
  const y = parts[0];
  const m = parts[1] || '01';

  switch (frequency) {
    case 'annual':
      return y;
    case 'quarterly': {
      const monthNum = parseInt(m, 10);
      const q = Math.ceil(monthNum / 3);
      return `${y}-Q${q}`;
    }
    case 'weekly':
    case 'bi-weekly': {
      const dt = new Date(dateStr);
      const oneJan = new Date(dt.getFullYear(), 0, 1);
      const numberOfDays = Math.floor((dt.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
      const weekNum = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
      return `${y}-W${weekNum}`;
    }
    case 'monthly':
    default:
      return `${y}-${m}`;
  }
}

/**
 * Calculates the next due date following a given reference date or last generated date.
 */
export function calculateNextDueDate(
  frequency: RecurrenceFrequency,
  dayOfMonth: number,
  lastGeneratedDate?: string,
  referenceDate: string = getTodayDateString()
): string {
  const base = lastGeneratedDate ? new Date(lastGeneratedDate + 'T00:00:00') : new Date(referenceDate + 'T00:00:00');
  let y = base.getFullYear();
  let m = base.getMonth(); // 0-indexed

  if (lastGeneratedDate) {
    // Advance forward based on recurrence interval
    switch (frequency) {
      case 'annual':
        y += 1;
        break;
      case 'quarterly':
        m += 3;
        if (m > 11) {
          y += Math.floor(m / 12);
          m = m % 12;
        }
        break;
      case 'weekly': {
        const nextW = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
        return nextW.toISOString().slice(0, 10);
      }
      case 'bi-weekly': {
        const nextBi = new Date(base.getTime() + 14 * 24 * 60 * 60 * 1000);
        return nextBi.toISOString().slice(0, 10);
      }
      case 'monthly':
      default:
        m += 1;
        if (m > 11) {
          y += 1;
          m = 0;
        }
        break;
    }
    return getClampedDate(y, m, dayOfMonth);
  }

  // If no lastGeneratedDate, calculate for the current or upcoming cycle
  const currentMonthCandidate = getClampedDate(y, m, dayOfMonth);
  if (currentMonthCandidate >= referenceDate) {
    return currentMonthCandidate;
  }

  // Current month's execution day has passed, so next is next month
  m += 1;
  if (m > 11) {
    y += 1;
    m = 0;
  }
  return getClampedDate(y, m, dayOfMonth);
}

/**
 * Determines whether a recurring voucher has already been generated for this template & cycle.
 */
export function isExpenseAlreadyGenerated(
  template: RecurringExpenseTemplate,
  targetDate: string,
  existingExpenses: Expense[]
): boolean {
  const targetCycleKey = getCycleKey(template.frequency, targetDate);

  for (const exp of existingExpenses) {
    if (!exp.date) continue;
    const expCycle = getCycleKey(template.frequency, exp.date);

    // 1. Direct template ID match
    if (exp.recurringTemplateId && exp.recurringTemplateId === template.id && expCycle === targetCycleKey) {
      return true;
    }

    // 2. Reference prefix & cycle match
    const prefix = template.referencePrefix || 'REC';
    if (exp.referenceNumber && exp.referenceNumber.startsWith(prefix) && exp.referenceNumber.includes(targetCycleKey)) {
      return true;
    }

    // 3. Fallback matching exact title, exact amount, and same cycle
    if (
      exp.title.trim().toLowerCase() === template.title.trim().toLowerCase() &&
      Math.abs(exp.amount - template.amount) < 0.01 &&
      expCycle === targetCycleKey
    ) {
      return true;
    }
  }

  return false;
}

export interface DueRecurringItem {
  template: RecurringExpenseTemplate;
  dueDate: string;
  cycleKey: string;
  isOverdue: boolean;
}

/**
 * Evaluates all active recurring templates and returns those that are due for generation.
 */
export function getDueRecurringTemplates(
  templates: RecurringExpenseTemplate[],
  existingExpenses: Expense[],
  currentDate: string = getTodayDateString()
): DueRecurringItem[] {
  const dueItems: DueRecurringItem[] = [];

  for (const tpl of templates) {
    if (!tpl.isActive) continue;

    // Check if within active date bounds
    if (tpl.startDate && tpl.startDate > currentDate) continue;
    if (tpl.endDate && tpl.endDate < currentDate) continue;

    // Determine the scheduled execution date
    const targetDueDate = tpl.nextDueDate || calculateNextDueDate(tpl.frequency, tpl.dayOfMonth, tpl.lastGeneratedDate, currentDate);

    // If the due date has arrived (or is past due)
    if (targetDueDate <= currentDate) {
      const cycleKey = getCycleKey(tpl.frequency, targetDueDate);
      const alreadyDone = isExpenseAlreadyGenerated(tpl, targetDueDate, existingExpenses);

      if (!alreadyDone) {
        dueItems.push({
          template: tpl,
          dueDate: targetDueDate,
          cycleKey,
          isOverdue: targetDueDate < currentDate,
        });
      }
    }
  }

  return dueItems;
}

/**
 * Execute generation of expenses from a list of due recurring templates.
 */
export async function executeRecurringExpenseGeneration(
  dueItems: DueRecurringItem[],
  recordExpenseFn: (exp: Omit<Expense, 'id'>) => Promise<Expense>,
  currentTemplates: RecurringExpenseTemplate[],
  recordedBy: string = 'Automated Recurring Scheduler'
): Promise<{
  createdExpenses: Expense[];
  updatedTemplates: RecurringExpenseTemplate[];
}> {
  const createdExpenses: Expense[] = [];
  const updatedTemplates = [...currentTemplates];

  for (const item of dueItems) {
    const { template, dueDate, cycleKey } = item;

    const refNo = `${template.referencePrefix || 'REC'}-${cycleKey}-${String(template.dayOfMonth).padStart(2, '0')}`;
    const newExpenseData: Omit<Expense, 'id'> = {
      title: template.title,
      category: template.category,
      subCategory: template.subCategory,
      tags: template.tags && template.tags.length > 0 ? template.tags : ['Recurring-Scheduled'],
      amount: template.amount,
      date: dueDate,
      paymentMode: template.paymentMode,
      referenceNumber: refNo,
      recurringTemplateId: template.id,
      notes: `[Auto-Generated Recurring Voucher] Scheduled ${template.frequency} payment for ${cycleKey}. ${template.notes || ''}`.trim(),
      recordedBy,
      source: 'system',
    };

    try {
      const created = await recordExpenseFn(newExpenseData);
      createdExpenses.push(created);

      // Update the template state with new lastGeneratedDate and nextDueDate
      const tIndex = updatedTemplates.findIndex(t => t.id === template.id);
      if (tIndex >= 0) {
        const nextDue = calculateNextDueDate(template.frequency, template.dayOfMonth, dueDate);
        updatedTemplates[tIndex] = {
          ...updatedTemplates[tIndex],
          lastGeneratedDate: dueDate,
          nextDueDate: nextDue,
          updatedAt: new Date().toISOString(),
        };
      }
    } catch (err) {
      console.error(`Failed to post recurring expense for template ${template.id}:`, err);
    }
  }

  // Persist updated template timestamps
  saveRecurringTemplates(updatedTemplates);

  return {
    createdExpenses,
    updatedTemplates,
  };
}
