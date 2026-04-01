import type { AnalyticsWorkspaceQuery } from "@/lib/analytics/workspace-types";
import type { ReportFilters, WorkspaceReportSnapshot } from "@/lib/reports/types";

function formatScope(filters: ReportFilters) {
  if (filters.accountScope === "all") return "All Accounts";
  if (filters.accountScope === "unassigned") return "Unassigned";
  return "Scoped Account";
}

function formatDateRange(filters: ReportFilters) {
  if (filters.from && filters.to) {
    return `${filters.from} to ${filters.to}`;
  }
  if (filters.from) return `From ${filters.from}`;
  if (filters.to) return `Until ${filters.to}`;
  return "All Dates";
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getDimensionLabel(value: ReportFilters["groupBy"]) {
  if (value === "setup") return "Setup";
  if (value === "mistake") return "Mistake";
  if (value === "rule") return "Rule";
  if (value === "template") return "Template";
  if (value === "setupTag") return "Setup Tag";
  if (value === "mistakeTag") return "Mistake Tag";
  if (value === "reviewStatus") return "Review Status";
  return sentenceCase(value);
}

function getMeasureLabel(value: ReportFilters["measure"]) {
  if (value === "netPnl") return "Net P&L";
  if (value === "avgPnl") return "Average P&L";
  if (value === "winRate") return "Win Rate";
  if (value === "profitFactor") return "Profit Factor";
  if (value === "avgRMultiple") return "Average R";
  if (value === "reviewedPercent") return "Reviewed %";
  return "Trade Count";
}

export function getDefaultReportQuerySettings(reportType: ReportFilters["reportType"]) {
  if (reportType === "playbook") {
    return {
      groupBy: "playbook" as const,
      measure: "netPnl" as const,
    };
  }

  if (reportType === "risk") {
    return {
      groupBy: "mistake" as const,
      measure: "netPnl" as const,
    };
  }

  return {
    groupBy: "symbol" as const,
    measure: "netPnl" as const,
  };
}

export function normalizeReportFilters(
  filters: Partial<ReportFilters>,
): ReportFilters {
  const reportType = filters.reportType ?? "performance";
  const defaults = getDefaultReportQuerySettings(reportType);

  return {
    title: filters.title ?? null,
    reportType,
    accountScope: filters.accountScope ?? "all",
    propAccountId: filters.propAccountId ?? null,
    from: filters.from ?? null,
    to: filters.to ?? null,
    includeAi: filters.includeAi ?? false,
    groupBy: filters.groupBy ?? defaults.groupBy,
    measure: filters.measure ?? defaults.measure,
    sortOrder: filters.sortOrder ?? "desc",
    limit: filters.limit ?? 24,
    timeZone: filters.timeZone ?? null,
    symbol: filters.symbol ?? null,
    session: filters.session ?? null,
    playbookId: filters.playbookId ?? null,
    setupDefinitionId: filters.setupDefinitionId ?? null,
    mistakeDefinitionId: filters.mistakeDefinitionId ?? null,
    journalTemplateId: filters.journalTemplateId ?? null,
    setupTag: filters.setupTag ?? null,
    mistakeTag: filters.mistakeTag ?? null,
    direction: filters.direction ?? null,
    reviewStatus: filters.reviewStatus ?? null,
    ruleStatus: filters.ruleStatus ?? null,
  };
}

export function createDefaultReportTitle(filters: ReportFilters) {
  return `${sentenceCase(filters.reportType)} View | ${getDimensionLabel(filters.groupBy)} by ${getMeasureLabel(filters.measure)} | ${formatScope(filters)} | ${formatDateRange(filters)}`;
}

export function buildAnalyticsWorkspaceQueryFromReportFilters(
  filters: ReportFilters,
  overrides?: Partial<AnalyticsWorkspaceQuery>,
): AnalyticsWorkspaceQuery {
  const query: AnalyticsWorkspaceQuery = {
    groupBy: filters.groupBy,
    measure: filters.measure,
    sortOrder: filters.sortOrder,
    limit: filters.limit,
    drilldownKey: null,
    filters: {
      accountScope:
        filters.accountScope === "account"
          ? (filters.propAccountId ?? "all")
          : filters.accountScope,
      from: filters.from,
      to: filters.to,
      timeZone: filters.timeZone,
      symbol: filters.symbol,
      session: filters.session,
      playbookId: filters.playbookId,
      setupDefinitionId: filters.setupDefinitionId,
      mistakeDefinitionId: filters.mistakeDefinitionId,
      journalTemplateId: filters.journalTemplateId,
      setupTag: filters.setupTag,
      mistakeTag: filters.mistakeTag,
      direction: filters.direction,
      reviewStatus: filters.reviewStatus,
      ruleStatus: filters.ruleStatus,
    },
  };

  return {
    ...query,
    ...overrides,
    filters: {
      ...query.filters,
      ...(overrides?.filters ?? {}),
    },
  };
}

export function createWorkspaceReportSnapshot(
  filters: ReportFilters,
  workspace: WorkspaceReportSnapshot["workspace"],
): WorkspaceReportSnapshot {
  return {
    kind: "workspace",
    title: filters.title?.trim() || createDefaultReportTitle(filters),
    reportType: filters.reportType,
    generatedAt: new Date().toISOString(),
    filters,
    workspace,
  };
}
