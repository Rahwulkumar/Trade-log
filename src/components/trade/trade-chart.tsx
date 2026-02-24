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

    const rootStyles = getComputedStyle(document.documentElement);
    const textColor = rootStyles.getPropertyValue("--text-secondary").trim() || "#b6c1d4";
    const borderColor =
      rootStyles.getPropertyValue("--border-default").trim() || "#354157";
    const gridColor =
      rootStyles.getPropertyValue("--border-subtle").trim() || "#2a3445";
    const profitColor =
      rootStyles.getPropertyValue("--profit-primary").trim() || "#19b980";
    const lossColor =
      rootStyles.getPropertyValue("--loss-primary").trim() || "#e06675";
    const accentColor =
      rootStyles.getPropertyValue("--accent-primary").trim() || "#4d8dff";

    const chart = createChart(containerRef.current, {
      width: dimensions.width,
      height: dimensions.height,
      layout: {
        background: { color: "transparent" },
        textColor,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: borderColor,
          style: LineStyle.Dashed,
        },
        horzLine: {
          width: 1,
          color: borderColor,
          style: LineStyle.Dashed,
        },
      },
      timeScale: {
        borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor,
      },
    });

    chartRef.current = chart;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candleSeries = (chart as any).addCandlestickSeries({
      upColor: profitColor,
      downColor: lossColor,
      borderUpColor: profitColor,
      borderDownColor: lossColor,
      wickUpColor: profitColor,
      wickDownColor: lossColor,
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
        color: lossColor,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "SL",
      });
    }

    if (takeProfit) {
      candleSeries.createPriceLine({
        price: takeProfit,
        color: profitColor,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "TP",
      });
    }

    candleSeries.createPriceLine({
      price: entryPrice,
      color: accentColor,
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: "Entry",
    });

    if (exitPrice) {
      const exitColor =
        direction === "LONG"
          ? exitPrice > entryPrice
            ? profitColor
            : lossColor
          : exitPrice < entryPrice
            ? profitColor
            : lossColor;

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
        color: accentColor,
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
                  ? profitColor
                  : lossColor,
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
      <div className="flex h-full items-center justify-center rounded-lg border border-border bg-muted/20">
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
      <div className="flex h-full items-center justify-center rounded-lg border border-border bg-muted/20">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <span className="text-sm">No chart data available</span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-2 flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
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
