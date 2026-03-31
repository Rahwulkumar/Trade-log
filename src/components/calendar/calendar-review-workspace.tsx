"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ShieldAlert } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import {
  CalendarAgendaList,
  CalendarDayInspector,
  CalendarJournalShell,
  CalendarMonthBoard,
  CalendarSummaryStrip,
  CalendarWorkspaceHero,
  modeSummaryCards,
  pickPreferredDay,
  type CalendarReviewMode,
} from "@/components/calendar/calendar-review-primitives";
import { TradeReviewDocument } from "@/components/journal/trade-review-document";
import { Button } from "@/components/ui/button";
import {
  LoadingCalendarGrid,
  LoadingMetricGrid,
  LoadingPanel,
} from "@/components/ui/loading";
import { WidgetEmptyState } from "@/components/ui/surface-primitives";
import {
  getDailyPlansRange,
  type DailyPlanRangeResponse,
} from "@/lib/api/client/daily-plans";
import {
  getMistakeDefinitions,
  getJournalTemplates,
  getRuleSets,
  getSetupDefinitions,
} from "@/lib/api/client/journal-structure";
import { getPlaybooks, type Playbook } from "@/lib/api/client/playbooks";
import { getTradesStrict } from "@/lib/api/client/trades";
import {
  buildCalendarReviewMonth,
  getCalendarMonthLabel,
  getCalendarMonthQueryRange,
  getCurrentCalendarMonthKey,
  shiftCalendarMonthKey,
  type CalendarDateMode,
  type CalendarReviewPlan,
} from "@/lib/calendar/review";
import {
  formatAnalyticsTimeZoneLabel,
  resolveAnalyticsTimeZone,
} from "@/lib/analytics/timezone";
import type {
  JournalTemplate,
  MistakeDefinition,
  SetupDefinition,
  Trade,
} from "@/lib/db/schema";
import type { RuleSetWithItems } from "@/lib/rulebooks/types";

export function CalendarReviewWorkspace() {
  const { user, profile, isConfigured, loading: authLoading } = useAuth();
  const { selectedAccountId, propAccounts } = usePropAccount();

  const timeZone = useMemo(
    () => resolveAnalyticsTimeZone(null, profile?.timezone),
    [profile?.timezone],
  );

  const [currentMonthKey, setCurrentMonthKey] = useState(() =>
    getCurrentCalendarMonthKey(timeZone),
  );
  const [mode, setMode] = useState<CalendarReviewMode>("performance");
  const [dateMode, setDateMode] = useState<CalendarDateMode>("entry");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [trades, setTrades] = useState<Awaited<ReturnType<typeof getTradesStrict>>>([]);
  const [dailyPlans, setDailyPlans] = useState<DailyPlanRangeResponse[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [setupDefinitions, setSetupDefinitions] = useState<SetupDefinition[]>([]);
  const [mistakeDefinitions, setMistakeDefinitions] = useState<MistakeDefinition[]>([]);
  const [journalTemplates, setJournalTemplates] = useState<JournalTemplate[]>([]);
  const [ruleSets, setRuleSets] = useState<RuleSetWithItems[]>([]);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [journalExpanded, setJournalExpanded] = useState(false);
  const detailRef = useRef<HTMLDivElement | null>(null);
  const journalRef = useRef<HTMLDivElement | null>(null);
  const timeZoneLabel = useMemo(
    () => formatAnalyticsTimeZoneLabel(timeZone),
    [timeZone],
  );

  const selectedPropAccount = useMemo(() => {
    if (!selectedAccountId || selectedAccountId === "unassigned") {
      return null;
    }

    return propAccounts.find((account) => account.id === selectedAccountId) ?? null;
  }, [propAccounts, selectedAccountId]);

  const accountLabel =
    selectedAccountId === "unassigned"
      ? "Unassigned trades"
      : selectedPropAccount?.accountName ?? "All accounts";

  const setupNames = useMemo(
    () => new Map(setupDefinitions.map((setup) => [setup.id, setup.name])),
    [setupDefinitions],
  );
  const templateNames = useMemo(
    () => new Map(journalTemplates.map((template) => [template.id, template.name])),
    [journalTemplates],
  );
  const ruleSetNames = useMemo(
    () => new Map(ruleSets.map((ruleSet) => [ruleSet.id, ruleSet.name])),
    [ruleSets],
  );

  const monthDates = useMemo(
    () => getCalendarMonthQueryRange(currentMonthKey),
    [currentMonthKey],
  );
  const currentMonthLabel = useMemo(
    () => getCalendarMonthLabel(currentMonthKey, timeZone),
    [currentMonthKey, timeZone],
  );

  useEffect(() => {
    async function loadLibraries() {
      if (authLoading) {
        return;
      }

      if (!isConfigured || !user) {
        setPlaybooks([]);
        setSetupDefinitions([]);
        setMistakeDefinitions([]);
        setJournalTemplates([]);
        setRuleSets([]);
        return;
      }

      const [playbooksResult, setupsResult, mistakesResult, templatesResult, ruleSetsResult] =
        await Promise.allSettled([
          getPlaybooks(),
          getSetupDefinitions(),
          getMistakeDefinitions(),
          getJournalTemplates(),
          getRuleSets(),
        ]);

      if (playbooksResult.status === "fulfilled") {
        setPlaybooks(playbooksResult.value);
      }

      if (setupsResult.status === "fulfilled") {
        setSetupDefinitions(setupsResult.value);
      }

      if (mistakesResult.status === "fulfilled") {
        setMistakeDefinitions(mistakesResult.value);
      }

      if (templatesResult.status === "fulfilled") {
        setJournalTemplates(templatesResult.value);
      }

      if (ruleSetsResult.status === "fulfilled") {
        setRuleSets(ruleSetsResult.value);
      }
    }

    void loadLibraries();
  }, [authLoading, isConfigured, user]);

  useEffect(() => {
    async function loadCalendar() {
      if (authLoading) {
        return;
      }

      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const tradeFilters =
          dateMode === "entry"
            ? {
                startDate: monthDates.fetchFrom,
                endDate: monthDates.fetchTo,
                propAccountId:
                  selectedAccountId === "unassigned"
                    ? "unassigned"
                    : selectedAccountId ?? undefined,
              }
            : {
                status: "closed" as const,
                exitStartDate: monthDates.fetchFrom,
                exitEndDate: monthDates.fetchTo,
                propAccountId:
                  selectedAccountId === "unassigned"
                    ? "unassigned"
                    : selectedAccountId ?? undefined,
              };

        const [tradesResult, plansResult] = await Promise.all([
          getTradesStrict(tradeFilters),
          getDailyPlansRange(monthDates.from, monthDates.to),
        ]);

        setTrades(tradesResult);
        setDailyPlans(plansResult);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Failed to load the calendar workspace.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void loadCalendar();
  }, [
    authLoading,
    dateMode,
    isConfigured,
    monthDates.fetchFrom,
    monthDates.fetchTo,
    monthDates.from,
    monthDates.to,
    reloadNonce,
    selectedAccountId,
    user,
  ]);

  const calendarData = useMemo(
    () =>
      buildCalendarReviewMonth({
        currentMonthKey,
        trades,
        dailyPlans: dailyPlans as CalendarReviewPlan[],
        setupNames,
        templateNames,
        ruleSetNames,
        timeZone,
        dateMode,
        globalRules: profile?.trading_rules ?? [],
      }),
    [
      currentMonthKey,
      dailyPlans,
      dateMode,
      profile?.trading_rules,
      ruleSetNames,
      setupNames,
      templateNames,
      timeZone,
      trades,
    ],
  );

  useEffect(() => {
    const selectedDay = selectedDateKey
      ? calendarData.days.find((day) => day.dateKey === selectedDateKey) ?? null
      : null;

    if (selectedDay) {
      return;
    }

    const fallbackDay = pickPreferredDay(calendarData.days);
    setSelectedDateKey(fallbackDay?.dateKey ?? null);
  }, [calendarData.days, selectedDateKey]);

  const selectedDay = useMemo(
    () =>
      selectedDateKey
        ? calendarData.days.find((day) => day.dateKey === selectedDateKey) ?? null
        : null,
    [calendarData.days, selectedDateKey],
  );

  const detailedSelectedTrades = useMemo(() => {
    if (!selectedDay) {
      return [] as Trade[];
    }

    const tradeById = new Map(trades.map((trade) => [trade.id, trade]));
    return selectedDay.trades
      .map((trade) => tradeById.get(trade.id) ?? null)
      .filter((trade): trade is Trade => Boolean(trade));
  }, [selectedDay, trades]);

  useEffect(() => {
    if (!selectedDay || detailedSelectedTrades.length === 0) {
      setSelectedTradeId(null);
      return;
    }

    const stillVisible = selectedTradeId
      ? detailedSelectedTrades.some((trade) => trade.id === selectedTradeId)
      : false;

    if (stillVisible) {
      return;
    }

    const nextPendingTrade =
      selectedDay.trades.find(
        (trade) => trade.status === "CLOSED" && !trade.reviewed,
      ) ?? selectedDay.trades[0];

    setSelectedTradeId(nextPendingTrade?.id ?? null);
  }, [detailedSelectedTrades, selectedDay, selectedTradeId]);

  const selectedTrade = useMemo(
    () =>
      selectedTradeId
        ? detailedSelectedTrades.find((trade) => trade.id === selectedTradeId) ?? null
        : null,
    [detailedSelectedTrades, selectedTradeId],
  );

  const selectedTradeSummary = useMemo(
    () =>
      selectedDay?.trades.find((trade) => trade.id === selectedTradeId) ?? null,
    [selectedDay, selectedTradeId],
  );

  const selectedTradeIndex = useMemo(
    () =>
      selectedTradeId
        ? detailedSelectedTrades.findIndex((trade) => trade.id === selectedTradeId)
        : -1,
    [detailedSelectedTrades, selectedTradeId],
  );

  const agendaDays = useMemo(
    () =>
      calendarData.days.filter(
        (day) => day.inCurrentMonth && (day.tradesCount > 0 || day.dailyPlan),
      ),
    [calendarData.days],
  );

  const summaryCards = useMemo(
    () => modeSummaryCards(mode, calendarData.summary, calendarData.dateTools),
    [calendarData.dateTools, calendarData.summary, mode],
  );

  const scrollRefIntoViewIfNeeded = useCallback(
    (targetRef: { current: HTMLDivElement | null }) => {
      if (typeof window === "undefined") {
        return;
      }

      const element = targetRef.current;
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const padding = 24;
      const fullyVisible =
        rect.top >= padding &&
        rect.bottom <= window.innerHeight - padding;

      if (fullyVisible) {
        return;
      }

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      window.setTimeout(() => {
        element.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
      }, 80);
    },
    [],
  );

  const handleSelectDay = useCallback((dateKey: string) => {
    setSelectedDateKey(dateKey);
    setJournalExpanded(false);

    scrollRefIntoViewIfNeeded(detailRef);
  }, [scrollRefIntoViewIfNeeded]);

  const handleSelectTrade = useCallback((tradeId: string) => {
    setSelectedTradeId(tradeId);
    setJournalExpanded(true);

    scrollRefIntoViewIfNeeded(journalRef);
  }, [scrollRefIntoViewIfNeeded]);

  const handleTradeSaved = useCallback((savedTrade: Trade) => {
    setTrades((currentTrades) =>
      currentTrades.map((trade) =>
        trade.id === savedTrade.id ? savedTrade : trade,
      ),
    );
  }, []);

  const goToPreviousTrade = useCallback(() => {
    if (selectedTradeIndex > 0) {
      setSelectedTradeId(detailedSelectedTrades[selectedTradeIndex - 1]?.id ?? null);
    }
  }, [detailedSelectedTrades, selectedTradeIndex]);

  const goToNextTrade = useCallback(() => {
    if (
      selectedTradeIndex >= 0 &&
      selectedTradeIndex < detailedSelectedTrades.length - 1
    ) {
      setSelectedTradeId(detailedSelectedTrades[selectedTradeIndex + 1]?.id ?? null);
    }
  }, [detailedSelectedTrades, selectedTradeIndex]);

  const goToNextPendingTrade = useCallback(() => {
    if (!selectedDay || !selectedTradeId) {
      return;
    }

    const currentPosition = selectedDay.trades.findIndex(
      (trade) => trade.id === selectedTradeId,
    );
    const nextPendingTrade =
      selectedDay.trades
        .slice(currentPosition + 1)
        .find((trade) => trade.status === "CLOSED" && !trade.reviewed) ??
      selectedDay.trades.find(
        (trade) => trade.status === "CLOSED" && !trade.reviewed,
      );

    if (nextPendingTrade) {
      handleSelectTrade(nextPendingTrade.id);
    }
  }, [handleSelectTrade, selectedDay, selectedTradeId]);

  if (!authLoading && !isConfigured) {
    return (
      <div className="page-root page-sections calendar-review-shell">
        <WidgetEmptyState
          className="py-12"
          title="Supabase Not Configured"
          description="Add your Supabase credentials to unlock the calendar review workspace."
        />
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="page-root page-sections calendar-review-shell">
        <WidgetEmptyState
          className="py-12"
          icon={<CalendarDays className="h-5 w-5" />}
          title="Sign in to review your month"
          description="The calendar workspace needs your trade and plan history."
          action={
            <Button asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-root page-sections calendar-review-shell">
      <CalendarWorkspaceHero
        mode={mode}
        dateMode={dateMode}
        monthLabel={currentMonthLabel}
        timeZoneLabel={timeZoneLabel}
        accountLabel={accountLabel}
        onModeChange={setMode}
        onDateModeChange={setDateMode}
        onPreviousMonth={() => setCurrentMonthKey(shiftCalendarMonthKey(currentMonthKey, -1))}
        onNextMonth={() => setCurrentMonthKey(shiftCalendarMonthKey(currentMonthKey, 1))}
        onResetMonth={() => setCurrentMonthKey(getCurrentCalendarMonthKey(timeZone))}
      />

      {loading ? (
        <>
          <LoadingMetricGrid />
          <LoadingCalendarGrid />
          <LoadingPanel rows={5} title="Loading day review" />
        </>
      ) : error ? (
        <WidgetEmptyState
          className="py-12"
          icon={<ShieldAlert className="h-5 w-5" />}
          title="Calendar workspace failed to load"
          description={error}
          action={<Button onClick={() => setReloadNonce((value) => value + 1)}>Try again</Button>}
        />
      ) : (
        <>
          <CalendarSummaryStrip cards={summaryCards} />

          <section className="calendar-review-main-grid">
            <div className="space-y-6">
              <CalendarAgendaList
                className="calendar-review-agenda-shell"
                days={agendaDays}
                dateTools={calendarData.dateTools}
                mode={mode}
                selectedDateKey={selectedDateKey}
                onSelectDay={handleSelectDay}
              />

              <CalendarMonthBoard
                className="calendar-review-board-shell"
                days={calendarData.days}
                dateTools={calendarData.dateTools}
                mode={mode}
                selectedDay={selectedDay}
                selectedDateKey={selectedDateKey}
                onSelectDay={handleSelectDay}
              />
            </div>

            <div ref={detailRef} className="calendar-review-inspector-shell">
              <CalendarDayInspector
                mode={mode}
                selectedDay={selectedDay}
                dateTools={calendarData.dateTools}
                selectedTradeId={selectedTradeId}
                onSelectTrade={handleSelectTrade}
              />
            </div>
          </section>

          {selectedTrade && user ? (
            <div ref={journalRef}>
              <CalendarJournalShell
                selectedDay={selectedDay}
                selectedTradeSummary={selectedTradeSummary}
                expanded={journalExpanded}
                onToggleExpanded={() =>
                  setJournalExpanded((current) => !current)
                }
              >
                <TradeReviewDocument
                  key={selectedTrade.id}
                  trade={selectedTrade}
                  userId={user.id}
                  playbooks={playbooks}
                  setupDefinitions={setupDefinitions}
                  mistakeDefinitions={mistakeDefinitions}
                  journalTemplates={journalTemplates}
                  ruleSets={ruleSets}
                  index={selectedTradeIndex >= 0 ? selectedTradeIndex : 0}
                  total={detailedSelectedTrades.length}
                  hasPrevious={selectedTradeIndex > 0}
                  hasNext={
                    selectedTradeIndex >= 0 &&
                    selectedTradeIndex < detailedSelectedTrades.length - 1
                  }
                  onPrevious={goToPreviousTrade}
                  onNext={goToNextTrade}
                  onNextPending={
                    selectedDay?.trades.some(
                      (trade) => trade.status === "CLOSED" && !trade.reviewed,
                    )
                      ? goToNextPendingTrade
                      : undefined
                  }
                  onSaved={handleTradeSaved}
                />
              </CalendarJournalShell>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
