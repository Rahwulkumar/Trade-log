"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { StatisticsDonut } from "@/components/dashboard/statistics-donut";
import { TopPlaybooks } from "@/components/dashboard/playbooks-widget";
import { RecentTrades } from "@/components/dashboard/recent-trades";
import { TradingCalendar } from "@/components/calendar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import {
  getAnalyticsSummary,
  getTodayStats,
  type AnalyticsSummary,
} from "@/lib/api/analytics";
import { checkCompliance } from "@/lib/api/client/prop-accounts";
import type { PropAccount } from "@/lib/db/schema";
import {
  IconAnalytics,
  IconPropFirm,
  IconArrowUp,
  IconArrowDown,
  IconPlus,
  IconDashboard,
} from "@/components/ui/icons";
import { ArcProgress } from "@/components/ui/arc-progress";
import { DrawdownGauge } from "@/components/ui/drawdown-gauge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppPanel, SectionHeader } from "@/components/ui/page-primitives";

interface PropAccountWithCompliance extends PropAccount {
  compliance?: { profitProgress: number | null };
}

type ChartPeriod = "1W" | "1M" | "3M" | "YTD";
const CHART_PERIODS: ChartPeriod[] = ["1W", "1M", "3M", "YTD"];

// ─── Formatting helpers ─────────────────────────────────────────────────────
function fmt(v: number | null | undefined) {
  if (v == null) return "$0";
  return `$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function signedFmt(v: number) {
  return `${v >= 0 ? "+" : "-"}${fmt(v)}`;
}

// ─── Stat Row — label + value with optional gain/loss color ─────────────────
function StatRow({
  label,
  value,
  isGain,
  mono = false,
}: {
  label: string;
  value: string;
  isGain?: boolean;
  mono?: boolean;
}) {
  const color =
    isGain === true
      ? "var(--profit-primary)"
      : isGain === false
        ? "var(--loss-primary)"
        : "var(--text-primary)";

  return (
    <div
      className="flex items-center justify-between py-2.5"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <span
        className="text-label"
        style={{
          textTransform: "none",
          letterSpacing: 0,
          fontWeight: 500,
          color: "var(--text-secondary)",
          fontSize: "0.78rem",
        }}
      >
        {label}
      </span>
      <span
        className={mono ? "mono" : ""}
        style={{ fontSize: "0.84rem", fontWeight: 600, color }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Stat Card (hero top-row cards) ─────────────────────────────────────────
function StatCard({
  label,
  value,
  secondaryValue,
  trend,
  trendLabel,
  isGain,
  isNeutral = false,
}: {
  label: string;
  value: string;
  secondaryValue?: string;
  trend?: string;
  trendLabel?: string;
  isGain?: boolean;
  isNeutral?: boolean;
}) {
  return (
    <Card className="surface gap-0 border-0 bg-transparent p-0 shadow-none">
      <CardContent className="flex flex-col gap-3 p-5">
        <p className="text-label">{label}</p>

        <p
          className="stat-large leading-none"
          style={{
            color: isNeutral
              ? "var(--text-primary)"
              : isGain === true
                ? "var(--profit-primary)"
                : isGain === false
                  ? "var(--loss-primary)"
                  : "var(--text-primary)",
          }}
        >
          {value}
        </p>

        {secondaryValue && (
          <p
            style={{
              fontSize: "0.72rem",
              color: "var(--text-tertiary)",
            }}
          >
            {secondaryValue}
          </p>
        )}

        {trend && (
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "badge-base flex items-center gap-1",
                isGain ? "badge-profit" : "badge-loss",
              )}
              style={{
                borderRadius: "999px",
                fontSize: "0.63rem",
                padding: "0.18rem 0.6rem",
                fontWeight: 600,
              }}
            >
              {isGain ? (
                <IconArrowUp size={9} strokeWidth={2.5} />
              ) : (
                <IconArrowDown size={9} strokeWidth={2.5} />
              )}
              {trend}
            </span>
            {trendLabel && (
              <span
                style={{ fontSize: "0.68rem", color: "var(--text-tertiary)" }}
              >
                {trendLabel}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Account Card ───────────────────────────────────────────────────────────
function AccountCard({
  account,
  balance,
  username,
}: {
  account: PropAccountWithCompliance | null;
  balance: number;
  username: string;
}) {
  return (
    <Card
      className="surface gap-0 border-0 bg-transparent p-0 shadow-none"
      style={{
        background: `
          radial-gradient(ellipse at 0% 100%, rgba(3,98,76,0.08) 0%, transparent 55%),
          var(--surface)
        `,
        minHeight: "140px",
      }}
    >
      <CardContent className="flex h-full flex-col justify-between p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p
              style={{
                fontWeight: 600,
                fontSize: "0.88rem",
                color: "var(--text-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              {username}
            </p>
            <p
              style={{
                fontSize: "0.62rem",
                color: "var(--text-tertiary)",
                marginTop: "2px",
              }}
            >
              {account?.accountName ?? "All Accounts"}
            </p>
          </div>
          <span className="badge-toggle-on">ON</span>
        </div>

        <div>
          <p className="text-label" style={{ marginBottom: "0.25rem" }}>
            Balance
          </p>
          <p
            className="mono"
            style={{
              fontSize: "1.7rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {fmt(balance)}
          </p>
        </div>

        {/* Decorative mini bars */}
        <div className="mt-3 flex h-8 items-end gap-0.5">
          {[0.4, 0.6, 0.5, 0.75, 0.55, 0.9, 0.7, 0.85, 1.0, 0.8, 0.95, 0.6].map(
            (h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${h * 100}%`,
                  background:
                    i % 3 === 0 ? "rgba(3,98,76,0.55)" : "rgba(3,98,76,0.18)",
                }}
              />
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Inline quick-stat strip inside a card ──────────────────────────────────
function QuickStatStrip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-label" style={{ fontSize: "0.6rem" }}>
        {label}
      </p>
      <p
        className="mono"
        style={{
          fontSize: "0.92rem",
          fontWeight: 600,
          color: color ?? "var(--text-primary)",
        }}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────
function StatSkeleton() {
  return (
    <div className="surface p-5 flex flex-col gap-3">
      <div className="skeleton h-2.5 w-14 rounded" />
      <div className="skeleton h-7 w-24 rounded" />
      <div className="skeleton h-5 w-18 rounded-full" />
    </div>
  );
}

// ─── Dashboard Page ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const { selectedAccountId, propAccounts } = usePropAccount();

  const [stats, setStats] = useState<AnalyticsSummary | null>(null);
  const [todayStats, setTodayStats] = useState<{
    pnl: number;
    trades: number;
  } | null>(null);
  const [propAccount, setPropAccount] =
    useState<PropAccountWithCompliance | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("1M");

  const username = user?.email ? user.email.split("@")[0] : "Trader";
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  useEffect(() => {
    async function load() {
      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }
      try {
        const acct =
          selectedAccountId === "unassigned" ? "unassigned" : selectedAccountId;
        const [analyticsData, todayData] = await Promise.all([
          getAnalyticsSummary(startOfMonth, endOfMonth, acct),
          getTodayStats(acct),
        ]);
        setStats(analyticsData);
        setTodayStats(todayData);

        const targetId =
          selectedAccountId && selectedAccountId !== "unassigned"
            ? selectedAccountId
            : propAccounts[0]?.id;

        if (targetId) {
          const account = propAccounts.find((a) => a.id === targetId);
          if (account) {
            const compliance = await checkCompliance(account.id);
            setPropAccount({
              ...account,
              compliance: { profitProgress: compliance.profitProgress },
            } as PropAccountWithCompliance);
          } else setPropAccount(null);
        } else setPropAccount(null);
      } catch (err) {
        console.error("Dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isConfigured, authLoading, selectedAccountId, propAccounts]);

  const totalPnl = stats?.totalPnl ?? 0;
  const totalIncome = stats ? Math.abs(stats.avgWin) * stats.winningTrades : 0;
  const totalExpense = stats ? Math.abs(stats.avgLoss) * stats.losingTrades : 0;
  const winRate = stats?.winRate ?? 0;
  const balance = Number(propAccount?.currentBalance ?? Math.max(totalPnl, 0));
  const profitFactor =
    stats?.profitFactor === Infinity
      ? "∞"
      : (stats?.profitFactor ?? 0).toFixed(2);

  return (
    <div className="page-root page-sections">
      {/* ── HERO GREETING BAND ────────────────────────────────────── */}
      <header className="stagger-1 flex items-center justify-between gap-4 py-1">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-[10px] shrink-0"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent-primary)",
            }}
          >
            <IconDashboard size={17} strokeWidth={1.8} />
          </div>
          <div>
            <h1
              style={{
                fontWeight: 700,
                fontSize: "1.25rem",
                letterSpacing: "-0.025em",
                color: "var(--text-primary)",
                lineHeight: 1.1,
              }}
            >
              {greeting}, {username}
            </h1>
            <p
              className="text-label mt-0.5"
              style={{ textTransform: "none", letterSpacing: 0 }}
            >
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/analytics">
            <IconAnalytics size={13} strokeWidth={2} />
            Analytics
          </Link>
        </Button>
      </header>

      {/* ── ROW 1: Account card + 3 stat cards ────────────────────── */}
      <section className="stagger-2 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4 2xl:grid-cols-5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <AccountCard
              account={propAccount}
              balance={balance}
              username={username}
            />

            <StatCard
              label="Gross Profit"
              value={fmt(totalIncome)}
              secondaryValue={
                stats ? `${stats.winningTrades} winning trades` : undefined
              }
              trend={winRate > 50 ? `${winRate.toFixed(0)}% WR` : undefined}
              trendLabel={stats ? `${stats.winningTrades} wins` : undefined}
              isGain={true}
            />

            <StatCard
              label="Gross Loss"
              value={fmt(totalExpense)}
              secondaryValue={
                stats ? `${stats.losingTrades} losing trades` : undefined
              }
              trend={
                100 - winRate > 0
                  ? `${(100 - winRate).toFixed(0)}% LR`
                  : undefined
              }
              trendLabel={stats ? `${stats.losingTrades} losses` : undefined}
              isGain={false}
            />

            <StatCard
              label="Net P&L"
              value={fmt(Math.abs(totalPnl))}
              secondaryValue={`PF ${profitFactor}`}
              trend={
                totalPnl !== 0
                  ? totalPnl >= 0
                    ? `+${((totalPnl / Math.max(totalIncome, 1)) * 100).toFixed(1)}%`
                    : `-${((Math.abs(totalPnl) / Math.max(totalExpense, 1)) * 100).toFixed(1)}%`
                  : undefined
              }
              trendLabel="vs last month"
              isGain={totalPnl >= 0}
            />
          </>
        )}
      </section>

      {/* ── ROW 2: Quick stats strip ───────────────────────────────── */}
      {!loading && (
        <section className="stagger-3 surface p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-x divide-[var(--border-subtle)]">
            <QuickStatStrip
              label="Today's P&L"
              value={signedFmt(todayStats?.pnl ?? 0)}
              color={
                (todayStats?.pnl ?? 0) >= 0
                  ? "var(--profit-primary)"
                  : "var(--loss-primary)"
              }
            />
            <div className="pl-4">
              <QuickStatStrip
                label="Win Rate"
                value={`${winRate.toFixed(1)}%`}
                color={
                  winRate > 50
                    ? "var(--profit-primary)"
                    : winRate < 50
                      ? "var(--loss-primary)"
                      : "var(--text-primary)"
                }
              />
            </div>
            <div className="pl-4">
              <QuickStatStrip
                label="Avg R:R"
                value={`${(stats?.avgRMultiple ?? 0).toFixed(2)}R`}
                color={
                  (stats?.avgRMultiple ?? 0) > 1
                    ? "var(--profit-primary)"
                    : "var(--text-secondary)"
                }
              />
            </div>
            <div className="pl-4">
              <QuickStatStrip
                label="Best Trade"
                value={fmt(stats?.largestWin ?? 0)}
                color="var(--profit-primary)"
              />
            </div>
          </div>
        </section>
      )}

      {/* ── ROW 3: Cashflow chart + Statistics donut ──────────────── */}
      <section className="stagger-4 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Cashflow — 2/3 */}
        <AppPanel className="lg:col-span-2 p-6">
          <SectionHeader
            title="Performance"
            subtitle={`Gross Profit vs Loss · ${new Date().getFullYear()}`}
            action={
              <div className="seg-control">
                {CHART_PERIODS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setChartPeriod(p)}
                    className={cn("seg-item", chartPeriod === p && "active")}
                  >
                    {p}
                  </button>
                ))}
              </div>
            }
          />
          <CashflowChart
            propAccountId={selectedAccountId}
            period={chartPeriod}
          />
        </AppPanel>

        {/* Statistics donut — 1/3 */}
        <AppPanel className="p-6 flex flex-col">
          <SectionHeader
            title="Distribution"
            subtitle="Win / Loss / Break-even"
          />
          <StatisticsDonut
            propAccountId={selectedAccountId}
            startDate={startOfMonth}
            endDate={endOfMonth}
            summary={stats}
          />
          {/* Key metrics below donut */}
          <div className="mt-4">
            <StatRow
              label="Profit Factor"
              value={profitFactor}
              isGain={(stats?.profitFactor ?? 0) > 1}
              mono
            />
            <StatRow label="Avg Win" value={fmt(stats?.avgWin)} isGain mono />
            <StatRow
              label="Avg Loss"
              value={fmt(Math.abs(stats?.avgLoss ?? 0))}
              isGain={false}
              mono
            />
            <StatRow
              label="Largest Win"
              value={fmt(stats?.largestWin)}
              isGain
              mono
            />
          </div>
        </AppPanel>
      </section>

      {/* ── ROW 4: Top Strategies + Prop Firm ────────────────────── */}
      <section className="stagger-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Top Strategies */}
        <AppPanel className="p-6">
          <SectionHeader
            title="Top Strategies"
            subtitle="Performance by playbook"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/playbooks">View all →</Link>
              </Button>
            }
          />
          <TopPlaybooks propAccountId={selectedAccountId} />
        </AppPanel>

        {/* Prop Firm Card */}
        <AppPanel className="p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent-primary)",
                }}
              >
                <IconPropFirm size={15} strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="headline-md">
                  {propAccount?.accountName ?? "Prop Firm"}
                </h2>
                <p
                  className="text-label mt-0.5"
                  style={{ textTransform: "none", letterSpacing: 0 }}
                >
                  {propAccount
                    ? `${fmt(Number(propAccount.accountSize))} funded account`
                    : "Add a prop account below"}
                </p>
              </div>
            </div>
            {propAccount && (
              <span
                className="badge-accent capitalize"
                style={{ borderRadius: "999px", fontSize: "0.64rem" }}
              >
                {propAccount.status}
              </span>
            )}
          </div>

          {propAccount ? (
            <div className="space-y-5">
              <div className="flex items-center gap-5">
                <ArcProgress
                  percent={propAccount.compliance?.profitProgress ?? 0}
                />
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-label mb-0.5">Current Balance</p>
                    <p className="stat-medium">
                      {fmt(Number(propAccount.currentBalance ?? 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-label mb-0.5">Profit Target</p>
                    <p className="stat-medium profit">
                      {propAccount.compliance?.profitProgress != null
                        ? fmt(propAccount.compliance.profitProgress)
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="space-y-3"
                style={{
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: "1rem",
                }}
              >
                <DrawdownGauge label="Daily Drawdown" used={0} max={5} />
                <DrawdownGauge label="Total Drawdown" used={0} max={10} />
              </div>
            </div>
          ) : (
            <div className="py-8">
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "var(--accent-soft)" }}
              >
                <IconAnalytics
                  size={20}
                  className="text-[var(--accent-primary)]"
                />
              </div>
              <p
                style={{ color: "var(--text-secondary)", fontSize: "0.83rem" }}
              >
                No prop account linked
              </p>
              <p
                style={{
                  color: "var(--text-tertiary)",
                  fontSize: "0.72rem",
                  marginTop: "0.25rem",
                }}
              >
                Add your funded account to track compliance
              </p>
              <Button asChild className="mt-4">
                <Link href="/prop-firm">
                  <IconPlus size={13} strokeWidth={2} />
                  Add Account
                </Link>
              </Button>
            </div>
          )}
        </AppPanel>
      </section>

      {/* ── ROW 5: Recent Trades ───────────────────────────────────── */}
      <AppPanel className="p-6">
        <SectionHeader
          title="Recent Trades"
          subtitle="Latest trading activity"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/analytics">View analytics →</Link>
            </Button>
          }
        />
        <RecentTrades propAccountId={selectedAccountId} />
      </AppPanel>

      {/* ── ROW 6: Trading Calendar ────────────────────────────────── */}
      <AppPanel id="calendar" className="scroll-mt-8 p-6">
        <SectionHeader title="Trading Calendar" subtitle="Daily P&L overview" />
        <TradingCalendar embedded />
      </AppPanel>
    </div>
  );
}
