import type {
    MetaApiTerminalMetadata,
    TerminalPositionPayload,
    TerminalSyncProvider,
    TerminalSyncDiagnostics,
    WindowsMt5PythonMetadata,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function cloneTerminalMetadata(
    metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> {
    if (!isRecord(metadata)) {
        return {};
    }
    return { ...metadata };
}

export function readTerminalSyncDiagnostics(
    metadata: Record<string, unknown> | null | undefined
): TerminalSyncDiagnostics | null {
    if (!isRecord(metadata)) {
        return null;
    }
    const diagnostics = metadata.syncDiagnostics;
    if (
        isRecord(diagnostics) &&
        typeof diagnostics.code === 'string' &&
        typeof diagnostics.message === 'string'
    ) {
        return diagnostics as unknown as TerminalSyncDiagnostics;
    }
    return null;
}

export function readTerminalOpenPositions(
    metadata: Record<string, unknown> | null | undefined
): TerminalPositionPayload[] {
    if (!isRecord(metadata)) {
        return [];
    }
    const positions = metadata.openPositions;
    return Array.isArray(positions) ? (positions as TerminalPositionPayload[]) : [];
}

export function readTerminalSyncProvider(
    metadata: Record<string, unknown> | null | undefined
): TerminalSyncProvider {
    if (!isRecord(metadata)) {
        return 'terminal_farm';
    }

    if (metadata.syncProvider === 'metaapi') {
        return 'metaapi';
    }

    if (metadata.syncProvider === 'windows_mt5_python') {
        return 'windows_mt5_python';
    }

    return 'terminal_farm';
}

export function readMetaApiMetadata(
    metadata: Record<string, unknown> | null | undefined
): MetaApiTerminalMetadata | null {
    if (!isRecord(metadata)) {
        return null;
    }

    const metaApi = metadata.metaApi;
    if (
        isRecord(metaApi) &&
        (metaApi.accountId == null || typeof metaApi.accountId === 'string')
    ) {
        return metaApi as unknown as MetaApiTerminalMetadata;
    }

    return null;
}

export function readMetaApiAccountId(
    metadata: Record<string, unknown> | null | undefined
): string | null {
    return readMetaApiMetadata(metadata)?.accountId ?? null;
}

export function readWindowsMt5PythonMetadata(
    metadata: Record<string, unknown> | null | undefined
): WindowsMt5PythonMetadata | null {
    if (!isRecord(metadata)) {
        return null;
    }

    const worker = metadata.windowsMt5Python;
    if (isRecord(worker)) {
        return worker as unknown as WindowsMt5PythonMetadata;
    }

    return null;
}

export function mergeTerminalMetadata(
    metadata: Record<string, unknown> | null | undefined,
    updates: {
        openPositions?: TerminalPositionPayload[];
        positionsUpdatedAt?: string;
        syncDiagnostics?: TerminalSyncDiagnostics;
        syncProvider?: TerminalSyncProvider;
        metaApi?: MetaApiTerminalMetadata;
        windowsMt5Python?: WindowsMt5PythonMetadata;
        [key: string]: unknown;
    }
): Record<string, unknown> {
    const next = cloneTerminalMetadata(metadata);

    Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
            next[key] = value;
        }
    });

    return next;
}
