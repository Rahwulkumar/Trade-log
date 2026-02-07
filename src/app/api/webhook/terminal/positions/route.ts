/**
 * Webhook: Terminal Positions Sync
 * POST /api/webhook/terminal/positions
 * 
 * Called by the MT5 EA when positions change (open/close).
 * Stores open positions in terminal metadata for real-time display.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processPositions } from '@/lib/terminal-farm/service';
import { TerminalPositionsPayloadSchema } from '@/lib/terminal-farm/validation';

// Validate webhook secret
function validateApiKey(request: NextRequest): boolean {
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.TERMINAL_WEBHOOK_SECRET;

    if (!expectedKey) return true;
    return apiKey === expectedKey;
}

export async function POST(request: NextRequest) {
    try {
        if (!validateApiKey(request)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Validate payload with Zod
        const validationResult = TerminalPositionsPayloadSchema.safeParse(body);
        if (!validationResult.success) {
            console.error('[Webhook/Positions] Validation error:', validationResult.error);
            return NextResponse.json(
                { success: false, error: 'Invalid payload', details: validationResult.error.errors },
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
