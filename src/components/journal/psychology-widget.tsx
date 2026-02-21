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
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block px-1">
          Emotional State
        </label>
        <Textarea
          className="w-full h-24 bg-muted/30 border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[var(--accent-primary)] transition-all resize-none placeholder:text-muted-foreground/50"
          placeholder="How did you feel during the trade? (Calm, FOMO, Anxious...)"
          value={feelings}
          onChange={(e) => onFeelingsChange(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block px-1">
          Market Observations
        </label>
        <Textarea
          className="w-full h-24 bg-muted/30 border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[var(--accent-primary)] transition-all resize-none placeholder:text-muted-foreground/50"
          placeholder="What did you see in the price action? (Liquidity, Session bias...)"
          value={observations}
          onChange={(e) => onObservationsChange(e.target.value)}
        />
      </div>
    </div>
  );
}
