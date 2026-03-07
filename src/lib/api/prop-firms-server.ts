/**
 * Prop Firms & Challenges — Drizzle (server-only).
 * Use from API routes. For client, use /api/prop-firms and /api/prop-firms/[firmId]/challenges.
 */

import { db } from '@/lib/db';
import { propFirms, propFirmChallenges } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';

const FTMO_ID = 'a0000001-0001-4000-8000-000000000001';
const APEX_ID = 'a0000002-0002-4000-8000-000000000002';
const TOPSTEP_ID = 'a0000003-0003-4000-8000-000000000003';

/** Idempotent seed: insert default prop firms and challenges (safe to run multiple times). */
export async function seedPropFirmsIfEmpty(): Promise<{ inserted: number }> {
  const firms = [
    { id: FTMO_ID, name: 'FTMO', website: 'https://ftmo.com', isActive: true },
    { id: APEX_ID, name: 'Apex Trader Funding', website: 'https://apextraderfunding.com', isActive: true },
    { id: TOPSTEP_ID, name: 'Topstep', website: 'https://topstep.com', isActive: true },
  ];
  for (const row of firms) {
    await db.insert(propFirms).values(row).onConflictDoNothing({ target: propFirms.id });
  }

  const challenges = [
    { id: 'b0000001-1001-4000-8000-000000000001', firmId: FTMO_ID, name: 'FTMO 10k', phaseName: 'Phase 1', phaseOrder: 1, initialBalance: '10000', dailyLossPercent: '5', maxLossPercent: '10', profitTargetPercent: '10', drawdownType: 'balance' as const },
    { id: 'b0000001-1002-4000-8000-000000000002', firmId: FTMO_ID, name: 'FTMO 25k', phaseName: 'Phase 1', phaseOrder: 1, initialBalance: '25000', dailyLossPercent: '5', maxLossPercent: '10', profitTargetPercent: '10', drawdownType: 'balance' as const },
    { id: 'b0000001-1003-4000-8000-000000000003', firmId: FTMO_ID, name: 'FTMO 50k', phaseName: 'Phase 1', phaseOrder: 1, initialBalance: '50000', dailyLossPercent: '5', maxLossPercent: '10', profitTargetPercent: '10', drawdownType: 'balance' as const },
    { id: 'b0000001-1004-4000-8000-000000000004', firmId: FTMO_ID, name: 'FTMO 100k', phaseName: 'Phase 1', phaseOrder: 1, initialBalance: '100000', dailyLossPercent: '5', maxLossPercent: '10', profitTargetPercent: '10', drawdownType: 'balance' as const },
    { id: 'b0000001-2001-4000-8000-000000000005', firmId: FTMO_ID, name: 'FTMO 10k', phaseName: 'Phase 2', phaseOrder: 2, initialBalance: '10000', dailyLossPercent: '5', maxLossPercent: '10', profitTargetPercent: '5', drawdownType: 'balance' as const },
    { id: 'b0000001-2002-4000-8000-000000000006', firmId: FTMO_ID, name: 'FTMO 100k', phaseName: 'Phase 2', phaseOrder: 2, initialBalance: '100000', dailyLossPercent: '5', maxLossPercent: '10', profitTargetPercent: '5', drawdownType: 'balance' as const },
    { id: 'b0000002-1001-4000-8000-000000000007', firmId: APEX_ID, name: 'Apex 25k', phaseName: 'Evaluation', phaseOrder: 1, initialBalance: '25000', dailyLossPercent: '2', maxLossPercent: '6', profitTargetPercent: '6', drawdownType: 'trailing' as const },
    { id: 'b0000002-1002-4000-8000-000000000008', firmId: APEX_ID, name: 'Apex 50k', phaseName: 'Evaluation', phaseOrder: 1, initialBalance: '50000', dailyLossPercent: '2', maxLossPercent: '6', profitTargetPercent: '6', drawdownType: 'trailing' as const },
    { id: 'b0000002-1003-4000-8000-000000000009', firmId: APEX_ID, name: 'Apex 100k', phaseName: 'Evaluation', phaseOrder: 1, initialBalance: '100000', dailyLossPercent: '2', maxLossPercent: '6', profitTargetPercent: '6', drawdownType: 'trailing' as const },
    { id: 'b0000003-1001-4000-8000-00000000000a', firmId: TOPSTEP_ID, name: 'Topstep 50k', phaseName: 'Trading Combine', phaseOrder: 1, initialBalance: '50000', dailyLossPercent: '2', maxLossPercent: '6', profitTargetPercent: '6', drawdownType: 'trailing' as const },
    { id: 'b0000003-1002-4000-8000-00000000000b', firmId: TOPSTEP_ID, name: 'Topstep 100k', phaseName: 'Trading Combine', phaseOrder: 1, initialBalance: '100000', dailyLossPercent: '2', maxLossPercent: '6', profitTargetPercent: '6', drawdownType: 'trailing' as const },
  ];

  for (const c of challenges) {
    await db.insert(propFirmChallenges).values(c).onConflictDoNothing({ target: propFirmChallenges.id });
  }
  return { inserted: firms.length + challenges.length };
}

export async function getPropFirmsActive() {
  return db
    .select()
    .from(propFirms)
    .where(eq(propFirms.isActive, true))
    .orderBy(propFirms.name);
}

export async function getChallengesByFirmId(
  firmId: string
): Promise<(typeof propFirmChallenges.$inferSelect)[]> {
  return db
    .select()
    .from(propFirmChallenges)
    .where(and(eq(propFirmChallenges.firmId, firmId), eq(propFirmChallenges.isActive, true)))
    .orderBy(asc(propFirmChallenges.initialBalance), asc(propFirmChallenges.phaseOrder));
}

export async function getChallengeById(challengeId: string) {
  const [row] = await db
    .select()
    .from(propFirmChallenges)
    .where(eq(propFirmChallenges.id, challengeId))
    .limit(1);
  return row ?? null;
}
