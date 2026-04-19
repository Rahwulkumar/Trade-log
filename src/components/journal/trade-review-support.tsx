"use client";

import Image from "next/image";

import type {
  JournalAutoRuleFlag,
} from "@/domain/journal-rule-intelligence";
import type {
  MistakeDefinition,
  Trade,
} from "@/lib/db/schema";
import type { JournalEntryDraft } from "@/domain/journal-types";
import type { JournalSessionProfile } from "@/domain/journal-session-profile";
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
  "Quiet",
  "Normal",
  "Expanded",
  "News-driven",
] as const;

const SESSION_STATE_OPTIONS = [
  "continuation",
  "reversal",
  "ranging",
] as const;

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
  mistakeTagDraft: string;
  setMistakeTagDraft: (value: string) => void;
  checklistOptions: readonly string[];
  sortedMistakes: MistakeDefinition[];
  mistakePickerOptions: JournalLibraryOption[];
  sortedRuleSets: RuleSetWithItems[];
  recommendedRuleSet: RuleSetWithItems | null;
  effectiveRuleSet: RuleSetWithItems | null;
  autoRuleFlags: JournalAutoRuleFlag[];
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
  sessionProfile: JournalSessionProfile;
  sessionProfileLoading: boolean;
  saveBlockedReason: string | null;
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
  mistakeTagDraft,
  setMistakeTagDraft,
  checklistOptions,
  sortedMistakes,
  mistakePickerOptions,
  sortedRuleSets,
  recommendedRuleSet,
  effectiveRuleSet,
  autoRuleFlags,
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
  sessionProfile,
  sessionProfileLoading,
  saveBlockedReason,
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

    case "thesis":
      return (
        <JournalSupportBlock
          title="Structure"
          description="Lock the shared review structure before you spend time writing the rest."
        >
          <div className="space-y-3">
            {saveBlockedReason ? (
              <p className="text-sm text-[var(--warning-primary)]">
                {saveBlockedReason}
              </p>
            ) : (
              <p className="text-sm text-[var(--profit-primary)]">
                Strategy, setup, and template are locked for this idea.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div
                className="rounded-[14px] border px-3 py-2.5"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <p className="text-label">Idea title</p>
                <p className="mt-1 text-sm text-[var(--text-primary)]">
                  {draft.journalReview.tradeIdeaTitle || "No shared title yet"}
                </p>
              </div>
              <div
                className="rounded-[14px] border px-3 py-2.5"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <p className="text-label">Linked positions</p>
                <p className="mt-1 text-sm text-[var(--text-primary)]">
                  {draft.journalReview.linkedTradeIds.length}
                </p>
              </div>
            </div>
          </div>
        </JournalSupportBlock>
      );

    case "market":
      return (
        <div className="grid gap-4 xl:grid-cols-2">
          <JournalSupportBlock
            title="Session profile"
            description="Keep the session state and volatility regime explicit."
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
                {sessionProfileLoading ? (
                  <span className="text-xs text-[var(--text-tertiary)]">
                    Loading chart context...
                  </span>
                ) : null}
              </div>
              {sessionProfile.priorSessionBehavior ? (
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  {sessionProfile.priorSessionBehavior}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {SESSION_STATE_OPTIONS.map((option) => (
                  <JournalChoiceChip
                    key={option}
                    active={draft.journalReview.sessionState === option}
                    onClick={() =>
                      setReviewField(
                        "sessionState",
                        draft.journalReview.sessionState === option
                          ? null
                          : option,
                      )
                    }
                    tone="accent"
                  >
                    {option[0].toUpperCase()}
                    {option.slice(1)}
                  </JournalChoiceChip>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <JournalShortField
                  label="Bias"
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
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
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
            </div>
          </JournalSupportBlock>

          <JournalSupportBlock
            title="Volatility"
            description="Confirm the regime instead of rewriting it in prose."
          >
            <div className="space-y-4">
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
              {sessionProfile.marketCondition ? (
                <p className="text-xs text-[var(--text-tertiary)]">
                  Detected regime: {sessionProfile.marketCondition}
                </p>
              ) : null}
              <JournalPromptField
                prompt="Anything session-specific worth carrying forward?"
                value={draft.journalReview.higherTimeframeNotes}
                onChange={(value) =>
                  setReviewField("higherTimeframeNotes", value)
                }
                rows={3}
                placeholder="Only note the session detail you would want on the next similar trade."
              />
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
              title="Detected flags"
              description="Anything the system can infer from the rule logic shows up here first."
            >
              {autoRuleFlags.length > 0 ? (
                <div className="space-y-3">
                  {autoRuleFlags.map((flag) => (
                    <InsetPanel key={flag.id} paddingClassName="px-3 py-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                            style={{
                              background:
                                flag.status === "broken"
                                  ? "var(--loss-bg)"
                                  : "var(--profit-bg)",
                              color:
                                flag.status === "broken"
                                  ? "var(--loss-primary)"
                                  : "var(--profit-primary)",
                            }}
                          >
                            {flag.status}
                          </span>
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {flag.label}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                          {flag.reason}
                        </p>
                      </div>
                    </InsetPanel>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-tertiary)]">
                  No automatic flags were detected for this trade yet.
                </p>
              )}
            </JournalSupportBlock>

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
                    No rulebook is available yet to review this trade against explicit rules.
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
                    No structured mistake definitions are available yet to reuse here.
                  </p>
                )}
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
