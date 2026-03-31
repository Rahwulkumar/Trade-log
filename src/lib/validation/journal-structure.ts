import { z } from "zod";
import {
  nullableString,
  stringArray,
  trimmedString,
  uuidSchema,
} from "@/lib/validation/common";
import {
  DEFAULT_JOURNAL_TEMPLATE_CONFIG,
  JOURNAL_TEMPLATE_CHAPTER_IDS,
  JOURNAL_TEMPLATE_SCOPE_TYPES,
  normalizeJournalTemplateConfig,
  type JournalTemplateConfig,
} from "@/lib/journal-structure/types";
import { RULE_SET_SCOPE_TYPES } from "@/lib/rulebooks/types";

type JsonRecord = Record<string, unknown>;

const nullableUuid = z.union([uuidSchema, z.null()]);

const entryCriteriaSchema = z.union([stringArray(20, 200), z.null()]).optional();

const setupDefinitionSchema = z
  .object({
    playbookId: nullableUuid.optional(),
    defaultTemplateId: nullableUuid.optional(),
    name: trimmedString(160).min(1),
    description: nullableString(4000).optional(),
    preferredSession: nullableString(80).optional(),
    preferredMarketCondition: nullableString(80).optional(),
    entryCriteria: entryCriteriaSchema,
    invalidationRules: nullableString(4000).optional(),
    managementNotes: nullableString(4000).optional(),
    exampleNotes: nullableString(4000).optional(),
    isActive: z.union([z.boolean(), z.null()]).optional(),
  })
  .strict();

const mistakeDefinitionSchema = z
  .object({
    name: trimmedString(160).min(1),
    category: nullableString(120).optional(),
    severity: nullableString(60).optional(),
    description: nullableString(4000).optional(),
    correctionGuidance: nullableString(4000).optional(),
    isActive: z.union([z.boolean(), z.null()]).optional(),
  })
  .strict();

const templateConfigInputSchema = z
  .object({
    enabledChapters: z
      .array(z.enum(JOURNAL_TEMPLATE_CHAPTER_IDS))
      .min(1)
      .max(JOURNAL_TEMPLATE_CHAPTER_IDS.length)
      .optional(),
    requiredFields: stringArray(30, 120).optional(),
    checklistItems: stringArray(30, 200).optional(),
    screenshotRequired: z.boolean().optional(),
    prompts: z
      .object({
        narrative: z.string().trim().max(600).nullish(),
        thesis: z.string().trim().max(600).nullish(),
        market: z.string().trim().max(600).nullish(),
        execution: z.string().trim().max(600).nullish(),
        psychology: z.string().trim().max(600).nullish(),
        closeout: z.string().trim().max(600).nullish(),
      })
      .partial()
      .optional(),
  })
  .strict();

const journalTemplateSchema = z
  .object({
    name: trimmedString(160).min(1),
    description: nullableString(4000).optional(),
    scopeType: z.enum(JOURNAL_TEMPLATE_SCOPE_TYPES).optional(),
    playbookId: nullableUuid.optional(),
    config: templateConfigInputSchema.optional(),
    version: z.number().int().min(1).max(100).optional(),
    isActive: z.union([z.boolean(), z.null()]).optional(),
  })
  .strict();

const ruleSetItemSchema = z
  .object({
    title: trimmedString(160).min(1),
    description: nullableString(2000).optional(),
    category: nullableString(120).optional(),
    severity: nullableString(60).optional(),
    isActive: z.union([z.boolean(), z.null()]).optional(),
  })
  .strict();

function validateRuleSetScope(
  value: {
    scopeType?: (typeof RULE_SET_SCOPE_TYPES)[number];
    playbookId?: string | null;
    setupDefinitionId?: string | null;
    journalTemplateId?: string | null;
    propAccountId?: string | null;
  },
  ctx: z.RefinementCtx,
) {
  const hasPlaybook = Boolean(value.playbookId);
  const hasSetup = Boolean(value.setupDefinitionId);
  const hasTemplate = Boolean(value.journalTemplateId);
  const hasAccount = Boolean(value.propAccountId);

  if (value.scopeType === "playbook" && !hasPlaybook) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Playbook-scoped rulebooks require a playbook",
      path: ["playbookId"],
    });
  }

  if (value.scopeType === "setup" && !hasSetup) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Setup-scoped rulebooks require a setup",
      path: ["setupDefinitionId"],
    });
  }

  if (value.scopeType === "template" && !hasTemplate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Template-scoped rulebooks require a template",
      path: ["journalTemplateId"],
    });
  }

  if (value.scopeType === "account" && !hasAccount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Account-scoped rulebooks require an account",
      path: ["propAccountId"],
    });
  }
}

const ruleSetSchemaBase = z
  .object({
    name: trimmedString(160).min(1),
    description: nullableString(4000).optional(),
    scopeType: z.enum(RULE_SET_SCOPE_TYPES).optional(),
    playbookId: nullableUuid.optional(),
    setupDefinitionId: nullableUuid.optional(),
    journalTemplateId: nullableUuid.optional(),
    propAccountId: nullableUuid.optional(),
    isActive: z.union([z.boolean(), z.null()]).optional(),
    items: z.array(ruleSetItemSchema).min(1).max(30),
  })
  .strict();

const ruleSetSchema = ruleSetSchemaBase.superRefine(validateRuleSetScope);

const setupDefinitionUpdateSchema = setupDefinitionSchema.partial();
const mistakeDefinitionUpdateSchema = mistakeDefinitionSchema.partial();
const journalTemplateUpdateSchema = journalTemplateSchema.partial();
const ruleSetUpdateSchema = ruleSetSchemaBase.partial().superRefine(validateRuleSetScope);

function normalizeKeys(raw: unknown, aliases: Record<string, string>): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return raw;
  }

  const source = raw as JsonRecord;
  const normalized: JsonRecord = { ...source };

  for (const [from, to] of Object.entries(aliases)) {
    if (normalized[to] === undefined && source[from] !== undefined) {
      normalized[to] = source[from];
    }
    delete normalized[from];
  }

  return normalized;
}

export function parseSetupDefinitionCreatePayload(
  raw: unknown,
): ReturnType<typeof setupDefinitionSchema.safeParse> {
  return setupDefinitionSchema.safeParse(
    normalizeKeys(raw, {
      playbook_id: "playbookId",
      default_template_id: "defaultTemplateId",
      preferred_session: "preferredSession",
      preferred_market_condition: "preferredMarketCondition",
      entry_criteria: "entryCriteria",
      invalidation_rules: "invalidationRules",
      management_notes: "managementNotes",
      example_notes: "exampleNotes",
      is_active: "isActive",
    }),
  );
}

export function parseSetupDefinitionUpdatePayload(
  raw: unknown,
): ReturnType<typeof setupDefinitionUpdateSchema.safeParse> {
  return setupDefinitionUpdateSchema.safeParse(
    normalizeKeys(raw, {
      playbook_id: "playbookId",
      default_template_id: "defaultTemplateId",
      preferred_session: "preferredSession",
      preferred_market_condition: "preferredMarketCondition",
      entry_criteria: "entryCriteria",
      invalidation_rules: "invalidationRules",
      management_notes: "managementNotes",
      example_notes: "exampleNotes",
      is_active: "isActive",
    }),
  );
}

export function parseMistakeDefinitionCreatePayload(
  raw: unknown,
): ReturnType<typeof mistakeDefinitionSchema.safeParse> {
  return mistakeDefinitionSchema.safeParse(
    normalizeKeys(raw, {
      correction_guidance: "correctionGuidance",
      is_active: "isActive",
    }),
  );
}

export function parseMistakeDefinitionUpdatePayload(
  raw: unknown,
): ReturnType<typeof mistakeDefinitionUpdateSchema.safeParse> {
  return mistakeDefinitionUpdateSchema.safeParse(
    normalizeKeys(raw, {
      correction_guidance: "correctionGuidance",
      is_active: "isActive",
    }),
  );
}

export function parseJournalTemplateCreatePayload(
  raw: unknown,
): ReturnType<typeof journalTemplateSchema.safeParse> {
  return journalTemplateSchema.safeParse(
    normalizeKeys(raw, {
      scope_type: "scopeType",
      playbook_id: "playbookId",
      is_active: "isActive",
    }),
  );
}

export function parseJournalTemplateUpdatePayload(
  raw: unknown,
): ReturnType<typeof journalTemplateUpdateSchema.safeParse> {
  return journalTemplateUpdateSchema.safeParse(
    normalizeKeys(raw, {
      scope_type: "scopeType",
      playbook_id: "playbookId",
      is_active: "isActive",
    }),
  );
}

export function parseRuleSetCreatePayload(
  raw: unknown,
): ReturnType<typeof ruleSetSchema.safeParse> {
  return ruleSetSchema.safeParse(
    normalizeKeys(raw, {
      scope_type: "scopeType",
      playbook_id: "playbookId",
      setup_definition_id: "setupDefinitionId",
      journal_template_id: "journalTemplateId",
      prop_account_id: "propAccountId",
      is_active: "isActive",
    }),
  );
}

export function parseRuleSetUpdatePayload(
  raw: unknown,
): ReturnType<typeof ruleSetUpdateSchema.safeParse> {
  return ruleSetUpdateSchema.safeParse(
    normalizeKeys(raw, {
      scope_type: "scopeType",
      playbook_id: "playbookId",
      setup_definition_id: "setupDefinitionId",
      journal_template_id: "journalTemplateId",
      prop_account_id: "propAccountId",
      is_active: "isActive",
    }),
  );
}

export function toPersistedTemplateConfig(
  raw: Partial<JournalTemplateConfig> | null | undefined,
): JournalTemplateConfig {
  return normalizeJournalTemplateConfig(raw ?? DEFAULT_JOURNAL_TEMPLATE_CONFIG);
}
