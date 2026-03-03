// ─── Trade Row ──────────────────────────────────────────────────────────────
// Sidebar trade list item used in the Journal "Log a Trade" mode.
// Extracted from journal-client.tsx during Phase 3 decomposition.
// ────────────────────────────────────────────────────────────────────────────

import { FileText } from "lucide-react";
import type { Trade } from "@/lib/supabase/types";
import { DirectionBadge, OutcomeBadge } from "./journal-ui-atoms";
import {
  fmtCurrency,
  fmtR,
  fmtDate,
  getOutcome,
  PROFIT,
  LOSS_COLOR as LOSS,
  ACCENT,
} from "@/components/journal/utils/format";

export function TradeRow({
  trade,
  isSelected,
  hasNote,
  onClick,
}: {
  trade: Trade;
  isSelected: boolean;
  hasNote: boolean;
  onClick: () => void;
}) {
  const pnl = trade.pnl ?? 0;
  return (
    <button
      onClick={onClick}
      className="w-full text-left transition-all duration-150 rounded-[8px] jnl-hover-surface"
      style={{
        padding: "10px 12px",
        background: isSelected ? "var(--surface-active)" : "transparent",
        borderLeft: isSelected
          ? `3px solid ${ACCENT}`
          : "3px solid transparent",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span
            className="font-bold tracking-tight"
            style={{
              fontSize: "0.88rem",
              color: isSelected ? ACCENT : "var(--text-primary)",
            }}
          >
            {trade.symbol}
          </span>
          <DirectionBadge d={trade.direction as "LONG" | "SHORT"} />
          <OutcomeBadge outcome={getOutcome(trade.status, trade.pnl)} />
          {hasNote && (
            <FileText size={9} style={{ color: ACCENT, opacity: 0.7 }} />
          )}
        </div>
        <span
          className="font-semibold tabular-nums"
          style={{
            fontSize: "0.82rem",
            color: pnl > 0 ? PROFIT : pnl < 0 ? LOSS : "var(--text-tertiary)",
          }}
        >
          {fmtCurrency(trade.pnl)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span style={{ fontSize: "0.65rem", color: "var(--text-tertiary)" }}>
          {fmtDate(trade.entry_date)}
        </span>
        {trade.r_multiple != null && (
          <span
            className="font-mono"
            style={{
              fontSize: "0.65rem",
              color: trade.r_multiple >= 0 ? PROFIT : LOSS,
              fontWeight: 600,
            }}
          >
            {fmtR(trade.r_multiple)}
          </span>
        )}
      </div>
    </button>
  );
}
