import { requireAuth } from '@/lib/auth/server';
import { resetMt5SyncByPropAccount } from '@/lib/terminal-farm/service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ propAccountId: string }> }
) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { propAccountId } = await params;
    const body = await request.json().catch(() => ({}));
    const reason =
      body?.reason === 'reconnect' ||
      body?.reason === 'delete_account' ||
      body?.reason === 'manual_reset'
        ? body.reason
        : 'manual_reset';

    const cleared = await resetMt5SyncByPropAccount(propAccountId, userId, reason);

    return NextResponse.json({
      success: true,
      cleared,
    });
  } catch (error) {
    console.error('[ResetMt5Sync] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.toLowerCase().includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
