"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  CandlestickData,
  SeriesMarker,
  SeriesMarkerPricePosition,
  SeriesMarkerShape,
  Time,
  LineStyle,
  createSeriesMarkers,
} from "lightweight-charts";
import { ChartCandle } from "@/lib/terminal-farm/types";
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
  pending?: boolean;
  onRefresh?: () => void;
}

function toUnixSeconds(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Math.floor(new Date(value).getTime() / 1000);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function priceDistanceToCandle(candle: ChartCandle, price: number): number {
  if (price >= candle.low && price <= candle.high) {
    return 0;
  }

  return Math.min(
    Math.abs(price - candle.low),
    Math.abs(price - candle.high),
    Math.abs(price - candle.open),
    Math.abs(price - candle.close),
  );
}

function resolveTradeAnchorTime(
  candles: ChartCandle[],
  timestamp: number | null,
  price: number | null | undefined,
): number | null {
  if (candles.length === 0) {
    return null;
  }

  const hasPrice = price != null && Number.isFinite(price);
  const timestampValue = timestamp ?? Number.NaN;

  const scoredCandles = candles.map((candle) => ({
    time: candle.time,
    priceDistance: hasPrice ? priceDistanceToCandle(candle, price) : 0,
    timeDistance: Number.isFinite(timestampValue)
      ? Math.abs(candle.time - timestampValue)
      : Number.MAX_SAFE_INTEGER,
  }));

  scoredCandles.sort((left, right) => {
    if (left.priceDistance !== right.priceDistance) {
      return left.priceDistance - right.priceDistance;
    }

    if (left.timeDistance !== right.timeDistance) {
      return left.timeDistance - right.timeDistance;
    }

    return left.time - right.time;
  });

  return scoredCandles[0]?.time ?? null;
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
  pending = false,
  onRefresh,
}: TradeChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const candleSeriesRef = useRef<ReturnType<
    ReturnType<typeof createChart>["addSeries"]
  > | null>(null);
  const markerApiRef = useRef<{ detach: () => void } | null>(null);
  const priceLinesRef = useRef<unknown[]>([]);
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(
    null,
  );
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const attachContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setContainerElement(node);
  }, []);

  useEffect(() => {
    if (!containerElement) return;

    const syncDimensions = () => {
      const { width, height } = containerElement.getBoundingClientRect();
      setDimensions({ width, height });
    };

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    syncDimensions();
    resizeObserver.observe(containerElement);
    return () => {
      resizeObserver.disconnect();
    };
  }, [containerElement]);

  useEffect(() => {
    const chartContainer = containerRef.current;

    if (!chartContainer || dimensions.width === 0 || dimensions.height === 0) {
      return;
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
    if (!chartRef.current) {
      const chart = createChart(chartContainer, {
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
      candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
        upColor: profitColor,
        downColor: lossColor,
        borderUpColor: profitColor,
        borderDownColor: lossColor,
        wickUpColor: profitColor,
        wickDownColor: lossColor,
      });
      return;
    }

    chartRef.current.applyOptions({
      width: dimensions.width,
      height: dimensions.height,
    });
  }, [dimensions, containerElement]);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;

    if (!chart || !candleSeries) {
      return;
    }

    markerApiRef.current?.detach();
    markerApiRef.current = null;

    if (priceLinesRef.current.length > 0) {
      for (const line of priceLinesRef.current) {
        candleSeries.removePriceLine(line as never);
      }
      priceLinesRef.current = [];
    }

    if (candles.length === 0) {
      candleSeries.setData([]);
      return;
    }

    const rootStyles = getComputedStyle(document.documentElement);
    const profitColor =
      rootStyles.getPropertyValue("--profit-primary").trim() || "#19b980";
    const lossColor =
      rootStyles.getPropertyValue("--loss-primary").trim() || "#e06675";
    const accentColor =
      rootStyles.getPropertyValue("--accent-primary").trim() || "#4d8dff";

    const chartData: CandlestickData<Time>[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeries.setData(chartData);

    if (stopLoss != null && Number.isFinite(stopLoss)) {
      priceLinesRef.current.push(
        candleSeries.createPriceLine({
          price: stopLoss,
          color: lossColor,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "SL",
        }),
      );
    }

    if (takeProfit != null && Number.isFinite(takeProfit)) {
      priceLinesRef.current.push(
        candleSeries.createPriceLine({
          price: takeProfit,
          color: profitColor,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "TP",
        }),
      );
    }

    const entryMarkerTime = resolveTradeAnchorTime(
      candles,
      toUnixSeconds(entryTime),
      entryPrice,
    );
    const exitMarkerTime = resolveTradeAnchorTime(
      candles,
      toUnixSeconds(exitTime),
      exitPrice,
    );
    const markers: SeriesMarker<Time>[] = [];

    if (entryMarkerTime != null && Number.isFinite(entryPrice)) {
      markers.push({
        time: entryMarkerTime as Time,
        position: "atPriceBottom" as SeriesMarkerPricePosition,
        price: entryPrice,
        color: accentColor,
        shape: (direction === "LONG"
          ? "arrowUp"
          : "arrowDown") as SeriesMarkerShape,
        text: "Entry",
      });
    }

    if (exitMarkerTime != null && exitPrice != null && Number.isFinite(exitPrice)) {
      markers.push({
        time: exitMarkerTime as Time,
        position: "atPriceTop" as SeriesMarkerPricePosition,
        price: exitPrice,
        color:
          exitPrice != null &&
          ((direction === "LONG" && exitPrice > entryPrice) ||
            (direction === "SHORT" && exitPrice < entryPrice))
            ? profitColor
            : lossColor,
        shape: (direction === "LONG" ? "arrowDown" : "arrowUp") as
          | "arrowUp"
          | "arrowDown",
        text: "Exit",
      });
    }

    if (markers.length > 0) {
      markerApiRef.current = createSeriesMarkers(candleSeries, markers);
    }

    chart.timeScale().fitContent();
  }, [
    candles,
    direction,
    entryPrice,
    entryTime,
    exitPrice,
    exitTime,
    stopLoss,
    takeProfit,
  ]);

  useEffect(() => {
    return () => {
      markerApiRef.current?.detach();
      markerApiRef.current = null;

      const candleSeries = candleSeriesRef.current;
      if (candleSeries && priceLinesRef.current.length > 0) {
        for (const line of priceLinesRef.current) {
          candleSeries.removePriceLine(line as never);
        }
      }
      priceLinesRef.current = [];

      chartRef.current?.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, []);

  const showLoadingOverlay = isLoading && candles.length === 0;
  const showPendingOverlay = pending && candles.length === 0;
  const showRateLimitOverlay = rateLimited && candles.length === 0;
  const showErrorOverlay = !!error && candles.length === 0;
  const showEmptyOverlay =
    !isLoading &&
    !pending &&
    !rateLimited &&
    !error &&
    candles.length === 0;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-muted/20">
      <div
        ref={attachContainerRef}
        className="h-full w-full overflow-hidden rounded-lg"
      />

      {(showLoadingOverlay ||
        showPendingOverlay ||
        showRateLimitOverlay ||
        showErrorOverlay ||
        showEmptyOverlay) && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[color:var(--surface)]/88 backdrop-blur-[1px]">
          {showLoadingOverlay ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Loading chart data...</span>
            </div>
          ) : null}

          {showPendingOverlay ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm font-medium">Requesting MT5 chart data...</span>
              <p className="text-center text-xs text-muted-foreground/80">
                The worker is fetching candles from MT5 for this trade.
              </p>
            </div>
          ) : null}

          {showRateLimitOverlay ? (
            <div className="flex flex-col items-center gap-3 px-4 text-amber-400">
              <AlertCircle className="h-8 w-8" />
              <span className="text-sm font-medium">Rate limit reached</span>
              <p className="text-xs text-amber-400/70">
                Please wait a minute before retrying
              </p>
              {onRefresh ? (
                <button
                  onClick={onRefresh}
                  className="mt-2 flex items-center gap-1 rounded-md bg-amber-500/20 px-3 py-1.5 text-xs transition-colors hover:bg-amber-500/30"
                >
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              ) : null}
            </div>
          ) : null}

          {showErrorOverlay ? (
            <div className="flex flex-col items-center gap-2 px-4 text-red-400">
              <AlertCircle className="h-6 w-6" />
              <span className="text-sm">{error}</span>
              {onRefresh ? (
                <button
                  onClick={onRefresh}
                  className="mt-2 flex items-center gap-1 rounded-md bg-red-500/20 px-3 py-1.5 text-xs transition-colors hover:bg-red-500/30"
                >
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              ) : null}
            </div>
          ) : null}

          {showEmptyOverlay ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <span className="text-sm">No chart data available</span>
              {onRefresh ? (
                <button
                  onClick={onRefresh}
                  className="mt-2 flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
                >
                  <RefreshCw className="h-3 w-3" /> Load Chart
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {candles.length > 0 && (isLoading || pending) ? (
        <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-border bg-[color:var(--surface)]/95 px-2.5 py-1 text-[10px] font-medium text-muted-foreground shadow-sm">
          {isLoading ? "Updating chart..." : "Syncing MT5..."}
        </div>
      ) : null}
    </div>
  );
}
