"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { JournalTemplate } from "@/lib/db/schema";
import type {
  JournalEntryDraft,
  JournalRetakeDecision,
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
  JournalChoiceChip,
  JournalConvictionInput,
  type JournalLibraryOption,
  JournalLibraryPicker,
  JournalPromptField,
  JournalRatingInput,
  JournalShortField,
} from "@/components/journal/journal-primitives";
import { JournalNarrativeCard } from "@/components/journal/journal-narrative-card";
import type { JournalChapterId } from "@/components/journal/trade-review-types";

const RETAKE_OPTIONS: Array<{
  value: JournalRetakeDecision;
  label: string;
}> = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];

interface JournalChapterContentProps {
  activeChapter: JournalChapterId;
  draft: JournalEntryDraft;
  usesManualStrategy: boolean;
  sortedPlaybooks: Playbook[];
  selectedPlaybook: Playbook | null;
  setupPickerOptions: JournalLibraryOption[];
  preferredSetupIds: string[];
  sortedTemplates: JournalTemplate[];
  selectedTemplate: JournalTemplate | null;
  resolvedTemplateConfig: JournalTemplateConfig;
  verdict: JournalRetakeDecision | null;
  setDraftField: (value: Partial<JournalEntryDraft>) => void;
  setReviewField: <K extends keyof JournalEntryDraft["journalReview"]>(
    field: K,
    value: JournalEntryDraft["journalReview"][K],
  ) => void;
  handleStrategyChange: (value: string) => void;
  handleSetupChange: (value: string) => void;
  handleTemplateChange: (value: string) => void;
}

export function JournalChapterContent({
  activeChapter,
  draft,
  usesManualStrategy,
  sortedPlaybooks,
  selectedPlaybook,
  setupPickerOptions,
  preferredSetupIds,
  sortedTemplates,
  selectedTemplate,
  resolvedTemplateConfig,
  verdict,
  setDraftField,
  setReviewField,
  handleStrategyChange,
  handleSetupChange,
  handleTemplateChange,
}: JournalChapterContentProps) {
  switch (activeChapter) {
    case "narrative":
      return (
        <JournalNarrativeCard
          value={draft.notes}
          onChange={(notes) => setDraftField({ notes })}
        />
      );

    case "thesis":
      return (
        <div className="space-y-4">
          <InsetPanel paddingClassName="px-3.5 py-3.5 sm:px-4 sm:py-4">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-label">Trade frame</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Link the structure first, then keep the thesis short.
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-label">Strategy</label>
                    <Select
                      value={
                        draft.playbookId ??
                        (usesManualStrategy ? "__manual" : "__none")
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
                    {selectedPlaybook?.description ? (
                      <p
                        style={{
                          color: "var(--text-tertiary)",
                          fontFamily: "var(--font-inter)",
                          fontSize: "11px",
                          lineHeight: 1.55,
                        }}
                      >
                        {selectedPlaybook.description}
                      </p>
                    ) : null}
                  </div>

                  <JournalLibraryPicker
                    label="Setup"
                    options={setupPickerOptions}
                    value={draft.setupDefinitionId}
                    onSelect={(id) => handleSetupChange(id ?? "__none")}
                    placeholder="Search setups by name or note"
                    emptyLabel="No linked setup"
                    preferredOptionIds={preferredSetupIds}
                  />
                </div>

                <div className="space-y-4">
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
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {selectedTemplate
                        ? `${selectedTemplate.name} template linked`
                        : "Use a template only when it changes the review flow."}
                    </p>
                  </div>

                  <JournalShortField
                    label="Refinement"
                    value={draft.journalReview.setupName}
                    onChange={(value) => setReviewField("setupName", value)}
                    placeholder="Optional note about this variation"
                  />

                  <div
                    className="rounded-[16px] border px-3.5 py-3"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <p className="text-label">Template summary</p>
                    <p
                      className="mt-1.5 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {resolvedTemplateConfig.enabledChapters.length} active chapters,{" "}
                      {resolvedTemplateConfig.checklistItems.length} checklist items,{" "}
                      {resolvedTemplateConfig.screenshotRequired
                        ? "screenshots required"
                        : "screenshots optional"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </InsetPanel>

          <InsetPanel paddingClassName="px-3.5 py-3.5 sm:px-4 sm:py-4">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-label">Core thesis</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Edge, failure point, and payoff are enough.
                </p>
              </div>

              <JournalPromptField
                prompt="What was the edge?"
                value={draft.journalReview.reasonForTrade}
                onChange={(value) => setReviewField("reasonForTrade", value)}
                rows={4}
                placeholder="One clean statement on why this trade was worth taking."
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <JournalPromptField
                  prompt="What had to stay true?"
                  value={draft.journalReview.invalidation}
                  onChange={(value) => setReviewField("invalidation", value)}
                  rows={4}
                  placeholder="The condition that would keep the idea valid."
                />
                <JournalPromptField
                  prompt="If right, where should price go?"
                  value={draft.journalReview.targetPlan}
                  onChange={(value) => setReviewField("targetPlan", value)}
                  rows={4}
                  placeholder="The target logic in plain language."
                />
              </div>
            </div>
          </InsetPanel>
        </div>
      );

    case "market":
      return (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <JournalPromptField
              prompt="What did price make obvious before the entry?"
              value={draft.observations}
              onChange={(value) => setDraftField({ observations: value })}
              rows={6}
              placeholder="Structure, liquidity, volatility, correlations, or timing tells."
            />
            <JournalPromptField
              prompt="What context around the trade mattered most?"
              value={draft.journalReview.marketContext}
              onChange={(value) => setReviewField("marketContext", value)}
              rows={6}
              placeholder="Macro driver, session behavior, news, or environmental context."
            />
          </div>
        </div>
      );

    case "execution":
      return (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <JournalPromptField
              prompt="Why did you enter at that exact moment?"
              value={draft.journalReview.entryReason}
              onChange={(value) => setReviewField("entryReason", value)}
              rows={5}
              placeholder="What confirmed the trigger? What made it timely?"
            />
            <JournalPromptField
              prompt="What happened during management?"
              value={draft.journalReview.managementReview}
              onChange={(value) => setReviewField("managementReview", value)}
              rows={5}
              placeholder="Partials, stop movement, patience, discipline, hesitation."
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <JournalPromptField
              prompt="What is the plain execution story?"
              value={draft.executionNotes}
              onChange={(value) => setDraftField({ executionNotes: value })}
              rows={5}
              placeholder="Describe the trade management as if another trader had to learn from it."
            />
            <JournalPromptField
              prompt="Why did the exit happen where it did?"
              value={draft.journalReview.exitReason}
              onChange={(value) => setReviewField("exitReason", value)}
              rows={5}
              placeholder="Intentional target, fear, structure break, or loss of edge."
            />
          </div>
        </div>
      );

    case "psychology":
      return (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <JournalPromptField
              prompt="Before the trade"
              value={draft.journalReview.psychologyBefore}
              onChange={(value) => setReviewField("psychologyBefore", value)}
              rows={5}
              placeholder="Confidence, caution, impatience, bias, or clarity before entry."
            />
            <JournalPromptField
              prompt="During the trade"
              value={draft.journalReview.psychologyDuring}
              onChange={(value) => setReviewField("psychologyDuring", value)}
              rows={5}
              placeholder="How did your emotional state evolve while the trade was open?"
            />
            <JournalPromptField
              prompt="After the trade"
              value={draft.journalReview.psychologyAfter}
              onChange={(value) => setReviewField("psychologyAfter", value)}
              rows={5}
              placeholder="What did the result make you want to do next?"
            />
          </div>
          <JournalPromptField
            prompt="How would you summarize the emotional weather of this trade?"
            value={draft.feelings}
            onChange={(value) => setDraftField({ feelings: value })}
            rows={4}
            placeholder="Name the dominant feeling plainly: calm, rushed, defensive, stubborn, detached, clear."
          />
        </div>
      );

    case "scorecard":
      return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <JournalRatingInput
              label="Entry"
              value={draft.entryRating}
              onChange={(value) => setDraftField({ entryRating: value })}
            />
            <JournalRatingInput
              label="Exit"
              value={draft.exitRating}
              onChange={(value) => setDraftField({ exitRating: value })}
            />
            <JournalRatingInput
              label="Management"
              value={draft.managementRating}
              onChange={(value) => setDraftField({ managementRating: value })}
            />
          </div>
          <JournalConvictionInput
            value={draft.conviction}
            onChange={(value) => setDraftField({ conviction: value })}
          />
          <div className="space-y-2">
            <p className="text-label">Would you take this trade again?</p>
            <div className="flex flex-wrap items-center gap-2">
              {RETAKE_OPTIONS.map((option) => (
                <JournalChoiceChip
                  key={option.value}
                  active={verdict === option.value}
                  onClick={() =>
                    setReviewField(
                      "retakeDecision",
                      verdict === option.value ? null : option.value,
                    )
                  }
                  tone={
                    option.value === "yes"
                      ? "profit"
                      : option.value === "no"
                        ? "loss"
                        : "warning"
                  }
                >
                  {option.label}
                </JournalChoiceChip>
              ))}
            </div>
          </div>
        </div>
      );

    case "closeout":
      return (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <JournalPromptField
              prompt="What is the lesson?"
              value={draft.lessonLearned}
              onChange={(value) => setDraftField({ lessonLearned: value })}
              rows={4}
              placeholder="Reduce the entire trade to one repeatable sentence."
            />
            <JournalPromptField
              prompt="What changes next time?"
              value={draft.journalReview.followUpAction}
              onChange={(value) => setReviewField("followUpAction", value)}
              rows={4}
              placeholder="Define the next action, rule, or behavior change."
            />
          </div>

          <AnimatePresence>
            {draft.lessonLearned.trim() ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                style={{
                  background: "var(--accent-soft)",
                  borderLeft: "3px solid var(--accent-primary)",
                  borderRadius: "0 var(--radius-default) var(--radius-default) 0",
                  padding: "16px 18px",
                }}
              >
                <span
                  style={{
                    color: "var(--accent-primary)",
                    display: "block",
                    fontFamily: "var(--font-inter)",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                  }}
                >
                  Lesson
                </span>
                <p
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-inter)",
                    fontSize: "14px",
                    fontStyle: "italic",
                    lineHeight: 1.6,
                  }}
                >
                  {draft.lessonLearned}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      );

    default:
      return null;
  }
}
