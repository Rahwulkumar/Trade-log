/**
 * Webhook: Terminal Heartbeat
 * POST /api/webhook/terminal/heartbeat
 * 
 * Called by the MT5 EA every 30 seconds to indicate the terminal is alive.
 * Returns any pending commands (like FETCH_CANDLES).
 */

import { NextRequest, NextResponse } from 'next/server';
import { processHeartbeat } from '@/lib/terminal-farm/service';
import { TerminalHeartbeatPayloadSchema } from '@/lib/terminal-farm/validation';

// Validate webhook secret
function validateApiKey(request: NextRequest): boolean {
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.TERMINAL_WEBHOOK_SECRET;

    // If no secret configured, allow all (for development)
    if (!expectedKey) return true;

    return apiKey === expectedKey;
}

export async function POST(request: NextRequest) {
    try {
        // Validate API key
        if (!validateApiKey(request)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Validate payload with Zod
        const validationResult = TerminalHeartbeatPayloadSchema.safeParse(body);
        if (!validationResult.success) {
            console.error('[Webhook/Heartbeat] Validation error:', validationResult.error);
            return NextResponse.json(
                { success: false, error: 'Invalid payload', details: validationResult.error.errors },
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
