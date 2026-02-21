import { Trade } from "@/lib/supabase/types";
import { EnrichedTrade, TradeOutcome } from "./trade-types";
import { format } from "date-fns";

/**
 * Maps a raw Supabase Trade to an EnrichedTrade.
 * Centralizes all logic for determining outcome, status, and formatting.
 */
export function mapToEnrichedTrade(trade: Trade): EnrichedTrade {
  const isOpen = trade.status === "open" || !trade.exit_date;
  const pnl = trade.pnl ?? 0;
  
  let outcome: TradeOutcome = "OPEN";
  if (!isOpen) {
    if (pnl > 0) outcome = "WIN";
    else if (pnl < 0) outcome = "LOSS";
    else outcome = "BE";
  }

  // Calculate generic risk multiple if not present
  // R = PnL / Risk. Risk = |Entry - SL| * PositionSize
  let calculatedR = trade.r_multiple;
  if (calculatedR === null && trade.stop_loss && trade.entry_price && pnl !== 0) {
    const riskPerShare = Math.abs(trade.entry_price - trade.stop_loss);
    const totalRisk = riskPerShare * trade.position_size;
    if (totalRisk > 0) {
      calculatedR = pnl / totalRisk;
    }
  }

  return {
    ...trade,
    isOpen,
    outcome,
    riskMultiple: calculatedR ?? undefined,
    formattedEntryDate: format(new Date(trade.entry_date), "MMM d, HH:mm"),
    formattedExitDate: trade.exit_date ? format(new Date(trade.exit_date), "MMM d, HH:mm") : undefined,
    formattedPnL: pnl.toFixed(2),
  };
}

export function mapToEnrichedTrades(trades: Trade[]): EnrichedTrade[] {
  return trades.map(mapToEnrichedTrade);
}
