/**
 * CSS variable references for use in Recharts tick/axis/stroke configs.
 * These strings reference the active theme's CSS variables at runtime.
 *
 * Usage in Recharts:
 *   <XAxis tick={{ fill: CHART_COLORS.textTertiary }} />
 *   stroke={CHART_COLORS.profit}
 */
export const CHART_COLORS = {
  profit: 'var(--profit-primary)',
  loss: 'var(--loss-primary)',
  accent: 'var(--accent-primary)',
  textTertiary: 'var(--text-tertiary)',
  border: 'var(--border-default)',
  surface: 'var(--surface-elevated)',
  fontMono: 'var(--font-jb-mono)',
  fontSans: 'var(--font-dm-sans)',
  /** CartesianGrid stroke — muted grid line, same hue as text-tertiary at low alpha */
  grid: 'rgba(127,143,166,0.15)',
} as const;

/**
 * Gradient stop colors for use inside SVG <linearGradient>.
 * Recharts AreaChart fill gradients need rgba() strings since CSS vars
 * cannot be used inside SVG stop-color.
 *
 * These match the design-system profit/loss palette.
 */
export const CHART_GRADIENT_RGB = {
  /** Profit gradient base (matches --profit-primary #03624C) */
  profit: '3,98,76',
  /** Loss gradient base (matches --loss-primary red) */
  loss: '255,68,85',
} as const;

/** Standard gradient IDs for SVG <defs> — avoids collision between charts on same page */
export const CHART_GRADIENT_IDS = {
  profit: 'gradient-profit',
  loss: 'gradient-loss',
  equity: 'gradient-equity',
  cashflow: 'gradient-cashflow',
} as const;
