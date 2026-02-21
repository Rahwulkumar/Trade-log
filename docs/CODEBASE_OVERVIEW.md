# Trading Journal — Codebase Overview

> Last updated: 2026-02-20
> Document covers the full `trading-journal/` workspace.

---

## Table of Contents

1. [Project Summary](#1-project-summary)
2. [Tech Stack](#2-tech-stack)
3. [Directory Structure](#3-directory-structure)
4. [Environment Variables](#4-environment-variables)
5. [Authentication & Middleware](#5-authentication--middleware)
6. [Database Schema](#6-database-schema)
7. [API Routes](#7-api-routes)
8. [Terminal Farm System](#8-terminal-farm-system)
9. [Frontend Pages](#9-frontend-pages)
10. [Components](#10-components)
11. [Lib — Business Logic & Utilities](#11-lib--business-logic--utilities)
12. [Hooks & Types](#12-hooks--types)
13. [AI Integration (Gemini)](#13-ai-integration-gemini)
14. [Chart / Pricing Data](#14-chart--pricing-data)
15. [State Management](#15-state-management)
16. [Styling & Design System](#16-styling--design-system)
17. [Scripts](#17-scripts)
18. [Configuration Files](#18-configuration-files)
19. [Security Model](#19-security-model)
20. [File-by-File Reference](#20-file-by-file-reference)

---

## 1. Project Summary

**Trading Journal** is a professional-grade, full-stack Next.js web application for traders to log, track, analyze, and improve their trading performance. Key capabilities:

- **Manual trade entry** with full metadata (symbol, direction, entry/exit, P&L, R-multiple, screenshots, notes)
- **Automated MT5 trade sync** via a custom Expert Advisor + Terminal Farm system (Docker + Python orchestrator)
- **Multi-account / prop-firm tracking** with drawdown gauges and profit-target progress
- **AI-powered strategy generation and analysis** via Google Gemini 2.0
- **Rich notebook/journal** using BlockNote (block-based rich-text editor)
- **Playbooks (strategy definitions)** with rule checklists
- **Advanced analytics** (equity curve, profit factor, expectancy, per-strategy breakdown)
- **Trading calendar heatmap** and weekly reviews

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI Library | React 19 |
| Component Kit | shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS 4 + CSS variables |
| Rich Editor | Mantine / BlockNote |
| Charts | Recharts, Lightweight Charts (TradingView) |
| Animations | Framer Motion |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT, HTTP-only cookies) |
| Storage | Supabase Storage (screenshots) |
| AI | Google Generative AI — Gemini 2.0 Flash Lite |
| Pricing | Twelve Data API (OHLC candles) |
| MT5 Integration | Custom Terminal Farm (EA → Webhook → Docker/Python) |
| Validation | Zod |
| Fonts | Syne, DM Sans, JetBrains Mono |

---

## 3. Directory Structure

```
trading-journal/
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # Backend API routes
│   │   ├── auth/              # Login / signup / callback pages
│   │   ├── dashboard/         # Main dashboard
│   │   ├── trades/            # Trade management
│   │   ├── journal/           # Redirect → notebook
│   │   ├── notebook/          # Rich-text journal
│   │   ├── analytics/         # Performance analytics
│   │   ├── playbooks/         # Strategy definitions
│   │   ├── prop-firm/         # Prop account tracking
│   │   ├── reports/           # Trade reports
│   │   ├── settings/          # User settings
│   │   ├── strategies/        # Strategy docs
│   │   ├── calendar/          # Trading calendar
│   │   ├── weekly/            # Weekly review
│   │   ├── layout.tsx         # Root layout (providers)
│   │   └── page.tsx           # Home — redirects to /dashboard
│   │
│   ├── components/            # Reusable React components
│   │   ├── auth/              # Auth gate shell
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── journal/           # BlockNote editor components
│   │   ├── layout/            # Sidebar, header, nav
│   │   ├── ui/                # shadcn/ui primitives
│   │   ├── calendar/          # Heatmap calendar
│   │   ├── trade/             # Trade-specific components
│   │   ├── auth-provider.tsx  # Auth React Context
│   │   ├── prop-account-provider.tsx  # Prop account Context
│   │   ├── theme-provider.tsx # Dark/light theme (next-themes)
│   │   └── theme-toggle.tsx   # Theme switch button
│   │
│   ├── lib/                   # Utilities, API clients, business logic
│   │   ├── api/               # Client-side API wrappers
│   │   ├── supabase/          # Supabase client instances
│   │   ├── terminal-farm/     # Terminal Farm logic
│   │   ├── mt5/               # MT5 encryption helpers
│   │   ├── constants/         # Shared constants
│   │   ├── types/             # Type definitions
│   │   ├── utils.ts           # General utilities (cn, formatters)
│   │   └── utils/             # Extra utility modules
│   │
│   ├── hooks/                 # Custom React hooks
│   │   └── use-mobile.ts      # Viewport / mobile detection
│   │
│   ├── types/                 # Shared TypeScript types
│   │   ├── notes.ts           # Journal entry types
│   │   └── prop-firms.ts      # Prop firm types
│   │
│   └── domain/                # Domain-layer logic
│       ├── trade-mapper.ts    # Trade → enriched trade transformation
│       └── trade-types.ts     # Enhanced trade type definitions
│
├── scripts/                   # CLI / seed scripts
│   ├── seed-prop-firms.ts     # Seed prop firm data into Supabase
│   └── fetch_trade_id.ts      # Debug helper: lookup trade by ID
│
├── supabase/                  # Supabase config & migrations
├── public/                    # Static assets (images, icons)
├── docs/                      # Project documentation (this file)
├── orchestrator/              # Python orchestrator docs/config
├── terminal-farm/             # Terminal Farm EA scripts
├── middleware.ts              # Next.js edge middleware (auth guard)
├── next.config.ts             # Next.js configuration
├── tsconfig.json              # TypeScript configuration
├── components.json            # shadcn/ui configuration
├── package.json               # NPM dependencies & scripts
└── .env.local                 # Secrets (never committed)
```

---

## 4. Environment Variables

Defined in `.env.local` (use `env.example` as a template).

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon JWT key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-only, bypasses RLS) |
| `MT5_ENCRYPTION_KEY` | AES-256 key for encrypting MT5 passwords |
| `TWELVE_DATA_API_KEY` | Twelve Data API key for OHLC candle data |
| `ORCHESTRATOR_SECRET` | Shared secret between backend and Python orchestrator |
| `TERMINAL_WEBHOOK_SECRET` | API key used by MT5 EA when posting to webhooks |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini AI API key (used server-side) |

---

## 5. Authentication & Middleware

### `middleware.ts` (root)
Next.js Edge Middleware that runs on **every request**.

- Calls `updateSession()` from `src/lib/supabase/middleware.ts` to refresh the Supabase session cookie.
- Redirects unauthenticated users to `/auth/login`.
- Passes through public routes: `/auth/*`, `/api/webhook/*`, `/api/health`, `/`.

### `src/lib/supabase/middleware.ts`
Handles cookie-based session refresh using `@supabase/ssr`. Reads and writes the session cookie so the JWT stays fresh on every request.

### `src/components/auth-provider.tsx`
React Context providing:
- `user` — Supabase Auth user object
- `profile` — User profile row from `profiles` table
- `session` — JWT session
- `loading` — auth state hydration flag
- `refreshProfile()` — force-reload profile from DB

Auth state listens to `supabase.auth.onAuthStateChange`. On every state change, profile is re-fetched (with a 3-second timeout to avoid hangs when Supabase is unconfigured).

### Auth Pages
| Route | File | Purpose |
|---|---|---|
| `/auth/login` | `src/app/auth/login/page.tsx` | Email/password login |
| `/auth/signup` | `src/app/auth/signup/page.tsx` | New account registration |
| `/auth/callback` | `src/app/auth/callback/route.ts` | OAuth redirect handler |

---

## 6. Database Schema

All tables live in Supabase (PostgreSQL). Row-Level Security (RLS) is enabled on every user-owned table so users can only access their own rows.

### Core Tables

#### `profiles`
Stores user account settings. Created automatically on `auth.users` insert via Supabase trigger.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Matches `auth.users.id` |
| `email` | text | User email |
| `first_name` | text | Display name |
| `last_name` | text | |
| `avatar_url` | text | Profile image |
| `default_risk_percent` | numeric | Default risk % per trade |
| `default_rr_ratio` | numeric | Default R:R ratio |
| `timezone` | text | User timezone |

---

#### `trades`
Central table — every trade entry.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→profiles | Owner |
| `symbol` | text | Instrument (EURUSD, GOLD, etc.) |
| `direction` | text | `LONG` or `SHORT` |
| `entry_price` | numeric | Entry price |
| `exit_price` | numeric | Exit price (null if open) |
| `entry_date` | timestamptz | |
| `exit_date` | timestamptz | |
| `status` | text | `open` or `closed` |
| `pnl` | numeric | Realized P&L |
| `r_multiple` | numeric | R-multiple (profit / initial risk) |
| `position_size` | numeric | Lot size |
| `commission` | numeric | Broker commission |
| `swap` | numeric | Overnight swap fees |
| `stop_loss` | numeric | SL price |
| `take_profit` | numeric | TP price |
| `notes` | text | General notes |
| `feelings` | text | Emotional notes |
| `observations` | text | Post-trade observations |
| `screenshots` | jsonb | Array of screenshot URLs |
| `chart_data` | jsonb | Cached OHLC candle array |
| `playbook_id` | uuid FK→playbooks | Linked strategy |
| `prop_account_id` | uuid FK→prop_accounts | Linked prop account |
| `mt5_account_id` | uuid FK→mt5_accounts | Source MT5 terminal |
| `external_id` | text | MT5 position ID (for dedup) |
| `external_deal_id` | text | MT5 ticket/deal ID |
| `magic_number` | bigint | EA magic number |
| `asset_type` | text | FOREX / CRYPTO / INDICES / etc. |
| `ai_setup_notes` | text | AI-generated setup analysis |
| `ai_setup_score` | numeric | AI score for trade setup |
| `execution_grade` | text | Manual grade (A-D) |

---

#### `mt5_accounts`
Stores MT5 terminal credentials for Terminal Farm auto-sync.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→profiles | |
| `account_name` | text | Friendly label |
| `server` | text | MT5 broker server |
| `login` | bigint | MT5 account number |
| `password` | text | AES-256 encrypted password |
| `balance` | numeric | Last known balance |
| `equity` | numeric | Last known equity |
| `terminal_enabled` | boolean | Auto-sync toggle |

---

#### `prop_accounts`
Tracks funded / challenge accounts at prop firms.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→profiles | |
| `name` | text | Account label |
| `firm` | text | Prop firm name |
| `phase` | text | Challenge phase |
| `initial_balance` | numeric | Starting balance |
| `current_balance` | numeric | Running balance |
| `status` | text | active / challenge / completed / failed |
| `challenge_id` | uuid FK→prop_firm_challenges | Rules reference |
| `profit_target` | numeric | Target profit $ |
| `daily_dd_max` | numeric | Max daily drawdown $ |
| `daily_dd_current` | numeric | Current daily drawdown $ |
| `total_dd_max` | numeric | Max total drawdown $ |
| `total_dd_current` | numeric | Current total drawdown $ |
| `start_date` | date | |
| `last_synced_at` | timestamptz | Last balance recalculation |

---

#### `prop_firms`
Master list of supported prop firms.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | Firm name |
| `website` | text | URL |
| `logo_url` | text | Logo image |
| `is_active` | boolean | Show in UI |

---

#### `prop_firm_challenges`
Rules and parameters for each firm's challenge phases.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `firm_id` | uuid FK→prop_firms | |
| `name` | text | Challenge name |
| `phase_name` | text | e.g., "Phase 1" |
| `phase_order` | int | Sort order |
| `initial_balance` | numeric | |
| `profit_target_percent` | numeric | % profit required |
| `drawdown_type` | text | trailing / static |
| `daily_loss_percent` | numeric | Max daily loss % |
| `max_loss_percent` | numeric | Max total loss % |
| `daily_loss_amount` | numeric | Max daily loss $ |
| `max_loss_amount` | numeric | Max total loss $ |
| `max_trading_days` | int | |
| `min_trading_days` | int | |
| `trailing_threshold_amount` | numeric | For trailing DD |

---

#### `playbooks`
Reusable trading strategy definitions.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→profiles | |
| `name` | text | Strategy name |
| `description` | text | |
| `rules` | text[] | Array of rule strings |
| `required_rules` | text[] | Rules that must be followed |
| `rule_categories` | jsonb | Categorized rules (entry/exit/filter/risk) |
| `ai_generated` | boolean | Created by Gemini |
| `ai_prompt` | text | Original AI prompt |
| `is_active` | boolean | Visible in trade entry |

---

#### `journal_entries`
Rich-text notes (BlockNote format), optionally linked to trades.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→profiles | |
| `title` | text | Note title |
| `content` | jsonb | BlockNote document |
| `entry_type` | text | trade-specific / standalone |
| `entry_date` | date | |
| `trade_id` | uuid FK→trades | Optional trade link |
| `folder_id` | uuid | Optional folder |
| `icon` | text | Emoji icon |
| `is_favorite` | boolean | Starred |

---

#### `tags` and `trade_tags`
Custom labels for trades.

**`tags`:** `id`, `user_id`, `name`, `color`
**`trade_tags`:** `trade_id`, `tag_id` (junction table)

---

#### `strategy_chats`
AI conversation history.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→profiles | |
| `title` | text | Chat title |
| `messages` | jsonb | Full conversation array |
| `current_strategy_id` | uuid FK→playbooks | Strategy being discussed |

---

#### `ai_insights`
AI-generated trading insights cached for users.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→profiles | |
| `title` | text | |
| `content` | text | Insight body |
| `insight_type` | text | Category |
| `confidence` | numeric | 0–1 confidence score |
| `data_snapshot` | jsonb | Trade data used to generate |

---

#### `backtest_results`
Strategy backtesting results.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→profiles | |
| `strategy_id` | uuid FK→playbooks | |
| `symbol` | text | |
| `timeframe` | text | |
| `start_date` / `end_date` | date | Test period |
| `total_trades` | int | |
| `win_rate` | numeric | |
| `avg_r_multiple` | numeric | |
| `profit_factor` | numeric | |
| `max_drawdown` | numeric | |
| `total_pnl` | numeric | |
| `results` | jsonb | Full result detail |

---

#### `terminal_instances`
Tracks connected MT5 terminals for Terminal Farm.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→profiles | |
| `mt5_account_id` | uuid FK→mt5_accounts | |
| `status` | text | online / offline |
| `last_heartbeat` | timestamptz | Last EA ping |
| `version` | text | EA version |
| `metadata` | jsonb | Terminal details |

---

#### `terminal_commands`
Command queue sent to MT5 terminals.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `terminal_id` | uuid FK→terminal_instances | |
| `command_type` | text | FETCH_CANDLES / etc. |
| `payload` | jsonb | Command parameters |
| `status` | text | PENDING / DISPATCHED / COMPLETED |
| `created_at` / `completed_at` | timestamptz | |

---

#### `audit_logs`
Security and compliance event log.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→profiles | |
| `action` | text | Action performed |
| `resource_type` | text | Table/resource |
| `resource_id` | text | Row ID |
| `ip_address` | text | |
| `user_agent` | text | |
| `metadata` | jsonb | Extra context |

---

#### `rate_limit_tracking`
Prevents API abuse.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→profiles | |
| `action` | text | Rate-limited action |
| `attempted_at` | timestamptz | |

---

### Database Views

**`trade_analytics`** — Aggregated per-user statistics computed from the `trades` table: `total_pnl`, `win_rate`, `avg_r_multiple`, `profit_factor`, `total_trades`, `winning_trades`, `losing_trades`.

### Database Functions

| Function | Description |
|---|---|
| `calculate_r_multiple(direction, entry_price, exit_price, stop_loss)` | Returns R-multiple given trade details |
| `check_rate_limit(user_id, action, window_seconds, max_requests)` | Returns true if under rate limit |

---

## 7. API Routes

All routes live under `src/app/api/`. They are Next.js Route Handlers (server-only).

### Authentication

| Method | Route | File | Description |
|---|---|---|---|
| GET/POST | `/api/auth/callback` | `auth/callback/route.ts` | OAuth redirect handler (code → session exchange) |

### Trades

| Method | Route | File | Description |
|---|---|---|---|
| POST | `/api/trades/chart` | `trades/chart/route.ts` | Fetch OHLC candle data for a trade (Twelve Data + cache) |

### MT5 Accounts

| Method | Route | File | Description |
|---|---|---|---|
| GET | `/api/mt5-accounts` | `mt5-accounts/route.ts` | List user's MT5 accounts |
| POST | `/api/mt5-accounts` | `mt5-accounts/route.ts` | Create MT5 account (encrypts password) |
| PUT | `/api/mt5-accounts/[id]/enable-autosync` | `mt5-accounts/[id]/enable-autosync/route.ts` | Enable Terminal Farm sync |
| PUT | `/api/mt5-accounts/[id]/disable-autosync` | `mt5-accounts/[id]/disable-autosync/route.ts` | Disable Terminal Farm sync |
| GET | `/api/mt5-accounts/[id]/terminal-status` | `mt5-accounts/[id]/terminal-status/route.ts` | Get terminal online/offline status |
| GET | `/api/mt5-accounts/by-prop-account/[propAccountId]/terminal-status` | Dynamic route | Terminal status lookup by prop account |

### Prop Accounts

| Method | Route | File | Description |
|---|---|---|---|
| POST | `/api/prop-accounts/recalculate-balance` | `prop-accounts/recalculate-balance/route.ts` | Re-sum all closed trades to update `current_balance` (uses service role key to bypass RLS) |

### Webhooks — Terminal Farm

These endpoints receive data from the MT5 Expert Advisor. Authenticated via `TERMINAL_WEBHOOK_SECRET` header.

| Method | Route | File | Description |
|---|---|---|---|
| POST | `/api/webhook/terminal/trades` | `webhook/terminal/trades/route.ts` | Sync batch of closed/open trades from EA |
| POST | `/api/webhook/terminal/heartbeat` | `webhook/terminal/heartbeat/route.ts` | Terminal health ping, dispatches pending commands |
| POST | `/api/webhook/terminal/positions` | `webhook/terminal/positions/route.ts` | Current open positions snapshot |
| POST | `/api/webhook/terminal/candles` | `webhook/terminal/candles/route.ts` | Historical OHLC candles for a trade |

### AI

| Method | Route | File | Description |
|---|---|---|---|
| POST | `/api/ai` | `ai/route.ts` | AI operations: `generate-strategy`, `chat`, `analyze-trades` |

### Orchestrator

| Method | Route | File | Description |
|---|---|---|---|
| GET | `/api/orchestrator/config` | `orchestrator/config/route.ts` | Returns active terminal config with decrypted MT5 credentials for the Python orchestrator |

### Other

| Method | Route | File | Description |
|---|---|---|---|
| GET | `/api/terminal-farm/health` | `terminal-farm/health/route.ts` | Health check endpoint |
| POST | `/api/extension/route` | `extension/route.ts` | Browser extension communication |

---

## 8. Terminal Farm System

The Terminal Farm is a subsystem for **automatically syncing MT5 trades** without manual import.

### Architecture

```
MT5 Platform
└── Expert Advisor (EA)
    ├── POST /api/webhook/terminal/trades      ← Closed/open trade sync
    ├── POST /api/webhook/terminal/heartbeat   ← Regular health ping
    ├── POST /api/webhook/terminal/positions   ← Live position snapshot
    └── POST /api/webhook/terminal/candles     ← OHLC data for charts
          ↓
    Next.js Backend (validates, processes, stores)
          ↓
    Supabase Database
          ↑
    GET /api/orchestrator/config               ← Python orchestrator polls config
          ↑
    Docker container (Python) → MT5 terminal management
```

### Trade Sync Logic (`src/lib/terminal-farm/service.ts`)

The `processTrades()` function implements **position-based deduplication**:

1. **Entry trades** (`entryType = 0`) — create a new `trades` row
2. **Exit trades** (`entryType = 1`) — find the matching open trade by `external_id` (MT5 positionId) and close it (set `exit_price`, `exit_date`, `pnl`, `status = closed`)
3. If no matching entry is found for an exit, an "orphan" trade is created
4. Batch inserts of 50 trades at a time with exponential-backoff retry

**Fallback matching:** If `external_id` is missing, matches by `external_deal_id` (ticket number).

**Asset type detection** — automatically classifies the symbol:
- FOREX: 6-character pairs (EURUSD, GBPJPY, etc.)
- CRYPTO: BTC, ETH, symbols ending in BTC/USDT/USD
- INDICES: NAS100, SP500, US30, etc.
- COMMODITIES: GOLD, SILVER, OIL, XAU, XAG, etc.
- STOCKS: everything else

### Heartbeat Processing

The `processHeartbeat()` function:
1. Updates `terminal_instances.last_heartbeat` and `status = online`
2. Checks for pending `terminal_commands` for this terminal
3. Dispatches up to 5 pending commands (marks them `DISPATCHED`)
4. Returns commands in the heartbeat response so the EA can execute them

### Security

- All webhook requests must include the `X-API-Key` header matching `TERMINAL_WEBHOOK_SECRET`
- MT5 passwords are encrypted with AES-256-CBC before storage
- The Python orchestrator authenticates with `ORCHESTRATOR_SECRET` to fetch decrypted credentials

### Key Files

| File | Purpose |
|---|---|
| `src/lib/terminal-farm/service.ts` | Core business logic (processTrades, processHeartbeat, processCandles) |
| `src/lib/terminal-farm/types.ts` | TypeScript types for all webhook payloads and responses |
| `src/lib/terminal-farm/validation.ts` | Zod schemas — validates all incoming webhook data |
| `src/lib/terminal-farm/metrics.ts` | Logs sync metrics (success count, errors, duration) |
| `src/lib/terminal-farm/retry.ts` | Exponential backoff retry wrapper for DB operations |
| `src/lib/mt5/encryption.ts` | AES-256-CBC encrypt/decrypt for MT5 passwords |
| `src/lib/mt5/validation.ts` | MT5 data-specific validation helpers |
| `src/app/api/webhook/terminal/trades/route.ts` | Trade webhook handler |
| `src/app/api/webhook/terminal/heartbeat/route.ts` | Heartbeat handler |
| `src/app/api/webhook/terminal/candles/route.ts` | Candle sync handler |
| `src/app/api/webhook/terminal/positions/route.ts` | Position snapshot handler |
| `src/app/api/orchestrator/config/route.ts` | Orchestrator config provider |

---

## 9. Frontend Pages

### `/` — Home (`src/app/page.tsx`)
Redirects authenticated users to `/dashboard`. Unauthenticated users are redirected to `/auth/login` by middleware.

### `/auth/login` — Login (`src/app/auth/login/page.tsx`)
Email/password login form using Supabase Auth client. Includes link to signup.

### `/auth/signup` — Signup (`src/app/auth/signup/page.tsx`)
New account registration. Supabase trigger creates a `profiles` row on first signup.

### `/dashboard` — Dashboard (`src/app/dashboard/page.tsx`)
Main analytics overview. Displays:
- **Account Card** — balance, account name, mini equity sparkline
- **Stat Cards** — Gross Profit, Gross Loss, Net P&L, Today's P&L, Win Rate, Avg R:R, Best Trade
- **Cashflow Chart** — Recharts bar chart (Gross Profit vs Gross Loss by period)
- **Trade Distribution Donut** — Win/Loss ratio pie chart
- **Top Strategies** — Best performing playbooks
- **Prop Firm Tracker** — Profit target arc + daily/total drawdown gauges
- **Recent Trades** — Latest trade rows with P&L
- **Trading Calendar** — Daily P&L heatmap

### `/trades` — Trade Management (`src/app/trades/page.tsx`)
Full CRUD for trades:
- Filter by: status (open/closed), direction (LONG/SHORT), symbol
- Create new trades (modal form)
- Edit existing trades
- Close open trades (auto-calculates P&L and R-multiple)
- Delete trades
- Metrics bar: Total P&L, Win Rate, Avg R:R, Trade Count

### `/notebook` — Journal (`src/app/notebook/page.tsx`)
BlockNote-based rich-text editor:
- Create standalone or trade-linked notes
- Folder organization
- Favorites marking
- Emoji icons per note
- Timestamps auto-managed

### `/playbooks` — Strategies (`src/app/playbooks/page.tsx`)
Strategy definitions:
- Create strategies with rule checklists
- Mark rules as required or optional
- Categorize rules (entry / exit / filter / risk)
- AI-generate strategies from natural language prompt
- View performance metrics per strategy (win rate, profit factor, total trades)
- Deactivate/archive strategies

### `/prop-firm` — Prop Accounts (`src/app/prop-firm/page.tsx`)
Funded account management:
- Create/edit prop accounts with firm, phase, balance
- Visualize profit target progress (arc gauge)
- Daily and total drawdown gauges (color changes from green → yellow → red)
- Status tracking: active / challenge / completed / failed
- "Recalculate Balance" syncs current_balance from all closed trades

### `/analytics` — Analytics (`src/app/analytics/page.tsx`)
Advanced performance analysis:
- Win rate, profit factor, expectancy, Sharpe-like ratio
- Monthly P&L breakdown table
- Equity curve chart
- Performance grouped by playbook/strategy
- P&L distribution histogram

### `/calendar` — Calendar (`src/app/calendar/page.tsx`)
Trading activity heatmap:
- Month view with daily P&L color coding
- Hover tooltips: trade count, net P&L

### `/settings` — Settings (`src/app/settings/page.tsx`)
User preferences:
- Default risk percent
- Default R:R ratio
- Timezone
- MT5 account management (add/remove, enable/disable sync)
- Profile updates

### `/weekly` — Weekly Review (`src/app/weekly/page.tsx`)
Week-level performance review and journaling.

### `/reports` — Reports (`src/app/reports/page.tsx`)
Exportable trade reports.

---

## 10. Components

### Auth Components (`src/components/auth/`)
Shell for protecting pages — redirects to login if unauthenticated.

### Dashboard Components (`src/components/dashboard/`)

| Component | Purpose |
|---|---|
| `CashflowChart` | Recharts bar chart — Gross Profit vs Gross Loss |
| `StatisticsDonut` | Recharts pie chart — Win/Loss distribution |
| `RecentTrades` | Table of most recent closed trades |
| `TradingCalendar` | Heatmap calendar — daily P&L |

### Journal Components (`src/components/journal/`)
BlockNote editor integration, toolbar, formatting options.

### Layout Components (`src/components/layout/`)

| Component | Purpose |
|---|---|
| `Sidebar` | Main navigation sidebar (collapsible) |
| `Header` | Top header bar with user menu |
| `PageLayout` | Standard page wrapper with padding |

### UI Components (`src/components/ui/`)
All shadcn/ui primitives: `Button`, `Input`, `Select`, `Dialog`, `Table`, `Badge`, `Card`, `Tooltip`, `Popover`, `Dropdown`, `Sheet`, `Tabs`, etc.

### Trade Components (`src/components/trade/`)
Components for trade entry forms, trade detail views, screenshot uploaders.

### Providers

| Component | File | Purpose |
|---|---|---|
| `AuthProvider` | `auth-provider.tsx` | Auth state Context |
| `PropAccountProvider` | `prop-account-provider.tsx` | Selected prop account Context |
| `ThemeProvider` | `theme-provider.tsx` | Dark/light theme (next-themes) |
| `ThemeToggle` | `theme-toggle.tsx` | Toggle button |

---

## 11. Lib — Business Logic & Utilities

### `src/lib/api/` — Client-Side API Wrappers

| File | Purpose |
|---|---|
| `trades.ts` | CRUD operations for trades (create, read, update, delete, close) |
| `prop-accounts.ts` | CRUD for prop accounts, balance recalculation |
| `analytics.ts` | Analytics calculations (win rate, profit factor, equity curve) |
| `pricing.ts` | Fetch OHLC candle data (Twelve Data API + DB cache) |
| `gemini.ts` | Google Gemini AI wrapper (generate strategy, chat, analyze trades) |
| `playbooks.ts` | CRUD for playbooks/strategies |
| `journal.ts` | CRUD for journal entries |
| `storage.ts` | Supabase Storage — upload/delete trade screenshots |
| `tags.ts` | Tag management (create, assign to trades) |
| `terminal-farm.ts` | Client-side Terminal Farm helpers (status checks, etc.) |

### `src/lib/supabase/` — Supabase Clients

| File | Purpose |
|---|---|
| `client.ts` | Browser-side Supabase client (uses anon key, SSR-safe) |
| `server.ts` | Server component Supabase client (reads cookies) |
| `admin.ts` | Server-only admin client (service role key, bypasses RLS) |
| `middleware.ts` | Session refresh middleware helper |
| `types.ts` | Auto-generated TypeScript types from Supabase schema (**do not edit manually**) |

### `src/lib/terminal-farm/` — Terminal Farm Logic
See [Section 8](#8-terminal-farm-system) for detail.

### `src/lib/mt5/` — MT5 Utilities

| File | Purpose |
|---|---|
| `encryption.ts` | AES-256-CBC encrypt/decrypt for MT5 passwords. IV is randomly generated and prepended to ciphertext. |
| `validation.ts` | MT5-specific data validation (account numbers, server names, etc.) |

### `src/lib/utils.ts`
General utility functions:
- `cn(...classes)` — Tailwind class merging (clsx + tailwind-merge)
- Date formatting helpers
- Currency/P&L formatting
- Number rounding utilities

### `src/lib/utils/error-handler.ts`
Standardized API error response builder. Maps known error codes to user-friendly messages.

### `src/lib/constants/`
Shared constant values: supported prop firms list, asset type labels, default values, color maps.

---

## 12. Hooks & Types

### `src/hooks/use-mobile.ts`
Custom hook that detects if the viewport is mobile-sized (< 768 px) using a `matchMedia` listener.

### `src/types/notes.ts`
TypeScript type definitions for journal entries and BlockNote document structure.

### `src/types/prop-firms.ts`
Types for prop firm and challenge definitions.

### `src/domain/trade-mapper.ts`
Pure transformation function that converts a raw `trades` DB row into an enriched trade object with computed fields:
- `outcome` — "WIN" / "LOSS" / "BREAKEVEN"
- `riskAmount` — calculated from position size and stop loss
- Formatted display strings for dates, prices, P&L

### `src/domain/trade-types.ts`
Extended TypeScript types for the enriched trade domain object.

---

## 13. AI Integration (Gemini)

File: `src/lib/api/gemini.ts`

Uses **Google Generative AI SDK** with the **Gemini 2.0 Flash Lite** model (fast, cost-effective).

### Actions

#### `generate-strategy`
Converts a natural-language description into a structured trading strategy:
```json
{
  "name": "EMA Pullback",
  "description": "...",
  "rules": [
    { "text": "Price above 20 EMA", "type": "entry", "required": true }
  ],
  "suggestedAssets": ["EURUSD", "GBPUSD"],
  "riskLevel": "medium"
}
```

#### `chat`
Conversational interface with strategy context. Maintains message history. Context-aware — the current strategy's rules are injected as system context.

#### `analyze-trades`
Analyzes the user's historical trade data for patterns:
- Best/worst trading hours
- Symbol performance
- Risk management observations
- Actionable recommendations
- Returns confidence score (0–1)

#### `setup-scoring`
Given a trade and a playbook's rules, scores the setup:
- Checks which required and optional rules were followed
- Returns letter grade (A–D) and specific notes

### API Route (`src/app/api/ai/route.ts`)
POST body: `{ action, prompt, history?, tradeData?, playbookRules? }`
Response: `{ result, confidence? }`

---

## 14. Chart / Pricing Data

File: `src/lib/api/pricing.ts`
API Route: `POST /api/trades/chart`

### Flow
1. Check `trades.chart_data` column (JSON) — if cached, return immediately
2. Normalize the symbol to Twelve Data format (e.g., `EURUSD` → `EUR/USD`, `GOLD` → `XAU/USD`, `NAS100` → `NDX`)
3. Fetch 1-minute OHLC candles from Twelve Data API for the trade's time window (+/- buffer)
4. Save candles to `trades.chart_data` for future requests
5. Return candles — consumed by Lightweight Charts (TradingView) on the frontend

### Symbol Normalization Map (selected examples)
| Input | Output |
|---|---|
| `EURUSD` | `EUR/USD` |
| `GBPUSD` | `GBP/USD` |
| `GOLD` / `XAUUSD` | `XAU/USD` |
| `NAS100` / `US100` | `NDX` |
| `SP500` / `US500` | `SPX` |
| `US30` / `DJ30` | `DJI` |
| `BTCUSD` | `BTC/USD` |

---

## 15. State Management

No Redux or Zustand. State is managed via:

### React Context
| Context | File | Provides |
|---|---|---|
| `AuthContext` | `auth-provider.tsx` | `user`, `profile`, `session`, `loading`, `refreshProfile()` |
| `PropAccountContext` | `prop-account-provider.tsx` | `selectedPropAccount`, `setSelectedPropAccount`, `propAccounts` |
| `ThemeContext` | `theme-provider.tsx` | `theme`, `setTheme` (via next-themes) |

### Server Components
Dashboard and analytics pages fetch data server-side on every request, eliminating the need for client-side global state for most data.

### Local Component State
Trade filters, modal open/close, form values — managed with `useState` at the component level.

### LocalStorage
`selectedPropAccountId` is persisted to `localStorage` so the prop account filter survives page refreshes.

---

## 16. Styling & Design System

### CSS Architecture
- **Tailwind CSS 4** (utility classes) as the primary styling system
- **CSS custom properties** (variables) for theming:
  ```css
  --text-primary, --text-secondary, --text-muted
  --accent-primary, --accent-secondary
  --profit-primary, --loss-primary
  --bg-primary, --bg-secondary, --bg-card
  --border-color
  ```
- Dark theme by default; light theme available via toggle

### Typography
| Font | Weights | Usage |
|---|---|---|
| **Syne** | 600, 700, 800 | Section headings, hero text |
| **DM Sans** | 400, 500, 600, 700 | Body text, labels, UI |
| **JetBrains Mono** | 400, 500, 600 | Numbers, prices, code |

### Component Conventions
- shadcn/ui components live in `src/components/ui/` and follow the Radix UI + CVA pattern
- "Page primitives" — custom layout components used consistently across pages: `PageHeader`, `PageContent`, `PageSection`
- Framer Motion used for entry animations on cards and modals

### Color Coding
- Profit / positive P&L → `--profit-primary` (green)
- Loss / negative P&L → `--loss-primary` (red)
- Drawdown gauges: green → yellow → red based on % used
- Direction badges: LONG → green, SHORT → red/orange

---

## 17. Scripts

Located in `scripts/`:

### `seed-prop-firms.ts`
Seeds the `prop_firms` and `prop_firm_challenges` tables with predefined data for popular prop firms (FTMO, MyForexFunds, The5ers, etc.).

Run with:
```bash
npx tsx scripts/seed-prop-firms.ts
```

### `fetch_trade_id.ts`
Debug helper that looks up a trade by external ID (MT5 position ID) and prints the matching DB row. Useful for debugging Terminal Farm sync issues.

---

## 18. Configuration Files

### `next.config.ts`
```typescript
// Key settings:
experimental.serverActions.bodySizeLimit = '2mb'   // for screenshot uploads
images.remotePatterns = [Supabase storage domain]   // for avatar/screenshot images
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2017",
    "paths": { "@/*": ["./src/*"] }
  }
}
```
The `@/` alias maps to `src/`. All internal imports use this alias.

### `components.json`
shadcn/ui configuration — specifies the component style (New York), base color, CSS variables usage, and import aliases.

### `eslint.config.mjs`
Standard Next.js ESLint config with TypeScript rules.

### `postcss.config.mjs`
Minimal PostCSS — just the Tailwind CSS plugin.

### `package.json` — Key Dependencies

| Package | Purpose |
|---|---|
| `next` | Framework |
| `react`, `react-dom` | UI runtime |
| `@supabase/supabase-js`, `@supabase/ssr` | Database & auth |
| `@google/generative-ai` | Gemini AI |
| `@blocknote/react`, `@blocknote/mantine` | Rich text editor |
| `recharts` | Charts (bar, pie, line) |
| `lightweight-charts` | Candlestick/OHLC chart |
| `framer-motion` | Animations |
| `zod` | Runtime schema validation |
| `@radix-ui/*` | Accessible UI primitives |
| `tailwindcss` | CSS framework |
| `clsx`, `tailwind-merge` | Class name utilities |
| `date-fns` | Date manipulation |
| `lucide-react` | Icon set |

---

## 19. Security Model

### Authentication
- Supabase Auth with JWT tokens stored in **httpOnly, Secure cookies**
- Sessions are refreshed automatically by middleware on every request
- OAuth support (Google, GitHub) via Supabase

### Database
- **Row-Level Security (RLS)** on all user-owned tables — users can only read/write their own rows
- **Service Role Key** used only server-side (API routes) for operations that need to bypass RLS (e.g., recalculate-balance)

### MT5 Passwords
- Encrypted with **AES-256-CBC** using a random 16-byte IV before storage
- The `MT5_ENCRYPTION_KEY` is only available server-side
- Decryption only happens in the orchestrator config endpoint and Terminal Farm service

### Webhook Security
- All Terminal Farm webhook requests require the `X-API-Key: <TERMINAL_WEBHOOK_SECRET>` header
- Requests without a valid key return 401

### Input Validation
- All webhook payloads validated with **Zod** schemas before processing
- SQL injection prevented by Supabase's parameterized query builder

### Rate Limiting
- Custom `rate_limit_tracking` table with a `check_rate_limit()` database function
- Applied to sensitive operations (AI generation, sync requests)

### API Key Protection
- All API keys (Twelve Data, Gemini, Supabase service role) are environment variables, never exposed to the browser

---

## 20. File-by-File Reference

### Root Level

| File | Purpose |
|---|---|
| `middleware.ts` | Edge middleware — session refresh + auth guard |
| `next.config.ts` | Next.js app config |
| `tsconfig.json` | TypeScript compiler config |
| `components.json` | shadcn/ui configuration |
| `package.json` | Dependencies and npm scripts |
| `eslint.config.mjs` | ESLint rules |
| `postcss.config.mjs` | PostCSS (Tailwind) |
| `.env.local` | Secret environment variables (gitignored) |
| `env.example` | Template for required env vars |

### `src/app/`

| File/Folder | Purpose |
|---|---|
| `layout.tsx` | Root layout — wraps all pages with AuthProvider, PropAccountProvider, ThemeProvider |
| `page.tsx` | Home page — redirects to `/dashboard` |
| `auth/login/page.tsx` | Login page |
| `auth/signup/page.tsx` | Signup page |
| `auth/callback/route.ts` | OAuth callback handler |
| `dashboard/page.tsx` | Main dashboard with full analytics overview |
| `trades/page.tsx` | Trade CRUD page |
| `notebook/page.tsx` | BlockNote journal editor |
| `analytics/page.tsx` | Advanced performance analytics |
| `playbooks/page.tsx` | Strategy management |
| `prop-firm/page.tsx` | Prop account tracking |
| `calendar/page.tsx` | Trading activity heatmap |
| `settings/page.tsx` | User settings |
| `reports/page.tsx` | Trade report export |
| `weekly/page.tsx` | Weekly review |
| `api/ai/route.ts` | AI actions (generate, chat, analyze) |
| `api/trades/chart/route.ts` | OHLC candle data fetcher |
| `api/mt5-accounts/route.ts` | MT5 account list/create |
| `api/mt5-accounts/[id]/...` | MT5 account enable/disable sync, status |
| `api/prop-accounts/recalculate-balance/route.ts` | Balance recalculation |
| `api/webhook/terminal/trades/route.ts` | EA trade sync webhook |
| `api/webhook/terminal/heartbeat/route.ts` | EA heartbeat webhook |
| `api/webhook/terminal/candles/route.ts` | EA candle data webhook |
| `api/webhook/terminal/positions/route.ts` | EA positions webhook |
| `api/orchestrator/config/route.ts` | Orchestrator config (with decrypted creds) |
| `api/terminal-farm/health/route.ts` | Health check |
| `api/extension/route.ts` | Browser extension endpoint |

### `src/components/`

| File/Folder | Purpose |
|---|---|
| `auth-provider.tsx` | Auth React Context + hooks |
| `prop-account-provider.tsx` | Prop account selection Context |
| `theme-provider.tsx` | next-themes dark/light theme |
| `theme-toggle.tsx` | Theme toggle button |
| `auth/` | Auth guard shell component |
| `dashboard/CashflowChart.tsx` | Recharts bar chart for P&L |
| `dashboard/StatisticsDonut.tsx` | Recharts pie chart |
| `dashboard/RecentTrades.tsx` | Recent trades table |
| `layout/Sidebar.tsx` | Main navigation sidebar |
| `layout/Header.tsx` | Top bar header |
| `ui/` | All shadcn/ui primitives |
| `journal/` | BlockNote editor components |
| `trade/` | Trade form and detail components |
| `calendar/` | Heatmap calendar |

### `src/lib/`

| File/Folder | Purpose |
|---|---|
| `utils.ts` | `cn()`, formatters, helpers |
| `utils/error-handler.ts` | Standardized error responses |
| `constants/` | App-wide constants |
| `api/trades.ts` | Trade CRUD operations |
| `api/prop-accounts.ts` | Prop account operations |
| `api/analytics.ts` | Analytics computations |
| `api/pricing.ts` | Twelve Data candle fetcher + cache |
| `api/gemini.ts` | Gemini AI wrapper |
| `api/playbooks.ts` | Playbook CRUD |
| `api/journal.ts` | Journal entry CRUD |
| `api/storage.ts` | Supabase Storage for screenshots |
| `api/tags.ts` | Tag management |
| `api/terminal-farm.ts` | Client-side Terminal Farm helpers |
| `supabase/client.ts` | Browser Supabase client |
| `supabase/server.ts` | Server Supabase client |
| `supabase/admin.ts` | Admin (service role) client |
| `supabase/middleware.ts` | Session refresh helper |
| `supabase/types.ts` | Auto-generated DB types |
| `terminal-farm/service.ts` | Trade sync, heartbeat, candle logic |
| `terminal-farm/types.ts` | Terminal Farm TypeScript types |
| `terminal-farm/validation.ts` | Zod schemas for webhooks |
| `terminal-farm/metrics.ts` | Sync metrics logging |
| `terminal-farm/retry.ts` | Exponential backoff retry |
| `mt5/encryption.ts` | AES-256-CBC password encryption |
| `mt5/validation.ts` | MT5 data validation |

### `src/domain/`

| File | Purpose |
|---|---|
| `trade-mapper.ts` | Raw DB trade → enriched trade object |
| `trade-types.ts` | Extended trade TypeScript types |

### `src/hooks/`

| File | Purpose |
|---|---|
| `use-mobile.ts` | Mobile viewport detection hook |

### `src/types/`

| File | Purpose |
|---|---|
| `notes.ts` | Journal/note type definitions |
| `prop-firms.ts` | Prop firm type definitions |

### `scripts/`

| File | Purpose |
|---|---|
| `seed-prop-firms.ts` | Seeds prop firm data into DB |
| `fetch_trade_id.ts` | Debug helper for trade lookups |

---

*This document was auto-generated by analyzing the full codebase. Update it whenever significant architectural changes are made.*
