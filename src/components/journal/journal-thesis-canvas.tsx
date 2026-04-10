"use client";

import type { JournalTemplate } from "@/lib/db/schema";
import type {
  JournalEntryDraft,
} from "@/domain/journal-types";
import type { Playbook } from "@/lib/api/client/playbooks";
import type { JournalTemplateConfig } from "@/lib/journal-structure/types";
import { InsetPanel } from "@/components/ui/surface-primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  JournalTagField,
  JournalShortField,
} from "@/components/journal/journal-primitives";
import {
  JournalMetaStrip,
  JournalWritingArea,
  JournalWritingCell,
  JournalWritingDeck,
} from "@/components/journal/journal-writing-primitives";

export function JournalThesisCanvas({
  draft,
  usesManualStrategy,
  sortedPlaybooks,
  selectedPlaybook,
  sortedTemplates,
  selectedTemplate,
  resolvedTemplateConfig,
  setupTagDraft,
  setSetupTagDraft,
  setDraftField,
  setReviewField,
  handleStrategyChange,
  handleTemplateChange,
  sessionLabel,
  entryPrice,
  stopLoss,
  takeProfit,
}: {
  draft: JournalEntryDraft;
  usesManualStrategy: boolean;
  sortedPlaybooks: Playbook[];
  selectedPlaybook: Playbook | null;
  sortedTemplates: JournalTemplate[];
  selectedTemplate: JournalTemplate | null;
  resolvedTemplateConfig: JournalTemplateConfig;
  setupTagDraft: string;
  setSetupTagDraft: (value: string) => void;
  setDraftField: (value: Partial<JournalEntryDraft>) => void;
  setReviewField: <K extends keyof JournalEntryDraft["journalReview"]>(
    field: K,
    value: JournalEntryDraft["journalReview"][K],
  ) => void;
  handleStrategyChange: (value: string) => void;
  handleTemplateChange: (value: string) => void;
  sessionLabel: string;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
}) {
  const autoFacts = [
    {
      label: "Session",
      value: sessionLabel,
    },
    {
      label: "Entry",
      value:
        entryPrice == null ? "--" : entryPrice.toFixed(2),
    },
    {
      label: "Stop",
      value:
        stopLoss == null ? "--" : stopLoss.toFixed(2),
    },
    {
      label: "TP",
      value:
        takeProfit == null ? "--" : takeProfit.toFixed(2),
    },
  ];

  return (
    <div className="space-y-4">
      <InsetPanel paddingClassName="px-3.5 py-3 sm:px-4 sm:py-3.5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-label">Trade frame</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Lock the strategy first, then capture only the idea-specific details.
              </p>
            </div>
            <JournalMetaStrip>
              <span>{selectedTemplate ? selectedTemplate.name : "No template"}</span>
              <span>&middot;</span>
              <span>{resolvedTemplateConfig.checklistItems.length} checks</span>
            </JournalMetaStrip>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
            <div className="space-y-2">
              <label className="text-label">Strategy</label>
              <Select
                value={
                  draft.playbookId ?? (usesManualStrategy ? "__manual" : "__none")
                }
                onValueChange={handleStrategyChange}
              >
                <SelectTrigger
                  className="h-10 text-[0.8125rem]"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                >
                  <SelectValue placeholder="Select a strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No linked strategy</SelectItem>
                  {sortedPlaybooks.map((playbook) => (
                    <SelectItem key={playbook.id} value={playbook.id}>
                      {playbook.name}
                    </SelectItem>
                  ))}
                  {usesManualStrategy ? (
                    <SelectItem value="__manual">
                      Manual: {draft.journalReview.strategyName}
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-label">Template</label>
              <Select
                value={draft.journalTemplateId ?? "__none"}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger
                  className="h-10 text-[0.8125rem]"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                >
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No linked template</SelectItem>
                  {sortedTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <JournalShortField
              label="Variation"
              value={draft.journalReview.setupName}
              onChange={(value) => setReviewField("setupName", value)}
              placeholder="Specific variation or nuance"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {autoFacts.map((fact) => (
              <div
                key={fact.label}
                className="rounded-[14px] border px-3 py-2.5"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <p className="text-label">{fact.label}</p>
                <p
                  className="mt-1 text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {fact.value}
                </p>
              </div>
            ))}
          </div>

          <JournalTagField
            label="Trigger tags"
            tags={draft.setupTags}
            onChange={(next) => setDraftField({ setupTags: next })}
            tone="neutral"
            placeholder="Add trigger or entry-style tag"
            draftValue={setupTagDraft}
            onDraftValueChange={setSetupTagDraft}
          />

          {selectedPlaybook?.description ? (
            <p
              className="text-[11px]"
              style={{
                color: "var(--text-tertiary)",
                lineHeight: 1.45,
              }}
            >
              {selectedPlaybook.description}
            </p>
          ) : null}
        </div>
      </InsetPanel>

      <JournalWritingDeck className="grid xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <JournalWritingCell
          step="01"
          title="Edge"
          hint="Why this idea existed in the first place."
          className="border-b xl:border-b-0 xl:border-r"
        >
          <JournalWritingArea
            value={draft.journalReview.reasonForTrade}
            onChange={(value) => setReviewField("reasonForTrade", value)}
            rows={7}
            placeholder="What was the actual edge here? Keep it tight enough that you can compare this trade against the next similar one."
            className="min-h-[12rem]"
          />
        </JournalWritingCell>

        <div className="grid">
          <JournalWritingCell
            step="02"
            title="Break"
            hint="What had to stay true for the idea to remain valid."
            className="border-b"
          >
            <JournalWritingArea
              value={draft.journalReview.invalidation}
              onChange={(value) => setReviewField("invalidation", value)}
              rows={4}
              placeholder="What would break the idea?"
            />
          </JournalWritingCell>

          <JournalWritingCell
            step="03"
            title="Path"
            hint="Where price should go if the idea is right."
          >
            <div className="space-y-3">
              <JournalShortField
                label="Bias"
                value={draft.journalReview.higherTimeframeBias}
                onChange={(value) =>
                  setReviewField("higherTimeframeBias", value)
                }
                placeholder="Bullish, bearish, neutral"
              />
              <JournalShortField
                label="Intended TP"
                value={draft.journalReview.intendedTakeProfit}
                onChange={(value) =>
                  setReviewField("intendedTakeProfit", value)
                }
                placeholder="Price or zone"
              />
              <JournalWritingArea
                value={draft.journalReview.targetPlan}
                onChange={(value) => setReviewField("targetPlan", value)}
                rows={4}
                placeholder="If right, where should price go and why?"
              />
            </div>
          </JournalWritingCell>
        </div>
      </JournalWritingDeck>
    </div>
  );
}
