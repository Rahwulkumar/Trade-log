import {
  buildCalendarReviewMonth,
  getCalendarMonthLabel,
  getCalendarMonthQueryRange,
  getCurrentCalendarMonthKey,
  getCalendarGridDays,
  shiftCalendarMonthKey,
} from "@/lib/calendar/review";
import type { Trade } from "@/lib/db/schema";

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: "trade-1",
    userId: "user-1",
    symbol: "XAUUSD",
    direction: "LONG",
    status: "CLOSED",
    pnl: "-120.5",
    rMultiple: "-1.2",
    entryPrice: "3012.5",
    exitPrice: "3008.2",
    entryDate: new Date("2026-03-15T14:00:00.000Z"),
    exitDate: new Date("2026-03-15T15:00:00.000Z"),
    positionSize: "1.0",
    stopLoss: "3009",
    takeProfit: "3018",
    createdAt: new Date("2026-03-15T13:30:00.000Z"),
    notes: null,
    feelings: null,
    observations: null,
    executionNotes: null,
    setupTags: [],
    mistakeTags: [],
    executionArrays: [],
    screenshots: null,
    conviction: null,
    entryRating: null,
    exitRating: null,
    managementRating: null,
    mae: null,
    mfe: null,
    tfObservations: null,
    journalReview: null,
    marketCondition: null,
    commission: null,
    swap: null,
    propAccountId: null,
    playbookId: null,
    setupDefinitionId: null,
    mistakeDefinitionIds: [],
    journalTemplateId: null,
    ruleSetId: "rule-set-1",
    tradeRuleResults: [],
    journalTemplateSnapshot: null,
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
    session: null,
    ...overrides,
  } as Trade;
}

describe("calendar review date helpers", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("resolves the current month key in UTC-4 instead of local browser month", () => {
    jest.setSystemTime(new Date("2026-03-01T02:30:00.000Z"));

    expect(getCurrentCalendarMonthKey("Etc/GMT+4")).toBe("2026-02");
  });

  it("shifts month keys without local Date drift", () => {
    expect(shiftCalendarMonthKey("2026-03", -1)).toBe("2026-02");
    expect(shiftCalendarMonthKey("2026-12", 1)).toBe("2027-01");
  });

  it("builds stable month labels, ranges, and grid size for a month key", () => {
    const range = getCalendarMonthQueryRange("2026-03");
    const grid = getCalendarGridDays("2026-03");

    expect(range.from).toBe("2026-03-01");
    expect(range.to).toBe("2026-03-31");
    expect(range.fetchFrom).toBe("2026-02-28");
    expect(range.fetchTo).toBe("2026-04-01");
    expect(getCalendarMonthLabel("2026-03", "Etc/GMT+4")).toBe("March 2026");
    expect(grid).toHaveLength(42);
  });
});

describe("buildCalendarReviewMonth", () => {
  it("flags broken global rules inside the month review", () => {
    const trades = [
      makeTrade({
        id: "trade-1",
        pnl: "-120.5",
        tradeRuleResults: [
          {
            ruleItemId: "11111111-1111-1111-1111-111111111111",
            title: "No revenge trading",
            category: "discipline",
            severity: "high",
            status: "broken",
          },
          {
            ruleItemId: "22222222-2222-2222-2222-222222222222",
            title: "Wait for A+ setup",
            category: "setup",
            severity: "high",
            status: "broken",
          },
        ],
      }),
      makeTrade({
        id: "trade-2",
        pnl: "-30",
        entryDate: new Date("2026-03-15T16:00:00.000Z"),
        exitDate: new Date("2026-03-15T17:00:00.000Z"),
        tradeRuleResults: [],
      }),
    ];

    const result = buildCalendarReviewMonth({
      currentMonthKey: "2026-03",
      trades,
      setupNames: new Map(),
      templateNames: new Map(),
      ruleSetNames: new Map([["rule-set-1", "Core Rules"]]),
      timeZone: "Etc/GMT+4",
      dateMode: "entry",
      globalRules: ["No revenge trading", "Protect capital"],
    });

    const targetDay = result.days.find((day) => day.dateKey === "2026-03-15");
    expect(targetDay).toBeTruthy();
    expect(targetDay?.violatedGlobalRules).toEqual(["No revenge trading"]);
    expect(targetDay?.flaggedViolationsCount).toBe(1);
    expect(result.summary.flaggedViolationDays).toBe(1);
  });
});
