# Trade-log — Professional Trading Journal

A full-stack trading journal built for prop firm traders. Log trades manually or sync them automatically from MetaTrader 5 via a custom Terminal Farm architecture. Track compliance, review performance, and analyze your behavior with AI.

> **Status:** Active development. Core trading, analytics, prop firm compliance, and AI features are working. Terminal Farm Docker orchestrator is a separate external component.

---

## What This Is

Most trading journals are glorified spreadsheets. Trade-log is a full trading operations system.

It pulls your real trade history from MT5 automatically, enforces your prop firm's actual rules against your account in real time, lets you do a structured ICT-style review of every trade with screenshots and candlestick charts, and uses Gemini AI to analyze your strategy and the economic calendar — without ever telling you what to trade next.

**The core question it answers:** *Are you actually trading the way you think you are — and are you staying within your prop firm rules?*

---

## Features

**Automated MT5 Sync**
Connects to MetaTrader 5 via a Terminal Farm architecture. A custom EA running inside a Docker container syncs your trades automatically via webhooks — no manual CSV exports, no third-party connectors.

**Prop Firm Compliance Tracker**
Add your prop firm challenge (FTMO, Apex, TopStep, The5ers, Funding Pips and more are pre-seeded). The dashboard shows live daily drawdown %, total drawdown %, and profit target progress against your actual account rules.

**Structured Trade Review Journal**
Every closed trade gets a full review page with:
- MAE/MFE tracking
- Multi-timeframe screenshot gallery (labeled per timeframe)
- ICT PD Array tagging (FVG, OB, Breaker, etc.)
- Entry, Exit, and Management quality ratings (Good / Neutral / Poor)
- Setup and mistake tags
- 1–5 conviction rating
- Session and market condition logging
- Candlestick chart with entry/exit markers (Twelve Data, cached to DB)

**AI Features (Gemini)**
- Strategy builder — describe your setup in plain text, Gemini returns structured rules saved as a playbook
- Trade analysis — surfaces behavioral patterns from your trade history
- News analysis — Gemini reviews economic events for a pair and returns a TRADE / CAUTION / AVOID verdict

**Analytics Dashboard**
Win rate, profit factor, R-multiple distribution, equity curve, and PnL breakdowns by day and month — all calculated from your actual trade data.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Frontend | React 19, Tailwind CSS 4, Framer Motion, Recharts |
| Charts | lightweight-charts (TradingView-style candlesticks) |
| Rich Text | BlockNote (Notion-style notebook) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (cookie-based SSR sessions) |
| AI | Google Gemini (gemini-2.0-flash, gemini-2.0-flash-lite) |
| Chart Data | Twelve Data API (1-minute OHLC, DB-cached) |
| MT5 Sync | Custom Terminal Farm — Python Orchestrator + Docker + EA Webhooks |
| Security | AES-256-CBC encryption for MT5 credentials |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                             │
│   Dashboard · Analytics · Journal · Prop Firm · Strategies      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                  Next.js API Routes                              │
│  /api/trades  /api/prop-accounts  /api/orchestrator             │
│  /api/webhook/terminal/*  /api/ai/*  /api/news                  │
└──────────┬────────────────┬────────────────┬────────────────────┘
           │                │                │
┌──────────▼──────┐  ┌──────▼──────┐  ┌─────▼──────────────────┐
│  Supabase DB    │  │ Gemini API  │  │  Twelve Data API        │
│  PostgreSQL     │  │ Flash model │  │  OHLC candle data       │
│  + Auth         │  │ AI features │  │  (cached to trades DB)  │
│  + Storage      │  └─────────────┘  └────────────────────────┘
└──────────┬──────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│              Terminal Farm (External Component)                  │
│                                                                  │
│   Python Orchestrator ──polls──▶ /api/orchestrator/             │
│          │                                                       │
│          ▼ launches                                              │
│   Docker Container (MT5 + Custom EA)                            │
│          │                                                       │
│          ▼ webhooks                                              │
│   /api/webhook/terminal/heartbeat                               │
│   /api/webhook/terminal/sync      ──▶  trades table             │
│   /api/webhook/terminal/positions ──▶  terminal_instances       │
│   /api/webhook/terminal/candles   ──▶  trades.chart_data        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)
- Twelve Data API key (free tier: 800 calls/day)
- Google Gemini API key
- MT5 account (for Terminal Farm sync — optional for manual logging)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Rahwulkumar/Trade-log.git
cd Trade-log

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp env.example .env.local
```

Edit `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MT5_ENCRYPTION_KEY=your_32_byte_hex_key
TWELVE_DATA_API_KEY=your_twelve_data_key
ORCHESTRATOR_SECRET=your_orchestrator_secret
TERMINAL_WEBHOOK_SECRET=your_webhook_secret
GEMINI_API_KEY=your_gemini_key
```

```bash
# 4. Run database migrations
# Go to your Supabase project SQL Editor
# Run each file in supabase/migrations/ in filename order

# 5. Start the development server
npm run dev
```

App runs at `http://localhost:3000`

---

## Database Schema (Core Tables)

| Table | Purpose |
|---|---|
| `trades` | All trade records — 50+ columns including PnL, ICT tags, MAE/MFE, screenshots, chart data cache |
| `prop_accounts` | User's prop firm accounts with live compliance metrics |
| `prop_firms` + `prop_firm_challenges` | Prop firm catalog (FTMO, Apex, TopStep etc.) with challenge rules |
| `mt5_accounts` | MT5 credentials (AES-256 encrypted passwords) |
| `terminal_instances` | Live state of each MT5 Docker container |
| `terminal_commands` | Command queue for EA instructions (FETCH_CANDLES, etc.) |
| `playbooks` | Trading strategies and rules |
| `journal_entries` | BlockNote freeform journal entries |
| `tags` / `trade_tags` | Tagging system for trades |

---

## Current Progress

- [x] Authentication — Supabase Auth with SSR cookie sessions and route protection
- [x] Trade CRUD — manual logging with full ICT journal fields
- [x] Prop firm compliance — live daily DD, total DD, profit target meters
- [x] Prop firm catalog — FTMO, Apex, TopStep, The5ers, Funding Pips seeded
- [x] Analytics — win rate, profit factor, R-multiple, equity curve, day/month breakdown
- [x] Trade journal review — MAE/MFE, screenshots, ICT tags, conviction, quality ratings
- [x] Candlestick chart — Twelve Data + DB cache
- [x] AI strategy builder — Gemini integration working
- [x] AI news analysis — economic calendar with Gemini verdict
- [x] Terminal Farm webhooks — heartbeat, trade sync, positions, candles
- [x] MT5 credential encryption — AES-256-CBC
- [x] BlockNote notebook
- [ ] Terminal Farm Docker orchestrator — external component, not in this repo
- [ ] Stripe billing — planned
- [ ] Mobile responsive polish

---

## A Note on Trade Signals

This system does not generate trade signals. The AI features analyze your past behavior and your strategy logic. They do not tell you what to trade. This is intentional.

---

## License

MIT
