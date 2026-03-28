import { z } from 'zod';
import {
  DEFAULT_CHART_TIMEFRAME,
  SUPPORTED_CHART_TIMEFRAMES,
} from '@/lib/chart/timeframes';
import { uuidSchema } from '@/lib/validation/common';

const tradeChartPayloadSchema = z
  .object({
    tradeId: uuidSchema,
    timeframe: z.enum(SUPPORTED_CHART_TIMEFRAMES).default(DEFAULT_CHART_TIMEFRAME),
  })
  .strict();

export function parseTradeChartPayload(
  raw: unknown,
): ReturnType<typeof tradeChartPayloadSchema.safeParse> {
  return tradeChartPayloadSchema.safeParse(raw);
}
