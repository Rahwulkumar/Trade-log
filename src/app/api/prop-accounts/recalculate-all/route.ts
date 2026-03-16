import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { propAccounts, mt5Accounts, trades } from '@/lib/db/schema';
import { eq, inArray, sql, and } from 'drizzle-orm';

/**
 * POST /api/prop-accounts/recalculate-all
 *
 * Recalculates balances for all non-MT5-linked prop accounts in 3 DB queries
 * instead of N separate API calls. MT5-linked accounts are skipped — their
 * balance is sourced from the terminal heartbeat.
 */
export async function POST() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  try {
    // 1. Get all prop accounts and MT5-linked IDs in parallel
    const [allAccounts, mt5Rows] = await Promise.all([
      db
        .select({ id: propAccounts.id, accountSize: propAccounts.accountSize, currentBalance: propAccounts.currentBalance })
        .from(propAccounts)
        .where(eq(propAccounts.userId, userId)),
      db
        .select({ propAccountId: mt5Accounts.propAccountId })
        .from(mt5Accounts)
        .where(eq(mt5Accounts.userId, userId)),
    ]);

    const mt5Ids = new Set(mt5Rows.map((r) => r.propAccountId).filter(Boolean));
    const nonMt5 = allAccounts.filter((a) => !mt5Ids.has(a.id));

    if (nonMt5.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    // 2. Sum PnL grouped by prop account — single query
    const tradeSums = await db
      .select({
        propAccountId: trades.propAccountId,
        totalPnl: sql<string>`COALESCE(SUM(${trades.pnl}), 0)`,
        tradeCount: sql<string>`COUNT(*)`,
      })
      .from(trades)
      .where(inArray(trades.propAccountId, nonMt5.map((a) => a.id)))
      .groupBy(trades.propAccountId);

    const pnlMap = new Map(
      tradeSums.map((r) => [
        r.propAccountId,
        { pnl: Number(r.totalPnl), count: Number(r.tradeCount) },
      ])
    );

    // 3. Update all accounts in parallel (direct DB, no HTTP round-trips)
    await Promise.all(
      nonMt5.map((account) => {
        const { pnl = 0, count = 0 } = pnlMap.get(account.id) ?? {};
        const initial = Number(account.accountSize ?? 0);
        const newBalance =
          count === 0
            ? Number(account.currentBalance ?? account.accountSize ?? 0)
            : initial + pnl;

        return db
          .update(propAccounts)
          .set({ currentBalance: String(newBalance) })
          .where(and(eq(propAccounts.id, account.id), eq(propAccounts.userId, userId)));
      })
    );

    return NextResponse.json({ updated: nonMt5.length });
  } catch (err) {
    console.error('[RecalculateAll] Error:', err);
    return NextResponse.json({ error: 'Failed to recalculate balances' }, { status: 500 });
  }
}
