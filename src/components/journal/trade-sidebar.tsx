"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Trade } from "@/lib/supabase/types";
import { getPnLColorClass } from "@/lib/utils/trade-colors";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

interface TradeSidebarProps {
  trades: Trade[];
}

export function TradeSidebar({ trades }: TradeSidebarProps) {
  const params = useParams();
  const currentTradeId = params?.id as string;
  const [search, setSearch] = useState("");

  const filteredTrades = useMemo(() => {
    return trades.filter((t) =>
      t.symbol.toLowerCase().includes(search.toLowerCase()),
    );
  }, [trades, search]);

  return (
    <div className="w-[280px] h-full flex flex-col border-r border-border bg-sidebar">
      {/* Header / Search */}
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
            Trade Log
          </span>
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            {filteredTrades.length}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "var(--text-tertiary)" }} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by symbol..."
            className="h-8 pl-8 text-xs bg-sidebar-accent border-border focus:border-ring focus:ring-0 rounded-md placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Trade List */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {filteredTrades.map((trade) => {
            const isActive = currentTradeId === trade.id;

            return (
              <Link
                key={trade.id}
                href={`/trades/${trade.id}`}
                className={cn(
                  "relative group px-4 py-3 border-b border-border transition-all duration-200 hover:bg-sidebar-accent/50",
                  isActive && "bg-sidebar-accent",
                )}
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                )}

                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {/* Direction Badge */}
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                      style={
                        trade.direction === "LONG"
                          ? { background: "rgba(78,203,6,0.1)", color: "var(--profit-primary)" }
                          : { background: "rgba(255,68,85,0.1)", color: "var(--loss-primary)" }
                      }
                    >
                      {trade.direction === "LONG" ? "L" : "S"}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-bold tracking-tight",
                        isActive
                          ? "text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/80 group-hover:text-sidebar-foreground",
                      )}
                    >
                      {trade.symbol}
                    </span>
                  </div>

                  {/* PnL */}
                  <span
                    className={cn("text-xs font-mono font-medium", getPnLColorClass(trade.pnl))}
                  >
                    {(trade.pnl || 0) > 0 ? "+" : ""}
                    {trade.pnl?.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  <span>
                    {format(new Date(trade.entry_date), "MMM d, HH:mm")}
                  </span>
                  <span className="uppercase tracking-wider opacity-70">
                    {(trade.pnl || 0) > 0
                      ? "WIN"
                      : (trade.pnl || 0) < 0
                        ? "LOSS"
                        : "BE"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
