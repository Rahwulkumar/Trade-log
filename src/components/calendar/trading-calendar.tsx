"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import { getTradesByDateRange } from "@/lib/api/client/trades";
import { getTradeNetPnl } from "@/lib/utils/trade-pnl";
import type { Trade } from "@/lib/db/schema";

interface DayTrade {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  pnl: number;
  rMultiple: number | null;
  entryTime: string;
  exitTime: string | null;
}

interface DayData {
  date: Date;
  trades: DayTrade[];
  totalPnl: number;
  winRate: number;
  tradesCount: number;
  winningTrades: number;
}

interface TradingCalendarProps {
  embedded?: boolean;
}

function formatMoney(value: number, maximumFractionDigits = 0) {
  return Math.abs(value).toLocaleString(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits > 0 ? 2 : 0,
  });
}

function formatSignedMoney(value: number, maximumFractionDigits = 0) {
  return `${value >= 0 ? "+" : "-"}$${formatMoney(value, maximumFractionDigits)}`;
}

function getToneClasses(pnl: number) {
  if (pnl > 0) {
    return {
      container:
        "border-[color-mix(in_srgb,var(--profit-primary)_26%,transparent)] bg-[var(--profit-bg)]",
      text: "text-[var(--profit-primary)]",
    };
  }

  if (pnl < 0) {
    return {
      container:
        "border-[color-mix(in_srgb,var(--loss-primary)_26%,transparent)] bg-[var(--loss-bg)]",
      text: "text-[var(--loss-primary)]",
    };
  }

  return {
    container: "border-border bg-[var(--surface-elevated)]",
    text: "text-[var(--text-secondary)]",
  };
}

function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "profit" | "loss" | "neutral";
}) {
  const toneStyles =
    tone === "profit"
      ? {
          border:
            "1px solid color-mix(in srgb, var(--profit-primary) 18%, transparent)",
          background: "var(--profit-bg)",
          color: "var(--profit-primary)",
        }
      : tone === "loss"
        ? {
            border:
              "1px solid color-mix(in srgb, var(--loss-primary) 18%, transparent)",
            background: "var(--loss-bg)",
            color: "var(--loss-primary)",
          }
        : {
            border: "1px solid var(--border-subtle)",
            background: "var(--surface)",
            color: "var(--text-primary)",
          };

  return (
    <div
      className="rounded-2xl px-4 py-4 shadow-sm"
      style={{
        border: toneStyles.border,
        background: toneStyles.background,
      }}
    >
      <p className="text-label mb-1.5">{label}</p>
      <p className="mono text-[1.85rem] font-bold leading-none" style={{ color: toneStyles.color }}>
        {value}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
        {sub}
      </p>
    </div>
  );
}

export function TradingCalendar({ embedded = false }: TradingCalendarProps) {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const { selectedAccountId } = usePropAccount();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrades() {
      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
        const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
        const propAccountIdFilter =
          selectedAccountId === "unassigned"
            ? "unassigned"
            : selectedAccountId ?? undefined;
        const tradesData = await getTradesByDateRange(
          start,
          end,
          propAccountIdFilter,
        );
        setTrades(tradesData);
      } catch (error) {
        console.error("Failed to load trades for calendar:", error);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadTrades();
    }
  }, [authLoading, currentMonth, isConfigured, selectedAccountId, user]);

  const monthData = useMemo(() => {
    const data = new Map<string, DayData>();

    trades.forEach((trade) => {
      const entryDate = new Date(trade.entryDate);
      const dateKey = format(entryDate, "yyyy-MM-dd");
      const tradePnl = getTradeNetPnl(trade);
      const direction =
        trade.direction === "LONG" || trade.direction === "SHORT"
          ? trade.direction
          : ("LONG" as const);

      const dayTrade: DayTrade = {
        id: trade.id,
        symbol: trade.symbol,
        direction,
        pnl: tradePnl,
        rMultiple: trade.rMultiple != null ? Number(trade.rMultiple) : null,
        entryTime: format(entryDate, "HH:mm"),
        exitTime: trade.exitDate
          ? format(new Date(trade.exitDate), "HH:mm")
          : null,
      };

      if (data.has(dateKey)) {
        const existing = data.get(dateKey)!;
        existing.trades.push(dayTrade);
        existing.totalPnl += tradePnl;
        existing.tradesCount += 1;
        if (tradePnl > 0) {
          existing.winningTrades += 1;
        }
        existing.winRate = Math.round(
          (existing.winningTrades / existing.tradesCount) * 100,
        );
      } else {
        data.set(dateKey, {
          date: entryDate,
          trades: [dayTrade],
          totalPnl: tradePnl,
          winRate: tradePnl > 0 ? 100 : 0,
          tradesCount: 1,
          winningTrades: tradePnl > 0 ? 1 : 0,
        });
      }
    });

    return data;
  }, [trades]);

  const monthEntries = useMemo(
    () =>
      Array.from(monthData.values()).sort(
        (left, right) => left.date.getTime() - right.date.getTime(),
      ),
    [monthData],
  );

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const monthlyStats = useMemo(() => {
    let totalPnl = 0;
    let totalTrades = 0;
    let winningDays = 0;
    let losingDays = 0;
    let tradingDays = 0;

    monthData.forEach((day) => {
      totalPnl += day.totalPnl;
      totalTrades += day.tradesCount;
      tradingDays += 1;
      if (day.totalPnl > 0) winningDays += 1;
      if (day.totalPnl < 0) losingDays += 1;
    });

    return {
      totalPnl: Math.round(totalPnl * 100) / 100,
      totalTrades,
      winningDays,
      losingDays,
      tradingDays,
      winRate:
        tradingDays > 0 ? Math.round((winningDays / tradingDays) * 100) : 0,
    };
  }, [monthData]);

  const monthLabel = format(currentMonth, "MMMM yyyy");

  const openDayDetails = (dayData: DayData) => {
    setSelectedDay(dayData);
    setIsDialogOpen(true);
  };

  if (!authLoading && !isConfigured) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center",
          !embedded && "min-h-[60vh]",
        )}
      >
        <div className="surface max-w-md rounded-2xl border border-border p-8 text-center">
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            Supabase Not Configured
          </h2>
          <p className="text-muted-foreground">
            Please add your Supabase credentials.
          </p>
        </div>
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center",
          !embedded && "min-h-[60vh]",
        )}
      >
        <div className="surface max-w-md rounded-2xl border border-border p-8 text-center">
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            Login Required
          </h2>
          <p className="mb-4 text-muted-foreground">
            Please sign in to view your calendar.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-[var(--accent-primary)]/90"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", embedded ? "space-y-5" : "space-y-8")}>
      <section
        className={cn(
          "flex flex-col gap-4 lg:flex-row lg:items-end",
          embedded ? "lg:justify-end" : "lg:justify-between",
        )}
      >
        {!embedded ? (
          <div className="space-y-1">
            <p className="text-label">Performance</p>
            <h1 className="headline-lg">Trading Calendar</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Review your month day by day and drill into the exact trades that
              created each result.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-[var(--surface)] text-[var(--accent-primary)] transition-colors hover:bg-[var(--surface-hover)]"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div
            className="rounded-xl border border-border bg-[var(--surface)] px-4 py-2 text-center shadow-sm"
            style={{ minWidth: "160px" }}
          >
            <p
              className="text-[11px] uppercase tracking-[0.16em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Active Days
            </p>
            <p className="text-base font-semibold text-foreground">{monthLabel}</p>
            <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              {monthlyStats.tradingDays} trading days
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-[var(--surface)] text-[var(--accent-primary)] transition-colors hover:bg-[var(--surface-hover)]"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-[var(--surface-elevated)] px-4 text-sm font-semibold text-foreground transition-colors hover:bg-[var(--surface-hover)]"
          >
            Today
          </button>
        </div>
      </section>

      {!embedded ? (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard
            label="Monthly P&L"
            value={formatSignedMoney(monthlyStats.totalPnl, 2)}
            sub={`${monthlyStats.tradingDays} active days in ${monthLabel}`}
            tone={monthlyStats.totalPnl >= 0 ? "profit" : "loss"}
          />
          <StatCard
            label="Total Trades"
            value={String(monthlyStats.totalTrades)}
            sub="Closed and open entries logged this month"
          />
          <StatCard
            label="Winning Days"
            value={String(monthlyStats.winningDays)}
            sub={`${monthlyStats.winRate}% of active days finished green`}
            tone={monthlyStats.winningDays > 0 ? "profit" : "neutral"}
          />
          <StatCard
            label="Losing Days"
            value={String(monthlyStats.losingDays)}
            sub={`${Math.max(monthlyStats.tradingDays - monthlyStats.winningDays, 0)} non-green active days`}
            tone={monthlyStats.losingDays > 0 ? "loss" : "neutral"}
          />
          <StatCard
            label="Win Rate"
            value={`${monthlyStats.winRate}%`}
            sub="Winning trading days divided by all active days"
            tone={monthlyStats.winRate >= 50 ? "profit" : "neutral"}
          />
        </section>
      ) : null}

      {loading ? (
        <div
          className="flex items-center justify-center rounded-2xl border border-border py-16"
          style={{ background: "var(--surface)" }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <section className="space-y-3 md:hidden">
            {monthEntries.length > 0 ? (
              monthEntries.map((day) => {
                const tone = getToneClasses(day.totalPnl);

                return (
                  <button
                    key={day.date.toISOString()}
                    type="button"
                    onClick={() => openDayDetails(day)}
                    className="surface w-full rounded-2xl border border-border p-4 text-left transition-all hover:border-[color-mix(in_srgb,var(--accent-primary)_28%,transparent)] hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {format(day.date, "EEE")}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {format(day.date, "d MMM")}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "rounded-xl border px-3 py-2 text-right shadow-sm",
                          tone.container,
                        )}
                      >
                        <div className={cn("mono text-base font-bold", tone.text)}>
                          {formatSignedMoney(day.totalPnl)}
                        </div>
                        <div
                          className="mt-0.5 text-[11px]"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Tap for details
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div
                        className="rounded-xl px-3 py-2"
                        style={{ background: "var(--surface-elevated)" }}
                      >
                        <p className="text-label mb-1">Trades</p>
                        <p className="mono text-sm font-semibold text-foreground">
                          {day.tradesCount}
                        </p>
                      </div>
                      <div
                        className="rounded-xl px-3 py-2"
                        style={{ background: "var(--surface-elevated)" }}
                      >
                        <p className="text-label mb-1">Win Rate</p>
                        <p className="mono text-sm font-semibold text-foreground">
                          {day.winRate}%
                        </p>
                      </div>
                      <div
                        className="rounded-xl px-3 py-2"
                        style={{ background: "var(--surface-elevated)" }}
                      >
                        <p className="text-label mb-1">Wins</p>
                        <p className="mono text-sm font-semibold text-foreground">
                          {day.winningTrades}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div
                className="rounded-2xl border border-dashed border-border px-5 py-8 text-center"
                style={{ color: "var(--text-tertiary)" }}
              >
                No active trading days in {monthLabel} yet.
              </div>
            )}
          </section>

          <section className="hidden md:block">
            <div className="overflow-x-auto">
              <div className="min-w-[760px] overflow-hidden rounded-[24px] border border-border bg-[var(--surface)] shadow-sm">
                <div className="grid grid-cols-7 border-b border-border bg-[var(--surface-elevated)]">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <div
                      key={day}
                      className="py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 divide-x divide-y divide-border">
                  {calendarDays.map((day, index) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const dayData = monthData.get(dateKey);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isCurrentDay = isToday(day);
                    const dayOfWeek = getDay(day);
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const tone = dayData ? getToneClasses(dayData.totalPnl) : null;

                    return (
                      <div
                        key={index}
                        className={cn(
                          "relative min-h-[126px] p-3 transition-colors lg:min-h-[138px]",
                          !isCurrentMonth &&
                            "bg-[color-mix(in_srgb,var(--surface-elevated)_42%,transparent)]",
                          isWeekend &&
                            isCurrentMonth &&
                            "bg-[color-mix(in_srgb,var(--surface-elevated)_22%,transparent)]",
                        )}
                      >
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-semibold",
                              isCurrentDay && "bg-[var(--accent-primary)] text-white",
                              !isCurrentDay && isCurrentMonth && "text-foreground",
                              !isCurrentDay &&
                                !isCurrentMonth &&
                                "text-[var(--text-tertiary)]",
                            )}
                          >
                            {format(day, "d")}
                          </span>
                          {dayData && isCurrentMonth ? (
                            <span
                              className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              {dayData.tradesCount}T
                            </span>
                          ) : null}
                        </div>

                        {dayData && isCurrentMonth ? (
                          <button
                            type="button"
                            onClick={() => openDayDetails(dayData)}
                            className={cn(
                              "w-full rounded-2xl border px-3 py-3 text-left shadow-sm transition-all hover:translate-y-[-1px] hover:shadow-md",
                              tone?.container,
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn("mono text-sm font-bold", tone?.text)}>
                                {formatSignedMoney(dayData.totalPnl)}
                              </span>
                              <span
                                className="text-[11px] font-medium"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                WR {dayData.winRate}%
                              </span>
                            </div>
                            <div
                              className="mt-2 flex items-center gap-2 text-[11px]"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              <span className="inline-flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {dayData.tradesCount}
                              </span>
                              <span className="h-1 w-1 rounded-full bg-[var(--border-default)]" />
                              <span>{dayData.winningTrades} wins</span>
                            </div>
                          </button>
                        ) : isCurrentMonth ? (
                          <div className="pt-6 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                            No trades
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {trades.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center">
              <p style={{ color: "var(--text-secondary)" }}>
                No trades this month. Start logging trades to see them on your
                calendar.
              </p>
              <Link
                href="/journal"
                className="mt-3 inline-block text-sm font-semibold text-[var(--accent-primary)] hover:underline"
              >
                Open journal -&gt;
              </Link>
            </div>
          ) : null}
        </>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border border-[var(--profit-primary)]/50 bg-[var(--profit-bg)]" />
          <span>Winning Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border border-[var(--loss-primary)]/50 bg-[var(--loss-bg)]" />
          <span>Losing Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border border-border bg-[var(--surface-elevated)]" />
          <span>No Trades</span>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl overflow-hidden border-border bg-background p-0 sm:rounded-2xl">
          {selectedDay ? (
            <>
              <div className="border-b border-border px-5 py-5 sm:px-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-foreground">
                    <CalendarIcon className="h-5 w-5 text-[var(--accent-primary)]" />
                    {format(selectedDay.date, "EEEE, MMMM d, yyyy")}
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="space-y-5 px-5 py-5 sm:px-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div
                    className="rounded-2xl border p-4"
                    style={{
                      background:
                        selectedDay.totalPnl >= 0
                          ? "var(--profit-bg)"
                          : "var(--loss-bg)",
                      borderColor:
                        selectedDay.totalPnl >= 0
                          ? "color-mix(in srgb, var(--profit-primary) 22%, transparent)"
                          : "color-mix(in srgb, var(--loss-primary) 22%, transparent)",
                    }}
                  >
                    <div className="text-label">Total P&amp;L</div>
                    <div
                      className={cn(
                        "mt-2 text-2xl font-bold",
                        selectedDay.totalPnl >= 0
                          ? "text-[var(--profit-primary)]"
                          : "text-[var(--loss-primary)]",
                      )}
                    >
                      {formatSignedMoney(selectedDay.totalPnl, 2)}
                    </div>
                  </div>
                  <div
                    className="rounded-2xl border p-4"
                    style={{
                      background: "var(--surface-elevated)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <div className="text-label">Trades</div>
                    <div className="mt-2 text-2xl font-bold text-foreground">
                      {selectedDay.tradesCount}
                    </div>
                  </div>
                  <div
                    className="rounded-2xl border p-4"
                    style={{
                      background: "var(--surface-elevated)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <div className="text-label">Win Rate</div>
                    <div className="mt-2 text-2xl font-bold text-foreground">
                      {selectedDay.winRate}%
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-semibold text-foreground">Trades</h4>
                    <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                      Sorted by entry time
                    </p>
                  </div>

                  <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
                    {selectedDay.trades.map((trade) => (
                      <div
                        key={trade.id}
                        className="flex flex-col gap-3 rounded-2xl border border-border bg-[var(--surface)] p-4 transition-colors hover:bg-[var(--surface-hover)] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "flex h-11 w-11 items-center justify-center rounded-xl border",
                              trade.pnl >= 0
                                ? "border-[color-mix(in_srgb,var(--profit-primary)_24%,transparent)] bg-[var(--profit-bg)] text-[var(--profit-primary)]"
                                : "border-[color-mix(in_srgb,var(--loss-primary)_24%,transparent)] bg-[var(--loss-bg)] text-[var(--loss-primary)]",
                            )}
                          >
                            {trade.pnl >= 0 ? (
                              <TrendingUp className="h-5 w-5" />
                            ) : (
                              <TrendingDown className="h-5 w-5" />
                            )}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">
                                {trade.symbol}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]",
                                  trade.direction === "LONG"
                                    ? "border-[color-mix(in_srgb,var(--profit-primary)_24%,transparent)] bg-[var(--profit-bg)] text-[var(--profit-primary)]"
                                    : "border-[color-mix(in_srgb,var(--loss-primary)_24%,transparent)] bg-[var(--loss-bg)] text-[var(--loss-primary)]",
                                )}
                              >
                                {trade.direction}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {trade.entryTime}
                              </span>
                              <span aria-hidden="true">-</span>
                              <span>{trade.exitTime ?? "Open"}</span>
                              {trade.rMultiple !== null ? (
                                <>
                                  <span aria-hidden="true">-</span>
                                  <span>
                                    {trade.rMultiple >= 0 ? "+" : ""}
                                    {trade.rMultiple.toFixed(1)}R
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <div
                            className={cn(
                              "mono text-base font-bold",
                              trade.pnl >= 0
                                ? "text-[var(--profit-primary)]"
                                : "text-[var(--loss-primary)]",
                            )}
                          >
                            {formatSignedMoney(trade.pnl, 2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
