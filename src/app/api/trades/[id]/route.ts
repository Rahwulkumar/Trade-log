import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { deleteTrade, getTrade, updateTrade } from '@/lib/api/trades';
import type { TradeUpdate } from '@/lib/api/trades';
import { parseTradeUpdatePayload } from '@/lib/validation/trades';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const trade = await getTrade(id, userId);

  if (!trade) {
    return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
  }

  return NextResponse.json(trade);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = parseTradeUpdatePayload(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Invalid trade update payload',
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
    const updates = { ...result.data } as TradeUpdate;
    if (Object.prototype.hasOwnProperty.call(result.data, 'tradeRuleResults')) {
      updates.tradeRuleResults = (result.data.tradeRuleResults ?? []) as Record<
        string,
        unknown
      >[];
    }

    const trade = await updateTrade(id, userId, updates);
    return NextResponse.json(trade);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update trade';
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
    await deleteTrade(id, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete trade';
    const status = message.toLowerCase().includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
