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
import { getTrades } from "@/lib/api/trades";

// ─── Types ────────────────────────────────────────────────────────────────
interface CashflowProps {
  propAccountId?: string | null;
  period?: "1W" | "1M" | "3M" | "YTD";
}

interface MonthBucket {
  label: string;
  Winners: number; // green bars
  Losers: number; // dark bars (absolute value)
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
          fontFamily: "var(--font-dm-sans)",
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
              fontFamily: "var(--font-dm-sans)",
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
  const { user, isConfigured } = useAuth();
  const [data, setData] = useState<MonthBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPnl, setTotalPnl] = useState(0);

  useEffect(() => {
    async function load() {
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
          if (!trade.exit_date && !trade.entry_date) continue;
          const d = new Date(trade.exit_date || trade.entry_date || "");
          let key: string;
          let label: string;

          if (period === "1W") {
            key = d.toLocaleDateString("en-US", { weekday: "short" });
            label = key;
          } else {
            key = `${d.getFullYear()}-${d.getMonth()}`;
            label = `${monthLabels[d.getMonth()]}`;
          }

          if (!buckets.has(key))
            buckets.set(key, { label, Winners: 0, Losers: 0 });
          const bucket = buckets.get(key)!;
          const p = trade.pnl ?? 0;
          if (p >= 0) bucket.Winners += p;
          else bucket.Losers += Math.abs(p);
        }

        const sorted = Array.from(buckets.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, v]) => v);

        if (sorted.length === 0) {
          // Empty state visual
          const demo: MonthBucket[] = monthLabels.slice(0, 8).map((l) => ({
            label: l,
            Winners: 0,
            Losers: 0,
          }));
          setData(demo);
        } else {
          setData(sorted);
        }

        const net = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
        setTotalPnl(net);
      } catch (err) {
        console.error("CashflowChart load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, isConfigured, propAccountId, period]);

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
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            <span
              className="legend-dot"
              style={{ background: "var(--profit-primary)" }}
            />
            Winners
          </span>
          <span
            className="flex items-center gap-1.5"
            style={{
              fontSize: "0.71rem",
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            <span
              className="legend-dot"
              style={{ background: "var(--loss-primary)" }}
            />
            Losers
          </span>
        </div>
      </div>

      {loading ? (
        <div
          className="flex items-center justify-center h-[200px]"
          style={{ color: "var(--text-tertiary)", fontSize: "0.8rem" }}
        >
          Loading chart…
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
                fontFamily: "var(--font-dm-sans)",
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
              dataKey="Winners"
              fill="url(#winnerGrad)"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              dataKey="Losers"
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
