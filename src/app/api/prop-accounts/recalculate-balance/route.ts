import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getPropAccount, updatePropAccount } from '@/lib/api/prop-accounts';
import { db } from '@/lib/db';
import { mt5Accounts, trades } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

/**
 * POST /api/prop-accounts/recalculate-balance
 *
 * Recalculates the balance for a prop account from all linked trades.
 * Uses Clerk for auth and Drizzle/Neon for data.
 */
export async function POST(req: NextRequest) {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    try {
        const body = await req.json();
        const { accountId } = body;

        if (!accountId) {
            return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }

        const account = await getPropAccount(accountId, userId);
        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        // If this prop account is linked to MT5 and has been synced before,
        // keep MT5 balance as source-of-truth to avoid overwriting live balance.
        const [linkedMt5] = await db
            .select({ balance: mt5Accounts.balance })
            .from(mt5Accounts)
            .where(
                and(
                    eq(mt5Accounts.propAccountId, accountId),
                    eq(mt5Accounts.userId, userId)
                )
            )
            .limit(1);

        const mt5Balance =
            linkedMt5?.balance != null ? Number(linkedMt5.balance) : null;
        const hasSyncedMt5Balance =
            account.lastSyncedAt != null &&
            mt5Balance != null &&
            Number.isFinite(mt5Balance);

        const linkedTrades = await db
            .select({ pnl: trades.pnl })
            .from(trades)
            .where(eq(trades.propAccountId, accountId));

        const totalPnl = linkedTrades.reduce(
            (sum, t) => sum + Number(t.pnl ?? 0),
            0
        );
        const initialBalance = Number(account.accountSize);
        // If MT5 has synced, preserve live MT5 balance.
        // Otherwise fallback to trade-derived balance.
        const newBalance =
            hasSyncedMt5Balance
                ? mt5Balance
                : linkedTrades.length === 0
                ? Number(account.currentBalance ?? account.accountSize ?? 0)
                : initialBalance + totalPnl;

        await updatePropAccount(accountId, userId, {
            currentBalance: String(newBalance),
        });

        return NextResponse.json({
            success: true,
            balance: newBalance,
            pnl: totalPnl,
            tradeCount: linkedTrades.length,
            source: hasSyncedMt5Balance ? 'mt5' : 'trades',
        });
    } catch (err) {
        console.error('[Recalculate] Exception:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal error' },
            { status: 500 }
        );
    }
}
