"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  DollarSign,
  Download,
  Loader2,
  Target,
  TrendingDown,
  TrendingUp,
  BarChart2,
  Hash,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import {
  getAnalyticsSummary,
  getMonthlyPerformance,
  getEquityCurve,
  getPerformanceByDay,
  type AnalyticsSummary,
  type MonthlyPerformance,
  type EquityCurvePoint,
  type DayPerformance,
} from "@/lib/api/analytics";
import { getTrades } from "@/lib/api/trades";
import type { Trade } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import {
  AppMetricCard,
  AppPageHeader,
  AppPanel,
} from "@/components/ui/page-primitives";
import { CHART_COLORS } from "@/lib/constants/chart-colors";
import { motion } from "framer-motion";

interface MetricCard {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "profit" | "loss";
  icon: React.ReactNode;
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function AnalyticsPage() {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const { selectedAccountId } = usePropAccount();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalyticsSummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyPerformance[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [equityCurve, setEquityCurve] = useState<EquityCurvePoint[]>([]);
  const [dayPerf, setDayPerf] = useState<DayPerformance[]>([]);

  useEffect(() => {
    async function loadAnalytics() {
      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const propAccountIdFilter =
          selectedAccountId === "unassigned" ? "unassigned" : selectedAccountId;

        const [analyticsData, monthlyPerfData, tradesData, equityData, dayData] =
          await Promise.all([
            getAnalyticsSummary(undefined, undefined, propAccountIdFilter),
            getMonthlyPerformance(propAccountIdFilter),
            getTrades({ status: "closed", propAccountId: propAccountIdFilter }),
            getEquityCurve(10000, undefined, undefined, propAccountIdFilter),
            getPerformanceByDay(propAccountIdFilter),
          ]);

        setStats(analyticsData);
        setMonthlyData(monthlyPerfData);
        setTrades(tradesData);
        setEquityCurve(equityData);
        setDayPerf(dayData);
      } catch (error) {
        console.error("Failed to load analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadAnalytics();
    }
  }, [user, isConfigured, authLoading, selectedAccountId]);

  const chartMonthlyData = useMemo(
    () =>
      monthlyData.map((month) => ({
        month: month.month,
        net: month.totalPnl,
      })),
    [monthlyData],
  );

  const winLossData = useMemo(
    () => [
      {
        name: "Wins",
        value: stats?.winningTrades ?? 0,
        color: "var(--profit-primary)",
      },
      {
        name: "Losses",
        value: stats?.losingTrades ?? 0,
        color: "var(--loss-primary)",
      },
    ],
    [stats?.winningTrades, stats?.losingTrades],
  );

  const assetPerformance = useMemo(
    () =>
      trades
        .reduce(
          (acc, trade) => {
            const existing = acc.find((item) => item.asset === trade.symbol);
            if (existing) {
              existing.trades += 1;
              existing.pnl += trade.pnl || 0;
              if ((trade.pnl || 0) > 0) existing.wins += 1;
            } else {
              acc.push({
                asset: trade.symbol,
                trades: 1,
                wins: (trade.pnl || 0) > 0 ? 1 : 0,
                pnl: trade.pnl || 0,
              });
            }
            return acc;
          },
          [] as { asset: string; trades: number; wins: number; pnl: number }[],
        )
        .map((asset) => ({
          ...asset,
          winRate: asset.trades > 0 ? (asset.wins / asset.trades) * 100 : 0,
        }))
        .sort((a, b) => b.pnl - a.pnl)
        .slice(0, 10),
    [trades],
  );

  const sortedRDistribution = useMemo(() => {
    const allRanges = ["-3R+", "-2R", "-1R", "0R", "+1R", "+2R", "+3R+"];
    const reduced = trades.reduce(
      (acc, trade) => {
        if (trade.r_multiple === null) return acc;
        const r = trade.r_multiple;
        let range: string;
        if (r <= -3) range = "-3R+";
        else if (r <= -2) range = "-2R";
        else if (r <= -1) range = "-1R";
        else if (r < 1) range = "0R";
        else if (r < 2) range = "+1R";
        else if (r < 3) range = "+2R";
        else range = "+3R+";

        const existing = acc.find((item) => item.range === range);
        if (existing) existing.count += 1;
        else acc.push({ range, count: 1 });
        return acc;
      },
      [] as { range: string; count: number }[],
    );

    return allRanges.map((range) => {
      const found = reduced.find((item) => item.range === range);
      return found || { range, count: 0 };
    });
  }, [trades]);

  // Row 1: overview stats
  const row1Cards = useMemo<MetricCard[]>(
    () => [
      {
        label: "Total Trades",
        value: String(stats?.totalTrades ?? 0),
        hint: `${stats?.winningTrades ?? 0}W · ${stats?.losingTrades ?? 0}L`,
        icon: <Hash className="h-4 w-4" style={{ color: "var(--text-tertiary)" }} />,
      },
      {
        label: "Win Rate",
        value: `${(stats?.winRate ?? 0).toFixed(1)}%`,
        hint: "Percentage of winning trades",
        tone: (stats?.winRate ?? 0) >= 50 ? "profit" : "loss",
        icon: <Target className="h-4 w-4" style={{ color: "var(--text-tertiary)" }} />,
      },
      {
        label: "Avg Win",
        value: `+$${(stats?.avgWin ?? 0).toFixed(2)}`,
        hint: "Average profit per win",
        tone: "profit",
        icon: <TrendingUp className="h-4 w-4" style={{ color: "var(--text-tertiary)" }} />,
      },
      {
        label: "Avg Loss",
        value: `-$${(stats?.avgLoss ?? 0).toFixed(2)}`,
        hint: "Average loss per losing trade",
        tone: "loss",
        icon: <TrendingDown className="h-4 w-4" style={{ color: "var(--text-tertiary)" }} />,
      },
    ],
    [stats],
  );

  // Row 2: advanced stats
  const row2Cards = useMemo<MetricCard[]>(
    () => [
      {
        label: "Profit Factor",
        value:
          stats?.profitFactor === Infinity
            ? "∞"
            : (stats?.profitFactor ?? 0).toFixed(2),
        hint: "Above 1.5 is healthy",
        icon: <BarChart2 className="h-4 w-4" style={{ color: "var(--text-tertiary)" }} />,
      },
      {
        label: "Expectancy",
        value: `${(stats?.expectancy ?? 0) >= 0 ? "+" : ""}$${(stats?.expectancy ?? 0).toFixed(2)}`,
        hint: "Average $ per closed trade",
        tone: (stats?.expectancy ?? 0) >= 0 ? "profit" : "loss",
        icon: <DollarSign className="h-4 w-4" style={{ color: "var(--text-tertiary)" }} />,
      },
      {
        label: "Largest Win",
        value: `+$${(stats?.largestWin ?? 0).toFixed(0)}`,
        hint: "Best single trade",
        tone: "profit",
        icon: <TrendingUp className="h-4 w-4" style={{ color: "var(--text-tertiary)" }} />,
      },
      {
        label: "Largest Loss",
        value: `-$${(stats?.largestLoss ?? 0).toFixed(0)}`,
        hint: "Worst single trade",
        tone: "loss",
        icon: <TrendingDown className="h-4 w-4" style={{ color: "var(--text-tertiary)" }} />,
      },
    ],
    [stats],
  );

  if (!authLoading && !isConfigured) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <AppPanel className="max-w-md text-center">
          <h2 className="mb-2 text-xl font-semibold">Supabase Not Configured</h2>
          <p className="text-muted-foreground">
            Please add your Supabase credentials to continue.
          </p>
        </AppPanel>
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <AppPanel className="max-w-md text-center">
          <h2 className="mb-2 text-xl font-semibold">Login Required</h2>
          <p className="mb-4 text-muted-foreground">
            Please sign in to view analytics.
          </p>
          <Link href="/auth/login" className="btn-base btn-primary mt-4 inline-flex">
            Sign In
          </Link>
        </AppPanel>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 lg:space-y-5 max-w-[1280px]">
      <AppPageHeader
        eyebrow="Performance"
        title="Analytics"
        actions={
          <>
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px] border-border bg-card">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1w">Last 7 Days</SelectItem>
                <SelectItem value="1m">Last Month</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <button type="button" className="btn-base btn-secondary">
              <Download className="h-4 w-4" />
              Export
            </button>
          </>
        }
      />

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && trades.length === 0 && (
        <AppPanel className="p-12 text-center">
          <Target className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">
            No trades to analyze yet. Start logging trades to see analytics.
          </p>
          <Link href="/journal" className="btn-base btn-primary mt-4 inline-flex">
            Go to Journal
          </Link>
        </AppPanel>
      )}

      {!loading && trades.length > 0 && (
        <>
          {/* ── Row 1: 4 overview metric cards ── */}
          <motion.section
            className="grid grid-cols-2 gap-4 lg:grid-cols-4"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          >
            {row1Cards.map((card) => (
              <motion.div key={card.label} variants={cardVariants}>
                <AppMetricCard
                  label={card.label}
                  value={card.value}
                  hint={card.hint}
                  tone={card.tone}
                  icon={card.icon}
                />
              </motion.div>
            ))}
          </motion.section>

          {/* ── Row 2: 4 advanced metric cards ── */}
          <motion.section
            className="grid grid-cols-2 gap-4 lg:grid-cols-4"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.24 } } }}
          >
            {row2Cards.map((card) => (
              <motion.div key={card.label} variants={cardVariants}>
                <AppMetricCard
                  label={card.label}
                  value={card.value}
                  hint={card.hint}
                  tone={card.tone}
                  icon={card.icon}
                />
              </motion.div>
            ))}
          </motion.section>

          {/* ── Tabs ── */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="border border-border bg-card">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="equity">Equity Curve</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="assets">By Asset</TabsTrigger>
            </TabsList>

            {/* ── Overview: Monthly P&L + Win Rate donut ── */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <AppPanel>
                  <h3 className="headline-md mb-1">Monthly P&L</h3>
                  <p className="mb-5 text-sm" style={{ color: "var(--text-tertiary)" }}>
                    Profit and loss by month
                  </p>
                  <div className="h-[280px]">
                    {chartMonthlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartMonthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                          <XAxis
                            dataKey="month"
                            tick={{ fill: CHART_COLORS.textTertiary, fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tick={{ fill: CHART_COLORS.textTertiary, fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `$${v}`}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "var(--surface-elevated)",
                              border: `1px solid ${CHART_COLORS.border}`,
                              borderRadius: "10px",
                            }}
                            labelStyle={{ color: "var(--text-primary)" }}
                          />
                          <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                            {chartMonthlyData.map((entry, i) => (
                              <Cell
                                key={`${entry.month}-${i}`}
                                fill={entry.net >= 0 ? "var(--profit-primary)" : "var(--loss-primary)"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center" style={{ color: "var(--text-tertiary)" }}>
                        No monthly data yet
                      </div>
                    )}
                  </div>
                </AppPanel>

                <AppPanel>
                  <h3 className="headline-md mb-1">Win / Loss Ratio</h3>
                  <p className="mb-5 text-sm" style={{ color: "var(--text-tertiary)" }}>
                    Winning vs losing trades
                  </p>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={winLossData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {winLossData.map((entry, i) => (
                            <Cell key={`${entry.name}-${i}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex justify-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ background: "var(--profit-primary)" }} />
                        <span className="text-sm">Wins {(stats?.winRate ?? 0).toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ background: "var(--loss-primary)" }} />
                        <span className="text-sm">Losses {(100 - (stats?.winRate ?? 0)).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </AppPanel>
              </div>
            </TabsContent>

            {/* ── Equity Curve ── */}
            <TabsContent value="equity" className="space-y-4">
              <AppPanel>
                <h3 className="headline-md mb-1">Equity Curve</h3>
                <p className="mb-5 text-sm" style={{ color: "var(--text-tertiary)" }}>
                  Cumulative account balance over time
                </p>
                <div className="h-[360px]">
                  {equityCurve.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equityCurve}>
                        <defs>
                          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: CHART_COLORS.textTertiary, fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => v.slice(5)}
                        />
                        <YAxis
                          tick={{ fill: CHART_COLORS.textTertiary, fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `$${v.toLocaleString()}`}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--surface-elevated)",
                            border: `1px solid ${CHART_COLORS.border}`,
                            borderRadius: "10px",
                          }}
                          labelStyle={{ color: "var(--text-primary)" }}
                          formatter={(v: number) => [`$${v.toFixed(2)}`, "Balance"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="balance"
                          stroke="var(--accent-primary)"
                          fill="url(#eqGrad)"
                          strokeWidth={2}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center" style={{ color: "var(--text-tertiary)" }}>
                      Not enough data to draw equity curve
                    </div>
                  )}
                </div>
              </AppPanel>
            </TabsContent>

            {/* ── Breakdown: Day of week + R-distribution ── */}
            <TabsContent value="breakdown" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <AppPanel>
                  <h3 className="headline-md mb-1">Performance by Day</h3>
                  <p className="mb-5 text-sm" style={{ color: "var(--text-tertiary)" }}>
                    Total P&L per weekday
                  </p>
                  <div className="h-[300px]">
                    {dayPerf.some((d) => d.trades > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dayPerf}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                          <XAxis
                            dataKey="day"
                            tick={{ fill: CHART_COLORS.textTertiary, fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => v.slice(0, 3)}
                          />
                          <YAxis
                            tick={{ fill: CHART_COLORS.textTertiary, fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `$${v}`}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "var(--surface-elevated)",
                              border: `1px solid ${CHART_COLORS.border}`,
                              borderRadius: "10px",
                            }}
                            labelStyle={{ color: "var(--text-primary)" }}
                          />
                          <Bar dataKey="totalPnl" radius={[4, 4, 0, 0]}>
                            {dayPerf.map((entry, i) => (
                              <Cell
                                key={`${entry.day}-${i}`}
                                fill={entry.totalPnl >= 0 ? "var(--profit-primary)" : "var(--loss-primary)"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center" style={{ color: "var(--text-tertiary)" }}>
                        No trade data yet
                      </div>
                    )}
                  </div>
                </AppPanel>

                <AppPanel>
                  <h3 className="headline-md mb-1">R-Multiple Distribution</h3>
                  <p className="mb-5 text-sm" style={{ color: "var(--text-tertiary)" }}>
                    Trade outcomes by R-multiple
                  </p>
                  <div className="h-[300px]">
                    {sortedRDistribution.some((e) => e.count > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sortedRDistribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                          <XAxis
                            dataKey="range"
                            tick={{ fill: CHART_COLORS.textTertiary, fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tick={{ fill: CHART_COLORS.textTertiary, fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "var(--surface-elevated)",
                              border: `1px solid ${CHART_COLORS.border}`,
                              borderRadius: "10px",
                            }}
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {sortedRDistribution.map((entry, i) => (
                              <Cell
                                key={`${entry.range}-${i}`}
                                fill={entry.range.startsWith("-") ? "var(--loss-primary)" : "var(--profit-primary)"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center" style={{ color: "var(--text-tertiary)" }}>
                        No R-multiple data. Add stop-loss to trades to calculate R.
                      </div>
                    )}
                  </div>
                </AppPanel>
              </div>
            </TabsContent>

            {/* ── By Asset ── */}
            <TabsContent value="assets" className="space-y-4">
              <AppPanel>
                <h3 className="headline-md mb-1">Performance by Asset</h3>
                <p className="mb-5 text-sm" style={{ color: "var(--text-tertiary)" }}>
                  Trading results by instrument
                </p>
                {assetPerformance.length > 0 ? (
                  <div className="space-y-2">
                    {assetPerformance.map((asset) => (
                      <div
                        key={asset.asset}
                        className="flex items-center justify-between gap-4 rounded-[var(--radius-default)] p-3 transition-colors"
                        style={{
                          border: "1px solid var(--border-subtle)",
                          background: "var(--surface-elevated)",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-20 font-semibold text-sm">{asset.asset}</span>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{
                              background: "var(--surface-active)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {asset.trades} trades
                          </span>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-[10px] mb-0.5" style={{ color: "var(--text-tertiary)" }}>
                              Win Rate
                            </div>
                            <div className="text-sm font-semibold">{asset.winRate.toFixed(1)}%</div>
                          </div>
                          <div className="w-24 text-right">
                            <div className="text-[10px] mb-0.5" style={{ color: "var(--text-tertiary)" }}>
                              P&L
                            </div>
                            <div
                              className={cn("mono text-sm font-semibold", asset.pnl >= 0 ? "profit" : "loss")}
                            >
                              {asset.pnl >= 0 ? "+" : ""}${asset.pnl.toFixed(0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center" style={{ color: "var(--text-tertiary)" }}>
                    No asset data yet
                  </div>
                )}
              </AppPanel>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
