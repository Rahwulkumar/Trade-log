"use client";

import { memo, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { LoadingBlock } from "@/components/ui/loading";
import { InsetPanel } from "@/components/ui/surface-primitives";
import type { Trade } from "@/lib/db/schema";
import { getTradeNetPnl } from "@/lib/utils/trade-pnl";

interface CashflowProps {
  trades?: Trade[] | null;
  loading?: boolean;
  period?: "1W" | "1M" | "3M" | "YTD";
}

interface PeriodBucket {
  label: string;
  fullLabel: string;
  sortKey: number;
  grossProfit: number;
  grossLoss: number;
  netPnl: number;
  tradeCount: number;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface CashflowTooltipEntry {
  name: string;
  value: number;
  color: string;
  payload: PeriodBucket;
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfWeek(value: Date) {
  const normalized = startOfLocalDay(value);
  const weekday = normalized.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  normalized.setDate(normalized.getDate() + mondayOffset);
  return normalized;
}

function endOfWeek(value: Date) {
  const weekStart = startOfWeek(value);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return weekEnd;
}

function bucketMode(period: "1W" | "1M" | "3M" | "YTD") {
  if (period === "1W" || period === "1M") return "day";
  if (period === "3M") return "week";
  return "month";
}

function bucketDescriptor(period: "1W" | "1M" | "3M" | "YTD") {
  if (period === "1W" || period === "1M") return "day";
  if (period === "3M") return "week";
  return "month";
}

function buildBucketIdentity(date: Date, period: "1W" | "1M" | "3M" | "YTD") {
  const mode = bucketMode(period);

  if (mode === "day") {
    const dayStart = startOfLocalDay(date);
    return {
      key: `day-${dayStart.getTime()}`,
      sortKey: dayStart.getTime(),
      label:
        period === "1W"
          ? dayStart.toLocaleDateString("en-US", { weekday: "short" })
          : dayStart.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
      fullLabel: dayStart.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    };
  }

  if (mode === "week") {
    const weekStart = startOfWeek(date);
    const weekEnd = endOfWeek(date);
    return {
      key: `week-${weekStart.getTime()}`,
      sortKey: weekStart.getTime(),
      label: weekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      fullLabel: `${weekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${weekEnd.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`,
    };
  }

  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  return {
    key: `month-${monthStart.getFullYear()}-${monthStart.getMonth()}`,
    sortKey: monthStart.getTime(),
    label: MONTH_LABELS[monthStart.getMonth()],
    fullLabel: `${MONTH_LABELS[monthStart.getMonth()]} ${monthStart.getFullYear()}`,
  };
}

function formatSignedCurrency(value: number) {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

const CashflowTooltip = memo(function CashflowTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: CashflowTooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const bucket = payload[0]?.payload;

  return (
    <div
      style={{
        background: "var(--surface-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        padding: "0.65rem 0.9rem",
        boxShadow: "var(--shadow-lg)",
        minWidth: "130px",
      }}
    >
      <p
        style={{
          color: "var(--text-tertiary)",
          fontSize: "0.7rem",
          marginBottom: "0.4rem",
          fontFamily: "var(--font-inter)",
        }}
      >
        {bucket?.fullLabel ?? label}
      </p>
      {bucket ? (
        <>
          <div className="flex items-center justify-between gap-4">
            <span
              style={{
                color:
                  bucket.netPnl >= 0
                    ? "var(--profit-primary)"
                    : "var(--loss-primary)",
                fontSize: "0.75rem",
                fontFamily: "var(--font-inter)",
              }}
            >
              Net P&amp;L
            </span>
            <span
              style={{
                color:
                  bucket.netPnl >= 0
                    ? "var(--profit-primary)"
                    : "var(--loss-primary)",
                fontSize: "0.78rem",
                fontFamily: "var(--font-jb-mono)",
                fontWeight: 600,
              }}
            >
              {formatSignedCurrency(bucket.netPnl)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-4">
            <span
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.75rem",
                fontFamily: "var(--font-inter)",
              }}
            >
              Gross Profit
            </span>
            <span
              style={{
                color: "var(--text-primary)",
                fontSize: "0.78rem",
                fontFamily: "var(--font-jb-mono)",
                fontWeight: 600,
              }}
            >
              +$
              {bucket.grossProfit.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-4">
            <span
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.75rem",
                fontFamily: "var(--font-inter)",
              }}
            >
              Gross Loss
            </span>
            <span
              style={{
                color: "var(--text-primary)",
                fontSize: "0.78rem",
                fontFamily: "var(--font-jb-mono)",
                fontWeight: 600,
              }}
            >
              -$
              {bucket.grossLoss.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-4">
            <span
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.75rem",
                fontFamily: "var(--font-inter)",
              }}
            >
              Trades
            </span>
            <span
              style={{
                color: "var(--text-primary)",
                fontSize: "0.78rem",
                fontFamily: "var(--font-jb-mono)",
                fontWeight: 600,
              }}
            >
              {bucket.tradeCount}
            </span>
          </div>
        </>
      ) : null}
      {payload
        .filter((entry) => entry.name !== "Net P&L")
        .map((entry) => (
        <div
          key={entry.name}
          className="flex items-center justify-between gap-4"
        >
          <span
            style={{
              color: entry.color,
              fontSize: "0.75rem",
              fontFamily: "var(--font-inter)",
            }}
          >
            {entry.name}
          </span>
          <span
            style={{
              color: "var(--text-primary)",
              fontSize: "0.78rem",
              fontFamily: "var(--font-jb-mono)",
              fontWeight: 600,
            }}
          >
            $
            {entry.value.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
      ))}
    </div>
  );
});

export const CashflowChart = memo(function CashflowChart({
  trades,
  loading = false,
  period = "1M",
}: CashflowProps) {
  const { data, totalPnl, bestBucket, worstBucket, avgBucketPnl } = useMemo(() => {
    const safeTrades = trades ?? [];
    const buckets = new Map<string, PeriodBucket>();

    for (const trade of safeTrades) {
      if (!trade.exitDate && !trade.entryDate) continue;

      const date = new Date(trade.exitDate || trade.entryDate || "");
      if (Number.isNaN(date.getTime())) continue;
      const identity = buildBucketIdentity(date, period);

      if (!buckets.has(identity.key)) {
        buckets.set(identity.key, {
          label: identity.label,
          fullLabel: identity.fullLabel,
          sortKey: identity.sortKey,
          grossProfit: 0,
          grossLoss: 0,
          netPnl: 0,
          tradeCount: 0,
        });
      }

      const bucket = buckets.get(identity.key)!;
      const pnl = getTradeNetPnl(trade);
      if (pnl >= 0) {
        bucket.grossProfit += pnl;
      } else {
        bucket.grossLoss += Math.abs(pnl);
      }
      bucket.netPnl += pnl;
      bucket.tradeCount += 1;
    }

    const ordered = Array.from(buckets.values()).sort(
      (left, right) => left.sortKey - right.sortKey,
    );
    const best = ordered.reduce<PeriodBucket | null>(
      (current, bucket) =>
        current == null || bucket.netPnl > current.netPnl ? bucket : current,
      null,
    );
    const worst = ordered.reduce<PeriodBucket | null>(
      (current, bucket) =>
        current == null || bucket.netPnl < current.netPnl ? bucket : current,
      null,
    );
    const total = safeTrades.reduce((sum, trade) => sum + getTradeNetPnl(trade), 0);

    return {
      data: ordered,
      totalPnl: total,
      bestBucket: best,
      worstBucket: worst,
      avgBucketPnl: ordered.length > 0 ? total / ordered.length : 0,
    };
  }, [period, trades]);

  const fmt = (value: number) => `$${(value / 1000).toFixed(0)}k`;
  const periodUnit = bucketDescriptor(period);
  const profitableBuckets = data.filter((bucket) => bucket.netPnl > 0).length;
  const losingBuckets = data.filter((bucket) => bucket.netPnl < 0).length;

  return (
    <div className="h-full w-full">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-label" style={{ marginBottom: "0.1rem" }}>
            Period Total
          </p>
          <p
            style={{
              fontFamily: "var(--font-jb-mono)",
              fontSize: "1.3rem",
              fontWeight: 600,
              color:
                totalPnl >= 0 ? "var(--profit-primary)" : "var(--loss-primary)",
              lineHeight: 1.14,
            }}
          >
            {totalPnl >= 0 ? "+" : "-"}$
            {Math.abs(totalPnl).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
          >
            Each bar is net realized P&amp;L for a {periodUnit}. Green bars finish
            above the dashed break-even line. Red bars finish below it.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:max-w-[320px] md:justify-end">
          <span
            className="flex items-center gap-1.5"
            style={{
              fontSize: "0.71rem",
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-inter)",
            }}
          >
            <span
              className="legend-dot"
              style={{ background: "var(--profit-primary)" }}
            />
            Winning {periodUnit}s
          </span>
          <span
            className="flex items-center gap-1.5"
            style={{
              fontSize: "0.71rem",
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-inter)",
            }}
          >
            <span
              className="legend-dot"
              style={{ background: "var(--loss-primary)" }}
            />
            Losing {periodUnit}s
          </span>
          <span
            className="flex items-center gap-1.5"
            style={{
              fontSize: "0.71rem",
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-inter)",
            }}
          >
            <span
              style={{
                width: 14,
                height: 0,
                borderTop: "1px dashed var(--text-tertiary)",
                opacity: 0.75,
              }}
            />
            Break-even
          </span>
        </div>
      </div>

      {!loading && data.length > 0 ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InsetPanel paddingClassName="px-3 py-3">
            <p className="text-label">View</p>
            <p className="mt-2 mono text-sm font-semibold">
              {periodUnit.charAt(0).toUpperCase() + periodUnit.slice(1)}
            </p>
            <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {profitableBuckets} green / {losingBuckets} red
            </p>
          </InsetPanel>
          <InsetPanel paddingClassName="px-3 py-3">
            <p className="text-label">Best {periodUnit}</p>
            <p
              className="mt-2 mono text-sm font-semibold"
              style={{ color: "var(--profit-primary)" }}
            >
              {bestBucket ? formatSignedCurrency(bestBucket.netPnl) : "--"}
            </p>
            <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {bestBucket?.fullLabel ?? "No data"}
            </p>
          </InsetPanel>
          <InsetPanel paddingClassName="px-3 py-3">
            <p className="text-label">Worst {periodUnit}</p>
            <p
              className="mt-2 mono text-sm font-semibold"
              style={{ color: "var(--loss-primary)" }}
            >
              {worstBucket ? formatSignedCurrency(worstBucket.netPnl) : "--"}
            </p>
            <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {worstBucket?.fullLabel ?? "No data"}
            </p>
          </InsetPanel>
          <InsetPanel paddingClassName="px-3 py-3">
            <p className="text-label">Average {periodUnit}</p>
            <p
              className="mt-2 mono text-sm font-semibold"
              style={{
                color:
                  avgBucketPnl >= 0
                    ? "var(--profit-primary)"
                    : "var(--loss-primary)",
              }}
            >
              {formatSignedCurrency(avgBucketPnl)}
            </p>
            <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              Realized net P&amp;L per {periodUnit}
            </p>
          </InsetPanel>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <LoadingBlock
                key={index}
                className="h-8 rounded-full"
                tone={index === 0 ? "accent" : "default"}
              />
            ))}
          </div>
          <LoadingBlock className="h-[280px] w-full rounded-[var(--radius-xl)]" />
        </div>
      ) : data.length === 0 ? (
        <div
          className="flex h-[280px] items-center justify-center rounded-xl border"
          style={{
            borderColor: "var(--border-subtle)",
            color: "var(--text-tertiary)",
            fontSize: "0.82rem",
            background: "var(--surface-elevated)",
          }}
        >
          No closed trades in this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data}
            barCategoryGap={period === "YTD" ? "28%" : "18%"}
            barGap={3}
            margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
          >
            <defs>
              <linearGradient id="winnerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--profit-primary)"
                  stopOpacity={1}
                />
                <stop
                  offset="100%"
                  stopColor="var(--profit-secondary)"
                  stopOpacity={0.85}
                />
              </linearGradient>
              <linearGradient id="loserGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--loss-primary)"
                  stopOpacity={1}
                />
                <stop
                  offset="100%"
                  stopColor="var(--loss-primary)"
                  stopOpacity={0.8}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border-subtle)"
              strokeDasharray="3 4"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={0}
              stroke="var(--text-tertiary)"
              strokeDasharray="4 4"
              strokeOpacity={0.75}
            />
            <XAxis
              dataKey="label"
              tick={{
                fill: "var(--text-tertiary)",
                fontSize: 10,
                fontFamily: "var(--font-inter)",
              }}
              tickLine={false}
              axisLine={false}
              minTickGap={period === "1M" ? 18 : 10}
            />
            <YAxis
              tickFormatter={fmt}
              tick={{
                fill: "var(--text-tertiary)",
                fontSize: 10,
                fontFamily: "var(--font-jb-mono)",
              }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              content={<CashflowTooltip />}
              cursor={{ fill: "var(--surface-hover)", radius: 4 }}
            />
            <Bar
              dataKey="netPnl"
              name="Net P&L"
              maxBarSize={period === "YTD" ? 26 : period === "3M" ? 18 : 14}
            >
              {data.map((entry) => (
                <Cell
                  key={`${entry.sortKey}-${entry.label}`}
                  fill={
                    entry.netPnl >= 0
                      ? "url(#winnerGrad)"
                      : "url(#loserGrad)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});
