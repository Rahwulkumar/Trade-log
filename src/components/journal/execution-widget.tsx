"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ToggleBadge } from "@/components/ui/toggle-badge";
import {
  ScreenshotGallery,
  type Timeframe,
} from "@/components/journal/screenshot-gallery";
import { ICT_PD_ARRAYS_EXECUTION } from "@/lib/constants/ict-pd-arrays";
import type { TradeScreenshot } from "@/lib/supabase/types";

const EXECUTION_TIMEFRAMES: Timeframe[] = ["1m", "5m"];

interface ExecutionWidgetProps {
  executionNotes: string;
  executionArrays: string[];
  positionSize: number | null;
  rMultiple: number | null;
  commission: number | null;
  swap: number | null;
  screenshots: Array<{
    url: string;
    timeframe?: string | null;
    timestamp?: string;
  }>;
  onExecutionNotesChange: (value: string) => void;
  onExecutionArraysChange: (value: string[]) => void;
  onScreenshotUpload: (timeframe: string) => void;
  onViewFullscreen: (url: string) => void;
  className?: string;
}

export function ExecutionWidget({
  executionNotes,
  executionArrays,
  positionSize,
  rMultiple,
  commission,
  swap,
  screenshots,
  onExecutionNotesChange,
  onExecutionArraysChange,
  onScreenshotUpload,
  onViewFullscreen,
  className,
}: ExecutionWidgetProps) {
  const [pdSearch, setPdSearch] = useState("");
  const [pdOpen, setPdOpen] = useState(false);
  const pdRef = useRef<HTMLDivElement>(null);

  const addArray = (label: string) => {
    if (executionArrays.includes(label)) return;
    onExecutionArraysChange([...executionArrays, label]);
    setPdSearch("");
    setPdOpen(false);
  };
  const removeArray = (label: string) => {
    onExecutionArraysChange(executionArrays.filter((x) => x !== label));
  };

  const filtered = useMemo(() => {
    const q = pdSearch.trim().toLowerCase();
    if (!q) return ICT_PD_ARRAYS_EXECUTION;
    return ICT_PD_ARRAYS_EXECUTION.filter((s) => s.toLowerCase().includes(q));
  }, [pdSearch]);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (pdRef.current && !pdRef.current.contains(e.target as Node))
        setPdOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div className={cn("space-y-6", className)}>
      <Label className="text-label" style={{ color: "var(--text-tertiary)" }}>
        Execution Trigger
      </Label>

      {/* Financial Metrics Grid (Read-Only) */}
      <div
        className="grid grid-cols-4 gap-2 text-center p-2 rounded-md"
        style={{
          background: "var(--surface-elevated)",
          border: "1px solid var(--border-default)",
        }}
      >
        {[
          {
            label: "Lot Size",
            value: positionSize !== null ? String(positionSize) : "—",
            tone: "neutral",
          },
          {
            label: "Risk",
            value: rMultiple !== null ? `${rMultiple}R` : "—",
            tone: "neutral",
          },
          {
            label: "Comm",
            value: commission !== null ? `$${commission}` : "—",
            tone: "loss",
          },
          {
            label: "Swap",
            value: swap !== null ? `$${swap}` : "—",
            tone: "loss",
          },
        ].map(({ label, value, tone }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span
              className="text-[9px] uppercase font-mono tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              {label}
            </span>
            <span
              className="text-xs font-medium font-mono"
              style={{
                color:
                  tone === "loss"
                    ? "var(--loss-primary)"
                    : "var(--text-primary)",
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Why did you pull the trigger?"
          value={executionNotes}
          onChange={(e) => onExecutionNotesChange(e.target.value)}
          className="min-h-[80px] text-sm resize-none placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-ring font-sans"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      <div className="space-y-3" ref={pdRef}>
        <Label className="text-label" style={{ color: "var(--text-tertiary)" }}>
          Confluences
        </Label>

        <div className="relative">
          <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
            <Search
              className="w-3.5 h-3.5"
              style={{ color: "var(--text-tertiary)", opacity: 0.5 }}
            />
          </div>
          <Input
            value={pdSearch}
            onChange={(e) => {
              setPdSearch(e.target.value);
              setPdOpen(true);
            }}
            onFocus={() => setPdOpen(true)}
            placeholder="Add confluence..."
            className="pl-8 h-8 text-xs"
          />
          {pdOpen && (
            <div
              className="absolute z-50 mt-1 w-full max-h-[220px] overflow-auto rounded-md shadow-xl py-1"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border-default)",
              }}
            >
              {filtered.length === 0 ? (
                <div
                  className="px-3 py-2 text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  No matches
                </div>
              ) : (
                filtered.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => addArray(label)}
                    className="w-full text-left px-3 py-1.5 text-xs flex items-center justify-between group transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--surface-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {label}
                    {executionArrays.includes(label) && (
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: "var(--warning-primary)" }}
                      >
                        active
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 min-h-[40px]">
          {executionArrays.map((label) => (
            <ToggleBadge
              key={label}
              selected={true}
              onToggle={() => removeArray(label)}
            >
              {label}
            </ToggleBadge>
          ))}
          {executionArrays.length === 0 && (
            <span
              className="text-xs italic"
              style={{ color: "var(--text-tertiary)", opacity: 0.5 }}
            >
              No confluences added
            </span>
          )}
        </div>
      </div>

      <div
        className="space-y-2 pt-2"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <Label className="text-label" style={{ color: "var(--text-tertiary)" }}>
          Entry Snapshots
        </Label>
        <ScreenshotGallery
          screenshots={screenshots as TradeScreenshot[]}
          onUpload={(t) => onScreenshotUpload(t)}
          onViewFullscreen={onViewFullscreen}
          timeframesFilter={EXECUTION_TIMEFRAMES}
        />
      </div>
    </div>
  );
}
