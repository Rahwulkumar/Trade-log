export const JOURNAL_TEMPLATE_CHAPTER_IDS = [
  "narrative",
  "thesis",
  "market",
  "execution",
  "psychology",
  "scorecard",
  "closeout",
] as const;

export type JournalTemplateChapterId =
  (typeof JOURNAL_TEMPLATE_CHAPTER_IDS)[number];

export const JOURNAL_TEMPLATE_SCOPE_TYPES = [
  "global",
  "playbook",
  "setup",
  "account",
] as const;

export type JournalTemplateScopeType =
  (typeof JOURNAL_TEMPLATE_SCOPE_TYPES)[number];

export interface JournalTemplatePrompts {
  narrative?: string | null;
  thesis?: string | null;
  market?: string | null;
  execution?: string | null;
  psychology?: string | null;
  closeout?: string | null;
}

export interface JournalTemplateConfig {
  enabledChapters: JournalTemplateChapterId[];
  requiredFields: string[];
  checklistItems: string[];
  screenshotRequired: boolean;
  prompts: JournalTemplatePrompts;
}

export const DEFAULT_JOURNAL_TEMPLATE_CONFIG: JournalTemplateConfig = {
  enabledChapters: [...JOURNAL_TEMPLATE_CHAPTER_IDS],
  requiredFields: [],
  checklistItems: [
    "Bias clear",
    "HTF aligned",
    "Liquidity mapped",
    "Trigger confirmed",
    "Risk defined",
    "Session fit",
    "News clear",
    "Plan followed",
  ],
  screenshotRequired: false,
  prompts: {},
};

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

export function normalizeJournalTemplateConfig(
  raw: Partial<JournalTemplateConfig> | null | undefined,
): JournalTemplateConfig {
  const enabledSource = Array.isArray(raw?.enabledChapters)
    ? raw.enabledChapters
    : DEFAULT_JOURNAL_TEMPLATE_CONFIG.enabledChapters;
  const enabledChapters = uniqueNonEmpty(enabledSource).filter((
    value,
  ): value is JournalTemplateChapterId =>
    JOURNAL_TEMPLATE_CHAPTER_IDS.includes(
      value as JournalTemplateChapterId,
    ),
  );

  return {
    enabledChapters:
      enabledChapters.length > 0
        ? enabledChapters
        : [...DEFAULT_JOURNAL_TEMPLATE_CONFIG.enabledChapters],
    requiredFields: uniqueNonEmpty(raw?.requiredFields ?? []),
    checklistItems: uniqueNonEmpty(
      raw?.checklistItems?.length
        ? raw.checklistItems
        : DEFAULT_JOURNAL_TEMPLATE_CONFIG.checklistItems,
    ),
    screenshotRequired: Boolean(raw?.screenshotRequired),
    prompts: {
      narrative: raw?.prompts?.narrative?.trim() || null,
      thesis: raw?.prompts?.thesis?.trim() || null,
      market: raw?.prompts?.market?.trim() || null,
      execution: raw?.prompts?.execution?.trim() || null,
      psychology: raw?.prompts?.psychology?.trim() || null,
      closeout: raw?.prompts?.closeout?.trim() || null,
    },
  };
}
