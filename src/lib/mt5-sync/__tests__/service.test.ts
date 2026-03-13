import {
    deriveWindowsMt5WorkerTerminalState,
    hasRecentTerminalHeartbeat,
    selectWindowsMt5WorkerCandidate,
} from '@/lib/mt5-sync/runtime';
import type { TerminalSyncDiagnostics } from '@/lib/terminal-farm/types';

describe('deriveWindowsMt5WorkerTerminalState', () => {
    const nowIso = new Date().toISOString();

    it('preserves worker-reported account loading failures when heartbeat is recent', () => {
        const diagnostics: TerminalSyncDiagnostics = {
            code: 'ACCOUNT_NOT_LOADED',
            message: 'Broker account is not loaded.',
        };

        const result = deriveWindowsMt5WorkerTerminalState(nowIso, diagnostics);

        expect(result.status).toBe('ERROR');
        expect(result.loginState).toBe('error');
        expect(result.diagnostics.code).toBe('ACCOUNT_NOT_LOADED');
        expect(result.errorMessage).toBe('Broker account is not loaded.');
    });

    it('keeps running diagnostics when heartbeat is recent and sync is healthy', () => {
        const diagnostics: TerminalSyncDiagnostics = {
            code: 'NO_NEW_DEALS',
            message: 'Trade sync completed with no new imports.',
        };

        const result = deriveWindowsMt5WorkerTerminalState(nowIso, diagnostics);

        expect(result.status).toBe('RUNNING');
        expect(result.loginState).toBe('connected');
        expect(result.diagnostics.code).toBe('NO_NEW_DEALS');
        expect(result.errorMessage).toBeNull();
    });

    it('returns no-heartbeat error when the last heartbeat is stale', () => {
        const staleIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const diagnostics: TerminalSyncDiagnostics = {
            code: 'TRADES_IMPORTED',
            message: 'Imported 3 MT5 trade updates.',
        };

        const result = deriveWindowsMt5WorkerTerminalState(staleIso, diagnostics);

        expect(result.status).toBe('ERROR');
        expect(result.loginState).toBe('error');
        expect(result.diagnostics.code).toBe('NO_HEARTBEAT');
    });
});

describe('selectWindowsMt5WorkerCandidate', () => {
    it('prefers the assignment already claimed by the requesting worker', () => {
        const selected = selectWindowsMt5WorkerCandidate('worker-a', [
            {
                terminalId: 'terminal-1',
                terminalEnabled: true,
                lastHeartbeat: new Date(),
                workerId: 'worker-a',
            },
            {
                terminalId: 'terminal-2',
                terminalEnabled: true,
                lastHeartbeat: null,
                workerId: null,
            },
        ]);

        expect(selected).toBe('terminal-1');
    });

    it('claims an unassigned running terminal when none is already assigned', () => {
        const selected = selectWindowsMt5WorkerCandidate('worker-a', [
            {
                terminalId: 'terminal-1',
                terminalEnabled: true,
                lastHeartbeat: null,
                workerId: null,
            },
        ]);

        expect(selected).toBe('terminal-1');
    });

    it('can reclaim a stale assignment from another worker', () => {
        const staleHeartbeat = new Date(Date.now() - 10 * 60 * 1000);
        const selected = selectWindowsMt5WorkerCandidate('worker-b', [
            {
                terminalId: 'terminal-1',
                terminalEnabled: true,
                lastHeartbeat: staleHeartbeat,
                workerId: 'worker-a',
            },
        ]);

        expect(selected).toBe('terminal-1');
    });

    it('does not take a healthy assignment owned by another worker', () => {
        const selected = selectWindowsMt5WorkerCandidate('worker-b', [
            {
                terminalId: 'terminal-1',
                terminalEnabled: true,
                lastHeartbeat: new Date(),
                workerId: 'worker-a',
            },
        ]);

        expect(selected).toBeNull();
    });
});

describe('hasRecentTerminalHeartbeat', () => {
    it('uses the windows heartbeat threshold for windows worker terminals', () => {
        const recentUnderFiveMinutes = new Date(
            Date.now() - 4 * 60 * 1000
        ).toISOString();

        expect(
            hasRecentTerminalHeartbeat(
                recentUnderFiveMinutes,
                'windows_mt5_python'
            )
        ).toBe(true);
    });

    it('uses the legacy two-minute heartbeat threshold for non-windows providers', () => {
        const staleOverTwoMinutes = new Date(
            Date.now() - 3 * 60 * 1000
        ).toISOString();

        expect(
            hasRecentTerminalHeartbeat(staleOverTwoMinutes, 'terminal_farm')
        ).toBe(false);
    });
});
