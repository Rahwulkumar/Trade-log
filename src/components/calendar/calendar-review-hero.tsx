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
  REVIEW_MODE_COPY,
} from "./calendar-review-shared";

export function CalendarWorkspaceHero({
  mode,
  dateMode,
  monthLabel,
  timeZoneLabel,
  accountLabel,
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
  onModeChange: (mode: CalendarReviewMode) => void;
  onDateModeChange: (mode: CalendarDateMode) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onResetMonth: () => void;
}) {
  return (
    <AppPanel className="calendar-review-hero overflow-hidden p-0">
      <div className="calendar-review-hero-grid px-4 py-4 sm:gap-5 sm:px-6 sm:py-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="badge-accent rounded-full px-2.5 py-1">Calendar Review</span>
            <CalendarDayPill>{timeZoneLabel}</CalendarDayPill>
            <CalendarDayPill>{accountLabel}</CalendarDayPill>
          </div>

          <div className="space-y-2">
            <h1 className="headline-lg max-w-[18ch] sm:max-w-3xl">
              Review your trading month, day by day
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">
              {REVIEW_MODE_COPY[mode].subtitle}
            </p>
          </div>
        </div>

        <div
          className="calendar-review-hero-aside rounded-[24px] border p-3 sm:p-4"
          style={{
            background: "var(--surface-elevated)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPreviousMonth}
              aria-label="Go to previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1 text-center" aria-live="polite">
              <p className="mono text-sm font-semibold text-foreground">{monthLabel}</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                {REVIEW_MODE_COPY[mode].title}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNextMonth}
              aria-label="Go to next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={onResetMonth}>
            Jump to current month
          </Button>
        </div>
      </div>

      <div className="border-t border-border px-4 py-4 sm:px-6">
        <div className="calendar-review-toolbar-grid">
          <div className="space-y-2">
            <p className="text-label">Lens</p>
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

          <div className="space-y-2">
            <p className="text-label">Calendar basis</p>
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
