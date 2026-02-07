/**
 * Get Terminal Status for Prop Account
 * GET /api/mt5-accounts/by-prop-account/[propAccountId]/terminal-status
 * 
 * Finds the MT5 account linked to the prop account and returns terminal status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTerminalByAccountId } from '@/lib/terminal-farm/service';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ propAccountId: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { propAccountId } = await params;

        // Verify prop account ownership
        const { data: propAccount } = await supabase
            .from('prop_accounts')
            .select('id, user_id')
            .eq('id', propAccountId)
            .eq('user_id', user.id)
            .single();

        if (!propAccount) {
            return NextResponse.json({ error: 'Prop account not found' }, { status: 404 });
        }

        // Find MT5 account linked to this prop account
        const { data: mt5Account } = await supabase
            .from('mt5_accounts')
            .select('id')
            .eq('prop_account_id', propAccountId)
            .single();

        if (!mt5Account) {
            return NextResponse.json({ connected: false });
        }

        // Get terminal status for the MT5 account
        const terminal = await getTerminalByAccountId(mt5Account.id);

        if (!terminal) {
            return NextResponse.json({ connected: false });
        }

        return NextResponse.json({
            connected: true,
            mt5AccountId: mt5Account.id,
            terminal: {
                terminalId: terminal.id,
                status: terminal.status,
                lastHeartbeat: terminal.last_heartbeat,
                lastSyncAt: terminal.last_sync_at,
                errorMessage: terminal.error_message,
            },
        });
    } catch (error) {
        console.error('[TerminalStatus/PropAccount] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
