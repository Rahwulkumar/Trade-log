import { requireAuth } from '@/lib/auth/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPropAccounts, getActivePropAccounts, createPropAccount } from '@/lib/api/prop-accounts';

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
  const account = await createPropAccount(userId, body);
  return NextResponse.json(account, { status: 201 });
}
