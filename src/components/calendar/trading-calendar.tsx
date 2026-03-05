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
import type { Trade } from "@/lib/db/schema";

interface DayTrade {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  pnl: number;
  rMultiple: number | null;
  entryTime: string;
  exitTime: string | null;
  playbook?: string;
}

interface DayData {
  date: Date;
  trades: DayTrade[];
  totalPnl: number;
  winRate: number;
  tradesCount: number;
}

interface TradingCalendarProps {
  embedded?: boolean;
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
          selectedAccountId === "unassigned" ? null : selectedAccountId;
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
      const dateKey = format(new Date(trade.entryDate), "yyyy-MM-dd");
      const tradePnl = Number(trade.pnl ?? 0);
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
        entryTime: format(new Date(trade.entryDate), "HH:mm"),
        exitTime: trade.exitDate
          ? format(new Date(trade.exitDate), "HH:mm")
          : null,
      };

      if (data.has(dateKey)) {
        const existing = data.get(dateKey)!;
        existing.trades.push(dayTrade);
        existing.totalPnl += tradePnl;
        existing.tradesCount += 1;
        const wins = existing.trades.filter((item) => item.pnl > 0).length;
        existing.winRate = Math.round((wins / existing.tradesCount) * 100);
      } else {
        data.set(dateKey, {
          date: new Date(trade.entryDate),
          trades: [dayTrade],
          totalPnl: tradePnl,
          winRate: tradePnl > 0 ? 100 : 0,
          tradesCount: 1,
        });
      }
    });

    return data;
  }, [trades]);

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

  const handleDayClick = (day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayData = monthData.get(dateKey);
    if (dayData) {
      setSelectedDay(dayData);
      setIsDialogOpen(true);
    }
  };

  const getDayColor = (pnl: number) => {
    if (pnl > 0)
      return "border-[var(--profit-primary)]/30 bg-[var(--profit-bg)] text-[var(--profit-primary)]";
    if (pnl < 0)
      return "border-[var(--loss-primary)]/30 bg-[var(--loss-bg)] text-[var(--loss-primary)]";
    return "border-border bg-muted text-muted-foreground";
  };

  if (!authLoading && !isConfigured) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center",
          !embedded && "min-h-[60vh]",
        )}
      >
        <div className="surface max-w-md p-8 text-center border border-border rounded-xl">
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
        <div className="surface max-w-md p-8 text-center border border-border rounded-xl">
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
    <div className={cn("space-y-8", embedded && "space-y-6")}>
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          {!embedded && <p className="mb-1 text-label">Performance</p>}
          {embedded ? (
            <h2 className="headline-md">Trading Calendar</h2>
          ) : (
            <h1 className="headline-lg">Trading Calendar</h1>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="rounded-lg border border-border p-2 transition-colors hover:bg-accent text-accent-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[160px] text-center font-semibold text-foreground">
            {format(currentMonth, "MMMM yyyy")}
          </div>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="rounded-lg border border-border p-2 transition-colors hover:bg-accent text-accent-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="h-9 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
          >
            Today
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="surface p-5 text-center border border-border rounded-xl">
          <p className="mb-2 text-label">Monthly P&L</p>
          <p
            className={cn(
              "stat-large",
              monthlyStats.totalPnl >= 0
                ? "text-[var(--profit-primary)]"
                : "text-[var(--loss-primary)]",
            )}
          >
            {monthlyStats.totalPnl >= 0 ? "+" : ""}$
            {monthlyStats.totalPnl.toLocaleString()}
          </p>
        </div>
        <div className="surface p-5 text-center border border-border rounded-xl">
          <p className="mb-2 text-label">Total Trades</p>
          <p className="stat-large text-foreground">
            {monthlyStats.totalTrades}
          </p>
        </div>
        <div className="surface p-5 text-center border border-border rounded-xl">
          <p className="mb-2 text-label">Winning Days</p>
          <p className="stat-large text-[var(--profit-primary)]">
            {monthlyStats.winningDays}
          </p>
        </div>
        <div className="surface p-5 text-center border border-border rounded-xl">
          <p className="mb-2 text-label">Losing Days</p>
          <p className="stat-large text-[var(--loss-primary)]">
            {monthlyStats.losingDays}
          </p>
        </div>
        <div className="surface p-5 text-center border border-border rounded-xl">
          <p className="mb-2 text-label">Win Rate</p>
          <p className="stat-large text-foreground">{monthlyStats.winRate}%</p>
        </div>
      </section>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && (
        <section className="border border-border rounded-xl overflow-hidden bg-background shadow-sm">
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div
                key={day}
                className="py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-border border-l border-t border-border">
            {calendarDays.map((day, index) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayData = monthData.get(dateKey);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);
              const dayOfWeek = getDay(day);
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              return (
                <div
                  key={index}
                  onClick={() =>
                    isCurrentMonth && dayData && handleDayClick(day)
                  }
                  className={cn(
                    "min-h-[100px] p-2 transition-colors relative bg-background",
                    !isCurrentMonth && "bg-muted/10 opacity-40",
                    isCurrentMonth &&
                      dayData &&
                      "cursor-pointer hover:bg-accent/40",
                    isWeekend && isCurrentMonth && "bg-muted/5",
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                      isCurrentDay && "bg-[var(--accent-primary)] text-white",
                      !isCurrentDay &&
                        !isCurrentMonth &&
                        "text-muted-foreground",
                      !isCurrentDay && isCurrentMonth && "text-foreground",
                    )}
                  >
                    {format(day, "d")}
                  </div>

                  {dayData && isCurrentMonth && (
                    <div className="space-y-1">
                      <div
                        className={cn(
                          "rounded border px-2 py-1 text-sm font-bold",
                          getDayColor(dayData.totalPnl),
                        )}
                      >
                        {dayData.totalPnl >= 0 ? "+" : ""}$
                        {Math.abs(dayData.totalPnl).toFixed(0)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-0.5">
                          <Target className="h-3 w-3" />
                          {dayData.tradesCount}
                        </div>
                        <span aria-hidden="true">|</span>
                        <span>{dayData.winRate}%</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!loading && trades.length === 0 && (
        <div className="py-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          <p>
            No trades this month. Start logging trades to see them on your
            calendar!
          </p>
          <Link
            href="/trades"
            className="mt-2 inline-block text-[var(--accent-primary)] hover:underline"
          >
            Go to Trades -&gt;
          </Link>
        </div>
      )}

      <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border border-[var(--profit-primary)]/50 bg-[var(--profit-bg)]" />
          <span>Winning Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border border-[var(--loss-primary)]/50 bg-[var(--loss-bg)]" />
          <span>Losing Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border border-border bg-muted" />
          <span>No Trades</span>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl border-border bg-background sm:rounded-xl">
          {selectedDay && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <CalendarIcon className="h-5 w-5 text-[var(--accent-primary)]" />
                  {format(selectedDay.date, "EEEE, MMMM d, yyyy")}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="text-label">Total P&amp;L</div>
                  <div
                    className={cn(
                      "mt-1 text-xl font-bold",
                      selectedDay.totalPnl >= 0
                        ? "text-[var(--profit-primary)]"
                        : "text-[var(--loss-primary)]",
                    )}
                  >
                    {selectedDay.totalPnl >= 0 ? "+" : ""}$
                    {selectedDay.totalPnl.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="text-label">Trades</div>
                  <div className="mt-1 text-xl font-bold text-foreground">
                    {selectedDay.tradesCount}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="text-label">Win Rate</div>
                  <div className="mt-1 text-xl font-bold text-foreground">
                    {selectedDay.winRate}%
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Trades</h4>
                <div className="max-h-[300px] space-y-2 overflow-auto custom-scrollbar pr-2">
                  {selectedDay.trades.map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/10 p-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg border",
                            trade.pnl >= 0
                              ? "bg-[var(--profit-bg)] border-[var(--profit-primary)]/20 text-[var(--profit-primary)]"
                              : "bg-[var(--loss-bg)] border-[var(--loss-primary)]/20 text-[var(--loss-primary)]",
                          )}
                        >
                          {trade.pnl >= 0 ? (
                            <TrendingUp className="h-5 w-5" />
                          ) : (
                            <TrendingDown className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            {trade.symbol}
                            <span
                              className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                trade.direction === "LONG"
                                  ? "bg-[var(--profit-bg)] text-[var(--profit-primary)] border-[var(--profit-primary)]/20"
                                  : "bg-[var(--loss-bg)] text-[var(--loss-primary)] border-[var(--loss-primary)]/20",
                              )}
                            >
                              {trade.direction}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" />
                            {trade.entryTime}{" "}
                            {trade.exitTime ? `-> ${trade.exitTime}` : "(Open)"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={cn(
                            "mono font-bold",
                            trade.pnl >= 0
                              ? "text-[var(--profit-primary)]"
                              : "text-[var(--loss-primary)]",
                          )}
                        >
                          {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                        </div>
                        {trade.rMultiple !== null && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {trade.rMultiple >= 0 ? "+" : ""}
                            {trade.rMultiple.toFixed(1)}R
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
