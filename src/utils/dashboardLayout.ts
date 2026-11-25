export type DashboardWidgetId =
  | 'kpi_summary'
  | 'todays_attendance'
  | 'recent_fee_payments'
  | 'quick_insights'
  | 'attendance_alerts'
  | 'balance_alerts'
  | 'quick_actions'
  | 'fiscal_fee_vs_expenses'
  | 'operations_trend'
  | 'monthly_cashflow'
  | 'attendance_and_expense_charts'
  | 'actionable_insights'
  | 'accounts_audit_table'
  | 'gamification';

export interface DashboardWidgetMeta {
  id: DashboardWidgetId;
  title: string;
  description: string;
  category: 'Metrics' | 'Attendance' | 'Finance' | 'Operations';
  defaultVisible: boolean;
}

export const DASHBOARD_WIDGET_META: Record<DashboardWidgetId, DashboardWidgetMeta> = {
  kpi_summary: {
    id: 'kpi_summary',
    title: 'Key Metrics Overview',
    description: 'Total students, faculty headcount, monthly fee collection, and pending dues.',
    category: 'Metrics',
    defaultVisible: true,
  },
  todays_attendance: {
    id: 'todays_attendance',
    title: "Today's Attendance",
    description: 'Live daily student and faculty attendance turnout, rates, and leave status.',
    category: 'Attendance',
    defaultVisible: true,
  },
  recent_fee_payments: {
    id: 'recent_fee_payments',
    title: 'Recent Fee Payments',
    description: 'Latest tuition fee receipts, payment modes, and quick receipt drilldowns.',
    category: 'Finance',
    defaultVisible: true,
  },
  quick_insights: {
    id: 'quick_insights',
    title: 'Revenue Growth & Fee Deadlines',
    description: 'Monthly revenue trajectory chart and upcoming collection deadlines.',
    category: 'Finance',
    defaultVisible: true,
  },
  attendance_alerts: {
    id: 'attendance_alerts',
    title: 'Absenteeism & Truancy Alerts',
    description: 'Unexcused and multi-day absent students or staff requiring follow-up.',
    category: 'Attendance',
    defaultVisible: true,
  },
  balance_alerts: {
    id: 'balance_alerts',
    title: 'Low Balance & Past Due Alerts',
    description: 'Overdue student balances and pending staff salary disbursements.',
    category: 'Finance',
    defaultVisible: true,
  },
  quick_actions: {
    id: 'quick_actions',
    title: 'Quick Actions Hub',
    description: 'One-tap shortcuts across admissions, fees, payroll, exams, and reports.',
    category: 'Operations',
    defaultVisible: true,
  },
  fiscal_fee_vs_expenses: {
    id: 'fiscal_fee_vs_expenses',
    title: 'Fee Collection vs. Expenses',
    description: 'Fiscal year comparison between tuition inflows and school expenditure.',
    category: 'Finance',
    defaultVisible: true,
  },
  operations_trend: {
    id: 'operations_trend',
    title: 'Academic Year Operations Trend',
    description: 'Multi-line enrollment, revenue, and operating expense trend monitor.',
    category: 'Metrics',
    defaultVisible: true,
  },
  monthly_cashflow: {
    id: 'monthly_cashflow',
    title: 'Monthly Revenue vs. Expenses',
    description: 'Monthly net cash flow and institutional surplus/deficit monitor.',
    category: 'Finance',
    defaultVisible: true,
  },
  attendance_and_expense_charts: {
    id: 'attendance_and_expense_charts',
    title: 'Monthly Attendance & Expense Mix',
    description: 'Turnout percentage trend chart alongside operational expense breakdown.',
    category: 'Metrics',
    defaultVisible: true,
  },
  actionable_insights: {
    id: 'actionable_insights',
    title: 'Actionable Operational Insights',
    description: 'Real-time recovery velocity, turnout health, and operating margin cards.',
    category: 'Operations',
    defaultVisible: true,
  },
  accounts_audit_table: {
    id: 'accounts_audit_table',
    title: 'Accounts Audit Table',
    description: 'Tabular view of top student defaulters and pending faculty payroll.',
    category: 'Finance',
    defaultVisible: true,
  },
  gamification: {
    id: 'gamification',
    title: 'Gamification & Leaderboard',
    description: 'Student and faculty recognition streaks, badges, and top achievers.',
    category: 'Operations',
    defaultVisible: true,
  },
};

export const DEFAULT_WIDGET_ORDER: DashboardWidgetId[] = [
  'kpi_summary',
  'todays_attendance',
  'recent_fee_payments',
  'quick_insights',
  'attendance_alerts',
  'balance_alerts',
  'quick_actions',
  'fiscal_fee_vs_expenses',
  'operations_trend',
  'monthly_cashflow',
  'attendance_and_expense_charts',
  'actionable_insights',
  'accounts_audit_table',
  'gamification',
];

export interface DashboardLayoutState {
  order: DashboardWidgetId[];
  hidden: DashboardWidgetId[];
}

const STORAGE_KEY_PREFIX = 'eduledger_dashboard_layout_v1_';

function getStorageKey(userId?: string): string {
  return `${STORAGE_KEY_PREFIX}${userId || 'default'}`;
}

export function getDefaultDashboardLayout(): DashboardLayoutState {
  return {
    order: [...DEFAULT_WIDGET_ORDER],
    hidden: [],
  };
}

function isValidWidgetId(id: string): id is DashboardWidgetId {
  return id in DASHBOARD_WIDGET_META;
}

export function reconcileDashboardLayout(
  raw?: Partial<DashboardLayoutState> | null
): DashboardLayoutState {
  const seen = new Set<DashboardWidgetId>();
  const cleanOrder: DashboardWidgetId[] = [];

  if (Array.isArray(raw?.order)) {
    for (const id of raw.order) {
      if (typeof id === 'string' && isValidWidgetId(id) && !seen.has(id)) {
        seen.add(id);
        cleanOrder.push(id);
      }
    }
  }

  for (const defaultId of DEFAULT_WIDGET_ORDER) {
    if (!seen.has(defaultId)) {
      seen.add(defaultId);
      cleanOrder.push(defaultId);
    }
  }

  const hiddenSet = new Set<DashboardWidgetId>();
  if (Array.isArray(raw?.hidden)) {
    for (const id of raw.hidden) {
      if (typeof id === 'string' && isValidWidgetId(id)) {
        hiddenSet.add(id);
      }
    }
  }

  return {
    order: cleanOrder,
    hidden: Array.from(hiddenSet),
  };
}

export function loadDashboardLayout(userId?: string): DashboardLayoutState {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return getDefaultDashboardLayout();
    const parsed = JSON.parse(raw) as Partial<DashboardLayoutState>;
    return reconcileDashboardLayout(parsed);
  } catch {
    return getDefaultDashboardLayout();
  }
}

export function saveDashboardLayout(layout: DashboardLayoutState, userId?: string): void {
  try {
    const clean = reconcileDashboardLayout(layout);
    localStorage.setItem(getStorageKey(userId), JSON.stringify(clean));
  } catch {
    // Ignore storage quota or private mode failures
  }
}

export function resetDashboardLayout(userId?: string): DashboardLayoutState {
  const defaults = getDefaultDashboardLayout();
  saveDashboardLayout(defaults, userId);
  return defaults;
}

export function reorderWidgets(
  order: DashboardWidgetId[],
  sourceId: DashboardWidgetId,
  targetId: DashboardWidgetId
): DashboardWidgetId[] {
  if (sourceId === targetId) return order;
  const fromIdx = order.indexOf(sourceId);
  const toIdx = order.indexOf(targetId);
  if (fromIdx === -1 || toIdx === -1) return order;
  const next = [...order];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}

export function isCustomLayout(layout: DashboardLayoutState): boolean {
  if (layout.hidden.length > 0) return true;
  if (layout.order.length !== DEFAULT_WIDGET_ORDER.length) return true;
  return layout.order.some((id, idx) => id !== DEFAULT_WIDGET_ORDER[idx]);
}
