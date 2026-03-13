/**
 * Terminal Farm Service
 * Core business logic for managing MT5 terminals and processing EA webhooks
 * Uses Neon (Drizzle) — no Supabase.
 */

import { eq, inArray, like, asc, and, isNull, sql, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import {
    terminalInstances,
    mt5Accounts,
    propAccounts,
    terminalCommands,
    trades,
    type TerminalInstance as SchemaTerminalInstance,
} from '@/lib/db/schema';
import { decrypt } from '@/lib/mt5/encryption';
import { retry } from './retry';
import { logSyncMetrics } from './metrics';
import {
    mergeTerminalMetadata,
    readMetaApiAccountId,
    readTerminalSyncProvider,
    readTerminalSyncDiagnostics,
} from './metadata';
import { removeMetaApiAccount } from '@/lib/metaapi/client';
import type {
    HeartbeatResponse,
    ResetMt5SyncReason,
    ResetMt5SyncResult,
    TerminalInstance,
    TerminalHeartbeatPayload,
    TerminalSyncPayload,
    TerminalPositionsPayload,
    TerminalCandlesSyncPayload,
    OrchestratorTerminalConfig,
    TerminalSyncDiagnostics,
    TerminalTradePayload,
    TerminalWebhookResponse,
} from './types';
import {
    TerminalHeartbeatPayloadSchema,
    TerminalSyncPayloadSchema,
    TerminalPositionsPayloadSchema,
    TerminalCandlesSyncPayloadSchema,
} from './validation';

function rowToTerminalInstance(row: SchemaTerminalInstance): TerminalInstance {
    return {
        id: row.id,
        accountId: row.accountId,
        userId: row.userId,
        containerId: row.containerId,
        status: row.status as TerminalInstance['status'],
        terminalPort: row.terminalPort,
        lastHeartbeat: row.lastHeartbeat?.toISOString() ?? null,
        lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
        errorMessage: row.errorMessage,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

function hasRecentHeartbeat(lastHeartbeat: string | null | undefined, thresholdMs = 120_000): boolean {
    if (!lastHeartbeat) return false;
    const lastBeatMs = new Date(lastHeartbeat).getTime();
    if (Number.isNaN(lastBeatMs)) return false;
    return Date.now() - lastBeatMs <= thresholdMs;
}

function buildDiagnostics(
    existing: TerminalSyncDiagnostics | null,
    patch: Partial<TerminalSyncDiagnostics> & Pick<TerminalSyncDiagnostics, 'code' | 'message'>
): TerminalSyncDiagnostics {
    return {
        ...(existing ?? {}),
        ...patch,
    };
}

async function getMt5AccountContext(accountId: string): Promise<{
    id: string;
    propAccountId: string | null;
    server: string;
    login: string;
    terminalEnabled: boolean | null;
} | null> {
    const [account] = await db
        .select({
            id: mt5Accounts.id,
            propAccountId: mt5Accounts.propAccountId,
            server: mt5Accounts.server,
            login: mt5Accounts.login,
            terminalEnabled: mt5Accounts.terminalEnabled,
        })
        .from(mt5Accounts)
        .where(eq(mt5Accounts.id, accountId))
        .limit(1);

    return account ?? null;
}

function getHeartbeatDiagnosticState(data: TerminalHeartbeatPayload): Pick<
    TerminalSyncDiagnostics,
    'code' | 'message' | 'lastSeenDealCount' | 'lastSeenOpenPositionCount'
> {
    const accountName = data.sessionInfo?.accountName?.trim() ?? '';
    const company = data.sessionInfo?.company?.trim() ?? '';
    const currency = data.sessionInfo?.currency?.trim() ?? '';
    const balance = Math.abs(data.accountInfo?.balance ?? 0);
    const equity = Math.abs(data.accountInfo?.equity ?? 0);
    const visibleDeals = data.syncState?.totalDeals ?? 0;
    const openPositions = data.syncState?.openPositions ?? 0;
    const hasAccountIdentity =
        accountName.length > 0 || company.length > 0 || currency.length > 0;
    const hasFinancialState = balance > 0.00001 || equity > 0.00001;
    const hasTradingState = visibleDeals > 0 || openPositions > 0;
    const appearsUnloaded =
        Boolean(data.sessionInfo?.login?.trim() && data.sessionInfo?.server?.trim()) &&
        !hasAccountIdentity &&
        !hasFinancialState &&
        !hasTradingState;

    if (!data.syncState) {
        if (appearsUnloaded) {
            return {
                code: 'ACCOUNT_NOT_LOADED',
                message:
                    'MT5 started with the expected login/server, but the broker account context is still empty. This usually means the broker server definition is missing or the terminal never completed the login handshake.',
            };
        }
        return {
            code: 'OK',
            message: 'Terminal heartbeat received.',
        };
    }

    if (appearsUnloaded) {
        return {
            code: 'ACCOUNT_NOT_LOADED',
            message:
                'MT5 is running but the broker account is not loaded. Login/server are present while account identity, balances, and history are empty. Seed the broker server files or verify the MT5 login session.',
            lastSeenDealCount: visibleDeals,
            lastSeenOpenPositionCount: openPositions,
        };
    }

    if (data.syncState.totalDeals === 0) {
        return {
            code: 'ZERO_DEALS',
            message: 'MT5 terminal is connected but has zero visible historical deals.',
            lastSeenDealCount: 0,
            lastSeenOpenPositionCount: data.syncState.openPositions,
        };
    }

    if (data.syncState.lastHistorySyncReason === 'no_change') {
        return {
            code: 'NO_NEW_DEALS',
            message: 'MT5 terminal is connected. No new deals were detected since the last history sync.',
            lastSeenDealCount: data.syncState.totalDeals,
            lastSeenOpenPositionCount: data.syncState.openPositions,
        };
    }

    return {
        code: 'OK',
        message: 'Terminal heartbeat received.',
        lastSeenDealCount: data.syncState.totalDeals,
        lastSeenOpenPositionCount: data.syncState.openPositions,
    };
}

type ExistingTradeMatch = {
    id: string;
    status: string;
    commission: string | null;
    swap: string | null;
    contractSize: string | null;
    positionSize: string | null;
    direction: string | null;
    entryDate: Date | null;
    entryPrice: string | null;
    stopLoss: string | null;
    takeProfit: string | null;
    externalId: string | null;
    externalDealId: string | null;
    lookupKeys: string[];
};

type TradeInsertRow = typeof trades.$inferInsert;
type TradeUpdateData = Partial<TradeInsertRow>;
type PendingTradeInsert = {
    row: TradeInsertRow;
    dependsOnTradeId: string | null;
    ticket: string;
};

function parseNumericValue(value: string | null | undefined): number {
    if (value == null || value === '') return 0;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function tryParseTradeDate(value?: string | null): Date | null {
    if (!value) {
        return null;
    }

    const normalized = value.trim();
    if (!normalized) {
        return null;
    }

    if (/^\d+$/.test(normalized)) {
        const numeric = Number(normalized);
        if (Number.isFinite(numeric)) {
            const ms = normalized.length > 10 ? numeric : numeric * 1000;
            const parsedNumeric = new Date(ms);
            if (!Number.isNaN(parsedNumeric.getTime())) {
                return parsedNumeric;
            }
        }
    }

    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed;
    }

    const mt5DateMatch = normalized.match(
        /^(\d{4})[./-](\d{2})[./-](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
    );
    if (!mt5DateMatch) {
        return null;
    }

    const [, year, month, day, hour, minute, second = '0'] = mt5DateMatch;
    const parsedMt5Date = new Date(
        Date.UTC(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hour),
            Number(minute),
            Number(second)
        )
    );

    return Number.isNaN(parsedMt5Date.getTime()) ? null : parsedMt5Date;
}

function requireTradeDate(value: string | null | undefined, fieldName: string): Date {
    const parsed = tryParseTradeDate(value);
    if (parsed) {
        return parsed;
    }

    throw new Error(`Invalid ${fieldName} timestamp: ${value ?? 'missing'}`);
}

function inferOpenDirectionFromDeal(type: TerminalTradePayload['type']): 'LONG' | 'SHORT' {
    return type === 'BUY' ? 'LONG' : 'SHORT';
}

function inferClosedPositionDirectionFromExit(type: TerminalTradePayload['type']): 'LONG' | 'SHORT' {
    return type === 'SELL' ? 'LONG' : 'SHORT';
}

function choosePrimaryTradeMatch(matches: ExistingTradeMatch[]): ExistingTradeMatch {
    const openTrade = matches.find(match => match.status === 'OPEN');
    if (openTrade) {
        return openTrade;
    }

    return [...matches].sort((left, right) => {
        const leftTime = left.entryDate?.getTime() ?? 0;
        const rightTime = right.entryDate?.getTime() ?? 0;
        return rightTime - leftTime;
    })[0];
}

async function findFuzzyOpenTradeForExit(
    accountId: string,
    trade: TerminalTradePayload,
    excludedTradeIds: Set<string>
): Promise<ExistingTradeMatch | null> {
    const expectedDirection = inferClosedPositionDirectionFromExit(trade.type);
    const candidates = await db
        .select({
            id: trades.id,
            status: trades.status,
            commission: trades.commission,
            swap: trades.swap,
            contractSize: trades.contractSize,
            positionSize: trades.positionSize,
            direction: trades.direction,
            entryDate: trades.entryDate,
            entryPrice: trades.entryPrice,
            stopLoss: trades.stopLoss,
            takeProfit: trades.takeProfit,
            externalId: trades.externalId,
            externalDealId: trades.externalDealId,
        })
        .from(trades)
        .where(
            and(
                eq(trades.mt5AccountId, accountId),
                eq(trades.status, 'OPEN'),
                eq(trades.symbol, trade.symbol),
                eq(trades.direction, expectedDirection)
            )
        );

    const unresolvedCandidates = candidates
        .filter(candidate => !excludedTradeIds.has(candidate.id))
        .map(candidate => ({
            ...candidate,
            lookupKeys: candidate.externalId ? [candidate.externalId] : [],
        }));

    if (unresolvedCandidates.length === 0) {
        return null;
    }

    const eventTimeMs = tryParseTradeDate(trade.openTime)?.getTime() ?? NaN;

    return unresolvedCandidates.sort((left, right) => {
        const leftSizeDiff = trade.volume != null
            ? Math.abs(parseNumericValue(left.positionSize) - trade.volume)
            : Number.MAX_SAFE_INTEGER;
        const rightSizeDiff = trade.volume != null
            ? Math.abs(parseNumericValue(right.positionSize) - trade.volume)
            : Number.MAX_SAFE_INTEGER;

        if (leftSizeDiff !== rightSizeDiff) {
            return leftSizeDiff - rightSizeDiff;
        }

        const leftTimeDiff = Number.isFinite(eventTimeMs) && left.entryDate
            ? Math.abs(left.entryDate.getTime() - eventTimeMs)
            : Number.MAX_SAFE_INTEGER;
        const rightTimeDiff = Number.isFinite(eventTimeMs) && right.entryDate
            ? Math.abs(right.entryDate.getTime() - eventTimeMs)
            : Number.MAX_SAFE_INTEGER;

        if (leftTimeDiff !== rightTimeDiff) {
            return leftTimeDiff - rightTimeDiff;
        }

        return (right.entryDate?.getTime() ?? 0) - (left.entryDate?.getTime() ?? 0);
    })[0] ?? null;
}

function buildClosedTradeUpdate(
    existing: ExistingTradeMatch,
    trade: TerminalTradePayload,
    linkedPropAccountId: string | null,
    positionSizeOverride?: number
): TradeUpdateData {
    return {
        status: 'CLOSED',
        ...(linkedPropAccountId ? { propAccountId: linkedPropAccountId } : {}),
        exitDate: requireTradeDate(trade.openTime, `trade ${trade.ticket} openTime`),
        exitPrice: trade.openPrice != null ? String(trade.openPrice) : null,
        pnl: trade.profit != null ? String(trade.profit) : null,
        commission: String(parseNumericValue(existing.commission) + (trade.commission ?? 0)),
        swap: String(parseNumericValue(existing.swap) + (trade.swap ?? 0)),
        contractSize:
            trade.contractSize != null
                ? String(trade.contractSize)
                : existing.contractSize,
        externalId: trade.positionId != null ? trade.positionId.toString() : existing.externalId,
        externalDealId: trade.ticket,
        ...(positionSizeOverride != null ? { positionSize: String(positionSizeOverride) } : {}),
    };
}

/**
 * Get terminal instance by ID
 */
export async function getTerminalById(terminalId: string): Promise<TerminalInstance | null> {
    const [row] = await db
        .select()
        .from(terminalInstances)
        .where(eq(terminalInstances.id, terminalId))
        .limit(1);
    return row ? rowToTerminalInstance(row) : null;
}

/**
 * Get terminal by account ID
 */
export async function getTerminalByAccountId(accountId: string): Promise<TerminalInstance | null> {
    const [row] = await db
        .select()
        .from(terminalInstances)
        .where(eq(terminalInstances.accountId, accountId))
        .limit(1);
    return row ? rowToTerminalInstance(row) : null;
}

export async function resetMt5SyncByPropAccount(
    propAccountId: string,
    userId: string,
    reason: ResetMt5SyncReason
): Promise<ResetMt5SyncResult> {
    const [propAccount] = await db
        .select({ id: propAccounts.id })
        .from(propAccounts)
        .where(and(eq(propAccounts.id, propAccountId), eq(propAccounts.userId, userId)))
        .limit(1);

    if (!propAccount) {
        throw new Error('Prop account not found');
    }

    const [mt5Account] = await db
        .select({
            id: mt5Accounts.id,
        })
        .from(mt5Accounts)
        .where(and(eq(mt5Accounts.propAccountId, propAccountId), eq(mt5Accounts.userId, userId)))
        .limit(1);

    const [tradeCountRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(trades)
        .where(eq(trades.propAccountId, propAccountId));

    let oldTerminalId: string | null = null;
    if (mt5Account) {
        const terminal = await getTerminalByAccountId(mt5Account.id);
        oldTerminalId = terminal?.id ?? null;

        const metaApiAccountId = terminal ? readMetaApiAccountId(terminal.metadata) : null;
        if (metaApiAccountId) {
            try {
                await removeMetaApiAccount(metaApiAccountId);
            } catch (error) {
                console.error(
                    `[TerminalFarm] Failed to remove MetaApi account ${metaApiAccountId} during reset:`,
                    error
                );
            }
        }

        await db
            .delete(mt5Accounts)
            .where(eq(mt5Accounts.id, mt5Account.id));
    }

    return {
        oldMt5AccountId: mt5Account?.id ?? null,
        oldTerminalId,
        preservedTradeCount: Number(tradeCountRow?.count ?? 0),
        reason,
    };
}

/**
 * Enable auto-sync for an MT5 account (create terminal instance)
 */
export async function enableAutoSync(accountId: string, userId: string): Promise<TerminalInstance> {
    const existing = await getTerminalByAccountId(accountId);
    if (existing) {
        const isHealthy =
            (existing.status === 'RUNNING' || existing.status === 'STARTING') &&
            hasRecentHeartbeat(existing.lastHeartbeat);

        await db
            .update(mt5Accounts)
            .set({ terminalEnabled: true })
            .where(eq(mt5Accounts.id, accountId));

        if (isHealthy) {
            return existing;
        }

        await db
            .delete(terminalInstances)
            .where(eq(terminalInstances.id, existing.id));
    }

    const [inserted] = await db
        .insert(terminalInstances)
        .values({
            accountId,
            userId,
            status: 'PENDING',
        })
        .returning();
    if (!inserted) throw new Error('Failed to create terminal instance');

    await db
        .update(mt5Accounts)
        .set({ terminalEnabled: true })
        .where(eq(mt5Accounts.id, accountId));

    return rowToTerminalInstance(inserted);
}

/**
 * Disable auto-sync for an MT5 account
 */
export async function disableAutoSync(accountId: string): Promise<void> {
    const terminal = await getTerminalByAccountId(accountId);
    if (terminal) {
        await db
            .update(terminalInstances)
            .set({ status: 'STOPPING' })
            .where(eq(terminalInstances.id, terminal.id));
    }
    await db
        .update(mt5Accounts)
        .set({ terminalEnabled: false })
        .where(eq(mt5Accounts.id, accountId));
}

/**
 * Get orchestrator configuration (all active terminals with decrypted credentials)
 */
export async function getOrchestratorConfig(): Promise<OrchestratorTerminalConfig[]> {
    const candidateTerminals = await db
        .select()
        .from(terminalInstances)
        .where(inArray(terminalInstances.status, ['PENDING', 'STARTING', 'RUNNING', 'STOPPING']));

    const terminals = candidateTerminals.filter(
        terminal => readTerminalSyncProvider(terminal.metadata as Record<string, unknown>) === 'terminal_farm'
    );

    const config: OrchestratorTerminalConfig[] = [];

    for (const terminal of terminals) {
        if (terminal.status === 'STOPPING') {
            config.push({
                id: terminal.id,
                status: 'STOPPED',
                accountId: terminal.accountId,
            });
            await db
                .update(terminalInstances)
                .set({ status: 'STOPPED' })
                .where(eq(terminalInstances.id, terminal.id));
            continue;
        }

        const [account] = await db
            .select()
            .from(mt5Accounts)
            .where(eq(mt5Accounts.id, terminal.accountId))
            .limit(1);
        if (!account) continue;

        const decryptedPassword = decrypt(account.password);
        config.push({
            id: terminal.id,
            status: 'RUNNING',
            accountId: terminal.accountId,
            server: account.server,
            login: account.login,
            password: decryptedPassword,
            environment: {
                MT5_SERVER: account.server,
                MT5_LOGIN: account.login,
                MT5_PASSWORD: decryptedPassword,
                TERMINAL_ID: terminal.id,
            },
        });
    }
    return config;
}

/**
 * Process heartbeat from terminal EA
 */
export async function processHeartbeat(data: TerminalHeartbeatPayload): Promise<HeartbeatResponse> {
    const validationResult = TerminalHeartbeatPayloadSchema.safeParse(data);
    if (!validationResult.success) {
        console.error('[TerminalFarm] Invalid heartbeat payload:', validationResult.error);
        return { success: false, code: 'INVALID_PAYLOAD', error: 'Invalid payload' };
    }

    const terminal = await getTerminalById(data.terminalId);
    if (!terminal) {
        return {
            success: false,
            code: 'UNKNOWN_TERMINAL',
            terminalId: data.terminalId,
            error: 'Unknown terminal',
        };
    }

    const mt5Account = await getMt5AccountContext(terminal.accountId);
    if (!mt5Account) {
        return {
            success: false,
            code: 'UNKNOWN_TERMINAL',
            terminalId: terminal.id,
            error: 'Terminal is not linked to an MT5 account',
        };
    }

    const existingDiagnostics = readTerminalSyncDiagnostics(terminal.metadata);
    const nowIso = new Date().toISOString();

    if (mt5Account.terminalEnabled === false) {
        const disabledDiagnostics = buildDiagnostics(existingDiagnostics, {
            code: 'TERMINAL_DISABLED',
            message: 'MT5 sync is disabled for this account.',
            lastHeartbeatAt: nowIso,
        });

        await db
            .update(terminalInstances)
            .set({
                status: 'STOPPED',
                errorMessage: 'MT5 sync is disabled for this account.',
                metadata: mergeTerminalMetadata(terminal.metadata, {
                    syncDiagnostics: disabledDiagnostics,
                }),
            })
            .where(eq(terminalInstances.id, terminal.id));

        return {
            success: false,
            code: 'TERMINAL_DISABLED',
            terminalId: terminal.id,
            mt5AccountId: mt5Account.id,
            propAccountId: mt5Account.propAccountId ?? undefined,
            error: 'MT5 sync is disabled for this account.',
        };
    }

    const expectedLogin = mt5Account.login.trim();
    const expectedServer = mt5Account.server.trim().toLowerCase();
    const actualLogin = data.sessionInfo?.login?.trim();
    const actualServer = data.sessionInfo?.server?.trim().toLowerCase();
    const sessionMismatch =
        Boolean(actualLogin && actualLogin !== expectedLogin) ||
        Boolean(actualServer && actualServer !== expectedServer);

    if (sessionMismatch) {
        const sessionDiagnostics = buildDiagnostics(existingDiagnostics, {
            code: 'SESSION_MISMATCH',
            message: `Connected MT5 session ${data.sessionInfo?.server ?? 'unknown'}/${data.sessionInfo?.login ?? 'unknown'} does not match linked account ${mt5Account.server}/${mt5Account.login}.`,
            sessionInfo: data.sessionInfo,
            lastHeartbeatAt: nowIso,
            lastSeenDealCount: data.syncState?.totalDeals,
            lastSeenOpenPositionCount: data.syncState?.openPositions,
        });

        await db
            .update(terminalInstances)
            .set({
                lastHeartbeat: new Date(),
                status: 'ERROR',
                errorMessage: sessionDiagnostics.message,
                metadata: mergeTerminalMetadata(terminal.metadata, {
                    syncDiagnostics: sessionDiagnostics,
                }),
            })
            .where(eq(terminalInstances.id, terminal.id));

        return {
            success: false,
            code: 'SESSION_MISMATCH',
            terminalId: terminal.id,
            mt5AccountId: mt5Account.id,
            propAccountId: mt5Account.propAccountId ?? undefined,
            error: sessionDiagnostics.message,
        };
    }

    const heartbeatDiagnostic = getHeartbeatDiagnosticState(data);
    const mergedDiagnostics = buildDiagnostics(existingDiagnostics, {
        ...heartbeatDiagnostic,
        sessionInfo: data.sessionInfo ?? existingDiagnostics?.sessionInfo,
        lastHeartbeatAt: nowIso,
        lastTradeSyncAt:
            data.syncState?.lastHistorySyncAt ?? existingDiagnostics?.lastTradeSyncAt,
    });

    if (mergedDiagnostics.code === 'ACCOUNT_NOT_LOADED') {
        await db
            .update(terminalInstances)
            .set({
                lastHeartbeat: new Date(),
                status: 'ERROR',
                errorMessage: mergedDiagnostics.message,
                metadata: mergeTerminalMetadata(terminal.metadata, {
                    syncDiagnostics: mergedDiagnostics,
                }),
            })
            .where(eq(terminalInstances.id, terminal.id));

        return {
            success: true,
            code: 'ACCOUNT_NOT_LOADED',
            terminalId: terminal.id,
            mt5AccountId: mt5Account.id,
            propAccountId: mt5Account.propAccountId ?? undefined,
            error: mergedDiagnostics.message,
        };
    }

    await db
        .update(terminalInstances)
        .set({
            lastHeartbeat: new Date(),
            status: 'RUNNING',
            errorMessage: null,
            metadata: mergeTerminalMetadata(terminal.metadata, {
                syncDiagnostics: mergedDiagnostics,
            }),
        })
        .where(eq(terminalInstances.id, terminal.id));

    if (data.accountInfo) {
        await db
            .update(mt5Accounts)
            .set({
                balance: String(data.accountInfo.balance),
                equity: String(data.accountInfo.equity),
            })
            .where(eq(mt5Accounts.id, terminal.accountId));

        // Push MT5 balance to linked prop account so Account Tracker shows live balance
        const [mt5Row] = await db
            .select({ propAccountId: mt5Accounts.propAccountId })
            .from(mt5Accounts)
            .where(eq(mt5Accounts.id, terminal.accountId))
            .limit(1);
        if (mt5Row?.propAccountId) {
            await db
                .update(propAccounts)
                .set({
                    currentBalance: String(data.accountInfo.balance),
                    lastSyncedAt: new Date(),
                })
                .where(eq(propAccounts.id, mt5Row.propAccountId));
        }
    }

    const [cmd] = await db
        .select()
        .from(terminalCommands)
        .where(
            and(
                eq(terminalCommands.terminalId, terminal.id),
                eq(terminalCommands.status, 'PENDING')
            )
        )
        .orderBy(asc(terminalCommands.createdAt))
        .limit(1);

    if (cmd) {
        const [updated] = await db
            .update(terminalCommands)
            .set({
                status: 'DISPATCHED',
                dispatchedAt: new Date(),
            })
            .where(and(eq(terminalCommands.id, cmd.id), eq(terminalCommands.status, 'PENDING')))
            .returning();
        if (updated) {
            return {
                success: true,
                code: mergedDiagnostics.code === 'ZERO_DEALS' || mergedDiagnostics.code === 'NO_NEW_DEALS'
                    ? mergedDiagnostics.code
                    : 'OK',
                terminalId: terminal.id,
                mt5AccountId: mt5Account.id,
                propAccountId: mt5Account.propAccountId ?? undefined,
                command: cmd.command,
                payload: cmd.payload ?? undefined,
            };
        }
    }
    return {
        success: true,
        code: mergedDiagnostics.code === 'ZERO_DEALS' || mergedDiagnostics.code === 'NO_NEW_DEALS'
            ? mergedDiagnostics.code
            : 'OK',
        terminalId: terminal.id,
        mt5AccountId: mt5Account.id,
        propAccountId: mt5Account.propAccountId ?? undefined,
    };
}

/**
 * Process trade sync from terminal EA
 */
export async function processTrades(data: TerminalSyncPayload): Promise<TerminalWebhookResponse> {
    const validationResult = TerminalSyncPayloadSchema.safeParse(data);
    if (!validationResult.success) {
        console.error('[TerminalFarm] Invalid trades payload:', validationResult.error);
        return { success: false, code: 'INVALID_PAYLOAD', error: 'Invalid payload' };
    }

    const startTime = Date.now();
    const terminal = await getTerminalById(data.terminalId);
    if (!terminal) {
        return {
            success: false,
            code: 'UNKNOWN_TERMINAL',
            terminalId: data.terminalId,
            error: 'Unknown terminal',
        };
    }

    const mt5Account = await getMt5AccountContext(terminal.accountId);
    if (!mt5Account) {
        return {
            success: false,
            code: 'UNKNOWN_TERMINAL',
            terminalId: terminal.id,
            error: 'Terminal is not linked to an MT5 account',
        };
    }

    if (mt5Account.terminalEnabled === false) {
        const disabledDiagnostics = buildDiagnostics(
            readTerminalSyncDiagnostics(terminal.metadata),
            {
                code: 'TERMINAL_DISABLED',
                message: 'Trade sync received for a disabled terminal.',
            }
        );

        await db
            .update(terminalInstances)
            .set({
                status: 'STOPPED',
                errorMessage: 'Trade sync received for a disabled terminal.',
                metadata: mergeTerminalMetadata(terminal.metadata, {
                    syncDiagnostics: disabledDiagnostics,
                }),
            })
            .where(eq(terminalInstances.id, terminal.id));

        return {
            success: false,
            code: 'TERMINAL_DISABLED',
            terminalId: terminal.id,
            mt5AccountId: mt5Account.id,
            propAccountId: mt5Account.propAccountId ?? undefined,
            error: 'Trade sync received for a disabled terminal.',
        };
    }

    const linkedPropAccountId = mt5Account.propAccountId ?? null;

    // Backfill legacy synced trades that were imported without propAccountId.
    if (linkedPropAccountId) {
        await db
            .update(trades)
            .set({ propAccountId: linkedPropAccountId })
            .where(
                and(
                    eq(trades.mt5AccountId, terminal.accountId),
                    isNull(trades.propAccountId)
                )
            );
    }

    console.log(`[TerminalFarm] Processing ${data.trades.length} trades for terminal ${data.terminalId}`);

    let imported = 0;
    let skipped = 0;
    const errors: Array<{ ticket: string; error: string }> = [];
    const seenDealTickets = new Set<string>();

    const incomingDealTickets = Array.from(
        new Set(
            data.trades
                .map(trade => trade.ticket?.trim())
                .filter((ticket): ticket is string => Boolean(ticket))
        )
    );

    if (incomingDealTickets.length > 0) {
        const existingDealTickets = await db
            .select({
                externalTicket: trades.externalTicket,
                externalDealId: trades.externalDealId,
            })
            .from(trades)
            .where(
                and(
                    eq(trades.mt5AccountId, terminal.accountId),
                    or(
                        inArray(trades.externalTicket, incomingDealTickets),
                        inArray(trades.externalDealId, incomingDealTickets)
                    )
                )
            );

        for (const existingTicket of existingDealTickets) {
            if (existingTicket.externalTicket) {
                seenDealTickets.add(existingTicket.externalTicket);
            }
            if (existingTicket.externalDealId) {
                seenDealTickets.add(existingTicket.externalDealId);
            }
        }
    }

    const positionIds = data.trades
        .filter(t => t.positionId)
        .map(t => t.positionId!.toString());
    const existingTradesMap = new Map<string, ExistingTradeMatch>();
    const closedTradeIds = new Set<string>();
    const inserts: PendingTradeInsert[] = [];
    const queuedUpdates = new Map<string, TradeUpdateData>();
    const pendingInsertRowsById = new Map<string, TradeInsertRow>();

    if (positionIds.length > 0) {
        const existingTrades = await db
            .select({
                id: trades.id,
                status: trades.status,
                commission: trades.commission,
                swap: trades.swap,
                contractSize: trades.contractSize,
                positionSize: trades.positionSize,
                direction: trades.direction,
                entryDate: trades.entryDate,
                entryPrice: trades.entryPrice,
                stopLoss: trades.stopLoss,
                takeProfit: trades.takeProfit,
                externalId: trades.externalId,
                externalDealId: trades.externalDealId,
            })
            .from(trades)
            .where(
                and(
                    eq(trades.mt5AccountId, terminal.accountId),
                    inArray(trades.externalId, positionIds)
                )
            );
        const groupedByExternalId = new Map<string, ExistingTradeMatch[]>();
        for (const t of existingTrades) {
            if (!t.externalId) continue;
            const grouped = groupedByExternalId.get(t.externalId) ?? [];
            grouped.push({
                id: t.id,
                status: t.status ?? 'OPEN',
                commission: t.commission,
                swap: t.swap,
                contractSize: t.contractSize,
                positionSize: t.positionSize,
                direction: t.direction,
                entryDate: t.entryDate,
                entryPrice: t.entryPrice,
                stopLoss: t.stopLoss,
                takeProfit: t.takeProfit,
                externalId: t.externalId,
                externalDealId: t.externalDealId,
                lookupKeys: t.externalId ? [t.externalId] : [],
            });
            groupedByExternalId.set(t.externalId, grouped);
        }

        for (const [externalId, matches] of groupedByExternalId.entries()) {
            existingTradesMap.set(externalId, choosePrimaryTradeMatch(matches));
        }
    }

    const registerOpenTradeMatch = (tradeMatch: ExistingTradeMatch) => {
        closedTradeIds.delete(tradeMatch.id);
        for (const lookupKey of tradeMatch.lookupKeys) {
            if (lookupKey) {
                existingTradesMap.set(lookupKey, tradeMatch);
            }
        }
    };

    const addTradeMatchLookupKey = (tradeMatch: ExistingTradeMatch, lookupKey: string) => {
        if (!lookupKey) {
            return;
        }

        if (!tradeMatch.lookupKeys.includes(lookupKey)) {
            tradeMatch.lookupKeys.push(lookupKey);
        }

        existingTradesMap.set(lookupKey, tradeMatch);
    };

    const closeTradeMatch = (tradeMatch: ExistingTradeMatch, update: TradeUpdateData) => {
        tradeMatch.status = String(update.status ?? 'CLOSED');
        tradeMatch.commission =
            update.commission != null ? String(update.commission) : tradeMatch.commission;
        tradeMatch.swap = update.swap != null ? String(update.swap) : tradeMatch.swap;
        tradeMatch.contractSize =
            update.contractSize != null ? String(update.contractSize) : tradeMatch.contractSize;
        tradeMatch.positionSize =
            update.positionSize != null ? String(update.positionSize) : tradeMatch.positionSize;
        tradeMatch.externalId =
            update.externalId != null ? String(update.externalId) : tradeMatch.externalId;
        tradeMatch.externalDealId =
            update.externalDealId != null ? String(update.externalDealId) : tradeMatch.externalDealId;

        if (tradeMatch.externalId) {
            addTradeMatchLookupKey(tradeMatch, tradeMatch.externalId);
        }

        for (const lookupKey of tradeMatch.lookupKeys) {
            existingTradesMap.delete(lookupKey);
        }
        closedTradeIds.add(tradeMatch.id);
    };

    const queueTradeInsert = (row: TradeInsertRow, ticket: string, dependsOnTradeId: string | null = null) => {
        inserts.push({
            row,
            dependsOnTradeId,
            ticket,
        });
        pendingInsertRowsById.set(row.id!, row);
    };

    const createOpenTradeInsert = (
        trade: TerminalTradePayload,
        overrides?: TradeUpdateData
    ): TradeInsertRow => ({
        id: randomUUID(),
        userId: terminal.userId,
        propAccountId: linkedPropAccountId,
        mt5AccountId: terminal.accountId,
        symbol: trade.symbol,
        direction: inferOpenDirectionFromDeal(trade.type),
        status: 'OPEN',
        entryDate: requireTradeDate(trade.openTime, `trade ${trade.ticket} openTime`),
        entryPrice: String(trade.openPrice ?? 0),
        positionSize: String(trade.volume ?? 0),
        commission: String(trade.commission ?? 0),
        swap: String(trade.swap ?? 0),
        stopLoss: trade.stopLoss != null ? String(trade.stopLoss) : null,
        takeProfit: trade.takeProfit != null ? String(trade.takeProfit) : null,
        notes: trade.positionId != null
            ? `Auto-synced via Terminal Farm. Position ID: ${trade.positionId}`
            : `Auto-synced from MT5. Ticket: ${trade.ticket}`,
        externalTicket: trade.ticket,
        externalId: trade.positionId != null ? trade.positionId.toString() : null,
        externalDealId: trade.ticket,
        contractSize: trade.contractSize != null ? String(trade.contractSize) : null,
        assetType: detectAssetType(trade.symbol),
        magicNumber: trade.magic ?? null,
        ...overrides,
    });

    const createTradeMatchFromInsert = (insertRow: TradeInsertRow): ExistingTradeMatch => ({
        id: insertRow.id!,
        status: insertRow.status ?? 'OPEN',
        commission: insertRow.commission ?? null,
        swap: insertRow.swap ?? null,
        contractSize: insertRow.contractSize ?? null,
        positionSize: insertRow.positionSize,
        direction: insertRow.direction,
        entryDate: insertRow.entryDate ?? null,
        entryPrice: insertRow.entryPrice,
        stopLoss: insertRow.stopLoss ?? null,
        takeProfit: insertRow.takeProfit ?? null,
        externalId: insertRow.externalId ?? null,
        externalDealId: insertRow.externalDealId ?? null,
        lookupKeys: insertRow.externalId ? [insertRow.externalId] : [],
    });

    const upsertTradeUpdate = (tradeId: string, data: TradeUpdateData) => {
        const pendingInsert = pendingInsertRowsById.get(tradeId);
        if (pendingInsert) {
            Object.assign(pendingInsert, data);
            return;
        }

        const existingUpdate = queuedUpdates.get(tradeId);
        queuedUpdates.set(tradeId, existingUpdate ? { ...existingUpdate, ...data } : data);
    };

    const createOrphanExitInsert = (
        trade: TerminalTradePayload,
        positionIdString: string,
        note?: string
    ): TradeInsertRow => ({
        id: randomUUID(),
        userId: terminal.userId,
        propAccountId: linkedPropAccountId,
        mt5AccountId: terminal.accountId,
        symbol: trade.symbol,
        direction: inferClosedPositionDirectionFromExit(trade.type),
        status: 'CLOSED',
        entryDate: requireTradeDate(trade.openTime, `trade ${trade.ticket} openTime`),
        entryPrice: '0',
        exitDate: requireTradeDate(trade.openTime, `trade ${trade.ticket} openTime`),
        exitPrice: trade.openPrice != null ? String(trade.openPrice) : null,
        positionSize: String(trade.volume ?? 0),
        pnl: trade.profit != null ? String(trade.profit) : null,
        commission: String(trade.commission ?? 0),
        swap: String(trade.swap ?? 0),
        stopLoss: trade.stopLoss != null ? String(trade.stopLoss) : null,
        takeProfit: trade.takeProfit != null ? String(trade.takeProfit) : null,
        notes: note ?? `Orphan Exit Synced (Entry missing). Position ID: ${positionIdString}`,
        externalTicket: trade.ticket,
        externalId: positionIdString,
        externalDealId: trade.ticket,
        contractSize: trade.contractSize != null ? String(trade.contractSize) : null,
        assetType: detectAssetType(trade.symbol),
        magicNumber: trade.magic ?? null,
    });

    for (const trade of data.trades) {
        try {
            if (seenDealTickets.has(trade.ticket)) {
                skipped++;
                continue;
            }

            if (trade.positionId) {
                const positionIdString = trade.positionId.toString();
                const isEntry = trade.entryType === 0;
                const isExit = trade.entryType === 1;
                const isInOut = trade.entryType === 2;
                let existing = existingTradesMap.get(positionIdString) ?? null;

                if (!existing && (isExit || isInOut)) {
                    existing = await findFuzzyOpenTradeForExit(terminal.accountId, trade, closedTradeIds);
                    if (existing) {
                        addTradeMatchLookupKey(existing, positionIdString);
                    }
                }

                if (isEntry) {
                    if (existing?.status === 'OPEN') {
                        skipped++;
                        continue;
                    }
                    const entryInsert = createOpenTradeInsert(trade, {
                        externalId: positionIdString,
                    });
                    queueTradeInsert(entryInsert, trade.ticket);
                    registerOpenTradeMatch(createTradeMatchFromInsert(entryInsert));
                } else if (isExit) {
                    if (existing) {
                        if (existing.status !== 'CLOSED' || !existing.contractSize) {
                            const closeUpdate = buildClosedTradeUpdate(
                                existing,
                                trade,
                                linkedPropAccountId
                            );
                            upsertTradeUpdate(existing.id, closeUpdate);
                            closeTradeMatch(existing, closeUpdate);
                        } else {
                            skipped++;
                        }
                    } else {
                        queueTradeInsert(
                            createOrphanExitInsert(trade, positionIdString),
                            trade.ticket
                        );
                    }
                } else if (isInOut) {
                    if (!existing) {
                        queueTradeInsert(
                            createOrphanExitInsert(
                                trade,
                                positionIdString,
                                `Orphan INOUT exit synced (matching open trade missing). Position ID: ${positionIdString}`
                            ),
                            trade.ticket
                        );
                        continue;
                    }

                    const originalVolume = parseNumericValue(existing.positionSize);
                    const dealVolume = trade.volume ?? originalVolume;
                    const closeVolume = Math.min(originalVolume || dealVolume, dealVolume);
                    const remainingSameDirection = Math.max(originalVolume - dealVolume, 0);
                    const reversalVolume = Math.max(dealVolume - originalVolume, 0);

                    const closeUpdate = buildClosedTradeUpdate(
                        existing,
                        trade,
                        linkedPropAccountId,
                        closeVolume
                    );
                    upsertTradeUpdate(existing.id, closeUpdate);
                    closeTradeMatch(existing, closeUpdate);

                    if (remainingSameDirection > 0.00001) {
                        const remainderInsert = createOpenTradeInsert(trade, {
                            direction: existing.direction === 'SHORT' ? 'SHORT' : 'LONG',
                            entryDate:
                                existing.entryDate ??
                                requireTradeDate(trade.openTime, `trade ${trade.ticket} openTime`),
                            entryPrice: existing.entryPrice ?? String(trade.openPrice ?? 0),
                            positionSize: String(remainingSameDirection),
                            commission: '0',
                            swap: '0',
                            stopLoss: existing.stopLoss,
                            takeProfit: existing.takeProfit,
                            notes: `Partial close remainder synced. Position ID: ${positionIdString}`,
                            externalId: positionIdString,
                            externalDealId: null,
                            contractSize:
                                existing.contractSize ??
                                (trade.contractSize != null ? String(trade.contractSize) : null),
                        });
                        queueTradeInsert(
                            remainderInsert,
                            trade.ticket,
                            pendingInsertRowsById.has(existing.id) ? null : existing.id
                        );
                        registerOpenTradeMatch(createTradeMatchFromInsert(remainderInsert));
                    } else if (reversalVolume > 0.00001) {
                        const reversalInsert = createOpenTradeInsert(trade, {
                            direction: inferOpenDirectionFromDeal(trade.type),
                            entryDate: requireTradeDate(
                                trade.openTime,
                                `trade ${trade.ticket} openTime`
                            ),
                            entryPrice: String(trade.openPrice ?? 0),
                            positionSize: String(reversalVolume),
                            commission: '0',
                            swap: '0',
                            notes: `Reversal position synced from INOUT deal. Position ID: ${positionIdString}`,
                            externalId: positionIdString,
                        });
                        queueTradeInsert(
                            reversalInsert,
                            trade.ticket,
                            pendingInsertRowsById.has(existing.id) ? null : existing.id
                        );
                        registerOpenTradeMatch(createTradeMatchFromInsert(reversalInsert));
                    }
                } else {
                    skipped++;
                }
                continue;
            }

            const [existing] = await db
                .select({ id: trades.id })
                .from(trades)
                .where(
                    and(
                        eq(trades.mt5AccountId, terminal.accountId),
                        eq(trades.externalDealId, trade.ticket)
                    )
                )
                .limit(1);
            if (existing) {
                skipped++;
                continue;
            }

            queueTradeInsert(createOpenTradeInsert(trade, {
                status: trade.closeTime ? 'CLOSED' : 'OPEN',
                exitDate: trade.closeTime
                    ? requireTradeDate(trade.closeTime, `trade ${trade.ticket} closeTime`)
                    : null,
                exitPrice: trade.closePrice != null ? String(trade.closePrice) : null,
                pnl: trade.profit != null ? String(trade.profit) : null,
                notes: `Auto-synced from MT5. Ticket: ${trade.ticket}`,
                externalId: null,
            }), trade.ticket);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            errors.push({ ticket: trade.ticket || 'unknown', error: errorMsg });
            console.error(`[TerminalFarm] Failed to process trade ${trade.ticket}:`, error);
            skipped++;
        }
    }

    const failedUpdateIds = new Set<string>();
    for (const [tradeId, updateData] of queuedUpdates.entries()) {
        try {
            await retry(
                async () => {
                    await db
                        .update(trades)
                        .set(updateData)
                        .where(eq(trades.id, tradeId));
                },
                { maxAttempts: 3 }
            );
            imported++;
        } catch (error) {
            failedUpdateIds.add(tradeId);
            console.error(`[TerminalFarm] Failed to update trade ${tradeId}:`, error);
            skipped++;
            errors.push({
                ticket: tradeId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    const blockedInserts = inserts.filter(
        insert => insert.dependsOnTradeId && failedUpdateIds.has(insert.dependsOnTradeId)
    );
    for (const blockedInsert of blockedInserts) {
        skipped++;
        errors.push({
            ticket: blockedInsert.ticket,
            error: `Skipped insert because dependent trade update ${blockedInsert.dependsOnTradeId} failed.`,
        });
    }

    const runnableInserts = inserts.filter(
        insert => !insert.dependsOnTradeId || !failedUpdateIds.has(insert.dependsOnTradeId)
    );
    const BATCH_SIZE = 50;
    for (let i = 0; i < runnableInserts.length; i += BATCH_SIZE) {
        const batch = runnableInserts.slice(i, i + BATCH_SIZE);
        try {
            await retry(
                async () => {
                    await db.insert(trades).values(batch.map(insert => insert.row));
                },
                { maxAttempts: 3 }
            );
            imported += batch.length;
        } catch (error) {
            console.error(`[TerminalFarm] Batch insert failed (${i}-${i + batch.length}):`, error);
            skipped += batch.length;
            errors.push({
                ticket: `batch_${i}`,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const existingDiagnostics = readTerminalSyncDiagnostics(terminal.metadata);
    const tradeCode: TerminalWebhookResponse['code'] =
        imported > 0
            ? 'TRADES_IMPORTED'
            : data.trades.length === 0
              ? 'ZERO_DEALS'
              : 'NO_NEW_DEALS';
    const tradeDiagnostics = buildDiagnostics(existingDiagnostics, {
        code: tradeCode,
        message:
            imported > 0
                ? `Imported ${imported} MT5 trade updates.`
                : data.trades.length === 0
                  ? 'MT5 terminal reported zero deals in the trade sync payload.'
                  : 'Trade sync completed with no new imports.',
        lastTradeSyncAt: nowIso,
        lastTradeImportCount: imported,
        lastTradeSkipCount: skipped,
        lastSeenDealCount: data.trades.length,
    });

    await db
        .update(terminalInstances)
        .set({
            lastSyncAt: now,
            status: 'RUNNING',
            errorMessage: null,
            metadata: mergeTerminalMetadata(terminal.metadata, {
                syncDiagnostics: tradeDiagnostics,
            }),
        })
        .where(eq(terminalInstances.id, terminal.id));

    const duration = Date.now() - startTime;
    logSyncMetrics({
        terminalId: terminal.id,
        timestamp: new Date().toISOString(),
        tradesProcessed: data.trades.length,
        tradesImported: imported,
        tradesSkipped: skipped,
        errors: errors.length,
        durationMs: duration,
        batchSize: inserts.length > 0 ? inserts.length : undefined,
    });
    if (errors.length > 0) {
        console.warn(`[TerminalFarm] Errors encountered:`, errors.slice(0, 5));
    }
    return {
        success: true,
        code: tradeCode,
        terminalId: terminal.id,
        mt5AccountId: mt5Account.id,
        propAccountId: linkedPropAccountId ?? undefined,
        imported,
        skipped,
    };
}

/**
 * Process candle data from terminal EA
 */
export async function processCandles(data: TerminalCandlesSyncPayload): Promise<void> {
    const validationResult = TerminalCandlesSyncPayloadSchema.safeParse(data);
    if (!validationResult.success) {
        console.error('[TerminalFarm] Invalid candles payload:', validationResult.error);
        throw new Error('Invalid payload');
    }

    await db
        .update(trades)
        .set({
            chartData: {
                candles: data.candles.map(c => ({
                    time: c.time,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                })),
                symbol: data.symbol,
                fetchedAt: new Date().toISOString(),
                source: 'terminal_farm',
            },
        })
        .where(eq(trades.id, data.tradeId));

    await db
        .update(terminalCommands)
        .set({
            status: 'COMPLETED',
            completedAt: new Date(),
        })
        .where(
            and(
                eq(terminalCommands.terminalId, data.terminalId),
                eq(terminalCommands.status, 'DISPATCHED'),
                like(terminalCommands.payload, `%,${data.tradeId}`)
            )
        );
}

/**
 * Process position sync from terminal EA
 */
export async function processPositions(data: TerminalPositionsPayload): Promise<TerminalWebhookResponse> {
    const validationResult = TerminalPositionsPayloadSchema.safeParse(data);
    if (!validationResult.success) {
        console.error('[TerminalFarm] Invalid positions payload:', validationResult.error);
        return { success: false, code: 'INVALID_PAYLOAD', error: 'Invalid payload' };
    }

    const terminal = await getTerminalById(data.terminalId);
    if (!terminal) {
        return {
            success: false,
            code: 'UNKNOWN_TERMINAL',
            terminalId: data.terminalId,
            error: 'Unknown terminal',
        };
    }

    const mt5Account = await getMt5AccountContext(terminal.accountId);
    if (!mt5Account) {
        return {
            success: false,
            code: 'UNKNOWN_TERMINAL',
            terminalId: terminal.id,
            error: 'Terminal is not linked to an MT5 account',
        };
    }

    if (mt5Account.terminalEnabled === false) {
        const disabledDiagnostics = buildDiagnostics(
            readTerminalSyncDiagnostics(terminal.metadata),
            {
                code: 'TERMINAL_DISABLED',
                message: 'Positions sync received for a disabled terminal.',
            }
        );

        await db
            .update(terminalInstances)
            .set({
                status: 'STOPPED',
                errorMessage: 'Positions sync received for a disabled terminal.',
                metadata: mergeTerminalMetadata(terminal.metadata, {
                    syncDiagnostics: disabledDiagnostics,
                }),
            })
            .where(eq(terminalInstances.id, terminal.id));

        return {
            success: false,
            code: 'TERMINAL_DISABLED',
            terminalId: terminal.id,
            mt5AccountId: mt5Account.id,
            propAccountId: mt5Account.propAccountId ?? undefined,
            error: 'Positions sync received for a disabled terminal.',
        };
    }

    const nowIso = new Date().toISOString();
    const nextDiagnostics = buildDiagnostics(
        readTerminalSyncDiagnostics(terminal.metadata),
        {
            code: 'POSITIONS_UPDATED',
            message:
                data.positions.length > 0
                    ? `Received ${data.positions.length} live MT5 positions.`
                    : 'No live MT5 positions are currently open.',
            lastPositionsSyncAt: nowIso,
            lastSeenOpenPositionCount: data.positions.length,
        }
    );

    await db
        .update(terminalInstances)
        .set({
            status: 'RUNNING',
            errorMessage: null,
            metadata: {
                ...mergeTerminalMetadata(terminal.metadata, {
                    openPositions: data.positions,
                    positionsUpdatedAt: nowIso,
                    syncDiagnostics: nextDiagnostics,
                }),
            },
        })
        .where(eq(terminalInstances.id, terminal.id));

    return {
        success: true,
        code: 'POSITIONS_UPDATED',
        terminalId: terminal.id,
        mt5AccountId: mt5Account.id,
        propAccountId: mt5Account.propAccountId ?? undefined,
    };
}

/**
 * Queue a FETCH_CANDLES command for a trade
 */
export async function queueFetchCandles(
    tradeId: string,
    symbol: string,
    timeframe: string,
    startTime: Date,
    endTime: Date
): Promise<void> {
    const [trade] = await db
        .select({ mt5AccountId: trades.mt5AccountId })
        .from(trades)
        .where(eq(trades.id, tradeId))
        .limit(1);

    if (!trade?.mt5AccountId) {
        console.error('[TerminalFarm] Trade has no MT5 account');
        return;
    }

    const terminal = await getTerminalByAccountId(trade.mt5AccountId);
    if (!terminal || terminal.status !== 'RUNNING') {
        console.log('[TerminalFarm] No running terminal for this account, falling back to Twelve Data');
        return;
    }

    if (readTerminalSyncProvider(terminal.metadata) !== 'terminal_farm') {
        console.log('[TerminalFarm] Non-terminal-farm account does not use terminal command queue, falling back to Twelve Data');
        return;
    }

    const payload = [
        symbol,
        timeframe,
        startTime.toISOString().replace('T', ' ').substring(0, 19),
        endTime.toISOString().replace('T', ' ').substring(0, 19),
        tradeId,
    ].join(',');

    await db.insert(terminalCommands).values({
        terminalId: terminal.id,
        command: 'FETCH_CANDLES',
        payload,
        status: 'PENDING',
        tradeId,
    });
    console.log(`[TerminalFarm] Queued FETCH_CANDLES for trade ${tradeId}`);
}

function detectAssetType(symbol: string): string {
    const upper = symbol.toUpperCase();
    const forexPairs = ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];
    if (forexPairs.filter(c => upper.includes(c)).length >= 2 && upper.length <= 7) return 'FOREX';
    if (upper.includes('BTC') || upper.includes('ETH') || upper.includes('USDT') || upper.includes('CRYPTO')) return 'CRYPTO';
    if (upper.includes('XAU') || upper.includes('GOLD') || upper.includes('OIL') || upper.includes('SILVER') || upper.includes('XAG')) return 'COMMODITIES';
    const indices = ['US30', 'DJ30', 'NAS100', 'NDX', 'SPX', 'SP500', 'GER30', 'DE30', 'UK100', 'JP225', 'FTSE'];
    if (indices.some(i => upper.includes(i))) return 'INDICES';
    if (upper === symbol && symbol.length >= 1 && symbol.length <= 5) return 'STOCKS';
    return 'FOREX';
}
