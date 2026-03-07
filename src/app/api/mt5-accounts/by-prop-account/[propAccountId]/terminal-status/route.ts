import { requireAuth } from '@/lib/auth/server';
import { getTerminalByAccountId } from '@/lib/terminal-farm/service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propAccountId: string }> }
) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { propAccountId } = await params;

    const { db } = await import('@/lib/db');
    const { propAccounts, mt5Accounts } = await import('@/lib/db/schema');
    const { eq, and } = await import('drizzle-orm');

    // Verify prop account ownership
    const [propAccount] = await db
      .select({ id: propAccounts.id })
      .from(propAccounts)
      .where(and(eq(propAccounts.id, propAccountId), eq(propAccounts.userId, userId)))
      .limit(1);

    if (!propAccount) {
      return NextResponse.json({ error: 'Prop account not found' }, { status: 404 });
    }

    // Find MT5 account linked to this prop account
    const [mt5Account] = await db
      .select({ id: mt5Accounts.id })
      .from(mt5Accounts)
      .where(eq(mt5Accounts.propAccountId, propAccountId))
      .limit(1);

    if (!mt5Account) {
      return NextResponse.json({ connected: false });
    }

    const terminal = await getTerminalByAccountId(mt5Account.id);
    if (!terminal) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      mt5AccountId: mt5Account.id,
      terminal: {
        terminalId: terminal.id,
        status: terminal.status,
        lastHeartbeat: terminal.lastHeartbeat,
        lastSyncAt: terminal.lastSyncAt,
        errorMessage: terminal.errorMessage,
      },
    });
  } catch (error) {
    console.error('[TerminalStatus/PropAccount] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
