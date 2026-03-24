'use client';

import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { Activity, Download } from 'lucide-react';

import { AnalyticsAccountSync } from '@/app/analytics/analytics-account-sync';
import { AnalyticsControls } from '@/app/analytics/analytics-controls';
import {
  BehaviorSection,
  BreakdownSection,
  CoverageBanner,
  DistributionSection,
  EquityDrawdownSection,
  RiskSection,
  SummarySection,
  TimingSection,
} from '@/components/analytics/analytics-sections';
import type { AnalyticsPayload } from '@/lib/analytics/types';
import {
  AppPageHeader,
  AppPanelEmptyState,
} from '@/components/ui/page-primitives';
import { Button } from '@/components/ui/button';

export function AnalyticsClient({
  payload,
  accountScope,
  currentFrom,
  currentTo,
  shouldSyncSelection,
}: {
  payload: AnalyticsPayload;
  accountScope: string;
  currentFrom: string | null;
  currentTo: string | null;
  shouldSyncSelection: boolean;
}) {
  const eqData = useMemo(
    () =>
      payload.equity.map((point) => ({
        date: point.label,
        balance: point.balance,
      })),
    [payload.equity],
  );
  const underwaterData = useMemo(
    () =>
      payload.underwater.map((point) => ({
        date: point.label,
        dd: point.drawdownPercent == null ? 0 : -point.drawdownPercent,
      })),
    [payload.underwater],
  );
  const maxHoldCount = useMemo(
    () =>
      Math.max(
        ...payload.distributions.holdTime.map((bucket) => bucket.count),
        1,
      ),
    [payload.distributions.holdTime],
  );
  const maxHourlyAbsPnl = useMemo(
    () =>
      Math.max(
        ...payload.time.hourly.map((hour) => Math.abs(hour.avgPnl)),
        1,
      ),
    [payload.time.hourly],
  );
  const maeWinPoints = useMemo(
    () => payload.maeMfe?.filter((point) => point.result === 'win') ?? [],
    [payload.maeMfe],
  );
  const maeLossPoints = useMemo(
    () => payload.maeMfe?.filter((point) => point.result === 'loss') ?? [],
    [payload.maeMfe],
  );

  const exportRows = useMemo(
    () => [
      ['Metric', 'Value'],
      ['Account Scope', payload.meta.accountLabel],
      ['Time Zone', payload.meta.timeZone],
      ['Trades', String(payload.summary.totalTrades)],
      ['Win Rate', `${payload.summary.winRate.toFixed(2)}%`],
      ['Total Net P&L', payload.summary.totalNetPnl.toFixed(2)],
      [
        'Profit Factor',
        payload.summary.profitFactor == null
          ? ''
          : payload.summary.profitFactor.toFixed(2),
      ],
      ['Expectancy', payload.summary.expectancy.toFixed(2)],
      [],
      ['Instrument', 'Trades', 'Win Rate', 'Profit Factor', 'Total P&L'],
      ...payload.instruments.map((instrument) => [
        instrument.symbol,
        String(instrument.trades),
        instrument.winRate.toFixed(2),
        instrument.pf == null ? '' : instrument.pf.toFixed(2),
        instrument.totalPnl.toFixed(2),
      ]),
      [],
      ['Strategy', 'Trades', 'Win Rate', 'Profit Factor', 'Total P&L'],
      ...payload.strategies.map((strategy) => [
        strategy.strategy,
        String(strategy.trades),
        strategy.winRate.toFixed(2),
        strategy.pf == null ? '' : strategy.pf.toFixed(2),
        strategy.totalPnl.toFixed(2),
      ]),
    ],
    [payload],
  );

  const handleExport = useCallback(() => {
    const csv = exportRows
      .map((row) =>
        row
          .map((value) => {
            const normalized = String(value ?? '');
            return `"${normalized.replaceAll('"', '""')}"`;
          })
          .join(','),
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${payload.meta.accountLabel
      .replaceAll(/\s+/g, '-')
      .toLowerCase()}-${payload.meta.generatedAt.slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [exportRows, payload.meta.accountLabel, payload.meta.generatedAt]);

  if (payload.meta.tradeCount === 0) {
    return (
      <div className="page-root page-sections">
        <AnalyticsAccountSync
          account={accountScope}
          shouldSyncSelection={shouldSyncSelection}
        />
        <AppPageHeader
          eyebrow="Deep Intelligence"
          title="Analytics"
          description="Realized analytics from your closed trades."
          icon={<Activity size={18} color="white" />}
        />
        <AnalyticsControls
          currentAccount={accountScope}
          currentFrom={currentFrom}
          currentTo={currentTo}
          timeZone={payload.meta.timeZone}
        />
        <AppPanelEmptyState
          className="max-w-2xl"
          title="No closed trades yet"
          description="The analytics page now renders only from real closed trades. Adjust the account/date filters above or sync more trades to populate it."
          action={
            <Button asChild>
              <Link href="/journal">Open Journal</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-root page-sections">
      <AnalyticsAccountSync
        account={accountScope}
        shouldSyncSelection={shouldSyncSelection}
      />
      <AppPageHeader
        eyebrow="Deep Intelligence"
        title="Analytics"
        description={`Live analytics for ${payload.meta.accountLabel} from ${payload.meta.tradeCount} closed trades.`}
        icon={<Activity size={18} color="white" />}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        }
      />

      <AnalyticsControls
        currentAccount={accountScope}
        currentFrom={currentFrom}
        currentTo={currentTo}
        timeZone={payload.meta.timeZone}
      />

      <CoverageBanner payload={payload} />
      <SummarySection payload={payload} />
      <RiskSection payload={payload} />
      <EquityDrawdownSection
        payload={payload}
        eqData={eqData}
        underwaterData={underwaterData}
      />
      <DistributionSection payload={payload} maxHoldCount={maxHoldCount} />
      <TimingSection payload={payload} maxHourlyAbsPnl={maxHourlyAbsPnl} />
      <BehaviorSection
        payload={payload}
        maeWinPoints={maeWinPoints}
        maeLossPoints={maeLossPoints}
      />
      <BreakdownSection payload={payload} />
    </div>
  );
}
