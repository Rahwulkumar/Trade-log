import type { Trade } from "@/lib/db/schema";
import { getTradeNetPnl } from "@/lib/utils/trade-pnl";

import { mapTradeToViewModel } from "@/domain/journal-mapper";
import type { JournalTradeViewModel } from "@/domain/journal-types";

export type JournalReviewStatus = "empty" | "draft" | "complete" | "trivial";
export type JournalOutcome = "WIN" | "LOSS" | "BE";

export interface JournalTradeRecord {
  trade: Trade;
  viewModel: JournalTradeViewModel;
  searchText: string;
  closedAt: string | null;
  entryAt: string | null;
  netPnl: number;
  outcome: JournalOutcome;
  reviewStatus: JournalReviewStatus;
  isTrivial: boolean;
  trivialReason: string | null;
}

export interface JournalTradeGroupRecord {
  id: string;
  title: string;
  trades: JournalTradeRecord[];
  primaryTrade: JournalTradeRecord;
  searchText: string;
  netPnl: number;
  closedAt: string | null;
  direction: "LONG" | "SHORT";
  outcome: JournalOutcome;
  reviewStatus: JournalReviewStatus;
  tradeCount: number;
  isTrivial: boolean;
  trivialReason: string | null;
}

function getOutcome(value: number): JournalOutcome {
  if (value > 0.5) return "WIN";
  if (value < -0.5) return "LOSS";
  return "BE";
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function getDurationSeconds(trade: Trade) {
  const entry = trade.entryDate ? new Date(trade.entryDate).getTime() : Number.NaN;
  const exit = trade.exitDate ? new Date(trade.exitDate).getTime() : Number.NaN;
  if (!Number.isFinite(entry) || !Number.isFinite(exit) || exit < entry) {
    return null;
  }
  return Math.round((exit - entry) / 1000);
}

function computeTrivialState(
  trade: Trade,
  viewModel: JournalTradeViewModel,
  netPnl: number,
) {
  const manual = viewModel.journalReview.isTrivial;
  if (manual === true) {
    return {
      isTrivial: true,
      reason: viewModel.journalReview.trivialReason || "Marked as trivial",
    };
  }

  if (manual === false) {
    return {
      isTrivial: false,
      reason: null,
    };
  }

  const reasons: string[] = [];
  const durationSeconds = getDurationSeconds(trade);
  if (durationSeconds != null && durationSeconds <= 30) {
    reasons.push("Closed inside 30 seconds");
  }
  if (Math.abs(netPnl) < 1) {
    reasons.push("Settled below $1");
  }

  return {
    isTrivial: reasons.length > 0,
    reason: reasons.join(" · ") || null,
  };
}

function getReviewStatus(
  viewModel: JournalTradeViewModel,
  isTrivial: boolean,
): JournalReviewStatus {
  if (isTrivial) {
    return "trivial";
  }

  const review = viewModel.journalReview;
  const signals = [
    viewModel.notes.trim().length > 0 || viewModel.screenshots.length > 0,
    Boolean(viewModel.playbookId),
    Boolean(viewModel.setupDefinitionId),
    Boolean(viewModel.journalTemplateId),
    Boolean(
      review.reasonForTrade ||
        review.invalidation ||
        review.targetPlan ||
        review.higherTimeframeBias ||
        viewModel.setupTags.length > 0,
    ),
    Boolean(
      review.priorSessionBehavior ||
        review.sessionState ||
        viewModel.marketCondition ||
        review.marketContext,
    ),
    Boolean(
      review.entryReason ||
        review.scaleInNotes ||
        review.managementReview ||
        review.exitReason,
    ),
    Boolean(
      review.psychologyBeforeTags.length > 0 ||
        review.psychologyDuringTags.length > 0 ||
        review.psychologyAfterTags.length > 0 ||
        viewModel.feelings,
    ),
    Boolean(
      viewModel.entryRating ||
        viewModel.exitRating ||
        viewModel.managementRating ||
        review.overallGrade ||
        review.retakeDecision ||
        viewModel.tradeRuleResults.length > 0 ||
        review.autoRuleFlags.length > 0 ||
        viewModel.mistakeDefinitionIds.length > 0,
    ),
    Boolean(
      viewModel.lessonLearned ||
        review.primaryFailureCause ||
        review.stopDoing ||
        review.followUpAction,
    ),
  ].filter(Boolean).length;

  if (signals === 0) {
    return "empty";
  }
  if (signals >= 7) {
    return "complete";
  }
  return "draft";
}

function buildSearchText(viewModel: JournalTradeViewModel): string {
  return [
    viewModel.symbol,
    viewModel.session ?? "",
    viewModel.notes,
    viewModel.observations,
    viewModel.executionArrays.join(" "),
    viewModel.setupTags.join(" "),
    viewModel.mistakeTags.join(" "),
    viewModel.journalReview.strategyName,
    viewModel.journalReview.setupName,
    viewModel.journalReview.reasonForTrade,
    viewModel.journalReview.marketContext,
    viewModel.journalReview.tradeIdeaTitle,
    viewModel.journalReview.groupSummary,
  ]
    .join(" ")
    .toLowerCase();
}

function isSameEstDate(left: string | null, right: string | null) {
  if (!left || !right) {
    return false;
  }

  const leftDate = new Date(left);
  const rightDate = new Date(right);
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) {
    return false;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(leftDate) === formatter.format(rightDate);
}

function shouldAutoLink(left: JournalTradeRecord, right: JournalTradeRecord) {
  if (left.trade.id === right.trade.id) return false;
  if (left.trade.symbol !== right.trade.symbol) return false;
  if (left.trade.direction !== right.trade.direction) return false;
  if ((left.trade.propAccountId ?? null) !== (right.trade.propAccountId ?? null)) {
    return false;
  }
  if (!isSameEstDate(left.entryAt, right.entryAt)) return false;

  const leftEntry = left.entryAt ? new Date(left.entryAt).getTime() : Number.NaN;
  const rightEntry = right.entryAt ? new Date(right.entryAt).getTime() : Number.NaN;
  if (!Number.isFinite(leftEntry) || !Number.isFinite(rightEntry)) {
    return false;
  }

  return Math.abs(leftEntry - rightEntry) <= 45 * 60 * 1000;
}

function findRoot(parents: Map<string, string>, id: string): string {
  const current = parents.get(id) ?? id;
  if (current === id) return id;
  const root = findRoot(parents, current);
  parents.set(id, root);
  return root;
}

function union(parents: Map<string, string>, left: string, right: string) {
  const leftRoot = findRoot(parents, left);
  const rightRoot = findRoot(parents, right);
  if (leftRoot !== rightRoot) {
    parents.set(rightRoot, leftRoot);
  }
}

export function buildJournalTradeRecords(trades: Trade[]): JournalTradeRecord[] {
  return trades
    .map((trade) => {
      const viewModel = mapTradeToViewModel(trade);
      const netPnl = getTradeNetPnl(trade);
      const trivial = computeTrivialState(trade, viewModel, netPnl);

      return {
        trade,
        viewModel,
        searchText: buildSearchText(viewModel),
        closedAt: viewModel.exitDate ?? viewModel.entryDate,
        entryAt: viewModel.entryDate,
        netPnl,
        outcome: getOutcome(netPnl),
        reviewStatus: getReviewStatus(viewModel, trivial.isTrivial),
        isTrivial: trivial.isTrivial,
        trivialReason: trivial.reason,
      };
    })
    .sort((left, right) => {
      const leftTime = left.closedAt ? new Date(left.closedAt).getTime() : 0;
      const rightTime = right.closedAt ? new Date(right.closedAt).getTime() : 0;
      return rightTime - leftTime;
    });
}

export function buildJournalTradeGroups(
  records: JournalTradeRecord[],
): JournalTradeGroupRecord[] {
  const byId = new Map(records.map((record) => [record.trade.id, record]));
  const parents = new Map<string, string>(
    records.map((record) => [record.trade.id, record.trade.id]),
  );

  for (const record of records) {
    const linkedIds = record.viewModel.journalReview.linkedTradeIds;
    for (const linkedId of linkedIds) {
      if (byId.has(linkedId)) {
        union(parents, record.trade.id, linkedId);
      }
    }
  }

  for (let index = 0; index < records.length; index += 1) {
    const left = records[index];
    for (let inner = index + 1; inner < records.length; inner += 1) {
      const right = records[inner];

      if (
        left.viewModel.journalReview.tradeIdeaId &&
        left.viewModel.journalReview.tradeIdeaId === right.viewModel.journalReview.tradeIdeaId
      ) {
        union(parents, left.trade.id, right.trade.id);
        continue;
      }

      if (shouldAutoLink(left, right)) {
        union(parents, left.trade.id, right.trade.id);
      }
    }
  }

  const grouped = new Map<string, JournalTradeRecord[]>();
  for (const record of records) {
    const root = findRoot(parents, record.trade.id);
    const bucket = grouped.get(root) ?? [];
    bucket.push(record);
    grouped.set(root, bucket);
  }

  return [...grouped.values()]
    .map((groupRecords) => {
      const ordered = [...groupRecords].sort((left, right) => {
        const leftTime = left.entryAt ? new Date(left.entryAt).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.entryAt ? new Date(right.entryAt).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      });
      const primaryTrade = ordered[0] ?? groupRecords[0];
      const explicitIdeaId =
        ordered.find((record) => record.viewModel.journalReview.tradeIdeaId)?.viewModel.journalReview.tradeIdeaId ??
        null;
      const title =
        ordered.find((record) => hasText(record.viewModel.journalReview.tradeIdeaTitle))
          ?.viewModel.journalReview.tradeIdeaTitle
          ?.trim() ??
        (ordered.length > 1
          ? `${primaryTrade.trade.symbol} trade bundle`
          : primaryTrade.trade.symbol);
      const netPnl = ordered.reduce((total, record) => total + record.netPnl, 0);
      const closedAt = ordered.reduce<string | null>((latest, record) => {
        if (!record.closedAt) return latest;
        if (!latest) return record.closedAt;
        return new Date(record.closedAt).getTime() > new Date(latest).getTime()
          ? record.closedAt
          : latest;
      }, null);
      const allComplete = ordered.every((record) => record.reviewStatus === "complete");
      const allEmpty = ordered.every((record) => record.reviewStatus === "empty");
      const allTrivial = ordered.every((record) => record.reviewStatus === "trivial");
      const reviewStatus: JournalReviewStatus = allTrivial
        ? "trivial"
        : allComplete
          ? "complete"
          : allEmpty
            ? "empty"
            : "draft";

      return {
        id: explicitIdeaId ?? `auto:${primaryTrade.trade.id}`,
        title,
        trades: ordered,
        primaryTrade,
        searchText: ordered.map((record) => record.searchText).join(" "),
        netPnl,
        closedAt,
        direction: primaryTrade.viewModel.direction,
        outcome: getOutcome(netPnl),
        reviewStatus,
        tradeCount: ordered.length,
        isTrivial: ordered.every((record) => record.isTrivial),
        trivialReason:
          ordered.find((record) => record.trivialReason)?.trivialReason ?? null,
      };
    })
    .sort((left, right) => {
      const leftTime = left.closedAt ? new Date(left.closedAt).getTime() : 0;
      const rightTime = right.closedAt ? new Date(right.closedAt).getTime() : 0;
      return rightTime - leftTime;
    });
}
