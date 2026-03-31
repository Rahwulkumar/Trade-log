import { readJsonIfAvailable } from '@/lib/api/client/http';
import type { DailyPlanUpsert } from '@/lib/validation/daily-plan';

export interface DailyPlanResponse {
  id: string;
  userId: string;
  date: string;
  bias: string | null;
  playbookId: string | null;
  maxTrades: number | null;
  dailyLimit: number | null;
  universalRulesChecked: string[];
  strategyRulesChecked: string[];
  preNote: string | null;
  dayGrade: string | null;
  wentWell: string | null;
  wentWrong: string | null;
  playbookRules: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DailyPlanRangeResponse extends DailyPlanResponse {
  playbookName: string | null;
}

export async function getDailyPlan(date: string): Promise<DailyPlanResponse | null> {
  try {
    const response = await fetch(`/api/daily-plans?date=${encodeURIComponent(date)}`, {
      cache: 'no-store',
      credentials: 'include',
    });
    if (!response.ok) return null;
    return (await readJsonIfAvailable<DailyPlanResponse>(response)) ?? null;
  } catch {
    return null;
  }
}

export async function getDailyPlansRange(
  from: string,
  to: string,
): Promise<DailyPlanRangeResponse[]> {
  const response = await fetch(
    `/api/daily-plans?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );
  if (!response.ok) {
    const payload = await readJsonIfAvailable<{ error?: string }>(response);
    throw new Error(payload?.error ?? 'Failed to load daily plans');
  }
  return (await readJsonIfAvailable<DailyPlanRangeResponse[]>(response)) ?? [];
}

export async function upsertDailyPlan(data: DailyPlanUpsert): Promise<DailyPlanResponse> {
  const response = await fetch('/api/daily-plans', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const payload = await readJsonIfAvailable<{ error?: string }>(response);
    throw new Error(payload?.error ?? 'Failed to save daily plan');
  }

  const plan = await readJsonIfAvailable<DailyPlanResponse>(response);
  if (!plan) throw new Error('Failed to save daily plan');
  return plan;
}
