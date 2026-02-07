import { createClient } from '@/lib/supabase/client'
import type { Trade, TradeInsert, TradeUpdate } from '@/lib/supabase/types'

export interface TradeFilters {
    status?: 'open' | 'closed' | 'all'
    direction?: 'LONG' | 'SHORT' | 'all'
    playbookId?: string
    propAccountId?: string | null
    startDate?: string
    endDate?: string
    search?: string
}

export async function getTrades(filters?: TradeFilters): Promise<Trade[]> {
    const supabase = createClient()

    let query = supabase
        .from('trades')
        .select('id, symbol, direction, entry_price, exit_price, position_size, pnl, r_multiple, entry_date, exit_date, status, playbook_id, prop_account_id, stop_loss, take_profit, notes, created_at')
        .order('entry_date', { ascending: false })

    if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
    }

    if (filters?.direction && filters.direction !== 'all') {
        query = query.eq('direction', filters.direction)
    }

    if (filters?.playbookId) {
        query = query.eq('playbook_id', filters.playbookId)
    }

    // Filter by prop account
    if (filters?.propAccountId === 'unassigned') {
        query = query.is('prop_account_id', null)
    } else if (filters?.propAccountId) {
        query = query.eq('prop_account_id', filters.propAccountId)
    }

    if (filters?.startDate) {
        query = query.gte('entry_date', filters.startDate)
    }

    if (filters?.endDate) {
        query = query.lte('entry_date', filters.endDate)
    }

    if (filters?.search) {
        query = query.ilike('symbol', `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return (data || []) as Trade[]
}

export async function getTrade(id: string): Promise<Trade | null> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('trades')
        .select('id, symbol, direction, entry_price, exit_price, position_size, pnl, r_multiple, entry_date, exit_date, status, playbook_id, prop_account_id, stop_loss, take_profit, notes, feelings, observations, screenshots, created_at')
        .eq('id', id)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null
        throw new Error(error.message)
    }
    return data as Trade
}

export async function createTrade(trade: Omit<TradeInsert, 'user_id'>): Promise<Trade> {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('trades')
        .insert({ ...trade, user_id: user.id })
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as Trade
}

export async function updateTrade(id: string, updates: TradeUpdate): Promise<Trade> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('trades')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as Trade
}

export async function deleteTrade(id: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
}

export async function closeTrade(id: string, exitPrice: number, exitDate: string): Promise<Trade> {
    const trade = await getTrade(id)
    if (!trade) throw new Error('Trade not found')

    // Calculate PnL
    const priceDiff = trade.direction === 'LONG'
        ? exitPrice - trade.entry_price
        : trade.entry_price - exitPrice
    const pnl = priceDiff * trade.position_size

    // Calculate R-multiple if stop loss exists
    let rMultiple: number | null = null
    if (trade.stop_loss) {
        const risk = trade.direction === 'LONG'
            ? trade.entry_price - trade.stop_loss
            : trade.stop_loss - trade.entry_price
        if (risk > 0) {
            rMultiple = priceDiff / risk
        }
    }

    return updateTrade(id, {
        exit_price: exitPrice,
        exit_date: exitDate,
        pnl,
        r_multiple: rMultiple,
        status: 'closed',
    })
}

export async function getTradesByDateRange(startDate: string, endDate: string, propAccountId?: string | null): Promise<Trade[]> {
    const supabase = createClient()

    let query = supabase
        .from('trades')
        .select('id, symbol, direction, entry_price, exit_price, position_size, pnl, r_multiple, entry_date, exit_date, status, playbook_id, prop_account_id, created_at')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .order('entry_date', { ascending: true })

    // Filter by prop account
    if (propAccountId === 'unassigned') {
        query = query.is('prop_account_id', null)
    } else if (propAccountId) {
        query = query.eq('prop_account_id', propAccountId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return (data || []) as Trade[]
}

export async function getOpenTrades(): Promise<Trade[]> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('trades')
        .select('id, symbol, direction, entry_price, position_size, pnl, entry_date, status, stop_loss, take_profit, created_at')
        .eq('status', 'open')
        .order('entry_date', { ascending: false })

    if (error) throw new Error(error.message)
    return (data || []) as Trade[]
}
