"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  Tag,
  Star,
  StarOff,
  Save,
  FileText,
  BarChart2,
  Activity,
  BookOpen,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  X,
  RefreshCw,
  Plus,
} from "lucide-react";
import { getTrades } from "@/lib/api/trades";
import {
  getJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  getJournalForTrade,
  saveTradeJournal,
} from "@/lib/api/journal";
import type { Trade, JournalEntry } from "@/lib/supabase/types";
import { usePropAccount } from "@/components/prop-account-provider";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── Color tokens ────────────────────────────────────────────────────────────
const PROFIT = "#0D9B6E";
const LOSS = "#E05252";
const NEUTRAL = "#8EB69B";
const ACCENT = "#2CC299";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtCurrency(n: number | null | undefined) {
  if (n == null) return "—";
  return (n >= 0 ? "+" : "") + "$" + Math.abs(n).toFixed(2);
}
function fmtR(n: number | null | undefined) {
  if (n == null) return "—";
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "R";
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function getOutcome(trade: Trade): "WIN" | "LOSS" | "BE" | "OPEN" {
  if (trade.status === "open") return "OPEN";
  const pnl = trade.pnl ?? 0;
  if (pnl > 0.5) return "WIN";
  if (pnl < -0.5) return "LOSS";
  return "BE";
}
function calcStats(trades: Trade[]) {
  const closed = trades.filter((t) => t.status === "closed");
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
  const total = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const avgR =
    closed
      .filter((t) => t.r_multiple != null)
      .reduce((s, t) => s + (t.r_multiple ?? 0), 0) /
    (closed.filter((t) => t.r_multiple != null).length || 1);
  return {
    total,
    winRate: closed.length
      ? Math.round((wins.length / closed.length) * 100)
      : 0,
    tradeCount: closed.length,
    openCount: trades.filter((t) => t.status === "open").length,
    avgR,
  };
}

// ─── Outcome badge ────────────────────────────────────────────────────────────
function OutcomeBadge({
  outcome,
}: {
  outcome: "WIN" | "LOSS" | "BE" | "OPEN";
}) {
  const map = {
    WIN: { bg: "rgba(13,155,110,0.15)", color: PROFIT, label: "WIN" },
    LOSS: { bg: "rgba(224,82,82,0.15)", color: LOSS, label: "LOSS" },
    BE: { bg: "rgba(142,182,155,0.12)", color: NEUTRAL, label: "BE" },
    OPEN: { bg: "rgba(44,194,153,0.12)", color: ACCENT, label: "OPEN" },
  };
  const s = map[outcome];
  return (
    <span
      className="text-[0.58rem] font-bold rounded px-1.5 py-0.5 uppercase tracking-wider"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ─── Direction badge ─────────────────────────────────────────────────────────
function DirectionBadge({ direction }: { direction: "LONG" | "SHORT" }) {
  return direction === "LONG" ? (
    <span
      className="flex items-center gap-0.5 text-[0.58rem] font-bold"
      style={{ color: PROFIT }}
    >
      <ArrowUpRight size={10} />
      LONG
    </span>
  ) : (
    <span
      className="flex items-center gap-0.5 text-[0.58rem] font-bold"
      style={{ color: LOSS }}
    >
      <ArrowDownRight size={10} />
      SHORT
    </span>
  );
}

// ─── Trade row in the list ────────────────────────────────────────────────────
function TradeRow({
  trade,
  isSelected,
  hasNote,
  onClick,
}: {
  trade: Trade;
  isSelected: boolean;
  hasNote: boolean;
  onClick: () => void;
}) {
  const outcome = getOutcome(trade);
  const pnl = trade.pnl ?? 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left transition-all duration-150 rounded-[8px] group"
      style={{
        padding: "10px 12px",
        background: isSelected ? "var(--surface-active)" : "transparent",
        borderLeft: isSelected
          ? `3px solid ${ACCENT}`
          : "3px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!isSelected)
          e.currentTarget.style.background = "var(--surface-hover)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = "transparent";
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span
            className="font-bold tracking-tight"
            style={{
              fontSize: "0.88rem",
              color: isSelected ? ACCENT : "var(--text-primary)",
            }}
          >
            {trade.symbol}
          </span>
          <DirectionBadge direction={trade.direction} />
          <OutcomeBadge outcome={outcome} />
          {hasNote && (
            <FileText size={10} style={{ color: ACCENT, opacity: 0.7 }} />
          )}
        </div>
        <span
          className="font-semibold tabular-nums"
          style={{
            fontSize: "0.82rem",
            color: pnl > 0 ? PROFIT : pnl < 0 ? LOSS : "var(--text-tertiary)",
          }}
        >
          {fmtCurrency(trade.pnl)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: "0.65rem", color: "var(--text-tertiary)" }}>
            {fmtDate(trade.entry_date)}
          </span>
          {trade.r_multiple != null && (
            <span
              className="font-mono"
              style={{
                fontSize: "0.65rem",
                color: trade.r_multiple >= 0 ? PROFIT : LOSS,
              }}
            >
              {fmtR(trade.r_multiple)}
            </span>
          )}
        </div>
        <span style={{ fontSize: "0.62rem", color: "var(--text-tertiary)" }}>
          {trade.position_size} lots
        </span>
      </div>
    </button>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-[8px] px-3 py-2.5 flex-1"
      style={{ background: "var(--surface-elevated)" }}
    >
      <span
        style={{
          fontSize: "0.55rem",
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <span
        className="font-bold tabular-nums"
        style={{ fontSize: "0.95rem", color: color ?? "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Note editor ─────────────────────────────────────────────────────────────
function NoteEditor({
  tradeId,
  entry,
  onSaved,
}: {
  tradeId: string;
  entry: JournalEntry | null;
  onSaved: (e: JournalEntry) => void;
}) {
  const [text, setText] = useState<string>(
    typeof entry?.content === "string" ? entry.content : "",
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setText(typeof entry?.content === "string" ? entry.content : "");
    setSaved(false);
  }, [entry, tradeId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveTradeJournal(tradeId, text);
      onSaved(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <BookOpen size={13} style={{ color: ACCENT }} />
          <span
            className="font-semibold"
            style={{ fontSize: "0.78rem", color: "var(--text-primary)" }}
          >
            Trade Journal
          </span>
          {entry && (
            <span
              style={{ fontSize: "0.62rem", color: "var(--text-tertiary)" }}
            >
              Last edited {fmtDateTime(entry.updated_at ?? entry.created_at)}
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 font-semibold transition-all"
          style={{
            fontSize: "0.72rem",
            background: saved ? "rgba(13,155,110,0.15)" : ACCENT,
            color: saved ? PROFIT : "#051F20",
            opacity: saving ? 0.6 : 1,
          }}
        >
          <Save size={11} strokeWidth={2.2} />
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        placeholder={`Write your thoughts on this trade…

• What was the setup? Did it match your playbook?
• How did you manage the trade? Any mistakes?
• How was your psychology? Emotional, patient, disciplined?
• What would you do differently next time?
• Key lesson from this trade.`}
        className="flex-1 resize-none w-full font-mono leading-relaxed outline-none"
        style={{
          fontSize: "0.82rem",
          color: "var(--text-primary)",
          background: "transparent",
          padding: "16px 20px",
          lineHeight: 1.75,
        }}
      />
    </div>
  );
}

// ─── Trade detail panel ───────────────────────────────────────────────────────
function TradeDetailPanel({ trade }: { trade: Trade }) {
  const outcome = getOutcome(trade);
  const pnl = trade.pnl ?? 0;

  const rows = [
    {
      label: "Entry",
      value: trade.entry_date ? fmtDateTime(trade.entry_date) : "—",
    },
    {
      label: "Exit",
      value: trade.exit_date ? fmtDateTime(trade.exit_date) : "Open",
    },
    {
      label: "Entry px",
      value: trade.entry_price != null ? `$${trade.entry_price}` : "—",
    },
    {
      label: "Exit px",
      value: trade.exit_price != null ? `$${trade.exit_price}` : "—",
    },
    { label: "Size", value: `${trade.position_size} lots` },
    {
      label: "Stop",
      value: trade.stop_loss != null ? `$${trade.stop_loss}` : "—",
    },
    {
      label: "Target",
      value: trade.take_profit != null ? `$${trade.take_profit}` : "—",
    },
    {
      label: "R-Multiple",
      value: trade.r_multiple != null ? fmtR(trade.r_multiple) : "—",
      color:
        trade.r_multiple != null
          ? trade.r_multiple >= 0
            ? PROFIT
            : LOSS
          : undefined,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="rounded-[10px] p-4"
        style={{
          background:
            outcome === "WIN"
              ? "rgba(13,155,110,0.08)"
              : outcome === "LOSS"
                ? "rgba(224,82,82,0.08)"
                : "var(--surface-elevated)",
          border: `1px solid ${outcome === "WIN" ? "rgba(13,155,110,0.2)" : outcome === "LOSS" ? "rgba(224,82,82,0.2)" : "var(--border-subtle)"}`,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className="font-black tracking-tight"
              style={{ fontSize: "1.3rem", color: "var(--text-primary)" }}
            >
              {trade.symbol}
            </span>
            <DirectionBadge direction={trade.direction} />
          </div>
          <OutcomeBadge outcome={outcome} />
        </div>
        <div className="flex items-end gap-1">
          <span
            className="font-black tabular-nums"
            style={{
              fontSize: "1.8rem",
              lineHeight: 1,
              color: pnl > 0 ? PROFIT : pnl < 0 ? LOSS : "var(--text-tertiary)",
            }}
          >
            {fmtCurrency(trade.pnl)}
          </span>
          {trade.r_multiple != null && (
            <span
              className="mb-1"
              style={{
                fontSize: "0.78rem",
                color: trade.r_multiple >= 0 ? PROFIT : LOSS,
                fontWeight: 600,
              }}
            >
              {fmtR(trade.r_multiple)}
            </span>
          )}
        </div>
      </div>

      {/* Data rows */}
      <div
        className="rounded-[10px] overflow-hidden"
        style={{ border: "1px solid var(--border-subtle)" }}
      >
        {rows.map((row, i) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-3 py-2.5"
            style={{
              background:
                i % 2 === 0 ? "var(--surface)" : "var(--surface-elevated)",
              borderBottom:
                i < rows.length - 1
                  ? "1px solid var(--border-subtle)"
                  : undefined,
            }}
          >
            <span
              style={{
                fontSize: "0.68rem",
                color: "var(--text-tertiary)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {row.label}
            </span>
            <span
              className="font-mono tabular-nums"
              style={{
                fontSize: "0.75rem",
                color: row.color ?? "var(--text-primary)",
                fontWeight: 600,
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Notes from trade record */}
      {trade.notes && (
        <div
          className="rounded-[10px] p-3"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <span
            style={{
              fontSize: "0.6rem",
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              fontWeight: 700,
            }}
          >
            Trade Notes
          </span>
          <p
            className="mt-1.5 leading-relaxed"
            style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
          >
            {trade.notes}
          </p>
        </div>
      )}

      {/* View full trade link */}
      <Link
        href={`/trades/${trade.id}`}
        className="flex items-center justify-center gap-2 rounded-[8px] py-2.5 font-semibold transition-all w-full"
        style={{
          fontSize: "0.75rem",
          background: "var(--surface-elevated)",
          color: ACCENT,
          border: "1px solid var(--border-subtle)",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = `rgba(44,194,153,0.4)`)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = "var(--border-subtle)")
        }
      >
        <BarChart2 size={13} />
        View Full Trade Analysis
      </Link>
    </div>
  );
}

// ─── Daily summary view ───────────────────────────────────────────────────────
function DailyView({
  trades,
  noteMap,
  onRefresh,
}: {
  trades: Trade[];
  noteMap: Map<string, JournalEntry>;
  onRefresh: () => void;
}) {
  // Group trades by date
  const byDate = useMemo(() => {
    const map = new Map<string, Trade[]>();
    trades.forEach((t) => {
      const d = (t.entry_date ?? t.created_at ?? "").substring(0, 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(t);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [trades]);

  if (byDate.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-4"
        style={{ color: "var(--text-tertiary)" }}
      >
        <Activity size={40} strokeWidth={1.2} style={{ opacity: 0.3 }} />
        <div className="text-center">
          <p
            className="font-semibold"
            style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}
          >
            No trades yet
          </p>
          <p style={{ fontSize: "0.75rem" }}>
            Log your first trade to start journaling
          </p>
        </div>
        <Link
          href="/trades?new=true"
          className="flex items-center gap-2 rounded-[8px] px-4 py-2 font-semibold transition-all"
          style={{ background: ACCENT, color: "#051F20", fontSize: "0.78rem" }}
        >
          <Plus size={13} />
          Log First Trade
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full px-6 py-4 space-y-6">
      {byDate.map(([date, dayTrades]) => {
        const dayPnl = dayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
        const wins = dayTrades.filter((t) => (t.pnl ?? 0) > 0).length;
        const losses = dayTrades.filter((t) => (t.pnl ?? 0) < 0).length;

        return (
          <div key={date}>
            {/* Day header */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex flex-col items-center justify-center rounded-[8px] shrink-0"
                style={{
                  width: "44px",
                  height: "44px",
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.6rem",
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  {new Date(date).toLocaleDateString("en-US", {
                    month: "short",
                  })}
                </span>
                <span
                  className="font-black"
                  style={{
                    fontSize: "1rem",
                    color: "var(--text-primary)",
                    lineHeight: 1,
                  }}
                >
                  {new Date(date).getDate()}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="font-semibold"
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {new Date(date).toLocaleDateString("en-US", {
                      weekday: "long",
                    })}
                  </span>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {dayTrades.length} trade{dayTrades.length !== 1 ? "s" : ""}
                    {wins > 0 && ` · ${wins}W`}
                    {losses > 0 && ` ${losses}L`}
                  </span>
                </div>
                <span
                  className="font-bold tabular-nums"
                  style={{
                    fontSize: "0.88rem",
                    color:
                      dayPnl > 0
                        ? PROFIT
                        : dayPnl < 0
                          ? LOSS
                          : "var(--text-tertiary)",
                  }}
                >
                  {fmtCurrency(dayPnl)}
                </span>
              </div>
              <div
                className="h-px flex-1"
                style={{ background: "var(--border-subtle)" }}
              />
            </div>

            {/* Trade cards for the day */}
            <div className="grid gap-2 ml-14">
              {dayTrades.map((trade) => {
                const pnl = trade.pnl ?? 0;
                const hasNote = noteMap.has(trade.id);
                return (
                  <div
                    key={trade.id}
                    className="rounded-[10px] p-3"
                    style={{
                      background: "var(--surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-bold tracking-tight"
                          style={{
                            fontSize: "0.88rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          {trade.symbol}
                        </span>
                        <DirectionBadge direction={trade.direction} />
                        <OutcomeBadge outcome={getOutcome(trade)} />
                        {hasNote && (
                          <FileText size={10} style={{ color: ACCENT }} />
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {trade.r_multiple != null && (
                          <span
                            className="font-mono"
                            style={{
                              fontSize: "0.7rem",
                              color: trade.r_multiple >= 0 ? PROFIT : LOSS,
                              fontWeight: 600,
                            }}
                          >
                            {fmtR(trade.r_multiple)}
                          </span>
                        )}
                        <span
                          className="font-semibold tabular-nums"
                          style={{
                            fontSize: "0.85rem",
                            color:
                              pnl > 0
                                ? PROFIT
                                : pnl < 0
                                  ? LOSS
                                  : "var(--text-tertiary)",
                          }}
                        >
                          {fmtCurrency(trade.pnl)}
                        </span>
                      </div>
                    </div>
                    {trade.notes && (
                      <p
                        className="mt-1.5 leading-relaxed line-clamp-2"
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {trade.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────
function FilterBar({
  search,
  setSearch,
  outcome,
  setOutcome,
  direction,
  setDirection,
}: {
  search: string;
  setSearch: (v: string) => void;
  outcome: string;
  setOutcome: (v: string) => void;
  direction: string;
  setDirection: (v: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 shrink-0"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      {/* Search */}
      <div
        className="flex items-center gap-2 flex-1 rounded-[7px] px-2.5"
        style={{
          background: "var(--surface-elevated)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <Search
          size={11}
          style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Symbol…"
          className="flex-1 bg-transparent outline-none py-1.5"
          style={{ fontSize: "0.75rem", color: "var(--text-primary)" }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{ color: "var(--text-tertiary)" }}
          >
            <X size={10} />
          </button>
        )}
      </div>

      {/* Outcome filter */}
      <select
        value={outcome}
        onChange={(e) => setOutcome(e.target.value)}
        className="rounded-[7px] outline-none cursor-pointer"
        style={{
          background: "var(--surface-elevated)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-secondary)",
          fontSize: "0.72rem",
          padding: "5px 8px",
        }}
      >
        <option value="all">All</option>
        <option value="WIN">Wins</option>
        <option value="LOSS">Losses</option>
        <option value="BE">Break-even</option>
        <option value="OPEN">Open</option>
      </select>

      {/* Direction filter */}
      <select
        value={direction}
        onChange={(e) => setDirection(e.target.value)}
        className="rounded-[7px] outline-none cursor-pointer"
        style={{
          background: "var(--surface-elevated)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-secondary)",
          fontSize: "0.72rem",
          padding: "5px 8px",
        }}
      >
        <option value="all">L/S</option>
        <option value="LONG">Long</option>
        <option value="SHORT">Short</option>
      </select>
    </div>
  );
}

// ─── VIEW tabs ────────────────────────────────────────────────────────────────
type ViewTab = "trades" | "daily";

// ─── Main Journal Page ────────────────────────────────────────────────────────
export default function JournalPage() {
  const { selectedAccountId } = usePropAccount();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [noteMap, setNoteMap] = useState<Map<string, JournalEntry>>(new Map());
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [tradeNote, setTradeNote] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<ViewTab>("trades");

  // Filters
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState("all");
  const [direction, setDirection] = useState("all");

  // Load trades + journal entries
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ts, entries] = await Promise.all([
        getTrades({ propAccountId: selectedAccountId }),
        getJournalEntries(),
      ]);
      setTrades(ts);
      const map = new Map<string, JournalEntry>();
      entries.forEach((e) => {
        if (e.trade_id) map.set(e.trade_id, e);
      });
      setNoteMap(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    load();
  }, [load]);

  // When trade is selected, load its note
  const handleSelectTrade = useCallback(
    async (trade: Trade) => {
      setSelectedTrade(trade);
      setTradeNote(noteMap.get(trade.id) ?? null);
    },
    [noteMap],
  );

  // After a note is saved, update local map
  const handleNoteSaved = useCallback((entry: JournalEntry) => {
    setTradeNote(entry);
    if (entry.trade_id) {
      setNoteMap((prev) => new Map(prev).set(entry.trade_id!, entry));
    }
  }, []);

  // Filtered trades
  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (search && !t.symbol.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (outcome !== "all" && getOutcome(t) !== outcome) return false;
      if (direction !== "all" && t.direction !== direction) return false;
      return true;
    });
  }, [trades, search, outcome, direction]);

  const stats = useMemo(() => calcStats(filtered), [filtered]);

  return (
    <div
      className="flex h-[calc(100vh-52px)] overflow-hidden"
      style={{ background: "var(--app-bg)" }}
    >
      {/* ═══ LEFT PANEL — Trade List ═══════════════════════════════════════ */}
      <aside
        className="hidden md:flex flex-col shrink-0"
        style={{
          width: "300px",
          borderRight: "1px solid var(--border-subtle)",
          background: "var(--surface)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2">
            <BookOpen size={14} style={{ color: ACCENT }} />
            <span
              className="font-bold"
              style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}
            >
              Journal
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={load}
              className="flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--surface-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
              title="Refresh"
            >
              <RefreshCw size={12} strokeWidth={1.8} />
            </button>
            <Link
              href="/trades?new=true"
              className="flex items-center gap-1 rounded-[6px] px-2 py-1 font-semibold transition-all"
              style={{
                background: ACCENT,
                color: "#051F20",
                fontSize: "0.68rem",
              }}
            >
              <Plus size={10} strokeWidth={2.5} />
              New
            </Link>
          </div>
        </div>

        {/* View tabs: Trades / Daily */}
        <div className="flex shrink-0 px-3 pt-2 gap-1">
          {(["trades", "daily"] as ViewTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setViewTab(tab)}
              className="flex-1 rounded-[6px] py-1.5 font-semibold capitalize transition-all"
              style={{
                fontSize: "0.72rem",
                background:
                  viewTab === tab ? "var(--surface-active)" : "transparent",
                color: viewTab === tab ? ACCENT : "var(--text-tertiary)",
                boxShadow:
                  viewTab === tab ? `inset 0 -2px 0 ${ACCENT}` : undefined,
              }}
            >
              {tab === "trades" ? "Trade Log" : "Daily View"}
            </button>
          ))}
        </div>

        {/* Stats strip */}
        <div className="flex gap-2 px-3 py-2 shrink-0">
          <StatPill
            label="P&L"
            value={fmtCurrency(stats.total)}
            color={stats.total >= 0 ? PROFIT : LOSS}
          />
          <StatPill
            label="Win %"
            value={`${stats.winRate}%`}
            color={stats.winRate >= 50 ? PROFIT : LOSS}
          />
          <StatPill label="Trades" value={String(stats.tradeCount)} />
        </div>

        {/* Filter bar */}
        <FilterBar
          search={search}
          setSearch={setSearch}
          outcome={outcome}
          setOutcome={setOutcome}
          direction={direction}
          setDirection={setDirection}
        />

        {/* Trade list */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {loading ? (
            <div
              className="flex items-center justify-center h-full"
              style={{ color: "var(--text-tertiary)" }}
            >
              <div className="text-center">
                <Activity
                  size={24}
                  style={{ opacity: 0.3, margin: "0 auto 8px" }}
                />
                <p style={{ fontSize: "0.75rem" }}>Loading trades…</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="flex items-center justify-center h-full"
              style={{ color: "var(--text-tertiary)" }}
            >
              <div className="text-center">
                <FileText
                  size={24}
                  style={{ opacity: 0.3, margin: "0 auto 8px" }}
                />
                <p style={{ fontSize: "0.75rem" }}>No trades match filters</p>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5 py-1">
              {filtered.map((trade) => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  isSelected={selectedTrade?.id === trade.id}
                  hasNote={noteMap.has(trade.id)}
                  onClick={() => handleSelectTrade(trade)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Count footer */}
        <div
          className="px-4 py-2 shrink-0 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <span style={{ fontSize: "0.65rem", color: "var(--text-tertiary)" }}>
            {filtered.length} of {trades.length} trades
          </span>
          {stats.openCount > 0 && (
            <span
              style={{ fontSize: "0.65rem", color: ACCENT, fontWeight: 600 }}
            >
              {stats.openCount} open
            </span>
          )}
        </div>
      </aside>

      {/* ═══ CENTER PANEL — Main Content ═══════════════════════════════════ */}
      <main
        className="flex-1 flex flex-col overflow-hidden"
        style={{ background: "var(--surface)" }}
      >
        <AnimatePresence mode="wait">
          {viewTab === "daily" ? (
            <motion.div
              key="daily"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-hidden"
            >
              <DailyView trades={filtered} noteMap={noteMap} onRefresh={load} />
            </motion.div>
          ) : selectedTrade ? (
            <motion.div
              key={"note-" + selectedTrade.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Trade header bar */}
              <div
                className="flex items-center gap-3 px-6 py-3 shrink-0"
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  background: "var(--surface)",
                }}
              >
                <div className="flex items-center gap-2 flex-1">
                  <span
                    className="font-black tracking-tight"
                    style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}
                  >
                    {selectedTrade.symbol}
                  </span>
                  <DirectionBadge direction={selectedTrade.direction} />
                  <OutcomeBadge outcome={getOutcome(selectedTrade)} />
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {fmtDate(selectedTrade.entry_date)}
                  </span>
                </div>
                <span
                  className="font-bold tabular-nums"
                  style={{
                    fontSize: "1.1rem",
                    color:
                      (selectedTrade.pnl ?? 0) > 0
                        ? PROFIT
                        : (selectedTrade.pnl ?? 0) < 0
                          ? LOSS
                          : "var(--text-tertiary)",
                  }}
                >
                  {fmtCurrency(selectedTrade.pnl)}
                </span>
                <button
                  onClick={() => setSelectedTrade(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--surface-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <X size={13} />
                </button>
              </div>

              {/* Note editor */}
              <div className="flex-1 overflow-hidden">
                <NoteEditor
                  tradeId={selectedTrade.id}
                  entry={tradeNote}
                  onSaved={handleNoteSaved}
                />
              </div>
            </motion.div>
          ) : (
            /* Empty state — no trade selected */
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center gap-5"
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 72,
                  height: 72,
                  background: "rgba(44,194,153,0.08)",
                  border: "1px solid rgba(44,194,153,0.15)",
                }}
              >
                <BookOpen size={28} style={{ color: ACCENT, opacity: 0.7 }} />
              </div>
              <div className="text-center max-w-xs">
                <p
                  className="font-bold"
                  style={{
                    fontSize: "1rem",
                    color: "var(--text-primary)",
                    marginBottom: 6,
                  }}
                >
                  Select a trade to journal
                </p>
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-tertiary)",
                    lineHeight: 1.6,
                  }}
                >
                  Pick any trade from the list to write notes, reflect on your
                  decision-making, and track lessons learned.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/trades?new=true"
                  className="flex items-center gap-2 rounded-[8px] px-4 py-2 font-semibold transition-all"
                  style={{
                    background: ACCENT,
                    color: "#051F20",
                    fontSize: "0.78rem",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#3DD4AA")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = ACCENT)
                  }
                >
                  <Plus size={13} />
                  Log a Trade
                </Link>
                <button
                  onClick={() => setViewTab("daily")}
                  className="flex items-center gap-2 rounded-[8px] px-4 py-2 font-semibold transition-all"
                  style={{
                    background: "var(--surface-elevated)",
                    color: "var(--text-secondary)",
                    fontSize: "0.78rem",
                    border: "1px solid var(--border-subtle)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = `rgba(44,194,153,0.3)`)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--border-subtle)")
                  }
                >
                  <Calendar size={13} />
                  View Daily Summary
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ═══ RIGHT PANEL — Trade Detail ════════════════════════════════════ */}
      <AnimatePresence>
        {selectedTrade && viewTab === "trades" && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="hidden lg:flex flex-col shrink-0 overflow-hidden"
            style={{
              borderLeft: "1px solid var(--border-subtle)",
              background: "var(--surface)",
            }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <Layers size={13} style={{ color: ACCENT }} />
              <span
                className="font-semibold"
                style={{ fontSize: "0.78rem", color: "var(--text-primary)" }}
              >
                Trade Details
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <TradeDetailPanel trade={selectedTrade} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
