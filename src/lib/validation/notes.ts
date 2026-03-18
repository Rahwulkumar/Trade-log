import { z } from 'zod';
import { nullableString, stringArray } from '@/lib/validation/common';

const noteCreateSchema = z
  .object({
    title: nullableString(200).optional(),
    icon: nullableString(16).optional(),
  })
  .strict();

const noteUpdateSchema = z
  .object({
    title: nullableString(200).optional(),
    content: z.union([z.string().max(500_000), z.null()]).optional(),
    icon: nullableString(16).optional(),
    pinned: z.boolean().optional(),
    tags: stringArray(50, 60).optional(),
  })
  .strict();

export function parseNoteCreatePayload(
  raw: unknown,
): ReturnType<typeof noteCreateSchema.safeParse> {
  return noteCreateSchema.safeParse(raw);
}

export function parseNoteUpdatePayload(
  raw: unknown,
): ReturnType<typeof noteUpdateSchema.safeParse> {
  return noteUpdateSchema.safeParse(raw);
}
