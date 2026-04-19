import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import {
  deleteStrategy,
  getStrategy,
  updateStrategy,
} from '@/lib/api/strategies';
import { parseStrategyUpdatePayload } from '@/lib/validation/strategies';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const strategy = await getStrategy(id, userId);

    if (!strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    return NextResponse.json(strategy);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load strategy';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = parseStrategyUpdatePayload(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Invalid strategy update payload',
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
    const strategy = await updateStrategy(id, userId, result.data);
    return NextResponse.json(strategy);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update strategy';
    const status = message.toLowerCase().includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    await deleteStrategy(id, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete strategy';
    const status = message.toLowerCase().includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
