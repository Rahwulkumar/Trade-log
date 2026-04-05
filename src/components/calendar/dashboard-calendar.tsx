"use client";

import Link from "next/link";

import { CalendarSurface } from "@/components/calendar/calendar-surface";
import { CalendarWorkspaceLoading } from "@/components/calendar/calendar-workspace-loading";
import { useCalendarWorkspace } from "@/components/calendar/use-calendar-workspace";
import { Button } from "@/components/ui/button";
import { AppPanelEmptyState } from "@/components/ui/page-primitives";

export function DashboardCalendar() {
  const {
    authLoading,
    isConfigured,
    user,
    dateMode,
    monthLabel,
    loading,
    loadError,
    calendar,
    selectedDay,
    resolvedSelectedTradeId,
    handleChangeDateMode,
    handlePreviousMonth,
    handleNextMonth,
    handleJumpToLatest,
    handleSelectDay,
    handleSelectTrade,
  } = useCalendarWorkspace({ loadJournalMeta: false });

  if (!authLoading && !isConfigured) {
    return (
      <AppPanelEmptyState
        title="Calendar unavailable"
        description="Add your app credentials first, then come back to review trades by month."
      />
    );
  }

  if (!authLoading && !user) {
    return (
      <AppPanelEmptyState
        title="Sign in to open the calendar"
        description="Your month map appears here once you are signed in."
      />
    );
  }

  if (loading) {
    return <CalendarWorkspaceLoading />;
  }

  if (loadError) {
    return (
      <AppPanelEmptyState
        title="Calendar could not load"
        description={loadError}
      />
    );
  }

  if (!calendar) {
    return (
      <AppPanelEmptyState
        title="Calendar unavailable"
        description="There is no month data to render for the current scope."
      />
    );
  }

  return (
    <CalendarSurface
      monthLabel={monthLabel}
      summary={calendar.summary}
      days={calendar.days}
      dateTools={calendar.dateTools}
      dateMode={dateMode}
      selectedDay={selectedDay ?? null}
      selectedTradeId={resolvedSelectedTradeId}
      headerAction={
        <Button variant="outline" size="sm" asChild>
          <Link href="/calendar">Open workspace</Link>
        </Button>
      }
      onChangeDateMode={handleChangeDateMode}
      onPreviousMonth={handlePreviousMonth}
      onNextMonth={handleNextMonth}
      onJumpToLatest={handleJumpToLatest}
      onSelectDay={handleSelectDay}
      onSelectTrade={handleSelectTrade}
    />
  );
}
