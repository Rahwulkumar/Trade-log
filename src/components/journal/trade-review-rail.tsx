"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Check } from "lucide-react";

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
    <aside
      className="flex h-full w-[260px] shrink-0 flex-col overflow-hidden"
      style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      <div
        className="sticky top-0 z-10"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="px-4 pb-3 pt-4">
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-1">
              <p
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-syne)",
                  fontSize: "16px",
                  fontWeight: 700,
                  lineHeight: 1.1,
                }}
              >
                Journal
              </p>
              <p
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-inter)",
                  fontSize: "12px",
                  lineHeight: 1.5,
                }}
              >
                {pendingCount} still need review
              </p>
            </div>
          </div>
        </div>

        <div className="px-3 pb-3">
          <div
            className="flex items-center gap-2 rounded-[var(--radius-default)] px-3"
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <Search
              size={13}
              style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
            />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search symbol, date..."
              className="h-9 w-full outline-none"
              style={{
                background: "transparent",
                color: "var(--text-primary)",
                fontFamily: "var(--font-inter)",
                fontSize: "12px",
              }}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {([
              ["all", "All"],
              ["pending", "Needs Review"],
              ["draft", "Draft"],
              ["complete", "Complete"],
            ] as const).map(([value, label]) => {
              const active = statusFilter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onStatusFilterChange(value)}
                  className="rounded-full px-3 py-1.5"
                  style={{
                    background: active ? "var(--accent-soft)" : "transparent",
                    border: `1px solid ${
                      active
                        ? "var(--accent-primary)"
                        : "var(--border-subtle)"
                    }`,
                    color: active
                      ? "var(--accent-primary)"
                      : "var(--text-secondary)",
                    fontFamily: "var(--font-inter)",
                    fontSize: "11px",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
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
            <p
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-inter)",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            >
              No trades match this view.
            </p>
          </div>
        ) : (
          grouped.map(([label, groupItems]) => (
            <div key={label}>
              <p
                className="mx-3 mb-1 mt-4"
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-syne)",
                  fontSize: "10px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
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
                    className="mx-[6px] my-[1px] block w-[calc(100%-12px)] px-3 py-2 text-left transition-colors duration-100"
                    style={{
                      background: isActive
                        ? "var(--accent-soft)"
                        : "transparent",
                      borderLeft: isActive
                        ? "2px solid var(--accent-primary)"
                        : "2px solid transparent",
                      borderRadius: "var(--radius-default)",
                      width: "calc(100% - 12px)",
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
