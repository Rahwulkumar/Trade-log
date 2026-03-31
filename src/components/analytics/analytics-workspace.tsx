"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Filter, Layers3, Search } from "lucide-react";

import {
  ANALYTICS_WORKSPACE_DIMENSION_OPTIONS,
  ANALYTICS_WORKSPACE_MEASURE_OPTIONS,
  AnalyticsWorkspaceDrilldownSheet,
  formatWorkspacePercent,
  formatWorkspaceSignedMoney,
} from "@/components/analytics/workspace-primitives";
import { Button } from "@/components/ui/button";
import {
  ControlSurface,
  FieldGroup,
} from "@/components/ui/control-primitives";
import { Input } from "@/components/ui/input";
import { AppMetricCard, AppPanel, PanelTitle } from "@/components/ui/page-primitives";
import {
  LoadingListRows,
} from "@/components/ui/loading";
import {
  ReportGrid,
  ReportGridHeader,
  ReportGridRow,
} from "@/components/ui/report-primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InsetPanel,
  WidgetEmptyState,
} from "@/components/ui/surface-primitives";
import type {
  AnalyticsWorkspaceDimension,
  AnalyticsWorkspaceMeasure,
  AnalyticsWorkspaceQuery,
  AnalyticsWorkspaceResult,
} from "@/lib/analytics/workspace-types";

function emptyWorkspaceQuery(
  accountScope: string,
  from: string | null,
  to: string | null,
  timeZone: string,
): AnalyticsWorkspaceQuery {
  return {
    groupBy: "symbol",
    measure: "netPnl",
    sortOrder: "desc",
    limit: 24,
    drilldownKey: null,
    filters: {
      accountScope,
      from,
      to,
      timeZone,
      symbol: null,
      session: null,
      playbookId: null,
      setupDefinitionId: null,
      mistakeDefinitionId: null,
      journalTemplateId: null,
      setupTag: null,
      mistakeTag: null,
      direction: null,
      reviewStatus: null,
    },
  };
}

export function AnalyticsWorkspace({
  accountScope,
  from,
  to,
  timeZone,
}: {
  accountScope: string;
  from: string | null;
  to: string | null;
  timeZone: string;
}) {
  const [query, setQuery] = useState<AnalyticsWorkspaceQuery>(() =>
    emptyWorkspaceQuery(accountScope, from, to, timeZone),
  );
  const [result, setResult] = useState<AnalyticsWorkspaceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const deferredSymbol = useDeferredValue(query.filters.symbol);

  useEffect(() => {
    setQuery((current) => {
      if (
        current.filters.accountScope === accountScope &&
        current.filters.from === from &&
        current.filters.to === to &&
        current.filters.timeZone === timeZone
      ) {
        return current;
      }

      return {
        ...current,
        drilldownKey: null,
        filters: {
          ...current.filters,
          accountScope,
          from,
          to,
          timeZone,
        },
      };
    });
  }, [accountScope, from, to, timeZone]);

  const requestPayload = useMemo(
    () => ({
      groupBy: query.groupBy,
      measure: query.measure,
      sortOrder: query.sortOrder,
      limit: query.limit,
      drilldownKey: query.drilldownKey,
      filters: {
        accountScope: query.filters.accountScope,
        from: query.filters.from,
        to: query.filters.to,
        timeZone: query.filters.timeZone,
        symbol: deferredSymbol,
        session: query.filters.session,
        playbookId: query.filters.playbookId,
        setupDefinitionId: query.filters.setupDefinitionId,
        mistakeDefinitionId: query.filters.mistakeDefinitionId,
        journalTemplateId: query.filters.journalTemplateId,
        setupTag: query.filters.setupTag,
        mistakeTag: query.filters.mistakeTag,
        direction: query.filters.direction,
        reviewStatus: query.filters.reviewStatus,
      },
    }),
    [
      deferredSymbol,
      query.drilldownKey,
      query.filters.accountScope,
      query.filters.direction,
      query.filters.from,
      query.filters.journalTemplateId,
      query.filters.mistakeTag,
      query.filters.mistakeDefinitionId,
      query.filters.playbookId,
      query.filters.reviewStatus,
      query.filters.session,
      query.filters.setupDefinitionId,
      query.filters.setupTag,
      query.filters.timeZone,
      query.filters.to,
      query.groupBy,
      query.limit,
      query.measure,
      query.sortOrder,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadWorkspace() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/analytics/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => null)) as
          | AnalyticsWorkspaceResult
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            (payload && "error" in payload && payload.error) ||
              "Failed to load analytics workspace",
          );
        }

        if (!cancelled) {
          setResult(payload as AnalyticsWorkspaceResult);
        }
      } catch (workspaceError) {
        if (controller.signal.aborted || cancelled) {
          return;
        }
        setError(
          workspaceError instanceof Error
            ? workspaceError.message
            : "Failed to load analytics workspace",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [requestPayload]);

  const selectedRow = useMemo(
    () =>
      result?.rows.find((row) => row.key === (result.drilldown?.key ?? query.drilldownKey)) ??
      null,
    [query.drilldownKey, result],
  );

  const setPartialQuery = (
    next: Partial<AnalyticsWorkspaceQuery>,
    filterPatch?: Partial<AnalyticsWorkspaceQuery["filters"]>,
  ) => {
    setQuery((current) => ({
      ...current,
      ...next,
      drilldownKey: next.drilldownKey ?? null,
      filters: filterPatch
        ? {
            ...current.filters,
            ...filterPatch,
          }
        : current.filters,
    }));
  };

  const resetWorkspaceFilters = () => {
    setQuery((current) => ({
      ...current,
      drilldownKey: null,
      filters: {
        ...current.filters,
        symbol: null,
        session: null,
        playbookId: null,
        setupDefinitionId: null,
        mistakeDefinitionId: null,
        journalTemplateId: null,
        setupTag: null,
        mistakeTag: null,
        direction: null,
        reviewStatus: null,
      },
    }));
  };

  return (
    <>
      <AppPanel>
        <PanelTitle
          title="Drilldown Workspace"
          subtitle="Pivot by symbol, session, playbook, setup, mistake, template, or review state, then open the exact trades behind each bucket."
        />

        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <ControlSurface className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <FieldGroup label="Group By">
                  <Select
                    value={query.groupBy}
                    onValueChange={(value) =>
                      setPartialQuery({
                        groupBy: value as AnalyticsWorkspaceDimension,
                        drilldownKey: null,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANALYTICS_WORKSPACE_DIMENSION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Rank By">
                  <Select
                    value={query.measure}
                    onValueChange={(value) =>
                      setPartialQuery({
                        measure: value as AnalyticsWorkspaceMeasure,
                        drilldownKey: null,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANALYTICS_WORKSPACE_MEASURE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Sort">
                  <Select
                    value={query.sortOrder}
                    onValueChange={(value) =>
                      setPartialQuery({
                        sortOrder: value as AnalyticsWorkspaceQuery["sortOrder"],
                        drilldownKey: null,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Highest First</SelectItem>
                      <SelectItem value="asc">Lowest First</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FieldGroup label="Symbol Search">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                    <Input
                      value={query.filters.symbol ?? ""}
                      onChange={(event) =>
                        setPartialQuery(
                          { drilldownKey: null },
                          { symbol: event.target.value || null },
                        )
                      }
                      placeholder="e.g. XAUUSD"
                      className="pl-9"
                    />
                  </div>
                </FieldGroup>

                <FieldGroup label="Session">
                  <Select
                    value={query.filters.session ?? "all"}
                    onValueChange={(value) =>
                      setPartialQuery(
                        { drilldownKey: null },
                        { session: value === "all" ? null : value },
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sessions</SelectItem>
                      {result?.facets.sessions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} ({option.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Direction">
                  <Select
                    value={query.filters.direction ?? "all"}
                    onValueChange={(value) =>
                      setPartialQuery(
                        { drilldownKey: null },
                        {
                          direction:
                            value === "all" ? null : (value as "LONG" | "SHORT"),
                        },
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Directions</SelectItem>
                      <SelectItem value="LONG">LONG</SelectItem>
                      <SelectItem value="SHORT">SHORT</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Review Status">
                  <Select
                    value={query.filters.reviewStatus ?? "all"}
                    onValueChange={(value) =>
                      setPartialQuery(
                        { drilldownKey: null },
                        {
                          reviewStatus:
                            value === "all"
                              ? null
                              : (value as AnalyticsWorkspaceQuery["filters"]["reviewStatus"]),
                        },
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Review States</SelectItem>
                      {result?.facets.reviewStates.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} ({option.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Playbook">
                  <Select
                    value={query.filters.playbookId ?? "all"}
                    onValueChange={(value) =>
                      setPartialQuery(
                        { drilldownKey: null },
                        { playbookId: value === "all" ? null : value },
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Playbooks</SelectItem>
                      {result?.facets.playbooks.map((option) => (
                        <SelectItem
                          key={option.id ?? option.label}
                          value={option.id ?? "unassigned"}
                        >
                          {option.label} ({option.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Setup">
                  <Select
                    value={query.filters.setupDefinitionId ?? "all"}
                    onValueChange={(value) =>
                      setPartialQuery(
                        { drilldownKey: null },
                        { setupDefinitionId: value === "all" ? null : value },
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Setups</SelectItem>
                      {result?.facets.setups.map((option) => (
                        <SelectItem
                          key={option.id ?? option.label}
                          value={option.id ?? "unassigned"}
                        >
                          {option.label} ({option.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Mistake">
                  <Select
                    value={query.filters.mistakeDefinitionId ?? "all"}
                    onValueChange={(value) =>
                      setPartialQuery(
                        { drilldownKey: null },
                        { mistakeDefinitionId: value === "all" ? null : value },
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Mistakes</SelectItem>
                      {result?.facets.mistakes.map((option) => (
                        <SelectItem
                          key={option.id ?? option.label}
                          value={option.id ?? "unassigned"}
                        >
                          {option.label} ({option.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Template">
                  <Select
                    value={query.filters.journalTemplateId ?? "all"}
                    onValueChange={(value) =>
                      setPartialQuery(
                        { drilldownKey: null },
                        { journalTemplateId: value === "all" ? null : value },
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Templates</SelectItem>
                      {result?.facets.templates.map((option) => (
                        <SelectItem
                          key={option.id ?? option.label}
                          value={option.id ?? "unassigned"}
                        >
                          {option.label} ({option.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Setup Tag">
                  <Select
                    value={query.filters.setupTag ?? "all"}
                    onValueChange={(value) =>
                      setPartialQuery(
                        { drilldownKey: null },
                        { setupTag: value === "all" ? null : value },
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Setup Tags</SelectItem>
                      {result?.facets.setupTags.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} ({option.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Mistake Tag">
                  <Select
                    value={query.filters.mistakeTag ?? "all"}
                    onValueChange={(value) =>
                      setPartialQuery(
                        { drilldownKey: null },
                        { mistakeTag: value === "all" ? null : value },
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Mistake Tags</SelectItem>
                      {result?.facets.mistakeTags.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} ({option.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>
            </ControlSurface>

            <ControlSurface className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <AppMetricCard
                  label="Trades In Scope"
                  value={String(result?.totals.scopedTrades ?? 0)}
                  helper="Closed trades in the current account/date range"
                  tone="accent"
                  icon={<Layers3 className="h-4 w-4" />}
                />
                <AppMetricCard
                  label="Matching Trades"
                  value={String(result?.totals.filteredTrades ?? 0)}
                  helper="Trades after drilldown filters"
                  tone="default"
                  icon={<Filter className="h-4 w-4" />}
                />
                <AppMetricCard
                  label="Groups"
                  value={String(result?.totals.groups ?? 0)}
                  helper="Visible buckets in the current ranking"
                  tone="default"
                  icon={<ArrowUpDown className="h-4 w-4" />}
                />
              </div>

              <InsetPanel tone="accent">
                <p className="text-label" style={{ color: "var(--accent-primary)" }}>
                  Investigation pattern
                </p>
                <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  Choose a grouping, rank it by the metric that matters, and open
                  any row to inspect the exact trades behind it. This is the
                  deterministic layer the reports and AI coach should build on top
                  of.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={resetWorkspaceFilters}>
                    Reset Filters
                  </Button>
                </div>
              </InsetPanel>
            </ControlSurface>
          </div>

          {error ? (
            <InsetPanel tone="warning">
              <p className="text-label" style={{ color: "var(--warning-primary)" }}>
                Workspace Error
              </p>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                {error}
              </p>
            </InsetPanel>
          ) : null}

          {loading && !result ? (
            <LoadingListRows count={5} compact />
          ) : result && result.rows.length > 0 ? (
            <ReportGrid className="space-y-2" minWidthClassName="min-w-[880px]">
              <ReportGridHeader columns="minmax(0,1.65fr) minmax(80px,0.65fr) minmax(110px,0.75fr) minmax(90px,0.7fr) minmax(110px,0.75fr) minmax(90px,0.65fr) minmax(95px,0.75fr)">
                <span>Group</span>
                <span className="text-right">Trades</span>
                <span className="text-right">Net P&amp;L</span>
                <span className="text-right">Win Rate</span>
                <span className="text-right">Avg P&amp;L</span>
                <span className="text-right">Avg R</span>
                <span className="text-right">Reviewed</span>
              </ReportGridHeader>
              {result.rows.map((row) => {
                const isActive = selectedRow?.key === row.key;
                return (
                  <button
                    key={row.key}
                    type="button"
                    className="w-full text-left"
                    onClick={() =>
                      setPartialQuery({
                        drilldownKey: row.key,
                      })
                    }
                  >
                    <ReportGridRow
                      columns="minmax(0,1.65fr) minmax(80px,0.65fr) minmax(110px,0.75fr) minmax(90px,0.7fr) minmax(110px,0.75fr) minmax(90px,0.65fr) minmax(95px,0.75fr)"
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
                          {formatWorkspacePercent(row.share)} of matching trades
                        </p>
                      </div>
                      <span className="text-right text-sm">{row.trades}</span>
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
                        {row.avgRMultiple == null ? "--" : `${row.avgRMultiple.toFixed(2)}R`}
                      </span>
                      <span className="text-right text-sm">
                        {formatWorkspacePercent(row.reviewedPercent)}
                      </span>
                    </ReportGridRow>
                  </button>
                );
              })}
            </ReportGrid>
          ) : !loading ? (
            <WidgetEmptyState
              title="No grouped results"
              description="Adjust the current workspace filters or widen the account/date range above."
            />
          ) : null}
        </div>
      </AppPanel>

      <AnalyticsWorkspaceDrilldownSheet
        open={Boolean(result?.drilldown)}
        onOpenChange={(open) => {
          if (!open) {
            setPartialQuery({ drilldownKey: null });
          }
        }}
        drilldown={result?.drilldown ?? null}
        groupBy={query.groupBy}
        loading={false}
        error={null}
      />
    </>
  );
}
