export interface StrategyStatsValue {
  totalTrades: number;
  winRate: number;
  avgRMultiple: number;
  totalPnl: number;
}

export interface StrategyCardData {
  id: string;
  name: string;
  description: string | null;
  rules: string[];
  isActive: boolean;
  stats: StrategyStatsValue;
}

export interface StrategyPayloadShape {
  id: string;
  name: string;
  description: string | null;
  rules: unknown;
  isActive?: boolean | null;
  is_active?: boolean | null;
  stats?: Partial<StrategyStatsValue>;
}

export const EMPTY_STRATEGY_STATS: StrategyStatsValue = {
  totalTrades: 0,
  winRate: 0,
  avgRMultiple: 0,
  totalPnl: 0,
};

export function normalizeStrategyRules(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((rule): rule is string => typeof rule === 'string');
}

export function normalizeStrategy(
  strategy: StrategyPayloadShape,
): StrategyCardData {
  return {
    id: strategy.id,
    name: strategy.name,
    description: strategy.description ?? null,
    rules: normalizeStrategyRules(strategy.rules),
    isActive: strategy.isActive ?? strategy.is_active ?? true,
    stats: {
      totalTrades: strategy.stats?.totalTrades ?? EMPTY_STRATEGY_STATS.totalTrades,
      winRate: strategy.stats?.winRate ?? EMPTY_STRATEGY_STATS.winRate,
      avgRMultiple:
        strategy.stats?.avgRMultiple ?? EMPTY_STRATEGY_STATS.avgRMultiple,
      totalPnl: strategy.stats?.totalPnl ?? EMPTY_STRATEGY_STATS.totalPnl,
    },
  };
}

export function normalizeStrategyScope(
  selectedAccountId: string | null | undefined,
) {
  if (!selectedAccountId || selectedAccountId === 'all') {
    return undefined;
  }

  return selectedAccountId;
}
