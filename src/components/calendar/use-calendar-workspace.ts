"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import { resolveAnalyticsTimeZone } from "@/lib/analytics/timezone";
import { getDailyPlansRange } from "@/lib/api/client/daily-plans";
import {
  getJournalTemplates,
  getMistakeDefinitions,
  getRuleSets,
  getSetupDefinitions,
} from "@/lib/api/client/journal-structure";
import { getPlaybooks, type Playbook } from "@/lib/api/client/playbooks";
import { getTradesStrict } from "@/lib/api/client/trades";
import type {
  JournalTemplate,
  MistakeDefinition,
  SetupDefinition,
  Trade,
} from "@/lib/db/schema";
import type {
  CalendarDateMode,
  CalendarReviewDay,
  CalendarReviewPlan,
} from "@/lib/calendar/review";
import {
  buildCalendarReviewMonth,
  createCalendarDateTools,
  getCalendarMonthLabel,
  getCalendarMonthQueryRange,
  getCurrentCalendarMonthKey,
  shiftCalendarMonthKey,
} from "@/lib/calendar/review";
import type { RuleSetWithItems } from "@/lib/rulebooks/types";

function getTradeDateValue(trade: Trade, mode: CalendarDateMode) {
  if (mode === "exit" && trade.exitDate) {
    return trade.exitDate;
  }

  return trade.entryDate;
}

function resolveMonthKeyFromTrades(
  trades: Trade[],
  mode: CalendarDateMode,
  timeZone: string,
) {
  const dateTools = createCalendarDateTools(timeZone);
  const first = trades[0];
  if (!first) {
    return getCurrentCalendarMonthKey(timeZone);
  }

  return dateTools.formatYearMonthKey(new Date(getTradeDateValue(first, mode)));
}

function chooseFallbackDay(days: CalendarReviewDay[]) {
  const currentMonthDays = days.filter((day) => day.inCurrentMonth);
  const activeDays = currentMonthDays.filter((day) => day.tradesCount > 0);
  return (
    activeDays.at(-1) ??
    currentMonthDays.find((day) => day.isToday) ??
    currentMonthDays[0] ??
    null
  );
}

export function useCalendarWorkspace({
  loadJournalMeta = true,
}: {
  loadJournalMeta?: boolean;
} = {}) {
  const { user, loading: authLoading, isConfigured, profile } = useAuth();
  const { selectedAccountId } = usePropAccount();

  const currentUserId = user?.id ?? null;
  const timeZone = resolveAnalyticsTimeZone(undefined, profile?.timezone);
  const globalRules = useMemo(() => profile?.trading_rules ?? [], [profile?.trading_rules]);

  const [dateMode, setDateMode] = useState<CalendarDateMode>("entry");
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [latestMonthKey, setLatestMonthKey] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [journalTradeId, setJournalTradeId] = useState<string | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [trades, setTrades] = useState<Trade[]>([]);
  const [dailyPlans, setDailyPlans] = useState<CalendarReviewPlan[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [setupDefinitions, setSetupDefinitions] = useState<SetupDefinition[]>([]);
  const [mistakeDefinitions, setMistakeDefinitions] = useState<MistakeDefinition[]>([]);
  const [journalTemplates, setJournalTemplates] = useState<JournalTemplate[]>([]);
  const [ruleSets, setRuleSets] = useState<RuleSetWithItems[]>([]);

  const resetSelection = useCallback(() => {
    setSelectedDateKey(null);
    setSelectedTradeId(null);
    setJournalTradeId(null);
    setJournalOpen(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!currentUserId) {
        if (!cancelled) {
          setPlaybooks([]);
          setSetupDefinitions([]);
          setMistakeDefinitions([]);
          setJournalTemplates([]);
          setRuleSets([]);
        }
        return;
      }

      if (!loadJournalMeta) {
        if (!cancelled) {
          setPlaybooks([]);
          setSetupDefinitions([]);
          setMistakeDefinitions([]);
          setJournalTemplates([]);
          setRuleSets([]);
        }
        return;
      }

      const results = await Promise.allSettled([
        getPlaybooks(),
        getSetupDefinitions({ activeOnly: true }),
        getMistakeDefinitions({ activeOnly: true }),
        getJournalTemplates({ activeOnly: true }),
        getRuleSets({ activeOnly: true }),
      ]);

      if (cancelled) return;

      setPlaybooks(results[0].status === "fulfilled" ? results[0].value : []);
      setSetupDefinitions(results[1].status === "fulfilled" ? results[1].value : []);
      setMistakeDefinitions(results[2].status === "fulfilled" ? results[2].value : []);
      setJournalTemplates(results[3].status === "fulfilled" ? results[3].value : []);
      setRuleSets(results[4].status === "fulfilled" ? results[4].value : []);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, loadJournalMeta]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!currentUserId) {
        if (!cancelled) setMonthKey(null);
        return;
      }

      const propAccountFilter =
        selectedAccountId === "unassigned"
          ? "unassigned"
          : selectedAccountId ?? undefined;

      try {
        const latestTrades = await getTradesStrict({
          status: "closed",
          propAccountId: propAccountFilter,
          sortBy: dateMode === "exit" ? "exitDate" : "entryDate",
          sortOrder: "desc",
          limit: 1,
        });

        if (!cancelled) {
          const nextMonthKey = resolveMonthKeyFromTrades(latestTrades, dateMode, timeZone);
          setLatestMonthKey(nextMonthKey);
          setMonthKey(nextMonthKey);
        }
      } catch {
        if (!cancelled) {
          const fallbackMonthKey = getCurrentCalendarMonthKey(timeZone);
          setLatestMonthKey(fallbackMonthKey);
          setMonthKey(fallbackMonthKey);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, dateMode, selectedAccountId, timeZone]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!currentUserId || !monthKey) {
        if (!cancelled) {
          setTrades([]);
          setDailyPlans([]);
          setLoading(false);
          setLoadError(null);
        }
        return;
      }

      setLoading(true);
      setLoadError(null);

      const range = getCalendarMonthQueryRange(monthKey);
      const propAccountFilter =
        selectedAccountId === "unassigned"
          ? "unassigned"
          : selectedAccountId ?? undefined;

      const [tradeResult, planResult] = await Promise.allSettled([
        getTradesStrict({
          status: "closed",
          propAccountId: propAccountFilter,
          sortBy: dateMode === "exit" ? "exitDate" : "entryDate",
          sortOrder: "asc",
          limit: 500,
          ...(dateMode === "entry"
            ? { startDate: range.fetchFrom, endDate: range.fetchTo }
            : { exitStartDate: range.fetchFrom, exitEndDate: range.fetchTo }),
        }),
        getDailyPlansRange(range.from, range.to),
      ]);

      if (cancelled) return;

      if (tradeResult.status === "rejected") {
        setTrades([]);
        setDailyPlans(planResult.status === "fulfilled" ? planResult.value : []);
        setLoadError(
          tradeResult.reason instanceof Error
            ? tradeResult.reason.message
            : "The calendar could not load this month right now.",
        );
      } else {
        setTrades(tradeResult.value);
        setDailyPlans(planResult.status === "fulfilled" ? planResult.value : []);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, monthKey, dateMode, selectedAccountId]);

  const setupNames = useMemo(
    () => new Map(setupDefinitions.map((item) => [item.id, item.name])),
    [setupDefinitions],
  );
  const templateNames = useMemo(
    () => new Map(journalTemplates.map((item) => [item.id, item.name])),
    [journalTemplates],
  );
  const ruleSetNames = useMemo(
    () => new Map(ruleSets.map((item) => [item.id, item.name])),
    [ruleSets],
  );
  const tradeMap = useMemo(() => new Map(trades.map((trade) => [trade.id, trade])), [trades]);

  const calendar = useMemo(() => {
    if (!monthKey) {
      return null;
    }

    return buildCalendarReviewMonth({
      currentMonthKey: monthKey,
      trades,
      dailyPlans,
      setupNames,
      templateNames,
      ruleSetNames,
      timeZone,
      dateMode,
      globalRules,
    });
  }, [
    monthKey,
    trades,
    dailyPlans,
    setupNames,
    templateNames,
    ruleSetNames,
    timeZone,
    dateMode,
    globalRules,
  ]);

  const selectedDay = useMemo(
    () =>
      calendar?.days.find((day) => day.dateKey === selectedDateKey) ??
      chooseFallbackDay(calendar?.days ?? []),
    [calendar, selectedDateKey],
  );

  const resolvedSelectedTradeId = useMemo(() => {
    if (!selectedDay) {
      return null;
    }

    if (selectedTradeId && selectedDay.trades.some((trade) => trade.id === selectedTradeId)) {
      return selectedTradeId;
    }

    return (
      selectedDay.trades.find((trade) => !trade.reviewed)?.id ??
      selectedDay.trades[0]?.id ??
      null
    );
  }, [selectedDay, selectedTradeId]);

  const resolvedJournalTradeId = useMemo(() => {
    if (!selectedDay || !journalOpen) {
      return null;
    }

    if (journalTradeId && selectedDay.trades.some((trade) => trade.id === journalTradeId)) {
      return journalTradeId;
    }

    return resolvedSelectedTradeId;
  }, [journalOpen, journalTradeId, resolvedSelectedTradeId, selectedDay]);

  const journalTrade = resolvedJournalTradeId
    ? tradeMap.get(resolvedJournalTradeId) ?? null
    : null;

  const selectedDayTradeIndex = useMemo(() => {
    if (!selectedDay || !resolvedJournalTradeId) return -1;
    return selectedDay.trades.findIndex((trade) => trade.id === resolvedJournalTradeId);
  }, [resolvedJournalTradeId, selectedDay]);

  const monthLabel = monthKey ? getCalendarMonthLabel(monthKey, timeZone) : "Calendar";

  const handleSavedTrade = useCallback((savedTrade: Trade) => {
    setTrades((currentTrades) =>
      currentTrades.map((trade) => (trade.id === savedTrade.id ? savedTrade : trade)),
    );
  }, []);

  const handleSelectTrade = useCallback((tradeId: string) => {
    setSelectedTradeId(tradeId);
    setJournalTradeId((current) => (current ? tradeId : current));
  }, []);

  const handleOpenJournal = useCallback((tradeId: string) => {
    setSelectedTradeId(tradeId);
    setJournalOpen(true);
    setJournalTradeId(tradeId);
  }, []);

  const handleCloseJournal = useCallback(() => {
    setJournalOpen(false);
    setJournalTradeId(null);
  }, []);

  const handleJumpToLatest = useCallback(() => {
    if (!latestMonthKey) return;
    setMonthKey(latestMonthKey);
    resetSelection();
  }, [latestMonthKey, resetSelection]);

  const handlePreviousMonth = useCallback(() => {
    if (!monthKey) return;
    setMonthKey(shiftCalendarMonthKey(monthKey, -1));
    resetSelection();
  }, [monthKey, resetSelection]);

  const handleNextMonth = useCallback(() => {
    if (!monthKey) return;
    setMonthKey(shiftCalendarMonthKey(monthKey, 1));
    resetSelection();
  }, [monthKey, resetSelection]);

  const handleChangeDateMode = useCallback(
    (mode: CalendarDateMode) => {
      setDateMode(mode);
      resetSelection();
    },
    [resetSelection],
  );

  const handleSelectDay = useCallback(
    (dateKey: string) => {
      setSelectedDateKey(dateKey);
      setSelectedTradeId(null);
      setJournalTradeId(null);
      setJournalOpen(false);
    },
    [],
  );

  return {
    authLoading,
    isConfigured,
    user,
    currentUserId,
    dateMode,
    monthLabel,
    loading,
    loadError,
    calendar,
    selectedDay,
    resolvedSelectedTradeId,
    resolvedJournalTradeId,
    journalTrade,
    selectedDayTradeIndex,
    playbooks,
    setupDefinitions,
    mistakeDefinitions,
    journalTemplates,
    ruleSets,
    handleChangeDateMode,
    handlePreviousMonth,
    handleNextMonth,
    handleJumpToLatest,
    handleSelectDay,
    handleSelectTrade,
    handleOpenJournal,
    handleCloseJournal,
    handleSavedTrade,
    setSelectedTradeId,
    setJournalTradeId,
  };
}
