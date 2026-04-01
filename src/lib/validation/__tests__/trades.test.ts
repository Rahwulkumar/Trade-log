import { parseTradeUpdatePayload } from "@/lib/validation/trades";

describe("parseTradeUpdatePayload", () => {
  it("normalizes nullable journal arrays into empty arrays", () => {
    const result = parseTradeUpdatePayload({
      screenshots: null,
      tradeRuleResults: null,
      mistakeDefinitionIds: null,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).toMatchObject({
      screenshots: [],
      tradeRuleResults: [],
      mistakeDefinitionIds: [],
    });
  });
});
