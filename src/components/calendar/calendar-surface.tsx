"use client";

import type { ReactNode } from "react";

import { CalendarDayFocus } from "@/components/calendar/calendar-day-focus";
import { CalendarHeader } from "@/components/calendar/calendar-header";
import { CalendarMonthMap } from "@/components/calendar/calendar-month-map";
import { formatSignedPnl } from "@/components/calendar/calendar-shared";
import { AppPanel } from "@/components/ui/page-primitives";
import type {
  CalendarDateMode,
  CalendarDateTools,
  CalendarReviewDay,
  CalendarReviewMonthSummary,
} from "@/lib/calendar/review";

interface CalendarSurfaceProps {
  monthLabel: string;
  summary: CalendarReviewMonthSummary;
  days: CalendarReviewDay[];
  dateTools: CalendarDateTools;
  dateMode: CalendarDateMode;
  selectedDay: CalendarReviewDay | null;
  selectedTradeId: string | null;
  headerAction?: ReactNode;
  onChangeDateMode: (value: CalendarDateMode) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onJumpToLatest: () => void;
  onSelectDay: (dateKey: string) => void;
  onSelectTrade: (tradeId: string) => void;
  onOpenJournal?: (tradeId: string) => void;
}

export function CalendarSurface({
  monthLabel,
  summary,
  days,
  dateTools,
  dateMode,
  selectedDay,
  selectedTradeId,
  headerAction,
  onChangeDateMode,
  onPreviousMonth,
  onNextMonth,
  onJumpToLatest,
  onSelectDay,
  onSelectTrade,
  onOpenJournal,
}: CalendarSurfaceProps) {
  return (
    <>
      <CalendarHeader
        monthLabel={monthLabel}
        totalPnl={formatSignedPnl(summary.totalPnl)}
        activeDays={String(summary.activeTradingDays)}
        pendingTrades={String(summary.needsReviewTrades)}
        action={headerAction}
        dateMode={dateMode}
        onChangeDateMode={onChangeDateMode}
        onPreviousMonth={onPreviousMonth}
        onNextMonth={onNextMonth}
        onJumpToLatest={onJumpToLatest}
      />

      <div className="grid w-full gap-3 xl:min-h-[42rem] xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,1fr)] xl:items-stretch 2xl:min-h-[46rem] 2xl:grid-cols-[minmax(0,1.72fr)_minmax(24rem,1fr)] 2xl:gap-4">
        <AppPanel className="min-h-[24rem] min-w-0 overflow-hidden p-1.5 sm:p-2 xl:h-full xl:min-h-[42rem] 2xl:min-h-[46rem]">
          <CalendarMonthMap
            days={days}
            dateTools={dateTools}
            selectedDateKey={selectedDay?.dateKey ?? null}
            onSelectDay={onSelectDay}
          />
        </AppPanel>

        <CalendarDayFocus
          day={selectedDay}
          dateTools={dateTools}
          selectedTradeId={selectedTradeId}
          onSelectTrade={onSelectTrade}
          onOpenJournal={onOpenJournal}
        />
      </div>
    </>
  );
}
