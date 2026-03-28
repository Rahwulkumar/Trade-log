'use client';

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
import { Activity, TrendingDown, TrendingUp } from 'lucide-react';

import type { AnalyticsPayload } from '@/lib/analytics/types';
import { formatAnalyticsTimeZoneLabel } from '@/lib/analytics/timezone';
import { CHART_COLORS } from '@/lib/constants/chart-colors';
import { ValueBar } from '@/components/ui/control-primitives';
import {
  AppMetricCard,
  AppPanel,
  AppPanelEmptyState,
  AppStatList,
  PanelTitle,
  SectionHeader,
} from '@/components/ui/page-primitives';
import { Badge } from '@/components/ui/badge';
import {
  ReportGrid,
  ReportGridHeader,
  ReportGridRow,
} from '@/components/ui/report-primitives';
import { InsetPanel } from '@/components/ui/surface-primitives';
import {
  badgeToneStyles,
  ConsistencyGauge,
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  qualityTag,
  SessionCard,
  TT,
} from '@/components/analytics/analytics-shared';

interface EquityPoint {
  date: string;
  balance: number;
}

interface UnderwaterPoint {
  date: string;
  dd: number;
}

interface SectionCommonProps {
  payload: AnalyticsPayload;
}

interface EquitySectionProps extends SectionCommonProps {
  eqData: EquityPoint[];
  underwaterData: UnderwaterPoint[];
}

interface DistributionSectionProps extends SectionCommonProps {
  maxHoldCount: number;
}

interface TimingSectionProps extends SectionCommonProps {
  maxHourlyAbsPnl: number;
}

interface BehaviorSectionProps extends SectionCommonProps {
  maeWinPoints: AnalyticsPayload["maeMfe"];
  maeLossPoints: AnalyticsPayload["maeMfe"];
}

export function CoverageBanner({ payload }: SectionCommonProps) {
  return (
    <InsetPanel tone="accent" className="py-3 text-sm">
      Coverage: R-multiple {payload.meta.coverage.rMultiplePercent}%,
      MAE/MFE {payload.meta.coverage.maeMfePercent}%, stored session{' '}
      {payload.meta.coverage.sessionPercent}%, stop-loss coverage{' '}
      {payload.meta.coverage.stopLossPercent}%, normalized risk sample{' '}
      {payload.meta.coverage.riskSamplePercent}%. Net P&L includes tracked
      commission and swap costs.
    </InsetPanel>
  );
}

export function SummarySection({ payload }: SectionCommonProps) {
  return (
    <section>
      <SectionHeader eyebrow="Performance Snapshot" title="Summary" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AppMetricCard
          label="Total Net P&L"
          value={formatSignedCurrency(payload.summary.totalNetPnl)}
          helper={`${payload.summary.totalTrades} closed trades across ${payload.meta.accountLabel}.`}
          tone={payload.summary.totalNetPnl >= 0 ? 'profit' : 'loss'}
          size="compact"
          shell="elevated"
        />
        <AppMetricCard
          label="Win Rate"
          value={`${payload.summary.winRate.toFixed(1)}%`}
          helper={`${payload.summary.winningTrades} wins, ${payload.summary.losingTrades} losses, ${payload.summary.breakevenTrades} flat.`}
          tone={
            payload.summary.winRate >= 55
              ? 'profit'
              : payload.summary.winRate >= 45
                ? 'warning'
                : 'loss'
          }
          size="compact"
          shell="elevated"
        />
        <AppMetricCard
          label="Profit Factor"
          value={
            payload.summary.profitFactor == null
              ? '--'
              : `${payload.summary.profitFactor.toFixed(2)}x`
          }
          helper={`Gross ${formatCurrency(payload.summary.totalGrossPnl)}, costs ${formatSignedCurrency(payload.summary.totalCosts)}.`}
          tone={
            payload.summary.profitFactor == null
              ? 'default'
              : payload.summary.profitFactor >= 1.5
                ? 'profit'
                : payload.summary.profitFactor >= 1
                  ? 'warning'
                  : 'loss'
          }
          size="compact"
          shell="elevated"
        />
        <AppMetricCard
          label="Expectancy"
          value={formatSignedCurrency(payload.summary.expectancy)}
          helper="Average expectancy per closed trade, net of costs."
          tone={payload.summary.expectancy >= 0 ? 'accent' : 'loss'}
          size="compact"
          shell="elevated"
        />
        <AppMetricCard
          label="Average R"
          value={
            payload.summary.avgRMultiple == null
              ? '--'
              : `${payload.summary.avgRMultiple.toFixed(2)}R`
          }
          helper={`Largest win ${formatSignedCurrency(payload.summary.largestWin)}. Largest loss ${formatSignedCurrency(payload.summary.largestLoss)}.`}
          tone={
            payload.summary.avgRMultiple == null
              ? 'default'
              : payload.summary.avgRMultiple >= 0
                ? 'profit'
                : 'loss'
          }
          size="compact"
          shell="elevated"
        />
        <AppMetricCard
          label="Average Trade"
          value={formatSignedCurrency(payload.summary.avgNetPnl)}
          helper={`Avg win ${formatCurrency(payload.summary.avgWin)} vs avg loss ${formatCurrency(Math.abs(payload.summary.avgLoss))}.`}
          tone={payload.summary.avgNetPnl >= 0 ? 'profit' : 'loss'}
          size="compact"
          shell="elevated"
        />
      </div>
    </section>
  );
}

export function RiskSection({ payload }: SectionCommonProps) {
  return (
    <section>
      <SectionHeader eyebrow="Risk Intelligence" title="Risk-Adjusted Performance" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Sharpe Ratio', payload.risk.sharpe, 'Daily realized return divided by daily volatility.', 1, 1.5, ''],
          ['Sortino Ratio', payload.risk.sortino, 'Daily realized return divided by downside deviation.', 1.5, 2, ''],
          ['Calmar Ratio', payload.risk.calmar, 'First-close to last-close CAGR divided by max drawdown.', 2, 3, ''],
          ['Recovery Factor', payload.risk.recoveryFactor, 'Total net profit divided by maximum drawdown amount.', 2, 4, ''],
          ['Risk of Ruin', payload.risk.riskOfRuin, 'Monte Carlo estimate from empirical R outcomes.', 5, 2, '%'],
        ].map(([label, value, hint, good, excellent, unit]) => {
          const tag = qualityTag(
            label as string,
            value as number | null,
            good as number,
            excellent as number,
          );
          const badgeStyles = badgeToneStyles(tag.tone);

          return (
            <AppMetricCard
              key={label as string}
              label={label as string}
              value={
                value == null ? '--' : `${(value as number).toFixed(2)}${unit as string}`
              }
              helper={hint as string}
              tone={tag.tone}
              shell="surface"
              size="hero"
              minHeight={168}
              labelAction={
                <Badge
                  style={{
                    fontSize: '0.6rem',
                    color: badgeStyles.color,
                    background: badgeStyles.background,
                    border: 'none',
                    padding: '2px 8px',
                  }}
                >
                  {tag.label}
                </Badge>
              }
            />
          );
        })}
      </div>
    </section>
  );
}

export function EquityDrawdownSection({
  payload,
  eqData,
  underwaterData,
}: EquitySectionProps) {
  return (
    <section>
      <SectionHeader eyebrow="Capital Protection" title="Equity & Drawdown Analysis" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <AppPanel className="lg:col-span-2">
          <PanelTitle
            title="Equity Curve"
            subtitle={`Starting balance ${formatCurrency(payload.meta.startingBalance)} and realized net P&L.`}
          />
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
          <AppStatList
            items={[
              {
                label: 'Max Drawdown',
                value: formatPercent(payload.drawdown.maxDrawdownPercent),
                sub: `${formatSignedCurrency(-payload.drawdown.maxDrawdownAmount)} from peak`,
                tone: 'loss',
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
                tone: 'loss',
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
  );
}

export function DistributionSection({
  payload,
  maxHoldCount,
}: DistributionSectionProps) {
  return (
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
          <AppPanelEmptyState
            title="R-Multiple distribution unavailable"
            description="This chart stays hidden until usable R-multiple coverage is strong enough."
          />
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
                <ValueBar value={(bucket.count / maxHoldCount) * 100} />
              </div>
            ))}
          </div>
        </AppPanel>
      </div>
    </section>
  );
}

export function TimingSection({
  payload,
  maxHourlyAbsPnl,
}: TimingSectionProps) {
  const timeZoneLabel = formatAnalyticsTimeZoneLabel(payload.meta.timeZone);
  return (
    <section>
      <SectionHeader
        eyebrow="Timing Intelligence"
        title="Session & Time Analysis"
        subtitle={`Session cards use fixed UTC-4 trading windows. Day/hour charts use ${timeZoneLabel} entry time.`}
      />
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {payload.time.session.length > 0 ? (
          payload.time.session.map((session) => (
            <SessionCard key={session.session} {...session} />
          ))
        ) : (
          <AppPanelEmptyState
            title="No session data"
            description="There are not enough closed trades to compute session buckets yet."
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AppPanel>
          <PanelTitle title="Performance by Day of Week" subtitle={`Win rate and trade count by entry day in ${timeZoneLabel}.`} />
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
          <PanelTitle title="Hour-of-Day Heatmap" subtitle={`Average net P&L by entry hour in ${timeZoneLabel}.`} />
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
  );
}

export function BehaviorSection({
  payload,
  maeWinPoints,
  maeLossPoints,
}: BehaviorSectionProps) {
  return (
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
                  background:
                    trade === 'W'
                      ? 'var(--profit-bg)'
                      : trade === 'L'
                        ? 'var(--loss-bg)'
                        : 'var(--surface-elevated)',
                  color:
                    trade === 'W'
                      ? 'var(--profit-primary)'
                      : trade === 'L'
                        ? 'var(--loss-primary)'
                        : 'var(--text-secondary)',
                  border: `1px solid ${
                    trade === 'W'
                      ? 'color-mix(in srgb, var(--profit-primary) 30%, transparent)'
                      : trade === 'L'
                        ? 'color-mix(in srgb, var(--loss-primary) 30%, transparent)'
                        : 'var(--border-subtle)'
                  }`,
                }}
              >
                {trade}
              </div>
            ))}
          </div>
          <InsetPanel
            className="mb-4 flex items-center gap-4 p-3"
            tone={
              payload.streaks.currentType === 'win'
                ? 'profit'
                : payload.streaks.currentType === 'loss'
                  ? 'loss'
                  : 'default'
            }
          >
            {payload.streaks.currentType === 'win' ? (
              <TrendingUp size={20} style={{ color: 'var(--profit-primary)' }} />
            ) : payload.streaks.currentType === 'loss' ? (
              <TrendingDown size={20} style={{ color: 'var(--loss-primary)' }} />
            ) : (
              <Activity size={20} style={{ color: 'var(--text-secondary)' }} />
            )}
            <div>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                Current Streak
              </p>
              <p
                className="mono text-2xl font-bold"
                style={{
                  color:
                    payload.streaks.currentType === 'win'
                      ? 'var(--profit-primary)'
                      : payload.streaks.currentType === 'loss'
                        ? 'var(--loss-primary)'
                        : 'var(--text-primary)',
                }}
              >
                {payload.streaks.current}{' '}
                <span className="text-sm">
                  {payload.streaks.currentType === 'win'
                    ? 'wins'
                    : payload.streaks.currentType === 'loss'
                      ? 'losses'
                      : 'flat'}
                </span>
              </p>
            </div>
          </InsetPanel>
          <div className="grid grid-cols-2 gap-3">
            <AppMetricCard label="Longest Win" value={`${payload.streaks.longestWin}`} tone="profit" shell="elevated" />
            <AppMetricCard label="Longest Loss" value={`${payload.streaks.longestLoss}`} tone="loss" shell="elevated" />
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
                  <ValueBar value={Number(value)} />
                </div>
              ))}
              <p className="pt-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                Weighted 35% sizing, 25% timing, 25% payoff stability, 15% stop adherence.
              </p>
            </div>
          </AppPanel>
        ) : (
          <AppPanelEmptyState
            title="Consistency score unavailable"
            description="This stays hidden until there are enough trades and normalized risk samples to score behavior credibly."
          />
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
                  <Scatter data={maeWinPoints ?? []} fill="var(--profit-primary)" opacity={0.75} name="Win" />
                  <Scatter data={maeLossPoints ?? []} fill="var(--loss-primary)" opacity={0.75} name="Loss" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </AppPanel>
        ) : (
          <AppPanelEmptyState
            title="MAE/MFE unavailable"
            description="At least 30% of closed trades need MAE and MFE values before the scatter becomes reliable."
          />
        )}
      </div>
    </section>
  );
}

export function BreakdownSection({ payload }: SectionCommonProps) {
  const instrumentColumns = '2fr 1fr 1fr 1fr 1fr 1fr';
  const strategyColumns = '2.5fr 1fr 1fr 1fr 1fr';

  return (
    <section>
      <SectionHeader eyebrow="Breakdown" title="Instrument & Strategy Performance" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <AppPanel>
          <PanelTitle title="By Instrument" subtitle="Win rate, profit factor, average hold time, and total P&L per symbol." />
          <ReportGrid>
            <ReportGridHeader columns={instrumentColumns}>
              <span>Symbol</span>
              <span className="text-right">Trades</span>
              <span className="text-right">Win%</span>
              <span className="text-right">PF</span>
              <span className="text-right">Avg P&amp;L</span>
              <span className="text-right">Total</span>
            </ReportGridHeader>
            {payload.instruments.map((instrument) => (
              <ReportGridRow key={instrument.symbol} columns={instrumentColumns}>
                <div>
                  <span className="mono text-[12px] font-bold">{instrument.symbol}</span>
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
              </ReportGridRow>
            ))}
          </ReportGrid>
        </AppPanel>

        <AppPanel>
          <PanelTitle title="By Strategy" subtitle="Playbook-level performance, including unassigned trades." />
          <ReportGrid minWidthClassName="min-w-[620px]">
            <ReportGridHeader columns={strategyColumns}>
              <span>Strategy</span>
              <span className="text-right">Trades</span>
              <span className="text-right">Win%</span>
              <span className="text-right">PF</span>
              <span className="text-right">Total</span>
            </ReportGridHeader>
            {payload.strategies.map((strategy) => (
              <ReportGridRow
                key={strategy.strategy}
                columns={strategyColumns}
                paddingClassName="px-3 py-3"
              >
                <div>
                  <span className="text-[11px] font-semibold">{strategy.strategy}</span>
                  <div className="mt-1.5">
                    <ValueBar value={strategy.winRate} />
                  </div>
                </div>
                <span className="mono text-right text-[11px]">{strategy.trades}</span>
                <span className="mono text-right text-[11px] font-semibold">{strategy.winRate.toFixed(0)}%</span>
                <span className="mono text-right text-[11px]">
                  {strategy.pf == null ? '--' : `${strategy.pf.toFixed(1)}x`}
                </span>
                <span className="mono text-right text-[12px] font-bold" style={{ color: strategy.totalPnl >= 0 ? 'var(--profit-primary)' : 'var(--loss-primary)' }}>
                  {formatSignedCurrency(strategy.totalPnl)}
                </span>
              </ReportGridRow>
            ))}
          </ReportGrid>
        </AppPanel>
      </div>
    </section>
  );
}
