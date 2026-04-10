import type { JournalTemplateConfig } from "@/lib/journal-structure/types";
import type { RuleItemStatus, TradeRuleResult } from "@/lib/rulebooks/types";

export type QualityRating = 1 | 2 | 3 | 4 | 5;

export type JournalSession =
  | "London"
  | "New York"
  | "Asia"
  | "Overnight";

export type JournalAlignment =
  | "aligned"
  | "mixed"
  | "countertrend"
  | "unclear";

export type JournalRetakeDecision = "yes" | "maybe" | "no";
export type JournalSessionState =
  | "continuation"
  | "reversal"
  | "ranging";
export type JournalRuleStatus = RuleItemStatus;
export type JournalTradeRuleResult = TradeRuleResult;

export interface TfObservation {
  bias?: string;
  notes?: string;
}

export interface JournalScreenshot {
  id: string;
  tradeId: string;
  url: string;
  timeframe: string;
  createdAt: string;
}

export interface JournalReview {
  strategyName: string;
  setupName: string;
  reasonForTrade: string;
  invalidation: string;
  targetPlan: string;
  intendedTakeProfit: string;
  priorSessionBehavior: string;
  sessionState: JournalSessionState | null;
  entryRatingScore: QualityRating | null;
  exitRatingScore: QualityRating | null;
  managementRatingScore: QualityRating | null;
  timeframeAlignment: JournalAlignment | null;
  retakeDecision: JournalRetakeDecision | null;
  higherTimeframeBias: string;
  higherTimeframeNotes: string;
  executionTimeframe: string;
  triggerTimeframe: string;
  entryReason: string;
  managementReview: string;
  exitReason: string;
  scaleInNotes: string;
  psychologyBeforeTags: string[];
  psychologyDuringTags: string[];
  psychologyAfterTags: string[];
  psychologyBefore: string;
  psychologyDuring: string;
  psychologyAfter: string;
  marketContext: string;
  overallGrade: string | null;
  primaryFailureCause: string;
  stopDoing: string;
  followUpAction: string;
}

export interface JournalTradeViewModel {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  status: "open" | "closed";
  pnl: number | null;
  rMultiple: number | null;
  entryPrice: number | null;
  exitPrice: number | null;
  entryDate: string | null;
  exitDate: string | null;
  positionSize: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  propAccountId: string | null;
  playbookId: string | null;
  setupDefinitionId: string | null;
  mistakeDefinitionIds: string[];
  journalTemplateId: string | null;
  ruleSetId: string | null;
  tradeRuleResults: JournalTradeRuleResult[];
  journalTemplateSnapshot: JournalTemplateConfig | null;
  createdAt: string | null;
  marketCondition: string | null;
  notes: string;
  feelings: string;
  observations: string;
  executionNotes: string;
  setupTags: string[];
  mistakeTags: string[];
  executionArrays: string[];
  screenshots: JournalScreenshot[];
  session: JournalSession | null;
  conviction: number | null;
  entryRating: QualityRating | null;
  exitRating: QualityRating | null;
  managementRating: QualityRating | null;
  mae: number | null;
  mfe: number | null;
  lessonLearned: string;
  wouldTakeAgain: boolean | null;
  tfObservations: Record<string, TfObservation>;
  journalReview: JournalReview;
}

export interface JournalEntryDraft {
  notes: string;
  feelings: string;
  observations: string;
  playbookId: string | null;
  setupDefinitionId: string | null;
  mistakeDefinitionIds: string[];
  journalTemplateId: string | null;
  ruleSetId: string | null;
  tradeRuleResults: JournalTradeRuleResult[];
  journalTemplateSnapshot: JournalTemplateConfig | null;
  setupTags: string[];
  mistakeTags: string[];
  session: JournalSession | null;
  conviction: number | null;
  entryRating: QualityRating | null;
  exitRating: QualityRating | null;
  managementRating: QualityRating | null;
  mae: number | null;
  mfe: number | null;
  lessonLearned: string;
  wouldTakeAgain: boolean | null;
  tfObservations: Record<string, TfObservation>;
  executionNotes: string;
  executionArrays: string[];
  screenshots: JournalScreenshot[];
  marketCondition: string | null;
  journalReview: JournalReview;
}

export const EMPTY_JOURNAL_REVIEW: JournalReview = {
  strategyName: "",
  setupName: "",
  reasonForTrade: "",
  invalidation: "",
  targetPlan: "",
  intendedTakeProfit: "",
  priorSessionBehavior: "",
  sessionState: null,
  entryRatingScore: null,
  exitRatingScore: null,
  managementRatingScore: null,
  timeframeAlignment: null,
  retakeDecision: null,
  higherTimeframeBias: "",
  higherTimeframeNotes: "",
  executionTimeframe: "",
  triggerTimeframe: "",
  entryReason: "",
  managementReview: "",
  exitReason: "",
  scaleInNotes: "",
  psychologyBeforeTags: [],
  psychologyDuringTags: [],
  psychologyAfterTags: [],
  psychologyBefore: "",
  psychologyDuring: "",
  psychologyAfter: "",
  marketContext: "",
  overallGrade: null,
  primaryFailureCause: "",
  stopDoing: "",
  followUpAction: "",
};
