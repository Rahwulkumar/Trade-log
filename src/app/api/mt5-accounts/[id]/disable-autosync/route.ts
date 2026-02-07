/**
 * Disable Auto-Sync for MT5 Account
 * DELETE /api/mt5-accounts/[id]/disable-autosync
 * 
 * Marks the terminal for shutdown (orchestrator will stop the container).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { disableAutoSync } from '@/lib/terminal-farm/service';

export async function DELETE(
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

        await disableAutoSync(accountId);

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('[DisableAutoSync] Error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
