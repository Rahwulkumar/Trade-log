import { requireAuth } from '@/lib/auth/server';
import { disableMetaApiAutoSync } from '@/lib/metaapi/service';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
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

    await disableMetaApiAutoSync(accountId, userId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[DisableAutoSync] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
