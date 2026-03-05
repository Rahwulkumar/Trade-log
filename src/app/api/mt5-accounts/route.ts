import { requireAuth } from '@/lib/auth/server';
import { encrypt } from '@/lib/mt5/encryption';
import { db } from '@/lib/db';
import { mt5Accounts, propAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { propAccountId, server, login, password } = body as {
      propAccountId: string;
      server: string;
      login: string;
      password: string;
    };

    // Verify the prop account exists and belongs to this user
    const [propAccount] = await db
      .select({ id: propAccounts.id, userId: propAccounts.userId })
      .from(propAccounts)
      .where(and(eq(propAccounts.id, propAccountId), eq(propAccounts.userId, userId)))
      .limit(1);

    if (!propAccount) {
      return NextResponse.json({ error: 'Prop account not found' }, { status: 404 });
    }

    const encryptedPassword = encrypt(password);

    // Check if MT5 account already exists for this prop account
    const [existingAccount] = await db
      .select({ id: mt5Accounts.id })
      .from(mt5Accounts)
      .where(eq(mt5Accounts.propAccountId, propAccountId))
      .limit(1);

    if (existingAccount) {
      await db
        .update(mt5Accounts)
        .set({
          accountName: `${server} - ${login}`,
          server,
          login,
          password: encryptedPassword,
        })
        .where(eq(mt5Accounts.id, existingAccount.id));

      return NextResponse.json({ success: true, accountId: existingAccount.id });
    }

    // Create new MT5 account
    const [newAccount] = await db
      .insert(mt5Accounts)
      .values({
        userId,
        propAccountId,
        accountName: `${server} - ${login}`,
        server,
        login,
        password: encryptedPassword,
      })
      .returning({ id: mt5Accounts.id });

    return NextResponse.json({ success: true, accountId: newAccount.id });
  } catch (error) {
    console.error('[MT5 Account] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
