"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppPanel } from "@/components/ui/page-primitives";
import { InsetPanel, WidgetEmptyState } from "@/components/ui/surface-primitives";
import type {
  CalendarDateTools,
  CalendarReviewDay,
  CalendarReviewPlan,
  CalendarReviewTrade,
} from "@/lib/calendar/review";
import { cn } from "@/lib/utils";

import {
  CalendarCompactStatStrip,
  CalendarDayPill,
  CalendarInspectorSection,
  formatMoney,
  formatSignedMoney,
  getDayDisplay,
  getGradeTone,
  getPnlTone,
  getSelectedDayTone,
  type CalendarReviewMode,
} from "./calendar-review-shared";

function CalendarPlanSummary({ plan }: { plan: CalendarReviewPlan | null }) {
  if (!plan) {
    return (
      <WidgetEmptyState
        className="py-8"
        icon={<ClipboardCheck className="h-5 w-5" />}
        title="No daily plan logged"
        description="This day has no saved pre-market plan or closeout note yet."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <InsetPanel paddingClassName="px-4 py-4">
          <p className="text-label mb-1">Bias</p>
          <p className="text-sm font-semibold text-foreground">{plan.bias ?? "Not set"}</p>
        </InsetPanel>
        <InsetPanel paddingClassName="px-4 py-4">
          <p className="text-label mb-1">Strategy</p>
          <p className="text-sm font-semibold text-foreground">
            {plan.playbookName ?? "No linked playbook"}
          </p>
        </InsetPanel>
        <InsetPanel paddingClassName="px-4 py-4">
          <p className="text-label mb-1">Max Trades</p>
          <p className="mono text-sm font-semibold text-foreground">
            {plan.maxTrades ?? "--"}
          </p>
        </InsetPanel>
        <InsetPanel paddingClassName="px-4 py-4">
          <p className="text-label mb-1">Daily Limit</p>
          <p className="mono text-sm font-semibold text-foreground">
            {plan.dailyLimit != null ? `$${formatMoney(plan.dailyLimit, 2)}` : "--"}
          </p>
        </InsetPanel>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <InsetPanel paddingClassName="px-4 py-4">
          <p className="text-label mb-1">Universal Checks</p>
          <p className="mono text-sm font-semibold text-foreground">
            {plan.universalRulesChecked.length}
          </p>
        </InsetPanel>
        <InsetPanel paddingClassName="px-4 py-4">
          <p className="text-label mb-1">Strategy Checks</p>
          <p className="mono text-sm font-semibold text-foreground">
            {plan.strategyRulesChecked.length}
          </p>
        </InsetPanel>
        <InsetPanel tone={getGradeTone(plan.dayGrade)} paddingClassName="px-4 py-4">
          <p className="text-label mb-1">Day Grade</p>
          <p className="mono text-sm font-semibold text-foreground">
            {plan.dayGrade ?? "--"}
          </p>
        </InsetPanel>
      </div>

      {plan.preNote ? (
        <InsetPanel paddingClassName="px-4 py-4">
          <p className="text-label mb-1">Pre-Market Note</p>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {plan.preNote}
          </p>
        </InsetPanel>
      ) : null}

      {(plan.wentWell || plan.wentWrong) ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <InsetPanel paddingClassName="px-4 py-4">
            <p className="text-label mb-1">Went Well</p>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {plan.wentWell || "No note yet."}
            </p>
          </InsetPanel>
          <InsetPanel paddingClassName="px-4 py-4">
            <p className="text-label mb-1">Went Wrong</p>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {plan.wentWrong || "No note yet."}
            </p>
          </InsetPanel>
        </div>
      ) : null}
    </div>
  );
}

function CalendarRuleFlagSummary({ day }: { day: CalendarReviewDay }) {
  const hasTrackedRules =
    day.globalRulesTracked.length > 0 ||
    day.dailyRulesTracked.length > 0 ||
    day.planViolationLabels.length > 0;

  if (!hasTrackedRules) {
    return (
      <WidgetEmptyState
        className="py-8"
        icon={<ShieldCheck className="h-5 w-5" />}
        title="No tracked rules for this day"
        description="Add global rules in Settings or mark day rules in the daily plan to start flagging violations here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <InsetPanel
          tone={day.violatedGlobalRules.length > 0 ? "loss" : "accent"}
          paddingClassName="px-4 py-4"
        >
          <p className="text-label mb-1">Global Rules Flagged</p>
          <p className="mono text-sm font-semibold text-foreground">
            {day.violatedGlobalRules.length}/{day.globalRulesTracked.length}
          </p>
        </InsetPanel>
        <InsetPanel
          tone={day.violatedDailyRules.length > 0 ? "loss" : "accent"}
          paddingClassName="px-4 py-4"
        >
          <p className="text-label mb-1">Day Rules Flagged</p>
          <p className="mono text-sm font-semibold text-foreground">
            {day.violatedDailyRules.length}/{day.dailyRulesTracked.length}
          </p>
        </InsetPanel>
      </div>

      <div className="space-y-3">
        {day.planViolationLabels.length > 0 ? (
          <div>
            <p className="text-label mb-2">Automatic Day Flags</p>
            <div className="flex flex-wrap gap-2">
              {day.planViolationLabels.map((rule) => (
                <CalendarDayPill key={`plan-${rule}`} tone="loss">
                  {rule}
                </CalendarDayPill>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <p className="text-label mb-2">Global Rule Flags</p>
          <div className="flex flex-wrap gap-2">
            {day.globalRulesTracked.length > 0 ? (
              day.globalRulesTracked.map((rule) => (
                <CalendarDayPill
                  key={`global-${rule}`}
                  tone={day.violatedGlobalRules.includes(rule) ? "loss" : "default"}
                >
                  {rule}
                </CalendarDayPill>
              ))
            ) : (
              <span className="text-sm text-[var(--text-tertiary)]">
                No global rules were active on this day.
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="text-label mb-2">Daily Rule Flags</p>
          <div className="flex flex-wrap gap-2">
            {day.dailyRulesTracked.length > 0 ? (
              day.dailyRulesTracked.map((rule) => (
                <CalendarDayPill
                  key={`daily-${rule}`}
                  tone={day.violatedDailyRules.includes(rule) ? "loss" : "default"}
                >
                  {rule}
                </CalendarDayPill>
              ))
            ) : (
              <span className="text-sm text-[var(--text-tertiary)]">
                No day-specific rules were checked in the daily plan.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarTradeRowLeading({ trade }: { trade: CalendarReviewTrade }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl border",
          trade.pnl >= 0
            ? "border-[color-mix(in_srgb,var(--profit-primary)_24%,transparent)] bg-[var(--profit-bg)] text-[var(--profit-primary)]"
            : "border-[color-mix(in_srgb,var(--loss-primary)_24%,transparent)] bg-[var(--loss-bg)] text-[var(--loss-primary)]",
        )}
      >
        {trade.pnl >= 0 ? (
          <TrendingUp className="h-5 w-5" />
        ) : (
          <TrendingDown className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/journal?trade=${trade.id}`}
            className="mono text-sm font-semibold text-foreground hover:underline"
          >
            {trade.symbol}
          </Link>
          <CalendarDayPill tone={trade.direction === "LONG" ? "profit" : "loss"}>
            {trade.direction}
          </CalendarDayPill>
          <CalendarDayPill tone={trade.reviewed ? "profit" : "warning"}>
            {trade.reviewed ? "Reviewed" : "Needs review"}
          </CalendarDayPill>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <span>{trade.entryTime}</span>
          <span aria-hidden="true">-</span>
          <span>{trade.exitTime ?? "Open"}</span>
          <span aria-hidden="true">-</span>
          <span>{trade.session}</span>
          {trade.rMultiple != null ? (
            <>
              <span aria-hidden="true">-</span>
              <span
                className="mono"
                style={{
                  color:
                    trade.rMultiple >= 0
                      ? "var(--profit-primary)"
                      : "var(--loss-primary)",
                }}
              >
                {trade.rMultiple >= 0 ? "+" : ""}
                {trade.rMultiple.toFixed(1)}R
              </span>
            </>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {trade.setupName ? (
            <CalendarDayPill tone="accent">{trade.setupName}</CalendarDayPill>
          ) : null}
          {trade.journalTemplateName ? (
            <CalendarDayPill>{trade.journalTemplateName}</CalendarDayPill>
          ) : null}
          {trade.ruleSetName ? (
            <CalendarDayPill tone="warning">{trade.ruleSetName}</CalendarDayPill>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CalendarTradeCard({
  trade,
  selected,
  onSelectTrade,
}: {
  trade: CalendarReviewTrade;
  selected: boolean;
  onSelectTrade: (tradeId: string) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border p-4 transition-colors sm:p-5",
        selected
          ? "bg-[color-mix(in_srgb,var(--accent-soft)_68%,var(--surface))]"
          : "bg-[var(--surface-elevated)]",
      )}
      style={{
        borderColor: selected ? "var(--accent-primary)" : "var(--border-subtle)",
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <CalendarTradeRowLeading trade={trade} />

          <div className="sm:pl-4">
            <p
              className="mono text-lg font-bold"
              style={{
                color:
                  trade.pnl >= 0 ? "var(--profit-primary)" : "var(--loss-primary)",
              }}
            >
              {formatSignedMoney(trade.pnl, 2)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            variant={selected ? "default" : "outline"}
            size="sm"
            className="h-9 w-full justify-center sm:w-auto sm:px-3"
            onClick={() => onSelectTrade(trade.id)}
          >
            {selected ? "Editing below" : "Journal here"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-9 w-full justify-center sm:w-auto sm:px-3"
          >
            <Link href={`/journal?trade=${trade.id}`}>Open full page</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function CalendarTradeList({
  day,
  selectedTradeId,
  onSelectTrade,
}: {
  day: CalendarReviewDay;
  selectedTradeId: string | null;
  onSelectTrade: (tradeId: string) => void;
}) {
  if (day.trades.length === 0) {
    return (
      <WidgetEmptyState
        className="py-8"
        icon={<CalendarDays className="h-5 w-5" />}
        title="No trades on this day"
        description="This date has no trades in the current calendar basis."
      />
    );
  }

  return (
    <div className="space-y-3">
      {day.trades.map((trade) => (
        <CalendarTradeCard
          key={trade.id}
          trade={trade}
          selected={selectedTradeId === trade.id}
          onSelectTrade={onSelectTrade}
        />
      ))}
    </div>
  );
}

function CalendarDayCoverage({ day }: { day: CalendarReviewDay }) {
  return (
    <div className="space-y-3">
      <InsetPanel paddingClassName="px-4 py-4">
        <p className="text-label mb-3">Coverage</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Screenshots
            </p>
            <p className="mono mt-1 text-sm font-semibold text-foreground">
              {day.screenshotCount}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Setup linked
            </p>
            <p className="mono mt-1 text-sm font-semibold text-foreground">
              {day.setupAssignedTrades}/{day.tradesCount}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Template linked
            </p>
            <p className="mono mt-1 text-sm font-semibold text-foreground">
              {day.templateAssignedTrades}/{day.tradesCount}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Mistake-tagged
            </p>
            <p className="mono mt-1 text-sm font-semibold text-foreground">
              {day.mistakeTaggedTrades}
            </p>
          </div>
        </div>
      </InsetPanel>

      <InsetPanel paddingClassName="px-4 py-4">
        <p className="text-label mb-3">Structure</p>
        <div className="flex flex-wrap gap-2">
          {day.sessionsUsed.length > 0 ? (
            day.sessionsUsed.map((session) => (
              <CalendarDayPill key={session}>{session}</CalendarDayPill>
            ))
          ) : (
            <span className="text-sm text-[var(--text-tertiary)]">
              No structured session data yet.
            </span>
          )}
          {day.setupsUsed.map((setup) => (
            <CalendarDayPill key={setup} tone="accent">
              {setup}
            </CalendarDayPill>
          ))}
          {day.templatesUsed.map((template) => (
            <CalendarDayPill key={template}>{template}</CalendarDayPill>
          ))}
          {day.ruleSetsUsed.map((ruleSet) => (
            <CalendarDayPill key={ruleSet} tone="warning">
              {ruleSet}
            </CalendarDayPill>
          ))}
        </div>
      </InsetPanel>
    </div>
  );
}

export function CalendarJournalShell({
  selectedDay,
  selectedTradeSummary,
  expanded,
  onToggleExpanded,
  children,
}: {
  selectedDay: CalendarReviewDay | null;
  selectedTradeSummary: CalendarReviewTrade | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  children: ReactNode;
}) {
  return (
    <AppPanel className="overflow-hidden p-0">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">
              Journal from calendar
            </h3>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {selectedDay && selectedTradeSummary
                ? `Review ${selectedTradeSummary.symbol} from ${selectedDay.dateKey} directly inside the calendar workspace.`
                : "Pick a trade from the selected day to start journaling here."}
            </p>
          </div>

          {selectedTradeSummary ? (
            <div className="flex flex-wrap items-center gap-2">
              <CalendarDayPill tone={selectedTradeSummary.reviewed ? "profit" : "warning"}>
                {selectedTradeSummary.reviewed ? "Reviewed" : "Needs review"}
              </CalendarDayPill>
              {selectedTradeSummary.ruleSetName ? (
                <CalendarDayPill tone="warning">
                  {selectedTradeSummary.ruleSetName}
                </CalendarDayPill>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2.5"
                onClick={onToggleExpanded}
              >
                {expanded ? "Hide editor" : "Open editor"}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expanded ? "rotate-180" : "rotate-0",
                  )}
                />
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {expanded ? children : null}
    </AppPanel>
  );
}

export function CalendarDayInspector({
  mode,
  selectedDay,
  dateTools,
  selectedTradeId,
  onSelectTrade,
  className,
}: {
  mode: CalendarReviewMode;
  selectedDay: CalendarReviewDay | null;
  dateTools: CalendarDateTools;
  selectedTradeId: string | null;
  onSelectTrade: (tradeId: string) => void;
  className?: string;
}) {
  if (!selectedDay) {
    return (
      <AppPanel className={cn("flex items-center justify-center p-6 sm:p-7", className)}>
        <WidgetEmptyState
          className="w-full py-10"
          icon={<CalendarDays className="h-5 w-5" />}
          title="Pick a day"
          description="The inspector shows plan quality, review coverage, and the exact trades behind a date."
        />
      </AppPanel>
    );
  }

  const reviewPercent =
    selectedDay.reviewableTrades > 0
      ? Math.round((selectedDay.reviewedTrades / selectedDay.reviewableTrades) * 100)
      : 0;
  const display = getDayDisplay(mode, selectedDay);
  const firstNeedsReviewTrade =
    selectedDay.trades.find((trade) => trade.status === "CLOSED" && !trade.reviewed) ??
    null;

  return (
    <AppPanel className={cn("space-y-5 overflow-hidden p-5 sm:p-6", className)}>
      <InsetPanel tone={getSelectedDayTone(mode, selectedDay)} paddingClassName="px-5 py-5">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-label mb-2">Selected day</p>
              <h2 className="headline-md">{dateTools.formatLongDate(selectedDay.date)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                {display.narrative}
              </p>
            </div>

            {firstNeedsReviewTrade ? (
              <Button
                size="sm"
                className="shrink-0"
                onClick={() => onSelectTrade(firstNeedsReviewTrade.id)}
              >
                Journal next trade
              </Button>
            ) : null}
          </div>

          <CalendarCompactStatStrip
            stats={[
              {
                label: "Day P&L",
                value: formatSignedMoney(selectedDay.totalPnl, 2),
                helper:
                  selectedDay.tradesCount > 0
                    ? `${selectedDay.winningTrades} winning trades`
                    : "No trades",
                tone: getPnlTone(selectedDay.totalPnl),
              },
              {
                label: "Trades",
                value: String(selectedDay.tradesCount),
                helper: `${selectedDay.sessionsUsed.length} active sessions`,
              },
              {
                label: "Reviewed",
                value: selectedDay.reviewableTrades > 0 ? `${reviewPercent}%` : "--",
                helper:
                  selectedDay.reviewableTrades > 0
                    ? `${selectedDay.reviewedTrades}/${selectedDay.reviewableTrades} closed trades`
                    : "No closed trades to review",
                tone: selectedDay.needsReviewTrades > 0 ? "warning" : "profit",
              },
              {
                label: "Rule Flags",
                value: String(selectedDay.flaggedViolationsCount),
                helper: `${selectedDay.violatedGlobalRules.length} global / ${selectedDay.violatedDailyRules.length} daily / ${selectedDay.planViolationLabels.length} automatic`,
                tone: selectedDay.flaggedViolationsCount > 0 ? "loss" : "default",
              },
            ]}
          />

          <div className="flex flex-wrap gap-2">
            {selectedDay.sessionsUsed.map((session) => (
              <CalendarDayPill key={session}>{session}</CalendarDayPill>
            ))}
            {selectedDay.setupsUsed.map((setup) => (
              <CalendarDayPill key={setup} tone="accent">
                {setup}
              </CalendarDayPill>
            ))}
            {selectedDay.templatesUsed.map((template) => (
              <CalendarDayPill key={template}>{template}</CalendarDayPill>
            ))}
            {selectedDay.ruleSetsUsed.map((ruleSet) => (
              <CalendarDayPill key={ruleSet} tone="warning">
                {ruleSet}
              </CalendarDayPill>
            ))}
          </div>
        </div>
      </InsetPanel>

      <div className="space-y-5">
        <CalendarInspectorSection
          title="Coverage & structure"
          subtitle="Check whether the day has the right context captured before you move on."
        >
          <CalendarDayCoverage day={selectedDay} />
        </CalendarInspectorSection>

        <CalendarInspectorSection
          title="Daily plan"
          subtitle="Pre-market context and closeout notes for this date."
        >
          <CalendarPlanSummary plan={selectedDay.dailyPlan} />
        </CalendarInspectorSection>
      </div>

      <CalendarInspectorSection
        title="Rule flags"
        subtitle="Global and day-level rules are flagged here when the trade review marks them as broken."
      >
        <CalendarRuleFlagSummary day={selectedDay} />
      </CalendarInspectorSection>

      <CalendarInspectorSection
        title="Trades"
        subtitle="Select a trade to journal it directly below without leaving the calendar."
      >
        <CalendarTradeList
          day={selectedDay}
          selectedTradeId={selectedTradeId}
          onSelectTrade={onSelectTrade}
        />
      </CalendarInspectorSection>
    </AppPanel>
  );
}
