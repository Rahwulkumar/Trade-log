import { getTrades } from '@/lib/api/client/trades';
import type { TradeFilters } from '@/lib/api/trades';
import { todayString } from '@/lib/utils/format';

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

type AnalyticsTrade = {
    pnl?: unknown;
    rMultiple?: unknown;
    r_multiple?: unknown;
    entryDate?: unknown;
    entry_date?: unknown;
    exitDate?: unknown;
    exit_date?: unknown;
};

const EMPTY_SUMMARY: AnalyticsSummary = {
    totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: 0,
    totalPnl: 0, avgPnl: 0, avgRMultiple: 0, profitFactor: 0,
    largestWin: 0, largestLoss: 0, avgWin: 0, avgLoss: 0, expectancy: 0,
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
    startDate?: string;
    endDate?: string;
    exitStartDate?: string;
    exitEndDate?: string;
    propAccountId?: string | null;
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
    startDate?: string;
    endDate?: string;
    exitStartDate?: string;
    exitEndDate?: string;
    propAccountId?: string | null;
}): Promise<AnalyticsTrade[]> {
    const rows = await getTrades(buildClosedTradeFilters(options));
    return rows as unknown as AnalyticsTrade[];
}

export async function getAnalyticsSummary(
    startDate?: string,
    endDate?: string,
    propAccountId?: string | null
): Promise<AnalyticsSummary> {
    try {
        const closedTrades = await fetchClosedTrades({
            startDate,
            endDate,
            propAccountId,
        });

        if (closedTrades.length === 0) return EMPTY_SUMMARY;

        const winners = closedTrades.filter(t => toNumber(t.pnl) > 0);
        const losers = closedTrades.filter(t => toNumber(t.pnl) < 0);

        const totalPnl = closedTrades.reduce((sum, t) => sum + toNumber(t.pnl), 0);
        const grossProfit = winners.reduce((sum, t) => sum + toNumber(t.pnl), 0);
        const grossLoss = Math.abs(losers.reduce((sum, t) => sum + toNumber(t.pnl), 0));

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
            avgRMultiple:
                closedTrades.reduce(
                    (sum, t) => sum + toNumber(t.rMultiple ?? t.r_multiple),
                    0
                ) / closedTrades.length,
            profitFactor,
            largestWin: winners.length > 0 ? Math.max(...winners.map(t => toNumber(t.pnl))) : 0,
            largestLoss: losers.length > 0 ? Math.abs(Math.min(...losers.map(t => toNumber(t.pnl)))) : 0,
            avgWin,
            avgLoss,
            expectancy,
        };
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
    try {
        const trades = await fetchClosedTrades({
            startDate,
            endDate,
            propAccountId,
        });

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
            { date: startDate || todayString(), balance: startingBalance, pnl: 0 }
        ];

        for (const trade of sortedTrades) {
            const pnl = toNumber(trade.pnl);
            runningBalance += pnl;
            const timestamp =
                getExitDate(trade)?.toISOString() ??
                getEntryDate(trade)?.toISOString() ??
                todayString();

            curve.push({
                date: timestamp,
                balance: runningBalance,
                pnl,
            });
        }

        return curve;
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
    const empty = DAYS.slice(1, 6).map(day => ({ day, totalPnl: 0, trades: 0, winRate: 0 }));

    try {
        const trades = await fetchClosedTrades({ propAccountId });
        const dayStats: Record<string, { pnl: number; trades: number; wins: number }> = {};
        DAYS.forEach(day => { dayStats[day] = { pnl: 0, trades: 0, wins: 0 }; });

        for (const trade of trades) {
            const tradeDate = getEntryDate(trade);
            if (!tradeDate) {
                continue;
            }

            const dayName = DAYS[tradeDate.getDay()];
            const pnl = toNumber(trade.pnl);

            dayStats[dayName].pnl += pnl;
            dayStats[dayName].trades++;
            if (pnl > 0) dayStats[dayName].wins++;
        }

        return DAYS.slice(1, 6).map(day => ({
            day,
            totalPnl: dayStats[day].pnl,
            trades: dayStats[day].trades,
            winRate: dayStats[day].trades > 0 ? (dayStats[day].wins / dayStats[day].trades) * 100 : 0,
        }));
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
    try {
        const trades = await fetchClosedTrades({ propAccountId });
        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthStats: Record<string, { pnl: number; trades: number; wins: number }> = {};

        for (const trade of trades) {
            const tradeDate = getEntryDate(trade);
            if (!tradeDate) {
                continue;
            }

            const key = `${tradeDate.getFullYear()}-${tradeDate.getMonth()}`;
            if (!monthStats[key]) monthStats[key] = { pnl: 0, trades: 0, wins: 0 };

            const pnl = toNumber(trade.pnl);
            monthStats[key].pnl += pnl;
            monthStats[key].trades++;
            if (pnl > 0) monthStats[key].wins++;
        }

        return Object.entries(monthStats).map(([key, stats]) => {
            const [year, month] = key.split('-').map(Number);
            return {
                month: MONTHS[month],
                year,
                totalPnl: stats.pnl,
                trades: stats.trades,
                winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
            };
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
    try {
        const today = todayString();
        const closedTrades = await fetchClosedTrades({
            propAccountId,
            exitStartDate: `${today}T00:00:00`,
            exitEndDate: `${today}T23:59:59`,
        });

        const wins = closedTrades.filter(t => toNumber(t.pnl) > 0).length;
        const losses = closedTrades.filter(t => toNumber(t.pnl) < 0).length;

        return {
            pnl: closedTrades.reduce((sum, t) => sum + toNumber(t.pnl), 0),
            trades: closedTrades.length,
            wins,
            losses,
        };
    } catch (err) {
        console.warn('[getTodayStats] unexpected error:', err);
        return EMPTY;
    }
}
