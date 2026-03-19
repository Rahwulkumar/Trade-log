import { readJsonIfAvailable } from '@/lib/api/client/http';

export interface PropFirmChallengeDetails {
  id: string;
  firm_id: string;
  name: string;
  phase_name: string;
  phase_order: number;
  initial_balance: number;
  daily_loss_percent: number | null;
  max_loss_percent: number | null;
  daily_loss_amount: number | null;
  max_loss_amount: number | null;
  profit_target_percent: number | null;
  min_trading_days: number | null;
  max_trading_days: number | null;
  drawdown_type: string;
  trailing_threshold_amount: number | null;
  is_active: boolean;
  created_at: string;
  firm?: { name: string };
}

export async function getPropFirmChallenge(
  challengeId: string,
): Promise<PropFirmChallengeDetails | null> {
  try {
    const res = await fetch(`/api/prop-firm-challenges/${challengeId}`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    return (await readJsonIfAvailable<PropFirmChallengeDetails>(res)) ?? null;
  } catch {
    return null;
  }
}
