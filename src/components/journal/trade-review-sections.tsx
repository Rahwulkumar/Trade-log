"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { JournalTemplate } from "@/lib/db/schema";
import type {
  JournalEntryDraft,
  JournalRetakeDecision,
} from "@/domain/journal-types";
import type { Playbook } from "@/lib/api/client/playbooks";
import type { JournalTemplateConfig } from "@/lib/journal-structure/types";
import {
  JournalChoiceChip,
  JournalConvictionInput,
  JournalTagField,
  JournalPromptField,
  JournalRatingInput,
} from "@/components/journal/journal-primitives";
import { JournalNarrativeCard } from "@/components/journal/journal-narrative-card";
import { JournalThesisCanvas } from "@/components/journal/journal-thesis-canvas";
import type { JournalChapterId } from "@/components/journal/trade-review-types";

const RETAKE_OPTIONS: Array<{
  value: JournalRetakeDecision;
  label: string;
}> = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];

const GRADE_OPTIONS = ["A+", "A", "B", "C", "F"] as const;

interface JournalChapterContentProps {
  activeChapter: JournalChapterId;
  draft: JournalEntryDraft;
  usesManualStrategy: boolean;
  sortedPlaybooks: Playbook[];
  selectedPlaybook: Playbook | null;
  sortedTemplates: JournalTemplate[];
  selectedTemplate: JournalTemplate | null;
  resolvedTemplateConfig: JournalTemplateConfig;
  verdict: JournalRetakeDecision | null;
  setupTagDraft: string;
  setSetupTagDraft: (value: string) => void;
  psychologyBeforeDraft: string;
  setPsychologyBeforeDraft: (value: string) => void;
  psychologyDuringDraft: string;
  setPsychologyDuringDraft: (value: string) => void;
  psychologyAfterDraft: string;
  setPsychologyAfterDraft: (value: string) => void;
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
}

export function JournalChapterContent({
  activeChapter,
  draft,
  usesManualStrategy,
  sortedPlaybooks,
  selectedPlaybook,
  sortedTemplates,
  selectedTemplate,
  resolvedTemplateConfig,
  verdict,
  setupTagDraft,
  setSetupTagDraft,
  psychologyBeforeDraft,
  setPsychologyBeforeDraft,
  psychologyDuringDraft,
  setPsychologyDuringDraft,
  psychologyAfterDraft,
  setPsychologyAfterDraft,
  setDraftField,
  setReviewField,
  handleStrategyChange,
  handleTemplateChange,
  sessionLabel,
  entryPrice,
  stopLoss,
  takeProfit,
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
        <JournalThesisCanvas
          draft={draft}
          usesManualStrategy={usesManualStrategy}
          sortedPlaybooks={sortedPlaybooks}
          selectedPlaybook={selectedPlaybook}
          sortedTemplates={sortedTemplates}
          selectedTemplate={selectedTemplate}
          resolvedTemplateConfig={resolvedTemplateConfig}
          setupTagDraft={setupTagDraft}
          setSetupTagDraft={setSetupTagDraft}
          setDraftField={setDraftField}
          setReviewField={setReviewField}
          handleStrategyChange={handleStrategyChange}
          handleTemplateChange={handleTemplateChange}
          sessionLabel={sessionLabel}
          entryPrice={entryPrice}
          stopLoss={stopLoss}
          takeProfit={takeProfit}
        />
      );

    case "market":
      return (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <JournalPromptField
              prompt="How did the previous sessions set this trade up?"
              value={draft.journalReview.priorSessionBehavior}
              onChange={(value) =>
                setReviewField("priorSessionBehavior", value)
              }
              rows={6}
              placeholder="What did Asia or London do before your entry? Was liquidity taken, defended, or repriced?"
            />
            <JournalPromptField
              prompt="What was the market context that actually mattered?"
              value={draft.journalReview.marketContext}
              onChange={(value) => setReviewField("marketContext", value)}
              rows={6}
              placeholder="Only include the context that changed the decision: news, volatility, structure, or session behavior."
            />
          </div>
          <JournalPromptField
            prompt="What did you want to see from this session?"
            value={draft.observations}
            onChange={(value) => setDraftField({ observations: value })}
            rows={4}
            placeholder={`Use this to capture the session-specific read for ${sessionLabel}.`}
          />
        </div>
      );

    case "execution":
      return (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <JournalPromptField
              prompt="What was the exact trigger?"
              value={draft.journalReview.entryReason}
              onChange={(value) => setReviewField("entryReason", value)}
              rows={4}
              placeholder="What was the final thing that made you execute?"
            />
            <JournalPromptField
              prompt="Why did you add or change size?"
              value={draft.journalReview.scaleInNotes}
              onChange={(value) => setReviewField("scaleInNotes", value)}
              rows={4}
              placeholder="If you added, trimmed, or split entries, explain why."
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <JournalPromptField
              prompt="What changed once the trade was live?"
              value={draft.journalReview.managementReview}
              onChange={(value) => setReviewField("managementReview", value)}
              rows={4}
              placeholder="What changed in structure, confidence, or management?"
            />
            <JournalPromptField
              prompt="Why were you fully out?"
              value={draft.journalReview.exitReason}
              onChange={(value) => setReviewField("exitReason", value)}
              rows={4}
              placeholder="Target hit, invalidation, fear, structure break, or loss of edge."
            />
          </div>
        </div>
      );

    case "psychology":
      return (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <JournalTagField
              label="Before entry tags"
              tags={draft.journalReview.psychologyBeforeTags}
              onChange={(next) =>
                setReviewField("psychologyBeforeTags", next)
              }
              tone="neutral"
              placeholder="Add pre-trade state"
              draftValue={psychologyBeforeDraft}
              onDraftValueChange={setPsychologyBeforeDraft}
            />
            <JournalTagField
              label="During trade tags"
              tags={draft.journalReview.psychologyDuringTags}
              onChange={(next) =>
                setReviewField("psychologyDuringTags", next)
              }
              tone="neutral"
              placeholder="Add in-trade state"
              draftValue={psychologyDuringDraft}
              onDraftValueChange={setPsychologyDuringDraft}
            />
            <JournalTagField
              label="After trade tags"
              tags={draft.journalReview.psychologyAfterTags}
              onChange={(next) =>
                setReviewField("psychologyAfterTags", next)
              }
              tone="neutral"
              placeholder="Add post-trade state"
              draftValue={psychologyAfterDraft}
              onDraftValueChange={setPsychologyAfterDraft}
            />
          </div>
          <JournalPromptField
            prompt="Anything worth noting beyond the tags?"
            value={draft.feelings}
            onChange={(value) => setDraftField({ feelings: value })}
            rows={3}
            placeholder="Only write the part the tags cannot capture."
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
            <p className="text-label">Overall grade</p>
            <div className="flex flex-wrap gap-2">
              {GRADE_OPTIONS.map((option) => (
                <JournalChoiceChip
                  key={option}
                  active={draft.journalReview.overallGrade === option}
                  onClick={() =>
                    setReviewField(
                      "overallGrade",
                      draft.journalReview.overallGrade === option ? null : option,
                    )
                  }
                  tone="accent"
                >
                  {option}
                </JournalChoiceChip>
              ))}
            </div>
          </div>
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
          <div className="grid gap-4 lg:grid-cols-2">
            <JournalPromptField
              prompt="What is the lesson?"
              value={draft.lessonLearned}
              onChange={(value) => setDraftField({ lessonLearned: value })}
              rows={4}
              placeholder="Reduce the entire trade to one repeatable sentence."
            />
            <JournalPromptField
              prompt="What was the main reason this trade failed or underdelivered?"
              value={draft.journalReview.primaryFailureCause}
              onChange={(value) =>
                setReviewField("primaryFailureCause", value)
              }
              rows={4}
              placeholder="State the main failure cause plainly."
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <JournalPromptField
              prompt="What do you stop doing next time?"
              value={draft.journalReview.stopDoing}
              onChange={(value) => setReviewField("stopDoing", value)}
              rows={4}
              placeholder="The one behavior or habit that cannot come forward."
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
