/**
 * Client-safe Strategies API
 * Uses fetch() against the dedicated `/api/strategies` surface.
 */

import { readJsonIfAvailable } from '@/lib/api/client/http';
import type { Strategy, StrategyInsert } from '@/lib/api/strategies';

export type { Strategy, StrategyInsert };

interface ApiErrorPayload {
  error?: string;
  message?: string;
}

function isApiErrorPayload(payload: unknown): payload is ApiErrorPayload {
  return (
    !!payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    ('error' in payload || 'message' in payload)
  );
}

function getApiErrorMessage(payload: unknown, fallback: string) {
  if (isApiErrorPayload(payload) && typeof payload.error === 'string') {
    return payload.error;
  }

  if (isApiErrorPayload(payload) && typeof payload.message === 'string') {
    return payload.message;
  }

  return fallback;
}

export interface StrategyStats {
  strategy: Strategy;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgRMultiple: number;
  totalPnl: number;
}

export async function getStrategies(): Promise<Strategy[]> {
  const res = await fetch('/api/strategies');
  const payload = await readJsonIfAvailable<Strategy[] | ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, 'Failed to load strategies'));
  }

  if (!payload || !Array.isArray(payload)) {
    throw new Error('Failed to load strategies');
  }

  return payload;
}

export async function getActiveStrategies(): Promise<Strategy[]> {
  const res = await fetch('/api/strategies?active=true');
  const payload = await readJsonIfAvailable<Strategy[] | ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, 'Failed to load strategies'));
  }

  if (!payload || !Array.isArray(payload)) {
    throw new Error('Failed to load strategies');
  }

  return payload;
}

export async function getStrategy(id: string): Promise<Strategy> {
  const res = await fetch(`/api/strategies/${id}`);
  const payload = await readJsonIfAvailable<Strategy | ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, 'Failed to load strategy'));
  }

  if (!payload || Array.isArray(payload) || isApiErrorPayload(payload)) {
    throw new Error('Failed to load strategy');
  }

  return payload;
}

export async function createStrategy(
  data: Omit<StrategyInsert, 'userId'>,
): Promise<Strategy> {
  const res = await fetch('/api/strategies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const payload = await readJsonIfAvailable<Strategy | ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, 'Failed to create strategy'));
  }

  if (!payload || Array.isArray(payload) || isApiErrorPayload(payload)) {
    throw new Error('Failed to create strategy');
  }

  return payload;
}

export async function updateStrategy(
  id: string,
  updates: Partial<Omit<StrategyInsert, 'id' | 'userId'>>,
): Promise<Strategy> {
  const res = await fetch(`/api/strategies/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const payload = await readJsonIfAvailable<Strategy | ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, 'Failed to update strategy'));
  }

  if (!payload || Array.isArray(payload) || isApiErrorPayload(payload)) {
    throw new Error('Failed to update strategy');
  }

  return payload;
}

export async function deleteStrategy(id: string): Promise<void> {
  const res = await fetch(`/api/strategies/${id}`, { method: 'DELETE' });
  const payload = await readJsonIfAvailable<ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, 'Failed to delete strategy'));
  }
}

export async function toggleStrategyActive(id: string): Promise<Strategy> {
  const res = await fetch(`/api/strategies/${id}/toggle-active`, {
    method: 'POST',
  });
  const payload = await readJsonIfAvailable<Strategy | ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, 'Failed to toggle strategy'));
  }

  if (!payload || Array.isArray(payload) || isApiErrorPayload(payload)) {
    throw new Error('Failed to toggle strategy');
  }

  return payload;
}

export async function duplicateStrategy(id: string): Promise<Strategy> {
  const res = await fetch(`/api/strategies/${id}/duplicate`, {
    method: 'POST',
  });
  const payload = await readJsonIfAvailable<Strategy | ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, 'Failed to duplicate strategy'));
  }

  if (!payload || Array.isArray(payload) || isApiErrorPayload(payload)) {
    throw new Error('Failed to duplicate strategy');
  }

  return payload;
}

export async function getAllStrategiesWithStats(
  propAccountId?: string | null,
): Promise<StrategyStats[]> {
  const searchParams = new URLSearchParams();
  if (propAccountId) {
    searchParams.set('propAccountId', propAccountId);
  }

  const qs = searchParams.toString();
  const res = await fetch(`/api/strategies/stats${qs ? `?${qs}` : ''}`);
  const payload = await readJsonIfAvailable<StrategyStats[] | ApiErrorPayload>(res);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(payload, 'Failed to load strategies'));
  }

  if (!payload || !Array.isArray(payload)) {
    throw new Error('Failed to load strategies');
  }

  return payload;
}
