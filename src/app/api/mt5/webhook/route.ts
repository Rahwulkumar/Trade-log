
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
// We need SERVICE_ROLE_KEY to search across all prop_accounts by webhook_key without RLS restrictions initially,
// or we can just use standard client if we trust the key implicitly.
// However, typically webhooks run server-side with elevated privileges to find the right user context.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
    try {
        // 1. Validate Secret Key
        const webhookKey = req.headers.get('x-webhook-key');
        if (!webhookKey) {
            return NextResponse.json({ error: 'Missing x-webhook-key header' }, { status: 401 });
        }

        // 2. Find the Prop Account
        const { data: propAccount, error: accountError } = await supabase
            .from('prop_accounts')
            .select('id, user_id')
            .eq('webhook_key', webhookKey)
            .single();

        if (accountError || !propAccount) {
            return NextResponse.json({ error: 'Invalid webhook key' }, { status: 403 });
        }

        // 3. Parse Payload
        // Expected Format from MQL5:
        // { "ticket": 123, "symbol": "EURUSD", "type": "buy", "lots": 1.0, ... }
        const body = await req.json();

        // Basic validation
        if (!body.ticket || !body.symbol) {
            return NextResponse.json({ error: 'Invalid payload: missing ticket or symbol' }, { status: 400 });
        }

        // 4. Transform to Database Schema
        // MQL5 types: "buy" (0) or "sell" (1) usually. 
        // We expect the EA to send string 'buy'/'sell' or we map accordingly.
        // Let's assume the EA sends lowercase strings.
        const direction = body.type.toString().toLowerCase().includes('buy') ? 'LONG' : 'SHORT';

        const tradeData = {
            user_id: propAccount.user_id,
            prop_account_id: propAccount.id,
            external_ticket: body.ticket.toString(),
            symbol: body.symbol,
            direction: direction,
            entry_date: body.open_time, // ISO string expected
            exit_date: body.close_time,   // ISO string expected
            entry_price: parseFloat(body.open_price),
            exit_price: parseFloat(body.close_price),
            position_size: parseFloat(body.lots),
            pnl: parseFloat(body.profit),
            commission: parseFloat(body.commission || 0),
            swap: parseFloat(body.swap || 0),
            magic_number: parseInt(body.magic || 0),
            status: 'closed', // We only receive closed trades mostly
            // Default / calculated fields
            r_multiple: 0, // Simplified for now, can be sophisticated later
        };

        // 5. Upsert Data
        const { error: upsertError } = await supabase
            .from('trades')
            .upsert(
                tradeData,
                { onConflict: 'external_ticket,prop_account_id' }
            );

        if (upsertError) {
            console.error('Upsert Error:', upsertError);
            return NextResponse.json({ error: 'Failed to save trade', details: upsertError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, ticket: body.ticket });

    } catch (err) {
        console.error('Webhook Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
