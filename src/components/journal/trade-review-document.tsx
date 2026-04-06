"use client";

import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type {
  JournalTemplate,
  MistakeDefinition,
  SetupDefinition,
  Trade,
} from "@/lib/db/schema";
import type { Playbook } from "@/lib/api/client/playbooks";
import type { RuleSetWithItems } from "@/lib/rulebooks/types";
import {
  JournalDocumentActions,
  JournalDocumentCanvas,
  JournalDocumentHeader,
  JournalInlineSupport,
} from "@/components/journal/journal-review-shell";
import { JournalChapterContent } from "@/components/journal/trade-review-sections";
import { JournalChapterSupport } from "@/components/journal/trade-review-support";
import type { JournalChapterId } from "@/components/journal/trade-review-types";
import { useTradeReviewDocument } from "@/components/journal/use-trade-review-document";

interface TradeReviewDocumentProps {
  trade: Trade;
  userId: string;
  playbooks: Playbook[];
  setupDefinitions: SetupDefinition[];
  mistakeDefinitions: MistakeDefinition[];
  journalTemplates: JournalTemplate[];
  ruleSets: RuleSetWithItems[];
  index: number;
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onNextPending?: () => void;
  onOpenTradeQueue?: () => void;
  tradeQueueLabel?: string;
  tradeQueueButtonClassName?: string;
  onSaved: (trade: Trade) => void;
}

function TradeReviewDocumentInner({
  trade,
  userId,
  playbooks,
  setupDefinitions,
  mistakeDefinitions,
  journalTemplates,
  ruleSets,
  index,
  total,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onNextPending,
  onOpenTradeQueue,
  tradeQueueLabel,
  tradeQueueButtonClassName,
  onSaved,
}: TradeReviewDocumentProps) {
  const {
    activeChapter,
    activeChapterIndex,
    activeChapterItem,
    activeChapterLabel,
    canvasAnchorRef,
    chapterCueText,
    chapterItems,
    chapterTabs,
    checklistOptions,
    draft,
    effectiveRuleSet,
    executionChecklistDraft,
    handleRuleSetChange,
    handleScreenshotRemove,
    handleScreenshotUpload,
    handleSetupChange,
    handleStrategyChange,
    handleTemplateChange,
    isDirty,
    mistakePickerOptions,
    mistakeTagDraft,
    pnlText,
    preferredSetupIds,
    recommendedRuleSet,
    resolvedTemplateConfig,
    ruleResultsByItemId,
    save,
    saveStatusText,
    saving,
    screenshotError,
    setDraft,
    setDraftField,
    setExecutionChecklistDraft,
    setMistakeTagDraft,
    setReviewField,
    setSetupTagDraft,
    setTradeRuleStatus,
    setupPickerOptions,
    setupTagDraft,
    sortedMistakes,
    sortedPlaybooks,
    sortedRuleSets,
    sortedTemplates,
    selectedPlaybook,
    selectedTemplate,
    tone,
    toggleExecutionChecklist,
    toggleMistakeDefinition,
    uploadingScreenshots,
    usesManualStrategy,
    verdict,
    viewModel,
    changeChapter,
    goToAdjacentChapter,
  } = useTradeReviewDocument({
    trade,
    userId,
    playbooks,
    setupDefinitions,
    mistakeDefinitions,
    journalTemplates,
    ruleSets,
    onSaved,
  });

  const activeChapterContent = (
    <JournalChapterContent
      activeChapter={activeChapter}
      draft={draft}
      usesManualStrategy={usesManualStrategy}
      sortedPlaybooks={sortedPlaybooks}
      selectedPlaybook={selectedPlaybook}
      setupPickerOptions={setupPickerOptions}
      preferredSetupIds={preferredSetupIds}
      sortedTemplates={sortedTemplates}
      selectedTemplate={selectedTemplate}
      resolvedTemplateConfig={resolvedTemplateConfig}
      verdict={verdict}
      setDraftField={setDraftField}
      setReviewField={setReviewField}
      handleStrategyChange={handleStrategyChange}
      handleSetupChange={handleSetupChange}
      handleTemplateChange={handleTemplateChange}
    />
  );

  const activeChapterSupport = (
    <JournalChapterSupport
      activeChapter={activeChapter}
      draft={draft}
      trade={trade}
      entryPrice={viewModel.entryPrice}
      exitPrice={viewModel.exitPrice}
      stopLoss={viewModel.stopLoss}
      takeProfit={viewModel.takeProfit}
      entryTime={viewModel.entryDate}
      exitTime={viewModel.exitDate ?? viewModel.entryDate}
      direction={viewModel.direction}
      resolvedTemplateConfig={resolvedTemplateConfig}
      screenshotError={screenshotError}
      uploadingScreenshots={uploadingScreenshots}
      executionChecklistDraft={executionChecklistDraft}
      setExecutionChecklistDraft={setExecutionChecklistDraft}
      setupTagDraft={setupTagDraft}
      setSetupTagDraft={setSetupTagDraft}
      mistakeTagDraft={mistakeTagDraft}
      setMistakeTagDraft={setMistakeTagDraft}
      checklistOptions={checklistOptions}
      sortedMistakes={sortedMistakes}
      mistakePickerOptions={mistakePickerOptions}
      sortedRuleSets={sortedRuleSets}
      recommendedRuleSet={recommendedRuleSet}
      effectiveRuleSet={effectiveRuleSet}
      ruleResultsByItemId={ruleResultsByItemId}
      setDraftField={setDraftField}
      setReviewField={setReviewField}
      setDraft={setDraft}
      handleRuleSetChange={handleRuleSetChange}
      toggleExecutionChecklist={toggleExecutionChecklist}
      toggleMistakeDefinition={toggleMistakeDefinition}
      setTradeRuleStatus={setTradeRuleStatus}
      handleScreenshotUpload={handleScreenshotUpload}
      handleScreenshotRemove={handleScreenshotRemove}
    />
  );

  return (
    <motion.article
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.15 }}
      className="min-h-full"
      style={{ background: "var(--surface)" }}
    >
      <JournalDocumentHeader
        symbol={viewModel.symbol}
        direction={viewModel.direction === "LONG" ? "LONG" : "SHORT"}
        pnlText={pnlText}
        pnlColor={tone.color}
        saveStatusText={saveStatusText}
        saving={saving}
        isDirty={isDirty}
        index={index}
        total={total}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        onPrevious={onPrevious}
        onNext={onNext}
        onNextPending={onNextPending}
        onOpenTradeQueue={onOpenTradeQueue}
        tradeQueueLabel={tradeQueueLabel}
        tradeQueueButtonClassName={tradeQueueButtonClassName}
        chapterTabs={chapterTabs}
        activeTab={activeChapter}
        onChangeTab={(id) => changeChapter(id as JournalChapterId)}
      />

      <div className="px-3 pb-12 pt-3 sm:px-4 sm:pb-14 sm:pt-3.5 lg:px-5">
        <div ref={canvasAnchorRef} className="min-w-0 space-y-4">
          <JournalDocumentCanvas
            chapterOrderLabel={activeChapterItem.orderLabel}
            chapterProgressLabel={activeChapterItem.progressLabel}
            chapterState={activeChapterItem.state}
            chapterLabel={activeChapterLabel}
            chapterCueText={chapterCueText}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeChapter}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="mt-4"
              >
                {activeChapterContent}
              </motion.div>
            </AnimatePresence>

            <JournalInlineSupport>{activeChapterSupport}</JournalInlineSupport>
          </JournalDocumentCanvas>

          <JournalDocumentActions
            onPreviousChapter={() => goToAdjacentChapter(-1)}
            onSave={() => void save()}
            onNextChapter={() => goToAdjacentChapter(1)}
            hasPreviousChapter={activeChapterIndex > 0}
            hasNextChapter={activeChapterIndex < chapterItems.length - 1}
          />
        </div>
      </div>
    </motion.article>
  );
}

export const TradeReviewDocument = memo(TradeReviewDocumentInner);
TradeReviewDocument.displayName = "TradeReviewDocument";
