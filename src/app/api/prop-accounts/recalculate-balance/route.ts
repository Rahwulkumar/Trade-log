import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/prop-accounts/recalculate-balance
 * 
 * Recalculates the balance for a prop account from all linked trades.
 * Uses admin client to bypass RLS for the update.
 */
export async function POST(req: NextRequest) {
    try {
        // Get authenticated user
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get account ID from request
        const { accountId } = await req.json();

        if (!accountId) {
            return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }

        // Verify user owns this account
        const { data: account, error: accountError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from('prop_accounts') as any)
            .select('id, initial_balance, user_id')
            .eq('id', accountId)
            .single();

        if (accountError || !account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        if (account.user_id !== user.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        // Use admin client to fetch trades and update balance
        const adminDb = createAdminClient();

        // Get all trades linked to this account
        const { data: trades, error: tradesError } = await (adminDb
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from('trades') as any)
            .select('pnl')
            .eq('prop_account_id', accountId);

        if (tradesError) {
            console.error('[Recalculate] Error fetching trades:', tradesError);
            return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
        }

        // Calculate total P&L
        const totalPnl = trades?.reduce((sum: number, t: { pnl: number | null }) => sum + (t.pnl || 0), 0) || 0;
        const newBalance = account.initial_balance + totalPnl;
        const pnlPercent = (totalPnl / account.initial_balance) * 100;
        const totalDdCurrent = pnlPercent < 0 ? Math.abs(pnlPercent) : 0;

        // Update balance using admin client (bypasses RLS)
        const { error: updateError } = await (adminDb
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from('prop_accounts') as any)
            .update({
                current_balance: newBalance,
                total_dd_current: totalDdCurrent,
            })
            .eq('id', accountId)
            .select()
            .single();

        if (updateError) {
            console.error('[Recalculate] Error updating balance:', updateError);
            return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
        }

        console.log(`[Recalculate] Updated balance for ${accountId}: $${newBalance.toFixed(2)} (${trades?.length || 0} trades)`);

        return NextResponse.json({
            success: true,
            balance: newBalance,
            pnl: totalPnl,
            tradeCount: trades?.length || 0,
        });

    } catch (err) {
        console.error('[Recalculate] Exception:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 }
        );
    }
}
