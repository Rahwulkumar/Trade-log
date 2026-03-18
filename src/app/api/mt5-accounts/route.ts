import { requireAuth } from '@/lib/auth/server';
import { apiError, apiSuccess, apiValidationError } from '@/lib/api/http';
import { encrypt } from '@/lib/mt5/encryption';
import { db } from '@/lib/db';
import { mt5Accounts, propAccounts, trades } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { parseMt5AccountCreatePayload } from '@/lib/validation/mt5-accounts';
import { checkRateLimit, createRateLimitResponse, getRateLimitClientId } from '@/lib/rate-limit';

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
    return apiError(500, 'Failed to fetch MT5 accounts');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const rateLimit = checkRateLimit(
      `api:mt5-create:${getRateLimitClientId(request, userId)}`,
      10,
      5 * 60_000
    );
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.retryAfterMs, 'MT5 setup limit exceeded');
    }

    const body = await request.json().catch(() => null);
    const result = parseMt5AccountCreatePayload(body);
    if (!result.success) {
      return apiValidationError('Invalid MT5 account payload', result.error.flatten());
    }

    const { propAccountId, server, login, password, currentBalance } = result.data;

    // Verify the prop account exists and belongs to this user, and get account size
    const [propAccount] = await db
      .select({ id: propAccounts.id, userId: propAccounts.userId, accountSize: propAccounts.accountSize })
      .from(propAccounts)
      .where(and(eq(propAccounts.id, propAccountId), eq(propAccounts.userId, userId)))
      .limit(1);

    if (!propAccount) {
      return apiError(404, 'Prop account not found');
    }

    const propSize = Number(propAccount.accountSize ?? 0);
    if (currentBalance != null && typeof currentBalance === 'number' && propSize > 0) {
      const diff = Math.abs(currentBalance - propSize);
      const tolerance = Math.max(propSize * 0.15, 500); // 15% or $500
      if (diff > tolerance) {
        return NextResponse.json(
          {
            success: false,
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

    // Reuse an existing MT5 login/server for this user instead of creating duplicates.
    // This preserves the current terminal row and any imported trade history when the
    // user reconnects the same MT5 account to a different prop account record.
    const [existingLoginAccount] = await db
      .select({
        id: mt5Accounts.id,
        propAccountId: mt5Accounts.propAccountId,
      })
      .from(mt5Accounts)
      .where(
        and(
          eq(mt5Accounts.userId, userId),
          eq(mt5Accounts.server, server),
          eq(mt5Accounts.login, login)
        )
      )
      .limit(1);

    if (existingLoginAccount) {
      const updatePayload: Record<string, string | Date> = {
        propAccountId,
        accountName: `${server} - ${login}`,
        password: encryptedPassword,
        updatedAt: new Date(),
      };

      if (balanceToSet !== null) {
        updatePayload.balance = balanceToSet;
        updatePayload.equity = balanceToSet;
      }

      if (balanceToSet !== null) {
        const propUpdates: Record<string, string | Date> = {
          currentBalance: balanceToSet,
          lastSyncedAt: new Date(),
        };
        if (Number(propAccount.accountSize) === 0) {
          propUpdates.accountSize = balanceToSet;
        }
        await db.batch([
          db
            .update(mt5Accounts)
            .set(updatePayload)
            .where(eq(mt5Accounts.id, existingLoginAccount.id)),
          db
            .update(trades)
            .set({ propAccountId })
            .where(eq(trades.mt5AccountId, existingLoginAccount.id)),
          db
            .update(propAccounts)
            .set(propUpdates)
            .where(and(eq(propAccounts.id, propAccountId), eq(propAccounts.userId, userId))),
        ]);
      } else {
        await db.batch([
          db
            .update(mt5Accounts)
            .set(updatePayload)
            .where(eq(mt5Accounts.id, existingLoginAccount.id)),
          db
            .update(trades)
            .set({ propAccountId })
            .where(eq(trades.mt5AccountId, existingLoginAccount.id)),
        ]);
      }

      return apiSuccess({
        accountId: existingLoginAccount.id,
        reusedExistingAccount: true,
      });
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
    if (balanceToSet !== null) {
      const propUpdates: Record<string, string | Date> = {
        currentBalance: balanceToSet,
        lastSyncedAt: new Date(),
      };
      if (Number(propAccount.accountSize) === 0) {
        propUpdates.accountSize = balanceToSet;
      }
      const [insertedAccounts] = await db.batch([
        db
          .insert(mt5Accounts)
          .values(insertPayload)
          .returning({ id: mt5Accounts.id }),
        db
          .update(propAccounts)
          .set(propUpdates)
          .where(and(eq(propAccounts.id, propAccountId), eq(propAccounts.userId, userId))),
      ]);
      const [newAccount] = insertedAccounts as Array<{ id: string }>;
      return apiSuccess({ accountId: newAccount.id });
    }

    const [insertedAccounts] = await db.batch([
      db
        .insert(mt5Accounts)
        .values(insertPayload)
        .returning({ id: mt5Accounts.id }),
    ]);
    const [newAccount] = insertedAccounts as Array<{ id: string }>;

    return apiSuccess({ accountId: newAccount.id });
  } catch (error) {
    console.error('[MT5 Account] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return apiError(500, message);
  }
}
