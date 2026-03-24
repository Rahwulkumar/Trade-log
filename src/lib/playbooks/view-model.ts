export interface PlaybookStatsValue {
  totalTrades: number;
  winRate: number;
  avgRMultiple: number;
  totalPnl: number;
}

export interface PlaybookCardData {
  id: string;
  name: string;
  description: string | null;
  rules: string[];
  isActive: boolean;
  stats: PlaybookStatsValue;
}

export interface PlaybookPayloadShape {
  id: string;
  name: string;
  description: string | null;
  rules: unknown;
  isActive?: boolean | null;
  is_active?: boolean | null;
  stats?: Partial<PlaybookStatsValue>;
}

export const EMPTY_PLAYBOOK_STATS: PlaybookStatsValue = {
  totalTrades: 0,
  winRate: 0,
  avgRMultiple: 0,
  totalPnl: 0,
};

export function normalizePlaybookRules(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((rule): rule is string => typeof rule === "string");
}

export function normalizePlaybook(
  playbook: PlaybookPayloadShape,
): PlaybookCardData {
  return {
    id: playbook.id,
    name: playbook.name,
    description: playbook.description ?? null,
    rules: normalizePlaybookRules(playbook.rules),
    isActive: playbook.isActive ?? playbook.is_active ?? true,
    stats: {
      totalTrades: playbook.stats?.totalTrades ?? EMPTY_PLAYBOOK_STATS.totalTrades,
      winRate: playbook.stats?.winRate ?? EMPTY_PLAYBOOK_STATS.winRate,
      avgRMultiple:
        playbook.stats?.avgRMultiple ?? EMPTY_PLAYBOOK_STATS.avgRMultiple,
      totalPnl: playbook.stats?.totalPnl ?? EMPTY_PLAYBOOK_STATS.totalPnl,
    },
  };
}

export function normalizePlaybookScope(
  selectedAccountId: string | null | undefined,
) {
  if (!selectedAccountId || selectedAccountId === "all") {
    return undefined;
  }

  return selectedAccountId;
}
