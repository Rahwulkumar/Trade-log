import { NextRequest, NextResponse } from 'next/server';
import { processPositions } from '@/lib/terminal-farm/service';
import { TerminalPositionsPayloadSchema } from '@/lib/terminal-farm/validation';
import { getWebhookStatusCode } from '@/lib/terminal-farm/webhook';
import { validateMt5WorkerSecret } from '@/lib/mt5-sync/worker-auth';
import {
    recordMt5WorkerPositionsResult,
} from '@/lib/mt5-sync/worker';

export async function POST(request: NextRequest) {
    try {
        const auth = validateMt5WorkerSecret(request);
        if (!auth.configured) {
            return NextResponse.json(
                { success: false, code: 'INTERNAL_ERROR', error: 'MT5 worker secret is not configured' },
                { status: 500 }
            );
        }

        if (!auth.valid) {
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
            console.error('[MT5Worker/Positions] Invalid JSON payload:', error);
            return NextResponse.json(
                { success: false, code: 'INVALID_PAYLOAD', error: 'Invalid JSON payload' },
                { status: 400 }
            );
        }

        const validationResult = TerminalPositionsPayloadSchema.safeParse(body);
        if (!validationResult.success) {
            console.error('[MT5Worker/Positions] Validation error:', validationResult.error);
            return NextResponse.json(
                {
                    success: false,
                    code: 'INVALID_PAYLOAD',
                    error: 'Invalid payload',
                    details: validationResult.error.issues,
                },
                { status: 400 }
            );
        }

        const data = validationResult.data;
        const result = await processPositions(data);

        await recordMt5WorkerPositionsResult(data.terminalId, request, result);

        return NextResponse.json(result, {
            status: getWebhookStatusCode(result.code),
        });
    } catch (error) {
        console.error('[MT5Worker/Positions] Error:', error);
        return NextResponse.json(
            { success: false, code: 'INTERNAL_ERROR', error: 'Internal server error' },
            { status: 500 }
        );
    }
}
