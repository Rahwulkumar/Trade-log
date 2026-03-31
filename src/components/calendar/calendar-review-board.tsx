"use client";

import { AppPanel, SectionHeader } from "@/components/ui/page-primitives";
import { WidgetEmptyState } from "@/components/ui/surface-primitives";
import type { CalendarDateTools, CalendarReviewDay } from "@/lib/calendar/review";
import { cn } from "@/lib/utils";

import {
  CalendarDayPill,
  CalendarLegendItem,
  getDayDisplay,
  getDaySelectionLabel,
  toneTextColor,
  type CalendarReviewMode,
  type CalendarTone,
} from "./calendar-review-shared";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const BOARD_LEGEND_ITEMS: Array<{ label: string; tone: CalendarTone }> = [
  { label: "Selected day", tone: "accent" },
  { label: "Profitable read", tone: "profit" },
  { label: "Needs attention", tone: "warning" },
  { label: "Process break", tone: "loss" },
];

function CalendarMonthCell({
  day,
  dateTools,
  mode,
  selected,
  onSelectDay,
}: {
  day: CalendarReviewDay;
  dateTools: CalendarDateTools;
  mode: CalendarReviewMode;
  selected: boolean;
  onSelectDay: (dateKey: string) => void;
}) {
  const display = getDayDisplay(mode, day);
  const isQuietDay = day.tradesCount === 0 && !day.dailyPlan;
  const bottomLabel =
    mode === "performance"
      ? `${day.tradesCount} trades`
      : mode === "review"
        ? `${day.needsReviewTrades} pending`
        : `${day.flaggedViolationsCount} flagged`;
  const sideLabel =
    mode === "performance"
      ? `${day.sessionsUsed.length || 0} sessions`
      : mode === "review"
        ? `${day.screenshotCount} shots`
        : day.flaggedViolationsCount > 0
          ? "Needs attention"
          : day.dailyPlan
            ? "Plan saved"
            : "No plan";

  return (
    <button
      type="button"
      onClick={() => onSelectDay(day.dateKey)}
      aria-pressed={selected}
      aria-label={getDaySelectionLabel(day, dateTools, mode)}
      className={cn(
        "relative flex min-h-[112px] flex-col gap-3 p-3.5 text-left transition-colors 2xl:min-h-[132px] 2xl:p-4",
        !day.inCurrentMonth &&
          "bg-[color-mix(in_srgb,var(--surface-elevated)_48%,transparent)]",
        day.inCurrentMonth &&
          "hover:bg-[color-mix(in_srgb,var(--surface-elevated)_20%,transparent)]",
        selected && "bg-[color-mix(in_srgb,var(--accent-soft)_68%,var(--surface))]",
      )}
      style={{
        boxShadow: selected ? "inset 0 0 0 1.5px var(--accent-primary)" : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-semibold",
              day.isToday && "bg-[var(--accent-primary)] text-white",
              !day.isToday && day.inCurrentMonth && "text-foreground",
              !day.isToday && !day.inCurrentMonth && "text-[var(--text-tertiary)]",
            )}
          >
            {dateTools.formatDayNumber(day.date)}
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            {dateTools.formatDayShortLabel(day.date)}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {day.dailyPlan ? (
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: "var(--accent-primary)" }}
              aria-label="Daily plan saved"
            />
          ) : null}
          {day.needsReviewTrades > 0 ? (
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: "var(--warning-primary)" }}
              aria-label="Review still needed"
            />
          ) : null}
          {day.flaggedViolationsCount > 0 ? (
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: "var(--loss-primary)" }}
              aria-label="Rule violations flagged"
            />
          ) : null}
        </div>
      </div>

      {day.inCurrentMonth ? (
        isQuietDay ? (
          <div className="mt-auto flex items-end justify-between gap-2">
            <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
              Quiet day
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              No activity
            </span>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <p
                className="mono text-[0.95rem] font-bold 2xl:text-[1rem]"
                style={{ color: toneTextColor(display.tone) }}
              >
                {display.primaryValue}
              </p>
              <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
                {display.secondaryValue}
              </p>
            </div>

            <div className="mt-auto flex items-end justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  Snapshot
                </p>
                <p className="line-clamp-1 text-[11px] text-[var(--text-secondary)]">
                  {display.narrative}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <CalendarDayPill tone={display.tone}>{bottomLabel}</CalendarDayPill>
                <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
                  {sideLabel}
                </span>
              </div>
            </div>
          </>
        )
      ) : null}
    </button>
  );
}

function CalendarAgendaItem({
  day,
  dateTools,
  mode,
  selected,
  onSelectDay,
}: {
  day: CalendarReviewDay;
  dateTools: CalendarDateTools;
  mode: CalendarReviewMode;
  selected: boolean;
  onSelectDay: (dateKey: string) => void;
}) {
  const display = getDayDisplay(mode, day);

  return (
    <button
      type="button"
      onClick={() => onSelectDay(day.dateKey)}
      aria-pressed={selected}
      aria-label={getDaySelectionLabel(day, dateTools, mode)}
      className={cn(
        "w-full rounded-[26px] border p-5 text-left transition-all hover:shadow-md sm:p-6",
        selected && "shadow-md",
      )}
      style={{
        background: "var(--surface)",
        borderColor: selected ? "var(--accent-primary)" : "var(--border-subtle)",
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            {dateTools.formatDayShortLabel(day.date)}
          </p>
          <p className="text-lg font-semibold text-foreground">
            {dateTools.formatDayNumber(day.date)}{" "}
            {dateTools.formatMonthLabel(day.date).split(" ")[0]}
          </p>
        </div>

        <div
          className="rounded-[20px] border px-4 py-3 shadow-sm"
          style={{
            background: "var(--surface-elevated)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div
            className="mono text-lg font-bold"
            style={{ color: toneTextColor(display.tone) }}
          >
            {display.primaryValue}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">
            {display.secondaryValue}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
        {display.narrative}
      </p>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {display.chips.map((chip, index) => (
          <CalendarDayPill
            key={`${day.dateKey}-${chip}`}
            tone={index === 0 ? display.tone : "default"}
          >
            {chip}
          </CalendarDayPill>
        ))}
      </div>
    </button>
  );
}

export function CalendarAgendaList({
  days,
  dateTools,
  mode,
  selectedDateKey,
  onSelectDay,
  className,
}: {
  days: CalendarReviewDay[];
  dateTools: CalendarDateTools;
  mode: CalendarReviewMode;
  selectedDateKey: string | null;
  onSelectDay: (dateKey: string) => void;
  className?: string;
}) {
  return (
    <AppPanel className={cn("overflow-hidden p-0", className)}>
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <SectionHeader
          className="mb-0"
          title="Day Agenda"
          subtitle="A roomy mobile-first list of active days before you drill into one."
        />
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        {days.length > 0 ? (
          days.map((day) => (
            <CalendarAgendaItem
              key={day.dateKey}
              day={day}
              dateTools={dateTools}
              mode={mode}
              selected={selectedDateKey === day.dateKey}
              onSelectDay={onSelectDay}
            />
          ))
        ) : (
          <WidgetEmptyState
            className="py-8"
            title={`No ${mode} activity yet`}
            description="This month does not have trades or plans for the current scope."
          />
        )}
      </div>
    </AppPanel>
  );
}

export function CalendarMonthBoard({
  days,
  dateTools,
  mode,
  selectedDay,
  selectedDateKey,
  onSelectDay,
  className,
}: {
  days: CalendarReviewDay[];
  dateTools: CalendarDateTools;
  mode: CalendarReviewMode;
  selectedDay: CalendarReviewDay | null;
  selectedDateKey: string | null;
  onSelectDay: (dateKey: string) => void;
  className?: string;
}) {
  const selectedDisplay = selectedDay ? getDayDisplay(mode, selectedDay) : null;

  return (
    <AppPanel className={cn("overflow-hidden p-0", className)}>
      <div className="border-b border-border px-5 py-5 sm:px-6">
        <SectionHeader
          className="mb-0"
          title="Month Board"
          subtitle="Scan the whole month quickly, then let the inspector carry the detail."
        />
      </div>

      <div className="border-b border-border bg-[var(--surface-elevated)] px-5 py-3 sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {BOARD_LEGEND_ITEMS.map((item) => (
              <CalendarLegendItem
                key={item.label}
                label={item.label}
                tone={item.tone}
              />
            ))}
            <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
              Click a cell to inspect the day.
            </span>
          </div>

          <div
            className="rounded-[18px] border px-4 py-3"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border-subtle)",
            }}
          >
            {selectedDay && selectedDisplay ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-sm font-semibold text-foreground">
                  {dateTools.formatLongDate(selectedDay.date)}
                </span>
                <CalendarDayPill tone={selectedDisplay.tone}>
                  {selectedDisplay.primaryValue}
                </CalendarDayPill>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {selectedDisplay.secondaryValue}
                </span>
              </div>
            ) : (
              <span className="text-sm text-[var(--text-secondary)]">
                Pick any day to inspect it on the right.
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[780px] 2xl:min-w-[860px]">
          <div className="grid grid-cols-7 border-b border-border bg-[var(--surface-elevated)]">
            {WEEKDAY_LABELS.map((weekday) => (
              <div
                key={weekday}
                className="py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]"
              >
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-border">
            {days.map((day) => (
              <CalendarMonthCell
                key={day.dateKey}
                day={day}
                dateTools={dateTools}
                mode={mode}
                selected={selectedDateKey === day.dateKey}
                onSelectDay={onSelectDay}
              />
            ))}
          </div>
        </div>
      </div>
    </AppPanel>
  );
}
