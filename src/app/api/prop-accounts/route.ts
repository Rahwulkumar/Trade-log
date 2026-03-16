import { requireAuth } from '@/lib/auth/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPropAccounts, getActivePropAccounts, createPropAccount } from '@/lib/api/prop-accounts';
import { db } from '@/lib/db';
import { propAccounts } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';

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

  const body = await request.json();

  // Validate required fields
  const firmName = (body.firmName ?? body.accountName ?? '').trim();
  const accountName = (body.accountName ?? '').trim();
  const accountSize = Number(body.accountSize);

  if (!firmName && !accountName) {
    return NextResponse.json({ error: 'Firm name is required.' }, { status: 400 });
  }
  if (!accountSize || accountSize <= 0) {
    return NextResponse.json({ error: 'A valid starting balance is required.' }, { status: 400 });
  }

  // Case-insensitive duplicate check — prevents "FTMO - 2-phase" vs "ftmo - 2-phase"
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
      { status: 409 }
    );
  }

  const account = await createPropAccount(userId, body);
  return NextResponse.json(account, { status: 201 });
}
