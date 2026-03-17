import { requireAuth } from '@/lib/auth/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTrades, createTrade } from '@/lib/api/trades';
import type { TradeFilters } from '@/lib/api/trades';

function parseOptionalInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

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
    exitStartDate: searchParams.get('exitStartDate') ?? undefined,
    exitEndDate: searchParams.get('exitEndDate') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    limit: parseOptionalInt(searchParams.get('limit')),
    offset: parseOptionalInt(searchParams.get('offset')),
    sortBy: (searchParams.get('sortBy') as TradeFilters['sortBy']) ?? undefined,
    sortOrder: (searchParams.get('sortOrder') as TradeFilters['sortOrder']) ?? undefined,
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
