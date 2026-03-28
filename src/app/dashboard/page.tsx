'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { TradingCalendar } from '@/components/calendar';
import { useAuth } from '@/components/auth-provider';
import { usePropAccount } from '@/components/prop-account-provider';
import { CashflowChart } from '@/components/dashboard/cashflow-chart';
import { RecentTrades } from '@/components/dashboard/recent-trades';
import { DashboardAccountCard } from '@/components/dashboard/summary-primitives';
import { StatisticsDonut } from '@/components/dashboard/statistics-donut';
import { TodayPlanWidget } from '@/components/dashboard/today-plan-widget';
import { TopPlaybooks } from '@/components/dashboard/playbooks-widget';
import {
  InsetPanel,
  WidgetEmptyState,
} from '@/components/ui/surface-primitives';
import { Button } from '@/components/ui/button';
import { ArcProgress } from '@/components/ui/arc-progress';
import { DrawdownGauge } from '@/components/ui/drawdown-gauge';
import {
  AppMetricCard,
  AppPanel,
  SectionHeader,
} from '@/components/ui/page-primitives';
import { LoadingMetricCard } from '@/components/ui/loading';
import {
  IconAnalytics,
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
import type { Trade } from '@/lib/db/schema';

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
          )
            .then((data) =>
              data.sort((left, right) => right.totalPnl - left.totalPnl).slice(0, 4),
            )
            .catch((error) => {
              console.error('Dashboard playbooks:', error);
              return [];
            }),
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <LoadingMetricCard key={index} />
            ))
          ) : (
            <>
              <DashboardAccountCard
                ownerLabel={username}
                accountName={
                  selectedPropAccount?.accountName ?? accountScopeLabel
                }
                statusLabel={
                  selectedPropAccount?.status ?? accountScopeBadge
                }
                statusVariant={selectedPropAccount ? 'account' : 'scope'}
                metricLabel={selectedPropAccount ? 'Balance' : 'Scope'}
                metricValue={
                  selectedPropAccount
                    ? fmt(
                        Number(
                          selectedPropAccount.currentBalance ??
                            selectedPropAccount.accountSize ??
                            0,
                        ),
                      )
                    : accountScopeLabel
                }
                helper={
                  selectedPropAccount?.accountSize
                    ? `Account size ${fmt(Number(selectedPropAccount.accountSize))}`
                    : null
                }
              />

              <AppMetricCard
                label="Gross Profit"
                value={fmtAbs(totalIncome)}
                helper={
                  summary
                    ? `${summary.winningTrades} winning trades - ${winRate.toFixed(0)}% win rate`
                    : undefined
                }
                tone="profit"
                size="hero"
                shell="surface"
              />

              <AppMetricCard
                label="Gross Loss"
                value={fmtAbs(totalExpense)}
                helper={
                  summary
                    ? `${summary.losingTrades} losing trades - ${(100 - winRate).toFixed(0)}% loss rate`
                    : undefined
                }
                tone="loss"
                size="hero"
                shell="surface"
              />

              <AppMetricCard
                label="Net P&L"
                value={signedFmt(totalPnl)}
                helper={`PF ${profitFactor}`}
                change={monthDelta}
                changeLabel="vs last month"
                tone={totalPnl >= 0 ? 'profit' : 'loss'}
                size="hero"
                shell="surface"
              />
            </>
          )}
        </div>
      </section>

      {!loading && (
        <AppPanel className="stagger-3 p-5">
          <SectionHeader
            className="mb-3"
            title="Today Only"
            subtitle={`Monthly cards above use ${monthScopeLabel}`}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AppMetricCard
              label="Today's P&L"
              value={signedFmt(todayAnalytics?.summary.totalNetPnl ?? 0)}
              tone={
                (todayAnalytics?.summary.totalNetPnl ?? 0) >= 0
                  ? 'profit'
                  : 'loss'
              }
              align="center"
              size="compact"
              shell="elevated"
            />
            <AppMetricCard
              label="Win Rate"
              value={`${winRate.toFixed(1)}%`}
              tone={
                winRate >= 55
                  ? 'profit'
                  : winRate >= 45
                    ? 'default'
                    : 'loss'
              }
              align="center"
              size="compact"
              shell="elevated"
            />
            <AppMetricCard
              label="Avg Realized R"
              value={`${(summary?.avgRMultiple ?? 0).toFixed(2)}R`}
              tone={(summary?.avgRMultiple ?? 0) >= 0 ? 'profit' : 'loss'}
              align="center"
              size="compact"
              shell="elevated"
            />
            <AppMetricCard
              label="Best Trade"
              value={fmt(summary?.largestWin ?? 0)}
              tone="profit"
              align="center"
              size="compact"
              shell="elevated"
            />
          </div>
        </AppPanel>
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
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <AppMetricCard
              label="Profit Factor"
              value={profitFactor}
              tone={(summary?.profitFactor ?? 0) > 1 ? 'profit' : 'default'}
              size="compact"
              shell="elevated"
            />
            <AppMetricCard
              label="Avg Win"
              value={fmt(summary?.avgWin)}
              tone="profit"
              size="compact"
              shell="elevated"
            />
            <AppMetricCard
              label="Avg Loss"
              value={fmtAbs(summary?.avgLoss ?? 0)}
              tone="loss"
              size="compact"
              shell="elevated"
            />
            <AppMetricCard
              label="Largest Win"
              value={fmt(summary?.largestWin)}
              tone="profit"
              size="compact"
              shell="elevated"
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
          <SectionHeader
            title={selectedPropAccount?.accountName ?? 'Prop Firm'}
            subtitle={
              selectedPropAccount
                ? `${fmt(challengeInitialBalance)} challenge balance - ${
                    selectedChallenge?.firm?.name ??
                    selectedPropAccount.firmName ??
                    'Prop'
                  }`
                : propAccounts.length > 0
                  ? 'Select a specific prop account to view compliance'
                  : 'Add a prop account to track compliance'
            }
            action={
              selectedPropAccount ? (
                <span
                  className="badge-accent capitalize"
                  style={{ borderRadius: '999px', fontSize: '0.64rem' }}
                >
                  {selectedPropAccount.status}
                </span>
              ) : (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-[8px]"
                  style={{
                    background: 'var(--accent-soft)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <IconPropFirm size={15} strokeWidth={1.75} />
                </div>
              )
            }
          />

          {selectedPropAccount ? (
            <div className="space-y-5">
              <div className="grid gap-4 xl:grid-cols-[120px_minmax(0,1fr)]">
                <InsetPanel className="flex items-center justify-center">
                  <ArcProgress percent={profitProgressPercent} />
                </InsetPanel>
                <div className="grid gap-3 sm:grid-cols-2">
                  <AppMetricCard
                    label="Current Balance"
                    value={fmt(currentBalance)}
                    helper={`Challenge start ${fmt(challengeInitialBalance)}`}
                    size="compact"
                    shell="elevated"
                  />
                  <AppMetricCard
                    label="Profit Progress"
                    value={
                      profitTargetAmount != null
                        ? `${fmt(profitProgressAmount)} / ${fmt(profitTargetAmount)}`
                        : fmt(profitProgressAmount)
                    }
                    helper={
                      profitTargetPercent != null
                        ? `${profitTargetPercent.toFixed(0)}% target`
                        : 'No profit target configured'
                    }
                    tone="profit"
                    size="compact"
                    shell="elevated"
                  />
                  <AppMetricCard
                    label="Peak-to-Trough Drawdown"
                    value={
                      selectedAccountAnalytics?.drawdown.maxDrawdownPercent == null
                        ? '--'
                        : `${selectedAccountAnalytics.drawdown.maxDrawdownPercent.toFixed(2)}%`
                    }
                    tone="loss"
                    size="compact"
                    shell="elevated"
                  />
                  <AppMetricCard
                    label="Current from Peak"
                    value={
                      selectedAccountAnalytics?.drawdown.currentFromPeakPercent == null
                        ? '--'
                        : `${selectedAccountAnalytics.drawdown.currentFromPeakPercent.toFixed(2)}%`
                    }
                    tone="loss"
                    size="compact"
                    shell="elevated"
                  />
                </div>
              </div>

              {hasChallengeRules ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <InsetPanel>
                    <DrawdownGauge
                      label="Daily Loss Used"
                      used={todayLossUsedPercent}
                      max={dailyLimitPercent ?? 0}
                    />
                  </InsetPanel>
                  <InsetPanel>
                    <DrawdownGauge
                      label="Total Loss Used"
                      used={totalLossUsedPercent}
                      max={totalLimitPercent ?? 0}
                    />
                  </InsetPanel>
                </div>
              ) : (
                <InsetPanel className="py-3 text-sm">
                  Challenge drawdown rules are not configured for this account yet.
                </InsetPanel>
              )}

              {approachingLossLimit ? (
                <InsetPanel
                  tone="warning"
                  className="py-3 text-sm"
                >
                  <span style={{ color: 'var(--warning-primary)' }}>
                    Loss-limit buffer is getting tight. Review daily and total drawdown before placing another trade.
                  </span>
                </InsetPanel>
              ) : null}
              <AppMetricCard
                label="Last Synced"
                value={
                  selectedPropAccount.lastSyncedAt
                    ? new Date(selectedPropAccount.lastSyncedAt).toLocaleString()
                    : 'No sync yet'
                }
                size="compact"
                shell="elevated"
              />
            </div>
          ) : (
            <WidgetEmptyState
              className="py-10"
              icon={<IconAnalytics size={20} />}
              title={
                propAccounts.length > 0
                  ? 'Choose a prop account to unlock live compliance'
                  : 'No prop account linked'
              }
              description={
                propAccounts.length > 0
                  ? 'The dashboard no longer guesses which funded account to display.'
                  : 'Add your funded account to track challenge balance, drawdown, and target progress.'
              }
              action={
                <Button asChild>
                  <Link href="/prop-firm">
                    <IconPlus size={13} strokeWidth={2} />
                    {propAccounts.length > 0 ? 'Manage Accounts' : 'Add Account'}
                  </Link>
                </Button>
              }
            />
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
