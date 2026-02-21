"use client";

import { cn } from "@/lib/utils";
import { Trade } from "@/lib/supabase/types";
import { format } from "date-fns";
import { ArrowUp, ArrowDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TradeTimelineProps {
  trades: Trade[];
  selectedTradeId: string | null;
  onTradeSelect: (id: string) => void;
}

export function TradeTimeline({
  trades,
  selectedTradeId,
  onTradeSelect,
}: TradeTimelineProps) {
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col p-0">
        {trades.map((trade) => {
          const isSelected = selectedTradeId === trade.id;
          const entryDate = new Date(trade.entry_date);

          return (
            <button
              key={trade.id}
              onClick={() => onTradeSelect(trade.id)}
              className={cn(
                "relative group px-4 py-3 transition-all duration-200 text-left border-b border-border",
                isSelected ? "bg-muted" : "bg-transparent hover:bg-muted/50",
              )}
            >
              {/* Timeline indicator line */}
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--accent-primary)]" />
              )}

              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-sm flex items-center justify-center border",
                      trade.direction === "LONG"
                        ? "bg-[var(--profit-bg)] border-[var(--profit-primary)]/20"
                        : "bg-[var(--loss-bg)] border-[var(--loss-primary)]/20",
                    )}
                  >
                    {trade.direction === "LONG" ? (
                      <ArrowUp className="w-3 h-3 text-[var(--profit-primary)]" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-[var(--loss-primary)]" />
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-foreground uppercase tracking-tight">
                      {trade.direction}
                    </span>
                    <div className="text-[9px] text-muted-foreground tabular-nums">
                      {format(entryDate, "MMM d, HH:mm")}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={cn(
                      "text-xs font-mono font-medium",
                      (trade.pnl || 0) > 0
                        ? "text-[var(--profit-primary)]"
                        : (trade.pnl || 0) < 0
                          ? "text-[var(--loss-primary)]"
                          : "text-muted-foreground",
                    )}
                  >
                    {(trade.pnl || 0) > 0 ? "+" : ""}
                    {trade.pnl?.toFixed(2) ?? "—"}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
