import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getChallengesByFirmId } from '@/lib/api/prop-firms-server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ firmId: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;
  const { firmId } = await params;
  if (!firmId) {
    return NextResponse.json({ error: 'firmId required' }, { status: 400 });
  }
  try {
    const rows = await getChallengesByFirmId(firmId);
    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        firm_id: r.firmId,
        name: r.name,
        phase_name: r.phaseName,
        phase_order: r.phaseOrder,
        initial_balance: Number(r.initialBalance),
        daily_loss_percent: r.dailyLossPercent != null ? Number(r.dailyLossPercent) : null,
        max_loss_percent: r.maxLossPercent != null ? Number(r.maxLossPercent) : null,
        daily_loss_amount: r.dailyLossAmount != null ? Number(r.dailyLossAmount) : null,
        max_loss_amount: r.maxLossAmount != null ? Number(r.maxLossAmount) : null,
        profit_target_percent: r.profitTargetPercent != null ? Number(r.profitTargetPercent) : null,
        min_trading_days: r.minTradingDays,
        max_trading_days: r.maxTradingDays,
        drawdown_type: r.drawdownType,
        trailing_threshold_amount:
          r.trailingThresholdAmount != null ? Number(r.trailingThresholdAmount) : null,
        is_active: r.isActive ?? true,
        created_at: r.createdAt,
      }))
    );
  } catch (e) {
    console.error('[GET /api/prop-firms/:firmId/challenges]', e);
    return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 });
  }
}
