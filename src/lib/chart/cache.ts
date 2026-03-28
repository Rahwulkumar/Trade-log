import 'server-only';

import { and, eq } from 'drizzle-orm';

import { DEFAULT_CHART_TIMEFRAME, type ChartTimeframe, isChartTimeframe } from '@/lib/chart/timeframes';
import { db } from '@/lib/db';
import { tradeChartCache, trades } from '@/lib/db/schema';
import type { ChartCandle } from '@/lib/terminal-farm/types';

type LegacyChartData = {
  candles?: unknown;
  symbol?: unknown;
  timeframe?: unknown;
  fetchedAt?: unknown;
  fetched_at?: unknown;
  source?: unknown;
};

export interface CachedTradeChart {
  candles: ChartCandle[];
  symbol: string;
  timeframe: ChartTimeframe;
  fetchedAt: string | null;
  source: string | null;
}

interface SaveTradeChartCacheInput {
  tradeId: string;
  timeframe: ChartTimeframe;
  symbol: string;
  candles: ChartCandle[];
  source: string;
  fetchedAt?: string;
}

let warnedMissingTable = false;
const TRUSTED_CHART_SOURCES = new Set(['terminal_farm', 'derived_from_1m']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeCandles(raw: unknown): ChartCandle[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter(isRecord)
    .map((item) => {
      const time = Number(item.time);
      const open = Number(item.open);
      const high = Number(item.high);
      const low = Number(item.low);
      const close = Number(item.close);
      const volume =
        item.volume == null || item.volume === ''
          ? undefined
          : Number(item.volume);

      if (
        !Number.isFinite(time) ||
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
      ) {
        return null;
      }

      return {
        time,
        open,
        high,
        low,
        close,
        ...(Number.isFinite(volume) ? { volume } : {}),
      } satisfies ChartCandle;
    })
    .filter((item): item is ChartCandle => item !== null);
}

function normalizeChartTimeframe(
  raw: unknown,
  fallback: ChartTimeframe = DEFAULT_CHART_TIMEFRAME,
): ChartTimeframe {
  return typeof raw === 'string' && isChartTimeframe(raw) ? raw : fallback;
}

function isTrustedChartSource(value: unknown): value is string {
  return typeof value === 'string' && TRUSTED_CHART_SOURCES.has(value);
}

function normalizeLegacyChart(
  raw: unknown,
  timeframe: ChartTimeframe,
): CachedTradeChart | null {
  const data = isRecord(raw) ? (raw as LegacyChartData) : null;
  if (!data) {
    return null;
  }

  const candles = normalizeCandles(data.candles);
  if (candles.length === 0) {
    return null;
  }

  const storedTimeframe = normalizeChartTimeframe(
    data.timeframe,
    DEFAULT_CHART_TIMEFRAME,
  );

  if (storedTimeframe !== timeframe) {
    return null;
  }

  if (!isTrustedChartSource(data.source)) {
    return null;
  }

  return {
    candles,
    symbol: typeof data.symbol === 'string' ? data.symbol : '',
    timeframe: storedTimeframe,
    fetchedAt:
      typeof data.fetchedAt === 'string'
        ? data.fetchedAt
        : typeof data.fetched_at === 'string'
          ? data.fetched_at
          : null,
    source: typeof data.source === 'string' ? data.source : null,
  };
}

function isMissingTradeChartCacheTable(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('trade_chart_cache') &&
    (message.includes('does not exist') || message.includes('relation'))
  );
}

function warnMissingTradeChartCacheTable(error: unknown) {
  if (warnedMissingTable || !isMissingTradeChartCacheTable(error)) {
    return;
  }

  warnedMissingTable = true;
  console.warn(
    '[ChartCache] trade_chart_cache table is missing. Falling back to legacy trade.chartData storage.',
  );
}

async function readLegacyTradeChart(
  tradeId: string,
  timeframe: ChartTimeframe,
): Promise<CachedTradeChart | null> {
  const [row] = await db
    .select({ chartData: trades.chartData })
    .from(trades)
    .where(eq(trades.id, tradeId))
    .limit(1);

  return normalizeLegacyChart(row?.chartData, timeframe);
}

async function writeLegacyTradeChart(
  input: SaveTradeChartCacheInput,
): Promise<void> {
  await db
    .update(trades)
    .set({
      chartData: {
        candles: input.candles,
        symbol: input.symbol,
        timeframe: input.timeframe,
        fetchedAt: input.fetchedAt ?? new Date().toISOString(),
        source: input.source,
      },
    })
    .where(eq(trades.id, input.tradeId));
}

export async function getCachedTradeChart(
  tradeId: string,
  timeframe: ChartTimeframe = DEFAULT_CHART_TIMEFRAME,
): Promise<CachedTradeChart | null> {
  try {
    const [row] = await db
      .select({
        candles: tradeChartCache.candles,
        symbol: tradeChartCache.symbol,
        timeframe: tradeChartCache.timeframe,
        fetchedAt: tradeChartCache.fetchedAt,
        source: tradeChartCache.source,
      })
      .from(tradeChartCache)
      .where(
        and(
          eq(tradeChartCache.tradeId, tradeId),
          eq(tradeChartCache.timeframe, timeframe),
        ),
      )
      .limit(1);

    if (row) {
      if (!isTrustedChartSource(row.source)) {
        return null;
      }

      const candles = normalizeCandles(row.candles);
      if (candles.length > 0) {
        return {
          candles,
          symbol: row.symbol,
          timeframe: normalizeChartTimeframe(row.timeframe, timeframe),
          fetchedAt: row.fetchedAt?.toISOString() ?? null,
          source: row.source ?? null,
        };
      }
    }
  } catch (error) {
    warnMissingTradeChartCacheTable(error);
    if (!isMissingTradeChartCacheTable(error)) {
      console.error('[ChartCache] Failed to read chart cache:', error);
    }
  }

  return readLegacyTradeChart(tradeId, timeframe);
}

export async function saveTradeChartCache(
  input: SaveTradeChartCacheInput,
): Promise<void> {
  const normalized: SaveTradeChartCacheInput = {
    ...input,
    candles: normalizeCandles(input.candles),
  };

  let wroteTimeframeCache = false;

  try {
    await db
      .insert(tradeChartCache)
      .values({
        tradeId: normalized.tradeId,
        timeframe: normalized.timeframe,
        symbol: normalized.symbol,
        candles: normalized.candles,
        source: normalized.source,
        fetchedAt: normalized.fetchedAt
          ? new Date(normalized.fetchedAt)
          : new Date(),
      })
      .onConflictDoUpdate({
        target: [tradeChartCache.tradeId, tradeChartCache.timeframe],
        set: {
          symbol: normalized.symbol,
          candles: normalized.candles,
          source: normalized.source,
          fetchedAt: normalized.fetchedAt
            ? new Date(normalized.fetchedAt)
            : new Date(),
          updatedAt: new Date(),
        },
      });

    wroteTimeframeCache = true;
  } catch (error) {
    warnMissingTradeChartCacheTable(error);
    if (!isMissingTradeChartCacheTable(error)) {
      console.error('[ChartCache] Failed to persist chart cache:', error);
    }
  }

  if (
    normalized.timeframe === DEFAULT_CHART_TIMEFRAME ||
    !wroteTimeframeCache
  ) {
    await writeLegacyTradeChart(normalized);
  }
}

export async function hasTradeChartCache(
  tradeId: string,
  timeframe: ChartTimeframe = DEFAULT_CHART_TIMEFRAME,
): Promise<boolean> {
  return !!(await getCachedTradeChart(tradeId, timeframe));
}

export async function clearTradeChartCache(
  tradeId: string,
  timeframe?: ChartTimeframe,
): Promise<void> {
  try {
    if (timeframe) {
      await db
        .delete(tradeChartCache)
        .where(
          and(
            eq(tradeChartCache.tradeId, tradeId),
            eq(tradeChartCache.timeframe, timeframe),
          ),
        );
    } else {
      await db.delete(tradeChartCache).where(eq(tradeChartCache.tradeId, tradeId));
    }
  } catch (error) {
    warnMissingTradeChartCacheTable(error);
    if (!isMissingTradeChartCacheTable(error)) {
      console.error('[ChartCache] Failed to clear chart cache:', error);
    }
  }

  if (!timeframe) {
    await db
      .update(trades)
      .set({ chartData: null })
      .where(eq(trades.id, tradeId));
    return;
  }

  const legacy = await readLegacyTradeChart(tradeId, timeframe);
  if (!legacy) {
    return;
  }

  await db
    .update(trades)
    .set({ chartData: null })
    .where(eq(trades.id, tradeId));
}
