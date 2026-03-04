// Tests for journal-mapper.ts
// These are pure unit tests with no DOM dependency.

import {
  mapTradeToViewModel,
  viewModelToDraft,
  mapDraftToTradeUpdate,
  isRawTradeJournaled,
  toSupabaseScreenshot,
} from "@/domain/journal-mapper";
import type { Trade } from "@/lib/supabase/types";

// --- Minimal Trade fixture ---
function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: "t1",
    user_id: "u1",
    symbol: "EURUSD",
    direction: "LONG",
    status: "closed",
    pnl: 482.5,
    r_multiple: 2.4,
    entry_price: 1.092,
    exit_price: 1.0968,
    entry_date: "2026-02-24T09:15:00Z",
    exit_date: "2026-02-24T14:30:00Z",
    position_size: 1.0,
    stop_loss: 1.09,
    take_profit: 1.098,
    created_at: "2026-02-24T09:00:00Z",
    // Journal fields
    notes: "Good trade",
    feelings: "Confident",
    observations: null,
    execution_notes: null,
    setup_tags: ["FVG Entry"],
    mistake_tags: [],
    execution_arrays: ["FVG", "OB"],
    screenshots: null,
    conviction: 5,
    entry_rating: "Good",
    exit_rating: "Good",
    mae: 0.3,
    mfe: 2.8,
    tf_observations: null,
    // Other DB fields
    commission: null,
    swap: null,
    prop_account_id: null,
    playbook_id: null,
    chart_data: null,
    ...overrides,
  } as Trade;
}

describe("mapTradeToViewModel", () => {
  it("maps basic trade fields correctly", () => {
    const trade = makeTrade();
    const vm = mapTradeToViewModel(trade);
    expect(vm.id).toBe("t1");
    expect(vm.symbol).toBe("EURUSD");
    expect(vm.direction).toBe("LONG");
    expect(vm.pnl).toBe(482.5);
    expect(vm.rMultiple).toBe(2.4);
  });

  it("converts entry_rating string to QualityRating", () => {
    const vm = mapTradeToViewModel(makeTrade({ entry_rating: "Good" }));
    expect(vm.entryRating).toBe("Good");
  });

  it("handles null pnl gracefully", () => {
    const vm = mapTradeToViewModel(makeTrade({ pnl: null }));
    expect(vm.pnl).toBeNull();
  });
});

describe("viewModelToDraft", () => {
  it("produces a valid JournalEntryDraft from a ViewModel", () => {
    const vm = mapTradeToViewModel(makeTrade());
    const draft = viewModelToDraft(vm);
    expect(draft.notes).toBe("Good trade");
    expect(draft.feelings).toBe("Confident");
    expect(draft.entryRating).toBe("Good");
    expect(draft.conviction).toBe(5);
    expect(draft.setupTags).toEqual(["FVG Entry"]);
  });
});

describe("mapDraftToTradeUpdate", () => {
  it("round-trips through draft and back with correct keys", () => {
    const vm = mapTradeToViewModel(
      makeTrade({ notes: "Updated note", conviction: 4 })
    );
    const draft = viewModelToDraft(vm);
    const update = mapDraftToTradeUpdate(draft);
    expect(update.notes).toBe("Updated note");
    expect(update.conviction).toBe(4);
    // Should use snake_case DB column names
    expect(update).toHaveProperty("setup_tags");
    expect(update).toHaveProperty("mistake_tags");
  });
});

describe("isRawTradeJournaled", () => {
  it("returns true when notes are present", () => {
    expect(isRawTradeJournaled(makeTrade({ notes: "Some notes" }))).toBe(true);
  });

  it("returns false when no journal fields filled", () => {
    expect(
      isRawTradeJournaled(
        makeTrade({
          notes: null,
          feelings: null,
          observations: null,
          execution_notes: null,
          conviction: null,
          setup_tags: [],
          mistake_tags: [],
          execution_arrays: [],
          screenshots: null,
          tf_observations: null,
        })
      )
    ).toBe(false);
  });

  it("returns true when setup_tags has items", () => {
    expect(
      isRawTradeJournaled(
        makeTrade({
          notes: null,
          feelings: null,
          observations: null,
          execution_notes: null,
          conviction: null,
          setup_tags: ["FVG"],
          mistake_tags: [],
          execution_arrays: [],
          screenshots: null,
          tf_observations: null,
        })
      )
    ).toBe(true);
  });
});

describe("toSupabaseScreenshot", () => {
  it("maps JournalScreenshot to TradeScreenshot shape", () => {
    const ss = toSupabaseScreenshot({
      id: "ss-1",
      tradeId: "t1",
      url: "https://example.com/img.jpg",
      timeframe: "4H",
      createdAt: "2026-01-01T00:00:00Z",
    });
    expect(ss.url).toBe("https://example.com/img.jpg");
    expect(ss.timeframe).toBe("4H");
  });
});
