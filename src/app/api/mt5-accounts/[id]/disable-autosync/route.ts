import { requireAuth } from '@/lib/auth/server';
import { apiError } from '@/lib/api/http';
import { disableMt5AutoSync } from '@/lib/mt5-sync/service';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, createRateLimitResponse, getRateLimitClientId } from '@/lib/rate-limit';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const rateLimit = checkRateLimit(
      `api:mt5-disable:${getRateLimitClientId(_request, userId)}`,
      12,
      60_000
    );
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.retryAfterMs, 'MT5 disable limit exceeded');
    }

    const { id: accountId } = await params;

    // Verify account ownership via Drizzle
    const { db } = await import('@/lib/db');
    const { mt5Accounts } = await import('@/lib/db/schema');
    const { eq, and } = await import('drizzle-orm');

    const [account] = await db
      .select({ id: mt5Accounts.id })
      .from(mt5Accounts)
      .where(and(eq(mt5Accounts.id, accountId), eq(mt5Accounts.userId, userId)))
      .limit(1);

    if (!account) {
      return apiError(404, 'Account not found');
    }

    await disableMt5AutoSync(accountId, userId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[DisableAutoSync] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return apiError(500, message);
  }
}
