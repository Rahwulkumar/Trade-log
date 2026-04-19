"use client";

import { type ReactNode, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PanelLeftOpen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { InsetPanel } from "@/components/ui/surface-primitives";
import {
  JournalOutlineRail,
  type JournalChapterItem,
} from "@/components/journal/journal-primitives";

function directionStyles(direction: "LONG" | "SHORT") {
  if (direction === "LONG") {
    return {
      background: "var(--profit-bg)",
      color: "var(--profit-primary)",
    };
  }

  return {
    background: "var(--loss-bg)",
    color: "var(--loss-primary)",
  };
}

export function JournalTradeHeader({
  symbol,
  direction,
  pnlText,
  pnlColor,
  saveStatusText,
  saving,
  isDirty,
  index,
  total,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onNextPending,
  onOpenTradeQueue,
  tradeQueueLabel,
}: {
  symbol: string;
  direction: "LONG" | "SHORT";
  pnlText: string;
  pnlColor: string;
  saveStatusText?: string | null;
  saving: boolean;
  isDirty: boolean;
  index: number;
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onNextPending?: () => void;
  onOpenTradeQueue?: () => void;
  tradeQueueLabel?: string;
}) {
  const directionTone = directionStyles(direction);

  return (
    <InsetPanel
      className="space-y-3 xl:hidden"
      paddingClassName="px-3.5 py-3.5 sm:px-4 sm:py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className="truncate"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                fontSize: "1.05rem",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}
            >
              {symbol}
            </h1>
            <span
              className="rounded-full px-2 py-0.5"
              style={{
                background: directionTone.background,
                color: directionTone.color,
                fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {direction}
            </span>
            <span
              style={{
                color: pnlColor,
                fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                fontSize: "0.92rem",
                fontWeight: 700,
              }}
            >
              {pnlText}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span style={{ color: "var(--text-tertiary)" }}>
              Trade {index + 1} of {total}
            </span>
            {saveStatusText ? (
              <span
                className="font-semibold"
                style={{
                  color: saving
                    ? "var(--accent-primary)"
                    : isDirty
                      ? "var(--warning-primary)"
                      : "var(--text-tertiary)",
                }}
              >
                {saveStatusText}
              </span>
            ) : null}
          </div>
        </div>

        {onOpenTradeQueue ? (
          <Button
            type="button"
            onClick={onOpenTradeQueue}
            size="sm"
            variant="outline"
            className="h-8 rounded-full px-2.5 text-[0.72rem]"
            style={{
              background: "var(--surface-elevated)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          >
            <PanelLeftOpen size={13} />
            {tradeQueueLabel ?? "Browse ideas"}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={onPrevious}
          disabled={!hasPrevious}
          size="sm"
          variant="outline"
          className="h-8 px-2.5"
          style={{
            background: "var(--surface-elevated)",
            borderColor: "var(--border-subtle)",
            color: hasPrevious ? "var(--text-primary)" : "var(--text-tertiary)",
            opacity: hasPrevious ? 1 : 0.45,
          }}
        >
          <ChevronLeft size={13} />
          Previous trade
        </Button>

        {onNextPending ? (
          <Button
            type="button"
            onClick={onNextPending}
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-[0.72rem]"
            style={{
              background: "var(--surface-elevated)",
              borderColor: "var(--accent-primary)",
              color: "var(--accent-primary)",
            }}
          >
            Next open
          </Button>
        ) : null}

        <Button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          size="sm"
          variant="outline"
          className="h-8 px-2.5"
          style={{
            background: "var(--surface-elevated)",
            borderColor: "var(--border-subtle)",
            color: hasNext ? "var(--text-primary)" : "var(--text-tertiary)",
            opacity: hasNext ? 1 : 0.45,
          }}
        >
          Next trade
          <ChevronRight size={13} />
        </Button>
      </div>
    </InsetPanel>
  );
}

export function JournalReviewSidebar({
  symbol,
  direction,
  pnlText,
  pnlColor,
  saveStatusText,
  saving,
  isDirty,
  index,
  total,
  hasPreviousTrade,
  hasNextTrade,
  hasPreviousChapter,
  hasNextChapter,
  onPreviousTrade,
  onNextTrade,
  onNextPending,
  onOpenTradeQueue,
  tradeQueueLabel,
  chapterItems,
  activeChapter,
  onChangeChapter,
  onPreviousChapter,
  onNextChapter,
  onSave,
  saveDisabled = false,
  saveLabel = "Save review",
}: {
  symbol: string;
  direction: "LONG" | "SHORT";
  pnlText: string;
  pnlColor: string;
  saveStatusText?: string | null;
  saving: boolean;
  isDirty: boolean;
  index: number;
  total: number;
  hasPreviousTrade: boolean;
  hasNextTrade: boolean;
  hasPreviousChapter: boolean;
  hasNextChapter: boolean;
  onPreviousTrade: () => void;
  onNextTrade: () => void;
  onNextPending?: () => void;
  onOpenTradeQueue?: () => void;
  tradeQueueLabel?: string;
  chapterItems: JournalChapterItem[];
  activeChapter: string;
  onChangeChapter: (id: string) => void;
  onPreviousChapter: () => void;
  onNextChapter: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  saveLabel?: string;
}) {
  const directionTone = directionStyles(direction);

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-3">
        <InsetPanel
          className="space-y-4"
          paddingClassName="px-3 py-3"
        >
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                style={{
                  color: "var(--text-primary)",
                  fontFamily:
                    "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                  fontSize: "1rem",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                }}
              >
                {symbol}
              </h1>
              <span
                className="rounded-full px-2 py-0.5"
                style={{
                  background: directionTone.background,
                  color: directionTone.color,
                  fontFamily:
                    "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                {direction}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-semibold" style={{ color: pnlColor }}>
                {pnlText}
              </span>
              <span style={{ color: "var(--text-tertiary)" }}>
                {index + 1}/{total}
              </span>
            </div>

            {saveStatusText ? (
              <p
                className="text-[11px] font-semibold"
                style={{
                  color: saving
                    ? "var(--accent-primary)"
                    : isDirty
                      ? "var(--warning-primary)"
                      : "var(--text-tertiary)",
                }}
              >
                {saveStatusText}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            {onOpenTradeQueue ? (
              <Button
                type="button"
                onClick={onOpenTradeQueue}
                size="sm"
                variant="outline"
                className="h-8 w-full justify-start rounded-full px-3 text-[0.72rem]"
                style={{
                  background: "var(--surface-elevated)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              >
                <PanelLeftOpen size={13} />
                {tradeQueueLabel ?? "Browse ideas"}
              </Button>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={onPreviousTrade}
                disabled={!hasPreviousTrade}
                size="sm"
                variant="outline"
                className="h-8 rounded-full px-2.5"
                style={{
                  background: "var(--surface-elevated)",
                  borderColor: "var(--border-subtle)",
                  color: hasPreviousTrade
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
                  opacity: hasPreviousTrade ? 1 : 0.45,
                }}
              >
                <ChevronLeft size={13} />
                Prev
              </Button>

              <Button
                type="button"
                onClick={onNextTrade}
                disabled={!hasNextTrade}
                size="sm"
                variant="outline"
                className="h-8 rounded-full px-2.5"
                style={{
                  background: "var(--surface-elevated)",
                  borderColor: "var(--border-subtle)",
                  color: hasNextTrade
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
                  opacity: hasNextTrade ? 1 : 0.45,
                }}
              >
                Next
                <ChevronRight size={13} />
              </Button>
            </div>

            {onNextPending ? (
              <Button
                type="button"
                onClick={onNextPending}
                size="sm"
                variant="outline"
                className="h-8 w-full rounded-full px-2.5 text-[0.72rem]"
                style={{
                  background: "var(--surface-elevated)",
                  borderColor: "var(--accent-primary)",
                  color: "var(--accent-primary)",
                }}
              >
                Next open
              </Button>
            ) : null}
          </div>

          <div
            className="space-y-3 border-t pt-3"
            style={{ borderTopColor: "var(--border-subtle)" }}
          >
            <JournalOutlineRail
              items={chapterItems}
              activeChapter={activeChapter}
              onChange={onChangeChapter}
            />

            <div className="grid gap-2">
              <Button
                type="button"
                onClick={onPreviousChapter}
                disabled={!hasPreviousChapter}
                size="sm"
                variant="outline"
                className="h-8 justify-between rounded-full px-3"
                style={{
                  background: "var(--surface-elevated)",
                  borderColor: "var(--border-subtle)",
                  color: hasPreviousChapter
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
                  opacity: hasPreviousChapter ? 1 : 0.45,
                }}
              >
                Previous chapter
                <ChevronLeft size={13} />
              </Button>

              <Button
                type="button"
                onClick={onSave}
                disabled={saveDisabled}
                size="sm"
                variant="outline"
                className="h-8 justify-center rounded-full px-3"
                style={{
                  background: "var(--surface)",
                  borderColor: saveDisabled
                    ? "var(--border-subtle)"
                    : "var(--text-primary)",
                  color: saveDisabled
                    ? "var(--text-tertiary)"
                    : "var(--text-primary)",
                  opacity: saveDisabled ? 0.6 : 1,
                }}
              >
                {saveLabel}
              </Button>

              <Button
                type="button"
                onClick={onNextChapter}
                disabled={!hasNextChapter}
                size="sm"
                variant="outline"
                className="h-8 justify-between rounded-full px-3"
                style={{
                  background: "var(--surface-elevated)",
                  borderColor: hasNextChapter
                    ? "var(--accent-primary)"
                    : "var(--border-subtle)",
                  color: hasNextChapter
                    ? "var(--accent-primary)"
                    : "var(--text-tertiary)",
                  opacity: hasNextChapter ? 1 : 0.45,
                }}
              >
                Next chapter
                <ChevronRight size={13} />
              </Button>
            </div>
          </div>
        </InsetPanel>
      </div>
    </aside>
  );
}

export function JournalEditorFrame({
  chapterOrderLabel,
  chapterProgressLabel,
  chapterState,
  chapterLabel,
  chapterCueText,
  children,
}: {
  chapterOrderLabel: string;
  chapterProgressLabel: string;
  chapterState: "empty" | "progress" | "complete";
  chapterLabel: string;
  chapterCueText: string;
  children: ReactNode;
}) {
  const chapterColor =
    chapterState === "complete"
      ? "var(--profit-primary)"
      : chapterState === "progress"
        ? "var(--warning-primary)"
        : "var(--text-tertiary)";

  return (
    <section
      className="w-full rounded-[24px] border px-3.5 py-3.5 sm:px-4 sm:py-4 lg:px-4"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div
        className="flex flex-col gap-2.5 border-b pb-3"
        style={{ borderBottomColor: "var(--border-subtle)" }}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label">{chapterOrderLabel}</span>
            <span
              className="rounded-full px-2 py-0.5"
              style={{
                background: "var(--surface-elevated)",
                color: chapterColor,
                fontFamily:
                  "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                fontSize: "10px",
                fontWeight: 700,
              }}
            >
              {chapterProgressLabel}
            </span>
          </div>

          <h2
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
              fontSize: "1rem",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            {chapterLabel}
          </h2>
          <p
            className="max-w-[34rem] text-xs"
            style={{
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            {chapterCueText}
          </p>
        </div>
      </div>

      <div className="pt-4">{children}</div>
    </section>
  );
}

export function JournalReferenceDisclosure({
  activeKey,
  children,
}: {
  activeKey: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [activeKey]);

  return (
    <InsetPanel paddingClassName="px-3.5 py-3 sm:px-4 sm:py-3.5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="space-y-1">
          <p className="text-label">Reference tools</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Open automation, screenshots, rule checks, and supporting context
            only when needed.
          </p>
        </div>
        <ChevronDown
          size={14}
          style={{
            color: "var(--text-tertiary)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 180ms ease",
          }}
        />
      </button>

      {open ? (
        <div
          className="mt-3.5 border-t pt-3.5"
          style={{ borderTopColor: "var(--border-subtle)" }}
        >
          {children}
        </div>
      ) : null}
    </InsetPanel>
  );
}

export function JournalFooterActions({
  onPreviousChapter,
  onSave,
  onNextChapter,
  hasPreviousChapter,
  hasNextChapter,
  saveDisabled = false,
  saveLabel = "Save review",
}: {
  onPreviousChapter: () => void;
  onSave: () => void;
  onNextChapter: () => void;
  hasPreviousChapter: boolean;
  hasNextChapter: boolean;
  saveDisabled?: boolean;
  saveLabel?: string;
}) {
  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-2 xl:hidden">
      <Button
        type="button"
        onClick={onPreviousChapter}
        disabled={!hasPreviousChapter}
        size="sm"
        variant="outline"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border-subtle)",
          color: hasPreviousChapter ? "var(--text-primary)" : "var(--text-tertiary)",
          opacity: hasPreviousChapter ? 1 : 0.45,
        }}
      >
        <ChevronLeft size={14} />
        Previous chapter
      </Button>

      <Button
        type="button"
        onClick={onSave}
        disabled={saveDisabled}
        size="sm"
        variant="outline"
        style={{
          background: "var(--surface)",
          borderColor: saveDisabled
            ? "var(--border-subtle)"
            : "var(--text-primary)",
          color: saveDisabled
            ? "var(--text-tertiary)"
            : "var(--text-primary)",
          opacity: saveDisabled ? 0.6 : 1,
        }}
      >
        {saveLabel}
      </Button>

      <Button
        type="button"
        onClick={onNextChapter}
        disabled={!hasNextChapter}
        size="sm"
        variant="outline"
        style={{
          background: "var(--surface)",
          borderColor: hasNextChapter ? "var(--accent-primary)" : "var(--border-subtle)",
          color: hasNextChapter ? "var(--accent-primary)" : "var(--text-tertiary)",
          opacity: hasNextChapter ? 1 : 0.45,
        }}
      >
        Next chapter
        <ChevronRight size={14} />
      </Button>
    </div>
  );
}
