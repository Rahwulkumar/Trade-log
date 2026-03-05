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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getTradesByDateRange } from "@/lib/api/client/trades";
import { usePropAccount } from "@/components/prop-account-provider";
import { getCurrentWeekRange, formatWeekRange } from "@/lib/utils/date-range";
import {
  toDateString,
  formatCurrency,
  formatSignedCurrency,
} from "@/lib/utils/format";
import { getPnLColorClass } from "@/lib/utils/trade-colors";
import type { Trade } from "@/lib/db/schema";
import {
  AppPageHeader,
  AppPanel,
  PanelTitle,
} from "@/components/ui/page-primitives";

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
  const winners = closed.filter((t) => Number(t.pnl ?? 0) > 0);
  const losers = closed.filter((t) => Number(t.pnl ?? 0) < 0);
  const netPnL = closed.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0);
  const bestTrade =
    winners.length > 0
      ? winners.reduce((a, b) =>
          Number(a.pnl ?? 0) > Number(b.pnl ?? 0) ? a : b,
        )
      : null;
  const worstTrade =
    losers.length > 0
      ? losers.reduce((a, b) =>
          Number(a.pnl ?? 0) < Number(b.pnl ?? 0) ? a : b,
        )
      : null;
  return {
    trades: closed.length,
    winners: winners.length,
    losers: losers.length,
    winRate: closed.length > 0 ? (winners.length / closed.length) * 100 : 0,
    netPnL,
    bestTrade: bestTrade
      ? { symbol: bestTrade.symbol, pnl: Number(bestTrade.pnl ?? 0) }
      : null,
    worstTrade: worstTrade
      ? { symbol: worstTrade.symbol, pnl: Number(worstTrade.pnl ?? 0) }
      : null,
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
    <div className="page-root page-sections">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <AppPageHeader
        eyebrow="Journal"
        title="Weekly Analysis"
        description="Plan your week ahead and review your trading performance."
        icon={<Calendar size={18} strokeWidth={1.8} color="#fff" />}
        actions={
          <>
            {/* Week nav */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekOffset((o) => o - 1)}
              >
                <ChevronLeft size={14} />
              </Button>
              <span
                className="mono text-[13px] font-semibold px-3"
                style={{ color: "var(--text-primary)" }}
              >
                {weekLabel}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekOffset((o) => o + 1)}
                disabled={weekOffset >= 0}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
            <Button>
              <Save size={13} strokeWidth={2} />
              Save Analysis
            </Button>
          </>
        }
      />

      {/* ── Body grid ────────────────────────────────────────────────── */}
      <div className="stagger-2 grid gap-5 lg:grid-cols-3">
        {/* Left col — notes */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Economic calendar */}
          <AppPanel>
            <PanelTitle
              title="Economic Calendar — This Week"
              subtitle="Key macro events and their expected market impact"
            />
            <div
              className="flex items-center gap-2 mb-4"
              style={{ color: "var(--accent-primary)" }}
            >
              <AlertCircle size={15} />
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Upcoming
              </span>
            </div>
            <div
              className="flex items-center justify-center py-8 text-[13px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Economic calendar integration coming soon.
            </div>
          </AppPanel>

          {/* Pre-week plan */}
          <AppPanel>
            <PanelTitle
              title="Pre-Week Plan"
              subtitle="Your trading plan and bias going into the week"
            />
            <div
              className="flex items-center gap-2 mb-3"
              style={{ color: "var(--accent-primary)" }}
            >
              <Target size={15} />
            </div>
            <Textarea
              value={weeklyPlan}
              onChange={(e) => setWeeklyPlan(e.target.value)}
              rows={5}
              className="resize-none text-[13px]"
              placeholder="What's your trade plan for this week? Key levels, biases, news events to watch…"
            />
          </AppPanel>

          {/* Weekly review */}
          <AppPanel>
            <PanelTitle
              title="Weekly Review"
              subtitle="Post-week reflection — what worked and what didn't"
            />
            <div
              className="flex items-center gap-2 mb-3"
              style={{ color: "var(--accent-primary)" }}
            >
              <FileText size={15} />
            </div>
            <Textarea
              value={weeklyReview}
              onChange={(e) => setWeeklyReview(e.target.value)}
              rows={5}
              className="resize-none text-[13px]"
              placeholder="How did the week unfold vs your plan?"
            />
          </AppPanel>

          {/* Lessons learned */}
          <AppPanel>
            <PanelTitle
              title="Lessons Learned"
              subtitle="Key takeaways to carry into next week"
            />
            <Textarea
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
              rows={4}
              className="resize-none text-[13px]"
              placeholder="What do you want to remember and improve on?"
            />
          </AppPanel>
        </div>

        {/* Right col — live performance sidebar */}
        <div>
          <AppPanel>
            <PanelTitle
              title="Weekly Performance"
              subtitle="Live summary of this week's closed trades"
            />

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-10 rounded-lg" />
                ))}
              </div>
            ) : !stats || stats.trades === 0 ? (
              <p
                className="text-[13px] py-6 text-center"
                style={{ color: "var(--text-tertiary)" }}
              >
                No closed trades this week.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Trades + Win Rate */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-[var(--radius-md)] p-3 text-center"
                    style={{ background: "var(--surface-elevated)" }}
                  >
                    <p
                      className="mono text-[1.4rem] font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {stats.trades}
                    </p>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Total Trades
                    </p>
                  </div>
                  <div
                    className="rounded-[var(--radius-md)] p-3 text-center"
                    style={{ background: "var(--surface-elevated)" }}
                  >
                    <p
                      className="mono text-[1.4rem] font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {stats.winRate.toFixed(1)}%
                    </p>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Win Rate
                    </p>
                  </div>
                </div>

                {/* Net P&L hero */}
                <div
                  className="rounded-[var(--radius-md)] p-4 text-center"
                  style={{
                    background:
                      stats.netPnL >= 0 ? "var(--profit-bg)" : "var(--loss-bg)",
                    border: `1px solid ${stats.netPnL >= 0 ? "var(--profit-primary)" : "var(--loss-primary)"}22`,
                  }}
                >
                  <p
                    className={cn(
                      "mono text-[2rem] font-bold leading-none",
                      getPnLColorClass(stats.netPnL),
                    )}
                  >
                    {formatSignedCurrency(stats.netPnL)}
                  </p>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider mt-1.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Net P&L
                  </p>
                </div>

                {/* Winners / Losers */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp
                        size={14}
                        style={{ color: "var(--profit-primary)" }}
                      />
                      <span
                        className="text-[13px]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Winners
                      </span>
                    </div>
                    <span
                      className="mono text-[13px] font-semibold"
                      style={{ color: "var(--profit-primary)" }}
                    >
                      {stats.winners}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown
                        size={14}
                        style={{ color: "var(--loss-primary)" }}
                      />
                      <span
                        className="text-[13px]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Losers
                      </span>
                    </div>
                    <span
                      className="mono text-[13px] font-semibold"
                      style={{ color: "var(--loss-primary)" }}
                    >
                      {stats.losers}
                    </span>
                  </div>
                </div>

                {/* Best / Worst */}
                {(stats.bestTrade || stats.worstTrade) && (
                  <div
                    className="pt-3 flex flex-col gap-2"
                    style={{ borderTop: "1px solid var(--border-default)" }}
                  >
                    {stats.bestTrade && (
                      <div className="flex justify-between text-[12px]">
                        <span style={{ color: "var(--text-tertiary)" }}>
                          Best Trade
                        </span>
                        <span
                          className="mono font-semibold"
                          style={{ color: "var(--profit-primary)" }}
                        >
                          {stats.bestTrade.symbol} (+
                          {formatCurrency(stats.bestTrade.pnl)})
                        </span>
                      </div>
                    )}
                    {stats.worstTrade && (
                      <div className="flex justify-between text-[12px]">
                        <span style={{ color: "var(--text-tertiary)" }}>
                          Worst Trade
                        </span>
                        <span
                          className="mono font-semibold"
                          style={{ color: "var(--loss-primary)" }}
                        >
                          {stats.worstTrade.symbol} (
                          {formatCurrency(stats.worstTrade.pnl)})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </AppPanel>
        </div>
      </div>
    </div>
  );
}
