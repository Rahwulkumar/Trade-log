"use client";

import { type ReactNode, useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Circle, Star } from "lucide-react";
import type { Trade } from "@/lib/api/trades";
import {
  type JournalAlignment,
  type JournalEntryDraft,
  type JournalRetakeDecision,
  type JournalSession,
  type QualityRating,
} from "@/domain/journal-types";
import {
  mapTradeToViewModel,
  viewModelToDraft,
} from "@/domain/journal-mapper";
import { useJournalAutosave } from "@/hooks/use-journal-autosave";
import { getTradeNetPnl } from "@/lib/utils/trade-pnl";

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

const QUALITY_VALUES: readonly QualityRating[] = [1, 2, 3, 4, 5];

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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        color: "var(--text-tertiary)",
        fontFamily: "var(--font-inter)",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </p>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-1">
      <SectionLabel>{title}</SectionLabel>
      {subtitle ? (
        <p
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-inter)",
            fontSize: "13px",
            lineHeight: 1.6,
            maxWidth: "52rem",
          }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function ChoiceButton({
  active,
  children,
  onClick,
  tone = "neutral",
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  tone?: "neutral" | "profit" | "loss" | "warning" | "accent";
}) {
  let activeColor = "var(--text-primary)";
  let activeBorder = "var(--border-active)";
  let activeBg = "var(--surface-elevated)";

  if (tone === "accent") {
    activeColor = "var(--accent-primary)";
    activeBorder = "var(--accent-primary)";
    activeBg = "var(--accent-soft)";
  } else if (tone === "profit") {
    activeColor = "var(--profit-primary)";
    activeBorder = "var(--profit-primary)";
    activeBg = "var(--profit-bg)";
  } else if (tone === "loss") {
    activeColor = "var(--loss-primary)";
    activeBorder = "var(--loss-primary)";
    activeBg = "var(--loss-bg)";
  } else if (tone === "warning") {
    activeColor = "var(--warning-primary)";
    activeBorder = "var(--warning-primary)";
    activeBg = "var(--warning-bg)";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-1.5 transition-colors"
      style={{
        background: active ? activeBg : "transparent",
        border: `1px solid ${
          active ? activeBorder : "var(--border-subtle)"
        }`,
        color: active ? activeColor : "var(--text-secondary)",
        fontFamily: "var(--font-inter)",
        fontSize: "12px",
        fontWeight: active ? 600 : 500,
      }}
    >
      {children}
    </button>
  );
}

function PromptField({
  prompt,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  prompt: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder: string;
}) {
  return (
    <label className="block space-y-2">
      <p
        style={{
          color: "var(--text-secondary)",
          fontFamily: "var(--font-inter)",
          fontSize: "13px",
          lineHeight: 1.5,
        }}
      >
        {prompt}
      </p>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-[var(--radius-md)] px-4 py-3 outline-none transition-colors"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-inter)",
          fontSize: "14px",
          lineHeight: 1.7,
        }}
      />
    </label>
  );
}

function ShortField({
  label,
  value,
  onChange,
  placeholder,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  mono?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <SectionLabel>{label}</SectionLabel>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[var(--radius-md)] px-3 py-2.5 outline-none transition-colors"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
          fontFamily: mono ? "var(--font-jb-mono)" : "var(--font-inter)",
          fontSize: "13px",
        }}
      />
    </label>
  );
}

function MetaDatum({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <SectionLabel>{label}</SectionLabel>
      <p
        style={{
          color: "var(--text-primary)",
          fontFamily: "var(--font-jb-mono)",
          fontSize: "13px",
          lineHeight: 1.4,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function RatingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: QualityRating | null;
  onChange: (value: QualityRating | null) => void;
}) {
  return (
    <div className="space-y-2">
      <SectionLabel>{label}</SectionLabel>
      <div className="flex items-center gap-1.5">
        {QUALITY_VALUES.map((step) => {
          const active = (value ?? 0) >= step;
          return (
            <button
              key={step}
              type="button"
              onClick={() => onChange(value === step ? null : step)}
              className="transition-colors"
              aria-label={`${label} rating ${step}`}
              style={{
                color: active
                  ? "var(--accent-primary)"
                  : "var(--border-default)",
              }}
            >
              <Star
                size={16}
                fill={active ? "currentColor" : "none"}
                strokeWidth={1.7}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConvictionInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="space-y-2">
      <SectionLabel>Conviction</SectionLabel>
      <div className="flex items-center gap-2">
        {QUALITY_VALUES.map((step) => {
          const active = (value ?? 0) >= step;
          return (
            <button
              key={step}
              type="button"
              onClick={() => onChange(value === step ? null : step)}
              className="transition-colors"
              aria-label={`Conviction ${step}`}
              style={{
                color: active
                  ? "var(--accent-primary)"
                  : "var(--border-default)",
              }}
            >
              <Circle
                size={16}
                fill={active ? "currentColor" : "none"}
                strokeWidth={1.8}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TagField({
  label,
  tags,
  onChange,
  tone,
  placeholder,
}: {
  label: string;
  tags: string[];
  onChange: (next: string[]) => void;
  tone: "neutral" | "loss";
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = useCallback(() => {
    const next = draft.trim();
    if (!next) {
      return;
    }
    if (tags.some((tag) => tag.toLowerCase() === next.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...tags, next]);
    setDraft("");
  }, [draft, onChange, tags]);

  return (
    <div className="space-y-2">
      <SectionLabel>{label}</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onChange(tags.filter((item) => item !== tag))}
            className="rounded-full px-3 py-1.5 transition-colors"
            style={{
              background:
                tone === "loss" ? "var(--loss-bg)" : "transparent",
              border: `1px solid ${
                tone === "loss"
                  ? "var(--loss-primary)"
                  : "var(--border-default)"
              }`,
              color:
                tone === "loss"
                  ? "var(--loss-primary)"
                  : "var(--text-secondary)",
              fontFamily: "var(--font-inter)",
              fontSize: "12px",
            }}
          >
            {tag}
          </button>
        ))}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
          className="min-w-[11rem] rounded-full px-3 py-1.5 outline-none"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-inter)",
            fontSize: "12px",
          }}
        />
      </div>
    </div>
  );
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
  onSaved: () => void;
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
      style={{ background: "var(--app-bg)" }}
    >
      <div
        className="sticky top-0 z-10"
        style={{
          background: "var(--app-bg)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "18px 28px 16px",
        }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-syne)",
                  fontSize: "24px",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  letterSpacing: "-0.04em",
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
              <button
                type="button"
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 disabled:cursor-not-allowed"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-subtle)",
                  color: hasPrevious
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
                  opacity: hasPrevious ? 1 : 0.45,
                }}
              >
                <ChevronLeft size={14} />
                <span
                  style={{
                    fontFamily: "var(--font-inter)",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  Previous
                </span>
              </button>

              {onNextPending ? (
                <button
                  type="button"
                  onClick={onNextPending}
                  className="rounded-full px-3 py-2"
                  style={{
                    background: "var(--accent-soft)",
                    border: "1px solid var(--accent-primary)",
                    color: "var(--accent-primary)",
                    fontFamily: "var(--font-inter)",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  Next unreviewed
                </button>
              ) : null}

              <button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 disabled:cursor-not-allowed"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-subtle)",
                  color: hasNext
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
                  opacity: hasNext ? 1 : 0.45,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-inter)",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  Next
                </span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[980px] px-5 pb-20 pt-8 sm:px-7 lg:px-10">
        <section
          className="space-y-5 border-b pb-8"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <SectionHeader
            title="Trade record"
            subtitle="The factual frame stays read-only. Use it to anchor the review before you start writing."
          />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
            <MetaDatum label="Opened" value={formatDateTime(viewModel.entryDate)} />
            <MetaDatum label="Closed" value={formatDateTime(viewModel.exitDate)} />
            <MetaDatum label="Duration" value={duration} />
            <MetaDatum
              label="Entry / Exit"
              value={`${formatNumber(viewModel.entryPrice)} / ${formatNumber(
                viewModel.exitPrice,
              )}`}
            />
            <MetaDatum
              label="Size / R"
              value={`${formatNumber(viewModel.positionSize)} / ${
                viewModel.rMultiple != null
                  ? `${viewModel.rMultiple.toFixed(2)}R`
                  : "--"
              }`}
            />
          </div>
        </section>

        <section
          className="space-y-5 border-b py-8"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <SectionHeader
            title="Narrative"
            subtitle="Write the trade in sequence: what you saw, what made the idea credible, where management changed, and what the chart looked like after you were gone."
          />
          <textarea
            value={draft.notes}
            onChange={(event) => setDraftField({ notes: event.target.value })}
            rows={12}
            placeholder="Tell the trade from first observation to final exit."
            className="w-full resize-none rounded-[var(--radius-lg)] px-5 py-4 outline-none transition-colors"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-inter)",
              fontSize: "15px",
              lineHeight: 1.85,
            }}
          />
        </section>

        <section
          className="space-y-6 border-b py-8"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <SectionHeader
            title="Thesis"
            subtitle="Capture the setup, why the trade was worth taking, what would have invalidated it, and where the upside was supposed to come from."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <ShortField
              label="Strategy"
              value={draft.journalReview.strategyName}
              onChange={(value) => setReviewField("strategyName", value)}
              placeholder="e.g. London sweep reversal"
            />
            <ShortField
              label="Setup"
              value={draft.journalReview.setupName}
              onChange={(value) => setReviewField("setupName", value)}
              placeholder="Name the precise setup"
            />
          </div>
          <PromptField
            prompt="Why did this trade exist at all?"
            value={draft.journalReview.reasonForTrade}
            onChange={(value) => setReviewField("reasonForTrade", value)}
            rows={5}
            placeholder="State the edge, structure, or order-flow reason without fluff."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <PromptField
              prompt="What would have invalidated the idea?"
              value={draft.journalReview.invalidation}
              onChange={(value) => setReviewField("invalidation", value)}
              rows={4}
              placeholder="What needed to stop being true for this trade to be wrong?"
            />
            <PromptField
              prompt="What was the intended target logic?"
              value={draft.journalReview.targetPlan}
              onChange={(value) => setReviewField("targetPlan", value)}
              rows={4}
              placeholder="Liquidity pool, higher-timeframe level, or asymmetric objective."
            />
          </div>
        </section>

        <section
          className="space-y-6 border-b py-8"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <SectionHeader
            title="Timeframe alignment"
            subtitle="Record the higher-timeframe read, the execution frame, the trigger frame, and whether the trade was aligned or forced."
          />
          <div className="flex flex-wrap gap-2">
            {ALIGNMENT_OPTIONS.map((option) => (
              <ChoiceButton
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
              </ChoiceButton>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <ShortField
              label="Higher timeframe bias"
              value={draft.journalReview.higherTimeframeBias}
              onChange={(value) => setReviewField("higherTimeframeBias", value)}
              placeholder="Bullish, bearish, neutral"
            />
            <ShortField
              label="Execution timeframe"
              value={draft.journalReview.executionTimeframe}
              onChange={(value) => setReviewField("executionTimeframe", value)}
              placeholder="e.g. 15m"
              mono
            />
            <ShortField
              label="Trigger timeframe"
              value={draft.journalReview.triggerTimeframe}
              onChange={(value) => setReviewField("triggerTimeframe", value)}
              placeholder="e.g. 1m"
              mono
            />
          </div>
          <PromptField
            prompt="How did the timeframes agree or fight each other?"
            value={draft.journalReview.higherTimeframeNotes}
            onChange={(value) => setReviewField("higherTimeframeNotes", value)}
            rows={4}
            placeholder="Be explicit about alignment, conflict, or the one frame you ignored."
          />
        </section>

        <section
          className="space-y-6 border-b py-8"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <SectionHeader
            title="Market context"
            subtitle="Add the session, the market condition, and the contextual detail that made the trade easier or more dangerous."
          />
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {SESSION_OPTIONS.map((option) => (
                <ChoiceButton
                  key={option}
                  active={draft.session === option}
                  onClick={() =>
                    setDraftField({
                      session: draft.session === option ? null : option,
                    })
                  }
                >
                  {option}
                </ChoiceButton>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {MARKET_CONDITIONS.map((option) => (
                <ChoiceButton
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
                </ChoiceButton>
              ))}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <PromptField
              prompt="What did price make obvious before the entry?"
              value={draft.observations}
              onChange={(value) => setDraftField({ observations: value })}
              rows={5}
              placeholder="Structure, liquidity, volatility, correlations, or timing tells."
            />
            <PromptField
              prompt="What context around the trade mattered most?"
              value={draft.journalReview.marketContext}
              onChange={(value) => setReviewField("marketContext", value)}
              rows={5}
              placeholder="Macro driver, session behavior, news, or environmental context."
            />
          </div>
        </section>

        <section
          className="space-y-6 border-b py-8"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <SectionHeader
            title="Execution review"
            subtitle="Break the trade into the trigger, the handling, and the exit. This section should explain the decisions, not just the outcome."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <PromptField
              prompt="Why did you enter at that exact moment?"
              value={draft.journalReview.entryReason}
              onChange={(value) => setReviewField("entryReason", value)}
              rows={5}
              placeholder="What confirmed the trigger? What made it timely?"
            />
            <PromptField
              prompt="What happened during management?"
              value={draft.journalReview.managementReview}
              onChange={(value) => setReviewField("managementReview", value)}
              rows={5}
              placeholder="Partials, stop movement, patience, discipline, hesitation."
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <PromptField
              prompt="What is the plain execution story?"
              value={draft.executionNotes}
              onChange={(value) => setDraftField({ executionNotes: value })}
              rows={5}
              placeholder="Describe the trade management as if another trader had to learn from it."
            />
            <PromptField
              prompt="Why did the exit happen where it did?"
              value={draft.journalReview.exitReason}
              onChange={(value) => setReviewField("exitReason", value)}
              rows={5}
              placeholder="Intentional target, fear, structure break, or loss of edge."
            />
          </div>
        </section>

        <section
          className="space-y-6 border-b py-8"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <SectionHeader
            title="Psychology"
            subtitle="Write the internal state before, during, and after the trade. This is where hesitation, urgency, FOMO, stubbornness, and clarity belong."
          />
          <div className="grid gap-4 lg:grid-cols-3">
            <PromptField
              prompt="Before the trade"
              value={draft.journalReview.psychologyBefore}
              onChange={(value) => setReviewField("psychologyBefore", value)}
              rows={5}
              placeholder="Confidence, caution, impatience, bias, or clarity before entry."
            />
            <PromptField
              prompt="During the trade"
              value={draft.journalReview.psychologyDuring}
              onChange={(value) => setReviewField("psychologyDuring", value)}
              rows={5}
              placeholder="How did your emotional state evolve while the trade was open?"
            />
            <PromptField
              prompt="After the trade"
              value={draft.journalReview.psychologyAfter}
              onChange={(value) => setReviewField("psychologyAfter", value)}
              rows={5}
              placeholder="What did the result make you want to do next?"
            />
          </div>
          <PromptField
            prompt="How would you summarize the emotional weather of this trade?"
            value={draft.feelings}
            onChange={(value) => setDraftField({ feelings: value })}
            rows={4}
            placeholder="Name the dominant feeling plainly: calm, rushed, defensive, stubborn, detached, clear."
          />
        </section>

        <section
          className="space-y-6 border-b py-8"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <SectionHeader
            title="Review controls"
            subtitle="Keep the annotations tight: rate the craft, mark the tags, set conviction, and record whether this is a trade worth repeating."
          />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)]">
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <RatingInput
                  label="Entry"
                  value={draft.entryRating}
                  onChange={(value) => setDraftField({ entryRating: value })}
                />
                <RatingInput
                  label="Exit"
                  value={draft.exitRating}
                  onChange={(value) => setDraftField({ exitRating: value })}
                />
                <RatingInput
                  label="Management"
                  value={draft.managementRating}
                  onChange={(value) =>
                    setDraftField({ managementRating: value })
                  }
                />
              </div>
              <ConvictionInput
                value={draft.conviction}
                onChange={(value) => setDraftField({ conviction: value })}
              />
              <div className="space-y-2">
                <SectionLabel>Would you take this trade again?</SectionLabel>
                <div className="flex flex-wrap items-center gap-2">
                  {RETAKE_OPTIONS.map((option) => (
                    <ChoiceButton
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
                    </ChoiceButton>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <TagField
                label="Setup tags"
                tags={draft.setupTags}
                onChange={(next) => setDraftField({ setupTags: next })}
                tone="neutral"
                placeholder="Add setup tag"
              />
              <TagField
                label="Mistake tags"
                tags={draft.mistakeTags}
                onChange={(next) => setDraftField({ mistakeTags: next })}
                tone="loss"
                placeholder="Add mistake tag"
              />
            </div>
          </div>
        </section>

        <section
          className="space-y-6 border-b py-8"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <SectionHeader
            title="Excursion"
            subtitle="Record how far price went against you and for you. The pair matters because it tells you whether the problem was structure, timing, or management."
          />
          <div
            className="rounded-[var(--radius-lg)] px-5 py-4"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
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
              <ShortField
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
              <ShortField
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
        </section>

        <section className="space-y-6 py-8">
          <SectionHeader
            title="Distillation"
            subtitle="Finish with the one sentence worth remembering and the next action that should change future behavior."
          />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <PromptField
              prompt="What is the lesson?"
              value={draft.lessonLearned}
              onChange={(value) => setDraftField({ lessonLearned: value })}
              rows={4}
              placeholder="Reduce the entire trade to one repeatable sentence."
            />
            <PromptField
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
                    fontFamily: "var(--font-syne)",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.16em",
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
            <button
              type="button"
              onClick={() => void save()}
              className="rounded-full px-4 py-2"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-inter)",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              Save review
            </button>
          </div>
        </section>
      </div>
    </motion.article>
  );
}
