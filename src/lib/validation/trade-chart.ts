import { z } from 'zod';
import { trimmedString, uuidSchema } from '@/lib/validation/common';

const isoDateTimeString = z.string().trim().min(1).refine(
  (value) => !Number.isNaN(new Date(value).getTime()),
  'Expected a valid ISO timestamp',
);

const tradeChartPayloadSchema = z
  .object({
    tradeId: uuidSchema,
    symbol: trimmedString(32).min(1),
    entryTime: isoDateTimeString,
    exitTime: isoDateTimeString,
  })
  .strict();

export function parseTradeChartPayload(
  raw: unknown,
): ReturnType<typeof tradeChartPayloadSchema.safeParse> {
  return tradeChartPayloadSchema.safeParse(raw);
}
