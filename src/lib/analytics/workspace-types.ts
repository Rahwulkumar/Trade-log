import type { AnalyticsAccountScope } from "@/lib/analytics/types";

export const ANALYTICS_WORKSPACE_DIMENSIONS = [
  "symbol",
  "session",
  "playbook",
  "setup",
  "mistake",
  "rule",
  "template",
  "setupTag",
  "mistakeTag",
  "direction",
  "weekday",
  "reviewStatus",
] as const;

export type AnalyticsWorkspaceDimension =
  (typeof ANALYTICS_WORKSPACE_DIMENSIONS)[number];

export const ANALYTICS_WORKSPACE_MEASURES = [
  "trades",
  "netPnl",
  "avgPnl",
  "winRate",
  "profitFactor",
  "avgRMultiple",
  "reviewedPercent",
] as const;

export type AnalyticsWorkspaceMeasure =
  (typeof ANALYTICS_WORKSPACE_MEASURES)[number];

export const ANALYTICS_WORKSPACE_SORT_ORDERS = ["desc", "asc"] as const;

export type AnalyticsWorkspaceSortOrder =
  (typeof ANALYTICS_WORKSPACE_SORT_ORDERS)[number];

export const ANALYTICS_WORKSPACE_REVIEW_STATES = [
  "reviewed",
  "needsReview",
] as const;

export type AnalyticsWorkspaceReviewState =
  (typeof ANALYTICS_WORKSPACE_REVIEW_STATES)[number];

export const ANALYTICS_WORKSPACE_RULE_STATUSES = [
  "followed",
  "broken",
  "skipped",
  "notApplicable",
] as const;

export type AnalyticsWorkspaceRuleStatus =
  (typeof ANALYTICS_WORKSPACE_RULE_STATUSES)[number];

export type AnalyticsWorkspaceScopedFilterId = string | "unassigned" | null;

export interface AnalyticsWorkspaceFilters {
  accountScope: AnalyticsAccountScope;
  from: string | null;
  to: string | null;
  timeZone: string | null;
  symbol: string | null;
  session: string | null;
  playbookId: AnalyticsWorkspaceScopedFilterId;
  setupDefinitionId: AnalyticsWorkspaceScopedFilterId;
  mistakeDefinitionId: AnalyticsWorkspaceScopedFilterId;
  journalTemplateId: AnalyticsWorkspaceScopedFilterId;
  setupTag: string | null;
  mistakeTag: string | null;
  direction: "LONG" | "SHORT" | null;
  reviewStatus: AnalyticsWorkspaceReviewState | null;
  ruleStatus: AnalyticsWorkspaceRuleStatus | null;
}

export interface AnalyticsWorkspaceQuery {
  groupBy: AnalyticsWorkspaceDimension;
  measure: AnalyticsWorkspaceMeasure;
  sortOrder: AnalyticsWorkspaceSortOrder;
  limit: number;
  filters: AnalyticsWorkspaceFilters;
  drilldownKey?: string | null;
}

export interface AnalyticsWorkspaceFacetOption {
  value: string;
  label: string;
  count: number;
}

export interface AnalyticsWorkspacePlaybookFacet {
  id: string | null;
  label: string;
  count: number;
}

export interface AnalyticsWorkspaceEntityFacet {
  id: string | null;
  label: string;
  count: number;
}

export interface AnalyticsWorkspaceRow {
  key: string;
  label: string;
  trades: number;
  share: number;
  netPnl: number;
  avgPnl: number;
  winRate: number;
  avgRMultiple: number | null;
  profitFactor: number | null;
  reviewedPercent: number;
}

export interface AnalyticsWorkspaceTrade {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  session: string;
  playbook: string;
  setup: string | null;
  rulebook: string | null;
  brokenRules: string[];
  followedRules: string[];
  skippedRules: string[];
  notApplicableRules: string[];
  mistakes: string[];
  template: string | null;
  setupTags: string[];
  mistakeTags: string[];
  reviewed: boolean;
  entryAt: string | null;
  exitAt: string | null;
  netPnl: number;
  rMultiple: number | null;
}

export interface AnalyticsWorkspaceDrilldown {
  key: string;
  label: string;
  trades: AnalyticsWorkspaceTrade[];
}

export interface AnalyticsWorkspaceResult {
  query: AnalyticsWorkspaceQuery;
  totals: {
    scopedTrades: number;
    filteredTrades: number;
    groups: number;
  };
  summary: {
    winningTrades: number;
    losingTrades: number;
    breakevenTrades: number;
    netPnl: number;
    avgPnl: number;
    winRate: number;
    avgRMultiple: number | null;
    profitFactor: number | null;
    reviewedPercent: number;
  };
  facets: {
    sessions: AnalyticsWorkspaceFacetOption[];
    symbols: AnalyticsWorkspaceFacetOption[];
    playbooks: AnalyticsWorkspacePlaybookFacet[];
    setups: AnalyticsWorkspaceEntityFacet[];
    mistakes: AnalyticsWorkspaceEntityFacet[];
    templates: AnalyticsWorkspaceEntityFacet[];
    setupTags: AnalyticsWorkspaceFacetOption[];
    mistakeTags: AnalyticsWorkspaceFacetOption[];
    reviewStates: AnalyticsWorkspaceFacetOption[];
    ruleStatuses: AnalyticsWorkspaceFacetOption[];
  };
  rows: AnalyticsWorkspaceRow[];
  drilldown: AnalyticsWorkspaceDrilldown | null;
}
