import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getTrade } from '@/lib/api/trades';
import { getTradeChartData } from '@/lib/api/pricing';
import { parseTradeChartPayload } from '@/lib/validation/trade-chart';

function toTradeTimestamp(value: Date | string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

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

        const { tradeId, timeframe } = result.data;

        const trade = await getTrade(tradeId, userId);
        if (!trade) {
            return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
        }

        const entryTime = toTradeTimestamp(trade.entryDate);
        const exitTime = toTradeTimestamp(trade.exitDate ?? trade.entryDate);
        const symbol = trade.symbol?.trim();

        if (!symbol || !entryTime || !exitTime) {
            return NextResponse.json(
                { error: 'Trade does not have complete chart context in the database' },
                { status: 400 }
            );
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
