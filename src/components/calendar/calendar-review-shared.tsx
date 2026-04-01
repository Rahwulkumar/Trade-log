"use client";

import type { ReactNode } from "react";

import { SectionHeader } from "@/components/ui/page-primitives";
import type {
  CalendarDateTools,
  CalendarReviewDay,
  CalendarReviewMonthSummary,
} from "@/lib/calendar/review";

export type CalendarReviewMode = "performance" | "review" | "process";

export type CalendarTone = "default" | "profit" | "loss" | "warning" | "accent";

export interface CalendarSummaryCard {
  label: string;
  value: string;
  helper: string;
  tone: CalendarTone;
}

export const REVIEW_MODE_COPY: Record<
  CalendarReviewMode,
  {
    title: string;
    subtitle: string;
  }
> = {
  performance: {
    title: "Performance",
    subtitle: "See results, active days, and session flow across the month.",
  },
  review: {
    title: "Review",
    subtitle: "See which days are fully reviewed and which trades still need follow-up.",
  },
  process: {
    title: "Process",
    subtitle: "Track plans, grades, and rule discipline across the days you traded.",
  },
};

export type DayDisplay = {
  primaryValue: string;
  secondaryValue: string;
  narrative: string;
  chips: string[];
  tone: CalendarTone;
};

export function formatMoney(value: number, maximumFractionDigits = 0) {
  return Math.abs(value).toLocaleString(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits > 0 ? 2 : 0,
  });
}

export function formatSignedMoney(value: number, maximumFractionDigits = 0) {
  return `${value >= 0 ? "+" : "-"}$${formatMoney(value, maximumFractionDigits)}`;
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function getPnlTone(value: number): CalendarTone {
  if (value > 0) return "profit";
  if (value < 0) return "loss";
  return "default";
}

export function getGradeTone(grade: string | null): CalendarTone {
  if (grade === "A") return "profit";
  if (grade === "B") return "accent";
  if (grade === "C") return "default";
  if (grade) return "loss";
  return "default";
}

export function getSelectedDayTone(
  mode: CalendarReviewMode,
  day: CalendarReviewDay,
): CalendarTone {
  if (mode === "performance") {
    return getPnlTone(day.totalPnl);
  }
  if (mode === "review") {
    if (day.reviewableTrades === 0) return "default";
    return day.needsReviewTrades > 0 ? "warning" : "profit";
  }
  if (day.flaggedViolationsCount > 0) {
    return "loss";
  }
  if (!day.dailyPlan && day.tradesCount > 0) {
    return "warning";
  }
  if (day.brokenRules > 0) {
    return "loss";
  }
  if (day.dailyPlan) {
    return "accent";
  }
  return "default";
}

export function pickPreferredDay(days: CalendarReviewDay[]) {
  const currentMonthDays = days.filter((day) => day.inCurrentMonth);
  return (
    currentMonthDays.find((day) => day.isToday) ??
    currentMonthDays.find((day) => day.tradesCount > 0 || day.dailyPlan) ??
    currentMonthDays[0] ??
    null
  );
}

export function modeSummaryCards(
  mode: CalendarReviewMode,
  summary: CalendarReviewMonthSummary,
  dateTools: CalendarDateTools,
): CalendarSummaryCard[] {
  if (mode === "performance") {
    return [
      {
        label: "Net P&L",
        value: formatSignedMoney(summary.totalPnl, 2),
        helper: `${summary.activeTradingDays} active days this month`,
        tone: getPnlTone(summary.totalPnl),
      },
      {
        label: "Total Trades",
        value: String(summary.totalTrades),
        helper: `${summary.winningDays} green days / ${summary.losingDays} red days`,
        tone: "default",
      },
      {
        label: "Best Day",
        value: summary.bestDay
          ? formatSignedMoney(summary.bestDay.totalPnl, 2)
          : "$0.00",
        helper: summary.bestDay
          ? dateTools.formatLongDate(summary.bestDay.date)
          : "No active days yet",
        tone: summary.bestDay ? getPnlTone(summary.bestDay.totalPnl) : "default",
      },
      {
        label: "Worst Day",
        value: summary.worstDay
          ? formatSignedMoney(summary.worstDay.totalPnl, 2)
          : "$0.00",
        helper: summary.worstDay
          ? dateTools.formatLongDate(summary.worstDay.date)
          : "No active days yet",
        tone: summary.worstDay ? getPnlTone(summary.worstDay.totalPnl) : "default",
      },
    ];
  }

  if (mode === "review") {
    const setupCoverage =
      summary.totalTrades > 0
        ? (summary.setupAssignedTrades / summary.totalTrades) * 100
        : 0;
    const templateCoverage =
      summary.totalTrades > 0
        ? (summary.templateAssignedTrades / summary.totalTrades) * 100
        : 0;

    return [
      {
        label: "Reviewed",
        value: formatPercent(summary.reviewedPercent),
        helper: `${summary.reviewedTrades} of ${summary.reviewableTrades} closed trades`,
        tone: summary.needsReviewTrades > 0 ? "warning" : "profit",
      },
      {
        label: "Needs Review",
        value: String(summary.needsReviewTrades),
        helper: `${summary.reviewGapDays} days still have unfinished review`,
        tone: summary.needsReviewTrades > 0 ? "warning" : "default",
      },
      {
        label: "Setup Coverage",
        value: formatPercent(setupCoverage),
        helper: `${summary.setupAssignedTrades} structured trades tagged with a setup`,
        tone: setupCoverage >= 70 ? "profit" : "default",
      },
      {
        label: "Screenshot Days",
        value: String(summary.screenshotDays),
        helper: `Template coverage ${formatPercent(templateCoverage)}`,
        tone: summary.screenshotDays > 0 ? "accent" : "default",
      },
    ];
  }

  return [
    {
      label: "Planned Days",
      value: String(summary.plannedDays),
      helper: `${summary.gradedDays} days already graded`,
      tone: summary.plannedDays > 0 ? "accent" : "default",
    },
    {
      label: "Rule Adherence",
      value: formatPercent(summary.ruleAdherencePercent),
      helper: `${summary.followedRules} followed / ${summary.brokenRules} broken`,
      tone:
        summary.brokenRules > 0
          ? "warning"
          : summary.followedRules > 0
            ? "profit"
            : "default",
    },
    {
      label: "Review Gaps",
      value: String(summary.reviewGapDays),
      helper: `${summary.needsReviewTrades} trades still need closeout`,
      tone: summary.reviewGapDays > 0 ? "warning" : "default",
    },
    {
      label: "Flagged Days",
      value: String(summary.flaggedViolationDays),
      helper: `${summary.violatedGlobalRules} global and ${summary.violatedDailyRules} daily rule flags`,
      tone: summary.flaggedViolationDays > 0 ? "loss" : "default",
    },
  ];
}

export function getDayDisplay(
  mode: CalendarReviewMode,
  day: CalendarReviewDay,
): DayDisplay {
  const reviewPercent =
    day.reviewableTrades > 0
      ? Math.round((day.reviewedTrades / day.reviewableTrades) * 100)
      : 0;

  if (mode === "performance") {
    return {
      primaryValue: day.tradesCount > 0 ? formatSignedMoney(day.totalPnl, 2) : "$0.00",
      secondaryValue:
        day.tradesCount > 0
          ? `${day.tradesCount} trades - ${day.winningTrades} wins`
          : "No trading activity",
      narrative:
        day.tradesCount > 0
          ? `${day.sessionsUsed.length || 1} active sessions and ${day.screenshotCount} screenshots saved for the day.`
          : "Nothing was logged on this date in the active month basis.",
      chips: [
        `${day.tradesCount} trades`,
        `${day.sessionsUsed.length || 0} sessions`,
        `${day.screenshotCount} shots`,
      ],
      tone: getPnlTone(day.totalPnl),
    };
  }

  if (mode === "review") {
    return {
      primaryValue:
        day.reviewableTrades > 0
          ? `${reviewPercent}%`
          : day.dailyPlan
            ? "Plan only"
            : day.tradesCount > 0
              ? "Open only"
              : "Quiet",
      secondaryValue:
        day.reviewableTrades > 0
          ? `${day.reviewedTrades}/${day.reviewableTrades} closed trades reviewed`
          : "No closed trades to score",
      narrative:
        day.reviewableTrades > 0
          ? `${day.needsReviewTrades} trades still need closeout, screenshots, or structure.`
          : day.dailyPlan
            ? "The day has plan context, but no closed trades need journal completion."
            : "This date has no reviewable closed trade activity yet.",
      chips: [
        `${day.needsReviewTrades} pending`,
        `${day.setupAssignedTrades} setups`,
        `${day.screenshotCount} shots`,
      ],
      tone:
        day.reviewableTrades === 0
          ? "default"
          : day.needsReviewTrades > 0
            ? "warning"
            : "profit",
    };
  }

  return {
    primaryValue:
      day.dailyPlan?.dayGrade ?? (day.dailyPlan ? "Planned" : "No plan"),
    secondaryValue:
      day.flaggedViolationsCount > 0
        ? `${day.flaggedViolationsCount} flagged rule violations`
        : day.dailyPlan
          ? `${day.brokenRules} broken - ${day.followedRules} followed`
          : day.tradesCount > 0
            ? "Trades were taken without a saved plan"
            : "No plan or trading activity",
    narrative:
      day.flaggedViolationsCount > 0
        ? `${day.violatedGlobalRules.length} global and ${day.violatedDailyRules.length} day-level rules were flagged from the trades on this date.`
        : day.tradesCount > 0
          ? day.dailyPlan
            ? `${day.dailyPlan.playbookName ?? "No linked strategy"} was the working plan for the day.`
            : "Process mode focuses on whether you planned the day and how the rules were handled."
          : "No plan or trading activity.",
    chips: [
      `${day.followedRules} followed`,
      `${day.flaggedViolationsCount} flagged`,
      `${day.needsReviewTrades} gaps`,
    ],
    tone: getSelectedDayTone(mode, day),
  };
}

export function toneTextColor(tone: CalendarTone) {
  if (tone === "profit") return "var(--profit-primary)";
  if (tone === "loss") return "var(--loss-primary)";
  if (tone === "warning") return "var(--warning-primary)";
  if (tone === "accent") return "var(--accent-primary)";
  return "var(--text-primary)";
}

export function getDaySelectionLabel(
  day: CalendarReviewDay,
  dateTools: CalendarDateTools,
  mode: CalendarReviewMode,
) {
  const display = getDayDisplay(mode, day);
  return `${dateTools.formatLongDate(day.date)}. ${display.primaryValue}. ${display.secondaryValue}.`;
}

export function CalendarDayPill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: CalendarTone;
}) {
  const styles =
    tone === "profit"
      ? {
          background: "var(--profit-bg)",
          borderColor:
            "color-mix(in srgb, var(--profit-primary) 24%, transparent)",
          color: "var(--profit-primary)",
        }
      : tone === "loss"
        ? {
            background: "var(--loss-bg)",
            borderColor:
              "color-mix(in srgb, var(--loss-primary) 24%, transparent)",
            color: "var(--loss-primary)",
          }
        : tone === "warning"
          ? {
              background: "var(--warning-bg)",
              borderColor:
                "color-mix(in srgb, var(--warning-primary) 24%, transparent)",
              color: "var(--warning-primary)",
            }
          : tone === "accent"
            ? {
                background: "var(--accent-soft)",
                borderColor: "var(--accent-muted)",
                color: "var(--accent-primary)",
              }
            : {
                background: "var(--surface-elevated)",
                borderColor: "var(--border-subtle)",
                color: "var(--text-secondary)",
              };

  return (
    <span
      className="inline-flex max-w-full items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold"
      style={styles}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

export function CalendarLegendItem({
  label,
  tone = "default",
}: {
  label: string;
  tone?: CalendarTone;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-medium text-[var(--text-secondary)]">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: toneTextColor(tone) }}
      />
      {label}
    </span>
  );
}

export function CalendarInspectorSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="calendar-review-inspector-section space-y-4 p-4 sm:p-5">
      <SectionHeader className="mb-0" title={title} subtitle={subtitle} />
      {children}
    </section>
  );
}

function CalendarCompactStat({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: CalendarTone;
}) {
  return (
    <div className="calendar-review-stat-item">
      <div className="calendar-review-mini-stat">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
          {label}
        </p>
        <p
          className="mono mt-2 text-[1rem] font-semibold"
          style={{ color: toneTextColor(tone) }}
        >
          {value}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
          {helper}
        </p>
      </div>
    </div>
  );
}

export function CalendarCompactStatStrip({
  stats,
}: {
  stats: Array<{
    label: string;
    value: string;
    helper: string;
    tone?: CalendarTone;
  }>;
}) {
  return (
    <div className="calendar-review-stat-strip -mx-1 px-1 pb-1">
      {stats.map((stat) => (
        <CalendarCompactStat
          key={stat.label}
          label={stat.label}
          value={stat.value}
          helper={stat.helper}
          tone={stat.tone}
        />
      ))}
    </div>
  );
}

export function CalendarMiniStat({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: CalendarTone;
}) {
  return (
    <div className="calendar-review-mini-stat">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
        {label}
      </p>
      <p
        className="mono mt-2 text-sm font-semibold"
        style={{ color: toneTextColor(tone) }}
      >
        {value}
      </p>
      {helper ? (
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
