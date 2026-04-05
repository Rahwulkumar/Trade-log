"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Check, X, Clock3, FileEdit, BookCheck } from "lucide-react";
import {
  ChoiceChip,
  ControlSurface,
  FieldGroup,
} from "@/components/ui/control-primitives";
import { Input } from "@/components/ui/input";
import { WidgetEmptyState } from "@/components/ui/surface-primitives";

export type TradeReviewStatus = "empty" | "draft" | "complete";

export interface TradeReviewRailItem {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  netPnl: number;
  outcome: "WIN" | "LOSS" | "BE";
  closedAt: string | Date | null;
  reviewStatus: TradeReviewStatus;
}

interface TradeReviewRailProps {
  items: TradeReviewRailItem[];
  activeTradeId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: "all" | "pending" | "draft" | "complete";
  onStatusFilterChange: (
    value: "all" | "pending" | "draft" | "complete",
  ) => void;
  onSelectTrade: (tradeId: string) => void;
}

const STAGGER = {
  visible: {
    transition: {
      staggerChildren: 0.025,
    },
  },
};

const ROW = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0 },
};

function formatDate(value: string | Date | null): string {
  if (!value) {
    return "--";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatPnl(value: number): string {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;
}

function groupLabel(value: string | Date | null): string {
  if (!value) {
    return "Undated";
  }
  const date = new Date(value);
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const thisWeekStart = new Date(now);
  const day = thisWeekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  thisWeekStart.setHours(0, 0, 0, 0);
  thisWeekStart.setDate(thisWeekStart.getDate() + diff);
  if (date >= todayStart) {
    return "Today";
  }
  if (date >= yesterdayStart) {
    return "Yesterday";
  }
  if (date >= thisWeekStart) {
    return "This Week";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusLabel(status: TradeReviewStatus): string {
  if (status === "complete") return "Done";
  if (status === "draft") return "Draft";
  return "Open";
}

function statusDescription(status: TradeReviewStatus): string {
  if (status === "complete") return "Reviewed and closed";
  if (status === "draft") return "Continue the review";
  return "Needs a full write-up";
}

function statusTone(status: TradeReviewStatus) {
  if (status === "complete") {
    return {
      color: "var(--accent-primary)",
      background: "var(--accent-soft)",
      borderColor: "var(--accent-primary)",
      icon: BookCheck,
    };
  }

  if (status === "draft") {
    return {
      color: "var(--warning-primary)",
      background: "var(--warning-bg)",
      borderColor: "var(--warning-primary)",
      icon: FileEdit,
    };
  }

  return {
    color: "var(--text-tertiary)",
    background: "var(--surface)",
    borderColor: "var(--border-subtle)",
    icon: Clock3,
  };
}

function outcomeTone(outcome: TradeReviewRailItem["outcome"]) {
  if (outcome === "WIN") {
    return "var(--profit-primary)";
  }
  if (outcome === "LOSS") {
    return "var(--loss-primary)";
  }
  return "var(--warning-primary)";
}

export function TradeReviewRail({
  items,
  activeTradeId,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onSelectTrade,
}: TradeReviewRailProps) {
  const totalCount = items.length;
  const grouped = useMemo(() => {
    const groups = new Map<string, TradeReviewRailItem[]>();
    items.forEach((item) => {
      const label = groupLabel(item.closedAt);
      groups.set(label, [...(groups.get(label) ?? []), item]);
    });
    return [...groups.entries()];
  }, [items]);

  const pendingCount = items.filter(
    (item) => item.reviewStatus !== "complete",
  ).length;
  const draftCount = items.filter(
    (item) => item.reviewStatus === "draft",
  ).length;
  const completeCount = items.filter(
    (item) => item.reviewStatus === "complete",
  ).length;
  const statusOptions = [
    {
      value: "all",
      label: "All",
      count: totalCount,
    },
    {
      value: "pending",
      label: "Needs review",
      count: pendingCount,
    },
    {
      value: "draft",
      label: "Drafts",
      count: draftCount,
    },
    {
      value: "complete",
      label: "Done",
      count: completeCount,
    },
  ] as const;

  return (
    <aside className="flex h-full w-full shrink-0 flex-col overflow-hidden">
      <div
        className="sticky top-0 z-10"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="px-4 pb-3 pt-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <p className="headline-md">Browse trades</p>
              <span
                className="rounded-full px-2.5 py-1"
                style={{
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                  fontSize: "10px",
                  fontWeight: 700,
                }}
              >
                {totalCount} total
              </span>
            </div>
            <span
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-inter)",
                fontSize: "11px",
              }}
            >
              {pendingCount} pending • {draftCount} drafts • {completeCount} done
            </span>
          </div>
        </div>

        <div className="space-y-3 px-3 pb-3">
          <ControlSurface className="space-y-3">
            <FieldGroup
              label="Find a trade"
              meta={
                search.trim() ? (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold transition-colors"
                    style={{
                      color: "var(--text-tertiary)",
                      background: "var(--surface)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <X size={10} />
                    Clear
                  </button>
                ) : null
              }
              className="space-y-2"
            >
              <div className="relative">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-tertiary)" }}
                />
                <Input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Search symbol, setup, date..."
                  className="h-9 pl-9 pr-9 text-[0.75rem]"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
                {search.trim() ? (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors"
                    style={{ color: "var(--text-tertiary)" }}
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                ) : null}
              </div>
            </FieldGroup>

            <FieldGroup
              label="Queue focus"
              meta={
                <span
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                    fontSize: "10px",
                    fontWeight: 600,
                  }}
                >
                  {items.length} showing
                </span>
              }
              className="space-y-2"
            >
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <ChoiceChip
                    key={option.value}
                    active={statusFilter === option.value}
                    onClick={() => onStatusFilterChange(option.value)}
                    className="justify-start rounded-full px-3"
                  >
                    <span>{option.label}</span>
                    <span
                      className="rounded-full px-1.5 py-0.5"
                      style={{
                        background:
                          statusFilter === option.value
                            ? "color-mix(in srgb, var(--accent-primary) 14%, transparent)"
                            : "var(--surface-elevated)",
                        fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                        fontSize: "10px",
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      {option.count}
                    </span>
                  </ChoiceChip>
                ))}
              </div>
            </FieldGroup>
          </ControlSurface>
        </div>
      </div>

      <motion.div
        className="min-h-0 flex-1 overflow-y-auto pb-5"
        initial="hidden"
        animate="visible"
        variants={STAGGER}
      >
        {grouped.length === 0 ? (
          <div className="px-4 pt-8">
            <WidgetEmptyState
              title="No trades match this view"
              description="Change the search or review-status filters to keep journaling."
            />
          </div>
        ) : (
          grouped.map(([label, groupItems]) => (
            <div key={label} className="px-3 pt-4">
              <p
                className="mb-2 text-label"
                style={{
                  color: "var(--text-tertiary)",
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                }}
              >
                {label}
              </p>

              {groupItems.map((item) => {
                const isActive = item.id === activeTradeId;
                const directionColor =
                  item.direction === "LONG"
                    ? "var(--profit-primary)"
                    : "var(--loss-primary)";
                const pnlColor =
                  item.netPnl >= 0
                    ? "var(--profit-primary)"
                    : "var(--loss-primary)";
                const statusMeta = statusTone(item.reviewStatus);
                const StatusIcon = statusMeta.icon;

                return (
                  <motion.button
                    key={item.id}
                    variants={ROW}
                    type="button"
                    onClick={() => onSelectTrade(item.id)}
                    className="mb-2 block w-full rounded-[18px] border px-3 py-3 text-left transition-colors last:mb-0"
                    style={{
                      background: isActive
                        ? "color-mix(in srgb, var(--accent-soft) 56%, var(--surface))"
                        : "var(--surface-elevated)",
                      borderColor: isActive
                        ? "var(--accent-primary)"
                        : "var(--border-subtle)",
                      boxShadow: "none",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            style={{
                              color: isActive
                                ? "var(--accent-primary)"
                                : "var(--text-primary)",
                              fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                              fontSize: "13px",
                              fontWeight: 700,
                            }}
                          >
                            {item.symbol}
                          </span>
                          <span
                            style={{
                              color: directionColor,
                              fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                              fontSize: "10px",
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                            }}
                          >
                            {item.direction === "LONG" ? "Long" : "Short"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                          <span className="inline-flex items-center gap-1">
                            <StatusIcon size={11} style={{ color: statusMeta.color }} />
                            {statusLabel(item.reviewStatus)}
                          </span>
                          <span>•</span>
                          <span>{formatDate(item.closedAt)}</span>
                          <span>•</span>
                          <span
                            style={{
                              color: outcomeTone(item.outcome),
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                            }}
                          >
                            {item.outcome}
                          </span>
                          {isActive ? (
                            <>
                              <span>•</span>
                              <span
                                style={{
                                  color: "var(--accent-primary)",
                                  fontWeight: 700,
                                }}
                              >
                                Open now
                              </span>
                            </>
                          ) : null}
                        </div>

                        <p
                          style={{
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-inter)",
                            fontSize: "11px",
                            lineHeight: 1.45,
                          }}
                        >
                          {statusDescription(item.reviewStatus)}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p
                          style={{
                            color: pnlColor,
                            fontFamily: "var(--font-jb-mono)",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          {formatPnl(item.netPnl)}
                        </p>
                        {item.reviewStatus === "complete" ? (
                          <Check
                            size={12}
                            style={{ color: "var(--accent-primary)", marginLeft: "auto", marginTop: "6px" }}
                          />
                        ) : null}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ))
        )}
      </motion.div>
    </aside>
  );
}
