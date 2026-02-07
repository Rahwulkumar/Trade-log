/**
 * Trade Pricing API Utility
 * 
 * Fetches 1-minute historical candles for trade chart visualization.
 * Uses database-first caching to minimize API calls to Twelve Data.
 * 
 * Usage:
 *   const result = await getTradeChartData(tradeId, 'EURUSD', entryTime, exitTime);
 *   if (result.rateLimited) showRateLimitMessage();
 *   chartComponent.setData(result.candles);
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { ChartData } from '@/lib/supabase/types';
import type { ChartCandle, ChartDataResult } from '@/lib/terminal-farm/types';

const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';
const PRECISION_WINDOW_HOURS = 1; // Hours before/after trade

/**
 * Main function: Get candle data for trade chart
 * 
 * @param tradeId - UUID of the trade in Supabase
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
    const supabase = createAdminClient();

    try {
        // Step 1: Check database cache first
        // Note: chart_data column added by migration 20260131000000_trade_review_canvas.sql
        const { data: trade, error: fetchError } = await supabase
            .from('trades')
            .select('chart_data')
            .eq('id', tradeId)
            .single();

        if (fetchError) {
            console.error('[Pricing] Error fetching trade:', fetchError);
            return { candles: [], cached: false, error: 'Trade not found' };
        }

        // Step 2: If cached data exists, return immediately
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tradeData = trade as any;
        const chartData = tradeData?.chart_data as ChartData | null;
        if (chartData?.candles && Array.isArray(chartData.candles)) {
            console.log(`[Pricing] Returning cached data for trade ${tradeId}`);
            return {
                candles: chartData.candles as ChartCandle[],
                cached: true,
            };
        }

        // Step 3: Calculate precision window
        const { start, end } = calculatePrecisionWindow(entryTime, exitTime);

        // Step 4: Fetch from Twelve Data
        const normalizedSymbol = normalizeSymbol(symbol);
        const candles = await fetchFromTwelveData(normalizedSymbol, start, end);

        if (candles.length === 0) {
            return { candles: [], cached: false, error: 'No data available for this symbol/timeframe' };
        }

        // Step 5: Cache the result in Supabase
        const newChartData: ChartData = {
            candles,
            symbol: normalizedSymbol,
            fetched_at: new Date().toISOString(),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase.from('trades') as any).update({ chart_data: newChartData }).eq('id', tradeId) as any;

        if (updateError) {
            console.error('[Pricing] Error caching chart data:', updateError);
            // Continue - we still have the data to return
        } else {
            console.log(`[Pricing] Cached ${candles.length} candles for trade ${tradeId}`);
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

    // Validate dates
    if (isNaN(entry.getTime()) || isNaN(exit.getTime())) {
        throw new Error('Invalid entry or exit time');
    }

    const start = new Date(entry.getTime() - PRECISION_WINDOW_HOURS * 60 * 60 * 1000);
    const end = new Date(exit.getTime() + PRECISION_WINDOW_HOURS * 60 * 60 * 1000);

    return { start, end };
}

/**
 * Normalize symbol format for Twelve Data API
 * 
 * Conversions:
 *   EURUSD → EUR/USD (forex)
 *   XAUUSD → XAU/USD (gold)
 *   BTCUSD → BTC/USD (crypto)
 *   NAS100 → NAS100 (indices, no change)
 *   AAPL   → AAPL (stocks, no change)
 */
function normalizeSymbol(symbol: string): string {
    if (!symbol) return '';

    // 1. Strip suffixes and clean (e.g., EURUSD.be -> EURUSD, NAS100.p -> NAS100)
    const baseSymbol = symbol.split('.')[0].toUpperCase();
    const cleaned = baseSymbol.replace(/[^A-Z0-9]/g, '');

    // 2. Map common prop firm names to Twelve Data indices and metals
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

    if (indexMappings[cleaned]) {
        return indexMappings[cleaned];
    }

    // 3. Gold/Silver/Metals (XAUUSD -> XAU/USD)
    const metalsPattern = /^(XAU|XAG)(USD|EUR|GBP)$/;
    const metalsMatch = cleaned.match(metalsPattern);
    if (metalsMatch) {
        return `${metalsMatch[1]}/${metalsMatch[2]}`;
    }

    // 4. Common forex pairs (6 chars ending in standard currencies)
    const forexPattern = /^([A-Z]{3})(USD|EUR|GBP|JPY|CHF|AUD|NZD|CAD)$/;
    const forexMatch = cleaned.match(forexPattern);
    if (forexMatch) {
        return `${forexMatch[1]}/${forexMatch[2]}`;
    }

    // 5. Crypto pairs (BTCUSD -> BTC/USD)
    const cryptoPattern = /^([A-Z]{3,5})(USD|USDT)$/;
    const cryptoMatch = cleaned.match(cryptoPattern);
    if (cryptoMatch) {
        return `${cryptoMatch[1]}/${cryptoMatch[2]}`;
    }

    return cleaned;
}

/**
 * Custom error for rate limiting
 */
class TwelveDataRateLimitError extends Error {
    constructor() {
        super('Twelve Data rate limit reached');
        this.name = 'TwelveDataRateLimitError';
    }
}

/**
 * Fetch 1-minute OHLC data from Twelve Data API
 */
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

    // Format dates for Twelve Data (YYYY-MM-DD HH:MM:SS)
    const formatDate = (d: Date) => {
        return d.toISOString().replace('T', ' ').substring(0, 19);
    };

    const params = new URLSearchParams({
        symbol,
        interval: '1min',
        start_date: formatDate(startTime),
        end_date: formatDate(endTime),
        apikey: apiKey,
        format: 'JSON',
        order: 'ASC', // Oldest first (required for charts)
    });

    const url = `${TWELVE_DATA_BASE_URL}/time_series?${params}`;

    console.log(`[Pricing] Fetching from Twelve Data: ${symbol} from ${startTime.toISOString()} to ${endTime.toISOString()}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Handle rate limiting
    if (response.status === 429) {
        throw new TwelveDataRateLimitError();
    }

    if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check for API-level errors
    if (data.status === 'error') {
        if (data.code === 429) {
            throw new TwelveDataRateLimitError();
        }
        throw new Error(`Twelve Data error: ${data.message || 'Unknown error'}`);
    }

    // Validate response structure
    if (!data.values || !Array.isArray(data.values)) {
        console.warn('[Pricing] No candle data in response:', data);
        return [];
    }

    // Transform to ChartCandle format for lightweight-charts
    const candles: ChartCandle[] = data.values.map((candle: {
        datetime: string;
        open: string;
        high: string;
        low: string;
        close: string;
    }) => ({
        time: Math.floor(new Date(candle.datetime).getTime() / 1000), // Unix seconds
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
    }));

    console.log(`[Pricing] Fetched ${candles.length} candles from Twelve Data`);

    return candles;
}

/**
 * Utility: Check if chart data exists for a trade without fetching
 */
export async function hasChartData(tradeId: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { data } = await supabase
        .from('trades')
        .select('chart_data')
        .eq('id', tradeId)
        .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tradeData = data as any;
    return !!(tradeData?.chart_data?.candles?.length);
}

/**
 * Utility: Clear cached chart data for a trade (force refetch)
 */
export async function clearChartDataCache(tradeId: string): Promise<void> {
    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from('trades') as any).update({ chart_data: null }).eq('id', tradeId) as any;
    if (updateError) {
        console.error('[Pricing] Error clearing chart data cache:', updateError);
    }
}
