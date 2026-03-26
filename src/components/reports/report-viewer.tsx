"use client";

import {
  AlertTriangle,
  BookOpen,
  Brain,
  Clock,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";

import { ReportSummaryGrid } from "@/components/reports/report-sections";
import { AppPanelEmptyState, SectionHeader } from "@/components/ui/page-primitives";
import {
  ReportActionPlan,
  ReportCallout,
  ReportInsightColumns,
  ReportSectionPanel,
} from "@/components/ui/report-primitives";
import type { ReportAiCommentary, TradeReportSnapshot } from "@/lib/reports/types";

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

      <ReportSectionPanel
        title={ai.headline}
        narrative={ai.executiveSummary}
      />

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

      <ReportCallout
        label="Confidence"
        body={ai.confidence}
        tone="default"
      />
    </div>
  );
}

export function ReportViewer({
  report,
  saving,
  onSave,
}: {
  report: TradeReportSnapshot | null;
  saving: boolean;
  onSave: () => void;
}) {
  if (!report) {
    return (
      <AppPanelEmptyState
        title="Generate an AI report"
        description="Use the builder to generate an AI-written trading report. It will render inline here and can then be saved as a snapshot."
      />
    );
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
