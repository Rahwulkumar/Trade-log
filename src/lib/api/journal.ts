/**
 * Journal Entries API — Drizzle ORM (replaces Supabase query builder)
 */

import { db } from '@/lib/db';
import { journalEntries, type JournalEntry, type JournalEntryInsert } from '@/lib/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export type { JournalEntry };
export type Json = unknown; // compat with old type import

export async function getJournalEntries(userId: string): Promise<JournalEntry[]> {
  return db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.userId, userId))
    .orderBy(desc(journalEntries.entryDate));
}

export async function getJournalEntry(id: string, userId: string): Promise<JournalEntry | null> {
  const [row] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function getJournalEntriesByType(
  userId: string,
  type: 'daily' | 'weekly' | 'trade'
): Promise<JournalEntry[]> {
  return db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.entryType, type)))
    .orderBy(desc(journalEntries.entryDate));
}

export async function getJournalEntriesByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<JournalEntry[]> {
  return db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        gte(journalEntries.entryDate, startDate),
        lte(journalEntries.entryDate, endDate)
      )
    )
    .orderBy(desc(journalEntries.entryDate));
}

export async function createJournalEntry(
  userId: string,
  entry: Omit<JournalEntryInsert, 'userId'>
): Promise<JournalEntry> {
  const [row] = await db
    .insert(journalEntries)
    .values({ ...entry, userId })
    .returning();
  return row;
}

export async function updateJournalEntry(
  id: string,
  userId: string,
  updates: Partial<Omit<JournalEntryInsert, 'id' | 'userId'>>
): Promise<JournalEntry> {
  const [row] = await db
    .update(journalEntries)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .returning();
  if (!row) throw new Error('Journal entry not found');
  return row;
}

export async function deleteJournalEntry(id: string, userId: string): Promise<void> {
  await db
    .delete(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)));
}

export async function toggleFavorite(id: string, userId: string): Promise<JournalEntry> {
  const entry = await getJournalEntry(id, userId);
  if (!entry) throw new Error('Journal entry not found');
  return updateJournalEntry(id, userId, { isFavorite: !entry.isFavorite });
}

export async function getFavorites(userId: string): Promise<JournalEntry[]> {
  return db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.isFavorite, true)))
    .orderBy(desc(journalEntries.entryDate));
}

export async function getJournalForTrade(
  tradeId: string,
  userId: string
): Promise<JournalEntry | null> {
  const [row] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.tradeId, tradeId), eq(journalEntries.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function saveTradeJournal(
  tradeId: string,
  userId: string,
  content: Json,
  title?: string
): Promise<JournalEntry> {
  const existing = await getJournalForTrade(tradeId, userId);

  if (existing) {
    return updateJournalEntry(existing.id, userId, { content, title });
  }

  return createJournalEntry(userId, {
    title,
    content,
    entryDate: new Date().toISOString().split('T')[0],
    entryType: 'trade',
    tradeId,
  });
}
