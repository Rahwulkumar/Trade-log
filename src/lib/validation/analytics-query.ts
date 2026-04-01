import { z } from "zod";

import { dateOnlyString, uuidSchema } from "@/lib/validation/common";
import {
  ANALYTICS_WORKSPACE_DIMENSIONS,
  ANALYTICS_WORKSPACE_MEASURES,
  ANALYTICS_WORKSPACE_RULE_STATUSES,
  ANALYTICS_WORKSPACE_SORT_ORDERS,
  ANALYTICS_WORKSPACE_REVIEW_STATES,
} from "@/lib/analytics/workspace-types";

const nullableTrimmedString = z
  .union([z.string(), z.null()])
  .transform((value) => {
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

const analyticsWorkspaceFiltersSchema = z
  .object({
    accountScope: z.string().trim().min(1).default("all"),
    from: dateOnlyString.default(null),
    to: dateOnlyString.default(null),
    timeZone: nullableTrimmedString
      .refine((value) => value === null || isValidTimeZone(value), {
        message: "Invalid time zone",
      })
      .default(null),
    symbol: nullableTrimmedString.default(null),
    session: nullableTrimmedString.default(null),
    playbookId: z.union([uuidSchema, z.literal("unassigned"), z.null()]).default(null),
    setupDefinitionId: z
      .union([uuidSchema, z.literal("unassigned"), z.null()])
      .default(null),
    mistakeDefinitionId: z
      .union([uuidSchema, z.literal("unassigned"), z.null()])
      .default(null),
    journalTemplateId: z
      .union([uuidSchema, z.literal("unassigned"), z.null()])
      .default(null),
    setupTag: nullableTrimmedString.default(null),
    mistakeTag: nullableTrimmedString.default(null),
    direction: z.union([z.literal("LONG"), z.literal("SHORT"), z.null()]).default(null),
    reviewStatus: z
      .union([z.enum(ANALYTICS_WORKSPACE_REVIEW_STATES), z.null()])
      .default(null),
    ruleStatus: z
      .union([z.enum(ANALYTICS_WORKSPACE_RULE_STATUSES), z.null()])
      .default(null),
  })
  .strict();

const analyticsWorkspaceQuerySchema = z
  .object({
    groupBy: z.enum(ANALYTICS_WORKSPACE_DIMENSIONS).default("symbol"),
    measure: z.enum(ANALYTICS_WORKSPACE_MEASURES).default("netPnl"),
    sortOrder: z.enum(ANALYTICS_WORKSPACE_SORT_ORDERS).default("desc"),
    limit: z.number().int().min(5).max(100).default(24),
    drilldownKey: nullableTrimmedString.default(null),
    filters: analyticsWorkspaceFiltersSchema,
  })
  .strict();

export function parseAnalyticsWorkspaceQuery(
  raw: unknown,
): ReturnType<typeof analyticsWorkspaceQuerySchema.safeParse> {
  return analyticsWorkspaceQuerySchema.safeParse(raw);
}
