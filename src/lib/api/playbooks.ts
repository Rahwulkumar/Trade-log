/**
 * Playbooks API — Drizzle ORM (replaces Supabase query builder)
 * Auth: Clerk's auth() on server — userId passed from API routes/server components.
 * For client-side mutations, call the API route which uses requireAuth().
 */

import { db } from '@/lib/db';
import {
  playbooks, trades,
  type Playbook, type PlaybookInsert,
} from '@/lib/db/schema';
import { eq, and, desc, asc, isNull } from 'drizzle-orm';
import { getTradeNetPnl } from '@/lib/utils/trade-pnl';

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getPlaybooks(userId: string): Promise<Playbook[]> {
  return db
    .select()
    .from(playbooks)
    .where(eq(playbooks.userId, userId))
    .orderBy(desc(playbooks.createdAt));
}

export async function getActivePlaybooks(userId: string): Promise<Playbook[]> {
  return db
    .select()
    .from(playbooks)
    .where(and(eq(playbooks.userId, userId), eq(playbooks.isActive, true)))
    .orderBy(asc(playbooks.name));
}

export async function getPlaybook(id: string, userId: string): Promise<Playbook | null> {
  const [row] = await db
    .select()
    .from(playbooks)
    .where(and(eq(playbooks.id, id), eq(playbooks.userId, userId)))
    .limit(1);
  return row ?? null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createPlaybook(
  userId: string,
  data: Omit<PlaybookInsert, 'userId'>
): Promise<Playbook> {
  const [row] = await db
    .insert(playbooks)
    .values({ ...data, userId })
    .returning();
  return row;
}

export async function updatePlaybook(
  id: string,
  userId: string,
  updates: Partial<Omit<PlaybookInsert, 'id' | 'userId'>>
): Promise<Playbook> {
  const [row] = await db
    .update(playbooks)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(playbooks.id, id), eq(playbooks.userId, userId)))
    .returning();
  if (!row) throw new Error('Playbook not found');
  return row;
}

export async function deletePlaybook(id: string, userId: string): Promise<void> {
  const deleted = await db
    .delete(playbooks)
    .where(and(eq(playbooks.id, id), eq(playbooks.userId, userId)))
    .returning({ id: playbooks.id });

  if (deleted.length === 0) {
    throw new Error('Playbook not found');
  }
}

export async function duplicatePlaybook(id: string, userId: string): Promise<Playbook> {
  const original = await getPlaybook(id, userId);
  if (!original) throw new Error('Playbook not found');
  return createPlaybook(userId, {
    name: `${original.name} (Copy)`,
    description: original.description,
    rules: original.rules,
    isActive: original.isActive,
  });
}

export async function togglePlaybookActive(id: string, userId: string): Promise<Playbook> {
  const playbook = await getPlaybook(id, userId);
  if (!playbook) throw new Error('Playbook not found');
  return updatePlaybook(id, userId, { isActive: !playbook.isActive });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface PlaybookStats {
  playbook: Playbook;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgRMultiple: number;
  totalPnl: number;
}

export async function getPlaybookStats(
  playbookId: string,
  userId: string,
  propAccountId?: string | null
): Promise<PlaybookStats | null> {
  const playbook = await getPlaybook(playbookId, userId);
  if (!playbook) return null;

  const conditions = [
    eq(trades.playbookId, playbookId),
    eq(trades.userId, userId),
    eq(trades.status, 'CLOSED'),
  ];
  if (propAccountId === 'unassigned') {
    conditions.push(isNull(trades.propAccountId));
  } else if (propAccountId) {
    conditions.push(eq(trades.propAccountId, propAccountId));
  }

  const closedTrades = await db
    .select({
      pnl: trades.pnl,
      pnlIncludesCosts: trades.pnlIncludesCosts,
      commission: trades.commission,
      swap: trades.swap,
      rMultiple: trades.rMultiple,
    })
    .from(trades)
    .where(and(...conditions));

  const pnlNums = closedTrades.map(t => ({
    pnl: getTradeNetPnl(t),
    rMultiple: t.rMultiple != null ? Number(t.rMultiple) : 0,
  }));

  const winning = pnlNums.filter(t => t.pnl > 0).length;
  const totalPnl = pnlNums.reduce((sum, t) => sum + t.pnl, 0);
  const avgRMultiple = pnlNums.length > 0
    ? pnlNums.reduce((sum, t) => sum + t.rMultiple, 0) / pnlNums.length
    : 0;

  return {
    playbook,
    totalTrades: pnlNums.length,
    winningTrades: winning,
    losingTrades: pnlNums.filter(t => t.pnl < 0).length,
    winRate: pnlNums.length > 0 ? (winning / pnlNums.length) * 100 : 0,
    avgRMultiple,
    totalPnl,
  };
}

export async function getAllPlaybooksWithStats(
  userId: string,
  propAccountId?: string | null
): Promise<PlaybookStats[]> {
  const all = await getPlaybooks(userId);
  const stats = await Promise.all(all.map(p => getPlaybookStats(p.id, userId, propAccountId)));
  return stats.filter((s): s is PlaybookStats => s !== null);
}
