/**
 * Client-safe Trades API
 * Uses fetch() to call /api/trades — safe to import in "use client" components.
 * Mirrors the same function signatures as lib/api/trades.ts (server version).
 */

import type { Trade, TradeFilters } from '@/lib/api/trades';
import { readJsonIfAvailable } from '@/lib/api/client/http';
export type { Trade, TradeFilters };

const TRADE_CACHE_TTL_MS = 15_000;
const tradeResponseCache = new Map<string, { expiresAt: number; data: Trade[] }>();
const pendingTradeRequests = new Map<string, Promise<Trade[]>>();

function buildQuery(filters?: TradeFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.direction) params.set('direction', filters.direction);
  if (filters.playbookId) params.set('playbookId', filters.playbookId);
  if (filters.propAccountId) params.set('propAccountId', filters.propAccountId);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.exitStartDate) params.set('exitStartDate', filters.exitStartDate);
  if (filters.exitEndDate) params.set('exitEndDate', filters.exitEndDate);
  if (filters.search) params.set('search', filters.search);
  if (typeof filters.limit === 'number' && Number.isFinite(filters.limit)) {
    params.set('limit', String(filters.limit));
  }
  if (typeof filters.offset === 'number' && Number.isFinite(filters.offset)) {
    params.set('offset', String(filters.offset));
  }
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function getCacheKey(filters?: TradeFilters): string {
  return `/api/trades${buildQuery(filters)}`;
}

function clearTradeQueryCache() {
  tradeResponseCache.clear();
  pendingTradeRequests.clear();
}

export async function getTrades(filters?: TradeFilters): Promise<Trade[]> {
  const cacheKey = getCacheKey(filters);
  const now = Date.now();
  const cached = tradeResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const pending = pendingTradeRequests.get(cacheKey);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    try {
      const res = await fetch(cacheKey);
      if (!res.ok) return [];
      const data = (await readJsonIfAvailable<Trade[]>(res)) ?? [];
      tradeResponseCache.set(cacheKey, {
        expiresAt: Date.now() + TRADE_CACHE_TTL_MS,
        data,
      });
      return data;
    } catch {
      return [];
    } finally {
      pendingTradeRequests.delete(cacheKey);
    }
  })();

  pendingTradeRequests.set(cacheKey, request);

  try {
    return await request;
  } catch {
    return [];
  }
}

export async function getTrade(id: string): Promise<Trade | null> {
  try {
    const res = await fetch(`/api/trades/${id}`);
    if (!res.ok) return null;
    return (await readJsonIfAvailable<Trade>(res)) ?? null;
  } catch {
    return null;
  }
}

export async function createTrade(trade: Omit<Trade, 'id' | 'userId' | 'createdAt'>): Promise<Trade> {
  const res = await fetch('/api/trades', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trade),
  });
  if (!res.ok) {
    const err = (await readJsonIfAvailable<{ error?: string }>(res)) ?? { error: 'Unknown error' };
    throw new Error(err.error ?? 'Failed to create trade');
  }
  const createdTrade = await readJsonIfAvailable<Trade>(res);
  if (!createdTrade) throw new Error('Failed to create trade');
  clearTradeQueryCache();
  return createdTrade;
}

export async function updateTrade(id: string, updates: Partial<Trade>): Promise<Trade> {
  const res = await fetch(`/api/trades/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update trade');
  const trade = await readJsonIfAvailable<Trade>(res);
  if (!trade) throw new Error('Failed to update trade');
  clearTradeQueryCache();
  return trade;
}

export async function deleteTrade(id: string): Promise<void> {
  const res = await fetch(`/api/trades/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete trade');
  clearTradeQueryCache();
}

export async function getTradesByDateRange(
  startDate: string,
  endDate: string,
  propAccountId?: string | null
): Promise<Trade[]> {
  return getTrades({ startDate, endDate, propAccountId: propAccountId ?? undefined });
}

export async function getOpenTrades(): Promise<Trade[]> {
  return getTrades({ status: 'OPEN' });
}
