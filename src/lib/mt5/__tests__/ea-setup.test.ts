import {
    buildMt5EaPreset,
    buildMt5EaSetupDescriptor,
    resolveMt5EaBackendUrl,
} from '@/lib/mt5/ea-setup';

function createRequest(origin: string, headers?: Record<string, string>) {
    return {
        headers: {
            get(name: string) {
                const lookup = Object.entries(headers ?? {}).find(
                    ([key]) => key.toLowerCase() === name.toLowerCase()
                );

                return lookup?.[1] ?? null;
            },
        },
        nextUrl: {
            origin,
        },
    };
}

describe('resolveMt5EaBackendUrl', () => {
    const originalPublicUrl = process.env.NEXT_PUBLIC_APP_URL;

    afterEach(() => {
        process.env.NEXT_PUBLIC_APP_URL = originalPublicUrl;
    });

    it('prefers the configured public app url when present', () => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://journal.example.com/';

        const request = createRequest('http://localhost:3000');

        expect(resolveMt5EaBackendUrl(request)).toBe('https://journal.example.com');
    });

    it('falls back to the request origin when no public url is configured', () => {
        delete process.env.NEXT_PUBLIC_APP_URL;

        const request = createRequest('http://localhost:3000');

        expect(resolveMt5EaBackendUrl(request)).toBe('http://127.0.0.1:3000');
    });
});

describe('buildMt5EaPreset', () => {
    it('renders the preset with the required trading journal inputs', () => {
        const preset = buildMt5EaPreset({
            backendUrl: 'http://localhost:3000/',
            apiKey: 'secret-key',
            terminalId: 'terminal-123',
        });

        expect(preset).toContain('BackendURL=http://localhost:3000');
        expect(preset).toContain('APIKey=secret-key');
        expect(preset).toContain('TerminalId=terminal-123');
        expect(preset).toContain('HeartbeatInterval=15');
        expect(preset).toContain('SyncInterval=15');
        expect(preset).toContain('HistorySyncBatchSize=200');
        expect(preset).toContain('InitialHistoryDays=90');
        expect(preset).toContain('EnableDebugLog=true');
    });
});

describe('buildMt5EaSetupDescriptor', () => {
    it('builds absolute download urls for the authenticated account setup', () => {
        const request = createRequest('http://localhost:3000');
        const descriptor = buildMt5EaSetupDescriptor(request, 'account-1', 'terminal-123');

        expect(descriptor.backendUrl).toBe('http://127.0.0.1:3000');
        expect(descriptor.webRequestOrigin).toBe('http://127.0.0.1:3000');
        expect(descriptor.sourceDownloadUrl).toBe('http://127.0.0.1:3000/api/downloads/mt5-ea?format=mq5');
        expect(descriptor.binaryDownloadUrl).toBe('http://127.0.0.1:3000/api/downloads/mt5-ea?format=ex5');
        expect(descriptor.presetDownloadUrl).toBe('http://127.0.0.1:3000/api/mt5-accounts/account-1/ea-preset');
    });
});
