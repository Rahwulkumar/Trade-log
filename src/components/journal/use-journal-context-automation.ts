"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { deriveJournalSessionProfile } from "@/domain/journal-session-profile";
import type { JournalSessionState } from "@/domain/journal-types";
import type { ChartCandle } from "@/lib/terminal-farm/types";

interface UseJournalContextAutomationArgs {
  tradeId: string;
  entryTime: string | null;
  direction: "LONG" | "SHORT";
  priorSessionBehavior: string;
  marketCondition: string | null;
  sessionState: JournalSessionState | null;
  onApply: (patch: {
    priorSessionBehavior?: string;
    marketCondition?: "Quiet" | "Normal" | "Expanded" | "News-driven";
    sessionState?: JournalSessionState;
  }) => void;
}

export function useJournalContextAutomation({
  tradeId,
  entryTime,
  direction,
  priorSessionBehavior,
  marketCondition,
  sessionState,
  onApply,
}: UseJournalContextAutomationArgs) {
  const [candles, setCandles] = useState<ChartCandle[]>([]);
  const [loading, setLoading] = useState(false);
  const appliedSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!tradeId) {
        if (!cancelled) {
          setCandles([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const response = await fetch("/api/trades/chart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tradeId, timeframe: "15m" }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { candles?: ChartCandle[] }
          | null;

        if (cancelled) return;
        setCandles(Array.isArray(payload?.candles) ? payload.candles : []);
      } catch {
        if (!cancelled) {
          setCandles([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tradeId]);

  const profile = useMemo(
    () => deriveJournalSessionProfile(candles, entryTime, direction),
    [candles, direction, entryTime],
  );

  useEffect(() => {
    const signature = JSON.stringify(profile);
    if (signature === appliedSignatureRef.current) {
      return;
    }

    const patch: Parameters<typeof onApply>[0] = {};
    if (!priorSessionBehavior.trim() && profile.priorSessionBehavior) {
      patch.priorSessionBehavior = profile.priorSessionBehavior;
    }
    if (!marketCondition && profile.marketCondition) {
      patch.marketCondition = profile.marketCondition;
    }
    if (!sessionState && profile.sessionState) {
      patch.sessionState = profile.sessionState;
    }

    if (Object.keys(patch).length > 0) {
      appliedSignatureRef.current = signature;
      onApply(patch);
    }
  }, [
    marketCondition,
    onApply,
    priorSessionBehavior,
    profile,
    sessionState,
  ]);

  return {
    sessionProfile: profile,
    loading,
  };
}
