import { Expense, CategoryBudgetThreshold, CategoryThresholdEvaluation, ThresholdAlertLevel } from '../types';

export const BUDGET_THRESHOLDS_STORAGE_KEY = 'eduledger_category_budget_thresholds';

export const DEFAULT_CATEGORY_THRESHOLDS: CategoryBudgetThreshold[] = [
  {
    category: 'Staff Salaries',
    monthlyLimit: 12000,
    warningThresholdPct: 90,
    enabled: true,
    notes: 'Primary monthly payroll cap for faculty, administration, and campus auxiliary staff.',
  },
  {
    category: 'Utilities (Electricity/Water)',
    monthlyLimit: 1200,
    warningThresholdPct: 85,
    enabled: true,
    notes: 'Power grid, backup generators, drinking water, and municipal utilities.',
  },
  {
    category: 'Building Maintenance',
    monthlyLimit: 800,
    warningThresholdPct: 85,
    enabled: true,
    notes: 'Campus repairs, painting, HVAC servicing, plumbing, and physical upkeep.',
  },
  {
    category: 'IT & Software',
    monthlyLimit: 500,
    warningThresholdPct: 85,
    enabled: true,
    notes: 'Fiber link, cloud domain, student portal infrastructure, and software licenses.',
  },
  {
    category: 'Transport & Fuel',
    monthlyLimit: 1000,
    warningThresholdPct: 85,
    enabled: true,
    notes: 'Fleet diesel, bus maintenance, route permits, and driver allowances.',
  },
  {
    category: 'Lab & Sports Equipment',
    monthlyLimit: 600,
    warningThresholdPct: 85,
    enabled: true,
    notes: 'STEM lab consumables, reagents, athletic equipment, and tournament kits.',
  },
  {
    category: 'Educational Supplies',
    monthlyLimit: 800,
    warningThresholdPct: 85,
    enabled: true,
    notes: 'Classroom stationery, whiteboards, library periodicals, and instructional materials.',
  },
  {
    category: 'Exam & Events',
    monthlyLimit: 700,
    warningThresholdPct: 85,
    enabled: true,
    notes: 'Examination papers, answer booklets, hall decor, and annual day events.',
  },
  {
    category: 'Marketing & Advertising',
    monthlyLimit: 400,
    warningThresholdPct: 85,
    enabled: true,
    notes: 'Admissions prospectus, social media campaigns, and banner printing.',
  },
  {
    category: 'Miscellaneous',
    monthlyLimit: 300,
    warningThresholdPct: 85,
    enabled: true,
    notes: 'Incidental contingency petty cash and courier expenditures.',
  },
];

/**
 * Retrieves configured category budget thresholds from persistent storage,
 * or seeds default baseline thresholds if uninitialized.
 */
export function getStoredBudgetThresholds(): CategoryBudgetThreshold[] {
  try {
    const raw = localStorage.getItem(BUDGET_THRESHOLDS_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    const isCleanSlate = typeof window !== 'undefined' && localStorage.getItem('eduledger_is_clean_slate') === 'true';
    if (isCleanSlate) return [];
    saveBudgetThresholds(DEFAULT_CATEGORY_THRESHOLDS);
    return DEFAULT_CATEGORY_THRESHOLDS;
  } catch (error) {
    console.warn('Failed to parse budget thresholds from storage, using defaults:', error);
    return [];
  }
}

/**
 * Persists category budget thresholds to localStorage.
 */
export function saveBudgetThresholds(thresholds: CategoryBudgetThreshold[]): void {
  try {
    localStorage.setItem(BUDGET_THRESHOLDS_STORAGE_KEY, JSON.stringify(thresholds));
  } catch (error) {
    console.error('Failed to save budget thresholds to storage:', error);
  }
}

/**
 * Clears category budget thresholds from localStorage.
 */
export function clearStoredBudgetThresholds(): void {
  try {
    localStorage.setItem(BUDGET_THRESHOLDS_STORAGE_KEY, JSON.stringify([]));
  } catch (error) {
    console.error('Failed to clear budget thresholds:', error);
  }
}

/**
 * Evaluates expense spending against user-defined monthly limits for a target month (YYYY-MM).
 */
export function evaluateBudgetThresholds(
  expenses: Expense[],
  thresholds: CategoryBudgetThreshold[],
  targetMonthKey: string // "YYYY-MM"
): CategoryThresholdEvaluation[] {
  // Aggregate expenses for the specific target month
  const monthlyCategoryTotals: Record<string, { total: number; count: number }> = {};

  for (const exp of expenses) {
    if (!exp.date || !exp.date.startsWith(targetMonthKey)) continue;
    const cat = exp.category;
    if (!monthlyCategoryTotals[cat]) {
      monthlyCategoryTotals[cat] = { total: 0, count: 0 };
    }
    monthlyCategoryTotals[cat].total += exp.amount || 0;
    monthlyCategoryTotals[cat].count += 1;
  }

  // Evaluate each configured threshold
  return thresholds.map(thresh => {
    const data = monthlyCategoryTotals[thresh.category] || { total: 0, count: 0 };
    const currentSpend = Math.round(data.total);
    const limit = thresh.monthlyLimit;
    const variance = currentSpend - limit;
    const percentage = limit > 0 ? Math.round((currentSpend / limit) * 100) : 0;
    const warningPct = thresh.warningThresholdPct || 85;

    let status: ThresholdAlertLevel = 'healthy';
    if (thresh.enabled) {
      if (currentSpend > limit) {
        status = 'exceeded';
      } else if (percentage >= warningPct) {
        status = 'warning';
      }
    }

    return {
      threshold: thresh,
      currentSpend,
      limit,
      variance,
      percentage,
      status,
      month: targetMonthKey,
      voucherCount: data.count,
    };
  });
}

/**
 * Pre-evaluates whether adding a new expense record will exceed the monthly budget limit.
 */
export function checkExpenseThresholdBreach(
  newAmount: number,
  category: string,
  date: string, // YYYY-MM-DD
  allExpenses: Expense[],
  thresholds: CategoryBudgetThreshold[]
): {
  threshold: CategoryBudgetThreshold | null;
  currentSpend: number;
  projectedSpend: number;
  limit: number;
  willExceed: boolean;
  overrunAmount: number;
  projectedPercentage: number;
} {
  const matchingThreshold = thresholds.find(t => t.category === category && t.enabled);
  if (!matchingThreshold) {
    return {
      threshold: null,
      currentSpend: 0,
      projectedSpend: newAmount,
      limit: 0,
      willExceed: false,
      overrunAmount: 0,
      projectedPercentage: 0,
    };
  }

  const monthKey = date.slice(0, 7); // "YYYY-MM"
  const currentMonthExpenses = allExpenses.filter(
    e => e.date && e.date.startsWith(monthKey) && e.category === category
  );

  const currentSpend = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const projectedSpend = currentSpend + newAmount;
  const limit = matchingThreshold.monthlyLimit;
  const willExceed = projectedSpend > limit;
  const overrunAmount = Math.max(0, projectedSpend - limit);
  const projectedPercentage = limit > 0 ? Math.round((projectedSpend / limit) * 100) : 0;

  return {
    threshold: matchingThreshold,
    currentSpend,
    projectedSpend,
    limit,
    willExceed,
    overrunAmount,
    projectedPercentage,
  };
}
