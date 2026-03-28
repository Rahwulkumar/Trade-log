"use client";

import { memo, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { LoadingBlock } from "@/components/ui/loading";
import type { Trade } from "@/lib/db/schema";
import { getTradeNetPnl } from "@/lib/utils/trade-pnl";

interface CashflowProps {
  trades?: Trade[] | null;
  loading?: boolean;
  period?: "1W" | "1M" | "3M" | "YTD";
}

interface PeriodBucket {
  label: string;
  sortKey: number;
  grossProfit: number;
  grossLoss: number;
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

const CashflowTooltip = memo(function CashflowTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

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
        {label}
      </p>
      {payload.map((entry) => (
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
  const { data, totalPnl } = useMemo(() => {
    const safeTrades = trades ?? [];
    const buckets = new Map<string, PeriodBucket>();

    for (const trade of safeTrades) {
      if (!trade.exitDate && !trade.entryDate) continue;

      const date = new Date(trade.exitDate || trade.entryDate || "");
      const key =
        period === "1W"
          ? date.toISOString().split("T")[0]
          : `${date.getFullYear()}-${date.getMonth()}`;
      const label =
        period === "1W"
          ? date.toLocaleDateString("en-US", { weekday: "short" })
          : MONTH_LABELS[date.getMonth()];

      if (!buckets.has(key)) {
        buckets.set(key, {
          label,
          sortKey:
            period === "1W"
              ? new Date(
                  date.getFullYear(),
                  date.getMonth(),
                  date.getDate(),
                ).getTime()
              : new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
          grossProfit: 0,
          grossLoss: 0,
        });
      }

      const bucket = buckets.get(key)!;
      const pnl = getTradeNetPnl(trade);
      if (pnl >= 0) {
        bucket.grossProfit += pnl;
      } else {
        bucket.grossLoss += Math.abs(pnl);
      }
    }

    return {
      data: Array.from(buckets.values()).sort(
        (left, right) => left.sortKey - right.sortKey,
      ),
      totalPnl: safeTrades.reduce((sum, trade) => sum + getTradeNetPnl(trade), 0),
    };
  }, [period, trades]);

  const fmt = (value: number) => `$${(value / 1000).toFixed(0)}k`;

  return (
    <div className="h-full w-full">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label" style={{ marginBottom: "0.1rem" }}>
            Net P&L
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
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
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
            Gross Profit
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
            Gross Loss
          </span>
        </div>
      </div>

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
          <LoadingBlock className="h-[220px] w-full rounded-[var(--radius-xl)]" />
        </div>
      ) : data.length === 0 ? (
        <div
          className="flex h-[220px] items-center justify-center rounded-xl border"
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
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            barCategoryGap="35%"
            barGap={3}
            margin={{ top: 4, right: 0, left: -10, bottom: 0 }}
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
                  stopColor="var(--loss-secondary)"
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
            <XAxis
              dataKey="label"
              tick={{
                fill: "var(--text-tertiary)",
                fontSize: 10,
                fontFamily: "var(--font-inter)",
              }}
              tickLine={false}
              axisLine={false}
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
              dataKey="grossProfit"
              name="Gross Profit"
              fill="url(#winnerGrad)"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              dataKey="grossLoss"
              name="Gross Loss"
              fill="url(#loserGrad)"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});
