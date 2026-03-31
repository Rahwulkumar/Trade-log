import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  journalTemplates,
  mistakeDefinitions,
  ruleSetItems,
  ruleSets,
  setupDefinitions,
  type JournalTemplate,
  type JournalTemplateInsert,
  type MistakeDefinition,
  type MistakeDefinitionInsert,
  type RuleSet,
  type RuleSetInsert,
  type RuleSetItemInsert,
  type SetupDefinition,
  type SetupDefinitionInsert,
} from "@/lib/db/schema";
import { toPersistedTemplateConfig } from "@/lib/validation/journal-structure";
import type { RuleSetWithItems } from "@/lib/rulebooks/types";

type ScopedInsert<T> = Omit<T, "id" | "userId" | "createdAt" | "updatedAt">;

export async function getSetupDefinitions(
  userId: string,
  options?: { activeOnly?: boolean },
): Promise<SetupDefinition[]> {
  return db
    .select()
    .from(setupDefinitions)
    .where(
      options?.activeOnly
        ? and(
            eq(setupDefinitions.userId, userId),
            eq(setupDefinitions.isActive, true),
          )
        : eq(setupDefinitions.userId, userId),
    )
    .orderBy(asc(setupDefinitions.name));
}

export async function getSetupDefinition(
  id: string,
  userId: string,
): Promise<SetupDefinition | null> {
  const [row] = await db
    .select()
    .from(setupDefinitions)
    .where(and(eq(setupDefinitions.id, id), eq(setupDefinitions.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function createSetupDefinition(
  userId: string,
  data: ScopedInsert<SetupDefinitionInsert>,
): Promise<SetupDefinition> {
  const [row] = await db
    .insert(setupDefinitions)
    .values({ ...data, userId })
    .returning();
  return row;
}

export async function updateSetupDefinition(
  id: string,
  userId: string,
  updates: Partial<ScopedInsert<SetupDefinitionInsert>>,
): Promise<SetupDefinition> {
  const [row] = await db
    .update(setupDefinitions)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(setupDefinitions.id, id), eq(setupDefinitions.userId, userId)))
    .returning();

  if (!row) {
    throw new Error("Setup definition not found");
  }

  return row;
}

export async function deleteSetupDefinition(
  id: string,
  userId: string,
): Promise<void> {
  await db
    .delete(setupDefinitions)
    .where(and(eq(setupDefinitions.id, id), eq(setupDefinitions.userId, userId)));
}

export async function getMistakeDefinitions(
  userId: string,
  options?: { activeOnly?: boolean },
): Promise<MistakeDefinition[]> {
  return db
    .select()
    .from(mistakeDefinitions)
    .where(
      options?.activeOnly
        ? and(
            eq(mistakeDefinitions.userId, userId),
            eq(mistakeDefinitions.isActive, true),
          )
        : eq(mistakeDefinitions.userId, userId),
    )
    .orderBy(asc(mistakeDefinitions.name));
}

export async function getMistakeDefinition(
  id: string,
  userId: string,
): Promise<MistakeDefinition | null> {
  const [row] = await db
    .select()
    .from(mistakeDefinitions)
    .where(
      and(eq(mistakeDefinitions.id, id), eq(mistakeDefinitions.userId, userId)),
    )
    .limit(1);
  return row ?? null;
}

export async function createMistakeDefinition(
  userId: string,
  data: ScopedInsert<MistakeDefinitionInsert>,
): Promise<MistakeDefinition> {
  const [row] = await db
    .insert(mistakeDefinitions)
    .values({ ...data, userId })
    .returning();
  return row;
}

export async function updateMistakeDefinition(
  id: string,
  userId: string,
  updates: Partial<ScopedInsert<MistakeDefinitionInsert>>,
): Promise<MistakeDefinition> {
  const [row] = await db
    .update(mistakeDefinitions)
    .set({ ...updates, updatedAt: new Date() })
    .where(
      and(eq(mistakeDefinitions.id, id), eq(mistakeDefinitions.userId, userId)),
    )
    .returning();

  if (!row) {
    throw new Error("Mistake definition not found");
  }

  return row;
}

export async function deleteMistakeDefinition(
  id: string,
  userId: string,
): Promise<void> {
  await db
    .delete(mistakeDefinitions)
    .where(
      and(eq(mistakeDefinitions.id, id), eq(mistakeDefinitions.userId, userId)),
    );
}

export async function getJournalTemplates(
  userId: string,
  options?: { activeOnly?: boolean },
): Promise<JournalTemplate[]> {
  return db
    .select()
    .from(journalTemplates)
    .where(
      options?.activeOnly
        ? and(
            eq(journalTemplates.userId, userId),
            eq(journalTemplates.isActive, true),
          )
        : eq(journalTemplates.userId, userId),
    )
    .orderBy(desc(journalTemplates.updatedAt), asc(journalTemplates.name));
}

export async function getJournalTemplate(
  id: string,
  userId: string,
): Promise<JournalTemplate | null> {
  const [row] = await db
    .select()
    .from(journalTemplates)
    .where(and(eq(journalTemplates.id, id), eq(journalTemplates.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function createJournalTemplate(
  userId: string,
  data: ScopedInsert<JournalTemplateInsert>,
): Promise<JournalTemplate> {
  const [row] = await db
    .insert(journalTemplates)
    .values({
      ...data,
      userId,
      config: toPersistedTemplateConfig(
        (data.config as Record<string, unknown> | undefined) as never,
      ),
    })
    .returning();
  return row;
}

export async function updateJournalTemplate(
  id: string,
  userId: string,
  updates: Partial<ScopedInsert<JournalTemplateInsert>>,
): Promise<JournalTemplate> {
  const nextValues: Partial<ScopedInsert<JournalTemplateInsert>> & {
    updatedAt: Date;
  } = {
    ...updates,
    updatedAt: new Date(),
  };

  if (updates.config !== undefined) {
    nextValues.config = toPersistedTemplateConfig(
      (updates.config as Record<string, unknown> | undefined) as never,
    );
  }

  const [row] = await db
    .update(journalTemplates)
    .set(nextValues)
    .where(and(eq(journalTemplates.id, id), eq(journalTemplates.userId, userId)))
    .returning();

  if (!row) {
    throw new Error("Journal template not found");
  }

  return row;
}

export async function deleteJournalTemplate(
  id: string,
  userId: string,
): Promise<void> {
  await db
    .delete(journalTemplates)
    .where(and(eq(journalTemplates.id, id), eq(journalTemplates.userId, userId)));
}

async function getRuleSetItemsForRuleSets(
  userId: string,
  ids: string[],
) {
  if (ids.length === 0) {
    return new Map<string, RuleSetWithItems["items"]>();
  }

  const items = await db
    .select()
    .from(ruleSetItems)
    .where(
      and(eq(ruleSetItems.userId, userId), inArray(ruleSetItems.ruleSetId, ids)),
    )
    .orderBy(asc(ruleSetItems.sortOrder), asc(ruleSetItems.createdAt));

  const itemsByRuleSet = new Map<string, RuleSetWithItems["items"]>();

  for (const item of items) {
    const current = itemsByRuleSet.get(item.ruleSetId) ?? [];
    current.push(item);
    itemsByRuleSet.set(item.ruleSetId, current);
  }

  return itemsByRuleSet;
}

async function attachRuleSetItems(
  userId: string,
  rows: RuleSet[],
): Promise<RuleSetWithItems[]> {
  const itemsByRuleSet = await getRuleSetItemsForRuleSets(
    userId,
    rows.map((row) => row.id),
  );

  return rows.map((row) => ({
    ...row,
    items: itemsByRuleSet.get(row.id) ?? [],
  }));
}

async function replaceRuleSetItems(
  userId: string,
  ruleSetId: string,
  items: Array<Omit<RuleSetItemInsert, "id" | "userId" | "ruleSetId" | "createdAt" | "updatedAt">>,
): Promise<void> {
  await db
    .delete(ruleSetItems)
    .where(and(eq(ruleSetItems.ruleSetId, ruleSetId), eq(ruleSetItems.userId, userId)));

  if (items.length === 0) {
    return;
  }

  await db.insert(ruleSetItems).values(
    items.map((item, index) => ({
      ...item,
      userId,
      ruleSetId,
      sortOrder: index,
    })),
  );
}

export async function getRuleSets(
  userId: string,
  options?: { activeOnly?: boolean },
): Promise<RuleSetWithItems[]> {
  const rows = await db
    .select()
    .from(ruleSets)
    .where(
      options?.activeOnly
        ? and(eq(ruleSets.userId, userId), eq(ruleSets.isActive, true))
        : eq(ruleSets.userId, userId),
    )
    .orderBy(desc(ruleSets.updatedAt), asc(ruleSets.name));

  return attachRuleSetItems(userId, rows);
}

export async function getRuleSet(
  id: string,
  userId: string,
): Promise<RuleSetWithItems | null> {
  const [row] = await db
    .select()
    .from(ruleSets)
    .where(and(eq(ruleSets.id, id), eq(ruleSets.userId, userId)))
    .limit(1);

  if (!row) {
    return null;
  }

  const [withItems] = await attachRuleSetItems(userId, [row]);
  return withItems ?? null;
}

export async function createRuleSet(
  userId: string,
  data: Omit<RuleSetInsert, "id" | "userId" | "createdAt" | "updatedAt"> & {
    items: Array<
      Omit<
        RuleSetItemInsert,
        "id" | "userId" | "ruleSetId" | "createdAt" | "updatedAt" | "sortOrder"
      >
    >;
  },
): Promise<RuleSetWithItems> {
  const { items, ...ruleSetData } = data;
  const [row] = await db
    .insert(ruleSets)
    .values({ ...ruleSetData, userId })
    .returning();

  await replaceRuleSetItems(userId, row.id, items);
  const saved = await getRuleSet(row.id, userId);
  if (!saved) {
    throw new Error("Rulebook not found after create");
  }
  return saved;
}

export async function updateRuleSet(
  id: string,
  userId: string,
  updates: Partial<
    Omit<RuleSetInsert, "id" | "userId" | "createdAt" | "updatedAt">
  > & {
    items?: Array<
      Omit<
        RuleSetItemInsert,
        "id" | "userId" | "ruleSetId" | "createdAt" | "updatedAt" | "sortOrder"
      >
    >;
  },
): Promise<RuleSetWithItems> {
  const { items, ...ruleSetUpdates } = updates;
  const [row] = await db
    .update(ruleSets)
    .set({ ...ruleSetUpdates, updatedAt: new Date() })
    .where(and(eq(ruleSets.id, id), eq(ruleSets.userId, userId)))
    .returning();

  if (!row) {
    throw new Error("Rulebook not found");
  }

  if (items !== undefined) {
    await replaceRuleSetItems(userId, id, items);
  }

  const saved = await getRuleSet(id, userId);
  if (!saved) {
    throw new Error("Rulebook not found after update");
  }
  return saved;
}

export async function deleteRuleSet(
  id: string,
  userId: string,
): Promise<void> {
  await db
    .delete(ruleSets)
    .where(and(eq(ruleSets.id, id), eq(ruleSets.userId, userId)));
}
