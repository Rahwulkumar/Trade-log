"use client";

import type { JournalTemplate, SetupDefinition } from "@/lib/db/schema";
import type {
  JournalEntryDraft,
  JournalRetakeDecision,
} from "@/domain/journal-types";
import type { Playbook } from "@/lib/api/client/playbooks";
import type { JournalTemplateConfig } from "@/lib/journal-structure/types";
import {
  JournalChoiceChip,
  JournalConvictionInput,
  JournalDetailDisclosure,
  type JournalLibraryOption,
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
  filteredSetups: SetupDefinition[];
  selectedPlaybook: Playbook | null;
  filteredTemplates: JournalTemplate[];
  selectedSetup: SetupDefinition | null;
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
}

export function JournalChapterContent({
  activeChapter,
  draft,
  usesManualStrategy,
  sortedPlaybooks,
  filteredSetups,
  selectedPlaybook,
  filteredTemplates,
  selectedSetup,
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
          filteredSetups={filteredSetups}
          selectedPlaybook={selectedPlaybook}
          filteredTemplates={filteredTemplates}
          selectedSetup={selectedSetup}
          selectedTemplate={selectedTemplate}
          resolvedTemplateConfig={resolvedTemplateConfig}
          setupTagDraft={setupTagDraft}
          setSetupTagDraft={setSetupTagDraft}
          setDraftField={setDraftField}
          setReviewField={setReviewField}
          handleSetupChange={handleSetupChange}
          handleStrategyChange={handleStrategyChange}
          handleTemplateChange={handleTemplateChange}
          sessionLabel={sessionLabel}
          entryPrice={entryPrice}
          stopLoss={stopLoss}
          takeProfit={takeProfit}
          activeTradeId={activeTradeId}
          onSelectTradeInIdea={onSelectTradeInIdea}
          tradeIdeaMembers={tradeIdeaMembers}
          relatedTradeOptions={relatedTradeOptions}
          linkedTradeIds={linkedTradeIds}
          toggleLinkedTrade={toggleLinkedTrade}
          saveBlockedReason={saveBlockedReason}
        />
      );

    case "market":
      return (
        <div className="space-y-4">
          <JournalPromptField
            prompt="What session context actually mattered?"
            value={draft.journalReview.marketContext}
            onChange={(value) => setReviewField("marketContext", value)}
            rows={5}
            placeholder="Write only the session behavior, range, trend, or profile that changed the decision."
          />
          <JournalDetailDisclosure
            title="Session build-up"
            description="Open only if the earlier sessions or your session expectation matter later."
            defaultOpen={
              draft.journalReview.priorSessionBehavior.trim().length > 0 ||
              draft.observations.trim().length > 0
            }
          >
            <JournalPromptField
              prompt="How did the earlier sessions behave?"
              value={draft.journalReview.priorSessionBehavior}
              onChange={(value) =>
                setReviewField("priorSessionBehavior", value)
              }
              rows={4}
              placeholder="How did Asia, London, or the prior session shape this setup?"
            />
            <JournalPromptField
              prompt={`What did you need from ${sessionLabel}?`}
              value={draft.observations}
              onChange={(value) => setDraftField({ observations: value })}
              rows={3}
              placeholder="State the one condition you were waiting for."
            />
          </JournalDetailDisclosure>
        </div>
      );

    case "execution":
      return (
        <div className="space-y-4">
          <JournalPromptField
            prompt="What exactly triggered entry?"
            value={draft.journalReview.entryReason}
            onChange={(value) => setReviewField("entryReason", value)}
            rows={4}
            placeholder="Name the trigger that made you execute, not the whole replay."
          />
          <JournalDetailDisclosure
            title="Trade management"
            description="Open only if size changes, management, or the final exit need their own reason."
            defaultOpen={
              draft.journalReview.scaleInNotes.trim().length > 0 ||
              draft.journalReview.managementReview.trim().length > 0 ||
              draft.journalReview.exitReason.trim().length > 0
            }
          >
            <JournalPromptField
              prompt="Why add or trim?"
              value={draft.journalReview.scaleInNotes}
              onChange={(value) => setReviewField("scaleInNotes", value)}
              rows={3}
              placeholder="If you changed size, explain why."
            />
            <JournalPromptField
              prompt="What changed while it was live?"
              value={draft.journalReview.managementReview}
              onChange={(value) => setReviewField("managementReview", value)}
              rows={3}
              placeholder="What changed once the trade was active?"
            />
            <JournalPromptField
              prompt="Why exit here?"
              value={draft.journalReview.exitReason}
              onChange={(value) => setReviewField("exitReason", value)}
              rows={3}
              placeholder="What made you close the trade here?"
            />
          </JournalDetailDisclosure>
        </div>
      );

    case "psychology":
      return (
        <div className="space-y-4">
          <JournalPromptField
            prompt="What behavior helped or hurt?"
            value={draft.feelings}
            onChange={(value) => setDraftField({ feelings: value })}
            rows={3}
            placeholder="Write only the behavior you want to repeat or catch earlier next time."
          />
          <JournalDetailDisclosure
            title="State tags"
            description="Tag before, during, and after only if the behavior is important."
            defaultOpen={
              draft.journalReview.psychologyBeforeTags.length > 0 ||
              draft.journalReview.psychologyDuringTags.length > 0 ||
              draft.journalReview.psychologyAfterTags.length > 0
            }
          >
            <JournalTagField
              label="Before entry"
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
              label="During trade"
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
              label="After trade"
              tags={draft.journalReview.psychologyAfterTags}
              onChange={(next) =>
                setReviewField("psychologyAfterTags", next)
              }
              tone="neutral"
              placeholder="Add post-trade state"
              draftValue={psychologyAfterDraft}
              onDraftValueChange={setPsychologyAfterDraft}
            />
          </JournalDetailDisclosure>
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
        <div className="space-y-4">
          <JournalPromptField
            prompt="What is the one lesson?"
            value={draft.lessonLearned}
            onChange={(value) => setDraftField({ lessonLearned: value })}
            rows={4}
            placeholder="Write the one thing future-you needs from this trade."
          />
          <JournalDetailDisclosure
            title="What changes next time"
            description="Open only if you need to spell out what failed and what you will do differently."
            defaultOpen={
              draft.journalReview.primaryFailureCause.trim().length > 0 ||
              draft.journalReview.stopDoing.trim().length > 0 ||
              draft.journalReview.followUpAction.trim().length > 0
            }
          >
            <JournalPromptField
              prompt="What failed first?"
              value={draft.journalReview.primaryFailureCause}
              onChange={(value) =>
                setReviewField("primaryFailureCause", value)
              }
              rows={3}
              placeholder="What made the trade underdeliver or break down?"
            />
            <JournalPromptField
              prompt="What must stop?"
              value={draft.journalReview.stopDoing}
              onChange={(value) => setReviewField("stopDoing", value)}
              rows={3}
              placeholder="What should not repeat on the next similar trade?"
            />
            <JournalPromptField
              prompt="What will you do instead?"
              value={draft.journalReview.followUpAction}
              onChange={(value) => setReviewField("followUpAction", value)}
              rows={3}
              placeholder="What changes the next time this setup appears?"
            />
          </JournalDetailDisclosure>
        </div>
      );

    default:
      return null;
  }
}
