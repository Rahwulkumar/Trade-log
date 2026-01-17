/**
 * Client-side API helpers for MT5 integration
 */

export interface ConnectMT5Params {
    propAccountId: string;
    server: string;
    login: string;
    password: string;
}

export interface MT5ConnectionStatus {
    id: string;
    server: string;
    login: string;
    status: string;
    lastSyncedAt: string | null;
    syncsThisMonth: number;
    syncsRemaining: number;
    syncLimit: number;
    errorMessage: string | null;
}

export interface SyncResult {
    success: boolean;
    newTrades?: number;
    skippedTrades?: number;
    message?: string;
    error?: string;
}

/**
 * Create a new MT5 connection
 */
export async function connectMT5(params: ConnectMT5Params): Promise<{ success: boolean; connectionId?: string; error?: string }> {
    const response = await fetch('/api/mt5/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
        return { success: false, error: data.error || 'Failed to connect' };
    }

    return { success: true, connectionId: data.connectionId };
}

/**
 * Get MT5 connection status for a prop account
 */
export async function getMT5Status(propAccountId: string): Promise<{ connected: boolean; connection: MT5ConnectionStatus | null }> {
    const response = await fetch(`/api/mt5/status?propAccountId=${propAccountId}`);
    const data = await response.json();

    return {
        connected: data.connected || false,
        connection: data.connection || null,
    };
}

/**
 * Trigger MT5 sync
 */
export async function syncMT5(connectionId: string): Promise<SyncResult> {
    const response = await fetch('/api/mt5/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
    });

    const data = await response.json();
    return data;
}

/**
 * Disconnect/remove MT5 connection
 */
export async function disconnectMT5(connectionId: string): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`/api/mt5/connect?connectionId=${connectionId}`, {
        method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
        return { success: false, error: data.error || 'Failed to disconnect' };
    }

    return { success: true };
}
