import { z } from 'zod';

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
    symbol: nullableString(32).optional(),
    playbookId: z.union([uuidSchema, z.null()]).optional(),
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
