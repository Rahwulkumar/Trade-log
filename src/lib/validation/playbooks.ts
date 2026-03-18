import { z } from 'zod';
import { nullableString, nullableStringArray, stringArray, trimmedString } from '@/lib/validation/common';

type JsonRecord = Record<string, unknown>;

const playbookSchema = z
  .object({
    name: trimmedString(160).min(1),
    description: nullableString(4000).optional(),
    rules: z.union([stringArray(100, 240), z.null()]).optional(),
    tags: nullableStringArray(50, 60).optional(),
    isActive: z.union([z.boolean(), z.null()]).optional(),
  })
  .strict();

const playbookUpdateSchema = playbookSchema.partial();

function normalizePlaybookPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return raw;
  }

  const source = raw as JsonRecord;
  const normalized: JsonRecord = { ...source };

  if (normalized.isActive === undefined && source.is_active !== undefined) {
    normalized.isActive = source.is_active;
  }
  delete normalized.is_active;

  return normalized;
}

export function parsePlaybookCreatePayload(
  raw: unknown,
): ReturnType<typeof playbookSchema.safeParse> {
  return playbookSchema.safeParse(normalizePlaybookPayload(raw));
}

export function parsePlaybookUpdatePayload(
  raw: unknown,
): ReturnType<typeof playbookUpdateSchema.safeParse> {
  return playbookUpdateSchema.safeParse(normalizePlaybookPayload(raw));
}
