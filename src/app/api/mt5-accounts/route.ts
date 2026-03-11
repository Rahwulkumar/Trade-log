import { requireAuth } from '@/lib/auth/server';
import { encrypt } from '@/lib/mt5/encryption';
import { db } from '@/lib/db';
import { mt5Accounts, propAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/** GET /api/mt5-accounts — List current user's MT5 accounts (for validation vs prop account size). */
export async function GET() {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const rows = await db
      .select({
        id: mt5Accounts.id,
        propAccountId: mt5Accounts.propAccountId,
        accountName: mt5Accounts.accountName,
        server: mt5Accounts.server,
        login: mt5Accounts.login,
        balance: mt5Accounts.balance,
        equity: mt5Accounts.equity,
        propAccountSize: propAccounts.accountSize,
      })
      .from(mt5Accounts)
      .leftJoin(propAccounts, eq(mt5Accounts.propAccountId, propAccounts.id))
      .where(eq(mt5Accounts.userId, userId));

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        propAccountId: r.propAccountId,
        accountName: r.accountName,
        server: r.server,
        login: r.login,
        balance: r.balance != null ? Number(r.balance) : null,
        equity: r.equity != null ? Number(r.equity) : null,
        propAccountSize: r.propAccountSize != null ? Number(r.propAccountSize) : null,
      }))
    );
  } catch (err) {
    console.error('[MT5 Accounts GET]', err);
    return NextResponse.json({ error: 'Failed to fetch MT5 accounts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { propAccountId, server, login, password, currentBalance } = body as {
      propAccountId: string;
      server: string;
      login: string;
      password: string;
      currentBalance?: number | null;
    };

    // Verify the prop account exists and belongs to this user, and get account size
    const [propAccount] = await db
      .select({ id: propAccounts.id, userId: propAccounts.userId, accountSize: propAccounts.accountSize })
      .from(propAccounts)
      .where(and(eq(propAccounts.id, propAccountId), eq(propAccounts.userId, userId)))
      .limit(1);

    if (!propAccount) {
      return NextResponse.json({ error: 'Prop account not found' }, { status: 404 });
    }

    const propSize = Number(propAccount.accountSize ?? 0);
    if (currentBalance != null && typeof currentBalance === 'number' && propSize > 0) {
      const diff = Math.abs(currentBalance - propSize);
      const tolerance = Math.max(propSize * 0.15, 500); // 15% or $500
      if (diff > tolerance) {
        return NextResponse.json(
          {
            error: `MT5 balance ($${currentBalance.toLocaleString()}) does not match this prop account size ($${propSize.toLocaleString()}). Choose the correct prop account or verify your balance.`,
            code: 'BALANCE_MISMATCH',
          },
          { status: 400 }
        );
      }
    }

    const encryptedPassword = encrypt(password);

    // Check if MT5 account already exists for this prop account
    const [existingAccount] = await db
      .select({ id: mt5Accounts.id })
      .from(mt5Accounts)
      .where(eq(mt5Accounts.propAccountId, propAccountId))
      .limit(1);

    const balanceToSet = currentBalance != null && typeof currentBalance === 'number' && !Number.isNaN(currentBalance)
      ? String(currentBalance)
      : null;

    if (existingAccount) {
      return NextResponse.json(
        {
          success: false,
          code: 'MT5_ACCOUNT_EXISTS',
          error:
            'This prop account already has a linked MT5 account. Reset or reconnect MT5 sync before creating a new link.',
        },
        { status: 409 }
      );
    }

    // Create new MT5 account
    const insertPayload = {
      userId,
      propAccountId,
      accountName: `${server} - ${login}`,
      server,
      login,
      password: encryptedPassword,
      ...(balanceToSet !== null && { balance: balanceToSet, equity: balanceToSet }),
    };
    const [newAccount] = await db
      .insert(mt5Accounts)
      .values(insertPayload)
      .returning({ id: mt5Accounts.id });

    if (balanceToSet !== null) {
      const propUpdates: Record<string, string | Date> = {
        currentBalance: balanceToSet,
        lastSyncedAt: new Date(),
      };
      if (Number(propAccount.accountSize) === 0) {
        propUpdates.accountSize = balanceToSet;
      }
      await db
        .update(propAccounts)
        .set(propUpdates)
        .where(and(eq(propAccounts.id, propAccountId), eq(propAccounts.userId, userId)));
    }

    return NextResponse.json({ success: true, accountId: newAccount.id });
  } catch (error) {
    console.error('[MT5 Account] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
