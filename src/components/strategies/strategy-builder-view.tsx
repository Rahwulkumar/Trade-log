"use client";

import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AppPanel,
  SectionHeader,
} from "@/components/ui/page-primitives";
import {
  AppTextArea,
  FieldGroup,
} from "@/components/ui/control-primitives";
import { Input } from "@/components/ui/input";
import { StrategyEvaluationPanel } from "@/components/strategies/strategy-evaluation-panel";
import type { StrategyEvaluation } from "@/lib/api/client/ai";

interface StrategyBuilderViewProps {
  name: string;
  description: string;
  rules: string[];
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onRuleChange: (index: number, value: string) => void;
  onAddRule: () => void;
  onRemoveRule: (index: number) => void;
  onMoveRule: (index: number, direction: -1 | 1) => void;
  onSave: () => void;
  saving: boolean;
  canSave: boolean;
  evaluation: StrategyEvaluation | null;
  evaluating: boolean;
  onEvaluate: () => void;
  canEvaluate: boolean;
}

export function StrategyBuilderView({
  name,
  description,
  rules,
  onNameChange,
  onDescriptionChange,
  onRuleChange,
  onAddRule,
  onRemoveRule,
  onMoveRule,
  onSave,
  saving,
  canSave,
  evaluation,
  evaluating,
  onEvaluate,
  canEvaluate,
}: StrategyBuilderViewProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_390px]">
      <AppPanel className="space-y-5 p-6">
        <SectionHeader
          title="Write the strategy yourself"
          subtitle="Define the setup, the market conditions, and the exact execution rules. Once the structure is clear, use AI to critique it."
          action={
            <Button onClick={onSave} disabled={!canSave || saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Strategy
            </Button>
          }
        />

        <div className="grid gap-4">
          <FieldGroup label="Strategy Name">
            <Input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="e.g. London liquidity sweep reversal"
            />
          </FieldGroup>

          <FieldGroup label="Strategy Description">
            <AppTextArea
              rows={5}
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Explain when this setup appears, what market structure you want to see, and what makes the idea valid."
            />
          </FieldGroup>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-label">Execution Rules</p>
                <p
                  className="mt-1 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Write the exact rules you want to follow. Keep each rule explicit and testable.
                </p>
              </div>
              <Button variant="outline" onClick={onAddRule}>
                <Plus className="h-4 w-4" />
                Add Rule
              </Button>
            </div>

            <div className="space-y-3">
              {rules.map((rule, index) => (
                <div
                  key={`rule-${index}`}
                  className="rounded-[var(--radius-md)] border p-3"
                  style={{
                    borderColor: "var(--border-subtle)",
                    background: "var(--surface-elevated)",
                  }}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-label">Rule {index + 1}</p>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onMoveRule(index, -1)}
                        disabled={index === 0}
                        aria-label="Move rule up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onMoveRule(index, 1)}
                        disabled={index === rules.length - 1}
                        aria-label="Move rule down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onRemoveRule(index)}
                        disabled={rules.length === 1}
                        aria-label="Remove rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <AppTextArea
                    rows={3}
                    value={rule}
                    onChange={(event) => onRuleChange(index, event.target.value)}
                    placeholder="e.g. Only enter after price sweeps London high, reclaims the level, and confirms with displacement on the execution timeframe."
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppPanel>

      <StrategyEvaluationPanel
        evaluation={evaluation}
        evaluating={evaluating}
        onEvaluate={onEvaluate}
        disabled={!canEvaluate}
        emptyTitle="No evaluation yet"
        emptyDescription="Write the strategy details first, then ask AI to review the clarity, gaps, and execution quality."
      />
    </div>
  );
}
