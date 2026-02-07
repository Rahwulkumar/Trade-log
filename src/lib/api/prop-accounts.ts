import { createClient } from '@/lib/supabase/client'
import type { PropAccount, PropAccountInsert } from '@/lib/supabase/types'

export async function getPropAccounts(): Promise<PropAccount[]> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('prop_accounts')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data || []) as PropAccount[]
}

export async function getActivePropAccounts(): Promise<PropAccount[]> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('prop_accounts')
        .select('*')
        .eq('status', 'active')
        .order('name', { ascending: true })

    if (error) throw new Error(error.message)
    return (data || []) as PropAccount[]
}

export async function getPropAccount(id: string): Promise<PropAccount | null> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('prop_accounts')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null
        throw new Error(error.message)
    }
    return data as PropAccount
}

export async function createPropAccount(account: Omit<PropAccountInsert, 'user_id'>): Promise<PropAccount> {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('prop_accounts')
        .insert({ ...account, user_id: user.id })
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as PropAccount
}

export async function updatePropAccount(id: string, updates: Partial<PropAccount>): Promise<PropAccount> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('prop_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as PropAccount
}

export async function deletePropAccount(id: string): Promise<void> {
    const supabase = createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        throw new Error('You must be logged in to delete an account')
    }

    // Verify account exists and user owns it
    const { data: account, error: fetchError } = await supabase
        .from('prop_accounts')
        .select('id, user_id')
        .eq('id', id)
        .single()

    if (fetchError) {
        if (fetchError.code === 'PGRST116') {
            throw new Error('Account not found')
        }
        throw new Error(`Account not found: ${fetchError.message}`)
    }

    if (!account) {
        throw new Error('Account not found')
    }

    // Verify ownership
    if (account.user_id !== user.id) {
        throw new Error('You do not have permission to delete this account')
    }

    // Delete the account
    const { error } = await supabase
        .from('prop_accounts')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('[DeletePropAccount] Supabase error:', error)
        // Provide more helpful error messages
        if (error.code === '23503') {
            throw new Error('Cannot delete account: It is referenced by other records. Please delete linked trades or MT5 accounts first.')
        }
        if (error.code === '42501') {
            throw new Error('Permission denied: You do not have permission to delete this account.')
        }
        if (error.message?.includes('You do not own this prop account')) {
            throw new Error('Permission denied: You do not have permission to delete this account. This may be due to a database constraint.')
        }
        throw new Error(`Failed to delete account: ${error.message || 'Unknown error'}`)
    }
}

// Update balance after a trade
export async function updateAccountBalance(
    accountId: string,
    newBalance: number,
    dailyPnl: number
): Promise<PropAccount> {
    const account = await getPropAccount(accountId)
    if (!account) throw new Error('Account not found')

    // Calculate drawdowns
    const pnlPercent = ((newBalance - account.initial_balance) / account.initial_balance) * 100
    const dailyDrawdownPercent = dailyPnl < 0
        ? Math.abs((dailyPnl / account.initial_balance) * 100)
        : 0

    // Update current drawdown values
    const totalDdCurrent = pnlPercent < 0 ? Math.abs(pnlPercent) : 0
    const dailyDdCurrent = Math.max(account.daily_dd_current || 0, dailyDrawdownPercent)

    return updatePropAccount(accountId, {
        current_balance: newBalance,
        total_dd_current: totalDdCurrent,
        daily_dd_current: dailyDdCurrent,
    })
}

// Reset daily drawdown (call at start of trading day)
export async function resetDailyDrawdown(accountId: string): Promise<PropAccount> {
    return updatePropAccount(accountId, {
        daily_dd_current: 0,
    })
}

// Check if account is compliant with drawdown rules
export interface ComplianceStatus {
    isCompliant: boolean
    dailyDdRemaining: number
    totalDdRemaining: number
    profitProgress: number | null
    daysRemaining: number | null
}

export async function checkCompliance(accountId: string): Promise<ComplianceStatus> {
    const account = await getPropAccount(accountId)
    if (!account) throw new Error('Account not found')

    const dailyDdRemaining = (account.daily_dd_max || 0) - (account.daily_dd_current || 0)
    const totalDdRemaining = (account.total_dd_max || 0) - (account.total_dd_current || 0)

    const isCompliant = dailyDdRemaining > 0 && totalDdRemaining > 0

    // Calculate profit progress
    let profitProgress: number | null = null
    if (account.profit_target) {
        const currentProfit = ((account.current_balance - account.initial_balance) / account.initial_balance) * 100
        profitProgress = (currentProfit / account.profit_target) * 100
    }

    return {
        isCompliant,
        dailyDdRemaining,
        totalDdRemaining,
        profitProgress,
        daysRemaining: null, // Would need to calculate based on start_date and challenge duration
    }
}

// Recalculate balance from all trades linked to this prop account
// Uses API route to bypass RLS restrictions
export async function recalculateBalanceFromTrades(accountId: string): Promise<PropAccount | null> {
    try {
        const response = await fetch('/api/prop-accounts/recalculate-balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId }),
        });

        if (!response.ok) {
            // Log detailed error info
            const statusCode = response.status;
            let errorData: unknown = {};
            try {
                errorData = await response.json();
            } catch {
                errorData = await response.text();
            }
            console.error(`[PropAccounts] Failed to recalculate balance (${statusCode}):`, errorData);
            // Return current account without updating
            return await getPropAccount(accountId);
        }

        const result = await response.json();
        console.log(`[PropAccounts] Recalculated balance for ${accountId}: $${result.balance?.toFixed(2)} (${result.tradeCount} trades)`);

        // Return updated account
        return await getPropAccount(accountId);
    } catch (err) {
        console.error('[PropAccounts] Error recalculating balance:', err);
        return await getPropAccount(accountId);
    }
}
