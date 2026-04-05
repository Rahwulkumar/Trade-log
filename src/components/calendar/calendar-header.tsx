"use client";

import type { ReactNode } from "react";

import { ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";

import { CalendarMetric } from "@/components/calendar/calendar-shared";
import { Button } from "@/components/ui/button";
import type { CalendarDateMode } from "@/lib/calendar/review";

function BasisToggle({
  value,
  onChange,
}: {
  value: CalendarDateMode;
  onChange: (value: CalendarDateMode) => void;
}) {
  return (
    <div
      className="inline-flex w-fit rounded-full border p-0.5"
      style={{
        background: "var(--surface-elevated)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {(["entry", "exit"] as const).map((mode) => {
        const active = value === mode;

        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className="rounded-full px-2.5 py-1 text-[0.74rem] font-medium transition-colors"
            style={{
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: active ? "var(--shadow-sm)" : "none",
            }}
          >
            {mode === "entry" ? "Entry date" : "Exit date"}
          </button>
        );
      })}
    </div>
  );
}

interface CalendarHeaderProps {
  monthLabel: string;
  totalPnl: string;
  activeDays: string;
  pendingTrades: string;
  action?: ReactNode;
  dateMode: CalendarDateMode;
  onChangeDateMode: (value: CalendarDateMode) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onJumpToLatest: () => void;
}

export function CalendarHeader({
  monthLabel,
  totalPnl,
  activeDays,
  pendingTrades,
  action,
  dateMode,
  onChangeDateMode,
  onPreviousMonth,
  onNextMonth,
  onJumpToLatest,
}: CalendarHeaderProps) {
  const pnlTone =
    totalPnl.startsWith("+") ? "profit" : totalPnl.startsWith("-") ? "loss" : "default";

  return (
    <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-[1.08rem] font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-[1.2rem]">
          {monthLabel}
        </h1>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <CalendarMetric label="Net" value={totalPnl} tone={pnlTone} />
          <CalendarMetric label="Active" value={activeDays} />
          <CalendarMetric
            label="Pending"
            value={pendingTrades}
            tone={Number(pendingTrades) > 0 ? "warning" : "default"}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
        {action ? <div className="sm:mr-1">{action}</div> : null}
        <BasisToggle value={dateMode} onChange={onChangeDateMode} />

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={onPreviousMonth}
            aria-label="Previous month"
          >
            <ChevronLeft size={15} />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 px-2.5 text-[0.74rem]"
            onClick={onJumpToLatest}
          >
            <ChevronsUpDown size={13} />
            Latest
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={onNextMonth}
            aria-label="Next month"
          >
            <ChevronRight size={15} />
          </Button>
        </div>
      </div>
    </header>
  );
}
