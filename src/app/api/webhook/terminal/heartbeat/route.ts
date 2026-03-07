/**
 * Webhook: Terminal Heartbeat
 * POST /api/webhook/terminal/heartbeat
 * 
 * Called by the MT5 EA every 30 seconds to indicate the terminal is alive.
 * Returns any pending commands (like FETCH_CANDLES).
 */

import { NextRequest, NextResponse } from 'next/server';
import { processHeartbeat } from '@/lib/terminal-farm/service';
import { checkRateLimit } from '@/lib/rate-limit';
import { TerminalHeartbeatPayloadSchema } from '@/lib/terminal-farm/validation';

// Validate webhook secret
function validateApiKey(request: NextRequest): boolean {
    const normalize = (value: string | null | undefined): string =>
        (value ?? '').trim().replace(/^['"]|['"]$/g, '');
    const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const apiKey = normalize(request.headers.get('x-api-key') ?? bearer);
    const expectedKey = normalize(process.env.TERMINAL_WEBHOOK_SECRET);

    if (!expectedKey) {
        if (process.env.WEBHOOK_SECRET_OPTIONAL === 'true') return true;
        console.warn('[Webhook/Heartbeat] TERMINAL_WEBHOOK_SECRET is not set — rejecting request. Set WEBHOOK_SECRET_OPTIONAL=true to allow unauthenticated webhooks.');
        return false;
    }
    return apiKey.length > 0 && apiKey === expectedKey;
}

export async function POST(request: NextRequest) {
    try {
        // Validate API key
        if (!validateApiKey(request)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const terminalId = (body as { terminalId?: string })?.terminalId;
        if (terminalId) {
            const rl = checkRateLimit('webhook:heartbeat:' + terminalId, 4, 60_000);
            if (!rl.allowed) {
                return NextResponse.json(
                    { success: false, error: 'Too many requests' },
                    { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
                );
            }
        }

        // Validate payload with Zod
        const validationResult = TerminalHeartbeatPayloadSchema.safeParse(body);
        if (!validationResult.success) {
            console.error('[Webhook/Heartbeat] Validation error:', validationResult.error);
            return NextResponse.json(
                { success: false, error: 'Invalid payload', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const data = validationResult.data;

        const result = await processHeartbeat(data);

        return NextResponse.json(result);
    } catch (error) {
        console.error('[Webhook/Heartbeat] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
