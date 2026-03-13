import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

const EA_DOWNLOADS = {
    mq5: {
        fileName: 'TradingJournalSync.mq5',
        contentType: 'text/plain; charset=utf-8',
    },
    ex5: {
        fileName: 'TradingJournalSync.ex5',
        contentType: 'application/octet-stream',
    },
} as const;

type EaDownloadFormat = keyof typeof EA_DOWNLOADS;

function readRequestedFormat(request: NextRequest): EaDownloadFormat {
    const format = request.nextUrl.searchParams.get('format')?.trim().toLowerCase();
    return format === 'ex5' ? 'ex5' : 'mq5';
}

export async function GET(request: NextRequest) {
    const { error: authError } = await requireAuth();
    if (authError) {
        return NextResponse.json(
            { error: 'Unauthorized - please sign in to download the EA.' },
            { status: 401 }
        );
    }

    try {
        const selected = EA_DOWNLOADS[readRequestedFormat(request)];
        const filePath = join(process.cwd(), 'ea', selected.fileName);
        const fileContent = await readFile(filePath);

        return new NextResponse(fileContent, {
            status: 200,
            headers: {
                'Content-Type': selected.contentType,
                'Content-Disposition': `attachment; filename="${selected.fileName}"`,
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