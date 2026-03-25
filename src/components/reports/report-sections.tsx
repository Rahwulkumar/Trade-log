import { Button } from '@/components/ui/button';
import { AppMetricCard, AppPanel, PanelTitle } from '@/components/ui/page-primitives';
import {
  ReportGrid,
  ReportGridHeader,
  ReportGridRow,
  ReportTypeBadge,
} from '@/components/ui/report-primitives';
import { InsetPanel } from '@/components/ui/surface-primitives';
import type {
  ReportBreakdownRow,
  ReportDetailedTradeRow,
  ReportTagBreakdownRow,
  TradeReportSnapshot,
} from '@/lib/reports/types';

export function formatCurrency(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Math.abs(rounded) >= 100 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}

export function formatPercent(value: number | null) {
  if (value == null || Number.isNaN(value)) return '--';
  return `${value.toFixed(1)}%`;
}

export function formatR(value: number | null) {
  if (value == null || Number.isNaN(value)) return '--';
  return `${value.toFixed(2)}R`;
}

export function formatHoldMinutes(value: number | null) {
  if (value == null || Number.isNaN(value)) return '--';
  if (value < 60) return `${Math.round(value)}m`;
  if (value < 1440) {
    const hours = Math.floor(value / 60);
    const minutes = Math.round(value % 60);
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  const days = Math.floor(value / 1440);
  const hours = Math.round((value % 1440) / 60);
  return hours ? `${days}d ${hours}h` : `${days}d`;
}

function renderToneBadge(reportType: TradeReportSnapshot['reportType']) {
  if (reportType === 'playbook') {
    return <ReportTypeBadge label="Playbook" tone="strategy" />;
  }
  if (reportType === 'risk') {
    return <ReportTypeBadge label="Risk" tone="risk" />;
  }
  return <ReportTypeBadge label="Performance" tone="performance" />;
}

export function ReportSummaryGrid({
  snapshot,
  onSave,
  saving,
  aiPrimary = false,
}: {
  snapshot: TradeReportSnapshot;
  onSave: () => void;
  saving: boolean;
  aiPrimary?: boolean;
}) {
  return (
    <AppPanel>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2">{renderToneBadge(snapshot.reportType)}</div>
          <PanelTitle
            title={snapshot.title}
            subtitle={
              aiPrimary
                ? `AI-generated ${new Date(snapshot.generatedAt).toLocaleString()}`
                : `Generated ${new Date(snapshot.generatedAt).toLocaleString()} | ${snapshot.summary.totalTrades} closed trades`
            }
            className="mb-0"
          />
        </div>

        <Button onClick={onSave} disabled={saving || snapshot.summary.totalTrades === 0}>
          {saving ? 'Saving...' : 'Save Report'}
        </Button>
      </div>

      {aiPrimary ? (
        <InsetPanel tone="accent">
          <p className="text-label mb-2">AI-Primary Mode</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            This view is rendering the Gemini-written report as the main output.
            The trade metrics are still computed underneath for grounding, but
            they are not the primary presentation here.
          </p>
        </InsetPanel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AppMetricCard
            label="Net P&L"
            value={formatCurrency(snapshot.summary.totalNetPnl)}
            tone={snapshot.summary.totalNetPnl >= 0 ? 'profit' : 'loss'}
            helper={`${snapshot.summary.totalTrades} closed trades`}
            size="hero"
            monoValue={false}
          />
          <AppMetricCard
            label="Win Rate"
            value={formatPercent(snapshot.summary.winRate)}
            tone={snapshot.summary.winRate >= 50 ? 'profit' : 'warning'}
            helper={`${snapshot.summary.winningTrades} winners / ${snapshot.summary.losingTrades} losers`}
            size="hero"
            monoValue={false}
          />
          <AppMetricCard
            label="Expectancy"
            value={formatCurrency(snapshot.summary.expectancy)}
            tone={snapshot.summary.expectancy >= 0 ? 'profit' : 'loss'}
            helper={`Avg trade ${formatCurrency(snapshot.summary.avgNetPnl)}`}
            size="hero"
            monoValue={false}
          />
          <AppMetricCard
            label="Average R"
            value={formatR(snapshot.summary.avgRMultiple)}
            tone={
              (snapshot.summary.avgRMultiple ?? 0) > 0
                ? 'profit'
                : (snapshot.summary.avgRMultiple ?? 0) < 0
                  ? 'loss'
                  : 'default'
            }
            helper={`Profit factor ${snapshot.summary.profitFactor?.toFixed(2) ?? '--'}`}
            size="hero"
            monoValue={false}
          />
        </div>
      )}
    </AppPanel>
  );
}

export function ReportInsightList({
  title,
  items,
  tone = 'default',
}: {
  title: string;
  items: string[];
  tone?: 'default' | 'warning' | 'profit' | 'loss' | 'accent';
}) {
  return (
    <InsetPanel tone={tone}>
      <p className="text-label mb-3">{title}</p>
      <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {items.length > 0 ? (
          items.map((item) => <li key={item}>- {item}</li>)
        ) : (
          <li style={{ color: 'var(--text-tertiary)' }}>No strong signal yet.</li>
        )}
      </ul>
    </InsetPanel>
  );
}

export function ReportBreakdownTable({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: ReportBreakdownRow[];
}) {
  return (
    <AppPanel>
      <PanelTitle title={title} subtitle={subtitle} />
      <ReportGrid>
        <ReportGridHeader columns="minmax(120px,1.3fr) 0.8fr 0.8fr 0.9fr 0.9fr 0.8fr">
          <span>Bucket</span>
          <span className="text-right">Trades</span>
          <span className="text-right">Share</span>
          <span className="text-right">Win Rate</span>
          <span className="text-right">Net P&L</span>
          <span className="text-right">Avg R</span>
        </ReportGridHeader>
        {rows.map((row) => (
          <ReportGridRow
            key={row.label}
            columns="minmax(120px,1.3fr) 0.8fr 0.8fr 0.9fr 0.9fr 0.8fr"
          >
            <span className="text-sm font-medium">{row.label}</span>
            <span className="text-right mono text-sm">{row.trades}</span>
            <span className="text-right text-sm">{formatPercent(row.share)}</span>
            <span className="text-right text-sm">{formatPercent(row.winRate)}</span>
            <span className="text-right mono text-sm">{formatCurrency(row.pnl)}</span>
            <span className="text-right mono text-sm">{formatR(row.avgRMultiple)}</span>
          </ReportGridRow>
        ))}
      </ReportGrid>
    </AppPanel>
  );
}

export function ReportTagTable({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: ReportTagBreakdownRow[];
}) {
  return (
    <AppPanel>
      <PanelTitle title={title} subtitle={subtitle} />
      <ReportGrid minWidthClassName="min-w-[560px]">
        <ReportGridHeader columns="minmax(140px,1.2fr) 0.8fr 0.8fr 0.9fr 1fr">
          <span>Tag</span>
          <span className="text-right">Count</span>
          <span className="text-right">Share</span>
          <span className="text-right">Win Rate</span>
          <span className="text-right">Net P&L</span>
        </ReportGridHeader>
        {rows.map((row) => (
          <ReportGridRow
            key={row.tag}
            columns="minmax(140px,1.2fr) 0.8fr 0.8fr 0.9fr 1fr"
          >
            <span className="text-sm font-medium">{row.tag}</span>
            <span className="text-right mono text-sm">{row.count}</span>
            <span className="text-right text-sm">{formatPercent(row.share)}</span>
            <span className="text-right text-sm">{formatPercent(row.winRate)}</span>
            <span className="text-right mono text-sm">{formatCurrency(row.pnl)}</span>
          </ReportGridRow>
        ))}
      </ReportGrid>
    </AppPanel>
  );
}

export function ReportDetailedTradeTable({
  rows,
}: {
  rows: ReportDetailedTradeRow[];
}) {
  return (
    <AppPanel>
      <PanelTitle
        title="Detailed Trade Table"
        subtitle="Trade-by-trade review of the exact rows used to generate this report."
      />
      <ReportGrid minWidthClassName="min-w-[1120px]">
        <ReportGridHeader columns="1fr 0.8fr 0.7fr 0.8fr 1fr 0.8fr 0.75fr 0.75fr 0.9fr 1.1fr 1.1fr">
          <span>Closed</span>
          <span>Symbol</span>
          <span>Dir</span>
          <span>Session</span>
          <span>Playbook</span>
          <span className="text-right">P&L</span>
          <span className="text-right">R</span>
          <span className="text-right">Hold</span>
          <span className="text-right">Conviction</span>
          <span>Setup Tags</span>
          <span>Mistake Tags</span>
        </ReportGridHeader>
        {rows.map((row) => (
          <ReportGridRow
            key={row.id}
            columns="1fr 0.8fr 0.7fr 0.8fr 1fr 0.8fr 0.75fr 0.75fr 0.9fr 1.1fr 1.1fr"
          >
            <span className="text-sm">
              {row.closedAt ? new Date(row.closedAt).toLocaleDateString() : '--'}
            </span>
            <span className="mono text-sm">{row.symbol}</span>
            <span className="text-sm">{row.direction}</span>
            <span className="text-sm">{row.session}</span>
            <span className="truncate text-sm">{row.playbook}</span>
            <span className="mono text-right text-sm">{formatCurrency(row.pnl)}</span>
            <span className="mono text-right text-sm">{formatR(row.rMultiple)}</span>
            <span className="text-right text-sm">{formatHoldMinutes(row.holdMinutes)}</span>
            <span className="text-right text-sm">
              {row.conviction != null ? `${row.conviction}/5` : '--'}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {row.setupTags.length > 0 ? row.setupTags.join(', ') : '--'}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {row.mistakeTags.length > 0 ? row.mistakeTags.join(', ') : '--'}
            </span>
          </ReportGridRow>
        ))}
      </ReportGrid>
    </AppPanel>
  );
}
