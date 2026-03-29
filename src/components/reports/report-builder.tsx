"use client";

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
import type { PropAccount } from "@/lib/db/schema";
import type { Playbook } from "@/lib/api/client/playbooks";
import type { ReportFilters } from "@/lib/reports/types";
import { getDefaultReportQuerySettings } from "@/lib/reports/workspace-report";

interface ReportBuilderProps {
  filters: ReportFilters;
  propAccounts: PropAccount[];
  playbooks: Playbook[];
  generating: boolean;
  onChange: (next: ReportFilters) => void;
  onGenerate: () => void;
}

function getAccountSelectValue(filters: ReportFilters) {
  if (filters.accountScope === "all") return "all";
  if (filters.accountScope === "unassigned") return "unassigned";
  return filters.propAccountId ?? "all";
}

export function ReportBuilder({
  filters,
  propAccounts,
  playbooks,
  generating,
  onChange,
  onGenerate,
}: ReportBuilderProps) {
  const accountValue = getAccountSelectValue(filters);

  return (
    <AppPanel>
      <PanelTitle
        title="Report Builder"
        subtitle="Generate a deterministic analysis view directly from your selected closed trades, then save it as a reusable report."
      />

      <div className="space-y-4">
        <FieldGroup label="Report Type">
          <ControlSurface className="flex flex-wrap gap-2">
            <ChoiceChip
              active={filters.reportType === "performance"}
              onClick={() => {
                const defaults = getDefaultReportQuerySettings("performance");
                onChange({
                  ...filters,
                  reportType: "performance",
                  groupBy: defaults.groupBy,
                  measure: defaults.measure,
                });
              }}
            >
              Performance
            </ChoiceChip>
            <ChoiceChip
              active={filters.reportType === "playbook"}
              onClick={() => {
                const defaults = getDefaultReportQuerySettings("playbook");
                onChange({
                  ...filters,
                  reportType: "playbook",
                  groupBy: defaults.groupBy,
                  measure: defaults.measure,
                });
              }}
            >
              Playbook
            </ChoiceChip>
            <ChoiceChip
              active={filters.reportType === "risk"}
              onClick={() => {
                const defaults = getDefaultReportQuerySettings("risk");
                onChange({
                  ...filters,
                  reportType: "risk",
                  groupBy: defaults.groupBy,
                  measure: defaults.measure,
                });
              }}
            >
              Risk
            </ChoiceChip>
          </ControlSurface>
        </FieldGroup>

        <div className="grid gap-4 lg:grid-cols-4">
          <FieldGroup label="Group By">
            <Select
              value={filters.groupBy}
              onValueChange={(value) =>
                onChange({ ...filters, groupBy: value as ReportFilters["groupBy"] })
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
              value={filters.measure}
              onValueChange={(value) =>
                onChange({ ...filters, measure: value as ReportFilters["measure"] })
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
              value={filters.sortOrder}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  sortOrder: value as ReportFilters["sortOrder"],
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

          <FieldGroup label="Rows">
            <Select
              value={String(filters.limit)}
              onValueChange={(value) =>
                onChange({ ...filters, limit: Number(value) })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="24">24</SelectItem>
                <SelectItem value="36">36</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </FieldGroup>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <FieldGroup label="Report Title">
            <Input
              value={filters.title ?? ""}
              onChange={(event) =>
                onChange({ ...filters, title: event.target.value })
              }
              placeholder="Optional custom report title"
            />
          </FieldGroup>

          <FieldGroup label="Account Scope">
            <Select
              value={accountValue}
              onValueChange={(value) => {
                if (value === "all") {
                  onChange({ ...filters, accountScope: "all", propAccountId: null });
                  return;
                }
                if (value === "unassigned") {
                  onChange({
                    ...filters,
                    accountScope: "unassigned",
                    propAccountId: null,
                  });
                  return;
                }
                onChange({
                  ...filters,
                  accountScope: "account",
                  propAccountId: value,
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select account scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="unassigned">Unassigned Trades</SelectItem>
                {propAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.accountName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

          <FieldGroup label="Symbol Filter">
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

          <FieldGroup label="Playbook Filter">
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
                {playbooks.map((playbook) => (
                  <SelectItem key={playbook.id} value={playbook.id}>
                    {playbook.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FieldGroup label="Session Filter">
            <Select
              value={filters.session ?? "all"}
              onValueChange={(value) =>
                onChange({ ...filters, session: value === "all" ? null : value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                <SelectItem value="Asia">Asia</SelectItem>
                <SelectItem value="London">London</SelectItem>
                <SelectItem value="New York">New York</SelectItem>
                <SelectItem value="Overnight">Overnight</SelectItem>
              </SelectContent>
            </Select>
          </FieldGroup>

          <FieldGroup label="Direction Filter">
            <Select
              value={filters.direction ?? "all"}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  direction: value === "all" ? null : (value as "LONG" | "SHORT"),
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="LONG">Long</SelectItem>
                <SelectItem value="SHORT">Short</SelectItem>
              </SelectContent>
            </Select>
          </FieldGroup>

          <FieldGroup label="Review Filter">
            <Select
              value={filters.reviewStatus ?? "all"}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  reviewStatus:
                    value === "all"
                      ? null
                      : (value as ReportFilters["reviewStatus"]),
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="needsReview">Needs Review</SelectItem>
              </SelectContent>
            </Select>
          </FieldGroup>
        </div>

        <div className="flex justify-end">
          <Button onClick={onGenerate} disabled={generating}>
            {generating ? "Generating..." : "Generate Report View"}
          </Button>
        </div>
      </div>
    </AppPanel>
  );
}
