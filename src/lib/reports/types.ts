export const REPORT_TYPES = ['performance', 'playbook', 'risk'] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_ACCOUNT_SCOPES = ['all', 'account', 'unassigned'] as const;

export type ReportAccountScope = (typeof REPORT_ACCOUNT_SCOPES)[number];

export interface ReportFilters {
  title?: string | null;
  reportType: ReportType;
  accountScope: ReportAccountScope;
  propAccountId: string | null;
  from: string | null;
  to: string | null;
  includeAi: boolean;
  symbol: string | null;
  playbookId: string | null;
}

export interface ReportSummary {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number;
  totalNetPnl: number;
  totalGrossPnl: number;
  totalCosts: number;
  avgNetPnl: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  avgRMultiple: number | null;
  profitFactor: number | null;
  largestWin: number;
  largestLoss: number;
  avgHoldMinutes: number | null;
  medianHoldMinutes: number | null;
  stopCoveragePercent: number;
}

export interface ReportBreakdownRow {
  label: string;
  trades: number;
  share: number;
  winRate: number;
  pnl: number;
  avgPnl: number;
  avgRMultiple: number | null;
}

export interface ReportTagBreakdownRow {
  tag: string;
  count: number;
  share: number;
  winRate: number;
  pnl: number;
}

export interface ReportTimeRow {
  label: string;
  trades: number;
  share: number;
  winRate: number;
  pnl: number;
  avgPnl: number;
  avgHoldMinutes: number | null;
}

export interface ReportHoldBucket {
  label: string;
  sublabel: string;
  trades: number;
  share: number;
  avgPnl: number;
  avgRMultiple: number | null;
}

export interface ReportExecutionRisk {
  avgMae: number | null;
  avgMfe: number | null;
  avgWinnerMae: number | null;
  avgWinnerMfe: number | null;
  avgLoserMae: number | null;
  avgLoserMfe: number | null;
  avgEntryRating: number | null;
  avgExitRating: number | null;
  avgManagementRating: number | null;
  avgConviction: number | null;
  wouldTakeAgainPercent: number | null;
  noStopLossPercent: number;
  rDistribution: Array<{
    label: string;
    count: number;
    share: number;
  }>;
  convictionDistribution: Array<{
    label: string;
    count: number;
    share: number;
  }>;
}

export interface ReportBehavioralPatterns {
  repeatedLessons: Array<{
    label: string;
    count: number;
  }>;
  commonSetupTags: ReportTagBreakdownRow[];
  commonMistakeTags: ReportTagBreakdownRow[];
  bestSession: ReportBreakdownRow | null;
  weakestSession: ReportBreakdownRow | null;
  highConvictionLossRate: number | null;
  lowConvictionLossRate: number | null;
  highRatedTradeWinRate: number | null;
  weakManagementTradeLossRate: number | null;
}

export interface ReportStyleProfile {
  primaryStyle: string;
  holdingStyle: string;
  sessionBias: string | null;
  directionBias: string;
  playbookDependence: string;
  executionDiscipline: string;
  riskBehavior: string;
  secondaryTraits: string[];
  repeatPatterns: string[];
  strengths: string[];
  weaknesses: string[];
  feedback: string[];
}

export interface ReportDetailedTradeRow {
  id: string;
  closedAt: string | null;
  symbol: string;
  direction: string;
  session: string;
  playbook: string;
  pnl: number;
  rMultiple: number | null;
  mae: number | null;
  mfe: number | null;
  holdMinutes: number | null;
  conviction: number | null;
  entryRating: number | null;
  exitRating: number | null;
  managementRating: number | null;
  setupTags: string[];
  mistakeTags: string[];
  lessonLearned: string | null;
  wouldTakeAgain: boolean | null;
}

export interface ReportAiCommentary {
  headline: string;
  executiveSummary: string;

  // Long-form narrative sections (2-4 paragraphs each) — optional for backward compat with old saved reports
  performanceNarrative?: string;
  psychologyAnalysis?: string;
  riskAnalysis?: string;
  timingAnalysis?: string;
  playbookAnalysis?: string;
  verdict?: string;

  // Structured evidence-backed bullet lists
  strengths: string[];
  weaknesses: string[];
  psychologyFlags?: string[];
  riskFlags?: string[];
  repeatedPatterns: string[];
  timingObservations: string[];
  playbookObservations: string[];
  quickWins?: string[];
  longerTermFocus?: string[];
  correctiveActions: string[];

  confidence: string;
}

export interface TradeReportSnapshot {
  title: string;
  reportType: ReportType;
  generatedAt: string;
  filters: ReportFilters;
  selectedTradeIds: string[];
  summary: ReportSummary;
  styleProfile: ReportStyleProfile;
  distributions: {
    symbols: ReportBreakdownRow[];
    directions: ReportBreakdownRow[];
    sessions: ReportBreakdownRow[];
    playbooks: ReportBreakdownRow[];
    setupTags: ReportTagBreakdownRow[];
    mistakeTags: ReportTagBreakdownRow[];
  };
  timing: {
    weekdays: ReportTimeRow[];
    hours: ReportTimeRow[];
    holdBuckets: ReportHoldBucket[];
  };
  executionRisk: ReportExecutionRisk;
  behavioral: ReportBehavioralPatterns;
  detailedTrades: ReportDetailedTradeRow[];
  aiCommentary: ReportAiCommentary | null;
  aiError: string | null;
}

export interface SavedReportListItem {
  id: string;
  title: string;
  reportType: ReportType;
  accountScope: ReportAccountScope;
  propAccountId: string | null;
  from: string | null;
  to: string | null;
  includeAi: boolean;
  tradeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavedReportRecord extends SavedReportListItem {
  selectedTradeIds: string[];
  snapshot: TradeReportSnapshot;
}
