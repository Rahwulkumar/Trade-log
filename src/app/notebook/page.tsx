"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trade, TradeScreenshot } from "@/lib/supabase/types";
import { ChartCandle } from "@/lib/supabase/types";
import { Loader2, Target } from "lucide-react";
import NextImage from "next/image";
import { useAuth } from "@/components/auth-provider";

// Reusable Journal Components
import { CommandPanel } from "@/components/journal/command-panel";
import { JournalTabs } from "@/components/journal/journal-tabs";
import { TradeTimeline } from "@/components/journal/trade-timeline";
import { StrategyLogic } from "@/components/journal/strategy-logic";
import { PsychologyWidget } from "@/components/journal/psychology-widget";
import { ScreenshotGallery } from "@/components/journal/screenshot-gallery";
import { TradeChart } from "@/components/trade/trade-chart";
import { uploadTradeScreenshot, getScreenshotUrl } from "@/lib/api/storage";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Timeframe = "4H" | "1H" | "15M" | "Execution";

export default function NotebookPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSymbol, setActiveSymbol] = useState<string>("");
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(
    null,
  );

  const [chartCandles, setChartCandles] = useState<ChartCandle[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartRateLimited, setChartRateLimited] = useState(false);

  const supabase = createClient();

  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .order("entry_date", { ascending: false });

      if (error) throw error;
      const allTrades = data || [];
      setTrades(allTrades);

      if (allTrades.length > 0) {
        const firstSymbol = allTrades[0].symbol;
        setActiveSymbol(firstSymbol);
        setSelectedTradeId(allTrades[0].id);
      }
    } catch (e) {
      console.error("Failed to fetch trades", e);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const tradesBySymbol = useMemo(() => {
    const groups: Record<string, Trade[]> = {};
    trades.forEach((t) => {
      if (!groups[t.symbol]) groups[t.symbol] = [];
      groups[t.symbol].push(t);
    });
    return groups;
  }, [trades]);

  const symbols = useMemo(
    () => Object.keys(tradesBySymbol).sort(),
    [tradesBySymbol],
  );

  const filteredTrades = useMemo(() => {
    return (tradesBySymbol[activeSymbol] || []).sort(
      (a, b) =>
        new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime(),
    );
  }, [tradesBySymbol, activeSymbol]);

  const selectedTrade = useMemo(
    () => trades.find((t) => t.id === selectedTradeId),
    [trades, selectedTradeId],
  );

  const updateTradeField = async (
    field: keyof Trade,
    value: Trade[keyof Trade],
  ) => {
    if (!selectedTradeId) return;

    // Optimistic update
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
    } finally {
      // Done
    }
  };

  const loadChartData = useCallback(async () => {
    if (!selectedTrade || !selectedTrade.exit_date) return;

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

      if (result.rateLimited) {
        setChartRateLimited(true);
      } else if (result.error) {
        setChartError(result.error);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = (result.candles || []).map((c: any) => ({
          ...c,
          symbol: selectedTrade.symbol,
          datetime: c.datetime || new Date((c.time || 0) * 1000).toISOString(),
        }));
        setChartCandles(mapped);
      }
    } catch {
      setChartError("Failed to load chart data");
    } finally {
      setChartLoading(false);
    }
  }, [selectedTrade]);

  useEffect(() => {
    if (selectedTrade) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chartData = selectedTrade.chart_data as any;
      if (chartData?.candles) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = (chartData.candles || []).map((c: any) => ({
          ...c,
          symbol: selectedTrade.symbol,
          datetime: c.datetime || new Date((c.time || 0) * 1000).toISOString(),
        }));
        setChartCandles(mapped);
      } else {
        setChartCandles([]);
        // Auto-load if no cache
        if (selectedTrade.exit_date) {
          loadChartData();
        }
      }
    }
  }, [selectedTrade, loadChartData]);

  const handleScreenshotUpload = async (file: File, timeframe: Timeframe) => {
    if (!selectedTrade || !user) return;

    try {
      const path = await uploadTradeScreenshot(file, user.id);
      const url = getScreenshotUrl(path);
      const newScreenshot = {
        url,
        timeframe,
        timestamp: new Date().toISOString(),
      } as unknown as TradeScreenshot;

      const currentScreenshots = (selectedTrade.screenshots ||
        []) as unknown as TradeScreenshot[];
      const updatedScreenshots = [...currentScreenshots, newScreenshot];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateTradeField("screenshots", updatedScreenshots as any);
    } catch (e) {
      console.error("Failed to upload screenshot", e);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground animate-pulse">
            Booting Command Center...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden font-sans text-zinc-100">
      {/* Top Symbol Navigation */}
      <JournalTabs
        symbols={symbols}
        activeSymbol={activeSymbol}
        onSymbolChange={(s) => {
          setActiveSymbol(s);
          const firstTrade = tradesBySymbol[s]?.[0];
          if (firstTrade) setSelectedTradeId(firstTrade.id);
        }}
        tradesBySymbol={tradesBySymbol}
      />

      <div className="flex-1 flex min-h-0 px-4 pb-4 gap-6">
        {/* Sidebar: Timeline */}
        <div className="w-[280px] shrink-0 border-r border-white/5 pr-4 flex flex-col">
          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Recent Executions
            </span>
            <span className="text-[10px] tabular-nums text-zinc-600">
              {filteredTrades.length}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <TradeTimeline
              trades={filteredTrades}
              selectedTradeId={selectedTradeId}
              onTradeSelect={setSelectedTradeId}
            />
          </div>
        </div>

        {/* Main Content: Review Canvas */}
        <div className="flex-1 overflow-y-auto min-w-0 pr-4 custom-scrollbar">
          {selectedTrade ? (
            <div className="max-w-5xl mx-auto space-y-8 py-4 pb-20">
              {/* Trade Header */}
              <div className="flex items-end justify-between border-b border-white/5 pb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">
                      {selectedTrade.symbol}
                    </h1>
                    <div
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        selectedTrade.direction === "LONG"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-rose-500/10 text-rose-500",
                      )}
                    >
                      {selectedTrade.direction}
                    </div>
                  </div>
                  <p className="text-sm text-zinc-500">
                    {format(
                      new Date(selectedTrade.entry_date),
                      "MMMM d, yyyy 'at' HH:mm",
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <div
                    className={cn(
                      "text-2xl font-mono font-semibold",
                      (selectedTrade.pnl || 0) > 0
                        ? "text-emerald-500"
                        : (selectedTrade.pnl || 0) < 0
                          ? "text-rose-500"
                          : "text-zinc-400",
                    )}
                  >
                    {(selectedTrade.pnl || 0) > 0 ? "+" : ""}
                    {selectedTrade.pnl?.toFixed(2) ?? "0.00"}
                  </div>
                  <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">
                    NET PROFIT_LOSS
                  </div>
                </div>
              </div>

              {/* Section 1: Chart */}
              <div className="h-[500px] w-full border border-white/10 rounded-lg overflow-hidden relative bg-zinc-950/50">
                <div className="absolute top-3 left-4 z-20 flex items-center gap-2">
                  <Target className="w-3 h-3 text-zinc-500" />
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                    Execution Chart
                  </span>
                </div>
                <div className="absolute inset-0 pt-10">
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
              </div>

              {/* Section 2: Breakdown */}
              <div className="grid grid-cols-2 gap-6 h-[400px]">
                <CommandPanel title="Strategy & Thesis">
                  <StrategyLogic
                    notes={selectedTrade.notes || ""}
                    onNotesChange={(val) => updateTradeField("notes", val)}
                  />
                </CommandPanel>

                <CommandPanel title="Psychology & Cognitive State">
                  <PsychologyWidget
                    feelings={selectedTrade.feelings || ""}
                    observations={selectedTrade.observations || ""}
                    onFeelingsChange={(val) =>
                      updateTradeField("feelings", val)
                    }
                    onObservationsChange={(val) =>
                      updateTradeField("observations", val)
                    }
                  />
                </CommandPanel>
              </div>

              {/* Section 3: Screenshots */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Visual Evidence
                  </span>
                </div>
                <div className="min-h-[200px] border border-white/5 rounded-lg bg-zinc-950/30">
                  <ScreenshotGallery
                    screenshots={
                      (selectedTrade.screenshots as unknown as TradeScreenshot[]) ||
                      []
                    }
                    onUpload={(tf: Timeframe) => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (e) => {
                        const target = e.target as HTMLInputElement;
                        const file = target.files?.[0];
                        if (file) {
                          handleScreenshotUpload(file, tf);
                        }
                      };
                      input.click();
                    }}
                    onViewFullscreen={(url: string) =>
                      setFullscreenImageUrl(url)
                    }
                  />
                </div>
              </div>

              {/* Fullscreen Image Dialog */}
              <Dialog
                open={!!fullscreenImageUrl}
                onOpenChange={(open) => !open && setFullscreenImageUrl(null)}
              >
                <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-black/95 border-white/10">
                  <DialogHeader className="sr-only">
                    <DialogTitle>View Screenshot</DialogTitle>
                  </DialogHeader>
                  {fullscreenImageUrl && (
                    <div className="relative w-full h-[85vh] flex items-center justify-center p-4">
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
          ) : (
            <div className="flex-1 h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-zinc-600 uppercase tracking-widest font-semibold mb-2">
                  No Execution Selected
                </p>
                <p className="text-[11px] text-zinc-800">
                  Select a trade from the sidebar to review your setup.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
