/**
 * Webhook: Terminal Candles Sync
 * POST /api/webhook/terminal/candles
 *
 * Called by the MT5 EA in response to a FETCH_CANDLES command.
 * Stores OHLC candle data directly into the trade's chart_data column.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processCandles } from '@/lib/terminal-farm/service';
import { checkRateLimit } from '@/lib/rate-limit';
import { TerminalCandlesSyncPayloadSchema } from '@/lib/terminal-farm/validation';

// Validate webhook secret
function validateApiKey(request: NextRequest): boolean {
    const normalize = (value: string | null | undefined): string =>
        (value ?? '').trim().replace(/^['"]|['"]$/g, '');
    const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const apiKey = normalize(request.headers.get('x-api-key') ?? bearer);
    const expectedKey = normalize(process.env.TERMINAL_WEBHOOK_SECRET);

    if (!expectedKey) {
        if (process.env.WEBHOOK_SECRET_OPTIONAL === 'true') return true;
        console.warn('[Webhook/Candles] TERMINAL_WEBHOOK_SECRET is not set — rejecting request. Set WEBHOOK_SECRET_OPTIONAL=true to allow unauthenticated webhooks.');
        return false;
    }
    return apiKey.length > 0 && apiKey === expectedKey;
}

export async function POST(request: NextRequest) {
    try {
        if (!validateApiKey(request)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const terminalId = (body as { terminalId?: string })?.terminalId;
        if (terminalId) {
            const rl = checkRateLimit('webhook:candles:' + terminalId, 120, 60_000);
            if (!rl.allowed) {
                return NextResponse.json(
                    { success: false, error: 'Too many requests' },
                    { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
                );
            }
        }

        // Validate payload with Zod
        const validationResult = TerminalCandlesSyncPayloadSchema.safeParse(body);
        if (!validationResult.success) {
            console.error('[Webhook/Candles] Validation error:', validationResult.error);
            return NextResponse.json(
                { success: false, error: 'Invalid payload', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const data = validationResult.data;

        console.log(`[Webhook/Candles] Received ${data.candles.length} candles for trade ${data.tradeId}`);

        await processCandles(data);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Webhook/Candles] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
