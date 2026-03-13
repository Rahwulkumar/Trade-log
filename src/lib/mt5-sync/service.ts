import 'server-only';

import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mt5Accounts, terminalInstances } from '@/lib/db/schema';
import { enableMetaApiAutoSync, disableMetaApiAutoSync, refreshMetaApiTerminalStatus } from '@/lib/metaapi/service';
import { deriveWindowsMt5WorkerTerminalState } from '@/lib/mt5-sync/runtime';
import {
    disableAutoSync as disableTerminalFarmAutoSync,
    enableAutoSync as enableTerminalFarmAutoSync,
    getTerminalByAccountId,
} from '@/lib/terminal-farm/service';
import {
    mergeTerminalMetadata,
    readTerminalSyncDiagnostics,
    readTerminalSyncProvider,
    readWindowsMt5PythonMetadata,
} from '@/lib/terminal-farm/metadata';
import type {
    TerminalInstance,
    TerminalStatus,
    TerminalSyncDiagnostics,
    TerminalSyncProvider,
    WindowsMt5PythonMetadata,
} from '@/lib/terminal-farm/types';

const WINDOWS_WORKER_HEARTBEAT_THRESHOLD_MS = 5 * 60 * 1000;

type RefreshStatusOptions = {
    createIfMissing?: boolean;
    force?: boolean;
};

function readExplicitConfiguredMt5SyncProvider(): TerminalSyncProvider | null {
    const configured = process.env.MT5_SYNC_PROVIDER?.trim().toLowerCase();
    if (configured === 'terminal_farm') {
        return 'terminal_farm';
    }
    if (configured === 'metaapi') {
        return 'metaapi';
    }
    if (configured === 'windows_mt5_python') {
        return 'windows_mt5_python';
    }
    return null;
}

function getConfiguredMt5SyncProvider(): TerminalSyncProvider {
    return readExplicitConfiguredMt5SyncProvider() ?? 'windows_mt5_python';
}

function hasRecentHeartbeat(lastHeartbeat: string | null | undefined, thresholdMs = WINDOWS_WORKER_HEARTBEAT_THRESHOLD_MS): boolean {
    if (!lastHeartbeat) {
        return false;
    }

    const lastBeatMs = new Date(lastHeartbeat).getTime();
    if (Number.isNaN(lastBeatMs)) {
        return false;
    }

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

async function setTerminalEnabled(accountId: string, enabled: boolean): Promise<void> {
    await db
        .update(mt5Accounts)
        .set({ terminalEnabled: enabled })
        .where(eq(mt5Accounts.id, accountId));
}

async function getOwnedAccount(accountId: string, userId: string): Promise<{
    id: string;
    userId: string;
    terminalEnabled: boolean | null;
} | null> {
    const [account] = await db
        .select({
            id: mt5Accounts.id,
            userId: mt5Accounts.userId,
            terminalEnabled: mt5Accounts.terminalEnabled,
        })
        .from(mt5Accounts)
        .where(and(eq(mt5Accounts.id, accountId), eq(mt5Accounts.userId, userId)))
        .limit(1);

    return account ?? null;
}

async function ensureWindowsWorkerTerminal(
    accountId: string,
    userId: string
): Promise<TerminalInstance> {
    const existing = await getTerminalByAccountId(accountId);
    const nowIso = new Date().toISOString();

    if (existing) {
        const nextWindowsMetadata: WindowsMt5PythonMetadata = {
            workerId: readWindowsMt5PythonMetadata(existing.metadata)?.workerId ?? null,
            workerHost: readWindowsMt5PythonMetadata(existing.metadata)?.workerHost ?? null,
            loginState: hasRecentHeartbeat(existing.lastHeartbeat) ? 'connected' : 'pending',
            lastHeartbeatAt: existing.lastHeartbeat,
            lastSuccessfulSyncAt:
                readWindowsMt5PythonMetadata(existing.metadata)?.lastSuccessfulSyncAt ?? null,
            lastDealsCursor:
                readWindowsMt5PythonMetadata(existing.metadata)?.lastDealsCursor ?? null,
            lastError: null,
        };

        const nextStatus: TerminalStatus =
            hasRecentHeartbeat(existing.lastHeartbeat) && existing.status === 'RUNNING'
                ? 'RUNNING'
                : 'PENDING';

        await db
            .update(terminalInstances)
            .set({
                userId,
                containerId: null,
                terminalPort: null,
                status: nextStatus,
                errorMessage: null,
                metadata: mergeTerminalMetadata(existing.metadata, {
                    syncProvider: 'windows_mt5_python',
                    windowsMt5Python: nextWindowsMetadata,
                    syncDiagnostics: buildDiagnostics(
                        readTerminalSyncDiagnostics(existing.metadata),
                        {
                            code: hasRecentHeartbeat(existing.lastHeartbeat) ? 'OK' : 'NO_HEARTBEAT',
                            message: hasRecentHeartbeat(existing.lastHeartbeat)
                                ? 'Windows MT5 worker is connected.'
                                : 'Windows MT5 worker is waiting for its first heartbeat.',
                            lastHeartbeatAt: existing.lastHeartbeat ?? undefined,
                            lastTradeSyncAt:
                                readTerminalSyncDiagnostics(existing.metadata)?.lastTradeSyncAt ??
                                nowIso,
                        }
                    ),
                }),
            })
            .where(eq(terminalInstances.id, existing.id));

        return (await getTerminalByAccountId(accountId)) ?? existing;
    }

    const [inserted] = await db
        .insert(terminalInstances)
        .values({
            accountId,
            userId,
            status: 'PENDING',
            metadata: {
                syncProvider: 'windows_mt5_python',
                windowsMt5Python: {
                    loginState: 'pending',
                    lastHeartbeatAt: null,
                    lastSuccessfulSyncAt: null,
                    lastDealsCursor: null,
                    lastError: null,
                } satisfies WindowsMt5PythonMetadata,
                syncDiagnostics: {
                    code: 'NO_HEARTBEAT',
                    message: 'Windows MT5 worker is waiting for its first heartbeat.',
                } satisfies TerminalSyncDiagnostics,
            },
        })
        .returning();

    if (!inserted) {
        throw new Error('Failed to create Windows MT5 worker terminal record');
    }

    return (await getTerminalByAccountId(accountId)) as TerminalInstance;
}

async function enableWindowsMt5PythonAutoSync(
    accountId: string,
    userId: string
): Promise<TerminalInstance> {
    const account = await getOwnedAccount(accountId, userId);
    if (!account) {
        throw new Error('Account not found');
    }

    await setTerminalEnabled(accountId, true);
    return ensureWindowsWorkerTerminal(accountId, userId);
}

async function disableWindowsMt5PythonAutoSync(
    accountId: string,
    userId: string
): Promise<void> {
    const account = await getOwnedAccount(accountId, userId);
    if (!account) {
        throw new Error('Account not found');
    }

    await setTerminalEnabled(accountId, false);

    const terminal = await getTerminalByAccountId(accountId);
    if (!terminal) {
        return;
    }

    const diagnostics = buildDiagnostics(readTerminalSyncDiagnostics(terminal.metadata), {
        code: 'TERMINAL_DISABLED',
        message: 'Windows MT5 worker sync is disabled for this account.',
        lastHeartbeatAt: terminal.lastHeartbeat ?? undefined,
    });

    await db
        .update(terminalInstances)
        .set({
            status: 'STOPPED',
            errorMessage: null,
            metadata: mergeTerminalMetadata(terminal.metadata, {
                syncProvider: 'windows_mt5_python',
                windowsMt5Python: {
                    ...(readWindowsMt5PythonMetadata(terminal.metadata) ?? {}),
                    loginState: 'disconnected',
                    lastError: null,
                },
                syncDiagnostics: diagnostics,
            }),
        })
        .where(eq(terminalInstances.id, terminal.id));
}

async function refreshWindowsMt5PythonStatus(
    accountId: string,
    userId: string,
    options: RefreshStatusOptions = {}
): Promise<TerminalInstance | null> {
    const account = await getOwnedAccount(accountId, userId);
    if (!account) {
        throw new Error('Account not found');
    }

    let terminal = await getTerminalByAccountId(accountId);
    if (!terminal) {
        if (!options.createIfMissing) {
            return null;
        }
        terminal = await ensureWindowsWorkerTerminal(accountId, userId);
    }

    if (account.terminalEnabled === false) {
        await disableWindowsMt5PythonAutoSync(accountId, userId);
        return getTerminalByAccountId(accountId);
    }

    const currentDiagnostics = readTerminalSyncDiagnostics(terminal.metadata);
    const nextState = deriveWindowsMt5WorkerTerminalState(
        terminal.lastHeartbeat,
        currentDiagnostics
    );

    await db
        .update(terminalInstances)
        .set({
            status: nextState.status,
            errorMessage: nextState.errorMessage,
            metadata: mergeTerminalMetadata(terminal.metadata, {
                syncProvider: 'windows_mt5_python',
                windowsMt5Python: {
                    ...(readWindowsMt5PythonMetadata(terminal.metadata) ?? {}),
                    loginState: nextState.loginState,
                    lastHeartbeatAt: terminal.lastHeartbeat,
                    lastError:
                        nextState.loginState === 'connected'
                            ? null
                            : nextState.diagnostics.message,
                },
                syncDiagnostics: nextState.diagnostics,
            }),
        })
        .where(eq(terminalInstances.id, terminal.id));

    return getTerminalByAccountId(accountId);
}

function resolveProvider(terminal: TerminalInstance | null): TerminalSyncProvider {
    const explicitProvider = readExplicitConfiguredMt5SyncProvider();
    if (explicitProvider) {
        return explicitProvider;
    }

    if (terminal) {
        return readTerminalSyncProvider(terminal.metadata);
    }

    return getConfiguredMt5SyncProvider();
}

export async function enableMt5AutoSync(accountId: string, userId: string): Promise<TerminalInstance> {
    const terminal = await getTerminalByAccountId(accountId);
    const provider = resolveProvider(terminal);

    switch (provider) {
        case 'terminal_farm':
            return enableTerminalFarmAutoSync(accountId, userId);
        case 'metaapi':
            return enableMetaApiAutoSync(accountId, userId);
        case 'windows_mt5_python':
        default:
            return enableWindowsMt5PythonAutoSync(accountId, userId);
    }
}

export async function disableMt5AutoSync(accountId: string, userId: string): Promise<void> {
    const terminal = await getTerminalByAccountId(accountId);
    const provider = resolveProvider(terminal);

    switch (provider) {
        case 'terminal_farm':
            await disableTerminalFarmAutoSync(accountId);
            return;
        case 'metaapi':
            await disableMetaApiAutoSync(accountId, userId);
            return;
        case 'windows_mt5_python':
        default:
            await disableWindowsMt5PythonAutoSync(accountId, userId);
    }
}

export async function refreshMt5SyncStatus(
    accountId: string,
    userId: string,
    options: RefreshStatusOptions = {}
): Promise<TerminalInstance | null> {
    const terminal = await getTerminalByAccountId(accountId);
    const provider = resolveProvider(terminal);

    switch (provider) {
        case 'terminal_farm':
            return getTerminalByAccountId(accountId);
        case 'metaapi':
            return refreshMetaApiTerminalStatus(accountId, userId, {
                force: options.force,
                createIfMissing: options.createIfMissing,
            });
        case 'windows_mt5_python':
        default:
            return refreshWindowsMt5PythonStatus(accountId, userId, options);
    }
}

export function getMt5SyncProvider(): TerminalSyncProvider {
    return getConfiguredMt5SyncProvider();
}
