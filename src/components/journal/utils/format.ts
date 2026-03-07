// ─── Shared Journal Formatting Utilities ────────────────────────────────────
// Replaces duplicated fmtCurrency / fmtR / fmtDate / fmtDateShort
// that existed in both journal-client.tsx and journal-library.tsx.
// ────────────────────────────────────────────────────────────────────────────

/** Format a number as a signed dollar amount: +$123.45 / -$80.00 / "—" if null */
export function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return "—";
  return (n >= 0 ? "+" : "-") + "$" + Math.abs(n).toFixed(2);
}

/** Format R-multiple: +2.40R / -1.00R / null if null */
export function fmtR(n: number | null | undefined): string | null {
  if (n == null) return null;
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "R";
}

/** Format a date string as "Feb 24, 2026" style */
export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format a date string as "Feb 24" (short, no year) */
export function fmtDateShort(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Determine trade outcome from PnL + status */
export function getOutcome(
  status: string | null | undefined,
  pnl: number | null | undefined,
): "WIN" | "LOSS" | "BE" | "OPEN" {
  if (status?.toUpperCase() === "OPEN") return "OPEN";
  const p = pnl ?? 0;
  if (p > 0.5) return "WIN";
  if (p < -0.5) return "LOSS";
  return "BE";
}

// ─── CSS variable colour constants ──────────────────────────────────────────
// Re-export from one place so journal components don't re-declare them.

export const PROFIT = "var(--profit-primary)";
export const LOSS_COLOR = "var(--loss-primary)";
export const ACCENT = "var(--accent-primary)";
