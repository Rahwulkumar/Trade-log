"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

import { useAuth } from "@/components/auth-provider";
import { NoTradesEmpty } from "@/components/ui/empty-state";
import { getTrades } from "@/lib/api/client/trades";
import type { Trade } from "@/lib/db/schema";
import { getDirectionColor, getPnLColor } from "@/lib/utils/trade-colors";
import { getTradeNetPnl } from "@/lib/utils/trade-pnl";

interface RecentTradesProps {
  limit?: number;
  propAccountId?: string | null;
  initialTrades?: Trade[];
}

function getOutcome(trade: Trade): "WIN" | "LOSS" | "OPEN" | "EVEN" {
  if (trade.status === "OPEN") return "OPEN";
  const pnl = getTradeNetPnl(trade);
  if (pnl > 0) return "WIN";
  if (pnl < 0) return "LOSS";
  return "EVEN";
}

function outcomeStyle(outcome: string): React.CSSProperties {
  if (outcome === "WIN") {
    return {
      color: "var(--profit-primary)",
      background: "var(--profit-bg)",
    };
  }
  if (outcome === "LOSS") {
    return {
      color: "var(--loss-primary)",
      background: "var(--loss-bg)",
    };
  }
  return {
    color: "var(--text-secondary)",
    background: "var(--surface-elevated)",
  };
}

function tradeDuration(entry: Date, exit: Date | null): string | null {
  if (!exit) return null;
  const totalMin = Math.floor((exit.getTime() - entry.getTime()) / 60000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function SkeletonRow() {
  return (
    <div
      className="flex items-center gap-3 px-5 py-4"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="skeleton h-2 w-2 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-2 w-36 rounded" />
      </div>
      <div className="space-y-1.5 text-right">
        <div className="skeleton ml-auto h-3 w-16 rounded" />
        <div className="skeleton ml-auto h-2 w-10 rounded" />
      </div>
    </div>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  const outcome = getOutcome(trade);
  const pnl = getTradeNetPnl(trade);
  const rMultiple = trade.rMultiple ? Number(trade.rMultiple) : null;
  const entryDate = new Date(trade.entryDate);
  const exitDate = trade.exitDate ? new Date(trade.exitDate) : null;
  const duration = tradeDuration(entryDate, exitDate);
  const dirColor = getDirectionColor(trade.direction);
  const pnlColor = getPnLColor(pnl);

  return (
    <div
      className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ background: dirColor }}
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="mono text-[0.83rem] font-semibold leading-none"
              style={{ color: "var(--text-primary)" }}
            >
              {trade.symbol}
            </span>
            <span
              className="rounded px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide"
              style={{
                color: dirColor,
                background:
                  trade.direction === "LONG"
                    ? "var(--profit-bg)"
                    : "var(--loss-bg)",
              }}
            >
              {trade.direction}
            </span>
            {trade.session ? (
              <span
                className="rounded px-1.5 py-0.5 text-[0.65rem] font-medium"
                style={{
                  color: "var(--text-tertiary)",
                  background: "var(--surface-elevated)",
                }}
              >
                {trade.session}
              </span>
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className="text-[0.7rem]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {format(entryDate, "MMM d - HH:mm")}
            </span>
            {duration ? (
              <>
                <span style={{ color: "var(--border-default)" }}>-</span>
                <span
                  className="text-[0.7rem]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {duration}
                </span>
              </>
            ) : null}
            {rMultiple !== null ? (
              <>
                <span style={{ color: "var(--border-default)" }}>-</span>
                <span
                  className="text-[0.7rem]"
                  style={{
                    fontFamily: "var(--font-jb-mono)",
                    color:
                      rMultiple >= 0
                        ? "var(--profit-primary)"
                        : "var(--loss-primary)",
                  }}
                >
                  {rMultiple >= 0 ? "+" : ""}
                  {rMultiple.toFixed(1)}R
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:block sm:text-right">
        <div
          className="mb-1 inline-block rounded px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide"
          style={outcomeStyle(outcome)}
        >
          {outcome}
        </div>
        <div
          className="text-[0.875rem] font-semibold"
          style={{ fontFamily: "var(--font-jb-mono)", color: pnlColor }}
        >
          {pnl >= 0 ? "+" : "-"}$
          {Math.abs(pnl).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
    </div>
  );
}

export function RecentTrades({
  limit = 5,
  propAccountId,
  initialTrades,
}: RecentTradesProps) {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const [trades, setTrades] = useState<Trade[]>(initialTrades ?? []);
  const [loading, setLoading] = useState(!initialTrades);

  useEffect(() => {
    if (initialTrades) return;

    async function loadTrades() {
      if (authLoading) return;
      if (!isConfigured || !user) {
        setLoading(false);
        return;
      }
      try {
        const data = await getTrades({
          status: "closed",
          propAccountId,
          limit,
          sortBy: "exitDate",
          sortOrder: "desc",
        });
        setTrades(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("Failed to fetch")) {
          console.error("Failed to load recent trades:", err);
        }
      } finally {
        setLoading(false);
      }
    }

    void loadTrades();
  }, [authLoading, initialTrades, isConfigured, limit, propAccountId, user]);

  if (loading) {
    return (
      <div>
        {Array.from({ length: limit }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="px-5 py-8">
        <NoTradesEmpty />
      </div>
    );
  }

  return (
    <div>
      {trades.map((trade) => (
        <TradeRow key={trade.id} trade={trade} />
      ))}
    </div>
  );
}
