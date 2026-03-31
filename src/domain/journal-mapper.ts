import type { Trade } from "@/lib/db/schema";
import { RULE_ITEM_STATUSES } from "@/lib/rulebooks/types";
import type { TradeScreenshot as SupabaseScreenshot } from "@/lib/supabase/types";
import { normalizeJournalTemplateConfig } from "@/lib/journal-structure/types";
import { resolveTradingSession } from "@/lib/trading-session";
import {
  EMPTY_JOURNAL_REVIEW,
  type JournalEntryDraft,
  type JournalReview,
  type JournalScreenshot,
  type JournalTradeRuleResult,
  type JournalSession,
  type JournalTradeViewModel,
  type QualityRating,
  type TfObservation,
} from "./journal-types";

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((value): value is string => typeof value === "string");
}

function parseScreenshots(raw: unknown, tradeId: string): JournalScreenshot[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.flatMap((item, index): JournalScreenshot[] => {
    if (typeof item === "string") {
      return [
        {
          id: `${tradeId}-ss-${index}`,
          tradeId,
          url: item,
          timeframe: "--",
          createdAt: "",
        },
      ];
    }

    if (typeof item === "object" && item !== null && "url" in item) {
      const screenshot = item as {
        url: string;
        timeframe?: string;
        created_at?: string;
      };

      return [
        {
          id: `${tradeId}-ss-${index}`,
          tradeId,
          url: screenshot.url,
          timeframe: screenshot.timeframe ?? "--",
          createdAt: screenshot.created_at ?? "",
        },
      ];
    }

    return [];
  });
}

function parseTfObservations(raw: unknown): Record<string, TfObservation> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const record = raw as Record<string, unknown>;
  const result: Record<string, TfObservation> = {};

  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "object" && value !== null) {
      const observation = value as Record<string, unknown>;
      result[key] = {
        bias: typeof observation.bias === "string" ? observation.bias : undefined,
        notes:
          typeof observation.notes === "string" ? observation.notes : undefined,
      };
    }
  }

  return result;
}

function parseTradeRuleResults(raw: unknown): JournalTradeRuleResult[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    const record = item as Record<string, unknown>;
    const ruleItemId =
      typeof record.ruleItemId === "string" ? record.ruleItemId.trim() : "";
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const category =
      typeof record.category === "string" ? record.category.trim() || null : null;
    const severity =
      typeof record.severity === "string" ? record.severity.trim() || null : null;
    const status =
      typeof record.status === "string" &&
      RULE_ITEM_STATUSES.includes(record.status as (typeof RULE_ITEM_STATUSES)[number])
        ? (record.status as JournalTradeRuleResult["status"])
        : null;

    if (!ruleItemId || !title || !status) {
      return [];
    }

    return [
      {
        ruleItemId,
        title,
        category,
        severity,
        status,
      },
    ];
  });
}

function parseQuality(raw: string | null | undefined): QualityRating | null {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim();
  if (normalized === "Good") return 5;
  if (normalized === "Neutral") return 3;
  if (normalized === "Poor") return 1;

  const parsed = Number.parseInt(normalized, 10);
  if (parsed >= 1 && parsed <= 5) {
    return parsed as QualityRating;
  }

  return null;
}

function parseQualityValue(raw: unknown): QualityRating | null {
  if (
    raw === "Good" ||
    raw === "Neutral" ||
    raw === "Poor" ||
    typeof raw === "number" ||
    typeof raw === "string" ||
    raw == null
  ) {
    return parseQuality(raw == null ? null : String(raw));
  }

  return null;
}

function toLegacyQualityLabel(
  value: QualityRating | null,
): "Good" | "Neutral" | "Poor" | null {
  if (value == null) {
    return null;
  }

  if (value >= 4) {
    return "Good";
  }

  if (value <= 2) {
    return "Poor";
  }

  return "Neutral";
}

function toLegacySessionValue(
  value: JournalSession | null,
): string | null {
  if (value === "Asia") {
    return "Asian";
  }

  return value;
}

function asString(raw: unknown): string {
  return typeof raw === "string" ? raw : "";
}

function parseJournalReview(raw: unknown): JournalReview {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_JOURNAL_REVIEW };
  }

  const review = raw as Record<string, unknown>;

  return {
    strategyName: asString(review.strategyName),
    setupName: asString(review.setupName),
    reasonForTrade: asString(review.reasonForTrade),
    invalidation: asString(review.invalidation),
    targetPlan: asString(review.targetPlan),
    entryRatingScore: parseQualityValue(review.entryRatingScore),
    exitRatingScore: parseQualityValue(review.exitRatingScore),
    managementRatingScore: parseQualityValue(review.managementRatingScore),
    timeframeAlignment:
      review.timeframeAlignment === "aligned" ||
      review.timeframeAlignment === "mixed" ||
      review.timeframeAlignment === "countertrend" ||
      review.timeframeAlignment === "unclear"
        ? review.timeframeAlignment
        : null,
    retakeDecision:
      review.retakeDecision === "yes" ||
      review.retakeDecision === "maybe" ||
      review.retakeDecision === "no"
        ? review.retakeDecision
        : null,
    higherTimeframeBias: asString(review.higherTimeframeBias),
    higherTimeframeNotes: asString(review.higherTimeframeNotes),
    executionTimeframe: asString(review.executionTimeframe),
    triggerTimeframe: asString(review.triggerTimeframe),
    entryReason: asString(review.entryReason),
    managementReview: asString(review.managementReview),
    exitReason: asString(review.exitReason),
    psychologyBefore: asString(review.psychologyBefore),
    psychologyDuring: asString(review.psychologyDuring),
    psychologyAfter: asString(review.psychologyAfter),
    marketContext: asString(review.marketContext),
    followUpAction: asString(review.followUpAction),
  };
}

export function mapTradeToViewModel(trade: Trade): JournalTradeViewModel {
  const journalReview = parseJournalReview(trade.journalReview);
  const session =
    resolveTradingSession(
      trade.session,
      trade.entryDate ?? trade.exitDate ?? trade.createdAt,
    ) as JournalSession | null;

  return {
    id: trade.id,
    symbol: trade.symbol,
    direction: trade.direction === "SHORT" ? "SHORT" : "LONG",
    status: trade.status === "OPEN" ? "open" : "closed",
    pnl: trade.pnl != null ? Number(trade.pnl) : null,
    rMultiple: trade.rMultiple != null ? Number(trade.rMultiple) : null,
    entryPrice: trade.entryPrice != null ? Number(trade.entryPrice) : null,
    exitPrice: trade.exitPrice != null ? Number(trade.exitPrice) : null,
    entryDate:
      trade.entryDate instanceof Date
        ? trade.entryDate.toISOString()
        : ((trade.entryDate as unknown as string) ?? null),
    exitDate:
      trade.exitDate instanceof Date
        ? trade.exitDate.toISOString()
        : ((trade.exitDate as unknown as string) ?? null),
    positionSize: trade.positionSize != null ? Number(trade.positionSize) : null,
    stopLoss: trade.stopLoss != null ? Number(trade.stopLoss) : null,
    takeProfit: trade.takeProfit != null ? Number(trade.takeProfit) : null,
    propAccountId: trade.propAccountId ?? null,
    playbookId: trade.playbookId ?? null,
    setupDefinitionId: trade.setupDefinitionId ?? null,
    mistakeDefinitionIds: Array.isArray(trade.mistakeDefinitionIds)
      ? trade.mistakeDefinitionIds.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    journalTemplateId: trade.journalTemplateId ?? null,
    ruleSetId: trade.ruleSetId ?? null,
    tradeRuleResults: parseTradeRuleResults(trade.tradeRuleResults),
    journalTemplateSnapshot:
      trade.journalTemplateSnapshot &&
      typeof trade.journalTemplateSnapshot === "object" &&
      !Array.isArray(trade.journalTemplateSnapshot)
        ? normalizeJournalTemplateConfig(
            trade.journalTemplateSnapshot as Record<string, unknown>,
          )
        : null,
    createdAt:
      trade.createdAt instanceof Date
        ? trade.createdAt.toISOString()
        : ((trade.createdAt as unknown as string) ?? null),
    marketCondition: trade.marketCondition ?? null,
    notes: trade.notes ?? "",
    feelings: trade.feelings ?? "",
    observations: trade.observations ?? "",
    executionNotes: trade.executionNotes ?? "",
    setupTags: trade.setupTags ?? [],
    mistakeTags: trade.mistakeTags ?? [],
    executionArrays: parseStringArray(trade.executionArrays),
    screenshots: parseScreenshots(trade.screenshots, trade.id),
    session,
    conviction: trade.conviction ?? null,
    entryRating: journalReview.entryRatingScore ?? parseQuality(trade.entryRating),
    exitRating: journalReview.exitRatingScore ?? parseQuality(trade.exitRating),
    managementRating:
      journalReview.managementRatingScore ?? parseQuality(trade.managementRating),
    mae: trade.mae ?? null,
    mfe: trade.mfe ?? null,
    lessonLearned: trade.lessonLearned ?? "",
    wouldTakeAgain: trade.wouldTakeAgain ?? null,
    tfObservations: parseTfObservations(trade.tfObservations),
    journalReview,
  };
}

export function viewModelToDraft(
  viewModel: JournalTradeViewModel,
): JournalEntryDraft {
  return {
    notes: viewModel.notes,
    feelings: viewModel.feelings,
    observations: viewModel.observations,
    playbookId: viewModel.playbookId,
    setupDefinitionId: viewModel.setupDefinitionId,
    mistakeDefinitionIds: [...viewModel.mistakeDefinitionIds],
    journalTemplateId: viewModel.journalTemplateId,
    ruleSetId: viewModel.ruleSetId,
    tradeRuleResults: [...viewModel.tradeRuleResults],
    journalTemplateSnapshot: viewModel.journalTemplateSnapshot
      ? normalizeJournalTemplateConfig(viewModel.journalTemplateSnapshot)
      : null,
    setupTags: [...viewModel.setupTags],
    mistakeTags: [...viewModel.mistakeTags],
    session: viewModel.session,
    conviction: viewModel.conviction,
    entryRating: viewModel.entryRating,
    exitRating: viewModel.exitRating,
    managementRating: viewModel.managementRating,
    mae: viewModel.mae,
    mfe: viewModel.mfe,
    lessonLearned: viewModel.lessonLearned,
    wouldTakeAgain: viewModel.wouldTakeAgain,
    tfObservations: { ...viewModel.tfObservations },
    executionNotes: viewModel.executionNotes,
    executionArrays: [...viewModel.executionArrays],
    screenshots: [...viewModel.screenshots],
    marketCondition: viewModel.marketCondition,
    journalReview: { ...viewModel.journalReview },
  };
}

export function mapDraftToTradeUpdate(
  draft: JournalEntryDraft,
): Record<string, unknown> {
  const journalReview = {
    ...draft.journalReview,
    entryRatingScore: draft.entryRating,
    exitRatingScore: draft.exitRating,
    managementRatingScore: draft.managementRating,
  };

  return {
    notes: draft.notes || null,
    feelings: draft.feelings || null,
    observations: draft.observations || null,
    screenshots: draft.screenshots.length
      ? draft.screenshots.map((item) => ({
          url: item.url,
          timeframe: item.timeframe,
          created_at: item.createdAt || undefined,
        }))
      : null,
    journal_review: journalReview,
    tf_observations: Object.keys(draft.tfObservations).length
      ? draft.tfObservations
      : null,
    setup_definition_id: draft.setupDefinitionId,
    mistake_definition_ids: draft.mistakeDefinitionIds,
    journal_template_id: draft.journalTemplateId,
    rule_set_id: draft.ruleSetId,
    trade_rule_results: draft.tradeRuleResults.length
      ? draft.tradeRuleResults
      : null,
    journal_template_snapshot: draft.journalTemplateSnapshot
      ? normalizeJournalTemplateConfig(draft.journalTemplateSnapshot)
      : null,
    setup_tags: draft.setupTags.length ? draft.setupTags : null,
    mistake_tags: draft.mistakeTags.length ? draft.mistakeTags : null,
    playbook_id: draft.playbookId,
    session: toLegacySessionValue(draft.session),
    market_condition: draft.marketCondition,
    conviction: draft.conviction,
    entry_rating: toLegacyQualityLabel(draft.entryRating),
    exit_rating: toLegacyQualityLabel(draft.exitRating),
    management_rating: toLegacyQualityLabel(draft.managementRating),
    mae: draft.mae,
    mfe: draft.mfe,
    lesson_learned: draft.lessonLearned || null,
    would_take_again: draft.wouldTakeAgain,
    execution_notes: draft.executionNotes || null,
    execution_arrays: draft.executionArrays.length ? draft.executionArrays : null,
  };
}

export function isTradeJournaled(viewModel: JournalTradeViewModel): boolean {
  const review = viewModel.journalReview;
  return Boolean(
    viewModel.notes ||
      viewModel.feelings ||
      viewModel.observations ||
      viewModel.executionNotes ||
      viewModel.conviction ||
      viewModel.marketCondition ||
      viewModel.setupDefinitionId ||
      viewModel.mistakeDefinitionIds.length > 0 ||
      viewModel.tradeRuleResults.length > 0 ||
      viewModel.setupTags.length > 0 ||
      viewModel.mistakeTags.length > 0 ||
      viewModel.managementRating ||
      viewModel.lessonLearned ||
      viewModel.wouldTakeAgain !== null ||
      viewModel.screenshots.length > 0 ||
      viewModel.executionArrays.length > 0 ||
      Object.keys(viewModel.tfObservations).length > 0 ||
      review.strategyName ||
      review.setupName ||
      review.reasonForTrade ||
      review.invalidation ||
      review.targetPlan ||
      review.timeframeAlignment ||
      review.retakeDecision ||
      review.higherTimeframeBias ||
      review.higherTimeframeNotes ||
      review.executionTimeframe ||
      review.triggerTimeframe ||
      review.entryReason ||
      review.managementReview ||
      review.exitReason ||
      review.psychologyBefore ||
      review.psychologyDuring ||
      review.psychologyAfter ||
      review.marketContext ||
      review.followUpAction,
  );
}

export function isRawTradeJournaled(trade: Trade): boolean {
  return isTradeJournaled(mapTradeToViewModel(trade));
}

export function mapDraftToApiUpdate(
  draft: JournalEntryDraft,
): Record<string, unknown> {
  const journalReview = {
    ...draft.journalReview,
    entryRatingScore: draft.entryRating,
    exitRatingScore: draft.exitRating,
    managementRatingScore: draft.managementRating,
  };

  return {
    notes: draft.notes || null,
    feelings: draft.feelings || null,
    observations: draft.observations || null,
    screenshots: draft.screenshots.length
      ? draft.screenshots.map((item) => ({
          url: item.url,
          timeframe: item.timeframe,
          created_at: item.createdAt || undefined,
        }))
      : null,
    journalReview,
    tfObservations: Object.keys(draft.tfObservations).length
      ? draft.tfObservations
      : null,
    setupDefinitionId: draft.setupDefinitionId,
    mistakeDefinitionIds: draft.mistakeDefinitionIds,
    journalTemplateId: draft.journalTemplateId,
    ruleSetId: draft.ruleSetId,
    tradeRuleResults: draft.tradeRuleResults.length ? draft.tradeRuleResults : null,
    journalTemplateSnapshot: draft.journalTemplateSnapshot
      ? normalizeJournalTemplateConfig(draft.journalTemplateSnapshot)
      : null,
    setupTags: draft.setupTags.length ? draft.setupTags : null,
    mistakeTags: draft.mistakeTags.length ? draft.mistakeTags : null,
    playbookId: draft.playbookId,
    session: toLegacySessionValue(draft.session),
    marketCondition: draft.marketCondition,
    conviction: draft.conviction,
    entryRating: toLegacyQualityLabel(draft.entryRating),
    exitRating: toLegacyQualityLabel(draft.exitRating),
    managementRating: toLegacyQualityLabel(draft.managementRating),
    mae: draft.mae,
    mfe: draft.mfe,
    lessonLearned: draft.lessonLearned || null,
    wouldTakeAgain: draft.wouldTakeAgain,
    executionNotes: draft.executionNotes || null,
    executionArrays: draft.executionArrays.length ? draft.executionArrays : null,
  };
}

export function toSupabaseScreenshot(
  screenshot: JournalScreenshot,
): SupabaseScreenshot {
  return {
    id: screenshot.id,
    trade_id: screenshot.tradeId,
    url: screenshot.url,
    timeframe: screenshot.timeframe,
    created_at: screenshot.createdAt,
  };
}
