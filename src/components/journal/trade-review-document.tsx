"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Trade } from "@/lib/api/trades";
import {
  type JournalAlignment,
  type JournalEntryDraft,
  type JournalRetakeDecision,
  type JournalSession,
} from "@/domain/journal-types";
import {
  mapTradeToViewModel,
  viewModelToDraft,
} from "@/domain/journal-mapper";
import { useJournalAutosave } from "@/hooks/use-journal-autosave";
import { getTradeNetPnl } from "@/lib/utils/trade-pnl";
import { AppTextArea } from "@/components/ui/control-primitives";
import { Button } from "@/components/ui/button";
import { InsetPanel } from "@/components/ui/surface-primitives";
import {
  JournalChoiceChip,
  JournalConvictionInput,
  JournalMetaDatum,
  JournalPromptField,
  JournalRatingInput,
  JournalSection,
  JournalShortField,
  JournalTagField,
} from "@/components/journal/journal-primitives";

const SESSION_OPTIONS: readonly JournalSession[] = [
  "London",
  "New York",
  "Asia",
  "Overnight",
];

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

function formatDuration(openedAt: string | null, closedAt: string | null): string {
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

function formatNumber(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return "--";
  }
  return Number(value).toFixed(2);
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

interface TradeReviewDocumentProps {
  trade: Trade;
  index: number;
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onNextPending?: () => void;
  onSaved: (trade: Trade) => void;
}

export function TradeReviewDocument({
  trade,
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
        className="sticky top-0 z-10"
        style={{
          background: "var(--surface)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "18px 24px 16px",
        }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
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
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
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
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="text-left sm:text-right">
              <p
                style={{
                  color: tone.color,
                  fontFamily: "var(--font-jb-mono)",
                  fontSize: "26px",
                  fontWeight: 700,
                  lineHeight: 1.05,
                }}
              >
                {formatPnl(netPnl)}
              </p>
              <p
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-inter)",
                  fontSize: "12px",
                  marginTop: "4px",
                }}
              >
                entry {index + 1} of {total}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                Previous
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
                  Next unreviewed
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
                Next
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 pb-10 pt-6 sm:px-6 lg:px-8">
        <JournalSection
          title="Trade record"
          subtitle="The factual frame stays read-only. Use it to anchor the review before you start writing."
        >
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
            <JournalMetaDatum label="Opened" value={formatDateTime(viewModel.entryDate)} />
            <JournalMetaDatum label="Closed" value={formatDateTime(viewModel.exitDate)} />
            <JournalMetaDatum label="Duration" value={duration} />
            <JournalMetaDatum
              label="Entry / Exit"
              value={`${formatNumber(viewModel.entryPrice)} / ${formatNumber(
                viewModel.exitPrice,
              )}`}
            />
            <JournalMetaDatum
              label="Size / R"
              value={`${formatNumber(viewModel.positionSize)} / ${
                viewModel.rMultiple != null
                  ? `${viewModel.rMultiple.toFixed(2)}R`
                  : "--"
                }`}
            />
          </div>
        </JournalSection>

        <JournalSection
          title="Narrative"
          subtitle="Write the trade in sequence: what you saw, what made the idea credible, where management changed, and what the chart looked like after you were gone."
        >
          <AppTextArea
            value={draft.notes}
            onChange={(event) => setDraftField({ notes: event.target.value })}
            rows={12}
            placeholder="Tell the trade from first observation to final exit."
            className="w-full rounded-[var(--radius-lg)] px-5 py-4 text-[0.9375rem]"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-primary)",
              lineHeight: 1.85,
            }}
          />
        </JournalSection>

        <JournalSection
          title="Thesis"
          subtitle="Capture the setup, why the trade was worth taking, what would have invalidated it, and where the upside was supposed to come from."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <JournalShortField
              label="Strategy"
              value={draft.journalReview.strategyName}
              onChange={(value) => setReviewField("strategyName", value)}
              placeholder="e.g. London sweep reversal"
            />
            <JournalShortField
              label="Setup"
              value={draft.journalReview.setupName}
              onChange={(value) => setReviewField("setupName", value)}
              placeholder="Name the precise setup"
            />
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
        </JournalSection>

        <JournalSection
          title="Timeframe alignment"
          subtitle="Record the higher-timeframe read, the execution frame, the trigger frame, and whether the trade was aligned or forced."
        >
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
          <div className="grid gap-4 sm:grid-cols-3">
            <JournalShortField
              label="Higher timeframe bias"
              value={draft.journalReview.higherTimeframeBias}
              onChange={(value) => setReviewField("higherTimeframeBias", value)}
              placeholder="Bullish, bearish, neutral"
            />
            <JournalShortField
              label="Execution timeframe"
              value={draft.journalReview.executionTimeframe}
              onChange={(value) => setReviewField("executionTimeframe", value)}
              placeholder="e.g. 15m"
              mono
            />
            <JournalShortField
              label="Trigger timeframe"
              value={draft.journalReview.triggerTimeframe}
              onChange={(value) => setReviewField("triggerTimeframe", value)}
              placeholder="e.g. 1m"
              mono
            />
          </div>
          <JournalPromptField
            prompt="How did the timeframes agree or fight each other?"
            value={draft.journalReview.higherTimeframeNotes}
            onChange={(value) => setReviewField("higherTimeframeNotes", value)}
            rows={4}
            placeholder="Be explicit about alignment, conflict, or the one frame you ignored."
          />
        </JournalSection>

        <JournalSection
          title="Market context"
          subtitle="Add the session, the market condition, and the contextual detail that made the trade easier or more dangerous."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {SESSION_OPTIONS.map((option) => (
                <JournalChoiceChip
                  key={option}
                  active={draft.session === option}
                  onClick={() =>
                    setDraftField({
                      session: draft.session === option ? null : option,
                    })
                  }
                >
                  {option}
                </JournalChoiceChip>
              ))}
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
        </JournalSection>

        <JournalSection
          title="Execution review"
          subtitle="Break the trade into the trigger, the handling, and the exit. This section should explain the decisions, not just the outcome."
        >
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
        </JournalSection>

        <JournalSection
          title="Psychology"
          subtitle="Write the internal state before, during, and after the trade. This is where hesitation, urgency, FOMO, stubbornness, and clarity belong."
        >
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
        </JournalSection>

        <JournalSection
          title="Review controls"
          subtitle="Keep the annotations tight: rate the craft, mark the tags, set conviction, and record whether this is a trade worth repeating."
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)]">
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
            </div>

            <div className="space-y-5">
              <JournalTagField
                label="Setup tags"
                tags={draft.setupTags}
                onChange={(next) => setDraftField({ setupTags: next })}
                tone="neutral"
                placeholder="Add setup tag"
              />
              <JournalTagField
                label="Mistake tags"
                tags={draft.mistakeTags}
                onChange={(next) => setDraftField({ mistakeTags: next })}
                tone="loss"
                placeholder="Add mistake tag"
              />
            </div>
          </div>
        </JournalSection>

        <JournalSection
          title="Excursion"
          subtitle="Record how far price went against you and for you. The pair matters because it tells you whether the problem was structure, timing, or management."
        >
          <InsetPanel paddingClassName="px-5 py-4">
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
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
          </InsetPanel>
        </JournalSection>

        <JournalSection
          title="Distillation"
          subtitle="Finish with the one sentence worth remembering and the next action that should change future behavior."
        >
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
                  padding: "14px 16px",
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-inter)",
                fontSize: "12px",
              }}
            >
              {saving
                ? "Saving review..."
                : savedAt
                  ? `Saved ${savedAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : isDirty
                    ? "Unsaved edits"
                    : "No pending edits"}
            </p>
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
          </div>
        </JournalSection>
      </div>
    </motion.article>
  );
}
