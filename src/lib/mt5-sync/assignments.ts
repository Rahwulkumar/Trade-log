import 'server-only';

import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mt5Accounts, terminalInstances } from '@/lib/db/schema';
import { decrypt } from '@/lib/mt5/encryption';
import {
    mergeTerminalMetadata,
    readTerminalSyncProvider,
    readWindowsMt5PythonMetadata,
} from '@/lib/terminal-farm/metadata';
import { selectWindowsMt5WorkerCandidate } from '@/lib/mt5-sync/runtime';
import type {
    WindowsMt5PythonMetadata,
    WindowsMt5WorkerAssignment,
} from '@/lib/terminal-farm/types';

type AssignmentRow = {
    terminalId: string;
    terminalUserId: string;
    lastHeartbeat: Date | null;
    lastSyncAt: Date | null;
    metadata: unknown;
    mt5AccountId: string;
    accountName: string;
    server: string;
    login: string;
    password: string;
    terminalEnabled: boolean | null;
};

type WindowsAssignmentCandidate = {
    row: AssignmentRow;
    workerMetadata: WindowsMt5PythonMetadata | null;
};

function isWindowsWorkerRow(
    row: AssignmentRow
): row is AssignmentRow {
    return (
        readTerminalSyncProvider(
            row.metadata as Record<string, unknown> | null | undefined
        ) === 'windows_mt5_python'
    );
}

function toCandidate(row: AssignmentRow): WindowsAssignmentCandidate {
    return {
        row,
        workerMetadata: readWindowsMt5PythonMetadata(
            row.metadata as Record<string, unknown> | null | undefined
        ),
    };
}

function toAssignment(
    candidate: WindowsAssignmentCandidate,
    workerId: string,
    workerHost: string | null
): WindowsMt5WorkerAssignment {
    return {
        terminalId: candidate.row.terminalId,
        mt5AccountId: candidate.row.mt5AccountId,
        userId: candidate.row.terminalUserId,
        desiredState: candidate.row.terminalEnabled === false ? 'STOPPED' : 'RUNNING',
        accountName: candidate.row.accountName,
        server: candidate.row.server,
        login: candidate.row.login,
        password: decrypt(candidate.row.password),
        lastHeartbeat: candidate.row.lastHeartbeat?.toISOString() ?? null,
        lastSyncAt: candidate.row.lastSyncAt?.toISOString() ?? null,
        workerId,
        workerHost,
    };
}

async function claimCandidateForWorker(
    candidate: WindowsAssignmentCandidate,
    workerId: string,
    workerHost: string | null
): Promise<WindowsAssignmentCandidate> {
    const nextWorkerMetadata: WindowsMt5PythonMetadata = {
        ...(candidate.workerMetadata ?? {}),
        workerId,
        workerHost,
        loginState: candidate.workerMetadata?.loginState ?? 'pending',
    };

    await db
        .update(terminalInstances)
        .set({
            metadata: mergeTerminalMetadata(
                candidate.row.metadata as Record<string, unknown> | null | undefined,
                {
                    syncProvider: 'windows_mt5_python',
                    windowsMt5Python: nextWorkerMetadata,
                }
            ),
        })
        .where(eq(terminalInstances.id, candidate.row.terminalId));

    return {
        row: candidate.row,
        workerMetadata: nextWorkerMetadata,
    };
}

export async function getWindowsMt5WorkerAssignments(
    workerId: string,
    workerHost: string | null
): Promise<WindowsMt5WorkerAssignment[]> {
    const rows = await db
        .select({
            terminalId: terminalInstances.id,
            terminalUserId: terminalInstances.userId,
            lastHeartbeat: terminalInstances.lastHeartbeat,
            lastSyncAt: terminalInstances.lastSyncAt,
            metadata: terminalInstances.metadata,
            mt5AccountId: mt5Accounts.id,
            accountName: mt5Accounts.accountName,
            server: mt5Accounts.server,
            login: mt5Accounts.login,
            password: mt5Accounts.password,
            terminalEnabled: mt5Accounts.terminalEnabled,
        })
        .from(terminalInstances)
        .innerJoin(mt5Accounts, eq(terminalInstances.accountId, mt5Accounts.id))
        .orderBy(asc(terminalInstances.createdAt));

    const candidates = rows.filter(isWindowsWorkerRow).map(toCandidate);
    const selectedTerminalId = selectWindowsMt5WorkerCandidate(
        workerId,
        candidates.map(candidate => ({
            terminalId: candidate.row.terminalId,
            terminalEnabled: candidate.row.terminalEnabled,
            lastHeartbeat: candidate.row.lastHeartbeat,
            workerId: candidate.workerMetadata?.workerId ?? null,
        }))
    );

    if (!selectedTerminalId) {
        return [];
    }

    const selected =
        candidates.find(candidate => candidate.row.terminalId === selectedTerminalId) ??
        null;

    if (!selected) {
        return [];
    }

    const claimed =
        selected.workerMetadata?.workerId === workerId
            ? selected
            : await claimCandidateForWorker(selected, workerId, workerHost);

    return [toAssignment(claimed, workerId, workerHost)];
}
