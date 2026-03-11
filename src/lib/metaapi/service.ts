import 'server-only';

import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    mt5Accounts,
    propAccounts,
    terminalInstances,
    trades,
} from '@/lib/db/schema';
import { decrypt } from '@/lib/mt5/encryption';
import {
    getTerminalByAccountId,
    processHeartbeat,
    processPositions,
    processTrades,
} from '@/lib/terminal-farm/service';
import {
    mergeTerminalMetadata,
    readMetaApiMetadata,
    readTerminalSyncDiagnostics,
} from '@/lib/terminal-farm/metadata';
import type {
    MetaApiTerminalMetadata,
    TerminalInstance,
    TerminalPositionPayload,
    TerminalStatus,
    TerminalSyncDiagnostics,
    TerminalTradePayload,
} from '@/lib/terminal-farm/types';
import {
    type MetaApiDealRecord,
    type MetaApiPositionRecord,
    type MetaApiRemoteAccount,
    type MetaApiRpcConnection,
    formatMetaApiError,
    getMetaApiAccountType,
    getMetaApiClient,
    getMetaApiProvisioningProfileId,
    getMetaApiReliability,
    isMetaApiConfigured,
} from './client';

const STATUS_REFRESH_THROTTLE_MS = 20_000;
const INITIAL_HISTORY_LOOKBACK_DAYS = 365;
const HISTORY_SYNC_OVERLAP_MS = 5 * 60 * 1000;
const METAAPI_PAGE_SIZE = 1000;

type OwnedMt5Account = {
    id: string;
    userId: string;
    propAccountId: string | null;
    accountName: string;
    server: string;
    login: string;
    password: string;
    terminalEnabled: boolean | null;
    propCreatedAt: Date | null;
};

type RefreshMetaApiOptions = {
    force?: boolean;
    createIfMissing?: boolean;
    waitForBrokerConnection?: boolean;
};

function isMetaApiNotFoundError(error: unknown): boolean {
    const message = formatMetaApiError(error).toLowerCase();
    return message.includes('not found') || message.includes('404');
}

function hasRecentSync(lastSyncAt: string | null | undefined): boolean {
    if (!lastSyncAt) {
        return false;
    }

    const lastSyncTime = new Date(lastSyncAt).getTime();
    if (Number.isNaN(lastSyncTime)) {
        return false;
    }

    return Date.now() - lastSyncTime <= STATUS_REFRESH_THROTTLE_MS;
}

function deriveMetaApiTerminalStatus(
    state: string | null | undefined,
    connectionStatus: string | null | undefined,
    terminalEnabled: boolean
): TerminalStatus {
    if (!terminalEnabled) {
        return 'STOPPED';
    }

    if (
        state === 'DEPLOY_FAILED' ||
        state === 'UNDEPLOY_FAILED' ||
        state === 'REDEPLOY_FAILED' ||
        state === 'DELETE_FAILED'
    ) {
        return 'ERROR';
    }

    if (state === 'UNDEPLOYED') {
        return 'STOPPED';
    }

    if (state === 'DEPLOYED' && connectionStatus === 'CONNECTED') {
        return 'RUNNING';
    }

    return 'STARTING';
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

function getMetaApiSyncWindow(
    metadata: MetaApiTerminalMetadata | null,
    propCreatedAt: Date | null
): Date {
    const cursorCandidate = metadata?.lastDealsCursor ?? metadata?.lastSuccessfulSyncAt ?? null;
    if (cursorCandidate) {
        const parsedCursor = new Date(cursorCandidate);
        if (!Number.isNaN(parsedCursor.getTime())) {
            return new Date(parsedCursor.getTime() - HISTORY_SYNC_OVERLAP_MS);
        }
    }

    if (propCreatedAt) {
        return new Date(propCreatedAt.getTime() - HISTORY_SYNC_OVERLAP_MS);
    }

    return new Date(Date.now() - INITIAL_HISTORY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
}

function toIso(value: unknown): string | null {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }

    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }

    return null;
}

function mapDealType(type: unknown): 'BUY' | 'SELL' | null {
    if (type === 'DEAL_TYPE_BUY') {
        return 'BUY';
    }
    if (type === 'DEAL_TYPE_SELL') {
        return 'SELL';
    }
    return null;
}

function mapDealEntryType(entryType: unknown): number | undefined {
    switch (entryType) {
        case 'DEAL_ENTRY_IN':
            return 0;
        case 'DEAL_ENTRY_OUT':
        case 'DEAL_ENTRY_OUT_BY':
            return 1;
        case 'DEAL_ENTRY_INOUT':
            return 2;
        default:
            return undefined;
    }
}

function mapPositionType(type: unknown): 'BUY' | 'SELL' {
    return type === 'POSITION_TYPE_SELL' ? 'SELL' : 'BUY';
}

async function getOwnedMt5Account(accountId: string, userId: string): Promise<OwnedMt5Account | null> {
    const [account] = await db
        .select({
            id: mt5Accounts.id,
            userId: mt5Accounts.userId,
            propAccountId: mt5Accounts.propAccountId,
            accountName: mt5Accounts.accountName,
            server: mt5Accounts.server,
            login: mt5Accounts.login,
            password: mt5Accounts.password,
            terminalEnabled: mt5Accounts.terminalEnabled,
            propCreatedAt: propAccounts.createdAt,
        })
        .from(mt5Accounts)
        .leftJoin(propAccounts, eq(mt5Accounts.propAccountId, propAccounts.id))
        .where(and(eq(mt5Accounts.id, accountId), eq(mt5Accounts.userId, userId)))
        .limit(1);

    return account ?? null;
}

async function countImportedTrades(accountId: string): Promise<number> {
    const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(trades)
        .where(eq(trades.mt5AccountId, accountId));

    return Number(row?.count ?? 0);
}

async function ensureMetaApiTerminalRecord(
    accountId: string,
    userId: string,
    createIfMissing: boolean
): Promise<TerminalInstance | null> {
    const existing = await getTerminalByAccountId(accountId);
    if (existing) {
        await db
            .update(terminalInstances)
            .set({
                userId,
                containerId: null,
                terminalPort: null,
                metadata: mergeTerminalMetadata(existing.metadata, {
                    syncProvider: 'metaapi',
                    metaApi: readMetaApiMetadata(existing.metadata) ?? { accountId: null },
                }),
            })
            .where(eq(terminalInstances.id, existing.id));

        return getTerminalByAccountId(accountId);
    }

    if (!createIfMissing) {
        return null;
    }

    await db.insert(terminalInstances).values({
        accountId,
        userId,
        status: 'PENDING',
        metadata: {
            syncProvider: 'metaapi',
            metaApi: {
                accountId: null,
            },
        },
    });

    return getTerminalByAccountId(accountId);
}

async function updateTerminalState(
    accountId: string,
    terminalId: string,
    metadata: Record<string, unknown>,
    options: {
        status?: TerminalStatus;
        errorMessage?: string | null;
        diagnostics?: TerminalSyncDiagnostics;
        metaApi?: Partial<MetaApiTerminalMetadata>;
        updateLastSyncAt?: boolean;
    }
): Promise<TerminalInstance | null> {
    const currentMetaApi = readMetaApiMetadata(metadata) ?? { accountId: null };
    const nextMetaApi: MetaApiTerminalMetadata = {
        ...currentMetaApi,
        ...(options.metaApi ?? {}),
    };

    await db
        .update(terminalInstances)
        .set({
            ...(options.status ? { status: options.status } : {}),
            ...(options.errorMessage !== undefined ? { errorMessage: options.errorMessage } : {}),
            ...(options.updateLastSyncAt === false ? {} : { lastSyncAt: new Date() }),
            metadata: mergeTerminalMetadata(metadata, {
                syncProvider: 'metaapi',
                metaApi: nextMetaApi,
                ...(options.diagnostics ? { syncDiagnostics: options.diagnostics } : {}),
            }),
        })
        .where(eq(terminalInstances.id, terminalId));

    return getTerminalByAccountId(accountId);
}

async function ensureRemoteMetaApiAccount(
    account: OwnedMt5Account,
    terminal: TerminalInstance
): Promise<MetaApiRemoteAccount> {
    const api = await getMetaApiClient();
    const existingMetaApi = readMetaApiMetadata(terminal.metadata);

    if (existingMetaApi?.accountId) {
        try {
            return await api.metatraderAccountApi.getAccount(existingMetaApi.accountId);
        } catch (error) {
            if (!isMetaApiNotFoundError(error)) {
                throw error;
            }
        }
    }

    const createPayload: Record<string, unknown> = {
        name: account.accountName || `${account.server} - ${account.login}`,
        server: account.server,
        login: account.login,
        password: decrypt(account.password),
        platform: 'mt5',
        type: getMetaApiAccountType(),
        reliability: getMetaApiReliability(),
        manualTrades: true,
        magic: 0,
        metadata: {
            localMt5AccountId: account.id,
            propAccountId: account.propAccountId,
            userId: account.userId,
        },
    };

    const provisioningProfileId = getMetaApiProvisioningProfileId();
    if (provisioningProfileId) {
        createPayload.provisioningProfileId = provisioningProfileId;
    }

    const remoteAccount = await api.metatraderAccountApi.createAccount(createPayload);

    await updateTerminalState(account.id, terminal.id, terminal.metadata, {
        status: 'STARTING',
        errorMessage: null,
        metaApi: {
            accountId: remoteAccount.id,
            state: remoteAccount.state ?? null,
            connectionStatus: remoteAccount.connectionStatus ?? null,
            lastError: null,
        },
    });

    return remoteAccount;
}

async function fetchDealsSince(connection: MetaApiRpcConnection, startTime: Date, endTime: Date): Promise<{
    deals: MetaApiDealRecord[];
    synchronizing: boolean;
}> {
    const collected: MetaApiDealRecord[] = [];
    let offset = 0;
    let synchronizing = false;

    while (true) {
        const response = await connection.getDealsByTimeRange(
            startTime,
            endTime,
            offset,
            METAAPI_PAGE_SIZE
        );
        const batch = Array.isArray(response?.deals) ? response.deals : [];
        synchronizing = synchronizing || Boolean(response?.synchronizing);
        collected.push(...batch);

        if (batch.length < METAAPI_PAGE_SIZE) {
            break;
        }

        offset += batch.length;
    }

    return {
        deals: collected,
        synchronizing,
    };
}

function mapMetaApiPositions(positions: MetaApiPositionRecord[]): TerminalPositionPayload[] {
    const mapped: TerminalPositionPayload[] = [];

    for (const position of positions) {
        if (!position.symbol || !position.time) {
            continue;
        }

        const nextPosition: TerminalPositionPayload = {
            ticket: String(position.id),
            positionId: String(position.id),
            symbol: position.symbol,
            type: mapPositionType(position.type),
            volume: Number(position.volume ?? 0),
            openPrice: Number(position.openPrice ?? 0),
            currentPrice: Number(position.currentPrice ?? 0),
            profit: Number(position.profit ?? 0),
            openTime: toIso(position.time) ?? new Date().toISOString(),
            stopLoss:
                typeof position.stopLoss === 'number' ? Number(position.stopLoss) : undefined,
            takeProfit:
                typeof position.takeProfit === 'number' ? Number(position.takeProfit) : undefined,
            commission:
                typeof position.commission === 'number' ? Number(position.commission) : undefined,
            swap: typeof position.swap === 'number' ? Number(position.swap) : undefined,
            comment:
                typeof position.comment === 'string'
                    ? position.comment
                    : typeof position.brokerComment === 'string'
                      ? position.brokerComment
                      : undefined,
        };

        if (nextPosition.volume > 0) {
            mapped.push(nextPosition);
        }
    }

    return mapped;
}

function mapMetaApiDeals(deals: MetaApiDealRecord[]): TerminalTradePayload[] {
    const mapped: TerminalTradePayload[] = [];

    for (const deal of deals) {
        const side = mapDealType(deal.type);
        const openTime = toIso(deal.time);
            if (!side || !deal?.symbol || !openTime) {
                continue;
            }

            const entryType = mapDealEntryType(deal.entryType);
            if (entryType === undefined) {
                continue;
            }

        mapped.push({
                ticket: String(deal.id),
                symbol: deal.symbol,
                type: side,
                volume: typeof deal.volume === 'number' ? Number(deal.volume) : undefined,
                openPrice: typeof deal.price === 'number' ? Number(deal.price) : undefined,
                openTime,
                commission:
                    typeof deal.commission === 'number' ? Number(deal.commission) : undefined,
                swap: typeof deal.swap === 'number' ? Number(deal.swap) : undefined,
                profit: typeof deal.profit === 'number' ? Number(deal.profit) : undefined,
                comment:
                    typeof deal.comment === 'string'
                        ? deal.comment
                        : typeof deal.brokerComment === 'string'
                          ? deal.brokerComment
                          : undefined,
                positionId:
                    typeof deal.positionId === 'string' && deal.positionId.trim()
                        ? deal.positionId
                        : undefined,
                magic: typeof deal.magic === 'number' ? Number(deal.magic) : undefined,
                entryType,
                stopLoss:
                    typeof deal.stopLoss === 'number' ? Number(deal.stopLoss) : undefined,
                takeProfit:
                    typeof deal.takeProfit === 'number' ? Number(deal.takeProfit) : undefined,
        });
    }

    return mapped.sort((left, right) => {
            const leftTime = left.openTime ? new Date(left.openTime).getTime() : 0;
            const rightTime = right.openTime ? new Date(right.openTime).getTime() : 0;
            return leftTime - rightTime;
        });
}

async function storeManualDiagnostics(
    account: OwnedMt5Account,
    terminal: TerminalInstance,
    patch: Partial<TerminalSyncDiagnostics> & Pick<TerminalSyncDiagnostics, 'code' | 'message'>,
    metaApiPatch?: Partial<MetaApiTerminalMetadata>,
    status: TerminalStatus = 'RUNNING',
    errorMessage: string | null = null
): Promise<TerminalInstance | null> {
    const currentTerminal = (await getTerminalByAccountId(account.id)) ?? terminal;
    const diagnostics = buildDiagnostics(
        readTerminalSyncDiagnostics(currentTerminal.metadata),
        patch
    );

    return updateTerminalState(account.id, currentTerminal.id, currentTerminal.metadata, {
        status,
        errorMessage,
        diagnostics,
        metaApi: metaApiPatch,
    });
}

export async function enableMetaApiAutoSync(accountId: string, userId: string): Promise<TerminalInstance> {
    if (!isMetaApiConfigured()) {
        throw new Error('METAAPI_TOKEN is not configured');
    }

    const account = await getOwnedMt5Account(accountId, userId);
    if (!account) {
        throw new Error('Account not found');
    }

    await db
        .update(mt5Accounts)
        .set({ terminalEnabled: true })
        .where(eq(mt5Accounts.id, accountId));

    let terminal = await ensureMetaApiTerminalRecord(accountId, userId, true);
    if (!terminal) {
        throw new Error('Failed to create MetaApi terminal record');
    }

    try {
        const remoteAccount = await ensureRemoteMetaApiAccount(account, terminal);

        await updateTerminalState(account.id, terminal.id, terminal.metadata, {
            status: 'STARTING',
            errorMessage: null,
            metaApi: {
                accountId: remoteAccount.id,
                state: remoteAccount.state ?? null,
                connectionStatus: remoteAccount.connectionStatus ?? null,
                lastSyncAttemptAt: new Date().toISOString(),
                lastError: null,
            },
        });

        await remoteAccount.deploy();

        terminal = (await getTerminalByAccountId(accountId)) ?? terminal;
        const refreshed = await refreshMetaApiTerminalStatus(accountId, userId, {
            force: true,
            createIfMissing: false,
            waitForBrokerConnection: true,
        });

        return refreshed ?? terminal;
    } catch (error) {
        const errorMessage = formatMetaApiError(error);
        await updateTerminalState(account.id, terminal.id, terminal.metadata, {
            status: 'ERROR',
            errorMessage,
            diagnostics: buildDiagnostics(readTerminalSyncDiagnostics(terminal.metadata), {
                code: 'ACCOUNT_NOT_LOADED',
                message: errorMessage,
            }),
            metaApi: {
                lastSyncAttemptAt: new Date().toISOString(),
                lastError: errorMessage,
            },
        });
        throw error;
    }
}

export async function disableMetaApiAutoSync(accountId: string, userId?: string): Promise<void> {
    const accountQuery = userId
        ? getOwnedMt5Account(accountId, userId)
        : db
              .select({
                  id: mt5Accounts.id,
                  userId: mt5Accounts.userId,
                  propAccountId: mt5Accounts.propAccountId,
                  accountName: mt5Accounts.accountName,
                  server: mt5Accounts.server,
                  login: mt5Accounts.login,
                  password: mt5Accounts.password,
                  terminalEnabled: mt5Accounts.terminalEnabled,
                  propCreatedAt: mt5Accounts.createdAt,
              })
              .from(mt5Accounts)
              .where(eq(mt5Accounts.id, accountId))
              .limit(1)
              .then(rows => rows[0] ?? null);

    const account = await accountQuery;
    if (!account) {
        throw new Error('Account not found');
    }

    await db
        .update(mt5Accounts)
        .set({ terminalEnabled: false })
        .where(eq(mt5Accounts.id, accountId));

    const terminal = await getTerminalByAccountId(accountId);
    if (!terminal) {
        return;
    }

    const metaApi = readMetaApiMetadata(terminal.metadata);
    if (metaApi?.accountId && isMetaApiConfigured()) {
        try {
            const api = await getMetaApiClient();
            const remoteAccount = await api.metatraderAccountApi.getAccount(metaApi.accountId);
            await remoteAccount.undeploy();
            try {
                await remoteAccount.waitUndeployed(60, 1000);
            } catch {
                // The undeploy action is asynchronous. The status route will reconcile the final state.
            }
        } catch (error) {
            if (!isMetaApiNotFoundError(error)) {
                const errorMessage = formatMetaApiError(error);
                await updateTerminalState(account.id, terminal.id, terminal.metadata, {
                    status: 'ERROR',
                    errorMessage,
                    diagnostics: buildDiagnostics(
                        readTerminalSyncDiagnostics(terminal.metadata),
                        {
                            code: 'ACCOUNT_NOT_LOADED',
                            message: errorMessage,
                        }
                    ),
                    metaApi: {
                        lastError: errorMessage,
                        lastSyncAttemptAt: new Date().toISOString(),
                    },
                });
                throw error;
            }
        }
    }

    await updateTerminalState(account.id, terminal.id, terminal.metadata, {
        status: 'STOPPED',
        errorMessage: null,
        diagnostics: buildDiagnostics(readTerminalSyncDiagnostics(terminal.metadata), {
            code: 'TERMINAL_DISABLED',
            message: 'MetaApi auto-sync is disabled for this account.',
        }),
        metaApi: {
            connectionStatus: 'DISCONNECTED',
            lastSyncAttemptAt: new Date().toISOString(),
        },
    });
}

export async function refreshMetaApiTerminalStatus(
    accountId: string,
    userId: string,
    options: RefreshMetaApiOptions = {}
): Promise<TerminalInstance | null> {
    const account = await getOwnedMt5Account(accountId, userId);
    if (!account) {
        throw new Error('Account not found');
    }

    let terminal = await ensureMetaApiTerminalRecord(
        accountId,
        userId,
        options.createIfMissing ?? false
    );
    if (!terminal) {
        return null;
    }

    if (!options.force && hasRecentSync(terminal.lastSyncAt)) {
        return terminal;
    }

    if (!isMetaApiConfigured()) {
        return updateTerminalState(account.id, terminal.id, terminal.metadata, {
            status: 'ERROR',
            errorMessage: 'METAAPI_TOKEN is not configured',
            diagnostics: buildDiagnostics(readTerminalSyncDiagnostics(terminal.metadata), {
                code: 'ACCOUNT_NOT_LOADED',
                message: 'METAAPI_TOKEN is not configured.',
            }),
            metaApi: {
                lastError: 'METAAPI_TOKEN is not configured',
                lastSyncAttemptAt: new Date().toISOString(),
            },
        });
    }

    if (account.terminalEnabled === false) {
        return storeManualDiagnostics(
            account,
            terminal,
            {
                code: 'TERMINAL_DISABLED',
                message: 'MetaApi auto-sync is disabled for this account.',
            },
            {
                lastSyncAttemptAt: new Date().toISOString(),
            },
            'STOPPED',
            null
        );
    }

    let remoteAccount: MetaApiRemoteAccount;
    try {
        remoteAccount = await ensureRemoteMetaApiAccount(account, terminal);
    } catch (error) {
        const errorMessage = formatMetaApiError(error);
        return updateTerminalState(account.id, terminal.id, terminal.metadata, {
            status: 'ERROR',
            errorMessage,
            diagnostics: buildDiagnostics(readTerminalSyncDiagnostics(terminal.metadata), {
                code: 'ACCOUNT_NOT_LOADED',
                message: errorMessage,
            }),
            metaApi: {
                lastError: errorMessage,
                lastSyncAttemptAt: new Date().toISOString(),
            },
        });
    }

    let connection: MetaApiRpcConnection | null = null;
    try {
        if (remoteAccount.state === 'UNDEPLOYED' || remoteAccount.state === 'CREATED') {
            await remoteAccount.deploy();
            await remoteAccount.reload();
        }

        if (
            options.waitForBrokerConnection &&
            remoteAccount.connectionStatus !== 'CONNECTED'
        ) {
            try {
                await remoteAccount.waitConnected(60, 1000);
                await remoteAccount.reload();
            } catch {
                await remoteAccount.reload();
            }
        } else {
            await remoteAccount.reload();
        }

        terminal = (await getTerminalByAccountId(accountId)) ?? terminal;
        const preSyncStatus = deriveMetaApiTerminalStatus(
            remoteAccount.state ?? null,
            remoteAccount.connectionStatus ?? null,
            true
        );

        if (preSyncStatus !== 'RUNNING') {
            const message = `MetaApi account is ${String(remoteAccount.state ?? 'UNKNOWN')} with broker connection ${String(remoteAccount.connectionStatus ?? 'UNKNOWN')}.`;
            return updateTerminalState(account.id, terminal.id, terminal.metadata, {
                status: preSyncStatus,
                errorMessage: preSyncStatus === 'ERROR' ? message : null,
                diagnostics: buildDiagnostics(readTerminalSyncDiagnostics(terminal.metadata), {
                    code: 'ACCOUNT_NOT_LOADED',
                    message,
                }),
                metaApi: {
                    accountId: remoteAccount.id,
                    state: remoteAccount.state ?? null,
                    connectionStatus: remoteAccount.connectionStatus ?? null,
                    lastSyncAttemptAt: new Date().toISOString(),
                    lastError: preSyncStatus === 'ERROR' ? message : null,
                },
            });
        }

        connection = remoteAccount.getRPCConnection();
        await connection.connect();
        await connection.waitSynchronized(60);

        const [accountInformation, rawPositions, importedTradeCountBefore] = await Promise.all([
            connection.getAccountInformation(),
            connection.getPositions(),
            countImportedTrades(account.id),
        ] as const);

        if (typeof accountInformation?.name === 'string' && accountInformation.name.trim()) {
            await db
                .update(mt5Accounts)
                .set({ accountName: accountInformation.name.trim() })
                .where(eq(mt5Accounts.id, account.id));
        }

        const metaApiMetadata = readMetaApiMetadata(terminal.metadata);
        const syncStart = getMetaApiSyncWindow(metaApiMetadata, account.propCreatedAt);
        const syncEnd = new Date();
        const { deals: rawDeals, synchronizing } = await fetchDealsSince(
            connection,
            syncStart,
            syncEnd
        );
        const mappedDeals = mapMetaApiDeals(rawDeals);
        const mappedPositions = mapMetaApiPositions(
            Array.isArray(rawPositions) ? rawPositions : []
        );

        const latestDealTime =
            mappedDeals.length > 0
                ? mappedDeals
                      .map(deal => (deal.openTime ? new Date(deal.openTime).getTime() : 0))
                      .reduce((max, value) => Math.max(max, value), 0)
                : 0;
        const lastHistorySyncAt =
            latestDealTime > 0 ? new Date(latestDealTime).toISOString() : syncEnd.toISOString();

        const heartbeatReason =
            mappedDeals.length > 0 ? 'new_deal' : synchronizing ? 'poll' : 'no_change';

        await processHeartbeat({
            terminalId: terminal.id,
            accountInfo: {
                balance: Number(accountInformation.balance ?? 0),
                equity: Number(accountInformation.equity ?? 0),
                margin: Number(accountInformation.margin ?? 0),
                freeMargin: Number(accountInformation.freeMargin ?? 0),
            },
            sessionInfo: {
                login: String(accountInformation.login ?? account.login),
                server: String(accountInformation.server ?? account.server),
                accountName:
                    typeof accountInformation.name === 'string'
                        ? accountInformation.name
                        : account.accountName,
                company:
                    typeof accountInformation.broker === 'string'
                        ? accountInformation.broker
                        : '',
                currency:
                    typeof accountInformation.currency === 'string'
                        ? accountInformation.currency
                        : '',
            },
            syncState: {
                totalDeals: Math.max(importedTradeCountBefore, mappedDeals.length),
                openPositions: mappedPositions.length,
                lastHistorySyncAt,
                lastHistorySyncReason: heartbeatReason,
            },
        });

        await processPositions({
            terminalId: terminal.id,
            positions: mappedPositions,
        });

        if (mappedDeals.length > 0) {
            await processTrades({
                terminalId: terminal.id,
                trades: mappedDeals,
            });
        } else {
            await storeManualDiagnostics(
                account,
                terminal,
                {
                    code: importedTradeCountBefore > 0 ? 'NO_NEW_DEALS' : 'ZERO_DEALS',
                    message:
                        synchronizing
                            ? 'MetaApi initial history synchronization is still in progress.'
                            : importedTradeCountBefore > 0
                              ? 'MetaApi sync completed. No new deals were detected since the last sync.'
                              : 'MetaApi account is connected but no historical deals were returned.',
                    lastTradeSyncAt: syncEnd.toISOString(),
                    lastTradeImportCount: 0,
                    lastTradeSkipCount: 0,
                    lastSeenDealCount: importedTradeCountBefore,
                    lastSeenOpenPositionCount: mappedPositions.length,
                },
                undefined,
                'RUNNING',
                null
            );
        }

        terminal = (await getTerminalByAccountId(accountId)) ?? terminal;
        return updateTerminalState(account.id, terminal.id, terminal.metadata, {
            status: 'RUNNING',
            errorMessage: null,
            metaApi: {
                accountId: remoteAccount.id,
                state: remoteAccount.state ?? null,
                connectionStatus: remoteAccount.connectionStatus ?? null,
                lastSyncAttemptAt: syncEnd.toISOString(),
                lastSuccessfulSyncAt: syncEnd.toISOString(),
                lastDealsCursor: lastHistorySyncAt,
                lastDealsWindowStart: syncStart.toISOString(),
                lastError: null,
            },
        });
    } catch (error) {
        const errorMessage = formatMetaApiError(error);
        terminal = (await getTerminalByAccountId(accountId)) ?? terminal;
        return updateTerminalState(account.id, terminal.id, terminal.metadata, {
            status: 'ERROR',
            errorMessage,
            diagnostics: buildDiagnostics(readTerminalSyncDiagnostics(terminal.metadata), {
                code: 'ACCOUNT_NOT_LOADED',
                message: errorMessage,
            }),
            metaApi: {
                accountId: remoteAccount.id,
                state: remoteAccount.state ?? null,
                connectionStatus: remoteAccount.connectionStatus ?? null,
                lastSyncAttemptAt: new Date().toISOString(),
                lastError: errorMessage,
            },
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch {
                // Closing the RPC connection is best-effort.
            }
        }
    }
}
