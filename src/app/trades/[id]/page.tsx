"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Trade,
  Playbook,
  ChartCandle,
  TradeScreenshot,
} from "@/lib/supabase/types";
import { TradeChart } from "@/components/trade/trade-chart";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Expand,
  Minimize2,
  Target,
  FileText,
  Brain,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Image from "next/image"; // Added for Next.js Image component

type ExpandedWidget = "chart" | "logic" | "psychology" | "screenshots" | null;

export default function TradeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tradeId = params.id as string;

  const [trade, setTrade] = useState<Trade | null>(null);
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedWidget, setExpandedWidget] = useState<ExpandedWidget>(null);

  const [chartCandles, setChartCandles] = useState<ChartCandle[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartRateLimited, setChartRateLimited] = useState(false);

  const [notes, setNotes] = useState("");
  const [observations, setObservations] = useState("");
  const [feelings, setFeelings] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const fetchTrade = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("id", tradeId)
        .single();

      if (error) throw error;
      setTrade(data);
      setNotes(data.notes || "");
      setObservations(data.observations || "");
      setFeelings(data.feelings || "");

      if (data.playbook_id) {
        const { data: pb } = await supabase
          .from("playbooks")
          .select("*")
          .eq("id", data.playbook_id)
          .single();
        setPlaybook(pb);
      }

      const chartData = data.chart_data;
      if (chartData?.candles) {
        setChartCandles(chartData.candles);
      }
    } catch (e) {
      console.error("Failed to fetch trade:", e);
    } finally {
      setLoading(false);
    }
  }, [tradeId, supabase]);

  useEffect(() => {
    fetchTrade();
  }, [fetchTrade]);

  const loadChartData = useCallback(async () => {
    if (!trade || !trade.exit_date) return;

    setChartLoading(true);
    setChartError(null);
    setChartRateLimited(false);

    try {
      const response = await fetch("/api/trades/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradeId: trade.id,
          symbol: trade.symbol,
          entryTime: trade.entry_date,
          exitTime: trade.exit_date,
        }),
      });

      const result = await response.json();

      if (result.rateLimited) {
        setChartRateLimited(true);
      } else if (result.error) {
        setChartError(result.error);
      } else {
        setChartCandles(result.candles);
      }
    } catch {
      setChartError("Failed to load chart data");
    } finally {
      setChartLoading(false);
    }
  }, [trade]);

  const saveField = useCallback(
    async (field: string, value: string) => {
      if (!trade) return;
      setSaving(true);
      await supabase
        .from("trades")
        .update({ [field]: value })
        .eq("id", trade.id);
      setTimeout(() => setSaving(false), 500);
    },
    [trade, supabase],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (trade && notes !== (trade.notes || "")) {
        saveField("notes", notes);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [notes, trade, saveField]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (trade && observations !== (trade.observations || "")) {
        saveField("observations", observations);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [observations, trade, saveField]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (trade && feelings !== (trade.feelings || "")) {
        saveField("feelings", feelings);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [feelings, trade, saveField]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Trade not found</p>
      </div>
    );
  }

  const screenshots = (trade.screenshots as TradeScreenshot[] | null) || [];
  const isWin = (trade.pnl || 0) > 0;

  const WidgetHeader = ({
    title,
    icon: Icon,
    widgetId,
    color = "white",
  }: {
    title: string;
    icon: React.ElementType;
    widgetId: ExpandedWidget;
    color?: string;
  }) => (
    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", `text-${color}-400`)} />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <button
        onClick={() =>
          setExpandedWidget(expandedWidget === widgetId ? null : widgetId)
        }
        className="p-1 hover:bg-white/10 rounded transition-colors"
      >
        {expandedWidget === widgetId ? (
          <Minimize2 className="w-4 h-4" />
        ) : (
          <Expand className="w-4 h-4" />
        )}
      </button>
    </div>
  );

  const renderWidget = (widgetId: ExpandedWidget, isExpanded: boolean) => {
    const baseClass = cn(
      "bg-white/[0.02] rounded-lg border border-white/10 flex flex-col overflow-hidden",
      isExpanded && "fixed inset-4 z-50",
    );

    switch (widgetId) {
      case "chart":
        return (
          <div className={baseClass}>
            <WidgetHeader
              title="Execution Chart"
              icon={Target}
              widgetId="chart"
              color="blue"
            />
            <div className="flex-1 min-h-0 p-2">
              <TradeChart
                candles={chartCandles}
                entryPrice={trade.entry_price}
                exitPrice={trade.exit_price}
                stopLoss={trade.stop_loss}
                takeProfit={trade.take_profit}
                entryTime={trade.entry_date}
                exitTime={trade.exit_date}
                direction={trade.direction as "LONG" | "SHORT"}
                isLoading={chartLoading}
                error={chartError || undefined}
                rateLimited={chartRateLimited}
                onRefresh={loadChartData}
              />
            </div>
          </div>
        );

      case "logic":
        return (
          <div className={baseClass}>
            <WidgetHeader
              title="Trade Logic"
              icon={FileText}
              widgetId="logic"
              color="emerald"
            />
            <div className="flex-1 overflow-y-auto p-4">
              {playbook ? (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    Playbook: {playbook.name}
                  </div>
                  {playbook.rules &&
                  Array.isArray(playbook.rules) &&
                  playbook.rules.length > 0 ? (
                    <ul className="space-y-2">
                      {(playbook.rules as string[]).map((rule, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs mt-0.5">
                            ✓
                          </span>
                          {rule}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No rules defined
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No playbook assigned
                </p>
              )}
            </div>
          </div>
        );

      case "psychology":
        return (
          <div className={baseClass}>
            <WidgetHeader
              title="Psychology & Notes"
              icon={Brain}
              widgetId="psychology"
              color="purple"
            />
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-2">
                  Trade Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What was your thesis? What happened?"
                  className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-2">
                    Feelings
                  </label>
                  <input
                    value={feelings}
                    onChange={(e) => setFeelings(e.target.value)}
                    placeholder="Confident, anxious..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-2">
                    Observations
                  </label>
                  <input
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Market conditions..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case "screenshots":
        return (
          <div className={baseClass}>
            <WidgetHeader
              title="Screenshots"
              icon={ImageIcon}
              widgetId="screenshots"
              color="amber"
            />
            <div className="flex-1 overflow-y-auto p-4">
              {screenshots.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {screenshots.map((screenshot, i) => (
                    <div
                      key={i}
                      className="relative aspect-video rounded-lg overflow-hidden border border-white/10 group cursor-pointer"
                    >
                      <Image
                        src={screenshot.url}
                        alt={`${screenshot.timeframe} screenshot`}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/50 backdrop-blur-md text-[10px] border border-white/10">
                        {screenshot.timeframe}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No screenshots attached
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-black/50 to-black/30">
      <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                trade.direction === "LONG"
                  ? "bg-emerald-500/20"
                  : "bg-rose-500/20",
              )}
            >
              {trade.direction === "LONG" ? (
                <ArrowUp className="w-5 h-5 text-emerald-400" />
              ) : (
                <ArrowDown className="w-5 h-5 text-rose-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold">{trade.symbol}</h1>
                <span
                  className={cn(
                    "text-2xl font-mono font-bold",
                    isWin ? "text-emerald-400" : "text-rose-400",
                  )}
                >
                  {isWin ? "+" : ""}${trade.pnl?.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5">
                <span>
                  {format(new Date(trade.entry_date), "MMM d, yyyy h:mm a")}
                </span>
                {trade.r_multiple && (
                  <span
                    className={cn(
                      "font-mono",
                      trade.r_multiple > 0
                        ? "text-emerald-400"
                        : "text-rose-400",
                    )}
                  >
                    {trade.r_multiple > 0 ? "+" : ""}
                    {trade.r_multiple.toFixed(1)}R
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 p-4 min-h-0">
        {expandedWidget ? (
          <div className="relative h-full">
            <div
              className="fixed inset-0 bg-black/80 z-40"
              onClick={() => setExpandedWidget(null)}
            />
            {renderWidget(expandedWidget, true)}
          </div>
        ) : (
          <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
            {renderWidget("chart", false)}
            {renderWidget("logic", false)}
            {renderWidget("psychology", false)}
            {renderWidget("screenshots", false)}
          </div>
        )}
      </div>
    </div>
  );
}
