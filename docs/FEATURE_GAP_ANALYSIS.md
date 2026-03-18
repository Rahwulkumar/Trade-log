# Feature Gap Analysis — Trading Journal vs Top Competitors
Generated: 2026-03-18

Competitors benchmarked: **TradeZella**, **Edgewonk**, **TraderSync**, **Tradervue**, **TradesViz**

---

## Executive Summary

Our app has a strong foundation: MT5 auto-sync, rich journal editor, advanced analytics, prop-firm tracking, and ICT-specific tooling that no competitor matches out of the box. However, we are missing ~30 features that competitors use as primary selling points — most critically: **goal tracking**, **a composite scoring system**, **pre/post-session planning**, **built-out reports**, **AI coaching**, **tilt/emotion detection**, and **trade import from brokers beyond MT5**.

---

## SECTION 1 — DASHBOARD

### What We Have
| Feature | Status |
|---------|--------|
| Greeting band + date | ✅ |
| Account balance card | ✅ |
| Gross Profit / Loss / Net P&L stat cards | ✅ |
| Today's P&L, Win Rate, Avg R:R, Best Trade strip | ✅ |
| Cashflow chart (1W/1M/3M/YTD) | ✅ |
| Win/Loss/Break-even donut | ✅ |
| Profit Factor, Avg Win/Loss, Largest Win | ✅ |
| Top Playbooks widget | ✅ |
| Prop firm ArcProgress gauge | ✅ |
| Recent Trades list | ✅ |
| Embedded Trading Calendar | ✅ |

### Missing vs Competitors

#### 🔴 HIGH PRIORITY

**1. Composite Score / Consistency Score (like Zella Score)**
- TradeZella: "Zella Score" 0–100, factors in profitability + risk mgmt + consistency + discipline
- Edgewonk: "Consistency Score" gauge 0–100
- We have a static donut chart — no single actionable number
- **Gap**: No single number that tells a trader how well they're performing holistically
- **Proposed**: "Edge Score" — weighted composite of win rate, profit factor, drawdown control, rule adherence, avg R, and consistency. Displayed prominently as a gauge on the dashboard.

**2. Tilt Meter / Emotional Trading Detection**
- TradeZella: Tilt Meter flags when trader is in emotional trading mode (e.g., increasing size after losses, revenge trading)
- TraderSync: Cypher AI detects "emerging trends" like tilt
- **Gap**: We track conviction and emotions per trade but never surface a *live warning*
- **Proposed**: Tilt indicator on dashboard — computes trailing 5-trade pattern: if position size increasing after consecutive losses OR trades clustered in <5 min after a loss, flag "Tilt Risk: High"

**3. Goal Tracking Progress Cards**
- TradeZella, Edgewonk: Daily/weekly/monthly goals (P&L target, win rate goal, max trades, no overtrading)
- TraderSync: Goal adherence % shown on dashboard
- **Gap**: We have no goal setting or tracking at all
- **Proposed**: Goal cards on dashboard — Today's Goal: "Max 3 trades" (2/3 used), "Stop at -$200" ($0/$200 used), "Win rate >60%" (66% this week ✅)

**4. Daily Pre-Market Plan CTA**
- TradeZella: "Daily Notebook" — pre-market and post-session entries tied to the day
- Edgewonk: Daily planner with bias, goals, mental state
- **Gap**: Our daily planner is disconnected from the dashboard entirely
- **Proposed**: Dashboard card "Today's Plan" — if no plan for today, show CTA. If plan written, show plan summary + "Today's Bias: Bullish" badge

**5. Weekly/Daily P&L Target Progress Bar**
- TradeZella, TraderSync: Shows "you're at 67% of your weekly profit target"
- **Gap**: We show raw numbers but no goal-relative progress
- **Proposed**: Progress bar on Net P&L card showing goal completion %

#### 🟡 MEDIUM PRIORITY

**6. Customizable Widget Layout**
- TradeZella: Instant-Insight Widgets — pick which metrics appear on dashboard
- TraderSync: Drag-and-drop dashboard customization
- **Gap**: Our dashboard is fully hardcoded
- **Proposed**: Widget grid where user can show/hide sections, reorder cards

**7. Live Market Overview Strip**
- Most competitors: Show current session (London/NY/Asian), major indices price, volatility index
- **Gap**: No live market context on dashboard
- **Proposed**: Thin strip at top — current session badge, DXY, SPX, VIX (via free API)

**8. Trading Rules Violation Counter**
- Edgewonk, TradeZella: "You broke 2 rules today" visible on dashboard
- **Gap**: Our rules checklist exists in the playbook module but never aggregated
- **Proposed**: "Rule Adherence" stat card — % of trades where all rules were checked

---

## SECTION 2 — JOURNAL / NOTEBOOK

### What We Have
| Feature | Status |
|---------|--------|
| Two-panel rich card layout | ✅ |
| Trade list with date grouping | ✅ |
| Hero card (grade, session, conviction, PnL) | ✅ |
| Trade chart with entry/exit markers | ✅ |
| Metrics card (entry, exit, SL, TP, size, commission) | ✅ |
| MAE/MFE card | ✅ |
| Analysis card — 5 tabs (Setup/Execution/Mindset/Review/Evidence) | ✅ |
| BiasWidget (MTF top-down bias per TF) | ✅ |
| ExecutionWidget (ICT confluences + trigger notes) | ✅ |
| StrategyPlaybookModule | ✅ |
| PsychologyWidget | ✅ |
| Screenshot gallery | ✅ |
| TagSelector (ICT setup tags + mistake tags) | ✅ |
| ConvictionStars, QualityRating (Entry/Exit/Management) | ✅ |
| SessionSelect, Lesson Learned, Would Take Again | ✅ |
| BlockNote rich text editor | ✅ |

### Missing vs Competitors

#### 🔴 HIGH PRIORITY

**9. Pre-Trade Plan vs Actual Execution Comparison**
- Edgewonk: Shows planned entry/exit vs actual, calculates "slippage" from plan
- TradeZella: Side-by-side plan vs execution analysis
- **Gap**: We capture execution details but never compare to what was planned
- **Proposed**: In the Review tab — "Planned Entry" field vs "Actual Entry", "Planned Exit" vs "Actual Exit", with delta badges showing slippage. Feeds into execution quality score.

**10. Emotional State Per-Trade (Sleep, Mood, Energy, Focus)**
- Edgewonk: Tracks sleep quality (1–5), mood (1–5), tiredness (1–5), concentration, stress level
- These correlate to performance in their analytics
- **Gap**: We track conviction (confidence) and mistake tags but not physiological/emotional state
- **Proposed**: In Mindset tab — 4 sliders: 😴 Sleep (1–5), 😊 Mood (1–5), ⚡ Energy (1–5), 🎯 Focus (1–5). Small, fast to fill. Enables "your win rate when sleep < 3 is 38%" analytics.

**11. Trade Plan Adherence Score**
- Edgewonk: Numeric 1–10 score: "Did you follow your trading plan on this trade?"
- TradeZella: Adherence metric tied to goals
- **Gap**: We have Would Take Again (boolean) + Quality Ratings but no explicit plan adherence score
- **Proposed**: Single 1–10 slider in Review tab "Plan adherence". Aggregates to show "avg adherence" on analytics.

**12. Filters: Instrument Type, Market Condition, Session**
- TraderSync, TradeZella: Filter journal by instrument type (forex/futures/crypto), market condition (trending/ranging), session
- **Gap**: Our left panel filters by symbol and outcome only
- **Proposed**: Additional filter chips — Session (London/NY/Asian), Market Condition (Trending/Ranging/Choppy), Setup Tag

**13. Trade Template / Quick-Fill from Playbook**
- TradeZella: When you assign a playbook, it pre-fills the setup notes, tags, and rules checklist
- **Gap**: Our playbook module is informational, not autofill
- **Proposed**: When a playbook is selected, auto-populate the setup tags from the playbook's associated ICT tags + pre-check relevant rules

#### 🟡 MEDIUM PRIORITY

**14. Linked Trades (Scale-In / Partial Exits)**
- Tradervue: Link related trades that are parts of the same position
- TraderSync: Multi-leg options/futures position grouping
- **Gap**: MT5 sync pushes individual deals; no grouping logic
- **Proposed**: "Group with..." button to merge multiple partial entries/exits into one compound trade card

**15. Trade Notes Audio/Video**
- TraderSync: Video journaling — record yourself reacting to the trade
- **Gap**: Text + screenshots only
- **Proposed**: Audio note recorder in the journal (short voice memos, transcribed by AI)

**16. Duplicate / Clone Trade**
- Tradervue: Clone a trade to compare different scenarios
- **Gap**: No clone functionality

---

## SECTION 3 — ANALYTICS

### What We Have
| Feature | Status |
|---------|--------|
| Risk-adjusted metrics (Sharpe, Sortino, Calmar, Recovery Factor, Risk of Ruin) | ✅ |
| Equity curve + drawdown chart | ✅ |
| R-Multiple distribution | ✅ |
| P&L distribution histogram | ✅ |
| Hold time breakdown | ✅ |
| Session performance (London/NY/Tokyo/Sydney) | ✅ |
| Day of week performance chart | ✅ |
| Hour of day heatmap | ✅ |
| Streak tracker | ✅ |
| Consistency score gauge | ✅ |
| MAE vs MFE scatter | ✅ |
| By Instrument breakdown table | ✅ |
| By Strategy breakdown table | ✅ |

### Missing vs Competitors

#### 🔴 HIGH PRIORITY

**17. Edge Finder / Pattern Analyzer**
- Edgewonk: "Edge Finder" — automatically identifies combinations of factors that correlate with your winning trades (e.g., "London session + FVG Entry + A+ grade → 78% win rate, 2.8R avg")
- TradeZella: Cross-Analysis tool — cross-reference any two data dimensions
- **Gap**: We show performance per-dimension (per session, per symbol) but never correlate two dimensions
- **Proposed**: "Edge Finder" page/tab — multi-dimension filter (Session × Setup Tag, Time × Symbol, Grade × Market Condition) showing win rate + avg R + P&L heatmap table

**18. Emotional State Correlation Analytics**
- Edgewonk's killer feature: "Your win rate when sleep < 3 stars is 31% vs 67% when > 4"
- TradeZella: Correlates Tilt Score with P&L
- **Gap**: We don't track emotional state fields (see item 10), so can't compute this
- **Proposed**: Once emotional state fields are added, auto-generate "Performance by Mood/Sleep/Energy" charts in analytics

**19. Plan Adherence vs Performance Chart**
- Edgewonk: Scatter plot of plan adherence score (1–10) vs P&L — shows correlation
- **Gap**: No plan adherence field, no correlation chart
- **Proposed**: After adding plan adherence slider, scatter plot in analytics showing the correlation

**20. Time-in-Market / Overtrading Analysis**
- TradeZella: Shows "trades per day" distribution, flags overtrading days (above your personal threshold)
- TraderSync: "Best performance days" analysis — optimal trade count per day
- **Gap**: We show streaks but not per-day trade count analysis
- **Proposed**: "Optimal Trade Count" analysis — bar chart of trades per day color-coded by that day's P&L, showing your sweet spot

**21. Best / Worst Time to Trade (Personalized)**
- TradeZella, Tradervue: Personalizes hour-of-day heatmap to your specific profitable windows
- **Gap**: We have a generic heatmap but no "recommendation" layer
- **Proposed**: Overlay on the hour heatmap: green glow on your 3 best hours, red glow on your 3 worst hours. CTA: "Avoid trading between 12:00–14:00 UTC (your weakest window)"

**22. Consecutive Loss / Win Streak Impact**
- TradeZella: Shows how P&L changes after consecutive wins/losses — detects tilt patterns
- **Gap**: We show streak length but not the downstream P&L impact
- **Proposed**: Chart — "After N consecutive losses, your next trade win rate is X%"

#### 🟡 MEDIUM PRIORITY

**23. Monthly Report Card (auto-generated)**
- Edgewonk: Monthly "report card" with grade, top strengths, top weaknesses, compared to previous month
- TradeZella: Monthly Performance Report
- **Gap**: Our Reports page has placeholder cards only
- **Proposed**: Auto-generated monthly summary card — overall grade, best day, worst day, top mistake, most profitable setup, vs last month comparison

**24. Psychological State Overview**
- Edgewonk: Dedicated analytics section for emotional trends — how mood/sleep affects you over time
- **Gap**: No aggregated psychology analytics
- **Proposed**: Psychology Analytics section — line chart of avg mood over time, overlaid with equity curve

**25. Playbook Performance Deep-Dive**
- TradeZella: Detailed playbook analytics — win rate trend over time, R expectancy, best symbols for the playbook
- **Gap**: Our playbooks page shows aggregate stats but no time-series or symbol breakdown
- **Proposed**: Per-playbook analytics page — win rate over time line chart, best/worst symbols for that playbook, best session for that playbook

---

## SECTION 4 — REPORTS (Currently All "Coming Soon")

### Missing: All Reports Are Placeholder

#### 🔴 HIGH PRIORITY — Build These First

**26. Weekly Performance Report**
- Every competitor has this
- Auto-generated: trades this week, P&L, win rate, best/worst trade, rule adherence, grade vs last week
- **Proposed**: `/reports/weekly` — auto-pulls last 7 days, generates printable report

**27. Monthly Performance Report**
- Standard across all platforms
- Summary: trades, P&L, win rate, profit factor, max DD, top symbol, top playbook, psychological trend
- **Proposed**: `/reports/monthly` — month selector, auto-generated PDF/PNG export

**28. Tax / P&L Export Report**
- TraderSync, Tradervue: Generate tax-ready trade logs (realized P&L per trade, total for year)
- **Gap**: We have "Export Data" button but no structured tax report
- **Proposed**: Tax report page — calendar year selector, realized P&L table, gross profit/loss, net P&L, downloadable CSV and PDF

**29. Risk Management Report**
- Shows: position sizing consistency, R:R adherence, drawdown events, max risk per trade
- **Proposed**: `/reports/risk` — charts showing risk per trade over time, days where risk exceeded threshold, R distribution

**30. Playbook Analysis Report**
- Win rate + P&L per playbook, playbook evolution over time, which rules are most often skipped
- **Proposed**: `/reports/playbooks` — per-playbook report card with trend lines

---

## SECTION 5 — NEW FEATURES (Don't Exist At All)

### 🔴 HIGH PRIORITY — Biggest Competitive Gaps

**31. Daily Planner (Pre-Market + Post-Session)**
- TradeZella: "Daily Notebook" — separate from trade journal, for daily planning
- Edgewonk: Day-level mental/physical state + bias + goals before trading starts
- All top journals have this — it's a core journaling workflow
- **Proposed**: New page `/planner` — Calendar on left, today selected. Right panel has two sections:
  - **Pre-Market** (fill in the morning): Overall bias (Bullish/Neutral/Bearish), key levels watching, news events today, daily goal (P&L target + max trades), mindset check (sleep/mood/energy sliders), "What's my plan if I hit my daily loss limit?"
  - **Post-Session** (fill in the evening): What went well, what went wrong, rule adherence today (1–10), lessons learned, grade the day (A/B/C/D/F)
  - Pre/post entries auto-link to all trades on that day

**32. Goal Tracking System**
- TradeZella, Edgewonk, TraderSync: All have goal setting + progress tracking
- **Proposed**: New page `/goals` — Create goals by type:
  - Performance goals: "Achieve 65% win rate this month"
  - Risk goals: "Never risk more than 1% per trade"
  - Discipline goals: "Take max 3 trades per day"
  - Process goals: "Complete pre-market plan every day"
  - Progress tracked automatically from trade data. Dashboard widget shows active goals + completion %.

**33. Trade Import (CSV / Broker Sync)**
- TradeZella: 20+ brokers. TraderSync: 700+ brokers. Tradervue: 80+ brokers
- **Gap**: We only have MT5 EA sync
- **Proposed**: CSV import UI — upload trade export from any broker, map columns (Date, Symbol, Direction, Entry, Exit, PnL, Size), create trades in bulk. Support common formats: MT4/MT5 history report CSV, IBKR Activity Statement, Binance trade history.

**34. Composite Edge Score (like Zella Score)**
- The single most-cited differentiator of TradeZella
- **Proposed**: "Edge Score" — computed weekly, shown on dashboard and each trade:
  ```
  Edge Score = weighted average of:
    - Win Rate component (25%): scale from 0→100 based on win rate vs breakeven
    - Risk Management (25%): consistency of R:R and no blow-up days
    - Discipline (25%): plan adherence + rule adherence + no revenge trades
    - Expectancy (25%): avg R-multiple normalized
  ```
  Display as 0–100 gauge. Show trend (up/down from last week).

**35. Trading Rules Engine**
- Edgewonk: Define your trading rules (e.g., "Only trade London session", "Never trade during news"), then flag when a trade violates a rule
- TradeZella: Rule checklist at trade level, adherence % tracked
- **Gap**: We have rules inside playbooks (checklist) but no global rules or violation detection
- **Proposed**: `/rules` page — Define personal trading rules. Each rule has: name, description, auto-detect condition (optional). At trade level, show which rules were/weren't followed. Dashboard shows rule adherence %.

**36. AI Trade Analysis (ICT-Specific)**
- TraderSync: Cypher AI — chat with your journal data
- TradeZella: Zella AI — spots revenge trading, tilt
- We have Gemini integration (currently broken env var)
- **Proposed**: Fix Gemini integration. Add "AI Analysis" button per trade → sends trade data + journal notes to Gemini → returns: "This trade shows [X] pattern. Based on your history, [Y] mistakes are recurring. Your best setup is [Z]." Also: Chat UI to ask questions like "What's my best session?" "When do I revenge trade?"

**37. Tilt Detection System**
- TradeZella's Tilt Meter is a differentiating feature
- **Proposed**: Computed in real-time from MT5 sync data:
  - Flag: 3+ consecutive losses → tilt risk rising
  - Flag: Position size > 150% of your avg after a loss → "Size revenge" detected
  - Flag: Trade taken < 5 min after a stop-out → "Emotional re-entry" detected
  - Dashboard Tilt Meter: 🟢 Calm / 🟡 Caution / 🔴 Tilt
  - Optional: Auto-pause sync/notifications when tilt detected

**38. Market Replay / Trade Replay**
- TradeZella (Pro): Replay your specific trade's price action
- TraderSync: 250ms market replay with full order simulation
- This is a major feature requiring significant engineering
- **Proposed (MVP)**: Within the trade chart card, add "Replay" button — animates price candles from entry time forward to exit, highlighting entry/exit markers as they occur. Uses existing chart data already fetched.

---

## SECTION 6 — CALENDAR

### What We Have
- Monthly heatmap with daily P&L colors ✅
- Stale "Supabase Not Configured" copy 🔴 (audit finding H5)
- Broken route (`/trades` 404) 🔴

### Missing vs Competitors

**39. Session Kill Zone Overlay**
- ICT-specific — overlay London/NY/Asian session windows on calendar days
- **Proposed**: Toggle to show session bands on the calendar month view

**40. Economic Events on Calendar**
- TradeZella, TraderSync: Show FOMC, NFP, CPI events on the calendar
- We have `/news` with economic calendar but it's disconnected from the trading calendar
- **Proposed**: Merge news/event data onto the trading calendar — show 🔴 high-impact events on affected days

**41. Daily Stats on Calendar Hover**
- TradeZella: Hover a day → popup with trades count, session, win rate for that day
- **Gap**: We show colored P&L but no hover detail
- **Proposed**: Calendar day hover tooltip — trades count, P&L, win rate, best/worst trade for that day

**42. Week / Month View Toggle**
- Tradervue, TradeZella: Switch between week view (for drill-down) and month view
- **Gap**: Month view only

---

## SECTION 7 — PROP FIRM MANAGER

### What We Have
| Feature | Status |
|---------|--------|
| Multiple accounts grid | ✅ |
| Daily/Total drawdown gauges | ✅ |
| Profit target progress | ✅ |
| MT5 live sync + diagnostics | ✅ |
| Compliance badge | ✅ |

### Missing vs Competitors

**43. Prop Firm Rule Presets**
- No competitor does this well for prop firms specifically — this is our unique angle
- **Proposed**: When adding an account, select the firm (FTMO, MyForexFunds, Five Percent, FundingPips, etc.) from a dropdown → rules auto-populate: daily loss limit 5%, max drawdown 10%, profit target 10%, trading days min 5, etc.

**44. Trade-Level Compliance Checker**
- **Proposed**: Per trade, show "This trade was compliant" or flag specific violations (e.g., "This trade used 3% risk — exceeds your 2% daily limit")

**45. Pass / Fail Projection**
- **Proposed**: "At your current pace, you will hit the profit target in X days" and "Your daily loss risk is X% of remaining daily limit"

**46. Multi-Phase Tracking**
- FTMO and others have Phase 1 → Phase 2 → Funded progression
- **Proposed**: Phase timeline visual showing current phase, progress, and what's needed to advance

---

## SECTION 8 — SETTINGS & DATA

### Missing vs Competitors

**47. Trading Hours / Kill Switch Settings**
- Edgewonk: Set your "allowed trading hours" → trades outside get flagged
- **Proposed**: In Settings → Trading: Set allowed session windows. Trades outside get a "Outside Trading Hours" flag in journal

**48. Risk Parameters per Account**
- **Proposed**: Per-prop-account risk settings: max risk per trade %, max daily trades, max daily loss amount. Used by Tilt Detection and trade-level compliance checker.

**49. CSV / PDF Export (Implemented)**
- Currently placeholder buttons in Settings → Data
- **Proposed**: Implement actual CSV export of all trades with all fields, and PDF analytics report export

**50. Notification System (Implemented)**
- Settings has toggle switches but no actual notification delivery
- **Proposed**: Browser push notifications for: daily goal hit, daily loss limit reached, tilt detected, MT5 sync error, new trade imported

---

## SECTION 9 — FEATURES WE HAVE THAT COMPETITORS DON'T

These are our **unique differentiators** — must protect and enhance:

| Feature | Description |
|---------|-------------|
| **ICT-Native Tag System** | ICT_SETUP_TAGS + ICT_MISTAKE_TAGS (FVG Entry, OB Entry, Liquidity Sweep, etc.) — no competitor is ICT-first |
| **MTF Bias Widget** | Monthly→1H bias entry per TF with PD arrays — unique to our app |
| **Execution Confluence Widget** | ICT confluence checklist (FVG, OB, SSL, Displacement, etc.) — unique |
| **MT5 EA Real-Time Sync** | Live positions + trade import via custom EA — TraderSync needs broker API, we own the sync layer |
| **Prop Firm Compliance Monitoring** | Live drawdown gauges + MT5 sync in one view — competitors have generic account tracking |
| **Playbook Rules Checklist** | Per-trade rule verification linked to playbook — most competitors have simpler strategy labels |

---

## PRIORITY MATRIX — Implementation Roadmap

### Sprint 1 — Fix & Unlock (Immediate, High Value, Low Effort)
| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| H5 fix | Fix calendar stale copy + broken route | 30 min | Medium |
| H4 fix | Fix Gemini env var mismatch | 5 min | High (unlocks AI) |
| 49 | Implement CSV export (Settings) | 2 hrs | High |
| 41 | Calendar hover tooltip (daily stats) | 3 hrs | High |
| 40 | Economic events on calendar (from /news) | 4 hrs | Medium |

### Sprint 2 — Daily Planning Loop (Core Workflow Gap)
| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 31 | Daily Planner page (/planner) | 2 days | Very High |
| 10 | Emotional state fields per trade (Sleep/Mood/Energy/Focus) | 4 hrs | High |
| 11 | Plan adherence slider per trade | 2 hrs | High |
| 32 | Goal Tracking system (/goals) | 3 days | Very High |

### Sprint 3 — Analytics Intelligence (Competitive Differentiation)
| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 17 | Edge Finder (cross-dimension analysis) | 3 days | Very High |
| 18 | Emotional state correlation charts | 1 day | High |
| 20 | Overtrading / optimal trade count analysis | 1 day | Medium |
| 23 | Monthly Report Card (auto-generated) | 2 days | High |
| 34 | Composite Edge Score | 2 days | Very High |

### Sprint 4 — Scoring & Behavioral Systems
| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 37 | Tilt Detection System | 2 days | Very High |
| 35 | Trading Rules Engine | 3 days | High |
| 43 | Prop Firm Rule Presets | 1 day | High |
| 44 | Trade-level compliance checker | 1 day | High |

### Sprint 5 — Reports & AI
| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 26 | Weekly Performance Report | 2 days | High |
| 27 | Monthly Performance Report | 2 days | High |
| 28 | Tax/P&L Export Report | 1 day | High |
| 36 | AI Trade Analysis (fix Gemini + UI) | 3 days | Very High |

### Sprint 6 — Data Onboarding
| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 33 | CSV Trade Import | 4 days | Very High |
| 38 | Trade Replay (MVP — animated chart) | 3 days | High |
| 14 | Linked trades (scale-in/partial exits grouping) | 2 days | Medium |

---

## Competitive Position Summary

```
Feature Category          | Us  | TradeZella | Edgewonk | TraderSync | Tradervue
--------------------------|-----|------------|----------|------------|----------
Trade Journal Quality     | 9/10|    8/10    |   9/10   |    7/10    |   6/10
ICT-Specific Tooling      | 10/10|   3/10   |   2/10   |    2/10    |   1/10
Analytics Depth           | 8/10|    8/10    |   9/10   |    7/10    |   9/10
Emotional/Psychology      | 6/10|    7/10    |  10/10   |    6/10    |   4/10
Goal Tracking             | 0/10|    9/10    |   8/10   |    8/10    |   5/10
Daily Planning Loop       | 3/10|    8/10    |   9/10   |    6/10    |   4/10
Prop Firm Management      | 9/10|    4/10    |   2/10   |    3/10    |   2/10
Broker Import             | 3/10|    8/10    |   7/10   |   10/10    |   7/10
AI / Smart Features       | 2/10|    8/10    |   6/10   |    9/10    |   4/10
Reports (built out)       | 1/10|    9/10    |   8/10   |    8/10    |   9/10
Trade Replay              | 2/10|    8/10    |   0/10   |    9/10    |   0/10
Composite Score           | 0/10|   10/10    |   8/10   |    7/10    |   5/10
Tilt / Behavior Detection | 0/10|   10/10    |   8/10   |    7/10    |   3/10
```

**Conclusion**: We lead on ICT tooling and prop-firm management by a wide margin. Our journal quality is best-in-class. Our weakest areas — goal tracking, daily planning, reports, AI, and composite scoring — are exactly what competitors use as their primary marketing hooks. These should be Sprint 1–3 priorities.
