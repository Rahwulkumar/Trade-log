import { z } from 'zod';
import {
  DEFAULT_CHART_TIMEFRAME,
  SUPPORTED_CHART_TIMEFRAMES,
} from '@/lib/chart/timeframes';
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
    timeframe: z.enum(SUPPORTED_CHART_TIMEFRAMES).default(DEFAULT_CHART_TIMEFRAME),
  })
  .strict();

export function parseTradeChartPayload(
  raw: unknown,
): ReturnType<typeof tradeChartPayloadSchema.safeParse> {
  return tradeChartPayloadSchema.safeParse(raw);
}
