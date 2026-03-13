import type { NextRequest } from 'next/server';
import {
    readMt5WorkerRequestMetadata,
    validateMt5WorkerSecret,
} from '@/lib/mt5-sync/worker-auth';

function createRequest(
    headers: Record<string, string> = {}
): NextRequest {
    const normalizedHeaders = Object.fromEntries(
        Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
    );

    return {
        headers: {
            get(name: string) {
                return normalizedHeaders[name.toLowerCase()] ?? null;
            },
        },
    } as unknown as NextRequest;
}

describe('validateMt5WorkerSecret', () => {
    const originalSecret = process.env.MT5_WORKER_SECRET;

    afterEach(() => {
        if (originalSecret === undefined) {
            delete process.env.MT5_WORKER_SECRET;
        } else {
            process.env.MT5_WORKER_SECRET = originalSecret;
        }
    });

    it('returns not configured when the backend secret is missing', () => {
        delete process.env.MT5_WORKER_SECRET;

        const request = createRequest();
        const result = validateMt5WorkerSecret(request);

        expect(result).toEqual({
            configured: false,
            valid: false,
        });
    });

    it('accepts the x-worker-secret header', () => {
        process.env.MT5_WORKER_SECRET = "'shared-secret'";

        const request = createRequest({
            'x-worker-secret': 'shared-secret',
        });

        const result = validateMt5WorkerSecret(request);

        expect(result).toEqual({
            configured: true,
            valid: true,
        });
    });

    it('accepts bearer authorization as a fallback', () => {
        process.env.MT5_WORKER_SECRET = 'shared-secret';

        const request = createRequest({
            authorization: 'Bearer shared-secret',
        });

        const result = validateMt5WorkerSecret(request);

        expect(result).toEqual({
            configured: true,
            valid: true,
        });
    });

    it('rejects an invalid worker secret', () => {
        process.env.MT5_WORKER_SECRET = 'shared-secret';

        const request = createRequest({
            'x-worker-secret': 'wrong-secret',
        });

        const result = validateMt5WorkerSecret(request);

        expect(result).toEqual({
            configured: true,
            valid: false,
        });
    });
});

describe('readMt5WorkerRequestMetadata', () => {
    it('normalizes worker id and host headers', () => {
        const request = createRequest({
            'x-worker-id': ' worker-1 ',
            'x-worker-host': ' host-1 ',
        });

        expect(readMt5WorkerRequestMetadata(request)).toEqual({
            workerId: 'worker-1',
            workerHost: 'host-1',
        });
    });

    it('returns null for empty worker metadata headers', () => {
        const request = createRequest({
            'x-worker-id': '   ',
            'x-worker-host': '',
        });

        expect(readMt5WorkerRequestMetadata(request)).toEqual({
            workerId: null,
            workerHost: null,
        });
    });
});
