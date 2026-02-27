import { createClient } from '@/lib/supabase/client'
import type { Trade } from '@/lib/supabase/types'
import { withPropAccountFilter } from '@/lib/utils/query-helpers'
import { todayString } from '@/lib/utils/format'

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

const EMPTY_SUMMARY: AnalyticsSummary = {
    totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: 0,
    totalPnl: 0, avgPnl: 0, avgRMultiple: 0, profitFactor: 0,
    largestWin: 0, largestLoss: 0, avgWin: 0, avgLoss: 0, expectancy: 0,
}

export async function getAnalyticsSummary(
    startDate?: string,
    endDate?: string,
    propAccountId?: string | null
): Promise<AnalyticsSummary> {
    try {
        const supabase = createClient()

        let query = supabase
            .from('trades')
            .select('pnl, r_multiple, entry_date, direction, status')
            .eq('status', 'closed')

        if (startDate) query = query.gte('entry_date', startDate)
        if (endDate) query = query.lte('entry_date', endDate)
        query = withPropAccountFilter(query, propAccountId)

        const { data, error } = await query
        if (error) {
            console.warn('[getAnalyticsSummary]', error.message)
            return EMPTY_SUMMARY
        }

        const closedTrades = (data || []) as Trade[]
        if (closedTrades.length === 0) return EMPTY_SUMMARY

        const winners = closedTrades.filter(t => (t.pnl || 0) > 0)
        const losers  = closedTrades.filter(t => (t.pnl || 0) < 0)

        const totalPnl      = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
        const grossProfit   = winners.reduce((sum, t) => sum + (t.pnl || 0), 0)
        const grossLoss     = Math.abs(losers.reduce((sum, t) => sum + (t.pnl || 0), 0))

        const winRate       = (winners.length / closedTrades.length) * 100
        const avgWin        = winners.length > 0 ? grossProfit / winners.length : 0
        const avgLoss       = losers.length  > 0 ? grossLoss  / losers.length  : 0
        const profitFactor  = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0
        const expectancy    = (winRate / 100 * avgWin) - ((1 - winRate / 100) * avgLoss)

        return {
            totalTrades:  closedTrades.length,
            winningTrades: winners.length,
            losingTrades:  losers.length,
            winRate,
            totalPnl,
            avgPnl:       totalPnl / closedTrades.length,
            avgRMultiple: closedTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / closedTrades.length,
            profitFactor,
            largestWin:   winners.length > 0 ? Math.max(...winners.map(t => t.pnl || 0)) : 0,
            largestLoss:  losers.length  > 0 ? Math.abs(Math.min(...losers.map(t => t.pnl || 0))) : 0,
            avgWin,
            avgLoss,
            expectancy,
        }
    } catch (err) {
        console.warn('[getAnalyticsSummary] unexpected error:', err)
        return EMPTY_SUMMARY
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
        const supabase = createClient()

        let query = supabase
            .from('trades')
            .select('pnl, entry_date, exit_date')
            .eq('status', 'closed')
            .order('exit_date', { ascending: true })

        if (startDate) query = query.gte('entry_date', startDate)
        if (endDate) query = query.lte('entry_date', endDate)
        query = withPropAccountFilter(query, propAccountId)

        const { data, error } = await query
        if (error) {
            console.warn('[getEquityCurve]', error.message)
            return [{ date: startDate || todayString(), balance: startingBalance, pnl: 0 }]
        }

        const trades = (data || []) as Trade[]
        let runningBalance = startingBalance
        const curve: EquityCurvePoint[] = [
            { date: startDate || todayString(), balance: startingBalance, pnl: 0 }
        ]

        for (const trade of trades) {
            runningBalance += (trade.pnl || 0)
            curve.push({
                date:    trade.exit_date || trade.entry_date,
                balance: runningBalance,
                pnl:     trade.pnl || 0,
            })
        }

        return curve
    } catch (err) {
        console.warn('[getEquityCurve] unexpected error:', err)
        return [{ date: startDate || todayString(), balance: startingBalance, pnl: 0 }]
    }
}

export interface DayPerformance {
    day: string
    totalPnl: number
    trades: number
    winRate: number
}

export async function getPerformanceByDay(propAccountId?: string | null): Promise<DayPerformance[]> {
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const empty = DAYS.slice(1, 6).map(day => ({ day, totalPnl: 0, trades: 0, winRate: 0 }))

    try {
        const supabase = createClient()

        let query = supabase
            .from('trades')
            .select('pnl, entry_date')
            .eq('status', 'closed')

        query = withPropAccountFilter(query, propAccountId)

        const { data, error } = await query
        if (error) {
            console.warn('[getPerformanceByDay]', error.message)
            return empty
        }

        const trades = (data || []) as { pnl: number; entry_date: string }[]
        const dayStats: Record<string, { pnl: number; trades: number; wins: number }> = {}
        DAYS.forEach(day => { dayStats[day] = { pnl: 0, trades: 0, wins: 0 } })

        for (const trade of trades) {
            const date    = new Date(trade.entry_date)
            const dayName = DAYS[date.getDay()]
            dayStats[dayName].pnl += (trade.pnl || 0)
            dayStats[dayName].trades++
            if ((trade.pnl || 0) > 0) dayStats[dayName].wins++
        }

        return DAYS.slice(1, 6).map(day => ({
            day,
            totalPnl: dayStats[day].pnl,
            trades:   dayStats[day].trades,
            winRate:  dayStats[day].trades > 0 ? (dayStats[day].wins / dayStats[day].trades) * 100 : 0,
        }))
    } catch (err) {
        console.warn('[getPerformanceByDay] unexpected error:', err)
        return empty
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
        const supabase = createClient()

        let query = supabase
            .from('trades')
            .select('pnl, entry_date')
            .eq('status', 'closed')
            .order('entry_date', { ascending: true })

        query = withPropAccountFilter(query, propAccountId)

        const { data, error } = await query
        if (error) {
            console.warn('[getMonthlyPerformance]', error.message)
            return []
        }

        const trades = (data || []) as { pnl: number; entry_date: string }[]
        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthStats: Record<string, { pnl: number; trades: number; wins: number }> = {}

        for (const trade of trades) {
            const date = new Date(trade.entry_date)
            const key  = `${date.getFullYear()}-${date.getMonth()}`
            if (!monthStats[key]) monthStats[key] = { pnl: 0, trades: 0, wins: 0 }
            monthStats[key].pnl += (trade.pnl || 0)
            monthStats[key].trades++
            if ((trade.pnl || 0) > 0) monthStats[key].wins++
        }

        return Object.entries(monthStats).map(([key, stats]) => {
            const [year, month] = key.split('-').map(Number)
            return {
                month:    MONTHS[month],
                year,
                totalPnl: stats.pnl,
                trades:   stats.trades,
                winRate:  stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
            }
        })
    } catch (err) {
        console.warn('[getMonthlyPerformance] unexpected error:', err)
        return []
    }
}

export async function getTodayStats(propAccountId?: string | null): Promise<{
    pnl: number
    trades: number
    wins: number
    losses: number
}> {
    const EMPTY = { pnl: 0, trades: 0, wins: 0, losses: 0 }
    try {
        const supabase = createClient()
        const today = todayString()

        // Use exit_date range for today: from 00:00 to 23:59:59
        let query = supabase
            .from('trades')
            .select('pnl')
            .eq('status', 'closed')
            .gte('exit_date', `${today}T00:00:00`)
            .lte('exit_date', `${today}T23:59:59`)

        query = withPropAccountFilter(query, propAccountId)

        const { data, error } = await query
        if (error) {
            console.warn('[getTodayStats]', error.message)
            return EMPTY
        }

        const closedTrades = (data || []) as { pnl: number }[]
        const wins   = closedTrades.filter(t => (t.pnl || 0) > 0).length
        const losses = closedTrades.filter(t => (t.pnl || 0) < 0).length

        return {
            pnl:    closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
            trades: closedTrades.length,
            wins,
            losses,
        }
    } catch (err) {
        console.warn('[getTodayStats] unexpected error:', err)
        return EMPTY
    }
}
