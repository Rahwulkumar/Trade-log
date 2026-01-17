"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Clock,
  Target,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  getDay,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { useAuth } from "@/components/auth-provider";
import { usePropAccount } from "@/components/prop-account-provider";
import { getTradesByDateRange } from "@/lib/api/trades";
import type { Trade } from "@/lib/supabase/types";

// Types
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

export function TradingCalendar() {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const { selectedAccountId } = usePropAccount();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Load trades for the current month
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
        
        // Apply global prop account filter
        const propAccountIdFilter = selectedAccountId === "unassigned" ? "unassigned" : selectedAccountId;
        
        const tradesData = await getTradesByDateRange(start, end, propAccountIdFilter);
        setTrades(tradesData);
      } catch (err) {
        console.error("Failed to load trades for calendar:", err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadTrades();
    }
  }, [user, isConfigured, authLoading, currentMonth, selectedAccountId]);

  // Process trades into day data
  const monthData = useMemo(() => {
    const data = new Map<string, DayData>();
    
    trades.forEach(trade => {
      const dateKey = format(new Date(trade.entry_date), "yyyy-MM-dd");
      
      const dayTrade: DayTrade = {
        id: trade.id,
        symbol: trade.symbol,
        direction: trade.direction,
        pnl: trade.pnl,
        rMultiple: trade.r_multiple,
        entryTime: format(new Date(trade.entry_date), "HH:mm"),
        exitTime: trade.exit_date ? format(new Date(trade.exit_date), "HH:mm") : null,
      };

      if (data.has(dateKey)) {
        const existing = data.get(dateKey)!;
        existing.trades.push(dayTrade);
        existing.totalPnl += trade.pnl;
        existing.tradesCount++;
        const wins = existing.trades.filter(t => t.pnl > 0).length;
        existing.winRate = Math.round((wins / existing.tradesCount) * 100);
      } else {
        data.set(dateKey, {
          date: new Date(trade.entry_date),
          trades: [dayTrade],
          totalPnl: trade.pnl,
          winRate: trade.pnl > 0 ? 100 : 0,
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

    monthData.forEach(day => {
      totalPnl += day.totalPnl;
      totalTrades += day.tradesCount;
      tradingDays++;
      if (day.totalPnl > 0) winningDays++;
      if (day.totalPnl < 0) losingDays++;
    });

    return {
      totalPnl: Math.round(totalPnl * 100) / 100,
      totalTrades,
      winningDays,
      losingDays,
      tradingDays,
      winRate: tradingDays > 0 ? Math.round((winningDays / tradingDays) * 100) : 0,
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
    if (pnl > 0) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (pnl < 0) return "bg-red-500/20 text-red-400 border-red-500/30";
    return "bg-white/5 text-muted-foreground";
  };

  // Auth checks
  if (!authLoading && !isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="card-void p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Supabase Not Configured</h2>
          <p className="text-muted-foreground">Please add your Supabase credentials.</p>
        </div>
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="card-void p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-4">Please sign in to view your calendar.</p>
          <a href="/auth/login" className="btn-glow">Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-label mb-1">Performance</p>
          <h1 className="headline-lg">Trading Calendar</h1>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[160px] text-center font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </div>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="btn-void text-sm"
          >
            Today
          </button>
        </div>
      </section>

      {/* Monthly Stats */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card-void p-5 text-center">
          <p className="text-label mb-2">Monthly P&L</p>
          <p className={cn("stat-large", monthlyStats.totalPnl >= 0 ? "profit" : "loss")}>
            {monthlyStats.totalPnl >= 0 ? "+" : ""}${monthlyStats.totalPnl.toLocaleString()}
          </p>
        </div>
        <div className="card-void p-5 text-center">
          <p className="text-label mb-2">Total Trades</p>
          <p className="stat-large">{monthlyStats.totalTrades}</p>
        </div>
        <div className="card-void p-5 text-center">
          <p className="text-label mb-2">Winning Days</p>
          <p className="stat-large profit">{monthlyStats.winningDays}</p>
        </div>
        <div className="card-void p-5 text-center">
          <p className="text-label mb-2">Losing Days</p>
          <p className="stat-large loss">{monthlyStats.losingDays}</p>
        </div>
        <div className="card-void p-5 text-center">
          <p className="text-label mb-2">Win Rate</p>
          <p className="stat-large">{monthlyStats.winRate}%</p>
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Calendar Grid */}
      {!loading && (
        <section className="card-void overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.02]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
              <div
                key={day}
                className="py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
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
                  onClick={() => isCurrentMonth && dayData && handleDayClick(day)}
                  className={cn(
                    "min-h-[100px] p-2 border-b border-r border-white/5 transition-colors",
                    !isCurrentMonth && "bg-white/[0.01] opacity-40",
                    isCurrentMonth && dayData && "cursor-pointer hover:bg-white/[0.03]",
                    isWeekend && isCurrentMonth && "bg-white/[0.01]"
                  )}
                >
                  {/* Day Number */}
                  <div className={cn(
                    "inline-flex items-center justify-center h-7 w-7 rounded-full text-sm font-medium mb-1",
                    isCurrentDay && "bg-blue-500 text-white",
                    !isCurrentDay && !isCurrentMonth && "text-muted-foreground"
                  )}>
                    {format(day, "d")}
                  </div>

                  {/* Trade Summary */}
                  {dayData && isCurrentMonth && (
                    <div className="space-y-1">
                      <div className={cn(
                        "text-sm font-bold px-2 py-1 rounded border",
                        getDayColor(dayData.totalPnl)
                      )}>
                        {dayData.totalPnl >= 0 ? "+" : ""}
                        ${Math.abs(dayData.totalPnl).toFixed(0)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-0.5">
                          <Target className="h-3 w-3" />
                          {dayData.tradesCount}
                        </div>
                        <span>•</span>
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

      {/* Empty State */}
      {!loading && trades.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No trades this month. Start logging trades to see them on your calendar!</p>
          <a href="/trades" className="text-cyan-400 hover:underline mt-2 inline-block">
            Go to Trades →
          </a>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-green-500/30 border border-green-500/50" />
          <span>Winning Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-red-500/30 border border-red-500/50" />
          <span>Losing Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-white/5 border border-white/10" />
          <span>No Trades</span>
        </div>
      </div>

      {/* Day Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-void-surface border-white/10">
          {selectedDay && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-blue-400" />
                  {format(selectedDay.date, "EEEE, MMMM d, yyyy")}
                </DialogTitle>
              </DialogHeader>

              {/* Day Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="text-label">Total P&L</div>
                  <div className={cn(
                    "text-xl font-bold mt-1",
                    selectedDay.totalPnl >= 0 ? "profit" : "loss"
                  )}>
                    {selectedDay.totalPnl >= 0 ? "+" : ""}${selectedDay.totalPnl.toFixed(2)}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="text-label">Trades</div>
                  <div className="text-xl font-bold mt-1">{selectedDay.tradesCount}</div>
                </div>
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="text-label">Win Rate</div>
                  <div className="text-xl font-bold mt-1">{selectedDay.winRate}%</div>
                </div>
              </div>

              {/* Trades List */}
              <div className="space-y-3">
                <h4 className="font-semibold">Trades</h4>
                <div className="space-y-2 max-h-[300px] overflow-auto">
                  {selectedDay.trades.map(trade => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center",
                          trade.pnl >= 0 ? "bg-green-500/10" : "bg-red-500/10"
                        )}>
                          {trade.pnl >= 0 ? (
                            <TrendingUp className="h-5 w-5 text-green-500" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {trade.symbol}
                            <span className={cn(
                              "badge-void text-[10px]",
                              trade.direction === "LONG" ? "badge-profit" : "badge-loss"
                            )}>
                              {trade.direction}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {trade.entryTime} {trade.exitTime ? `→ ${trade.exitTime}` : "(Open)"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "font-bold mono",
                          trade.pnl >= 0 ? "profit" : "loss"
                        )}>
                          {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                        </div>
                        {trade.rMultiple !== null && (
                          <div className="text-xs text-muted-foreground">
                            {trade.rMultiple >= 0 ? "+" : ""}{trade.rMultiple.toFixed(1)}R
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
