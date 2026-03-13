import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { mt5Accounts } from '@/lib/db/schema';
import { buildMt5EaPreset, buildMt5EaSetupDescriptor } from '@/lib/mt5/ea-setup';
import { getTerminalByAccountId } from '@/lib/terminal-farm/service';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId, error } = await requireAuth();
        if (error) return error;

        const { id: accountId } = await params;

        const [account] = await db
            .select({ id: mt5Accounts.id })
            .from(mt5Accounts)
            .where(and(eq(mt5Accounts.id, accountId), eq(mt5Accounts.userId, userId)))
            .limit(1);

        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        const terminal = await getTerminalByAccountId(accountId);
        if (!terminal) {
            return NextResponse.json(
                { error: 'Enable auto-sync first so a terminal ID can be assigned.' },
                { status: 409 }
            );
        }

        const webhookSecret = process.env.TERMINAL_WEBHOOK_SECRET?.trim();
        if (!webhookSecret) {
            return NextResponse.json(
                { error: 'TERMINAL_WEBHOOK_SECRET is not configured on the server.' },
                { status: 500 }
            );
        }

        const setup = buildMt5EaSetupDescriptor(request, accountId, terminal.id);
        const preset = buildMt5EaPreset({
            backendUrl: setup.backendUrl,
            apiKey: webhookSecret,
            terminalId: terminal.id,
        });

        return new NextResponse(preset, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': `attachment; filename="TradingJournalSync-${terminal.id}.set"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('[MT5/EA/Preset] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
