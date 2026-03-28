import { z } from 'zod';
import {
    DEFAULT_CHART_TIMEFRAME,
    SUPPORTED_CHART_TIMEFRAMES,
} from '@/lib/chart/timeframes';

export const TerminalHeartbeatPayloadSchema = z.object({
    terminalId: z.string().uuid(),
    accountInfo: z.object({
        balance: z.number(),
        equity: z.number(),
        margin: z.number().optional(),
        freeMargin: z.number().optional(),
    }).optional(),
    sessionInfo: z.object({
        login: z.string().min(1),
        server: z.string().min(1),
        accountName: z.string().optional(),
        company: z.string().optional(),
        currency: z.string().optional(),
    }).optional(),
    syncState: z.object({
        totalDeals: z.number().int().min(0),
        openPositions: z.number().int().min(0),
        lastHistorySyncAt: z.string().min(1),
        lastHistorySyncReason: z.enum(['startup', 'poll', 'new_deal', 'no_change']),
    }).optional(),
});

export const TerminalTradePayloadSchema = z.object({
    ticket: z.string(),
    symbol: z.string().min(1).max(20),
    type: z.enum(['BUY', 'SELL']),
    volume: z.number().positive().optional(),
    openPrice: z.number().optional(),
    closePrice: z.number().optional(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
    openTimeUnix: z.number().int().positive().optional(),
    closeTimeUnix: z.number().int().positive().optional(),
    commission: z.number().optional(),
    swap: z.number().optional(),
    profit: z.number().optional(),
    comment: z.string().optional(),
    positionId: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
    magic: z.number().int().optional(),
    entryType: z.number().int().min(0).max(2).optional(),
    reason: z.number().int().optional(),
    stopLoss: z.number().optional(),
    takeProfit: z.number().optional(),
    contractSize: z.number().positive().optional(),
});

export const TerminalSyncPayloadSchema = z.object({
    terminalId: z.string().uuid(),
    trades: z.array(TerminalTradePayloadSchema),
    syncCursor: z.string().min(1).optional(),
});

export const TerminalPositionPayloadSchema = z.object({
    ticket: z.string(),
    positionId: z.string().optional(),
    symbol: z.string().min(1).max(20),
    type: z.enum(['BUY', 'SELL']),
    volume: z.number().positive(),
    openPrice: z.number(),
    currentPrice: z.number(),
    profit: z.number(),
    openTime: z.string(),
    openTimeUnix: z.number().int().positive().optional(),
    stopLoss: z.number().optional(),
    takeProfit: z.number().optional(),
    commission: z.number().optional(),
    swap: z.number().optional(),
    comment: z.string().optional(),
});

export const TerminalPositionsPayloadSchema = z.object({
    terminalId: z.string().uuid(),
    positions: z.array(TerminalPositionPayloadSchema),
});

export const TerminalCandlePayloadSchema = z.object({
    time: z.number().int().positive(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number().optional(),
});

export const TerminalCandlesSyncPayloadSchema = z.object({
    terminalId: z.string().uuid(),
    tradeId: z.string().uuid(),
    symbol: z.string().min(1).max(20),
    commandId: z.string().uuid().optional(),
    timeframe: z.enum(SUPPORTED_CHART_TIMEFRAMES).default(DEFAULT_CHART_TIMEFRAME),
    candles: z.array(TerminalCandlePayloadSchema),
});
