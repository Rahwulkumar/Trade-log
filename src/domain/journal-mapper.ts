// ─── Journal Mapper ─────────────────────────────────────────────────────────
// Single boundary between Supabase Trade rows and the Journal UI view-model.
// All casts live HERE and nowhere else.
// ────────────────────────────────────────────────────────────────────────────

import type { Trade, TradeScreenshot as SupabaseScreenshot } from "@/lib/supabase/types";
import type { Json } from "@/lib/supabase/types";
import type {
  JournalTradeViewModel,
  JournalEntryDraft,
  JournalScreenshot,
  TfObservation,
  QualityRating,
} from "./journal-types";

// ─── Internal parse helpers ─────────────────────────────────────────────────

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string");
}

function parseScreenshots(raw: Json | null, tradeId: string): JournalScreenshot[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item, idx): JournalScreenshot[] => {
    if (typeof item === "string") {
      return [{
        id: `${tradeId}-ss-${idx}`,
        tradeId,
        url: item,
        timeframe: "—",
        createdAt: "",
      }];
    }
    if (typeof item === "object" && item !== null && "url" in item) {
      const s = item as { url: string; timeframe?: string; created_at?: string };
      return [{
        id: `${tradeId}-ss-${idx}`,
        tradeId,
        url: s.url,
        timeframe: s.timeframe ?? "—",
        createdAt: s.created_at ?? "",
      }];
    }
    return [];
  });
}

function parseTfObservations(raw: Json | null): Record<string, TfObservation> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const result: Record<string, TfObservation> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null) {
      const v = value as Record<string, unknown>;
      result[key] = {
        bias: typeof v.bias === "string" ? v.bias : undefined,
        notes: typeof v.notes === "string" ? v.notes : undefined,
      };
    }
  }
  return result;
}

function parseQuality(raw: string | null | undefined): QualityRating | null {
  if (raw === "Good" || raw === "Neutral" || raw === "Poor") return raw;
  return null;
}

// ─── Public mapper: Trade row → ViewModel ───────────────────────────────────

/**
 * Maps a raw Supabase Trade row to the canonical JournalTradeViewModel.
 *
 * This is the SINGLE place where raw row data is normalised for the Journal UI.
 * All journal-specific columns are accessed directly from the Trade type
 * (they exist on the Row type since the supabase types were generated from the
 *  schema which includes these columns).
 */
export function mapTradeToViewModel(t: Trade): JournalTradeViewModel {
  return {
    // Identity
    id: t.id,
    symbol: t.symbol,
    direction: t.direction === "SHORT" ? "SHORT" : "LONG",
    status: t.status === "open" ? "open" : "closed",

    // Core numbers
    pnl: t.pnl ?? null,
    rMultiple: t.r_multiple ?? null,
    entryPrice: t.entry_price ?? null,
    exitPrice: t.exit_price ?? null,
    entryDate: t.entry_date ?? null,
    exitDate: t.exit_date ?? null,
    positionSize: t.position_size ?? null,
    stopLoss: t.stop_loss ?? null,
    takeProfit: t.take_profit ?? null,

    // Relations
    propAccountId: t.prop_account_id ?? null,
    playbookId: t.playbook_id ?? null,
    createdAt: t.created_at ?? null,

    // Journal fields — directly available on the Trade Row type
    notes: t.notes ?? "",
    feelings: t.feelings ?? "",
    observations: t.observations ?? "",
    executionNotes: t.execution_notes ?? "",
    setupTags: t.setup_tags ?? [],
    mistakeTags: t.mistake_tags ?? [],
    executionArrays: parseStringArray(t.execution_arrays),
    screenshots: parseScreenshots(t.screenshots, t.id),
    conviction: t.conviction ?? null,
    entryRating: parseQuality(t.entry_rating),
    exitRating: parseQuality(t.exit_rating),
    mae: t.mae ?? null,
    mfe: t.mfe ?? null,
    tfObservations: parseTfObservations(t.tf_observations),
  };
}

// ─── ViewModel → Draft (initial editor state) ──────────────────────────────

export function viewModelToDraft(vm: JournalTradeViewModel): JournalEntryDraft {
  return {
    notes: vm.notes,
    feelings: vm.feelings,
    observations: vm.observations,
    setupTags: [...vm.setupTags],
    mistakeTags: [...vm.mistakeTags],
    conviction: vm.conviction,
    entryRating: vm.entryRating,
    exitRating: vm.exitRating,
    mae: vm.mae,
    mfe: vm.mfe,
    tfObservations: { ...vm.tfObservations },
    executionNotes: vm.executionNotes,
    executionArrays: [...vm.executionArrays],
    screenshots: [...vm.screenshots],
  };
}

// ─── Draft → Supabase update payload ────────────────────────────────────────

/**
 * Converts a JournalEntryDraft into a flat object ready for
 * `supabase.from("trades").update(payload)`.
 *
 * Empty strings → null, empty arrays → null (matches original save logic).
 */
export function mapDraftToTradeUpdate(draft: JournalEntryDraft): Record<string, unknown> {
  return {
    notes: draft.notes || null,
    feelings: draft.feelings || null,
    observations: draft.observations || null,
    screenshots: draft.screenshots.length
      ? draft.screenshots.map((s) => ({ url: s.url, timeframe: s.timeframe }))
      : null,
    tf_observations: Object.keys(draft.tfObservations).length
      ? draft.tfObservations
      : null,
    setup_tags: draft.setupTags.length ? draft.setupTags : null,
    mistake_tags: draft.mistakeTags.length ? draft.mistakeTags : null,
    conviction: draft.conviction,
    entry_rating: draft.entryRating,
    exit_rating: draft.exitRating,
    mae: draft.mae,
    mfe: draft.mfe,
    execution_notes: draft.executionNotes || null,
    execution_arrays: draft.executionArrays.length ? draft.executionArrays : null,
  };
}

// ─── Journaled detection (moved from journal-library.tsx) ───────────────────

/** Returns true if the trade has any meaningful journal data filled in. */
export function isTradeJournaled(vm: JournalTradeViewModel): boolean {
  return !!(
    vm.notes ||
    vm.feelings ||
    vm.observations ||
    vm.executionNotes ||
    vm.conviction ||
    vm.setupTags.length > 0 ||
    vm.mistakeTags.length > 0 ||
    vm.screenshots.length > 0 ||
    vm.executionArrays.length > 0 ||
    Object.keys(vm.tfObservations).length > 0
  );
}

/** Convenience — same check on a raw Trade row (uses ViewModel internally) */
export function isRawTradeJournaled(t: Trade): boolean {
  return isTradeJournaled(mapTradeToViewModel(t));
}

// ─── Draft → API update payload (camelCase for Drizzle/REST) ────────────────

/**
 * Converts a JournalEntryDraft into a flat object for PATCH /api/trades/:id.
 * Uses camelCase keys matching the Drizzle schema.
 */
export function mapDraftToApiUpdate(draft: JournalEntryDraft): Record<string, unknown> {
  return {
    notes: draft.notes || null,
    feelings: draft.feelings || null,
    observations: draft.observations || null,
    screenshots: draft.screenshots.length
      ? draft.screenshots.map((s) => ({ url: s.url, timeframe: s.timeframe }))
      : null,
    tfObservations: Object.keys(draft.tfObservations).length
      ? draft.tfObservations
      : null,
    setupTags: draft.setupTags.length ? draft.setupTags : null,
    mistakeTags: draft.mistakeTags.length ? draft.mistakeTags : null,
    conviction: draft.conviction,
    entryRating: draft.entryRating,
    exitRating: draft.exitRating,
    mae: draft.mae,
    mfe: draft.mfe,
    executionNotes: draft.executionNotes || null,
    executionArrays: draft.executionArrays.length ? draft.executionArrays : null,
  };
}

// ─── TradeScreenshot interop ────────────────────────────────────────────────

/** Convert JournalScreenshot back to the SupabaseScreenshot shape for components
 *  that still expect the old interface during the migration period. */
export function toSupabaseScreenshot(s: JournalScreenshot): SupabaseScreenshot {
  return {
    id: s.id,
    trade_id: s.tradeId,
    url: s.url,
    timeframe: s.timeframe,
    created_at: s.createdAt,
  };
}
