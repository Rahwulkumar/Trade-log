export interface Mt5EaRequestLike {
    headers: Pick<Headers, 'get'>;
    nextUrl: Pick<URL, 'origin'>;
}

const DEFAULT_HEARTBEAT_INTERVAL = 15;
const DEFAULT_SYNC_INTERVAL = 15;
const DEFAULT_HISTORY_SYNC_BATCH_SIZE = 200;
const DEFAULT_INITIAL_HISTORY_DAYS = 90;

export interface Mt5EaPresetOptions {
    backendUrl: string;
    apiKey: string;
    terminalId: string;
    heartbeatInterval?: number;
    syncInterval?: number;
    historySyncBatchSize?: number;
    initialHistoryDays?: number;
    enableDebugLog?: boolean;
}

export interface Mt5EaSetupDescriptor {
    terminalId: string;
    backendUrl: string;
    webRequestOrigin: string;
    sourceDownloadUrl: string;
    binaryDownloadUrl: string;
    presetDownloadUrl: string;
}

function normalizeUrl(value: string): string {
    return value.trim().replace(/\/+$/, '');
}

function normalizeLocalBackendUrl(value: string): string {
    try {
        const url = new URL(value);
        if (url.hostname === 'localhost') {
            url.hostname = '127.0.0.1';
            return normalizeUrl(url.toString());
        }
    } catch {
        return normalizeUrl(value);
    }

    return normalizeUrl(value);
}

function readConfiguredBaseUrl(): string | null {
    const candidates = [
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.APP_URL,
        process.env.PUBLIC_APP_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
    ];

    for (const candidate of candidates) {
        const normalized = candidate?.trim();
        if (!normalized) {
            continue;
        }

        if (normalized.toLowerCase() === 'undefined' || normalized.toLowerCase() === 'null') {
            continue;
        }

        return normalized;
    }

    return null;
}

export function resolveMt5EaBackendUrl(request: Mt5EaRequestLike): string {
    const configuredBaseUrl = readConfiguredBaseUrl();

    if (configuredBaseUrl) {
        if (/^https?:\/\//i.test(configuredBaseUrl)) {
            return normalizeLocalBackendUrl(configuredBaseUrl);
        }

        return normalizeLocalBackendUrl(`https://${configuredBaseUrl}`);
    }

    const forwardedProto = request.headers.get('x-forwarded-proto');
    const forwardedHost = request.headers.get('x-forwarded-host');

    if (forwardedProto && forwardedHost) {
        return normalizeLocalBackendUrl(`${forwardedProto}://${forwardedHost}`);
    }

    return normalizeLocalBackendUrl(request.nextUrl.origin);
}

export function buildMt5EaPreset(options: Mt5EaPresetOptions): string {
    return [
        `BackendURL=${normalizeUrl(options.backendUrl)}`,
        `APIKey=${options.apiKey}`,
        `TerminalId=${options.terminalId}`,
        `HeartbeatInterval=${options.heartbeatInterval ?? DEFAULT_HEARTBEAT_INTERVAL}`,
        `SyncInterval=${options.syncInterval ?? DEFAULT_SYNC_INTERVAL}`,
        `HistorySyncBatchSize=${options.historySyncBatchSize ?? DEFAULT_HISTORY_SYNC_BATCH_SIZE}`,
        `InitialHistoryDays=${options.initialHistoryDays ?? DEFAULT_INITIAL_HISTORY_DAYS}`,
        `EnableDebugLog=${(options.enableDebugLog ?? true) ? 'true' : 'false'}`,
    ].join('\r\n');
}

export function buildMt5EaSetupDescriptor(
    request: Mt5EaRequestLike,
    accountId: string,
    terminalId: string
): Mt5EaSetupDescriptor {
    const backendUrl = resolveMt5EaBackendUrl(request);
    const webRequestOrigin = new URL(backendUrl).origin;

    return {
        terminalId,
        backendUrl,
        webRequestOrigin,
        sourceDownloadUrl: `${backendUrl}/api/downloads/mt5-ea?format=mq5`,
        binaryDownloadUrl: `${backendUrl}/api/downloads/mt5-ea?format=ex5`,
        presetDownloadUrl: `${backendUrl}/api/mt5-accounts/${accountId}/ea-preset`,
    };
}
