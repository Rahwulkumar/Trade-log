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

export async function getPropAccounts(): Promise<PropAccount[]> {
  try {
    const res = await fetch('/api/prop-accounts', { credentials: 'include' });
    if (!res.ok) return [];
    return (await readJsonIfAvailable<PropAccount[]>(res)) ?? [];
  } catch {
    return [];
  }
}

export async function getActivePropAccounts(): Promise<PropAccount[]> {
  try {
    const res = await fetch('/api/prop-accounts?active=true', { credentials: 'include' });
    if (!res.ok) return [];
    return (await readJsonIfAvailable<PropAccount[]>(res)) ?? [];
  } catch {
    return [];
  }
}

export async function getPropAccount(id: string): Promise<PropAccount | null> {
  try {
    const res = await fetch(`/api/prop-accounts/${id}`, { credentials: 'include' });
    if (!res.ok) return null;
    return (await readJsonIfAvailable<PropAccount>(res)) ?? null;
  } catch {
    return null;
  }
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
  if (!res.ok) throw new Error('Failed to create prop account');
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
  if (!res.ok) throw new Error('Failed to update prop account');
  const data = await readJsonIfAvailable<PropAccount>(res);
  if (!data) throw new Error('Failed to update prop account');
  return data;
}

export async function deletePropAccount(id: string): Promise<void> {
  const res = await fetch(`/api/prop-accounts/${id}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to delete prop account');
}

/**
 * Recalculate balances for ALL non-MT5 accounts in one request.
 * Uses 3 DB queries instead of N separate API calls.
 */
export async function recalculateAllBalances(): Promise<void> {
  try {
    await fetch('/api/prop-accounts/recalculate-all', {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Non-fatal — accounts load with existing balances
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
export async function checkCompliance(_accountId: string): Promise<ComplianceStatus> {
  return DEFAULT_COMPLIANCE;
}
