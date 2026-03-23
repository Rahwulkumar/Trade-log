'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { TradingCalendar } from '@/components/calendar';
import { useAuth } from '@/components/auth-provider';
import { usePropAccount } from '@/components/prop-account-provider';
import { CashflowChart } from '@/components/dashboard/cashflow-chart';
import { RecentTrades } from '@/components/dashboard/recent-trades';
import { StatisticsDonut } from '@/components/dashboard/statistics-donut';
import { TodayPlanWidget } from '@/components/dashboard/today-plan-widget';
import { TopPlaybooks } from '@/components/dashboard/playbooks-widget';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArcProgress } from '@/components/ui/arc-progress';
import { DrawdownGauge } from '@/components/ui/drawdown-gauge';
import {
  AppPanel,
  SectionHeader,
} from '@/components/ui/page-primitives';
import {
  IconAnalytics,
  IconArrowDown,
  IconArrowUp,
  IconDashboard,
  IconPlus,
  IconPropFirm,
} from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { getAnalyticsPayloadClient } from '@/lib/api/client/analytics';
import {
  getAllPlaybooksWithStats,
  type PlaybookStats,
} from '@/lib/api/client/playbooks';
import { getPropFirmChallenge, type PropFirmChallengeDetails } from '@/lib/api/client/prop-firm-challenges';
import { getTrades } from '@/lib/api/client/trades';
import type { AnalyticsPayload } from '@/lib/analytics/types';
import type { PropAccount, Trade } from '@/lib/db/schema';

type ChartPeriod = '1W' | '1M' | '3M' | 'YTD';

const CHART_PERIODS: ChartPeriod[] = ['1W', '1M', '3M', 'YTD'];

function fmt(value: number | null | undefined) {
  const safe = Number(value ?? 0);
  return `$${safe.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtAbs(value: number | null | undefined) {
  return fmt(Math.abs(Number(value ?? 0)));
}

function signedFmt(value: number) {
  return `${value >= 0 ? '+' : '-'}${fmtAbs(value)}`;
}

function toDateInput(date: Date) {
  return date.toISOString().split('T')[0];
}

function formatScopeLabel(from: string, to: string) {
  const fromLabel = new Date(`${from}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const toLabel = new Date(`${to}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return `${fromLabel} - ${toLabel}`;
}

function chartPeriodLabel(period: ChartPeriod) {
  switch (period) {
    case '1W':
      return 'Last 7 days';
    case '3M':
      return 'Last 3 months';
    case 'YTD':
      return 'Year to date';
    default:
      return 'Last 30 days';
  }
}

function getChartRange(period: ChartPeriod, referenceNow: Date) {
  const endDate = toDateInput(referenceNow);
  let startDate: string;

  switch (period) {
    case '1W': {
      const start = new Date(referenceNow);
      start.setDate(referenceNow.getDate() - 7);
      startDate = toDateInput(start);
      break;
    }
    case '3M': {
      const start = new Date(referenceNow);
      start.setMonth(referenceNow.getMonth() - 3);
      startDate = toDateInput(start);
      break;
    }
    case 'YTD':
      startDate = toDateInput(new Date(referenceNow.getFullYear(), 0, 1));
      break;
    default: {
      const start = new Date(referenceNow);
      start.setMonth(referenceNow.getMonth() - 1);
      startDate = toDateInput(start);
      break;
    }
  }

  return { startDate, endDate };
}

function monthDeltaLabel(current: number, previous: number | null) {
  if (previous == null) return undefined;
  return signedFmt(current - previous);
}

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
      ? 'var(--profit-primary)'
      : isGain === false
        ? 'var(--loss-primary)'
        : 'var(--text-primary)';

  return (
    <div
      className="flex items-center justify-between py-2.5"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <span
        className="text-label"
        style={{
          textTransform: 'none',
          letterSpacing: 0,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          fontSize: '0.78rem',
        }}
      >
        {label}
      </span>
      <span
        className={mono ? 'mono' : ''}
        style={{ fontSize: '0.84rem', fontWeight: 600, color }}
      >
        {value}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  secondaryValue,
  trend,
  trendLabel,
  isGain,
  trendIsPositive,
  isNeutral = false,
}: {
  label: string;
  value: string;
  secondaryValue?: string;
  trend?: string;
  trendLabel?: string;
  isGain?: boolean;
  trendIsPositive?: boolean;
  isNeutral?: boolean;
}) {
  const trendPositive = trendIsPositive ?? isGain ?? false;

  return (
    <Card className="surface gap-0 border-0 bg-transparent p-0 shadow-none">
      <CardContent className="flex flex-col gap-3 p-5">
        <p className="text-label">{label}</p>

        <p
          className="stat-large"
          style={{
            color: isNeutral
              ? 'var(--text-primary)'
              : isGain === true
                ? 'var(--profit-primary)'
                : isGain === false
                  ? 'var(--loss-primary)'
                  : 'var(--text-primary)',
          }}
        >
          {value}
        </p>

        {secondaryValue && (
          <p
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-tertiary)',
            }}
          >
            {secondaryValue}
          </p>
        )}

        {trend && (
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'badge-base flex items-center gap-1',
                trendPositive ? 'badge-profit' : 'badge-loss',
              )}
              style={{
                borderRadius: '999px',
                fontSize: '0.63rem',
                padding: '0.18rem 0.6rem',
                fontWeight: 600,
              }}
            >
              {trendPositive ? (
                <IconArrowUp size={9} strokeWidth={2.5} />
              ) : (
                <IconArrowDown size={9} strokeWidth={2.5} />
              )}
              {trend}
            </span>
            {trendLabel && (
              <span
                style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}
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

function AccountCard({
  account,
  username,
  scopeLabel,
  scopeBadge,
}: {
  account: PropAccount | null;
  username: string;
  scopeLabel: string;
  scopeBadge: string;
}) {
  const hasAccount = Boolean(account);
  const balanceValue = hasAccount
    ? fmt(Number(account?.currentBalance ?? account?.accountSize ?? 0))
    : scopeLabel;
  const accountSizeValue = hasAccount
    ? fmt(Number(account?.accountSize ?? 0))
    : null;

  return (
    <Card
      className="surface gap-0 border-0 bg-transparent p-0 shadow-none"
      style={{
        background: `
          radial-gradient(ellipse at 0% 100%, color-mix(in srgb, var(--accent-primary) 18%, transparent) 0%, transparent 55%),
          var(--surface)
        `,
        minHeight: '140px',
      }}
    >
      <CardContent className="flex h-full flex-col justify-between p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p
              style={{
                fontWeight: 600,
                fontSize: '0.88rem',
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                lineHeight: 1.18,
              }}
            >
              {username}
            </p>
            <p
              style={{
                fontSize: '0.62rem',
                color: 'var(--text-tertiary)',
                marginTop: '2px',
              }}
            >
              {hasAccount ? account?.accountName : scopeLabel}
            </p>
          </div>
          <span className={hasAccount ? 'badge-accent capitalize' : 'badge-toggle-on'}>
            {hasAccount ? account?.status : scopeBadge}
          </span>
        </div>

        <div>
          <p className="text-label" style={{ marginBottom: '0.25rem' }}>
            {hasAccount ? 'Balance' : 'Scope'}
          </p>
          <p
            className="mono"
            style={{
              fontSize: '1.7rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.14,
              letterSpacing: '-0.02em',
            }}
          >
            {balanceValue}
          </p>
          {hasAccount && accountSizeValue ? (
            <p
              style={{
                marginTop: '0.3rem',
                fontSize: '0.68rem',
                color: 'var(--text-tertiary)',
              }}
            >
              Account size {accountSizeValue}
            </p>
          ) : null}
        </div>

        <div className="mt-3 flex h-8 items-end gap-0.5">
          {[0.4, 0.6, 0.5, 0.75, 0.55, 0.9, 0.7, 0.85, 1.0, 0.8, 0.95, 0.6].map(
            (height, index) => (
              <div
                key={index}
                className="flex-1 rounded-sm"
                style={{
                  height: `${height * 100}%`,
                  background:
                    index % 3 === 0
                      ? 'color-mix(in srgb, var(--accent-primary) 55%, transparent)'
                      : 'color-mix(in srgb, var(--accent-primary) 20%, transparent)',
                }}
              />
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}

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
      <p className="text-label" style={{ fontSize: '0.6rem' }}>
        {label}
      </p>
      <p
        className="mono"
        style={{
          fontSize: '0.92rem',
          fontWeight: 600,
          color: color ?? 'var(--text-primary)',
        }}
      >
        {value}
      </p>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="surface p-5 flex flex-col gap-3">
      <div className="skeleton h-2.5 w-14 rounded" />
      <div className="skeleton h-7 w-24 rounded" />
      <div className="skeleton h-5 w-18 rounded-full" />
    </div>
  );
}

export default function DashboardPage() {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const { selectedAccountId, propAccounts } = usePropAccount();

  const [currentMonthAnalytics, setCurrentMonthAnalytics] =
    useState<AnalyticsPayload | null>(null);
  const [previousMonthAnalytics, setPreviousMonthAnalytics] =
    useState<AnalyticsPayload | null>(null);
  const [todayAnalytics, setTodayAnalytics] =
    useState<AnalyticsPayload | null>(null);
  const [selectedAccountAnalytics, setSelectedAccountAnalytics] =
    useState<AnalyticsPayload | null>(null);
  const [selectedChallenge, setSelectedChallenge] =
    useState<PropFirmChallengeDetails | null>(null);
  const [recentTrades, setRecentTrades] = useState<Trade[] | null>(null);
  const [chartTrades, setChartTrades] = useState<Trade[] | null>(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [topPlaybooks, setTopPlaybooks] = useState<PlaybookStats[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('1M');
  const [referenceNow] = useState(() => new Date());

  const username = user?.email ? user.email.split('@')[0] : 'Trader';
  const {
    startOfMonth,
    endOfMonth,
    startOfPreviousMonth,
    endOfPreviousMonth,
    today,
    chartRange,
  } = useMemo(() => {
    return {
      startOfMonth: toDateInput(
        new Date(referenceNow.getFullYear(), referenceNow.getMonth(), 1),
      ),
      endOfMonth: toDateInput(
        new Date(referenceNow.getFullYear(), referenceNow.getMonth() + 1, 0),
      ),
      startOfPreviousMonth: toDateInput(
        new Date(referenceNow.getFullYear(), referenceNow.getMonth() - 1, 1),
      ),
      endOfPreviousMonth: toDateInput(
        new Date(referenceNow.getFullYear(), referenceNow.getMonth(), 0),
      ),
      today: toDateInput(referenceNow),
      chartRange: getChartRange(chartPeriod, referenceNow),
    };
  }, [chartPeriod, referenceNow]);

  const greeting = (() => {
    const hour = referenceNow.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const scopeParam =
    selectedAccountId === 'unassigned'
      ? 'unassigned'
      : selectedAccountId ?? 'all';

  const selectedPropAccount = useMemo(() => {
    if (!selectedAccountId || selectedAccountId === 'unassigned') {
      return null;
    }
    return propAccounts.find((account) => account.id === selectedAccountId) ?? null;
  }, [propAccounts, selectedAccountId]);
  const selectedPropAccountId = selectedPropAccount?.id ?? null;
  const selectedChallengeId = selectedPropAccount?.challengeId ?? null;

  useEffect(() => {
    async function load() {
      if (!isConfigured || !userId) {
        setLoading(false);
        return;
      }

      try {
        const challengePromise =
          selectedChallengeId
            ? getPropFirmChallenge(selectedChallengeId)
            : Promise.resolve(null);

        const [
          currentMonth,
          previousMonth,
          todayPayload,
          accountPayload,
          tradesData,
          playbooksData,
          challengeData,
        ] = await Promise.all([
          getAnalyticsPayloadClient({
            account: scopeParam,
            from: startOfMonth,
            to: endOfMonth,
          }),
          getAnalyticsPayloadClient({
            account: scopeParam,
            from: startOfPreviousMonth,
            to: endOfPreviousMonth,
          }),
          getAnalyticsPayloadClient({
            account: scopeParam,
            from: today,
            to: today,
          }),
          selectedPropAccountId
            ? getAnalyticsPayloadClient({ account: selectedPropAccountId })
            : Promise.resolve(null),
          getTrades({
            status: 'closed',
            propAccountId:
              selectedAccountId === 'unassigned'
                ? 'unassigned'
                : selectedAccountId ?? undefined,
            limit: 5,
            sortBy: 'exitDate',
            sortOrder: 'desc',
          }),
          getAllPlaybooksWithStats(
            selectedAccountId === 'unassigned'
              ? 'unassigned'
              : selectedAccountId,
          ).then((data) => data.sort((left, right) => right.totalPnl - left.totalPnl).slice(0, 4)),
          challengePromise,
        ]);

        setCurrentMonthAnalytics(currentMonth);
        setPreviousMonthAnalytics(previousMonth);
        setTodayAnalytics(todayPayload);
        setSelectedAccountAnalytics(accountPayload);
        setRecentTrades(tradesData);
        setTopPlaybooks(playbooksData);
        setSelectedChallenge(challengeData);
      } catch (error) {
        console.error('Dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      load();
    }
  }, [
    authLoading,
    endOfMonth,
    endOfPreviousMonth,
    isConfigured,
    scopeParam,
    selectedAccountId,
    selectedChallengeId,
    selectedPropAccountId,
    startOfMonth,
    startOfPreviousMonth,
    today,
    userId,
  ]);

  useEffect(() => {
    async function loadChartTrades() {
      if (authLoading) return;
      if (!isConfigured || !userId) {
        setChartTrades([]);
        setChartLoading(false);
        return;
      }

      try {
        setChartLoading(true);
        const trades = await getTrades({
          propAccountId:
            selectedAccountId === 'unassigned'
              ? 'unassigned'
              : selectedAccountId ?? undefined,
          startDate: chartRange.startDate,
          endDate: chartRange.endDate,
        });
        setChartTrades(trades);
      } catch (error) {
        console.error('Dashboard chart trades:', error);
        setChartTrades([]);
      } finally {
        setChartLoading(false);
      }
    }

    void loadChartTrades();
  }, [
    authLoading,
    chartRange.endDate,
    chartRange.startDate,
    isConfigured,
    selectedAccountId,
    userId,
  ]);

  const summary = currentMonthAnalytics?.summary ?? null;
  const totalPnl = summary?.totalNetPnl ?? 0;
  const totalIncome = summary ? summary.avgWin * summary.winningTrades : 0;
  const totalExpense = summary ? summary.avgLoss * summary.losingTrades : 0;
  const winRate = summary?.winRate ?? 0;
  const previousMonthNetPnl = previousMonthAnalytics?.summary.totalNetPnl ?? null;
  const monthDeltaValue =
    previousMonthNetPnl == null ? null : totalPnl - previousMonthNetPnl;
  const monthDelta = monthDeltaLabel(
    totalPnl,
    previousMonthNetPnl,
  );
  const monthScopeLabel = formatScopeLabel(startOfMonth, endOfMonth);
  const accountScopeLabel =
    selectedAccountId === 'unassigned'
      ? 'Unassigned trades'
      : selectedPropAccount?.accountName ?? 'All accounts';
  const accountScopeBadge =
    selectedAccountId === 'unassigned' ? 'UNASSIGNED' : 'ALL';

  const profitFactor =
    summary?.profitFactor == null
      ? '--'
      : summary.profitFactor === Infinity
        ? 'INF'
        : summary.profitFactor.toFixed(2);

  const challengeInitialBalance = Number(
    selectedChallenge?.initial_balance ??
      selectedPropAccount?.accountSize ??
      0,
  );
  const currentBalance = Number(
    selectedPropAccount?.currentBalance ??
      selectedPropAccount?.accountSize ??
      selectedChallenge?.initial_balance ??
      0,
  );
  const profitTargetPercent = selectedChallenge?.profit_target_percent ?? null;
  const profitTargetAmount =
    profitTargetPercent != null
      ? (challengeInitialBalance * profitTargetPercent) / 100
      : null;
  const profitProgressAmount = Math.max(0, currentBalance - challengeInitialBalance);
  const profitProgressPercent =
    profitTargetAmount && profitTargetAmount > 0
      ? Math.min((profitProgressAmount / profitTargetAmount) * 100, 100)
      : 0;

  const dailyLimitPercent =
    selectedChallenge?.daily_loss_percent ??
    (selectedChallenge?.daily_loss_amount != null && challengeInitialBalance > 0
      ? (selectedChallenge.daily_loss_amount / challengeInitialBalance) * 100
      : null);
  const totalLimitPercent =
    selectedChallenge?.max_loss_percent ??
    (selectedChallenge?.max_loss_amount != null && challengeInitialBalance > 0
      ? (selectedChallenge.max_loss_amount / challengeInitialBalance) * 100
      : null);

  const todayLossUsedPercent =
    todayAnalytics && challengeInitialBalance > 0
      ? Math.max(0, -todayAnalytics.summary.totalNetPnl / challengeInitialBalance) * 100
      : 0;
  const totalLossUsedPercent =
    challengeInitialBalance > 0
      ? Math.max(0, (challengeInitialBalance - currentBalance) / challengeInitialBalance) * 100
      : 0;
  const hasChallengeRules =
    dailyLimitPercent != null || totalLimitPercent != null;
  const approachingLossLimit =
    (dailyLimitPercent != null &&
      dailyLimitPercent > 0 &&
      todayLossUsedPercent / dailyLimitPercent >= 0.8) ||
    (totalLimitPercent != null &&
      totalLimitPercent > 0 &&
      totalLossUsedPercent / totalLimitPercent >= 0.8);

  return (
    <div className="page-root page-sections">
      <header className="stagger-1 flex items-center justify-between gap-4 py-1">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-[10px] shrink-0"
            style={{
              background: 'var(--accent-soft)',
              color: 'var(--accent-primary)',
            }}
          >
            <IconDashboard size={17} strokeWidth={1.8} />
          </div>
          <div>
            <h1
              style={{
                fontWeight: 700,
                fontSize: '1.25rem',
                letterSpacing: '-0.025em',
                color: 'var(--text-primary)',
                lineHeight: 1.22,
              }}
            >
              {greeting}, {username}
            </h1>
            <p
              className="text-label mt-0.5"
              style={{ textTransform: 'none', letterSpacing: 0 }}
            >
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/analytics?account=${scopeParam}`}>
            <IconAnalytics size={13} strokeWidth={2} />
            Analytics
          </Link>
        </Button>
      </header>

      <section className="stagger-2 space-y-3">
        {!loading && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="badge-accent rounded-full px-2.5 py-1">
              This month
            </span>
            <span style={{ color: 'var(--text-tertiary)' }}>
              {monthScopeLabel} - {accountScopeLabel}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => <StatSkeleton key={index} />)
          ) : (
            <>
              <AccountCard
                account={selectedPropAccount}
                username={username}
                scopeLabel={accountScopeLabel}
                scopeBadge={accountScopeBadge}
              />

              <StatCard
                label="Gross Profit"
                value={fmtAbs(totalIncome)}
                secondaryValue={
                  summary
                    ? `${summary.winningTrades} winning trades - ${winRate.toFixed(0)}% win rate`
                    : undefined
                }
                isGain
              />

              <StatCard
                label="Gross Loss"
                value={fmtAbs(totalExpense)}
                secondaryValue={
                  summary
                    ? `${summary.losingTrades} losing trades - ${(100 - winRate).toFixed(0)}% loss rate`
                    : undefined
                }
                isGain={false}
              />

              <StatCard
                label="Net P&L"
                value={signedFmt(totalPnl)}
                secondaryValue={`PF ${profitFactor}`}
                trend={monthDelta}
                trendLabel="vs last month"
                isGain={totalPnl >= 0}
                trendIsPositive={monthDeltaValue == null ? undefined : monthDeltaValue >= 0}
              />
            </>
          )}
        </div>
      </section>

      {!loading && (
        <section className="stagger-3 surface p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
              Today only
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Monthly cards above use {monthScopeLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 divide-x divide-[var(--border-subtle)] sm:grid-cols-4">
            <QuickStatStrip
              label="Today's P&L"
              value={signedFmt(todayAnalytics?.summary.totalNetPnl ?? 0)}
              color={
                (todayAnalytics?.summary.totalNetPnl ?? 0) >= 0
                  ? 'var(--profit-primary)'
                  : 'var(--loss-primary)'
              }
            />
            <div className="pl-4">
              <QuickStatStrip
                label="Win Rate"
                value={`${winRate.toFixed(1)}%`}
                color={
                  winRate >= 55
                    ? 'var(--profit-primary)'
                    : winRate >= 45
                      ? 'var(--warning-primary)'
                      : 'var(--loss-primary)'
                }
              />
            </div>
            <div className="pl-4">
              <QuickStatStrip
                label="Avg Realized R"
                value={`${(summary?.avgRMultiple ?? 0).toFixed(2)}R`}
                color={
                  (summary?.avgRMultiple ?? 0) >= 0
                    ? 'var(--profit-primary)'
                    : 'var(--loss-primary)'
                }
              />
            </div>
            <div className="pl-4">
              <QuickStatStrip
                label="Best Trade"
                value={fmt(summary?.largestWin ?? 0)}
                color="var(--profit-primary)"
              />
            </div>
          </div>
        </section>
      )}

      <section className="stagger-4 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <AppPanel className="p-6 lg:col-span-2">
          <SectionHeader
            title="Performance"
            subtitle={`Gross profit vs gross loss - ${chartPeriodLabel(chartPeriod)}`}
            action={
              <div className="seg-control">
                {CHART_PERIODS.map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setChartPeriod(period)}
                    className={cn('seg-item', chartPeriod === period && 'active')}
                  >
                    {period}
                  </button>
                ))}
              </div>
            }
          />
          <CashflowChart
            trades={chartTrades}
            loading={chartLoading}
            period={chartPeriod}
          />
        </AppPanel>

        <AppPanel className="flex flex-col p-6">
          <SectionHeader
            title="Distribution"
            subtitle={`Win / Loss / Break-even - ${monthScopeLabel}`}
          />
          <StatisticsDonut
            propAccountId={selectedAccountId}
            startDate={startOfMonth}
            endDate={endOfMonth}
            summary={summary}
          />
          <div className="mt-4">
            <StatRow
              label="Profit Factor"
              value={profitFactor}
              isGain={(summary?.profitFactor ?? 0) > 1}
              mono
            />
            <StatRow label="Avg Win" value={fmt(summary?.avgWin)} isGain mono />
            <StatRow
              label="Avg Loss"
              value={fmtAbs(summary?.avgLoss ?? 0)}
              isGain={false}
              mono
            />
            <StatRow
              label="Largest Win"
              value={fmt(summary?.largestWin)}
              isGain
              mono
            />
          </div>
        </AppPanel>
      </section>

      <section className="stagger-5">
        <TodayPlanWidget />
      </section>

      <section className="stagger-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AppPanel className="p-6">
          <SectionHeader
            title="Top Strategies"
            subtitle="Performance by playbook"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/playbooks">View all {'->'}</Link>
              </Button>
            }
          />
          <TopPlaybooks
            propAccountId={selectedAccountId}
            initialPlaybooks={topPlaybooks ?? undefined}
          />
        </AppPanel>

        <AppPanel className="p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]"
                style={{
                  background: 'var(--accent-soft)',
                  color: 'var(--accent-primary)',
                }}
              >
                <IconPropFirm size={15} strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="headline-md">
                  {selectedPropAccount?.accountName ?? 'Prop Firm'}
                </h2>
                <p
                  className="text-label mt-0.5"
                  style={{ textTransform: 'none', letterSpacing: 0 }}
                >
                  {selectedPropAccount
                    ? `${fmt(challengeInitialBalance)} challenge balance - ${selectedChallenge?.firm?.name ?? selectedPropAccount.firmName ?? 'Prop'}`
                    : propAccounts.length > 0
                      ? 'Select a specific prop account to view compliance'
                      : 'Add a prop account to track compliance'}
                </p>
              </div>
            </div>
            {selectedPropAccount && (
              <span
                className="badge-accent capitalize"
                style={{ borderRadius: '999px', fontSize: '0.64rem' }}
              >
                {selectedPropAccount.status}
              </span>
            )}
          </div>

          {selectedPropAccount ? (
            <div className="space-y-5">
              <div className="flex items-center gap-5">
                <ArcProgress percent={profitProgressPercent} />
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-label mb-0.5">Current Balance</p>
                    <p className="stat-medium">{fmt(currentBalance)}</p>
                  </div>
                  <div>
                    <p className="text-label mb-0.5">Profit Progress</p>
                    <p className="stat-medium profit">
                      {profitTargetAmount != null
                        ? `${fmt(profitProgressAmount)} / ${fmt(profitTargetAmount)}`
                        : fmt(profitProgressAmount)}
                    </p>
                  </div>
                </div>
              </div>

              {hasChallengeRules ? (
                <div
                  className="grid gap-3 sm:grid-cols-2"
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '1rem',
                  }}
                >
                  <DrawdownGauge
                    label="Daily Loss Used"
                    used={todayLossUsedPercent}
                    max={dailyLimitPercent ?? 0}
                  />
                  <DrawdownGauge
                    label="Total Loss Used"
                    used={totalLossUsedPercent}
                    max={totalLimitPercent ?? 0}
                  />
                </div>
              ) : (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Challenge drawdown rules are not configured for this account yet.
                </div>
              )}

              {approachingLossLimit ? (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: 'var(--warning-bg)',
                    border:
                      '1px solid color-mix(in srgb, var(--warning-primary) 28%, transparent)',
                    color: 'var(--warning-primary)',
                  }}
                >
                  Loss-limit buffer is getting tight. Review daily and total drawdown before placing another trade.
                </div>
              ) : null}

              <div className="space-y-2">
                <StatRow
                  label="Peak-to-Trough Drawdown"
                  value={
                    selectedAccountAnalytics?.drawdown.maxDrawdownPercent == null
                      ? '--'
                      : `${selectedAccountAnalytics.drawdown.maxDrawdownPercent.toFixed(2)}%`
                  }
                  isGain={false}
                  mono
                />
                <StatRow
                  label="Current from Peak"
                  value={
                    selectedAccountAnalytics?.drawdown.currentFromPeakPercent == null
                      ? '--'
                      : `${selectedAccountAnalytics.drawdown.currentFromPeakPercent.toFixed(2)}%`
                  }
                  isGain={false}
                  mono
                />
                <StatRow
                  label="Last Synced"
                  value={
                    selectedPropAccount.lastSyncedAt
                      ? new Date(selectedPropAccount.lastSyncedAt).toLocaleString()
                      : 'No sync yet'
                  }
                />
              </div>
            </div>
          ) : (
            <div className="py-8">
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: 'var(--accent-soft)' }}
              >
                <IconAnalytics
                  size={20}
                  className="text-[var(--accent-primary)]"
                />
              </div>
              <p
                style={{ color: 'var(--text-secondary)', fontSize: '0.83rem' }}
              >
                {propAccounts.length > 0
                  ? 'Choose a prop account to unlock live compliance'
                  : 'No prop account linked'}
              </p>
              <p
                style={{
                  color: 'var(--text-tertiary)',
                  fontSize: '0.72rem',
                  marginTop: '0.25rem',
                }}
              >
                {propAccounts.length > 0
                  ? 'The dashboard no longer guesses which funded account to display.'
                  : 'Add your funded account to track challenge balance, drawdown, and target progress.'}
              </p>
              <Button asChild className="mt-4">
                <Link href="/prop-firm">
                  <IconPlus size={13} strokeWidth={2} />
                  {propAccounts.length > 0 ? 'Manage Accounts' : 'Add Account'}
                </Link>
              </Button>
            </div>
          )}
        </AppPanel>
      </section>

      <AppPanel className="p-6">
        <SectionHeader
          title="Recent Trades"
          subtitle="Latest trading activity"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/analytics?account=${scopeParam}`}>View analytics {'->'}</Link>
            </Button>
          }
        />
        <RecentTrades
          propAccountId={selectedAccountId}
          initialTrades={recentTrades ?? undefined}
        />
      </AppPanel>

      <AppPanel id="calendar" className="scroll-mt-8 p-6">
        <SectionHeader title="Trading Calendar" subtitle="Daily P&L overview" />
        <TradingCalendar embedded />
      </AppPanel>
    </div>
  );
}
