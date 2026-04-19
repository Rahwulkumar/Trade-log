"use client";

import { useEffect, useMemo, useState } from "react";

import type { JournalTemplate, SetupDefinition } from "@/lib/db/schema";
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
  JournalDetailDisclosure,
  type JournalLibraryOption,
  JournalTagField,
  JournalShortField,
} from "@/components/journal/journal-primitives";
import { JournalIdeaClusterPanel } from "@/components/journal/journal-idea-cluster-panel";
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
  filteredSetups,
  selectedPlaybook,
  filteredTemplates,
  selectedSetup,
  selectedTemplate,
  resolvedTemplateConfig,
  setupTagDraft,
  setSetupTagDraft,
  setDraftField,
  setReviewField,
  handleSetupChange,
  handleStrategyChange,
  handleTemplateChange,
  sessionLabel,
  entryPrice,
  stopLoss,
  takeProfit,
  activeTradeId,
  onSelectTradeInIdea,
  tradeIdeaMembers,
  relatedTradeOptions,
  linkedTradeIds,
  toggleLinkedTrade,
  saveBlockedReason,
}: {
  draft: JournalEntryDraft;
  usesManualStrategy: boolean;
  sortedPlaybooks: Playbook[];
  filteredSetups: SetupDefinition[];
  selectedPlaybook: Playbook | null;
  filteredTemplates: JournalTemplate[];
  selectedSetup: SetupDefinition | null;
  selectedTemplate: JournalTemplate | null;
  resolvedTemplateConfig: JournalTemplateConfig;
  setupTagDraft: string;
  setSetupTagDraft: (value: string) => void;
  setDraftField: (value: Partial<JournalEntryDraft>) => void;
  setReviewField: <K extends keyof JournalEntryDraft["journalReview"]>(
    field: K,
    value: JournalEntryDraft["journalReview"][K],
  ) => void;
  handleSetupChange: (value: string) => void;
  handleStrategyChange: (value: string) => void;
  handleTemplateChange: (value: string) => void;
  sessionLabel: string;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  activeTradeId: string;
  onSelectTradeInIdea: (tradeId: string) => void;
  tradeIdeaMembers: Array<{
    id: string;
    label: string;
    meta: string;
    pnlText: string;
    pnlTone: "profit" | "loss" | "neutral";
  }>;
  relatedTradeOptions: JournalLibraryOption[];
  linkedTradeIds: string[];
  toggleLinkedTrade: (tradeId: string) => void;
  saveBlockedReason: string | null;
}) {
  const [structureOpen, setStructureOpen] = useState(Boolean(saveBlockedReason));

  useEffect(() => {
    if (saveBlockedReason) {
      setStructureOpen(true);
    }
  }, [saveBlockedReason]);

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

  const structureSummary = useMemo(
    () => [
      {
        label: "Strategy",
        value: selectedPlaybook?.name ?? "Not selected",
      },
      {
        label: "Setup",
        value: selectedSetup?.name ?? "Not selected",
      },
      {
        label: "Template",
        value: selectedTemplate?.name ?? "Not selected",
      },
      {
        label: "Variation",
        value: draft.journalReview.setupName.trim() || "Not set",
      },
    ],
    [
      draft.journalReview.setupName,
      selectedPlaybook?.name,
      selectedSetup?.name,
      selectedTemplate?.name,
    ],
  );

  return (
    <div className="space-y-4">
      <InsetPanel paddingClassName="px-3.5 py-3 sm:px-4 sm:py-3.5">
        <div className="space-y-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-label">Setup lock</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Lock the strategy, setup, and template first, then answer only the trade-defining questions.
              </p>
            </div>

            {!saveBlockedReason ? (
              <button
                type="button"
                onClick={() => setStructureOpen((current) => !current)}
                className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                {structureOpen ? "Collapse structure" : "Edit structure"}
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {structureSummary.map((item) => (
              <span
                key={item.label}
                className="rounded-full border px-2.5 py-1 text-[11px]"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                <span className="font-semibold text-[var(--text-primary)]">
                  {item.label}:
                </span>{" "}
                {item.value}
              </span>
            ))}
          </div>

          {structureOpen ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                <label className="text-label">Setup</label>
                <Select
                  value={draft.setupDefinitionId ?? "__none"}
                  onValueChange={handleSetupChange}
                >
                  <SelectTrigger
                    className="h-10 text-[0.8125rem]"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <SelectValue placeholder="Select a setup" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No linked setup</SelectItem>
                    {filteredSetups.map((setup) => (
                      <SelectItem key={setup.id} value={setup.id}>
                        {setup.name}
                      </SelectItem>
                    ))}
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
                    {filteredTemplates.map((template) => (
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
          ) : null}

          {saveBlockedReason ? (
            <p className="text-xs text-[var(--warning-primary)]">
              {saveBlockedReason}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {autoFacts.map((fact) => (
              <span
                key={fact.label}
                className="rounded-full border px-2.5 py-1 text-[11px]"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                <span className="font-semibold text-[var(--text-primary)]">
                  {fact.label}:
              </span>{" "}
              {fact.value}
            </span>
          ))}
          </div>

          <JournalDetailDisclosure
            title="Classification tags"
            description="Use only the tags that help group this setup with similar trades later."
            defaultOpen={draft.setupTags.length > 0}
          >
            <JournalTagField
              label="Setup tags"
              tags={draft.setupTags}
              onChange={(next) => setDraftField({ setupTags: next })}
              tone="neutral"
              placeholder="Add setup, trigger, or entry-style tag"
              draftValue={setupTagDraft}
              onDraftValueChange={setSetupTagDraft}
            />
          </JournalDetailDisclosure>

          <JournalMetaStrip>
            <span>{selectedTemplate ? selectedTemplate.name : "No template"}</span>
            <span>|</span>
            <span>{resolvedTemplateConfig.checklistItems.length} checks</span>
            {selectedPlaybook?.description ? (
              <>
                <span>|</span>
                <span className="truncate">{selectedPlaybook.description}</span>
              </>
            ) : null}
            {selectedSetup?.description ? (
              <>
                <span>|</span>
                <span className="truncate">{selectedSetup.description}</span>
              </>
            ) : null}
          </JournalMetaStrip>
        </div>
      </InsetPanel>

      <JournalIdeaClusterPanel
        activeTradeId={activeTradeId}
        tradeIdeaTitle={draft.journalReview.tradeIdeaTitle}
        groupSummary={draft.journalReview.groupSummary}
        positionRole={draft.journalReview.positionRole}
        positionReason={draft.journalReview.positionReason}
        isTrivial={draft.journalReview.isTrivial}
        trivialReason={draft.journalReview.trivialReason}
        tradeIdeaMembers={tradeIdeaMembers}
        relatedTradeOptions={relatedTradeOptions}
        linkedTradeIds={linkedTradeIds}
        onSelectTrade={onSelectTradeInIdea}
        onToggleLinkedTrade={toggleLinkedTrade}
        onTradeIdeaTitleChange={(value) => setReviewField("tradeIdeaTitle", value)}
        onGroupSummaryChange={(value) => setReviewField("groupSummary", value)}
        onPositionRoleChange={(value) => setReviewField("positionRole", value)}
        onPositionReasonChange={(value) => setReviewField("positionReason", value)}
        onTrivialChange={(value) => setReviewField("isTrivial", value)}
        onTrivialReasonChange={(value) => setReviewField("trivialReason", value)}
      />

      <JournalWritingDeck className="grid xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <JournalWritingCell
          step="01"
          title="Why was this setup valid?"
          hint="The exact reason this setup deserved risk."
          className="border-b xl:border-b-0 xl:border-r"
        >
          <JournalWritingArea
            value={draft.journalReview.reasonForTrade}
            onChange={(value) => setReviewField("reasonForTrade", value)}
            rows={6}
            placeholder="State why this setup qualified, in plain language."
            className="min-h-[11rem]"
          />
        </JournalWritingCell>

        <div className="grid">
          <JournalWritingCell
            step="02"
            title="What would make it wrong?"
            hint="The condition that breaks the idea."
            className="border-b"
          >
            <JournalWritingArea
              value={draft.journalReview.invalidation}
              onChange={(value) => setReviewField("invalidation", value)}
              rows={3}
              placeholder="What invalidates the setup immediately?"
            />
          </JournalWritingCell>

          <JournalWritingCell
            step="03"
            title="What was the path if right?"
            hint="Bias and target without replaying the whole chart."
          >
            <div className="space-y-3">
              <JournalShortField
                label="Bias at entry"
                value={draft.journalReview.higherTimeframeBias}
                onChange={(value) =>
                  setReviewField("higherTimeframeBias", value)
                }
                placeholder="Bullish, bearish, reversal, range"
              />
              <JournalShortField
                label="Initial TP"
                value={draft.journalReview.intendedTakeProfit}
                onChange={(value) =>
                  setReviewField("intendedTakeProfit", value)
                }
                placeholder="Price, zone, or session target"
              />
              <JournalWritingArea
                value={draft.journalReview.targetPlan}
                onChange={(value) => setReviewField("targetPlan", value)}
                rows={3}
                placeholder="If the trade worked, where should price go next and why?"
              />
            </div>
          </JournalWritingCell>
        </div>
      </JournalWritingDeck>
    </div>
  );
}
