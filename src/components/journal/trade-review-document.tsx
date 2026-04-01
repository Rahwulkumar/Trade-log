"use client";

import Image from "next/image";
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type {
  JournalTemplate,
  MistakeDefinition,
  SetupDefinition,
  Trade,
} from "@/lib/db/schema";
import {
  type JournalAlignment,
  type JournalEntryDraft,
  type JournalRetakeDecision,
} from "@/domain/journal-types";
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
import {
  type RuleItemStatus,
  type RuleSetWithItems,
} from "@/lib/rulebooks/types";
import {
  ALLOWED_SCREENSHOT_TYPES,
  MAX_SCREENSHOT_SIZE_BYTES,
} from "@/lib/constants/app";
import {
  deleteTradeScreenshot,
  getScreenshotUrl,
  uploadTradeScreenshot,
} from "@/lib/api/storage";
import { getTradeNetPnl } from "@/lib/utils/trade-pnl";
import { AppTextArea, ChoiceChip } from "@/components/ui/control-primitives";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/page-primitives";
import { InsetPanel } from "@/components/ui/surface-primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type JournalChapterItem,
  JournalChoiceChip,
  JournalConvictionInput,
  type JournalLibraryOption,
  JournalLibraryMultiPicker,
  JournalLibraryPicker,
  JournalOutlineRail,
  JournalPromptField,
  JournalRatingInput,
  JournalShortField,
  JournalTabRail,
  JournalTagField,
} from "@/components/journal/journal-primitives";
import { JournalTradeChart } from "@/components/journal/journal-trade-chart";

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

const MARKET_CONDITIONS = [
  "Trending",
  "Ranging",
  "Choppy",
  "High Volatility",
] as const;

const ALIGNMENT_OPTIONS: Array<{ value: JournalAlignment; label: string }> = [
  { value: "aligned", label: "Aligned" },
  { value: "mixed", label: "Mixed" },
  { value: "countertrend", label: "Countertrend" },
  { value: "unclear", label: "Unclear" },
];

const RETAKE_OPTIONS: Array<{
  value: JournalRetakeDecision;
  label: string;
}> = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];

const RULE_STATUS_OPTIONS: Array<{
  value: RuleItemStatus;
  label: string;
  tone: "profit" | "loss" | "warning" | "default";
}> = [
  { value: "followed", label: "Followed", tone: "profit" },
  { value: "broken", label: "Broken", tone: "loss" },
  { value: "skipped", label: "Skipped", tone: "warning" },
  { value: "notApplicable", label: "N/A", tone: "default" },
];

function formatDateTime(value: string | null): string {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(
  openedAt: string | null,
  closedAt: string | null,
): string {
  if (!openedAt || !closedAt) {
    return "--";
  }

  const diffMinutes = Math.max(
    1,
    Math.round(
      (new Date(closedAt).getTime() - new Date(openedAt).getTime()) /
        (1000 * 60),
    ),
  );

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

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

type JournalChapterId =
  | "narrative"
  | "thesis"
  | "market"
  | "execution"
  | "psychology"
  | "scorecard"
  | "closeout";

type ChapterState = "empty" | "progress" | "complete";

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

function resolveScreenshotPreviewUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return getScreenshotUrl(value);
}

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
  onSaved,
}: TradeReviewDocumentProps) {
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
  const outcome = outcomeFromPnl(netPnl);
  const tone = outcomeTone(outcome);
  const duration = formatDuration(viewModel.entryDate, viewModel.exitDate);
  const verdict = draft.journalReview.retakeDecision;
  const saveStatusText = saving
    ? "Saving review..."
    : savedAt
      ? `Saved ${savedAt.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : isDirty
        ? "Unsaved edits"
        : "Autosave ready";

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
        summary: "Tell the trade cleanly from first observation to final exit.",
        ...describeChapterProgress([
          hasText(deferredDraft.notes),
          deferredDraft.screenshots.length > 0,
        ]),
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

  const completedChapterCount = chapterItems.filter(
    (item) => item.state === "complete",
  ).length;
  const activeChapterIndex = chapterItems.findIndex(
    (item) => item.id === activeChapter,
  );
  const activeChapterItem =
    chapterItems[activeChapterIndex] ?? chapterItems[0];
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

  const chapterIntroText = useMemo(
    () => {
      const templatePrompts = resolvedTemplateConfig.prompts;
      const defaultMap: Record<JournalChapterId, string> = {
          narrative: "Start with the full story while the trade is still fresh.",
          thesis:
            "Lock in why the trade existed and what would have invalidated it.",
          market:
          "Capture the structural context so the entry makes sense later.",
        execution:
          "Explain how the trade was handled, not just how it ended.",
        psychology:
          "Make the emotional pattern obvious enough to spot next time.",
        scorecard: "Keep the scoring tight and the annotations honest.",
        closeout:
          "End with one sentence worth remembering and one change worth testing.",
      };

      return (
        templatePrompts[activeChapter as keyof JournalTemplatePrompts] ??
        defaultMap[activeChapter]
      );
    },
    [activeChapter, resolvedTemplateConfig.prompts],
  );

  const chapterCueText = useMemo(
    () => {
      const templatePrompts = resolvedTemplateConfig.prompts;
      const defaultMap: Record<JournalChapterId, string> = {
          narrative: "Write the trade before you judge it.",
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
    },
    [activeChapter, resolvedTemplateConfig.prompts],
  );
  const resolveTemplateForSelection = useCallback(
    (playbookId: string | null, setupId: string | null) => {
      const selectedSetupDefinition = sortedSetups.find(
        (setup) => setup.id === setupId,
      );

      if (selectedSetupDefinition?.defaultTemplateId) {
        return (
          sortedTemplates.find(
            (template) => template.id === selectedSetupDefinition.defaultTemplateId,
          ) ?? null
        );
      }

      if (playbookId) {
        const playbookScoped =
          sortedTemplates.find(
            (template) =>
              template.playbookId === playbookId && template.scopeType === "playbook",
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

  const activeChapterStateText =
    activeChapterItem?.state === "complete"
      ? "Ready"
      : activeChapterItem?.state === "progress"
        ? "In progress"
        : "Start";

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
        const nextTemplate = resolveTemplateForSelection(null, draft.setupDefinitionId);
        setDraft((current) => ({
          ...current,
          playbookId: null,
          journalTemplateId: nextTemplate?.id ?? null,
          ruleSetId: null,
          tradeRuleResults: [],
          journalTemplateSnapshot: nextTemplate?.config &&
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
        journalTemplateSnapshot: nextTemplate?.config &&
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
          journalTemplateSnapshot: nextTemplate?.config &&
            typeof nextTemplate.config === "object" &&
            !Array.isArray(nextTemplate.config)
              ? normalizeJournalTemplateConfig(
                  nextTemplate.config as Partial<JournalTemplateConfig>,
                )
              : null,
        }));
        return;
      }

      const selected = sortedSetups.find((setup) => setup.id === value) ?? null;
      const nextPlaybookId = selected?.playbookId ?? draft.playbookId;
      const nextTemplate = resolveTemplateForSelection(nextPlaybookId, value);

      setDraft((current) => ({
        ...current,
        playbookId: nextPlaybookId,
        setupDefinitionId: selected?.id ?? null,
        journalTemplateId: nextTemplate?.id ?? null,
        ruleSetId: null,
        tradeRuleResults: [],
        journalTemplateSnapshot: nextTemplate?.config &&
          typeof nextTemplate.config === "object" &&
          !Array.isArray(nextTemplate.config)
            ? normalizeJournalTemplateConfig(
                nextTemplate.config as Partial<JournalTemplateConfig>,
              )
            : null,
        journalReview: {
          ...current.journalReview,
          strategyName:
            sortedPlaybooks.find((playbook) => playbook.id === nextPlaybookId)?.name ??
            current.journalReview.strategyName,
          setupName: selected?.name ?? current.journalReview.setupName,
        },
      }));
    },
    [draft.playbookId, resolveTemplateForSelection, sortedPlaybooks, sortedSetups],
  );

  const handleTemplateChange = useCallback(
    (value: string) => {
      if (value === "__none") {
        setDraft((current) => ({
          ...current,
          journalTemplateId: null,
          ruleSetId: null,
          tradeRuleResults: [],
          journalTemplateSnapshot: null,
        }));
        return;
      }

      const selected = sortedTemplates.find((template) => template.id === value) ?? null;

      setDraft((current) => ({
        ...current,
        journalTemplateId: selected?.id ?? null,
        ruleSetId: null,
        tradeRuleResults: [],
        journalTemplateSnapshot: selected?.config &&
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
      const exists = current.mistakeDefinitionIds.includes(mistakeId);
      return {
        ...current,
        mistakeDefinitionIds: exists
          ? current.mistakeDefinitionIds.filter((id) => id !== mistakeId)
          : [...current.mistakeDefinitionIds, mistakeId],
      };
    });
  }, []);

  const handleRuleSetChange = useCallback(
    (value: string) => {
      if (value === "__auto" || value === "__none") {
        setDraft((current) => ({
          ...current,
          ruleSetId: null,
          tradeRuleResults: [],
        }));
        return;
      }

      const selected = sortedRuleSets.find((ruleSet) => ruleSet.id === value) ?? null;
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
      const targetRuleSet = effectiveRuleSet;
      if (!targetRuleSet) {
        return;
      }

      const targetRule = targetRuleSet.items.find((item) => item.id === ruleItemId);
      if (!targetRule) {
        return;
      }

      setDraft((current) => {
        const nextRuleSetId = current.ruleSetId ?? targetRuleSet.id;
        const remainingResults = current.tradeRuleResults.filter(
          (result) => result.ruleItemId !== ruleItemId,
        );

        return {
          ...current,
          ruleSetId: nextRuleSetId,
          tradeRuleResults: [
            ...remainingResults,
            {
              ruleItemId,
              title: targetRule.title,
              category: targetRule.category ?? null,
              severity: targetRule.severity ?? null,
              status,
            },
          ],
        };
      });
    },
    [effectiveRuleSet],
  );

  const toggleExecutionChecklist = useCallback((value: string) => {
    setDraft((current) => {
      const exists = current.executionArrays.includes(value);
      return {
        ...current,
        executionArrays: exists
          ? current.executionArrays.filter((item) => item !== value)
          : [...current.executionArrays, value],
      };
    });
  }, []);

  const handleScreenshotUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }

      setScreenshotError(null);
      setUploadingScreenshots(true);

      try {
        const uploaded: JournalEntryDraft["screenshots"] = [];

        for (const file of Array.from(files)) {
          if (
            !ALLOWED_SCREENSHOT_TYPES.includes(
              file.type as (typeof ALLOWED_SCREENSHOT_TYPES)[number],
            )
          ) {
            throw new Error("Only JPG, PNG, WEBP, or GIF screenshots are allowed.");
          }

          if (file.size > MAX_SCREENSHOT_SIZE_BYTES) {
            throw new Error("Each screenshot must be 5 MB or smaller.");
          }

          const path = await uploadTradeScreenshot(file, userId);
          uploaded.push({
            id: `${trade.id}-${Date.now()}-${uploaded.length}`,
            tradeId: trade.id,
            url: path,
            timeframe: activeChapterLabel,
            createdAt: new Date().toISOString(),
          });
        }

        setDraft((current) => ({
          ...current,
          screenshots: [...current.screenshots, ...uploaded],
        }));
      } catch (error) {
        setScreenshotError(
          error instanceof Error ? error.message : "Failed to upload screenshot.",
        );
      } finally {
        setUploadingScreenshots(false);
      }
    },
    [activeChapterLabel, trade.id, userId],
  );

  const handleScreenshotRemove = useCallback(async (screenshotId: string) => {
    const screenshot = draft.screenshots.find((item) => item.id === screenshotId);
    if (!screenshot) {
      return;
    }

    setDraft((current) => ({
      ...current,
      screenshots: current.screenshots.filter((item) => item.id !== screenshotId),
    }));

    if (!/^https?:\/\//i.test(screenshot.url)) {
      try {
        await deleteTradeScreenshot(screenshot.url);
      } catch {
        // Ignore storage cleanup errors; the journal state is already updated.
      }
    }
  }, [draft.screenshots]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      canvasAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeChapter]);

  const renderActiveChapter = () => {
    switch (activeChapter) {
      case "narrative":
        return (
          <div className="space-y-4">
            <p
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-inter)",
                fontSize: "12px",
                lineHeight: 1.55,
              }}
            >
              Use this space like a replay. Capture what you noticed, why the
              trade became interesting, how the management changed, and what
              mattered after the exit.
            </p>
            <AppTextArea
              value={draft.notes}
              onChange={(event) =>
                setDraftField({ notes: event.target.value })
              }
              rows={18}
              placeholder="Tell the trade from first observation to final exit."
              className="min-h-[24rem] w-full rounded-[var(--radius-xl)] px-6 py-5 text-[1rem]"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border-subtle)",
                color: "var(--text-primary)",
                minHeight: "max(32rem, calc(100dvh - 260px))",
                lineHeight: 1.9,
              }}
            />
            <InsetPanel paddingClassName="px-4 py-4">
              <SectionHeader
                className="mb-0"
                title="Screenshots"
                subtitle="Attach the chart or execution evidence you want to keep with this trade."
              />
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-semibold transition-colors"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Add screenshots
                    <input
                      type="file"
                      accept={ALLOWED_SCREENSHOT_TYPES.join(",")}
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        void handleScreenshotUpload(event.target.files);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <span
                    style={{
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-inter)",
                      fontSize: "11px",
                    }}
                  >
                    {uploadingScreenshots
                      ? "Uploading..."
                      : `${draft.screenshots.length} attached`}
                  </span>
                  <span
                    style={{
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-inter)",
                      fontSize: "11px",
                    }}
                  >
                    JPG, PNG, WEBP, GIF up to 5 MB
                  </span>
                </div>
                {screenshotError ? (
                  <p
                    style={{
                      color: "var(--loss-primary)",
                      fontFamily: "var(--font-inter)",
                      fontSize: "11px",
                    }}
                  >
                    {screenshotError}
                  </p>
                ) : null}
                {draft.screenshots.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {draft.screenshots.map((screenshot) => (
                      <div
                        key={screenshot.id}
                        className="overflow-hidden rounded-[var(--radius-xl)] border"
                        style={{
                          background: "var(--surface)",
                          borderColor: "var(--border-subtle)",
                        }}
                      >
                        <div
                          className="relative aspect-[4/3] overflow-hidden"
                          style={{ background: "var(--surface-elevated)" }}
                        >
                          <Image
                            src={resolveScreenshotPreviewUrl(screenshot.url)}
                            alt={`Trade screenshot ${screenshot.timeframe}`}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3 px-3 py-3">
                          <div className="min-w-0">
                            <p className="text-label">Attached</p>
                            <p
                              className="truncate"
                              style={{
                                color: "var(--text-secondary)",
                                fontFamily: "var(--font-jb-mono)",
                                fontSize: "11px",
                              }}
                            >
                              {screenshot.timeframe}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleScreenshotRemove(screenshot.id)}
                            className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors"
                            style={{
                              background: "var(--surface)",
                              borderColor: "var(--border-subtle)",
                              color: "var(--text-tertiary)",
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p
                      style={{
                        color: "var(--text-tertiary)",
                        fontFamily: "var(--font-inter)",
                        fontSize: "11px",
                      }}
                    >
                      No screenshots yet.
                    </p>
                    {resolvedTemplateConfig.screenshotRequired ? (
                      <p
                        style={{
                          color: "var(--warning-primary)",
                          fontFamily: "var(--font-inter)",
                          fontSize: "11px",
                        }}
                      >
                        This template expects at least one screenshot for review.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </InsetPanel>
          </div>
        );

      case "thesis":
        return (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
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
              <div className="space-y-2">
                <JournalLibraryPicker
                  label="Setup Library"
                  options={setupPickerOptions}
                  value={draft.setupDefinitionId}
                  onSelect={(id) => handleSetupChange(id ?? "__none")}
                  placeholder="Search setups by name or note"
                  emptyLabel="No linked setup"
                  preferredOptionIds={preferredSetupIds}
                />
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
                <p
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-inter)",
                    fontSize: "11px",
                    lineHeight: 1.55,
                  }}
                >
                  {selectedTemplate
                    ? `${selectedTemplate.name} • v${selectedTemplate.version}`
                    : "Template controls which chapters and checklist items are active for this review."}
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <JournalShortField
                label="Setup Note"
                value={draft.journalReview.setupName}
                onChange={(value) => setReviewField("setupName", value)}
                placeholder="Add a setup note or refinement"
              />
              <InsetPanel paddingClassName="px-4 py-3">
                <p className="text-label">Template Summary</p>
                <p
                  className="mt-2 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {resolvedTemplateConfig.enabledChapters.length} chapters enabled,{" "}
                  {resolvedTemplateConfig.checklistItems.length} checklist items,{" "}
                  {resolvedTemplateConfig.screenshotRequired
                    ? "screenshots required"
                    : "screenshots optional"}.
                </p>
              </InsetPanel>
            </div>
            <JournalPromptField
              prompt="Why did this trade exist at all?"
              value={draft.journalReview.reasonForTrade}
              onChange={(value) => setReviewField("reasonForTrade", value)}
              rows={5}
              placeholder="State the edge, structure, or order-flow reason without fluff."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <JournalPromptField
                prompt="What would have invalidated the idea?"
                value={draft.journalReview.invalidation}
                onChange={(value) => setReviewField("invalidation", value)}
                rows={4}
                placeholder="What needed to stop being true for this trade to be wrong?"
              />
              <JournalPromptField
                prompt="What was the intended target logic?"
                value={draft.journalReview.targetPlan}
                onChange={(value) => setReviewField("targetPlan", value)}
                rows={4}
                placeholder="Liquidity pool, higher-timeframe level, or asymmetric objective."
              />
            </div>
          </div>
        );

      case "market":
        return (
          <div className="space-y-5">
            <InsetPanel paddingClassName="px-4 py-4">
              <SectionHeader
                className="mb-0"
                title="Timeframe alignment"
                subtitle="Record the bias, execution frame, trigger frame, and whether the trade was aligned or forced."
              />
              <div className="mt-5 space-y-5">
                <div className="flex flex-wrap gap-2">
                  {ALIGNMENT_OPTIONS.map((option) => (
                    <JournalChoiceChip
                      key={option.value}
                      active={
                        draft.journalReview.timeframeAlignment === option.value
                      }
                      onClick={() =>
                        setReviewField(
                          "timeframeAlignment",
                          draft.journalReview.timeframeAlignment === option.value
                            ? null
                            : option.value,
                        )
                      }
                      tone="accent"
                    >
                      {option.label}
                    </JournalChoiceChip>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <JournalShortField
                    label="Higher timeframe bias"
                    value={draft.journalReview.higherTimeframeBias}
                    onChange={(value) =>
                      setReviewField("higherTimeframeBias", value)
                    }
                    placeholder="Bullish, bearish, neutral"
                  />
                  <JournalShortField
                    label="Execution timeframe"
                    value={draft.journalReview.executionTimeframe}
                    onChange={(value) =>
                      setReviewField("executionTimeframe", value)
                    }
                    placeholder="e.g. 15m"
                    mono
                  />
                  <JournalShortField
                    label="Trigger timeframe"
                    value={draft.journalReview.triggerTimeframe}
                    onChange={(value) =>
                      setReviewField("triggerTimeframe", value)
                    }
                    placeholder="e.g. 1m"
                    mono
                  />
                </div>
                <JournalPromptField
                  prompt="How did the timeframes agree or fight each other?"
                  value={draft.journalReview.higherTimeframeNotes}
                  onChange={(value) =>
                    setReviewField("higherTimeframeNotes", value)
                  }
                  rows={4}
                  placeholder="Be explicit about alignment, conflict, or the one frame you ignored."
                />
              </div>
            </InsetPanel>

            <InsetPanel paddingClassName="px-4 py-4">
              <SectionHeader
                className="mb-0"
                title="Market context"
                subtitle="Session is handled automatically from the trade time. Use this chapter for the actual market context around the setup."
              />
              <div className="mt-5 space-y-5">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-label">Auto session</span>
                    <span
                      className="rounded-full px-2.5 py-1"
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent-primary)",
                        fontFamily: "var(--font-jb-mono)",
                        fontSize: "11px",
                      }}
                    >
                      {draft.session ?? "Overnight"}
                    </span>
                    <span
                      style={{
                        color: "var(--text-tertiary)",
                        fontFamily: "var(--font-inter)",
                        fontSize: "11px",
                      }}
                    >
                      detected from trade time
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MARKET_CONDITIONS.map((option) => (
                      <JournalChoiceChip
                        key={option}
                        active={draft.marketCondition === option}
                        onClick={() =>
                          setDraftField({
                            marketCondition:
                              draft.marketCondition === option ? null : option,
                          })
                        }
                      >
                        {option}
                      </JournalChoiceChip>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <JournalPromptField
                    prompt="What did price make obvious before the entry?"
                    value={draft.observations}
                    onChange={(value) => setDraftField({ observations: value })}
                    rows={5}
                    placeholder="Structure, liquidity, volatility, correlations, or timing tells."
                  />
                  <JournalPromptField
                    prompt="What context around the trade mattered most?"
                    value={draft.journalReview.marketContext}
                    onChange={(value) => setReviewField("marketContext", value)}
                    rows={5}
                    placeholder="Macro driver, session behavior, news, or environmental context."
                  />
                </div>
              </div>
            </InsetPanel>
          </div>
        );
      case "execution":
        return (
          <div className="space-y-5">
            <InsetPanel paddingClassName="px-4 py-4">
              <SectionHeader
                className="mb-0"
                title="Execution checklist"
                subtitle="Mark the conditions that were actually present before and during the trade."
              />
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {checklistOptions.map((option) => (
                    <JournalChoiceChip
                      key={option}
                      active={draft.executionArrays.includes(option)}
                      onClick={() => toggleExecutionChecklist(option)}
                      tone="accent"
                    >
                      {option}
                    </JournalChoiceChip>
                  ))}
                </div>
                  <JournalTagField
                    label="Custom checklist items"
                    tags={draft.executionArrays.filter(
                      (item) => !checklistOptions.includes(item),
                    )}
                    onChange={(next) =>
                      setDraft((current) => ({
                        ...current,
                        executionArrays: [
                          ...current.executionArrays.filter((item) =>
                            checklistOptions.includes(item),
                          ),
                          ...next,
                        ],
                      }))
                    }
                  tone="neutral"
                  placeholder="Add custom checklist item"
                  draftValue={executionChecklistDraft}
                  onDraftValueChange={setExecutionChecklistDraft}
                />
              </div>
            </InsetPanel>
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
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
            <InsetPanel paddingClassName="px-4 py-4">
              <SectionHeader
                className="mb-0"
                title="Review controls"
                subtitle="Score the trade, mark conviction, and decide whether it is worth repeating."
              />
              <div className="mt-5 space-y-5">
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
                    onChange={(value) =>
                      setDraftField({ managementRating: value })
                    }
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
                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-label">Rulebook review</p>
                        <p
                          className="mt-1 text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Evaluate this trade against the most relevant rulebook for the selected workflow.
                        </p>
                      </div>
                      {recommendedRuleSet && !draft.ruleSetId ? (
                        <p
                          className="text-xs"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Auto: {recommendedRuleSet.name}
                        </p>
                      ) : null}
                    </div>
                    <Select
                      value={draft.ruleSetId ?? "__auto"}
                      onValueChange={handleRuleSetChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select rulebook" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__auto">
                          {recommendedRuleSet
                            ? `Auto (${recommendedRuleSet.name})`
                            : "Auto (none matched)"}
                        </SelectItem>
                        {sortedRuleSets.map((ruleSet) => (
                          <SelectItem key={ruleSet.id} value={ruleSet.id}>
                            {ruleSet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {effectiveRuleSet ? (
                      <div className="space-y-3">
                        {effectiveRuleSet.items.length > 0 ? (
                          effectiveRuleSet.items.map((rule) => {
                            const activeResult = ruleResultsByItemId.get(rule.id);

                            return (
                              <InsetPanel key={rule.id} paddingClassName="px-3 py-3">
                                <div className="space-y-3">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                      <p className="text-sm font-semibold">{rule.title}</p>
                                      {rule.description ? (
                                        <p
                                          className="mt-1 text-xs"
                                          style={{ color: "var(--text-secondary)" }}
                                        >
                                          {rule.description}
                                        </p>
                                      ) : null}
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-[11px]">
                                      {rule.category ? (
                                        <span className="rounded-full border px-2 py-0.5">
                                          {rule.category}
                                        </span>
                                      ) : null}
                                      {rule.severity ? (
                                        <span className="rounded-full border px-2 py-0.5">
                                          {rule.severity}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {RULE_STATUS_OPTIONS.map((option) => (
                                      <ChoiceChip
                                        key={option.value}
                                        active={activeResult?.status === option.value}
                                        onClick={() =>
                                          setTradeRuleStatus(rule.id, option.value)
                                        }
                                        activeColor={
                                          option.tone === "profit"
                                            ? "var(--profit-primary)"
                                            : option.tone === "loss"
                                              ? "var(--loss-primary)"
                                              : option.tone === "warning"
                                                ? "var(--warning-primary)"
                                                : "var(--text-primary)"
                                        }
                                        activeBackground={
                                          option.tone === "profit"
                                            ? "var(--profit-bg)"
                                            : option.tone === "loss"
                                              ? "var(--loss-bg)"
                                              : option.tone === "warning"
                                                ? "var(--warning-bg)"
                                                : "var(--surface-elevated)"
                                        }
                                        activeBorderColor={
                                          option.tone === "profit"
                                            ? "var(--profit-primary)"
                                            : option.tone === "loss"
                                              ? "var(--loss-primary)"
                                              : option.tone === "warning"
                                                ? "var(--warning-primary)"
                                                : "var(--border-strong)"
                                        }
                                      >
                                        {option.label}
                                      </ChoiceChip>
                                    ))}
                                  </div>
                                </div>
                              </InsetPanel>
                            );
                          })
                        ) : (
                          <p
                            className="text-xs"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            This rulebook does not have any active rules yet.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Create a rulebook in the Playbooks workspace to start reviewing trades against explicit rules.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    {sortedMistakes.length > 0 ? (
                      <JournalLibraryMultiPicker
                        label="Structured mistakes"
                        options={mistakePickerOptions}
                        values={draft.mistakeDefinitionIds}
                        onToggle={toggleMistakeDefinition}
                        placeholder="Search mistakes by name or category"
                        tone="loss"
                      />
                    ) : (
                      <div className="space-y-2">
                        <p className="text-label">Structured mistakes</p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Create mistake definitions in the Playbooks workspace to reuse them here.
                        </p>
                      </div>
                    )}
                  </div>
                  <JournalTagField
                    label="Additional setup tags"
                    tags={draft.setupTags}
                    onChange={(next) => setDraftField({ setupTags: next })}
                    tone="neutral"
                    placeholder="Add setup tag"
                    draftValue={setupTagDraft}
                    onDraftValueChange={setSetupTagDraft}
                  />
                  <JournalTagField
                    label="Additional mistake tags"
                    tags={draft.mistakeTags}
                    onChange={(next) => setDraftField({ mistakeTags: next })}
                    tone="loss"
                    placeholder="Add mistake tag"
                    draftValue={mistakeTagDraft}
                    onDraftValueChange={setMistakeTagDraft}
                  />
                </div>
              </div>
            </InsetPanel>

            <InsetPanel paddingClassName="px-4 py-4">
              <SectionHeader
                className="mb-0"
                title="Excursion"
                subtitle="Record how far price moved against you and for you."
              />
              <div className="mt-5 space-y-5">
                <div
                  className="relative h-px w-full"
                  style={{ background: "var(--border-subtle)" }}
                >
                  <div
                    className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ background: "var(--text-primary)" }}
                  />
                  <div
                    className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
                    style={{
                      left: `calc(50% - ${
                        Math.min(Math.abs(draft.mae ?? 0), 5) * 9
                      }%)`,
                      background: "var(--loss-primary)",
                    }}
                  />
                  <div
                    className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
                    style={{
                      left: `calc(50% + ${
                        Math.min(Math.abs(draft.mfe ?? 0), 5) * 9
                      }%)`,
                      background: "var(--profit-primary)",
                    }}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <JournalShortField
                    label="MAE"
                    value={draft.mae == null ? "" : String(draft.mae)}
                    onChange={(value) => {
                      if (value.trim() === "") {
                        setDraftField({ mae: null });
                        return;
                      }

                      const parsed = Number(value);
                      if (Number.isFinite(parsed)) {
                        setDraftField({ mae: parsed });
                      }
                    }}
                    placeholder="Max adverse excursion"
                    mono
                  />
                  <JournalShortField
                    label="MFE"
                    value={draft.mfe == null ? "" : String(draft.mfe)}
                    onChange={(value) => {
                      if (value.trim() === "") {
                        setDraftField({ mfe: null });
                        return;
                      }

                      const parsed = Number(value);
                      if (Number.isFinite(parsed)) {
                        setDraftField({ mfe: parsed });
                      }
                    }}
                    placeholder="Max favorable excursion"
                    mono
                  />
                </div>
              </div>
            </InsetPanel>
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
                    borderRadius:
                      "0 var(--radius-default) var(--radius-default) 0",
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
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.15 }}
      className="min-h-full"
      style={{ background: "var(--surface)" }}
    >
      <div
        className="sticky top-0 z-10 border-b px-4 py-3 sm:px-6 lg:px-8"
        style={{
          background: "color-mix(in srgb, var(--surface) 96%, transparent)",
          borderBottomColor: "var(--border-subtle)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-jb-mono)",
                  fontSize: "22px",
                  fontWeight: 700,
                  lineHeight: 1.12,
                  letterSpacing: "-0.03em",
                }}
              >
                {viewModel.symbol}
              </h1>
              <span
                className="rounded-full px-3 py-1"
                style={{
                  background:
                    viewModel.direction === "LONG"
                      ? "var(--profit-bg)"
                      : "var(--loss-bg)",
                  color:
                    viewModel.direction === "LONG"
                      ? "var(--profit-primary)"
                      : "var(--loss-primary)",
                  fontFamily: "var(--font-jb-mono)",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                {viewModel.direction === "LONG" ? "LONG" : "SHORT"}
              </span>
              <span
                className="rounded-full px-3 py-1"
                style={{
                  background: tone.background,
                  color: tone.color,
                  fontFamily: "var(--font-inter)",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                {outcome}
              </span>
              <span
                style={{
                  color: tone.color,
                  fontFamily: "var(--font-jb-mono)",
                  fontSize: "16px",
                  fontWeight: 700,
                }}
              >
                {formatPnl(netPnl)}
              </span>
              <span
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-jb-mono)",
                  fontSize: "11px",
                }}
              >
                {formatDateTime(viewModel.exitDate ?? viewModel.entryDate)}
              </span>
              {draft.session ? (
                <span
                  className="rounded-full px-2.5 py-1"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-inter)",
                    fontSize: "11px",
                  }}
                >
                  {draft.session}
                </span>
              ) : null}
              <span
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-jb-mono)",
                  fontSize: "11px",
                }}
              >
                {duration}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-1"
                style={{
                  background: "var(--surface-elevated)",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-jb-mono)",
                  fontSize: "11px",
                }}
              >
                {index + 1}/{total}
              </span>
              <span
                className="rounded-full px-2.5 py-1"
                style={{
                  background: "var(--surface-elevated)",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-jb-mono)",
                  fontSize: "11px",
                }}
              >
                {activeChapterItem.orderLabel} / {activeChapterLabel}
              </span>
              <span
                className="rounded-full px-2.5 py-1"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent-primary)",
                  fontFamily: "var(--font-jb-mono)",
                  fontSize: "11px",
                }}
              >
                {completedChapterCount}/{chapterItems.length} ready
              </span>
              <span
                style={{
                  color: saving
                    ? "var(--accent-primary)"
                    : isDirty
                      ? "var(--warning-primary)"
                      : "var(--text-tertiary)",
                  fontFamily: "var(--font-inter)",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {saveStatusText}
              </span>
              <Button
                type="button"
                onClick={onPrevious}
                disabled={!hasPrevious}
                size="sm"
                variant="outline"
                style={{
                  background: "var(--surface-elevated)",
                  borderColor: "var(--border-subtle)",
                  color: hasPrevious
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
                  opacity: hasPrevious ? 1 : 0.45,
                }}
              >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Previous trade</span>
              </Button>

              {onNextPending ? (
                <Button
                  type="button"
                  onClick={onNextPending}
                  size="sm"
                  variant="outline"
                  style={{
                    background: "var(--surface-elevated)",
                    borderColor: "var(--accent-primary)",
                    color: "var(--accent-primary)",
                  }}
                >
                  <span className="hidden sm:inline">Next unreviewed</span>
                  <span className="sm:hidden">Next open</span>
                </Button>
              ) : null}

              <Button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                size="sm"
                variant="outline"
                style={{
                  background: "var(--surface-elevated)",
                  borderColor: "var(--border-subtle)",
                  color: hasNext
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
                  opacity: hasNext ? 1 : 0.45,
                }}
              >
                <span className="hidden sm:inline">Next trade</span>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>

          <div className="2xl:hidden">
            <JournalTabRail
              items={chapterTabs}
              activeTab={activeChapter}
              onChange={(id) => changeChapter(id as JournalChapterId)}
              ariaLabel="Journal chapters"
            />
          </div>
        </div>
      </div>

      <div className="px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <div className="w-full">
          <div className="grid gap-5 2xl:grid-cols-[248px_minmax(0,1fr)]">
            <div className="hidden 2xl:block">
              <div className="sticky top-[90px] space-y-4">
                <JournalOutlineRail
                  items={chapterItems}
                  activeChapter={activeChapter}
                  onChange={(id) => changeChapter(id as JournalChapterId)}
                />
                <InsetPanel paddingClassName="px-4 py-4">
                  <p className="text-label">Current focus</p>
                  <p
                    className="mt-2"
                    style={{
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-inter)",
                      fontSize: "14px",
                      fontWeight: 600,
                      lineHeight: 1.45,
                    }}
                  >
                    {chapterCueText}
                  </p>
                  <p
                    className="mt-2"
                    style={{
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-inter)",
                      fontSize: "11px",
                      lineHeight: 1.55,
                    }}
                  >
                    {chapterIntroText}
                  </p>
                </InsetPanel>
              </div>
            </div>

            <div ref={canvasAnchorRef} className="min-w-0 space-y-4">
              <section
                className="relative overflow-hidden rounded-[var(--radius-2xl)] border"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-24"
                  style={{
                    background:
                      "linear-gradient(180deg, color-mix(in srgb, var(--accent-primary) 10%, transparent), transparent)",
                  }}
                />
                <div
                  className="absolute right-[-44px] top-[-36px] h-36 w-36 rounded-full"
                  style={{
                    background:
                      "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                    filter: "blur(18px)",
                  }}
                />

                <div className="relative px-5 py-5 sm:px-7 sm:py-6 lg:px-8 lg:py-7 2xl:px-10 2xl:py-8">
                  <div
                    className="flex flex-col gap-5 border-b pb-5"
                    style={{ borderBottomColor: "var(--border-subtle)" }}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start gap-4">
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border"
                          style={{
                            background: "var(--accent-soft)",
                            borderColor: "var(--accent-primary)",
                            color: "var(--accent-primary)",
                            fontFamily: "var(--font-syne)",
                            fontSize: "15px",
                            fontWeight: 700,
                            lineHeight: 1,
                          }}
                        >
                          {activeChapterItem.orderLabel}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-label">Active chapter</span>
                            <span
                              className="rounded-full px-2 py-0.5"
                              style={{
                                background: "var(--surface-elevated)",
                                color:
                                  activeChapterItem.state === "complete"
                                    ? "var(--profit-primary)"
                                    : activeChapterItem.state === "progress"
                                      ? "var(--warning-primary)"
                                      : "var(--text-tertiary)",
                                fontFamily: "var(--font-jb-mono)",
                                fontSize: "10px",
                              }}
                            >
                              {activeChapterItem.progressLabel}
                            </span>
                            <span
                              className="rounded-full px-2 py-0.5"
                              style={{
                                background: "var(--accent-soft)",
                                color: "var(--accent-primary)",
                                fontFamily: "var(--font-inter)",
                                fontSize: "10px",
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                              }}
                            >
                              {activeChapterStateText}
                            </span>
                          </div>
                          <h2
                            className="mt-2"
                            style={{
                              color: "var(--text-primary)",
                              fontFamily: "var(--font-inter)",
                              fontSize: "clamp(1.35rem, 2vw, 1.75rem)",
                              fontWeight: 700,
                              lineHeight: 1.08,
                              letterSpacing: "-0.03em",
                            }}
                          >
                            {activeChapterLabel}
                          </h2>
                          <p
                            className="mt-2 max-w-3xl"
                            style={{
                              color: "var(--text-secondary)",
                              fontFamily: "var(--font-inter)",
                              fontSize: "14px",
                              lineHeight: 1.65,
                            }}
                          >
                            {activeChapterItem.summary}
                          </p>
                        </div>
                      </div>

                      <div
                        className="rounded-[var(--radius-xl)] border px-4 py-3 2xl:max-w-[19rem]"
                        style={{
                          background: "var(--surface-elevated)",
                          borderColor: "var(--border-subtle)",
                        }}
                      >
                        <p className="text-label">Focus cue</p>
                        <p
                          className="mt-2"
                          style={{
                            color: "var(--text-primary)",
                            fontFamily: "var(--font-inter)",
                            fontSize: "13px",
                            fontWeight: 600,
                            lineHeight: 1.55,
                          }}
                        >
                          {chapterCueText}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <JournalTradeChart
                      tradeId={trade.id}
                      entryPrice={viewModel.entryPrice}
                      exitPrice={viewModel.exitPrice}
                      stopLoss={viewModel.stopLoss}
                      takeProfit={viewModel.takeProfit}
                      entryTime={viewModel.entryDate}
                      exitTime={viewModel.exitDate ?? viewModel.entryDate}
                      direction={viewModel.direction}
                    />
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeChapter}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="mt-6"
                    >
                      {renderActiveChapter()}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </section>

              <div
                className="flex flex-col gap-3 rounded-[var(--radius-xl)] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                style={{
                  background:
                    "color-mix(in srgb, var(--surface) 94%, transparent)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div>
                  <p
                    style={{
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-inter)",
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    Chapter {activeChapterIndex + 1} of {chapterItems.length}
                  </p>
                  <p
                    style={{
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-inter)",
                      fontSize: "11px",
                    }}
                  >
                    {chapterIntroText}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => goToAdjacentChapter(-1)}
                    disabled={activeChapterIndex <= 0}
                    size="sm"
                    variant="outline"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border-subtle)",
                      color:
                        activeChapterIndex > 0
                          ? "var(--text-primary)"
                          : "var(--text-tertiary)",
                      opacity: activeChapterIndex > 0 ? 1 : 0.45,
                    }}
                  >
                    <ChevronLeft size={14} />
                    Previous chapter
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void save()}
                    size="sm"
                    variant="outline"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Save review
                  </Button>
                  <Button
                    type="button"
                    onClick={() => goToAdjacentChapter(1)}
                    disabled={activeChapterIndex >= chapterItems.length - 1}
                    size="sm"
                    variant="outline"
                    style={{
                      background: "var(--surface)",
                      borderColor:
                        activeChapterIndex >= chapterItems.length - 1
                          ? "var(--border-subtle)"
                          : "var(--accent-primary)",
                      color:
                        activeChapterIndex >= chapterItems.length - 1
                          ? "var(--text-tertiary)"
                          : "var(--accent-primary)",
                      opacity:
                        activeChapterIndex >= chapterItems.length - 1 ? 0.45 : 1,
                    }}
                  >
                    Next chapter
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export const TradeReviewDocument = memo(TradeReviewDocumentInner);
TradeReviewDocument.displayName = "TradeReviewDocument";
