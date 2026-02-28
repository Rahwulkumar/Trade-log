"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  Edit3,
  Calendar,
  Star,
  Tag,
  Camera,
  Zap,
  Heart,
  BarChart2,
  FileText,
  Search,
  X,
  TrendingUp,
  TrendingDown,
  Layers,
} from "lucide-react";

// â”€â”€â”€ Colour helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ACCENT = "#2CC299";
const PROFIT = "#0D9B6E";
const LOSS = "#FF4455";

// Define the base Trade type fields that JournalTrade will use, making them optional
// This avoids requiring all fields from the original `Trade` type from `supabase/types`
// which might have many non-nullable fields that are not always present in a JournalTrade context.
export type JournalTrade = {
  id?: string;
  symbol?: string;
  direction?: "LONG" | "SHORT";
  status?: "open" | "closed";
  pnl?: number | null;
  r_multiple?: number | null;
  entry_price?: number | null;
  exit_price?: number | null;
  entry_date?: string | null;
  exit_date?: string | null;
  position_size?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  prop_account_id?: string | null;
  playbook_id?: string | null;
  created_at?: string;
  // Journal-specific fields
  notes?: string | null;
  feelings?: string | null;
  observations?: string | null;
  execution_notes?: string | null;
  setup_tags?: string[] | null;
  mistake_tags?: string[] | null;
  execution_arrays?: string[] | null;
  screenshots?: (string | { url: string; timeframe?: string })[] | null;
  conviction?: number | null;
  entry_rating?: string | null;
  exit_rating?: string | null;
  mae?: number | null;
  mfe?: number | null;
  tf_observations?: Record<string, { bias?: string; notes?: string }> | null;
};

function getOutcome(t: JournalTrade) {
  if (t.status === "open") return "OPEN";
  const p = t.pnl ?? 0;
  if (p > 0.5) return "WIN";
  if (p < -0.5) return "LOSS";
  return "BE";
}

function fmtCurrency(n: number | null | undefined) {
  if (n == null) return "â€”";
  return (n >= 0 ? "+" : "") + "$" + Math.abs(n).toFixed(2);
}
function fmtR(n: number | null | undefined) {
  if (n == null) return null;
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "R";
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "â€”";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function fmtDateShort(d: string | null | undefined) {
  if (!d) return "â€”";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// â”€â”€â”€ Type used internally (Trade + journal fields) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function isJournaled(t: JournalTrade): boolean {
  return !!(
    t.notes ||
    t.feelings ||
    t.observations ||
    t.execution_notes ||
    t.conviction ||
    t.setup_tags?.length ||
    t.mistake_tags?.length ||
    t.screenshots?.length ||
    t.execution_arrays?.length ||
    (t.tf_observations && Object.keys(t.tf_observations).length > 0)
  );
}

// â”€â”€â”€ Dummy data for UI demo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const DUMMY_JOURNAL_TRADES: JournalTrade[] = [
  {
    id: "demo-1",
    symbol: "EURUSD",
    direction: "LONG",
    status: "closed",
    pnl: 482.5,
    r_multiple: 2.4,
    entry_price: 1.092,
    exit_price: 1.0968,
    entry_date: "2026-02-24T09:15:00Z",
    exit_date: "2026-02-24T14:30:00Z",
    position_size: 1.0,
    stop_loss: 1.09,
    take_profit: 1.098,
    prop_account_id: null,
    playbook_id: null,
    notes:
      "Textbook FVG entry on the 15m chart. I had been stalking this level for 3 days waiting for a clean sweep of the Asian session lows before a solid displacement. The killzone timing was perfect â€” London open gave the liquidity sweep I needed. Managed the trade well by trailing to BE after 1R.",
    feelings: "Confident, Focused, Patient",
    observations:
      "Dollar weakness was clear from the DXY correlation throughout the morning. NFP cycle correlation was bullish bias.",
    execution_notes:
      "Entered on the 15m FVG close after confirming OB on 1H. Clear displacement and imbalance before entry.",
    setup_tags: ["FVG Entry", "Liquidity Sweep", "Kill Zone Entry"],
    mistake_tags: [],
    conviction: 5,
    entry_rating: "Good",
    exit_rating: "Good",
    mae: 0.3,
    mfe: 2.8,
    tf_observations: {
      D: { bias: "Bullish", notes: "Above 50 EMA, targeting 1.0980 premium" },
      "4H": { bias: "Bullish", notes: "CHoCH confirmed, FVG formed" },
      "1H": { bias: "Bullish", notes: "OB aligned with 4H FVG" },
      "15m": { bias: "Bullish", notes: "Entry candle â€” FVG fill + sweep" },
      "5m": { bias: "Neutral", notes: "Execution timeframe" },
    },
    screenshots: [],
    execution_arrays: ["FVG", "OB", "Liquidity Grab", "Displacement"],
    created_at: "2026-02-24T09:15:00Z",
  },
  {
    id: "demo-2",
    symbol: "GBPJPY",
    direction: "SHORT",
    status: "closed",
    pnl: -218.0,
    r_multiple: -1.0,
    entry_price: 192.5,
    exit_price: 193.1,
    entry_date: "2026-02-22T13:45:00Z",
    exit_date: "2026-02-22T16:00:00Z",
    position_size: 0.5,
    stop_loss: 193.1,
    take_profit: 191.2,
    prop_account_id: null,
    playbook_id: null,
    notes:
      "I rushed into this trade during NY session without proper confirmation. The setup looked good on the 15m but I ignored the broader 4H bullish structure. Classic mistake of trading against HTF bias for a small intraday setup.",
    feelings: "Impatient, FOMO",
    observations:
      "GBP was strengthening against all pairs. I should have seen this coming from the morning session correlations.",
    execution_notes:
      "Bad execution â€” didn't wait for proper confirmation. Entered early on first touch of the level.",
    setup_tags: ["OB Entry"],
    mistake_tags: ["Against HTF Bias", "Early Entry", "FOMO"],
    conviction: 2,
    entry_rating: "Poor",
    exit_rating: "Neutral",
    mae: 1.0,
    mfe: 0.2,
    tf_observations: {
      D: { bias: "Bullish", notes: "Clear uptrend â€” I ignored this" },
      "4H": { bias: "Bullish", notes: "Against my short bias" },
      "1H": { bias: "Neutral", notes: "Ranging, unclear direction" },
      "15m": { bias: "Bearish", notes: "False signal â€” entry timeframe" },
    },
    screenshots: [],
    execution_arrays: ["OB"],
    created_at: "2026-02-22T13:45:00Z",
  },
  {
    id: "demo-3",
    symbol: "XAUUSD",
    direction: "LONG",
    status: "closed",
    pnl: 1240.0,
    r_multiple: 3.1,
    entry_price: 2310.0,
    exit_price: 2358.0,
    entry_date: "2026-02-20T08:00:00Z",
    exit_date: "2026-02-20T18:00:00Z",
    position_size: 0.25,
    stop_loss: 2294.0,
    take_profit: 2360.0,
    prop_account_id: null,
    playbook_id: null,
    notes:
      "This was my best gold trade of the month. Perfect alignment across all timeframes during the London-NY overlap. The NWOG from Monday provided the directional bias and the iFVG on the 15m gave a clean entry. Held through a pullback and was rewarded.",
    feelings: "Calm, Confident, In the Zone",
    observations:
      "Gold was being driven by DXY weakness and rate cut expectations. The macro alignment with the setup was pristine.",
    execution_notes:
      "Entered the iFVG fill at the 0.618 retracement. Confirmation from the 5m BOS gave confidence.",
    setup_tags: ["iFVG Entry", "NWOG", "BOS Continuation"],
    mistake_tags: [],
    conviction: 5,
    entry_rating: "Good",
    exit_rating: "Good",
    mae: 0.4,
    mfe: 3.5,
    tf_observations: {
      W: { bias: "Bullish", notes: "HTF narrative bullish from $2200" },
      D: { bias: "Bullish", notes: "NWOG directional" },
      "4H": { bias: "Bullish", notes: "Strong OB holding from last week" },
      "1H": { bias: "Bullish", notes: "FVG present" },
      "15m": { bias: "Bullish", notes: "iFVG entry" },
    },
    screenshots: [],
    execution_arrays: ["iFVG", "NWOG", "BOS", "Displacement", "OB"],
    created_at: "2026-02-20T08:00:00Z",
  },
  {
    id: "demo-4",
    symbol: "NAS100",
    direction: "SHORT",
    status: "closed",
    pnl: 680.0,
    r_multiple: 1.7,
    entry_price: 21850,
    exit_price: 21740,
    entry_date: "2026-02-18T15:30:00Z",
    exit_date: "2026-02-18T20:00:00Z",
    position_size: 0.1,
    stop_loss: 21915,
    take_profit: 21700,
    prop_account_id: null,
    playbook_id: null,
    notes:
      "Clean short on NAS100 during the NY session. BSL grab above the Asian highs gave the perfect short entry. Breaker block confirmed the entry and we saw a quick 170-point drop.",
    feelings: "Confident, Sharp",
    observations:
      "Tech sector was weak on the day due to bearish macro news. The index was clearly distribution at these levels.",
    execution_notes:
      "Shorted the breaker block after BSL grab was confirmed with a strong M-formation on 5m.",
    setup_tags: ["BSL Grab", "Breaker Block", "Displacement Entry"],
    mistake_tags: [],
    conviction: 4,
    entry_rating: "Good",
    exit_rating: "Neutral",
    mae: 0.5,
    mfe: 2.1,
    tf_observations: {
      D: { bias: "Bearish", notes: "Distribution zone" },
      "4H": { bias: "Bearish", notes: "CHoCH to downside" },
      "1H": { bias: "Bearish", notes: "BSL grabbed, breaker formed" },
      "15m": { bias: "Bearish", notes: "Entry candle" },
    },
    screenshots: [],
    execution_arrays: ["BSL Grab", "Breaker Block", "CHoCH"],
    created_at: "2026-02-18T15:30:00Z",
  },
];

// â”€â”€â”€ Mini conviction stars â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ConvictionDots({ value }: { value: number | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: i <= value ? ACCENT : "var(--border-active)",
          }}
        />
      ))}
    </div>
  );
}

// â”€â”€â”€ Quality badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function QualityBadge({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  const color =
    value === "Good"
      ? PROFIT
      : value === "Poor"
        ? LOSS
        : "var(--text-tertiary)";
  const bg =
    value === "Good"
      ? "var(--profit-bg)"
      : value === "Poor"
        ? "var(--loss-bg)"
        : "var(--surface-elevated)";
  return (
    <span
      className="text-[0.58rem] font-bold rounded-full px-2 py-0.5 uppercase tracking-wider"
      style={{ background: bg, color }}
    >
      {label} Â· {value}
    </span>
  );
}

// â”€â”€â”€ Journal Card (in the library grid) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function JournalCard({
  trade,
  onClick,
}: {
  trade: JournalTrade;
  onClick: () => void;
}) {
  const outcome = getOutcome(trade);
  const isWin = outcome === "WIN";
  const isLoss = outcome === "LOSS";
  const pnlCol = isWin ? PROFIT : isLoss ? LOSS : "var(--text-tertiary)";
  const allTags = [...(trade.setup_tags ?? []), ...(trade.mistake_tags ?? [])];

  // Gradient hero strip colours
  const stripGrad = isWin
    ? "linear-gradient(120deg, #03624C 0%, #0D9B6E 50%, #2CC299 100%)"
    : isLoss
      ? "linear-gradient(120deg, #7a1020 0%, #FF4455 100%)"
      : "linear-gradient(120deg, #1a1a2e 0%, #444 100%)";

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="group cursor-pointer rounded-[16px] overflow-hidden flex flex-col"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Gradient hero strip */}
      <div
        className="relative px-4 pt-4 pb-3 flex flex-col gap-1.5"
        style={{ background: stripGrad }}
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className="font-black tracking-tight text-white"
                style={{ fontSize: "1.4rem", lineHeight: 1 }}
              >
                {trade.symbol}
              </span>
              {trade.direction === "LONG" ? (
                <ArrowUpRight size={16} className="text-white opacity-90" />
              ) : (
                <ArrowDownRight size={16} className="text-white opacity-90" />
              )}
            </div>
            <span
              className="font-bold uppercase tracking-widest text-white opacity-70"
              style={{ fontSize: "0.55rem" }}
            >
              {trade.direction} Â· {fmtDateShort(trade.entry_date)}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className="font-black tabular-nums text-white"
              style={{ fontSize: "1.15rem", lineHeight: 1 }}
            >
              {fmtCurrency(trade.pnl)}
            </span>
            {fmtR(trade.r_multiple) && (
              <span
                className="font-mono font-bold text-white opacity-80"
                style={{ fontSize: "0.72rem" }}
              >
                {fmtR(trade.r_multiple)}
              </span>
            )}
          </div>
        </div>
        <ConvictionDots value={trade.conviction} />
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Notes preview */}
        {trade.notes && (
          <p
            className="leading-relaxed line-clamp-3"
            style={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              lineHeight: 1.65,
            }}
          >
            {trade.notes}
          </p>
        )}

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allTags.slice(0, 3).map((tag) => {
              const isMistake = (trade.mistake_tags ?? []).includes(tag);
              return (
                <span
                  key={tag}
                  className="rounded-full px-2 py-0.5 font-medium"
                  style={{
                    fontSize: "0.6rem",
                    background: isMistake
                      ? "var(--loss-bg)"
                      : "var(--accent-soft)",
                    color: isMistake
                      ? "var(--loss-primary)"
                      : "var(--accent-primary)",
                    border: `1px solid ${isMistake ? "var(--loss-primary)" : "var(--accent-primary)"}33`,
                  }}
                >
                  {tag}
                </span>
              );
            })}
            {allTags.length > 3 && (
              <span
                className="rounded-full px-2 py-0.5 font-medium"
                style={{
                  fontSize: "0.6rem",
                  background: "var(--surface-elevated)",
                  color: "var(--text-tertiary)",
                }}
              >
                +{allTags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer metrics */}
        <div
          className="flex items-center justify-between mt-auto pt-2"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-1">
            <QualityBadge label="E" value={trade.entry_rating} />
            <QualityBadge label="X" value={trade.exit_rating} />
          </div>
          <div
            className="flex items-center gap-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            {trade.screenshots?.length ? <Camera size={10} /> : null}
            {(trade.setup_tags?.length ?? 0) +
              (trade.mistake_tags?.length ?? 0) >
            0 ? (
              <Tag size={10} />
            ) : null}
            {trade.tf_observations &&
            Object.keys(trade.tf_observations).length > 0 ? (
              <BarChart2 size={10} />
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ Full journal entry view â€” editorial bento layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function JournalEntryView({
  trade,
  onBack,
  onEdit,
}: {
  trade: JournalTrade;
  onBack: () => void;
  onEdit: () => void;
}) {
  const outcome = getOutcome(trade);
  const isWin = outcome === "WIN";
  const isLoss = outcome === "LOSS";
  const notes = trade.notes || "";
  const feelings = trade.feelings || "";
  const obs = trade.observations || "";
  const exNotes = trade.execution_notes || "";
  const setupTags = trade.setup_tags ?? [];
  const mistakeTags = trade.mistake_tags ?? [];
  const execArrays = trade.execution_arrays ?? [];
  const screenshots = (trade.screenshots ?? []) as (
    | string
    | { url: string; timeframe?: string }
  )[];
  const tfObs = trade.tf_observations ?? {};
  const tfEntries = Object.entries(tfObs).filter(
    ([, v]) => v?.bias || v?.notes,
  );

  const accentCol = isWin ? "#0D9B6E" : isLoss ? "#FF4455" : ACCENT;
  const heroBg = isWin
    ? "linear-gradient(135deg, #021a13 0%, #033d28 50%, #044d33 100%)"
    : isLoss
      ? "linear-gradient(135deg, #1a0208 0%, #3d0210 50%, #550316 100%)"
      : "linear-gradient(135deg, #0a0a12 0%, #13131f 100%)";

  const biasColor = (b?: string) =>
    b === "Bullish" ? PROFIT : b === "Bearish" ? LOSS : "var(--text-tertiary)";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col h-full overflow-hidden"
      style={{ background: "var(--app-bg)" }}
    >
      {/* â”€â”€ NAV BAR â”€â”€ */}
      <div
        className="flex items-center justify-between px-6 py-2.5 shrink-0"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-[7px] px-3 py-1.5 font-semibold transition-all"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border-default)",
            color: "var(--text-secondary)",
            fontSize: "0.73rem",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = accentCol;
            e.currentTarget.style.color = accentCol;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-default)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
          All Journals
        </button>

        <div
          className="flex items-center gap-1.5 text-xs"
          style={{ color: "var(--text-tertiary)", fontSize: "0.65rem" }}
        >
          <span
            style={{
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Journal Library
          </span>
          <span>/</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
            {trade.symbol}
          </span>
          <span style={{ color: "var(--text-tertiary)", marginLeft: 2 }}>
            {fmtDateShort(trade.entry_date)}
          </span>
        </div>

        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 font-semibold transition-all"
          style={{
            background: accentCol + "22",
            border: `1px solid ${accentCol}55`,
            color: accentCol,
            fontSize: "0.72rem",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = accentCol + "33")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = accentCol + "22")
          }
        >
          <Edit3 size={11} />
          Edit Entry
        </button>
      </div>

      {/* â”€â”€ SCROLLABLE BODY â”€â”€ */}
      <div className="flex-1 overflow-y-auto">
        {/* â•â• HERO BANNER â•â• */}
        <div
          className="relative px-8 py-7 overflow-hidden"
          style={{ background: heroBg }}
        >
          {/* Large ghost symbol watermark */}
          <span
            className="absolute right-6 top-1/2 select-none pointer-events-none font-black tracking-tighter"
            style={{
              fontSize: "9rem",
              lineHeight: 1,
              transform: "translateY(-50%)",
              color: isWin ? "#0D9B6E" : isLoss ? "#FF4455" : ACCENT,
              opacity: 0.06,
            }}
          >
            {trade.symbol}
          </span>

          <div className="relative flex flex-col gap-4">
            {/* Row 1: Symbol + badge */}
            <div className="flex items-center gap-3">
              <span
                className="font-black tracking-tight text-white"
                style={{ fontSize: "3.2rem", lineHeight: 1 }}
              >
                {trade.symbol}
              </span>
              <div className="flex flex-col gap-1 mt-1">
                <span
                  className="rounded-full px-2.5 py-0.5 font-black text-white"
                  style={{
                    fontSize: "0.58rem",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {trade.direction}
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 font-black text-white"
                  style={{
                    fontSize: "0.58rem",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    background: isWin
                      ? "rgba(13,155,110,0.4)"
                      : isLoss
                        ? "rgba(255,68,85,0.4)"
                        : "rgba(44,194,153,0.3)",
                    border: `1px solid ${accentCol}66`,
                  }}
                >
                  {outcome}
                </span>
              </div>
            </div>

            {/* Row 2: PnL metrics row */}
            <div className="flex items-end gap-8 flex-wrap">
              <div>
                <p
                  style={{
                    fontSize: "0.58rem",
                    color: "rgba(255,255,255,0.45)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    marginBottom: 2,
                  }}
                >
                  Profit / Loss
                </p>
                <span
                  className="font-black text-white tabular-nums"
                  style={{ fontSize: "2.4rem", lineHeight: 1 }}
                >
                  {fmtCurrency(trade.pnl)}
                </span>
                {fmtR(trade.r_multiple) && (
                  <span
                    className="block font-mono font-bold mt-0.5"
                    style={{ fontSize: "1rem", color: accentCol }}
                  >
                    {fmtR(trade.r_multiple)}
                  </span>
                )}
              </div>

              {/* Vertical divider */}
              <div
                style={{
                  width: 1,
                  height: 48,
                  background: "rgba(255,255,255,0.1)",
                  flexShrink: 0,
                }}
              />

              {/* Entry / Exit */}
              <div className="flex gap-6">
                {trade.entry_price && (
                  <div>
                    <p
                      style={{
                        fontSize: "0.55rem",
                        color: "rgba(255,255,255,0.4)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        marginBottom: 3,
                      }}
                    >
                      Entry
                    </p>
                    <span
                      className="font-bold text-white"
                      style={{ fontSize: "1.05rem" }}
                    >
                      {trade.entry_price}
                    </span>
                  </div>
                )}
                {trade.exit_price && (
                  <div>
                    <p
                      style={{
                        fontSize: "0.55rem",
                        color: "rgba(255,255,255,0.4)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        marginBottom: 3,
                      }}
                    >
                      Exit
                    </p>
                    <span
                      className="font-bold text-white"
                      style={{ fontSize: "1.05rem" }}
                    >
                      {trade.exit_price}
                    </span>
                  </div>
                )}
                {trade.position_size && (
                  <div>
                    <p
                      style={{
                        fontSize: "0.55rem",
                        color: "rgba(255,255,255,0.4)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        marginBottom: 3,
                      }}
                    >
                      Size
                    </p>
                    <span
                      className="font-bold text-white"
                      style={{ fontSize: "1.05rem" }}
                    >
                      {trade.position_size}
                    </span>
                  </div>
                )}
              </div>

              {/* Vertical divider */}
              <div
                style={{
                  width: 1,
                  height: 48,
                  background: "rgba(255,255,255,0.1)",
                  flexShrink: 0,
                }}
              />

              {/* Date */}
              <div>
                <p
                  style={{
                    fontSize: "0.55rem",
                    color: "rgba(255,255,255,0.4)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    marginBottom: 3,
                  }}
                >
                  Date
                </p>
                <span
                  className="font-semibold text-white"
                  style={{ fontSize: "0.85rem" }}
                >
                  {fmtDate(trade.entry_date)}
                </span>
              </div>
            </div>

            {/* Row 3: Conviction */}
            {trade.conviction != null && (
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontSize: "0.58rem",
                    color: "rgba(255,255,255,0.4)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                  }}
                >
                  Conviction
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={13}
                      fill={
                        i <= (trade.conviction ?? 0) ? "#fff" : "transparent"
                      }
                      stroke={
                        i <= (trade.conviction ?? 0)
                          ? "#fff"
                          : "rgba(255,255,255,0.3)"
                      }
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* â•â• METRIC STRIP (horizontal scrollable row) â•â• */}
        <div
          className="flex items-stretch gap-0 shrink-0 overflow-x-auto"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--surface)",
          }}
        >
          {/* Entry quality */}
          {trade.entry_rating && (
            <MetricCell label="Entry Quality">
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color:
                    trade.entry_rating === "Good"
                      ? PROFIT
                      : trade.entry_rating === "Poor"
                        ? LOSS
                        : "var(--text-secondary)",
                }}
              >
                {trade.entry_rating}
              </span>
            </MetricCell>
          )}
          {/* Exit quality */}
          {trade.exit_rating && (
            <MetricCell label="Exit Quality">
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color:
                    trade.exit_rating === "Good"
                      ? PROFIT
                      : trade.exit_rating === "Poor"
                        ? LOSS
                        : "var(--text-secondary)",
                }}
              >
                {trade.exit_rating}
              </span>
            </MetricCell>
          )}
          {/* MAE */}
          {trade.mae != null && (
            <MetricCell label="MAE">
              <span
                style={{ fontSize: "0.75rem", fontWeight: 800, color: LOSS }}
              >
                {trade.mae}R
              </span>
            </MetricCell>
          )}
          {/* MFE */}
          {trade.mfe != null && (
            <MetricCell label="MFE">
              <span
                style={{ fontSize: "0.75rem", fontWeight: 800, color: PROFIT }}
              >
                {trade.mfe}R
              </span>
            </MetricCell>
          )}
          {/* Tags count */}
          {setupTags.length + mistakeTags.length > 0 && (
            <MetricCell label="Tags">
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                }}
              >
                {setupTags.length + mistakeTags.length}
              </span>
            </MetricCell>
          )}
          {/* Screenshots count */}
          {screenshots.length > 0 && (
            <MetricCell label="Charts">
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                }}
              >
                {screenshots.length}
              </span>
            </MetricCell>
          )}
          {/* Feelings */}
          {feelings && (
            <MetricCell label="Mindset">
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                {feelings.split(",")[0].trim()}
              </span>
            </MetricCell>
          )}
        </div>

        {/* â•â• BENTO CONTENT GRID â•â• */}
        <div className="p-6 flex flex-col gap-5">
          {/* ROW 1: Notes (wide) + MTF Bias (narrow) */}
          {(notes || tfEntries.length > 0) && (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: tfEntries.length > 0 ? "1fr 240px" : "1fr",
              }}
            >
              {/* Notes */}
              {notes && (
                <div
                  className="rounded-[14px] p-6 relative overflow-hidden"
                  style={{
                    background: "var(--surface)",
                    border: `1px solid ${accentCol}30`,
                    borderLeft: `3px solid ${accentCol}`,
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.6rem",
                      color: accentCol,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      marginBottom: 14,
                    }}
                  >
                    Journal Entry
                  </p>
                  <p
                    style={{
                      fontSize: "0.88rem",
                      color: "var(--text-primary)",
                      lineHeight: 1.95,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {notes}
                  </p>
                </div>
              )}

              {/* MTF BIAS stacked column */}
              {tfEntries.length > 0 && (
                <div
                  className="rounded-[14px] overflow-hidden flex flex-col"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    className="px-4 py-3"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <p
                      style={{
                        fontSize: "0.6rem",
                        color: "var(--text-tertiary)",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.18em",
                      }}
                    >
                      MTF Bias
                    </p>
                  </div>
                  <div className="flex flex-col flex-1">
                    {tfEntries.map(([tf, v], idx) => (
                      <div
                        key={tf}
                        className="flex items-center justify-between px-4 py-2.5"
                        style={{
                          borderBottom:
                            idx < tfEntries.length - 1
                              ? "1px solid var(--border-subtle)"
                              : "none",
                          background:
                            v.bias === "Bullish"
                              ? "rgba(13,155,110,0.04)"
                              : v.bias === "Bearish"
                                ? "rgba(255,68,85,0.04)"
                                : "transparent",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {tf}
                        </span>
                        <div className="flex items-center gap-1">
                          {v.bias === "Bullish" ? (
                            <TrendingUp
                              size={10}
                              style={{ color: biasColor(v.bias) }}
                            />
                          ) : (
                            <TrendingDown
                              size={10}
                              style={{ color: biasColor(v.bias) }}
                            />
                          )}
                          <span
                            style={{
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              color: biasColor(v.bias),
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {v.bias ?? "â€”"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ROW 2: Tags (left) + Execution (right) */}
          {(setupTags.length > 0 ||
            mistakeTags.length > 0 ||
            execArrays.length > 0 ||
            exNotes) && (
            <div className="grid grid-cols-2 gap-4">
              {/* Tags panel */}
              {(setupTags.length > 0 || mistakeTags.length > 0) && (
                <div
                  className="rounded-[14px] p-5"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--text-tertiary)",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      marginBottom: 14,
                    }}
                  >
                    Tags & Concepts
                  </p>
                  {setupTags.length > 0 && (
                    <div className="mb-3">
                      <p
                        style={{
                          fontSize: "0.55rem",
                          color: accentCol,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                          marginBottom: 6,
                        }}
                      >
                        Setup
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {setupTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-[6px] px-2.5 py-1 font-semibold"
                            style={{
                              fontSize: "0.7rem",
                              background: accentCol + "15",
                              color: accentCol,
                              border: `1px solid ${accentCol}30`,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {mistakeTags.length > 0 && (
                    <div>
                      <p
                        style={{
                          fontSize: "0.55rem",
                          color: LOSS,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                          marginBottom: 6,
                        }}
                      >
                        Mistakes
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {mistakeTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-[6px] px-2.5 py-1 font-semibold"
                            style={{
                              fontSize: "0.7rem",
                              background: "var(--loss-bg)",
                              color: LOSS,
                              border: `1px solid ${LOSS}30`,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Execution panel */}
              {(execArrays.length > 0 || exNotes) && (
                <div
                  className="rounded-[14px] p-5"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--text-tertiary)",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      marginBottom: 14,
                    }}
                  >
                    Execution
                  </p>
                  {execArrays.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {execArrays.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 font-semibold"
                          style={{
                            fontSize: "0.7rem",
                            background: "var(--surface-elevated)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border-default)",
                          }}
                        >
                          <Layers size={9} style={{ color: ACCENT }} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {exNotes && (
                    <p
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.75,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {exNotes}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ROW 3: Observations + Mindset side by side */}
          {(obs || feelings) && (
            <div className="grid grid-cols-2 gap-4">
              {obs && (
                <div
                  className="rounded-[14px] p-5"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--text-tertiary)",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      marginBottom: 12,
                    }}
                  >
                    Market Observations
                  </p>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.8,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {obs}
                  </p>
                </div>
              )}
              {feelings && (
                <div
                  className="rounded-[14px] p-5"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--text-tertiary)",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      marginBottom: 12,
                    }}
                  >
                    Psychological State
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {feelings
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full px-3 py-1.5 font-medium"
                          style={{
                            fontSize: "0.75rem",
                            background: "var(--surface-elevated)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--border-default)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ROW 4: Screenshots full-width masonry */}
          {screenshots.length > 0 && (
            <div
              className="rounded-[14px] p-5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <p
                style={{
                  fontSize: "0.6rem",
                  color: "var(--text-tertiary)",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  marginBottom: 14,
                }}
              >
                Chart Screenshots
              </p>
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(screenshots.length, 3)}, 1fr)`,
                }}
              >
                {screenshots.map((s, i) => {
                  const url = typeof s === "string" ? s : s.url;
                  const tf = typeof s === "string" ? null : s.timeframe;
                  return (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="relative rounded-[10px] overflow-hidden aspect-video block group"
                      style={{
                        background: "var(--surface-elevated)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Chart ${i + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {tf && (
                        <span
                          className="absolute bottom-2 left-2 rounded-md px-2 py-0.5 font-bold"
                          style={{
                            fontSize: "0.6rem",
                            background: "rgba(0,0,0,0.75)",
                            color: "#fff",
                          }}
                        >
                          {tf}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {/* end BENTO GRID */}
      </div>
      {/* end scrollable body */}
    </motion.div>
  );
}

// â”€â”€â”€ Horizontal metric cell (in the strip) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MetricCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-3 shrink-0"
      style={{ borderRight: "1px solid var(--border-subtle)" }}
    >
      <span
        style={{
          fontSize: "0.52rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: "var(--text-tertiary)",
          marginBottom: 4,
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
// â”€â”€â”€ Section wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "var(--text-tertiary)",
          }}
        >
          {title}
        </span>
        <div
          className="flex-1 h-px ml-1"
          style={{ background: "var(--border-subtle)" }}
        />
      </div>
      {children}
    </div>
  );
}

// â”€â”€â”€ Hero quality badge (white text on gradient) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function QualityBadgeHero({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  const alpha =
    value === "Good"
      ? "rgba(13,155,110,0.3)"
      : value === "Poor"
        ? "rgba(255,68,85,0.3)"
        : "rgba(255,255,255,0.15)";
  return (
    <span
      className="text-[0.6rem] font-bold rounded-full px-2.5 py-1 uppercase tracking-wider text-white"
      style={{ background: alpha, border: "1px solid rgba(255,255,255,0.3)" }}
    >
      {label} Â· {value}
    </span>
  );
}

// â”€â”€â”€ Main JournalLibrary component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function JournalLibrary({
  trades,
  onEditTrade,
}: {
  trades: JournalTrade[];
  onEditTrade: (trade: JournalTrade) => void;
}) {
  const [selectedEntry, setSelectedEntry] = useState<JournalTrade | null>(null);
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | "WIN" | "LOSS">(
    "all",
  );

  // Combine real journaled trades + dummy data for demo
  const allEntries = useMemo(() => {
    const real = trades.filter(isJournaled);
    // Deduplicate by id â€” real trades take priority over demo
    const realIds = new Set(real.map((t) => t.id));
    const demos = DUMMY_JOURNAL_TRADES.filter((d) => !realIds.has(d.id));
    return [...real, ...demos];
  }, [trades]);

  const filtered = useMemo(() => {
    return allEntries.filter((t) => {
      if (search && !t.symbol.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (outcomeFilter !== "all" && getOutcome(t) !== outcomeFilter)
        return false;
      return true;
    });
  }, [allEntries, search, outcomeFilter]);

  // Stats
  const stats = useMemo(() => {
    const wins = allEntries.filter((t) => getOutcome(t) === "WIN").length;
    const total = allEntries.reduce((s, t) => s + (t.pnl ?? 0), 0);
    return { total, wins, count: allEntries.length };
  }, [allEntries]);

  if (selectedEntry) {
    return (
      <JournalEntryView
        trade={selectedEntry}
        onBack={() => setSelectedEntry(null)}
        onEdit={() => {
          onEditTrade(selectedEntry);
          setSelectedEntry(null);
        }}
      />
    );
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: "var(--app-bg)" }}
    >
      {/* â”€â”€ Library header â”€â”€ */}
      <div
        className="px-6 py-4 shrink-0 flex flex-col gap-3"
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--surface)",
        }}
      >
        {/* Title row */}
        <div className="flex items-end justify-between">
          <div>
            <h1
              className="font-black tracking-tight"
              style={{ fontSize: "1.4rem", color: "var(--text-primary)" }}
            >
              Journal Library
            </h1>
            <p
              style={{
                fontSize: "0.73rem",
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              {stats.count} entries Â·{" "}
              {Math.round((stats.wins / Math.max(stats.count, 1)) * 100)}% win
              rate Â·{" "}
              <span
                style={{
                  color: stats.total >= 0 ? PROFIT : LOSS,
                  fontWeight: 700,
                }}
              >
                {fmtCurrency(stats.total)}
              </span>
            </p>
          </div>
          {/* Filter chips */}
          <div className="flex items-center gap-2">
            {(["all", "WIN", "LOSS"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setOutcomeFilter(v)}
                className="rounded-full px-3 py-1.5 font-semibold transition-all"
                style={{
                  fontSize: "0.68rem",
                  background:
                    outcomeFilter === v
                      ? v === "WIN"
                        ? PROFIT
                        : v === "LOSS"
                          ? LOSS
                          : "var(--text-primary)"
                      : "var(--surface-elevated)",
                  color: outcomeFilter === v ? "#fff" : "var(--text-tertiary)",
                  border: `1px solid ${outcomeFilter === v ? "transparent" : "var(--border-subtle)"}`,
                }}
              >
                {v === "all" ? "All Trades" : v}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 rounded-[10px] px-3 py-2"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Search
            size={13}
            style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by symbolâ€¦"
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: "0.78rem", color: "var(--text-primary)" }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ color: "var(--text-tertiary)" }}
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* â”€â”€ Grid â”€â”€ */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <FileText
              size={32}
              style={{ color: "var(--text-tertiary)", opacity: 0.3 }}
            />
            <p style={{ fontSize: "0.82rem", color: "var(--text-tertiary)" }}>
              No journal entries match
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filtered.map((trade, i) => (
                <motion.div
                  key={trade.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <JournalCard
                    trade={trade}
                    onClick={() => setSelectedEntry(trade)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
