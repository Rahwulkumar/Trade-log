"use client";

import { X } from "lucide-react";

import { CalendarSurface } from "@/components/calendar/calendar-surface";
import { CalendarWorkspaceLoading } from "@/components/calendar/calendar-workspace-loading";
import { useCalendarWorkspace } from "@/components/calendar/use-calendar-workspace";
import { TradeReviewDocument } from "@/components/journal/trade-review-document";
import { Button } from "@/components/ui/button";
import {
  AppPanel,
  AppPanelEmptyState,
} from "@/components/ui/page-primitives";

export function CalendarWorkspace() {
  const {
    authLoading,
    isConfigured,
    user,
    currentUserId,
    dateMode,
    monthLabel,
    loading,
    loadError,
    trades,
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
    globalRules,
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
  } = useCalendarWorkspace();

  const selectedDayIdeaTrades =
    selectedDay == null
      ? []
      : trades.filter((trade) =>
          selectedDay.trades.some((dayTrade) => dayTrade.id === trade.id),
        );

  if (!authLoading && !isConfigured) {
    return (
      <div className="page-root page-sections">
        <AppPanelEmptyState
          title="Calendar unavailable"
          description="Add your app credentials first, then come back to review trades by month."
        />
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="page-root page-sections">
        <AppPanelEmptyState
          title="Sign in to open the calendar"
          description="Your month map and trade journal appear once you are signed in."
        />
      </div>
    );
  }

  return (
    <div className="page-root">
      <div className="page-sections w-full">
        {loading ? (
          <CalendarWorkspaceLoading />
        ) : loadError ? (
          <AppPanelEmptyState
            title="Calendar could not load"
            description={loadError}
          />
        ) : !calendar ? (
          <AppPanelEmptyState
            title="Calendar unavailable"
            description="There is no month data to render for the current scope."
          />
        ) : (
          <>
            <CalendarSurface
              monthLabel={monthLabel}
              summary={calendar.summary}
              days={calendar.days}
              dateTools={calendar.dateTools}
              dateMode={dateMode}
              selectedDay={selectedDay ?? null}
              selectedTradeId={resolvedSelectedTradeId}
              onChangeDateMode={handleChangeDateMode}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
              onJumpToLatest={handleJumpToLatest}
              onSelectDay={handleSelectDay}
              onSelectTrade={handleSelectTrade}
              onOpenJournal={handleOpenJournal}
            />

            {journalTrade && selectedDay ? (
              <AppPanel className="overflow-hidden p-0">
                <div
                  className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 sm:px-5"
                  style={{ borderBottomColor: "var(--border-subtle)" }}
                >
                  <div className="min-w-0">
                    <p className="text-label">Trade review</p>
                    <h2 className="mt-0.5 text-[0.96rem] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                      {journalTrade.symbol} / {calendar.dateTools.formatLongDate(selectedDay.date)}
                    </h2>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-[0.76rem]"
                    onClick={handleCloseJournal}
                  >
                    <X size={14} />
                    Close review
                  </Button>
                </div>

                <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto">
                  <TradeReviewDocument
                    trade={journalTrade}
                    tradeIdea={selectedDayIdeaTrades}
                    activeTradeId={journalTrade.id}
                    onSelectTradeInIdea={(tradeId) => {
                      setSelectedTradeId(tradeId);
                      setJournalTradeId(tradeId);
                    }}
                    allTrades={selectedDayIdeaTrades}
                    globalRules={globalRules}
                    userId={currentUserId ?? ""}
                    playbooks={playbooks}
                    setupDefinitions={setupDefinitions}
                    mistakeDefinitions={mistakeDefinitions}
                    journalTemplates={journalTemplates}
                    ruleSets={ruleSets}
                    index={Math.max(selectedDayTradeIndex, 0)}
                    total={selectedDay.trades.length}
                    hasPrevious={selectedDayTradeIndex > 0}
                    hasNext={
                      selectedDayTradeIndex >= 0 &&
                      selectedDayTradeIndex < selectedDay.trades.length - 1
                    }
                    onPrevious={() => {
                      if (selectedDayTradeIndex > 0) {
                        const previousTrade = selectedDay.trades[selectedDayTradeIndex - 1];
                        setSelectedTradeId(previousTrade.id);
                        setJournalTradeId(previousTrade.id);
                      }
                    }}
                    onNext={() => {
                      if (
                        selectedDayTradeIndex >= 0 &&
                        selectedDayTradeIndex < selectedDay.trades.length - 1
                      ) {
                        const nextTrade = selectedDay.trades[selectedDayTradeIndex + 1];
                        setSelectedTradeId(nextTrade.id);
                        setJournalTradeId(nextTrade.id);
                      }
                    }}
                    onNextPending={() => {
                      const nextPending = selectedDay.trades.find(
                        (trade) => !trade.reviewed && trade.id !== resolvedJournalTradeId,
                      );
                      if (nextPending) {
                        setSelectedTradeId(nextPending.id);
                        setJournalTradeId(nextPending.id);
                      }
                    }}
                    onSaved={handleSavedTrade}
                  />
                </div>
              </AppPanel>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
