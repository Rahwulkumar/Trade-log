"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/components/auth-provider";
import { getAnalyticsPayloadClient } from "@/lib/api/client/analytics";
import type { AnalyticsSummary } from "@/lib/analytics/types";

interface StatisticsProps {
  propAccountId?: string | null;
  startDate?: string;
  endDate?: string;
  summary?: AnalyticsSummary | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  Wins: "var(--profit-primary)",
  Losses: "var(--loss-primary)",
  "Break-Even": "var(--text-tertiary)",
};

const CATEGORY_LABELS: Record<string, string> = {
  Wins: "Winning trades",
  Losses: "Losing trades",
  "Break-Even": "Break-even",
};

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--surface-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        padding: "0.55rem 0.85rem",
        fontSize: "0.78rem",
        fontFamily: "var(--font-inter)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <span style={{ color: "var(--text-secondary)", marginRight: "0.5rem" }}>
        {payload[0].name}
      </span>
      <span
        style={{
          color: "var(--text-primary)",
          fontFamily: "var(--font-jb-mono)",
          fontWeight: 600,
        }}
      >
        {payload[0].value}
      </span>
    </div>
  );
}

export function StatisticsDonut({
  propAccountId,
  startDate,
  endDate,
  summary,
}: StatisticsProps) {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<{
    wins: number;
    losses: number;
    breakEven: number;
    total: number;
    winRate: number;
    income: number;
    expense: number;
    netPnl: number;
  } | null>(null);
  const [loading, setLoading] = useState(!summary);

  function buildStats(data: AnalyticsSummary) {
    const breakEven =
      data.totalTrades - data.winningTrades - data.losingTrades;
    return {
      wins: data.winningTrades,
      losses: data.losingTrades,
      breakEven: Math.max(0, breakEven),
      total: data.totalTrades,
      winRate: data.winRate,
      income: Math.abs(data.avgWin) * data.winningTrades,
      expense: Math.abs(data.avgLoss) * data.losingTrades,
      netPnl: data.totalNetPnl,
    };
  }

  useEffect(() => {
    async function load() {
      if (summary) {
        setStats(buildStats(summary));
        setLoading(false);
        return;
      }
      if (authLoading) return;
      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }
      try {
        const now = new Date();
        const start =
          startDate ??
          new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split("T")[0];
        const end =
          endDate ??
          new Date(now.getFullYear(), now.getMonth() + 1, 0)
            .toISOString()
            .split("T")[0];
        const acct =
          propAccountId === "unassigned" ? "unassigned" : propAccountId;
        const payload = await getAnalyticsPayloadClient({
          account: acct,
          from: start,
          to: end,
        });
        if (!payload) {
          setStats(null);
          return;
        }

        setStats(buildStats(payload.summary));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("Failed to fetch"))
          console.error("StatisticsDonut:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authLoading, user, isConfigured, propAccountId, startDate, endDate, summary]);

  const pieData = stats
    ? [
        { name: "Wins", value: stats.wins },
        { name: "Losses", value: stats.losses },
        { name: "Break-Even", value: stats.breakEven },
      ].filter((d) => d.value > 0)
    : [{ name: "No Data", value: 1 }];

  const fmtMoney = (v: number) =>
    `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="flex flex-col h-full">
      {/* Donut chart */}
      <div className="relative" style={{ height: "180px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={76}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
              isAnimationActive
              animationDuration={600}
            >
              {pieData.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={
                    entry.name === "No Data"
                      ? "var(--surface-elevated)"
                      : (CATEGORY_COLORS[entry.name] ??
                        `hsl(${120 + i * 60}, 50%, 40%)`)
                  }
                />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {stats ? (
            <>
              <span
                style={{
                  fontFamily: "var(--font-jb-mono)",
                  fontSize: "1.35rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  lineHeight: 1,
                }}
              >
                {stats.netPnl >= 0 ? "+" : "-"}$
                {stats.netPnl.toLocaleString(undefined, {
                  signDisplay: "never",
                  maximumFractionDigits: 0,
                })}
              </span>
              <span
                style={{
                  fontSize: "0.62rem",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-inter)",
                  marginTop: "2px",
                }}
              >
                Net P&L
              </span>
            </>
          ) : (
            <span
              style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}
            >
              {loading ? "..." : "No data"}
            </span>
          )}
        </div>
      </div>

      {/* Category legend — reference right panel */}
      <div className="flex-1 space-y-2 mt-2">
        {[
          {
            key: "Wins",
            count: stats?.wins ?? 0,
            value: stats ? fmtMoney(stats.income) : "$0",
          },
          {
            key: "Losses",
            count: stats?.losses ?? 0,
            value: stats ? fmtMoney(stats.expense) : "$0",
          },
          { key: "Break-Even", count: stats?.breakEven ?? 0, value: "$0" },
        ].map(({ key, count, value }) => (
          <div
            key={key}
            className="flex items-center justify-between"
            style={{
              padding: "0.45rem 0",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "2px",
                  background: CATEGORY_COLORS[key],
                  flexShrink: 0,
                  display: "inline-block",
                }}
              />
              <div>
                <p
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-inter)",
                    lineHeight: 1.2,
                  }}
                >
                  {CATEGORY_LABELS[key]}
                </p>
                <p
                  style={{
                    fontSize: "0.63rem",
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-inter)",
                  }}
                >
                  {count} trade{count !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <span
              style={{
                fontFamily: "var(--font-jb-mono)",
                fontSize: "0.82rem",
                fontWeight: 600,
                color:
                  key === "Wins"
                    ? "var(--profit-primary)"
                    : key === "Losses"
                      ? "var(--loss-primary)"
                      : "var(--text-secondary)",
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
