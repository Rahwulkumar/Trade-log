import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getChallengeById } from '@/lib/api/prop-firms-server';
import { db } from '@/lib/db';
import { propFirms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;
  const { challengeId } = await params;
  if (!challengeId) {
    return NextResponse.json({ error: 'challengeId required' }, { status: 400 });
  }
  try {
    const r = await getChallengeById(challengeId);
    if (!r) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }
    const [firmRow] = await db.select({ name: propFirms.name }).from(propFirms).where(eq(propFirms.id, r.firmId)).limit(1);
    return NextResponse.json({
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
      trailing_threshold_amount: r.trailingThresholdAmount != null ? Number(r.trailingThresholdAmount) : null,
      is_active: r.isActive ?? true,
      created_at: r.createdAt,
      firm: firmRow ? { name: firmRow.name } : undefined,
    });
  } catch (e) {
    console.error('[GET /api/prop-firm-challenges/:challengeId]', e);
    return NextResponse.json({ error: 'Failed to fetch challenge' }, { status: 500 });
  }
}
