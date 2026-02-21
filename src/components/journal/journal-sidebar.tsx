"use client";

import { useMemo } from "react";
import { getPnLColorClass } from "@/lib/utils/trade-colors";
import { EnrichedTrade } from "@/domain/trade-types";
import { Playbook, TradeScreenshot } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Maximize2, TrendingUp } from "lucide-react";

interface JournalSidebarProps {
  trade: EnrichedTrade;
  playbooks: Playbook[];
  onUpdate: (field: keyof EnrichedTrade, value: any) => void;
  isSaving?: boolean;
}

export function JournalSidebar({
  trade,
  playbooks,
  onUpdate,
  isSaving,
}: JournalSidebarProps) {
  // Helper for PnL Color
  const pnlColor = getPnLColorClass(trade.pnl);
  const pnlPillStyle = useMemo(() => {
    if (!trade.pnl || trade.pnl === 0)
      return { background: "transparent", borderColor: "var(--border-default)" };
    const rgb = trade.pnl > 0 ? "78,203,6" : "255,68,85";
    return { background: `rgba(${rgb},0.1)`, borderColor: `rgba(${rgb},0.2)` };
  }, [trade.pnl]);

  // Safe screenshots access
  const screenshots = useMemo(() => {
    if (!trade.screenshots) return [];
    if (Array.isArray(trade.screenshots)) {
      return trade.screenshots as unknown as TradeScreenshot[];
    }
    return [];
  }, [trade.screenshots]);

  return (
    <div className="w-[340px] border-l border-border bg-card/20 backdrop-blur-sm flex flex-col h-full shadow-xl z-20">
      {/* 1. HEADER: Symbol & PnL */}
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Asset
            </span>
            <span className="text-2xl font-black tracking-tight text-foreground">
              {trade.symbol}
            </span>
          </div>

          <div
            className="flex flex-col items-end px-3 py-1.5 rounded-md border"
            style={pnlPillStyle}
          >
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/80 font-semibold mb-0.5">
              Net PnL
            </span>
            <span className={cn("text-xl font-mono font-bold leading-none", pnlColor)}>
              {typeof trade.pnl === "number"
                ? formatCurrency(trade.pnl)
                : "$0.00"}
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/30 rounded border border-border p-2 flex flex-col">
            <span className="text-[9px] uppercase text-muted-foreground font-mono">
              R-Multiple
            </span>
            <span className="text-sm font-mono font-bold text-foreground">
              {trade.r_multiple ? `${trade.r_multiple}R` : "-"}
            </span>
          </div>
          <div className="bg-muted/30 rounded border border-border p-2 flex flex-col items-end">
            <span className="text-[9px] uppercase text-muted-foreground font-mono">
              Setup Quality
            </span>
            <div className="flex items-center gap-1">
              {/* Placeholder for star rating or simplistic quality score */}
              <span className="text-sm font-bold text-primary">A+</span>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* 2. STRATEGY SELECTION */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
              <TrendingUp className="w-3 h-3" />
              Strategy / Playbook
            </label>
            <Select
              value={trade.playbook_id ?? undefined}
              onValueChange={(val) => onUpdate("playbook_id", val)}
            >
              <SelectTrigger className="h-9 bg-muted/20 border-border text-xs focus:ring-1 focus:ring-primary/50">
                <SelectValue placeholder="Select Strategy..." />
              </SelectTrigger>
              <SelectContent>
                {playbooks?.map((pb) => (
                  <SelectItem key={pb.id} value={pb.id} className="text-xs">
                    {pb.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-border/50" />

          {/* 3. NOTES - "The Black Box" */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Trade Notes
              </label>
              {isSaving && (
                <span className="text-[9px] text-muted-foreground animate-pulse">
                  Syncing...
                </span>
              )}
            </div>
            <Textarea
              placeholder="Capture your thoughts..."
              className="min-h-[150px] bg-muted/20 border-border text-xs resize-none focus-visible:ring-1 focus-visible:ring-primary/50 font-mono leading-relaxed"
              value={trade.notes ?? ""}
              onChange={(e) => onUpdate("notes", e.target.value)}
            />
          </div>

          <Separator className="bg-border/50" />

          {/* 4. SCREENSHOTS - Minimal List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Evidence
              </label>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full hover:bg-muted"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>

            <div className="space-y-2">
              {/* Placeholder for empty state */}
              {screenshots.length === 0 && (
                <div className="h-20 border border-dashed border-border rounded-md flex items-center justify-center text-[10px] text-muted-foreground bg-muted/10">
                  No screenshots
                </div>
              )}

              {/* Mapping screenshots would go here */}
              {screenshots.map((s, i) => (
                <div
                  key={i}
                  className="group relative flex items-center gap-3 p-2 rounded-md border border-border bg-muted/10 hover:bg-muted/20 transition-colors"
                >
                  <div className="h-8 w-12 bg-black rounded overflow-hidden relative border border-border/50">
                    {/* Thumbnail */}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className="text-[10px] font-mono font-medium text-foreground">
                      {s.timeframe || "IMG"}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {s.created_at
                        ? new Date(s.created_at).toLocaleTimeString()
                        : "Unknown"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// Local helper if Utils doesn't have it
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
