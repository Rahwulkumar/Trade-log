/**
 * Webhook: Terminal Trade Sync
 * POST /api/webhook/terminal/trades
 * 
 * Called by the MT5 EA when trades are detected or on periodic sync.
 * Imports trade history into the trades table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processTrades } from '@/lib/terminal-farm/service';
import { TerminalSyncPayloadSchema } from '@/lib/terminal-farm/validation';

// Validate webhook secret
function validateApiKey(request: NextRequest): boolean {
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.TERMINAL_WEBHOOK_SECRET;

    // In production, require secret to be set
    if (!expectedKey) {
        if (process.env.NODE_ENV === 'production') {
            return false; // Require secret in production
        }
        return true; // Allow bypass in development if not set
    }
    return apiKey === expectedKey;
}

export async function POST(request: NextRequest) {
    try {
        if (!validateApiKey(request)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Validate payload with Zod
        const validationResult = TerminalSyncPayloadSchema.safeParse(body);
        if (!validationResult.success) {
            console.error('[Webhook/Trades] Validation error:', validationResult.error);
            return NextResponse.json(
                { success: false, error: 'Invalid payload', details: validationResult.error.errors },
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
