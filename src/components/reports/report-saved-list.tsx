"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingListRows } from "@/components/ui/loading";
import { AppPanel, PanelTitle } from "@/components/ui/page-primitives";
import { ListItemRow, WidgetEmptyState } from "@/components/ui/surface-primitives";
import { ReportTypeBadge } from "@/components/ui/report-primitives";
import type { SavedReportListItem } from "@/lib/reports/types";

function getBadgeTone(reportType: SavedReportListItem["reportType"]) {
  if (reportType === "playbook") return "strategy" as const;
  if (reportType === "risk") return "risk" as const;
  return "performance" as const;
}

function formatScope(report: SavedReportListItem) {
  if (report.accountScope === "all") return "All Accounts";
  if (report.accountScope === "unassigned") return "Unassigned";
  return "Scoped Account";
}

export function SavedReportList({
  reports,
  loading,
  activeReportId,
  deletingId,
  onOpen,
  onDelete,
}: {
  reports: SavedReportListItem[];
  loading: boolean;
  activeReportId: string | null;
  deletingId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <AppPanel className="h-full">
      <PanelTitle
        title="Saved Reports"
        subtitle="Open previously generated snapshots or delete old report runs."
      />

      {loading ? (
        <LoadingListRows count={4} compact />
      ) : reports.length === 0 ? (
        <WidgetEmptyState
          title="No saved reports yet"
          description="Generate a report inline, then save it here for later review."
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ListItemRow
              key={report.id}
              className={activeReportId === report.id ? "ring-1 ring-[var(--accent-primary)]" : undefined}
              leading={
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <ReportTypeBadge
                      label={report.reportType}
                      tone={getBadgeTone(report.reportType)}
                    />
                    {report.includeAi ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold"
                        style={{
                          background: "var(--accent-soft)",
                          color: "var(--accent-primary)",
                        }}
                      >
                        Gemini
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-sm font-semibold">{report.title}</p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {formatScope(report)} | {report.tradeCount} trades |{" "}
                    {report.from ?? "Start"} {"->"} {report.to ?? "Now"}
                  </p>
                </div>
              }
              trailing={
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onOpen(report.id)}>
                    Open
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(report.id)}
                    disabled={deletingId === report.id}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </AppPanel>
  );
}
