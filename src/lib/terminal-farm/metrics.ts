/**
 * Terminal Farm Metrics
 * Tracks performance and health metrics for monitoring
 */

export interface SyncMetrics {
    terminalId: string;
    timestamp: string;
    tradesProcessed: number;
    tradesImported: number;
    tradesSkipped: number;
    errors: number;
    durationMs: number;
    batchSize?: number;
}

export interface TerminalHealth {
    terminalId: string;
    status: string;
    lastHeartbeat: string | null;
    lastSyncAt: string | null;
    heartbeatAgeMs: number | null;
    syncAgeMs: number | null;
    isHealthy: boolean;
}

/**
 * Log sync metrics (can be extended to send to monitoring service)
 */
export function logSyncMetrics(metrics: SyncMetrics): void {
    const logLevel = metrics.errors > 0 ? 'warn' : 'info';
    console[logLevel](
        `[TerminalFarm/Metrics] Terminal ${metrics.terminalId}: ` +
        `${metrics.tradesImported}/${metrics.tradesProcessed} imported, ` +
        `${metrics.tradesSkipped} skipped, ${metrics.errors} errors, ` +
        `${metrics.durationMs}ms`
    );

    // TODO: Send to monitoring service (e.g., Sentry, DataDog, etc.)
    // if (metrics.errors > 0) {
    //     monitoringService.trackError('terminal_sync_error', metrics);
    // }
}

/**
 * Calculate terminal health status
 */
export function calculateTerminalHealth(terminal: {
    id: string;
    status: string;
    last_heartbeat: string | null;
    last_sync_at: string | null;
}): TerminalHealth {
    const now = Date.now();
    const heartbeatAge = terminal.last_heartbeat
        ? now - new Date(terminal.last_heartbeat).getTime()
        : null;
    const syncAge = terminal.last_sync_at
        ? now - new Date(terminal.last_sync_at).getTime()
        : null;

    // Terminal is healthy if:
    // - Status is RUNNING
    // - Last heartbeat was < 2 minutes ago (EA sends every 30s)
    // - Last sync was < 1 hour ago (or never synced yet)
    const isHealthy =
        terminal.status === 'RUNNING' &&
        (heartbeatAge === null || heartbeatAge < 120000) &&
        (syncAge === null || syncAge < 3600000);

    return {
        terminalId: terminal.id,
        status: terminal.status,
        lastHeartbeat: terminal.last_heartbeat,
        lastSyncAt: terminal.last_sync_at,
        heartbeatAgeMs: heartbeatAge,
        syncAgeMs: syncAge,
        isHealthy,
    };
}
