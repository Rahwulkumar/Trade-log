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
        console.warn('[Supabase Admin] SERVICE_ROLE_KEY not found, falling back to anon key (RLS enforced)')
        return createSupabaseClient<Database>(
            supabaseUrl,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    }

    return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}
