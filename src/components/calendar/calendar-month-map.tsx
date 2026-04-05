"use client";

import { useMemo } from "react";

import { formatSignedPnl } from "@/components/calendar/calendar-shared";
import { cn } from "@/lib/utils";
import type { CalendarDateTools, CalendarReviewDay } from "@/lib/calendar/review";

const WEEKDAY_LABELS = [
  { compact: "M", full: "Mon" },
  { compact: "T", full: "Tue" },
  { compact: "W", full: "Wed" },
  { compact: "T", full: "Thu" },
  { compact: "F", full: "Fri" },
  { compact: "S", full: "Sat" },
  { compact: "S", full: "Sun" },
] as const;

function getDayTone(day: CalendarReviewDay, selected: boolean, maxAbsPnl: number) {
  if (day.totalPnl > 0) {
    const intensity = maxAbsPnl > 0 ? Math.min(day.totalPnl / maxAbsPnl, 1) : 0.5;
    const tint = 10 + Math.round(intensity * 14);
    return {
      background: selected
        ? `color-mix(in srgb, var(--profit-primary) ${tint + 8}%, var(--surface))`
        : `color-mix(in srgb, var(--profit-primary) ${tint}%, var(--surface))`,
      borderColor: selected
        ? "var(--profit-primary)"
        : `color-mix(in srgb, var(--profit-primary) ${14 + Math.round(intensity * 12)}%, var(--border-subtle))`,
      valueColor: "var(--profit-primary)",
    };
  }

  if (day.totalPnl < 0) {
    const intensity = maxAbsPnl > 0 ? Math.min(Math.abs(day.totalPnl) / maxAbsPnl, 1) : 0.5;
    const tint = 10 + Math.round(intensity * 14);
    return {
      background: selected
        ? `color-mix(in srgb, var(--loss-primary) ${tint + 8}%, var(--surface))`
        : `color-mix(in srgb, var(--loss-primary) ${tint}%, var(--surface))`,
      borderColor: selected
        ? "var(--loss-primary)"
        : `color-mix(in srgb, var(--loss-primary) ${14 + Math.round(intensity * 12)}%, var(--border-subtle))`,
      valueColor: "var(--loss-primary)",
    };
  }

  if (day.tradesCount > 0) {
    return {
      background: selected
        ? "color-mix(in srgb, var(--surface-elevated) 86%, var(--accent-soft))"
        : "var(--surface-elevated)",
      borderColor: selected ? "var(--accent-primary)" : "var(--border-default)",
      valueColor: "var(--text-primary)",
    };
  }

  return {
    background: selected
      ? "color-mix(in srgb, var(--surface) 84%, var(--accent-soft))"
      : "var(--surface)",
    borderColor: selected ? "var(--accent-primary)" : "var(--border-subtle)",
    valueColor: "var(--text-tertiary)",
  };
}

function DayDots({ day }: { day: CalendarReviewDay }) {
  const dots = [
    day.needsReviewTrades > 0 ? "var(--warning-primary)" : null,
    day.flaggedViolationsCount > 0 ? "var(--loss-primary)" : null,
  ].filter(Boolean) as string[];

  if (dots.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {dots.map((color, index) => (
        <span
          key={`${color}-${index}`}
          className="h-1 w-1 rounded-full"
          style={{ background: color }}
        />
      ))}
    </div>
  );
}

function DayCell({
  day,
  dateTools,
  selected,
  maxAbsPnl,
  onSelect,
}: {
  day: CalendarReviewDay;
  dateTools: CalendarDateTools;
  selected: boolean;
  maxAbsPnl: number;
  onSelect: () => void;
}) {
  const tone = getDayTone(day, selected, maxAbsPnl);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={dateTools.formatLongDate(day.date)}
      className={cn(
        "flex h-[3.85rem] flex-col rounded-[8px] border px-1.5 py-1.5 text-left transition-colors sm:h-[4.2rem] sm:rounded-[10px] sm:px-1.75 sm:py-1.75 lg:h-[4.4rem] xl:h-full 2xl:h-full",
        !day.inCurrentMonth && "opacity-35",
      )}
      style={{
        background: tone.background,
        borderColor: tone.borderColor,
        boxShadow: selected ? "var(--shadow-sm)" : "none",
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className="text-[0.64rem] font-semibold tracking-[-0.03em] sm:text-[0.68rem]"
          style={{
            color: day.isToday
              ? "var(--accent-primary)"
              : day.inCurrentMonth
                ? "var(--text-primary)"
                : "var(--text-tertiary)",
          }}
        >
          {dateTools.formatDayNumber(day.date)}
        </span>
        <DayDots day={day} />
      </div>

      {day.tradesCount > 0 ? (
        <div className="mt-auto space-y-0.5">
          <p
            className="truncate text-[0.66rem] font-semibold tracking-[-0.03em] sm:text-[0.74rem] xl:text-[0.72rem]"
            style={{ color: tone.valueColor }}
          >
            {formatSignedPnl(day.totalPnl)}
          </p>
          <div className="flex items-center justify-between gap-2 text-[0.52rem] text-[var(--text-secondary)] sm:text-[0.56rem]">
            <span>{day.tradesCount}t</span>
            {day.reviewableTrades > 0 ? (
              <span
                style={{
                  color:
                    day.reviewedTrades < day.reviewableTrades
                      ? "var(--warning-primary)"
                      : "var(--text-tertiary)",
                }}
              >
                {day.reviewedTrades}/{day.reviewableTrades}r
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </button>
  );
}

interface CalendarMonthMapProps {
  days: CalendarReviewDay[];
  dateTools: CalendarDateTools;
  selectedDateKey: string | null;
  onSelectDay: (dateKey: string) => void;
}

export function CalendarMonthMap({
  days,
  dateTools,
  selectedDateKey,
  onSelectDay,
}: CalendarMonthMapProps) {
  const rowCount = Math.max(Math.ceil(days.length / 7), 1);
  const maxAbsPnl = useMemo(
    () =>
      Math.max(
        ...days.filter((day) => day.inCurrentMonth).map((day) => Math.abs(day.totalPnl)),
        1,
      ),
    [days],
  );

  return (
    <div className="w-full space-y-1.5 xl:flex xl:h-full xl:flex-col">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-label">Month map</p>
      </div>

      <div className="overflow-x-auto pb-1 md:overflow-visible xl:min-h-0 xl:flex-1 xl:pb-0">
        <div className="min-w-[26rem] sm:min-w-[34rem] md:min-w-0 md:w-full xl:flex xl:h-full xl:flex-col">
          <div className="grid w-full grid-cols-7 gap-0.75 sm:gap-1">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label.full}
                className="px-0.5 pb-0.5 text-center text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)] sm:text-[0.56rem]"
              >
                <span className="sm:hidden">{label.compact}</span>
                <span className="hidden sm:inline">{label.full}</span>
              </div>
            ))}
          </div>

          <div
            className="grid w-full grid-cols-7 gap-0.75 sm:gap-1 xl:h-full xl:flex-1"
            style={{
              gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
            }}
          >
            {days.map((day) => (
              <DayCell
                key={day.dateKey}
                day={day}
                dateTools={dateTools}
                selected={day.dateKey === selectedDateKey}
                maxAbsPnl={maxAbsPnl}
                onSelect={() => onSelectDay(day.dateKey)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
