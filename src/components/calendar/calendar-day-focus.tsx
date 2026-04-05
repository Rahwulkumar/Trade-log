"use client";

import { ArrowUpRight, CheckCircle2, Clock } from "lucide-react";

import {
  CalendarMetric,
  formatSignedPnl,
} from "@/components/calendar/calendar-shared";
import { Button } from "@/components/ui/button";
import { AppPanel } from "@/components/ui/page-primitives";
import { cn } from "@/lib/utils";
import type {
  CalendarDateTools,
  CalendarReviewDay,
  CalendarReviewTrade,
} from "@/lib/calendar/review";

function tradePnlColor(pnl: number) {
  if (pnl > 0) return "var(--profit-primary)";
  if (pnl < 0) return "var(--loss-primary)";
  return "var(--text-secondary)";
}

function TradeQueueRow({
  trade,
  active,
  onSelect,
  onOpenJournal,
}: {
  trade: CalendarReviewTrade;
  active: boolean;
  onSelect: () => void;
  onOpenJournal?: (id: string) => void;
}) {
  return (
    <div
      className="border-b last:border-b-0"
      style={{
        borderBottomColor: "var(--border-subtle)",
        background: active
          ? trade.pnl > 0
            ? "color-mix(in srgb, var(--profit-bg) 80%, var(--surface))"
            : trade.pnl < 0
              ? "color-mix(in srgb, var(--loss-bg) 82%, var(--surface))"
              : "color-mix(in srgb, var(--accent-soft) 82%, var(--surface))"
          : "transparent",
      }}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 px-3 py-2.5 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[0.8rem] font-semibold text-[var(--text-primary)]">
                  {trade.symbol}
                </span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[0.5rem] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    background:
                      trade.direction === "LONG" ? "var(--profit-bg)" : "var(--loss-bg)",
                    color:
                      trade.direction === "LONG"
                        ? "var(--profit-primary)"
                        : "var(--loss-primary)",
                  }}
                >
                  {trade.direction === "LONG" ? "Long" : "Short"}
                </span>
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-[0.62rem] text-[var(--text-tertiary)]">
                <Clock size={10} />
                {trade.entryTime}
                {trade.exitTime ? ` to ${trade.exitTime}` : ""}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p
                className="text-[0.76rem] font-semibold"
                style={{ color: tradePnlColor(trade.pnl) }}
              >
                {formatSignedPnl(trade.pnl, "fixed")}
              </p>
              <p
                className="mt-0.5 flex items-center justify-end gap-1 text-[0.58rem]"
                style={{
                  color: trade.reviewed
                    ? "var(--profit-primary)"
                    : "var(--warning-primary)",
                }}
              >
                <CheckCircle2 size={10} />
                {trade.reviewed ? "Reviewed" : "Pending"}
              </p>
            </div>
          </div>
        </button>

        {onOpenJournal ? (
          <div
            className="flex shrink-0 items-center border-l px-2"
            style={{ borderLeftColor: "var(--border-subtle)" }}
          >
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-1.5 text-[0.66rem]"
              onClick={() => onOpenJournal(trade.id)}
            >
              Review
              <ArrowUpRight size={12} />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface CalendarDayFocusProps {
  day: CalendarReviewDay | null;
  dateTools: CalendarDateTools;
  selectedTradeId: string | null;
  onSelectTrade: (tradeId: string) => void;
  onOpenJournal?: (tradeId: string) => void;
  className?: string;
}

export function CalendarDayFocus({
  day,
  dateTools,
  selectedTradeId,
  onSelectTrade,
  onOpenJournal,
  className,
}: CalendarDayFocusProps) {
  if (!day) {
    return (
      <AppPanel
        className={cn(
          "p-3.5 sm:p-4 xl:flex xl:h-full xl:min-h-[42rem] xl:flex-col 2xl:min-h-[46rem]",
          className,
        )}
      >
        <div className="flex min-h-[10rem] flex-col items-center justify-center text-center xl:min-h-0 xl:flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Pick a day</p>
          <p className="mt-1.5 max-w-[16rem] text-[0.8rem] leading-5 text-[var(--text-secondary)]">
            Select a day on the month map to see its trades here.
          </p>
        </div>
      </AppPanel>
    );
  }

  return (
    <AppPanel
      className={cn(
        "p-3.5 sm:p-4 xl:flex xl:h-full xl:min-h-[42rem] xl:flex-col 2xl:min-h-[46rem]",
        className,
      )}
    >
      <div className="space-y-3 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
        <div className="space-y-1.5">
          <p className="text-label">Day focus</p>
          <h2 className="text-[0.92rem] font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-[0.98rem]">
            {dateTools.formatLongDate(day.date)}
          </h2>
          <div className="flex flex-wrap gap-2">
            <CalendarMetric
              label="Net"
              value={formatSignedPnl(day.totalPnl, "fixed")}
              tone={day.totalPnl > 0 ? "profit" : day.totalPnl < 0 ? "loss" : "default"}
              variant="pill"
            />
            <CalendarMetric label="Trades" value={String(day.tradesCount)} variant="pill" />
            <CalendarMetric
              label="Pending"
              value={String(day.needsReviewTrades)}
              tone={day.needsReviewTrades > 0 ? "warning" : "default"}
              variant="pill"
            />
          </div>
        </div>

        {day.tradesCount > 0 ? (
          <div
            className="overflow-hidden rounded-[12px] border xl:min-h-0 xl:flex-1"
            style={{
              background: "var(--surface-elevated)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div className="xl:h-full xl:overflow-y-auto">
              {day.trades.map((trade) => (
                <TradeQueueRow
                  key={trade.id}
                  trade={trade}
                  active={trade.id === selectedTradeId}
                  onSelect={() => onSelectTrade(trade.id)}
                  onOpenJournal={onOpenJournal}
                />
              ))}
            </div>
          </div>
        ) : (
          <div
            className="rounded-[12px] border px-3 py-3.5 text-[0.8rem] text-[var(--text-secondary)] xl:flex xl:min-h-0 xl:flex-1 xl:items-center"
            style={{
              background: "var(--surface-elevated)",
              borderColor: "var(--border-subtle)",
            }}
          >
            No trades landed on this day.
          </div>
        )}
      </div>
    </AppPanel>
  );
}
