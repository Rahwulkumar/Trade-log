/**
 * Trade Pricing API Utility
 *
 * Fetches historical candles for trade chart visualization.
 * Uses database-first caching (per trade + timeframe) to minimize repeat MT5/API calls.
 */

import {
  CHART_TIMEFRAME_PADDING_BARS,
  DEFAULT_CHART_TIMEFRAME,
  getChartTimeframeMs,
  type ChartTimeframe,
} from '@/lib/chart/timeframes';
import { aggregateChartCandles } from '@/lib/chart/aggregate';
import {
  clearTradeChartCache,
  getCachedTradeChart,
  hasTradeChartCache,
  saveTradeChartCache,
} from '@/lib/chart/cache';
import type { ChartCandle } from '@/lib/terminal-farm/types';
import { queueFetchCandles } from '@/lib/terminal-farm/service';

export interface ChartDataResult {
  candles: ChartCandle[];
  cached?: boolean;
  error?: string;
  rateLimited?: boolean;
  pending?: boolean;
  source?: 'mt5' | 'derived';
  timeframe?: ChartTimeframe;
}

export async function getTradeChartData(
  tradeId: string,
  symbol: string,
  entryTime: string,
  exitTime: string,
  timeframe: ChartTimeframe = DEFAULT_CHART_TIMEFRAME,
): Promise<ChartDataResult> {
  try {
    const cached = await getCachedTradeChart(tradeId, timeframe);
    if (cached) {
      return {
        candles: cached.candles,
        cached: true,
        source: cached.source === 'derived_from_1m' ? 'derived' : 'mt5',
        timeframe,
      };
    }

    if (timeframe !== DEFAULT_CHART_TIMEFRAME) {
      const oneMinuteCache = await getCachedTradeChart(
        tradeId,
        DEFAULT_CHART_TIMEFRAME,
      );

      if (oneMinuteCache) {
        const derivedCandles = aggregateChartCandles(
          oneMinuteCache.candles,
          timeframe,
        );

        if (derivedCandles.length > 0) {
          await saveTradeChartCache({
            tradeId,
            timeframe,
            symbol: oneMinuteCache.symbol || normalizeSymbol(symbol),
            candles: derivedCandles,
            source: 'derived_from_1m',
          });

          return {
            candles: derivedCandles,
            cached: true,
            source: 'derived',
            timeframe,
          };
        }
      }
    }

    const { start, end } = calculatePrecisionWindow(entryTime, exitTime, timeframe);
    const queuedMt5Request = await queueFetchCandles(
      tradeId,
      symbol,
      timeframe,
      start,
      end,
    );

    if (queuedMt5Request) {
      return {
        candles: [],
        cached: false,
        pending: true,
        source: 'mt5',
        timeframe,
      };
    }

    return {
      candles: [],
      cached: false,
      error:
        'MT5 chart data is not ready for this trade yet. Keep the worker running and refresh again.',
      timeframe,
    };
  } catch (error) {
    console.error('[Pricing] Unexpected error:', error);
    return {
      candles: [],
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timeframe,
    };
  }
}

function calculatePrecisionWindow(
  entryTime: string,
  exitTime: string,
  timeframe: ChartTimeframe,
): { start: Date; end: Date } {
  const entry = new Date(entryTime);
  const exit = new Date(exitTime);

  if (Number.isNaN(entry.getTime()) || Number.isNaN(exit.getTime())) {
    throw new Error('Invalid entry or exit time');
  }

  const paddingMs =
    getChartTimeframeMs(timeframe) * CHART_TIMEFRAME_PADDING_BARS[timeframe];

  return {
    start: new Date(entry.getTime() - paddingMs),
    end: new Date(exit.getTime() + paddingMs),
  };
}

function normalizeSymbol(symbol: string): string {
  if (!symbol) return '';

  const baseSymbol = symbol.split('.')[0].toUpperCase();
  const cleaned = baseSymbol.replace(/[^A-Z0-9]/g, '');

  const indexMappings: Record<string, string> = {
    US30: 'DJI',
    US100: 'NDX',
    NAS100: 'NDX',
    NAS: 'NDX',
    SPX500: 'SPX',
    US500: 'SPX',
    GER30: 'DAX',
    GER40: 'DAX',
    DE30: 'DAX',
    UK100: 'FTSE',
    EUSTX50: 'STOXX50',
    FRA40: 'PX1',
    JPN225: 'NI225',
    HK33: 'HSI',
    AUS200: 'XJO',
    ESP35: 'IBEX',
    VIX: 'VIX',
    GOLD: 'XAU/USD',
    SILVER: 'XAG/USD',
    WTI: 'WTI/USD',
    BRENT: 'BRENT/USD',
  };

  if (indexMappings[cleaned]) return indexMappings[cleaned];

  const metalsMatch = cleaned.match(/^(XAU|XAG)(USD|EUR|GBP)$/);
  if (metalsMatch) return `${metalsMatch[1]}/${metalsMatch[2]}`;

  const forexMatch = cleaned.match(/^([A-Z]{3})(USD|EUR|GBP|JPY|CHF|AUD|NZD|CAD)$/);
  if (forexMatch) return `${forexMatch[1]}/${forexMatch[2]}`;

  const cryptoMatch = cleaned.match(/^([A-Z]{3,5})(USD|USDT)$/);
  if (cryptoMatch) return `${cryptoMatch[1]}/${cryptoMatch[2]}`;

  return cleaned;
}

export async function hasChartData(
  tradeId: string,
  timeframe: ChartTimeframe = DEFAULT_CHART_TIMEFRAME,
): Promise<boolean> {
  return hasTradeChartCache(tradeId, timeframe);
}

export async function clearChartDataCache(
  tradeId: string,
  timeframe?: ChartTimeframe,
): Promise<void> {
  await clearTradeChartCache(tradeId, timeframe);
}
