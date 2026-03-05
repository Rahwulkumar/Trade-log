/**
 * Tags API — Drizzle ORM (replaces Supabase query builder)
 */

import { db } from '@/lib/db';
import { tags, tradeTags, type Tag } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export type { Tag };

export async function getTags(userId: string): Promise<Tag[]> {
  return db
    .select()
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(tags.name);
}

export async function createTag(
  userId: string,
  name: string,
  color?: string | null
): Promise<Tag> {
  const [row] = await db
    .insert(tags)
    .values({ userId, name, color: color ?? null })
    .returning();
  return row;
}

export async function getTagsForTrade(tradeId: string): Promise<Tag[]> {
  const rows = await db
    .select({ tagId: tradeTags.tagId })
    .from(tradeTags)
    .where(eq(tradeTags.tradeId, tradeId));

  const tagIds = rows.map(r => r.tagId);
  if (tagIds.length === 0) return [];

  return db
    .select()
    .from(tags)
    .where(inArray(tags.id, tagIds));
}

export async function addTagToTrade(tradeId: string, tagId: string): Promise<void> {
  await db.insert(tradeTags).values({ tradeId, tagId }).onConflictDoNothing();
}

export async function removeTagFromTrade(tradeId: string, tagId: string): Promise<void> {
  await db
    .delete(tradeTags)
    .where(and(eq(tradeTags.tradeId, tradeId), eq(tradeTags.tagId, tagId)));
}

export async function updateTradeTags(tradeId: string, tagIds: string[]): Promise<void> {
  const current = await db
    .select({ tagId: tradeTags.tagId })
    .from(tradeTags)
    .where(eq(tradeTags.tradeId, tradeId));

  const currentIds = current.map(r => r.tagId);
  const toAdd = tagIds.filter(id => !currentIds.includes(id));
  const toRemove = currentIds.filter(id => !tagIds.includes(id));

  if (toRemove.length > 0) {
    await db
      .delete(tradeTags)
      .where(and(eq(tradeTags.tradeId, tradeId), inArray(tradeTags.tagId, toRemove)));
  }

  if (toAdd.length > 0) {
    await db
      .insert(tradeTags)
      .values(toAdd.map(tagId => ({ tradeId, tagId })))
      .onConflictDoNothing();
  }
}
