export const SUPPORTED_CHART_TIMEFRAMES = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
] as const;

export type ChartTimeframe = (typeof SUPPORTED_CHART_TIMEFRAMES)[number];

export const DEFAULT_CHART_TIMEFRAME: ChartTimeframe = "1m";

export const CHART_TIMEFRAME_LABELS: Record<ChartTimeframe, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "1h",
  "4h": "4h",
};

export const CHART_TIMEFRAME_INTERVALS: Record<ChartTimeframe, string> = {
  "1m": "1min",
  "5m": "5min",
  "15m": "15min",
  "30m": "30min",
  "1h": "1h",
  "4h": "4h",
};

const CHART_TIMEFRAME_MS: Record<ChartTimeframe, number> = {
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
};

export const CHART_TIMEFRAME_PADDING_BARS: Record<ChartTimeframe, number> = {
  "1m": 60,
  "5m": 48,
  "15m": 48,
  "30m": 48,
  "1h": 72,
  "4h": 42,
};

export function getChartTimeframeMs(timeframe: ChartTimeframe): number {
  return CHART_TIMEFRAME_MS[timeframe];
}

export function isChartTimeframe(value: string): value is ChartTimeframe {
  return (SUPPORTED_CHART_TIMEFRAMES as readonly string[]).includes(value);
}
