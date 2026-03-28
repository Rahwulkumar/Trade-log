"use client";

import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AppMetricCard,
  AppPanel,
  SectionHeader,
} from "@/components/ui/page-primitives";
import { InsetPanel, WidgetEmptyState } from "@/components/ui/surface-primitives";
import type { StrategyEvaluation } from "@/lib/api/client/ai";

function toneFromReadiness(readiness: StrategyEvaluation["readiness"]) {
  if (readiness === "strong") return "profit" as const;
  if (readiness === "workable") return "warning" as const;
  return "loss" as const;
}

function labelFromReadiness(readiness: StrategyEvaluation["readiness"]) {
  if (readiness === "strong") return "Strong";
  if (readiness === "workable") return "Workable";
  return "Weak";
}

function EvaluationList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-label">{title}</p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <InsetPanel key={`${title}-${index}`} tone="default">
            <p className="text-sm leading-relaxed">{item}</p>
          </InsetPanel>
        ))}
      </div>
    </div>
  );
}

export function StrategyEvaluationPanel({
  evaluation,
  evaluating,
  onEvaluate,
  disabled,
  emptyTitle,
  emptyDescription,
}: {
  evaluation: StrategyEvaluation | null;
  evaluating: boolean;
  onEvaluate: () => void;
  disabled: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const tone = evaluation ? toneFromReadiness(evaluation.readiness) : "default";

  return (
    <AppPanel className="p-6">
      <SectionHeader
        title="AI Evaluation"
        subtitle="Get structured feedback on the strategy you wrote instead of having AI generate it for you."
        action={
          <Button onClick={onEvaluate} disabled={disabled || evaluating}>
            {evaluating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Evaluate Strategy
          </Button>
        }
      />

      {evaluating ? (
        <InsetPanel tone="accent">
          <div className="flex items-center gap-2 text-sm">
            <Loader2
              className="h-4 w-4 animate-spin"
              style={{ color: "var(--accent-primary)" }}
            />
            <span style={{ color: "var(--text-secondary)" }}>
              Reviewing the strategy structure, rule clarity, and execution readiness...
            </span>
          </div>
        </InsetPanel>
      ) : evaluation ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <AppMetricCard
              label="Readiness Score"
              value={`${evaluation.score}/100`}
              helper="AI review of clarity, completeness, and execution discipline."
              tone={tone}
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <AppMetricCard
              label="Assessment"
              value={labelFromReadiness(evaluation.readiness)}
              helper="Overall quality of the current strategy draft."
              tone={tone}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </div>

          <InsetPanel tone={tone}>
            <p className="text-label">Overall feedback</p>
            <p className="mt-2 text-sm leading-relaxed">{evaluation.summary}</p>
          </InsetPanel>

          <EvaluationList title="Strengths" items={evaluation.strengths} />
          <EvaluationList title="Weaknesses" items={evaluation.weaknesses} />
          <EvaluationList title="Improvements" items={evaluation.improvements} />
        </div>
      ) : (
        <WidgetEmptyState title={emptyTitle} description={emptyDescription} />
      )}
    </AppPanel>
  );
}
