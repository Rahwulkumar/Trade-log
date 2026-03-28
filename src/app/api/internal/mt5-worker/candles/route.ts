import { NextRequest, NextResponse } from 'next/server';
import { processCandles } from '@/lib/terminal-farm/service';
import { TerminalCandlesSyncPayloadSchema } from '@/lib/terminal-farm/validation';
import { validateMt5WorkerSecret } from '@/lib/mt5-sync/worker-auth';

export async function POST(request: NextRequest) {
    try {
        const auth = validateMt5WorkerSecret(request);
        if (!auth.configured) {
            return NextResponse.json(
                { success: false, error: 'MT5 worker secret is not configured' },
                { status: 500 },
            );
        }

        if (!auth.valid) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 },
            );
        }

        const rawBody = (await request.text()).trim();
        let body: unknown;

        try {
            body = rawBody ? JSON.parse(rawBody.replace(/^\uFEFF/, '')) : null;
        } catch (error) {
            console.error('[MT5Worker/Candles] Invalid JSON payload:', error);
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload' },
                { status: 400 },
            );
        }

        const validationResult = TerminalCandlesSyncPayloadSchema.safeParse(body);
        if (!validationResult.success) {
            console.error('[MT5Worker/Candles] Validation error:', validationResult.error);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid payload',
                    details: validationResult.error.issues,
                },
                { status: 400 },
            );
        }

        await processCandles(validationResult.data);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[MT5Worker/Candles] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 },
        );
    }
}
