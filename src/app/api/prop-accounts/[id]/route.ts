import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import {
  deletePropAccount,
  getPropAccount,
  updatePropAccount,
} from '@/lib/api/prop-accounts';
import { resetMt5SyncByPropAccount } from '@/lib/terminal-farm/service';
import { parsePropAccountUpdatePayload } from '@/lib/validation/prop-accounts';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const account = await getPropAccount(id, userId);
  if (!account) {
    return NextResponse.json({ error: 'Prop account not found' }, { status: 404 });
  }
  return NextResponse.json(account);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = parsePropAccountUpdatePayload(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Invalid prop account update payload',
        details: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (Object.keys(result.data).length === 0) {
    return NextResponse.json(
      { error: 'At least one field must be provided' },
      { status: 400 },
    );
  }

  try {
    const account = await updatePropAccount(id, userId, result.data);
    return NextResponse.json(account);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update prop account';
    const status = message.toLowerCase().includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    await resetMt5SyncByPropAccount(id, userId, 'delete_account');
    await deletePropAccount(id, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete prop account';
    const lower = message.toLowerCase();
    const status = lower.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
