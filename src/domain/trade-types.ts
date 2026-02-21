import { Trade } from "@/lib/supabase/types";

export type TradeOutcome = "WIN" | "LOSS" | "BE" | "OPEN";

/**
 * Enriched Trade type with computed properties.
 * This is the primary type used by UI components.
 */
export interface EnrichedTrade extends Trade {
  // Computed Properties
  outcome: TradeOutcome;
  isOpen: boolean;
  
  // Formatted/Display Properties
  formattedEntryDate: string;
  formattedExitDate?: string;
  formattedPnL: string;
  
  // Risk Metrics
  riskAmount?: number;
  riskMultiple?: number;
}

export type TradeFilterCriteria = {
  status?: "open" | "closed" | "all";
  direction?: "LONG" | "SHORT" | "all";
  search?: string;
  accountId?: string | null;
  playbookId?: string | null;
};
