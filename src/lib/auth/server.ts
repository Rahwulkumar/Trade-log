/**
 * Clerk Server Auth Helper
 * Drop-in replacement for the old Supabase server client auth pattern.
 *
 * Before (Supabase):
 *   const supabase = await createClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 *   if (!user) return 401
 *
 * After (Clerk):
 *   const userId = await getAuthenticatedUserId()
 *   if (!userId) return 401
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Get the authenticated user ID from the current Clerk session.
 * Returns null if not authenticated.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Get userId or return a 401 NextResponse.
 * Use this in API routes to guard access in one line.
 */
export async function requireAuth(): Promise<
  { userId: string; error: null } | { userId: null; error: NextResponse }
> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      userId: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { userId, error: null };
}
