import { requireAuth } from '@/lib/auth/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTrades, createTrade } from '@/lib/api/trades';
import type { TradeFilters } from '@/lib/api/trades';

export async function GET(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);

  const filters: TradeFilters = {
    status: (searchParams.get('status') as TradeFilters['status']) ?? undefined,
    direction: (searchParams.get('direction') as TradeFilters['direction']) ?? undefined,
    playbookId: searchParams.get('playbookId') ?? undefined,
    propAccountId: searchParams.get('propAccountId') ?? undefined,
    startDate: searchParams.get('startDate') ?? undefined,
    endDate: searchParams.get('endDate') ?? undefined,
    search: searchParams.get('search') ?? undefined,
  };

  const trades = await getTrades(userId, filters);
  return NextResponse.json(trades);
}

export async function POST(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const trade = await createTrade(userId, body);
  return NextResponse.json(trade, { status: 201 });
}
