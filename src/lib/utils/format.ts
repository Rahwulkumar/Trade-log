/**
 * Shared formatting utilities.
 * Import from here — never define inline in components or pages.
 */

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COMPACT_CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Format a number as a dollar amount: `$1,234.56` */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '---';
  return CURRENCY_FORMATTER.format(value);
}

/** Format a number as a signed dollar amount: `+$1,234.56` or `-$1,234.56` */
export function formatSignedCurrency(value: number | null | undefined): string {
  if (value == null) return '---';
  const abs = CURRENCY_FORMATTER.format(Math.abs(value));
  return value >= 0 ? `+${abs}` : `-${abs}`;
}

/** Format a number as a compact dollar amount: `$1.2k`, `$3.4M` */
export function formatCompactCurrency(value: number | null | undefined): string {
  if (value == null) return '---';
  return COMPACT_CURRENCY_FORMATTER.format(value);
}

/** Format a number as a percentage string: `66.7%` */
export function toPercent(
  value: number | null | undefined,
  decimals = 1,
): string {
  if (value == null) return '---';
  return `${value.toFixed(decimals)}%`;
}

/** Format a number as an R-multiple: `+2.3R` or `-1.0R` */
export function formatRMultiple(value: number | null | undefined): string {
  if (value == null) return '---';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}R`;
}

/**
 * Format an ISO date string or Date object to a short display string.
 * e.g. `"2024-03-15T10:00:00Z"` → `"Mar 15"`
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '---';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format an ISO date string or Date object with time.
 * e.g. `"2024-03-15T10:30:00Z"` → `"Mar 15, 10:30"`
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '---';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Convert any date to a `YYYY-MM-DD` string (timezone-safe, uses local time).
 * Replaces all `new Date().toISOString().split('T')[0]` patterns.
 */
export function toDateString(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Get today as `YYYY-MM-DD` */
export function todayString(): string {
  return toDateString(new Date());
}
