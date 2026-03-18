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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractRequestToken(request: Request, headerNames: string[]): string | null {
  for (const headerName of headerNames) {
    const rawValue = request.headers.get(headerName);
    if (!rawValue) continue;
    if (headerName.toLowerCase() === 'authorization') {
      const bearer = rawValue.replace(/^Bearer\s+/i, '').trim();
      if (bearer) return bearer;
      continue;
    }
    const normalized = rawValue.trim();
    if (normalized) return normalized;
  }
  return null;
}

function readClaimRole(sessionClaims: unknown): string | null {
  if (!isRecord(sessionClaims)) return null;

  const metadataCandidates = [
    sessionClaims.metadata,
    sessionClaims.public_metadata,
    sessionClaims.publicMetadata,
    sessionClaims.unsafe_metadata,
    sessionClaims.unsafeMetadata,
  ];

  for (const candidate of metadataCandidates) {
    if (!isRecord(candidate)) continue;
    const role = candidate.role;
    if (typeof role === 'string' && role.trim()) {
      return role.trim().toLowerCase();
    }
    if (candidate.isAdmin === true || candidate.is_admin === true) {
      return 'admin';
    }
  }

  const directRole = sessionClaims.role;
  if (typeof directRole === 'string' && directRole.trim()) {
    return directRole.trim().toLowerCase();
  }

  return null;
}

function accessDeniedResponse(userId: string | null): NextResponse {
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
}

export async function requireMachineSecret(
  request: Request,
  options: {
    secretEnvVar: string;
    headerNames?: string[];
  }
): Promise<{ error: null } | { error: NextResponse }> {
  const expectedSecret = process.env[options.secretEnvVar]?.trim();
  if (!expectedSecret) {
    return {
      error: NextResponse.json(
        { success: false, error: `${options.secretEnvVar} is not configured` },
        { status: 500 },
      ),
    };
  }

  const providedSecret = extractRequestToken(request, options.headerNames ?? ['authorization']);
  if (providedSecret !== expectedSecret) {
    return {
      error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { error: null };
}

export async function requireAdminOrSecret(
  request: Request,
  options: {
    secretEnvVar?: string;
    headerNames?: string[];
  } = {}
): Promise<
  { userId: string | null; isMachine: boolean; error: null } |
  { userId: null; isMachine: false; error: NextResponse }
> {
  const { userId, sessionClaims } = await auth();

  if (options.secretEnvVar) {
    const expectedSecret = process.env[options.secretEnvVar]?.trim();
    if (expectedSecret) {
      const providedSecret = extractRequestToken(
        request,
        options.headerNames ?? ['authorization', 'x-admin-secret'],
      );
      if (providedSecret === expectedSecret) {
        return { userId: null, isMachine: true, error: null };
      }
    }
  }

  if (userId && readClaimRole(sessionClaims) === 'admin') {
    return { userId, isMachine: false, error: null };
  }

  return {
    userId: null,
    isMachine: false,
    error: accessDeniedResponse(userId),
  };
}

