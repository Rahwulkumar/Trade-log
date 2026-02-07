import { NextRequest, NextResponse } from 'next/server';
import { getTradeChartData } from '@/lib/api/pricing';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tradeId, symbol, entryTime, exitTime } = body;

        if (!tradeId || !symbol || !entryTime || !exitTime) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
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
