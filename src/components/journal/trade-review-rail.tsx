"use client";

import { useMemo } from "react";
import { Check, Clock3, FileEdit, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { WidgetEmptyState } from "@/components/ui/surface-primitives";

export type TradeReviewStatus = "empty" | "draft" | "complete";
export type TradeReviewRailLayout = "tray" | "drawer";

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
  layout?: TradeReviewRailLayout;
}

function formatDate(value: string | Date | null): string {
  if (!value) return "--";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
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
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusMeta(status: TradeReviewStatus) {
  if (status === "complete") {
    return {
      label: "Done",
      color: "var(--accent-primary)",
      icon: Check,
    };
  }

  if (status === "draft") {
    return {
      label: "Draft",
      color: "var(--warning-primary)",
      icon: FileEdit,
    };
  }

  return {
    label: "Open",
    color: "var(--text-tertiary)",
    icon: Clock3,
  };
}

function directionMeta(direction: TradeReviewRailItem["direction"]) {
  if (direction === "LONG") {
    return {
      color: "var(--profit-primary)",
      background: "var(--profit-bg)",
    };
  }

  return {
    color: "var(--loss-primary)",
    background: "var(--loss-bg)",
  };
}

function pnlColor(value: number) {
  if (value > 0) {
    return "var(--profit-primary)";
  }
  if (value < 0) {
    return "var(--loss-primary)";
  }
  return "var(--text-secondary)";
}

function QueueFilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold transition-colors"
      style={{
        background: active ? "var(--accent-soft)" : "var(--surface-elevated)",
        borderColor: active ? "var(--accent-primary)" : "var(--border-subtle)",
        color: active ? "var(--accent-primary)" : "var(--text-secondary)",
      }}
    >
      <span>{label}</span>
      <span
        className="rounded-full px-1.5 py-0.5"
        style={{
          background: active
            ? "color-mix(in srgb, var(--accent-primary) 14%, transparent)"
            : "var(--surface)",
          color: active ? "var(--accent-primary)" : "var(--text-secondary)",
          fontSize: "10px",
          lineHeight: 1,
        }}
      >
        {count}
      </span>
    </button>
  );
}

function RailToolbar({
  items,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  compact = false,
}: {
  items: TradeReviewRailItem[];
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: "all" | "pending" | "draft" | "complete";
  onStatusFilterChange: (
    value: "all" | "pending" | "draft" | "complete",
  ) => void;
  compact?: boolean;
}) {
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
    { value: "all", label: "All", count: items.length },
    { value: "pending", label: "Open", count: pendingCount },
    { value: "draft", label: "Draft", count: draftCount },
    { value: "complete", label: "Done", count: completeCount },
  ] as const;

  return (
    <div className={`space-y-2 ${compact ? "" : "border-b px-3 py-2.5"}`}>
      {!compact ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-label">Trade queue</p>
          <span
            style={{
              color: "var(--text-tertiary)",
              fontFamily:
                "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
              fontSize: "10px",
              fontWeight: 700,
            }}
          >
            {items.length}
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search
            size={13}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-tertiary)" }}
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search trades"
            className="h-9 rounded-[10px] pl-9 pr-9 text-[0.74rem]"
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

        <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          <div className="flex min-w-max gap-1.5">
            {statusOptions.map((option) => (
              <QueueFilterChip
                key={option.value}
                label={option.label}
                count={option.count}
                active={statusFilter === option.value}
                onClick={() => onStatusFilterChange(option.value)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TradeQueueTile({
  item,
  active,
  onSelect,
}: {
  item: TradeReviewRailItem;
  active: boolean;
  onSelect: () => void;
}) {
  const status = statusMeta(item.reviewStatus);
  const direction = directionMeta(item.direction);
  const StatusIcon = status.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-[14px] border px-3 py-2.5 text-left transition-colors"
      style={{
        background: active
          ? "color-mix(in srgb, var(--accent-soft) 32%, var(--surface))"
          : "var(--surface)",
        borderColor: active ? "var(--accent-primary)" : "var(--border-subtle)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="truncate"
              style={{
                color: active ? "var(--accent-primary)" : "var(--text-primary)",
                fontFamily:
                  "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                fontSize: "12.5px",
                fontWeight: 700,
              }}
            >
              {item.symbol}
            </span>
            <span
              className="rounded-full px-2 py-0.5"
              style={{
                background: direction.background,
                color: direction.color,
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {item.direction}
            </span>
          </div>

          <div
            className="mt-1 flex flex-wrap items-center gap-2"
            style={{
              color: "var(--text-tertiary)",
              fontSize: "10px",
            }}
          >
            <span>{formatDate(item.closedAt)}</span>
            <span className="inline-flex items-center gap-1" style={{ color: status.color }}>
              <StatusIcon size={10} />
              {status.label}
            </span>
          </div>
        </div>

        <p
          className="shrink-0 text-right"
          style={{
            color: pnlColor(item.netPnl),
            fontFamily:
              "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
            fontSize: "12.5px",
            fontWeight: 700,
          }}
        >
          {formatPnl(item.netPnl)}
        </p>
      </div>
    </button>
  );
}

function TradeQueueRow({
  item,
  active,
  onSelect,
}: {
  item: TradeReviewRailItem;
  active: boolean;
  onSelect: () => void;
}) {
  const status = statusMeta(item.reviewStatus);
  const direction = directionMeta(item.direction);
  const StatusIcon = status.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full border-b px-3 py-2.5 text-left transition-colors"
      style={{
        background: active
          ? "color-mix(in srgb, var(--accent-soft) 38%, var(--surface))"
          : "transparent",
        borderBottomColor: "var(--border-subtle)",
        boxShadow: active ? "inset 2px 0 0 var(--accent-primary)" : "none",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="truncate"
              style={{
                color: active ? "var(--accent-primary)" : "var(--text-primary)",
                fontFamily:
                  "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                fontSize: "12.5px",
                fontWeight: 700,
              }}
            >
              {item.symbol}
            </span>
            <span
              className="rounded-full px-2 py-0.5"
              style={{
                background: direction.background,
                color: direction.color,
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {item.direction}
            </span>
          </div>

          <div
            className="mt-1 flex flex-wrap items-center gap-2"
            style={{
              color: "var(--text-tertiary)",
              fontSize: "10px",
            }}
          >
            <span>{formatDate(item.closedAt)}</span>
            <span className="inline-flex items-center gap-1" style={{ color: status.color }}>
              <StatusIcon size={10} />
              {status.label}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p
            style={{
              color: pnlColor(item.netPnl),
              fontFamily:
                "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
              fontSize: "12.5px",
              fontWeight: 700,
            }}
          >
            {formatPnl(item.netPnl)}
          </p>
          {active ? (
            <p
              className="mt-1"
              style={{
                color: "var(--accent-primary)",
                fontSize: "9px",
                fontWeight: 700,
              }}
            >
              Current
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function EmptyQueue() {
  return (
    <WidgetEmptyState
      title="No trades match this view"
      description="Change the search or filter to keep journaling."
    />
  );
}

export function TradeReviewRail({
  items,
  activeTradeId,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onSelectTrade,
  layout = "drawer",
}: TradeReviewRailProps) {
  const grouped = useMemo(() => {
    const groups = new Map<string, TradeReviewRailItem[]>();

    for (const item of items) {
      const label = groupLabel(item.closedAt);
      const bucket = groups.get(label) ?? [];
      bucket.push(item);
      groups.set(label, bucket);
    }

    return [...groups.entries()];
  }, [items]);

  if (layout === "tray") {
    return (
      <section className="flex min-h-0 w-full flex-col gap-3">
        <RailToolbar
          items={items}
          search={search}
          onSearchChange={onSearchChange}
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
          compact
        />

        <div
          className="min-h-0 overflow-y-auto rounded-[16px] border p-2"
          style={{
            background: "var(--surface-elevated)",
            borderColor: "var(--border-subtle)",
            maxHeight: "18rem",
          }}
        >
          {items.length === 0 ? (
            <div className="px-2 py-6">
              <EmptyQueue />
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <TradeQueueTile
                  key={item.id}
                  item={item}
                  active={item.id === activeTradeId}
                  onSelect={() => onSelectTrade(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--surface-elevated)]">
      <div
        className="sticky top-0 z-10 border-b px-3 py-2.5"
        style={{
          background: "var(--surface-elevated)",
          borderBottomColor: "var(--border-subtle)",
        }}
      >
        <RailToolbar
          items={items}
          search={search}
          onSearchChange={onSearchChange}
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="px-4 pt-8">
            <EmptyQueue />
          </div>
        ) : (
          grouped.map(([label, groupItems]) => (
            <section key={label}>
              <div
                className="sticky top-0 z-[1] border-b px-3 py-1.5"
                style={{
                  background: "var(--surface-elevated)",
                  borderBottomColor: "var(--border-subtle)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p
                    className="text-label"
                    style={{
                      color: "var(--text-tertiary)",
                      fontSize: "10px",
                      letterSpacing: "0.12em",
                    }}
                  >
                    {label}
                  </p>
                  <span
                    style={{
                      color: "var(--text-tertiary)",
                      fontFamily:
                        "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                      fontSize: "10px",
                      fontWeight: 700,
                    }}
                  >
                    {groupItems.length}
                  </span>
                </div>
              </div>

              <div>
                {groupItems.map((item) => (
                  <TradeQueueRow
                    key={item.id}
                    item={item}
                    active={item.id === activeTradeId}
                    onSelect={() => onSelectTrade(item.id)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </aside>
  );
}
