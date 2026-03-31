import { isTradeJournaled, mapTradeToViewModel } from "@/domain/journal-mapper";
import type { Trade } from "@/lib/db/schema";
import { getTradeNetPnl } from "@/lib/utils/trade-pnl";

export type CalendarDateMode = "entry" | "exit";

export interface CalendarReviewPlan {
  id: string;
  date: string;
  bias: string | null;
  playbookId: string | null;
  playbookName: string | null;
  playbookRules: string[];
  maxTrades: number | null;
  dailyLimit: number | null;
  universalRulesChecked: string[];
  strategyRulesChecked: string[];
  preNote: string | null;
  dayGrade: string | null;
  wentWell: string | null;
  wentWrong: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarReviewTrade {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  status: "OPEN" | "CLOSED";
  pnl: number;
  rMultiple: number | null;
  entryTime: string;
  exitTime: string | null;
  session: string;
  reviewed: boolean;
  screenshotsCount: number;
  setupDefinitionId: string | null;
  setupName: string | null;
  journalTemplateId: string | null;
  journalTemplateName: string | null;
  ruleSetId: string | null;
  ruleSetName: string | null;
  brokenRules: number;
  followedRules: number;
  skippedRules: number;
  notApplicableRules: number;
  mistakeCount: number;
  brokenRuleTitles: string[];
}

export interface CalendarReviewDay {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  dailyPlan: CalendarReviewPlan | null;
  trades: CalendarReviewTrade[];
  totalPnl: number;
  tradesCount: number;
  winningTrades: number;
  losingTrades: number;
  reviewableTrades: number;
  reviewedTrades: number;
  needsReviewTrades: number;
  screenshotCount: number;
  setupAssignedTrades: number;
  templateAssignedTrades: number;
  mistakeTaggedTrades: number;
  brokenRules: number;
  followedRules: number;
  skippedRules: number;
  notApplicableRules: number;
  sessionsUsed: string[];
  setupsUsed: string[];
  templatesUsed: string[];
  ruleSetsUsed: string[];
  brokenRuleTitles: string[];
  globalRulesTracked: string[];
  dailyRulesTracked: string[];
  violatedGlobalRules: string[];
  violatedDailyRules: string[];
  planViolationLabels: string[];
  maxTradesViolated: boolean;
  dailyLimitViolated: boolean;
  flaggedViolationsCount: number;
}

export interface CalendarReviewMonthSummary {
  totalPnl: number;
  totalTrades: number;
  activeTradingDays: number;
  winningDays: number;
  losingDays: number;
  reviewableTrades: number;
  reviewedTrades: number;
  needsReviewTrades: number;
  reviewedPercent: number;
  plannedDays: number;
  gradedDays: number;
  screenshotDays: number;
  setupAssignedTrades: number;
  templateAssignedTrades: number;
  mistakeTaggedTrades: number;
  brokenRules: number;
  followedRules: number;
  skippedRules: number;
  notApplicableRules: number;
  ruleAdherencePercent: number;
  reviewGapDays: number;
  flaggedViolationDays: number;
  violatedGlobalRules: number;
  violatedDailyRules: number;
  bestDay: CalendarReviewDay | null;
  worstDay: CalendarReviewDay | null;
}

export interface CalendarDateTools {
  formatDateKey: (date: Date) => string;
  formatYearMonthKey: (date: Date) => string;
  formatMonthLabel: (date: Date) => string;
  formatDayNumber: (date: Date) => string;
  formatDayShortLabel: (date: Date) => string;
  formatLongDate: (date: Date) => string;
  formatTime: (date: Date) => string;
  isToday: (date: Date) => boolean;
}

type BuildCalendarReviewMonthOptions = {
  currentMonthKey: string;
  trades: Trade[];
  dailyPlans: CalendarReviewPlan[];
  setupNames: Map<string, string>;
  templateNames: Map<string, string>;
  ruleSetNames: Map<string, string>;
  timeZone: string;
  dateMode: CalendarDateMode;
  globalRules: string[];
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function createUtcDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseMonthKey(monthKey: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  return { year, monthIndex };
}

function formatMonthKey(year: number, monthIndex: number) {
  const safeDate = createUtcDate(year, monthIndex, 15);
  return `${safeDate.getUTCFullYear()}-${pad(safeDate.getUTCMonth() + 1)}`;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildDateKeyFromParts(parts: Intl.DateTimeFormatPart[]) {
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function dedupe(values: Array<string | null | undefined>) {
  return values.filter(
    (value, index, array): value is string =>
      typeof value === "string" &&
      value.trim().length > 0 &&
      array.indexOf(value) === index,
  );
}

function normalizeRuleLabel(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function collectMatchingRules(
  rules: string[],
  brokenRuleLookup: Set<string>,
) {
  return dedupe(
    rules.filter((rule) => brokenRuleLookup.has(normalizeRuleLabel(rule))),
  );
}

export function createCalendarDateTools(timeZone: string): CalendarDateTools {
  const dateKeyFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const monthLabelFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    year: "numeric",
  });
  const dayNumberFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    day: "numeric",
  });
  const dayShortFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  });
  const longDateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const todayKey = buildDateKeyFromParts(dateKeyFormatter.formatToParts(new Date()));

  const formatDateKey = (date: Date) =>
    buildDateKeyFromParts(dateKeyFormatter.formatToParts(date));

  return {
    formatDateKey,
    formatYearMonthKey(date) {
      return formatDateKey(date).slice(0, 7);
    },
    formatMonthLabel(date) {
      return monthLabelFormatter.format(date);
    },
    formatDayNumber(date) {
      return dayNumberFormatter.format(date);
    },
    formatDayShortLabel(date) {
      return dayShortFormatter.format(date);
    },
    formatLongDate(date) {
      return longDateFormatter.format(date);
    },
    formatTime(date) {
      return timeFormatter.format(date);
    },
    isToday(date) {
      return formatDateKey(date) === todayKey;
    },
  };
}

export function getCurrentCalendarMonthKey(timeZone: string) {
  return createCalendarDateTools(timeZone).formatDateKey(new Date()).slice(0, 7);
}

export function shiftCalendarMonthKey(monthKey: string, amount: number) {
  const { year, monthIndex } = parseMonthKey(monthKey);
  return formatMonthKey(year, monthIndex + amount);
}

export function getCalendarMonthLabel(monthKey: string, timeZone: string) {
  const { year, monthIndex } = parseMonthKey(monthKey);
  return createCalendarDateTools(timeZone).formatMonthLabel(
    createUtcDate(year, monthIndex, 15),
  );
}

export function getCalendarMonthQueryRange(monthKey: string) {
  const { year, monthIndex } = parseMonthKey(monthKey);
  const monthStart = createUtcDate(year, monthIndex, 1);
  const monthEnd = createUtcDate(year, monthIndex + 1, 0);

  return {
    from: `${monthStart.getUTCFullYear()}-${pad(monthStart.getUTCMonth() + 1)}-${pad(monthStart.getUTCDate())}`,
    to: `${monthEnd.getUTCFullYear()}-${pad(monthEnd.getUTCMonth() + 1)}-${pad(monthEnd.getUTCDate())}`,
    fetchFrom: (() => {
      const date = addUtcDays(monthStart, -1);
      return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    })(),
    fetchTo: (() => {
      const date = addUtcDays(monthEnd, 1);
      return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    })(),
  };
}

export function getCalendarGridDays(monthKey: string) {
  const { year, monthIndex } = parseMonthKey(monthKey);
  const monthStart = createUtcDate(year, monthIndex, 1);
  const monthEnd = createUtcDate(year, monthIndex + 1, 0);
  const startWeekday = (monthStart.getUTCDay() + 6) % 7;
  const endWeekday = (monthEnd.getUTCDay() + 6) % 7;
  const gridStart = addUtcDays(monthStart, -startWeekday);
  const gridEnd = addUtcDays(monthEnd, 6 - endWeekday);
  const days: Date[] = [];

  for (let cursor = gridStart; cursor <= gridEnd; cursor = addUtcDays(cursor, 1)) {
    days.push(cursor);
  }

  return days;
}

export function buildCalendarReviewMonth({
  currentMonthKey,
  trades,
  dailyPlans,
  setupNames,
  templateNames,
  ruleSetNames,
  timeZone,
  dateMode,
  globalRules,
}: BuildCalendarReviewMonthOptions) {
  const dateTools = createCalendarDateTools(timeZone);
  const calendarDays = getCalendarGridDays(currentMonthKey);
  const activeMonthKey = currentMonthKey;
  const planByDate = new Map(dailyPlans.map((plan) => [plan.date, plan]));

  const days = calendarDays.map<CalendarReviewDay>((date) => {
    const dateKey = dateTools.formatDateKey(date);

    return {
      date,
      dateKey,
      inCurrentMonth: dateTools.formatYearMonthKey(date) === activeMonthKey,
      isToday: dateTools.isToday(date),
      dailyPlan: planByDate.get(dateKey) ?? null,
      trades: [],
      totalPnl: 0,
      tradesCount: 0,
      winningTrades: 0,
      losingTrades: 0,
      reviewableTrades: 0,
      reviewedTrades: 0,
      needsReviewTrades: 0,
      screenshotCount: 0,
      setupAssignedTrades: 0,
      templateAssignedTrades: 0,
      mistakeTaggedTrades: 0,
      brokenRules: 0,
      followedRules: 0,
      skippedRules: 0,
      notApplicableRules: 0,
      sessionsUsed: [],
      setupsUsed: [],
      templatesUsed: [],
      ruleSetsUsed: [],
      brokenRuleTitles: [],
      globalRulesTracked: [],
      dailyRulesTracked: [],
      violatedGlobalRules: [],
      violatedDailyRules: [],
      planViolationLabels: [],
      maxTradesViolated: false,
      dailyLimitViolated: false,
      flaggedViolationsCount: 0,
    };
  });

  const dayByKey = new Map(days.map((day) => [day.dateKey, day]));

  for (const trade of trades) {
    const tradeDate =
      dateMode === "exit"
        ? trade.exitDate instanceof Date
          ? trade.exitDate
          : trade.exitDate
            ? new Date(trade.exitDate)
            : null
        : trade.entryDate instanceof Date
          ? trade.entryDate
          : trade.entryDate
            ? new Date(trade.entryDate)
            : null;

    if (!tradeDate || Number.isNaN(tradeDate.getTime())) {
      continue;
    }

    const tradeMonthKey = dateTools.formatYearMonthKey(tradeDate);
    if (tradeMonthKey !== activeMonthKey) {
      continue;
    }

    const dayKey = dateTools.formatDateKey(tradeDate);
    const targetDay = dayByKey.get(dayKey);
    if (!targetDay) {
      continue;
    }

    const viewModel = mapTradeToViewModel(trade);
    const reviewed = isTradeJournaled(viewModel);
    const brokenRules = viewModel.tradeRuleResults.filter(
      (result) => result.status === "broken",
    ).length;
    const brokenRuleTitles = viewModel.tradeRuleResults
      .filter((result) => result.status === "broken")
      .map((result) => result.title);
    const followedRules = viewModel.tradeRuleResults.filter(
      (result) => result.status === "followed",
    ).length;
    const skippedRules = viewModel.tradeRuleResults.filter(
      (result) => result.status === "skipped",
    ).length;
    const notApplicableRules = viewModel.tradeRuleResults.filter(
      (result) => result.status === "notApplicable",
    ).length;
    const pnl = getTradeNetPnl(trade);
    const isReviewable = trade.status === "CLOSED";

    const calendarTrade: CalendarReviewTrade = {
      id: trade.id,
      symbol: trade.symbol,
      direction: trade.direction === "SHORT" ? "SHORT" : "LONG",
      status: trade.status === "OPEN" ? "OPEN" : "CLOSED",
      pnl,
      rMultiple: trade.rMultiple != null ? Number(trade.rMultiple) : null,
      entryTime: viewModel.entryDate
        ? dateTools.formatTime(new Date(viewModel.entryDate))
        : "--:--",
      exitTime: viewModel.exitDate
        ? dateTools.formatTime(new Date(viewModel.exitDate))
        : null,
      session: viewModel.session ?? "Overnight",
      reviewed,
      screenshotsCount: viewModel.screenshots.length,
      setupDefinitionId: viewModel.setupDefinitionId,
      setupName: viewModel.setupDefinitionId
        ? setupNames.get(viewModel.setupDefinitionId) ?? null
        : null,
      journalTemplateId: viewModel.journalTemplateId,
      journalTemplateName: viewModel.journalTemplateId
        ? templateNames.get(viewModel.journalTemplateId) ?? null
        : null,
      ruleSetId: viewModel.ruleSetId,
      ruleSetName: viewModel.ruleSetId
        ? ruleSetNames.get(viewModel.ruleSetId) ?? null
        : null,
      brokenRules,
      followedRules,
      skippedRules,
      notApplicableRules,
      mistakeCount: viewModel.mistakeDefinitionIds.length + viewModel.mistakeTags.length,
      brokenRuleTitles,
    };

    targetDay.trades.push(calendarTrade);
    targetDay.totalPnl += pnl;
    targetDay.tradesCount += 1;
    if (pnl > 0) targetDay.winningTrades += 1;
    if (pnl < 0) targetDay.losingTrades += 1;
    if (isReviewable) {
      targetDay.reviewableTrades += 1;
      if (reviewed) {
        targetDay.reviewedTrades += 1;
      } else {
        targetDay.needsReviewTrades += 1;
      }
    }
    targetDay.screenshotCount += calendarTrade.screenshotsCount;
    if (calendarTrade.setupDefinitionId) {
      targetDay.setupAssignedTrades += 1;
    }
    if (calendarTrade.journalTemplateId) {
      targetDay.templateAssignedTrades += 1;
    }
    if (calendarTrade.mistakeCount > 0) {
      targetDay.mistakeTaggedTrades += 1;
    }
    targetDay.brokenRules += brokenRules;
    targetDay.followedRules += followedRules;
    targetDay.skippedRules += skippedRules;
    targetDay.notApplicableRules += notApplicableRules;
  }

  for (const day of days) {
    day.trades.sort((left, right) => left.entryTime.localeCompare(right.entryTime));
    day.sessionsUsed = dedupe(day.trades.map((trade) => trade.session));
    day.setupsUsed = dedupe(day.trades.map((trade) => trade.setupName));
    day.templatesUsed = dedupe(day.trades.map((trade) => trade.journalTemplateName));
    day.ruleSetsUsed = dedupe(day.trades.map((trade) => trade.ruleSetName));
    day.brokenRuleTitles = dedupe(
      day.trades.flatMap((trade) => trade.brokenRuleTitles),
    );
    day.globalRulesTracked = dedupe(globalRules);
    day.dailyRulesTracked = dedupe([
      ...(day.dailyPlan?.universalRulesChecked ?? []),
      ...(day.dailyPlan?.strategyRulesChecked ?? []),
    ]);

    const brokenRuleLookup = new Set(
      day.brokenRuleTitles.map((title) => normalizeRuleLabel(title)),
    );
    day.violatedGlobalRules = collectMatchingRules(
      day.globalRulesTracked,
      brokenRuleLookup,
    );
    day.violatedDailyRules = collectMatchingRules(
      day.dailyRulesTracked,
      brokenRuleLookup,
    );
    day.maxTradesViolated =
      day.dailyPlan?.maxTrades != null && day.tradesCount > day.dailyPlan.maxTrades;
    day.dailyLimitViolated =
      day.dailyPlan?.dailyLimit != null &&
      day.totalPnl < 0 &&
      Math.abs(day.totalPnl) > day.dailyPlan.dailyLimit;
    day.planViolationLabels = dedupe([
      day.maxTradesViolated ? "Exceeded max trades" : null,
      day.dailyLimitViolated ? "Broke daily loss limit" : null,
    ]);
    day.flaggedViolationsCount =
      day.violatedGlobalRules.length +
      day.violatedDailyRules.length +
      day.planViolationLabels.length;
  }

  const currentMonthDays = days.filter((day) => day.inCurrentMonth);
  let totalPnl = 0;
  let totalTrades = 0;
  let activeTradingDays = 0;
  let winningDays = 0;
  let losingDays = 0;
  let reviewableTrades = 0;
  let reviewedTrades = 0;
  let needsReviewTrades = 0;
  let plannedDays = 0;
  let gradedDays = 0;
  let screenshotDays = 0;
  let setupAssignedTrades = 0;
  let templateAssignedTrades = 0;
  let mistakeTaggedTrades = 0;
  let brokenRules = 0;
  let followedRules = 0;
  let skippedRules = 0;
  let notApplicableRules = 0;
  let bestDay: CalendarReviewDay | null = null;
  let worstDay: CalendarReviewDay | null = null;
  let reviewGapDays = 0;
  let flaggedViolationDays = 0;
  let violatedGlobalRules = 0;
  let violatedDailyRules = 0;

  for (const day of currentMonthDays) {
    totalPnl += day.totalPnl;
    totalTrades += day.tradesCount;
    reviewableTrades += day.reviewableTrades;
    reviewedTrades += day.reviewedTrades;
    needsReviewTrades += day.needsReviewTrades;
    setupAssignedTrades += day.setupAssignedTrades;
    templateAssignedTrades += day.templateAssignedTrades;
    mistakeTaggedTrades += day.mistakeTaggedTrades;
    brokenRules += day.brokenRules;
    followedRules += day.followedRules;
    skippedRules += day.skippedRules;
    notApplicableRules += day.notApplicableRules;
    violatedGlobalRules += day.violatedGlobalRules.length;
    violatedDailyRules += day.violatedDailyRules.length;

    if (day.tradesCount > 0) {
      activeTradingDays += 1;
      if (day.totalPnl > 0) winningDays += 1;
      if (day.totalPnl < 0) losingDays += 1;
      if (day.screenshotCount > 0) screenshotDays += 1;
      if (day.needsReviewTrades > 0) reviewGapDays += 1;
      if (day.flaggedViolationsCount > 0) flaggedViolationDays += 1;

      if (!bestDay || day.totalPnl > bestDay.totalPnl) {
        bestDay = day;
      }
      if (!worstDay || day.totalPnl < worstDay.totalPnl) {
        worstDay = day;
      }
    }

    if (day.dailyPlan) {
      plannedDays += 1;
      if (day.dailyPlan.dayGrade) {
        gradedDays += 1;
      }
    }
  }

  const assessedRules = followedRules + brokenRules;
  const summary: CalendarReviewMonthSummary = {
    totalPnl: round(totalPnl, 2),
    totalTrades,
    activeTradingDays,
    winningDays,
    losingDays,
    reviewableTrades,
    reviewedTrades,
    needsReviewTrades,
    reviewedPercent:
      reviewableTrades > 0 ? round((reviewedTrades / reviewableTrades) * 100, 1) : 0,
    plannedDays,
    gradedDays,
    screenshotDays,
    setupAssignedTrades,
    templateAssignedTrades,
    mistakeTaggedTrades,
    brokenRules,
    followedRules,
    skippedRules,
    notApplicableRules,
    ruleAdherencePercent:
      assessedRules > 0 ? round((followedRules / assessedRules) * 100, 1) : 0,
    reviewGapDays,
    flaggedViolationDays,
    violatedGlobalRules,
    violatedDailyRules,
    bestDay,
    worstDay,
  };

  return {
    dateTools,
    days,
    summary,
  };
}
