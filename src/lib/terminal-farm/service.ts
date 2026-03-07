/**
 * Terminal Farm Service
 * Core business logic for managing MT5 terminals and processing EA webhooks
 * Uses Neon (Drizzle) — no Supabase.
 */

import { eq, inArray, like, asc, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    terminalInstances,
    mt5Accounts,
    terminalCommands,
    trades,
    type TerminalInstance as SchemaTerminalInstance,
} from '@/lib/db/schema';
import { decrypt } from '@/lib/mt5/encryption';
import { retry } from './retry';
import { logSyncMetrics } from './metrics';
import type {
    TerminalInstance,
    TerminalCommand,
    TerminalHeartbeatPayload,
    TerminalSyncPayload,
    TerminalPositionsPayload,
    TerminalCandlesSyncPayload,
    OrchestratorTerminalConfig,
    HeartbeatResponse,
} from './types';
import {
    TerminalSyncPayloadSchema,
    TerminalHeartbeatPayloadSchema,
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

/**
 * Enable auto-sync for an MT5 account (create terminal instance)
 */
export async function enableAutoSync(accountId: string, userId: string): Promise<TerminalInstance> {
    const existing = await getTerminalByAccountId(accountId);
    if (existing) {
        if (existing.status === 'RUNNING' || existing.status === 'PENDING') {
            throw new Error('Auto-sync is already enabled for this account');
        }
        const [updated] = await db
            .update(terminalInstances)
            .set({ status: 'PENDING', errorMessage: null })
            .where(eq(terminalInstances.id, existing.id))
            .returning();
        if (!updated) throw new Error('Failed to update terminal');
        return rowToTerminalInstance(updated);
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
    if (!terminal) {
        throw new Error('Auto-sync is not enabled for this account');
    }
    await db
        .update(terminalInstances)
        .set({ status: 'STOPPING' })
        .where(eq(terminalInstances.id, terminal.id));
    await db
        .update(mt5Accounts)
        .set({ terminalEnabled: false })
        .where(eq(mt5Accounts.id, accountId));
}

/**
 * Get orchestrator configuration (all active terminals with decrypted credentials)
 */
export async function getOrchestratorConfig(): Promise<OrchestratorTerminalConfig[]> {
    const terminals = await db
        .select()
        .from(terminalInstances)
        .where(inArray(terminalInstances.status, ['PENDING', 'STARTING', 'RUNNING', 'STOPPING']));

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
        return { success: false, error: 'Invalid payload' };
    }

    const terminal = await getTerminalById(data.terminalId);
    if (!terminal) {
        return { success: false, error: 'Unknown terminal' };
    }

    await db
        .update(terminalInstances)
        .set({
            lastHeartbeat: new Date(),
            status: 'RUNNING',
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
                command: cmd.command,
                payload: cmd.payload ?? undefined,
            };
        }
    }
    return { success: true };
}

/**
 * Process trade sync from terminal EA
 */
export async function processTrades(data: TerminalSyncPayload): Promise<{ imported: number; skipped: number }> {
    const startTime = Date.now();
    const terminal = await getTerminalById(data.terminalId);
    if (!terminal) {
        throw new Error('Unknown terminal');
    }

    console.log(`[TerminalFarm] Processing ${data.trades.length} trades for terminal ${data.terminalId}`);

    let imported = 0;
    let skipped = 0;
    const errors: Array<{ ticket: string; error: string }> = [];

    const positionIds = data.trades
        .filter(t => t.positionId)
        .map(t => t.positionId!.toString());

    const existingTradesMap = new Map<string, { id: string; status: string; commission: string | null; swap: string | null; contractSize: string | null }>();

    if (positionIds.length > 0) {
        const existingTrades = await db
            .select({
                id: trades.id,
                status: trades.status,
                commission: trades.commission,
                swap: trades.swap,
                contractSize: trades.contractSize,
                externalId: trades.externalId,
            })
            .from(trades)
            .where(
                and(
                    eq(trades.mt5AccountId, terminal.accountId),
                    inArray(trades.externalId, positionIds)
                )
            );
        for (const t of existingTrades) {
            if (t.externalId) {
                existingTradesMap.set(t.externalId, {
                    id: t.id,
                    status: t.status ?? 'OPEN',
                    commission: t.commission,
                    swap: t.swap,
                    contractSize: t.contractSize,
                });
            }
        }
    }

    const inserts: typeof trades.$inferInsert[] = [];
    const updates: Array<{ id: string; data: Partial<typeof trades.$inferInsert> }> = [];

    for (const trade of data.trades) {
        try {
            if (trade.positionId) {
                const positionIdString = trade.positionId.toString();
                const existing = existingTradesMap.get(positionIdString);
                const isEntry = trade.entryType === 0;
                const isExit = trade.entryType === 1;

                if (isEntry) {
                    if (existing) {
                        skipped++;
                        continue;
                    }
                    inserts.push({
                        userId: terminal.userId,
                        mt5AccountId: terminal.accountId,
                        symbol: trade.symbol,
                        direction: trade.type === 'BUY' ? 'LONG' : 'SHORT',
                        status: 'OPEN',
                        entryDate: new Date(trade.openTime ?? Date.now()),
                        entryPrice: String(trade.openPrice ?? 0),
                        positionSize: String(trade.volume ?? 0),
                        commission: String(trade.commission ?? 0),
                        swap: String(trade.swap ?? 0),
                        stopLoss: trade.stopLoss != null ? String(trade.stopLoss) : null,
                        takeProfit: trade.takeProfit != null ? String(trade.takeProfit) : null,
                        notes: `Auto-synced via Terminal Farm. Position ID: ${trade.positionId}`,
                        externalId: positionIdString,
                        externalDealId: trade.ticket,
                        contractSize: trade.contractSize != null ? String(trade.contractSize) : null,
                        assetType: detectAssetType(trade.symbol),
                        magicNumber: trade.magic ?? null,
                    });
                } else if (isExit) {
                    if (existing) {
                        if (existing.status !== 'CLOSED' || !existing.contractSize) {
                            const prevCommission = existing.commission ? parseFloat(existing.commission) : 0;
                            const prevSwap = existing.swap ? parseFloat(existing.swap) : 0;
                            updates.push({
                                id: existing.id,
                                data: {
                                    status: 'CLOSED',
                                    exitDate: trade.openTime ? new Date(trade.openTime) : null,
                                    exitPrice: trade.openPrice != null ? String(trade.openPrice) : null,
                                    pnl: trade.profit != null ? String(trade.profit) : null,
                                    commission: String(prevCommission + (trade.commission ?? 0)),
                                    swap: String(prevSwap + (trade.swap ?? 0)),
                                    contractSize: trade.contractSize != null ? String(trade.contractSize) : existing.contractSize,
                                },
                            });
                        } else {
                            skipped++;
                        }
                    } else {
                        inserts.push({
                            userId: terminal.userId,
                            mt5AccountId: terminal.accountId,
                            symbol: trade.symbol,
                            direction: trade.type === 'SELL' ? 'LONG' : 'SHORT',
                            status: 'CLOSED',
                            entryDate: new Date(trade.openTime ?? Date.now()),
                            entryPrice: '0',
                            exitDate: trade.openTime ? new Date(trade.openTime) : null,
                            exitPrice: trade.openPrice != null ? String(trade.openPrice) : null,
                            positionSize: String(trade.volume ?? 0),
                            pnl: trade.profit != null ? String(trade.profit) : null,
                            commission: String(trade.commission ?? 0),
                            swap: String(trade.swap ?? 0),
                            stopLoss: trade.stopLoss != null ? String(trade.stopLoss) : null,
                            takeProfit: trade.takeProfit != null ? String(trade.takeProfit) : null,
                            notes: `Orphan Exit Synced (Entry missing). Position ID: ${positionIdString}`,
                            externalId: positionIdString,
                            externalDealId: trade.ticket,
                            contractSize: trade.contractSize != null ? String(trade.contractSize) : null,
                            assetType: detectAssetType(trade.symbol),
                            magicNumber: trade.magic ?? null,
                        });
                    }
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

            inserts.push({
                userId: terminal.userId,
                mt5AccountId: terminal.accountId,
                symbol: trade.symbol,
                direction: trade.type === 'BUY' ? 'LONG' : 'SHORT',
                status: trade.closeTime ? 'CLOSED' : 'OPEN',
                entryDate: new Date(trade.openTime ?? Date.now()),
                exitDate: trade.closeTime ? new Date(trade.closeTime) : null,
                entryPrice: String(trade.openPrice ?? 0),
                exitPrice: trade.closePrice != null ? String(trade.closePrice) : null,
                positionSize: String(trade.volume ?? 0),
                commission: String(trade.commission ?? 0),
                swap: String(trade.swap ?? 0),
                pnl: trade.profit != null ? String(trade.profit) : null,
                notes: `Auto-synced from MT5. Ticket: ${trade.ticket}`,
                externalDealId: trade.ticket,
                contractSize: trade.contractSize != null ? String(trade.contractSize) : null,
                assetType: detectAssetType(trade.symbol),
                magicNumber: trade.magic ?? null,
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            errors.push({ ticket: trade.ticket || 'unknown', error: errorMsg });
            console.error(`[TerminalFarm] Failed to process trade ${trade.ticket}:`, error);
            skipped++;
        }
    }

    const BATCH_SIZE = 50;
    for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
        const batch = inserts.slice(i, i + BATCH_SIZE);
        try {
            await retry(
                async () => {
                    await db.insert(trades).values(batch);
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

    for (const update of updates) {
        try {
            await retry(
                async () => {
                    await db
                        .update(trades)
                        .set(update.data)
                        .where(eq(trades.id, update.id));
                },
                { maxAttempts: 3 }
            );
            imported++;
        } catch (error) {
            console.error(`[TerminalFarm] Failed to update trade ${update.id}:`, error);
            skipped++;
            errors.push({
                ticket: update.id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    await db
        .update(terminalInstances)
        .set({ lastSyncAt: new Date() })
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
    return { imported, skipped };
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
export async function processPositions(data: TerminalPositionsPayload): Promise<void> {
    const validationResult = TerminalPositionsPayloadSchema.safeParse(data);
    if (!validationResult.success) {
        console.error('[TerminalFarm] Invalid positions payload:', validationResult.error);
        throw new Error('Invalid payload');
    }

    const terminal = await getTerminalById(data.terminalId);
    if (!terminal) {
        throw new Error('Unknown terminal');
    }

    await db
        .update(terminalInstances)
        .set({
            metadata: {
                ...terminal.metadata,
                openPositions: data.positions,
                positionsUpdatedAt: new Date().toISOString(),
            },
        })
        .where(eq(terminalInstances.id, terminal.id));
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
