/**
 * Client-safe Trades API
 * Uses fetch() to call /api/trades — safe to import in "use client" components.
 * Mirrors the same function signatures as lib/api/trades.ts (server version).
 */

import type { Trade, TradeFilters } from '@/lib/api/trades';
import { readJsonIfAvailable } from '@/lib/api/client/http';
export type { Trade, TradeFilters };

function buildQuery(filters?: TradeFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.direction) params.set('direction', filters.direction);
  if (filters.playbookId) params.set('playbookId', filters.playbookId);
  if (filters.propAccountId) params.set('propAccountId', filters.propAccountId);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.search) params.set('search', filters.search);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function getTrades(filters?: TradeFilters): Promise<Trade[]> {
  try {
    const res = await fetch(`/api/trades${buildQuery(filters)}`);
    if (!res.ok) return [];
    return (await readJsonIfAvailable<Trade[]>(res)) ?? [];
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
  return trade;
}

export async function deleteTrade(id: string): Promise<void> {
  const res = await fetch(`/api/trades/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete trade');
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
