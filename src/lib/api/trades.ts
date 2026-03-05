/**
 * Trades API — Drizzle ORM (replaces Supabase query builder)
 * All functions take `userId` as a parameter.
 * Auth (getting the userId) is handled by the caller from Clerk.
 */

import { db } from '@/lib/db';
import {
  trades,
  type Trade, type TradeInsert, type TradeUpdate,
} from '@/lib/db/schema';
import {
  eq, and, desc, asc, gte, lte, ilike, or,
} from 'drizzle-orm';

export type { Trade, TradeInsert, TradeUpdate };

export interface TradeFilters {
  status?: 'open' | 'closed' | 'all';
  direction?: 'LONG' | 'SHORT' | 'all';
  playbookId?: string;
  propAccountId?: string | null;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getTrades(
  userId: string,
  filters?: TradeFilters
): Promise<Trade[]> {
  try {
    // Build conditions array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [eq(trades.userId, userId)];

    if (filters?.status && filters.status !== 'all') {
      conditions.push(eq(trades.status, filters.status));
    }
    if (filters?.direction && filters.direction !== 'all') {
      conditions.push(eq(trades.direction, filters.direction));
    }
    if (filters?.playbookId) {
      conditions.push(eq(trades.playbookId, filters.playbookId));
    }
    if (filters?.propAccountId) {
      conditions.push(eq(trades.propAccountId, filters.propAccountId));
    }
    if (filters?.startDate) {
      conditions.push(gte(trades.entryDate, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(trades.entryDate, new Date(filters.endDate)));
    }
    if (filters?.search) {
      conditions.push(ilike(trades.symbol, `%${filters.search}%`));
    }

    return db
      .select()
      .from(trades)
      .where(and(...conditions))
      .orderBy(desc(trades.entryDate));
  } catch (err) {
    console.warn('[getTrades] error:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

export async function getTrade(id: string, userId: string): Promise<Trade | null> {
  const [row] = await db
    .select()
    .from(trades)
    .where(and(eq(trades.id, id), eq(trades.userId, userId)))
    .limit(1);
  return row ?? null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createTrade(
  userId: string,
  trade: Omit<TradeInsert, 'userId'>
): Promise<Trade> {
  const [row] = await db
    .insert(trades)
    .values({ ...trade, userId })
    .returning();
  return row;
}

export async function updateTrade(
  id: string,
  userId: string,
  updates: TradeUpdate
): Promise<Trade> {
  const [row] = await db
    .update(trades)
    .set(updates)
    .where(and(eq(trades.id, id), eq(trades.userId, userId)))
    .returning();
  if (!row) throw new Error('Trade not found');
  return row;
}

export async function deleteTrade(id: string, userId: string): Promise<void> {
  await db
    .delete(trades)
    .where(and(eq(trades.id, id), eq(trades.userId, userId)));
}

// ─── Business logic ───────────────────────────────────────────────────────────

export async function closeTrade(
  id: string,
  userId: string,
  exitPrice: number,
  exitDate: string
): Promise<Trade> {
  const trade = await getTrade(id, userId);
  if (!trade) throw new Error('Trade not found');
  if (trade.status === 'closed') throw new Error('Trade is already closed');

  const entryPrice = Number(trade.entryPrice);
  const positionSize = Number(trade.positionSize);
  const priceDiff =
    trade.direction === 'LONG' ? exitPrice - entryPrice : entryPrice - exitPrice;
  const pnl = priceDiff * positionSize;

  let rMultiple: number | null = null;
  if (trade.stopLoss) {
    const risk =
      trade.direction === 'LONG'
        ? entryPrice - Number(trade.stopLoss)
        : Number(trade.stopLoss) - entryPrice;
    if (risk > 0) rMultiple = priceDiff / risk;
  }

  return updateTrade(id, userId, {
    exitPrice: String(exitPrice),
    exitDate: new Date(exitDate),
    pnl: String(pnl),
    rMultiple: rMultiple != null ? String(rMultiple) : null,
    status: 'closed',
  });
}

export async function getTradesByDateRange(
  userId: string,
  startDate: string,
  endDate: string,
  propAccountId?: string | null
): Promise<Trade[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [
    eq(trades.userId, userId),
    gte(trades.entryDate, new Date(startDate)),
    lte(trades.entryDate, new Date(endDate)),
  ];
  if (propAccountId) {
    conditions.push(eq(trades.propAccountId, propAccountId));
  }

  return db
    .select()
    .from(trades)
    .where(and(...conditions))
    .orderBy(asc(trades.entryDate));
}

export async function getOpenTrades(userId: string): Promise<Trade[]> {
  return db
    .select()
    .from(trades)
    .where(and(eq(trades.userId, userId), eq(trades.status, 'open')))
    .orderBy(desc(trades.entryDate));
}
