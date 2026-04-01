import { z } from 'zod';

type JsonRecord = Record<string, unknown>;

const uuidSchema = z.string().uuid();
const trimmedString = (max: number) => z.string().trim().max(max);
const nullableString = (max: number) =>
  z.union([z.string(), z.null()]).transform((value) => {
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, max) : null;
  });

const nullableUuid = z.union([uuidSchema, z.null()]);

const numericString = z.union([z.number().finite(), z.string().trim().min(1)]).transform(
  (value, ctx) => {
    const raw = typeof value === 'number' ? String(value) : value.trim();
    if (!Number.isFinite(Number(raw))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expected a numeric value',
      });
      return z.NEVER;
    }
    return raw;
  },
);

const nullableNumericString = z.union([z.number().finite(), z.string().trim().min(1), z.null()]).transform(
  (value, ctx) => {
    if (value === null) return null;
    const raw = typeof value === 'number' ? String(value) : value.trim();
    if (!Number.isFinite(Number(raw))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expected a numeric value',
      });
      return z.NEVER;
    }
    return raw;
  },
);

const nullableDate = z.union([z.string(), z.date(), z.null()]).transform((value, ctx) => {
  if (value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Expected a valid date',
    });
    return z.NEVER;
  }
  return date;
});

const requiredDate = z.union([z.string(), z.date()]).transform((value, ctx) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Expected a valid date',
    });
    return z.NEVER;
  }
  return date;
});

const nullableNumber = z.union([z.number().finite(), z.null()]);
const nullableBoolean = z.union([z.boolean(), z.null()]);
const nullableInteger = z.union([z.number().int(), z.string().trim().min(1), z.null()]).transform(
  (value, ctx) => {
    if (value === null) return null;
    const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
    if (!Number.isInteger(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expected an integer value',
      });
      return z.NEVER;
    }
    return parsed;
  },
);

const stringArray = z.array(z.string().trim().min(1).max(120)).max(50);
const normalizedUuidArray = z
  .union([z.array(uuidSchema).max(50), z.null()])
  .transform((value) => value ?? []);
const qualityRating = z
  .union([
    z.enum(['Good', 'Neutral', 'Poor']),
    z.enum(['1', '2', '3', '4', '5']),
    z.number().int().min(1).max(5),
    z.null(),
  ])
  .transform((value) => {
    if (value === null) return null;
    return typeof value === 'number' ? String(value) : value;
  });
const tradeStatus = z
  .enum(['OPEN', 'CLOSED', 'open', 'closed'])
  .transform((value) => value.toUpperCase() as 'OPEN' | 'CLOSED');
const direction = z.enum(['LONG', 'SHORT']);

const tfObservations = z.union([
  z.record(
    z.string(),
    z.object({
      bias: z.string().trim().max(120).optional(),
      notes: z.string().trim().max(4000).optional(),
    }),
  ),
  z.null(),
]);

const journalReview = z.union([
  z
    .object({
      strategyName: nullableString(200).optional(),
      setupName: nullableString(200).optional(),
      reasonForTrade: nullableString(10000).optional(),
      invalidation: nullableString(4000).optional(),
      targetPlan: nullableString(4000).optional(),
      entryRatingScore: z.union([z.number().int().min(1).max(5), z.null()]).optional(),
      exitRatingScore: z.union([z.number().int().min(1).max(5), z.null()]).optional(),
      managementRatingScore: z.union([z.number().int().min(1).max(5), z.null()]).optional(),
      timeframeAlignment: z
        .union([
          z.enum(['aligned', 'mixed', 'countertrend', 'unclear']),
          z.null(),
        ])
        .optional(),
      retakeDecision: z
        .union([z.enum(['yes', 'maybe', 'no']), z.null()])
        .optional(),
      higherTimeframeBias: nullableString(200).optional(),
      higherTimeframeNotes: nullableString(4000).optional(),
      executionTimeframe: nullableString(120).optional(),
      triggerTimeframe: nullableString(120).optional(),
      entryReason: nullableString(8000).optional(),
      managementReview: nullableString(8000).optional(),
      exitReason: nullableString(8000).optional(),
      psychologyBefore: nullableString(4000).optional(),
      psychologyDuring: nullableString(4000).optional(),
      psychologyAfter: nullableString(4000).optional(),
      marketContext: nullableString(4000).optional(),
      followUpAction: nullableString(4000).optional(),
    })
    .strict(),
  z.null(),
]);

const journalTemplateSnapshot = z.union([
  z.record(z.string(), z.unknown()),
  z.null(),
]);

const tradeRuleResults = z
  .array(
    z.object({
      ruleItemId: uuidSchema,
      title: trimmedString(160).min(1),
      category: nullableString(120).optional(),
      severity: nullableString(60).optional(),
      status: z.enum(["followed", "broken", "skipped", "notApplicable"]),
    }),
  )
  .max(100);
const normalizedTradeRuleResults = z
  .union([tradeRuleResults, z.null()])
  .transform((value) => value ?? []);

const screenshotEntry = z.union([
  z.string().trim().min(1).max(4000),
  z.object({
    url: z.string().trim().min(1).max(4000),
    timeframe: z.string().trim().max(64).optional(),
    created_at: z.string().trim().max(128).optional(),
  }),
]);
const screenshotsPayload = z
  .union([z.array(screenshotEntry).max(50), z.null()])
  .transform((value) => value ?? []);

const tradeCreateSchema = z
  .object({
    symbol: trimmedString(32).min(1),
    direction,
    status: tradeStatus.optional().default('OPEN'),
    entryPrice: numericString,
    exitPrice: nullableNumericString.optional(),
    positionSize: numericString,
    stopLoss: nullableNumericString.optional(),
    takeProfit: nullableNumericString.optional(),
    pnl: nullableNumericString.optional(),
    rMultiple: nullableNumericString.optional(),
    commission: nullableNumericString.optional(),
    swap: nullableNumericString.optional(),
    entryDate: requiredDate,
    exitDate: nullableDate.optional(),
    propAccountId: nullableUuid.optional(),
    playbookId: nullableUuid.optional(),
    setupDefinitionId: nullableUuid.optional(),
    journalTemplateId: nullableUuid.optional(),
    ruleSetId: nullableUuid.optional(),
    notes: nullableString(10000).optional(),
    feelings: nullableString(4000).optional(),
    observations: nullableString(10000).optional(),
    screenshots: screenshotsPayload.optional(),
    chartData: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown()), z.null()]).optional(),
    mae: nullableNumber.optional(),
    mfe: nullableNumber.optional(),
    session: nullableString(64).optional(),
    marketCondition: nullableString(64).optional(),
    setupTags: stringArray.nullable().optional(),
    mistakeTags: stringArray.nullable().optional(),
    mistakeDefinitionIds: normalizedUuidArray.optional(),
    tradeRuleResults: normalizedTradeRuleResults.optional(),
    entryRating: qualityRating.optional(),
    exitRating: qualityRating.optional(),
    managementRating: qualityRating.optional(),
    conviction: z.union([z.number().int().min(1).max(5), z.null()]).optional(),
    lessonLearned: nullableString(4000).optional(),
    wouldTakeAgain: nullableBoolean.optional(),
    journalReview: journalReview.optional(),
    journalTemplateSnapshot: journalTemplateSnapshot.optional(),
    tfObservations: tfObservations.optional(),
    executionNotes: nullableString(10000).optional(),
    executionArrays: stringArray.nullable().optional(),
    externalTicket: nullableString(128).optional(),
    externalId: nullableString(128).optional(),
    externalDealId: nullableString(128).optional(),
    mt5AccountId: nullableUuid.optional(),
    contractSize: nullableNumericString.optional(),
    assetType: nullableString(64).optional(),
    magicNumber: nullableInteger.optional(),
  })
  .strict();

const tradeUpdateSchema = tradeCreateSchema.partial();

function normalizeTradePayload(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return raw;
  }

  const source = raw as JsonRecord;
  const normalized: JsonRecord = { ...source };
  const aliases: Record<string, string> = {
    prop_account_id: 'propAccountId',
    playbook_id: 'playbookId',
    setup_definition_id: 'setupDefinitionId',
    journal_template_id: 'journalTemplateId',
    rule_set_id: 'ruleSetId',
    entry_price: 'entryPrice',
    exit_price: 'exitPrice',
    position_size: 'positionSize',
    stop_loss: 'stopLoss',
    take_profit: 'takeProfit',
    entry_date: 'entryDate',
    exit_date: 'exitDate',
    r_multiple: 'rMultiple',
    chart_data: 'chartData',
    market_condition: 'marketCondition',
    setup_tags: 'setupTags',
    mistake_tags: 'mistakeTags',
    mistake_definition_ids: 'mistakeDefinitionIds',
    trade_rule_results: 'tradeRuleResults',
    entry_rating: 'entryRating',
    exit_rating: 'exitRating',
    management_rating: 'managementRating',
    lesson_learned: 'lessonLearned',
    would_take_again: 'wouldTakeAgain',
    journal_review: 'journalReview',
    journal_template_snapshot: 'journalTemplateSnapshot',
    tf_observations: 'tfObservations',
    execution_notes: 'executionNotes',
    execution_arrays: 'executionArrays',
    external_ticket: 'externalTicket',
    external_id: 'externalId',
    external_deal_id: 'externalDealId',
    mt5_account_id: 'mt5AccountId',
    contract_size: 'contractSize',
    asset_type: 'assetType',
    magic_number: 'magicNumber',
  };

  for (const [from, to] of Object.entries(aliases)) {
    if (normalized[to] === undefined && source[from] !== undefined) {
      normalized[to] = source[from];
    }
    delete normalized[from];
  }

  return normalized;
}

export function parseTradeCreatePayload(
  raw: unknown,
): ReturnType<typeof tradeCreateSchema.safeParse> {
  return tradeCreateSchema.safeParse(normalizeTradePayload(raw));
}

export function parseTradeUpdatePayload(
  raw: unknown,
): ReturnType<typeof tradeUpdateSchema.safeParse> {
  return tradeUpdateSchema.safeParse(normalizeTradePayload(raw));
}
