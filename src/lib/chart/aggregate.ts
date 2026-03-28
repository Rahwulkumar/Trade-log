import type { ChartTimeframe } from '@/lib/chart/timeframes';
import { DEFAULT_CHART_TIMEFRAME, getChartTimeframeMs } from '@/lib/chart/timeframes';
import type { ChartCandle } from '@/lib/terminal-farm/types';

function sortCandlesAsc(candles: ChartCandle[]): ChartCandle[] {
  return [...candles].sort((left, right) => left.time - right.time);
}

export function aggregateChartCandles(
  candles: ChartCandle[],
  timeframe: ChartTimeframe,
): ChartCandle[] {
  if (timeframe === DEFAULT_CHART_TIMEFRAME || candles.length === 0) {
    return sortCandlesAsc(candles);
  }

  const bucketSeconds = getChartTimeframeMs(timeframe) / 1000;
  const aggregated = new Map<number, ChartCandle>();

  for (const candle of sortCandlesAsc(candles)) {
    const bucketTime = Math.floor(candle.time / bucketSeconds) * bucketSeconds;
    const existing = aggregated.get(bucketTime);

    if (!existing) {
      aggregated.set(bucketTime, {
        time: bucketTime,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        ...(candle.volume != null ? { volume: candle.volume } : {}),
      });
      continue;
    }

    existing.high = Math.max(existing.high, candle.high);
    existing.low = Math.min(existing.low, candle.low);
    existing.close = candle.close;

    if (candle.volume != null) {
      existing.volume = (existing.volume ?? 0) + candle.volume;
    }
  }

  return Array.from(aggregated.values()).sort((left, right) => left.time - right.time);
}
