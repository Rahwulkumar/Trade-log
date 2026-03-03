// ─── Journal Domain Types ───────────────────────────────────────────────────
// Canonical view-models & contracts consumed by all Journal UI components.
// Keeps Supabase row-types at the boundary (journal-mapper.ts) and gives
// the UI a clean, camelCase-only surface.
// ────────────────────────────────────────────────────────────────────────────

/** Quality rating for entry/exit */
export type QualityRating = "Good" | "Neutral" | "Poor";

/** Timeframe bias observation */
export interface TfObservation {
  bias?: string;
  notes?: string;
}

/** Normalised screenshot consumed by gallery & editor */
export interface JournalScreenshot {
  id: string;
  tradeId: string;
  url: string;
  timeframe: string;
  createdAt: string;
}

// ── Canonical UI view-model ─────────────────────────────────────────────────

export interface JournalTradeViewModel {
  // Identity
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  status: "open" | "closed";

  // Core numbers
  pnl: number | null;
  rMultiple: number | null;
  entryPrice: number | null;
  exitPrice: number | null;
  entryDate: string | null;
  exitDate: string | null;
  positionSize: number | null;
  stopLoss: number | null;
  takeProfit: number | null;

  // Relations
  propAccountId: string | null;
  playbookId: string | null;
  createdAt: string | null;

  // Journal fields (always present — empty string / [] if not filled in)
  notes: string;
  feelings: string;
  observations: string;
  executionNotes: string;
  setupTags: string[];
  mistakeTags: string[];
  executionArrays: string[];
  screenshots: JournalScreenshot[];
  conviction: number | null;
  entryRating: QualityRating | null;
  exitRating: QualityRating | null;
  mae: number | null;
  mfe: number | null;
  tfObservations: Record<string, TfObservation>;
}

// ── Draft (mutable editor state, subset of ViewModel) ───────────────────────

export interface JournalEntryDraft {
  notes: string;
  feelings: string;
  observations: string;
  setupTags: string[];
  mistakeTags: string[];
  conviction: number | null;
  entryRating: QualityRating | null;
  exitRating: QualityRating | null;
  mae: number | null;
  mfe: number | null;
  tfObservations: Record<string, TfObservation>;
  executionNotes: string;
  executionArrays: string[];
  screenshots: JournalScreenshot[];
}

// ── Filters ─────────────────────────────────────────────────────────────────

export type TradeOutcomeFilter = "all" | "WIN" | "LOSS" | "BE" | "OPEN";
export type DirectionFilter = "all" | "LONG" | "SHORT";

export interface JournalFilters {
  search: string;
  outcome: TradeOutcomeFilter;
  direction: DirectionFilter;
  dateFrom: string | null;
  dateTo: string | null;
}

// ── Journal tab IDs ─────────────────────────────────────────────────────────

export type JournalTab = "notes" | "bias" | "setup" | "execution" | "psychology";
