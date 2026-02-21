import { toDateString } from '@/lib/utils/format';

export type ChartPeriod = '1W' | '1M' | '3M' | 'YTD' | 'ALL';

/**
 * Returns the ISO start date string for a given chart period relative to today.
 * Used consistently across dashboard, analytics, and equity curve.
 */
export function getPeriodStartDate(period: ChartPeriod): string | undefined {
  const now = new Date();

  switch (period) {
    case '1W': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return toDateString(d);
    }
    case '1M': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return toDateString(d);
    }
    case '3M': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return toDateString(d);
    }
    case 'YTD':
      return `${now.getFullYear()}-01-01`;
    case 'ALL':
      return undefined;
  }
}

/** Returns start and end date strings for the current ISO week (Mon–Sun) */
export function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Formats a week range as a display string.
 * e.g. "Feb 17 – 23, 2026"
 */
export function formatWeekRange(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const endStr = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startStr} – ${endStr}`;
}
