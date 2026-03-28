import type { ChatMessage } from '@/lib/api/gemini';
import { z } from 'zod';
import { nullableString, stringArray, trimmedString } from '@/lib/validation/common';

const chatMessageSchema = z
  .object({
    id: z.string().trim().min(1).max(128).optional(),
    role: z.enum(['user', 'assistant']),
    content: trimmedString(4000).min(1),
    timestamp: z.string().trim().min(1).max(128).optional(),
  })
  .transform((message): ChatMessage => ({
    id: message.id ?? crypto.randomUUID(),
    role: message.role,
    content: message.content,
    timestamp: message.timestamp ?? new Date().toISOString(),
  }));

const strategyContextSchema = z
  .object({
    existingStrategies: stringArray(50, 160).optional(),
    tradingHistory: z.array(z.record(z.string(), z.unknown())).max(500).optional(),
  })
  .strict();

const analyzedTradeSchema = z
  .object({
    symbol: trimmedString(32).min(1),
    pnl: z.union([z.number().finite(), z.null()]).optional(),
    entry_date: trimmedString(128).min(1),
  })
  .passthrough();

const newsEventSchema = z
  .object({
    event: trimmedString(200).min(1),
    currency: trimmedString(16).min(1),
    impact: trimmedString(32).min(1),
    actual: nullableString(120).optional(),
    forecast: nullableString(120).optional(),
    previous: nullableString(120).optional(),
    country: trimmedString(120).min(1),
  })
  .passthrough();

const strategyEvaluationSchema = z
  .object({
    name: trimmedString(160).min(1),
    description: nullableString(4000).optional(),
    rules: stringArray(40, 400).min(1),
  })
  .strict();

const aiRequestSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('evaluate-strategy'),
      strategy: strategyEvaluationSchema,
      context: strategyContextSchema.optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('chat'),
      messages: z.array(chatMessageSchema).min(1).max(40),
      newMessage: trimmedString(4000).min(1),
    })
    .strict(),
  z
    .object({
      action: z.literal('analyze-trades'),
      trades: z.array(analyzedTradeSchema).min(1).max(500),
      focusAreas: stringArray(10, 80).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('analyze-news'),
      events: z.array(newsEventSchema).min(1).max(25),
      pair: trimmedString(32)
        .min(1)
        .transform((value) => value.toUpperCase()),
      question: nullableString(4000).optional(),
    })
    .strict(),
]);

export function parseAiRequestPayload(
  raw: unknown,
): ReturnType<typeof aiRequestSchema.safeParse> {
  return aiRequestSchema.safeParse(raw);
}
