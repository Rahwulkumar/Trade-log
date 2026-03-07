/**
 * Authenticated MT5 EA Download
 * GET /api/downloads/mt5-ea
 *
 * Serves the TradingJournalSync.mq5 Expert Advisor file to authenticated users only.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
    const { error: authError } = await requireAuth();
    if (authError) {
        return NextResponse.json(
            { error: 'Unauthorized — please sign in to download the EA.' },
            { status: 401 }
        );
    }

    try {
        const filePath = join(process.cwd(), 'protected', 'downloads', 'TradingJournalSync.mq5');
        const fileContent = await readFile(filePath);

        return new NextResponse(fileContent, {
            status: 200,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': 'attachment; filename="TradingJournalSync.mq5"',
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('[Downloads/MT5-EA] Error reading file:', error);
        return NextResponse.json(
            { error: 'File not found.' },
            { status: 404 }
        );
    }
}
