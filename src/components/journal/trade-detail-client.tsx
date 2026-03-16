"use client";

import { useState, useCallback, useEffect } from "react";
import { EnrichedTrade } from "@/domain/trade-types";
import { Playbook } from "@/lib/supabase/types";
import { BiasWidget } from "@/components/journal/bias-widget";
import { getDirectionColorClass } from "@/lib/utils/trade-colors";

import { TradeSelector } from "@/components/journal/trade-selector";

import { useAuth } from "@/components/auth-provider";

interface TradeDetailClientProps {
  initialTrade: EnrichedTrade;
  playbooks: Playbook[];
}

export function TradeDetailClient({ initialTrade }: TradeDetailClientProps) {
  const { user } = useAuth();
  const [trade, setTrade] = useState<EnrichedTrade>(initialTrade);

  // Debounced Save Logic
  const saveTradeUpdate = useCallback(
    async (currentTrade: EnrichedTrade) => {
      if (!user) return;
      try {
        const response = await fetch(`/api/trades/${currentTrade.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            tf_observations: currentTrade.tf_observations,
          })
        });

        if (!response.ok) {
          throw new Error("Failed to save trade update");
        }
      } catch (err) {
        console.error("Save failed", err);
      }
    },
    [user],
  );

  // Auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (trade !== initialTrade) {
        saveTradeUpdate(trade);
      }
    }, 1000); // Faster debounce for UI interactions
    return () => clearTimeout(timer);
  }, [trade, saveTradeUpdate, initialTrade]);

  const handleTradeUpdate = (field: keyof EnrichedTrade, value: unknown) => {
    setTrade((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="w-full h-full bg-[#141414] text-foreground font-sans flex flex-row overflow-hidden">
      {/* App Background Pattern (Void) - Global */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

      {/* 1. THE SPINE (Left Rail) */}
      <TradeSelector currentTradeId={trade.id} />

      {/* 2. THE CONTENT AREA (Scrollable) */}
      <div className="flex-1 h-full relative flex flex-col overflow-y-auto overflow-x-hidden">
        {/* Page Header (Notion-like Cover) */}
        <div className="h-32 w-full shrink-0 bg-gradient-to-b from-[#1A1A1A] to-[#141414] border-b border-[#272727]/50" />

        <div className="w-full max-w-full mx-auto p-6 md:p-8 lg:p-10 space-y-16">
          {/* Title Area & Metadata */}
          <div className="flex flex-col gap-6 border-b border-[#272727] pb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-5xl font-serif tracking-tight text-[#EAEAEA] mb-2">
                  {trade.symbol}
                </h1>
                <div className="flex items-center gap-3 text-sm font-mono text-[#666] uppercase tracking-wider">
                  <span className={getDirectionColorClass(trade.direction)}>
                    {trade.direction}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(trade.entry_date).toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* THE NEW BIAS STRIP (Integrated here) */}
            <BiasWidget trade={trade} onUpdate={handleTradeUpdate} />
          </div>

          {/* Content Area Start */}
          <div className="space-y-12 pt-4">
            {/* Next widgets will go here */}
          </div>
        </div>
      </div>
    </div>
  );
}
