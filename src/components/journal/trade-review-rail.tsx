"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Check } from "lucide-react";
import {
  ChoiceChip,
  ControlSurface,
  FieldGroup,
} from "@/components/ui/control-primitives";
import { Input } from "@/components/ui/input";
import {
  InsetPanel,
  WidgetEmptyState,
} from "@/components/ui/surface-primitives";

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
  const thisWeekStart = new Date(now);
  const day = thisWeekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  thisWeekStart.setHours(0, 0, 0, 0);
  thisWeekStart.setDate(thisWeekStart.getDate() + diff);
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

export function TradeReviewRail({
  items,
  activeTradeId,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onSelectTrade,
}: TradeReviewRailProps) {
  const grouped = useMemo(() => {
    const groups = new Map<string, TradeReviewRailItem[]>();
    items.forEach((item) => {
      const label = groupLabel(item.closedAt);
      groups.set(label, [...(groups.get(label) ?? []), item]);
    });
    return [...groups.entries()];
  }, [items]);

  const pendingCount = items.filter((item) => item.reviewStatus !== "complete").length;

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
            <p className="headline-md">Trade queue</p>
            <p
              className="text-label"
              style={{
                textTransform: "none",
                letterSpacing: 0,
                color: "var(--text-tertiary)",
              }}
            >
              {pendingCount} still need review
            </p>
          </div>
        </div>

        <div className="px-3 pb-3">
          <ControlSurface className="space-y-3">
            <FieldGroup label="Search trades" className="space-y-2">
              <div className="relative">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-tertiary)" }}
                />
                <Input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Search symbol, date..."
                  className="h-9 pl-9 text-[0.75rem]"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </FieldGroup>

            <FieldGroup label="Review status" className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["all", "All"],
                  ["pending", "Needs Review"],
                  ["draft", "Draft"],
                  ["complete", "Complete"],
                ] as const).map(([value, label]) => (
                  <ChoiceChip
                    key={value}
                    active={statusFilter === value}
                    onClick={() => onStatusFilterChange(value)}
                    className="justify-start"
                  >
                    {label}
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
            <div key={label}>
              <p
                className="mx-3 mb-1 mt-4 text-label"
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
                const directionBg =
                  item.direction === "LONG"
                    ? "var(--profit-bg)"
                    : "var(--loss-bg)";
                const directionColor =
                  item.direction === "LONG"
                    ? "var(--profit-primary)"
                    : "var(--loss-primary)";
                const pnlColor =
                  item.netPnl >= 0
                    ? "var(--profit-primary)"
                    : "var(--loss-primary)";
                const statusBg =
                  item.reviewStatus === "complete"
                    ? "var(--accent-soft)"
                    : item.reviewStatus === "draft"
                      ? "var(--surface-elevated)"
                      : "transparent";
                const statusColor =
                  item.reviewStatus === "complete"
                    ? "var(--accent-primary)"
                    : "var(--text-tertiary)";

                return (
                  <motion.button
                    key={item.id}
                    variants={ROW}
                    type="button"
                    onClick={() => onSelectTrade(item.id)}
                    className="mx-[6px] my-[1px] block w-[calc(100%-12px)] text-left"
                    style={{ width: "calc(100% - 12px)" }}
                  >
                    <InsetPanel
                      className="transition-colors duration-100"
                      paddingClassName="px-3 py-2.5"
                      style={{
                        background: isActive
                          ? "var(--accent-soft)"
                          : "var(--surface-elevated)",
                        borderColor: isActive
                          ? "var(--accent-primary)"
                          : "var(--border-subtle)",
                        borderLeftWidth: 2,
                        boxShadow: isActive ? "var(--shadow-sm)" : "none",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              color: isActive
                                ? "var(--accent-primary)"
                                : "var(--text-primary)",
                              fontFamily: "var(--font-jb-mono)",
                              fontSize: "12px",
                              fontWeight: 700,
                            }}
                          >
                            {item.symbol}
                          </span>
                          <span
                            style={{
                              background: directionBg,
                              borderRadius: "var(--radius-sm)",
                              color: directionColor,
                              fontFamily: "var(--font-jb-mono)",
                              fontSize: "10px",
                              padding: "2px 5px",
                            }}
                          >
                            {item.direction === "LONG" ? "L" : "S"}
                          </span>
                        </div>

                        <span
                          style={{
                            color: "var(--text-tertiary)",
                            fontFamily: "var(--font-jb-mono)",
                            fontSize: "10px",
                          }}
                        >
                          {formatDate(item.closedAt)}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              color: pnlColor,
                              fontFamily: "var(--font-jb-mono)",
                              fontSize: "12px",
                            }}
                          >
                            {formatPnl(item.netPnl)}
                          </span>
                          <span
                            style={{
                              background: statusBg,
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "var(--radius-sm)",
                              color: statusColor,
                              fontFamily: "var(--font-inter)",
                              fontSize: "9px",
                              fontWeight: 600,
                              padding: "2px 6px",
                            }}
                          >
                            {statusLabel(item.reviewStatus)}
                          </span>
                        </div>

                        {item.reviewStatus === "complete" ? (
                          <Check
                            size={12}
                            style={{ color: "var(--accent-primary)" }}
                          />
                        ) : (
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              background:
                                item.reviewStatus === "draft"
                                  ? "var(--warning-primary)"
                                  : "var(--border-default)",
                            }}
                          />
                        )}
                      </div>
                    </InsetPanel>
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
