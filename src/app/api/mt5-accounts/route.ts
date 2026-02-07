import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/lib/mt5/encryption';
import { NextRequest } from 'next/server';

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const { propAccountId, server, login, password } = await request.json();

        // Verify the prop account exists and get its user_id
        const { data: propAccount, error: propError } = await supabase
            .from('prop_accounts')
            .select('user_id')
            .eq('id', propAccountId)
            .single();

        if (propError || !propAccount) {
            return Response.json({ error: 'Prop account not found' }, { status: 404 });
        }

        // Encrypt password before storing
        const encryptedPassword = encrypt(password);

        // Check if MT5 account already exists for this prop account
        const { data: existingAccount } = await supabase
            .from('mt5_accounts')
            .select('id')
            .eq('prop_account_id', propAccountId)
            .single();

        if (existingAccount) {
            // Update existing account
            const { data: mt5Account, error } = await supabase
                .from('mt5_accounts')
                .update({
                    account_name: `${server} - ${login}`,
                    server,
                    login,
                    password: encryptedPassword,
                })
                .eq('id', existingAccount.id)
                .select()
                .single();

            if (error) {
                console.error('[MT5 Account] Update error:', error);
                return Response.json({ error: error.message }, { status: 500 });
            }

            return Response.json({ 
                success: true, 
                accountId: mt5Account.id 
            });
        }

        // Create new MT5 account record
        const { data: mt5Account, error } = await supabase
            .from('mt5_accounts')
            .insert({
                user_id: propAccount.user_id,
                prop_account_id: propAccountId,
                account_name: `${server} - ${login}`,
                server,
                login,
                password: encryptedPassword,
            })
            .select()
            .single();

        if (error) {
            console.error('[MT5 Account] Create error:', error);
            return Response.json({ error: error.message }, { status: 500 });
        }

        return Response.json({ 
            success: true, 
            accountId: mt5Account.id 
        });

    } catch (error: unknown) {
        console.error('[MT5 Account] Error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return Response.json({ error: message }, { status: 500 });
    }
}
