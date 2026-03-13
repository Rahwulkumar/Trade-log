import { requireAuth } from '@/lib/auth/server';
import { buildMt5EaSetupDescriptor } from '@/lib/mt5/ea-setup';
import { enableMt5AutoSync } from '@/lib/mt5-sync/service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

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
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const terminal = await enableMt5AutoSync(accountId, userId);

    return NextResponse.json({
      success: true,
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
