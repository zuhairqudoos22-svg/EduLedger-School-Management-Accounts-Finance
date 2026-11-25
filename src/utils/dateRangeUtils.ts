/**
 * Date Range Utilities for School Management & Financial Analytics
 */

export type DateRangePreset =
  | 'last_3_months'
  | 'this_academic_year'
  | 'this_month'
  | 'last_month'
  | 'last_6_months'
  | 'last_12_months'
  | 'this_year'
  | 'all'
  | 'custom';

export interface DateRange {
  preset: DateRangePreset;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  label: string;
}

function formatDateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calculates start and end dates along with human-readable labels for date range presets
 */
export function calculateDateRange(
  preset: DateRangePreset,
  academicYearString: string = '2026-2027',
  customStart?: string,
  customEnd?: string
): DateRange {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed: 9 for October

  if (preset === 'last_3_months') {
    // 3 complete calendar months ending with the current month
    // e.g. for October: August 1st to October 31st
    const startDateObj = new Date(currentYear, currentMonth - 2, 1);
    const endDateObj = new Date(currentYear, currentMonth + 1, 0); // Last day of current month
    return {
      preset,
      startDate: formatDateToIso(startDateObj),
      endDate: formatDateToIso(endDateObj),
      label: 'Last 3 Months',
    };
  }

  if (preset === 'this_academic_year') {
    // Academic Year: e.g. "2026-2027"
    // Standard school fiscal/academic cycle spans July 1st to June 30th
    let startYear = currentYear;
    let endYear = currentYear + 1;
    const parts = (academicYearString || '').split('-').map(p => parseInt(p.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      startYear = parts[0];
      endYear = parts[1];
    } else if (parts.length === 1 && !isNaN(parts[0])) {
      startYear = parts[0];
      endYear = parts[0] + 1;
    }

    return {
      preset,
      startDate: `${startYear}-07-01`,
      endDate: `${endYear}-06-30`,
      label: `Academic Year ${academicYearString}`,
    };
  }

  if (preset === 'this_month') {
    const startDateObj = new Date(currentYear, currentMonth, 1);
    const endDateObj = new Date(currentYear, currentMonth + 1, 0);
    return {
      preset,
      startDate: formatDateToIso(startDateObj),
      endDate: formatDateToIso(endDateObj),
      label: 'This Month',
    };
  }

  if (preset === 'last_month') {
    const startDateObj = new Date(currentYear, currentMonth - 1, 1);
    const endDateObj = new Date(currentYear, currentMonth, 0);
    return {
      preset,
      startDate: formatDateToIso(startDateObj),
      endDate: formatDateToIso(endDateObj),
      label: 'Last Month',
    };
  }

  if (preset === 'last_6_months') {
    const startDateObj = new Date(currentYear, currentMonth - 5, 1);
    const endDateObj = new Date(currentYear, currentMonth + 1, 0);
    return {
      preset,
      startDate: formatDateToIso(startDateObj),
      endDate: formatDateToIso(endDateObj),
      label: 'Last 6 Months',
    };
  }

  if (preset === 'last_12_months') {
    const startDateObj = new Date(currentYear, currentMonth - 11, 1);
    const endDateObj = new Date(currentYear, currentMonth + 1, 0);
    return {
      preset,
      startDate: formatDateToIso(startDateObj),
      endDate: formatDateToIso(endDateObj),
      label: 'Last 12 Months',
    };
  }

  if (preset === 'this_year') {
    return {
      preset,
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`,
      label: `Calendar Year ${currentYear}`,
    };
  }

  if (preset === 'custom') {
    return {
      preset,
      startDate: customStart || '',
      endDate: customEnd || '',
      label: 'Custom Range',
    };
  }

  // 'all'
  return {
    preset: 'all',
    startDate: '',
    endDate: '',
    label: 'All Time',
  };
}

/**
 * Returns formatted date range badge text (e.g. "Aug 1, 2026 – Oct 31, 2026")
 */
export function formatDateRangeDisplay(range: DateRange): string {
  if (range.preset === 'all' || (!range.startDate && !range.endDate)) {
    return 'All Recorded Transactions';
  }

  const formatShort = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (range.startDate && range.endDate) {
    return `${formatShort(range.startDate)} – ${formatShort(range.endDate)}`;
  }
  if (range.startDate) {
    return `From ${formatShort(range.startDate)}`;
  }
  if (range.endDate) {
    return `Until ${formatShort(range.endDate)}`;
  }
  return range.label;
}

/**
 * Generates an array of all { year, month (0-11), key ("YYYY-MM") } objects in chronological order
 * between startDate and endDate.
 */
export function getMonthsInDateRange(
  startDateStr: string,
  endDateStr: string
): { year: number; month: number; key: string }[] {
  if (!startDateStr || !endDateStr) return [];

  const [startY, startM] = startDateStr.split('-').map(Number);
  const [endY, endM] = endDateStr.split('-').map(Number);

  const start = new Date(startY, startM - 1, 1);
  const end = new Date(endY, endM - 1, 1);

  const months: { year: number; month: number; key: string }[] = [];
  const cur = new Date(start);

  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    months.push({ year: y, month: m, key });
    cur.setMonth(cur.getMonth() + 1);
  }

  return months;
}
