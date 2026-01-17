import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SYNC_LIMIT = parseInt(process.env.MT5_MONTHLY_SYNC_LIMIT || '60');

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const propAccountId = req.nextUrl.searchParams.get('propAccountId');
        console.log('🔍 [STATUS API] Received propAccountId:', propAccountId);
        console.log('🔍 [STATUS API] User ID:', user?.id);

        if (!propAccountId) {
            return NextResponse.json({ error: 'propAccountId query param required' }, { status: 400 });
        }

        // Fetch connection details
        const { data: connection, error: connError } = await supabase
            .from('mt5_connections')
            .select('id, server, login, connection_status, last_synced_at, syncs_this_month, syncs_reset_at, error_message, user_id, prop_account_id')
            .eq('prop_account_id', propAccountId)
            .single();

        console.log('🔍 [STATUS API] Query result:', {
            hasConnection: !!connection,
            hasError: !!connError,
            errorDetails: connError,
            connectionId: connection?.id,
            connectionUserId: connection?.user_id,
            connectionPropAccountId: connection?.prop_account_id,
            connectionStatus: connection?.connection_status
        });

        if (connError || !connection) {
            console.log('❌ [STATUS API] Returning connected: false');
            return NextResponse.json({
                connected: false,
                connection: null
            });
        }

        console.log('✅ [STATUS API] Returning connected: true');

        // Check if we need to reset the monthly counter (for display purposes)
        let syncsThisMonth = connection.syncs_this_month;
        const resetAt = new Date(connection.syncs_reset_at);
        const now = new Date();
        if (resetAt.getMonth() !== now.getMonth() || resetAt.getFullYear() !== now.getFullYear()) {
            syncsThisMonth = 0; // Will be reset on next sync
        }

        return NextResponse.json({
            connected: true,
            connection: {
                id: connection.id,
                server: connection.server,
                login: connection.login,
                status: connection.connection_status,
                lastSyncedAt: connection.last_synced_at,
                syncsThisMonth: syncsThisMonth,
                syncsRemaining: Math.max(0, SYNC_LIMIT - syncsThisMonth),
                syncLimit: SYNC_LIMIT,
                errorMessage: connection.error_message,
            }
        });

    } catch (err) {
        console.error('Status error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
