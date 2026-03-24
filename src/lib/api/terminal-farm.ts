/**
 * Client-side API helpers for Terminal Farm integration
 */

import type {
    ResetMt5SyncReason,
    TerminalPositionPayload,
    TerminalSyncDiagnostics,
} from '@/lib/terminal-farm/types';
import { readJsonIfAvailable } from '@/lib/api/client/http';

async function getApiErrorMessage(
    response: Response,
    fallback: string
): Promise<string> {
    const data = await readJsonIfAvailable<{ error?: string }>(response);
    return data?.error || fallback;
}

export interface TerminalStatus {
    terminalId: string;
    status: 'PENDING' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'STOPPED' | 'ERROR';
    lastHeartbeat: string | null;
    lastSyncAt: string | null;
    errorMessage: string | null;
}

/**
 * Enable auto-sync for an MT5 account
 */
export async function enableAutoSync(accountId: string): Promise<{
    success: boolean;
    terminalId?: string;
    terminal?: TerminalStatus;
    error?: string;
}> {
    const response = await fetch(`/api/mt5-accounts/${accountId}/enable-autosync`, {
        method: 'POST',
        credentials: 'include',
    });

    const data = await readJsonIfAvailable<{
        error?: string;
        terminal?: {
            id?: string;
            status?: TerminalStatus['status'];
        };
        terminalId?: string;
    }>(response);

    if (!response.ok) {
        return { success: false, error: data?.error || 'Failed to enable auto-sync' };
    }

    const terminalId = data?.terminal?.id || data?.terminalId;
    const terminal = terminalId
        ? {
              terminalId,
              status: data?.terminal?.status || 'PENDING',
              lastHeartbeat: null,
              lastSyncAt: null,
              errorMessage: null,
          }
        : undefined;

    return { success: true, terminalId, terminal };
}

/**
 * Disable auto-sync for an MT5 account
 */
export async function disableAutoSync(accountId: string): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`/api/mt5-accounts/${accountId}/disable-autosync`, {
        method: 'DELETE',
        credentials: 'include',
    });

    const data = await readJsonIfAvailable<{ error?: string }>(response);

    if (!response.ok) {
        return { success: false, error: data?.error || 'Failed to disable auto-sync' };
    }

    return { success: true };
}

/**
 * Get terminal status for an MT5 account by MT5 account ID
 */
export async function getTerminalStatus(accountId: string): Promise<{ connected: boolean; terminal: TerminalStatus | null }> {
    const response = await fetch(`/api/mt5-accounts/${accountId}/terminal-status`, { credentials: 'include' });
    const data = await readJsonIfAvailable<{ connected?: boolean; terminal?: TerminalStatus | null }>(response);

    if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Failed to load terminal status'));
    }

    return {
        connected: data?.connected || false,
        terminal: data?.terminal || null,
    };
}

/**
 * Get terminal status for a prop account (finds MT5 account by prop_account_id)
 */
export interface MT5AccountInfo {
    mt5AccountId: string;
    server: string;
    login: string;
    accountName: string | null;
    balance: number | null;
    equity: number | null;
}

export interface TerminalStatusByPropAccountResult {
    connected: boolean;
    terminal: TerminalStatus | null;
    mt5AccountId?: string;
    mt5Account?: MT5AccountInfo;
    diagnostics: TerminalSyncDiagnostics | null;
    livePositions: TerminalPositionPayload[];
}

export async function getTerminalStatusByPropAccount(propAccountId: string): Promise<TerminalStatusByPropAccountResult> {
    const response = await fetch(`/api/mt5-accounts/by-prop-account/${propAccountId}/terminal-status`, { credentials: 'include' });
    const data = await readJsonIfAvailable<Partial<TerminalStatusByPropAccountResult>>(response);

    if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Failed to load prop account terminal status'));
    }

    return {
        connected: data?.connected || false,
        terminal: data?.terminal || null,
        mt5AccountId: data?.mt5AccountId || undefined,
        mt5Account: data?.mt5Account || undefined,
        diagnostics: data?.diagnostics || null,
        livePositions: Array.isArray(data?.livePositions) ? data.livePositions : [],
    };
}

export async function resetMt5SyncByPropAccount(
    propAccountId: string,
    reason: ResetMt5SyncReason = 'manual_reset'
): Promise<{
    success: boolean;
    cleared?: {
        oldMt5AccountId: string | null;
        oldTerminalId: string | null;
        preservedTradeCount: number;
        reason: ResetMt5SyncReason;
    };
    error?: string;
}> {
    const response = await fetch(`/api/mt5-accounts/by-prop-account/${propAccountId}/reset-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
    });

    const data = await readJsonIfAvailable<{
        error?: string;
        cleared?: {
            oldMt5AccountId: string | null;
            oldTerminalId: string | null;
            preservedTradeCount: number;
            reason: ResetMt5SyncReason;
        };
    }>(response);

    if (!response.ok) {
        return { success: false, error: data?.error || 'Failed to reset MT5 sync' };
    }

    return {
        success: true,
        cleared: data?.cleared,
    };
}

export interface MT5AccountSummary {
    id: string;
    propAccountId: string | null;
    accountName: string;
    server: string;
    login: string;
    balance: number | null;
    equity: number | null;
    propAccountSize: number | null;
}

/**
 * List current user's MT5 accounts (for size validation vs prop account).
 */
export async function getMT5Accounts(): Promise<MT5AccountSummary[]> {
    const response = await fetch('/api/mt5-accounts', { credentials: 'include' });
    if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Failed to load MT5 accounts'));
    }
    return (await readJsonIfAvailable<MT5AccountSummary[]>(response)) ?? [];
}

/**
 * Create MT5 account. Optionally pass currentBalance to validate against prop account size.
 */
export async function createMT5Account(params: {
    propAccountId: string;
    server: string;
    login: string;
    password: string;
    currentBalance?: number | null;
}): Promise<{ success: boolean; accountId?: string; error?: string; code?: string }> {
    const response = await fetch('/api/mt5-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
    });

    const data = await readJsonIfAvailable<{ accountId?: string; error?: string; code?: string }>(response);

    if (!response.ok) {
        return { success: false, error: data?.error || 'Failed to create account', code: data?.code };
    }

    return { success: true, accountId: data?.accountId };
}
