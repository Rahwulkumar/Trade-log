// Tests for shared format utilities
// Pure unit tests — no DOM, no React needed.

import {
  fmtCurrency,
  fmtR,
  fmtDate,
  fmtDateShort,
  getOutcome,
} from "@/components/journal/utils/format";

describe("fmtCurrency", () => {
  it("formats positive values with + prefix", () => {
    expect(fmtCurrency(482.5)).toBe("+$482.50");
  });

  it("formats negative values without + prefix", () => {
    expect(fmtCurrency(-218)).toBe("-$218.00");
  });

  it("formats zero as +$0.00", () => {
    expect(fmtCurrency(0)).toBe("+$0.00");
  });

  it("returns dash for null/undefined", () => {
    expect(fmtCurrency(null)).toBe("—");
    expect(fmtCurrency(undefined)).toBe("—");
  });
});

describe("fmtR", () => {
  it("formats positive R with + prefix", () => {
    expect(fmtR(2.4)).toBe("+2.40R");
  });

  it("formats negative R without + prefix", () => {
    expect(fmtR(-1.0)).toBe("-1.00R");
  });

  it("returns null for null input", () => {
    expect(fmtR(null)).toBeNull();
    expect(fmtR(undefined)).toBeNull();
  });
});

describe("fmtDate", () => {
  it("formats ISO date string to readable format", () => {
    const result = fmtDate("2026-02-24T09:15:00Z");
    // Should include month and year
    expect(result).toMatch(/Feb/);
    expect(result).toMatch(/2026/);
  });

  it("returns dash for null/undefined", () => {
    expect(fmtDate(null)).toBe("—");
    expect(fmtDate(undefined)).toBe("—");
  });
});

describe("fmtDateShort", () => {
  it("formats ISO date string to short format", () => {
    const result = fmtDateShort("2026-02-24T09:15:00Z");
    expect(result).toMatch(/Feb/);
    // Should NOT include year
    expect(result).not.toMatch(/2026/);
  });

  it("returns dash for falsy input", () => {
    expect(fmtDateShort("")).toBe("—");
  });
});

describe("getOutcome", () => {
  it("returns OPEN for open status", () => {
    expect(getOutcome("open", 500)).toBe("OPEN");
  });

  it("returns WIN for positive pnl", () => {
    expect(getOutcome("closed", 482.5)).toBe("WIN");
  });

  it("returns LOSS for negative pnl", () => {
    expect(getOutcome("closed", -218)).toBe("LOSS");
  });

  it("returns BE for near-zero pnl", () => {
    expect(getOutcome("closed", 0)).toBe("BE");
    expect(getOutcome("closed", 0.1)).toBe("BE");
    expect(getOutcome("closed", -0.1)).toBe("BE");
  });

  it("returns WIN for exactly 0.51", () => {
    expect(getOutcome("closed", 0.51)).toBe("WIN");
  });

  it("returns LOSS for exactly -0.51", () => {
    expect(getOutcome("closed", -0.51)).toBe("LOSS");
  });
});
