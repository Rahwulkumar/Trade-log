"use client";

import Link from "next/link";
import { BookOpenText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingListRows } from "@/components/ui/loading";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { InsetPanel, ListItemRow } from "@/components/ui/surface-primitives";
import type {
  AnalyticsWorkspaceDimension,
  AnalyticsWorkspaceDrilldown,
  AnalyticsWorkspaceMeasure,
} from "@/lib/analytics/workspace-types";

export const ANALYTICS_WORKSPACE_DIMENSION_OPTIONS: Array<{
  value: AnalyticsWorkspaceDimension;
  label: string;
}> = [
  { value: "symbol", label: "Symbol" },
  { value: "session", label: "Session" },
  { value: "playbook", label: "Playbook" },
  { value: "setup", label: "Setup" },
  { value: "mistake", label: "Mistake" },
  { value: "rule", label: "Rule" },
  { value: "template", label: "Template" },
  { value: "setupTag", label: "Setup Tag" },
  { value: "mistakeTag", label: "Mistake Tag" },
  { value: "direction", label: "Direction" },
  { value: "weekday", label: "Weekday" },
  { value: "reviewStatus", label: "Review Status" },
];

export const ANALYTICS_WORKSPACE_MEASURE_OPTIONS: Array<{
  value: AnalyticsWorkspaceMeasure;
  label: string;
}> = [
  { value: "netPnl", label: "Net P&L" },
  { value: "trades", label: "Trade Count" },
  { value: "avgPnl", label: "Average P&L" },
  { value: "winRate", label: "Win Rate" },
  { value: "profitFactor", label: "Profit Factor" },
  { value: "avgRMultiple", label: "Average R" },
  { value: "reviewedPercent", label: "Reviewed %" },
];

export function getAnalyticsWorkspaceDimensionLabel(
  value: AnalyticsWorkspaceDimension,
) {
  return (
    ANALYTICS_WORKSPACE_DIMENSION_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  );
}

export function getAnalyticsWorkspaceMeasureLabel(
  value: AnalyticsWorkspaceMeasure,
) {
  return (
    ANALYTICS_WORKSPACE_MEASURE_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  );
}

export function formatWorkspaceSignedMoney(value: number) {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatWorkspacePercent(value: number | null) {
  if (value == null || Number.isNaN(value)) return "--";
  return `${value.toFixed(1)}%`;
}

export function formatWorkspaceDateTime(value: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function AnalyticsWorkspaceDrilldownSheet({
  open,
  onOpenChange,
  drilldown,
  groupBy,
  loading,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drilldown: AnalyticsWorkspaceDrilldown | null;
  groupBy: AnalyticsWorkspaceDimension;
  loading: boolean;
  error: string | null;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{drilldown?.label ?? "Trade Drilldown"}</SheetTitle>
          <SheetDescription>
            {drilldown
              ? `${drilldown.trades.length} trades behind this ${getAnalyticsWorkspaceDimensionLabel(groupBy).toLowerCase()} bucket.`
              : "Open a result row to inspect the actual trades behind it."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 overflow-y-auto px-4 pb-4">
          {error ? (
            <InsetPanel tone="warning">
              <p
                className="text-label"
                style={{ color: "var(--warning-primary)" }}
              >
                Drilldown Error
              </p>
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {error}
              </p>
            </InsetPanel>
          ) : null}

          {loading && !drilldown ? <LoadingListRows count={4} compact /> : null}

          {drilldown?.trades.map((trade) => {
            const structuredMistakes = Array.isArray(trade.mistakes)
              ? trade.mistakes
              : [];
            const setupTags = Array.isArray(trade.setupTags)
              ? trade.setupTags
              : [];
            const mistakeTags = Array.isArray(trade.mistakeTags)
              ? trade.mistakeTags
              : [];

            return (
              <ListItemRow
                key={trade.id}
                leading={
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mono text-sm font-bold">{trade.symbol}</span>
                      <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                        {trade.direction}
                      </span>
                      <span
                        className="rounded-full border px-2 py-0.5 text-[10px]"
                        style={{
                          borderColor: "var(--border-subtle)",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {trade.session}
                      </span>
                      {trade.reviewed ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={{
                            background: "var(--accent-soft)",
                            color: "var(--accent-primary)",
                          }}
                        >
                          Reviewed
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {trade.playbook}
                    </p>
                    {trade.setup ||
                    trade.rulebook ||
                    trade.template ||
                    structuredMistakes.length > 0 ? (
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        Setup: {trade.setup ?? "--"}
                        {" | "}
                        Rulebook: {trade.rulebook ?? "--"}
                        {" | "}
                        Template: {trade.template ?? "--"}
                        {" | "}
                        Mistakes:{" "}
                        {structuredMistakes.length > 0
                          ? structuredMistakes.join(", ")
                          : "--"}
                      </p>
                    ) : null}
                    {trade.brokenRules.length > 0 ||
                    trade.followedRules.length > 0 ||
                    trade.skippedRules.length > 0 ||
                    trade.notApplicableRules.length > 0 ? (
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        Broken:{" "}
                        {trade.brokenRules.length > 0
                          ? trade.brokenRules.join(", ")
                          : "--"}
                        {" | "}
                        Followed:{" "}
                        {trade.followedRules.length > 0
                          ? trade.followedRules.join(", ")
                          : "--"}
                        {" | "}
                        Skipped:{" "}
                        {trade.skippedRules.length > 0
                          ? trade.skippedRules.join(", ")
                          : "--"}
                        {" | "}
                        N/A:{" "}
                        {trade.notApplicableRules.length > 0
                          ? trade.notApplicableRules.join(", ")
                          : "--"}
                      </p>
                    ) : null}
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      Entry {formatWorkspaceDateTime(trade.entryAt)} | Exit{" "}
                      {formatWorkspaceDateTime(trade.exitAt)}
                    </p>
                    {setupTags.length > 0 || mistakeTags.length > 0 ? (
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        Setup Tags: {setupTags.length > 0 ? setupTags.join(", ") : "--"}
                        {" | "}
                        Mistake Tags:{" "}
                        {mistakeTags.length > 0 ? mistakeTags.join(", ") : "--"}
                      </p>
                    ) : null}
                  </div>
                }
                trailing={
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p
                        className="text-sm font-semibold"
                        style={{
                          color:
                            trade.netPnl >= 0
                              ? "var(--profit-primary)"
                              : "var(--loss-primary)",
                        }}
                      >
                        {formatWorkspaceSignedMoney(trade.netPnl)}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {trade.rMultiple == null
                          ? "--"
                          : `${trade.rMultiple.toFixed(2)}R`}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/journal?trade=${trade.id}`}>
                        <BookOpenText className="h-4 w-4" />
                        Open Journal
                      </Link>
                    </Button>
                  </div>
                }
              />
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
