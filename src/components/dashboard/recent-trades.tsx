"use client";

import { useState, useEffect } from "react";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { getTrades } from "@/lib/api/client/trades";
import type { Trade } from "@/lib/db/schema";

interface RecentTradesProps {
  limit?: number;
  propAccountId?: string | null;
}

export function RecentTrades({ limit = 5, propAccountId }: RecentTradesProps) {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrades() {
      if (authLoading) return;
      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }

      try {
        const data = await getTrades({
          status: "closed",
          propAccountId,
          limit,
          sortBy: "entryDate",
          sortOrder: "desc",
        });
        setTrades(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("Failed to fetch"))
          console.error("Failed to load recent trades:", err);
      } finally {
        setLoading(false);
      }
    }

    loadTrades();
  }, [authLoading, user, isConfigured, limit, propAccountId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No trades yet. Start logging your trades!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
          <tr>
            <th className="px-4 py-3 font-medium">Symbol</th>
            <th className="px-4 py-3 font-medium">Direction</th>
            <th className="px-4 py-3 font-medium text-right">Entry</th>
            <th className="px-4 py-3 font-medium text-right">Exit</th>
            <th className="px-4 py-3 font-medium text-right">P&L</th>
            <th className="px-4 py-3 font-medium text-right">R-Multiple</th>
            <th className="px-4 py-3 font-medium text-right">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {trades.map((trade) => (
            <tr
              key={trade.id}
              className="group cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <td className="px-4 py-3 font-medium text-foreground">
                {trade.symbol}
              </td>
              <td className="px-4 py-3">
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                    trade.direction === "LONG"
                      ? "bg-[var(--profit-bg)] text-[var(--profit-primary)] border-[var(--profit-primary)]/20"
                      : "bg-[var(--loss-bg)] text-[var(--loss-primary)] border-[var(--loss-primary)]/20",
                  )}
                >
                  {trade.direction === "LONG" ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {trade.direction}
                </div>
              </td>
              <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                {trade.entryPrice}
              </td>
              <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                {trade.exitPrice || "-"}
              </td>
              <td
                className={cn(
                  "px-4 py-3 text-right font-mono font-medium",
                  (Number(trade.pnl) || 0) >= 0
                    ? "text-[var(--profit-primary)]"
                    : "text-[var(--loss-primary)]",
                )}
              >
                {(Number(trade.pnl) || 0) >= 0 ? "+" : ""}
                {(Number(trade.pnl) || 0).toFixed(2)}
              </td>
              <td
                className={cn(
                  "px-4 py-3 text-right font-mono",
                  (Number(trade.rMultiple) || 0) >= 0
                    ? "text-[var(--profit-primary)]"
                    : "text-[var(--loss-primary)]",
                )}
              >
                {trade.rMultiple
                  ? `${Number(trade.rMultiple) >= 0 ? "+" : ""}${Number(trade.rMultiple).toFixed(1)}R`
                  : "-"}
              </td>
              <td className="px-4 py-3 text-right text-muted-foreground">
                {new Date(trade.entryDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
