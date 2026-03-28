"use client";

import { useEffect, useState } from "react";

import { AppPanel, SectionHeader } from "@/components/ui/page-primitives";
import {
  InsetPanel,
  WidgetEmptyState,
} from "@/components/ui/surface-primitives";
import { PlaybookCard } from "@/components/playbooks/playbook-card";
import {
  evaluateStrategyWithAI,
  type StrategyEvaluation,
} from "@/lib/api/client/ai";
import type { PlaybookCardData } from "@/lib/playbooks/view-model";
import { StrategyEvaluationPanel } from "@/components/strategies/strategy-evaluation-panel";

interface StrategyDetailViewProps {
  playbook: PlaybookCardData | null;
  onManage: (playbookId: string) => void;
  onDuplicate: (playbookId: string) => void;
  onToggleActive: (playbookId: string) => void;
  onDelete: (playbookId: string) => void;
}

export function StrategyDetailView({
  playbook,
  onManage,
  onDuplicate,
  onToggleActive,
  onDelete,
}: StrategyDetailViewProps) {
  const [evaluation, setEvaluation] = useState<StrategyEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  useEffect(() => {
    setEvaluation(null);
    setEvaluationError(null);
    setEvaluating(false);
  }, [playbook?.id]);

  if (!playbook) {
    return (
      <AppPanel>
        <WidgetEmptyState
          title="Select a strategy"
          description="Choose a strategy from the library to review its rules, performance, and current status."
        />
      </AppPanel>
    );
  }

  async function handleEvaluate() {
    if (!playbook) return;

    try {
      setEvaluating(true);
      setEvaluationError(null);
      const next = await evaluateStrategyWithAI({
        name: playbook.name,
        description: playbook.description,
        rules: playbook.rules,
      });
      setEvaluation(next);
    } catch (error) {
      setEvaluationError(
        error instanceof Error ? error.message : "Unable to evaluate strategy.",
      );
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
      <div className="space-y-4">
        <AppPanel className="p-6">
          <SectionHeader
            title="Execution Rules"
            subtitle={`${playbook.rules.length} rule${playbook.rules.length === 1 ? "" : "s"} currently define this strategy.`}
          />

          {playbook.rules.length === 0 ? (
            <WidgetEmptyState
              title="No rules added"
              description="Add explicit execution rules so this strategy can be reviewed and repeated consistently."
            />
          ) : (
            <div className="space-y-3">
              {playbook.rules.map((rule, index) => (
                <InsetPanel key={`${playbook.id}-${index}`}>
                  <div className="flex items-start gap-3">
                    <span
                      className="mono mt-0.5 inline-flex min-w-7 justify-center rounded-full px-2 py-1 text-[0.72rem]"
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent-primary)",
                      }}
                    >
                      {index + 1}
                    </span>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {rule}
                    </p>
                  </div>
                </InsetPanel>
              ))}
            </div>
          )}
        </AppPanel>

        <AppPanel className="p-6">
          <SectionHeader
            title="Strategy Notes"
            subtitle="Summary context for when this setup should appear and why it exists."
          />
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {playbook.description ||
              "No strategy narrative has been written yet. Use the manage flow to add market context, trigger logic, and execution intent."}
          </p>
        </AppPanel>

        {evaluationError ? (
          <InsetPanel tone="loss">
            <p className="text-sm" style={{ color: "var(--loss-primary)" }}>
              {evaluationError}
            </p>
          </InsetPanel>
        ) : null}

        <StrategyEvaluationPanel
          evaluation={evaluation}
          evaluating={evaluating}
          onEvaluate={handleEvaluate}
          disabled={playbook.rules.length === 0}
          emptyTitle="No AI evaluation yet"
          emptyDescription="Run an evaluation to see whether this saved strategy is clear, complete, and executable."
        />
      </div>

      <PlaybookCard
        playbook={playbook}
        onManage={onManage}
        onDuplicate={onDuplicate}
        onToggleActive={onToggleActive}
        onDelete={onDelete}
      />
    </div>
  );
}
