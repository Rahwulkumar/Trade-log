import type {
    TerminalStatus,
    TerminalSyncDiagnostics,
    WindowsMt5PythonMetadata,
} from '@/lib/terminal-farm/types';

export const WINDOWS_WORKER_HEARTBEAT_THRESHOLD_MS = 5 * 60 * 1000;

type AssignmentCandidate = {
    terminalId: string;
    terminalEnabled: boolean | null;
    lastHeartbeat: Date | null;
    workerId: string | null;
};

const WINDOWS_WORKER_TERMINAL_ERROR_CODES = new Set<
    TerminalSyncDiagnostics['code']
>(['ACCOUNT_NOT_LOADED', 'SESSION_MISMATCH']);

function mergeDiagnostics(
    currentDiagnostics: TerminalSyncDiagnostics | null,
    patch: Partial<TerminalSyncDiagnostics> &
        Pick<TerminalSyncDiagnostics, 'code' | 'message'>
): TerminalSyncDiagnostics {
    return {
        ...(currentDiagnostics ?? {}),
        ...patch,
    };
}

export function hasRecentWorkerHeartbeat(lastHeartbeat: Date | null): boolean {
    if (!lastHeartbeat) {
        return false;
    }

    return Date.now() - lastHeartbeat.getTime() <= WINDOWS_WORKER_HEARTBEAT_THRESHOLD_MS;
}

export function hasRecentWorkerHeartbeatIso(lastHeartbeat: string | null): boolean {
    if (!lastHeartbeat) {
        return false;
    }

    const lastBeatMs = new Date(lastHeartbeat).getTime();
    if (Number.isNaN(lastBeatMs)) {
        return false;
    }

    return Date.now() - lastBeatMs <= WINDOWS_WORKER_HEARTBEAT_THRESHOLD_MS;
}

export function deriveWindowsMt5WorkerTerminalState(
    lastHeartbeat: string | null,
    currentDiagnostics: TerminalSyncDiagnostics | null
): {
    status: TerminalStatus;
    diagnostics: TerminalSyncDiagnostics;
    loginState: WindowsMt5PythonMetadata['loginState'];
    errorMessage: string | null;
} {
    const recentHeartbeat = hasRecentWorkerHeartbeatIso(lastHeartbeat);

    if (!recentHeartbeat) {
        const diagnostics = mergeDiagnostics(currentDiagnostics, {
            code: 'NO_HEARTBEAT',
            message: lastHeartbeat
                ? 'Windows MT5 worker has not reported a recent heartbeat.'
                : 'Windows MT5 worker is waiting for its first heartbeat.',
            lastHeartbeatAt: lastHeartbeat ?? undefined,
        });

        return {
            status: lastHeartbeat ? 'ERROR' : 'PENDING',
            diagnostics,
            loginState: lastHeartbeat ? 'error' : 'pending',
            errorMessage: lastHeartbeat ? diagnostics.message : null,
        };
    }

    if (
        currentDiagnostics &&
        WINDOWS_WORKER_TERMINAL_ERROR_CODES.has(currentDiagnostics.code)
    ) {
        const diagnostics = mergeDiagnostics(currentDiagnostics, {
            code: currentDiagnostics.code,
            message: currentDiagnostics.message,
            lastHeartbeatAt: lastHeartbeat ?? undefined,
        });

        return {
            status: 'ERROR',
            diagnostics,
            loginState: 'error',
            errorMessage: diagnostics.message,
        };
    }

    if (currentDiagnostics) {
        const diagnostics = mergeDiagnostics(currentDiagnostics, {
            code: currentDiagnostics.code,
            message: currentDiagnostics.message,
            lastHeartbeatAt: lastHeartbeat ?? undefined,
        });

        return {
            status: 'RUNNING',
            diagnostics,
            loginState: 'connected',
            errorMessage: null,
        };
    }

    const diagnostics = mergeDiagnostics(null, {
        code: 'OK',
        message: 'Windows MT5 worker is connected.',
        lastHeartbeatAt: lastHeartbeat ?? undefined,
    });

    return {
        status: 'RUNNING',
        diagnostics,
        loginState: 'connected',
        errorMessage: null,
    };
}

export function selectWindowsMt5WorkerCandidate(
    workerId: string,
    candidates: AssignmentCandidate[]
): string | null {
    const alreadyAssigned = candidates.find(
        candidate =>
            candidate.terminalEnabled !== false && candidate.workerId === workerId
    );
    if (alreadyAssigned) {
        return alreadyAssigned.terminalId;
    }

    const reclaimable = candidates.find(candidate => {
        if (candidate.terminalEnabled === false) {
            return false;
        }
        if (!candidate.workerId) {
            return true;
        }
        return !hasRecentWorkerHeartbeat(candidate.lastHeartbeat);
    });

    return reclaimable?.terminalId ?? null;
}
