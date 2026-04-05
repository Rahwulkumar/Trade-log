"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppPanel } from "@/components/ui/page-primitives";
import { InsetPanel } from "@/components/ui/surface-primitives";

import {
  type JournalTabItem,
  JournalTabRail,
} from "@/components/journal/journal-primitives";

export function JournalSupportBlock({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <InsetPanel
      className="space-y-3.5"
      paddingClassName="px-3.5 py-3.5 sm:px-4 sm:py-4"
    >
      <div className="space-y-1">
        <p className="text-label">{title}</p>
        {description ? (
          <p className="text-sm text-[var(--text-secondary)]">{description}</p>
        ) : null}
      </div>
      {children}
    </InsetPanel>
  );
}

export function JournalDocumentHeader({
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
  tradeQueueButtonClassName,
  chapterTabs,
  activeTab,
  onChangeTab,
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
  tradeQueueButtonClassName?: string;
  chapterTabs: JournalTabItem[];
  activeTab: string;
  onChangeTab: (id: string) => void;
}) {
  const activeTabLabel =
    chapterTabs.find((item) => item.id === activeTab)?.label ?? "Chapter";

  return (
    <div
      className="sticky top-0 z-10 border-b px-3 py-2 sm:px-4 lg:px-5"
      style={{
        background: "color-mix(in srgb, var(--surface) 96%, transparent)",
        borderBottomColor: "var(--border-subtle)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex flex-wrap items-center gap-2">
            <h1
              className="truncate"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                fontSize: "15px",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
              }}
            >
              {symbol}
            </h1>
            <span
              className="rounded-full px-2 py-0.5"
              style={{
                background:
                  direction === "LONG" ? "var(--profit-bg)" : "var(--loss-bg)",
                color:
                  direction === "LONG"
                    ? "var(--profit-primary)"
                    : "var(--loss-primary)",
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
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              {pnlText}
            </span>
            <span
              className="hidden text-[11px] sm:inline"
              style={{ color: "var(--text-tertiary)" }}
            >
              {activeTabLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {onOpenTradeQueue ? (
              <Button
                type="button"
                onClick={onOpenTradeQueue}
                size="sm"
                variant="outline"
                className={`h-8 rounded-full px-2.5 text-[0.72rem] ${tradeQueueButtonClassName ?? ""}`}
                style={{
                  background: "var(--surface-elevated)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              >
                <PanelLeftOpen size={13} />
                {tradeQueueLabel ?? "Trades"}
              </Button>
            ) : null}
            {saveStatusText ? (
              <span
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
              </span>
            ) : null}
            <span
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                fontSize: "11px",
              }}
            >
              {index + 1}/{total}
            </span>
            <Button
              type="button"
              onClick={onPrevious}
              disabled={!hasPrevious}
              size="sm"
              variant="outline"
              className="h-8 px-2"
              style={{
                background: "var(--surface-elevated)",
                borderColor: "var(--border-subtle)",
                color: hasPrevious ? "var(--text-primary)" : "var(--text-tertiary)",
                opacity: hasPrevious ? 1 : 0.45,
              }}
            >
              <ChevronLeft size={13} />
            </Button>

            {onNextPending ? (
              <Button
                type="button"
                onClick={onNextPending}
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-[0.7rem]"
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
              className="h-8 px-2"
              style={{
                background: "var(--surface-elevated)",
                borderColor: "var(--border-subtle)",
                color: hasNext ? "var(--text-primary)" : "var(--text-tertiary)",
                opacity: hasNext ? 1 : 0.45,
              }}
            >
              <ChevronRight size={13} />
            </Button>
          </div>
        </div>

        <JournalTabRail
          items={chapterTabs}
          activeTab={activeTab}
          onChange={onChangeTab}
          ariaLabel="Journal chapters"
        />
      </div>
    </div>
  );
}

export function JournalDocumentCanvas({
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
  return (
    <AppPanel className="w-full p-3 sm:p-4 lg:p-4">
      <div
        className="flex flex-col gap-2 border-b pb-2.5"
        style={{ borderBottomColor: "var(--border-subtle)" }}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label">Chapter {chapterOrderLabel}</span>
            <h2
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-inter)",
                fontSize: "1rem",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
              }}
            >
              {chapterLabel}
            </h2>
            <span
              className="rounded-full px-2 py-0.5"
              style={{
                background: "var(--surface-elevated)",
                color:
                  chapterState === "complete"
                    ? "var(--profit-primary)"
                    : chapterState === "progress"
                      ? "var(--warning-primary)"
                      : "var(--text-tertiary)",
                fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                fontSize: "10px",
                fontWeight: 700,
              }}
            >
              {chapterProgressLabel}
            </span>
          </div>
        </div>
        <p
          className="max-w-3xl text-[12px]"
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-inter)",
            lineHeight: 1.5,
          }}
        >
          {chapterCueText}
        </p>
      </div>

      {children}
    </AppPanel>
  );
}

export function JournalInlineSupport({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className="mt-4 space-y-4 border-t pt-4"
      style={{ borderTopColor: "var(--border-subtle)" }}
    >
      {children}
    </div>
  );
}

export function JournalDocumentActions({
  onPreviousChapter,
  onSave,
  onNextChapter,
  hasPreviousChapter,
  hasNextChapter,
}: {
  onPreviousChapter: () => void;
  onSave: () => void;
  onNextChapter: () => void;
  hasPreviousChapter: boolean;
  hasNextChapter: boolean;
}) {
  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-2">
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
