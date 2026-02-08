import { createClient } from '@/lib/supabase/client'
import type { Trade } from '@/lib/supabase/types'

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

export async function getAnalyticsSummary(
    startDate?: string,
    endDate?: string,
    propAccountId?: string | null
): Promise<AnalyticsSummary> {
    const supabase = createClient()

    let query = supabase
        .from('trades')
        .select('pnl, r_multiple, entry_date, direction, status')
        .eq('status', 'closed')

    if (startDate) {
        query = query.gte('entry_date', startDate)
    }

    if (endDate) {
        query = query.lte('entry_date', endDate)
    }

    // Filter by prop account
    if (propAccountId === 'unassigned') {
        query = query.is('prop_account_id', null)
    } else if (propAccountId) {
        query = query.eq('prop_account_id', propAccountId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    const closedTrades = (data || []) as Trade[]

    if (closedTrades.length === 0) {
        return {
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
        }
    }

    const winners = closedTrades.filter(t => (t.pnl || 0) > 0)
    const losers = closedTrades.filter(t => (t.pnl || 0) < 0)

    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
    const grossProfit = winners.reduce((sum, t) => sum + (t.pnl || 0), 0)
    const grossLoss = Math.abs(losers.reduce((sum, t) => sum + (t.pnl || 0), 0))

    const winRate = (winners.length / closedTrades.length) * 100
    const avgWin = winners.length > 0 ? grossProfit / winners.length : 0
    const avgLoss = losers.length > 0 ? grossLoss / losers.length : 0
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

    // Expectancy = (Win% × Avg Win) - (Loss% × Avg Loss)
    const expectancy = (winRate / 100 * avgWin) - ((1 - winRate / 100) * avgLoss)

    return {
        totalTrades: closedTrades.length,
        winningTrades: winners.length,
        losingTrades: losers.length,
        winRate,
        totalPnl,
        avgPnl: totalPnl / closedTrades.length,
        avgRMultiple: closedTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / closedTrades.length,
        profitFactor,
        largestWin: winners.length > 0 ? Math.max(...winners.map(t => t.pnl || 0)) : 0,
        largestLoss: losers.length > 0 ? Math.abs(Math.min(...losers.map(t => t.pnl || 0))) : 0,
        avgWin,
        avgLoss,
        expectancy,
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
    const supabase = createClient()

    let query = supabase
        .from('trades')
        .select('pnl, entry_date, exit_date')
        .eq('status', 'closed')
        .order('exit_date', { ascending: true })

    if (startDate) {
        query = query.gte('entry_date', startDate)
    }

    if (endDate) {
        query = query.lte('entry_date', endDate)
    }

    // Filter by prop account
    if (propAccountId === 'unassigned') {
        query = query.is('prop_account_id', null)
    } else if (propAccountId) {
        query = query.eq('prop_account_id', propAccountId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    const trades = (data || []) as Trade[]

    let runningBalance = startingBalance
    const curve: EquityCurvePoint[] = [
        { date: startDate || new Date().toISOString().split('T')[0], balance: startingBalance, pnl: 0 }
    ]

    for (const trade of trades) {
        runningBalance += (trade.pnl || 0)
        curve.push({
            date: trade.exit_date || trade.entry_date,
            balance: runningBalance,
            pnl: trade.pnl || 0,
        })
    }

    return curve
}

export interface DayPerformance {
    day: string
    totalPnl: number
    trades: number
    winRate: number
}

export async function getPerformanceByDay(propAccountId?: string | null): Promise<DayPerformance[]> {
    const supabase = createClient()

    let query = supabase
        .from('trades')
        .select('pnl, entry_date')
        .eq('status', 'closed')

    // Filter by prop account
    if (propAccountId === 'unassigned') {
        query = query.is('prop_account_id', null)
    } else if (propAccountId) {
        query = query.eq('prop_account_id', propAccountId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    const trades = (data || []) as { pnl: number; entry_date: string }[]

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayStats: Record<string, { pnl: number; trades: number; wins: number }> = {}

    // Initialize all days
    dayNames.forEach(day => {
        dayStats[day] = { pnl: 0, trades: 0, wins: 0 }
    })

    for (const trade of trades) {
        const date = new Date(trade.entry_date)
        const dayName = dayNames[date.getDay()]
        dayStats[dayName].pnl += (trade.pnl || 0)
        dayStats[dayName].trades++
        if ((trade.pnl || 0) > 0) dayStats[dayName].wins++
    }

    return dayNames.slice(1, 6).map(day => ({ // Mon-Fri only
        day,
        totalPnl: dayStats[day].pnl,
        trades: dayStats[day].trades,
        winRate: dayStats[day].trades > 0 ? (dayStats[day].wins / dayStats[day].trades) * 100 : 0,
    }))
}

export interface MonthlyPerformance {
    month: string
    year: number
    totalPnl: number
    trades: number
    winRate: number
}

export async function getMonthlyPerformance(propAccountId?: string | null): Promise<MonthlyPerformance[]> {
    const supabase = createClient()

    let query = supabase
        .from('trades')
        .select('pnl, entry_date')
        .eq('status', 'closed')
        .order('entry_date', { ascending: true })

    // Filter by prop account
    if (propAccountId === 'unassigned') {
        query = query.is('prop_account_id', null)
    } else if (propAccountId) {
        query = query.eq('prop_account_id', propAccountId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    const trades = (data || []) as { pnl: number; entry_date: string }[]

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthStats: Record<string, { pnl: number; trades: number; wins: number }> = {}

    for (const trade of trades) {
        const date = new Date(trade.entry_date)
        const key = `${date.getFullYear()}-${date.getMonth()}`

        if (!monthStats[key]) {
            monthStats[key] = { pnl: 0, trades: 0, wins: 0 }
        }

        monthStats[key].pnl += (trade.pnl || 0)
        monthStats[key].trades++
        if ((trade.pnl || 0) > 0) monthStats[key].wins++
    }

    return Object.entries(monthStats).map(([key, stats]) => {
        const [year, month] = key.split('-').map(Number)
        return {
            month: monthNames[month],
            year,
            totalPnl: stats.pnl,
            trades: stats.trades,
            winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
        }
    })
}

// Get today's stats
export async function getTodayStats(propAccountId?: string | null): Promise<{
    pnl: number
    trades: number
    wins: number
    losses: number
}> {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    let query = supabase
        .from('trades')
        .select('pnl')
        .eq('status', 'closed')
        .gte('exit_date', today)

    // Filter by prop account
    if (propAccountId === 'unassigned') {
        query = query.is('prop_account_id', null)
    } else if (propAccountId) {
        query = query.eq('prop_account_id', propAccountId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    const closedTrades = (data || []) as { pnl: number }[]
    const wins = closedTrades.filter(t => (t.pnl || 0) > 0).length
    const losses = closedTrades.filter(t => (t.pnl || 0) < 0).length

    return {
        pnl: closedTrades.reduce((sum, t) => sum + t.pnl, 0),
        trades: closedTrades.length,
        wins,
        losses,
    }
}
