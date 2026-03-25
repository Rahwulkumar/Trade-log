"use client";

import { AlertTriangle, BookOpen, Brain, Clock, Shield, Target, TrendingUp, Zap } from "lucide-react";

import { ReportSummaryGrid } from "@/components/reports/report-sections";
import { AppPanel, AppPanelEmptyState, SectionHeader } from "@/components/ui/page-primitives";
import { InsetPanel } from "@/components/ui/surface-primitives";
import type { ReportAiCommentary, TradeReportSnapshot } from "@/lib/reports/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function splitParagraphs(value: string): string[] {
  return value
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// ─── Narrative Block ──────────────────────────────────────────────────────────

function NarrativeBlock({ text }: { text: string }) {
  const paragraphs = splitParagraphs(text);
  return (
    <div className="space-y-4">
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="text-sm leading-7"
          style={{ color: "var(--text-secondary)" }}
        >
          {p}
        </p>
      ))}
    </div>
  );
}

// ─── Section Panel ────────────────────────────────────────────────────────────

function SectionPanel({
  icon,
  title,
  narrative,
  bullets,
  bulletTone = "default",
  bulletLabel,
}: {
  icon: React.ReactNode;
  title: string;
  narrative: string;
  bullets?: string[];
  bulletTone?: "default" | "profit" | "loss" | "warning" | "accent";
  bulletLabel?: string;
}) {
  return (
    <AppPanel>
      <div className="mb-4 flex items-center gap-2.5">
        <span style={{ color: "var(--accent-primary)" }}>{icon}</span>
        <h3 className="text-[0.95rem] font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-syne)" }}>
          {title}
        </h3>
      </div>

      <NarrativeBlock text={narrative} />

      {bullets && bullets.length > 0 && (
        <div className="mt-5">
          {bulletLabel && (
            <p className="text-label mb-3" style={{ color: "var(--text-tertiary)" }}>
              {bulletLabel}
            </p>
          )}
          <BulletList items={bullets} tone={bulletTone} />
        </div>
      )}
    </AppPanel>
  );
}

// ─── Bullet List ──────────────────────────────────────────────────────────────

function BulletList({
  items,
  tone = "default",
}: {
  items: string[];
  tone?: "default" | "profit" | "loss" | "warning" | "accent";
}) {
  const colorMap = {
    default: "var(--text-secondary)",
    profit: "var(--profit-primary)",
    loss: "var(--loss-primary)",
    warning: "var(--warning-primary)",
    accent: "var(--accent-primary)",
  } as const;

  const dotColorMap = {
    default: "var(--border-default)",
    profit: "var(--profit-primary)",
    loss: "var(--loss-primary)",
    warning: "var(--warning-primary)",
    accent: "var(--accent-primary)",
  } as const;

  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm leading-6">
          <span
            className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: dotColorMap[tone] }}
          />
          <span style={{ color: colorMap[tone] }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Two-column insight panels ────────────────────────────────────────────────

function InsightPair({
  leftTitle,
  leftItems,
  leftTone,
  rightTitle,
  rightItems,
  rightTone,
}: {
  leftTitle: string;
  leftItems: string[];
  leftTone: "profit" | "loss" | "warning" | "accent" | "default";
  rightTitle: string;
  rightItems: string[];
  rightTone: "profit" | "loss" | "warning" | "accent" | "default";
}) {
  const panelTone = (t: typeof leftTone) =>
    t === "profit" ? "profit" : t === "loss" ? "loss" : t === "warning" ? "warning" : t === "accent" ? "accent" : "default";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <InsetPanel tone={panelTone(leftTone)}>
        <p className="text-label mb-3" style={{ color: leftTone === "profit" ? "var(--profit-primary)" : leftTone === "loss" ? "var(--loss-primary)" : leftTone === "warning" ? "var(--warning-primary)" : "var(--accent-primary)" }}>
          {leftTitle}
        </p>
        {leftItems.length > 0 ? (
          <BulletList items={leftItems} tone={leftTone} />
        ) : (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No signals detected.</p>
        )}
      </InsetPanel>

      <InsetPanel tone={panelTone(rightTone)}>
        <p className="text-label mb-3" style={{ color: rightTone === "profit" ? "var(--profit-primary)" : rightTone === "loss" ? "var(--loss-primary)" : rightTone === "warning" ? "var(--warning-primary)" : "var(--accent-primary)" }}>
          {rightTitle}
        </p>
        {rightItems.length > 0 ? (
          <BulletList items={rightItems} tone={rightTone} />
        ) : (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No signals detected.</p>
        )}
      </InsetPanel>
    </div>
  );
}

// ─── Verdict callout ──────────────────────────────────────────────────────────

function VerdictPanel({ text }: { text: string }) {
  return (
    <div
      style={{
        borderLeft: "3px solid var(--accent-primary)",
        background: "var(--accent-soft)",
        borderRadius: `0 var(--radius-lg) var(--radius-lg) 0`,
        padding: "20px 24px",
      }}
    >
      <p
        className="text-label mb-2"
        style={{ color: "var(--accent-primary)", fontFamily: "var(--font-syne)", letterSpacing: "0.08em" }}
      >
        VERDICT
      </p>
      <p className="text-sm leading-7" style={{ color: "var(--text-primary)" }}>
        {text}
      </p>
    </div>
  );
}

// ─── Action plan ──────────────────────────────────────────────────────────────

function ActionPlan({
  quickWins,
  longerTermFocus,
  correctiveActions,
}: {
  quickWins: string[];
  longerTermFocus: string[];
  correctiveActions: string[];
}) {
  return (
    <AppPanel>
      <div className="mb-4 flex items-center gap-2.5">
        <span style={{ color: "var(--accent-primary)" }}><Target size={18} /></span>
        <h3 className="text-[0.95rem] font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-syne)" }}>
          Action Plan
        </h3>
      </div>

      <div className="space-y-5">
        {quickWins.length > 0 && (
          <div>
            <p className="text-label mb-3" style={{ color: "var(--accent-primary)" }}>
              Quick Wins — Do This Week
            </p>
            <BulletList items={quickWins} tone="accent" />
          </div>
        )}

        {longerTermFocus.length > 0 && (
          <div>
            <div className="my-4" style={{ height: 1, background: "var(--border-subtle)" }} />
            <p className="text-label mb-3" style={{ color: "var(--warning-primary)" }}>
              Longer-Term Focus — Next Month
            </p>
            <BulletList items={longerTermFocus} tone="warning" />
          </div>
        )}

        {correctiveActions.length > 0 && (
          <div>
            <div className="my-4" style={{ height: 1, background: "var(--border-subtle)" }} />
            <p className="text-label mb-3" style={{ color: "var(--loss-primary)" }}>
              Corrective Actions
            </p>
            <ol className="space-y-3">
              {correctiveActions.map((action, i) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-6">
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none"
                    style={{
                      background: "var(--loss-bg)",
                      color: "var(--loss-primary)",
                      fontFamily: "var(--font-jb-mono)",
                      marginTop: 3,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>{action}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </AppPanel>
  );
}

// ─── Main viewer ──────────────────────────────────────────────────────────────

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
      {/* Summary metric cards */}
      <ReportSummaryGrid snapshot={snapshot} onSave={onSave} saving={saving} aiPrimary={false} />

      {/* Gemini header */}
      <SectionHeader
        eyebrow="Gemini 2.5 Pro"
        title="AI Performance Review"
        subtitle="Deep analysis grounded entirely on your closed trade records. Every observation references actual data."
      />

      {/* Headline + Executive Summary */}
      <AppPanel>
        <h2
          className="text-xl font-bold leading-snug mb-3"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-syne)" }}
        >
          {ai.headline}
        </h2>
        <p className="text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
          {ai.executiveSummary}
        </p>
      </AppPanel>

      {/* Performance narrative */}
      {ai.performanceNarrative && (
        <SectionPanel
          icon={<TrendingUp size={18} />}
          title="Performance Analysis"
          narrative={ai.performanceNarrative}
        />
      )}

      {/* Strengths + Weaknesses */}
      <InsightPair
        leftTitle="Strengths"
        leftItems={ai.strengths}
        leftTone="profit"
        rightTitle="Weaknesses"
        rightItems={ai.weaknesses}
        rightTone="loss"
      />

      {/* Psychology */}
      {ai.psychologyAnalysis && (
        <SectionPanel
          icon={<Brain size={18} />}
          title="Psychology & Behavioural Analysis"
          narrative={ai.psychologyAnalysis}
          bullets={ai.psychologyFlags}
          bulletTone="warning"
          bulletLabel="Psychology Flags"
        />
      )}

      {/* Risk */}
      {ai.riskAnalysis && (
        <SectionPanel
          icon={<Shield size={18} />}
          title="Risk Management Analysis"
          narrative={ai.riskAnalysis}
          bullets={ai.riskFlags}
          bulletTone="loss"
          bulletLabel="Risk Flags"
        />
      )}

      {/* Timing */}
      {ai.timingAnalysis ? (
        <SectionPanel
          icon={<Clock size={18} />}
          title="Timing & Session Analysis"
          narrative={ai.timingAnalysis}
          bullets={ai.timingObservations}
          bulletTone="accent"
          bulletLabel="Key Timing Observations"
        />
      ) : ai.timingObservations.length > 0 ? (
        <AppPanel>
          <div className="mb-4 flex items-center gap-2.5">
            <span style={{ color: "var(--accent-primary)" }}><Clock size={18} /></span>
            <h3 className="text-[0.95rem] font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-syne)" }}>
              Timing Observations
            </h3>
          </div>
          <BulletList items={ai.timingObservations} tone="accent" />
        </AppPanel>
      ) : null}

      {/* Playbook */}
      {ai.playbookAnalysis ? (
        <SectionPanel
          icon={<BookOpen size={18} />}
          title="Strategy & Playbook Analysis"
          narrative={ai.playbookAnalysis}
          bullets={ai.playbookObservations}
          bulletTone="accent"
          bulletLabel="Playbook Observations"
        />
      ) : ai.playbookObservations.length > 0 ? (
        <AppPanel>
          <div className="mb-4 flex items-center gap-2.5">
            <span style={{ color: "var(--accent-primary)" }}><BookOpen size={18} /></span>
            <h3 className="text-[0.95rem] font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-syne)" }}>
              Playbook Observations
            </h3>
          </div>
          <BulletList items={ai.playbookObservations} tone="accent" />
        </AppPanel>
      ) : null}

      {/* Repeated patterns */}
      {ai.repeatedPatterns.length > 0 && (
        <AppPanel>
          <div className="mb-4 flex items-center gap-2.5">
            <span style={{ color: "var(--warning-primary)" }}><Zap size={18} /></span>
            <h3 className="text-[0.95rem] font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-syne)" }}>
              Repeated Patterns
            </h3>
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
            Behaviours that appear consistently across the dataset — both habits to keep and habits to break.
          </p>
          <BulletList items={ai.repeatedPatterns} tone="warning" />
        </AppPanel>
      )}

      {/* Action plan */}
      <ActionPlan
        quickWins={ai.quickWins ?? []}
        longerTermFocus={ai.longerTermFocus ?? []}
        correctiveActions={ai.correctiveActions}
      />

      {/* Verdict */}
      {ai.verdict && <VerdictPanel text={ai.verdict} />}

      {/* Confidence note */}
      <p className="text-xs px-1" style={{ color: "var(--text-tertiary)" }}>
        <span className="font-medium" style={{ color: "var(--text-secondary)" }}>Confidence: </span>
        {ai.confidence}
      </p>
    </div>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────

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
        <ReportSummaryGrid snapshot={report} onSave={onSave} saving={saving} aiPrimary={false} />
        <InsetPanel tone="warning" className="flex items-start gap-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: "var(--warning-primary)" }} />
          <div>
            <p className="text-label" style={{ color: "var(--warning-primary)" }}>AI Report Unavailable</p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{report.aiError}</p>
          </div>
        </InsetPanel>
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
