/**
 * Webhook: Terminal Trade Sync
 * POST /api/webhook/terminal/trades
 * 
 * Called by the MT5 EA when trades are detected or on periodic sync.
 * Imports trade history into the trades table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processTrades } from '@/lib/terminal-farm/service';
import { checkRateLimit } from '@/lib/rate-limit';
import { TerminalSyncPayloadSchema } from '@/lib/terminal-farm/validation';
import {
    getWebhookStatusCode,
    validateTerminalWebhookApiKey,
} from '@/lib/terminal-farm/webhook';

export async function POST(request: NextRequest) {
    try {
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
            console.error('[Webhook/Trades] Invalid JSON payload:', error);
            return NextResponse.json(
                { success: false, code: 'INVALID_PAYLOAD', error: 'Invalid JSON payload' },
                { status: 400 }
            );
        }
        const terminalId = (body as { terminalId?: string })?.terminalId;
        if (terminalId) {
            const rl = checkRateLimit('webhook:trades:' + terminalId, 60, 60_000);
            if (!rl.allowed) {
                return NextResponse.json(
                    { success: false, code: 'RATE_LIMITED', error: 'Too many requests' },
                    { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
                );
            }
        }

        // Validate payload with Zod
        const validationResult = TerminalSyncPayloadSchema.safeParse(body);
        if (!validationResult.success) {
            console.error('[Webhook/Trades] Validation error:', validationResult.error);
            return NextResponse.json(
                { success: false, code: 'INVALID_PAYLOAD', error: 'Invalid payload', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const data = validationResult.data;

        console.log(`[Webhook/Trades] Received ${data.trades.length} trades from terminal ${data.terminalId}`);

        const result = await processTrades(data);

        return NextResponse.json(result, { status: getWebhookStatusCode(result.code) });
    } catch (error) {
        console.error('[Webhook/Trades] Error:', error);
        return NextResponse.json(
            { success: false, code: 'INTERNAL_ERROR', error: 'Internal server error' },
            { status: 500 }
        );
    }
}
