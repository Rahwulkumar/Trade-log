/**
 * Client-side API helpers for Terminal Farm integration
 */

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
export async function enableAutoSync(accountId: string): Promise<{ success: boolean; terminalId?: string; error?: string }> {
    const response = await fetch(`/api/mt5-accounts/${accountId}/enable-autosync`, {
        method: 'POST',
        credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
        return { success: false, error: data.error || 'Failed to enable auto-sync' };
    }

    return { success: true, terminalId: data.terminal?.id || data.terminalId };
}

/**
 * Disable auto-sync for an MT5 account
 */
export async function disableAutoSync(accountId: string): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`/api/mt5-accounts/${accountId}/disable-autosync`, {
        method: 'DELETE',
        credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
        return { success: false, error: data.error || 'Failed to disable auto-sync' };
    }

    return { success: true };
}

/**
 * Get terminal status for an MT5 account by MT5 account ID
 */
export async function getTerminalStatus(accountId: string): Promise<{ connected: boolean; terminal: TerminalStatus | null }> {
    const response = await fetch(`/api/mt5-accounts/${accountId}/terminal-status`, { credentials: 'include' });
    const data = await response.json();

    return {
        connected: data.connected || false,
        terminal: data.terminal || null,
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

export async function getTerminalStatusByPropAccount(propAccountId: string): Promise<{
    connected: boolean;
    terminal: TerminalStatus | null;
    mt5AccountId?: string;
    mt5Account?: MT5AccountInfo;
}> {
    const response = await fetch(`/api/mt5-accounts/by-prop-account/${propAccountId}/terminal-status`, { credentials: 'include' });
    const data = await response.json();

    return {
        connected: data.connected || false,
        terminal: data.terminal || null,
        mt5AccountId: data.mt5AccountId || undefined,
        mt5Account: data.mt5Account || undefined,
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
    if (!response.ok) return [];
    return response.json();
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
}): Promise<{ success: boolean; accountId?: string; error?: string }> {
    const response = await fetch('/api/mt5-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
        return { success: false, error: data.error || 'Failed to create account' };
    }

    return { success: true, accountId: data.accountId };
}
