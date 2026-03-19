"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useAuth } from "@/components/auth-provider";
import { getTrades } from "@/lib/api/client/trades";
import { getTradeNetPnl } from "@/lib/utils/trade-pnl";

// ─── Types ────────────────────────────────────────────────────────────────
interface CashflowProps {
  propAccountId?: string | null;
  period?: "1W" | "1M" | "3M" | "YTD";
}

interface MonthBucket {
  label: string;
  sortKey: number;
  grossProfit: number;
  grossLoss: number;
}

// Custom tooltip
function CashflowTooltip({
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
        background: "var(--surface-elevated)", // Light grey in light mode
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
}

// ─── Main Component ───────────────────────────────────────────────────────
export function CashflowChart({ propAccountId, period = "1M" }: CashflowProps) {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const [data, setData] = useState<MonthBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPnl, setTotalPnl] = useState(0);

  useEffect(() => {
    async function load() {
      if (authLoading) return;
      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }
      try {
        const now = new Date();
        let startDate: Date;
        switch (period) {
          case "1W":
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
          case "3M":
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 3);
            break;
          case "YTD":
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
        }

        const trades = await getTrades({
          propAccountId: propAccountId ?? undefined,
          startDate: startDate.toISOString().split("T")[0],
          endDate: now.toISOString().split("T")[0],
        });

        const buckets = new Map<string, MonthBucket>();
        const monthLabels = [
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

        for (const trade of trades) {
          if (!trade.exitDate && !trade.entryDate) continue;
          const d = new Date(trade.exitDate || trade.entryDate || "");
          let key: string;
          let label: string;

          if (period === "1W") {
            key = d.toISOString().split("T")[0];
            label = d.toLocaleDateString("en-US", { weekday: "short" });
          } else {
            key = `${d.getFullYear()}-${d.getMonth()}`;
            label = `${monthLabels[d.getMonth()]}`;
          }

          if (!buckets.has(key))
            buckets.set(key, {
              label,
              sortKey:
                period === "1W"
                  ? new Date(
                      d.getFullYear(),
                      d.getMonth(),
                      d.getDate(),
                    ).getTime()
                  : new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
              grossProfit: 0,
              grossLoss: 0,
            });
          const bucket = buckets.get(key)!;
          const pnl = getTradeNetPnl(trade);
          if (pnl >= 0) bucket.grossProfit += pnl;
          else bucket.grossLoss += Math.abs(pnl);
        }

        const sorted = Array.from(buckets.values()).sort(
          (left, right) => left.sortKey - right.sortKey,
        );

        setData(sorted);

        const net = trades.reduce((sum, trade) => sum + getTradeNetPnl(trade), 0);
        setTotalPnl(net);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("Failed to fetch"))
          console.error("CashflowChart load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authLoading, user, isConfigured, propAccountId, period]);

  const fmt = (v: number) => `$${(v / 1000).toFixed(0)}k`;

  return (
    <div className="w-full h-full">
      {/* Mini Performance line */}
      <div className="flex items-center justify-between mb-3">
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
              lineHeight: 1,
            }}
          >
            {totalPnl >= 0 ? "+" : "-"}$
            {Math.abs(totalPnl).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4">
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
        <div
          className="flex items-center justify-center h-[200px]"
          style={{ color: "var(--text-tertiary)", fontSize: "0.8rem" }}
        >
          Loading chart...
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
                {/* Dark Forest Green for Losers, to match visual reference (Total Expenses) */}
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
}
