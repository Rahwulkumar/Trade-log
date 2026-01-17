import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncMT5Account } from '@/lib/mt5/sync';
import { logAudit } from '@/lib/mt5/audit';

export async function POST(req: NextRequest) {
    const startTime = Date.now();
    let syncLogId: string | null = null;

    try {
        const supabase = await createClient();
        const adminSupabase = createAdminClient();

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const body = await req.json();
        const { connectionId } = body;

        if (!connectionId) {
            return NextResponse.json({ error: 'connectionId required' }, { status: 400 });
        }

        // Verify connection belongs to user
        const { data: connection, error: connError } = await (supabase as any)
            .from('mt5_connections')
            .select('id, user_id, syncs_this_month')
            .eq('id', connectionId)
            .single();

        if (connError || !connection) {
            return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
        }

        if (connection.user_id !== user.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        // Create sync log entry (status: running)
        const { data: syncLog, error: syncLogError } = await (adminSupabase as any)
            .from('sync_logs')
            .insert({
                mt5_connection_id: connectionId,
                user_id: user.id,
                status: 'running',
                started_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (!syncLogError && syncLog) {
            syncLogId = syncLog.id;
        }

        // Perform sync
        const result = await syncMT5Account(connectionId);

        // Update sync log with results
        if (syncLogId) {
            await (adminSupabase as any)
                .from('sync_logs')
                .update({
                    status: result.success ? 'success' : 'error',
                    trades_imported: result.newTrades || 0,
                    trades_skipped: result.skippedTrades || 0,
                    duration_ms: Date.now() - startTime,
                    error_message: result.error || null,
                    completed_at: new Date().toISOString(),
                })
                .eq('id', syncLogId);
        }

        // Audit logging
        await logAudit({
            userId: user.id,
            action: 'mt5_sync',
            resourceId: connectionId,
            metadata: {
                trades_imported: result.newTrades || 0,
                trades_skipped: result.skippedTrades || 0,
                success: result.success,
            },
            req,
        });

        if (result.success) {
            return NextResponse.json({
                success: true,
                newTrades: result.newTrades,
                skippedTrades: result.skippedTrades,
                message: `Synced ${result.newTrades} new trades`,
                durationMs: Date.now() - startTime
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error
            }, { status: 400 });
        }

    } catch (err) {
        console.error('[MT5 Sync] Error:', {
            error: err instanceof Error ? err.message : 'Unknown',
            stack: err instanceof Error ? err.stack : undefined,
        });

        // Update sync log if it was created
        if (syncLogId) {
            const adminSupabase = createAdminClient();
            await (adminSupabase as any)
                .from('sync_logs')
                .update({
                    status: 'error',
                    duration_ms: Date.now() - startTime,
                    error_message: err instanceof Error ? err.message : 'Unknown error',
                    completed_at: new Date().toISOString(),
                })
                .eq('id', syncLogId);
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
