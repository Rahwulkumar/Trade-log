/**
 * Centralized dummy / placeholder data
 * Used by Analytics, Reports, Journal, and any other page that shows example data
 * when a user has no real trades yet.
 */

// ─── Journal Dummy Trades ─────────────────────────────────────────────────────
export type DummyTrade = {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  entry_date: string;
  exit_date: string | null;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  position_size: number | null;
  pnl: number | null;
  r_multiple: number | null;
  execution_grade: string | null;
  session: string | null;
  conviction: number | null;
  playbook_id: string | null;
  notes: string | null;
  feelings: string | null;
  lesson_learned: string | null;
  would_take_again: boolean | null;
  commission: number | null;
  swap: number | null;
  mae: number | null;
  mfe: number | null;
  entry_rating: "Good" | "Neutral" | "Poor" | null;
  exit_rating: "Good" | "Neutral" | "Poor" | null;
  management_rating: "Good" | "Neutral" | "Poor" | null;
  screenshots: [];
  tf_observations: Record<string, { bias?: string; notes?: string }>;
  execution_notes: string | null;
  execution_arrays: string[];
  checked_rules: string[];
  setup_tags: string[];
  mistake_tags: string[];
};

export const DUMMY_TRADES: DummyTrade[] = [
  {
    id: "dummy-1",
    symbol: "XAUUSD",
    direction: "LONG",
    entry_date: "2026-02-24T08:15:00.000Z",
    exit_date: "2026-02-24T11:42:00.000Z",
    entry_price: 2318.45,
    exit_price: 2334.20,
    stop_loss: 2310.00,
    take_profit: 2345.00,
    position_size: 0.5,
    pnl: 787.50,
    r_multiple: 1.87,
    execution_grade: "A",
    session: "London",
    conviction: 4,
    playbook_id: null,
    notes: "Clean BOS on the 4H. Price swept the PDL and immediately reversed. ICT entry model — waited for the MSS on the 15M, FVG filled perfectly.",
    feelings: "Calm and focused. Followed the plan exactly. No FOMO, no revenge.",
    lesson_learned: "Patience on the entry pays off. Had I entered at the initial break I'd have been stopped out.",
    would_take_again: true,
    commission: -7.50,
    swap: 0,
    mae: 42,
    mfe: 680,
    entry_rating: "Good",
    exit_rating: "Good",
    management_rating: "Good",
    screenshots: [],
    tf_observations: {
      M: { bias: "Bullish", notes: "Above 2200 key level, premium zone" },
      W: { bias: "Bullish", notes: "Higher highs, targeting 2400 HTF" },
      D: { bias: "Bullish", notes: "Coming out of discount, FVG fill" },
      "4H": { bias: "Bullish", notes: "BOS confirmed, waiting for PB" },
      "1H": { bias: "Bullish", notes: "MSS on 15m, entry zone clear" },
    },
    execution_notes: "Entered on the 15M MSS retest. Clean displacement candle. SL below the newly created HL.",
    execution_arrays: ["Fair Value Gap", "Order Block", "Break of Structure"],
    checked_rules: [],
    setup_tags: ["ICT", "FVG", "London Session"],
    mistake_tags: [],
  },
  {
    id: "dummy-2",
    symbol: "EURUSD",
    direction: "SHORT",
    entry_date: "2026-02-23T14:30:00.000Z",
    exit_date: "2026-02-23T16:15:00.000Z",
    entry_price: 1.08520,
    exit_price: 1.08380,
    stop_loss: 1.08620,
    take_profit: 1.08300,
    position_size: 1.0,
    pnl: 140.00,
    r_multiple: 1.40,
    execution_grade: "B",
    session: "New York",
    conviction: 3,
    playbook_id: null,
    notes: "NY open rejection from the 1.086 supply zone. Saw previous day high act as resistance.",
    feelings: "A little impatient. Almost entered early.",
    lesson_learned: "Wait for the close above/below the key level before entering.",
    would_take_again: true,
    commission: -14.00,
    swap: 0,
    mae: 35,
    mfe: 180,
    entry_rating: "Neutral",
    exit_rating: "Good",
    management_rating: "Neutral",
    screenshots: [],
    tf_observations: {
      D: { bias: "Bearish", notes: "Lower highs structure" },
      "4H": { bias: "Bearish", notes: "Resistance at PDH" },
      "1H": { bias: "Bearish", notes: "Rejection wick visible" },
    },
    execution_notes: "Entered on the NY open candle close below 1.0852.",
    execution_arrays: ["Previous Day High", "Supply Zone"],
    checked_rules: [],
    setup_tags: ["Supply/Demand", "NY Session"],
    mistake_tags: [],
  },
  {
    id: "dummy-3",
    symbol: "GBPUSD",
    direction: "LONG",
    entry_date: "2026-02-21T07:05:00.000Z",
    exit_date: "2026-02-21T09:30:00.000Z",
    entry_price: 1.26180,
    exit_price: 1.26050,
    stop_loss: 1.26050,
    take_profit: 1.26550,
    position_size: 0.8,
    pnl: -104.00,
    r_multiple: -1.0,
    execution_grade: "C",
    session: "London",
    conviction: 2,
    playbook_id: null,
    notes: "Premature entry. Didn't wait for the London session confirmation. Got stopped out at break-even after moving SL early.",
    feelings: "Anxious. Wanted to catch the move but jumped in too early.",
    lesson_learned: "Never move SL to break-even within the first 30 minutes. Let the trade breathe.",
    would_take_again: false,
    commission: -9.60,
    swap: 0,
    mae: 130,
    mfe: 85,
    entry_rating: "Poor",
    exit_rating: "Poor",
    management_rating: "Poor",
    screenshots: [],
    tf_observations: {
      D: { bias: "Bullish", notes: "Above 1.26 support" },
      "4H": { bias: "Neutral", notes: "Consolidating at resistance" },
    },
    execution_notes: "Entered before London open confirmation. Mistake.",
    execution_arrays: ["Support Level"],
    checked_rules: [],
    setup_tags: ["London Open"],
    mistake_tags: ["Early Entry", "SL Moved Too Early"],
  },
  {
    id: "dummy-4",
    symbol: "NAS100",
    direction: "LONG",
    entry_date: "2026-02-20T15:30:00.000Z",
    exit_date: "2026-02-20T17:00:00.000Z",
    entry_price: 17842.0,
    exit_price: 17930.0,
    stop_loss: 17790.0,
    take_profit: 17980.0,
    position_size: 0.2,
    pnl: 176.00,
    r_multiple: 1.69,
    execution_grade: "A+",
    session: "New York",
    conviction: 5,
    playbook_id: null,
    notes: "Picture perfect NY afternoon continuation. OB+FVG confluence. Price ran exactly to target.",
    feelings: "Extremely focused. One of those trades where everything clicked.",
    lesson_learned: "Confluences pay. The more confluence the better the probability.",
    would_take_again: true,
    commission: -3.50,
    swap: 0,
    mae: 18,
    mfe: 210,
    entry_rating: "Good",
    exit_rating: "Good",
    management_rating: "Good",
    screenshots: [],
    tf_observations: {
      D: { bias: "Bullish", notes: "Strong uptrend, dip to OB" },
      "4H": { bias: "Bullish", notes: "Mitigation block" },
      "1H": { bias: "Bullish", notes: "Clean FVG at entry" },
    },
    execution_notes: "OB + FVG confluence. Entered on the rebalance of the FVG.",
    execution_arrays: ["Order Block", "Fair Value Gap", "Optimal Trade Entry"],
    checked_rules: [],
    setup_tags: ["ICT", "OB+FVG", "NY Session"],
    mistake_tags: [],
  },
  {
    id: "dummy-5",
    symbol: "XAUUSD",
    direction: "SHORT",
    entry_date: "2026-02-19T09:00:00.000Z",
    exit_date: "2026-02-19T12:30:00.000Z",
    entry_price: 2355.80,
    exit_price: 2340.20,
    stop_loss: 2362.00,
    take_profit: 2335.00,
    position_size: 0.5,
    pnl: 780.00,
    r_multiple: 2.52,
    execution_grade: "A",
    session: "London",
    conviction: 4,
    playbook_id: null,
    notes: "Premium zone rejection. Price had run into weekly supply and showed clear exhaustion.",
    feelings: "Patient. Waited for the exact entry signal.",
    lesson_learned: "Premium sells are always the cleanest.",
    would_take_again: true,
    commission: -7.50,
    swap: 0,
    mae: 62,
    mfe: 1580,
    entry_rating: "Good",
    exit_rating: "Neutral",
    management_rating: "Good",
    screenshots: [],
    tf_observations: {
      W: { bias: "Bearish", notes: "At weekly premium OB" },
      D: { bias: "Bearish", notes: "Bearish engulfing candle" },
      "4H": { bias: "Bearish", notes: "Distribution pattern" },
    },
    execution_notes: "Sold into the weekly OB. Clear rejection wick on the 1H.",
    execution_arrays: ["Order Block", "Premium Zone", "Weekly Level"],
    checked_rules: [],
    setup_tags: ["Weekly OB", "Premium", "London Session"],
    mistake_tags: [],
  },
  {
    id: "dummy-6",
    symbol: "USDJPY",
    direction: "LONG",
    entry_date: "2026-02-18T13:00:00.000Z",
    exit_date: "2026-02-18T15:45:00.000Z",
    entry_price: 149.820,
    exit_price: 149.450,
    stop_loss: 149.600,
    take_profit: 150.500,
    position_size: 1.0,
    pnl: -370.00,
    r_multiple: -1.68,
    execution_grade: "D",
    session: "New York",
    conviction: 2,
    playbook_id: null,
    notes: "Against the higher time frame bias. Should have been shorting the dollar weakness not buying.",
    feelings: "Frustrated after a previous loss. Revenge traded.",
    lesson_learned: "Never trade against the HTF. Emotions = losses.",
    would_take_again: false,
    commission: -15.00,
    swap: 0,
    mae: 390,
    mfe: 45,
    entry_rating: "Poor",
    exit_rating: "Poor",
    management_rating: "Poor",
    screenshots: [],
    tf_observations: {
      D: { bias: "Bearish", notes: "Downtrend, lower lows" },
      "4H": { bias: "Bearish", notes: "Failed break of structure" },
    },
    execution_notes: "Counter-trend trade. Should not have been taken.",
    execution_arrays: [],
    checked_rules: [],
    setup_tags: [],
    mistake_tags: ["Counter-Trend", "Revenge Trade", "No Confluence"],
  },
  {
    id: "dummy-7",
    symbol: "EURUSD",
    direction: "SHORT",
    entry_date: "2026-02-17T08:30:00.000Z",
    exit_date: "2026-02-17T10:00:00.000Z",
    entry_price: 1.08820,
    exit_price: 1.08620,
    stop_loss: 1.08920,
    take_profit: 1.08520,
    position_size: 1.5,
    pnl: 300.00,
    r_multiple: 2.00,
    execution_grade: "A",
    session: "London",
    conviction: 4,
    playbook_id: null,
    notes: "Monday morning distribution. Sold the London highs into the Asia range.",
    feelings: "Relaxed and systematic. No hesitation.",
    lesson_learned: "Mondays set the weekly range. London highs are great shorts.",
    would_take_again: true,
    commission: -21.00,
    swap: 0,
    mae: 25,
    mfe: 320,
    entry_rating: "Good",
    exit_rating: "Good",
    management_rating: "Good",
    screenshots: [],
    tf_observations: {
      W: { bias: "Bearish", notes: "At weekly premium" },
      D: { bias: "Bearish", notes: "NY close above key level, trap" },
      "4H": { bias: "Bearish", notes: "London high sweep forming" },
    },
    execution_notes: "Shorted the London high grab. FVG on the 15m confirmed.",
    execution_arrays: ["Previous Week High", "London Highs", "Stop Hunt"],
    checked_rules: [],
    setup_tags: ["London Open", "Monday Range", "Distribution"],
    mistake_tags: [],
  },
  {
    id: "dummy-8",
    symbol: "BTCUSD",
    direction: "LONG",
    entry_date: "2026-02-14T16:00:00.000Z",
    exit_date: null,
    entry_price: 51240.00,
    exit_price: null,
    stop_loss: 50400.00,
    take_profit: 54000.00,
    position_size: 0.1,
    pnl: null,
    r_multiple: null,
    execution_grade: null,
    session: "New York",
    conviction: 3,
    playbook_id: null,
    notes: "Swing trade off the weekly demand zone. Expecting a run to the 54-55k range.",
    feelings: "Confident but aware of BTC volatility.",
    lesson_learned: null,
    would_take_again: null,
    commission: -5.00,
    swap: null,
    mae: null,
    mfe: null,
    entry_rating: null,
    exit_rating: null,
    management_rating: null,
    screenshots: [],
    tf_observations: {
      W: { bias: "Bullish", notes: "Demand zone, buyers present" },
      D: { bias: "Bullish", notes: "Bullish close above 51k" },
    },
    execution_notes: "Weekly demand bounce. Long-term hold.",
    execution_arrays: ["Weekly Demand Zone", "Order Block"],
    checked_rules: [],
    setup_tags: ["Weekly Demand", "Swing"],
    mistake_tags: [],
  },
];

// ─── Risk Ratios ─────────────────────────────────────────────────────────────
export const DUMMY_RISK = {
  sharpe: 1.84,
  sortino: 2.31,
  calmar: 3.12,
  recoveryFactor: 4.7,
  riskOfRuin: 2.1,
};

// ─── Equity Curve ─────────────────────────────────────────────────────────────
export const DUMMY_EQUITY = [
  { date: "Jan 01", balance: 10000 },
  { date: "Jan 05", balance: 10340 },
  { date: "Jan 12", balance: 10180 },
  { date: "Jan 18", balance: 10890 },
  { date: "Jan 25", balance: 10720 },
  { date: "Feb 02", balance: 11350 },
  { date: "Feb 09", balance: 11100 },
  { date: "Feb 16", balance: 11780 },
  { date: "Feb 23", balance: 12240 },
  { date: "Mar 02", balance: 12080 },
  { date: "Mar 09", balance: 12560 },
  { date: "Mar 16", balance: 12150 },
  { date: "Mar 23", balance: 12890 },
  { date: "Mar 30", balance: 13210 },
];

// ─── Underwater / Drawdown Chart ──────────────────────────────────────────────
export const DUMMY_DRAWDOWN = [
  { date: "Jan 01", dd: 0 },
  { date: "Jan 05", dd: 0 },
  { date: "Jan 12", dd: -1.55 },
  { date: "Jan 18", dd: 0 },
  { date: "Jan 25", dd: -1.56 },
  { date: "Feb 02", dd: 0 },
  { date: "Feb 09", dd: -2.2 },
  { date: "Feb 16", dd: 0 },
  { date: "Feb 23", dd: 0 },
  { date: "Mar 02", dd: -1.31 },
  { date: "Mar 09", dd: 0 },
  { date: "Mar 16", dd: -3.26 },
  { date: "Mar 23", dd: 0 },
  { date: "Mar 30", dd: 0 },
];

// ─── R-Multiple Distribution ──────────────────────────────────────────────────
export const DUMMY_R_DIST = [
  { range: "≤-3R", count: 2 },
  { range: "-2R", count: 5 },
  { range: "-1R", count: 14 },
  { range: "0R", count: 8 },
  { range: "+1R", count: 22 },
  { range: "+2R", count: 11 },
  { range: "≥+3R", count: 4 },
];

// ─── P&L $ Distribution ───────────────────────────────────────────────────────
export const DUMMY_PNL_DIST = [
  { bucket: "-$500+", count: 2 },
  { bucket: "-$300", count: 5 },
  { bucket: "-$150", count: 12 },
  { bucket: "-$50", count: 18 },
  { bucket: "$0", count: 8 },
  { bucket: "+$50", count: 20 },
  { bucket: "+$150", count: 14 },
  { bucket: "+$300", count: 9 },
  { bucket: "+$500+", count: 4 },
];

// ─── Hold Time ────────────────────────────────────────────────────────────────
export const DUMMY_HOLD = [
  { label: "Scalp", sub: "<5m", count: 18, avgPnl: 42 },
  { label: "Quick", sub: "5-30m", count: 26, avgPnl: 87 },
  { label: "Intraday", sub: "30m-4h", count: 32, avgPnl: 134 },
  { label: "Extended", sub: "4h-1d", count: 14, avgPnl: 198 },
  { label: "Swing", sub: "1d+", count: 6, avgPnl: 312 },
];

// ─── Trading Sessions ─────────────────────────────────────────────────────────
export const DUMMY_SESSIONS = [
  {
    session: "Asian",
    range: "00:00–09:00 UTC",
    trades: 18,
    winRate: 55.6,
    pnl: 820,
    avgPnl: 45.6,
    color: "var(--accent-primary)",
  },
  {
    session: "London",
    range: "07:00–16:00 UTC",
    trades: 34,
    winRate: 67.6,
    pnl: 2140,
    avgPnl: 62.9,
    color: "#7c6af7",
  },
  {
    session: "New York",
    range: "12:00–21:00 UTC",
    trades: 28,
    winRate: 64.3,
    pnl: 1580,
    avgPnl: 56.4,
    color: "#f76a6a",
  },
  {
    session: "Overlap",
    range: "12:00–16:00 UTC",
    trades: 16,
    winRate: 75.0,
    pnl: 1240,
    avgPnl: 77.5,
    color: "#f7c36a",
  },
];

// ─── Day-of-Week Performance ──────────────────────────────────────────────────
export const DUMMY_DOW = [
  { day: "Monday", trades: 16, winRate: 62.5, totalPnl: 820 },
  { day: "Tuesday", trades: 22, winRate: 72.7, totalPnl: 1240 },
  { day: "Wednesday", trades: 18, winRate: 55.6, totalPnl: 380 },
  { day: "Thursday", trades: 24, winRate: 66.7, totalPnl: 1580 },
  { day: "Friday", trades: 16, winRate: 56.3, totalPnl: 560 },
];

// ─── Hour-of-Day Avg P&L ──────────────────────────────────────────────────────
export const DUMMY_HOURLY = [
  -12, -8, -15, -20, -5, 10, 18, 32, 45, 62, 78, 88, 94, 102, 88, 72, 58, 42,
  22, 8, -10, -18, -22, -14,
].map((avgPnl, hour) => ({
  hour,
  avgPnl,
  label: `${String(hour).padStart(2, "0")}:00`,
}));

// ─── Streak Data ──────────────────────────────────────────────────────────────
export const DUMMY_STREAKS = {
  current: 4,
  currentType: "win" as "win" | "loss",
  longestWin: 7,
  longestLoss: 3,
  recentTrades: [
    "W", "W", "W", "W", "L",
    "W", "W", "L", "L", "W",
    "W", "L", "W", "W", "W",
  ],
};

// ─── Consistency Score ────────────────────────────────────────────────────────
export const DUMMY_CONSISTENCY = {
  score: 73,
  positionSize: 81,
  timing: 69,
  winLossBalance: 74,
  stopAdherence: 68,
};

// ─── MAE vs MFE Scatter ───────────────────────────────────────────────────────
export const DUMMY_MAE_MFE = [
  { mae: 45, mfe: 320, result: "win" },
  { mae: 120, mfe: 180, result: "win" },
  { mae: 80, mfe: 420, result: "win" },
  { mae: 200, mfe: 90, result: "loss" },
  { mae: 300, mfe: 50, result: "loss" },
  { mae: 60, mfe: 240, result: "win" },
  { mae: 150, mfe: 160, result: "win" },
  { mae: 90, mfe: 380, result: "win" },
  { mae: 250, mfe: 30, result: "loss" },
  { mae: 40, mfe: 580, result: "win" },
  { mae: 180, mfe: 210, result: "loss" },
  { mae: 70, mfe: 290, result: "win" },
  { mae: 350, mfe: 80, result: "loss" },
  { mae: 110, mfe: 340, result: "win" },
  { mae: 55, mfe: 190, result: "win" },
  { mae: 280, mfe: 120, result: "loss" },
];

// ─── Instrument Breakdown ─────────────────────────────────────────────────────
export const DUMMY_INSTRUMENTS = [
  { symbol: "EURUSD", trades: 42, winRate: 66.7, avgPnl: 87, totalPnl: 3671, pf: 2.1, avgHold: "1h 18m" },
  { symbol: "GBPUSD", trades: 28, winRate: 60.7, avgPnl: 64, totalPnl: 1798, pf: 1.8, avgHold: "1h 42m" },
  { symbol: "XAUUSD", trades: 18, winRate: 72.2, avgPnl: 125, totalPnl: 2246, pf: 2.7, avgHold: "0h 45m" },
  { symbol: "USDJPY", trades: 14, winRate: 57.1, avgPnl: 43, totalPnl: 598, pf: 1.5, avgHold: "1h 05m" },
  { symbol: "BTCUSD", trades: 10, winRate: 80.0, avgPnl: 219, totalPnl: 2185, pf: 3.4, avgHold: "3h 10m" },
  { symbol: "NAS100", trades: 8, winRate: 62.5, avgPnl: 98, totalPnl: 786, pf: 1.9, avgHold: "0h 38m" },
];

// ─── Strategy Breakdown ───────────────────────────────────────────────────────
export const DUMMY_STRATEGIES = [
  { strategy: "Breakout Pullback", trades: 38, winRate: 68.4, avgPnl: 94, totalPnl: 3580, pf: 2.4 },
  { strategy: "Trend Continuation", trades: 32, winRate: 65.6, avgPnl: 79, totalPnl: 2522, pf: 2.1 },
  { strategy: "Support / Resistance", trades: 24, winRate: 58.3, avgPnl: 52, totalPnl: 1258, pf: 1.6 },
  { strategy: "London Open", trades: 18, winRate: 72.2, avgPnl: 113, totalPnl: 2027, pf: 2.8 },
  { strategy: "News Fade", trades: 8, winRate: 50.0, avgPnl: 28, totalPnl: 226, pf: 1.2 },
];

// ─── Reports Config ───────────────────────────────────────────────────────────
// Imported in reports/page.tsx for the report card grid
import type { LucideIcon } from "lucide-react";

export interface ReportConfig {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  type: "Performance" | "Strategy" | "Risk" | "Tax";
}

export const REPORT_TYPE_COLORS: Record<string, string> = {
  Performance: "var(--accent-primary)",
  Strategy: "var(--accent-secondary)",
  Risk: "var(--loss-primary)",
  Tax: "var(--text-tertiary)",
};
