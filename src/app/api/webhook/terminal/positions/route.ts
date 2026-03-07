/**
 * Webhook: Terminal Positions Sync
 * POST /api/webhook/terminal/positions
 * 
 * Called by the MT5 EA when positions change (open/close).
 * Stores open positions in terminal metadata for real-time display.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processPositions } from '@/lib/terminal-farm/service';
import { checkRateLimit } from '@/lib/rate-limit';
import { TerminalPositionsPayloadSchema } from '@/lib/terminal-farm/validation';

// Validate webhook secret
function validateApiKey(request: NextRequest): boolean {
    const normalize = (value: string | null | undefined): string =>
        (value ?? '').trim().replace(/^['"]|['"]$/g, '');
    const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const apiKey = normalize(request.headers.get('x-api-key') ?? bearer);
    const expectedKey = normalize(process.env.TERMINAL_WEBHOOK_SECRET);

    if (!expectedKey) {
        if (process.env.WEBHOOK_SECRET_OPTIONAL === 'true') return true;
        console.warn('[Webhook/Positions] TERMINAL_WEBHOOK_SECRET is not set — rejecting request. Set WEBHOOK_SECRET_OPTIONAL=true to allow unauthenticated webhooks.');
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
            const rl = checkRateLimit('webhook:positions:' + terminalId, 60, 60_000);
            if (!rl.allowed) {
                return NextResponse.json(
                    { success: false, error: 'Too many requests' },
                    { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
                );
            }
        }

        // Validate payload with Zod
        const validationResult = TerminalPositionsPayloadSchema.safeParse(body);
        if (!validationResult.success) {
            console.error('[Webhook/Positions] Validation error:', validationResult.error);
            return NextResponse.json(
                { success: false, error: 'Invalid payload', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const data = validationResult.data;

        console.log(`[Webhook/Positions] Received ${data.positions.length} positions from terminal ${data.terminalId}`);

        await processPositions(data);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Webhook/Positions] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
