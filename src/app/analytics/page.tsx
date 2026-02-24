"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Line,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Award,
  Clock,
  Download,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import {
  AppPageHeader,
  AppPanel,
  SectionHeader,
  PanelTitle,
} from "@/components/ui/page-primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarLoader } from "@/components/ui/loading";

import { CHART_COLORS } from "@/lib/constants/chart-colors";

import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import {
  getEquityCurve,
  getPerformanceByDay,
  type EquityCurvePoint,
  type DayPerformance,
} from "@/lib/api/analytics";
import { getTrades } from "@/lib/api/trades";
import type { Trade } from "@/lib/supabase/types";

// ─── Dummy data ───────────────────────────────────────────────────────────────
import {
  DUMMY_RISK,
  DUMMY_EQUITY,
  DUMMY_DRAWDOWN,
  DUMMY_R_DIST,
  DUMMY_PNL_DIST,
  DUMMY_HOLD,
  DUMMY_SESSIONS,
  DUMMY_DOW,
  DUMMY_HOURLY,
  DUMMY_STREAKS,
  DUMMY_CONSISTENCY,
  DUMMY_MAE_MFE,
  DUMMY_INSTRUMENTS,
  DUMMY_STRATEGIES,
} from "@/lib/data/dummy";

// ─── Shared tooltip style ─────────────────────────────────────────────────────
const TT = {
  contentStyle: {
    background: "var(--surface-elevated)",
    border: "1px solid var(--border-default)",
    borderRadius: 10,
    fontSize: 12,
    color: "var(--text-primary)",
  },
  labelStyle: { color: "var(--text-secondary)", fontWeight: 600 },
};

function RiskCard({
  label,
  value,
  unit = "",
  hint,
  good,
  excellent,
}: {
  label: string;
  value: number;
  unit?: string;
  hint: string;
  good: number;
  excellent: number;
}) {
  const isRuin = label === "Risk of Ruin";
  // For risk of ruin, lower is better
  const q = isRuin
    ? value <= excellent
      ? "excellent"
      : value <= good
        ? "good"
        : "poor"
    : value >= excellent
      ? "excellent"
      : value >= good
        ? "good"
        : "poor";
  const styles = {
    excellent: {
      color: "var(--profit-primary)",
      bg: "rgba(8,168,120,0.1)",
      tag: "Excellent",
    },
    good: { color: "#f7c36a", bg: "rgba(247,195,106,0.12)", tag: "Good" },
    poor: {
      color: "var(--loss-primary)",
      bg: "rgba(255,68,85,0.1)",
      tag: "Needs Work",
    },
  }[q];
  return (
    <article className="surface p-5 flex flex-col gap-3 card-enter">
      <div className="flex items-start justify-between">
        <span
          className="text-[11px] font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </span>
        <Badge
          style={{
            fontSize: "0.6rem",
            color: styles.color,
            background: styles.bg,
            border: "none",
            padding: "2px 8px",
          }}
        >
          {styles.tag}
        </Badge>
      </div>
      <p
        className="mono counter-pop"
        style={{
          fontSize: "2rem",
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          color: styles.color,
        }}
      >
        {value.toFixed(2)}
        <span
          className="text-base ml-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          {unit}
        </span>
      </p>
      <p
        className="text-[10px] leading-relaxed"
        style={{ color: "var(--text-tertiary)" }}
      >
        {hint}
      </p>
    </article>
  );
}

function SessionCard({
  session,
  range,
  trades,
  winRate,
  pnl,
  avgPnl,
  color,
}: (typeof DUMMY_SESSIONS)[0]) {
  return (
    <article className="surface p-4 relative overflow-hidden">
      <div
        className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
        style={{ background: color }}
      />
      <div className="pl-2">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold">{session}</h4>
            <p
              className="text-[10px] mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {range}
            </p>
          </div>
          <span
            className="mono text-[11px] font-semibold"
            style={{
              color: pnl >= 0 ? "var(--profit-primary)" : "var(--loss-primary)",
            }}
          >
            {pnl >= 0 ? "+" : ""}${pnl.toLocaleString()}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            ["Trades", String(trades), "var(--text-primary)"],
            [
              "Win Rate",
              `${winRate.toFixed(1)}%`,
              winRate >= 60 ? "var(--profit-primary)" : "var(--text-primary)",
            ],
            ["Avg P&L", `+$${avgPnl.toFixed(0)}`, "var(--profit-primary)"],
          ].map(([l, v, c]) => (
            <div key={l}>
              <p
                className="text-[9px] mb-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {l}
              </p>
              <p
                className="mono text-[11px] font-semibold"
                style={{ color: c }}
              >
                {v}
              </p>
            </div>
          ))}
        </div>
        <Progress
          value={winRate}
          className="h-1"
          style={{ "--progress-fg": color } as React.CSSProperties}
        />
      </div>
    </article>
  );
}

function ConsistencyGauge({ score }: { score: number }) {
  const r = 52;
  const circ = Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color =
    score >= 75
      ? "var(--profit-primary)"
      : score >= 50
        ? "var(--accent-primary)"
        : "#f7c36a";
  const tag =
    score >= 75 ? "Consistent" : score >= 50 ? "Moderate" : "Inconsistent";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="124" height="70" viewBox="0 0 124 70">
        <path
          d="M 12 62 A 50 50 0 0 1 112 62"
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 12 62 A 50 50 0 0 1 112 62"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${circ}`}
          strokeDashoffset={offset}
        />
        <text
          x="62"
          y="58"
          textAnchor="middle"
          fontSize="22"
          fontWeight="700"
          fill={color}
          fontFamily="var(--font-jb-mono)"
        >
          {score}
        </text>
      </svg>
      <span className="text-[11px] font-semibold" style={{ color }}>
        {tag}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const { selectedAccountId } = usePropAccount();
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [equityCurve, setEquityCurve] = useState<EquityCurvePoint[]>([]);
  const [dayPerf, setDayPerf] = useState<DayPerformance[]>([]);

  useEffect(() => {
    async function load() {
      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const id =
          selectedAccountId === "unassigned" ? "unassigned" : selectedAccountId;
        const [t, eq, dp] = await Promise.all([
          getTrades({ status: "closed", propAccountId: id }),
          getEquityCurve(10000, undefined, undefined, id),
          getPerformanceByDay(id),
        ]);
        setTrades(t);
        setEquityCurve(eq);
        setDayPerf(dp);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) load();
  }, [user, isConfigured, authLoading, selectedAccountId]);

  const useDummy = !loading && trades.length === 0;
  const eqData = useDummy
    ? DUMMY_EQUITY
    : equityCurve.map((p) => ({
        date: (p.date ?? "").slice(5),
        balance: p.balance,
      }));
  const dowData = useDummy
    ? DUMMY_DOW
    : dayPerf.map((d) => ({
        day: d.day,
        trades: d.trades,
        winRate: d.winRate ?? 0,
        totalPnl: d.totalPnl,
      }));

  if (!authLoading && !isConfigured)
    return (
      <AppPanel className="mt-8 max-w-md">
        <h2 className="mb-2 text-xl font-semibold">Supabase Not Configured</h2>
        <p className="text-muted-foreground">
          Please add your Supabase credentials to continue.
        </p>
      </AppPanel>
    );

  if (!authLoading && !user)
    return (
      <AppPanel className="mt-8 max-w-md">
        <h2 className="mb-2 text-xl font-semibold">Login Required</h2>
        <p className="mb-4 text-muted-foreground">
          Please sign in to view analytics.
        </p>
        <Button asChild className="mt-4">
          <Link href="/auth/login">Sign In</Link>
        </Button>
      </AppPanel>
    );

  if (loading)
    return (
      <div className="flex items-center justify-center py-24">
        <BarLoader />
      </div>
    );

  return (
    <div className="page-root page-sections">
      {/* ── Page Header ── */}
      <AppPageHeader
        eyebrow="Deep Intelligence"
        title="Analytics"
        description="Prop-firm grade performance intelligence — risk ratios, drawdown analysis, session patterns, streaks, and more."
        icon={<Activity size={18} color="white" />}
        actions={
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Export
          </Button>
        }
      />

      {/* ── Dummy banner ── */}
      {useDummy && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(247,195,106,0.1)",
            border: "1px solid rgba(247,195,106,0.25)",
            color: "#b8860b",
          }}
        >
          <Zap size={14} />
          <span>
            Showing example data — log trades in your Journal to see your real
            analytics.
          </span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — Risk-Adjusted Performance
      ══════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          eyebrow="Risk Intelligence"
          title="Risk-Adjusted Performance"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <RiskCard
            label="Sharpe Ratio"
            value={DUMMY_RISK.sharpe}
            hint="Return ÷ std deviation — 1.5+ is strong, 2.0+ is exceptional"
            good={1.0}
            excellent={1.5}
          />
          <RiskCard
            label="Sortino Ratio"
            value={DUMMY_RISK.sortino}
            hint="Like Sharpe but only penalises downside volatility"
            good={1.5}
            excellent={2.0}
          />
          <RiskCard
            label="Calmar Ratio"
            value={DUMMY_RISK.calmar}
            hint="Annual return ÷ max drawdown — measures drawdown-adjusted return"
            good={2.0}
            excellent={3.0}
          />
          <RiskCard
            label="Recovery Factor"
            value={DUMMY_RISK.recoveryFactor}
            hint="Total net P&L ÷ max drawdown — how well you bounce back"
            good={2.0}
            excellent={4.0}
          />
          <RiskCard
            label="Risk of Ruin"
            value={DUMMY_RISK.riskOfRuin}
            unit="%"
            hint="Statistical probability of blowing the account at current risk"
            good={5.0}
            excellent={2.0}
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — Equity & Drawdown
      ══════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          eyebrow="Capital Protection"
          title="Equity & Drawdown Analysis"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Equity curve — 2/3 */}
          <AppPanel className="lg:col-span-2">
            <PanelTitle
              title="Equity Curve"
              subtitle="Cumulative account balance — track your capital growth trajectory"
            />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={eqData}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="10%"
                        stopColor="var(--accent-primary)"
                        stopOpacity={0.28}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--accent-primary)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={CHART_COLORS.grid}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    {...TT}
                    formatter={(v: number) => [
                      `$${v.toLocaleString()}`,
                      "Balance",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="var(--accent-primary)"
                    fill="url(#eqGrad)"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AppPanel>

          {/* Drawdown stats — 1/3 */}
          <AppPanel>
            <PanelTitle
              title="Drawdown Stats"
              subtitle="Peak-to-trough risk metrics"
            />
            <div className="space-y-1">
              {[
                {
                  label: "Max Drawdown",
                  value: "-3.26%",
                  sub: "-$412 from peak",
                  bad: true,
                },
                {
                  label: "Avg Drawdown Depth",
                  value: "-1.8%",
                  sub: "across all periods",
                  bad: false,
                },
                {
                  label: "Longest DD Period",
                  value: "8 days",
                  sub: "Mar 9 → Mar 16",
                  bad: false,
                },
                {
                  label: "Current from Peak",
                  value: "-0.4%",
                  sub: "-$52 below ATH",
                  bad: false,
                },
                {
                  label: "ATH Events",
                  value: "14 times",
                  sub: "new all-time highs hit",
                  bad: false,
                },
                {
                  label: "Recovery Time (avg)",
                  value: "3.2 days",
                  sub: "avg time back to peak",
                  bad: false,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-start justify-between py-2.5"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {s.label}
                  </span>
                  <div className="text-right">
                    <p
                      className="mono text-sm font-semibold"
                      style={{
                        color: s.bad
                          ? "var(--loss-primary)"
                          : "var(--text-primary)",
                      }}
                    >
                      {s.value}
                    </p>
                    <p
                      className="text-[10px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {s.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </AppPanel>
        </div>

        {/* Underwater chart — full width below */}
        <AppPanel className="mt-5">
          <PanelTitle
            title="Underwater Chart"
            subtitle="Drawdown % from equity peak at each point in time — the FTMO compliance view"
          />
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DUMMY_DRAWDOWN}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--loss-primary)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--loss-primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_COLORS.grid}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  {...TT}
                  formatter={(v: number) => [`${v}%`, "Drawdown"]}
                />
                <ReferenceLine
                  y={-5}
                  stroke="var(--loss-primary)"
                  strokeDasharray="4 3"
                  opacity={0.4}
                  label={{
                    value: "–5% limit",
                    fill: CHART_COLORS.textTertiary,
                    fontSize: 9,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="dd"
                  stroke="var(--loss-primary)"
                  fill="url(#ddGrad)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AppPanel>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — Distribution Analysis
      ══════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader eyebrow="Trade Quality" title="Distribution Analysis" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* R-Multiple */}
          <AppPanel>
            <PanelTitle
              title="R-Multiple Distribution"
              subtitle="How many trades hit each risk-multiple outcome"
            />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DUMMY_R_DIST} barCategoryGap="18%">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={CHART_COLORS.grid}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="range"
                    tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip {...TT} formatter={(v: number) => [v, "Trades"]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {DUMMY_R_DIST.map((e, i) => (
                      <Cell
                        key={i}
                        fill={
                          e.range.startsWith("-")
                            ? "var(--loss-primary)"
                            : e.range === "0R"
                              ? "var(--text-tertiary)"
                              : "var(--profit-primary)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AppPanel>

          {/* P&L Distribution */}
          <AppPanel>
            <PanelTitle
              title="P&L Distribution"
              subtitle="Frequency histogram of individual trade outcomes"
            />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DUMMY_PNL_DIST} barCategoryGap="10%">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={CHART_COLORS.grid}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fill: CHART_COLORS.textTertiary, fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip {...TT} formatter={(v: number) => [v, "Trades"]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {DUMMY_PNL_DIST.map((e, i) => (
                      <Cell
                        key={i}
                        fill={
                          e.bucket.startsWith("-")
                            ? "var(--loss-primary)"
                            : e.bucket === "$0"
                              ? "var(--text-tertiary)"
                              : "var(--profit-primary)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AppPanel>

          {/* Hold Time */}
          <AppPanel>
            <PanelTitle
              title="Hold Time Breakdown"
              subtitle="Trade duration distribution vs avg P&L earned"
            />
            <div className="space-y-4 mt-1">
              {DUMMY_HOLD.map((h) => {
                const max = Math.max(...DUMMY_HOLD.map((x) => x.count));
                return (
                  <div key={h.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-[11px] font-semibold">
                          {h.label}
                        </span>
                        <span
                          className="text-[10px] ml-1.5"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {h.sub}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <span
                          className="text-[10px]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {h.count} trades
                        </span>
                        <span
                          className="mono text-[11px] font-semibold"
                          style={{ color: "var(--profit-primary)" }}
                        >
                          +${h.avgPnl}
                        </span>
                      </div>
                    </div>
                    <Progress value={(h.count / max) * 100} className="h-1.5" />
                  </div>
                );
              })}
              <div
                className="flex items-center gap-2 pt-1"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <Clock size={11} style={{ color: "var(--text-tertiary)" }} />
                <span
                  className="text-[10px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Overall avg hold time:{" "}
                  <span
                    className="font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    1h 48m
                  </span>
                </span>
              </div>
            </div>
          </AppPanel>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 4 — Session & Time Intelligence
      ══════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          eyebrow="Timing Intelligence"
          title="Session & Time Analysis"
        />

        {/* 4 session cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          {DUMMY_SESSIONS.map((s) => (
            <SessionCard key={s.session} {...s} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Day of week — composed */}
          <AppPanel>
            <PanelTitle
              title="Performance by Day of Week"
              subtitle="Win rate (line) vs trade count (bars) — 50% threshold marked"
            />
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dowData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={CHART_COLORS.grid}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tickFormatter={(v: string) => v.slice(0, 3)}
                    tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="l"
                    tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                    domain={[0, 100]}
                  />
                  <YAxis
                    yAxisId="r"
                    orientation="right"
                    tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip {...TT} />
                  <Bar
                    yAxisId="r"
                    dataKey="trades"
                    radius={[4, 4, 0, 0]}
                    fill="var(--border-active)"
                    opacity={0.45}
                    name="Trades"
                  />
                  <Line
                    yAxisId="l"
                    type="monotone"
                    dataKey="winRate"
                    stroke="var(--accent-primary)"
                    strokeWidth={2.5}
                    dot={{
                      fill: "var(--accent-primary)",
                      r: 4,
                      strokeWidth: 0,
                    }}
                    name="Win Rate %"
                  />
                  <ReferenceLine
                    yAxisId="l"
                    y={50}
                    stroke="var(--loss-primary)"
                    strokeDasharray="4 3"
                    opacity={0.5}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </AppPanel>

          {/* Hour-of-day heatmap */}
          <AppPanel>
            <PanelTitle
              title="Hour-of-Day Heatmap"
              subtitle="Average P&L by trading hour (UTC) — find your sharpest hours"
            />
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: "repeat(8, 1fr)" }}
            >
              {DUMMY_HOURLY.map((h) => {
                const abs = Math.min(Math.abs(h.avgPnl) / 110, 1);
                const isPos = h.avgPnl >= 0;
                const alpha = 0.08 + abs * 0.72;
                return (
                  <div
                    key={h.hour}
                    title={`${h.label}: ${h.avgPnl >= 0 ? "+" : ""}$${h.avgPnl}`}
                    className="rounded-[6px] flex flex-col items-center py-2.5 cursor-default transition-transform hover:scale-105"
                    style={{
                      background: isPos
                        ? `rgba(8,168,120,${alpha})`
                        : `rgba(255,68,85,${alpha})`,
                      border: `1px solid ${isPos ? `rgba(8,168,120,${Math.min(alpha * 0.6, 0.4)})` : `rgba(255,68,85,${Math.min(alpha * 0.6, 0.4)})`}`,
                    }}
                  >
                    <span
                      className="text-[9px] font-semibold"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {String(h.hour).padStart(2, "0")}
                    </span>
                    <span
                      className="text-[9px] font-bold mt-0.5"
                      style={{
                        color: isPos
                          ? "var(--profit-primary)"
                          : "var(--loss-primary)",
                      }}
                    >
                      {h.avgPnl > 0 ? "+" : ""}
                      {h.avgPnl}
                    </span>
                  </div>
                );
              })}
            </div>
            <div
              className="mt-3 flex items-center gap-4 text-[10px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-1.5 rounded-sm"
                  style={{ background: "rgba(8,168,120,0.7)" }}
                />
                Profitable hour
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-1.5 rounded-sm"
                  style={{ background: "rgba(255,68,85,0.7)" }}
                />
                Losing hour
              </span>
            </div>
          </AppPanel>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 5 — Streak, Consistency & MAE/MFE
      ══════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          eyebrow="Behavioral Edge"
          title="Streak, Consistency & Execution Quality"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Streak tracker */}
          <AppPanel>
            <PanelTitle
              title="Streak Tracker"
              subtitle="Recent trade sequence and peak consecutive runs"
            />
            <div className="flex items-center gap-1 mb-4 flex-wrap">
              {DUMMY_STREAKS.recentTrades.map((t, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-[5px] flex items-center justify-center text-[10px] font-bold transition-opacity"
                  style={{
                    background:
                      t === "W"
                        ? "rgba(8,168,120,0.15)"
                        : "rgba(255,68,85,0.12)",
                    color:
                      t === "W"
                        ? "var(--profit-primary)"
                        : "var(--loss-primary)",
                    border: `1px solid ${t === "W" ? "rgba(8,168,120,0.3)" : "rgba(255,68,85,0.3)"}`,
                  }}
                >
                  {t}
                </div>
              ))}
              <span
                className="text-[9px] ml-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                ← latest
              </span>
            </div>
            <div
              className="p-3 rounded-xl mb-4 flex items-center gap-4"
              style={{
                background:
                  DUMMY_STREAKS.currentType === "win"
                    ? "rgba(8,168,120,0.1)"
                    : "rgba(255,68,85,0.1)",
                border: `1px solid ${DUMMY_STREAKS.currentType === "win" ? "rgba(8,168,120,0.25)" : "rgba(255,68,85,0.25)"}`,
              }}
            >
              {DUMMY_STREAKS.currentType === "win" ? (
                <TrendingUp
                  size={20}
                  style={{ color: "var(--profit-primary)" }}
                />
              ) : (
                <TrendingDown
                  size={20}
                  style={{ color: "var(--loss-primary)" }}
                />
              )}
              <div>
                <p
                  className="text-[10px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Current Streak
                </p>
                <p
                  className="mono text-2xl font-bold"
                  style={{
                    color:
                      DUMMY_STREAKS.currentType === "win"
                        ? "var(--profit-primary)"
                        : "var(--loss-primary)",
                    lineHeight: 1.1,
                  }}
                >
                  {DUMMY_STREAKS.current}{" "}
                  <span className="text-sm">
                    {DUMMY_STREAKS.currentType === "win" ? "wins" : "losses"}
                  </span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Longest Win Streak",
                  value: DUMMY_STREAKS.longestWin,
                  type: "win",
                },
                {
                  label: "Longest Loss Streak",
                  value: DUMMY_STREAKS.longestLoss,
                  type: "loss",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-3 rounded-xl flex items-center gap-2"
                  style={{
                    background:
                      s.type === "win"
                        ? "rgba(8,168,120,0.08)"
                        : "rgba(255,68,85,0.08)",
                    border: `1px solid ${s.type === "win" ? "rgba(8,168,120,0.2)" : "rgba(255,68,85,0.2)"}`,
                  }}
                >
                  {s.type === "win" ? (
                    <Award
                      size={16}
                      style={{ color: "var(--profit-primary)" }}
                    />
                  ) : (
                    <AlertTriangle
                      size={16}
                      style={{ color: "var(--loss-primary)" }}
                    />
                  )}
                  <div>
                    <p
                      className="mono text-xl font-bold"
                      style={{
                        color:
                          s.type === "win"
                            ? "var(--profit-primary)"
                            : "var(--loss-primary)",
                        lineHeight: 1,
                      }}
                    >
                      {s.value}
                    </p>
                    <p
                      className="text-[9px]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {s.label.split(" ").slice(1).join(" ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </AppPanel>

          {/* Consistency Score */}
          <AppPanel>
            <PanelTitle
              title="Consistency Score"
              subtitle="Behavioral consistency across 4 dimensions — FTMO style"
            />
            <div className="flex justify-center mb-5">
              <ConsistencyGauge score={DUMMY_CONSISTENCY.score} />
            </div>
            <div className="space-y-3">
              {[
                {
                  label: "Position Sizing",
                  value: DUMMY_CONSISTENCY.positionSize,
                  hint: "Variance in lot size / risk %",
                },
                {
                  label: "Session Timing",
                  value: DUMMY_CONSISTENCY.timing,
                  hint: "Regularity of trading hours",
                },
                {
                  label: "Win/Loss Balance",
                  value: DUMMY_CONSISTENCY.winLossBalance,
                  hint: "Ratio stability over time",
                },
                {
                  label: "Stop Adherence",
                  value: DUMMY_CONSISTENCY.stopAdherence,
                  hint: "Following defined stop levels",
                },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {m.label}
                      </span>
                      <p
                        className="text-[9px] mt-0.5"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {m.hint}
                      </p>
                    </div>
                    <span
                      className="mono text-sm font-bold ml-3"
                      style={{
                        color:
                          m.value >= 75
                            ? "var(--profit-primary)"
                            : m.value >= 50
                              ? "var(--accent-primary)"
                              : "#f7c36a",
                      }}
                    >
                      {m.value}
                    </span>
                  </div>
                  <Progress
                    value={m.value}
                    className="h-1.5"
                    style={
                      {
                        "--progress-fg":
                          m.value >= 75
                            ? "var(--profit-primary)"
                            : m.value >= 50
                              ? "var(--accent-primary)"
                              : "#f7c36a",
                      } as React.CSSProperties
                    }
                  />
                </div>
              ))}
            </div>
          </AppPanel>

          {/* MAE vs MFE */}
          <AppPanel>
            <PanelTitle
              title="MAE vs MFE"
              subtitle="Max adverse vs favourable excursion — diagnose stop & target placement"
            />
            <div className="h-[270px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={CHART_COLORS.grid}
                  />
                  <XAxis
                    dataKey="mae"
                    name="MAE ($)"
                    type="number"
                    tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    label={{
                      value: "MAE ($) →",
                      position: "insideBottomRight",
                      offset: 0,
                      fill: CHART_COLORS.textTertiary,
                      fontSize: 9,
                    }}
                  />
                  <YAxis
                    dataKey="mfe"
                    name="MFE ($)"
                    type="number"
                    tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    label={{
                      value: "MFE ($) →",
                      angle: -90,
                      position: "insideLeft",
                      fill: CHART_COLORS.textTertiary,
                      fontSize: 9,
                    }}
                  />
                  <Tooltip
                    {...TT}
                    cursor={{ stroke: "var(--border-active)" }}
                    formatter={(v: number, n: string) => [`$${v}`, n]}
                  />
                  <Scatter
                    data={DUMMY_MAE_MFE.filter((d) => d.result === "win")}
                    fill="var(--profit-primary)"
                    opacity={0.75}
                    name="Win"
                  />
                  <Scatter
                    data={DUMMY_MAE_MFE.filter((d) => d.result === "loss")}
                    fill="var(--loss-primary)"
                    opacity={0.75}
                    name="Loss"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div
              className="flex items-center gap-4 mt-2 text-[10px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ background: "var(--profit-primary)" }}
                />
                Winning trade
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ background: "var(--loss-primary)" }}
                />
                Losing trade
              </span>
              <span>Higher MFE/MAE = well-placed stops</span>
            </div>
          </AppPanel>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 6 — Instrument & Strategy Breakdown
      ══════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          eyebrow="Breakdown"
          title="Instrument & Strategy Performance"
        />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* By Instrument */}
          <AppPanel>
            <PanelTitle
              title="By Instrument"
              subtitle="Profit factor, win rate, avg hold time, and total P&L per symbol"
            />
            <div className="space-y-2">
              <div
                className="grid px-3 pb-2 text-[9px] font-bold uppercase tracking-wide"
                style={{
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
                  color: "var(--text-tertiary)",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <span>Symbol</span>
                <span className="text-right">Trades</span>
                <span className="text-right">Win%</span>
                <span className="text-right">PF</span>
                <span className="text-right">Avg P&L</span>
                <span className="text-right">Total</span>
              </div>
              {DUMMY_INSTRUMENTS.map((ins) => (
                <div
                  key={ins.symbol}
                  className="grid items-center px-3 py-2.5 rounded-lg transition-colors"
                  style={{
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
                    background: "var(--surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <span className="text-[12px] font-bold">{ins.symbol}</span>
                    <p
                      className="text-[9px] mt-0.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      avg {ins.avgHold}
                    </p>
                  </div>
                  <span
                    className="mono text-right text-[11px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {ins.trades}
                  </span>
                  <span
                    className="mono text-right text-[11px] font-semibold"
                    style={{
                      color:
                        ins.winRate >= 60
                          ? "var(--profit-primary)"
                          : "var(--text-primary)",
                    }}
                  >
                    {ins.winRate.toFixed(0)}%
                  </span>
                  <span
                    className="mono text-right text-[11px]"
                    style={{
                      color:
                        ins.pf >= 2
                          ? "var(--profit-primary)"
                          : "var(--text-primary)",
                    }}
                  >
                    {ins.pf.toFixed(1)}x
                  </span>
                  <span
                    className="mono text-right text-[11px]"
                    style={{ color: "var(--profit-primary)" }}
                  >
                    +${ins.avgPnl}
                  </span>
                  <span
                    className="mono text-right text-[12px] font-bold"
                    style={{
                      color:
                        ins.totalPnl >= 0
                          ? "var(--profit-primary)"
                          : "var(--loss-primary)",
                    }}
                  >
                    {ins.totalPnl >= 0 ? "+" : ""}$
                    {ins.totalPnl.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </AppPanel>

          {/* By Strategy */}
          <AppPanel>
            <PanelTitle
              title="By Strategy"
              subtitle="Playbook performance — which setups have genuine statistical edge"
            />
            <div className="space-y-2">
              <div
                className="grid px-3 pb-2 text-[9px] font-bold uppercase tracking-wide"
                style={{
                  gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr",
                  color: "var(--text-tertiary)",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <span>Strategy</span>
                <span className="text-right">Trades</span>
                <span className="text-right">Win%</span>
                <span className="text-right">PF</span>
                <span className="text-right">Total</span>
              </div>
              {DUMMY_STRATEGIES.map((s) => (
                <div
                  key={s.strategy}
                  className="grid items-center px-3 py-3 rounded-lg transition-colors"
                  style={{
                    gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr",
                    background: "var(--surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <span className="text-[11px] font-semibold">
                      {s.strategy}
                    </span>
                    <Progress
                      value={s.winRate}
                      className="h-1 mt-1.5"
                      style={
                        {
                          maxWidth: 120,
                          "--progress-fg":
                            s.winRate >= 65
                              ? "var(--profit-primary)"
                              : "var(--accent-primary)",
                        } as React.CSSProperties
                      }
                    />
                  </div>
                  <span
                    className="mono text-right text-[11px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {s.trades}
                  </span>
                  <span
                    className="mono text-right text-[11px] font-semibold"
                    style={{
                      color:
                        s.winRate >= 60
                          ? "var(--profit-primary)"
                          : "var(--text-primary)",
                    }}
                  >
                    {s.winRate.toFixed(0)}%
                  </span>
                  <span
                    className="mono text-right text-[11px]"
                    style={{
                      color:
                        s.pf >= 2
                          ? "var(--profit-primary)"
                          : "var(--text-primary)",
                    }}
                  >
                    {s.pf.toFixed(1)}x
                  </span>
                  <span
                    className="mono text-right text-[12px] font-bold"
                    style={{ color: "var(--profit-primary)" }}
                  >
                    +${s.totalPnl.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </AppPanel>
        </div>
      </section>
    </div>
  );
}
