import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Creates an admin Supabase client that bypasses Row Level Security.
 * ONLY use this for server-side operations where authenticated user context is unavailable.
 * Requires SUPABASE_SERVICE_ROLE_KEY environment variable.
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
        throw new Error(
            '[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
            'The admin client requires the service role key to bypass RLS.'
        )
    }

    return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}
