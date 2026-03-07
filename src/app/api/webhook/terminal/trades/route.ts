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

// Validate webhook secret
function validateApiKey(request: NextRequest): boolean {
    const normalize = (value: string | null | undefined): string =>
        (value ?? '').trim().replace(/^['"]|['"]$/g, '');
    const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const apiKey = normalize(request.headers.get('x-api-key') ?? bearer);
    const expectedKey = normalize(process.env.TERMINAL_WEBHOOK_SECRET);

    if (!expectedKey) {
        // Only allow unauthenticated requests when explicitly opted-in
        if (process.env.WEBHOOK_SECRET_OPTIONAL === 'true') return true;
        console.warn('[Webhook/Trades] TERMINAL_WEBHOOK_SECRET is not set — rejecting request. Set WEBHOOK_SECRET_OPTIONAL=true to allow unauthenticated webhooks.');
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
            const rl = checkRateLimit('webhook:trades:' + terminalId, 60, 60_000);
            if (!rl.allowed) {
                return NextResponse.json(
                    { success: false, error: 'Too many requests' },
                    { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
                );
            }
        }

        // Validate payload with Zod
        const validationResult = TerminalSyncPayloadSchema.safeParse(body);
        if (!validationResult.success) {
            console.error('[Webhook/Trades] Validation error:', validationResult.error);
            return NextResponse.json(
                { success: false, error: 'Invalid payload', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const data = validationResult.data;

        console.log(`[Webhook/Trades] Received ${data.trades.length} trades from terminal ${data.terminalId}`);

        const result = await processTrades(data);

        return NextResponse.json({
            success: true,
            imported: result.imported,
            skipped: result.skipped,
        });
    } catch (error) {
        console.error('[Webhook/Trades] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
