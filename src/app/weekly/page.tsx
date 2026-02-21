"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  FileText,
  Save,
  Target,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getTradesByDateRange } from "@/lib/api/trades";
import { usePropAccount } from "@/components/prop-account-provider";
import { getCurrentWeekRange, formatWeekRange } from "@/lib/utils/date-range";
import { toDateString, formatCurrency, formatSignedCurrency } from "@/lib/utils/format";
import { getPnLColorClass } from "@/lib/utils/trade-colors";
import type { Trade } from "@/lib/supabase/types";

interface WeekStats {
  trades: number;
  winners: number;
  losers: number;
  winRate: number;
  netPnL: number;
  bestTrade: { symbol: string; pnl: number } | null;
  worstTrade: { symbol: string; pnl: number } | null;
}

function buildWeekStats(trades: Trade[]): WeekStats {
  const closed = trades.filter((t) => t.status === "closed");
  const winners = closed.filter((t) => (t.pnl ?? 0) > 0);
  const losers = closed.filter((t) => (t.pnl ?? 0) < 0);
  const netPnL = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const bestTrade =
    winners.length > 0
      ? winners.reduce((a, b) => ((a.pnl ?? 0) > (b.pnl ?? 0) ? a : b))
      : null;
  const worstTrade =
    losers.length > 0
      ? losers.reduce((a, b) => ((a.pnl ?? 0) < (b.pnl ?? 0) ? a : b))
      : null;
  return {
    trades: closed.length,
    winners: winners.length,
    losers: losers.length,
    winRate: closed.length > 0 ? (winners.length / closed.length) * 100 : 0,
    netPnL,
    bestTrade: bestTrade ? { symbol: bestTrade.symbol, pnl: bestTrade.pnl ?? 0 } : null,
    worstTrade: worstTrade ? { symbol: worstTrade.symbol, pnl: worstTrade.pnl ?? 0 } : null,
  };
}

export default function WeeklyAnalysisPage() {
  const { selectedAccountId } = usePropAccount();
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeklyPlan, setWeeklyPlan] = useState("");
  const [weeklyReview, setWeeklyReview] = useState("");
  const [lessonsLearned, setLessonsLearned] = useState("");
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(true);

  const { start: baseStart, end: baseEnd } = getCurrentWeekRange();
  const weekStart = new Date(baseStart);
  weekStart.setDate(baseStart.getDate() + weekOffset * 7);
  const weekEnd = new Date(baseEnd);
  weekEnd.setDate(baseEnd.getDate() + weekOffset * 7);
  const weekLabel = formatWeekRange(weekStart, weekEnd);

  const loadWeekData = useCallback(async () => {
    setLoading(true);
    try {
      const trades = await getTradesByDateRange(
        toDateString(weekStart),
        toDateString(weekEnd),
        selectedAccountId,
      );
      setStats(buildWeekStats(trades));
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset, selectedAccountId]);

  useEffect(() => {
    loadWeekData();
  }, [loadWeekData]);

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((o) => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-semibold">{weekLabel}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekOffset((o) => o + 1)}
            disabled={weekOffset >= 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Analysis
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Economic Calendar placeholder */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[var(--accent-primary)]" />
                <CardTitle>Economic Calendar — This Week</CardTitle>
              </div>
              <CardDescription>Key economic events and their market impact</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                Economic calendar integration coming soon.
              </div>
            </CardContent>
          </Card>

          {/* Weekly Notes */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[var(--accent-primary)]" />
                <CardTitle>Pre-Week Plan</CardTitle>
              </div>
              <CardDescription>Your trading plan for this week</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={weeklyPlan}
                onChange={(e) => setWeeklyPlan(e.target.value)}
                rows={5}
                className="resize-none"
                placeholder="What's your plan for this week?"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[var(--accent-primary)]" />
                <CardTitle>Weekly Review</CardTitle>
              </div>
              <CardDescription>Post-week reflection and analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={weeklyReview}
                onChange={(e) => setWeeklyReview(e.target.value)}
                rows={5}
                className="resize-none"
                placeholder="How did the week go?"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lessons Learned</CardTitle>
              <CardDescription>Key takeaways for improvement</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={lessonsLearned}
                onChange={(e) => setLessonsLearned(e.target.value)}
                rows={4}
                className="resize-none"
                placeholder="What did you learn this week?"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — Live Performance */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Weekly Performance</CardTitle>
              <CardDescription>Summary of this week&apos;s trading</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
              ) : !stats || stats.trades === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No closed trades this week.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">{stats.trades}</div>
                      <div className="text-xs text-muted-foreground">Total Trades</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/40 border border-border text-center">
                    <div className={cn("text-3xl font-bold", getPnLColorClass(stats.netPnL))}>
                      {formatSignedCurrency(stats.netPnL)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Net P&L</div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-[var(--profit-primary)]" />
                      <span className="text-sm">Winners</span>
                    </div>
                    <span className="font-medium text-[var(--profit-primary)]">{stats.winners}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-[var(--loss-primary)]" />
                      <span className="text-sm">Losers</span>
                    </div>
                    <span className="font-medium text-[var(--loss-primary)]">{stats.losers}</span>
                  </div>

                  {(stats.bestTrade || stats.worstTrade) && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        {stats.bestTrade && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Best Trade</span>
                            <span className="text-[var(--profit-primary)]">
                              {stats.bestTrade.symbol} (+{formatCurrency(stats.bestTrade.pnl)})
                            </span>
                          </div>
                        )}
                        {stats.worstTrade && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Worst Trade</span>
                            <span className="text-[var(--loss-primary)]">
                              {stats.worstTrade.symbol} ({formatCurrency(stats.worstTrade.pnl)})
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
