import { z } from 'zod';

import {
  ANALYTICS_WORKSPACE_DIMENSIONS,
  ANALYTICS_WORKSPACE_MEASURES,
  ANALYTICS_WORKSPACE_RULE_STATUSES,
  ANALYTICS_WORKSPACE_REVIEW_STATES,
  ANALYTICS_WORKSPACE_SORT_ORDERS,
} from '@/lib/analytics/workspace-types';
import { REPORT_ACCOUNT_SCOPES, REPORT_TYPES } from '@/lib/reports/types';
import { dateOnlyString, nullableString, trimmedString, uuidSchema } from '@/lib/validation/common';

const reportTypeSchema = z.enum(REPORT_TYPES);
const reportAccountScopeSchema = z.enum(REPORT_ACCOUNT_SCOPES);

export const reportGeneratePayloadSchema = z
  .object({
    title: nullableString(160).optional(),
    reportType: reportTypeSchema,
    accountScope: reportAccountScopeSchema,
    propAccountId: z.union([uuidSchema, z.null()]).optional(),
    from: dateOnlyString.optional(),
    to: dateOnlyString.optional(),
    includeAi: z.boolean().optional(),
    groupBy: z.enum(ANALYTICS_WORKSPACE_DIMENSIONS).optional(),
    measure: z.enum(ANALYTICS_WORKSPACE_MEASURES).optional(),
    sortOrder: z.enum(ANALYTICS_WORKSPACE_SORT_ORDERS).optional(),
    limit: z.number().int().min(5).max(100).optional(),
    timeZone: nullableString(64).optional(),
    symbol: nullableString(32).optional(),
    session: nullableString(32).optional(),
    playbookId: z.union([uuidSchema, z.literal('unassigned'), z.null()]).optional(),
    setupDefinitionId: z.union([uuidSchema, z.literal('unassigned'), z.null()]).optional(),
    mistakeDefinitionId: z.union([uuidSchema, z.literal('unassigned'), z.null()]).optional(),
    journalTemplateId: z.union([uuidSchema, z.literal('unassigned'), z.null()]).optional(),
    setupTag: nullableString(64).optional(),
    mistakeTag: nullableString(64).optional(),
    direction: z.enum(['LONG', 'SHORT']).nullable().optional(),
    reviewStatus: z.union([z.enum(ANALYTICS_WORKSPACE_REVIEW_STATES), z.null()]).optional(),
    ruleStatus: z.union([z.enum(ANALYTICS_WORKSPACE_RULE_STATUSES), z.null()]).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.accountScope === 'account' && !value.propAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'propAccountId is required when accountScope is account',
        path: ['propAccountId'],
      });
    }

    if (value.accountScope !== 'account' && value.propAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'propAccountId can only be supplied for account scope',
        path: ['propAccountId'],
      });
    }

    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'from must be before or equal to to',
        path: ['from'],
      });
    }
  });

export const reportSavePayloadSchema = z.object({
  title: trimmedString(160).min(1),
  snapshot: z.record(z.string(), z.unknown()),
});

export const reportRenamePayloadSchema = z.object({
  title: trimmedString(160).min(1),
});

export function parseReportGeneratePayload(
  raw: unknown,
): ReturnType<typeof reportGeneratePayloadSchema.safeParse> {
  return reportGeneratePayloadSchema.safeParse(raw);
}

export function parseReportSavePayload(
  raw: unknown,
): ReturnType<typeof reportSavePayloadSchema.safeParse> {
  return reportSavePayloadSchema.safeParse(raw);
}

export function parseReportRenamePayload(
  raw: unknown,
): ReturnType<typeof reportRenamePayloadSchema.safeParse> {
  return reportRenamePayloadSchema.safeParse(raw);
}
