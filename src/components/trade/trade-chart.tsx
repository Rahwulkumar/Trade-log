"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickData,
  Time,
  LineStyle,
} from "lightweight-charts";
import { ChartCandle } from "@/lib/supabase/types";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface TradeChartProps {
  candles: ChartCandle[];
  entryPrice: number;
  exitPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  entryTime: string;
  exitTime?: string | null;
  direction: "LONG" | "SHORT";
  isLoading?: boolean;
  error?: string;
  rateLimited?: boolean;
  onRefresh?: () => void;
}

export function TradeChart({
  candles,
  entryPrice,
  exitPrice,
  stopLoss,
  takeProfit,
  entryTime,
  exitTime,
  direction,
  isLoading = false,
  error,
  rateLimited,
  onRefresh,
}: TradeChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current || dimensions.width === 0 || candles.length === 0)
      return;

    if (chartRef.current) {
      chartRef.current.remove();
    }

    const chart = createChart(containerRef.current, {
      width: dimensions.width,
      height: dimensions.height,
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.6)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: "rgba(255, 255, 255, 0.3)",
          style: LineStyle.Dashed,
        },
        horzLine: {
          width: 1,
          color: "rgba(255, 255, 255, 0.3)",
          style: LineStyle.Dashed,
        },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
    });

    chartRef.current = chart;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candleSeries = (chart as any).addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const chartData: CandlestickData<Time>[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeries.setData(chartData);

    if (stopLoss) {
      candleSeries.createPriceLine({
        price: stopLoss,
        color: "#ef4444",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "SL",
      });
    }

    if (takeProfit) {
      candleSeries.createPriceLine({
        price: takeProfit,
        color: "#22c55e",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "TP",
      });
    }

    candleSeries.createPriceLine({
      price: entryPrice,
      color: "#3b82f6",
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: "Entry",
    });

    if (exitPrice) {
      const exitColor =
        direction === "LONG"
          ? exitPrice > entryPrice
            ? "#22c55e"
            : "#ef4444"
          : exitPrice < entryPrice
            ? "#22c55e"
            : "#ef4444";

      candleSeries.createPriceLine({
        price: exitPrice,
        color: exitColor,
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: "Exit",
      });
    }

    const entryTimestamp = Math.floor(new Date(entryTime).getTime() / 1000);
    const exitTimestamp = exitTime
      ? Math.floor(new Date(exitTime).getTime() / 1000)
      : null;

    candleSeries.setMarkers([
      {
        time: entryTimestamp as Time,
        position: direction === "LONG" ? "belowBar" : "aboveBar",
        color: "#3b82f6",
        shape: direction === "LONG" ? "arrowUp" : "arrowDown",
        text: "Entry",
      },
      ...(exitTimestamp
        ? [
            {
              time: exitTimestamp as Time,
              position: (direction === "LONG" ? "aboveBar" : "belowBar") as
                | "aboveBar"
                | "belowBar",
              color:
                exitPrice &&
                ((direction === "LONG" && exitPrice > entryPrice) ||
                  (direction === "SHORT" && exitPrice < entryPrice))
                  ? "#22c55e"
                  : "#ef4444",
              shape: (direction === "LONG" ? "arrowDown" : "arrowUp") as
                | "arrowUp"
                | "arrowDown",
              text: "Exit",
            },
          ]
        : []),
    ]);

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [
    candles,
    entryPrice,
    exitPrice,
    stopLoss,
    takeProfit,
    entryTime,
    exitTime,
    direction,
    dimensions,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-white/[0.02] rounded-lg border border-white/10">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Loading chart data...</span>
        </div>
      </div>
    );
  }

  if (rateLimited) {
    return (
      <div className="flex items-center justify-center h-full bg-amber-500/5 rounded-lg border border-amber-500/20">
        <div className="flex flex-col items-center gap-3 text-amber-400">
          <AlertCircle className="w-8 h-8" />
          <span className="text-sm font-medium">Rate limit reached</span>
          <p className="text-xs text-amber-400/70">
            Please wait a minute before retrying
          </p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-2 px-3 py-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 rounded-md transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-500/5 rounded-lg border border-red-500/20">
        <div className="flex flex-col items-center gap-2 text-red-400">
          <AlertCircle className="w-6 h-6" />
          <span className="text-sm">{error}</span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-2 px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 rounded-md transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (candles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-white/[0.02] rounded-lg border border-white/10">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <span className="text-sm">No chart data available</span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-2 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-md transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Load Chart
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg overflow-hidden"
    />
  );
}
