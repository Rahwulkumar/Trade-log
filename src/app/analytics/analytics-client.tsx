'use client';

import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Download, TrendingDown, TrendingUp } from 'lucide-react';

import { AnalyticsAccountSync } from '@/app/analytics/analytics-account-sync';
import type { AnalyticsPayload, SessionBucket } from '@/lib/analytics/types';
import { CHART_COLORS } from '@/lib/constants/chart-colors';
import {
  AppPageHeader,
  AppPanel,
  PanelTitle,
  SectionHeader,
} from '@/components/ui/page-primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const TT = {
  contentStyle: {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 10,
    fontSize: 12,
    color: 'var(--text-primary)',
  },
  labelStyle: { color: 'var(--text-secondary)', fontWeight: 600 },
};

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

function formatSignedCurrency(value: number): string {
  return `${value >= 0 ? '+' : '-'}${formatCurrency(Math.abs(value))}`;
}

function formatPercent(value: number | null): string {
  return value == null ? '--' : `${value.toFixed(2)}%`;
}

function qualityTag(label: string, value: number | null, good: number, excellent: number) {
  if (value == null) {
    return {
      label: 'Need Data',
      color: 'var(--text-secondary)',
      bg: 'var(--surface-elevated)',
    };
  }

  const isRuin = label === 'Risk of Ruin';
  const quality = isRuin
    ? value <= excellent
      ? 'excellent'
      : value <= good
        ? 'good'
        : 'poor'
    : value >= excellent
      ? 'excellent'
      : value >= good
        ? 'good'
        : 'poor';

  if (quality === 'excellent') {
    return {
      label: 'Excellent',
      color: 'var(--profit-primary)',
      bg: 'var(--profit-bg)',
    };
  }

  if (quality === 'good') {
    return {
      label: 'Good',
      color: 'var(--warning-primary)',
      bg: 'var(--warning-bg)',
    };
  }

  return {
    label: 'Needs Work',
    color: 'var(--loss-primary)',
    bg: 'var(--loss-bg)',
  };
}

function SummaryCard({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'profit' | 'loss' | 'warning' | 'accent' | 'neutral';
}) {
  const toneStyles = {
    profit: {
      color: 'var(--profit-primary)',
      background: 'var(--profit-bg)',
      border: 'color-mix(in srgb, var(--profit-primary) 24%, transparent)',
    },
    loss: {
      color: 'var(--loss-primary)',
      background: 'var(--loss-bg)',
      border: 'color-mix(in srgb, var(--loss-primary) 24%, transparent)',
    },
    warning: {
      color: 'var(--warning-primary)',
      background: 'var(--warning-bg)',
      border: 'color-mix(in srgb, var(--warning-primary) 24%, transparent)',
    },
    accent: {
      color: 'var(--accent-primary)',
      background: 'var(--accent-soft)',
      border: 'var(--accent-muted)',
    },
    neutral: {
      color: 'var(--text-primary)',
      background: 'var(--surface-elevated)',
      border: 'var(--border-subtle)',
    },
  } satisfies Record<
    'profit' | 'loss' | 'warning' | 'accent' | 'neutral',
    { color: string; background: string; border: string }
  >;

  const style = toneStyles[tone];

  return (
    <Card
      className="border-0 shadow-none"
      style={{
        background: style.background,
        boxShadow: `inset 0 0 0 1px ${style.border}`,
      }}
    >
      <CardContent className="flex flex-col gap-2 p-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
          {label}
        </span>
        <p className="mono text-2xl font-bold leading-none" style={{ color: style.color }}>
          {value}
        </p>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {sub}
        </p>
      </CardContent>
    </Card>
  );
}

function RiskCard({
  label,
  value,
  hint,
  good,
  excellent,
  unit = '',
}: {
  label: string;
  value: number | null;
  hint: string;
  good: number;
  excellent: number;
  unit?: string;
}) {
  const tag = qualityTag(label, value, good, excellent);
  return (
    <Card className="surface border-0 bg-transparent p-0 shadow-none">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between">
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </span>
          <Badge style={{ fontSize: '0.6rem', color: tag.color, background: tag.bg, border: 'none', padding: '2px 8px' }}>
            {tag.label}
          </Badge>
        </div>
        <p className="mono text-[2rem] font-bold leading-none" style={{ color: tag.color }}>
          {value == null ? '--' : value.toFixed(2)}
          <span className="ml-1 text-base" style={{ color: 'var(--text-tertiary)' }}>
            {unit}
          </span>
        </p>
        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          {hint}
        </p>
      </CardContent>
    </Card>
  );
}

function SessionCard(props: SessionBucket) {
  return (
    <Card className="surface relative border-0 bg-transparent p-0 shadow-none">
      <div className="absolute left-0 top-0 h-full w-1 rounded-l-xl" style={{ background: props.color }} />
      <CardContent className="space-y-3 px-4 py-4 pl-6">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-semibold">{props.session}</h4>
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {props.range}
            </p>
          </div>
          <span className="mono text-[11px] font-semibold" style={{ color: props.pnl >= 0 ? 'var(--profit-primary)' : 'var(--loss-primary)' }}>
            {formatSignedCurrency(props.pnl)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ConsistencyGauge({ score }: { score: number }) {
  const r = 52;
  const circ = Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color =
    score >= 75
      ? 'var(--profit-primary)'
      : score >= 50
        ? 'var(--accent-primary)'
        : 'var(--warning-primary)';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="124" height="70" viewBox="0 0 124 70">
        <path d="M 12 62 A 50 50 0 0 1 112 62" fill="none" stroke="var(--border-subtle)" strokeWidth="12" strokeLinecap="round" />
        <path d="M 12 62 A 50 50 0 0 1 112 62" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${circ}`} strokeDashoffset={offset} />
        <text x="62" y="58" textAnchor="middle" fontSize="22" fontWeight="700" fill={color} fontFamily="var(--font-jb-mono)">
          {Math.round(score)}
        </text>
      </svg>
      <span className="text-[11px] font-semibold" style={{ color }}>
        {score >= 75 ? 'Consistent' : score >= 50 ? 'Moderate' : 'Inconsistent'}
      </span>
    </div>
  );
}

function EmptyPanel({ title, message }: { title: string; message: string }) {
  return (
    <AppPanel className="flex min-h-[220px] items-center justify-center">
      <div className="max-w-sm text-center">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {message}
        </p>
      </div>
    </AppPanel>
  );
}

function StatList({
  items,
}: {
  items: Array<{ label: string; value: string; sub: string; bad?: boolean }>;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-start justify-between py-2.5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {item.label}
          </span>
          <div className="text-right">
            <p className="mono text-sm font-semibold" style={{ color: item.bad ? 'var(--loss-primary)' : 'var(--text-primary)' }}>
              {item.value}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {item.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsClient({
  payload,
  accountScope,
  shouldSyncSelection,
}: {
  payload: AnalyticsPayload;
  accountScope: string;
  shouldSyncSelection: boolean;
}) {
  const eqData = payload.equity.map((point) => ({
    date: point.label,
    balance: point.balance,
  }));
  const underwaterData = payload.underwater.map((point) => ({
    date: point.label,
    dd: point.drawdownPercent == null ? 0 : -point.drawdownPercent,
  }));
  const maxHoldCount = Math.max(
    ...payload.distributions.holdTime.map((bucket) => bucket.count),
    1,
  );
  const maxHourlyAbsPnl = Math.max(
    ...payload.time.hourly.map((hour) => Math.abs(hour.avgPnl)),
    1,
  );

  if (payload.meta.tradeCount === 0) {
    return (
      <div className="page-root page-sections">
        <AnalyticsAccountSync account={accountScope} shouldSyncSelection={shouldSyncSelection} />
        <AppPageHeader
          eyebrow="Deep Intelligence"
          title="Analytics"
          description="Realized analytics from your closed trades."
          icon={<Activity size={18} color="white" />}
        />
        <AppPanel className="max-w-2xl">
          <p className="text-lg font-semibold">No closed trades yet</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            The analytics page now renders only from real closed trades. Sync or
            journal trades to unlock it.
          </p>
          <div className="mt-5">
            <Button asChild>
              <Link href="/journal">Open Journal</Link>
            </Button>
          </div>
        </AppPanel>
      </div>
    );
  }

  return (
    <div className="page-root page-sections">
      <AnalyticsAccountSync account={accountScope} shouldSyncSelection={shouldSyncSelection} />
      <AppPageHeader
        eyebrow="Deep Intelligence"
        title="Analytics"
        description={`Live analytics for ${payload.meta.accountLabel} from ${payload.meta.tradeCount} closed trades.`}
        icon={<Activity size={18} color="white" />}
        actions={
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Export
          </Button>
        }
      />

      <div
        className="rounded-xl px-4 py-3 text-sm"
        style={{
          background: 'var(--accent-soft)',
          border: '1px solid var(--accent-muted)',
          color: 'var(--text-secondary)',
        }}
      >
        Coverage: R-multiple {payload.meta.coverage.rMultiplePercent}%,
        MAE/MFE {payload.meta.coverage.maeMfePercent}%, stored session{' '}
        {payload.meta.coverage.sessionPercent}%.
      </div>

      <section>
        <SectionHeader eyebrow="Performance Snapshot" title="Summary" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            label="Total Net P&L"
            value={formatSignedCurrency(payload.summary.totalNetPnl)}
            sub={`${payload.summary.totalTrades} closed trades across ${payload.meta.accountLabel}.`}
            tone={payload.summary.totalNetPnl >= 0 ? 'profit' : 'loss'}
          />
          <SummaryCard
            label="Win Rate"
            value={`${payload.summary.winRate.toFixed(1)}%`}
            sub={`${payload.summary.winningTrades} wins, ${payload.summary.losingTrades} losses, ${payload.summary.breakevenTrades} flat.`}
            tone={
              payload.summary.winRate >= 55
                ? 'profit'
                : payload.summary.winRate >= 45
                  ? 'warning'
                  : 'loss'
            }
          />
          <SummaryCard
            label="Profit Factor"
            value={
              payload.summary.profitFactor == null
                ? '--'
                : `${payload.summary.profitFactor.toFixed(2)}x`
            }
            sub={`Gross ${formatCurrency(payload.summary.totalGrossPnl)}, costs ${formatSignedCurrency(-payload.summary.totalCosts)}.`}
            tone={
              payload.summary.profitFactor == null
                ? 'neutral'
                : payload.summary.profitFactor >= 1.5
                  ? 'profit'
                  : payload.summary.profitFactor >= 1
                    ? 'warning'
                    : 'loss'
            }
          />
          <SummaryCard
            label="Expectancy"
            value={formatSignedCurrency(payload.summary.expectancy)}
            sub={`Average expectancy per closed trade, net of costs.`}
            tone={payload.summary.expectancy >= 0 ? 'accent' : 'loss'}
          />
          <SummaryCard
            label="Average R"
            value={
              payload.summary.avgRMultiple == null
                ? '--'
                : `${payload.summary.avgRMultiple.toFixed(2)}R`
            }
            sub={`Largest win ${formatSignedCurrency(payload.summary.largestWin)}. Largest loss ${formatSignedCurrency(payload.summary.largestLoss)}.`}
            tone={
              payload.summary.avgRMultiple == null
                ? 'neutral'
                : payload.summary.avgRMultiple >= 0
                  ? 'profit'
                  : 'loss'
            }
          />
          <SummaryCard
            label="Average Trade"
            value={formatSignedCurrency(payload.summary.avgNetPnl)}
            sub={`Avg win ${formatCurrency(payload.summary.avgWin)} vs avg loss ${formatCurrency(Math.abs(payload.summary.avgLoss))}.`}
            tone={payload.summary.avgNetPnl >= 0 ? 'profit' : 'loss'}
          />
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Risk Intelligence" title="Risk-Adjusted Performance" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <RiskCard label="Sharpe Ratio" value={payload.risk.sharpe} hint="Daily realized return divided by daily volatility." good={1} excellent={1.5} />
          <RiskCard label="Sortino Ratio" value={payload.risk.sortino} hint="Daily realized return divided by downside deviation." good={1.5} excellent={2} />
          <RiskCard label="Calmar Ratio" value={payload.risk.calmar} hint="Filtered-window CAGR divided by max drawdown." good={2} excellent={3} />
          <RiskCard label="Recovery Factor" value={payload.risk.recoveryFactor} hint="Total net profit divided by maximum drawdown amount." good={2} excellent={4} />
          <RiskCard label="Risk of Ruin" value={payload.risk.riskOfRuin} unit="%" hint="Monte Carlo estimate from empirical R outcomes." good={5} excellent={2} />
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Capital Protection" title="Equity & Drawdown Analysis" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <AppPanel className="lg:col-span-2">
            <PanelTitle title="Equity Curve" subtitle={`Starting balance ${formatCurrency(payload.meta.startingBalance)} and realized net P&L.`} />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={eqData}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="10%" stopColor="var(--accent-primary)" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="date" tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip {...TT} formatter={(value: number) => [formatCurrency(value), 'Balance']} />
                  <Area type="monotone" dataKey="balance" stroke="var(--accent-primary)" fill="url(#eqGrad)" strokeWidth={2.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AppPanel>

          <AppPanel>
            <PanelTitle title="Drawdown Stats" subtitle="Peak-to-trough risk metrics from realized equity." />
            <StatList
              items={[
                {
                  label: 'Max Drawdown',
                  value: formatPercent(payload.drawdown.maxDrawdownPercent),
                  sub: `${formatSignedCurrency(-payload.drawdown.maxDrawdownAmount)} from peak`,
                  bad: true,
                },
                {
                  label: 'Avg Drawdown Depth',
                  value: formatPercent(payload.drawdown.averageDrawdownPercent),
                  sub:
                    payload.drawdown.averageDrawdownAmount == null
                      ? 'Need more cycles'
                      : `${formatSignedCurrency(-payload.drawdown.averageDrawdownAmount)} across cycles`,
                },
                {
                  label: 'Longest DD Period',
                  value:
                    payload.drawdown.longestDrawdownDays == null
                      ? '--'
                      : `${payload.drawdown.longestDrawdownDays.toFixed(1)} days`,
                  sub:
                    payload.drawdown.longestDrawdownFrom &&
                    payload.drawdown.longestDrawdownTo
                      ? `${new Date(payload.drawdown.longestDrawdownFrom).toLocaleDateString()} to ${new Date(payload.drawdown.longestDrawdownTo).toLocaleDateString()}`
                      : 'No prolonged drawdown cycle',
                },
                {
                  label: 'Current from Peak',
                  value: formatPercent(payload.drawdown.currentFromPeakPercent),
                  sub: `${formatSignedCurrency(-payload.drawdown.currentFromPeakAmount)} below peak`,
                },
                {
                  label: 'ATH Events',
                  value: `${payload.drawdown.allTimeHighEvents}`,
                  sub: 'new equity highs recorded',
                },
                {
                  label: 'Recovery Time (avg)',
                  value:
                    payload.drawdown.averageRecoveryDays == null
                      ? '--'
                      : `${payload.drawdown.averageRecoveryDays.toFixed(1)} days`,
                  sub: 'average time back to peak',
                },
              ]}
            />
          </AppPanel>
        </div>

        <AppPanel className="mt-5">
          <PanelTitle title="Underwater Chart" subtitle="Drawdown from the running equity peak at each realized close." />
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={underwaterData}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--loss-primary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--loss-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis dataKey="date" tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(value: number) => `${value}%`} />
                <Tooltip {...TT} formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']} />
                <ReferenceLine y={0} stroke="var(--border-active)" opacity={0.4} />
                <Area type="monotone" dataKey="dd" stroke="var(--loss-primary)" fill="url(#ddGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AppPanel>
      </section>

      <section>
        <SectionHeader eyebrow="Trade Quality" title="Distribution Analysis" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {payload.distributions.r.length > 0 ? (
            <AppPanel>
              <PanelTitle title="R-Multiple Distribution" subtitle="Closed trades grouped by realized R outcome." />
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={payload.distributions.r}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="range" tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip {...TT} formatter={(value: number) => [value, 'Trades']} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {payload.distributions.r.map((entry) => (
                        <Cell
                          key={entry.range}
                          fill={
                            entry.range.startsWith('<') || entry.range.startsWith('-')
                              ? 'var(--loss-primary)'
                              : entry.range === '0R'
                                ? 'var(--text-tertiary)'
                                : 'var(--profit-primary)'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </AppPanel>
          ) : (
            <EmptyPanel title="R-Multiple distribution unavailable" message="This chart stays hidden until usable R-multiple coverage is strong enough." />
          )}

          <AppPanel>
            <PanelTitle title="P&L Distribution" subtitle="Histogram of realized net P&L per trade." />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payload.distributions.pnl}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fill: CHART_COLORS.textTertiary, fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip {...TT} formatter={(value: number) => [value, 'Trades']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="var(--accent-primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AppPanel>

          <AppPanel>
            <PanelTitle title="Hold Time Breakdown" subtitle="Duration buckets with average net P&L." />
            <div className="mt-1 space-y-4">
              {payload.distributions.holdTime.map((bucket) => (
                <div key={bucket.label}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold">{bucket.label}</span>
                      <span className="ml-1.5 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {bucket.sub}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {bucket.count} trades
                      </span>
                      <span
                        className="mono text-[11px] font-semibold"
                        style={{ color: bucket.avgPnl >= 0 ? 'var(--profit-primary)' : 'var(--loss-primary)' }}
                      >
                        {formatSignedCurrency(bucket.avgPnl)}
                      </span>
                    </div>
                  </div>
                  <Progress value={(bucket.count / maxHoldCount) * 100} className="h-1.5" />
                </div>
              ))}
            </div>
          </AppPanel>
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Timing Intelligence" title="Session & Time Analysis" />
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {payload.time.session.length > 0 ? (
            payload.time.session.map((session) => <SessionCard key={session.session} {...session} />)
          ) : (
            <EmptyPanel title="No session data" message="There are not enough closed trades to compute session buckets yet." />
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <AppPanel>
            <PanelTitle title="Performance by Day of Week" subtitle={`Win rate and trade count by entry day in ${payload.meta.timeZone}.`} />
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={payload.time.dayOfWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="day" tickFormatter={(value: string) => value.slice(0, 3)} tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="l" tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(value: number) => `${value}%`} domain={[0, 100]} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip {...TT} />
                  <Bar yAxisId="r" dataKey="trades" radius={[4, 4, 0, 0]} fill="var(--border-active)" opacity={0.45} name="Trades" />
                  <Line yAxisId="l" type="monotone" dataKey="winRate" stroke="var(--accent-primary)" strokeWidth={2.5} dot={{ fill: 'var(--accent-primary)', r: 4, strokeWidth: 0 }} name="Win Rate %" />
                  <ReferenceLine yAxisId="l" y={50} stroke="var(--loss-primary)" strokeDasharray="4 3" opacity={0.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </AppPanel>

          <AppPanel>
            <PanelTitle title="Hour-of-Day Heatmap" subtitle={`Average net P&L by entry hour in ${payload.meta.timeZone}.`} />
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
              {payload.time.hourly.map((hour) => {
                const abs = Math.min(Math.abs(hour.avgPnl) / maxHourlyAbsPnl, 1);
                const isPositive = hour.avgPnl >= 0;
                const alpha = Math.round((0.08 + abs * 0.72) * 100);
                const borderAlpha = Math.round(Math.min((0.08 + abs * 0.72) * 0.6, 0.4) * 100);
                return (
                  <div
                    key={hour.hour}
                    title={`${hour.label}: ${formatSignedCurrency(hour.avgPnl)} (${hour.trades} trades)`}
                    className="rounded-[6px] py-2.5 transition-transform hover:scale-105"
                    style={{
                      background: isPositive
                        ? `color-mix(in srgb, var(--profit-primary) ${alpha}%, transparent)`
                        : `color-mix(in srgb, var(--loss-primary) ${alpha}%, transparent)`,
                      border: `1px solid ${
                        isPositive
                          ? `color-mix(in srgb, var(--profit-primary) ${borderAlpha}%, transparent)`
                          : `color-mix(in srgb, var(--loss-primary) ${borderAlpha}%, transparent)`
                      }`,
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                        {String(hour.hour).padStart(2, '0')}
                      </span>
                      <span className="mt-0.5 text-[9px] font-bold" style={{ color: isPositive ? 'var(--profit-primary)' : 'var(--loss-primary)' }}>
                        {hour.avgPnl > 0 ? '+' : ''}
                        {Math.round(hour.avgPnl)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </AppPanel>
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Behavioral Edge" title="Streak, Consistency & Execution Quality" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <AppPanel>
            <PanelTitle title="Streak Tracker" subtitle="Recent realized sequence and consecutive runs." />
            <div className="mb-4 flex flex-wrap items-center gap-1">
              {payload.streaks.recentTrades.map((trade, index) => (
                <div
                  key={`${trade}-${index}`}
                  className="flex h-6 w-6 items-center justify-center rounded-[5px] text-[10px] font-bold"
                  style={{
                    background: trade === 'W' ? 'var(--profit-bg)' : 'var(--loss-bg)',
                    color: trade === 'W' ? 'var(--profit-primary)' : 'var(--loss-primary)',
                    border: `1px solid ${
                      trade === 'W'
                        ? 'color-mix(in srgb, var(--profit-primary) 30%, transparent)'
                        : 'color-mix(in srgb, var(--loss-primary) 30%, transparent)'
                    }`,
                  }}
                >
                  {trade}
                </div>
              ))}
            </div>
            <div
              className="mb-4 flex items-center gap-4 rounded-xl p-3"
              style={{
                background:
                  payload.streaks.currentType === 'win'
                    ? 'var(--profit-bg)'
                    : 'var(--loss-bg)',
                border: `1px solid ${
                  payload.streaks.currentType === 'win'
                    ? 'color-mix(in srgb, var(--profit-primary) 25%, transparent)'
                    : 'color-mix(in srgb, var(--loss-primary) 25%, transparent)'
                }`,
              }}
            >
              {payload.streaks.currentType === 'win' ? (
                <TrendingUp size={20} style={{ color: 'var(--profit-primary)' }} />
              ) : (
                <TrendingDown size={20} style={{ color: 'var(--loss-primary)' }} />
              )}
              <div>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  Current Streak
                </p>
                <p className="mono text-2xl font-bold" style={{ color: payload.streaks.currentType === 'win' ? 'var(--profit-primary)' : 'var(--loss-primary)' }}>
                  {payload.streaks.current}{' '}
                  <span className="text-sm">
                    {payload.streaks.currentType === 'win' ? 'wins' : 'losses'}
                  </span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Card
                className="border-0 shadow-none"
                style={{ background: 'var(--profit-bg)' }}
              >
                <CardContent className="p-3">
                  <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                    Longest Win
                  </p>
                  <p className="mono text-xl font-bold" style={{ color: 'var(--profit-primary)' }}>
                    {payload.streaks.longestWin}
                  </p>
                </CardContent>
              </Card>
              <Card
                className="border-0 shadow-none"
                style={{ background: 'var(--loss-bg)' }}
              >
                <CardContent className="p-3">
                  <p className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                    Longest Loss
                  </p>
                  <p className="mono text-xl font-bold" style={{ color: 'var(--loss-primary)' }}>
                    {payload.streaks.longestLoss}
                  </p>
                </CardContent>
              </Card>
            </div>
          </AppPanel>

          {payload.consistency ? (
            <AppPanel>
              <PanelTitle title="Consistency Score" subtitle="Risk sizing, timing, payoff stability, and stop usage." />
              <div className="mb-5 flex justify-center">
                <ConsistencyGauge score={payload.consistency.score} />
              </div>
              <div className="space-y-3">
                {[
                  ['Risk Sizing', payload.consistency.positionSize],
                  ['Session Timing', payload.consistency.timing],
                  ['Payoff Stability', payload.consistency.winLossBalance],
                  ['Stop Adherence', payload.consistency.stopAdherence],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] font-medium">{label}</span>
                      <span className="mono text-sm font-bold">{value}</span>
                    </div>
                    <Progress value={Number(value)} className="h-1.5" />
                  </div>
                ))}
              </div>
            </AppPanel>
          ) : (
            <EmptyPanel title="Consistency score unavailable" message="This stays hidden until there are enough trades and normalized risk samples to score behavior credibly." />
          )}

          {payload.maeMfe ? (
            <AppPanel>
              <PanelTitle title="MAE vs MFE" subtitle="Max adverse and favorable excursion from real trade data." />
              <div className="h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                    <XAxis dataKey="mae" name="MAE ($)" type="number" tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="mfe" name="MFE ($)" type="number" tick={{ fill: CHART_COLORS.textTertiary, fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip {...TT} formatter={(value: number, name: string) => [`$${value}`, name]} />
                    <Scatter data={payload.maeMfe.filter((point) => point.result === 'win')} fill="var(--profit-primary)" opacity={0.75} name="Win" />
                    <Scatter data={payload.maeMfe.filter((point) => point.result === 'loss')} fill="var(--loss-primary)" opacity={0.75} name="Loss" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </AppPanel>
          ) : (
            <EmptyPanel title="MAE/MFE unavailable" message="At least 30% of closed trades need MAE and MFE values before the scatter becomes reliable." />
          )}
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Breakdown" title="Instrument & Strategy Performance" />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <AppPanel>
            <PanelTitle title="By Instrument" subtitle="Win rate, profit factor, average hold time, and total P&L per symbol." />
            <div className="space-y-2">
              <div className="grid px-3 pb-2 text-[9px] font-bold uppercase tracking-wide" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>Symbol</span>
                <span className="text-right">Trades</span>
                <span className="text-right">Win%</span>
                <span className="text-right">PF</span>
                <span className="text-right">Avg P&L</span>
                <span className="text-right">Total</span>
              </div>
              {payload.instruments.map((instrument) => (
                <div key={instrument.symbol} className="grid items-center rounded-lg px-3 py-2.5" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <span className="text-[12px] font-bold">{instrument.symbol}</span>
                    <p className="mt-0.5 text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                      avg {instrument.avgHold}
                    </p>
                  </div>
                  <span className="mono text-right text-[11px]">{instrument.trades}</span>
                  <span className="mono text-right text-[11px] font-semibold">{instrument.winRate.toFixed(0)}%</span>
                  <span className="mono text-right text-[11px]">
                    {instrument.pf == null ? '--' : `${instrument.pf.toFixed(1)}x`}
                  </span>
                  <span className="mono text-right text-[11px]" style={{ color: instrument.avgPnl >= 0 ? 'var(--profit-primary)' : 'var(--loss-primary)' }}>
                    {formatSignedCurrency(instrument.avgPnl)}
                  </span>
                  <span className="mono text-right text-[12px] font-bold" style={{ color: instrument.totalPnl >= 0 ? 'var(--profit-primary)' : 'var(--loss-primary)' }}>
                    {formatSignedCurrency(instrument.totalPnl)}
                  </span>
                </div>
              ))}
            </div>
          </AppPanel>

          <AppPanel>
            <PanelTitle title="By Strategy" subtitle="Playbook-level performance, including unassigned trades." />
            <div className="space-y-2">
              <div className="grid px-3 pb-2 text-[9px] font-bold uppercase tracking-wide" style={{ gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>Strategy</span>
                <span className="text-right">Trades</span>
                <span className="text-right">Win%</span>
                <span className="text-right">PF</span>
                <span className="text-right">Total</span>
              </div>
              {payload.strategies.map((strategy) => (
                <div key={strategy.strategy} className="grid items-center rounded-lg px-3 py-3" style={{ gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <span className="text-[11px] font-semibold">{strategy.strategy}</span>
                    <Progress value={strategy.winRate} className="mt-1.5 h-1" />
                  </div>
                  <span className="mono text-right text-[11px]">{strategy.trades}</span>
                  <span className="mono text-right text-[11px] font-semibold">{strategy.winRate.toFixed(0)}%</span>
                  <span className="mono text-right text-[11px]">
                    {strategy.pf == null ? '--' : `${strategy.pf.toFixed(1)}x`}
                  </span>
                  <span className="mono text-right text-[12px] font-bold" style={{ color: strategy.totalPnl >= 0 ? 'var(--profit-primary)' : 'var(--loss-primary)' }}>
                    {formatSignedCurrency(strategy.totalPnl)}
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
