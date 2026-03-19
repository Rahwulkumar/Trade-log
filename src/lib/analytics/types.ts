export type AnalyticsAccountScope = 'all' | 'unassigned' | (string & {});

export interface AnalyticsCoverage {
  rMultiplePercent: number;
  maeMfePercent: number;
  sessionPercent: number;
  playbookPercent: number;
  stopLossPercent: number;
  riskSamplePercent: number;
}

export interface AnalyticsMeta {
  accountScope: AnalyticsAccountScope;
  accountLabel: string;
  startingBalance: number;
  tradeCount: number;
  generatedAt: string;
  firstTradeAt: string | null;
  lastTradeAt: string | null;
  timeZone: string;
  coverage: AnalyticsCoverage;
}

export interface AnalyticsSummary {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number;
  totalNetPnl: number;
  totalGrossPnl: number;
  totalCosts: number;
  avgNetPnl: number;
  avgRMultiple: number | null;
  profitFactor: number | null;
  largestWin: number;
  largestLoss: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
}

export interface RiskMetrics {
  sharpe: number | null;
  sortino: number | null;
  calmar: number | null;
  recoveryFactor: number | null;
  riskOfRuin: number | null;
}

export interface EquityPoint {
  date: string;
  label: string;
  balance: number;
  pnl: number;
  cumulativeNetPnl: number;
  peak: number;
  drawdownPercent: number | null;
  drawdownAmount: number;
}

export interface DrawdownStats {
  maxDrawdownPercent: number | null;
  maxDrawdownAmount: number;
  averageDrawdownPercent: number | null;
  averageDrawdownAmount: number | null;
  longestDrawdownDays: number | null;
  longestDrawdownFrom: string | null;
  longestDrawdownTo: string | null;
  currentFromPeakPercent: number | null;
  currentFromPeakAmount: number;
  allTimeHighEvents: number;
  averageRecoveryDays: number | null;
}

export interface RangeBucket {
  range: string;
  count: number;
}

export interface PnlBucket {
  bucket: string;
  count: number;
}

export interface HoldBucket {
  label: string;
  sub: string;
  count: number;
  avgPnl: number;
}

export interface SessionBucket {
  session: string;
  range: string;
  trades: number;
  winRate: number;
  pnl: number;
  avgPnl: number;
  color: string;
}

export interface DayBucket {
  day: string;
  totalPnl: number;
  trades: number;
  winRate: number;
}

export interface HourBucket {
  hour: number;
  label: string;
  avgPnl: number;
  trades: number;
}

export interface StreakStats {
  current: number;
  currentType: 'win' | 'loss' | 'flat';
  longestWin: number;
  longestLoss: number;
  recentTrades: Array<'W' | 'L'>;
}

export interface ConsistencyScore {
  score: number;
  positionSize: number;
  timing: number;
  winLossBalance: number;
  stopAdherence: number;
}

export interface MaeMfePoint {
  tradeId: string;
  symbol: string;
  mae: number;
  mfe: number;
  result: 'win' | 'loss';
}

export interface InstrumentRow {
  symbol: string;
  trades: number;
  winRate: number;
  pf: number | null;
  avgPnl: number;
  totalPnl: number;
  avgHold: string;
}

export interface StrategyRow {
  strategy: string;
  trades: number;
  winRate: number;
  pf: number | null;
  avgPnl: number;
  totalPnl: number;
}

export interface AnalyticsPayload {
  meta: AnalyticsMeta;
  summary: AnalyticsSummary;
  risk: RiskMetrics;
  equity: EquityPoint[];
  underwater: EquityPoint[];
  drawdown: DrawdownStats;
  distributions: {
    r: RangeBucket[];
    pnl: PnlBucket[];
    holdTime: HoldBucket[];
  };
  time: {
    session: SessionBucket[];
    dayOfWeek: DayBucket[];
    hourly: HourBucket[];
  };
  streaks: StreakStats;
  consistency: ConsistencyScore | null;
  maeMfe: MaeMfePoint[] | null;
  instruments: InstrumentRow[];
  strategies: StrategyRow[];
}

export interface AnalyticsTradeInput {
  id: string;
  symbol: string;
  propAccountId: string | null;
  direction: string | null;
  pnl: string | number | null;
  pnlIncludesCosts: boolean;
  commission: string | number | null;
  swap: string | number | null;
  rMultiple: string | number | null;
  mae: number | null;
  mfe: number | null;
  entryDate: Date | null;
  exitDate: Date | null;
  session: string | null;
  positionSize: string | number | null;
  stopLoss: string | number | null;
  entryPrice: string | number | null;
  contractSize: string | number | null;
  mt5AccountId: string | null;
  playbookId: string | null;
  playbookName: string | null;
}

export interface AnalyticsComputeOptions {
  accountScope: AnalyticsAccountScope;
  accountLabel: string;
  startingBalance: number;
  timeZone: string;
  defaultRiskPercent: number | null;
  maxLossPercent: number | null;
}
