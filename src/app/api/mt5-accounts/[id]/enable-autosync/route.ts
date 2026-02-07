/**
 * Enable Auto-Sync for MT5 Account
 * POST /api/mt5-accounts/[id]/enable-autosync
 * 
 * Provisions a terminal for the account (Docker container will be started by orchestrator).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enableAutoSync } from '@/lib/terminal-farm/service';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: accountId } = await params;

        // Verify account ownership
        const { data: account } = await supabase
            .from('mt5_accounts')
            .select('id, user_id')
            .eq('id', accountId)
            .eq('user_id', user.id)
            .single();

        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        const terminal = await enableAutoSync(accountId, user.id);

        return NextResponse.json({
            success: true,
            terminalId: terminal.id,
            terminal: {
                id: terminal.id,
                status: terminal.status,
                createdAt: terminal.created_at,
            },
        });
    } catch (error) {
        console.error('[EnableAutoSync] Error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
