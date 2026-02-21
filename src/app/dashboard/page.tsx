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
import { checkCompliance } from "@/lib/api/prop-accounts";
import type { PropAccount } from "@/lib/supabase/types";
import {
  IconAnalytics,
  IconPropFirm,
  IconArrowUp,
  IconArrowDown,
  IconPlus,
} from "@/components/ui/icons";
import { ArcProgress } from "@/components/ui/arc-progress";
import { DrawdownGauge } from "@/components/ui/drawdown-gauge";

interface PropAccountWithCompliance extends PropAccount {
  compliance?: { profitProgress: number | null };
}

type ChartPeriod = "1W" | "1M" | "3M" | "YTD";
const CHART_PERIODS: ChartPeriod[] = ["1W", "1M", "3M", "YTD"];

function fmt(v: number | null | undefined) {
  if (v == null) return "$0";
  return `$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function signedFmt(v: number) {
  return `${v >= 0 ? "+" : "-"}${fmt(v)}`;
}

// ─── CONIYEST-style stat card (label → big number → trend badge) ───────────
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
    <article className="surface p-5 flex flex-col gap-2.5">
      {/* Eyebrow label */}
      <p className="text-label">{label}</p>

      {/* Big number */}
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

      {/* Secondary value (e.g. "last month $35,568") */}
      {secondaryValue && (
        <p
          style={{
            fontSize: "0.68rem",
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-dm-sans)",
          }}
        >
          {secondaryValue}
        </p>
      )}

      {/* Trend badge + hint */}
      {trend && (
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "badge-base flex items-center gap-1",
              isGain ? "badge-profit" : "badge-loss",
            )}
            style={{
              borderRadius: "999px",
              fontSize: "0.64rem",
              padding: "0.18rem 0.55rem",
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
              style={{
                fontSize: "0.68rem",
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              {trendLabel}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

// ─── AccountCard — JAMIE SMITH equivalent ──────────────────────────────────
// Matches: account name + "Balance" label + big dollar + mini grid lines + ON badge
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
    <article
      className="surface p-5 flex flex-col justify-between"
      style={{
        background: `
          radial-gradient(ellipse at 0% 100%, rgba(78,203,6,0.10) 0%, transparent 55%),
          var(--surface)
        `,
        minHeight: "140px",
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        {/* Name + account */}
        <div>
          <p
            style={{
              fontFamily: "var(--font-dm-sans)",
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
            {account?.name ?? "All Accounts"}
          </p>
        </div>
        {/* ON badge — like the green pill toggle in reference */}
        <span className="badge-toggle-on">ON</span>
      </div>

      {/* Balance */}
      <div>
        <p className="text-label" style={{ marginBottom: "0.25rem" }}>
          Balance
        </p>
        <p
          style={{
            fontFamily: "var(--font-jb-mono)",
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

      {/* Mini chart lines — decorative, like in reference */}
      <div className="mt-3 flex items-end gap-0.5 h-8">
        {[0.4, 0.6, 0.5, 0.75, 0.55, 0.9, 0.7, 0.85, 1.0, 0.8, 0.95, 0.6].map(
          (h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${h * 100}%`,
                background:
                  i % 3 === 0 ? "rgba(78,203,6,0.6)" : "rgba(78,203,6,0.2)",
              }}
            />
          ),
        )}
      </div>
    </article>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────
function StatSkeleton() {
  return (
    <div className="surface p-5 flex flex-col gap-3">
      <div className="skeleton h-2.5 w-14 rounded" />
      <div className="skeleton h-7 w-24 rounded" />
      <div className="skeleton h-5 w-18 rounded-full" />
    </div>
  );
}

// ─── Dashboard Page ────────────────────────────────────────────────────────
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

        // Resolve prop account to show
        const targetId =
          selectedAccountId && selectedAccountId !== "unassigned"
            ? selectedAccountId
            : propAccounts[0]?.id;

        if (targetId) {
          const account = propAccounts.find(
            (a: PropAccount) => a.id === targetId,
          );
          if (account) {
            const compliance = await checkCompliance(account.id);
            setPropAccount({
              ...account,
              compliance: { profitProgress: compliance.profitProgress },
            });
          } else setPropAccount(null);
        } else setPropAccount(null);
      } catch (err) {
        console.error("Dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) load();
  }, [user, isConfigured, authLoading, selectedAccountId, propAccounts]);

  const totalPnl = stats?.totalPnl ?? 0;
  const totalIncome = stats ? Math.abs(stats.avgWin) * stats.winningTrades : 0;
  const totalExpense = stats ? Math.abs(stats.avgLoss) * stats.losingTrades : 0;
  const winRate = stats?.winRate ?? 0;
  const balance = propAccount?.current_balance ?? Math.max(totalPnl, 0);

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 lg:space-y-5 max-w-[1280px]">
      {/* ───────── Row 1: Account card + 3 stat cards ───────── */}
      <section className="stagger-1 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            {/* JAMIE SMITH equivalent */}
            <AccountCard
              account={propAccount}
              balance={balance}
              username={username}
            />

            {/* Gross Profit */}
            <StatCard
              label="Gross Profit"
              value={fmt(totalIncome)}
              secondaryValue={
                stats ? `last month ${fmt(totalIncome)}` : undefined
              }
              trend={winRate > 50 ? `${winRate.toFixed(0)}% WR` : undefined}
              trendLabel={stats ? `${stats.winningTrades} wins` : undefined}
              isGain={true}
            />

            {/* Gross Loss */}
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

            {/* Net P&L */}
            <StatCard
              label="Net P&L"
              value={fmt(Math.abs(totalPnl))}
              secondaryValue={`profit factor ${stats?.profitFactor === Infinity ? "∞" : (stats?.profitFactor ?? 0).toFixed(2)}`}
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

      {/* ───────── Row 2: Cashflow (bars) + Statistics (donut) ───────── */}
      <section className="stagger-2 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Cashflow chart — 2/3 width */}
        <article className="surface p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="headline-md">Performance</h2>
              <p
                style={{
                  color: "var(--text-tertiary)",
                  fontSize: "0.73rem",
                  marginTop: "0.2rem",
                }}
              >
                Gross Profit vs Loss · {new Date().getFullYear()}
              </p>
            </div>
            {/* Period toggle */}
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
          </div>
          <CashflowChart
            propAccountId={selectedAccountId}
            period={chartPeriod}
          />
        </article>

        {/* Statistics donut — 1/3 */}
        <article className="surface p-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="headline-md">Trade Distribution</h2>
              <p
                style={{
                  color: "var(--text-tertiary)",
                  fontSize: "0.73rem",
                  marginTop: "0.2rem",
                }}
              >
                Win/Loss Ratio
              </p>
            </div>
          </div>
          <StatisticsDonut
            propAccountId={selectedAccountId}
            startDate={startOfMonth}
            endDate={endOfMonth}
          />
        </article>
      </section>

      {/* ───────── Row 3: Daily quick stats ───────── */}
      <section className="stagger-3 grid grid-cols-2 gap-4 md:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : [
              {
                label: "Today's P&L",
                value: signedFmt(todayStats?.pnl ?? 0),
                isGain: (todayStats?.pnl ?? 0) >= 0,
              },
              {
                label: "Win Rate",
                value: `${winRate.toFixed(1)}%`,
                isGain: winRate > 50,
                isNeutral: winRate === 50,
              },
              {
                label: "Avg R:R",
                value: `${(stats?.avgRMultiple ?? 0).toFixed(2)}R`,
                isGain: (stats?.avgRMultiple ?? 0) > 1,
              },
              {
                label: "Best Trade",
                value: fmt(stats?.largestWin ?? 0),
                isGain: true,
              },
            ].map((item) => (
              <StatCard
                key={item.label}
                label={item.label}
                value={item.value}
                isGain={item.isGain}
                isNeutral={item.isNeutral}
              />
            ))}
      </section>

      {/* ───────── Row 4: Top Strategies + Prop Firm ───────── */}
      <section className="stagger-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Top Strategies */}
        <article className="surface p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="headline-md">Top Strategies</h2>
              <p
                style={{
                  color: "var(--text-tertiary)",
                  fontSize: "0.73rem",
                  marginTop: "0.2rem",
                }}
              >
                Performance by playbook
              </p>
            </div>
            <Link
              href="/playbooks"
              style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--accent-primary)",
                opacity: 0.8,
              }}
              className="hover:opacity-100 transition-opacity"
            >
              View all →
            </Link>
          </div>
          <TopPlaybooks propAccountId={selectedAccountId} />
        </article>

        {/* Prop Firm card */}
        <article className="surface-accent p-6">
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
                  {propAccount?.name ?? "No Account"}
                </h2>
                <p
                  style={{
                    color: "var(--text-tertiary)",
                    fontSize: "0.73rem",
                    marginTop: "0.15rem",
                  }}
                >
                  {propAccount
                    ? `${fmt(propAccount.initial_balance)} funded`
                    : "Add a prop account"}
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
                      {fmt(propAccount.current_balance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-label mb-0.5">Profit Target</p>
                    <p className="stat-medium profit">
                      {propAccount.profit_target
                        ? fmt(propAccount.profit_target)
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
                <DrawdownGauge
                  label="Daily Drawdown"
                  used={propAccount.daily_dd_current ?? 0}
                  max={propAccount.daily_dd_max ?? 5}
                />
                <DrawdownGauge
                  label="Total Drawdown"
                  used={propAccount.total_dd_current ?? 0}
                  max={propAccount.total_dd_max ?? 10}
                />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <div
                className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
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
                No prop account selected
              </p>
              <Link
                href="/prop-firm"
                className="btn-primary btn-base mt-4 inline-flex"
              >
                <IconPlus size={13} strokeWidth={2} />
                Add Account
              </Link>
            </div>
          )}
        </article>
      </section>

      {/* ───────── Row 5: Recent Transactions ───────── */}
      <section className="stagger-5 surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="headline-md">Recent Transactions</h2>
            <p
              style={{
                color: "var(--text-tertiary)",
                fontSize: "0.73rem",
                marginTop: "0.2rem",
              }}
            >
              Latest trading activity
            </p>
          </div>
          <Link
            href="/analytics"
            className="btn-ghost btn-base flex items-center gap-1.5 text-[0.76rem]"
          >
            View analytics →
          </Link>
        </div>
        <RecentTrades propAccountId={selectedAccountId} />
      </section>

      {/* ───────── Row 6: Calendar ───────── */}
      <section id="calendar" className="stagger-6 scroll-mt-8 surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="headline-md">Trading Calendar</h2>
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.73rem" }}>
            Daily P&L overview
          </p>
        </div>
        <TradingCalendar embedded />
      </section>
    </div>
  );
}
