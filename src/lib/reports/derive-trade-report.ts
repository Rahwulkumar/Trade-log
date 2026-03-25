import { getTradeNetPnl } from '@/lib/utils/trade-pnl';

import type {
  ReportBehavioralPatterns,
  ReportBreakdownRow,
  ReportDetailedTradeRow,
  ReportExecutionRisk,
  ReportFilters,
  ReportHoldBucket,
  ReportStyleProfile,
  ReportSummary,
  ReportTagBreakdownRow,
  ReportTimeRow,
  TradeReportSnapshot,
} from '@/lib/reports/types';

type TradeDirection = 'LONG' | 'SHORT';

export interface TradeReportInput {
  id: string;
  symbol: string;
  direction: TradeDirection | string;
  pnl: string | number | null;
  pnlIncludesCosts: boolean | null;
  commission: string | number | null;
  swap: string | number | null;
  rMultiple: string | number | null;
  mae: number | null;
  mfe: number | null;
  entryDate: Date | string | null;
  exitDate: Date | string | null;
  session: string | null;
  playbookId: string | null;
  playbookName: string | null;
  positionSize: string | number | null;
  stopLoss: string | number | null;
  entryPrice: string | number | null;
  conviction: number | null;
  entryRating: string | null;
  exitRating: string | null;
  managementRating: string | null;
  lessonLearned: string | null;
  wouldTakeAgain: boolean | null;
  setupTags: string[] | null;
  mistakeTags: string[] | null;
  notes: string | null;
  feelings: string | null;
  observations: string | null;
}

interface NormalizedTrade {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryDate: Date | null;
  exitDate: Date | null;
  session: string;
  playbookId: string | null;
  playbookName: string;
  grossPnl: number;
  netPnl: number;
  costs: number;
  rMultiple: number | null;
  mae: number | null;
  mfe: number | null;
  holdMinutes: number | null;
  conviction: number | null;
  entryRating: number | null;
  exitRating: number | null;
  managementRating: number | null;
  lessonLearned: string | null;
  wouldTakeAgain: boolean | null;
  setupTags: string[];
  mistakeTags: string[];
  notes: string | null;
  feelings: string | null;
  observations: string | null;
  hasStopLoss: boolean;
}

type AggregateStats = {
  trades: number;
  wins: number;
  totalPnl: number;
  totalR: number;
  rTrades: number;
};

const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const HOLD_BUCKETS = [
  { label: '< 5m', sublabel: 'Scalp burst', test: (minutes: number) => minutes < 5 },
  { label: '5m - 15m', sublabel: 'Fast scalp', test: (minutes: number) => minutes >= 5 && minutes < 15 },
  { label: '15m - 60m', sublabel: 'Intraday reaction', test: (minutes: number) => minutes >= 15 && minutes < 60 },
  { label: '1h - 4h', sublabel: 'Session hold', test: (minutes: number) => minutes >= 60 && minutes < 240 },
  { label: '4h - 1d', sublabel: 'Extended intraday', test: (minutes: number) => minutes >= 240 && minutes < 1440 },
  { label: '> 1d', sublabel: 'Multi-day hold', test: (minutes: number) => minutes >= 1440 },
] as const;

const R_BUCKETS = [
  { label: '< -2R', test: (value: number) => value < -2 },
  { label: '-2R to -1R', test: (value: number) => value >= -2 && value < -1 },
  { label: '-1R to 0R', test: (value: number) => value >= -1 && value < 0 },
  { label: '0R', test: (value: number) => value === 0 },
  { label: '0R to 1R', test: (value: number) => value > 0 && value < 1 },
  { label: '1R to 2R', test: (value: number) => value >= 1 && value < 2 },
  { label: '> 2R', test: (value: number) => value >= 2 },
] as const;

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

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 0) {
    return (ordered[middle - 1] + ordered[middle]) / 2;
  }
  return ordered[middle];
}

function percentage(part: number, total: number): number {
  if (!total) return 0;
  return round((part / total) * 100, 2);
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeTags(tags: string[] | null | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags
    .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
    .filter(Boolean))];
}

function normalizeDirection(value: string): 'LONG' | 'SHORT' {
  return value?.toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG';
}

function isLocalSessionOpen(
  date: Date,
  timeZone: string,
  startHour: number,
  endHour: number,
): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = Number.parseInt(
    parts.find((part) => part.type === 'hour')?.value ?? '0',
    10,
  ) % 24;
  return hour >= startHour && hour < endHour;
}

function normalizeSession(value: string | null, entryDate: Date | null): string {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'asian' || normalized === 'asia') return 'Asia';
  if (normalized === 'london') return 'London';
  if (normalized === 'new york' || normalized === 'newyork') return 'New York';
  if (normalized === 'overlap' || normalized === 'london/new york overlap') {
    return 'Overlap';
  }
  if (!entryDate) return 'Unknown';

  const londonOpen = isLocalSessionOpen(
    entryDate,
    LONDON_MARKET_HOURS.timeZone,
    LONDON_MARKET_HOURS.startHour,
    LONDON_MARKET_HOURS.endHour,
  );
  const newYorkOpen = isLocalSessionOpen(
    entryDate,
    NEW_YORK_MARKET_HOURS.timeZone,
    NEW_YORK_MARKET_HOURS.startHour,
    NEW_YORK_MARKET_HOURS.endHour,
  );

  if (londonOpen && newYorkOpen) return 'Overlap';
  if (londonOpen) return 'London';
  if (newYorkOpen) return 'New York';
  return entryDate.getUTCHours() < 7 ? 'Asia' : 'Off Session';
}

function parseRating(value: string | null | undefined): number | null {
  if (!value) return null;
  const normalized = value.trim();
  if (normalized === 'Good') return 5;
  if (normalized === 'Neutral') return 3;
  if (normalized === 'Poor') return 1;

  const parsed = Number.parseInt(normalized, 10);
  if (parsed >= 1 && parsed <= 5) {
    return parsed;
  }
  return null;
}

function normalizeLesson(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeTrade(row: TradeReportInput): NormalizedTrade {
  const entryDate = toDate(row.entryDate);
  const exitDate = toDate(row.exitDate);
  const rawPnl = toNumber(row.pnl);
  const commission = toNumber(row.commission);
  const swap = toNumber(row.swap);
  const netPnl = getTradeNetPnl({
    pnl: row.pnl,
    commission: row.commission,
    swap: row.swap,
    pnlIncludesCosts: row.pnlIncludesCosts,
  });
  const grossPnl =
    row.pnlIncludesCosts === false ? rawPnl : rawPnl - commission - swap;
  const holdMinutes =
    entryDate && exitDate
      ? Math.max(0, (exitDate.getTime() - entryDate.getTime()) / 60000)
      : null;

  return {
    id: row.id,
    symbol: row.symbol,
    direction: normalizeDirection(row.direction),
    entryDate,
    exitDate,
    session: normalizeSession(row.session, entryDate),
    playbookId: row.playbookId ?? null,
    playbookName: row.playbookName?.trim() || 'No Playbook',
    grossPnl: round(grossPnl, 2),
    netPnl: round(netPnl, 2),
    costs: round(Math.max(grossPnl - netPnl, 0), 2),
    rMultiple:
      row.rMultiple != null && Number.isFinite(toNumber(row.rMultiple))
        ? round(toNumber(row.rMultiple), 2)
        : null,
    mae: row.mae != null && Number.isFinite(row.mae) ? round(row.mae, 2) : null,
    mfe: row.mfe != null && Number.isFinite(row.mfe) ? round(row.mfe, 2) : null,
    holdMinutes: holdMinutes != null ? round(holdMinutes, 1) : null,
    conviction:
      row.conviction != null && Number.isFinite(row.conviction)
        ? row.conviction
        : null,
    entryRating: parseRating(row.entryRating),
    exitRating: parseRating(row.exitRating),
    managementRating: parseRating(row.managementRating),
    lessonLearned: normalizeLesson(row.lessonLearned),
    wouldTakeAgain: row.wouldTakeAgain ?? null,
    setupTags: normalizeTags(row.setupTags),
    mistakeTags: normalizeTags(row.mistakeTags),
    notes: normalizeLesson(row.notes),
    feelings: normalizeLesson(row.feelings),
    observations: normalizeLesson(row.observations),
    hasStopLoss: row.stopLoss != null && Math.abs(toNumber(row.stopLoss)) > 0,
  };
}

function sortBreakdownRows(rows: ReportBreakdownRow[]): ReportBreakdownRow[] {
  return rows.sort((left, right) => {
    if (right.pnl !== left.pnl) return right.pnl - left.pnl;
    if (right.trades !== left.trades) return right.trades - left.trades;
    return left.label.localeCompare(right.label);
  });
}

function buildBreakdownRows(
  trades: NormalizedTrade[],
  getLabel: (trade: NormalizedTrade) => string,
): ReportBreakdownRow[] {
  const groups = new Map<string, AggregateStats>();

  for (const trade of trades) {
    const label = getLabel(trade);
    const existing = groups.get(label) ?? {
      trades: 0,
      wins: 0,
      totalPnl: 0,
      totalR: 0,
      rTrades: 0,
    };
    existing.trades += 1;
    existing.totalPnl += trade.netPnl;
    if (trade.netPnl > 0) {
      existing.wins += 1;
    }
    if (trade.rMultiple != null) {
      existing.totalR += trade.rMultiple;
      existing.rTrades += 1;
    }
    groups.set(label, existing);
  }

  return sortBreakdownRows(
    [...groups.entries()].map(([label, stats]) => ({
      label,
      trades: stats.trades,
      share: percentage(stats.trades, trades.length),
      winRate: percentage(stats.wins, stats.trades),
      pnl: round(stats.totalPnl, 2),
      avgPnl: round(stats.totalPnl / stats.trades, 2),
      avgRMultiple:
        stats.rTrades > 0 ? round(stats.totalR / stats.rTrades, 2) : null,
    })),
  );
}

function buildTagRows(
  trades: NormalizedTrade[],
  selectTags: (trade: NormalizedTrade) => string[],
): ReportTagBreakdownRow[] {
  const groups = new Map<
    string,
    {
      count: number;
      wins: number;
      pnl: number;
    }
  >();

  for (const trade of trades) {
    for (const tag of selectTags(trade)) {
      const existing = groups.get(tag) ?? { count: 0, wins: 0, pnl: 0 };
      existing.count += 1;
      if (trade.netPnl > 0) {
        existing.wins += 1;
      }
      existing.pnl += trade.netPnl;
      groups.set(tag, existing);
    }
  }

  return [...groups.entries()]
    .map(([tag, stats]) => ({
      tag,
      count: stats.count,
      share: percentage(stats.count, trades.length),
      winRate: percentage(stats.wins, stats.count),
      pnl: round(stats.pnl, 2),
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      if (right.pnl !== left.pnl) return right.pnl - left.pnl;
      return left.tag.localeCompare(right.tag);
    });
}

function buildWeekdayRows(trades: NormalizedTrade[]): ReportTimeRow[] {
  const groups = new Map<
    string,
    { trades: number; wins: number; pnl: number; holdMinutes: number[] }
  >();

  for (const trade of trades) {
    const entryDate = trade.entryDate ?? trade.exitDate;
    if (!entryDate) continue;
    const label = WEEKDAY_LABELS[entryDate.getUTCDay()];
    const existing = groups.get(label) ?? {
      trades: 0,
      wins: 0,
      pnl: 0,
      holdMinutes: [],
    };
    existing.trades += 1;
    if (trade.netPnl > 0) existing.wins += 1;
    existing.pnl += trade.netPnl;
    if (trade.holdMinutes != null) existing.holdMinutes.push(trade.holdMinutes);
    groups.set(label, existing);
  }

  return WEEKDAY_LABELS.map((label) => {
    const stats = groups.get(label);
    if (!stats) {
      return {
        label,
        trades: 0,
        share: 0,
        winRate: 0,
        pnl: 0,
        avgPnl: 0,
        avgHoldMinutes: null,
      };
    }
    return {
      label,
      trades: stats.trades,
      share: percentage(stats.trades, trades.length),
      winRate: percentage(stats.wins, stats.trades),
      pnl: round(stats.pnl, 2),
      avgPnl: round(stats.pnl / stats.trades, 2),
      avgHoldMinutes: average(stats.holdMinutes),
    };
  });
}

function buildHourRows(trades: NormalizedTrade[]): ReportTimeRow[] {
  const groups = new Map<
    number,
    { trades: number; wins: number; pnl: number; holdMinutes: number[] }
  >();

  for (const trade of trades) {
    const entryDate = trade.entryDate ?? trade.exitDate;
    if (!entryDate) continue;
    const hour = entryDate.getUTCHours();
    const existing = groups.get(hour) ?? {
      trades: 0,
      wins: 0,
      pnl: 0,
      holdMinutes: [],
    };
    existing.trades += 1;
    if (trade.netPnl > 0) existing.wins += 1;
    existing.pnl += trade.netPnl;
    if (trade.holdMinutes != null) existing.holdMinutes.push(trade.holdMinutes);
    groups.set(hour, existing);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([hour, stats]) => ({
      label: `${String(hour).padStart(2, '0')}:00 UTC`,
      trades: stats.trades,
      share: percentage(stats.trades, trades.length),
      winRate: percentage(stats.wins, stats.trades),
      pnl: round(stats.pnl, 2),
      avgPnl: round(stats.pnl / stats.trades, 2),
      avgHoldMinutes: average(stats.holdMinutes),
    }));
}

function buildHoldBuckets(trades: NormalizedTrade[]): ReportHoldBucket[] {
  return HOLD_BUCKETS.map((bucket) => {
    const matched = trades.filter(
      (trade) => trade.holdMinutes != null && bucket.test(trade.holdMinutes),
    );
    const rValues = matched
      .map((trade) => trade.rMultiple)
      .filter((value): value is number => value != null);
    const totalPnl = matched.reduce((sum, trade) => sum + trade.netPnl, 0);
    return {
      label: bucket.label,
      sublabel: bucket.sublabel,
      trades: matched.length,
      share: percentage(matched.length, trades.length),
      avgPnl: matched.length ? round(totalPnl / matched.length, 2) : 0,
      avgRMultiple:
        rValues.length > 0
          ? round(
              rValues.reduce((sum, value) => sum + value, 0) / rValues.length,
              2,
            )
          : null,
    };
  });
}

function buildExecutionRisk(trades: NormalizedTrade[]): ReportExecutionRisk {
  const avgMae = average(
    trades.map((trade) => trade.mae).filter((value): value is number => value != null),
  );
  const avgMfe = average(
    trades.map((trade) => trade.mfe).filter((value): value is number => value != null),
  );
  const winners = trades.filter((trade) => trade.netPnl > 0);
  const losers = trades.filter((trade) => trade.netPnl < 0);

  const entryRatings = trades
    .map((trade) => trade.entryRating)
    .filter((value): value is number => value != null);
  const exitRatings = trades
    .map((trade) => trade.exitRating)
    .filter((value): value is number => value != null);
  const managementRatings = trades
    .map((trade) => trade.managementRating)
    .filter((value): value is number => value != null);
  const convictions = trades
    .map((trade) => trade.conviction)
    .filter((value): value is number => value != null);

  const wouldTakeAgainCount = trades.filter(
    (trade) => trade.wouldTakeAgain === true,
  ).length;
  const explicitRetakeVotes = trades.filter(
    (trade) => trade.wouldTakeAgain !== null,
  ).length;

  const noStopLossTrades = trades.filter((trade) => !trade.hasStopLoss).length;
  const rValues = trades
    .map((trade) => trade.rMultiple)
    .filter((value): value is number => value != null);

  return {
    avgMae: avgMae != null ? round(avgMae, 2) : null,
    avgMfe: avgMfe != null ? round(avgMfe, 2) : null,
    avgWinnerMae: average(
      winners.map((trade) => trade.mae).filter((value): value is number => value != null),
    ),
    avgWinnerMfe: average(
      winners.map((trade) => trade.mfe).filter((value): value is number => value != null),
    ),
    avgLoserMae: average(
      losers.map((trade) => trade.mae).filter((value): value is number => value != null),
    ),
    avgLoserMfe: average(
      losers.map((trade) => trade.mfe).filter((value): value is number => value != null),
    ),
    avgEntryRating:
      entryRatings.length > 0
        ? round(
            entryRatings.reduce((sum, value) => sum + value, 0) /
              entryRatings.length,
            2,
          )
        : null,
    avgExitRating:
      exitRatings.length > 0
        ? round(
            exitRatings.reduce((sum, value) => sum + value, 0) /
              exitRatings.length,
            2,
          )
        : null,
    avgManagementRating:
      managementRatings.length > 0
        ? round(
            managementRatings.reduce((sum, value) => sum + value, 0) /
              managementRatings.length,
            2,
          )
        : null,
    avgConviction:
      convictions.length > 0
        ? round(
            convictions.reduce((sum, value) => sum + value, 0) /
              convictions.length,
            2,
          )
        : null,
    wouldTakeAgainPercent:
      explicitRetakeVotes > 0 ? percentage(wouldTakeAgainCount, explicitRetakeVotes) : null,
    noStopLossPercent: percentage(noStopLossTrades, trades.length),
    rDistribution: R_BUCKETS.map((bucket) => {
      const count = rValues.filter((value) => bucket.test(value)).length;
      return {
        label: bucket.label,
        count,
        share: percentage(count, rValues.length),
      };
    }),
    convictionDistribution: Array.from({ length: 5 }, (_, index) => {
      const value = index + 1;
      const count = convictions.filter((conviction) => conviction === value).length;
      return {
        label: `${value}/5`,
        count,
        share: percentage(count, convictions.length),
      };
    }),
  };
}

function buildBehavioralPatterns(
  trades: NormalizedTrade[],
  sessions: ReportBreakdownRow[],
): ReportBehavioralPatterns {
  const repeatedLessons = [...new Map(
    trades
      .map((trade) => trade.lessonLearned)
      .filter((value): value is string => !!value)
      .map((value) => [value.toLowerCase(), value]),
  ).values()]
    .map((label) => ({
      label,
      count: trades.filter(
        (trade) => trade.lessonLearned?.toLowerCase() === label.toLowerCase(),
      ).length,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);

  const highConvictionTrades = trades.filter(
    (trade) => (trade.conviction ?? 0) >= 4,
  );
  const lowConvictionTrades = trades.filter(
    (trade) => (trade.conviction ?? 0) > 0 && (trade.conviction ?? 0) <= 2,
  );
  const highRatedTrades = trades.filter(
    (trade) =>
      (trade.entryRating ?? 0) >= 4 && (trade.managementRating ?? 0) >= 4,
  );
  const weakManagementTrades = trades.filter(
    (trade) => (trade.managementRating ?? 5) <= 2,
  );

  return {
    repeatedLessons,
    commonSetupTags: buildTagRows(trades, (trade) => trade.setupTags).slice(0, 10),
    commonMistakeTags: buildTagRows(trades, (trade) => trade.mistakeTags).slice(0, 10),
    bestSession: sessions.find((row) => row.trades > 0) ?? null,
    weakestSession:
      [...sessions]
        .filter((row) => row.trades > 0)
        .sort((left, right) => left.pnl - right.pnl)[0] ?? null,
    highConvictionLossRate:
      highConvictionTrades.length > 0
        ? percentage(
            highConvictionTrades.filter((trade) => trade.netPnl < 0).length,
            highConvictionTrades.length,
          )
        : null,
    lowConvictionLossRate:
      lowConvictionTrades.length > 0
        ? percentage(
            lowConvictionTrades.filter((trade) => trade.netPnl < 0).length,
            lowConvictionTrades.length,
          )
        : null,
    highRatedTradeWinRate:
      highRatedTrades.length > 0
        ? percentage(
            highRatedTrades.filter((trade) => trade.netPnl > 0).length,
            highRatedTrades.length,
          )
        : null,
    weakManagementTradeLossRate:
      weakManagementTrades.length > 0
        ? percentage(
            weakManagementTrades.filter((trade) => trade.netPnl < 0).length,
            weakManagementTrades.length,
          )
        : null,
  };
}

function buildStyleProfile(
  trades: NormalizedTrade[],
  summary: ReportSummary,
  sessions: ReportBreakdownRow[],
  playbooks: ReportBreakdownRow[],
  executionRisk: ReportExecutionRisk,
  behavioral: ReportBehavioralPatterns,
): ReportStyleProfile {
  const medianHoldMinutes = summary.medianHoldMinutes ?? 0;
  const holdingStyle =
    medianHoldMinutes < 15
      ? 'Scalp-heavy'
      : medianHoldMinutes < 240
        ? 'Intraday session trader'
        : medianHoldMinutes < 1440
          ? 'Extended intraday trader'
          : 'Multi-day holder';

  const strongestSession = sessions.find((row) => row.trades > 0) ?? null;
  const dominantSession =
    [...sessions]
      .filter((row) => row.trades > 0)
      .sort((left, right) => right.share - left.share || right.trades - left.trades)[0] ??
    strongestSession;
  const strongestPlaybook = playbooks.find((row) => row.trades > 0) ?? null;
  const dominantPlaybook =
    [...playbooks]
      .filter((row) => row.trades > 0)
      .sort((left, right) => right.share - left.share || right.trades - left.trades)[0] ??
    strongestPlaybook;
  const longTrades = trades.filter((trade) => trade.direction === 'LONG').length;
  const shortTrades = trades.filter((trade) => trade.direction === 'SHORT').length;
  const directionBias =
    percentage(longTrades, trades.length) >= 65
      ? 'Long-biased'
      : percentage(shortTrades, trades.length) >= 65
        ? 'Short-biased'
        : 'Balanced';

  const playbookDependence =
    dominantPlaybook && dominantPlaybook.share >= 60
      ? `${dominantPlaybook.label}-dependent (${dominantPlaybook.share}% of trades)`
      : 'Spread across multiple playbooks';

  const avgExecutionScore =
    average(
      [
        executionRisk.avgEntryRating,
        executionRisk.avgExitRating,
        executionRisk.avgManagementRating,
      ].filter((value): value is number => value != null),
    ) ?? 0;

  const executionDiscipline =
    avgExecutionScore >= 4
      ? 'Disciplined'
      : avgExecutionScore >= 3
        ? 'Mixed discipline'
        : 'Needs tighter execution structure';

  const riskBehavior =
    executionRisk.noStopLossPercent <= 10
      ? 'Protective stops are usually present'
      : executionRisk.noStopLossPercent <= 30
        ? 'Stops are inconsistent'
        : 'Risk protection is frequently missing';

  const primaryStyle = `${holdingStyle} with ${dominantSession?.label ?? 'mixed-session'} participation`;

  const secondaryTraits = [
    directionBias,
    playbookDependence,
    dominantSession ? `${dominantSession.label} carries ${dominantSession.share}% of activity` : null,
    executionRisk.avgConviction != null
      ? `Average conviction ${executionRisk.avgConviction}/5`
      : null,
  ].filter((value): value is string => !!value);

  const strengths = [
    strongestSession && strongestSession.pnl > 0 ? `${strongestSession.label} is your strongest session by net P&L.` : null,
    strongestPlaybook && strongestPlaybook.pnl > 0 ? `${strongestPlaybook.label} is the clearest repeatable playbook edge.` : null,
    summary.profitFactor != null && summary.profitFactor >= 1.4
      ? 'Profit factor is holding above 1.4, which points to positive trade selection.'
      : null,
    executionRisk.avgEntryRating != null && executionRisk.avgEntryRating >= 4
      ? 'Entry quality is generally strong.'
      : null,
  ].filter((value): value is string => !!value);

  const weaknesses = [
    behavioral.weakestSession ? `${behavioral.weakestSession.label} is the weakest session by outcome.` : null,
    behavioral.commonMistakeTags[0]
      ? `Most repeated mistake tag: ${behavioral.commonMistakeTags[0].tag}.`
      : null,
    executionRisk.avgManagementRating != null && executionRisk.avgManagementRating < 3
      ? 'Management scores are lagging the rest of the execution stack.'
      : null,
    behavioral.highConvictionLossRate != null &&
    behavioral.lowConvictionLossRate != null &&
    behavioral.highConvictionLossRate >= behavioral.lowConvictionLossRate
      ? 'Higher conviction is not translating into better outcomes.'
      : null,
  ].filter((value): value is string => !!value);

  const repeatPatterns = [
    dominantSession ? `${dominantSession.label} accounts for ${dominantSession.share}% of all trades.` : null,
    dominantPlaybook ? `${dominantPlaybook.label} accounts for ${dominantPlaybook.share}% of trade volume.` : null,
    behavioral.commonSetupTags[0]
      ? `Top setup tag: ${behavioral.commonSetupTags[0].tag}.`
      : null,
    behavioral.commonMistakeTags[0]
      ? `Top mistake tag: ${behavioral.commonMistakeTags[0].tag}.`
      : null,
  ].filter((value): value is string => !!value);

  const feedback = [
    strongestSession && behavioral.weakestSession && strongestSession.label !== behavioral.weakestSession.label
      ? `Lean harder into ${strongestSession.label} and cut back participation in ${behavioral.weakestSession.label}.`
      : 'Concentrate more heavily on the sessions producing the cleanest edge.',
    strongestPlaybook && dominantPlaybook && dominantPlaybook.share < 40
      ? 'Your playbook edge is scattered. Narrow the trade set to the best-performing setups.'
      : `Keep refining ${strongestPlaybook?.label ?? 'your core playbook'} before expanding into lower-conviction setups.`,
    executionRisk.noStopLossPercent > 20
      ? 'Add explicit stop placement to more trades so downside is consistently defined.'
      : 'Keep risk definitions explicit and consistent on every trade.',
    behavioral.commonMistakeTags[0]
      ? `Build a pre-trade check specifically aimed at reducing ${behavioral.commonMistakeTags[0].tag}.`
      : 'Use the repeated lessons and notes to tighten pre-trade filters.',
  ];

  return {
    primaryStyle,
    holdingStyle,
    sessionBias: dominantSession?.label ?? null,
    directionBias,
    playbookDependence,
    executionDiscipline,
    riskBehavior,
    secondaryTraits,
    repeatPatterns,
    strengths,
    weaknesses,
    feedback,
  };
}

function buildDetailedTradeRows(trades: NormalizedTrade[]): ReportDetailedTradeRow[] {
  return [...trades]
    .sort((left, right) => {
      const leftTime = left.exitDate?.getTime() ?? 0;
      const rightTime = right.exitDate?.getTime() ?? 0;
      return rightTime - leftTime;
    })
    .map((trade) => ({
      id: trade.id,
      closedAt: trade.exitDate?.toISOString() ?? null,
      symbol: trade.symbol,
      direction: trade.direction,
      session: trade.session,
      playbook: trade.playbookName,
      pnl: round(trade.netPnl, 2),
      rMultiple: trade.rMultiple,
      mae: trade.mae,
      mfe: trade.mfe,
      holdMinutes: trade.holdMinutes,
      conviction: trade.conviction,
      entryRating: trade.entryRating,
      exitRating: trade.exitRating,
      managementRating: trade.managementRating,
      setupTags: trade.setupTags,
      mistakeTags: trade.mistakeTags,
      lessonLearned: trade.lessonLearned,
      wouldTakeAgain: trade.wouldTakeAgain,
    }));
}

function createDefaultTitle(filters: ReportFilters): string {
  const typeLabel =
    filters.reportType === 'playbook'
      ? 'Playbook Analysis'
      : filters.reportType === 'risk'
        ? 'Risk Report'
        : 'Performance Report';

  if (filters.from && filters.to) {
    return `${typeLabel} | ${filters.from} -> ${filters.to}`;
  }
  return typeLabel;
}

export function deriveTradeReportSnapshot(
  tradesInput: TradeReportInput[],
  filters: ReportFilters,
): TradeReportSnapshot {
  const trades = tradesInput.map(normalizeTrade);
  const selectedTradeIds = trades.map((trade) => trade.id);

  const winners = trades.filter((trade) => trade.netPnl > 0);
  const losers = trades.filter((trade) => trade.netPnl < 0);
  const breakevenTrades = trades.length - winners.length - losers.length;
  const totalNetPnl = trades.reduce((sum, trade) => sum + trade.netPnl, 0);
  const totalGrossPnl = trades.reduce((sum, trade) => sum + trade.grossPnl, 0);
  const totalCosts = trades.reduce((sum, trade) => sum + trade.costs, 0);
  const rValues = trades
    .map((trade) => trade.rMultiple)
    .filter((value): value is number => value != null);
  const holdMinutes = trades
    .map((trade) => trade.holdMinutes)
    .filter((value): value is number => value != null);

  const summary: ReportSummary = {
    totalTrades: trades.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    breakevenTrades,
    winRate: percentage(winners.length, trades.length),
    totalNetPnl: round(totalNetPnl, 2),
    totalGrossPnl: round(totalGrossPnl, 2),
    totalCosts: round(totalCosts, 2),
    avgNetPnl: trades.length ? round(totalNetPnl / trades.length, 2) : 0,
    avgWin: winners.length
      ? round(winners.reduce((sum, trade) => sum + trade.netPnl, 0) / winners.length, 2)
      : 0,
    avgLoss: losers.length
      ? round(losers.reduce((sum, trade) => sum + trade.netPnl, 0) / losers.length, 2)
      : 0,
    expectancy: trades.length ? round(totalNetPnl / trades.length, 2) : 0,
    avgRMultiple:
      rValues.length > 0
        ? round(rValues.reduce((sum, value) => sum + value, 0) / rValues.length, 2)
        : null,
    profitFactor:
      losers.length > 0
        ? round(
            winners.reduce((sum, trade) => sum + trade.netPnl, 0) /
              Math.abs(losers.reduce((sum, trade) => sum + trade.netPnl, 0)),
            2,
          )
        : winners.length > 0
          ? null
          : 0,
    largestWin: winners.length ? round(Math.max(...winners.map((trade) => trade.netPnl)), 2) : 0,
    largestLoss: losers.length ? round(Math.min(...losers.map((trade) => trade.netPnl)), 2) : 0,
    avgHoldMinutes:
      holdMinutes.length > 0
        ? round(holdMinutes.reduce((sum, value) => sum + value, 0) / holdMinutes.length, 2)
        : null,
    medianHoldMinutes: holdMinutes.length ? round(median(holdMinutes) ?? 0, 2) : null,
    stopCoveragePercent: percentage(
      trades.filter((trade) => trade.hasStopLoss).length,
      trades.length,
    ),
  };

  const symbols = buildBreakdownRows(trades, (trade) => trade.symbol);
  const directions = buildBreakdownRows(trades, (trade) => trade.direction);
  const sessions = buildBreakdownRows(trades, (trade) => trade.session);
  const playbooks = buildBreakdownRows(trades, (trade) => trade.playbookName);
  const executionRisk = buildExecutionRisk(trades);
  const behavioral = buildBehavioralPatterns(trades, sessions);
  const styleProfile = buildStyleProfile(
    trades,
    summary,
    sessions,
    playbooks,
    executionRisk,
    behavioral,
  );

  return {
    title: filters.title?.trim() || createDefaultTitle(filters),
    reportType: filters.reportType,
    generatedAt: new Date().toISOString(),
    filters,
    selectedTradeIds,
    summary,
    styleProfile,
    distributions: {
      symbols: symbols.slice(0, 12),
      directions,
      sessions,
      playbooks: playbooks.slice(0, 12),
      setupTags: buildTagRows(trades, (trade) => trade.setupTags).slice(0, 12),
      mistakeTags: buildTagRows(trades, (trade) => trade.mistakeTags).slice(0, 12),
    },
    timing: {
      weekdays: buildWeekdayRows(trades),
      hours: buildHourRows(trades),
      holdBuckets: buildHoldBuckets(trades),
    },
    executionRisk,
    behavioral,
    detailedTrades: buildDetailedTradeRows(trades),
    aiCommentary: null,
    aiError: null,
  };
}
