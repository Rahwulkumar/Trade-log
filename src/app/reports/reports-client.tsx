"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, RefreshCw } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import { ReportBuilder } from "@/components/reports/report-builder";
import { SavedReportList } from "@/components/reports/report-saved-list";
import { ReportViewer } from "@/components/reports/report-viewer";
import { Button } from "@/components/ui/button";
import {
  AppPageHeader,
  AppPanelEmptyState,
} from "@/components/ui/page-primitives";
import { InsetPanel } from "@/components/ui/surface-primitives";
import {
  LoadingHeroPanel,
  LoadingListRows,
  LoadingPanel,
} from "@/components/ui/loading";
import { getActivePlaybooks, type Playbook } from "@/lib/api/client/playbooks";
import {
  deleteReport,
  generateReport,
  getSavedReport,
  getSavedReports,
  saveReport,
} from "@/lib/api/client/reports";
import type {
  ReportFilters,
  ReportSnapshot,
  SavedReportListItem,
} from "@/lib/reports/types";
import {
  getDefaultReportQuerySettings,
  normalizeReportFilters,
} from "@/lib/reports/workspace-report";

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartDateString() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function deriveFiltersFromAccount(
  selectedAccountId: string | null | undefined,
): Pick<ReportFilters, "accountScope" | "propAccountId"> {
  if (selectedAccountId === "unassigned") {
    return { accountScope: "unassigned", propAccountId: null };
  }
  if (selectedAccountId) {
    return { accountScope: "account", propAccountId: selectedAccountId };
  }
  return { accountScope: "all", propAccountId: null };
}

function createInitialFilters(
  selectedAccountId: string | null | undefined,
): ReportFilters {
  const defaults = getDefaultReportQuerySettings("performance");
  return {
    title: null,
    reportType: "performance",
    ...deriveFiltersFromAccount(selectedAccountId),
    from: monthStartDateString(),
    to: todayDateString(),
    includeAi: false,
    groupBy: defaults.groupBy,
    measure: defaults.measure,
    sortOrder: "desc",
    limit: 24,
    timeZone: null,
    symbol: null,
    session: null,
    playbookId: null,
    setupTag: null,
    mistakeTag: null,
    direction: null,
    reviewStatus: null,
  };
}

export function ReportsClient() {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const { propAccounts, selectedAccountId } = usePropAccount();

  const [filters, setFilters] = useState<ReportFilters>(() =>
    createInitialFilters(selectedAccountId),
  );
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReportListItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [currentReport, setCurrentReport] = useState<ReportSnapshot | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      ...deriveFiltersFromAccount(selectedAccountId),
    }));
  }, [selectedAccountId]);

  const loadSavedState = useCallback(async () => {
    if (!isConfigured || !user) {
      setReportsLoading(false);
      return;
    }

    try {
      setReportsLoading(true);
      setError(null);

      const [saved, active] = await Promise.all([
        getSavedReports(),
        getActivePlaybooks(),
      ]);

      setSavedReports(saved);
      setPlaybooks(active);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load reports",
      );
    } finally {
      setReportsLoading(false);
    }
  }, [isConfigured, user]);

  useEffect(() => {
    if (!authLoading) {
      void loadSavedState();
    }
  }, [authLoading, loadSavedState]);

  const scopeLabel = useMemo(() => {
    if (filters.accountScope === "all") return "All Accounts";
    if (filters.accountScope === "unassigned") return "Unassigned";
    return "Scoped Account";
  }, [filters.accountScope]);

  async function handleGenerate() {
    try {
      setGenerating(true);
      setError(null);

      const report = await generateReport(filters);
      setCurrentReport(report);
      setActiveReportId(null);
      setFilters(normalizeReportFilters({ ...filters, title: report.title }));
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Failed to generate report",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!currentReport) return;

    try {
      setSaving(true);
      setError(null);

      const saved = await saveReport(
        filters.title?.trim() || currentReport.title,
        {
          ...currentReport,
          title: filters.title?.trim() || currentReport.title,
        },
      );

      setSavedReports((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      setActiveReportId(saved.id);
      setCurrentReport(saved.snapshot);
      setFilters(normalizeReportFilters({ ...saved.snapshot.filters, title: saved.snapshot.title }));
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save report",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenSaved(id: string) {
    try {
      setError(null);
      const saved = await getSavedReport(id);
      setActiveReportId(saved.id);
      setCurrentReport(saved.snapshot);
      setFilters(normalizeReportFilters({ ...saved.snapshot.filters, title: saved.snapshot.title }));
    } catch (openError) {
      setError(
        openError instanceof Error ? openError.message : "Failed to load report",
      );
    }
  }

  async function handleDeleteSaved(id: string) {
    if (!confirm("Delete this saved report snapshot?")) {
      return;
    }

    try {
      setDeletingId(id);
      setError(null);
      await deleteReport(id);
      setSavedReports((prev) => prev.filter((report) => report.id !== id));
      if (activeReportId === id) {
        setActiveReportId(null);
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Failed to delete report",
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (authLoading || reportsLoading) {
    return (
      <div className="space-y-6">
        <LoadingHeroPanel />
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <LoadingPanel rows={6} />
          <LoadingPanel rows={0}>
            <LoadingListRows count={4} compact />
          </LoadingPanel>
        </section>
        <LoadingPanel chart />
      </div>
    );
  }

  if (!isConfigured || !user) {
    return (
      <AppPanelEmptyState
        title="Login required"
        description="Sign in to generate and save inline trading reports."
        action={
          <Button asChild>
            <Link href="/auth/login">Sign In</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <AppPageHeader
        eyebrow="Analytics"
        title="Reports"
        description="Generate deterministic saved analysis views from your closed trades, inspect the exact buckets, and reopen them later."
        icon={
          <FileText
            size={18}
            strokeWidth={1.8}
            style={{ color: "var(--text-inverse)" }}
          />
        }
        actions={
          <Button variant="outline" onClick={() => void loadSavedState()}>
            <RefreshCw size={14} />
            Refresh
          </Button>
        }
      />

      {error ? (
        <InsetPanel tone="warning">
          <p className="text-label" style={{ color: "var(--warning-primary)" }}>
            Reports Error
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            {error}
          </p>
        </InsetPanel>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <ReportBuilder
          filters={filters}
          propAccounts={propAccounts}
          playbooks={playbooks}
          generating={generating}
          onChange={setFilters}
          onGenerate={() => void handleGenerate()}
        />
        <SavedReportList
          reports={savedReports}
          loading={false}
          activeReportId={activeReportId}
          deletingId={deletingId}
          onOpen={(id) => void handleOpenSaved(id)}
          onDelete={(id) => void handleDeleteSaved(id)}
        />
      </section>

      <ReportViewer
        report={currentReport}
        saving={saving}
        onSave={() => void handleSave()}
      />

      <InsetPanel tone="accent">
        <div>
          <p className="text-label" style={{ color: "var(--accent-primary)" }}>
            Report Method
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Reports now save the deterministic workspace itself. The ranking,
            filters, grouped buckets, and trade drilldowns come directly from
            your trade data so the report can be reopened and inspected without
            relying on AI narration.
          </p>
          <p className="mt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
            Current scope: {scopeLabel} | {filters.from ?? "Start"} {"->"}{" "}
            {filters.to ?? "Now"} | Saved snapshots: {savedReports.length}
          </p>
        </div>
      </InsetPanel>
    </div>
  );
}
