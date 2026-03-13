import 'server-only';

import type { NextRequest } from 'next/server';

type WorkerSecretValidation = {
    configured: boolean;
    valid: boolean;
};

type WorkerRequestMetadata = {
    workerId: string | null;
    workerHost: string | null;
};

function normalizeSecret(value: string | null | undefined): string {
    return (value ?? '').trim().replace(/^['"]|['"]$/g, '');
}

export function validateMt5WorkerSecret(
    request: NextRequest
): WorkerSecretValidation {
    const bearer = request.headers
        .get('authorization')
        ?.replace(/^Bearer\s+/i, '');
    const provided = normalizeSecret(
        request.headers.get('x-worker-secret') ?? bearer
    );
    const expected = normalizeSecret(process.env.MT5_WORKER_SECRET);

    if (!expected) {
        return { configured: false, valid: false };
    }

    return {
        configured: true,
        valid: provided.length > 0 && provided === expected,
    };
}

export function readMt5WorkerRequestMetadata(
    request: NextRequest
): WorkerRequestMetadata {
    const workerId = request.headers.get('x-worker-id')?.trim() ?? null;
    const workerHost = request.headers.get('x-worker-host')?.trim() ?? null;

    return {
        workerId: workerId || null,
        workerHost: workerHost || null,
    };
}
