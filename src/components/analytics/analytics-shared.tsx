'use client';

import type { SessionBucket } from '@/lib/analytics/types';
import { InsetPanel } from '@/components/ui/surface-primitives';

export const TT = {
  contentStyle: {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 10,
    fontSize: 12,
    color: 'var(--text-primary)',
  },
  labelStyle: { color: 'var(--text-secondary)', fontWeight: 600 },
};

export function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

export function formatSignedCurrency(value: number): string {
  return `${value >= 0 ? '+' : '-'}${formatCurrency(Math.abs(value))}`;
}

export function formatPercent(value: number | null): string {
  return value == null ? '--' : `${value.toFixed(2)}%`;
}

export function qualityTag(
  label: string,
  value: number | null,
  good: number,
  excellent: number,
) {
  if (value == null) {
    return {
      label: 'Need Data',
      tone: 'default' as const,
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
      tone: 'profit' as const,
    };
  }

  if (quality === 'good') {
    return {
      label: 'Good',
      tone: 'warning' as const,
    };
  }

  return {
    label: 'Needs Work',
    tone: 'loss' as const,
  };
}

export function badgeToneStyles(
  tone: 'default' | 'profit' | 'loss' | 'warning' | 'accent',
) {
  if (tone === 'profit') {
    return {
      color: 'var(--profit-primary)',
      background: 'var(--profit-bg)',
    };
  }

  if (tone === 'loss') {
    return {
      color: 'var(--loss-primary)',
      background: 'var(--loss-bg)',
    };
  }

  if (tone === 'warning') {
    return {
      color: 'var(--warning-primary)',
      background: 'var(--warning-bg)',
    };
  }

  if (tone === 'accent') {
    return {
      color: 'var(--accent-primary)',
      background: 'var(--accent-soft)',
    };
  }

  return {
    color: 'var(--text-secondary)',
    background: 'var(--surface)',
  };
}

export function SessionCard(props: SessionBucket) {
  return (
    <InsetPanel className="relative overflow-hidden" paddingClassName="p-0">
      <div
        className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
        style={{ background: props.color }}
      />
      <div className="space-y-3 px-4 py-4 pl-6">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-semibold">{props.session}</h4>
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {props.range}
            </p>
          </div>
          <span
            className="mono text-[11px] font-semibold"
            style={{
              color:
                props.pnl >= 0 ? 'var(--profit-primary)' : 'var(--loss-primary)',
            }}
          >
            {formatSignedCurrency(props.pnl)}
          </span>
        </div>
        <div
          className="grid grid-cols-3 gap-2 text-[10px]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <div>
            <p>Trades</p>
            <p
              className="mono mt-0.5 text-[11px] font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {props.trades}
            </p>
          </div>
          <div>
            <p>Win Rate</p>
            <p
              className="mono mt-0.5 text-[11px] font-semibold"
              style={{
                color:
                  props.winRate >= 50
                    ? 'var(--profit-primary)'
                    : 'var(--loss-primary)',
              }}
            >
              {props.winRate.toFixed(0)}%
            </p>
          </div>
          <div>
            <p>Avg Trade</p>
            <p
              className="mono mt-0.5 text-[11px] font-semibold"
              style={{
                color:
                  props.avgPnl >= 0
                    ? 'var(--profit-primary)'
                    : 'var(--loss-primary)',
              }}
            >
              {formatSignedCurrency(props.avgPnl)}
            </p>
          </div>
        </div>
      </div>
    </InsetPanel>
  );
}

export function ConsistencyGauge({ score }: { score: number }) {
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
          {Math.round(score)}
        </text>
      </svg>
      <span className="text-[11px] font-semibold" style={{ color }}>
        {score >= 75 ? 'Consistent' : score >= 50 ? 'Moderate' : 'Inconsistent'}
      </span>
    </div>
  );
}
