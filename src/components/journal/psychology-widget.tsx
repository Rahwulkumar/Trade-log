"use client";

import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface PsychologyWidgetProps {
  feelings: string;
  observations: string;
  onFeelingsChange: (value: string) => void;
  onObservationsChange: (value: string) => void;
  className?: string;
}

export function PsychologyWidget({
  feelings,
  observations,
  onFeelingsChange,
  onObservationsChange,
  className,
}: PsychologyWidgetProps) {
  return (
    <div className={cn("p-4 space-y-8 h-full bg-transparent", className)}>
      <div className="space-y-3">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block px-1">
          Emotional State
        </label>
        <Textarea
          className="w-full h-24 bg-zinc-950/50 border-white/5 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-white/20 transition-all resize-none placeholder:text-zinc-800"
          placeholder="How did you feel during the trade? (Calm, FOMO, Anxious...)"
          value={feelings}
          onChange={(e) => onFeelingsChange(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block px-1">
          Market Observations
        </label>
        <Textarea
          className="w-full h-24 bg-zinc-950/50 border-white/5 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-white/20 transition-all resize-none placeholder:text-zinc-800"
          placeholder="What did you see in the price action? (Liquidity, Session bias...)"
          value={observations}
          onChange={(e) => onObservationsChange(e.target.value)}
        />
      </div>
    </div>
  );
}
