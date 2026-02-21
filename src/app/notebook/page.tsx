"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Trade,
  TradeScreenshot,
  ChartCandle,
  Playbook,
} from "@/lib/supabase/types";
import { Loader2, BookOpen } from "lucide-react";
import NextImage from "next/image";
import { useAuth } from "@/components/auth-provider";
import { PsychologyWidget } from "@/components/journal/psychology-widget";
import { ScreenshotGallery } from "@/components/journal/screenshot-gallery";
import { TradeChart } from "@/components/trade/trade-chart";
import { BiasWidget } from "@/components/journal/bias-widget";
import { ExecutionWidget } from "@/components/journal/execution-widget";
import { StrategyPlaybookModule } from "@/components/journal/strategy-playbook-module";
import { MaeMfeCard } from "@/components/journal/mae-mfe-card";
import { TagSelector } from "@/components/journal/tag-selector";
import { ConvictionStars } from "@/components/journal/conviction-stars";
import { QualityRating } from "@/components/journal/quality-rating";
import { SessionSelect } from "@/components/journal/session-select";
import { uploadTradeScreenshot, getScreenshotUrl } from "@/lib/api/storage";
import { getPlaybooks } from "@/lib/api/playbooks";
import { cn } from "@/lib/utils";
import { format, intervalToDuration } from "date-fns";
import { getPnLColorClass } from "@/lib/utils/trade-colors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EnrichedTrade } from "@/domain/trade-types";

type Timeframe = "4H" | "1H" | "15M" | "Execution" | "1m" | "5m";
type OutcomeFilter = "all" | "wins" | "losses" | "open";

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatPrice(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  });
}

function tradeDuration(entry: string, exit: string | null | undefined) {
  if (!exit) return null;
  try {
    const dur = intervalToDuration({
      start: new Date(entry),
      end: new Date(exit),
    });
    const parts: string[] = [];
    if (dur.hours) parts.push(`${dur.hours}h`);
    if (dur.minutes) parts.push(`${dur.minutes}m`);
    if (!parts.length && dur.seconds) parts.push(`${dur.seconds}s`);
    return parts.join(" ") || "< 1m";
  } catch {
    return null;
  }
}

function OutcomeBadge({ pnl }: { pnl: number | null }) {
  const v = pnl ?? 0;
  if (v > 0)
    return (
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
        style={{
          background: "var(--profit-bg)",
          color: "var(--profit-primary)",
        }}
      >
        WIN
      </span>
    );
  if (v < 0)
    return (
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
        style={{ background: "var(--loss-bg)", color: "var(--loss-primary)" }}
      >
        LOSS
      </span>
    );
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
      style={{
        background: "var(--surface-elevated)",
        color: "var(--text-tertiary)",
      }}
    >
      BE
    </span>
  );
}

// ─── Hero Card ───────────────────────────────────────────────────────────────
function HeroCard({
  trade,
  onUpdate,
}: {
  trade: Trade;
  onUpdate: (f: keyof Trade, v: Trade[keyof Trade]) => void;
}) {
  const dur = tradeDuration(trade.entry_date, trade.exit_date);

  return (
    <div className="surface p-5 flex flex-col gap-3">
      {/* Row 1: Symbol + direction + outcome + PnL */}
      <div className="flex items-center gap-3">
        <h2
          className="text-2xl font-black tracking-tight"
          style={{
            fontFamily: "var(--font-syne)",
            color: "var(--text-primary)",
          }}
        >
          {trade.symbol}
        </h2>
        <span
          className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider"
          style={
            trade.direction === "LONG"
              ? {
                  background: "var(--profit-bg)",
                  color: "var(--profit-primary)",
                }
              : { background: "var(--loss-bg)", color: "var(--loss-primary)" }
          }
        >
          {trade.direction}
        </span>
        <OutcomeBadge pnl={trade.pnl} />
        <div className="ml-auto">
          <span
            className={cn(
              "text-2xl font-bold font-mono",
              getPnLColorClass(trade.pnl),
            )}
          >
            {(trade.pnl || 0) >= 0 ? "+" : ""}
            {(trade.pnl || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Row 2: Grade + R-multiple + session + duration */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          {["A+", "A", "B", "C", "D"].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() =>
                onUpdate(
                  "execution_grade",
                  trade.execution_grade === g ? null : g,
                )
              }
              className="text-[11px] font-bold px-2 py-0.5 rounded-md transition-all duration-150"
              style={
                trade.execution_grade === g
                  ? { background: "var(--accent-primary)", color: "#04100a" }
                  : {
                      background: "var(--surface-elevated)",
                      color: "var(--text-tertiary)",
                      border: "1px solid var(--border-default)",
                    }
              }
            >
              {g}
            </button>
          ))}
        </div>

        {trade.r_multiple != null && (
          <span
            className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md"
            style={
              trade.r_multiple >= 0
                ? {
                    background: "var(--profit-bg)",
                    color: "var(--profit-primary)",
                  }
                : { background: "var(--loss-bg)", color: "var(--loss-primary)" }
            }
          >
            {trade.r_multiple >= 0 ? "+" : ""}
            {trade.r_multiple.toFixed(2)}R
          </span>
        )}

        <SessionSelect
          value={trade.session ?? null}
          onChange={(v) => onUpdate("session", v)}
        />

        {dur && (
          <span
            className="text-[11px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {dur}
          </span>
        )}
      </div>

      {/* Row 3: Dates + conviction stars */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {format(new Date(trade.entry_date), "MMM d, yyyy · HH:mm")}
          </span>
          {trade.exit_date && (
            <>
              <span
                className="text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                →
              </span>
              <span
                className="text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {format(new Date(trade.exit_date), "HH:mm")}
              </span>
            </>
          )}
        </div>
        <ConvictionStars
          value={trade.conviction ?? null}
          onChange={(v) => onUpdate("conviction", v)}
        />
      </div>
    </div>
  );
}

// ─── Metrics Card ─────────────────────────────────────────────────────────────
function MetricRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss";
}) {
  return (
    <div
      className="flex items-center justify-between py-2"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <span
        className="text-[13px] font-medium font-mono"
        style={
          tone === "profit"
            ? { color: "var(--profit-primary)" }
            : tone === "loss"
              ? { color: "var(--loss-primary)" }
              : { color: "var(--text-primary)" }
        }
      >
        {value}
      </span>
    </div>
  );
}

function MetricsCard({ trade }: { trade: Trade }) {
  return (
    <div className="surface p-4">
      <div className="flex items-center gap-3 mb-3">
        <span
          className="text-[10px] uppercase tracking-[0.18em] font-semibold"
          style={{ color: "var(--text-tertiary)" }}
        >
          Trade Metrics
        </span>
        <div
          className="h-px flex-1"
          style={{ background: "var(--border-default)" }}
        />
      </div>
      <MetricRow label="Entry Price" value={formatPrice(trade.entry_price)} />
      <MetricRow label="Exit Price" value={formatPrice(trade.exit_price)} />
      <MetricRow label="Stop Loss" value={formatPrice(trade.stop_loss)} />
      <MetricRow label="Take Profit" value={formatPrice(trade.take_profit)} />
      <MetricRow
        label="Position Size"
        value={trade.position_size ? `${trade.position_size} lots` : "—"}
      />
      <MetricRow
        label="R-Multiple"
        value={
          trade.r_multiple != null ? `${trade.r_multiple.toFixed(2)}R` : "—"
        }
        tone={
          trade.r_multiple != null
            ? trade.r_multiple >= 0
              ? "profit"
              : "loss"
            : undefined
        }
      />
      <MetricRow
        label="Commission"
        value={trade.commission != null ? `$${trade.commission}` : "—"}
      />
      <MetricRow
        label="Swap"
        value={trade.swap != null ? `$${trade.swap}` : "—"}
      />
    </div>
  );
}

// ─── Analysis Card ────────────────────────────────────────────────────────────
function AnalysisCard({
  trade,
  playbooks,
  onUpdate,
  onScreenshotUpload,
  onViewFullscreen,
  onPlaybooksRefetch,
}: {
  trade: Trade;
  playbooks: Playbook[];
  onUpdate: (f: keyof Trade, v: Trade[keyof Trade]) => void;
  onScreenshotUpload: (file: File, tf: Timeframe) => Promise<void>;
  onViewFullscreen: (url: string) => void;
  onPlaybooksRefetch: () => Promise<void>;
}) {
  const screenshots = (trade.screenshots as unknown as TradeScreenshot[]) || [];

  const triggerFileUpload = (tf: Timeframe) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) onScreenshotUpload(file, tf);
    };
    input.click();
  };

  return (
    <div className="surface overflow-hidden">
      <Tabs defaultValue="setup">
        <TabsList
          className="w-full justify-start gap-0 bg-transparent rounded-none h-auto p-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          {(
            ["Setup", "Execution", "Mindset", "Review", "Evidence"] as const
          ).map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab.toLowerCase()}
              className="rounded-none px-4 py-3 text-[11px] font-semibold uppercase tracking-wider border-b-2 border-transparent data-[state=active]:border-[var(--accent-primary)] data-[state=active]:text-[var(--accent-primary)] transition-all duration-150"
              style={{ color: "var(--text-tertiary)" }}
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Setup: Multi-timeframe bias + playbook */}
        <TabsContent value="setup" className="p-5 space-y-6 mt-0">
          <BiasWidget
            trade={trade as unknown as EnrichedTrade}
            onUpdate={(field, value) => onUpdate(field as keyof Trade, value as Trade[keyof Trade])}
          />
          <div
            className="h-px"
            style={{ background: "var(--border-subtle)" }}
          />
          <StrategyPlaybookModule
            playbooks={playbooks}
            selectedPlaybookId={trade.playbook_id ?? null}
            checkedRules={(trade.checked_rules as string[]) ?? []}
            onPlaybookChange={(v) => onUpdate("playbook_id", v)}
            onCheckedRulesChange={(v) =>
              onUpdate("checked_rules", v as Trade["checked_rules"])
            }
            onPlaybooksRefetch={onPlaybooksRefetch}
          />
        </TabsContent>

        {/* Execution: confluences + trigger notes */}
        <TabsContent value="execution" className="p-5 mt-0">
          <ExecutionWidget
            executionNotes={(trade.execution_notes as string) ?? ""}
            executionArrays={(trade.execution_arrays as string[]) ?? []}
            positionSize={trade.position_size ?? null}
            rMultiple={trade.r_multiple ?? null}
            commission={trade.commission ?? null}
            swap={trade.swap ?? null}
            screenshots={screenshots}
            onExecutionNotesChange={(v) => onUpdate("execution_notes", v)}
            onExecutionArraysChange={(v) =>
              onUpdate("execution_arrays", v as Trade["execution_arrays"])
            }
            onScreenshotUpload={(tf) => triggerFileUpload(tf as Timeframe)}
            onViewFullscreen={onViewFullscreen}
          />
        </TabsContent>

        {/* Mindset: conviction + mistake tags + psychology */}
        <TabsContent value="mindset" className="p-5 space-y-6 mt-0">
          <div className="flex flex-col gap-2">
            <span
              className="text-[10px] uppercase tracking-[0.18em] font-semibold"
              style={{ color: "var(--text-tertiary)" }}
            >
              Conviction at Entry
            </span>
            <ConvictionStars
              value={trade.conviction ?? null}
              onChange={(v) => onUpdate("conviction", v)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span
              className="text-[10px] uppercase tracking-[0.18em] font-semibold"
              style={{ color: "var(--text-tertiary)" }}
            >
              Mistake Tags
            </span>
            <TagSelector
              type="mistake"
              value={(trade.mistake_tags as string[]) ?? []}
              onChange={(v) =>
                onUpdate("mistake_tags", v as Trade["mistake_tags"])
              }
            />
          </div>
          <PsychologyWidget
            feelings={(trade.feelings as string) ?? ""}
            observations={(trade.observations as string) ?? ""}
            onFeelingsChange={(v) => onUpdate("feelings", v)}
            onObservationsChange={(v) => onUpdate("observations", v)}
          />
        </TabsContent>

        {/* Review: quality ratings + setup tags + lesson + would-take-again */}
        <TabsContent value="review" className="p-5 space-y-5 mt-0">
          <div className="flex flex-col gap-3">
            <span
              className="text-[10px] uppercase tracking-[0.18em] font-semibold"
              style={{ color: "var(--text-tertiary)" }}
            >
              Execution Quality
            </span>
            <QualityRating
              label="Entry"
              value={
                (trade.entry_rating as "Good" | "Neutral" | "Poor") ?? null
              }
              onChange={(v) => onUpdate("entry_rating", v)}
            />
            <QualityRating
              label="Exit"
              value={(trade.exit_rating as "Good" | "Neutral" | "Poor") ?? null}
              onChange={(v) => onUpdate("exit_rating", v)}
            />
            <QualityRating
              label="Management"
              value={
                (trade.management_rating as "Good" | "Neutral" | "Poor") ?? null
              }
              onChange={(v) => onUpdate("management_rating", v)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span
              className="text-[10px] uppercase tracking-[0.18em] font-semibold"
              style={{ color: "var(--text-tertiary)" }}
            >
              Setup Tags
            </span>
            <TagSelector
              type="setup"
              value={(trade.setup_tags as string[]) ?? []}
              onChange={(v) => onUpdate("setup_tags", v as Trade["setup_tags"])}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span
              className="text-[10px] uppercase tracking-[0.18em] font-semibold"
              style={{ color: "var(--text-tertiary)" }}
            >
              Lesson Learned
            </span>
            <textarea
              value={(trade.lesson_learned as string) ?? ""}
              onChange={(e) => onUpdate("lesson_learned", e.target.value)}
              placeholder="What did this trade teach you?"
              className="w-full h-20 rounded-[var(--radius-default)] p-2.5 text-[12px] resize-none focus:outline-none leading-relaxed border transition-colors duration-150 focus:border-[var(--accent-primary)]"
              style={{
                background: "var(--surface-elevated)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span
              className="text-[12px] font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Would you take this trade again?
            </span>
            <div className="flex items-center gap-1.5">
              {([true, false] as const).map((val) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() =>
                    onUpdate(
                      "would_take_again",
                      trade.would_take_again === val ? null : val,
                    )
                  }
                  className="text-[11px] font-semibold px-3 py-1 rounded-[var(--radius-default)] transition-all duration-150"
                  style={
                    trade.would_take_again === val
                      ? {
                          background: val
                            ? "var(--profit-bg)"
                            : "var(--loss-bg)",
                          color: val
                            ? "var(--profit-primary)"
                            : "var(--loss-primary)",
                          border: `1px solid ${val ? "var(--profit-primary)" : "var(--loss-primary)"}`,
                        }
                      : {
                          background: "transparent",
                          color: "var(--text-tertiary)",
                          border: "1px solid var(--border-default)",
                        }
                  }
                >
                  {val ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Evidence: full screenshot gallery */}
        <TabsContent value="evidence" className="p-5 mt-0">
          <ScreenshotGallery
            screenshots={screenshots}
            onUpload={(tf: Timeframe) => triggerFileUpload(tf)}
            onViewFullscreen={onViewFullscreen}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NotebookPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [symbolFilter, setSymbolFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");
  const [chartCandles, setChartCandles] = useState<ChartCandle[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartRateLimited, setChartRateLimited] = useState(false);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(
    null,
  );

  const fetchTrades = useCallback(async () => {
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("entry_date", { ascending: false });
    if (error) throw error;
    return data || [];
  }, [supabase]);

  const fetchPlaybooksData = useCallback(async () => {
    try {
      const data = await getPlaybooks();
      setPlaybooks(data);
    } catch (e) {
      console.error("Failed to fetch playbooks", e);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [tradeData] = await Promise.all([
          fetchTrades(),
          fetchPlaybooksData(),
        ]);
        setTrades(tradeData);
        if (tradeData.length > 0) setSelectedTradeId(tradeData[0].id);
      } catch (e) {
        console.error("Init failed", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const symbols = useMemo(() => {
    const set = new Set(trades.map((t) => t.symbol));
    return Array.from(set).sort();
  }, [trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (symbolFilter !== "all" && t.symbol !== symbolFilter) return false;
      if (outcomeFilter === "wins" && (t.pnl ?? 0) <= 0) return false;
      if (outcomeFilter === "losses" && (t.pnl ?? 0) >= 0) return false;
      if (outcomeFilter === "open" && t.exit_date) return false;
      return true;
    });
  }, [trades, symbolFilter, outcomeFilter]);

  const tradesByDate = useMemo(() => {
    const groups: Record<string, Trade[]> = {};
    filteredTrades.forEach((t) => {
      const key = t.entry_date.slice(0, 10);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredTrades]);

  const selectedTrade = useMemo(
    () => trades.find((t) => t.id === selectedTradeId),
    [trades, selectedTradeId],
  );

  const updateTradeField = useCallback(
    async (field: keyof Trade, value: Trade[keyof Trade]) => {
      if (!selectedTradeId) return;
      setTrades((prev) =>
        prev.map((t) =>
          t.id === selectedTradeId ? { ...t, [field]: value } : t,
        ),
      );
      try {
        await supabase
          .from("trades")
          .update({ [field]: value })
          .eq("id", selectedTradeId);
      } catch (e) {
        console.error("Failed to update trade", e);
      }
    },
    [selectedTradeId, supabase],
  );

  const loadChartData = useCallback(async () => {
    if (!selectedTrade?.exit_date) return;
    setChartLoading(true);
    setChartError(null);
    setChartRateLimited(false);
    try {
      const response = await fetch("/api/trades/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradeId: selectedTrade.id,
          symbol: selectedTrade.symbol,
          entryTime: selectedTrade.entry_date,
          exitTime: selectedTrade.exit_date,
        }),
      });
      const result = await response.json();
      if (result.rateLimited) setChartRateLimited(true);
      else if (result.error) setChartError(result.error);
      else {
        const mapped = (result.candles || []).map(
          (c: Record<string, unknown>) => ({
            ...c,
            symbol: selectedTrade.symbol,
            datetime:
              c.datetime ||
              new Date(((c.time as number) || 0) * 1000).toISOString(),
          }),
        );
        setChartCandles(mapped);
      }
    } catch {
      setChartError("Failed to load chart data");
    } finally {
      setChartLoading(false);
    }
  }, [selectedTrade]);

  useEffect(() => {
    if (!selectedTrade) return;
    const chartData = selectedTrade.chart_data as {
      candles?: Record<string, unknown>[];
    } | null;
    if (chartData?.candles) {
      const mapped = chartData.candles.map((c) => ({
        ...c,
        symbol: selectedTrade.symbol,
        datetime:
          c.datetime ||
          new Date(((c.time as number) || 0) * 1000).toISOString(),
      }));
      setChartCandles(mapped as ChartCandle[]);
    } else {
      setChartCandles([]);
      if (selectedTrade.exit_date) loadChartData();
    }
  }, [selectedTrade?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScreenshotUpload = async (file: File, timeframe: Timeframe) => {
    if (!selectedTrade || !user) return;
    try {
      const path = await uploadTradeScreenshot(file, user.id);
      const url = getScreenshotUrl(path);
      const newShot = {
        url,
        timeframe,
        timestamp: new Date().toISOString(),
      } as unknown as TradeScreenshot;
      const current = (selectedTrade.screenshots ||
        []) as unknown as TradeScreenshot[];
      await updateTradeField("screenshots", [
        ...current,
        newShot,
      ] as unknown as Trade["screenshots"]);
    } catch (e) {
      console.error("Failed to upload screenshot", e);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="h-7 w-7 animate-spin"
            style={{ color: "var(--accent-primary)" }}
          />
          <span
            className="text-[10px] uppercase tracking-[0.3em] font-bold"
            style={{ color: "var(--text-tertiary)" }}
          >
            Loading Journal...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden">
      {/* ── LEFT PANEL (260px, hidden on mobile) ── */}
      <div
        className="hidden md:flex w-[260px] shrink-0 flex-col overflow-hidden"
        style={{
          borderRight: "1px solid var(--border-subtle)",
          background: "var(--surface)",
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 shrink-0 flex items-center gap-2"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <BookOpen
            className="w-4 h-4 shrink-0"
            style={{ color: "var(--accent-primary)" }}
          />
          <span
            className="font-bold tracking-tight"
            style={{
              fontFamily: "var(--font-syne)",
              color: "var(--text-primary)",
              fontSize: "0.95rem",
            }}
          >
            Journal
          </span>
          <span
            className="ml-auto text-[11px] font-mono"
            style={{ color: "var(--text-tertiary)" }}
          >
            {filteredTrades.length}
          </span>
        </div>

        {/* Outcome filter */}
        <div
          className="flex px-3 py-2 gap-1 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          {(["all", "wins", "losses", "open"] as OutcomeFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setOutcomeFilter(f)}
              className="flex-1 text-[10px] font-semibold uppercase py-1 rounded-md transition-all duration-150"
              style={
                outcomeFilter === f
                  ? { background: "var(--accent-primary)", color: "#04100a" }
                  : { background: "transparent", color: "var(--text-tertiary)" }
              }
            >
              {f}
            </button>
          ))}
        </div>

        {/* Symbol chips */}
        <div
          className="flex gap-1.5 px-3 py-2 overflow-x-auto shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          {["all", ...symbols].map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => setSymbolFilter(sym)}
              className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all duration-150"
              style={
                symbolFilter === sym
                  ? {
                      background: "var(--accent-soft)",
                      color: "var(--accent-primary)",
                      border: "1px solid var(--accent-primary)",
                    }
                  : {
                      background: "var(--surface-elevated)",
                      color: "var(--text-tertiary)",
                      border: "1px solid var(--border-default)",
                    }
              }
            >
              {sym === "all" ? "All" : sym}
            </button>
          ))}
        </div>

        {/* Trade list */}
        <ScrollArea className="flex-1">
          {tradesByDate.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <span
                className="text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                No trades found
              </span>
            </div>
          ) : (
            tradesByDate.map(([dateKey, dayTrades]) => {
              const dayTotal = dayTrades.reduce((s, t) => s + (t.pnl || 0), 0);
              return (
                <div key={dateKey}>
                  <div
                    className="sticky top-0 z-10 px-3 py-1.5 flex items-center justify-between"
                    style={{
                      background: "var(--surface-elevated)",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {format(new Date(dateKey + "T12:00:00"), "MMM d, yyyy")}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold font-mono",
                        getPnLColorClass(dayTotal),
                      )}
                    >
                      {dayTotal >= 0 ? "+" : ""}
                      {dayTotal.toFixed(0)}
                    </span>
                  </div>

                  {dayTrades.map((trade) => {
                    const isSelected = trade.id === selectedTradeId;
                    return (
                      <button
                        key={trade.id}
                        type="button"
                        onClick={() => setSelectedTradeId(trade.id)}
                        className="w-full text-left px-3 py-2.5 transition-colors"
                        style={{
                          borderBottom: "1px solid var(--border-subtle)",
                          borderLeft: `2px solid ${isSelected ? "var(--accent-primary)" : "transparent"}`,
                          background: isSelected
                            ? "var(--accent-soft)"
                            : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected)
                            e.currentTarget.style.background =
                              "var(--surface-elevated)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected)
                            e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className="text-[9px] font-bold px-1 rounded shrink-0"
                            style={
                              trade.direction === "LONG"
                                ? {
                                    background: "var(--profit-bg)",
                                    color: "var(--profit-primary)",
                                  }
                                : {
                                    background: "var(--loss-bg)",
                                    color: "var(--loss-primary)",
                                  }
                            }
                          >
                            {trade.direction === "LONG" ? "L" : "S"}
                          </span>
                          <span
                            className="text-[13px] font-semibold tracking-tight"
                            style={{
                              color: isSelected
                                ? "var(--accent-primary)"
                                : "var(--text-primary)",
                            }}
                          >
                            {trade.symbol}
                          </span>
                          {trade.execution_grade && (
                            <span
                              className="text-[9px] font-bold px-1 rounded ml-auto"
                              style={{
                                background: "var(--accent-soft)",
                                color: "var(--accent-primary)",
                              }}
                            >
                              {trade.execution_grade}
                            </span>
                          )}
                          <OutcomeBadge pnl={trade.pnl} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span
                              className="text-[10px]"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              {format(new Date(trade.entry_date), "HH:mm")}
                            </span>
                            {trade.session && (
                              <span
                                className="text-[9px]"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                · {trade.session}
                              </span>
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-[11px] font-semibold font-mono",
                              getPnLColorClass(trade.pnl),
                            )}
                          >
                            {(trade.pnl || 0) >= 0 ? "+" : ""}
                            {(trade.pnl || 0).toFixed(2)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </ScrollArea>
      </div>

      {/* ── RIGHT PANEL (flex-1, scrollable) ── */}
      <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4">
        {selectedTrade ? (
          <>
            <HeroCard trade={selectedTrade} onUpdate={updateTradeField} />

            <div className="surface overflow-hidden h-80">
              <TradeChart
                candles={chartCandles}
                entryPrice={selectedTrade.entry_price || 0}
                exitPrice={selectedTrade.exit_price}
                stopLoss={selectedTrade.stop_loss || 0}
                takeProfit={selectedTrade.take_profit || 0}
                entryTime={selectedTrade.entry_date}
                exitTime={selectedTrade.exit_date}
                direction={selectedTrade.direction as "LONG" | "SHORT"}
                isLoading={chartLoading}
                error={chartError || undefined}
                rateLimited={chartRateLimited}
                onRefresh={loadChartData}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <MetricsCard trade={selectedTrade} />
              <MaeMfeCard
                mae={selectedTrade.mae ?? null}
                mfe={selectedTrade.mfe ?? null}
                rMultiple={selectedTrade.r_multiple ?? null}
                onMaeChange={(v) => updateTradeField("mae", v)}
                onMfeChange={(v) => updateTradeField("mfe", v)}
              />
            </div>

            <AnalysisCard
              trade={selectedTrade}
              playbooks={playbooks}
              onUpdate={updateTradeField}
              onScreenshotUpload={handleScreenshotUpload}
              onViewFullscreen={setFullscreenImageUrl}
              onPlaybooksRefetch={fetchPlaybooksData}
            />
          </>
        ) : (
          <div className="flex h-full min-h-[400px] items-center justify-center">
            <div className="text-center space-y-2">
              <BookOpen
                className="w-10 h-10 mx-auto"
                style={{ color: "var(--text-tertiary)", opacity: 0.4 }}
              />
              <p
                className="text-[13px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--text-tertiary)" }}
              >
                No Trade Selected
              </p>
              <p
                className="text-[11px]"
                style={{ color: "var(--text-tertiary)", opacity: 0.7 }}
              >
                Select a trade from the left panel to begin review
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen image dialog */}
      <Dialog
        open={!!fullscreenImageUrl}
        onOpenChange={(open) => !open && setFullscreenImageUrl(null)}
      >
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>View Screenshot</DialogTitle>
          </DialogHeader>
          {fullscreenImageUrl && (
            <div className="relative w-full h-[85vh]">
              <NextImage
                src={fullscreenImageUrl}
                alt="Fullscreen screenshot"
                fill
                className="object-contain p-4"
                unoptimized
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
