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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PropAccount } from "@/lib/db/schema";
import type { Playbook } from "@/lib/api/client/playbooks";
import type { ReportFilters } from "@/lib/reports/types";

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
        subtitle="Generate an AI-first inline report directly from your selected trade records."
      />

      <div className="space-y-4">
        <FieldGroup label="Report Type">
          <ControlSurface className="flex flex-wrap gap-2">
            <ChoiceChip
              active={filters.reportType === "performance"}
              onClick={() => onChange({ ...filters, reportType: "performance" })}
            >
              Performance
            </ChoiceChip>
            <ChoiceChip
              active={filters.reportType === "playbook"}
              onClick={() => onChange({ ...filters, reportType: "playbook" })}
            >
              Playbook
            </ChoiceChip>
            <ChoiceChip
              active={filters.reportType === "risk"}
              onClick={() => onChange({ ...filters, reportType: "risk" })}
            >
              Risk
            </ChoiceChip>
          </ControlSurface>
        </FieldGroup>

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

        <FieldGroup label="AI Report Mode">
          <ControlSurface>
            <p className="text-sm font-medium">Gemini 2.5 Pro</p>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              Reports are generated as AI-written narrative only. Deterministic
              trade calculations still ground the prompt, but they are not shown
              directly in the report output.
            </p>
          </ControlSurface>
        </FieldGroup>

        <div className="flex justify-end">
          <Button onClick={onGenerate} disabled={generating}>
            {generating ? "Generating..." : "Generate AI Report"}
          </Button>
        </div>
      </div>
    </AppPanel>
  );
}
