"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Brain,
  Clock,
  Filter,
  Layers3,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";

import {
  AnalyticsWorkspaceDrilldownSheet,
  formatWorkspacePercent,
  formatWorkspaceSignedMoney,
  getAnalyticsWorkspaceDimensionLabel,
  getAnalyticsWorkspaceMeasureLabel,
} from "@/components/analytics/workspace-primitives";
import { Button } from "@/components/ui/button";
import {
  AppMetricCard,
  AppPanel,
  AppPanelEmptyState,
  PanelTitle,
  SectionHeader,
} from "@/components/ui/page-primitives";
import {
  ReportActionPlan,
  ReportCallout,
  ReportGrid,
  ReportGridHeader,
  ReportGridRow,
  ReportInsightColumns,
  ReportSectionPanel,
  ReportTypeBadge,
} from "@/components/ui/report-primitives";
import { InsetPanel } from "@/components/ui/surface-primitives";
import type {
  AnalyticsWorkspaceDrilldown,
  AnalyticsWorkspaceResult,
} from "@/lib/analytics/workspace-types";
import type {
  ReportAiCommentary,
  ReportSnapshot,
  TradeReportSnapshot,
  WorkspaceReportSnapshot,
} from "@/lib/reports/types";
import {
  buildAnalyticsWorkspaceQueryFromReportFilters,
} from "@/lib/reports/workspace-report";
import { isWorkspaceReportSnapshot } from "@/lib/reports/types";

import { ReportSummaryGrid } from "@/components/reports/report-sections";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatScope(snapshot: WorkspaceReportSnapshot) {
  if (snapshot.filters.accountScope === "all") return "All Accounts";
  if (snapshot.filters.accountScope === "unassigned") return "Unassigned";
  return "Scoped Account";
}

function getBadgeTone(reportType: WorkspaceReportSnapshot["reportType"]) {
  if (reportType === "playbook") return "strategy" as const;
  if (reportType === "risk") return "risk" as const;
  return "performance" as const;
}

function buildFilterChips(snapshot: WorkspaceReportSnapshot) {
  const chips: string[] = [];
  const playbookLabel =
    snapshot.filters.playbookId && snapshot.filters.playbookId !== "unassigned"
      ? snapshot.workspace.facets.playbooks.find(
          (facet) => facet.id === snapshot.filters.playbookId,
        )?.label
      : null;
  const setupLabel =
    snapshot.filters.setupDefinitionId &&
    snapshot.filters.setupDefinitionId !== "unassigned"
      ? snapshot.workspace.facets.setups.find(
          (facet) => facet.id === snapshot.filters.setupDefinitionId,
        )?.label
      : null;
  const mistakeLabel =
    snapshot.filters.mistakeDefinitionId &&
    snapshot.filters.mistakeDefinitionId !== "unassigned"
      ? snapshot.workspace.facets.mistakes.find(
          (facet) => facet.id === snapshot.filters.mistakeDefinitionId,
        )?.label
      : null;
  const templateLabel =
    snapshot.filters.journalTemplateId &&
    snapshot.filters.journalTemplateId !== "unassigned"
      ? snapshot.workspace.facets.templates.find(
          (facet) => facet.id === snapshot.filters.journalTemplateId,
        )?.label
      : null;

  if (snapshot.filters.symbol) chips.push(`Symbol: ${snapshot.filters.symbol}`);
  if (snapshot.filters.session) chips.push(`Session: ${snapshot.filters.session}`);
  if (snapshot.filters.playbookId) {
    chips.push(
      snapshot.filters.playbookId === "unassigned"
        ? "Playbook: Unassigned"
        : `Playbook: ${playbookLabel ?? "Filtered"}`,
    );
  }
  if (snapshot.filters.setupDefinitionId) {
    chips.push(
      snapshot.filters.setupDefinitionId === "unassigned"
        ? "Setup: No Setup"
        : `Setup: ${setupLabel ?? "Filtered"}`,
    );
  }
  if (snapshot.filters.mistakeDefinitionId) {
    chips.push(
      snapshot.filters.mistakeDefinitionId === "unassigned"
        ? "Mistake: No Mistake"
        : `Mistake: ${mistakeLabel ?? "Filtered"}`,
    );
  }
  if (snapshot.filters.journalTemplateId) {
    chips.push(
      snapshot.filters.journalTemplateId === "unassigned"
        ? "Template: No Template"
        : `Template: ${templateLabel ?? "Filtered"}`,
    );
  }
  if (snapshot.filters.setupTag) chips.push(`Setup: ${snapshot.filters.setupTag}`);
  if (snapshot.filters.mistakeTag) chips.push(`Mistake: ${snapshot.filters.mistakeTag}`);
  if (snapshot.filters.direction) chips.push(`Direction: ${snapshot.filters.direction}`);
  if (snapshot.filters.reviewStatus) {
    chips.push(
      snapshot.filters.reviewStatus === "reviewed"
        ? "Reviewed only"
        : "Needs review only",
    );
  }

  return chips;
}

function AiReportBody({
  ai,
  snapshot,
  saving,
  onSave,
}: {
  ai: ReportAiCommentary;
  snapshot: TradeReportSnapshot;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="space-y-5">
      <ReportSummaryGrid
        snapshot={snapshot}
        onSave={onSave}
        saving={saving}
        aiPrimary
      />

      <SectionHeader
        eyebrow="Gemini 2.5 Pro"
        title="AI Performance Review"
        subtitle="Deep analysis grounded entirely on your closed trade records. Every observation references actual data."
      />

      <ReportSectionPanel title={ai.headline} narrative={ai.executiveSummary} />

      {ai.performanceNarrative ? (
        <ReportSectionPanel
          icon={<TrendingUp size={18} />}
          title="Performance Analysis"
          narrative={ai.performanceNarrative}
        />
      ) : null}

      <ReportInsightColumns
        left={{
          title: "Strengths",
          items: ai.strengths,
          tone: "profit",
        }}
        right={{
          title: "Weaknesses",
          items: ai.weaknesses,
          tone: "loss",
        }}
      />

      {ai.psychologyAnalysis ? (
        <ReportSectionPanel
          icon={<Brain size={18} />}
          title="Psychology & Behavioural Analysis"
          narrative={ai.psychologyAnalysis}
          items={ai.psychologyFlags}
          itemTone="warning"
          itemLabel="Psychology Flags"
        />
      ) : null}

      {ai.riskAnalysis ? (
        <ReportSectionPanel
          icon={<Shield size={18} />}
          title="Risk Management Analysis"
          narrative={ai.riskAnalysis}
          items={ai.riskFlags}
          itemTone="loss"
          itemLabel="Risk Flags"
        />
      ) : null}

      {ai.timingAnalysis || ai.timingObservations.length > 0 ? (
        <ReportSectionPanel
          icon={<Clock size={18} />}
          title="Timing & Session Analysis"
          narrative={ai.timingAnalysis}
          items={ai.timingObservations}
          itemTone="accent"
          itemLabel={
            ai.timingObservations.length > 0
              ? "Key Timing Observations"
              : undefined
          }
        />
      ) : null}

      {ai.playbookAnalysis || ai.playbookObservations.length > 0 ? (
        <ReportSectionPanel
          icon={<BookOpen size={18} />}
          title="Strategy & Playbook Analysis"
          narrative={ai.playbookAnalysis}
          items={ai.playbookObservations}
          itemTone="accent"
          itemLabel={
            ai.playbookObservations.length > 0
              ? "Playbook Observations"
              : undefined
          }
        />
      ) : null}

      {ai.repeatedPatterns.length > 0 ? (
        <ReportSectionPanel
          icon={<Zap size={18} />}
          title="Repeated Patterns"
          narrative="Behaviours that appear consistently across the dataset, including habits to keep and habits to break."
          items={ai.repeatedPatterns}
          itemTone="warning"
        />
      ) : null}

      <ReportActionPlan
        quickWins={ai.quickWins ?? []}
        longerTermFocus={ai.longerTermFocus ?? []}
        correctiveActions={ai.correctiveActions}
      />

      {ai.verdict ? (
        <ReportCallout label="Verdict" body={ai.verdict} tone="accent" />
      ) : null}

      <ReportCallout label="Confidence" body={ai.confidence} tone="default" />
    </div>
  );
}

function WorkspaceReportBody({
  snapshot,
  saving,
  onSave,
}: {
  snapshot: WorkspaceReportSnapshot;
  saving: boolean;
  onSave: () => void;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [drilldownCache, setDrilldownCache] = useState<
    Record<string, AnalyticsWorkspaceDrilldown | null>
  >({});
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownError, setDrilldownError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedKey(snapshot.workspace.drilldown?.key ?? null);
    setDrilldownCache(
      snapshot.workspace.drilldown
        ? { [snapshot.workspace.drilldown.key]: snapshot.workspace.drilldown }
        : {},
    );
    setDrilldownError(null);
    setDrilldownLoading(false);
  }, [snapshot]);

  const activeDrilldown = selectedKey ? drilldownCache[selectedKey] ?? null : null;
  const filterChips = useMemo(() => buildFilterChips(snapshot), [snapshot]);

  async function openDrilldown(key: string) {
    setSelectedKey(key);
    setDrilldownError(null);

    if (key in drilldownCache) {
      return;
    }

    try {
      setDrilldownLoading(true);

      const response = await fetch("/api/analytics/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildAnalyticsWorkspaceQueryFromReportFilters(snapshot.filters, {
            drilldownKey: key,
          }),
        ),
      });

      const payload = (await response.json().catch(() => null)) as
        | AnalyticsWorkspaceResult
        | { error?: string }
        | null;

      if (!response.ok || !payload || !("drilldown" in payload)) {
        throw new Error(
          (payload && "error" in payload && payload.error) ||
            "Failed to load report drilldown",
        );
      }

      setDrilldownCache((current) => ({
        ...current,
        [key]: payload.drilldown ?? null,
      }));
    } catch (error) {
      setDrilldownError(
        error instanceof Error ? error.message : "Failed to load report drilldown",
      );
    } finally {
      setDrilldownLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-5">
        <AppPanel>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2">
                <ReportTypeBadge
                  label={snapshot.reportType}
                  tone={getBadgeTone(snapshot.reportType)}
                />
              </div>
              <PanelTitle
                title={snapshot.title}
                subtitle={`Generated ${new Date(snapshot.generatedAt).toLocaleString()} | ${formatScope(snapshot)} | ${snapshot.filters.from ?? "Start"} -> ${snapshot.filters.to ?? "Now"}`}
                className="mb-0"
              />
            </div>

            <Button onClick={onSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? "Saving..." : "Save Report"}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AppMetricCard
              label="Matching Trades"
              value={String(snapshot.workspace.totals.filteredTrades)}
              helper={`${snapshot.workspace.summary.winningTrades} winners / ${snapshot.workspace.summary.losingTrades} losers`}
              tone="accent"
              icon={<Filter className="h-4 w-4" />}
            />
            <AppMetricCard
              label="Net P&L"
              value={formatMoney(snapshot.workspace.summary.netPnl)}
              helper={`${snapshot.workspace.summary.avgPnl >= 0 ? "+" : "-"}${formatMoney(Math.abs(snapshot.workspace.summary.avgPnl))} avg`}
              tone={
                snapshot.workspace.summary.netPnl >= 0 ? "profit" : "loss"
              }
            />
            <AppMetricCard
              label="Win Rate"
              value={formatWorkspacePercent(snapshot.workspace.summary.winRate)}
              helper={`${formatWorkspacePercent(snapshot.workspace.summary.reviewedPercent)} reviewed`}
              tone={
                snapshot.workspace.summary.winRate >= 50 ? "profit" : "warning"
              }
            />
            <AppMetricCard
              label="Groups"
              value={String(snapshot.workspace.totals.groups)}
              helper={`${getAnalyticsWorkspaceDimensionLabel(snapshot.workspace.query.groupBy)} ranked by ${getAnalyticsWorkspaceMeasureLabel(snapshot.workspace.query.measure)}`}
              tone="default"
              icon={<Layers3 className="h-4 w-4" />}
            />
          </div>
        </AppPanel>

        <div className="grid gap-4 sm:gap-5 2xl:grid-cols-[1.05fr_0.95fr]">
          <InsetPanel tone="accent">
            <p className="text-label" style={{ color: "var(--accent-primary)" }}>
              Saved Analysis View
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              This report saves the deterministic workspace itself: grouping,
              ranking metric, filters, and the grouped results. Open any row to
              inspect the exact trades behind it.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span
                className="rounded-full border px-2.5 py-1 font-semibold"
                style={{
                  borderColor: "var(--accent-muted)",
                  background: "var(--accent-soft)",
                  color: "var(--accent-primary)",
                }}
              >
                Grouped by {getAnalyticsWorkspaceDimensionLabel(snapshot.workspace.query.groupBy)}
              </span>
              <span
                className="rounded-full border px-2.5 py-1 font-semibold"
                style={{
                  borderColor: "var(--border-subtle)",
                  background: "var(--surface-elevated)",
                  color: "var(--text-secondary)",
                }}
              >
                Ranked by {getAnalyticsWorkspaceMeasureLabel(snapshot.workspace.query.measure)}
              </span>
              <span
                className="rounded-full border px-2.5 py-1 font-semibold"
                style={{
                  borderColor: "var(--border-subtle)",
                  background: "var(--surface-elevated)",
                  color: "var(--text-secondary)",
                }}
              >
                {snapshot.workspace.query.sortOrder === "desc"
                  ? "Highest first"
                  : "Lowest first"}
              </span>
            </div>
          </InsetPanel>

          <InsetPanel>
            <p className="text-label">Active Filters</p>
            {filterChips.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {filterChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                    style={{
                      borderColor: "var(--border-subtle)",
                      background: "var(--surface-elevated)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : (
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                No additional filters. This view is covering the full scope and
                date range shown above.
              </p>
            )}
          </InsetPanel>
        </div>

        {snapshot.workspace.rows.length > 0 ? (
          <AppPanel>
            <PanelTitle
              title="Grouped Results"
              subtitle={`Top ${snapshot.workspace.rows.length} ${getAnalyticsWorkspaceDimensionLabel(snapshot.workspace.query.groupBy).toLowerCase()} buckets ranked by ${getAnalyticsWorkspaceMeasureLabel(snapshot.workspace.query.measure).toLowerCase()}.`}
            />

            <div className="space-y-3 lg:hidden">
              {snapshot.workspace.rows.map((row) => {
                const isActive = selectedKey === row.key;

                return (
                  <button
                    key={row.key}
                    type="button"
                    className="w-full text-left"
                    onClick={() => void openDrilldown(row.key)}
                  >
                    <InsetPanel
                      paddingClassName="px-4 py-4"
                      style={{
                        background: isActive
                          ? "var(--accent-soft)"
                          : "var(--surface-elevated)",
                        borderColor: isActive
                          ? "var(--accent-muted)"
                          : "var(--border-subtle)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{row.label}</p>
                          <p
                            className="mt-1 text-xs"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            Tap to open exact trades
                          </p>
                        </div>
                        <span
                          className="shrink-0 text-sm font-semibold"
                          style={{
                            color:
                              row.netPnl >= 0
                                ? "var(--profit-primary)"
                                : "var(--loss-primary)",
                          }}
                        >
                          {formatWorkspaceSignedMoney(row.netPnl)}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <p style={{ color: "var(--text-tertiary)" }}>Trades</p>
                          <p className="mt-1 font-semibold">{row.trades}</p>
                        </div>
                        <div>
                          <p style={{ color: "var(--text-tertiary)" }}>Share</p>
                          <p className="mt-1 font-semibold">
                            {formatWorkspacePercent(row.share)}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: "var(--text-tertiary)" }}>Win Rate</p>
                          <p className="mt-1 font-semibold">
                            {formatWorkspacePercent(row.winRate)}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: "var(--text-tertiary)" }}>Avg P&amp;L</p>
                          <p className="mt-1 font-semibold">
                            {formatWorkspaceSignedMoney(row.avgPnl)}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: "var(--text-tertiary)" }}>Avg R</p>
                          <p className="mt-1 font-semibold">
                            {row.avgRMultiple == null
                              ? "--"
                              : `${row.avgRMultiple.toFixed(2)}R`}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: "var(--text-tertiary)" }}>Reviewed</p>
                          <p className="mt-1 font-semibold">
                            {formatWorkspacePercent(row.reviewedPercent)}
                          </p>
                        </div>
                      </div>
                    </InsetPanel>
                  </button>
                );
              })}
            </div>

            <div className="hidden lg:block">
            <ReportGrid minWidthClassName="min-w-[880px]">
              <ReportGridHeader columns="minmax(0,1.75fr) minmax(80px,0.7fr) minmax(95px,0.8fr) minmax(110px,0.85fr) minmax(90px,0.75fr) minmax(110px,0.85fr) minmax(85px,0.75fr) minmax(90px,0.8fr)">
                <span>{getAnalyticsWorkspaceDimensionLabel(snapshot.workspace.query.groupBy)}</span>
                <span className="text-right">Trades</span>
                <span className="text-right">Share</span>
                <span className="text-right">Net P&amp;L</span>
                <span className="text-right">Win Rate</span>
                <span className="text-right">Avg P&amp;L</span>
                <span className="text-right">Avg R</span>
                <span className="text-right">Reviewed</span>
              </ReportGridHeader>
              {snapshot.workspace.rows.map((row) => {
                const isActive = selectedKey === row.key;

                return (
                  <button
                    key={row.key}
                    type="button"
                    className="w-full text-left"
                    onClick={() => void openDrilldown(row.key)}
                  >
                    <ReportGridRow
                      columns="minmax(0,1.75fr) minmax(80px,0.7fr) minmax(95px,0.8fr) minmax(110px,0.85fr) minmax(90px,0.75fr) minmax(110px,0.85fr) minmax(85px,0.75fr) minmax(90px,0.8fr)"
                      className="transition-colors"
                      style={{
                        background: isActive
                          ? "var(--accent-soft)"
                          : "var(--surface-elevated)",
                        borderColor: isActive
                          ? "var(--accent-muted)"
                          : "var(--border-subtle)",
                      }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{row.label}</p>
                        <p
                          className="mt-1 text-xs"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Click to open exact trades
                        </p>
                      </div>
                      <span className="text-right text-sm">{row.trades}</span>
                      <span className="text-right text-sm">
                        {formatWorkspacePercent(row.share)}
                      </span>
                      <span
                        className="text-right text-sm font-semibold"
                        style={{
                          color:
                            row.netPnl >= 0
                              ? "var(--profit-primary)"
                              : "var(--loss-primary)",
                        }}
                      >
                        {formatWorkspaceSignedMoney(row.netPnl)}
                      </span>
                      <span className="text-right text-sm">
                        {formatWorkspacePercent(row.winRate)}
                      </span>
                      <span className="text-right text-sm">
                        {formatWorkspaceSignedMoney(row.avgPnl)}
                      </span>
                      <span className="text-right text-sm">
                        {row.avgRMultiple == null
                          ? "--"
                          : `${row.avgRMultiple.toFixed(2)}R`}
                      </span>
                      <span className="text-right text-sm">
                        {formatWorkspacePercent(row.reviewedPercent)}
                      </span>
                    </ReportGridRow>
                  </button>
                );
              })}
            </ReportGrid>
            </div>
          </AppPanel>
        ) : (
          <AppPanelEmptyState
            title="No grouped results"
            description="Adjust the report filters or widen the account/date range and generate again."
          />
        )}
      </div>

      <AnalyticsWorkspaceDrilldownSheet
        open={Boolean(selectedKey)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedKey(null);
            setDrilldownError(null);
          }
        }}
        drilldown={activeDrilldown}
        groupBy={snapshot.workspace.query.groupBy}
        loading={drilldownLoading}
        error={drilldownError}
      />
    </>
  );
}

export function ReportViewer({
  report,
  saving,
  onSave,
}: {
  report: ReportSnapshot | null;
  saving: boolean;
  onSave: () => void;
}) {
  if (!report) {
    return (
      <AppPanelEmptyState
        title="Generate a report view"
        description="Use the builder to generate a deterministic trade analysis view. It will render inline here and can then be saved as a snapshot."
      />
    );
  }

  if (isWorkspaceReportSnapshot(report)) {
    if (report.workspace.totals.filteredTrades === 0) {
      return (
        <AppPanelEmptyState
          title="No trades matched the selected filters"
          description="Adjust the account scope, dates, session, symbol, playbook, or review filters and generate again."
        />
      );
    }

    return <WorkspaceReportBody snapshot={report} saving={saving} onSave={onSave} />;
  }

  if (report.summary.totalTrades === 0) {
    return (
      <AppPanelEmptyState
        title="No trades matched the selected filters"
        description="Adjust the account scope, dates, symbol, or playbook filter and generate again."
      />
    );
  }

  if (report.aiError) {
    return (
      <div className="space-y-5">
        <ReportSummaryGrid
          snapshot={report}
          onSave={onSave}
          saving={saving}
          aiPrimary
        />
        <ReportCallout
          label="AI Report Unavailable"
          body={report.aiError}
          tone="warning"
          icon={<AlertTriangle size={16} />}
        />
      </div>
    );
  }

  if (!report.aiCommentary) {
    return (
      <AppPanelEmptyState
        title="AI report not available"
        description="No AI report content was returned for this snapshot."
      />
    );
  }

  return (
    <AiReportBody
      ai={report.aiCommentary}
      snapshot={report}
      saving={saving}
      onSave={onSave}
    />
  );
}
