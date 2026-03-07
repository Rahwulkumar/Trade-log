import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getTrade } from '@/lib/api/trades';
import { getTradeChartData } from '@/lib/api/pricing';

export async function POST(request: NextRequest) {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { tradeId, symbol, entryTime, exitTime } = body;

        if (!tradeId || !symbol || !entryTime || !exitTime) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const trade = await getTrade(tradeId, userId);
        if (!trade) {
            return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
        }

        const result = await getTradeChartData(tradeId, symbol, entryTime, exitTime);

        return NextResponse.json(result);
    } catch (error) {
        console.error('[Chart API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch chart data', candles: [], cached: false },
            { status: 500 }
        );
    }
}
