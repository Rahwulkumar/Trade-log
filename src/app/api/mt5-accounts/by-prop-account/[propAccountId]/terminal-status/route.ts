import { requireAuth } from '@/lib/auth/server';
import { refreshMetaApiTerminalStatus } from '@/lib/metaapi/service';
import { getTerminalByAccountId } from '@/lib/terminal-farm/service';
import {
  readTerminalOpenPositions,
  readTerminalSyncDiagnostics,
} from '@/lib/terminal-farm/metadata';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
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

    // Find MT5 account linked to this prop account (always return stored details so UI can show "using your MT5 account")
    const [mt5Account] = await db
      .select({
        id: mt5Accounts.id,
        server: mt5Accounts.server,
        login: mt5Accounts.login,
        accountName: mt5Accounts.accountName,
        balance: mt5Accounts.balance,
        equity: mt5Accounts.equity,
      })
      .from(mt5Accounts)
      .where(eq(mt5Accounts.propAccountId, propAccountId))
      .limit(1);

    if (!mt5Account) {
      return NextResponse.json({
        connected: false,
        diagnostics: null,
        livePositions: [],
      });
    }

    await refreshMetaApiTerminalStatus(mt5Account.id, userId, {
      createIfMissing: false,
    });

    const terminal = await getTerminalByAccountId(mt5Account.id);

    // Always return stored MT5 account details so the UI can show we're using what they gave
    const mt5AccountInfo = {
      mt5AccountId: mt5Account.id,
      server: mt5Account.server ?? '',
      login: mt5Account.login ?? '',
      accountName: mt5Account.accountName ?? null,
      balance: mt5Account.balance != null ? Number(mt5Account.balance) : null,
      equity: mt5Account.equity != null ? Number(mt5Account.equity) : null,
    };

    if (!terminal) {
      return NextResponse.json({
        connected: false,
        mt5AccountId: mt5Account.id,
        mt5Account: mt5AccountInfo,
        diagnostics: null,
        livePositions: [],
      });
    }

    const diagnostics = readTerminalSyncDiagnostics(terminal.metadata);
    const livePositions = readTerminalOpenPositions(terminal.metadata);
    const hasRecentHeartbeat = (() => {
      if (!terminal.lastHeartbeat) return false;
      const lastBeatMs = new Date(terminal.lastHeartbeat).getTime();
      if (Number.isNaN(lastBeatMs)) return false;
      return Date.now() - lastBeatMs <= 120_000; // 2 minutes
    })();

    const connected = terminal.status === 'RUNNING' && hasRecentHeartbeat;

    return NextResponse.json({
      connected,
      mt5AccountId: mt5Account.id,
      mt5Account: mt5AccountInfo,
      terminal: {
        terminalId: terminal.id,
        status: terminal.status,
        lastHeartbeat: terminal.lastHeartbeat,
        lastSyncAt: terminal.lastSyncAt,
        errorMessage: terminal.errorMessage,
      },
      diagnostics,
      livePositions,
    });
  } catch (error) {
    console.error('[TerminalStatus/PropAccount] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
