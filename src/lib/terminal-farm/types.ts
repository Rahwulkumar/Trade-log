/**
 * Terminal Farm Types
 * Type definitions for MT5 terminal management and EA communication
 */

import type { ChartTimeframe } from '@/lib/chart/timeframes';

// Terminal status enum matching database constraint
export type TerminalStatus = 'PENDING' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'STOPPED' | 'ERROR';
export type TerminalSyncProvider = 'terminal_farm' | 'metaapi' | 'windows_mt5_python';
export type TerminalWebhookCode =
    | 'OK'
    | 'UNKNOWN_TERMINAL'
    | 'SESSION_MISMATCH'
    | 'ACCOUNT_NOT_LOADED'
    | 'TERMINAL_DISABLED'
    | 'INVALID_PAYLOAD'
    | 'UNAUTHORIZED'
    | 'ZERO_DEALS'
    | 'NO_NEW_DEALS'
    | 'TRADES_IMPORTED'
    | 'POSITIONS_UPDATED'
    | 'RATE_LIMITED'
    | 'INTERNAL_ERROR';
export type TerminalHistorySyncReason = 'startup' | 'poll' | 'new_deal' | 'no_change';
export type ResetMt5SyncReason = 'manual_reset' | 'reconnect' | 'delete_account';

// Terminal instance from database (camelCase to match Drizzle/Neon schema)
export interface TerminalInstance {
    id: string;
    accountId: string;
    userId: string;
    containerId: string | null;
    status: TerminalStatus;
    terminalPort: number | null;
    lastHeartbeat: string | null;  // ISO string from DB
    lastSyncAt: string | null;    // ISO string from DB
    errorMessage: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

// Command queue entry (camelCase to match Drizzle/Neon schema)
export interface TerminalCommand {
    id: string;
    terminalId: string;
    command: string;
    payload: string | null;
    status: 'PENDING' | 'DISPATCHED' | 'COMPLETED' | 'FAILED';
    createdAt: Date;
    dispatchedAt: Date | null;
    completedAt: Date | null;
}

// ============================================
// EA Webhook DTOs (incoming from MT5)
// ============================================

export interface TerminalHeartbeatPayload {
    terminalId: string;
    accountInfo?: {
        balance: number;
        equity: number;
        margin?: number;
        freeMargin?: number;
    };
    sessionInfo?: {
        login: string;
        server: string;
        accountName?: string;
        company?: string;
        currency?: string;
    };
    syncState?: {
        totalDeals: number;
        openPositions: number;
        lastHistorySyncAt: string;
        lastHistorySyncReason: TerminalHistorySyncReason;
    };
}

export interface TerminalTradePayload {
    ticket: string;
    symbol: string;
    type: 'BUY' | 'SELL';
    volume?: number;
    openPrice?: number;
    closePrice?: number;
    openTime?: string;
    closeTime?: string;
    openTimeUnix?: number;
    closeTimeUnix?: number;
    commission?: number;
    swap?: number;
    profit?: number;
    comment?: string;
    positionId?: string | number;
    magic?: number;
    entryType?: number; // 0 = IN, 1 = OUT, 2 = INOUT
    reason?: number;
    stopLoss?: number;
    takeProfit?: number;
    contractSize?: number;
}

export interface TerminalSyncPayload {
    terminalId: string;
    trades: TerminalTradePayload[];
    syncCursor?: string;
}

export interface TerminalPositionPayload {
    ticket: string;
    positionId?: string;
    symbol: string;
    type: 'BUY' | 'SELL';
    volume: number;
    openPrice: number;
    currentPrice: number;
    profit: number;
    openTime: string;
    openTimeUnix?: number;
    stopLoss?: number;
    takeProfit?: number;
    commission?: number;
    swap?: number;
    comment?: string;
}

export interface TerminalPositionsPayload {
    terminalId: string;
    positions: TerminalPositionPayload[];
}

export interface TerminalCandlePayload {
    time: number; // Unix timestamp (seconds)
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

export interface TerminalCandlesSyncPayload {
    terminalId: string;
    tradeId: string;
    symbol: string;
    commandId?: string;
    timeframe?: ChartTimeframe;
    candles: TerminalCandlePayload[];
}

// Re-export common types for compatibility
export type ChartCandle = TerminalCandlePayload;

export interface ChartDataResult {
    symbol: string;
    candles: ChartCandle[];
}

// ============================================
// Orchestrator Config (outgoing to Python)
// ============================================

export interface OrchestratorTerminalConfig {
    id: string;
    status: 'RUNNING' | 'STOPPED';
    accountId: string;
    server?: string;
    login?: string;
    password?: string; // Decrypted only for orchestrator
    environment?: Record<string, string>;
}

// ============================================
// API Response Types
// ============================================

export interface TerminalStatusResponse {
    enabled: boolean;
    id?: string;
    status?: TerminalStatus;
    lastHeartbeat?: string;
    lastSyncAt?: string;
    errorMessage?: string;
}

export interface TerminalSyncDiagnostics {
    code:
        | 'OK'
        | 'NO_HEARTBEAT'
        | 'UNKNOWN_TERMINAL'
        | 'SESSION_MISMATCH'
        | 'ACCOUNT_NOT_LOADED'
        | 'ZERO_DEALS'
        | 'NO_NEW_DEALS'
        | 'TRADES_IMPORTED'
        | 'POSITIONS_UPDATED'
        | 'TERMINAL_DISABLED';
    message: string;
    sessionInfo?: {
        login: string;
        server: string;
        accountName?: string;
        company?: string;
        currency?: string;
    };
    lastHeartbeatAt?: string;
    lastTradeSyncAt?: string;
    lastPositionsSyncAt?: string;
    lastTradeImportCount?: number;
    lastTradeSkipCount?: number;
    lastSeenDealCount?: number;
    lastSeenOpenPositionCount?: number;
}

export interface MetaApiTerminalMetadata {
    accountId: string | null;
    state?: string | null;
    connectionStatus?: string | null;
    lastSyncAttemptAt?: string | null;
    lastSuccessfulSyncAt?: string | null;
    lastDealsCursor?: string | null;
    lastDealsWindowStart?: string | null;
    lastError?: string | null;
}

export interface WindowsMt5PythonMetadata {
    workerId?: string | null;
    workerHost?: string | null;
    loginState?: 'pending' | 'connected' | 'disconnected' | 'error';
    lastHeartbeatAt?: string | null;
    lastSuccessfulSyncAt?: string | null;
    lastDealsCursor?: string | null;
    lastError?: string | null;
}

export interface WindowsMt5ChartJob {
    commandId: string;
    tradeId: string;
    symbol: string;
    timeframe: string;
    startTime: string;
    endTime: string;
}

export interface WindowsMt5WorkerAssignment {
    terminalId: string;
    mt5AccountId: string;
    userId: string;
    desiredState: 'RUNNING' | 'STOPPED';
    accountName: string;
    server: string;
    login: string;
    password: string;
    lastHeartbeat: string | null;
    lastSyncAt: string | null;
    workerId: string | null;
    workerHost: string | null;
    chartJobs: WindowsMt5ChartJob[];
}

export interface TerminalWebhookResponse {
    success: boolean;
    code: TerminalWebhookCode;
    terminalId?: string;
    mt5AccountId?: string;
    propAccountId?: string;
    imported?: number;
    skipped?: number;
    command?: string;
    payload?: string;
    error?: string;
}

export type HeartbeatResponse = TerminalWebhookResponse;

export interface ResetMt5SyncResult {
    oldMt5AccountId: string | null;
    oldTerminalId: string | null;
    preservedTradeCount: number;
    reason: ResetMt5SyncReason;
}

export interface MT5Account {
    id: string;
    user_id: string;
    account_name: string;
    server: string;
    login: string;
    balance: number;
    equity: number;
    terminal_enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface TradeScreenshot {
    id: string;
    trade_id: string;
    url: string;
    caption?: string | null;
    timeframe?: string | null;
    created_at?: string;
    updated_at?: string;
}
