import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/mt5/encryption';
import { validateMT5Credentials, sanitizeInput } from '@/lib/mt5/validation';
import { logAudit } from '@/lib/mt5/audit';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const body = await req.json();
        const { propAccountId, server, login, password } = body;

        // Validate required fields
        if (!propAccountId || !server || !login || !password) {
            return NextResponse.json({
                error: 'Missing required fields: propAccountId, server, login, password'
            }, { status: 400 });
        }

        // Input validation
        const validation = validateMT5Credentials({ server, login, password });
        if (!validation.valid) {
            return NextResponse.json({
                error: 'Validation failed',
                details: validation.errors
            }, { status: 400 });
        }

        // Verify prop account belongs to user
        const { data: propAccount, error: propError } = await supabase
            .from('prop_accounts')
            .select('id, user_id')
            .eq('id', propAccountId)
            .single();

        if (propError || !propAccount) {
            return NextResponse.json({ error: 'Prop account not found' }, { status: 404 });
        }

        if (propAccount.user_id !== user.id) {
            return NextResponse.json({ error: 'Not authorized for this account' }, { status: 403 });
        }

        // Check if connection already exists
        const { data: existing } = await supabase
            .from('mt5_connections')
            .select('id')
            .eq('prop_account_id', propAccountId)
            .single();

        if (existing) {
            return NextResponse.json({
                error: 'Connection already exists for this account',
                connectionId: existing.id
            }, { status: 409 });
        }

        // Encrypt password
        const passwordEncrypted = encrypt(password);

        // Sanitize inputs
        const sanitizedServer = sanitizeInput(server);
        const sanitizedLogin = sanitizeInput(login);

        // Create connection record
        const { data: connection, error: insertError } = await (supabase as any)
            .from('mt5_connections')
            .insert({
                user_id: user.id,
                prop_account_id: propAccountId,
                server: sanitizedServer,
                login: sanitizedLogin,
                password_encrypted: passwordEncrypted,
                connection_status: 'undeployed',
                platform: 'mt5', // Default to MT5
                syncs_this_month: 0,
                syncs_reset_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertError) {
            console.error('[MT5 Connect] Insert error:', insertError);
            return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 });
        }

        // Audit logging
        await logAudit({
            userId: user.id,
            action: 'mt5_connect',
            resourceId: connection.id,
            metadata: { server: sanitizedServer, login: sanitizedLogin },
            req,
        });

        return NextResponse.json({
            success: true,
            connectionId: connection.id,
            message: 'MT5 connection created successfully'
        });

    } catch (err) {
        console.error('[MT5 Connect] Error:', {
            error: err instanceof Error ? err.message : 'Unknown',
            stack: err instanceof Error ? err.stack : undefined,
        });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET - Check if connection exists for a prop account
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const propAccountId = req.nextUrl.searchParams.get('propAccountId');
        if (!propAccountId) {
            return NextResponse.json({ error: 'propAccountId query param required' }, { status: 400 });
        }

        const { data: connection } = await supabase
            .from('mt5_connections')
            .select('id, server, login, connection_status, last_synced_at, syncs_this_month, error_message')
            .eq('prop_account_id', propAccountId)
            .single();

        return NextResponse.json({
            connected: !!connection,
            connection: connection || null
        });

    } catch (err) {
        console.error('Get connection error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Remove MT5 connection
export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const connectionId = req.nextUrl.searchParams.get('connectionId');
        if (!connectionId) {
            return NextResponse.json({ error: 'connectionId query param required' }, { status: 400 });
        }

        const { error: deleteError } = await (supabase as any)
            .from('mt5_connections')
            .delete()
            .eq('id', connectionId)
            .eq('user_id', user.id); // Ensure user owns this connection

        if (deleteError) {
            return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 });
        }

        // Audit logging
        await logAudit({
            userId: user.id,
            action: 'mt5_disconnect',
            resourceId: connectionId,
            req,
        });

        return NextResponse.json({ success: true, message: 'Connection deleted' });

    } catch (err) {
        console.error('Delete connection error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
