/**
 * Trade Pricing API Utility
 *
 * Fetches 1-minute historical candles for trade chart visualization.
 * Uses database-first caching (Drizzle/Neon) to minimize API calls to Twelve Data.
 *
 * Usage:
 *   const result = await getTradeChartData(tradeId, 'EURUSD', entryTime, exitTime);
 *   if (result.rateLimited) showRateLimitMessage();
 *   chartComponent.setData(result.candles);
 */

import { db } from '@/lib/db';
import { trades } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { ChartCandle } from '@/lib/terminal-farm/types';

/** Shape of chart data cached in the `chart_data` column of the trades table. */
interface ChartData {
    candles: ChartCandle[];
    symbol: string;
    fetched_at: string;
}

/** Result returned by {@link getTradeChartData}. */
interface ChartDataResult {
    candles: ChartCandle[];
    cached?: boolean;
    error?: string;
    rateLimited?: boolean;
}

const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';
const PRECISION_WINDOW_HOURS = 1; // Hours before/after trade

/**
 * Main function: Get candle data for trade chart
 *
 * @param tradeId - UUID of the trade
 * @param symbol - Trading symbol (e.g., 'EURUSD', 'XAUUSD', 'NAS100')
 * @param entryTime - ISO timestamp of trade entry
 * @param exitTime - ISO timestamp of trade exit
 * @returns ChartDataResult with candles array and status flags
 */
export async function getTradeChartData(
    tradeId: string,
    symbol: string,
    entryTime: string,
    exitTime: string
): Promise<ChartDataResult> {
    try {
        // Step 1: Check database cache first
        const [row] = await db
            .select({ chartData: trades.chartData })
            .from(trades)
            .where(eq(trades.id, tradeId))
            .limit(1);

        if (!row) {
            return { candles: [], cached: false, error: 'Trade not found' };
        }

        // Step 2: If cached data exists, return immediately
        const chartData = row.chartData as ChartData | null;
        if (chartData?.candles && Array.isArray(chartData.candles) && chartData.candles.length > 0) {
            console.log(`[Pricing] Returning cached data for trade ${tradeId}`);
            return { candles: chartData.candles as ChartCandle[], cached: true };
        }

        // Step 3: Calculate precision window
        const { start, end } = calculatePrecisionWindow(entryTime, exitTime);

        // Step 4: Fetch from Twelve Data
        const normalizedSymbol = normalizeSymbol(symbol);
        const candles = await fetchFromTwelveData(normalizedSymbol, start, end);

        if (candles.length === 0) {
            return { candles: [], cached: false, error: 'No data available for this symbol/timeframe' };
        }

        // Step 5: Cache the result in the database
        const newChartData: ChartData = {
            candles,
            symbol: normalizedSymbol,
            fetched_at: new Date().toISOString(),
        };

        try {
            await db
                .update(trades)
                .set({ chartData: newChartData })
                .where(eq(trades.id, tradeId));
            console.log(`[Pricing] Cached ${candles.length} candles for trade ${tradeId}`);
        } catch (cacheErr) {
            console.error('[Pricing] Error caching chart data:', cacheErr);
            // Continue — we still have the data to return
        }

        return { candles, cached: false };

    } catch (error) {
        // Handle rate limit specifically
        if (error instanceof TwelveDataRateLimitError) {
            console.warn('[Pricing] Rate limit reached');
            return { candles: [], cached: false, rateLimited: true };
        }

        console.error('[Pricing] Unexpected error:', error);
        return {
            candles: [],
            cached: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Calculate the precision window for chart display
 * 1 hour before entry to 1 hour after exit
 */
function calculatePrecisionWindow(entryTime: string, exitTime: string): { start: Date; end: Date } {
    const entry = new Date(entryTime);
    const exit = new Date(exitTime);

    if (isNaN(entry.getTime()) || isNaN(exit.getTime())) {
        throw new Error('Invalid entry or exit time');
    }

    const start = new Date(entry.getTime() - PRECISION_WINDOW_HOURS * 60 * 60 * 1000);
    const end = new Date(exit.getTime() + PRECISION_WINDOW_HOURS * 60 * 60 * 1000);

    return { start, end };
}

/**
 * Normalize symbol format for Twelve Data API
 */
function normalizeSymbol(symbol: string): string {
    if (!symbol) return '';

    const baseSymbol = symbol.split('.')[0].toUpperCase();
    const cleaned = baseSymbol.replace(/[^A-Z0-9]/g, '');

    const indexMappings: Record<string, string> = {
        'US30': 'DJI',
        'US100': 'NDX',
        'NAS100': 'NDX',
        'NAS': 'NDX',
        'SPX500': 'SPX',
        'US500': 'SPX',
        'GER30': 'DAX',
        'GER40': 'DAX',
        'DE30': 'DAX',
        'UK100': 'FTSE',
        'EUSTX50': 'STOXX50',
        'FRA40': 'PX1',
        'JPN225': 'NI225',
        'HK33': 'HSI',
        'AUS200': 'XJO',
        'ESP35': 'IBEX',
        'VIX': 'VIX',
        'GOLD': 'XAU/USD',
        'SILVER': 'XAG/USD',
        'WTI': 'WTI/USD',
        'BRENT': 'BRENT/USD',
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
    startTime: Date,
    endTime: Date
): Promise<ChartCandle[]> {
    const apiKey = process.env.TWELVE_DATA_API_KEY?.trim();

    if (!apiKey) {
        console.error('[Pricing] TWELVE_DATA_API_KEY not configured');
        throw new Error('Twelve Data API key not configured');
    }

    const formatDate = (d: Date) => d.toISOString().replace('T', ' ').substring(0, 19);

    const params = new URLSearchParams({
        symbol,
        interval: '1min',
        start_date: formatDate(startTime),
        end_date: formatDate(endTime),
        apikey: apiKey,
        format: 'JSON',
        order: 'ASC',
    });

    const url = `${TWELVE_DATA_BASE_URL}/time_series?${params}`;
    console.log(`[Pricing] Fetching from Twelve Data: ${symbol} from ${startTime.toISOString()} to ${endTime.toISOString()}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (response.status === 429) throw new TwelveDataRateLimitError();
    if (!response.ok) throw new Error(`Twelve Data API error: ${response.status} ${response.statusText}`);

    const data = await response.json();

    if (data.status === 'error') {
        if (data.code === 429) throw new TwelveDataRateLimitError();
        throw new Error(`Twelve Data error: ${data.message || 'Unknown error'}`);
    }

    if (!data.values || !Array.isArray(data.values)) {
        console.warn('[Pricing] No candle data in response:', data);
        return [];
    }

    const candles: ChartCandle[] = data.values.map((candle: {
        datetime: string;
        open: string;
        high: string;
        low: string;
        close: string;
    }) => ({
        time: Math.floor(new Date(candle.datetime).getTime() / 1000),
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
    }));

    console.log(`[Pricing] Fetched ${candles.length} candles from Twelve Data`);
    return candles;
}

export async function hasChartData(tradeId: string): Promise<boolean> {
    const [row] = await db
        .select({ chartData: trades.chartData })
        .from(trades)
        .where(eq(trades.id, tradeId))
        .limit(1);

    const chartData = row?.chartData as ChartData | null;
    return !!(chartData?.candles?.length);
}

export async function clearChartDataCache(tradeId: string): Promise<void> {
    try {
        await db
            .update(trades)
            .set({ chartData: null })
            .where(eq(trades.id, tradeId));
    } catch (error) {
        console.error('[Pricing] Error clearing chart data cache:', error);
    }
}
