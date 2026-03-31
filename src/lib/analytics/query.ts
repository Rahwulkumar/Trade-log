import "server-only";

import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  journalTemplates,
  mistakeDefinitions,
  playbooks,
  setupDefinitions,
  trades,
} from "@/lib/db/schema";
import { DEFAULT_ANALYTICS_TIME_ZONE } from "@/lib/analytics/timezone";
import { resolveTradingSession } from "@/lib/trading-session";
import { getTradeNetPnl } from "@/lib/utils/trade-pnl";
import type {
  AnalyticsWorkspaceDimension,
  AnalyticsWorkspaceFacetOption,
  AnalyticsWorkspacePlaybookFacet,
  AnalyticsWorkspaceQuery,
  AnalyticsWorkspaceResult,
  AnalyticsWorkspaceReviewState,
  AnalyticsWorkspaceRow,
  AnalyticsWorkspaceTrade,
} from "@/lib/analytics/workspace-types";

type WorkspaceRow = {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  entryDate: Date | null;
  exitDate: Date | null;
  session: string | null;
  playbookId: string | null;
  playbookName: string | null;
  setupDefinitionId: string | null;
  setupName: string | null;
  journalTemplateId: string | null;
  journalTemplateName: string | null;
  mistakeDefinitionIds: string[];
  mistakeNames: string[];
  setupTags: string[];
  mistakeTags: string[];
  journalReview: Record<string, unknown>;
  notes: string | null;
  feelings: string | null;
  observations: string | null;
  screenshots: unknown;
  executionNotes: string | null;
  executionArrays: string[];
  marketCondition: string | null;
  conviction: number | null;
  lessonLearned: string | null;
  wouldTakeAgain: boolean | null;
  netPnl: number;
  rMultiple: number | null;
  reviewed: boolean;
};

type GroupDescriptor = {
  key: string;
  label: string;
};

type GroupStats = {
  label: string;
  trades: number;
  wins: number;
  grossProfit: number;
  grossLoss: number;
  netPnl: number;
  reviewed: number;
  rSum: number;
  rCount: number;
};

type GroupedRowWithSort = {
  row: AnalyticsWorkspaceRow;
  sortProfitFactor: number;
};

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function parseDateStart(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateEnd(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item) => (typeof item === "string" ? [item.trim()] : []))
    .filter(Boolean);
}

function hasArrayItems(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function normalizeUuidArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((item) => (typeof item === "string" && item.trim() ? [item.trim()] : []))
    .filter((item, index, array) => array.indexOf(item) === index);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function getLocalWeekday(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
  }).format(date);
}

function isReviewedRow(row: {
  notes: string | null;
  feelings: string | null;
  observations: string | null;
  executionNotes: string | null;
  setupTags: string[];
  mistakeTags: string[];
  conviction: number | null;
  marketCondition: string | null;
  lessonLearned: string | null;
  wouldTakeAgain: boolean | null;
  screenshots: unknown;
  executionArrays: string[];
  journalReview: unknown;
  setupDefinitionId?: string | null;
  mistakeDefinitionIds?: string[];
}): boolean {
  const review = asRecord(row.journalReview);

  return Boolean(
    hasText(row.notes) ||
      hasText(row.feelings) ||
      hasText(row.observations) ||
      hasText(row.executionNotes) ||
      row.setupTags.length > 0 ||
      row.mistakeTags.length > 0 ||
      row.conviction != null ||
      hasText(row.marketCondition) ||
      hasText(row.lessonLearned) ||
      row.wouldTakeAgain !== null ||
      hasArrayItems(row.screenshots) ||
      row.executionArrays.length > 0 ||
      hasText(review.strategyName) ||
      hasText(review.setupName) ||
      hasText(review.reasonForTrade) ||
      hasText(review.invalidation) ||
      hasText(review.targetPlan) ||
      hasText(review.timeframeAlignment) ||
      hasText(review.retakeDecision) ||
      hasText(review.higherTimeframeBias) ||
      hasText(review.higherTimeframeNotes) ||
      hasText(review.executionTimeframe) ||
      hasText(review.triggerTimeframe) ||
      hasText(review.entryReason) ||
      hasText(review.managementReview) ||
      hasText(review.exitReason) ||
      hasText(review.psychologyBefore) ||
      hasText(review.psychologyDuring) ||
      hasText(review.psychologyAfter) ||
      hasText(review.marketContext) ||
      hasText(review.followUpAction) ||
      row.setupDefinitionId ||
      (row.mistakeDefinitionIds?.length ?? 0) > 0
  );
}

function normalizeSession(
  storedSession: string | null,
  entryDate: Date | null,
  exitDate: Date | null,
): string {
  return (
    resolveTradingSession(storedSession, entryDate ?? exitDate) ?? "Overnight"
  );
}

function buildGroupDescriptors(
  trade: WorkspaceRow,
  groupBy: AnalyticsWorkspaceDimension,
  timeZone: string,
): GroupDescriptor[] {
  if (groupBy === "symbol") {
    return [{ key: trade.symbol, label: trade.symbol }];
  }

  if (groupBy === "session") {
    return [{ key: trade.session ?? "Overnight", label: trade.session ?? "Overnight" }];
  }

  if (groupBy === "playbook") {
    return [
      {
        key: trade.playbookId ?? "unassigned",
        label: trade.playbookName ?? "Unassigned",
      },
    ];
  }

  if (groupBy === "setup") {
    return [
      {
        key: trade.setupDefinitionId ?? "unassigned",
        label: trade.setupName ?? "No Setup",
      },
    ];
  }

  if (groupBy === "mistake") {
    if (trade.mistakeDefinitionIds.length === 0) {
      return [{ key: "unassigned", label: "No Mistake" }];
    }

    return trade.mistakeDefinitionIds.map((id, index) => ({
      key: id,
      label: trade.mistakeNames[index] ?? "Unknown Mistake",
    }));
  }

  if (groupBy === "template") {
    return [
      {
        key: trade.journalTemplateId ?? "unassigned",
        label: trade.journalTemplateName ?? "No Template",
      },
    ];
  }

  if (groupBy === "setupTag") {
    if (trade.setupTags.length === 0) {
      return [{ key: "__untagged_setup__", label: "No Setup Tag" }];
    }
    return trade.setupTags.map((tag) => ({ key: tag, label: tag }));
  }

  if (groupBy === "mistakeTag") {
    if (trade.mistakeTags.length === 0) {
      return [{ key: "__untagged_mistake__", label: "No Mistake Tag" }];
    }
    return trade.mistakeTags.map((tag) => ({ key: tag, label: tag }));
  }

  if (groupBy === "direction") {
    return [{ key: trade.direction, label: trade.direction }];
  }

  if (groupBy === "reviewStatus") {
    return [
      {
        key: trade.reviewed ? "reviewed" : "needsReview",
        label: trade.reviewed ? "Reviewed" : "Needs Review",
      },
    ];
  }

  const baseDate = trade.entryDate ?? trade.exitDate;
  const weekday = baseDate ? getLocalWeekday(baseDate, timeZone) : "Unknown";
  return [{ key: weekday, label: weekday }];
}

function buildFacetOptions(values: Map<string, number>): AnalyticsWorkspaceFacetOption[] {
  return [...values.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function buildPlaybookFacets(values: Map<string, { label: string; count: number }>): AnalyticsWorkspacePlaybookFacet[] {
  return [...values.entries()]
    .map(([id, entry]) => ({
      id: id === "unassigned" ? null : id,
      label: entry.label,
      count: entry.count,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function applyWorkspaceFilters(
  tradesInScope: WorkspaceRow[],
  query: AnalyticsWorkspaceQuery,
): WorkspaceRow[] {
  const {
    symbol,
    session,
    playbookId,
    setupDefinitionId,
    mistakeDefinitionId,
    journalTemplateId,
    setupTag,
    mistakeTag,
    direction,
    reviewStatus,
  } = query.filters;

  const symbolNeedle = symbol?.toLowerCase() ?? null;

  return tradesInScope.filter((trade) => {
    if (symbolNeedle && !trade.symbol.toLowerCase().includes(symbolNeedle)) {
      return false;
    }
    if (session && trade.session !== session) {
      return false;
    }
    if (playbookId === "unassigned" && trade.playbookId !== null) {
      return false;
    }
    if (
      playbookId &&
      playbookId !== "unassigned" &&
      trade.playbookId !== playbookId
    ) {
      return false;
    }
    if (setupDefinitionId === "unassigned" && trade.setupDefinitionId !== null) {
      return false;
    }
    if (
      setupDefinitionId &&
      setupDefinitionId !== "unassigned" &&
      trade.setupDefinitionId !== setupDefinitionId
    ) {
      return false;
    }
    if (
      mistakeDefinitionId === "unassigned" &&
      trade.mistakeDefinitionIds.length > 0
    ) {
      return false;
    }
    if (
      mistakeDefinitionId &&
      mistakeDefinitionId !== "unassigned" &&
      !trade.mistakeDefinitionIds.includes(mistakeDefinitionId)
    ) {
      return false;
    }
    if (
      journalTemplateId === "unassigned" &&
      trade.journalTemplateId !== null
    ) {
      return false;
    }
    if (
      journalTemplateId &&
      journalTemplateId !== "unassigned" &&
      trade.journalTemplateId !== journalTemplateId
    ) {
      return false;
    }
    if (setupTag && !trade.setupTags.includes(setupTag)) {
      return false;
    }
    if (mistakeTag && !trade.mistakeTags.includes(mistakeTag)) {
      return false;
    }
    if (direction && trade.direction !== direction) {
      return false;
    }
    if (reviewStatus === "reviewed" && !trade.reviewed) {
      return false;
    }
    if (reviewStatus === "needsReview" && trade.reviewed) {
      return false;
    }
    return true;
  });
}

function buildGroupedRows(
  filteredTrades: WorkspaceRow[],
  query: AnalyticsWorkspaceQuery,
): { rows: AnalyticsWorkspaceRow[]; totalGroups: number } {
  const groups = new Map<string, GroupStats>();

  for (const trade of filteredTrades) {
    const descriptors = buildGroupDescriptors(
      trade,
      query.groupBy,
      query.filters.timeZone ?? DEFAULT_ANALYTICS_TIME_ZONE,
    );

    for (const descriptor of descriptors) {
      const existing = groups.get(descriptor.key) ?? {
        label: descriptor.label,
        trades: 0,
        wins: 0,
        grossProfit: 0,
        grossLoss: 0,
        netPnl: 0,
        reviewed: 0,
        rSum: 0,
        rCount: 0,
      };

      existing.trades += 1;
      existing.netPnl += trade.netPnl;
      if (trade.netPnl > 0) {
        existing.wins += 1;
        existing.grossProfit += trade.netPnl;
      } else if (trade.netPnl < 0) {
        existing.grossLoss += Math.abs(trade.netPnl);
      }
      if (trade.reviewed) {
        existing.reviewed += 1;
      }
      if (trade.rMultiple != null) {
        existing.rSum += trade.rMultiple;
        existing.rCount += 1;
      }

      groups.set(descriptor.key, existing);
    }
  }

  const groupedRows: GroupedRowWithSort[] = [...groups.entries()].map(([key, group]) => {
    const avgPnl = group.trades > 0 ? group.netPnl / group.trades : 0;
    const grossLossAbs = Math.abs(group.grossLoss);
    const profitFactor =
      group.grossProfit > 0 && grossLossAbs > 0
        ? round(group.grossProfit / grossLossAbs, 2)
        : null;
    const sortProfitFactor =
      group.grossProfit > 0 && grossLossAbs === 0
        ? Number.POSITIVE_INFINITY
        : profitFactor ?? Number.NEGATIVE_INFINITY;

    return {
      row: {
        key,
        label: group.label,
        trades: group.trades,
        share:
          filteredTrades.length > 0
            ? round((group.trades / filteredTrades.length) * 100, 1)
            : 0,
        netPnl: round(group.netPnl),
        avgPnl: round(avgPnl),
        winRate:
          group.trades > 0 ? round((group.wins / group.trades) * 100, 1) : 0,
        avgRMultiple: group.rCount > 0 ? round(group.rSum / group.rCount, 2) : null,
        profitFactor,
        reviewedPercent:
          group.trades > 0 ? round((group.reviewed / group.trades) * 100, 1) : 0,
      },
      sortProfitFactor,
    };
  });

  const getMeasureValue = (groupedRow: GroupedRowWithSort) => {
    if (query.measure === "trades") return groupedRow.row.trades;
    if (query.measure === "avgPnl") return groupedRow.row.avgPnl;
    if (query.measure === "winRate") return groupedRow.row.winRate;
    if (query.measure === "profitFactor") return groupedRow.sortProfitFactor;
    if (query.measure === "avgRMultiple") {
      return groupedRow.row.avgRMultiple ?? Number.NEGATIVE_INFINITY;
    }
    if (query.measure === "reviewedPercent") return groupedRow.row.reviewedPercent;
    return groupedRow.row.netPnl;
  };

  groupedRows.sort((left, right) => {
    const delta = getMeasureValue(right) - getMeasureValue(left);
    if (delta !== 0) {
      return query.sortOrder === "desc" ? delta : -delta;
    }
    return left.row.label.localeCompare(right.row.label);
  });

  return {
    rows: groupedRows.slice(0, query.limit).map((groupedRow) => groupedRow.row),
    totalGroups: groupedRows.length,
  };
}

function buildDrilldown(
  filteredTrades: WorkspaceRow[],
  query: AnalyticsWorkspaceQuery,
): AnalyticsWorkspaceResult["drilldown"] {
  if (!query.drilldownKey) return null;

  const matches = filteredTrades.filter((trade) =>
    buildGroupDescriptors(
      trade,
      query.groupBy,
      query.filters.timeZone ?? DEFAULT_ANALYTICS_TIME_ZONE,
    ).some((descriptor) => descriptor.key === query.drilldownKey),
  );

  if (matches.length === 0) {
    return null;
  }

  const label =
    buildGroupDescriptors(
      matches[0],
      query.groupBy,
      query.filters.timeZone ?? DEFAULT_ANALYTICS_TIME_ZONE,
    ).find((descriptor) => descriptor.key === query.drilldownKey)?.label ??
    query.drilldownKey;

  const tradesForDrawer: AnalyticsWorkspaceTrade[] = [...matches]
    .sort((left, right) => {
      const leftTime = left.exitDate?.getTime() ?? left.entryDate?.getTime() ?? 0;
      const rightTime = right.exitDate?.getTime() ?? right.entryDate?.getTime() ?? 0;
      return rightTime - leftTime;
    })
    .map((trade) => ({
      id: trade.id,
      symbol: trade.symbol,
      direction: trade.direction,
      session: trade.session ?? "Overnight",
      playbook: trade.playbookName ?? "Unassigned",
      setup: trade.setupName ?? null,
      mistakes: trade.mistakeNames,
      template: trade.journalTemplateName ?? null,
      setupTags: trade.setupTags,
      mistakeTags: trade.mistakeTags,
      reviewed: trade.reviewed,
      entryAt: trade.entryDate?.toISOString() ?? null,
      exitAt: trade.exitDate?.toISOString() ?? null,
      netPnl: round(trade.netPnl),
      rMultiple: trade.rMultiple != null ? round(trade.rMultiple, 2) : null,
    }));

  return {
    key: query.drilldownKey,
    label,
    trades: tradesForDrawer,
  };
}

function buildFacets(tradesInScope: WorkspaceRow[]): AnalyticsWorkspaceResult["facets"] {
  const sessionCounts = new Map<string, number>();
  const symbolCounts = new Map<string, number>();
  const playbookCounts = new Map<string, { label: string; count: number }>();
  const setupCounts = new Map<string, { label: string; count: number }>();
  const mistakeCounts = new Map<string, { label: string; count: number }>();
  const templateCounts = new Map<string, { label: string; count: number }>();
  const setupTagCounts = new Map<string, number>();
  const mistakeTagCounts = new Map<string, number>();
  const reviewStateCounts = new Map<string, number>([
    ["reviewed", 0],
    ["needsReview", 0],
  ]);

  for (const trade of tradesInScope) {
    sessionCounts.set(
      trade.session ?? "Overnight",
      (sessionCounts.get(trade.session ?? "Overnight") ?? 0) + 1,
    );
    symbolCounts.set(trade.symbol, (symbolCounts.get(trade.symbol) ?? 0) + 1);

    const playbookKey = trade.playbookId ?? "unassigned";
    const existingPlaybook = playbookCounts.get(playbookKey) ?? {
      label: trade.playbookName ?? "Unassigned",
      count: 0,
    };
    existingPlaybook.count += 1;
    playbookCounts.set(playbookKey, existingPlaybook);

    const setupKey = trade.setupDefinitionId ?? "unassigned";
    const existingSetup = setupCounts.get(setupKey) ?? {
      label: trade.setupName ?? "No Setup",
      count: 0,
    };
    existingSetup.count += 1;
    setupCounts.set(setupKey, existingSetup);

    const templateKey = trade.journalTemplateId ?? "unassigned";
    const existingTemplate = templateCounts.get(templateKey) ?? {
      label: trade.journalTemplateName ?? "No Template",
      count: 0,
    };
    existingTemplate.count += 1;
    templateCounts.set(templateKey, existingTemplate);

    if (trade.mistakeDefinitionIds.length === 0) {
      const existingMistake = mistakeCounts.get("unassigned") ?? {
        label: "No Mistake",
        count: 0,
      };
      existingMistake.count += 1;
      mistakeCounts.set("unassigned", existingMistake);
    } else {
      for (const [index, id] of trade.mistakeDefinitionIds.entries()) {
        const existingMistake = mistakeCounts.get(id) ?? {
          label: trade.mistakeNames[index] ?? "Unknown Mistake",
          count: 0,
        };
        existingMistake.count += 1;
        mistakeCounts.set(id, existingMistake);
      }
    }

    for (const tag of trade.setupTags) {
      setupTagCounts.set(tag, (setupTagCounts.get(tag) ?? 0) + 1);
    }
    for (const tag of trade.mistakeTags) {
      mistakeTagCounts.set(tag, (mistakeTagCounts.get(tag) ?? 0) + 1);
    }

    const reviewKey: AnalyticsWorkspaceReviewState = trade.reviewed
      ? "reviewed"
      : "needsReview";
    reviewStateCounts.set(reviewKey, (reviewStateCounts.get(reviewKey) ?? 0) + 1);
  }

  return {
    sessions: buildFacetOptions(sessionCounts),
    symbols: buildFacetOptions(symbolCounts),
    playbooks: buildPlaybookFacets(playbookCounts),
    setups: buildPlaybookFacets(setupCounts),
    mistakes: buildPlaybookFacets(mistakeCounts),
    templates: buildPlaybookFacets(templateCounts),
    setupTags: buildFacetOptions(setupTagCounts),
    mistakeTags: buildFacetOptions(mistakeTagCounts),
    reviewStates: [
      {
        value: "reviewed",
        label: "Reviewed",
        count: reviewStateCounts.get("reviewed") ?? 0,
      },
      {
        value: "needsReview",
        label: "Needs Review",
        count: reviewStateCounts.get("needsReview") ?? 0,
      },
    ],
  };
}

function buildSummary(
  filteredTrades: WorkspaceRow[],
): AnalyticsWorkspaceResult["summary"] {
  let winningTrades = 0;
  let losingTrades = 0;
  let breakevenTrades = 0;
  let netPnl = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let reviewedTrades = 0;
  let rSum = 0;
  let rCount = 0;

  for (const trade of filteredTrades) {
    netPnl += trade.netPnl;
    if (trade.netPnl > 0) {
      winningTrades += 1;
      grossProfit += trade.netPnl;
    } else if (trade.netPnl < 0) {
      losingTrades += 1;
      grossLoss += Math.abs(trade.netPnl);
    } else {
      breakevenTrades += 1;
    }

    if (trade.reviewed) {
      reviewedTrades += 1;
    }

    if (trade.rMultiple != null) {
      rSum += trade.rMultiple;
      rCount += 1;
    }
  }

  return {
    winningTrades,
    losingTrades,
    breakevenTrades,
    netPnl: round(netPnl),
    avgPnl:
      filteredTrades.length > 0 ? round(netPnl / filteredTrades.length) : 0,
    winRate:
      filteredTrades.length > 0
        ? round((winningTrades / filteredTrades.length) * 100, 1)
        : 0,
    avgRMultiple: rCount > 0 ? round(rSum / rCount, 2) : null,
    profitFactor:
      grossProfit > 0 && grossLoss > 0
        ? round(grossProfit / grossLoss, 2)
        : null,
    reviewedPercent:
      filteredTrades.length > 0
        ? round((reviewedTrades / filteredTrades.length) * 100, 1)
        : 0,
  };
}

export async function getAnalyticsWorkspaceResult(
  userId: string,
  query: AnalyticsWorkspaceQuery,
): Promise<AnalyticsWorkspaceResult> {
  const conditions = [eq(trades.userId, userId), eq(trades.status, "CLOSED")];

  if (query.filters.accountScope === "unassigned") {
    conditions.push(isNull(trades.propAccountId));
  } else if (query.filters.accountScope !== "all") {
    conditions.push(eq(trades.propAccountId, query.filters.accountScope));
  }

  const fromDate = parseDateStart(query.filters.from);
  if (fromDate) {
    conditions.push(gte(trades.exitDate, fromDate));
  }

  const toDate = parseDateEnd(query.filters.to);
  if (toDate) {
    conditions.push(lte(trades.exitDate, toDate));
  }

  const [rows, mistakeRows] = await Promise.all([
    db
      .select({
        id: trades.id,
        symbol: trades.symbol,
        direction: trades.direction,
        entryDate: trades.entryDate,
        exitDate: trades.exitDate,
        session: trades.session,
        playbookId: trades.playbookId,
        playbookName: playbooks.name,
        setupDefinitionId: trades.setupDefinitionId,
        setupName: setupDefinitions.name,
        journalTemplateId: trades.journalTemplateId,
        journalTemplateName: journalTemplates.name,
        mistakeDefinitionIds: trades.mistakeDefinitionIds,
        setupTags: trades.setupTags,
        mistakeTags: trades.mistakeTags,
        journalReview: trades.journalReview,
        notes: trades.notes,
        feelings: trades.feelings,
        observations: trades.observations,
        screenshots: trades.screenshots,
        executionNotes: trades.executionNotes,
        executionArrays: trades.executionArrays,
        marketCondition: trades.marketCondition,
        conviction: trades.conviction,
        lessonLearned: trades.lessonLearned,
        wouldTakeAgain: trades.wouldTakeAgain,
        pnl: trades.pnl,
        pnlIncludesCosts: trades.pnlIncludesCosts,
        commission: trades.commission,
        swap: trades.swap,
        rMultiple: trades.rMultiple,
      })
      .from(trades)
      .leftJoin(playbooks, eq(trades.playbookId, playbooks.id))
      .leftJoin(setupDefinitions, eq(trades.setupDefinitionId, setupDefinitions.id))
      .leftJoin(
        journalTemplates,
        eq(trades.journalTemplateId, journalTemplates.id),
      )
      .where(and(...conditions))
      .orderBy(asc(trades.exitDate), asc(trades.entryDate)),
    db
      .select({
        id: mistakeDefinitions.id,
        name: mistakeDefinitions.name,
      })
      .from(mistakeDefinitions)
      .where(eq(mistakeDefinitions.userId, userId)),
  ]);

  const mistakeNameById = new Map(
    mistakeRows.map((row) => [row.id, row.name?.trim() || "Unknown Mistake"]),
  );

  const tradesInScope: WorkspaceRow[] = rows.map((row) => {
    const setupTags = normalizeStringArray(row.setupTags);
    const mistakeTags = normalizeStringArray(row.mistakeTags);
    const executionArrays = normalizeStringArray(row.executionArrays);
    const mistakeDefinitionIds = normalizeUuidArray(row.mistakeDefinitionIds);
    const mistakeNames = mistakeDefinitionIds.map(
      (id) => mistakeNameById.get(id) ?? "Unknown Mistake",
    );
    const session = normalizeSession(row.session, row.entryDate, row.exitDate);
    const reviewed = isReviewedRow({
      notes: row.notes,
      feelings: row.feelings,
      observations: row.observations,
      executionNotes: row.executionNotes,
      setupTags,
      mistakeTags,
      conviction: row.conviction,
      marketCondition: row.marketCondition,
      lessonLearned: row.lessonLearned,
      wouldTakeAgain: row.wouldTakeAgain,
      screenshots: row.screenshots,
      executionArrays,
      journalReview: row.journalReview,
      setupDefinitionId: row.setupDefinitionId ?? null,
      mistakeDefinitionIds,
    });

    return {
      id: row.id,
      symbol: row.symbol,
      direction: row.direction === "SHORT" ? "SHORT" : "LONG",
      entryDate: row.entryDate,
      exitDate: row.exitDate,
      session,
      playbookId: row.playbookId ?? null,
      playbookName: row.playbookName?.trim() || null,
      setupDefinitionId: row.setupDefinitionId ?? null,
      setupName: row.setupName?.trim() || null,
      journalTemplateId: row.journalTemplateId ?? null,
      journalTemplateName: row.journalTemplateName?.trim() || null,
      mistakeDefinitionIds,
      mistakeNames,
      setupTags,
      mistakeTags,
      journalReview: asRecord(row.journalReview),
      notes: row.notes,
      feelings: row.feelings,
      observations: row.observations,
      screenshots: row.screenshots,
      executionNotes: row.executionNotes,
      executionArrays,
      marketCondition: row.marketCondition,
      conviction: row.conviction ?? null,
      lessonLearned: row.lessonLearned,
      wouldTakeAgain: row.wouldTakeAgain ?? null,
      netPnl: getTradeNetPnl({
        pnl: row.pnl,
        pnlIncludesCosts: row.pnlIncludesCosts ?? true,
        commission: row.commission,
        swap: row.swap,
      }),
      rMultiple: row.rMultiple != null ? toNumber(row.rMultiple) : null,
      reviewed,
    };
  });

  const filteredTrades = applyWorkspaceFilters(tradesInScope, query);
  const grouped = buildGroupedRows(filteredTrades, query);

  return {
    query,
    totals: {
      scopedTrades: tradesInScope.length,
      filteredTrades: filteredTrades.length,
      groups: grouped.totalGroups,
    },
    summary: buildSummary(filteredTrades),
    facets: buildFacets(filteredTrades),
    rows: grouped.rows,
    drilldown: buildDrilldown(filteredTrades, query),
  };
}
