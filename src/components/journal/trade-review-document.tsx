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
  JournalFooterActions,
  JournalEditorFrame,
  JournalReferenceDisclosure,
  JournalReviewSidebar,
  JournalTradeHeader,
} from "@/components/journal/journal-review-layout";
import { JournalTabRail } from "@/components/journal/journal-primitives";
import { JournalChapterContent } from "@/components/journal/trade-review-sections";
import { JournalChapterSupport } from "@/components/journal/trade-review-support";
import type { JournalChapterId } from "@/components/journal/trade-review-types";
import { useTradeReviewDocument } from "@/components/journal/use-trade-review-document";

interface TradeReviewDocumentProps {
  trade: Trade;
  tradeIdea: Trade[];
  activeTradeId: string;
  onSelectTradeInIdea: (tradeId: string) => void;
  allTrades: Trade[];
  globalRules: string[];
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
  onSaved: (trade: Trade) => void;
}

function TradeReviewDocumentInner({
  trade,
  tradeIdea,
  activeTradeId,
  onSelectTradeInIdea,
  allTrades,
  globalRules,
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
  onSaved,
}: TradeReviewDocumentProps) {
  const {
    activeChapter,
    activeChapterIndex,
    activeChapterItem,
    activeChapterLabel,
    autoRuleFlags,
    canvasAnchorRef,
    chapterCueText,
    chapterItems,
    chapterTabs,
    checklistOptions,
    draft,
    effectiveRuleSet,
    effectiveLinkedTradeIds,
    executionChecklistDraft,
    filteredSetups,
    filteredTemplates,
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
    psychologyAfterDraft,
    psychologyBeforeDraft,
    psychologyDuringDraft,
    relatedTradeOptions,
    recommendedRuleSet,
    resolvedTemplateConfig,
    ruleResultsByItemId,
    save,
    saveBlockedReason,
    saveStatusText,
    saving,
    screenshotError,
    selectedSetup,
    setDraft,
    setDraftField,
    setExecutionChecklistDraft,
    setMistakeTagDraft,
    setPsychologyAfterDraft,
    setPsychologyBeforeDraft,
    setPsychologyDuringDraft,
    setReviewField,
    setSetupTagDraft,
    setTradeRuleStatus,
    sessionProfile,
    sessionProfileLoading,
    setupTagDraft,
    sortedMistakes,
    sortedPlaybooks,
    sortedRuleSets,
    selectedPlaybook,
    selectedTemplate,
    tone,
    toggleLinkedTrade,
    toggleExecutionChecklist,
    toggleMistakeDefinition,
    tradeIdeaMembers,
    uploadingScreenshots,
    usesManualStrategy,
    verdict,
    viewModel,
    changeChapter,
    goToAdjacentChapter,
  } = useTradeReviewDocument({
    trade,
    tradeIdea,
    allTrades,
    globalRules,
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
      filteredSetups={filteredSetups}
      selectedPlaybook={selectedPlaybook}
      filteredTemplates={filteredTemplates}
      selectedSetup={selectedSetup}
      selectedTemplate={selectedTemplate}
      resolvedTemplateConfig={resolvedTemplateConfig}
      verdict={verdict}
      setupTagDraft={setupTagDraft}
      setSetupTagDraft={setSetupTagDraft}
      psychologyBeforeDraft={psychologyBeforeDraft}
      setPsychologyBeforeDraft={setPsychologyBeforeDraft}
      psychologyDuringDraft={psychologyDuringDraft}
      setPsychologyDuringDraft={setPsychologyDuringDraft}
      psychologyAfterDraft={psychologyAfterDraft}
      setPsychologyAfterDraft={setPsychologyAfterDraft}
      setDraftField={setDraftField}
      setReviewField={setReviewField}
      handleSetupChange={handleSetupChange}
      handleStrategyChange={handleStrategyChange}
      handleTemplateChange={handleTemplateChange}
      sessionLabel={viewModel.session ?? "Overnight"}
      entryPrice={viewModel.entryPrice}
      stopLoss={viewModel.stopLoss}
      takeProfit={viewModel.takeProfit}
      activeTradeId={activeTradeId}
      onSelectTradeInIdea={onSelectTradeInIdea}
      tradeIdeaMembers={tradeIdeaMembers}
      relatedTradeOptions={relatedTradeOptions}
      linkedTradeIds={effectiveLinkedTradeIds}
      toggleLinkedTrade={toggleLinkedTrade}
      saveBlockedReason={saveBlockedReason}
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
      mistakeTagDraft={mistakeTagDraft}
      setMistakeTagDraft={setMistakeTagDraft}
      checklistOptions={checklistOptions}
      sortedMistakes={sortedMistakes}
      mistakePickerOptions={mistakePickerOptions}
      sortedRuleSets={sortedRuleSets}
      recommendedRuleSet={recommendedRuleSet}
      effectiveRuleSet={effectiveRuleSet}
      autoRuleFlags={autoRuleFlags}
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
      sessionProfile={sessionProfile}
      sessionProfileLoading={sessionProfileLoading}
      saveBlockedReason={saveBlockedReason}
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
      <div className="px-3 pb-12 pt-3 sm:px-4 sm:pb-14 sm:pt-3.5 lg:px-5">
        <JournalTradeHeader
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
        />

        <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
          <JournalReviewSidebar
            symbol={viewModel.symbol}
            direction={viewModel.direction === "LONG" ? "LONG" : "SHORT"}
            pnlText={pnlText}
            pnlColor={tone.color}
            saveStatusText={saveStatusText}
            saving={saving}
            isDirty={isDirty}
            index={index}
            total={total}
            hasPreviousTrade={hasPrevious}
            hasNextTrade={hasNext}
            hasPreviousChapter={activeChapterIndex > 0}
            hasNextChapter={activeChapterIndex < chapterItems.length - 1}
            onPreviousTrade={onPrevious}
            onNextTrade={onNext}
            onNextPending={onNextPending}
            onOpenTradeQueue={onOpenTradeQueue}
            tradeQueueLabel={tradeQueueLabel}
            chapterItems={chapterItems}
            activeChapter={activeChapter}
            onChangeChapter={(id) => changeChapter(id as JournalChapterId)}
            onPreviousChapter={() => goToAdjacentChapter(-1)}
            onNextChapter={() => goToAdjacentChapter(1)}
            onSave={() => void save()}
            saveDisabled={Boolean(saveBlockedReason)}
            saveLabel={
              saveBlockedReason
                ? "Strategy -> setup -> template first"
                : "Save review"
            }
          />

          <div ref={canvasAnchorRef} className="min-w-0 space-y-4">
            <div className="xl:hidden">
              <JournalTabRail
                items={chapterTabs}
                activeTab={activeChapter}
                onChange={(id) => changeChapter(id as JournalChapterId)}
                ariaLabel="Journal chapters"
              />
            </div>

            <JournalEditorFrame
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
                >
                  {activeChapterContent}
                </motion.div>
              </AnimatePresence>
            </JournalEditorFrame>

            <JournalReferenceDisclosure activeKey={activeChapter}>
              {activeChapterSupport}
            </JournalReferenceDisclosure>

            <JournalFooterActions
              onPreviousChapter={() => goToAdjacentChapter(-1)}
              onSave={() => void save()}
              onNextChapter={() => goToAdjacentChapter(1)}
              hasPreviousChapter={activeChapterIndex > 0}
              hasNextChapter={activeChapterIndex < chapterItems.length - 1}
              saveDisabled={Boolean(saveBlockedReason)}
              saveLabel={
                saveBlockedReason
                  ? "Strategy -> setup -> template first"
                : "Save review"
              }
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export const TradeReviewDocument = memo(TradeReviewDocumentInner);
TradeReviewDocument.displayName = "TradeReviewDocument";
