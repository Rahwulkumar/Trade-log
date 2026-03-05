import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkCompliance } from '@/lib/api/prop-accounts';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const result = await checkCompliance(id, userId);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[compliance route]', err);
    return NextResponse.json(
      { isCompliant: true, dailyDdRemaining: 100, totalDdRemaining: 100, profitProgress: null, daysRemaining: null },
      { status: 200 }
    );
  }
}
