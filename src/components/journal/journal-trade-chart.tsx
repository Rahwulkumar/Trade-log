"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";

import { API_ROUTES } from "@/lib/constants/routes";
import {
  CHART_TIMEFRAME_LABELS,
  DEFAULT_CHART_TIMEFRAME,
  SUPPORTED_CHART_TIMEFRAMES,
  type ChartTimeframe,
} from "@/lib/chart/timeframes";
import { aggregateChartCandles } from "@/lib/chart/aggregate";
import type { ChartCandle } from "@/lib/terminal-farm/types";
import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/control-primitives";
import { InsetPanel } from "@/components/ui/surface-primitives";
import { TradeChart } from "@/components/trade/trade-chart";

type TradeChartApiResponse = {
  candles?: ChartCandle[];
  cached?: boolean;
  error?: string;
  rateLimited?: boolean;
  pending?: boolean;
  source?: "mt5" | "derived";
  timeframe?: ChartTimeframe;
};

type TimeframeChartState = {
  candles: ChartCandle[];
  error: string | null;
  rateLimited: boolean;
  pending: boolean;
  source: TradeChartApiResponse["source"] | null;
};

const CHART_POLL_MS = 4000;

interface JournalTradeChartProps {
  tradeId: string;
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  entryTime: string | null;
  exitTime: string | null;
  direction: "LONG" | "SHORT";
}

function JournalTradeChartInner({
  tradeId,
  entryPrice,
  exitPrice,
  stopLoss,
  takeProfit,
  entryTime,
  exitTime,
  direction,
}: JournalTradeChartProps) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [candles, setCandles] = useState<ChartCandle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [pending, setPending] = useState(false);
  const [timeframe, setTimeframe] = useState<ChartTimeframe>(
    DEFAULT_CHART_TIMEFRAME,
  );
  const [source, setSource] = useState<TradeChartApiResponse["source"] | null>(
    null,
  );
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTimeframeRef = useRef<ChartTimeframe>(DEFAULT_CHART_TIMEFRAME);
  const timeframeCacheRef = useRef<Partial<Record<ChartTimeframe, TimeframeChartState>>>(
    {},
  );

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const applyChartState = useCallback((nextState: TimeframeChartState) => {
    setCandles(nextState.candles);
    setPending(nextState.pending);
    setRateLimited(nextState.rateLimited);
    setSource(nextState.source);
    setError(nextState.error);
  }, []);

  const canLoad =
    entryPrice != null &&
    !!entryTime &&
    !!exitTime;

  useEffect(() => {
    activeTimeframeRef.current = timeframe;
  }, [timeframe]);

  useEffect(() => {
    timeframeCacheRef.current = {};
  }, [tradeId, entryTime, exitTime]);

  const loadChart = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      clearPollTimer();

      const requestedTimeframe = timeframe;

      if (!canLoad || !entryTime || !exitTime || entryPrice == null) {
        setLoading(false);
        applyChartState({
          candles: [],
          pending: false,
          rateLimited: false,
          source: null,
          error: "Chart data needs a closed trade with entry and exit time.",
        });
        return;
      }

      const cachedState = timeframeCacheRef.current[requestedTimeframe];
      if (cachedState && !force) {
        applyChartState(cachedState);
        setLoading(false);
        if (cachedState.pending) {
          pollTimerRef.current = setTimeout(() => {
            void loadChart({ force: true });
          }, CHART_POLL_MS);
        }
        return;
      }

      if (!force && requestedTimeframe !== DEFAULT_CHART_TIMEFRAME) {
        const oneMinuteState = timeframeCacheRef.current[DEFAULT_CHART_TIMEFRAME];
        if (oneMinuteState?.candles.length) {
          const derivedState: TimeframeChartState = {
            candles: aggregateChartCandles(
              oneMinuteState.candles,
              requestedTimeframe,
            ),
            pending: false,
            rateLimited: false,
            source: "derived",
            error: null,
          };

          if (derivedState.candles.length > 0) {
            timeframeCacheRef.current[requestedTimeframe] = derivedState;
            applyChartState(derivedState);
            setLoading(false);
            return;
          }
        }
      }

      setLoading(true);

      if (!cachedState) {
        applyChartState({
          candles: [],
          pending: false,
          rateLimited: false,
          source: null,
          error: null,
        });
      } else {
        applyChartState({
          ...cachedState,
          error: null,
        });
      }

      try {
        const response = await fetch(API_ROUTES.tradesChart, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tradeId,
            timeframe: requestedTimeframe,
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | TradeChartApiResponse
          | null;

        if (!response.ok) {
          const nextState: TimeframeChartState = {
            candles: [],
            pending: false,
            rateLimited: response.status === 429,
            source: null,
            error: payload?.error ?? "Failed to load chart data.",
          };

          timeframeCacheRef.current[requestedTimeframe] = nextState;
          if (activeTimeframeRef.current === requestedTimeframe) {
            applyChartState(nextState);
          }
          return;
        }

        const nextCandles = Array.isArray(payload?.candles) ? payload.candles : [];
        const nextPending = payload?.pending === true;

        const nextState: TimeframeChartState = {
          candles: nextCandles,
          pending: nextPending,
          rateLimited: payload?.rateLimited === true,
          source: payload?.source ?? null,
          error: payload?.error ?? null,
        };

        timeframeCacheRef.current[requestedTimeframe] = nextState;
        if (activeTimeframeRef.current === requestedTimeframe) {
          applyChartState(nextState);
        }

        if (nextPending) {
          pollTimerRef.current = setTimeout(() => {
            void loadChart({ force: true });
          }, CHART_POLL_MS);
        }
      } catch (fetchError) {
        const nextState: TimeframeChartState = {
          candles: [],
          pending: false,
          rateLimited: false,
          source: null,
          error:
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load chart data.",
        };

        timeframeCacheRef.current[requestedTimeframe] = nextState;
        if (activeTimeframeRef.current === requestedTimeframe) {
          applyChartState(nextState);
        }
      } finally {
        if (activeTimeframeRef.current === requestedTimeframe) {
          setLoading(false);
        }
      }
    },
    [
      applyChartState,
      canLoad,
      clearPollTimer,
      entryPrice,
      entryTime,
      exitTime,
      timeframe,
      tradeId,
    ],
  );

  useEffect(() => {
    if (!open) {
      clearPollTimer();
      return;
    }

    void loadChart();

    return () => {
      clearPollTimer();
    };
  }, [clearPollTimer, loadChart, open]);

  const sourceLabel = useMemo(() => {
    if (source === "mt5") {
      return pending
        ? `Waiting on MT5 ${CHART_TIMEFRAME_LABELS[timeframe]}`
        : `MT5 ${CHART_TIMEFRAME_LABELS[timeframe]}`;
    }
    if (source === "derived") {
      return `Derived ${CHART_TIMEFRAME_LABELS[timeframe]} from MT5 1m`;
    }
    return `${CHART_TIMEFRAME_LABELS[timeframe]} chart`;
  }, [pending, source, timeframe]);

  return (
    <InsetPanel paddingClassName="px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-label">Trade replay</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h3
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-inter)",
                fontSize: "15px",
                fontWeight: 700,
                lineHeight: 1.3,
              }}
            >
              MT5 chart context
            </h3>
            <span
              className="rounded-full px-2 py-0.5"
              style={{
                background: pending ? "var(--accent-soft)" : "var(--surface)",
                color: pending
                  ? "var(--accent-primary)"
                  : "var(--text-tertiary)",
                border: "1px solid var(--border-subtle)",
                fontFamily: "var(--font-jb-mono)",
                fontSize: "10px",
              }}
            >
              {sourceLabel}
            </span>
          </div>
          <p
            className="mt-1"
            style={{
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-inter)",
              fontSize: "12px",
              lineHeight: 1.55,
            }}
          >
            Uses MT5-synced candles only. Higher timeframes are derived from the cached 1m trade replay.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUPPORTED_CHART_TIMEFRAMES.map((option) => (
              <ChoiceChip
                key={option}
                active={timeframe === option}
                compact
                onClick={() =>
                  setTimeframe((current) =>
                    current === option ? current : option,
                  )
                }
              >
                {CHART_TIMEFRAME_LABELS[option]}
              </ChoiceChip>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void loadChart({ force: true })}
            style={{
              background: "var(--surface)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          >
            <RefreshCw size={14} />
            Refresh chart
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setOpen((current) => !current)}
            style={{
              background: "var(--surface)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          >
            <ChevronDown
              size={14}
              style={{
                transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                transition: "transform 160ms ease",
              }}
            />
            {open ? "Hide chart" : "Show chart"}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 h-[16rem] sm:h-[18rem] lg:h-[20rem] xl:h-[22rem]">
          <TradeChart
            candles={candles}
            entryPrice={entryPrice ?? 0}
            exitPrice={exitPrice}
            stopLoss={stopLoss}
            takeProfit={takeProfit}
            entryTime={entryTime ?? ""}
            exitTime={exitTime}
            direction={direction}
            isLoading={loading}
            error={error ?? undefined}
            rateLimited={rateLimited}
            pending={pending}
            onRefresh={() => void loadChart({ force: true })}
          />
        </div>
      ) : null}
    </InsetPanel>
  );
}

export const JournalTradeChart = memo(JournalTradeChartInner);
JournalTradeChart.displayName = "JournalTradeChart";
