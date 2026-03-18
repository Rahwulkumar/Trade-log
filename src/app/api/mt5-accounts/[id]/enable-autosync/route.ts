import { requireAuth } from '@/lib/auth/server';
import { apiError, apiSuccess } from '@/lib/api/http';
import { buildMt5EaSetupDescriptor } from '@/lib/mt5/ea-setup';
import { enableMt5AutoSync } from '@/lib/mt5-sync/service';
import { NextRequest } from 'next/server';
import { checkRateLimit, createRateLimitResponse, getRateLimitClientId } from '@/lib/rate-limit';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const rateLimit = checkRateLimit(
      `api:mt5-enable:${getRateLimitClientId(_request, userId)}`,
      12,
      60_000
    );
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.retryAfterMs, 'MT5 enable limit exceeded');
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

    const terminal = await enableMt5AutoSync(accountId, userId);

    return apiSuccess({
      terminalId: terminal.id,
      terminal: {
        id: terminal.id,
        status: terminal.status,
        createdAt: terminal.createdAt,
      },
      eaSetup: buildMt5EaSetupDescriptor(_request, accountId, terminal.id),
    });
  } catch (error) {
    console.error('[EnableAutoSync] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return apiError(500, message);
  }
}
