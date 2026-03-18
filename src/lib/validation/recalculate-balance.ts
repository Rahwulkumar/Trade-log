import { z } from 'zod';
import { uuidSchema } from '@/lib/validation/common';

const recalculateBalanceSchema = z
  .object({
    accountId: uuidSchema,
  })
  .strict();

export function parseRecalculateBalancePayload(
  raw: unknown,
): ReturnType<typeof recalculateBalanceSchema.safeParse> {
  return recalculateBalanceSchema.safeParse(raw);
}
