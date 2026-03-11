import type { NextRequest } from 'next/server';
import type { TerminalWebhookCode } from './types';

export function validateTerminalWebhookApiKey(request: NextRequest): boolean {
    const normalize = (value: string | null | undefined): string =>
        (value ?? '').trim().replace(/^['"]|['"]$/g, '');
    const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const apiKey = normalize(request.headers.get('x-api-key') ?? bearer);
    const expectedKey = normalize(process.env.TERMINAL_WEBHOOK_SECRET);

    if (!expectedKey) {
        if (process.env.WEBHOOK_SECRET_OPTIONAL === 'true') return true;
        return false;
    }

    return apiKey.length > 0 && apiKey === expectedKey;
}

export function getWebhookStatusCode(code: TerminalWebhookCode): number {
    switch (code) {
        case 'UNAUTHORIZED':
            return 401;
        case 'INVALID_PAYLOAD':
            return 400;
        case 'UNKNOWN_TERMINAL':
            return 404;
        case 'SESSION_MISMATCH':
        case 'TERMINAL_DISABLED':
            return 409;
        case 'RATE_LIMITED':
            return 429;
        case 'INTERNAL_ERROR':
            return 500;
        default:
            return 200;
    }
}
