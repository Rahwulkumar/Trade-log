import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getTrade } from '@/lib/api/trades';
import { getTradeChartData } from '@/lib/api/pricing';
import { parseTradeChartPayload } from '@/lib/validation/trade-chart';

export async function POST(request: NextRequest) {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    try {
        const body = await request.json().catch(() => null);
        const result = parseTradeChartPayload(body);
        if (!result.success) {
            return NextResponse.json(
                {
                    error: 'Invalid trade chart payload',
                    details: result.error.flatten(),
                },
                { status: 400 }
            );
        }

        const { tradeId, symbol, entryTime, exitTime, timeframe } = result.data;

        const trade = await getTrade(tradeId, userId);
        if (!trade) {
            return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
        }

        const chart = await getTradeChartData(
            tradeId,
            symbol,
            entryTime,
            exitTime,
            timeframe,
        );

        return NextResponse.json(chart);
    } catch (error) {
        console.error('[Chart API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch chart data', candles: [], cached: false },
            { status: 500 }
        );
    }
}
