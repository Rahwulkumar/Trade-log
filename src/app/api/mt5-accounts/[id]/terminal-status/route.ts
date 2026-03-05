import { requireAuth } from '@/lib/auth/server';
import { getTerminalByAccountId } from '@/lib/terminal-farm/service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { id: accountId } = await params;

    // Verify ownership via Drizzle
    const { db } = await import('@/lib/db');
    const { mt5Accounts } = await import('@/lib/db/schema');
    const { eq, and } = await import('drizzle-orm');

    const [account] = await db
      .select({ id: mt5Accounts.id })
      .from(mt5Accounts)
      .where(and(eq(mt5Accounts.id, accountId), eq(mt5Accounts.userId, userId)))
      .limit(1);

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const terminal = await getTerminalByAccountId(accountId);

    if (!terminal) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      terminal: {
        terminalId: terminal.id,
        status: terminal.status,
        lastHeartbeat: terminal.last_heartbeat,
        lastSyncAt: terminal.last_sync_at,
        errorMessage: terminal.error_message,
      },
    });
  } catch (error) {
    console.error('[TerminalStatus] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
