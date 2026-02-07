/**
 * Terminal Farm Types
 * Type definitions for MT5 terminal management and EA communication
 */

// Terminal status enum matching database constraint
export type TerminalStatus = 'PENDING' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'STOPPED' | 'ERROR';

// Terminal instance from database
export interface TerminalInstance {
    id: string;
    account_id: string;
    user_id: string;
    container_id: string | null;
    status: TerminalStatus;
    terminal_port: number | null;
    last_heartbeat: string | null;
    last_sync_at: string | null;
    error_message: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

// Command queue entry
export interface TerminalCommand {
    id: string;
    terminal_id: string;
    command: string;
    payload: string | null;
    status: 'PENDING' | 'DISPATCHED' | 'COMPLETED' | 'FAILED';
    created_at: string;
    dispatched_at: string | null;
    completed_at: string | null;
}

// ============================================
// EA Webhook DTOs (incoming from MT5)
// ============================================

export interface TerminalHeartbeatPayload {
    terminalId: string;
    accountInfo?: {
        balance: number;
        equity: number;
        margin: number;
        freeMargin: number;
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
    commission?: number;
    swap?: number;
    profit?: number;
    comment?: string;
    positionId?: number;
    magic?: number;
    entryType?: number; // 0 = IN, 1 = OUT
    reason?: number;
    stopLoss?: number;
    takeProfit?: number;
    contractSize?: number;
}

export interface TerminalSyncPayload {
    terminalId: string;
    trades: TerminalTradePayload[];
}

export interface TerminalPositionPayload {
    ticket: string;
    symbol: string;
    type: 'BUY' | 'SELL';
    volume: number;
    openPrice: number;
    currentPrice: number;
    profit: number;
    openTime: string;
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

export interface HeartbeatResponse {
    success: boolean;
    command?: string;
    payload?: string;
    error?: string;
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
