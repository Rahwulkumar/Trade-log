"use client";

import Image from "next/image";

import type {
  MistakeDefinition,
  Trade,
} from "@/lib/db/schema";
import type {
  JournalAlignment,
  JournalEntryDraft,
} from "@/domain/journal-types";
import type { JournalTemplateConfig } from "@/lib/journal-structure/types";
import type {
  RuleItemStatus,
  RuleSetWithItems,
} from "@/lib/rulebooks/types";
import { getScreenshotUrl } from "@/lib/api/storage";
import { ChoiceChip } from "@/components/ui/control-primitives";
import { InsetPanel } from "@/components/ui/surface-primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type JournalLibraryOption,
  JournalChoiceChip,
  JournalLibraryMultiPicker,
  JournalPromptField,
  JournalShortField,
  JournalTagField,
} from "@/components/journal/journal-primitives";
import {
  JournalSupportBlock,
} from "@/components/journal/journal-review-shell";
import { JournalTradeChart } from "@/components/journal/journal-trade-chart";
import type { JournalChapterId } from "@/components/journal/trade-review-types";

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

function resolveScreenshotPreviewUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return getScreenshotUrl(value);
}

interface JournalChapterSupportProps {
  activeChapter: JournalChapterId;
  draft: JournalEntryDraft;
  trade: Trade;
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  entryTime: string | null;
  exitTime: string | null;
  direction: "LONG" | "SHORT";
  resolvedTemplateConfig: JournalTemplateConfig;
  screenshotError: string | null;
  uploadingScreenshots: boolean;
  executionChecklistDraft: string;
  setExecutionChecklistDraft: (value: string) => void;
  setupTagDraft: string;
  setSetupTagDraft: (value: string) => void;
  mistakeTagDraft: string;
  setMistakeTagDraft: (value: string) => void;
  checklistOptions: readonly string[];
  sortedMistakes: MistakeDefinition[];
  mistakePickerOptions: JournalLibraryOption[];
  sortedRuleSets: RuleSetWithItems[];
  recommendedRuleSet: RuleSetWithItems | null;
  effectiveRuleSet: RuleSetWithItems | null;
  ruleResultsByItemId: Map<
    string,
    JournalEntryDraft["tradeRuleResults"][number] | undefined
  >;
  setDraftField: (value: Partial<JournalEntryDraft>) => void;
  setReviewField: <K extends keyof JournalEntryDraft["journalReview"]>(
    field: K,
    value: JournalEntryDraft["journalReview"][K],
  ) => void;
  setDraft: React.Dispatch<React.SetStateAction<JournalEntryDraft>>;
  handleRuleSetChange: (value: string) => void;
  toggleExecutionChecklist: (value: string) => void;
  toggleMistakeDefinition: (id: string) => void;
  setTradeRuleStatus: (ruleItemId: string, status: RuleItemStatus) => void;
  handleScreenshotUpload: (files: FileList | null) => Promise<void>;
  handleScreenshotRemove: (screenshotId: string) => Promise<void>;
}

export function JournalChapterSupport({
  activeChapter,
  draft,
  trade,
  entryPrice,
  exitPrice,
  stopLoss,
  takeProfit,
  entryTime,
  exitTime,
  direction,
  resolvedTemplateConfig,
  screenshotError,
  uploadingScreenshots,
  executionChecklistDraft,
  setExecutionChecklistDraft,
  setupTagDraft,
  setSetupTagDraft,
  mistakeTagDraft,
  setMistakeTagDraft,
  checklistOptions,
  sortedMistakes,
  mistakePickerOptions,
  sortedRuleSets,
  recommendedRuleSet,
  effectiveRuleSet,
  ruleResultsByItemId,
  setDraftField,
  setReviewField,
  setDraft,
  handleRuleSetChange,
  toggleExecutionChecklist,
  toggleMistakeDefinition,
  setTradeRuleStatus,
  handleScreenshotUpload,
  handleScreenshotRemove,
}: JournalChapterSupportProps) {
  switch (activeChapter) {
    case "narrative":
      return (
        <JournalSupportBlock
          title="Screenshots"
          description="Keep only the evidence worth revisiting."
        >
          <div className="space-y-4">
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
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    void handleScreenshotUpload(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <span className="text-xs text-[var(--text-tertiary)]">
                {uploadingScreenshots
                  ? "Uploading..."
                  : `${draft.screenshots.length} attached`}
              </span>
            </div>
            {screenshotError ? (
              <p className="text-xs text-[var(--loss-primary)]">
                {screenshotError}
              </p>
            ) : null}
            {draft.screenshots.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
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
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3 py-3">
                      <div className="min-w-0">
                        <p className="text-label">Attached</p>
                        <p className="truncate text-xs text-[var(--text-secondary)]">
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
              <p className="text-xs text-[var(--text-tertiary)]">
                {resolvedTemplateConfig.screenshotRequired
                  ? "This template expects at least one screenshot."
                  : "No screenshots yet."}
              </p>
            )}
          </div>
        </JournalSupportBlock>
      );

    case "market":
      return (
        <div className="grid gap-4 xl:grid-cols-2">
          <JournalSupportBlock
            title="Alignment"
            description="Bias, timeframes, and whether the idea was aligned or forced."
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {ALIGNMENT_OPTIONS.map((option) => (
                  <JournalChoiceChip
                    key={option.value}
                    active={draft.journalReview.timeframeAlignment === option.value}
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
              <div className="grid gap-3 sm:grid-cols-3">
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
          </JournalSupportBlock>

          <JournalSupportBlock
            title="Session and conditions"
            description="The surrounding market environment for this setup."
          >
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
          </JournalSupportBlock>
        </div>
      );

    case "execution":
      return (
        <JournalSupportBlock
          title="Execution checklist"
          description="Mark the conditions that were actually present before and during the trade."
        >
          <div className="space-y-4">
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
        </JournalSupportBlock>
      );

    case "scorecard":
      return (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <JournalSupportBlock
              title="Rulebook review"
              description="Evaluate the trade against the most relevant rulebook."
            >
              <div className="space-y-4">
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
                      <p className="text-xs text-[var(--text-tertiary)]">
                        This rulebook does not have any active rules yet.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Create a rulebook in Playbooks to review trades against explicit rules.
                  </p>
                )}
              </div>
            </JournalSupportBlock>

            <JournalSupportBlock
              title="Mistakes and tags"
              description="Tag the errors and structure you want to measure later."
            >
              <div className="space-y-4">
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
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Create mistake definitions in Playbooks to reuse them here.
                  </p>
                )}
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
            </JournalSupportBlock>
          </div>

          <JournalSupportBlock
            title="Excursion"
            description="Record how far price moved against you and for you."
          >
            <div className="space-y-5">
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
                    left: `calc(50% - ${Math.min(Math.abs(draft.mae ?? 0), 5) * 9}%)`,
                    background: "var(--loss-primary)",
                  }}
                />
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
                  style={{
                    left: `calc(50% + ${Math.min(Math.abs(draft.mfe ?? 0), 5) * 9}%)`,
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
          </JournalSupportBlock>
        </div>
      );

    case "closeout":
      return (
        <JournalSupportBlock
          title="Chart replay"
          description="Review price structure and exits without leaving the review."
        >
        <JournalTradeChart
          tradeId={trade.id}
          entryPrice={entryPrice}
          exitPrice={exitPrice}
          stopLoss={stopLoss}
          takeProfit={takeProfit}
          entryTime={entryTime}
          exitTime={exitTime}
          direction={direction}
        />
      </JournalSupportBlock>
      );

    default:
      return null;
  }
}
