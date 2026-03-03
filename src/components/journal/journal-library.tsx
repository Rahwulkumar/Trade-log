"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  createChart,
  LineStyle,
  CandlestickSeries,
  type IChartApi,
} from "lightweight-charts";
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

// -- Shared format helpers (Phase 3: deduplicated) --
import {
  fmtCurrency,
  fmtR,
  fmtDate,
  fmtDateShort,
  getOutcome,
  PROFIT,
  LOSS_COLOR as LOSS,
  ACCENT,
} from "@/components/journal/utils/format";

// isJournaled — local check compatible with the loose JournalTrade type
function isJournaled(t: JournalTrade): boolean {
  const hasItems = (v: unknown) => Array.isArray(v) && v.length > 0;
  const hasTfObs =
    !!t.tf_observations &&
    typeof t.tf_observations === "object" &&
    Object.keys(t.tf_observations).length > 0;
  return !!(
    t.notes ||
    t.feelings ||
    t.observations ||
    t.execution_notes ||
    t.conviction ||
    hasItems(t.setup_tags) ||
    hasItems(t.mistake_tags) ||
    hasItems(t.screenshots) ||
    hasItems(t.execution_arrays) ||
    hasTfObs
  );
}

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
  created_at?: string | null;
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
    screenshots: [
      { url: "https://picsum.photos/seed/eurusd-4h/1600/900", timeframe: "4H" },
      {
        url: "https://picsum.photos/seed/eurusd-15m/1600/900",
        timeframe: "15M",
      },
    ],
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
      {label} · {value}
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
  const outcome = getOutcome(trade.status, trade.pnl);
  const isWin = outcome === "WIN";
  const isLoss = outcome === "LOSS";
  const pnlCol = isWin ? PROFIT : isLoss ? LOSS : "var(--text-tertiary)";
  const allTags = [...(trade.setup_tags ?? []), ...(trade.mistake_tags ?? [])];

  // Gradient hero strip colours
  const stripGrad = isWin
    ? "linear-gradient(135deg, var(--profit-primary) 0%, rgba(13,155,110,0.6) 100%)"
    : isLoss
      ? "linear-gradient(135deg, var(--loss-primary) 0%, rgba(255,68,85,0.7) 100%)"
      : "linear-gradient(135deg, var(--surface-active) 0%, var(--surface-elevated) 100%)";

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
              {trade.direction} · {fmtDateShort(trade.entry_date)}
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

// â”€â”€â”€ Dummy candle data shaped as lightweight-charts expects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type LC = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

function makeDummyCandles(
  base: number,
  count: number,
  step: number,
  seed: number,
): LC[] {
  const candles: LC[] = [];
  let price = base;
  const t0 = 1708761600; // Feb 24 2026 08:00 UTC
  for (let i = 0; i < count; i++) {
    const r =
      Math.sin(seed * (i + 1) * 7.3) * 0.0005 +
      Math.cos(seed * i * 3.7) * 0.0003;
    const open = price;
    const close = price + r * step;
    const high = Math.max(open, close) + Math.abs(r) * step * 0.4;
    const low = Math.min(open, close) - Math.abs(r) * step * 0.4;
    candles.push({ time: t0 + i * 900, open, high, low, close });
    price = close;
  }
  return candles;
}

const CHART_DATA: Record<string, LC[]> = {
  EURUSD: [
    {
      time: 1708761600,
      open: 1.0898,
      high: 1.0904,
      low: 1.0891,
      close: 1.0895,
    },
    {
      time: 1708762500,
      open: 1.0895,
      high: 1.0902,
      low: 1.0887,
      close: 1.0899,
    },
    {
      time: 1708763400,
      open: 1.0899,
      high: 1.0912,
      low: 1.0893,
      close: 1.0907,
    },
    { time: 1708764300, open: 1.0907, high: 1.0915, low: 1.09, close: 1.0903 },
    {
      time: 1708765200,
      open: 1.0903,
      high: 1.0908,
      low: 1.0894,
      close: 1.0897,
    },
    { time: 1708766100, open: 1.0897, high: 1.09, low: 1.0888, close: 1.089 },
    { time: 1708767000, open: 1.089, high: 1.0921, low: 1.0886, close: 1.0919 },
    {
      time: 1708767900,
      open: 1.0919,
      high: 1.0928,
      low: 1.0914,
      close: 1.0925,
    },
    { time: 1708768800, open: 1.0925, high: 1.0936, low: 1.092, close: 1.0932 },
    {
      time: 1708769700,
      open: 1.0932,
      high: 1.0941,
      low: 1.0928,
      close: 1.0938,
    },
    { time: 1708770600, open: 1.0938, high: 1.095, low: 1.0934, close: 1.0947 },
    {
      time: 1708771500,
      open: 1.0947,
      high: 1.0955,
      low: 1.0942,
      close: 1.0953,
    },
    {
      time: 1708772400,
      open: 1.0953,
      high: 1.0961,
      low: 1.0948,
      close: 1.0958,
    },
    {
      time: 1708773300,
      open: 1.0958,
      high: 1.0966,
      low: 1.0952,
      close: 1.0964,
    },
    {
      time: 1708774200,
      open: 1.0964,
      high: 1.0972,
      low: 1.0959,
      close: 1.0969,
    },
    { time: 1708775100, open: 1.0969, high: 1.0974, low: 1.096, close: 1.0963 },
    {
      time: 1708776000,
      open: 1.0963,
      high: 1.0968,
      low: 1.0953,
      close: 1.0956,
    },
    { time: 1708776900, open: 1.0956, high: 1.096, low: 1.0948, close: 1.0951 },
    {
      time: 1708777800,
      open: 1.0951,
      high: 1.0957,
      low: 1.0944,
      close: 1.0953,
    },
    { time: 1708778700, open: 1.0953, high: 1.096, low: 1.0948, close: 1.0957 },
  ],
  GBPJPY: [
    { time: 1708588800, open: 192.8, high: 192.95, low: 192.7, close: 192.9 },
    { time: 1708589700, open: 192.9, high: 193.05, low: 192.82, close: 192.98 },
    { time: 1708590600, open: 192.98, high: 193.12, low: 192.9, close: 193.05 },
    { time: 1708591500, open: 193.05, high: 193.2, low: 193.0, close: 193.15 },
    { time: 1708592400, open: 193.15, high: 193.25, low: 193.08, close: 193.1 },
    { time: 1708593300, open: 193.1, high: 193.18, low: 192.95, close: 193.0 },
    { time: 1708594200, open: 193.0, high: 193.08, low: 192.92, close: 193.05 },
    { time: 1708595100, open: 193.05, high: 193.2, low: 193.02, close: 193.15 },
    { time: 1708596000, open: 193.15, high: 193.28, low: 193.1, close: 193.22 },
    { time: 1708596900, open: 193.22, high: 193.35, low: 193.18, close: 193.3 },
    { time: 1708597800, open: 193.3, high: 193.38, low: 193.22, close: 193.25 },
    { time: 1708598700, open: 193.25, high: 193.3, low: 193.15, close: 193.18 },
    {
      time: 1708599600,
      open: 193.18,
      high: 193.22,
      low: 193.08,
      close: 193.12,
    },
    {
      time: 1708600500,
      open: 193.12,
      high: 193.18,
      low: 193.02,
      close: 193.06,
    },
    { time: 1708601400, open: 193.06, high: 193.1, low: 192.95, close: 192.98 },
    { time: 1708602300, open: 192.98, high: 193.02, low: 192.85, close: 192.9 },
    { time: 1708603200, open: 192.9, high: 192.96, low: 192.8, close: 192.85 },
    { time: 1708604100, open: 192.85, high: 192.9, low: 192.75, close: 192.8 },
    { time: 1708605000, open: 192.8, high: 192.88, low: 192.72, close: 192.82 },
    { time: 1708605900, open: 192.82, high: 192.9, low: 192.75, close: 192.86 },
  ],
};

function getDummyCandles(trade: JournalTrade): LC[] {
  const key = trade.symbol ?? "";
  if (CHART_DATA[key]) return CHART_DATA[key];
  // Generic fallback for other symbols
  const base = trade.entry_price ?? 1.0;
  return makeDummyCandles(
    base,
    20,
    base > 100 ? 1 : 0.001,
    parseFloat(trade.id?.slice(-4) ?? "1") || 1,
  );
}

// â”€â”€â”€ Compact Lightweight-Charts candlestick â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CompactChart({
  candles,
  entryPrice,
  exitPrice,
  stopLoss,
  takeProfit,
  direction,
  entryTime,
  exitTime,
}: {
  candles: LC[];
  entryPrice?: number | null;
  exitPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  direction?: string;
  entryTime?: string;
  exitTime?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!ref.current || candles.length === 0) return;

    const root = getComputedStyle(document.documentElement);
    const get = (v: string, fallback: string) =>
      root.getPropertyValue(v).trim() || fallback;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: ref.current.clientHeight,
      layout: {
        background: { color: "transparent" },
        textColor: get("--text-tertiary", "#6b7280"),
        fontSize: 10,
      },
      grid: {
        vertLines: { color: get("--border-subtle", "rgba(255,255,255,0.06)") },
        horzLines: { color: get("--border-subtle", "rgba(255,255,255,0.06)") },
      },
      crosshair: {
        vertLine: {
          color: get("--border-active", "rgba(255,255,255,0.2)"),
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: get("--border-active", "rgba(255,255,255,0.2)"),
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: get("--border-subtle", "rgba(255,255,255,0.06)"),
      },
      timeScale: {
        borderColor: get("--border-subtle", "rgba(255,255,255,0.06)"),
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: false, pressedMouseMove: false },
      handleScale: { mouseWheel: false, pinch: false },
    });

    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: get("--profit-primary", "#19b980"),
      downColor: get("--loss-primary", "#e06675"),
      borderUpColor: get("--profit-primary", "#19b980"),
      borderDownColor: get("--loss-primary", "#e06675"),
      wickUpColor: get("--profit-primary", "#19b980"),
      wickDownColor: get("--loss-primary", "#e06675"),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    series.setData(candles as any);

    // Price lines
    if (stopLoss)
      series.createPriceLine({
        price: stopLoss,
        color: get("--loss-primary", "#e06675"),
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: "SL",
        axisLabelVisible: true,
      });
    if (takeProfit)
      series.createPriceLine({
        price: takeProfit,
        color: get("--profit-primary", "#19b980"),
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: "TP",
        axisLabelVisible: true,
      });
    if (entryPrice)
      series.createPriceLine({
        price: entryPrice,
        color: get("--accent-primary", "#4d8dff"),
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        title: "Entry",
        axisLabelVisible: true,
      });
    if (exitPrice)
      series.createPriceLine({
        price: exitPrice,
        color: get("--text-secondary", "#9ca3af"),
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        title: "Exit",
        axisLabelVisible: true,
      });

    // Markers
    const markers = [];
    if (entryTime) {
      const t = Math.floor(new Date(entryTime).getTime() / 1000);
      markers.push({
        time: t,
        position: direction === "SHORT" ? "aboveBar" : "belowBar",
        color: get("--accent-primary", "#4d8dff"),
        shape: direction === "SHORT" ? "arrowDown" : "arrowUp",
        text: "E",
      });
    }
    if (exitTime) {
      const t = Math.floor(new Date(exitTime).getTime() / 1000);
      const isWin =
        (direction === "LONG" && (exitPrice ?? 0) > (entryPrice ?? 0)) ||
        (direction === "SHORT" && (exitPrice ?? 0) < (entryPrice ?? 0));
      markers.push({
        time: t,
        position: direction === "SHORT" ? "belowBar" : "aboveBar",
        color: isWin
          ? get("--profit-primary", "#19b980")
          : get("--loss-primary", "#e06675"),
        shape: direction === "SHORT" ? "arrowUp" : "arrowDown",
        text: "X",
      });
    }
    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (ref.current && chartRef.current) {
        chartRef.current.resize(
          ref.current.clientWidth,
          ref.current.clientHeight,
        );
      }
    });
    ro.observe(ref.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [
    candles,
    entryPrice,
    exitPrice,
    stopLoss,
    takeProfit,
    direction,
    entryTime,
    exitTime,
  ]);

  return <div ref={ref} className="w-full h-full" />;
}

// â”€â”€â”€ Stat row used in the sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div
      className="flex items-center justify-between py-2.5"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <span
        style={{
          fontSize: "0.7rem",
          color: "var(--text-tertiary)",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "0.78rem",
          fontWeight: 700,
          color: valueColor ?? "var(--text-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// â”€â”€â”€ Section heading in prose area â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ProseSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p
        style={{
          fontSize: "0.6rem",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          color: "var(--text-tertiary)",
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

// â”€â”€â”€ Main Journal Entry View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function JournalEntryView({
  trade,
  onBack,
  onEdit,
}: {
  trade: JournalTrade;
  onBack: () => void;
  onEdit: () => void;
}) {
  const outcome = getOutcome(trade.status, trade.pnl);
  const isWin = outcome === "WIN";
  const isLoss = outcome === "LOSS";
  const pnlColor = isWin ? PROFIT : isLoss ? LOSS : "var(--text-secondary)";
  const accent = isWin ? PROFIT : isLoss ? LOSS : ACCENT;

  const notes = trade.notes || "";
  const obs = trade.observations || "";
  const exNotes = trade.execution_notes || "";
  const feelings = trade.feelings || "";
  const setupTags = trade.setup_tags ?? [];
  const mistakeTags = trade.mistake_tags ?? [];
  const execArr = trade.execution_arrays ?? [];
  const screenshots = (trade.screenshots ?? []) as (
    | string
    | { url: string; timeframe?: string }
  )[];
  const tfObs = trade.tf_observations ?? {};
  const tfEntries = Object.entries(tfObs).filter(
    ([, v]) => v?.bias || v?.notes,
  ) as [string, { bias?: string; notes?: string }][];

  const candles = getDummyCandles(trade);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      className="flex h-full overflow-hidden"
      style={{ background: "var(--app-bg)" }}
    >
      {/* â•â• LEFT: Scrollable prose content â•â• */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero header â€” full width, no color blobs */}
        <div
          className="px-8 py-6"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--surface)",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            {/* Symbol + trade details */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h1
                  className="font-black tracking-tight"
                  style={{
                    fontSize: "2.4rem",
                    lineHeight: 1,
                    color: "var(--text-primary)",
                  }}
                >
                  {trade.symbol}
                </h1>
                <div className="flex flex-col gap-1 mt-1">
                  <span
                    style={{
                      fontSize: "0.58rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      padding: "3px 9px",
                      borderRadius: 5,
                      background: "var(--surface-elevated)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    {trade.direction === "LONG" ? (
                      <span>â–² LONG</span>
                    ) : (
                      <span>â–¼ SHORT</span>
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: "0.55rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      padding: "3px 9px",
                      borderRadius: 5,
                      textAlign: "center",
                      background: isWin
                        ? "var(--profit-bg)"
                        : isLoss
                          ? "var(--loss-bg)"
                          : "var(--surface-elevated)",
                      color: pnlColor,
                      border: `1px solid ${pnlColor}30`,
                    }}
                  >
                    {outcome}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-5">
                {trade.entry_date && (
                  <span
                    className="flex items-center gap-1.5"
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    <Calendar size={11} />
                    {fmtDate(trade.entry_date)}
                  </span>
                )}
                {trade.entry_price != null && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    Entry{" "}
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontWeight: 600,
                      }}
                    >
                      {trade.entry_price}
                    </span>
                  </span>
                )}
                {trade.exit_price != null && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    Exit{" "}
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontWeight: 600,
                      }}
                    >
                      {trade.exit_price}
                    </span>
                  </span>
                )}
                {trade.position_size != null && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    Size{" "}
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontWeight: 600,
                      }}
                    >
                      {trade.position_size}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* PnL right-aligned */}
            <div className="text-right shrink-0">
              <p
                style={{
                  fontSize: "0.52rem",
                  color: "var(--text-tertiary)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  marginBottom: 4,
                }}
              >
                Net P&amp;L
              </p>
              <p
                className="font-black tabular-nums"
                style={{ fontSize: "2.2rem", lineHeight: 1, color: pnlColor }}
              >
                {fmtCurrency(trade.pnl)}
              </p>
              {fmtR(trade.r_multiple) && (
                <p
                  className="font-mono"
                  style={{
                    fontSize: "0.85rem",
                    color: pnlColor,
                    opacity: 0.65,
                    marginTop: 3,
                  }}
                >
                  {fmtR(trade.r_multiple)}
                </p>
              )}
            </div>
          </div>

          {/* Setup tags inline with header */}
          {(setupTags.length > 0 ||
            mistakeTags.length > 0 ||
            execArr.length > 0) && (
            <div
              className="flex flex-wrap gap-2 mt-4 pt-4"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              {setupTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    padding: "4px 11px",
                    borderRadius: 6,
                    background: "var(--surface-elevated)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-default)",
                  }}
                >
                  {tag}
                </span>
              ))}
              {execArr.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1"
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    padding: "4px 11px",
                    borderRadius: 6,
                    background: `${accent}12`,
                    color: accent,
                    border: `1px solid ${accent}22`,
                  }}
                >
                  <Layers size={9} />
                  {tag}
                </span>
              ))}
              {mistakeTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    padding: "4px 11px",
                    borderRadius: 6,
                    background: "var(--loss-bg)",
                    color: LOSS,
                    border: `1px solid ${LOSS}22`,
                  }}
                >
                  âš  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Prose body */}
        <div className="px-8 py-7 flex flex-col gap-10">
          {/* Notes â€” largest, most prominent */}
          {notes && (
            <ProseSection title="Journal Entry">
              <p
                style={{
                  fontSize: "0.95rem",
                  color: "var(--text-primary)",
                  lineHeight: 1.9,
                  whiteSpace: "pre-wrap",
                }}
              >
                {notes}
              </p>
            </ProseSection>
          )}

          {exNotes && (
            <ProseSection title="Execution Notes">
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.85,
                  whiteSpace: "pre-wrap",
                }}
              >
                {exNotes}
              </p>
            </ProseSection>
          )}

          {obs && (
            <ProseSection title="Market Context">
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.85,
                  whiteSpace: "pre-wrap",
                }}
              >
                {obs}
              </p>
            </ProseSection>
          )}

          {feelings && (
            <ProseSection title="Mental State">
              <div className="flex flex-wrap gap-2">
                {feelings
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: "0.72rem",
                        padding: "5px 13px",
                        borderRadius: 99,
                        background: "var(--surface)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            </ProseSection>
          )}

          {/* Screenshots at the bottom of prose */}
          {screenshots.length > 0 && (
            <ProseSection title="Chart Screenshots">
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(screenshots.length, 2)}, 1fr)`,
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
                      className="relative group block overflow-hidden rounded-xl"
                      style={{
                        aspectRatio: "16/9",
                        background: "var(--surface)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                      {tf && (
                        <span
                          className="absolute bottom-2 left-2 text-white font-bold rounded"
                          style={{
                            fontSize: "0.58rem",
                            padding: "2px 8px",
                            background: "rgba(0,0,0,0.6)",
                            backdropFilter: "blur(4px)",
                          }}
                        >
                          {tf}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            </ProseSection>
          )}
        </div>
      </div>

      {/* â•â• RIGHT: Compact sidebar â•â• */}
      <div
        className="shrink-0 flex flex-col overflow-y-auto"
        style={{
          width: 300,
          background: "var(--surface)",
          borderLeft: "1px solid var(--border-subtle)",
        }}
      >
        {/* Chart â€” compact, not dominant */}
        <div
          className="shrink-0"
          style={{
            height: 200,
            background: "var(--surface-elevated)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <span
              style={{
                fontSize: "0.6rem",
                fontWeight: 700,
                color: "var(--text-tertiary)",
                letterSpacing: "0.08em",
              }}
            >
              {trade.symbol} Â· 15M
            </span>
            <span
              style={{
                fontSize: "0.52rem",
                color: "var(--text-tertiary)",
                fontStyle: "italic",
              }}
            >
              Simulated
            </span>
          </div>
          <div style={{ height: 168 }}>
            <CompactChart
              candles={candles}
              entryPrice={trade.entry_price}
              exitPrice={trade.exit_price}
              stopLoss={trade.stop_loss}
              takeProfit={trade.take_profit}
              direction={trade.direction}
              entryTime={trade.entry_date ?? undefined}
              exitTime={trade.exit_date ?? undefined}
            />
          </div>
        </div>

        {/* Trade stats */}
        <div
          className="px-4 py-1"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          {trade.entry_price != null && (
            <StatRow label="Entry" value={trade.entry_price} />
          )}
          {trade.exit_price != null && (
            <StatRow label="Exit" value={trade.exit_price} />
          )}
          {trade.stop_loss != null && (
            <StatRow
              label="Stop Loss"
              value={trade.stop_loss}
              valueColor={LOSS}
            />
          )}
          {trade.take_profit != null && (
            <StatRow
              label="Take Profit"
              value={trade.take_profit}
              valueColor={PROFIT}
            />
          )}
          {trade.position_size != null && (
            <StatRow label="Position Size" value={trade.position_size} />
          )}
          {trade.mae != null && (
            <StatRow
              label="MAE (drawdown)"
              value={`${trade.mae}R`}
              valueColor={LOSS}
            />
          )}
          {trade.mfe != null && (
            <StatRow
              label="MFE (peak)"
              value={`${trade.mfe}R`}
              valueColor={PROFIT}
            />
          )}
          {trade.conviction != null && (
            <div
              className="flex items-center justify-between py-2.5"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-tertiary)",
                  fontWeight: 500,
                }}
              >
                Conviction
              </span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background:
                        i <= (trade.conviction ?? 0)
                          ? accent
                          : "var(--surface-elevated)",
                      border: `1px solid ${i <= (trade.conviction ?? 0) ? accent : "var(--border-subtle)"}`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          {(trade.entry_rating || trade.exit_rating) && (
            <div
              className="flex items-center justify-between py-2.5"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-tertiary)",
                  fontWeight: 500,
                }}
              >
                Quality
              </span>
              <div className="flex gap-1.5">
                {trade.entry_rating && (
                  <span
                    style={{
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 4,
                      background:
                        trade.entry_rating === "Good"
                          ? "var(--profit-bg)"
                          : "var(--loss-bg)",
                      color: trade.entry_rating === "Good" ? PROFIT : LOSS,
                    }}
                  >
                    E: {trade.entry_rating}
                  </span>
                )}
                {trade.exit_rating && (
                  <span
                    style={{
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 4,
                      background:
                        trade.exit_rating === "Good"
                          ? "var(--profit-bg)"
                          : "var(--loss-bg)",
                      color: trade.exit_rating === "Good" ? PROFIT : LOSS,
                    }}
                  >
                    X: {trade.exit_rating}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MTF Bias */}
        {tfEntries.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <p
              style={{
                fontSize: "0.6rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "var(--text-tertiary)",
                marginBottom: 10,
              }}
            >
              Timeframe Bias
            </p>
            <div className="flex flex-col gap-0">
              {tfEntries.map(([tf, v]) => {
                const isBull = v.bias === "Bullish";
                const isBear = v.bias === "Bearish";
                return (
                  <div
                    key={tf}
                    className="flex items-center gap-2 py-2"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <span
                      style={{
                        fontSize: "0.6rem",
                        fontWeight: 800,
                        color: "var(--text-tertiary)",
                        minWidth: 28,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {tf}
                    </span>
                    <span
                      className="flex-1 truncate"
                      style={{
                        fontSize: "0.62rem",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {v.notes ?? ""}
                    </span>
                    {v.bias && (
                      <span
                        style={{
                          fontSize: "0.52rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          padding: "2px 6px",
                          borderRadius: 4,
                          color: isBull
                            ? PROFIT
                            : isBear
                              ? LOSS
                              : "var(--text-tertiary)",
                          background: isBull
                            ? "var(--profit-bg)"
                            : isBear
                              ? "var(--loss-bg)"
                              : "var(--surface-elevated)",
                        }}
                      >
                        {v.bias}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
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
      {label} · {value}
    </span>
  );
}

// â”€â”€â”€ Main JournalLibrary component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function JournalLibrary({
  trades,
  onEditTrade,
  onEntryViewChange,
}: {
  trades: JournalTrade[];
  onEditTrade: (trade: JournalTrade) => void;
  onEntryViewChange?: (trade: JournalTrade | null) => void;
}) {
  const [selectedEntry, setSelectedEntry] = useState<JournalTrade | null>(null);

  const selectEntry = (trade: JournalTrade | null) => {
    setSelectedEntry(trade);
    onEntryViewChange?.(trade);
  };

  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | "WIN" | "LOSS">(
    "all",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Only real journaled trades from DB — no demo data
  const allEntries = useMemo(() => trades.filter(isJournaled), [trades]);

  const filtered = useMemo(() => {
    return allEntries.filter((t) => {
      if (
        search &&
        !(t.symbol ?? "").toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (
        outcomeFilter !== "all" &&
        getOutcome(t.status, t.pnl) !== outcomeFilter
      )
        return false;
      if (dateFrom) {
        const d = t.entry_date ? new Date(t.entry_date) : null;
        if (!d || d < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const d = t.entry_date ? new Date(t.entry_date) : null;
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (!d || d > end) return false;
      }
      return true;
    });
  }, [allEntries, search, outcomeFilter, dateFrom, dateTo]);

  // Stats based on all journaled entries (not filtered)
  const stats = useMemo(() => {
    const wins = allEntries.filter(
      (t) => getOutcome(t.status, t.pnl) === "WIN",
    ).length;
    const total = allEntries.reduce((s, t) => s + (t.pnl ?? 0), 0);
    return { total, wins, count: allEntries.length };
  }, [allEntries]);

  if (selectedEntry) {
    return (
      <JournalEntryView
        trade={selectedEntry}
        onBack={() => selectEntry(null)}
        onEdit={() => {
          onEditTrade(selectedEntry);
          selectEntry(null);
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
              {stats.count} entries ·{" "}
              {Math.round((stats.wins / Math.max(stats.count, 1)) * 100)}% win
              rate ·{" "}
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
                          : "var(--accent-primary)"
                      : "var(--surface-elevated)",
                  color:
                    outcomeFilter === v
                      ? v === "all"
                        ? "#fff"
                        : "#fff"
                      : "var(--text-tertiary)",
                  border: `1px solid ${outcomeFilter === v ? "transparent" : "var(--border-subtle)"}`,
                }}
              >
                {v === "all" ? "All Trades" : v}
              </button>
            ))}
          </div>
        </div>

        {/* Search + Date filter row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex flex-1 min-w-[160px] items-center gap-2 rounded-[10px] px-3 py-2"
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
              placeholder="Search by symbol…"
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

          <div
            className="flex items-center gap-1.5 rounded-[10px] px-3 py-2"
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border-subtle)",
              flexShrink: 0,
            }}
          >
            <Calendar size={12} style={{ color: "var(--text-tertiary)" }} />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent outline-none"
              style={{
                fontSize: "0.72rem",
                color: dateFrom
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
                width: 110,
              }}
            />
          </div>

          <span
            style={{
              fontSize: "0.68rem",
              color: "var(--text-tertiary)",
              flexShrink: 0,
            }}
          >
            to
          </span>

          <div
            className="flex items-center gap-1.5 rounded-[10px] px-3 py-2"
            style={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border-subtle)",
              flexShrink: 0,
            }}
          >
            <Calendar size={12} style={{ color: "var(--text-tertiary)" }} />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent outline-none"
              style={{
                fontSize: "0.72rem",
                color: dateTo ? "var(--text-primary)" : "var(--text-tertiary)",
                width: 110,
              }}
            />
          </div>

          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="flex items-center gap-1 rounded-[8px] px-2.5 py-2"
              style={{
                fontSize: "0.65rem",
                color: "var(--text-tertiary)",
                background: "var(--surface-elevated)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <X size={10} /> Clear
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
                    onClick={() => selectEntry(trade)}
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
