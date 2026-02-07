"use client";

import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface StrategyLogicProps {
  notes: string;
  onNotesChange: (value: string) => void;
  className?: string;
}

export function StrategyLogic({
  notes,
  onNotesChange,
  className,
}: StrategyLogicProps) {
  return (
    <div className={cn("flex flex-col h-full bg-transparent", className)}>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 shrink-0">
        <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
          Analysis & Thesis
        </span>
      </div>

      <div className="flex-1 p-4 relative overflow-hidden group">
        <Textarea
          className="w-full h-full bg-transparent text-zinc-200 text-sm leading-relaxed resize-none focus:outline-none placeholder:text-zinc-700 border-0 focus-visible:ring-0 shadow-none ring-0 p-0"
          placeholder="Enter your trade thesis, setup confirmation, and exit logic here..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
