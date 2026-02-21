"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTrades } from "@/lib/api/trades";
import { Trade } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

interface TradeSelectorProps {
  currentTradeId: string;
}

export function TradeSelector({ currentTradeId }: TradeSelectorProps) {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getTrades({ status: "closed" });
        // Removed limit to show ALL trades as requested
        setTrades(data);
      } catch (e) {
        console.error("Failed to load trades", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    /* THE SPINE - Fixed Left Sidebar */
    <div className="w-80 h-full flex-shrink-0 border-r border-[#222]/50 flex flex-col bg-[#0F0F0F]">
      {/* Header - Back Navigation */}
      <div className="h-16 flex items-center px-4 border-b border-[#222]/30">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-xs text-[#666] hover:text-[#EEE] transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to Terminal</span>
        </button>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent">
        {loading && (
          <div className="p-8 text-center text-xs text-[#444] font-mono">
            Loading Log...
          </div>
        )}

        {!loading &&
          trades.map((trade) => {
            const isActive = trade.id === currentTradeId;
            const isProfit = (trade.pnl || 0) >= 0;

            return (
              <div
                key={trade.id}
                onClick={() => router.push(`/trades/${trade.id}`)}
                className={cn(
                  "group flex items-center justify-between px-3 py-3 rounded-sm cursor-pointer transition-all duration-200 border border-transparent",
                  isActive
                    ? "bg-[#1A1A1A] border-[#222]"
                    : "hover:bg-[#141414] hover:border-[#222]/50",
                )}
              >
                <div className="flex flex-col gap-1 overflow-hidden">
                  <span
                    className={cn(
                      "text-sm font-medium font-mono truncate transition-colors",
                      isActive
                        ? "text-[#EEE]"
                        : "text-[#777] group-hover:text-[#CCC]",
                    )}
                  >
                    {trade.symbol}
                  </span>
                  <span className="text-[10px] text-[#444] font-mono">
                    {new Date(trade.entry_date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "2-digit",
                    })}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={cn(
                      "text-xs font-mono font-medium",
                      isProfit ? "text-[#0F8C56]" : "text-[#D44C47]",
                    )}
                  >
                    {isProfit ? "+" : ""}
                    {trade.pnl?.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-[#444] mt-0.5 font-mono">
                    {trade.r_multiple?.toFixed(1)}R
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
