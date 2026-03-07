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

import { verifyToken } from '@clerk/backend';
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

const UNAUTHORIZED_RESPONSE = NextResponse.json(
  { error: 'Unauthorized. Please sign in or provide a valid Bearer token.' },
  { status: 401 }
);

/**
 * Auth for cross-origin clients (e.g. browser extension).
 * Accepts either:
 * - Same-origin: Clerk session cookie (via auth()).
 * - Cross-origin: Authorization: Bearer <session_token> (getToken() from the app).
 */
export async function requireAuthOrBearer(request: Request): Promise<
  { userId: string; error: null } | { userId: null; error: NextResponse }
> {
  const userId = await getAuthenticatedUserId();
  if (userId) return { userId, error: null };

  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!bearerToken) return { userId: null, error: UNAUTHORIZED_RESPONSE };

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error('[requireAuthOrBearer] CLERK_SECRET_KEY not set');
    return { userId: null, error: UNAUTHORIZED_RESPONSE };
  }

  try {
    const payload = (await verifyToken(bearerToken, {
      secretKey,
    })) as { sub?: unknown } | null;
    const subject = typeof payload?.sub === 'string' ? payload.sub : null;
    if (!subject) {
      return { userId: null, error: UNAUTHORIZED_RESPONSE };
    }
    return { userId: subject, error: null };
  } catch {
    return { userId: null, error: UNAUTHORIZED_RESPONSE };
  }
}
