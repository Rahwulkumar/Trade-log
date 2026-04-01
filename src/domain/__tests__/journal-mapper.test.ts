// Tests for journal-mapper.ts
// These are pure unit tests with no DOM dependency.

import {
  mapTradeToViewModel,
  viewModelToDraft,
  mapDraftToApiUpdate,
  mapDraftToTradeUpdate,
  isRawTradeJournaled,
  toSupabaseScreenshot,
} from "@/domain/journal-mapper";
import type { Trade } from "@/lib/db/schema";
import { EMPTY_JOURNAL_REVIEW } from "@/domain/journal-types";

// --- Minimal Trade fixture ---
function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: "t1",
    userId: "u1",
    symbol: "EURUSD",
    direction: "LONG",
    status: "CLOSED",
    pnl: "482.5",
    rMultiple: "2.4",
    entryPrice: "1.092",
    exitPrice: "1.0968",
    entryDate: new Date("2026-02-24T09:15:00Z"),
    exitDate: new Date("2026-02-24T14:30:00Z"),
    positionSize: "1.0",
    stopLoss: "1.09",
    takeProfit: "1.098",
    createdAt: new Date("2026-02-24T09:00:00Z"),
    notes: "Good trade",
    feelings: "Confident",
    observations: null,
    executionNotes: null,
    setupTags: ["FVG Entry"],
    mistakeTags: [],
    executionArrays: ["FVG", "OB"],
    screenshots: null,
    conviction: 5,
    entryRating: "Good",
    exitRating: "Good",
    managementRating: null,
    mae: 0.3,
    mfe: 2.8,
    tfObservations: null,
    journalReview: { ...EMPTY_JOURNAL_REVIEW },
    marketCondition: null,
    commission: null,
    swap: null,
    propAccountId: null,
    playbookId: null,
    chartData: null,
    lessonLearned: null,
    wouldTakeAgain: null,
    contractSize: null,
    assetType: null,
    externalTicket: null,
    externalId: null,
    externalDealId: null,
    mt5AccountId: null,
    magicNumber: null,
    pnlIncludesCosts: true,
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
    const vm = mapTradeToViewModel(makeTrade({ entryRating: "Good" }));
    expect(vm.entryRating).toBe(5);
  });

  it("prefers exact journal review scores when present", () => {
    const vm = mapTradeToViewModel(
      makeTrade({
        entryRating: "Good",
        journalReview: {
          ...EMPTY_JOURNAL_REVIEW,
          entryRatingScore: 4,
          exitRatingScore: 2,
        },
      }),
    );
    expect(vm.entryRating).toBe(4);
    expect(vm.exitRating).toBe(2);
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
    expect(draft.entryRating).toBe(5);
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
    expect(update).toHaveProperty("journal_review");
    expect(update).toHaveProperty("setup_tags");
    expect(update).toHaveProperty("mistake_tags");
  });

  it("stores compatibility rating labels and preserves exact scores", () => {
    const vm = mapTradeToViewModel(makeTrade());
    const draft = viewModelToDraft(vm);
    draft.entryRating = 4;
    draft.exitRating = 2;

    const update = mapDraftToTradeUpdate(draft);

    expect(update.entry_rating).toBe("Good");
    expect(update.exit_rating).toBe("Poor");
    expect(update.journal_review).toMatchObject({
      entryRatingScore: 4,
      exitRatingScore: 2,
    });
  });

  it("keeps empty screenshots and rule results as arrays for save compatibility", () => {
    const vm = mapTradeToViewModel(
      makeTrade({
        screenshots: null,
        tradeRuleResults: [],
      }),
    );
    const draft = viewModelToDraft(vm);

    expect(mapDraftToTradeUpdate(draft)).toMatchObject({
      screenshots: [],
      trade_rule_results: [],
    });
    expect(mapDraftToApiUpdate(draft)).toMatchObject({
      screenshots: [],
      tradeRuleResults: [],
    });
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
          executionNotes: null,
          conviction: null,
          setupTags: [],
          mistakeTags: [],
          executionArrays: [],
          screenshots: null,
          tfObservations: null,
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
          executionNotes: null,
          conviction: null,
          setupTags: ["FVG"],
          mistakeTags: [],
          executionArrays: [],
          screenshots: null,
          tfObservations: null,
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
