"use client";

import { useState, useEffect } from "react";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { getTrades } from "@/lib/api/trades";
import { Badge } from "@/components/ui/badge";
import type { Trade } from "@/lib/supabase/types";

interface RecentTradesProps {
  limit?: number;
  propAccountId?: string | null;
}

export function RecentTrades({ limit = 5, propAccountId }: RecentTradesProps) {
  const { user, isConfigured } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrades() {
      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }

      try {
        const data = await getTrades({ status: "closed", propAccountId });
        setTrades(data.slice(0, limit));
      } catch (err) {
        console.error("Failed to load recent trades:", err);
      } finally {
        setLoading(false);
      }
    }

    loadTrades();
  }, [user, isConfigured, limit, propAccountId]);

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
      <table className="table-void w-full">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Direction</th>
            <th className="text-right">Entry</th>
            <th className="text-right">Exit</th>
            <th className="text-right">P&L</th>
            <th className="text-right">R-Multiple</th>
            <th className="text-right">Date</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id} className="cursor-pointer">
              <td className="font-medium">{trade.symbol}</td>
              <td>
                <Badge variant={trade.direction === "LONG" ? "profit" : "loss"}>
                  {trade.direction === "LONG" ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {trade.direction}
                </Badge>
              </td>
              <td className="text-right mono text-muted-foreground">
                {trade.entry_price}
              </td>
              <td className="text-right mono text-muted-foreground">
                {trade.exit_price || "-"}
              </td>
              <td
                className={cn(
                  "text-right font-medium mono",
                  (trade.pnl || 0) >= 0 ? "text-green-500" : "text-red-500",
                )}
              >
                {(trade.pnl || 0) >= 0 ? "+" : ""}${(trade.pnl || 0).toFixed(2)}
              </td>
              <td
                className={cn(
                  "text-right mono",
                  (trade.r_multiple || 0) >= 0 ? "" : "text-red-500",
                )}
              >
                {trade.r_multiple
                  ? `${trade.r_multiple >= 0 ? "+" : ""}${trade.r_multiple.toFixed(1)}R`
                  : "-"}
              </td>
              <td className="text-right text-muted-foreground">
                {new Date(trade.entry_date).toLocaleDateString("en-US", {
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
