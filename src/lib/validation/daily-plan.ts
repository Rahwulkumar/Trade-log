import { z } from 'zod';
import { nullableString, stringArray } from '@/lib/validation/common';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const dailyPlanUpsertSchema = z
  .object({
    date: z
      .string()
      .trim()
      .regex(dateRegex, 'Expected date in YYYY-MM-DD format'),
    bias: z.enum(['Bullish', 'Neutral', 'Bearish']).nullable().optional(),
    playbook_id: z.string().uuid().nullable().optional(),
    max_trades: z.number().int().positive().max(100).nullable().optional(),
    daily_limit: z.number().finite().min(0).nullable().optional(),
    universal_rules_checked: stringArray(100, 300).optional(),
    strategy_rules_checked: stringArray(100, 300).optional(),
    pre_note: nullableString(5000).optional(),
    day_grade: z.enum(['A', 'B', 'C', 'D', 'F']).nullable().optional(),
    went_well: nullableString(5000).optional(),
    went_wrong: nullableString(5000).optional(),
  })
  .strict();

export type DailyPlanUpsert = z.infer<typeof dailyPlanUpsertSchema>;

export function parseDailyPlanUpsert(raw: unknown): ReturnType<typeof dailyPlanUpsertSchema.safeParse> {
  return dailyPlanUpsertSchema.safeParse(raw);
}
