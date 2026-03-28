/**
 * Trade Pricing API Utility
 *
 * Fetches historical candles for trade chart visualization.
 * Uses database-first caching (per trade + timeframe) to minimize repeat MT5/API calls.
 */

import {
  CHART_TIMEFRAME_INTERVALS,
  CHART_TIMEFRAME_PADDING_BARS,
  DEFAULT_CHART_TIMEFRAME,
  getChartTimeframeMs,
  type ChartTimeframe,
} from '@/lib/chart/timeframes';
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
  source?: 'cache' | 'mt5' | 'external';
  timeframe?: ChartTimeframe;
}

const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';

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
        source: 'cache',
        timeframe,
      };
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

    const normalizedSymbol = normalizeSymbol(symbol);
    const candles = await fetchFromTwelveData(
      normalizedSymbol,
      timeframe,
      start,
      end,
    );

    if (candles.length === 0) {
      return {
        candles: [],
        cached: false,
        error: 'No chart data is available for this trade yet.',
        timeframe,
      };
    }

    await saveTradeChartCache({
      tradeId,
      timeframe,
      symbol: normalizedSymbol,
      candles,
      source: 'external',
    });

    return {
      candles,
      cached: false,
      source: 'external',
      timeframe,
    };
  } catch (error) {
    if (error instanceof TwelveDataRateLimitError) {
      return { candles: [], cached: false, rateLimited: true, timeframe };
    }

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

class TwelveDataRateLimitError extends Error {
  constructor() {
    super('Twelve Data rate limit reached');
    this.name = 'TwelveDataRateLimitError';
  }
}

async function fetchFromTwelveData(
  symbol: string,
  timeframe: ChartTimeframe,
  startTime: Date,
  endTime: Date,
): Promise<ChartCandle[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('Twelve Data API key not configured');
  }

  const formatDate = (d: Date) => d.toISOString().replace('T', ' ').substring(0, 19);
  const params = new URLSearchParams({
    symbol,
    interval: CHART_TIMEFRAME_INTERVALS[timeframe],
    start_date: formatDate(startTime),
    end_date: formatDate(endTime),
    apikey: apiKey,
    format: 'JSON',
    order: 'ASC',
  });

  const response = await fetch(`${TWELVE_DATA_BASE_URL}/time_series?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.status === 429) throw new TwelveDataRateLimitError();
  if (!response.ok) {
    throw new Error(`Twelve Data API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status === 'error') {
    if (data.code === 429) throw new TwelveDataRateLimitError();
    throw new Error(`Twelve Data error: ${data.message || 'Unknown error'}`);
  }

  if (!Array.isArray(data.values)) {
    return [];
  }

  return data.values
    .map((candle: {
      datetime: string;
      open: string;
      high: string;
      low: string;
      close: string;
      volume?: string;
    }) => ({
      time: Math.floor(new Date(candle.datetime).getTime() / 1000),
      open: Number.parseFloat(candle.open),
      high: Number.parseFloat(candle.high),
      low: Number.parseFloat(candle.low),
      close: Number.parseFloat(candle.close),
      ...(candle.volume != null
        ? { volume: Number.parseFloat(candle.volume) }
        : {}),
    }))
    .filter((candle: ChartCandle) => Number.isFinite(candle.time));
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
