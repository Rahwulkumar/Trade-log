/**
 * Terminal Farm Service
 * Core business logic for managing MT5 terminals and processing EA webhooks
 */

import { createClient } from '@supabase/supabase-js';
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

// Create Supabase client with service role for webhook operations
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get terminal instance by ID
 */
export async function getTerminalById(terminalId: string): Promise<TerminalInstance | null> {
    const { data, error } = await supabase
        .from('terminal_instances')
        .select('*')
        .eq('id', terminalId)
        .single();

    if (error || !data) return null;
    return data as TerminalInstance;
}

/**
 * Get terminal by account ID
 */
export async function getTerminalByAccountId(accountId: string): Promise<TerminalInstance | null> {
    const { data, error } = await supabase
        .from('terminal_instances')
        .select('*')
        .eq('account_id', accountId)
        .single();

    if (error || !data) return null;
    return data as TerminalInstance;
}

/**
 * Enable auto-sync for an MT5 account (create terminal instance)
 */
export async function enableAutoSync(accountId: string, userId: string): Promise<TerminalInstance> {
    // Check if terminal already exists
    const existing = await getTerminalByAccountId(accountId);
    if (existing) {
        if (existing.status === 'RUNNING' || existing.status === 'PENDING') {
            throw new Error('Auto-sync is already enabled for this account');
        }
        // Restart stopped terminal
        const { data, error } = await supabase
            .from('terminal_instances')
            .update({ status: 'PENDING', error_message: null })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data as TerminalInstance;
    }

    // Create new terminal instance
    const { data, error } = await supabase
        .from('terminal_instances')
        .insert({
            account_id: accountId,
            user_id: userId,
            status: 'PENDING',
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    // Mark account as terminal-enabled
    await supabase
        .from('mt5_accounts')
        .update({ terminal_enabled: true })
        .eq('id', accountId);

    return data as TerminalInstance;
}

/**
 * Disable auto-sync for an MT5 account
 */
export async function disableAutoSync(accountId: string): Promise<void> {
    const terminal = await getTerminalByAccountId(accountId);
    if (!terminal) {
        throw new Error('Auto-sync is not enabled for this account');
    }

    // Mark for stopping (orchestrator will handle container teardown)
    await supabase
        .from('terminal_instances')
        .update({ status: 'STOPPING' })
        .eq('id', terminal.id);

    // Mark account as not terminal-enabled
    await supabase
        .from('mt5_accounts')
        .update({ terminal_enabled: false })
        .eq('id', accountId);
}

/**
 * Get orchestrator configuration (all active terminals with decrypted credentials)
 */
export async function getOrchestratorConfig(): Promise<OrchestratorTerminalConfig[]> {
    // Fetch all terminals that should be managed
    const { data: terminals, error } = await supabase
        .from('terminal_instances')
        .select('*')
        .in('status', ['PENDING', 'STARTING', 'RUNNING', 'STOPPING']);

    if (error || !terminals) return [];

    const config: OrchestratorTerminalConfig[] = [];

    for (const terminal of terminals) {
        if (terminal.status === 'STOPPING') {
            // Instruction to stop container
            config.push({
                id: terminal.id,
                status: 'STOPPED',
                accountId: terminal.account_id,
            });

            // Mark as STOPPED in DB
            await supabase
                .from('terminal_instances')
                .update({ status: 'STOPPED' })
                .eq('id', terminal.id);

            continue;
        }

        // Fetch MT5 account with decrypted credentials
        const { data: account } = await supabase
            .from('mt5_accounts')
            .select('*')
            .eq('id', terminal.account_id)
            .single();

        if (!account) continue;

        // Decrypt password using MT5_ENCRYPTION_KEY
        const decryptedPassword = decrypt(account.password);

        config.push({
            id: terminal.id,
            status: 'RUNNING',
            accountId: terminal.account_id,
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
    // Validate payload
    const validationResult = TerminalHeartbeatPayloadSchema.safeParse(data);
    if (!validationResult.success) {
        console.error('[TerminalFarm] Invalid heartbeat payload:', validationResult.error);
        return { success: false, error: 'Invalid payload' };
    }

    const terminal = await getTerminalById(data.terminalId);
    if (!terminal) {
        return { success: false, error: 'Unknown terminal' };
    }

    // Update heartbeat timestamp and status
    await supabase
        .from('terminal_instances')
        .update({
            last_heartbeat: new Date().toISOString(),
            status: 'RUNNING',
        })
        .eq('id', terminal.id);

    // Update account balance/equity if provided
    if (data.accountInfo) {
        await supabase
            .from('mt5_accounts')
            .update({
                balance: data.accountInfo.balance,
                equity: data.accountInfo.equity,
            })
            .eq('id', terminal.account_id);
    }

    // Check for pending commands (atomic fetch and update)
    const { data: commands } = await supabase
        .from('terminal_commands')
        .select('*')
        .eq('terminal_id', terminal.id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true })
        .limit(1);

    if (commands && commands.length > 0) {
        const cmd = commands[0] as TerminalCommand;

        // Mark as dispatched (atomic update)
        const { error } = await supabase
            .from('terminal_commands')
            .update({
                status: 'DISPATCHED',
                dispatched_at: new Date().toISOString(),
            })
            .eq('id', cmd.id)
            .eq('status', 'PENDING'); // Only update if still PENDING (prevents double dispatch)

        if (!error) {
            return {
                success: true,
                command: cmd.command,
                payload: cmd.payload || undefined,
            };
        }
    }

    return { success: true };
}

/**
 * Process trade sync from terminal EA
 * Aligned with TradeTaper's position-based matching logic
 * Phase 3: Optimized with batch processing and retry logic
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

    // Batch fetch existing trades for position-based matching
    const positionIds = data.trades
        .filter(t => t.positionId)
        .map(t => t.positionId!.toString());
    
    let existingTradesMap = new Map<string, { id: string; status: string; commission: number | null; swap: number | null; contract_size: number | null }>();
    
    if (positionIds.length > 0) {
        const { data: existingTrades, error: fetchError } = await supabase
            .from('trades')
            .select('id, status, commission, swap, contract_size, external_id')
            .eq('mt5_account_id', terminal.account_id)
            .in('external_id', positionIds);

        if (!fetchError && existingTrades) {
            existingTrades.forEach(t => {
                if (t.external_id) {
                    existingTradesMap.set(t.external_id, {
                        id: t.id,
                        status: t.status || 'OPEN',
                        commission: t.commission,
                        swap: t.swap,
                        contract_size: t.contract_size,
                    });
                }
            });
        }
    }

    // Batch collect inserts and updates
    const inserts: any[] = [];
    const updates: Array<{ id: string; data: any }> = [];

    for (const trade of data.trades) {
        try {
            // Position-Based Logic (Primary)
            if (trade.positionId) {
                const positionIdString = trade.positionId.toString();
                const existing = existingTradesMap.get(positionIdString);

                const isEntry = trade.entryType === 0; // DEAL_ENTRY_IN
                const isExit = trade.entryType === 1;  // DEAL_ENTRY_OUT

                if (isEntry) {
                    // If entry already exists, skip (idempotent)
                    if (existing) {
                        skipped++;
                        continue;
                    }

                    // Queue for batch insert
                    inserts.push({
                        user_id: terminal.user_id,
                        mt5_account_id: terminal.account_id,
                        symbol: trade.symbol,
                        direction: trade.type === 'BUY' ? 'LONG' : 'SHORT',
                        status: 'OPEN',
                        entry_date: trade.openTime || new Date().toISOString(),
                        entry_price: trade.openPrice || 0,
                        position_size: trade.volume || 0,
                        commission: trade.commission || 0,
                        swap: trade.swap || 0,
                        stop_loss: trade.stopLoss,
                        take_profit: trade.takeProfit,
                        notes: `Auto-synced via Terminal Farm. Position ID: ${trade.positionId}`,
                        external_id: positionIdString,
                        external_deal_id: trade.ticket,
                        contract_size: trade.contractSize,
                        asset_type: detectAssetType(trade.symbol),
                        magic_number: trade.magic,
                    });

                } else if (isExit) {
                    // If exit, close the existing trade
                    if (existing) {
                        // Only update if not already closed (or missing contractSize for self-healing)
                        if (existing.status !== 'CLOSED' || !existing.contract_size) {
                            updates.push({
                                id: existing.id,
                                data: {
                                    status: 'CLOSED',
                                    exit_date: trade.openTime,
                                    exit_price: trade.openPrice,
                                    pnl: trade.profit || 0,
                                    commission: (existing.commission || 0) + (trade.commission || 0),
                                    swap: (existing.swap || 0) + (trade.swap || 0),
                                    contract_size: trade.contractSize || existing.contract_size,
                                },
                            });
                        } else {
                            skipped++; // Already closed
                        }
                    } else {
                        // Orphan exit: Create standalone CLOSED trade
                        inserts.push({
                            user_id: terminal.user_id,
                            mt5_account_id: terminal.account_id,
                            symbol: trade.symbol,
                            direction: trade.type === 'SELL' ? 'LONG' : 'SHORT',
                            status: 'CLOSED',
                            entry_date: trade.openTime || new Date().toISOString(),
                            entry_price: 0,
                            exit_date: trade.openTime,
                            exit_price: trade.openPrice,
                            position_size: trade.volume || 0,
                            pnl: trade.profit || 0,
                            commission: trade.commission || 0,
                            swap: trade.swap || 0,
                            stop_loss: trade.stopLoss,
                            take_profit: trade.takeProfit,
                            notes: `Orphan Exit Synced (Entry missing). Position ID: ${positionIdString}`,
                            external_id: positionIdString,
                            external_deal_id: trade.ticket,
                            contract_size: trade.contractSize,
                            asset_type: detectAssetType(trade.symbol),
                            magic_number: trade.magic,
                        });
                    }
                }
                continue;
            }

            // Legacy Ticket-Based Logic (Fallback)
            // Check for duplicate by ticket (single query per trade - can't batch easily)
            const { data: existing } = await supabase
                .from('trades')
                .select('id')
                .eq('mt5_account_id', terminal.account_id)
                .eq('external_deal_id', trade.ticket)
                .single();

            if (existing) {
                skipped++;
                continue;
            }

            // Queue for batch insert
            inserts.push({
                user_id: terminal.user_id,
                mt5_account_id: terminal.account_id,
                symbol: trade.symbol,
                direction: trade.type === 'BUY' ? 'LONG' : 'SHORT',
                status: trade.closeTime ? 'CLOSED' : 'OPEN',
                entry_date: trade.openTime || new Date().toISOString(),
                exit_date: trade.closeTime || null,
                entry_price: trade.openPrice || 0,
                exit_price: trade.closePrice || null,
                position_size: trade.volume || 0,
                commission: trade.commission || 0,
                swap: trade.swap || 0,
                pnl: trade.profit || 0,
                notes: `Auto-synced from MT5. Ticket: ${trade.ticket}`,
                external_deal_id: trade.ticket,
                contract_size: trade.contractSize,
                asset_type: detectAssetType(trade.symbol),
                magic_number: trade.magic,
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            errors.push({ ticket: trade.ticket || 'unknown', error: errorMsg });
            console.error(`[TerminalFarm] Failed to process trade ${trade.ticket}:`, error);
            skipped++;
        }
    }

    // Batch insert trades (chunked for performance)
    if (inserts.length > 0) {
        const BATCH_SIZE = 50;
        for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
            const batch = inserts.slice(i, i + BATCH_SIZE);
            try {
                const { error } = await retry(
                    () => supabase.from('trades').insert(batch),
                    { maxAttempts: 3 }
                );

                if (!error) {
                    imported += batch.length;
                } else {
                    console.error(`[TerminalFarm] Batch insert failed (${i}-${i + batch.length}):`, error);
                    skipped += batch.length;
                    errors.push({ ticket: `batch_${i}`, error: error.message });
                }
            } catch (error) {
                console.error(`[TerminalFarm] Batch insert retry exhausted:`, error);
                skipped += batch.length;
            }
        }
    }

    // Batch update trades (with retry)
    for (const update of updates) {
        try {
            const { error } = await retry(
                () => supabase
                    .from('trades')
                    .update(update.data)
                    .eq('id', update.id),
                { maxAttempts: 3 }
            );

            if (!error) {
                imported++;
            } else {
                console.error(`[TerminalFarm] Failed to update trade ${update.id}:`, error);
                skipped++;
                errors.push({ ticket: update.id, error: error.message });
            }
        } catch (error) {
            console.error(`[TerminalFarm] Update retry exhausted for ${update.id}:`, error);
            skipped++;
        }
    }

    // Update last sync timestamp
    await supabase
        .from('terminal_instances')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', terminal.id);

    const duration = Date.now() - startTime;
    
    // Log metrics
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
        console.warn(`[TerminalFarm] Errors encountered:`, errors.slice(0, 5)); // Log first 5 errors
    }

    return { imported, skipped };
}

/**
 * Process candle data from terminal EA
 */
export async function processCandles(data: TerminalCandlesSyncPayload): Promise<void> {
    // Validate payload
    const validationResult = TerminalCandlesSyncPayloadSchema.safeParse(data);
    if (!validationResult.success) {
        console.error('[TerminalFarm] Invalid candles payload:', validationResult.error);
        throw new Error('Invalid payload');
    }

    // Update the trade's chart_data with the candles
    const { error } = await supabase
        .from('trades')
        .update({
            chart_data: {
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
        .eq('id', data.tradeId);

    if (error) {
        console.error('[TerminalFarm] Failed to save candles:', error);
        throw error;
    }

    // Mark command as completed (match by tradeId in payload)
    // Payload format: SYMBOL,TIMEFRAME,START,END,TRADEID
    const { error: cmdError } = await supabase
        .from('terminal_commands')
        .update({
            status: 'COMPLETED',
            completed_at: new Date().toISOString(),
        })
        .like('payload', `%,${data.tradeId}`) // Match payload ending with ,tradeId
        .eq('status', 'DISPATCHED');

    if (cmdError) {
        console.error('[TerminalFarm] Failed to mark command as completed:', cmdError);
    }
}

/**
 * Process position sync from terminal EA
 */
export async function processPositions(data: TerminalPositionsPayload): Promise<void> {
    // Validate payload
    const validationResult = TerminalPositionsPayloadSchema.safeParse(data);
    if (!validationResult.success) {
        console.error('[TerminalFarm] Invalid positions payload:', validationResult.error);
        throw new Error('Invalid payload');
    }

    const terminal = await getTerminalById(data.terminalId);
    if (!terminal) {
        throw new Error('Unknown terminal');
    }

    await supabase
        .from('terminal_instances')
        .update({
            metadata: {
                ...terminal.metadata,
                openPositions: data.positions,
                positionsUpdatedAt: new Date().toISOString(),
            },
        })
        .eq('id', terminal.id);
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
    // Find the terminal for this trade
    const { data: trade } = await supabase
        .from('trades')
        .select('mt5_account_id')
        .eq('id', tradeId)
        .single();

    if (!trade?.mt5_account_id) {
        console.error('[TerminalFarm] Trade has no MT5 account');
        return;
    }

    const terminal = await getTerminalByAccountId(trade.mt5_account_id);
    if (!terminal || terminal.status !== 'RUNNING') {
        console.log('[TerminalFarm] No running terminal for this account, falling back to Twelve Data');
        return;
    }

    // Format: SYMBOL,TIMEFRAME,START,END,TRADEID
    const payload = [
        symbol,
        timeframe,
        startTime.toISOString().replace('T', ' ').substring(0, 19),
        endTime.toISOString().replace('T', ' ').substring(0, 19),
        tradeId,
    ].join(',');

    await supabase.from('terminal_commands').insert({
        terminal_id: terminal.id,
        command: 'FETCH_CANDLES',
        payload,
        status: 'PENDING',
    });

    console.log(`[TerminalFarm] Queued FETCH_CANDLES for trade ${tradeId}`);
}

/**
 * Detect asset type from symbol
 */
function detectAssetType(symbol: string): string {
    const upper = symbol.toUpperCase();
    
    // Forex: Two currency codes (e.g., EURUSD, GBPJPY)
    const forexPairs = ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];
    const forexMatch = forexPairs.filter(c => upper.includes(c)).length >= 2;
    if (forexMatch && upper.length <= 7) return 'FOREX';
    
    // Crypto
    if (upper.includes('BTC') || upper.includes('ETH') || upper.includes('USDT') || upper.includes('CRYPTO')) {
        return 'CRYPTO';
    }
    
    // Commodities
    if (upper.includes('XAU') || upper.includes('GOLD') || upper.includes('OIL') || upper.includes('SILVER') || upper.includes('XAG')) {
        return 'COMMODITIES';
    }
    
    // Indices
    const indices = ['US30', 'DJ30', 'NAS100', 'NDX', 'SPX', 'SP500', 'GER30', 'DE30', 'UK100', 'JP225', 'FTSE'];
    if (indices.some(i => upper.includes(i))) return 'INDICES';
    
    // Stocks (if all uppercase and reasonable length)
    if (upper === symbol && symbol.length >= 1 && symbol.length <= 5) return 'STOCKS';
    
    // Default to FOREX
    return 'FOREX';
}

