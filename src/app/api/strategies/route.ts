import { requireAuth } from '@/lib/auth/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  createStrategy,
  getActiveStrategies,
  getStrategies,
} from '@/lib/api/strategies';
import { parseStrategyCreatePayload } from '@/lib/validation/strategies';

export async function GET(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const strategies = activeOnly
      ? await getActiveStrategies(userId)
      : await getStrategies(userId);

    return NextResponse.json(strategies);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load strategies';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const result = parseStrategyCreatePayload(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Invalid strategy payload',
        details: result.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const strategy = await createStrategy(userId, result.data);
    return NextResponse.json(strategy, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create strategy';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
