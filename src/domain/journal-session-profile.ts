import type { ChartCandle } from "@/lib/terminal-farm/types";

import type { JournalSessionState } from "@/domain/journal-types";

type SessionLabel = "Asia" | "London" | "New York" | "Overnight";

export interface JournalSessionProfile {
  priorSessionBehavior: string | null;
  sessionState: JournalSessionState | null;
  marketCondition: "Quiet" | "Normal" | "Expanded" | "News-driven" | null;
  summaryTags: string[];
}

interface SessionSlice {
  label: SessionLabel;
  candles: ChartCandle[];
  start: number;
  end: number;
  high: number;
  low: number;
  open: number;
  close: number;
  range: number;
}

const EST_TIME_ZONE = "America/New_York";

function toSessionLabel(candleTimeSeconds: number): SessionLabel {
  const date = new Date(candleTimeSeconds * 1000);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: EST_TIME_ZONE,
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
  });
  const [hourText, minuteText] = formatter.format(date).split(":");
  const minutes = Number(hourText) * 60 + Number(minuteText);

  if (minutes >= 20 * 60 || minutes < 2 * 60) {
    return "Asia";
  }
  if (minutes >= 2 * 60 && minutes < 5 * 60) {
    return "London";
  }
  if (minutes >= 8 * 60 && minutes < 11 * 60 + 30) {
    return "New York";
  }
  return "Overnight";
}

function buildSessionSlices(candles: ChartCandle[]): SessionSlice[] {
  const slices: SessionSlice[] = [];

  for (const candle of candles) {
    const label = toSessionLabel(candle.time);
    const lastSlice = slices.at(-1);
    if (!lastSlice || lastSlice.label !== label) {
      slices.push({
        label,
        candles: [candle],
        start: candle.time,
        end: candle.time,
        high: candle.high,
        low: candle.low,
        open: candle.open,
        close: candle.close,
        range: candle.high - candle.low,
      });
      continue;
    }

    lastSlice.candles.push(candle);
    lastSlice.end = candle.time;
    lastSlice.high = Math.max(lastSlice.high, candle.high);
    lastSlice.low = Math.min(lastSlice.low, candle.low);
    lastSlice.close = candle.close;
    lastSlice.range = lastSlice.high - lastSlice.low;
  }

  return slices.filter((slice) => slice.candles.length > 0);
}

function classifySlice(
  slice: SessionSlice,
  direction: "LONG" | "SHORT",
): JournalSessionState {
  if (slice.range <= 0) {
    return "ranging";
  }

  const delta = slice.close - slice.open;
  const bodyRatio = Math.abs(delta) / slice.range;

  if (bodyRatio < 0.28) {
    return "ranging";
  }

  const tradeBias = direction === "LONG" ? 1 : -1;
  return Math.sign(delta) === tradeBias ? "continuation" : "reversal";
}

function classifyMarketCondition(
  slices: SessionSlice[],
): "Quiet" | "Normal" | "Expanded" | "News-driven" | null {
  if (slices.length === 0) {
    return null;
  }

  const lastSlice = slices.at(-1);
  if (!lastSlice) {
    return null;
  }

  const ranges = slices.map((slice) => slice.range).filter((value) => value > 0);
  if (ranges.length === 0) {
    return "Quiet";
  }

  const averageRange =
    ranges.reduce((total, value) => total + value, 0) / ranges.length;
  if (averageRange <= 0) {
    return "Quiet";
  }

  const ratio = lastSlice.range / averageRange;
  const tailCandle = lastSlice.candles.at(-1);
  const tailBody =
    tailCandle != null
      ? Math.abs(tailCandle.close - tailCandle.open) / Math.max(lastSlice.range, 0.0001)
      : 0;

  if (ratio >= 2.2 || tailBody >= 0.82) {
    return "News-driven";
  }
  if (ratio >= 1.45) {
    return "Expanded";
  }
  if (ratio <= 0.65) {
    return "Quiet";
  }
  return "Normal";
}

function describeSlice(slice: SessionSlice, state: JournalSessionState) {
  const directionText =
    state === "continuation"
      ? "continued with direction"
      : state === "reversal"
        ? "reversed against the prior push"
        : "stayed in range";

  return `${slice.label} ${directionText} over ${slice.candles.length} candles`;
}

export function deriveJournalSessionProfile(
  candles: ChartCandle[],
  entryTime: string | null,
  direction: "LONG" | "SHORT",
): JournalSessionProfile {
  if (!entryTime) {
    return {
      priorSessionBehavior: null,
      sessionState: null,
      marketCondition: null,
      summaryTags: [],
    };
  }

  const entryTimestamp = new Date(entryTime).getTime() / 1000;
  if (!Number.isFinite(entryTimestamp)) {
    return {
      priorSessionBehavior: null,
      sessionState: null,
      marketCondition: null,
      summaryTags: [],
    };
  }

  const preEntryCandles = candles.filter((candle) => candle.time <= entryTimestamp);
  const slices = buildSessionSlices(preEntryCandles).filter(
    (slice) => slice.label !== "Overnight",
  );

  if (slices.length === 0) {
    return {
      priorSessionBehavior: null,
      sessionState: null,
      marketCondition: null,
      summaryTags: [],
    };
  }

  const relevantSlices = slices.slice(-2);
  const latestSlice = relevantSlices.at(-1) ?? null;
  const latestState = latestSlice ? classifySlice(latestSlice, direction) : null;
  const marketCondition = classifyMarketCondition(relevantSlices);
  const priorSessionBehavior = relevantSlices
    .map((slice) => describeSlice(slice, classifySlice(slice, direction)))
    .join(". ");

  return {
    priorSessionBehavior: priorSessionBehavior || null,
    sessionState: latestState,
    marketCondition,
    summaryTags: relevantSlices.map((slice) => slice.label),
  };
}
