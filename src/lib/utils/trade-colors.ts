/**
 * Semantic color helpers for trade data.
 * All colors reference CSS variables so they respect the active theme.
 *
 * Use `getPnLColorClass` in JSX className strings.
 * Use `getPnLColor` in Recharts stroke/fill props and SVG attributes.
 */

/** Returns a Tailwind CSS variable class for a P&L value */
export function getPnLColorClass(pnl: number | null | undefined): string {
  if (pnl == null || pnl === 0) return 'text-[var(--text-tertiary)]';
  return pnl > 0 ? 'text-[var(--profit-primary)]' : 'text-[var(--loss-primary)]';
}

/** Returns a CSS variable string for use in SVG/Recharts contexts */
export function getPnLColor(pnl: number | null | undefined): string {
  if (pnl == null || pnl === 0) return 'var(--text-tertiary)';
  return pnl > 0 ? 'var(--profit-primary)' : 'var(--loss-primary)';
}

/** Returns a Tailwind CSS variable class for a trade direction */
export function getDirectionColorClass(
  direction: string | null | undefined,
): string {
  if (direction === 'LONG') return 'text-[var(--profit-primary)]';
  if (direction === 'SHORT') return 'text-[var(--loss-primary)]';
  return 'text-[var(--text-tertiary)]';
}

/** Returns a CSS variable string for trade direction — for SVG/Recharts */
export function getDirectionColor(direction: string | null | undefined): string {
  if (direction === 'LONG') return 'var(--profit-primary)';
  if (direction === 'SHORT') return 'var(--loss-primary)';
  return 'var(--text-tertiary)';
}

/** Returns a Tailwind CSS variable class for a win/loss outcome string */
export function getOutcomeColorClass(outcome: string | null | undefined): string {
  if (outcome === 'WIN') return 'text-[var(--profit-primary)]';
  if (outcome === 'LOSS') return 'text-[var(--loss-primary)]';
  return 'text-[var(--text-tertiary)]';
}
