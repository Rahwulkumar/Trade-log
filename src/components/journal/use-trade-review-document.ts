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
  mapDraftToApiUpdate,
  mapTradeToViewModel,
  viewModelToDraft,
} from "@/domain/journal-mapper";
import {
  buildJournalRuleIntelligence,
  type JournalAutoRuleFlag,
} from "@/domain/journal-rule-intelligence";
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
import { useJournalContextAutomation } from "@/components/journal/use-journal-context-automation";

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

function formatIdeaTimestamp(value: string | Date | null | undefined): string {
  if (!value) {
    return "Undated";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Undated";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function dateValue(value: string | Date | null | undefined): number {
  if (!value) {
    return 0;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function mergeUniqueStrings(...groups: Array<readonly string[]>) {
  return Array.from(
    new Set(groups.flatMap((group) => group.filter((value) => value.trim()))),
  );
}

function normalizeRuleStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function sameEstDate(
  left: string | Date | null | undefined,
  right: string | Date | null | undefined,
) {
  if (!left || !right) {
    return false;
  }

  const leftDate = left instanceof Date ? left : new Date(left);
  const rightDate = right instanceof Date ? right : new Date(right);
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) {
    return false;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(leftDate) === formatter.format(rightDate);
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
  tradeIdea: Trade[];
  allTrades: Trade[];
  globalRules: string[];
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
}: UseTradeReviewDocumentArgs) {
  const viewModel = useMemo(() => mapTradeToViewModel(trade), [trade]);
  const initialDraft = useMemo(() => viewModelToDraft(viewModel), [viewModel]);
  const [draft, setDraft] = useState<JournalEntryDraft>(initialDraft);
  const deferredDraft = useDeferredValue(draft);
  const [activeChapter, setActiveChapter] =
    useState<JournalChapterId>("narrative");
  const [setupTagDraft, setSetupTagDraft] = useState("");
  const [mistakeTagDraft, setMistakeTagDraft] = useState("");
  const [psychologyBeforeDraft, setPsychologyBeforeDraft] = useState("");
  const [psychologyDuringDraft, setPsychologyDuringDraft] = useState("");
  const [psychologyAfterDraft, setPsychologyAfterDraft] = useState("");
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

  const ideaTrades = useMemo(() => {
    const byId = new Map<string, Trade>();
    byId.set(trade.id, trade);
    for (const item of tradeIdea) {
      byId.set(item.id, item);
    }

    return [...byId.values()].sort((left, right) => {
      const leftValue = dateValue(left.entryDate ?? left.exitDate ?? left.createdAt);
      const rightValue = dateValue(
        right.entryDate ?? right.exitDate ?? right.createdAt,
      );
      return leftValue - rightValue;
    });
  }, [trade, tradeIdea]);

  const tradeIdeaMembers = useMemo(
    () =>
      ideaTrades.map((item) => {
        const netValue = getTradeNetPnl(item);
        return {
          id: item.id,
          label: `${item.symbol} ${formatIdeaTimestamp(
            item.entryDate ?? item.exitDate ?? item.createdAt,
          )}`,
          meta:
            item.id === trade.id
              ? "Current position"
              : `${item.direction} position`,
          pnlText: formatPnl(netValue),
          pnlTone:
            netValue > 0 ? "profit" : netValue < 0 ? "loss" : "neutral",
        } as const;
      }),
    [ideaTrades, trade.id],
  );

  const ideaSeedIds = useMemo(
    () => ideaTrades.map((item) => item.id).filter((id) => id !== trade.id),
    [ideaTrades, trade.id],
  );

  const selectedPlaybook =
    playbooks.find((playbook) => playbook.id === draft.playbookId) ?? null;
  const selectedSetup =
    setupDefinitions.find((setup) => setup.id === draft.setupDefinitionId) ?? null;

  const sharedIdeaSeed = useMemo(() => {
    for (const item of ideaTrades) {
      if (item.id === trade.id) {
        continue;
      }

      const memberViewModel = mapTradeToViewModel(item);
      const memberDraft = viewModelToDraft(memberViewModel);
      const review = memberDraft.journalReview;

      if (
        memberDraft.playbookId ||
        memberDraft.setupDefinitionId ||
        memberDraft.journalTemplateId ||
        review.tradeIdeaId ||
        review.tradeIdeaTitle.trim() ||
        review.groupSummary.trim()
      ) {
        return memberDraft;
      }
    }

    return null;
  }, [ideaTrades, trade.id]);

  useEffect(() => {
    setDraft((current) => {
      const nextLinkedIds = mergeUniqueStrings(
        current.journalReview.linkedTradeIds,
        ideaSeedIds,
      ).filter((id) => id !== trade.id);
      const shouldCarryIdea =
        nextLinkedIds.length > 0 ||
        current.journalReview.tradeIdeaTitle.trim().length > 0 ||
        current.journalReview.groupSummary.trim().length > 0;
      const nextIdeaId = shouldCarryIdea
        ? current.journalReview.tradeIdeaId ??
          sharedIdeaSeed?.journalReview.tradeIdeaId ??
          trade.id
        : null;

      const nextPlaybookId = current.playbookId ?? sharedIdeaSeed?.playbookId ?? null;
      const nextSetupDefinitionId =
        current.setupDefinitionId ?? sharedIdeaSeed?.setupDefinitionId ?? null;
      const nextTemplateId =
        current.journalTemplateId ?? sharedIdeaSeed?.journalTemplateId ?? null;
      const nextRuleSetId = current.ruleSetId ?? sharedIdeaSeed?.ruleSetId ?? null;

      const nextTemplateSnapshot =
        current.journalTemplateSnapshot ?? sharedIdeaSeed?.journalTemplateSnapshot ?? null;
      const nextStrategyName =
        current.journalReview.strategyName ||
        sharedIdeaSeed?.journalReview.strategyName ||
        "";
      const nextTradeIdeaTitle =
        current.journalReview.tradeIdeaTitle ||
        sharedIdeaSeed?.journalReview.tradeIdeaTitle ||
        "";
      const nextGroupSummary =
        current.journalReview.groupSummary ||
        sharedIdeaSeed?.journalReview.groupSummary ||
        "";

      const linkedIdsChanged =
        nextLinkedIds.length !== current.journalReview.linkedTradeIds.length ||
        nextLinkedIds.some(
          (value, index) => value !== current.journalReview.linkedTradeIds[index],
        );

      const changed =
        linkedIdsChanged ||
        nextIdeaId !== current.journalReview.tradeIdeaId ||
        nextPlaybookId !== current.playbookId ||
        nextSetupDefinitionId !== current.setupDefinitionId ||
        nextTemplateId !== current.journalTemplateId ||
        nextRuleSetId !== current.ruleSetId ||
        nextTemplateSnapshot !== current.journalTemplateSnapshot ||
        nextStrategyName !== current.journalReview.strategyName ||
        nextTradeIdeaTitle !== current.journalReview.tradeIdeaTitle ||
        nextGroupSummary !== current.journalReview.groupSummary;

      if (!changed) {
        return current;
      }

      return {
        ...current,
        playbookId: nextPlaybookId,
        setupDefinitionId: nextSetupDefinitionId,
        journalTemplateId: nextTemplateId,
        ruleSetId: nextRuleSetId,
        journalTemplateSnapshot: nextTemplateSnapshot,
        journalReview: {
          ...current.journalReview,
          strategyName: nextStrategyName,
          tradeIdeaId: nextIdeaId,
          tradeIdeaTitle: nextTradeIdeaTitle,
          groupSummary: nextGroupSummary,
          linkedTradeIds: nextLinkedIds,
        },
      };
    });
  }, [ideaSeedIds, sharedIdeaSeed, trade.id]);

  const effectiveLinkedTradeIds = useMemo(
    () =>
      mergeUniqueStrings(draft.journalReview.linkedTradeIds, ideaSeedIds).filter(
        (id) => id !== trade.id,
      ),
    [draft.journalReview.linkedTradeIds, ideaSeedIds, trade.id],
  );

  const relatedTradeOptions = useMemo<JournalLibraryOption[]>(() => {
    const options = allTrades
      .filter((candidate) => candidate.id !== trade.id)
      .filter((candidate) => {
        if (effectiveLinkedTradeIds.includes(candidate.id)) {
          return true;
        }

        if (candidate.symbol !== trade.symbol) {
          return false;
        }

        if (candidate.direction !== trade.direction) {
          return false;
        }

        if ((candidate.propAccountId ?? null) !== (trade.propAccountId ?? null)) {
          return false;
        }

        return sameEstDate(
          candidate.entryDate ?? candidate.exitDate ?? candidate.createdAt,
          trade.entryDate ?? trade.exitDate ?? trade.createdAt,
        );
      })
      .sort((left, right) => {
        const leftValue = dateValue(left.entryDate ?? left.exitDate ?? left.createdAt);
        const rightValue = dateValue(
          right.entryDate ?? right.exitDate ?? right.createdAt,
        );
        return leftValue - rightValue;
      });

    return options.map((candidate) => ({
      id: candidate.id,
      label: `${candidate.symbol} ${formatIdeaTimestamp(
        candidate.entryDate ?? candidate.exitDate ?? candidate.createdAt,
      )}`,
      meta: `${candidate.direction} | ${formatPnl(getTradeNetPnl(candidate))}`,
    }));
  }, [allTrades, effectiveLinkedTradeIds, trade]);

  const toggleLinkedTrade = useCallback((tradeId: string) => {
    setDraft((current) => {
      const nextLinkedIds = current.journalReview.linkedTradeIds.includes(tradeId)
        ? current.journalReview.linkedTradeIds.filter((id) => id !== tradeId)
        : [...current.journalReview.linkedTradeIds, tradeId];

      return {
        ...current,
        journalReview: {
          ...current.journalReview,
          linkedTradeIds: nextLinkedIds,
          tradeIdeaId:
            nextLinkedIds.length > 0 ||
            current.journalReview.tradeIdeaTitle.trim().length > 0 ||
            current.journalReview.groupSummary.trim().length > 0
              ? current.journalReview.tradeIdeaId ?? trade.id
              : null,
        },
      };
    });
  }, [trade.id]);

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

  const filteredSetups = useMemo(() => {
    if (!draft.playbookId) {
      return sortedSetups;
    }

    return sortedSetups.filter(
      (setup) =>
        setup.playbookId === draft.playbookId || setup.id === draft.setupDefinitionId,
    );
  }, [draft.playbookId, draft.setupDefinitionId, sortedSetups]);

  const filteredTemplates = useMemo(() => {
    const preferredIds = new Set<string>();
    if (selectedSetup?.defaultTemplateId) {
      preferredIds.add(selectedSetup.defaultTemplateId);
    }
    if (draft.journalTemplateId) {
      preferredIds.add(draft.journalTemplateId);
    }

    const scopedTemplates = sortedTemplates.filter((template) => {
      if (preferredIds.has(template.id)) {
        return true;
      }

      if (!draft.playbookId) {
        return template.scopeType === "global";
      }

      return (
        template.scopeType === "global" ||
        template.playbookId === draft.playbookId
      );
    });

    return scopedTemplates.length > 0 ? scopedTemplates : sortedTemplates;
  }, [
    draft.journalTemplateId,
    draft.playbookId,
    selectedSetup?.defaultTemplateId,
    sortedTemplates,
  ]);

  const saveBlockedReason =
    !draft.playbookId
      ? "Choose the strategy before the review starts saving."
      : !draft.setupDefinitionId
        ? "Choose the setup linked to this idea."
        : !draft.journalTemplateId
          ? "Choose the journal template for this setup."
          : null;

  const { saving, savedAt, isDirty, save } = useJournalAutosave({
    draft,
    initialDraft,
    tradeId: trade.id,
    onSaved,
    debounceMs: 1500,
    enabled: saveBlockedReason == null,
    buildRelatedUpdates: (currentDraft) => {
      const selectedRelatedIds = currentDraft.journalReview.linkedTradeIds.filter(
        (id) => id !== trade.id,
      );
      const relatedIds = mergeUniqueStrings(
        ideaSeedIds,
        selectedRelatedIds,
      ).filter((id) => id !== trade.id);

      const shouldCarryIdea =
        selectedRelatedIds.length > 0 ||
        currentDraft.journalReview.tradeIdeaTitle.trim().length > 0 ||
        currentDraft.journalReview.groupSummary.trim().length > 0;
      const sharedIdeaId = shouldCarryIdea
        ? currentDraft.journalReview.tradeIdeaId ?? trade.id
        : null;

      return relatedIds.flatMap((relatedTradeId) => {
        const relatedTrade = allTrades.find((item) => item.id === relatedTradeId);
        if (!relatedTrade) {
          return [];
        }

        const baseDraft = viewModelToDraft(mapTradeToViewModel(relatedTrade));
        const shouldStayLinked = selectedRelatedIds.includes(relatedTradeId);
        const nextLinkedIds = shouldStayLinked
          ? mergeUniqueStrings(
              selectedRelatedIds.filter((id) => id !== relatedTradeId),
              [trade.id],
            )
          : [];
        const nextDraft: JournalEntryDraft = {
          ...baseDraft,
          playbookId: shouldStayLinked
            ? currentDraft.playbookId
            : baseDraft.playbookId,
          setupDefinitionId: shouldStayLinked
            ? currentDraft.setupDefinitionId
            : baseDraft.setupDefinitionId,
          journalTemplateId: shouldStayLinked
            ? currentDraft.journalTemplateId
            : baseDraft.journalTemplateId,
          ruleSetId: shouldStayLinked
            ? currentDraft.ruleSetId
            : baseDraft.ruleSetId,
          journalTemplateSnapshot: shouldStayLinked
            ? currentDraft.journalTemplateSnapshot
            : baseDraft.journalTemplateSnapshot,
          journalReview: {
            ...baseDraft.journalReview,
            strategyName: shouldStayLinked
              ? currentDraft.journalReview.strategyName
              : baseDraft.journalReview.strategyName,
            tradeIdeaId: shouldStayLinked ? sharedIdeaId : null,
            tradeIdeaTitle: shouldStayLinked
              ? currentDraft.journalReview.tradeIdeaTitle
              : "",
            linkedTradeIds: nextLinkedIds,
            groupSummary: shouldStayLinked
              ? currentDraft.journalReview.groupSummary
              : "",
          },
        };

        return [
          {
            tradeId: relatedTradeId,
            updates: mapDraftToApiUpdate(nextDraft),
          },
        ];
      });
    },
  });

  const netPnl = getTradeNetPnl(trade);
  const tone = outcomeTone(outcomeFromPnl(netPnl));
  const verdict = draft.journalReview.retakeDecision;
  const saveStatusText = saving
    ? "Saving review..."
    : saveBlockedReason
      ? saveBlockedReason
      : isDirty
      ? "Unsaved edits"
      : showRecentSave && savedAt
        ? `Saved ${savedAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : null;
  const pnlText = formatPnl(netPnl);

  const selectedTemplate =
    filteredTemplates.find((template) => template.id === draft.journalTemplateId) ??
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
      mergeUniqueStrings(
        resolvedTemplateConfig.checklistItems.length > 0
          ? resolvedTemplateConfig.checklistItems
          : [...EXECUTION_CHECKLIST_OPTIONS],
        normalizeRuleStrings(selectedSetup?.entryCriteria),
      ),
    [resolvedTemplateConfig, selectedSetup?.entryCriteria],
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

  const { sessionProfile, loading: sessionProfileLoading } =
    useJournalContextAutomation({
      tradeId: trade.id,
      entryTime: viewModel.entryDate,
      direction: viewModel.direction,
      priorSessionBehavior: draft.journalReview.priorSessionBehavior,
      marketCondition: draft.marketCondition,
      sessionState: draft.journalReview.sessionState,
      onApply: (patch) => {
        setDraft((current) => ({
          ...current,
          marketCondition: patch.marketCondition ?? current.marketCondition,
          journalReview: {
            ...current.journalReview,
            priorSessionBehavior:
              patch.priorSessionBehavior ??
              current.journalReview.priorSessionBehavior,
            sessionState:
              patch.sessionState ?? current.journalReview.sessionState,
          },
        }));
      },
    });

  const autoRuleIntelligence = useMemo(
    () =>
      buildJournalRuleIntelligence({
        draft,
        activeTrade: trade,
        allTrades,
        viewModel,
        selectedPlaybook,
        selectedSetup,
        effectiveRuleSet,
        globalRules: normalizeRuleStrings(globalRules),
      }),
    [
      allTrades,
      draft,
      effectiveRuleSet,
      globalRules,
      selectedPlaybook,
      selectedSetup,
      trade,
      viewModel,
    ],
  );

  useEffect(() => {
    const nextAutoRuleFlags = autoRuleIntelligence.flags.map(
      (flag) =>
        `${flag.status === "broken" ? "Broken" : "Followed"}: ${flag.label}`,
    );

    setDraft((current) => {
      const mergedResults = [...current.tradeRuleResults];
      let changed = false;

      for (const suggestion of autoRuleIntelligence.suggestedResults) {
        if (
          mergedResults.some((result) => result.ruleItemId === suggestion.ruleItemId)
        ) {
          continue;
        }

        mergedResults.push(suggestion);
        changed = true;
      }

      const flagsChanged =
        nextAutoRuleFlags.length !== current.journalReview.autoRuleFlags.length ||
        nextAutoRuleFlags.some(
          (flag, index) => flag !== current.journalReview.autoRuleFlags[index],
        );

      if (!changed && !flagsChanged) {
        return current;
      }

      return {
        ...current,
        tradeRuleResults: changed ? mergedResults : current.tradeRuleResults,
        journalReview: {
          ...current.journalReview,
          autoRuleFlags: flagsChanged
            ? nextAutoRuleFlags
            : current.journalReview.autoRuleFlags,
        },
      };
    });
  }, [autoRuleIntelligence.flags, autoRuleIntelligence.suggestedResults]);

  const chapterItems = useMemo(() => {
    const items = [
      {
        id: "narrative",
        label: "Brief",
        orderLabel: "01",
        summary: "Capture the trade idea, any adds, and the final exit reason.",
        ...describeChapterProgress([hasText(deferredDraft.notes)]),
      },
      {
        id: "thesis",
        label: "Thesis",
        orderLabel: "02",
        summary: "Lock the strategy, edge, invalidation, and intended path.",
        ...describeChapterProgress([
          hasValue(deferredDraft.playbookId),
          hasValue(deferredDraft.setupDefinitionId),
          hasValue(deferredDraft.journalTemplateId),
          deferredDraft.journalReview.linkedTradeIds.length > 0 ||
            hasText(deferredDraft.journalReview.groupSummary) ||
            hasText(deferredDraft.journalReview.positionReason),
          hasText(deferredDraft.journalReview.reasonForTrade),
          hasText(deferredDraft.journalReview.invalidation),
          hasText(deferredDraft.journalReview.higherTimeframeBias),
          hasText(deferredDraft.journalReview.targetPlan),
        ]),
      },
      {
        id: "market",
        label: "Context",
        orderLabel: "03",
        summary: "Record prior-session behavior, market state, and the context that mattered.",
        ...describeChapterProgress([
          hasText(deferredDraft.journalReview.priorSessionBehavior),
          hasValue(deferredDraft.journalReview.sessionState),
          hasValue(deferredDraft.marketCondition),
          hasText(deferredDraft.observations),
          hasText(deferredDraft.journalReview.marketContext),
        ]),
      },
      {
        id: "execution",
        label: "Execution",
        orderLabel: "04",
        summary: "Document the trigger, adds, management shift, and full exit.",
        ...describeChapterProgress([
          hasText(deferredDraft.journalReview.entryReason),
          hasText(deferredDraft.journalReview.scaleInNotes),
          hasText(deferredDraft.journalReview.managementReview),
          hasText(deferredDraft.journalReview.exitReason),
        ]),
      },
      {
        id: "psychology",
        label: "Behavior",
        orderLabel: "05",
        summary: "Tag the actual state before, during, and after the trade.",
        ...describeChapterProgress([
          deferredDraft.journalReview.psychologyBeforeTags.length > 0,
          deferredDraft.journalReview.psychologyDuringTags.length > 0,
          deferredDraft.journalReview.psychologyAfterTags.length > 0,
          hasText(deferredDraft.feelings),
        ]),
      },
      {
        id: "scorecard",
        label: "Review",
        orderLabel: "06",
        summary: "Grade the trade, tag mistakes, and mark rule outcomes.",
        ...describeChapterProgress([
          hasValue(deferredDraft.entryRating),
          hasValue(deferredDraft.exitRating),
          hasValue(deferredDraft.managementRating),
          hasValue(deferredDraft.conviction),
          hasValue(deferredDraft.journalReview.retakeDecision),
          hasText(deferredDraft.journalReview.overallGrade),
          deferredDraft.tradeRuleResults.length > 0,
          deferredDraft.mistakeDefinitionIds.length > 0,
          deferredDraft.mistakeTags.length > 0,
        ]),
      },
      {
        id: "closeout",
        label: "Closeout",
        orderLabel: "07",
        summary: "Finish with the lesson, the main leak, and the next correction.",
        ...describeChapterProgress([
          hasText(deferredDraft.lessonLearned),
          hasText(deferredDraft.journalReview.primaryFailureCause),
          hasText(deferredDraft.journalReview.stopDoing),
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
      label: "Brief",
      orderLabel: "01",
      summary: "",
      progressLabel: "0/0",
      state: "empty" as const,
    };
  const activeChapterLabel = activeChapterItem?.label ?? "Brief";
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
      narrative: "Write the trade in one rereadable pass.",
      thesis: "Lock the setup, then answer why it was valid, what broke it, and where it should have gone.",
      market: "Keep only the session context that changed the trade.",
      execution: "Capture the entry trigger first, then only the size changes or exit that mattered.",
      psychology: "Use tags for state. Write only the behavior worth catching or repeating.",
      scorecard: "Score the execution honestly and let the rule checks speak for themselves.",
      closeout: "Reduce the trade to one lesson and one concrete correction.",
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
        const nextTemplate = resolveTemplateForSelection(null, null);
        setDraft((current) => ({
          ...current,
          playbookId: null,
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
            strategyName: "",
          },
        }));
        return;
      }

      if (value === "__manual") {
        setDraft((current) => ({
          ...current,
          playbookId: null,
          setupDefinitionId: null,
        }));
        return;
      }

      const selected = sortedPlaybooks.find((playbook) => playbook.id === value);
      const currentSetup =
        sortedSetups.find((setup) => setup.id === draft.setupDefinitionId) ?? null;
      const nextSetup =
        currentSetup && currentSetup.playbookId === selected?.id
          ? currentSetup.id
          : null;
      const nextTemplate = resolveTemplateForSelection(
        selected?.id ?? null,
        nextSetup,
      );
      setDraft((current) => ({
        ...current,
        playbookId: selected?.id ?? null,
        setupDefinitionId: nextSetup,
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
    [draft.setupDefinitionId, resolveTemplateForSelection, sortedPlaybooks, sortedSetups],
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
        }));
        return;
      }

      const nextSetup =
        sortedSetups.find((setup) => setup.id === value) ?? null;
      const nextTemplate = resolveTemplateForSelection(
        draft.playbookId,
        nextSetup?.id ?? null,
      );

      setDraft((current) => ({
        ...current,
        setupDefinitionId: nextSetup?.id ?? null,
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
          invalidation:
            current.journalReview.invalidation ||
            nextSetup?.invalidationRules ||
            "",
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
        filteredTemplates.find((template) => template.id === value) ??
        sortedTemplates.find((template) => template.id === value) ??
        null;

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
    [filteredTemplates, sortedTemplates],
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
    activeChapter,
    activeChapterIndex,
    activeChapterItem,
    activeChapterLabel,
    autoRuleFlags: autoRuleIntelligence.flags,
    isDirty,
    mistakePickerOptions,
    mistakeTagDraft,
    netPnl,
    pnlText,
    recommendedRuleSet,
    relatedTradeOptions,
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
    psychologyAfterDraft,
    psychologyBeforeDraft,
    psychologyDuringDraft,
    sessionProfile,
    sessionProfileLoading,
    setupTagDraft,
    sortedMistakes,
    sortedPlaybooks,
    sortedRuleSets,
    sortedSetups,
    sortedTemplates,
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
  };
}
