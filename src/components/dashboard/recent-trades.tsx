"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useAuth } from "@/components/auth-provider";
import { getTrades } from "@/lib/api/client/trades";
import { NoTradesEmpty } from "@/components/ui/empty-state";
import { getPnLColor, getDirectionColor } from "@/lib/utils/trade-colors";
import type { Trade } from "@/lib/db/schema";

interface RecentTradesProps {
  limit?: number;
  propAccountId?: string | null;
  /** Pre-fetched trades from parent — skips internal fetch when provided */
  initialTrades?: Trade[];
}

// Derive outcome from pnl + status
function getOutcome(trade: Trade): "WIN" | "LOSS" | "OPEN" | "EVEN" {
  if (trade.status === "OPEN") return "OPEN";
  const pnl = Number(trade.pnl) || 0;
  if (pnl > 0) return "WIN";
  if (pnl < 0) return "LOSS";
  return "EVEN";
}

function outcomeStyle(outcome: string): React.CSSProperties {
  if (outcome === "WIN") return { color: "var(--profit-primary)", background: "var(--profit-bg)" };
  if (outcome === "LOSS") return { color: "var(--loss-primary)", background: "var(--loss-bg)" };
  return { color: "var(--text-secondary)", background: "var(--surface-elevated)" };
}

function tradeDuration(entry: Date, exit: Date | null): string | null {
  if (!exit) return null;
  const totalMin = Math.floor((exit.getTime() - entry.getTime()) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <div className="skeleton h-2 w-2 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-2 w-36 rounded" />
      </div>
      <div className="text-right space-y-1.5">
        <div className="skeleton h-3 w-16 rounded ml-auto" />
        <div className="skeleton h-2 w-10 rounded ml-auto" />
      </div>
    </div>
  );
}

// ─── Trade row ────────────────────────────────────────────────────────────────
function TradeRow({ trade }: { trade: Trade }) {
  const outcome = getOutcome(trade);
  const pnl = Number(trade.pnl) || 0;
  const rMultiple = trade.rMultiple ? Number(trade.rMultiple) : null;
  const entryDate = new Date(trade.entryDate);
  const exitDate = trade.exitDate ? new Date(trade.exitDate) : null;
  const duration = tradeDuration(entryDate, exitDate);
  const dirColor = getDirectionColor(trade.direction);
  const pnlColor = getPnLColor(pnl);

  return (
    <div
      className="flex items-start justify-between gap-4 px-5 py-3.5"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      {/* Left: direction dot + info */}
      <div className="flex items-start gap-3 min-w-0">
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ background: dirColor }}
        />
        <div className="min-w-0">
          {/* Row 1: symbol + direction chip + session */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[0.875rem] font-semibold leading-none"
              style={{ fontFamily: "var(--font-syne)", color: "var(--text-primary)" }}
            >
              {trade.symbol}
            </span>
            <span
              className="text-[0.65rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{
                color: dirColor,
                background: trade.direction === "LONG" ? "var(--profit-bg)" : "var(--loss-bg)",
              }}
            >
              {trade.direction}
            </span>
            {trade.session && (
              <span
                className="text-[0.65rem] font-medium px-1.5 py-0.5 rounded"
                style={{ color: "var(--text-tertiary)", background: "var(--surface-elevated)" }}
              >
                {trade.session}
              </span>
            )}
          </div>
          {/* Row 2: date · duration · R */}
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="text-[0.7rem]" style={{ color: "var(--text-tertiary)" }}>
              {format(entryDate, "MMM d · HH:mm")}
            </span>
            {duration && (
              <>
                <span style={{ color: "var(--border-default)" }}>·</span>
                <span className="text-[0.7rem]" style={{ color: "var(--text-tertiary)" }}>
                  {duration}
                </span>
              </>
            )}
            {rMultiple !== null && (
              <>
                <span style={{ color: "var(--border-default)" }}>·</span>
                <span
                  className="text-[0.7rem]"
                  style={{
                    fontFamily: "var(--font-jb-mono)",
                    color: rMultiple >= 0 ? "var(--profit-primary)" : "var(--loss-primary)",
                  }}
                >
                  {rMultiple >= 0 ? "+" : ""}{rMultiple.toFixed(1)}R
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: outcome badge + pnl */}
      <div className="text-right shrink-0">
        <div
          className="inline-block text-[0.65rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded mb-1"
          style={outcomeStyle(outcome)}
        >
          {outcome}
        </div>
        <div
          className="text-[0.875rem] font-semibold"
          style={{ fontFamily: "var(--font-jb-mono)", color: pnlColor }}
        >
          {pnl >= 0 ? "+" : "−"}${Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function RecentTrades({ limit = 5, propAccountId, initialTrades }: RecentTradesProps) {
  const { user, isConfigured, loading: authLoading } = useAuth();
  const [trades, setTrades] = useState<Trade[]>(initialTrades ?? []);
  const [loading, setLoading] = useState(!initialTrades);

  useEffect(() => {
    // Skip fetch if parent already provided data
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
          sortBy: "entryDate",
          sortOrder: "desc",
        });
        setTrades(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("Failed to fetch")) console.error("Failed to load recent trades:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTrades();
  }, [authLoading, user, isConfigured, limit, propAccountId, initialTrades]);

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
