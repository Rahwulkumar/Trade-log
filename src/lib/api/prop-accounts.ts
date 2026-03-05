/**
 * Prop Accounts API — Drizzle ORM (replaces Supabase query builder)
 */

import { db } from '@/lib/db';
import { propAccounts, type PropAccount, type PropAccountInsert } from '@/lib/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';

export type { PropAccount, PropAccountInsert };

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getPropAccounts(userId: string): Promise<PropAccount[]> {
  return db
    .select()
    .from(propAccounts)
    .where(eq(propAccounts.userId, userId))
    .orderBy(desc(propAccounts.createdAt));
}

export async function getActivePropAccounts(userId: string): Promise<PropAccount[]> {
  return db
    .select()
    .from(propAccounts)
    .where(and(eq(propAccounts.userId, userId), eq(propAccounts.status, 'active')))
    .orderBy(asc(propAccounts.accountName));
}

export async function getPropAccount(id: string, userId: string): Promise<PropAccount | null> {
  const [row] = await db
    .select()
    .from(propAccounts)
    .where(and(eq(propAccounts.id, id), eq(propAccounts.userId, userId)))
    .limit(1);
  return row ?? null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createPropAccount(
  userId: string,
  account: Omit<PropAccountInsert, 'userId'>
): Promise<PropAccount> {
  const [row] = await db
    .insert(propAccounts)
    .values({ ...account, userId })
    .returning();
  return row;
}

export async function updatePropAccount(
  id: string,
  userId: string,
  updates: Partial<Omit<PropAccountInsert, 'id' | 'userId'>>
): Promise<PropAccount> {
  const [row] = await db
    .update(propAccounts)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(propAccounts.id, id), eq(propAccounts.userId, userId)))
    .returning();
  if (!row) throw new Error('Prop account not found');
  return row;
}

export async function deletePropAccount(id: string, userId: string): Promise<void> {
  const [account] = await db
    .select({ id: propAccounts.id })
    .from(propAccounts)
    .where(and(eq(propAccounts.id, id), eq(propAccounts.userId, userId)))
    .limit(1);

  if (!account) throw new Error('Account not found or you do not own it');

  try {
    await db.delete(propAccounts).where(eq(propAccounts.id, id));
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === '23503') {
      throw new Error(
        'Cannot delete account: It is referenced by other records. Please delete linked trades or MT5 accounts first.'
      );
    }
    throw err;
  }
}

// ─── Business logic ───────────────────────────────────────────────────────────

export async function updateAccountBalance(
  accountId: string,
  userId: string,
  newBalance: number,
  dailyPnl: number
): Promise<PropAccount> {
  const account = await getPropAccount(accountId, userId);
  if (!account) throw new Error('Account not found');

  const pnlPercent =
    ((newBalance - Number(account.accountSize)) / Number(account.accountSize)) * 100;
  const dailyDrawdownPercent =
    dailyPnl < 0 ? Math.abs((dailyPnl / Number(account.accountSize)) * 100) : 0;

  return updatePropAccount(accountId, userId, {
    currentBalance: String(newBalance),
  });
}

export async function resetDailyDrawdown(accountId: string, userId: string): Promise<PropAccount> {
  return updatePropAccount(accountId, userId, {});
}

export interface ComplianceStatus {
  isCompliant: boolean;
  dailyDdRemaining: number;
  totalDdRemaining: number;
  profitProgress: number | null;
  daysRemaining: number | null;
}

export async function checkCompliance(
  accountId: string,
  userId: string
): Promise<ComplianceStatus> {
  const account = await getPropAccount(accountId, userId);
  if (!account) throw new Error('Account not found');

  // Compliance fields are stored in the challenge record, not directly on prop_accounts
  // Return default pass-through until challenge linking is fully wired
  return {
    isCompliant: true,
    dailyDdRemaining: 100,
    totalDdRemaining: 100,
    profitProgress: null,
    daysRemaining: null,
  };
}

export async function recalculateBalanceFromTrades(
  accountId: string
): Promise<PropAccount | null> {
  try {
    const response = await fetch('/api/prop-accounts/recalculate-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    });

    if (!response.ok) {
      console.error(`[PropAccounts] Failed to recalculate balance (${response.status})`);
    }
  } catch (err) {
    console.error('[PropAccounts] Error recalculating balance:', err);
  }
  return null; // Caller should refetch from the DB
}
