/**
 * Strategies API
 * Dedicated strategy domain surface backed by the existing playbooks table.
 * This keeps the `/strategies` page off the playbook-named backend contract
 * without forcing an immediate schema split.
 */

import type { Playbook, PlaybookInsert } from '@/lib/db/schema';
import {
  createPlaybook,
  deletePlaybook,
  duplicatePlaybook,
  getActivePlaybooks,
  getAllPlaybooksWithStats,
  getPlaybook,
  getPlaybooks,
  togglePlaybookActive,
  updatePlaybook,
} from '@/lib/api/playbooks';

export type Strategy = Playbook;
export type StrategyInsert = PlaybookInsert;

export interface StrategyStats {
  strategy: Strategy;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgRMultiple: number;
  totalPnl: number;
}

export async function getStrategies(userId: string): Promise<Strategy[]> {
  return getPlaybooks(userId);
}

export async function getActiveStrategies(userId: string): Promise<Strategy[]> {
  return getActivePlaybooks(userId);
}

export async function getStrategy(
  id: string,
  userId: string,
): Promise<Strategy | null> {
  return getPlaybook(id, userId);
}

export async function createStrategy(
  userId: string,
  data: Omit<StrategyInsert, 'userId'>,
): Promise<Strategy> {
  return createPlaybook(userId, data);
}

export async function updateStrategy(
  id: string,
  userId: string,
  updates: Partial<Omit<StrategyInsert, 'id' | 'userId'>>,
): Promise<Strategy> {
  return updatePlaybook(id, userId, updates);
}

export async function deleteStrategy(id: string, userId: string): Promise<void> {
  return deletePlaybook(id, userId);
}

export async function duplicateStrategy(
  id: string,
  userId: string,
): Promise<Strategy> {
  return duplicatePlaybook(id, userId);
}

export async function toggleStrategyActive(
  id: string,
  userId: string,
): Promise<Strategy> {
  return togglePlaybookActive(id, userId);
}

export async function getAllStrategiesWithStats(
  userId: string,
  propAccountId?: string | null,
): Promise<StrategyStats[]> {
  const stats = await getAllPlaybooksWithStats(userId, propAccountId);

  return stats.map(({ playbook, ...rest }) => ({
    strategy: playbook,
    ...rest,
  }));
}
