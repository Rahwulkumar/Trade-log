type TradePnlLike = {
  pnl?: string | number | null;
  commission?: string | number | null;
  swap?: string | number | null;
  pnlIncludesCosts?: boolean | null;
};

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function getTradeNetPnl(trade: TradePnlLike): number {
  const pnl = toNumber(trade.pnl);
  if (trade.pnlIncludesCosts !== false) {
    return pnl;
  }
  return pnl + toNumber(trade.commission) + toNumber(trade.swap);
}
