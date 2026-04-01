"use client";

import { BookCheck, ChevronLeft, ChevronRight, ShieldCheck, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/control-primitives";
import { AppMetricCard, AppPanel } from "@/components/ui/page-primitives";
import type { CalendarDateMode } from "@/lib/calendar/review";
import { cn } from "@/lib/utils";

import {
  CalendarDayPill,
  type CalendarReviewMode,
  type CalendarSummaryCard,
} from "./calendar-review-shared";

export function CalendarWorkspaceHero({
  mode,
  dateMode,
  monthLabel,
  timeZoneLabel,
  accountLabel,
  resetLabel,
  onModeChange,
  onDateModeChange,
  onPreviousMonth,
  onNextMonth,
  onResetMonth,
}: {
  mode: CalendarReviewMode;
  dateMode: CalendarDateMode;
  monthLabel: string;
  timeZoneLabel: string;
  accountLabel: string;
  resetLabel?: string;
  onModeChange: (mode: CalendarReviewMode) => void;
  onDateModeChange: (mode: CalendarDateMode) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onResetMonth: () => void;
}) {
  return (
    <AppPanel className="calendar-review-hero p-0">
      <div className="calendar-review-hero-grid px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="calendar-review-hero-topbar">
          <div className="calendar-review-hero-title-row">
            <h1 className="calendar-review-hero-title">Calendar review</h1>
            <CalendarDayPill>{timeZoneLabel}</CalendarDayPill>
            <CalendarDayPill>
              <span className="max-w-[10rem] truncate sm:max-w-[13rem]">
                {accountLabel}
              </span>
            </CalendarDayPill>
          </div>

          <div className="calendar-review-month-panel calendar-review-hero-aside px-3 py-2 sm:px-3.5">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onPreviousMonth}
                aria-label="Go to previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1" aria-live="polite">
                <p className="mono truncate text-sm font-semibold text-foreground">
                  {monthLabel}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onNextMonth}
                aria-label="Go to next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onResetMonth}
            >
              {resetLabel ?? "Current"}
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-4 py-2.5 sm:px-5 sm:py-3">
        <div className="calendar-review-toolbar-grid">
          <div className="calendar-review-toolbar-group">
            <div className="calendar-review-toolbar-label">Mode</div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              <ChoiceChip active={mode === "performance"} onClick={() => onModeChange("performance")}>
                <TrendingUp className="h-3.5 w-3.5" />
                Performance
              </ChoiceChip>
              <ChoiceChip active={mode === "review"} onClick={() => onModeChange("review")}>
                <BookCheck className="h-3.5 w-3.5" />
                Review
              </ChoiceChip>
              <ChoiceChip active={mode === "process"} onClick={() => onModeChange("process")}>
                <ShieldCheck className="h-3.5 w-3.5" />
                Process
              </ChoiceChip>
            </div>
          </div>

          <div className="calendar-review-toolbar-group">
            <div className="calendar-review-toolbar-label">Basis</div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              <ChoiceChip
                active={dateMode === "entry"}
                onClick={() => onDateModeChange("entry")}
                compact
              >
                Entry date
              </ChoiceChip>
              <ChoiceChip
                active={dateMode === "exit"}
                onClick={() => onDateModeChange("exit")}
                compact
              >
                Exit date
              </ChoiceChip>
            </div>
          </div>
        </div>
      </div>
    </AppPanel>
  );
}

export function CalendarSummaryStrip({
  cards,
  className,
}: {
  cards: CalendarSummaryCard[];
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden", className)}>
      <div className="calendar-review-summary-grid -mx-1 px-1 pb-1">
        {cards.map((card) => (
          <div key={card.label} className="calendar-review-summary-item">
            <AppMetricCard
              label={card.label}
              value={card.value}
              helper={card.helper}
              tone={card.tone}
              size="compact"
              shell="surface"
              monoValue
              className="h-full"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
