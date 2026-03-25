import type {
  AnalyticsComputeOptions,
  AnalyticsPayload,
  AnalyticsTradeInput,
  ConsistencyScore,
  DayBucket,
  DrawdownStats,
  EquityPoint,
  HoldBucket,
  HourBucket,
  InstrumentRow,
  MaeMfePoint,
  PnlBucket,
  RangeBucket,
  RiskMetrics,
  SessionBucket,
  StreakStats,
  StrategyRow,
} from '@/lib/analytics/types';

type DrawdownCycle = {
  start: Date;
  end: Date;
  deepestAmount: number;
  deepestPercent: number | null;
};

type AggregateStats = {
  trades: number;
  wins: number;
  grossProfit: number;
  grossLoss: number;
  totalPnl: number;
  totalHoldSeconds: number;
};

const SESSION_CONFIG = [
  {
    key: 'Asia',
    label: 'Asia',
    color: '#5fb3ff',
  },
  {
    key: 'London',
    label: 'London',
    color: '#8e7dff',
  },
  {
    key: 'Overlap',
    label: 'London/NY Overlap',
    color: '#f7c36a',
  },
  {
    key: 'New York',
    label: 'New York',
    color: '#ff7a59',
  },
  {
    key: 'Off Session',
    label: 'Off Session',
    color: '#768395',
  },
] as const;

type SessionKey = (typeof SESSION_CONFIG)[number]['key'];

const LONDON_MARKET_HOURS = {
  timeZone: 'Europe/London',
  startHour: 8,
  endHour: 16,
} as const;

const NEW_YORK_MARKET_HOURS = {
  timeZone: 'America/New_York',
  startHour: 8,
  endHour: 17,
} as const;

const sessionScheduleCache = new Map<string, SessionKey[]>();
const sessionRangeCache = new Map<string, Map<SessionKey, string>>();

const WEEKDAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = average(values);
  if (mean == null) return null;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function coefficientOfVariation(values: number[]): number | null {
  const mean = average(values);
  const stdDev = standardDeviation(values);
  if (mean == null || stdDev == null || Math.abs(mean) < 1e-9) return null;
  return stdDev / Math.abs(mean);
}

function scoreFromCv(cv: number | null, limit: number): number | null {
  if (cv == null || !Number.isFinite(cv)) return null;
  return round(clamp((1 - cv / limit) * 100, 0, 100));
}

function formatCurrencyCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return `$${round(value / 1000, 1)}k`;
  }
  return `$${round(value, 0)}`;
}

function formatLocalDateKey(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

function formatLocalLabel(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getLocalWeekday(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
  }).format(date);
}

function getLocalHour(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '0';
  return Number.parseInt(hour, 10) % 24;
}

function utcHour(date: Date): number {
  return date.getUTCHours();
}

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function isLocalSessionOpen(
  date: Date,
  timeZone: string,
  startHour: number,
  endHour: number,
): boolean {
  const localHour = getLocalHour(date, timeZone);
  return localHour >= startHour && localHour < endHour;
}

function hoursToUtcRange(hours: number[]): string {
  if (hours.length === 0) return 'DST-aware UTC window';
  const start = hours[0];
  const end = (hours[hours.length - 1] + 1) % 24;
  return `${formatHourLabel(start)}-${formatHourLabel(end)} UTC`;
}

function buildSessionSchedule(date: Date): SessionKey[] {
  const key = utcDateKey(date);
  const cached = sessionScheduleCache.get(key);
  if (cached) return cached;

  const londonActive: boolean[] = [];
  const newYorkActive: boolean[] = [];

  for (let hour = 0; hour < 24; hour += 1) {
    const sample = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        hour,
      ),
    );
    londonActive[hour] = isLocalSessionOpen(
      sample,
      LONDON_MARKET_HOURS.timeZone,
      LONDON_MARKET_HOURS.startHour,
      LONDON_MARKET_HOURS.endHour,
    );
    newYorkActive[hour] = isLocalSessionOpen(
      sample,
      NEW_YORK_MARKET_HOURS.timeZone,
      NEW_YORK_MARKET_HOURS.startHour,
      NEW_YORK_MARKET_HOURS.endHour,
    );
  }

  const londonOpenHour = londonActive.findIndex(Boolean);
  const schedule = Array.from({ length: 24 }, (_, hour): SessionKey => {
    if (londonActive[hour] && newYorkActive[hour]) return 'Overlap';
    if (londonActive[hour]) return 'London';
    if (newYorkActive[hour]) return 'New York';
    if (londonOpenHour !== -1 && hour < londonOpenHour) return 'Asia';
    return 'Off Session';
  });

  sessionScheduleCache.set(key, schedule);
  return schedule;
}

function buildSessionRangeMap(date: Date): Map<SessionKey, string> {
  const key = utcDateKey(date);
  const cached = sessionRangeCache.get(key);
  if (cached) return cached;

  const schedule = buildSessionSchedule(date);
  const rangeMap = new Map<SessionKey, string>();

  for (const config of SESSION_CONFIG) {
    const hours: number[] = [];
    for (let hour = 0; hour < schedule.length; hour += 1) {
      if (schedule[hour] === config.key) {
        hours.push(hour);
      }
    }
    rangeMap.set(config.key, hoursToUtcRange(hours));
  }

  sessionRangeCache.set(key, rangeMap);
  return rangeMap;
}

function summarizeSessionRanges(rangeLabels: Set<string> | undefined): string {
  if (!rangeLabels || rangeLabels.size === 0) return 'DST-aware UTC window';
  if (rangeLabels.size === 1) {
    return [...rangeLabels][0];
  }

  const parsed = [...rangeLabels]
    .map((label) => {
      const match = label.match(/^(\d{2}:\d{2})-(\d{2}:\d{2}) UTC$/);
      if (!match) return null;
      return { start: match[1], end: match[2] };
    })
    .filter(
      (value): value is { start: string; end: string } => value != null,
    );

  if (parsed.length === 0) return 'DST-aware UTC window';

  const starts = [...new Set(parsed.map((value) => value.start))].sort();
  const ends = [...new Set(parsed.map((value) => value.end))].sort();

  return `${starts.join('/')} - ${ends.join('/')} UTC (DST-aware)`;
}

function normalizeStoredSession(session: string | null): string | null {
  if (!session) return null;
  const normalized = session.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'asian' || normalized === 'asia') return 'Asia';
  if (normalized === 'london') return 'London';
  if (normalized === 'new york' || normalized === 'newyork') return 'New York';
  if (normalized === 'overlap' || normalized === 'london/new york overlap') {
    return 'Overlap';
  }
  return null;
}

function deriveSession(date: Date): string {
  return buildSessionSchedule(date)[utcHour(date)] ?? 'Off Session';
}

function formatHoldTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0m';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours}h`;
}

function daysBetween(start: Date, end: Date): number {
  const diff = end.getTime() - start.getTime();
  return Math.max(0, diff / (1000 * 60 * 60 * 24));
}

function buildRDistribution(values: number[]): RangeBucket[] {
  if (values.length === 0) return [];

  const buckets = [
    { label: '< -2R', test: (value: number) => value < -2 },
    { label: '-2R to -1R', test: (value: number) => value >= -2 && value < -1 },
    { label: '-1R to 0R', test: (value: number) => value >= -1 && value < 0 },
    { label: '0R', test: (value: number) => value === 0 },
    { label: '0R to 1R', test: (value: number) => value > 0 && value < 1 },
    { label: '1R to 2R', test: (value: number) => value >= 1 && value < 2 },
    { label: '2R+', test: (value: number) => value >= 2 },
  ];

  return buckets.map((bucket) => ({
    range: bucket.label,
    count: values.filter(bucket.test).length,
  }));
}

function buildPnlDistribution(values: number[]): PnlBucket[] {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return [{ bucket: formatCurrencyCompact(min), count: values.length }];
  }

  const bucketCount = 7;
  const width = (max - min) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = min + width * index;
    const end = index === bucketCount - 1 ? max : min + width * (index + 1);
    const label =
      index === bucketCount - 1
        ? `${formatCurrencyCompact(start)}+`
        : `${formatCurrencyCompact(start)} to ${formatCurrencyCompact(end)}`;
    return { start, end, label, count: 0 };
  });

  for (const value of values) {
    const index =
      value === max
        ? bucketCount - 1
        : Math.min(bucketCount - 1, Math.max(0, Math.floor((value - min) / width)));
    buckets[index].count += 1;
  }

  return buckets.map(({ label, count }) => ({ bucket: label, count }));
}

function buildHoldBuckets(entries: Array<{ seconds: number; pnl: number }>): HoldBucket[] {
  const buckets = [
    {
      label: 'Scalp',
      sub: '< 15m',
      test: (seconds: number) => seconds < 15 * 60,
      rows: [] as Array<{ seconds: number; pnl: number }>,
    },
    {
      label: 'Quick Intraday',
      sub: '15m to 1h',
      test: (seconds: number) => seconds >= 15 * 60 && seconds < 60 * 60,
      rows: [] as Array<{ seconds: number; pnl: number }>,
    },
    {
      label: 'Session Trade',
      sub: '1h to 4h',
      test: (seconds: number) => seconds >= 60 * 60 && seconds < 4 * 60 * 60,
      rows: [] as Array<{ seconds: number; pnl: number }>,
    },
    {
      label: 'Extended Hold',
      sub: '> 4h',
      test: (seconds: number) => seconds >= 4 * 60 * 60,
      rows: [] as Array<{ seconds: number; pnl: number }>,
    },
  ];

  for (const entry of entries) {
    const bucket = buckets.find((candidate) => candidate.test(entry.seconds));
    if (bucket) {
      bucket.rows.push(entry);
    }
  }

  return buckets.map((bucket) => ({
    label: bucket.label,
    sub: bucket.sub,
    count: bucket.rows.length,
    avgPnl:
      bucket.rows.length > 0
        ? round(
            bucket.rows.reduce((sum, row) => sum + row.pnl, 0) / bucket.rows.length,
          )
        : 0,
  }));
}

function buildStreakStats(results: Array<'W' | 'L' | 'B'>): StreakStats {
  let current = 0;
  let currentType: 'win' | 'loss' | 'flat' = 'flat';
  let longestWin = 0;
  let longestLoss = 0;
  let activeWin = 0;
  let activeLoss = 0;

  for (const result of results) {
    if (result === 'W') {
      activeWin += 1;
      activeLoss = 0;
      longestWin = Math.max(longestWin, activeWin);
      currentType = 'win';
      current = activeWin;
    } else if (result === 'L') {
      activeLoss += 1;
      activeWin = 0;
      longestLoss = Math.max(longestLoss, activeLoss);
      currentType = 'loss';
      current = activeLoss;
    } else {
      activeWin = 0;
      activeLoss = 0;
      currentType = 'flat';
      current = 0;
    }
  }

  if (results.length === 0) {
    currentType = 'flat';
    current = 0;
  }

  return {
    current,
    currentType,
    longestWin,
    longestLoss,
    recentTrades: results.slice(-12).reverse(),
  };
}

function monteCarloRiskOfRuin(
  rValues: number[],
  ruinThresholdR: number | null,
): number | null {
  if (!ruinThresholdR || ruinThresholdR <= 0 || rValues.length < 30) return null;

  const simulations = 1200;
  const horizon = clamp(rValues.length, 60, 200);
  let ruinedPaths = 0;
  let seed = Math.max(
    1,
    Math.floor(
      Math.abs(rValues.reduce((sum, value) => sum + value * 100, 0)) + rValues.length,
    ),
  );

  const nextRandom = () => {
    seed = (seed * 48271) % 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let simulation = 0; simulation < simulations; simulation += 1) {
    let cumulativeR = 0;
    for (let tradeIndex = 0; tradeIndex < horizon; tradeIndex += 1) {
      const sample = rValues[Math.floor(nextRandom() * rValues.length)];
      cumulativeR += sample;
      if (cumulativeR <= -ruinThresholdR) {
        ruinedPaths += 1;
        break;
      }
    }
  }

  return round((ruinedPaths / simulations) * 100, 2);
}

function computeConsistencyScore(
  totalTrades: number,
  riskFractions: number[],
  sessionCounts: number[],
  rollingRMeans: number[],
  stopLossCoverage: number,
): ConsistencyScore | null {
  if (totalTrades < 20) return null;

  const positionSize = scoreFromCv(coefficientOfVariation(riskFractions), 0.6);
  const sessionTotal = sessionCounts.reduce((sum, count) => sum + count, 0);
  const timing =
    sessionTotal > 0
      ? (() => {
          const bucketCount = Math.max(sessionCounts.length, 2);
          const hhi = sessionCounts.reduce((sum, count) => {
            const share = count / sessionTotal;
            return sum + share * share;
          }, 0);
          const normalized = (hhi - 1 / bucketCount) / (1 - 1 / bucketCount);
          return round(clamp(normalized * 100, 0, 100));
        })()
      : null;
  const winLossBalance = scoreFromCv(
    coefficientOfVariation(rollingRMeans.map((value) => Math.abs(value))),
    0.8,
  );
  const stopAdherence = round(stopLossCoverage);

  const weighted = [
    { value: positionSize, weight: 0.35 },
    { value: timing, weight: 0.25 },
    { value: winLossBalance, weight: 0.25 },
    { value: stopAdherence, weight: 0.15 },
  ].filter(
    (entry): entry is { value: number; weight: number } => entry.value != null,
  );

  if (weighted.length < 2) return null;

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  const score =
    weighted.reduce((sum, entry) => sum + entry.value * entry.weight, 0) /
    totalWeight;

  return {
    score: round(score),
    positionSize: positionSize ?? 0,
    timing: timing ?? 0,
    winLossBalance: winLossBalance ?? 0,
    stopAdherence,
  };
}

function sanitizeProfitFactor(grossProfit: number, grossLoss: number): number | null {
  if (grossProfit <= 0 && grossLoss <= 0) return null;
  if (grossLoss <= 0) return null;
  return round(grossProfit / grossLoss, 2);
}

function toInstrumentRows(statsByInstrument: Map<string, AggregateStats>): InstrumentRow[] {
  return [...statsByInstrument.entries()]
    .map(([symbol, stats]) => ({
      symbol,
      trades: stats.trades,
      winRate: stats.trades > 0 ? round((stats.wins / stats.trades) * 100, 1) : 0,
      pf: sanitizeProfitFactor(stats.grossProfit, stats.grossLoss),
      avgPnl: stats.trades > 0 ? round(stats.totalPnl / stats.trades) : 0,
      totalPnl: round(stats.totalPnl),
      avgHold:
        stats.trades > 0
          ? formatHoldTime(stats.totalHoldSeconds / stats.trades)
          : '0m',
    }))
    .sort((left, right) => right.totalPnl - left.totalPnl);
}

function toStrategyRows(statsByStrategy: Map<string, AggregateStats>): StrategyRow[] {
  return [...statsByStrategy.entries()]
    .map(([strategy, stats]) => ({
      strategy,
      trades: stats.trades,
      winRate: stats.trades > 0 ? round((stats.wins / stats.trades) * 100, 1) : 0,
      pf: sanitizeProfitFactor(stats.grossProfit, stats.grossLoss),
      avgPnl: stats.trades > 0 ? round(stats.totalPnl / stats.trades) : 0,
      totalPnl: round(stats.totalPnl),
    }))
    .sort((left, right) => right.totalPnl - left.totalPnl);
}

function sessionBucketsFromMap(
  sessionMap: Map<string, AggregateStats>,
  sessionRanges: Map<string, Set<string>>,
): SessionBucket[] {
  const buckets: SessionBucket[] = [];

  for (const config of SESSION_CONFIG) {
    const stats = sessionMap.get(config.key);
    if (!stats || stats.trades === 0) continue;
    buckets.push({
      session: config.label,
      range: summarizeSessionRanges(sessionRanges.get(config.key)),
      trades: stats.trades,
      winRate: round((stats.wins / stats.trades) * 100, 1),
      pnl: round(stats.totalPnl),
      avgPnl: round(stats.totalPnl / stats.trades),
      color: config.color,
    });
  }

  return buckets;
}

function weekdayBucketsFromMap(
  statsMap: Map<string, { pnl: number; trades: number; wins: number }>,
): DayBucket[] {
  return WEEKDAY_ORDER.map((day) => {
    const stats = statsMap.get(day) ?? { pnl: 0, trades: 0, wins: 0 };
    return {
      day,
      totalPnl: round(stats.pnl),
      trades: stats.trades,
      winRate: stats.trades > 0 ? round((stats.wins / stats.trades) * 100, 1) : 0,
    };
  });
}

function hourlyBucketsFromMap(
  statsMap: Map<number, { pnl: number; trades: number }>,
): HourBucket[] {
  return Array.from({ length: 24 }, (_, hour) => {
    const stats = statsMap.get(hour) ?? { pnl: 0, trades: 0 };
    return {
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      avgPnl: stats.trades > 0 ? round(stats.pnl / stats.trades) : 0,
      trades: stats.trades,
    };
  });
}

function buildRiskMetrics(
  dailyReturns: number[],
  startingBalance: number,
  finalBalance: number,
  firstTradeAt: Date | null,
  lastTradeAt: Date | null,
  maxDrawdownPercent: number | null,
  maxDrawdownAmount: number,
  totalNetPnl: number,
  rValues: number[],
  ruinThresholdR: number | null,
): RiskMetrics {
  const sharpeStd = standardDeviation(dailyReturns);
  const dailyMean = average(dailyReturns);
  const downsideReturns = dailyReturns.filter((value) => value < 0);
  const downsideDeviation = standardDeviation(downsideReturns);

  const sharpe =
    dailyReturns.length >= 5 && dailyMean != null && sharpeStd != null && sharpeStd > 0
      ? round((dailyMean / sharpeStd) * Math.sqrt(252), 2)
      : null;

  const sortino =
    dailyReturns.length >= 5 &&
    dailyMean != null &&
    downsideDeviation != null &&
    downsideDeviation > 0
      ? round((dailyMean / downsideDeviation) * Math.sqrt(252), 2)
      : null;

  let calmar: number | null = null;
  if (
    firstTradeAt &&
    lastTradeAt &&
    startingBalance > 0 &&
    finalBalance > 0 &&
    maxDrawdownPercent != null &&
    maxDrawdownPercent > 0
  ) {
    const spanDays = Math.max(daysBetween(firstTradeAt, lastTradeAt), 1);
    const cagr = Math.pow(finalBalance / startingBalance, 365 / spanDays) - 1;
    calmar = Number.isFinite(cagr)
      ? round(cagr / (maxDrawdownPercent / 100), 2)
      : null;
  }

  return {
    sharpe,
    sortino,
    calmar,
    recoveryFactor:
      maxDrawdownAmount > 0 ? round(totalNetPnl / maxDrawdownAmount, 2) : null,
    riskOfRuin: monteCarloRiskOfRuin(rValues, ruinThresholdR),
  };
}

export function computeAnalytics(
  trades: AnalyticsTradeInput[],
  options: AnalyticsComputeOptions,
): AnalyticsPayload {
  const orderedTrades = [...trades].sort((left, right) => {
    const leftTime =
      left.exitDate?.getTime() ?? left.entryDate?.getTime() ?? 0;
    const rightTime =
      right.exitDate?.getTime() ?? right.entryDate?.getTime() ?? 0;
    return leftTime - rightTime;
  });

  const equity: EquityPoint[] = [];
  const underwater: EquityPoint[] = [];
  const dailyPnlMap = new Map<string, number>();
  const weekdayMap = new Map<string, { pnl: number; trades: number; wins: number }>();
  const hourlyMap = new Map<number, { pnl: number; trades: number }>();
  const sessionMap = new Map<string, AggregateStats>();
  const sessionRangeLabels = new Map<string, Set<string>>();
  const instrumentMap = new Map<string, AggregateStats>();
  const strategyMap = new Map<string, AggregateStats>();
  const holdEntries: Array<{ seconds: number; pnl: number }> = [];
  const netPnlValues: number[] = [];
  const rValues: number[] = [];
  const rollingRWindow: number[] = [];
  const rollingRMeans: number[] = [];
  const riskFractions: number[] = [];
  const maeMfe: MaeMfePoint[] = [];
  const results: Array<'W' | 'L' | 'B'> = [];

  let winningTrades = 0;
  let losingTrades = 0;
  let breakevenTrades = 0;
  let totalNetPnl = 0;
  let totalGrossPnl = 0;
  let totalCosts = 0;
  let totalR = 0;
  let totalRTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let largestWin = 0;
  let largestLoss = 0;
  let balance = options.startingBalance;
  let peakBalance = options.startingBalance;
  let peakDate: Date | null = orderedTrades[0]?.exitDate ?? orderedTrades[0]?.entryDate ?? null;
  let currentDrawdownStart: Date | null = null;
  let currentDrawdownDeepestAmount = 0;
  let currentDrawdownDeepestPercent: number | null = null;
  let currentDrawdownPeakDate: Date | null = peakDate;
  const drawdownCycles: DrawdownCycle[] = [];
  let athEvents = 0;

  const addAggregate = (
    map: Map<string, AggregateStats>,
    key: string,
    pnl: number,
    isWin: boolean,
    holdSeconds = 0,
  ) => {
    const existing =
      map.get(key) ??
      ({
        trades: 0,
        wins: 0,
        grossProfit: 0,
        grossLoss: 0,
        totalPnl: 0,
        totalHoldSeconds: 0,
      } satisfies AggregateStats);
    existing.trades += 1;
    existing.totalPnl += pnl;
    existing.totalHoldSeconds += holdSeconds;
    if (isWin) {
      existing.wins += 1;
      existing.grossProfit += pnl;
    } else if (pnl < 0) {
      existing.grossLoss += Math.abs(pnl);
    }
    map.set(key, existing);
  };

  for (const trade of orderedTrades) {
    const exitDate = trade.exitDate ?? trade.entryDate;
    const entryDate = trade.entryDate ?? exitDate;
    if (!exitDate || !entryDate) continue;

    const grossPnl = toNumber(trade.pnl);
    const commission = toNumber(trade.commission);
    const swap = toNumber(trade.swap);
    const netPnl = trade.pnlIncludesCosts ? grossPnl : grossPnl + commission + swap;
    const rMultiple = trade.rMultiple != null ? toNumber(trade.rMultiple) : null;
    const totalCost = trade.pnlIncludesCosts ? 0 : commission + swap;
    const holdSeconds = Math.max(0, (exitDate.getTime() - entryDate.getTime()) / 1000);
    const sessionKey = normalizeStoredSession(trade.session) ?? deriveSession(entryDate);
    const sessionRange = buildSessionRangeMap(entryDate).get(
      sessionKey as SessionKey,
    );

    totalGrossPnl += grossPnl;
    totalCosts += totalCost;
    totalNetPnl += netPnl;
    netPnlValues.push(netPnl);

    if (netPnl > 0) {
      winningTrades += 1;
      grossProfit += netPnl;
      largestWin = Math.max(largestWin, netPnl);
      results.push('W');
    } else if (netPnl < 0) {
      losingTrades += 1;
      grossLoss += Math.abs(netPnl);
      largestLoss = Math.max(largestLoss, Math.abs(netPnl));
      results.push('L');
    } else {
      breakevenTrades += 1;
      results.push('B');
    }

    if (rMultiple != null && Number.isFinite(rMultiple) && Math.abs(rMultiple) > 0) {
      rValues.push(rMultiple);
      totalR += rMultiple;
      totalRTrades += 1;
      rollingRWindow.push(rMultiple);
      if (rollingRWindow.length > 10) {
        rollingRWindow.shift();
      }
      if (rollingRWindow.length === 10) {
        const mean = average(rollingRWindow);
        if (mean != null) {
          rollingRMeans.push(mean);
        }
      }

      const equityBeforeTrade = balance;
      if (equityBeforeTrade > 0) {
        const riskAmount = Math.abs(netPnl / rMultiple);
        if (riskAmount > 0) {
          riskFractions.push(riskAmount / equityBeforeTrade);
        }
      }
    }

    if (trade.mae != null && trade.mfe != null) {
      maeMfe.push({
        tradeId: trade.id,
        symbol: trade.symbol,
        mae: Math.abs(trade.mae),
        mfe: Math.abs(trade.mfe),
        result: netPnl >= 0 ? 'win' : 'loss',
      });
    }

    if (trade.stopLoss != null) {
      // coverage only, actual scoring is computed later
    }

    const localExitKey = formatLocalDateKey(exitDate, options.timeZone);
    dailyPnlMap.set(localExitKey, (dailyPnlMap.get(localExitKey) ?? 0) + netPnl);

    const localWeekday = getLocalWeekday(entryDate, options.timeZone);
    if (WEEKDAY_ORDER.includes(localWeekday)) {
      const weekdayStats = weekdayMap.get(localWeekday) ?? {
        pnl: 0,
        trades: 0,
        wins: 0,
      };
      weekdayStats.pnl += netPnl;
      weekdayStats.trades += 1;
      if (netPnl > 0) weekdayStats.wins += 1;
      weekdayMap.set(localWeekday, weekdayStats);
    }

    const localHour = getLocalHour(entryDate, options.timeZone);
    const hourlyStats = hourlyMap.get(localHour) ?? { pnl: 0, trades: 0 };
    hourlyStats.pnl += netPnl;
    hourlyStats.trades += 1;
    hourlyMap.set(localHour, hourlyStats);

    addAggregate(sessionMap, sessionKey, netPnl, netPnl > 0, holdSeconds);
    if (sessionRange) {
      const existingRanges = sessionRangeLabels.get(sessionKey) ?? new Set<string>();
      existingRanges.add(sessionRange);
      sessionRangeLabels.set(sessionKey, existingRanges);
    }
    addAggregate(instrumentMap, trade.symbol, netPnl, netPnl > 0, holdSeconds);
    addAggregate(
      strategyMap,
      trade.playbookName?.trim() || 'Unassigned',
      netPnl,
      netPnl > 0,
      holdSeconds,
    );

    holdEntries.push({ seconds: holdSeconds, pnl: netPnl });

    balance += netPnl;
    if (balance > peakBalance) {
      if (currentDrawdownStart && currentDrawdownPeakDate) {
        drawdownCycles.push({
          start: currentDrawdownPeakDate,
          end: exitDate,
          deepestAmount: currentDrawdownDeepestAmount,
          deepestPercent: currentDrawdownDeepestPercent,
        });
      }
      peakBalance = balance;
      peakDate = exitDate;
      currentDrawdownStart = null;
      currentDrawdownPeakDate = peakDate;
      currentDrawdownDeepestAmount = 0;
      currentDrawdownDeepestPercent = null;
      athEvents += 1;
    } else if (balance < peakBalance && peakDate) {
      const drawdownAmount = peakBalance - balance;
      const drawdownPercent =
        peakBalance > 0 ? (drawdownAmount / peakBalance) * 100 : null;
      if (!currentDrawdownStart) {
        currentDrawdownStart = peakDate;
        currentDrawdownPeakDate = peakDate;
      }
      if (drawdownAmount > currentDrawdownDeepestAmount) {
        currentDrawdownDeepestAmount = drawdownAmount;
        currentDrawdownDeepestPercent = drawdownPercent;
      }
    }

    const drawdownAmount = peakBalance - balance;
    const drawdownPercent =
      peakBalance > 0 ? (drawdownAmount / peakBalance) * 100 : null;
    const point: EquityPoint = {
      date: exitDate.toISOString(),
      label: formatLocalLabel(exitDate, options.timeZone),
      balance: round(balance),
      pnl: round(netPnl),
      cumulativeNetPnl: round(balance - options.startingBalance),
      peak: round(peakBalance),
      drawdownPercent: drawdownPercent == null ? null : round(drawdownPercent, 2),
      drawdownAmount: round(drawdownAmount),
    };
    equity.push(point);
    underwater.push(point);
  }

  const firstTradeAt = orderedTrades[0]?.exitDate ?? orderedTrades[0]?.entryDate ?? null;
  const lastTradeAt =
    orderedTrades[orderedTrades.length - 1]?.exitDate ??
    orderedTrades[orderedTrades.length - 1]?.entryDate ??
    null;

  if (currentDrawdownStart && currentDrawdownPeakDate && lastTradeAt) {
    drawdownCycles.push({
      start: currentDrawdownPeakDate,
      end: lastTradeAt,
      deepestAmount: currentDrawdownDeepestAmount,
      deepestPercent: currentDrawdownDeepestPercent,
    });
  }

  const maxDrawdownAmount =
    drawdownCycles.length > 0
      ? Math.max(...drawdownCycles.map((cycle) => cycle.deepestAmount))
      : 0;
  const maxDrawdownPercentCandidates = drawdownCycles
    .map((cycle) => cycle.deepestPercent)
    .filter((value): value is number => value != null);
  const maxDrawdownPercent =
    maxDrawdownPercentCandidates.length > 0
      ? Math.max(...maxDrawdownPercentCandidates)
      : null;
  const averageDrawdownAmount =
    drawdownCycles.length > 0
      ? round(
          drawdownCycles.reduce((sum, cycle) => sum + cycle.deepestAmount, 0) /
            drawdownCycles.length,
        )
      : null;
  const averageDrawdownPercent =
    maxDrawdownPercentCandidates.length > 0
      ? round(
          maxDrawdownPercentCandidates.reduce((sum, value) => sum + value, 0) /
            maxDrawdownPercentCandidates.length,
        )
      : null;

  const longestDrawdown =
    drawdownCycles.length > 0
      ? drawdownCycles.reduce((longest, cycle) =>
          daysBetween(cycle.start, cycle.end) > daysBetween(longest.start, longest.end)
            ? cycle
            : longest,
        )
      : null;

  const recoveredCycles = drawdownCycles.filter(
    (cycle) => cycle.deepestAmount > 0 && cycle.end.getTime() !== lastTradeAt?.getTime(),
  );
  const averageRecoveryDays =
    recoveredCycles.length > 0
      ? round(
          recoveredCycles.reduce(
            (sum, cycle) => sum + daysBetween(cycle.start, cycle.end),
            0,
          ) / recoveredCycles.length,
          1,
        )
      : null;

  const stopLossCount = orderedTrades.filter((trade) => trade.stopLoss != null).length;
  const rCoverage = orderedTrades.length > 0 ? (rValues.length / orderedTrades.length) * 100 : 0;
  const maeMfeCoverage =
    orderedTrades.length > 0 ? (maeMfe.length / orderedTrades.length) * 100 : 0;
  const sessionCoverage =
    orderedTrades.length > 0
      ? (orderedTrades.filter((trade) => normalizeStoredSession(trade.session) != null).length /
          orderedTrades.length) *
        100
      : 0;
  const playbookCoverage =
    orderedTrades.length > 0
      ? (orderedTrades.filter((trade) => trade.playbookId != null).length /
          orderedTrades.length) *
        100
      : 0;
  const stopLossCoverage =
    orderedTrades.length > 0 ? (stopLossCount / orderedTrades.length) * 100 : 0;
  const riskSampleCoverage =
    orderedTrades.length > 0 ? (riskFractions.length / orderedTrades.length) * 100 : 0;

  const dailyReturns: number[] = [];
  if (firstTradeAt && lastTradeAt) {
    const cursor = new Date(firstTradeAt);
    let rollingBalance = options.startingBalance;
    while (cursor <= lastTradeAt) {
      const key = formatLocalDateKey(cursor, options.timeZone);
      const pnl = dailyPnlMap.get(key) ?? 0;
      if (rollingBalance > 0) {
        dailyReturns.push(pnl / rollingBalance);
      } else {
        dailyReturns.push(0);
      }
      rollingBalance += pnl;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  const ruinThresholdR =
    options.maxLossPercent != null &&
    options.defaultRiskPercent != null &&
    options.defaultRiskPercent > 0
      ? options.maxLossPercent / options.defaultRiskPercent
      : null;

  return {
    meta: {
      accountScope: options.accountScope,
      accountLabel: options.accountLabel,
      startingBalance: round(options.startingBalance),
      tradeCount: orderedTrades.length,
      generatedAt: new Date().toISOString(),
      firstTradeAt: firstTradeAt?.toISOString() ?? null,
      lastTradeAt: lastTradeAt?.toISOString() ?? null,
      timeZone: options.timeZone,
      coverage: {
        rMultiplePercent: round(rCoverage),
        maeMfePercent: round(maeMfeCoverage),
        sessionPercent: round(sessionCoverage),
        playbookPercent: round(playbookCoverage),
        stopLossPercent: round(stopLossCoverage),
        riskSamplePercent: round(riskSampleCoverage),
      },
    },
    summary: {
      totalTrades: orderedTrades.length,
      winningTrades,
      losingTrades,
      breakevenTrades,
      winRate:
        orderedTrades.length > 0 ? round((winningTrades / orderedTrades.length) * 100, 1) : 0,
      totalNetPnl: round(totalNetPnl),
      totalGrossPnl: round(totalGrossPnl),
      totalCosts: round(totalCosts),
      avgNetPnl: orderedTrades.length > 0 ? round(totalNetPnl / orderedTrades.length) : 0,
      avgRMultiple: totalRTrades > 0 ? round(totalR / totalRTrades, 2) : null,
      profitFactor: sanitizeProfitFactor(grossProfit, grossLoss),
      largestWin: round(largestWin),
      largestLoss: round(largestLoss),
      avgWin: winningTrades > 0 ? round(grossProfit / winningTrades) : 0,
      avgLoss: losingTrades > 0 ? round(grossLoss / losingTrades) : 0,
      expectancy:
        orderedTrades.length > 0 ? round(totalNetPnl / orderedTrades.length, 2) : 0,
    },
    risk: buildRiskMetrics(
      dailyReturns,
      options.startingBalance,
      balance,
      firstTradeAt,
      lastTradeAt,
      maxDrawdownPercent,
      maxDrawdownAmount,
      totalNetPnl,
      rValues,
      ruinThresholdR,
    ),
    equity,
    underwater,
    drawdown: {
      maxDrawdownPercent: maxDrawdownPercent == null ? null : round(maxDrawdownPercent, 2),
      maxDrawdownAmount: round(maxDrawdownAmount),
      averageDrawdownPercent,
      averageDrawdownAmount,
      longestDrawdownDays: longestDrawdown
        ? round(daysBetween(longestDrawdown.start, longestDrawdown.end), 1)
        : null,
      longestDrawdownFrom: longestDrawdown?.start.toISOString() ?? null,
      longestDrawdownTo: longestDrawdown?.end.toISOString() ?? null,
      currentFromPeakPercent: underwater.at(-1)?.drawdownPercent ?? null,
      currentFromPeakAmount: underwater.at(-1)?.drawdownAmount ?? 0,
      allTimeHighEvents: athEvents,
      averageRecoveryDays,
    } satisfies DrawdownStats,
    distributions: {
      r: rCoverage >= 50 ? buildRDistribution(rValues) : [],
      pnl: buildPnlDistribution(netPnlValues),
      holdTime: buildHoldBuckets(holdEntries),
    },
    time: {
      session: sessionBucketsFromMap(sessionMap, sessionRangeLabels),
      dayOfWeek: weekdayBucketsFromMap(weekdayMap),
      hourly: hourlyBucketsFromMap(hourlyMap),
    },
    streaks: buildStreakStats(results),
    consistency: computeConsistencyScore(
      orderedTrades.length,
      riskFractions,
      SESSION_CONFIG.map((config) => sessionMap.get(config.key)?.trades ?? 0),
      rollingRMeans,
      stopLossCoverage,
    ),
    maeMfe: maeMfeCoverage >= 30 ? maeMfe : null,
    instruments: toInstrumentRows(instrumentMap),
    strategies: toStrategyRows(strategyMap),
  };
}
