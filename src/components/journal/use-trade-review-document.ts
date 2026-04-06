"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  JournalTemplate,
  MistakeDefinition,
  SetupDefinition,
  Trade,
} from "@/lib/db/schema";
import type { JournalEntryDraft } from "@/domain/journal-types";
import {
  mapTradeToViewModel,
  viewModelToDraft,
} from "@/domain/journal-mapper";
import { useJournalAutosave } from "@/hooks/use-journal-autosave";
import type { Playbook } from "@/lib/api/client/playbooks";
import {
  DEFAULT_JOURNAL_TEMPLATE_CONFIG,
  normalizeJournalTemplateConfig,
  type JournalTemplateChapterId,
  type JournalTemplateConfig,
  type JournalTemplatePrompts,
} from "@/lib/journal-structure/types";
import type {
  RuleItemStatus,
  RuleSetWithItems,
} from "@/lib/rulebooks/types";
import {
  ALLOWED_SCREENSHOT_TYPES,
  MAX_SCREENSHOT_SIZE_BYTES,
} from "@/lib/constants/app";
import {
  deleteTradeScreenshot,
  uploadTradeScreenshot,
} from "@/lib/api/storage";
import { getTradeNetPnl } from "@/lib/utils/trade-pnl";
import type {
  JournalChapterItem,
  JournalLibraryOption,
} from "@/components/journal/journal-primitives";
import type {
  ChapterState,
  JournalChapterId,
} from "@/components/journal/trade-review-types";

const EXECUTION_CHECKLIST_OPTIONS = [
  "Bias clear",
  "HTF aligned",
  "Liquidity mapped",
  "Trigger confirmed",
  "Risk defined",
  "Session fit",
  "News clear",
  "Plan followed",
] as const;

function formatPnl(value: number): string {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;
}

function outcomeFromPnl(value: number): "WIN" | "LOSS" | "BE" {
  if (value > 0.5) return "WIN";
  if (value < -0.5) return "LOSS";
  return "BE";
}

function outcomeTone(outcome: "WIN" | "LOSS" | "BE") {
  if (outcome === "WIN") {
    return {
      color: "var(--profit-primary)",
      background: "var(--profit-bg)",
    };
  }

  if (outcome === "LOSS") {
    return {
      color: "var(--loss-primary)",
      background: "var(--loss-bg)",
    };
  }

  return {
    color: "var(--warning-primary)",
    background: "var(--warning-bg)",
  };
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function hasValue<T>(value: T | null | undefined): boolean {
  return value != null;
}

function hasNumber(value: number | null | undefined): boolean {
  return value != null && Number.isFinite(value);
}

function describeChapterProgress(checks: boolean[]) {
  const completeCount = checks.filter(Boolean).length;
  const totalCount = checks.length;

  const state: ChapterState =
    checks.length > 0 && checks.every(Boolean)
      ? "complete"
      : checks.some(Boolean)
        ? "progress"
        : "empty";

  return {
    progressLabel: `${completeCount}/${totalCount}`,
    state,
  } as const;
}

interface UseTradeReviewDocumentArgs {
  trade: Trade;
  userId: string;
  playbooks: Playbook[];
  setupDefinitions: SetupDefinition[];
  mistakeDefinitions: MistakeDefinition[];
  journalTemplates: JournalTemplate[];
  ruleSets: RuleSetWithItems[];
  onSaved: (trade: Trade) => void;
}

export function useTradeReviewDocument({
  trade,
  userId,
  playbooks,
  setupDefinitions,
  mistakeDefinitions,
  journalTemplates,
  ruleSets,
  onSaved,
}: UseTradeReviewDocumentArgs) {
  const viewModel = useMemo(() => mapTradeToViewModel(trade), [trade]);
  const initialDraft = useMemo(() => viewModelToDraft(viewModel), [viewModel]);
  const [draft, setDraft] = useState<JournalEntryDraft>(initialDraft);
  const deferredDraft = useDeferredValue(draft);
  const [activeChapter, setActiveChapter] =
    useState<JournalChapterId>("narrative");
  const [setupTagDraft, setSetupTagDraft] = useState("");
  const [mistakeTagDraft, setMistakeTagDraft] = useState("");
  const [executionChecklistDraft, setExecutionChecklistDraft] = useState("");
  const [uploadingScreenshots, setUploadingScreenshots] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [showRecentSave, setShowRecentSave] = useState(false);
  const canvasAnchorRef = useRef<HTMLDivElement | null>(null);

  const setDraftField = useCallback((patch: Partial<JournalEntryDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const setReviewField = useCallback(
    <K extends keyof JournalEntryDraft["journalReview"]>(
      key: K,
      value: JournalEntryDraft["journalReview"][K],
    ) => {
      setDraft((current) => ({
        ...current,
        journalReview: {
          ...current.journalReview,
          [key]: value,
        },
      }));
    },
    [],
  );

  const { saving, savedAt, isDirty, save } = useJournalAutosave({
    draft,
    initialDraft,
    tradeId: trade.id,
    onSaved,
    debounceMs: 1500,
  });

  const netPnl = getTradeNetPnl(trade);
  const tone = outcomeTone(outcomeFromPnl(netPnl));
  const verdict = draft.journalReview.retakeDecision;
  const saveStatusText = saving
    ? "Saving review..."
    : isDirty
      ? "Unsaved edits"
      : showRecentSave && savedAt
        ? `Saved ${savedAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : null;
  const pnlText = formatPnl(netPnl);

  const sortedPlaybooks = useMemo(
    () =>
      [...playbooks].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [playbooks],
  );
  const sortedSetups = useMemo(
    () =>
      [...setupDefinitions].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [setupDefinitions],
  );
  const sortedMistakes = useMemo(
    () =>
      [...mistakeDefinitions].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [mistakeDefinitions],
  );
  const sortedTemplates = useMemo(
    () =>
      [...journalTemplates].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [journalTemplates],
  );
  const sortedRuleSets = useMemo(
    () =>
      [...ruleSets].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [ruleSets],
  );

  const selectedPlaybook =
    sortedPlaybooks.find((playbook) => playbook.id === draft.playbookId) ?? null;
  const selectedTemplate =
    sortedTemplates.find((template) => template.id === draft.journalTemplateId) ??
    null;
  const selectedRuleSet =
    sortedRuleSets.find((ruleSet) => ruleSet.id === draft.ruleSetId) ?? null;
  const usesManualStrategy =
    !draft.playbookId && draft.journalReview.strategyName.trim().length > 0;

  const resolvedTemplateConfig = useMemo(
    () =>
      draft.journalTemplateSnapshot
        ? normalizeJournalTemplateConfig(draft.journalTemplateSnapshot)
        : selectedTemplate?.config &&
            typeof selectedTemplate.config === "object" &&
            !Array.isArray(selectedTemplate.config)
          ? normalizeJournalTemplateConfig(
              selectedTemplate.config as Partial<JournalTemplateConfig>,
            )
          : DEFAULT_JOURNAL_TEMPLATE_CONFIG,
    [draft.journalTemplateSnapshot, selectedTemplate],
  );

  const enabledChapterIds = useMemo(
    () => new Set(resolvedTemplateConfig.enabledChapters),
    [resolvedTemplateConfig],
  );

  const checklistOptions = useMemo(
    () =>
      resolvedTemplateConfig.checklistItems.length > 0
        ? resolvedTemplateConfig.checklistItems
        : [...EXECUTION_CHECKLIST_OPTIONS],
    [resolvedTemplateConfig],
  );

  const setupPickerOptions = useMemo<JournalLibraryOption[]>(
    () =>
      sortedSetups.map((setup) => ({
        id: setup.id,
        label: setup.name,
        meta: setup.description ?? null,
      })),
    [sortedSetups],
  );

  const preferredSetupIds = useMemo(
    () =>
      selectedPlaybook
        ? sortedSetups
            .filter((setup) => setup.playbookId === selectedPlaybook.id)
            .map((setup) => setup.id)
        : [],
    [selectedPlaybook, sortedSetups],
  );

  const mistakePickerOptions = useMemo<JournalLibraryOption[]>(
    () =>
      sortedMistakes.map((mistake) => ({
        id: mistake.id,
        label: mistake.name,
        meta: mistake.category ?? mistake.description ?? null,
      })),
    [sortedMistakes],
  );

  const resolveRuleSetForSelection = useCallback(
    (
      playbookId: string | null,
      setupId: string | null,
      templateId: string | null,
      propAccountId: string | null,
    ) => {
      if (setupId) {
        const setupScoped = sortedRuleSets.find(
          (ruleSet) =>
            ruleSet.scopeType === "setup" &&
            ruleSet.setupDefinitionId === setupId,
        );

        if (setupScoped) {
          return setupScoped;
        }
      }

      if (templateId) {
        const templateScoped = sortedRuleSets.find(
          (ruleSet) =>
            ruleSet.scopeType === "template" &&
            ruleSet.journalTemplateId === templateId,
        );

        if (templateScoped) {
          return templateScoped;
        }
      }

      if (playbookId) {
        const playbookScoped = sortedRuleSets.find(
          (ruleSet) =>
            ruleSet.scopeType === "playbook" &&
            ruleSet.playbookId === playbookId,
        );

        if (playbookScoped) {
          return playbookScoped;
        }
      }

      if (propAccountId) {
        const accountScoped = sortedRuleSets.find(
          (ruleSet) =>
            ruleSet.scopeType === "account" &&
            ruleSet.propAccountId === propAccountId,
        );

        if (accountScoped) {
          return accountScoped;
        }
      }

      return (
        sortedRuleSets.find((ruleSet) => ruleSet.scopeType === "global") ??
        sortedRuleSets[0] ??
        null
      );
    },
    [sortedRuleSets],
  );

  const recommendedRuleSet = useMemo(
    () =>
      resolveRuleSetForSelection(
        draft.playbookId,
        draft.setupDefinitionId,
        draft.journalTemplateId,
        trade.propAccountId ?? null,
      ),
    [
      draft.journalTemplateId,
      draft.playbookId,
      draft.setupDefinitionId,
      resolveRuleSetForSelection,
      trade.propAccountId,
    ],
  );

  const effectiveRuleSet = selectedRuleSet ?? recommendedRuleSet;
  const ruleResultsByItemId = useMemo(
    () =>
      new Map(
        draft.tradeRuleResults.map((result) => [result.ruleItemId, result]),
      ),
    [draft.tradeRuleResults],
  );

  const chapterItems = useMemo(() => {
    const items = [
      {
        id: "narrative",
        label: "Narrative",
        orderLabel: "01",
        summary: "Three short notes: why in, what changed, why out.",
        ...describeChapterProgress([hasText(deferredDraft.notes)]),
      },
      {
        id: "thesis",
        label: "Thesis",
        orderLabel: "02",
        summary: "Capture the edge, invalidation, and target logic.",
        ...describeChapterProgress([
          hasValue(deferredDraft.setupDefinitionId),
          hasText(deferredDraft.journalReview.strategyName),
          hasText(deferredDraft.journalReview.setupName),
          hasText(deferredDraft.journalReview.reasonForTrade),
          hasText(deferredDraft.journalReview.invalidation),
          hasText(deferredDraft.journalReview.targetPlan),
        ]),
      },
      {
        id: "market",
        label: "Market",
        orderLabel: "03",
        summary:
          "Record alignment, conditions, and the context around the trade.",
        ...describeChapterProgress([
          hasValue(deferredDraft.journalReview.timeframeAlignment),
          hasText(deferredDraft.journalReview.higherTimeframeBias),
          hasText(deferredDraft.journalReview.executionTimeframe),
          hasText(deferredDraft.journalReview.triggerTimeframe),
          hasText(deferredDraft.journalReview.higherTimeframeNotes),
          hasValue(deferredDraft.marketCondition),
          hasText(deferredDraft.observations),
          hasText(deferredDraft.journalReview.marketContext),
        ]),
      },
      {
        id: "execution",
        label: "Execution",
        orderLabel: "04",
        summary: "Break down the entry, management, and exit decisions.",
        ...describeChapterProgress([
          deferredDraft.executionArrays.length > 0,
          hasText(deferredDraft.journalReview.entryReason),
          hasText(deferredDraft.journalReview.managementReview),
          hasText(deferredDraft.executionNotes),
          hasText(deferredDraft.journalReview.exitReason),
        ]),
      },
      {
        id: "psychology",
        label: "Psychology",
        orderLabel: "05",
        summary:
          "Describe the emotional state before, during, and after the trade.",
        ...describeChapterProgress([
          hasText(deferredDraft.journalReview.psychologyBefore),
          hasText(deferredDraft.journalReview.psychologyDuring),
          hasText(deferredDraft.journalReview.psychologyAfter),
          hasText(deferredDraft.feelings),
        ]),
      },
      {
        id: "scorecard",
        label: "Scorecard",
        orderLabel: "06",
        summary: "Rate the trade, record conviction, tags, and excursion.",
        ...describeChapterProgress([
          hasValue(deferredDraft.entryRating),
          hasValue(deferredDraft.exitRating),
          hasValue(deferredDraft.managementRating),
          hasValue(deferredDraft.conviction),
          hasValue(deferredDraft.journalReview.retakeDecision),
          hasNumber(deferredDraft.mae),
          hasNumber(deferredDraft.mfe),
          deferredDraft.tradeRuleResults.length > 0,
          deferredDraft.mistakeDefinitionIds.length > 0,
          deferredDraft.setupTags.length > 0,
          deferredDraft.mistakeTags.length > 0,
        ]),
      },
      {
        id: "closeout",
        label: "Closeout",
        orderLabel: "07",
        summary:
          "Distill the lesson and define the next change you will make.",
        ...describeChapterProgress([
          hasText(deferredDraft.lessonLearned),
          hasText(deferredDraft.journalReview.followUpAction),
        ]),
      },
    ] satisfies JournalChapterItem[];

    return items.filter((item) =>
      enabledChapterIds.has(item.id as JournalTemplateChapterId),
    );
  }, [deferredDraft, enabledChapterIds]);

  const activeChapterIndex = chapterItems.findIndex(
    (item) => item.id === activeChapter,
  );
  const activeChapterItem =
    chapterItems[activeChapterIndex] ??
    chapterItems[0] ?? {
      id: "narrative",
      label: "Narrative",
      orderLabel: "01",
      summary: "",
      progressLabel: "0/0",
      state: "empty" as const,
    };
  const activeChapterLabel = activeChapterItem?.label ?? "Narrative";
  const chapterTabs = useMemo(
    () =>
      chapterItems.map((item) => ({
        id: item.id,
        label: item.label,
        progressLabel: item.progressLabel,
        state: item.state,
      })),
    [chapterItems],
  );

  useEffect(() => {
    if (!chapterItems.some((item) => item.id === activeChapter)) {
      setActiveChapter((chapterItems[0]?.id as JournalChapterId) ?? "narrative");
    }
  }, [activeChapter, chapterItems]);

  useEffect(() => {
    if (!savedAt) {
      setShowRecentSave(false);
      return;
    }

    setShowRecentSave(true);
    const timeout = window.setTimeout(() => setShowRecentSave(false), 2800);
    return () => window.clearTimeout(timeout);
  }, [savedAt]);

  const chapterCueText = useMemo(() => {
    const templatePrompts = resolvedTemplateConfig.prompts;
    const defaultMap: Record<JournalChapterId, string> = {
      narrative: "Three short notes beat one long replay: entry, shift, exit.",
      thesis: "Name the edge so it is easy to repeat or reject later.",
      market: "Give the setup enough context to make sense on a reread.",
      execution: "Document the decisions, not just the outcome.",
      psychology: "Be specific enough to catch the pattern next time.",
      scorecard: "Keep the scoring crisp and the tags honest.",
      closeout: "Finish with one lesson and one change worth testing.",
    };

    return (
      templatePrompts[activeChapter as keyof JournalTemplatePrompts] ??
      defaultMap[activeChapter]
    );
  }, [activeChapter, resolvedTemplateConfig.prompts]);

  const resolveTemplateForSelection = useCallback(
    (playbookId: string | null, setupId: string | null) => {
      const selectedSetupDefinition = sortedSetups.find(
        (setup) => setup.id === setupId,
      );

      if (selectedSetupDefinition?.defaultTemplateId) {
        return (
          sortedTemplates.find(
            (template) =>
              template.id === selectedSetupDefinition.defaultTemplateId,
          ) ?? null
        );
      }

      if (playbookId) {
        const playbookScoped =
          sortedTemplates.find(
            (template) =>
              template.playbookId === playbookId &&
              template.scopeType === "playbook",
          ) ??
          sortedTemplates.find((template) => template.playbookId === playbookId);

        if (playbookScoped) {
          return playbookScoped;
        }
      }

      return (
        sortedTemplates.find((template) => template.scopeType === "global") ??
        sortedTemplates[0] ??
        null
      );
    },
    [sortedSetups, sortedTemplates],
  );

  const changeChapter = useCallback((chapterId: JournalChapterId) => {
    setActiveChapter(chapterId);
  }, []);

  const goToAdjacentChapter = useCallback(
    (direction: -1 | 1) => {
      if (activeChapterIndex < 0) {
        return;
      }

      const nextItem = chapterItems[activeChapterIndex + direction];
      if (!nextItem) {
        return;
      }

      changeChapter(nextItem.id as JournalChapterId);
    },
    [activeChapterIndex, changeChapter, chapterItems],
  );

  const handleStrategyChange = useCallback(
    (value: string) => {
      if (value === "__none") {
        const nextTemplate = resolveTemplateForSelection(
          null,
          draft.setupDefinitionId,
        );
        setDraft((current) => ({
          ...current,
          playbookId: null,
          journalTemplateId: nextTemplate?.id ?? null,
          ruleSetId: null,
          tradeRuleResults: [],
          journalTemplateSnapshot:
            nextTemplate?.config &&
            typeof nextTemplate.config === "object" &&
            !Array.isArray(nextTemplate.config)
              ? normalizeJournalTemplateConfig(
                  nextTemplate.config as Partial<JournalTemplateConfig>,
                )
              : null,
          journalReview: {
            ...current.journalReview,
            strategyName: "",
          },
        }));
        return;
      }

      if (value === "__manual") {
        setDraft((current) => ({
          ...current,
          playbookId: null,
        }));
        return;
      }

      const selected = sortedPlaybooks.find((playbook) => playbook.id === value);
      const nextTemplate = resolveTemplateForSelection(
        selected?.id ?? null,
        draft.setupDefinitionId,
      );
      setDraft((current) => ({
        ...current,
        playbookId: selected?.id ?? null,
        journalTemplateId: nextTemplate?.id ?? null,
        ruleSetId: null,
        tradeRuleResults: [],
        journalTemplateSnapshot:
          nextTemplate?.config &&
          typeof nextTemplate.config === "object" &&
          !Array.isArray(nextTemplate.config)
            ? normalizeJournalTemplateConfig(
                nextTemplate.config as Partial<JournalTemplateConfig>,
              )
            : null,
        journalReview: {
          ...current.journalReview,
          strategyName: selected?.name ?? current.journalReview.strategyName,
        },
      }));
    },
    [draft.setupDefinitionId, resolveTemplateForSelection, sortedPlaybooks],
  );

  const handleSetupChange = useCallback(
    (value: string) => {
      if (value === "__none") {
        const nextTemplate = resolveTemplateForSelection(draft.playbookId, null);
        setDraft((current) => ({
          ...current,
          setupDefinitionId: null,
          journalTemplateId: nextTemplate?.id ?? null,
          ruleSetId: null,
          tradeRuleResults: [],
          journalTemplateSnapshot:
            nextTemplate?.config &&
            typeof nextTemplate.config === "object" &&
            !Array.isArray(nextTemplate.config)
              ? normalizeJournalTemplateConfig(
                  nextTemplate.config as Partial<JournalTemplateConfig>,
                )
              : null,
          journalReview: {
            ...current.journalReview,
            setupName: "",
          },
        }));
        return;
      }

      const selected = sortedSetups.find((setup) => setup.id === value) ?? null;
      const nextTemplate = resolveTemplateForSelection(
        draft.playbookId,
        selected?.id ?? null,
      );
      setDraft((current) => ({
        ...current,
        setupDefinitionId: selected?.id ?? null,
        journalTemplateId: nextTemplate?.id ?? null,
        ruleSetId: null,
        tradeRuleResults: [],
        journalTemplateSnapshot:
          nextTemplate?.config &&
          typeof nextTemplate.config === "object" &&
          !Array.isArray(nextTemplate.config)
            ? normalizeJournalTemplateConfig(
                nextTemplate.config as Partial<JournalTemplateConfig>,
              )
            : null,
        journalReview: {
          ...current.journalReview,
          setupName: selected?.name ?? current.journalReview.setupName,
        },
      }));
    },
    [draft.playbookId, resolveTemplateForSelection, sortedSetups],
  );

  const handleTemplateChange = useCallback(
    (value: string) => {
      if (value === "__none") {
        setDraft((current) => ({
          ...current,
          journalTemplateId: null,
          journalTemplateSnapshot: null,
        }));
        return;
      }

      const selected =
        sortedTemplates.find((template) => template.id === value) ?? null;

      setDraft((current) => ({
        ...current,
        journalTemplateId: selected?.id ?? null,
        journalTemplateSnapshot:
          selected?.config &&
          typeof selected.config === "object" &&
          !Array.isArray(selected.config)
            ? normalizeJournalTemplateConfig(
                selected.config as Partial<JournalTemplateConfig>,
              )
            : null,
      }));
    },
    [sortedTemplates],
  );

  const toggleMistakeDefinition = useCallback((mistakeId: string) => {
    setDraft((current) => {
      const nextIds = current.mistakeDefinitionIds.includes(mistakeId)
        ? current.mistakeDefinitionIds.filter((id) => id !== mistakeId)
        : [...current.mistakeDefinitionIds, mistakeId];
      return { ...current, mistakeDefinitionIds: nextIds };
    });
  }, []);

  const handleRuleSetChange = useCallback(
    (value: string) => {
      if (value === "__auto") {
        setDraft((current) => ({
          ...current,
          ruleSetId: null,
          tradeRuleResults: [],
        }));
        return;
      }

      const selected =
        sortedRuleSets.find((ruleSet) => ruleSet.id === value) ?? null;
      setDraft((current) => ({
        ...current,
        ruleSetId: selected?.id ?? null,
        tradeRuleResults: [],
      }));
    },
    [sortedRuleSets],
  );

  const setTradeRuleStatus = useCallback(
    (ruleItemId: string, status: RuleItemStatus) => {
      const ruleItem = effectiveRuleSet?.items.find((item) => item.id === ruleItemId);
      if (!ruleItem) {
        return;
      }

      setDraft((current) => {
        const existingIndex = current.tradeRuleResults.findIndex(
          (result) => result.ruleItemId === ruleItemId,
        );
        const nextResults = [...current.tradeRuleResults];

        if (existingIndex >= 0) {
          nextResults[existingIndex] = {
            ...nextResults[existingIndex],
            status,
            title: ruleItem.title,
            category: ruleItem.category ?? null,
            severity: ruleItem.severity ?? null,
          };
        } else {
          nextResults.push({
            ruleItemId,
            title: ruleItem.title,
            category: ruleItem.category ?? null,
            severity: ruleItem.severity ?? null,
            status,
          });
        }

        return {
          ...current,
          tradeRuleResults: nextResults,
        };
      });
    },
    [effectiveRuleSet],
  );

  const toggleExecutionChecklist = useCallback((value: string) => {
    setDraft((current) => {
      const nextItems = current.executionArrays.includes(value)
        ? current.executionArrays.filter((item) => item !== value)
        : [...current.executionArrays, value];
      return {
        ...current,
        executionArrays: nextItems,
      };
    });
  }, []);

  const handleScreenshotUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }

      setUploadingScreenshots(true);
      setScreenshotError(null);

      try {
        const uploads = await Promise.all(
          Array.from(files).map(async (file) => {
            if (!ALLOWED_SCREENSHOT_TYPES.some((type) => type === file.type)) {
              throw new Error("Only PNG, JPG, WEBP, and GIF screenshots are allowed.");
            }

            if (file.size > MAX_SCREENSHOT_SIZE_BYTES) {
              throw new Error("Each screenshot must be smaller than 8 MB.");
            }

            const path = await uploadTradeScreenshot(file, userId);

            return {
              id:
                typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? crypto.randomUUID()
                  : `${trade.id}-${Date.now()}-${file.name}`,
              tradeId: trade.id,
              url: path,
              timeframe: activeChapterLabel,
              createdAt: new Date().toISOString(),
            };
          }),
        );

        setDraft((current) => ({
          ...current,
          screenshots: [...current.screenshots, ...uploads],
        }));
      } catch (error) {
        setScreenshotError(
          error instanceof Error
            ? error.message
            : "The screenshots could not be uploaded.",
        );
      } finally {
        setUploadingScreenshots(false);
      }
    },
    [activeChapterLabel, trade.id, userId],
  );

  const handleScreenshotRemove = useCallback(
    async (screenshotId: string) => {
      const screenshot = draft.screenshots.find((item) => item.id === screenshotId);
      if (!screenshot) {
        return;
      }

      setDraft((current) => ({
        ...current,
        screenshots: current.screenshots.filter(
          (item) => item.id !== screenshotId,
        ),
      }));

      if (!/^https?:\/\//i.test(screenshot.url)) {
        try {
          await deleteTradeScreenshot(screenshot.url);
        } catch {
          // Ignore storage cleanup errors; the journal state is already updated.
        }
      }
    },
    [draft.screenshots],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      canvasAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeChapter]);

  return {
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
    activeChapter,
    activeChapterIndex,
    activeChapterItem,
    activeChapterLabel,
    isDirty,
    mistakePickerOptions,
    mistakeTagDraft,
    netPnl,
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
  };
}
