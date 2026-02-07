/**
 * Get Terminal Status for MT5 Account
 * GET /api/mt5-accounts/[id]/terminal-status
 * 
 * Returns the current status of the terminal for the account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTerminalByAccountId } from '@/lib/terminal-farm/service';

export async function GET(
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

        const terminal = await getTerminalByAccountId(accountId);

        if (!terminal) {
            return NextResponse.json({ connected: false });
        }

        return NextResponse.json({
            connected: true,
            terminal: {
                terminalId: terminal.id,
                status: terminal.status,
                lastHeartbeat: terminal.last_heartbeat,
                lastSyncAt: terminal.last_sync_at,
                errorMessage: terminal.error_message,
            },
        });
    } catch (error) {
        console.error('[TerminalStatus] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
