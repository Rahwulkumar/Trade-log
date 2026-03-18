import { requireAuth } from '@/lib/auth/server';
import { NextRequest, NextResponse } from 'next/server';
import { createPropAccount, getActivePropAccounts, getPropAccounts } from '@/lib/api/prop-accounts';
import { db } from '@/lib/db';
import { propAccounts } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { parsePropAccountCreatePayload } from '@/lib/validation/prop-accounts';

export async function GET(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';

  const accounts = activeOnly
    ? await getActivePropAccounts(userId)
    : await getPropAccounts(userId);

  return NextResponse.json(accounts);
}

export async function POST(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const result = parsePropAccountCreatePayload(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Invalid prop account payload',
        details: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { accountName } = result.data;

  const [existing] = await db
    .select({ id: propAccounts.id })
    .from(propAccounts)
    .where(
      and(
        eq(propAccounts.userId, userId),
        sql`LOWER(${propAccounts.accountName}) = LOWER(${accountName})`
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: `An account named "${accountName}" already exists.` },
      { status: 409 },
    );
  }

  try {
    const account = await createPropAccount(userId, result.data);
    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create prop account';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
