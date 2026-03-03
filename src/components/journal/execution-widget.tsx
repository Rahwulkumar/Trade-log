"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { ICT_PD_ARRAYS_EXECUTION } from "@/lib/constants/ict-pd-arrays";
import type { TradeScreenshot } from "@/lib/supabase/types";
import {
  ScreenshotGallery,
  type Timeframe,
} from "@/components/journal/screenshot-gallery";

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
}: ExecutionWidgetProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? ICT_PD_ARRAYS_EXECUTION.filter((s) => s.toLowerCase().includes(q))
      : ICT_PD_ARRAYS_EXECUTION;
  }, [search]);

  const addArray = (label: string) => {
    if (!executionArrays.includes(label))
      onExecutionArraysChange([...executionArrays, label]);
    setSearch("");
    setOpen(false);
  };
  const removeArray = (label: string) =>
    onExecutionArraysChange(executionArrays.filter((x) => x !== label));

  const metrics = [
    {
      label: "Lot Size",
      value: positionSize != null ? String(positionSize) : "—",
      color: "var(--text-primary)",
    },
    {
      label: "R-Result",
      value:
        rMultiple != null
          ? `${rMultiple >= 0 ? "+" : ""}${rMultiple.toFixed(2)}R`
          : "—",
      color:
        (rMultiple ?? 0) >= 0 ? "var(--profit-primary)" : "var(--loss-primary)",
    },
    {
      label: "Commission",
      value: commission != null ? `-$${Math.abs(commission).toFixed(2)}` : "—",
      color: "var(--loss-primary)",
    },
    {
      label: "Swap",
      value:
        swap != null ? (swap >= 0 ? `+$${swap}` : `-$${Math.abs(swap)}`) : "—",
      color: (swap ?? 0) >= 0 ? "var(--profit-primary)" : "var(--loss-primary)",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Metrics strip */}
      <div
        className="grid grid-cols-4 gap-2 rounded-[10px] p-3"
        style={{
          background: "var(--surface-elevated)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {metrics.map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <span
              style={{
                fontSize: "0.55rem",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 700,
              }}
            >
              {label}
            </span>
            <span
              className="font-mono font-bold tabular-nums"
              style={{ fontSize: "0.85rem", color }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Why did you pull the trigger */}
      <div className="space-y-1.5">
        <span
          style={{
            fontSize: "0.6rem",
            color: "var(--text-tertiary)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
          }}
        >
          Execution Trigger
        </span>
        <textarea
          value={executionNotes}
          onChange={(e) => onExecutionNotesChange(e.target.value)}
          placeholder="Why did you pull the trigger? What precise signal confirmed the entry?"
          className="w-full resize-none rounded-[10px] p-3 focus:outline-none leading-relaxed transition-all"
          style={{
            minHeight: "88px",
            fontSize: "0.78rem",
            color: "var(--text-primary)",
            background: "var(--surface-elevated)",
            border: "1px solid var(--border-subtle)",
            lineHeight: 1.7,
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--border-active)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
        />
      </div>

      {/* ICT PD Arrays / Confluences */}
      <div className="space-y-2" ref={wrapRef}>
        <span
          style={{
            fontSize: "0.6rem",
            color: "var(--text-tertiary)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
          }}
        >
          Confluences / PD Arrays
        </span>

        {/* Selected tags */}
        {executionArrays.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {executionArrays.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium"
                style={{
                  fontSize: "0.72rem",
                  background: "var(--accent-soft)",
                  color: "var(--accent-primary)",
                  border: "1px solid var(--accent-primary)",
                }}
              >
                {label}
                <button
                  type="button"
                  onClick={() => removeArray(label)}
                  style={{ color: "var(--accent-primary)", opacity: 0.7 }}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <div
            className="flex items-center gap-2 rounded-[8px] px-3"
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
            onFocus={() => {
              /* noop */
            }}
          >
            <Search
              size={12}
              style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search PD arrays & confluences…"
              className="flex-1 bg-transparent outline-none py-2.5"
              style={{ fontSize: "0.75rem", color: "var(--text-primary)" }}
            />
            <ChevronDown
              size={12}
              style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
            />
          </div>

          {open && (
            <div
              className="absolute z-50 mt-1 w-full max-h-[220px] overflow-auto rounded-[8px] py-1"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border-default)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
              }}
            >
              {filtered.length === 0 ? (
                <div
                  className="px-3 py-2"
                  style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}
                >
                  No matches
                </div>
              ) : (
                filtered.map((label) => {
                  const active = executionArrays.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => addArray(label)}
                      className="w-full text-left px-3 py-2 flex items-center justify-between transition-colors jnl-hover-surface"
                      style={{
                        fontSize: "0.75rem",
                        color: active
                          ? "var(--accent-primary)"
                          : "var(--text-secondary)",
                      }}
                    >
                      {label}
                      {active && (
                        <span
                          style={{
                            fontSize: "0.6rem",
                            color: "var(--accent-primary)",
                            fontWeight: 700,
                          }}
                        >
                          ✓ Added
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {executionArrays.length === 0 && (
          <p
            style={{
              fontSize: "0.68rem",
              color: "var(--text-tertiary)",
              fontStyle: "italic",
            }}
          >
            No confluences added yet
          </p>
        )}
      </div>

      {/* Entry snapshots */}
      <div
        className="space-y-2"
        style={{
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: "16px",
        }}
      >
        <span
          style={{
            fontSize: "0.6rem",
            color: "var(--text-tertiary)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
          }}
        >
          Entry Snapshots (1m / 5m)
        </span>
        <ScreenshotGallery
          screenshots={screenshots as TradeScreenshot[]}
          onUpload={(tf) => onScreenshotUpload(tf)}
          onViewFullscreen={onViewFullscreen}
          timeframesFilter={EXECUTION_TIMEFRAMES}
        />
      </div>
    </div>
  );
}
