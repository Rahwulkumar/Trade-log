/**
 * Analytics helpers read from /api/trades so dashboard and journal use the same
 * filtered trade source after the Drizzle migration.
 */

import { getTrades } from '@/lib/api/client/trades';
import type { TradeFilters } from '@/lib/api/trades';
import { todayString } from '@/lib/utils/format';

const ANALYTICS_CACHE_TTL_MS = 15_000;
const analyticsResultCache = new Map<string, { expiresAt: number; value: unknown }>();
const pendingAnalyticsComputations = new Map<string, Promise<unknown>>();

export interface AnalyticsSummary {
    totalTrades: number
    winningTrades: number
    losingTrades: number
    winRate: number
    totalPnl: number
    avgPnl: number
    avgRMultiple: number
    profitFactor: number
    largestWin: number
    largestLoss: number
    avgWin: number
    avgLoss: number
    expectancy: number
}

export interface AnalyticsOverview {
    tradeCount: number
    summary: AnalyticsSummary
    equityCurve: EquityCurvePoint[]
    performanceByDay: DayPerformance[]
}

type AnalyticsTrade = {
    pnl?: unknown
    rMultiple?: unknown
    r_multiple?: unknown
    entryDate?: unknown
    entry_date?: unknown
    exitDate?: unknown
    exit_date?: unknown
}

const EMPTY_SUMMARY: AnalyticsSummary = {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    totalPnl: 0,
    avgPnl: 0,
    avgRMultiple: 0,
    profitFactor: 0,
    largestWin: 0,
    largestLoss: 0,
    avgWin: 0,
    avgLoss: 0,
    expectancy: 0,
};

function toNumber(value: unknown): number {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
}

function toDate(value: unknown): Date | null {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value !== 'string' || value.trim().length === 0) {
        return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getPnl(trade: AnalyticsTrade): number {
    return toNumber(trade.pnl);
}

function getRMultiple(trade: AnalyticsTrade): number {
    return toNumber(trade.rMultiple ?? trade.r_multiple);
}

function getEntryDate(trade: AnalyticsTrade): Date | null {
    return toDate(trade.entryDate ?? trade.entry_date);
}

function getExitDate(trade: AnalyticsTrade): Date | null {
    return toDate(trade.exitDate ?? trade.exit_date);
}

function normalizePropAccountId(
    propAccountId?: string | null
): TradeFilters['propAccountId'] {
    if (!propAccountId) {
        return undefined;
    }

    return propAccountId;
}

function buildClosedTradeFilters(options: {
    startDate?: string
    endDate?: string
    exitStartDate?: string
    exitEndDate?: string
    propAccountId?: string | null
}): TradeFilters {
    return {
        status: 'closed',
        startDate: options.startDate,
        endDate: options.endDate,
        exitStartDate: options.exitStartDate,
        exitEndDate: options.exitEndDate,
        propAccountId: normalizePropAccountId(options.propAccountId),
    };
}

async function fetchClosedTrades(options: {
    startDate?: string
    endDate?: string
    exitStartDate?: string
    exitEndDate?: string
    propAccountId?: string | null
}): Promise<AnalyticsTrade[]> {
    const rows = await getTrades(buildClosedTradeFilters(options));
    return rows as unknown as AnalyticsTrade[];
}

function buildAnalyticsCacheKey(scope: string, ...parts: Array<string | number | null | undefined>): string {
    return [scope, ...parts.map((part) => String(part ?? ''))].join('|');
}

async function getCachedAnalyticsResult<T>(
    key: string,
    compute: () => Promise<T>
): Promise<T> {
    const now = Date.now();
    const cached = analyticsResultCache.get(key);
    if (cached && cached.expiresAt > now) {
        return cached.value as T;
    }

    const pending = pendingAnalyticsComputations.get(key);
    if (pending) {
        return pending as Promise<T>;
    }

    const computation = (async () => {
        try {
            const value = await compute();
            analyticsResultCache.set(key, {
                expiresAt: Date.now() + ANALYTICS_CACHE_TTL_MS,
                value,
            });
            return value;
        } finally {
            pendingAnalyticsComputations.delete(key);
        }
    })();

    pendingAnalyticsComputations.set(key, computation);
    return computation;
}

function buildSummaryFromTrades(closedTrades: AnalyticsTrade[]): AnalyticsSummary {
    if (closedTrades.length === 0) return EMPTY_SUMMARY;

    const winners = closedTrades.filter((trade) => getPnl(trade) > 0);
    const losers = closedTrades.filter((trade) => getPnl(trade) < 0);

    const totalPnl = closedTrades.reduce((sum, trade) => sum + getPnl(trade), 0);
    const grossProfit = winners.reduce((sum, trade) => sum + getPnl(trade), 0);
    const grossLoss = Math.abs(losers.reduce((sum, trade) => sum + getPnl(trade), 0));

    const winRate = (winners.length / closedTrades.length) * 100;
    const avgWin = winners.length > 0 ? grossProfit / winners.length : 0;
    const avgLoss = losers.length > 0 ? grossLoss / losers.length : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const expectancy = (winRate / 100 * avgWin) - ((1 - winRate / 100) * avgLoss);

    return {
        totalTrades: closedTrades.length,
        winningTrades: winners.length,
        losingTrades: losers.length,
        winRate,
        totalPnl,
        avgPnl: totalPnl / closedTrades.length,
        avgRMultiple: closedTrades.reduce((sum, trade) => sum + getRMultiple(trade), 0) / closedTrades.length,
        profitFactor,
        largestWin: winners.length > 0 ? Math.max(...winners.map(getPnl)) : 0,
        largestLoss: losers.length > 0 ? Math.abs(Math.min(...losers.map(getPnl))) : 0,
        avgWin,
        avgLoss,
        expectancy,
    };
}

function buildEquityCurveFromTrades(
    trades: AnalyticsTrade[],
    startingBalance: number = 10000,
    startDate?: string
): EquityCurvePoint[] {
    const sortedTrades = [...trades].sort((left, right) => {
        const leftMs =
            getExitDate(left)?.getTime() ??
            getEntryDate(left)?.getTime() ??
            0;
        const rightMs =
            getExitDate(right)?.getTime() ??
            getEntryDate(right)?.getTime() ??
            0;
        return leftMs - rightMs;
    });

    let runningBalance = startingBalance;
    const curve: EquityCurvePoint[] = [
        { date: startDate || todayString(), balance: startingBalance, pnl: 0 },
    ];

    for (const trade of sortedTrades) {
        const pnl = getPnl(trade);
        const timestamp =
            getExitDate(trade)?.toISOString() ??
            getEntryDate(trade)?.toISOString() ??
            todayString();

        runningBalance += pnl;
        curve.push({
            date: timestamp,
            balance: runningBalance,
            pnl,
        });
    }

    return curve;
}

function buildPerformanceByDayFromTrades(trades: AnalyticsTrade[]): DayPerformance[] {
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayStats: Record<string, { pnl: number; trades: number; wins: number }> = {};
    DAYS.forEach((day) => {
        dayStats[day] = { pnl: 0, trades: 0, wins: 0 };
    });

    for (const trade of trades) {
        const entryDate = getEntryDate(trade);
        if (!entryDate) continue;

        const dayName = DAYS[entryDate.getDay()];
        const pnl = getPnl(trade);
        dayStats[dayName].pnl += pnl;
        dayStats[dayName].trades++;
        if (pnl > 0) dayStats[dayName].wins++;
    }

    return DAYS.slice(1, 6).map((day) => ({
        day,
        totalPnl: dayStats[day].pnl,
        trades: dayStats[day].trades,
        winRate: dayStats[day].trades > 0 ? (dayStats[day].wins / dayStats[day].trades) * 100 : 0,
    }));
}

function buildMonthlyPerformanceFromTrades(trades: AnalyticsTrade[]): MonthlyPerformance[] {
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthStats: Record<string, { monthIndex: number; pnl: number; trades: number; wins: number }> = {};

    for (const trade of trades) {
        const entryDate = getEntryDate(trade);
        if (!entryDate) continue;

        const monthIndex = entryDate.getMonth();
        const key = `${entryDate.getFullYear()}-${monthIndex}`;
        if (!monthStats[key]) {
            monthStats[key] = { monthIndex, pnl: 0, trades: 0, wins: 0 };
        }

        const pnl = getPnl(trade);
        monthStats[key].pnl += pnl;
        monthStats[key].trades++;
        if (pnl > 0) monthStats[key].wins++;
    }

    return Object.entries(monthStats)
        .map(([key, stats]) => {
            const [year] = key.split('-').map(Number);
            return {
                month: MONTHS[stats.monthIndex],
                year,
                totalPnl: stats.pnl,
                trades: stats.trades,
                winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
            };
        })
        .sort((left, right) => {
            if (left.year !== right.year) return left.year - right.year;
            return MONTHS.indexOf(left.month) - MONTHS.indexOf(right.month);
        });
}

function buildTodayStatsFromTrades(closedTrades: AnalyticsTrade[]): {
    pnl: number
    trades: number
    wins: number
    losses: number
} {
    const wins = closedTrades.filter((trade) => getPnl(trade) > 0).length;
    const losses = closedTrades.filter((trade) => getPnl(trade) < 0).length;

    return {
        pnl: closedTrades.reduce((sum, trade) => sum + getPnl(trade), 0),
        trades: closedTrades.length,
        wins,
        losses,
    };
}

export async function getAnalyticsOverview(
    startingBalance: number = 10000,
    propAccountId?: string | null
): Promise<AnalyticsOverview> {
    const key = buildAnalyticsCacheKey('overview', startingBalance, propAccountId);

    return getCachedAnalyticsResult(key, async () => {
        const closedTrades = await fetchClosedTrades({ propAccountId });
        return {
            tradeCount: closedTrades.length,
            summary: buildSummaryFromTrades(closedTrades),
            equityCurve: buildEquityCurveFromTrades(closedTrades, startingBalance),
            performanceByDay: buildPerformanceByDayFromTrades(closedTrades),
        };
    });
}

export async function getAnalyticsSummary(
    startDate?: string,
    endDate?: string,
    propAccountId?: string | null
): Promise<AnalyticsSummary> {
    const key = buildAnalyticsCacheKey('summary', startDate, endDate, propAccountId);

    try {
        return await getCachedAnalyticsResult(key, async () => {
            const closedTrades = await fetchClosedTrades({
                startDate,
                endDate,
                propAccountId,
            });

            return buildSummaryFromTrades(closedTrades);
        });
    } catch (err) {
        console.warn('[getAnalyticsSummary] unexpected error:', err);
        return EMPTY_SUMMARY;
    }
}

export interface EquityCurvePoint {
    date: string
    balance: number
    pnl: number
}

export async function getEquityCurve(
    startingBalance: number = 10000,
    startDate?: string,
    endDate?: string,
    propAccountId?: string | null
): Promise<EquityCurvePoint[]> {
    const key = buildAnalyticsCacheKey('equity', startingBalance, startDate, endDate, propAccountId);

    try {
        return await getCachedAnalyticsResult(key, async () => {
            const trades = await fetchClosedTrades({
                startDate,
                endDate,
                propAccountId,
            });

            return buildEquityCurveFromTrades(trades, startingBalance, startDate);
        });
    } catch (err) {
        console.warn('[getEquityCurve] unexpected error:', err);
        return [{ date: startDate || todayString(), balance: startingBalance, pnl: 0 }];
    }
}

export interface DayPerformance {
    day: string
    totalPnl: number
    trades: number
    winRate: number
}

export async function getPerformanceByDay(propAccountId?: string | null): Promise<DayPerformance[]> {
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const empty = DAYS.slice(1, 6).map((day) => ({ day, totalPnl: 0, trades: 0, winRate: 0 }));
    const key = buildAnalyticsCacheKey('day-performance', propAccountId);

    try {
        return await getCachedAnalyticsResult(key, async () => {
            const trades = await fetchClosedTrades({ propAccountId });
            return buildPerformanceByDayFromTrades(trades);
        });
    } catch (err) {
        console.warn('[getPerformanceByDay] unexpected error:', err);
        return empty;
    }
}

export interface MonthlyPerformance {
    month: string
    year: number
    totalPnl: number
    trades: number
    winRate: number
}

export async function getMonthlyPerformance(propAccountId?: string | null): Promise<MonthlyPerformance[]> {
    const key = buildAnalyticsCacheKey('monthly-performance', propAccountId);

    try {
        return await getCachedAnalyticsResult(key, async () => {
            const trades = await fetchClosedTrades({ propAccountId });
            return buildMonthlyPerformanceFromTrades(trades);
        });
    } catch (err) {
        console.warn('[getMonthlyPerformance] unexpected error:', err);
        return [];
    }
}

export async function getTodayStats(propAccountId?: string | null): Promise<{
    pnl: number
    trades: number
    wins: number
    losses: number
}> {
    const EMPTY = { pnl: 0, trades: 0, wins: 0, losses: 0 };
    const today = todayString();
    const key = buildAnalyticsCacheKey('today-stats', today, propAccountId);

    try {
        return await getCachedAnalyticsResult(key, async () => {
            const closedTrades = await fetchClosedTrades({
                propAccountId,
                exitStartDate: `${today}T00:00:00`,
                exitEndDate: `${today}T23:59:59`,
            });

            return buildTodayStatsFromTrades(closedTrades);
        });
    } catch (err) {
        console.warn('[getTodayStats] unexpected error:', err);
        return EMPTY;
    }
}
