/**
 * Client-safe Prop Accounts API
 * Uses fetch() — safe to import in "use client" components.
 */

import type { PropAccount, PropAccountInsert } from '@/lib/db/schema';
import { readJsonIfAvailable } from '@/lib/api/client/http';
export type { PropAccount, PropAccountInsert };

export interface ComplianceStatus {
  isCompliant: boolean;
  dailyDdRemaining: number;
  totalDdRemaining: number;
  profitProgress: number | null;
  daysRemaining: number | null;
}

/** Default compliance — used inline to avoid N API calls (compliance is not yet implemented). */
export const DEFAULT_COMPLIANCE: ComplianceStatus = {
  isCompliant: true,
  dailyDdRemaining: 100,
  totalDdRemaining: 100,
  profitProgress: null,
  daysRemaining: null,
};

async function getApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const data = await readJsonIfAvailable<{ error?: string }>(response);
  return data?.error ?? fallback;
}

export async function getPropAccounts(): Promise<PropAccount[]> {
  const res = await fetch('/api/prop-accounts', { credentials: 'include' });
  if (!res.ok) {
    throw new Error(await getApiErrorMessage(res, 'Failed to load prop accounts'));
  }
  return (await readJsonIfAvailable<PropAccount[]>(res)) ?? [];
}

export async function getActivePropAccounts(): Promise<PropAccount[]> {
  const res = await fetch('/api/prop-accounts?active=true', { credentials: 'include' });
  if (!res.ok) {
    throw new Error(await getApiErrorMessage(res, 'Failed to load active prop accounts'));
  }
  return (await readJsonIfAvailable<PropAccount[]>(res)) ?? [];
}

export async function getPropAccount(id: string): Promise<PropAccount | null> {
  const res = await fetch(`/api/prop-accounts/${id}`, { credentials: 'include' });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(await getApiErrorMessage(res, 'Failed to load prop account'));
  }
  return (await readJsonIfAvailable<PropAccount>(res)) ?? null;
}

export async function createPropAccount(
  account: Omit<PropAccountInsert, 'userId'>
): Promise<PropAccount> {
  const res = await fetch('/api/prop-accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(account),
  });
  if (!res.ok) {
    throw new Error(await getApiErrorMessage(res, 'Failed to create prop account'));
  }
  const data = await readJsonIfAvailable<PropAccount>(res);
  if (!data) throw new Error('Failed to create prop account');
  return data;
}

export async function updatePropAccount(
  id: string,
  updates: Partial<PropAccount>
): Promise<PropAccount> {
  const res = await fetch(`/api/prop-accounts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    throw new Error(await getApiErrorMessage(res, 'Failed to update prop account'));
  }
  const data = await readJsonIfAvailable<PropAccount>(res);
  if (!data) throw new Error('Failed to update prop account');
  return data;
}

export async function deletePropAccount(id: string): Promise<void> {
  const res = await fetch(`/api/prop-accounts/${id}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) {
    throw new Error(await getApiErrorMessage(res, 'Failed to delete prop account'));
  }
}

/**
 * Recalculate balances for ALL non-MT5 accounts in one request.
 * Uses 3 DB queries instead of N separate API calls.
 */
export async function recalculateAllBalances(): Promise<void> {
  const res = await fetch('/api/prop-accounts/recalculate-all', {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(await getApiErrorMessage(res, 'Failed to recalculate balances'));
  }
}

/** @deprecated Use recalculateAllBalances() instead to avoid N API calls. */
export async function recalculateBalanceFromTrades(accountId: string): Promise<PropAccount | null> {
  try {
    const res = await fetch('/api/prop-accounts/recalculate-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ accountId }),
    });
    if (!res.ok) return null;
    return (await readJsonIfAvailable<PropAccount>(res)) ?? null;
  } catch {
    return null;
  }
}

/** @deprecated Compliance is not yet implemented — use DEFAULT_COMPLIANCE inline instead. */
export async function checkCompliance(): Promise<ComplianceStatus> {
  return DEFAULT_COMPLIANCE;
}
