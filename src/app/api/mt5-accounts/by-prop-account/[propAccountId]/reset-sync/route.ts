import { requireAuth } from '@/lib/auth/server';
import { apiError, apiSuccess, apiValidationError } from '@/lib/api/http';
import { resetMt5SyncByPropAccount } from '@/lib/terminal-farm/service';
import { NextRequest } from 'next/server';
import { parseMt5ResetSyncPayload } from '@/lib/validation/mt5-reset-sync';
import { checkRateLimit, createRateLimitResponse, getRateLimitClientId } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ propAccountId: string }> }
) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const rateLimit = checkRateLimit(
      `api:mt5-reset:${getRateLimitClientId(request, userId)}`,
      12,
      60_000
    );
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.retryAfterMs, 'MT5 reset limit exceeded');
    }

    const { propAccountId } = await params;
    const body = await request.json().catch(() => null);
    const result = parseMt5ResetSyncPayload(body);
    if (!result.success) {
      return apiValidationError('Invalid MT5 reset payload', result.error.flatten());
    }

    const cleared = await resetMt5SyncByPropAccount(
      propAccountId,
      userId,
      result.data.reason ?? 'manual_reset'
    );

    return apiSuccess({ cleared });
  } catch (error) {
    console.error('[ResetMt5Sync] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.toLowerCase().includes('not found') ? 404 : 500;
    return apiError(status, message);
  }
}
