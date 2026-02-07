/**
 * Webhook: Terminal Candles Sync
 * POST /api/webhook/terminal/candles
 * 
 * Called by the MT5 EA in response to a FETCH_CANDLES command.
 * Stores OHLC candle data directly into the trade's chart_data column.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processCandles } from '@/lib/terminal-farm/service';
import { TerminalCandlesSyncPayloadSchema } from '@/lib/terminal-farm/validation';

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
        const validationResult = TerminalCandlesSyncPayloadSchema.safeParse(body);
        if (!validationResult.success) {
            console.error('[Webhook/Candles] Validation error:', validationResult.error);
            return NextResponse.json(
                { success: false, error: 'Invalid payload', details: validationResult.error.errors },
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
