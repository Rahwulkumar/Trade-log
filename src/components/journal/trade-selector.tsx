"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTrades } from "@/lib/api/trades";
import { Trade } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { IconArrowLeft, IconSearch } from "@/components/ui/icons";

interface TradeSelectorProps {
  currentTradeId: string;
}

function TradeCard({
  trade,
  isActive,
  onClick,
}: {
  trade: Trade;
  isActive: boolean;
  onClick: () => void;
}) {
  const pnl = trade.pnl ?? 0;
  const isProfit = pnl >= 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-[var(--radius-default)] transition-all duration-200 group",
        isActive
          ? "bg-[var(--surface-active)] border border-[var(--accent-primary)]"
          : "hover:bg-[var(--surface-hover)] border border-transparent",
      )}
      style={{ outline: "none" }}
    >
      {/* Row 1: Symbol + PnL */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span
            style={{
                            fontWeight: 700,
              fontSize: "0.9rem",
              color: isActive ? "var(--accent-primary)" : "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            {trade.symbol}
          </span>
          <span
            className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
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
        </div>

        <span
          className="mono text-[0.8rem] font-semibold"
          style={{
            color: isProfit ? "var(--profit-primary)" : "var(--loss-primary)",
          }}
        >
          {isProfit ? "+" : ""}
          {pnl.toFixed(2)}
        </span>
      </div>

      {/* Row 2: Date + R-Multiple */}
      <div className="flex items-center justify-between">
        <span
          style={{
            fontSize: "0.68rem",
            color: "var(--text-tertiary)",
          }}
        >
          {new Date(trade.entry_date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "2-digit",
          })}
        </span>

        {trade.r_multiple != null && (
          <span
            className="mono text-[0.65rem] font-medium px-1.5 py-0.5 rounded-sm"
            style={{
              background:
                trade.r_multiple >= 0 ? "var(--profit-bg)" : "var(--loss-bg)",
              color:
                trade.r_multiple >= 0
                  ? "var(--profit-primary)"
                  : "var(--loss-primary)",
            }}
          >
            {trade.r_multiple >= 0 ? "+" : ""}
            {trade.r_multiple.toFixed(1)}R
          </span>
        )}
      </div>

      {/* Accent bar — shows on active */}
      {isActive && (
        <div
          className="absolute left-0 inset-y-0 w-[3px] rounded-r-full"
          style={{ background: "var(--accent-primary)" }}
        />
      )}
    </button>
  );
}

export function TradeSelector({ currentTradeId }: TradeSelectorProps) {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getTrades({ status: "closed" });
        setTrades(data);
      } catch (e) {
        console.error("Failed to load trades", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = trades.filter((t) =>
    search ? t.symbol.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const wins = filtered.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate =
    filtered.length > 0 ? Math.round((wins / filtered.length) * 100) : 0;

  return (
    <div
      className="w-[280px] flex-shrink-0 flex flex-col h-full"
      style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--border-default)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 transition-colors group"
          style={{ color: "var(--text-tertiary)" }}
        >
          <IconArrowLeft
            size={13}
            className="transition-transform group-hover:-translate-x-0.5"
          />
          <span style={{ fontSize: "0.72rem", fontWeight: 500 }}>
            Dashboard
          </span>
        </button>

        <span
          className="text-label"
          style={{ fontSize: "0.6rem", textTransform: "uppercase" }}
        >
          Journal
        </span>
      </div>

      {/* Mini Stats Strip */}
      <div
        className="grid grid-cols-3 gap-0 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {[
          {
            label: "Total",
            value: filtered.length.toString(),
            color: "var(--text-primary)",
          },
          {
            label: "Wins",
            value: wins.toString(),
            color: "var(--profit-primary)",
          },
          {
            label: "WR",
            value: `${winRate}%`,
            color:
              winRate > 50 ? "var(--profit-primary)" : "var(--loss-primary)",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center py-2.5 gap-0.5"
          >
            <span
              className="mono"
              style={{
                fontSize: "0.88rem",
                fontWeight: 700,
                color: item.color,
              }}
            >
              {item.value}
            </span>
            <span className="text-label" style={{ fontSize: "0.55rem" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div
        className="px-3 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-default)]"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border-default)",
          }}
        >
          <IconSearch
            size={12}
            style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by symbol..."
            className="flex-1 bg-transparent text-[0.72rem] outline-none"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* Trade List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {loading && (
          <div className="space-y-2 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="skeleton h-14 rounded-[var(--radius-default)]"
              />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div
            className="p-6 text-center"
            style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}
          >
            No trades found
          </div>
        )}

        {!loading &&
          filtered.map((trade) => (
            <div key={trade.id} className="relative">
              <TradeCard
                trade={trade}
                isActive={trade.id === currentTradeId}
                onClick={() => router.push(`/notebook?trade=${trade.id}`)}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
