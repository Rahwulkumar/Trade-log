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
import {
    getWebhookStatusCode,
    validateTerminalWebhookApiKey,
} from '@/lib/terminal-farm/webhook';

export async function POST(request: NextRequest) {
    try {
        // Validate API key
        if (!validateTerminalWebhookApiKey(request)) {
            return NextResponse.json(
                { success: false, code: 'UNAUTHORIZED', error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const rawBody = (await request.text()).trim();
        let body: unknown;
        try {
            body = rawBody ? JSON.parse(rawBody.replace(/^\uFEFF/, '')) : null;
        } catch (error) {
            console.error('[Webhook/Heartbeat] Invalid JSON payload:', error);
            return NextResponse.json(
                { success: false, code: 'INVALID_PAYLOAD', error: 'Invalid JSON payload' },
                { status: 400 }
            );
        }
        const terminalId = (body as { terminalId?: string })?.terminalId;
        if (terminalId) {
            const rl = checkRateLimit('webhook:heartbeat:' + terminalId, 4, 60_000);
            if (!rl.allowed) {
                return NextResponse.json(
                    { success: false, code: 'RATE_LIMITED', error: 'Too many requests' },
                    { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
                );
            }
        }

        // Validate payload with Zod
        const validationResult = TerminalHeartbeatPayloadSchema.safeParse(body);
        if (!validationResult.success) {
            console.error('[Webhook/Heartbeat] Validation error:', validationResult.error);
            return NextResponse.json(
                { success: false, code: 'INVALID_PAYLOAD', error: 'Invalid payload', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const data = validationResult.data;

        const result = await processHeartbeat(data);

        return NextResponse.json(result, { status: getWebhookStatusCode(result.code) });
    } catch (error) {
        console.error('[Webhook/Heartbeat] Error:', error);
        return NextResponse.json(
            { success: false, code: 'INTERNAL_ERROR', error: 'Internal server error' },
            { status: 500 }
        );
    }
}
