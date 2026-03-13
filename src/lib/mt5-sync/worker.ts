import 'server-only';

import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { terminalInstances } from '@/lib/db/schema';
import {
    mergeTerminalMetadata,
    readWindowsMt5PythonMetadata,
} from '@/lib/terminal-farm/metadata';
import { getTerminalById } from '@/lib/terminal-farm/service';
import { readMt5WorkerRequestMetadata } from '@/lib/mt5-sync/worker-auth';
import type {
    TerminalWebhookResponse,
    WindowsMt5PythonMetadata,
} from '@/lib/terminal-farm/types';

const SUCCESS_CODES = new Set([
    'OK',
    'TRADES_IMPORTED',
    'POSITIONS_UPDATED',
    'NO_NEW_DEALS',
    'ZERO_DEALS',
]);

function getWorkerLoginState(
    result: TerminalWebhookResponse
): WindowsMt5PythonMetadata['loginState'] {
    switch (result.code) {
        case 'OK':
        case 'TRADES_IMPORTED':
        case 'POSITIONS_UPDATED':
        case 'NO_NEW_DEALS':
        case 'ZERO_DEALS':
            return 'connected';
        case 'TERMINAL_DISABLED':
            return 'disconnected';
        case 'ACCOUNT_NOT_LOADED':
        case 'SESSION_MISMATCH':
        case 'INVALID_PAYLOAD':
        case 'UNAUTHORIZED':
        case 'UNKNOWN_TERMINAL':
        case 'RATE_LIMITED':
        case 'INTERNAL_ERROR':
        default:
            return 'error';
    }
}

async function persistWindowsWorkerMetadata(
    terminalId: string,
    request: NextRequest,
    result: TerminalWebhookResponse,
    options?: {
        recordHeartbeat?: boolean;
        syncCursor?: string;
    }
): Promise<void> {
    const terminal = await getTerminalById(terminalId);
    if (!terminal) {
        return;
    }

    const existing = readWindowsMt5PythonMetadata(terminal.metadata) ?? {};
    const requestMetadata = readMt5WorkerRequestMetadata(request);
    const nowIso = new Date().toISOString();
    const nextMetadata: WindowsMt5PythonMetadata = {
        ...existing,
        workerId: requestMetadata.workerId ?? existing.workerId ?? null,
        workerHost: requestMetadata.workerHost ?? existing.workerHost ?? null,
        loginState: getWorkerLoginState(result),
        lastHeartbeatAt:
            options?.recordHeartbeat || result.code === 'OK'
                ? nowIso
                : existing.lastHeartbeatAt ?? null,
        lastSuccessfulSyncAt: SUCCESS_CODES.has(result.code)
            ? nowIso
            : existing.lastSuccessfulSyncAt ?? null,
        lastDealsCursor:
            options?.syncCursor ?? existing.lastDealsCursor ?? null,
        lastError: SUCCESS_CODES.has(result.code)
            ? null
            : result.error ?? result.code,
    };

    await db
        .update(terminalInstances)
        .set({
            metadata: mergeTerminalMetadata(terminal.metadata, {
                syncProvider: 'windows_mt5_python',
                windowsMt5Python: nextMetadata,
            }),
        })
        .where(eq(terminalInstances.id, terminal.id));
}

export async function recordMt5WorkerHeartbeatResult(
    terminalId: string,
    request: NextRequest,
    result: TerminalWebhookResponse
): Promise<void> {
    await persistWindowsWorkerMetadata(terminalId, request, result, {
        recordHeartbeat: true,
    });
}

export async function recordMt5WorkerPositionsResult(
    terminalId: string,
    request: NextRequest,
    result: TerminalWebhookResponse
): Promise<void> {
    await persistWindowsWorkerMetadata(terminalId, request, result);
}

export async function recordMt5WorkerTradesResult(
    terminalId: string,
    request: NextRequest,
    result: TerminalWebhookResponse,
    syncCursor?: string
): Promise<void> {
    await persistWindowsWorkerMetadata(terminalId, request, result, {
        syncCursor,
    });
}
