"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ChoiceChip,
  ControlSurface,
  FieldGroup,
} from "@/components/ui/control-primitives";
import { AppPanel, PanelTitle } from "@/components/ui/page-primitives";
import { Input } from "@/components/ui/input";
import {
  ANALYTICS_WORKSPACE_DIMENSION_OPTIONS,
  ANALYTICS_WORKSPACE_MEASURE_OPTIONS,
} from "@/components/analytics/workspace-primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InsetPanel } from "@/components/ui/surface-primitives";
import type {
  JournalTemplate,
  MistakeDefinition,
  PropAccount,
  SetupDefinition,
} from "@/lib/db/schema";
import type { Playbook } from "@/lib/api/client/playbooks";
import type { ReportFilters, ReportType } from "@/lib/reports/types";
import { getDefaultReportQuerySettings } from "@/lib/reports/workspace-report";

interface ReportBuilderProps {
  filters: ReportFilters;
  propAccounts: PropAccount[];
  playbooks: Playbook[];
  setupDefinitions: SetupDefinition[];
  mistakeDefinitions: MistakeDefinition[];
  journalTemplates: JournalTemplate[];
  generating: boolean;
  onChange: (next: ReportFilters) => void;
  onGenerate: () => void;
}

const REPORT_TYPE_OPTIONS: Array<{
  value: ReportType;
  label: string;
  description: string;
}> = [
  {
    value: "performance",
    label: "Performance",
    description: "See what is making or losing money.",
  },
  {
    value: "playbook",
    label: "Playbook",
    description: "Compare strategies, setups, and structure.",
  },
  {
    value: "risk",
    label: "Risk",
    description: "Study mistakes, discipline, and weak spots.",
  },
];

const DIMENSIONS_BY_REPORT_TYPE: Record<
  ReportType,
  Array<ReportFilters["groupBy"]>
> = {
  performance: ["symbol", "session", "weekday", "direction", "setup", "template"],
  playbook: ["playbook", "setup", "template", "symbol", "session", "reviewStatus"],
  risk: ["mistake", "rule", "setup", "template", "session", "direction", "reviewStatus"],
};

const SIMPLE_MEASURE_OPTIONS: Array<ReportFilters["measure"]> = [
  "netPnl",
  "trades",
  "winRate",
  "avgRMultiple",
  "profitFactor",
  "reviewedPercent",
];

const ROW_COUNT_OPTIONS = [12, 24, 36, 50] as const;

const SESSION_OPTIONS = ["Asia", "London", "New York", "Overnight"] as const;

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoDateString(days: number) {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - days);
  return now.toISOString().slice(0, 10);
}

function yearStartDateString() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
    .toISOString()
    .slice(0, 10);
}

function getDimensionLabel(value: ReportFilters["groupBy"]) {
  return (
    ANALYTICS_WORKSPACE_DIMENSION_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  );
}

function getMeasureLabel(value: ReportFilters["measure"]) {
  return (
    ANALYTICS_WORKSPACE_MEASURE_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  );
}

function getCurrentAccountLabel(
  filters: ReportFilters,
  propAccounts: PropAccount[],
) {
  if (filters.accountScope !== "account" || !filters.propAccountId) {
    return null;
  }

  return (
    propAccounts.find((account) => account.id === filters.propAccountId)
      ?.accountName ?? "Selected Account"
  );
}

export function ReportBuilder({
  filters,
  propAccounts,
  playbooks,
  setupDefinitions,
  mistakeDefinitions,
  journalTemplates,
  generating,
  onChange,
  onGenerate,
}: ReportBuilderProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const recommendedDimensions = useMemo(
    () => DIMENSIONS_BY_REPORT_TYPE[filters.reportType],
    [filters.reportType],
  );
  const activeAccountLabel = getCurrentAccountLabel(filters, propAccounts);
  const datePresets = useMemo(
    () => [
      { key: "7d", label: "Last 7D", from: daysAgoDateString(6), to: todayDateString() },
      { key: "30d", label: "Last 30D", from: daysAgoDateString(29), to: todayDateString() },
      { key: "90d", label: "Last 90D", from: daysAgoDateString(89), to: todayDateString() },
      { key: "ytd", label: "YTD", from: yearStartDateString(), to: todayDateString() },
    ],
    [],
  );
  const activePresetKey =
    datePresets.find(
      (preset) => preset.from === filters.from && preset.to === filters.to,
    )?.key ?? null;
  const activeAdvancedFilters = [
    filters.measure !== getDefaultReportQuerySettings(filters.reportType).measure
      ? `Rank: ${getMeasureLabel(filters.measure)}`
      : null,
    filters.sortOrder !== "desc" ? "Lowest first" : null,
    filters.limit !== 24 ? `Rows: ${filters.limit}` : null,
    filters.symbol ? `Symbol` : null,
    filters.playbookId ? `Playbook` : null,
    filters.setupDefinitionId ? `Setup` : null,
    filters.mistakeDefinitionId ? `Mistake` : null,
    filters.journalTemplateId ? `Template` : null,
    filters.session ? `Session` : null,
    filters.direction ? `Direction` : null,
    filters.reviewStatus ? `Review` : null,
    filters.ruleStatus ? `Rule state` : null,
    filters.setupTag ? `Setup tag` : null,
    filters.mistakeTag ? `Mistake tag` : null,
    filters.title?.trim() ? `Custom title` : null,
  ].filter(Boolean) as string[];

  return (
    <AppPanel>
      <PanelTitle
        title="Report Builder"
        subtitle="Choose the kind of report, what to analyze, and the time window. Everything else is optional."
      />

      <div className="space-y-5">
        <FieldGroup label="Report Type">
          <ControlSurface className="flex flex-wrap gap-2">
            {REPORT_TYPE_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.value}
                active={filters.reportType === option.value}
                onClick={() => {
                  const defaults = getDefaultReportQuerySettings(option.value);
                  onChange({
                    ...filters,
                    reportType: option.value,
                    groupBy: defaults.groupBy,
                    measure: defaults.measure,
                  });
                }}
              >
                {option.label}
              </ChoiceChip>
            ))}
          </ControlSurface>
          <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            {
              REPORT_TYPE_OPTIONS.find((option) => option.value === filters.reportType)
                ?.description
            }
          </p>
        </FieldGroup>

        <FieldGroup label="Account Scope">
          <ControlSurface className="flex flex-wrap gap-2">
            <ChoiceChip
              active={filters.accountScope === "all"}
              onClick={() =>
                onChange({
                  ...filters,
                  accountScope: "all",
                  propAccountId: null,
                })
              }
            >
              All Accounts
            </ChoiceChip>
            {activeAccountLabel ? (
              <ChoiceChip
                active={filters.accountScope === "account"}
                onClick={() =>
                  onChange({
                    ...filters,
                    accountScope: "account",
                  })
                }
              >
                {activeAccountLabel}
              </ChoiceChip>
            ) : null}
            <ChoiceChip
              active={filters.accountScope === "unassigned"}
              onClick={() =>
                onChange({
                  ...filters,
                  accountScope: "unassigned",
                  propAccountId: null,
                })
              }
            >
              Unassigned
            </ChoiceChip>
          </ControlSurface>
        </FieldGroup>

        <FieldGroup label="Analyze By">
          <ControlSurface className="flex flex-wrap gap-2">
            {recommendedDimensions.map((dimension) => (
              <ChoiceChip
                key={dimension}
                active={filters.groupBy === dimension}
                onClick={() => onChange({ ...filters, groupBy: dimension })}
              >
                {getDimensionLabel(dimension)}
              </ChoiceChip>
            ))}
          </ControlSurface>
        </FieldGroup>

        <FieldGroup label="Date Range">
          <div className="space-y-3">
            <ControlSurface className="flex flex-wrap gap-2">
              {datePresets.map((preset) => (
                <ChoiceChip
                  key={preset.key}
                  active={activePresetKey === preset.key}
                  onClick={() =>
                    onChange({
                      ...filters,
                      from: preset.from,
                      to: preset.to,
                    })
                  }
                >
                  {preset.label}
                </ChoiceChip>
              ))}
            </ControlSurface>

            <div className="grid gap-4 md:grid-cols-2">
              <FieldGroup label="From">
                <Input
                  type="date"
                  value={filters.from ?? ""}
                  onChange={(event) =>
                    onChange({ ...filters, from: event.target.value || null })
                  }
                />
              </FieldGroup>

              <FieldGroup label="To">
                <Input
                  type="date"
                  value={filters.to ?? ""}
                  onChange={(event) =>
                    onChange({ ...filters, to: event.target.value || null })
                  }
                />
              </FieldGroup>
            </div>
          </div>
        </FieldGroup>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border px-4 py-3">
          <div>
            <p className="text-label">Advanced controls</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              Keep this closed unless you need tighter filtering or a custom ranking.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setAdvancedOpen((current) => !current)}
          >
            {advancedOpen ? "Hide advanced" : "Show advanced"}
          </Button>
        </div>

        {activeAdvancedFilters.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeAdvancedFilters.map((chip) => (
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
        ) : null}

        {advancedOpen ? (
          <InsetPanel paddingClassName="px-4 py-4">
            <div className="space-y-5">
              <FieldGroup label="Rank By">
                <ControlSurface className="flex flex-wrap gap-2">
                  {SIMPLE_MEASURE_OPTIONS.map((measure) => (
                    <ChoiceChip
                      key={measure}
                      active={filters.measure === measure}
                      onClick={() => onChange({ ...filters, measure })}
                    >
                      {getMeasureLabel(measure)}
                    </ChoiceChip>
                  ))}
                </ControlSurface>
              </FieldGroup>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FieldGroup label="Sort">
                  <ControlSurface className="flex flex-wrap gap-2">
                    <ChoiceChip
                      active={filters.sortOrder === "desc"}
                      onClick={() => onChange({ ...filters, sortOrder: "desc" })}
                    >
                      Highest First
                    </ChoiceChip>
                    <ChoiceChip
                      active={filters.sortOrder === "asc"}
                      onClick={() => onChange({ ...filters, sortOrder: "asc" })}
                    >
                      Lowest First
                    </ChoiceChip>
                  </ControlSurface>
                </FieldGroup>

                <FieldGroup label="Rows">
                  <ControlSurface className="flex flex-wrap gap-2">
                    {ROW_COUNT_OPTIONS.map((count) => (
                      <ChoiceChip
                        key={count}
                        active={filters.limit === count}
                        onClick={() => onChange({ ...filters, limit: count })}
                      >
                        {count}
                      </ChoiceChip>
                    ))}
                  </ControlSurface>
                </FieldGroup>

                <FieldGroup label="Review Status">
                  <ControlSurface className="flex flex-wrap gap-2">
                    <ChoiceChip
                      active={filters.reviewStatus === null}
                      onClick={() => onChange({ ...filters, reviewStatus: null })}
                    >
                      All
                    </ChoiceChip>
                    <ChoiceChip
                      active={filters.reviewStatus === "reviewed"}
                      onClick={() =>
                        onChange({ ...filters, reviewStatus: "reviewed" })
                      }
                    >
                      Reviewed
                    </ChoiceChip>
                    <ChoiceChip
                      active={filters.reviewStatus === "needsReview"}
                      onClick={() =>
                        onChange({ ...filters, reviewStatus: "needsReview" })
                      }
                    >
                      Needs Review
                    </ChoiceChip>
                  </ControlSurface>
                </FieldGroup>

                <FieldGroup label="Rule Status">
                  <ControlSurface className="flex flex-wrap gap-2">
                    <ChoiceChip
                      active={filters.ruleStatus === null}
                      onClick={() => onChange({ ...filters, ruleStatus: null })}
                    >
                      All
                    </ChoiceChip>
                    <ChoiceChip
                      active={filters.ruleStatus === "followed"}
                      onClick={() =>
                        onChange({
                          ...filters,
                          ruleStatus:
                            filters.ruleStatus === "followed" ? null : "followed",
                        })
                      }
                    >
                      Followed
                    </ChoiceChip>
                    <ChoiceChip
                      active={filters.ruleStatus === "broken"}
                      onClick={() =>
                        onChange({
                          ...filters,
                          ruleStatus:
                            filters.ruleStatus === "broken" ? null : "broken",
                        })
                      }
                    >
                      Broken
                    </ChoiceChip>
                    <ChoiceChip
                      active={filters.ruleStatus === "skipped"}
                      onClick={() =>
                        onChange({
                          ...filters,
                          ruleStatus:
                            filters.ruleStatus === "skipped" ? null : "skipped",
                        })
                      }
                    >
                      Skipped
                    </ChoiceChip>
                    <ChoiceChip
                      active={filters.ruleStatus === "notApplicable"}
                      onClick={() =>
                        onChange({
                          ...filters,
                          ruleStatus:
                            filters.ruleStatus === "notApplicable"
                              ? null
                              : "notApplicable",
                        })
                      }
                    >
                      N/A
                    </ChoiceChip>
                  </ControlSurface>
                </FieldGroup>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FieldGroup label="Session">
                  <ControlSurface className="flex flex-wrap gap-2">
                    <ChoiceChip
                      active={filters.session === null}
                      onClick={() => onChange({ ...filters, session: null })}
                    >
                      All
                    </ChoiceChip>
                    {SESSION_OPTIONS.map((session) => (
                      <ChoiceChip
                        key={session}
                        active={filters.session === session}
                        onClick={() =>
                          onChange({
                            ...filters,
                            session: filters.session === session ? null : session,
                          })
                        }
                      >
                        {session}
                      </ChoiceChip>
                    ))}
                  </ControlSurface>
                </FieldGroup>

                <FieldGroup label="Direction">
                  <ControlSurface className="flex flex-wrap gap-2">
                    <ChoiceChip
                      active={filters.direction === null}
                      onClick={() => onChange({ ...filters, direction: null })}
                    >
                      All
                    </ChoiceChip>
                    <ChoiceChip
                      active={filters.direction === "LONG"}
                      onClick={() =>
                        onChange({
                          ...filters,
                          direction: filters.direction === "LONG" ? null : "LONG",
                        })
                      }
                    >
                      Long
                    </ChoiceChip>
                    <ChoiceChip
                      active={filters.direction === "SHORT"}
                      onClick={() =>
                        onChange({
                          ...filters,
                          direction: filters.direction === "SHORT" ? null : "SHORT",
                        })
                      }
                    >
                      Short
                    </ChoiceChip>
                  </ControlSurface>
                </FieldGroup>

                <FieldGroup label="Report Title">
                  <Input
                    value={filters.title ?? ""}
                    onChange={(event) =>
                      onChange({ ...filters, title: event.target.value })
                    }
                    placeholder="Optional custom title"
                  />
                </FieldGroup>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FieldGroup label="Symbol">
                  <Input
                    value={filters.symbol ?? ""}
                    onChange={(event) =>
                      onChange({
                        ...filters,
                        symbol: event.target.value.trim() || null,
                      })
                    }
                    placeholder="Optional symbol"
                  />
                </FieldGroup>

                <FieldGroup label="Playbook">
                  <Select
                    value={filters.playbookId ?? "all"}
                    onValueChange={(value) =>
                      onChange({
                        ...filters,
                        playbookId: value === "all" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All playbooks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Playbooks</SelectItem>
                      <SelectItem value="unassigned">Unassigned Playbook</SelectItem>
                      {playbooks.map((playbook) => (
                        <SelectItem key={playbook.id} value={playbook.id}>
                          {playbook.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Setup">
                  <Select
                    value={filters.setupDefinitionId ?? "all"}
                    onValueChange={(value) =>
                      onChange({
                        ...filters,
                        setupDefinitionId: value === "all" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All setups" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Setups</SelectItem>
                      <SelectItem value="unassigned">No Setup</SelectItem>
                      {setupDefinitions.map((setup) => (
                        <SelectItem key={setup.id} value={setup.id}>
                          {setup.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Mistake">
                  <Select
                    value={filters.mistakeDefinitionId ?? "all"}
                    onValueChange={(value) =>
                      onChange({
                        ...filters,
                        mistakeDefinitionId: value === "all" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All mistakes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Mistakes</SelectItem>
                      <SelectItem value="unassigned">No Mistake</SelectItem>
                      {mistakeDefinitions.map((mistake) => (
                        <SelectItem key={mistake.id} value={mistake.id}>
                          {mistake.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FieldGroup label="Template">
                  <Select
                    value={filters.journalTemplateId ?? "all"}
                    onValueChange={(value) =>
                      onChange({
                        ...filters,
                        journalTemplateId: value === "all" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All templates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Templates</SelectItem>
                      <SelectItem value="unassigned">No Template</SelectItem>
                      {journalTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Setup Tag">
                  <Input
                    value={filters.setupTag ?? ""}
                    onChange={(event) =>
                      onChange({
                        ...filters,
                        setupTag: event.target.value.trim() || null,
                      })
                    }
                    placeholder="Optional additional setup tag"
                  />
                </FieldGroup>

                <FieldGroup label="Mistake Tag">
                  <Input
                    value={filters.mistakeTag ?? ""}
                    onChange={(event) =>
                      onChange({
                        ...filters,
                        mistakeTag: event.target.value.trim() || null,
                      })
                    }
                    placeholder="Optional additional mistake tag"
                  />
                </FieldGroup>
              </div>
            </div>
          </InsetPanel>
        ) : null}

        <div className="flex justify-end">
          <Button onClick={onGenerate} disabled={generating}>
            {generating ? "Building..." : "Build Report View"}
          </Button>
        </div>
      </div>
    </AppPanel>
  );
}
