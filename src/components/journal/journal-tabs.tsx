"use client";

import { cn } from "@/lib/utils";
import { Trade } from "@/lib/supabase/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface JournalTabsProps {
  symbols: string[];
  activeSymbol: string;
  onSymbolChange: (symbol: string) => void;
  tradesBySymbol: Record<string, Trade[]>;
}

export function JournalTabs({
  symbols,
  activeSymbol,
  onSymbolChange,
  tradesBySymbol,
}: JournalTabsProps) {
  return (
    <div className="px-4 py-2 shrink-0">
      <Tabs
        value={activeSymbol}
        onValueChange={onSymbolChange}
        className="w-full"
      >
        <TabsList className="bg-transparent gap-2 h-auto p-0 flex-wrap justify-start">
          {symbols.map((symbol) => {
            const trades = tradesBySymbol[symbol] || [];
            const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);

            return (
              <TabsTrigger
                key={symbol}
                value={symbol}
                className={cn(
                  "relative flex flex-col items-center justify-center px-4 py-2 rounded-md transition-all duration-200 min-w-[100px] border h-auto",
                  "data-[state=active]:bg-[var(--accent-primary)]/10 data-[state=active]:border-[var(--accent-primary)]/20 data-[state=active]:text-[var(--accent-primary)]",
                  "data-[state=inactive]:bg-transparent data-[state=inactive]:border-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground",
                  "outline-none",
                )}
              >
                <span className="text-xs font-medium tracking-tight">
                  {symbol}
                </span>

                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-[9px] font-mono"
                    style={{
                      color:
                        totalPnl > 0
                          ? "var(--profit-primary)"
                          : totalPnl < 0
                            ? "var(--loss-primary)"
                            : "var(--text-tertiary)",
                    }}
                  >
                    {totalPnl > 0 ? "+" : ""}
                    {totalPnl.toFixed(0)}
                  </span>
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
