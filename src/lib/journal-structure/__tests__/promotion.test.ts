import {
  buildPromotionCandidates,
  normalizePromotionLabel,
} from "@/lib/journal-structure/promotion";

describe("buildPromotionCandidates", () => {
  it("counts repeated labels by unique trade instead of raw occurrences", () => {
    const candidates = buildPromotionCandidates(
      [
        {
          tradeId: "t-1",
          label: "Liquidity Sweep",
          source: "setup note",
          playbookId: "p-1",
          playbookName: "London Reversal",
        },
        {
          tradeId: "t-1",
          label: "Liquidity Sweep",
          source: "setup tag",
          playbookId: "p-1",
          playbookName: "London Reversal",
        },
        {
          tradeId: "t-2",
          label: "Liquidity Sweep",
          source: "setup tag",
          playbookId: "p-1",
          playbookName: "London Reversal",
        },
      ],
      [],
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      label: "Liquidity Sweep",
      count: 2,
      suggestedPlaybookId: "p-1",
      suggestedPlaybookName: "London Reversal",
    });
    expect(candidates[0]?.sources).toEqual(["setup note", "setup tag"]);
  });

  it("filters out labels that already exist in the structured library", () => {
    const candidates = buildPromotionCandidates(
      [
        {
          tradeId: "t-1",
          label: " FVG Entry ",
          source: "setup tag",
          playbookId: null,
          playbookName: null,
        },
        {
          tradeId: "t-2",
          label: "FVG   Entry",
          source: "setup tag",
          playbookId: null,
          playbookName: null,
        },
      ],
      [normalizePromotionLabel("fvg entry")],
    );

    expect(candidates).toEqual([]);
  });
});
