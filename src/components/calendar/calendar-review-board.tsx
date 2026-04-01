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

function getMonthCellSummary(
  day: CalendarReviewDay,
  mode: CalendarReviewMode,
): {
  value: string;
  eyebrow: string;
  caption: string | null;
  metrics: string[];
  tone: CalendarTone;
} {
  const display = getDayDisplay(mode, day);

  if (mode === "performance") {
    return {
      value: display.primaryValue,
      eyebrow: `${day.tradesCount} trades`,
      caption:
        day.winningTrades > 0
          ? `${day.winningTrades} wins`
          : day.losingTrades > 0
            ? `${day.losingTrades} losses`
            : day.tradesCount > 0
              ? "Flat day"
              : null,
      metrics: [
        day.sessionsUsed.length > 0 ? `${day.sessionsUsed.length} sessions` : "No session",
        day.screenshotCount > 0 ? `${day.screenshotCount} shots` : "No shots",
      ],
      tone: display.tone,
    };
  }

  if (mode === "review") {
    if (day.reviewableTrades === 0) {
      return {
        value: day.tradesCount > 0 ? "Open" : "Quiet",
        eyebrow: day.tradesCount > 0 ? `${day.tradesCount} trades` : "No activity",
        caption: day.tradesCount > 0 ? "No closed trades yet" : null,
        metrics: [
          day.setupAssignedTrades > 0
            ? `${day.setupAssignedTrades} setups`
            : "No setups",
          day.screenshotCount > 0 ? `${day.screenshotCount} shots` : "No shots",
        ],
        tone: "default",
      };
    }

    if (day.needsReviewTrades > 0) {
      return {
        value: display.primaryValue,
        eyebrow: `${day.reviewedTrades}/${day.reviewableTrades} done`,
        caption: `${day.needsReviewTrades} still pending`,
        metrics: [
          `${day.setupAssignedTrades} setups`,
          day.screenshotCount > 0 ? `${day.screenshotCount} shots` : "No shots",
        ],
        tone: "warning",
      };
    }

    return {
      value: display.primaryValue,
      eyebrow: `${day.reviewableTrades} reviewed`,
      caption: "Review complete",
      metrics: [
        `${day.setupAssignedTrades} setups`,
        day.screenshotCount > 0 ? `${day.screenshotCount} shots` : "No shots",
      ],
      tone: "profit",
    };
  }

  if (!day.dailyPlan && day.tradesCount === 0) {
    return {
      value: "Quiet",
      eyebrow: "No process data",
      caption: null,
      metrics: [],
      tone: "default",
    };
  }

  if (day.flaggedViolationsCount > 0) {
    return {
      value: `${day.flaggedViolationsCount}`,
      eyebrow: "Rule flags",
      caption: `${day.brokenRules} broken`,
      metrics: [
        `${day.followedRules} followed`,
        day.dailyPlan ? "Plan saved" : "No plan",
      ],
      tone: "loss",
    };
  }

  if (day.dailyPlan) {
    return {
      value: day.dailyPlan.dayGrade ?? "Plan",
      eyebrow: day.dailyPlan.dayGrade ? "Day grade" : "Plan saved",
      caption: `${day.followedRules} followed`,
      metrics: [
        `${day.tradesCount} trades`,
        day.brokenRules > 0 ? `${day.brokenRules} broken` : "No breaks",
      ],
      tone: day.dailyPlan.dayGrade === "A" ? "profit" : "accent",
    };
  }

  return {
    value: "No plan",
    eyebrow: `${day.tradesCount} trades`,
    caption: "Unplanned day",
    metrics: [
      day.brokenRules > 0 ? `${day.brokenRules} broken` : "No breaks",
      `${day.followedRules} followed`,
    ],
    tone: "warning",
  };
}

function getMonthCellSurfaceStyle(
  tone: CalendarTone,
  selected: boolean,
  inCurrentMonth: boolean,
  quiet: boolean,
) {
  if (selected) {
    return {
      background: "color-mix(in_srgb,var(--accent-soft)_72%,var(--surface))",
      boxShadow: "inset 0 0 0 1.5px var(--accent-primary)",
    };
  }

  if (!inCurrentMonth) {
    return {
      background: "color-mix(in_srgb,var(--surface-elevated)_48%,transparent)",
      boxShadow: undefined,
    };
  }

  if (quiet) {
    return {
      background: "var(--surface)",
      boxShadow: undefined,
    };
  }

  if (tone === "profit") {
    return {
      background: "color-mix(in_srgb,var(--profit-bg)_70%,var(--surface))",
      boxShadow: undefined,
    };
  }

  if (tone === "loss") {
    return {
      background: "color-mix(in_srgb,var(--loss-bg)_68%,var(--surface))",
      boxShadow: undefined,
    };
  }

  if (tone === "warning") {
    return {
      background: "color-mix(in_srgb,var(--warning-bg)_74%,var(--surface))",
      boxShadow: undefined,
    };
  }

  if (tone === "accent") {
    return {
      background: "color-mix(in_srgb,var(--accent-soft)_66%,var(--surface))",
      boxShadow: undefined,
    };
  }

  return {
    background: "var(--surface)",
    boxShadow: undefined,
  };
}

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
  const summary = getMonthCellSummary(day, mode);
  const isQuietDay = day.tradesCount === 0 && !day.dailyPlan;
  const surfaceStyle = getMonthCellSurfaceStyle(
    summary.tone,
    selected,
    day.inCurrentMonth,
    isQuietDay,
  );

  return (
    <button
      type="button"
      onClick={() => onSelectDay(day.dateKey)}
      aria-pressed={selected}
      aria-label={getDaySelectionLabel(day, dateTools, mode)}
      className={cn(
        "calendar-review-month-cell relative flex min-h-[104px] flex-col gap-3 p-3 text-left transition-colors 2xl:min-h-[120px] 2xl:p-3.5",
        day.inCurrentMonth &&
          "hover:bg-[color-mix(in_srgb,var(--surface-elevated)_20%,transparent)]",
      )}
      style={surfaceStyle}
    >
      <div className="calendar-review-month-dayhead">
        <div>
          <span
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-[0.95rem] font-semibold",
              day.isToday && "bg-[var(--accent-primary)] text-white",
              !day.isToday && day.inCurrentMonth && "text-foreground",
              !day.isToday && !day.inCurrentMonth && "text-[var(--text-tertiary)]",
            )}
          >
            {dateTools.formatDayNumber(day.date)}
          </span>
        </div>

        <div className="calendar-review-month-indicators">
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
          <div className="calendar-review-month-core">
            <div className="calendar-review-month-center">
              <p className="calendar-review-month-label">Quiet day</p>
              <p className="calendar-review-month-meta">No trading activity</p>
            </div>
          </div>
        ) : (
          <div className="calendar-review-month-core">
            <div className="calendar-review-month-center">
              <p
                className="calendar-review-month-label"
                style={{ color: toneTextColor(summary.tone) }}
              >
                {summary.eyebrow}
              </p>
              <p
                className="calendar-review-month-value mono font-bold"
                style={{ color: toneTextColor(display.tone) }}
              >
                {summary.value}
              </p>
              {summary.caption ? (
                <p className="calendar-review-month-meta">{summary.caption}</p>
              ) : null}
            </div>

            {summary.metrics.length > 0 ? (
              <div className="calendar-review-month-footer">
                {summary.metrics.map((metric) => (
                  <span key={`${day.dateKey}-${metric}`} className="calendar-review-month-metric">
                    {metric}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
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
        <div className="calendar-review-board-toolbar">
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
        <div className="calendar-review-board-grid">
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
