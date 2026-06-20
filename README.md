<p align="center">
  <strong>TradeLog</strong><br/>
  <em>Professional-Grade Trading Journal & Analytics Platform</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?logo=python" alt="Python 3.11" />
  <img src="https://img.shields.io/badge/MQL5-MT5-orange" alt="MQL5" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/Gemini_AI-2.5_Pro-4285F4?logo=google" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/Lines_of_Code-50%2C000%2B-brightgreen" alt="50k+ LOC" />
</p>

---

## Overview

**TradeLog** is a full-stack, production-grade trading journal and performance analytics platform engineered for professional forex and futures traders. It combines real-time MetaTrader 5 (MT5) terminal synchronization, institutional-quality analytics computations, AI-powered performance coaching, and a deep journal review system into a single cohesive SaaS product.

The platform spans **four distinct runtime environments** — a Next.js web application, a Python-based Windows MT5 worker service, a Python Docker orchestration layer, and a custom MQL5 Expert Advisor compiled directly into the MetaTrader 5 terminal — working together through a secure webhook-based communication architecture.

> **Scale**: 50,000+ lines of TypeScript/React across 306 source files, ~900 lines of Python worker/orchestration code, and a 654-line MQL5 Expert Advisor — all designed, architected, and shipped as a solo full-stack engineering effort.

---

## Table of Contents

- [Architecture](#architecture)
- [Core Features](#core-features)
  - [Real-Time MT5 Synchronization Pipeline](#1-real-time-mt5-synchronization-pipeline)
  - [Analytics Engine](#2-analytics-engine)
  - [Journal Review System](#3-journal-review-system)
  - [AI-Powered Performance Reports](#4-ai-powered-performance-reports-gemini-25-pro)
  - [Guardrail & Risk Management System](#5-guardrail--risk-management-system)
  - [Strategy Studio](#6-strategy-studio)
  - [Calendar Review Workspace](#7-calendar-review-workspace)
  - [Dashboard & Data Visualization](#8-dashboard--data-visualization)
  - [Prop Firm Account Management](#9-prop-firm-account-management)
  - [Settings & Profile System](#10-settings--profile-system)
- [Technical Stack](#technical-stack)
- [System Architecture Deep Dive](#system-architecture-deep-dive)
  - [MT5 Sync Providers](#mt5-sync-providers)
  - [Database Design](#database-design)
  - [API Architecture](#api-architecture)
  - [Authentication & Security](#authentication--security)
  - [Domain Layer](#domain-layer)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                             │
│  Next.js 16 App Router  •  React 19  •  Framer Motion  •  Recharts │
│  Radix UI Primitives  •  BlockNote Rich-Text Editor                 │
│  TradingView Lightweight Charts  •  Tailwind CSS 4                  │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼───────────────────────────────────────────┐
│                      NEXT.JS API LAYER                              │
│  24 RESTful API Route Handlers (App Router)                         │
│  Clerk Middleware Auth  •  Zod Validation  •  Rate Limiting         │
│  Drizzle ORM  •  Neon Serverless PostgreSQL Driver                  │
└────┬────────────┬───────────────────────┬───────────────────────────┘
     │            │                       │
     ▼            ▼                       ▼
┌─────────┐ ┌──────────┐ ┌───────────────────────────────────────────┐
│Supabase │ │  Gemini  │ │        MT5 SYNC PROVIDERS                 │
│PostgreSQL│ │  2.5 Pro │ │                                           │
│  + RLS   │ │  AI API  │ │  ┌─────────────────────────────────────┐  │
│  + Funcs │ │          │ │  │  Provider A: Windows MT5 Worker     │  │
└─────────┘ └──────────┘ │  │  Python 3.11 + MetaTrader5 package  │  │
                          │  │  Incremental cursor-based sync      │  │
                          │  │  Deployed via Windows Scheduled Task│  │
                          │  └─────────────────────────────────────┘  │
                          │  ┌─────────────────────────────────────┐  │
                          │  │  Provider B: Terminal Farm          │  │
                          │  │  Docker containers + MQL5 EA        │  │
                          │  │  Python orchestrator + VNC access   │  │
                          │  │  Custom TradingJournalSync.mq5 EA   │  │
                          │  └─────────────────────────────────────┘  │
                          │  ┌─────────────────────────────────────┐  │
                          │  │  Provider C: MetaAPI Cloud          │  │
                          │  │  Third-party hosted MT5 bridge      │  │
                          │  └─────────────────────────────────────┘  │
                          └───────────────────────────────────────────┘
```

---

## Core Features

### 1. Real-Time MT5 Synchronization Pipeline

The platform implements **three distinct MT5 synchronization providers**, each solving the MT5 connectivity problem at a different layer of the stack:

#### Provider A — Windows MT5 Python Worker (`windows-mt5-worker/`)

A standalone Python daemon (894 lines) that runs natively on Windows alongside the MetaTrader 5 desktop client. It communicates with MT5 through the official `MetaTrader5` Python IPC bridge.

- **Cursor-based incremental synchronization**: Maintains a persistent `DealCursor` (last deal timestamp + ticket) to avoid re-uploading historical trades on every sync cycle. Uses `time_msc` (millisecond-precision timestamps) for deterministic deduplication.
- **Assignment-driven architecture**: The worker polls the backend for `WorkerAssignment` objects that contain encrypted credentials, terminal IDs, and chart data jobs. This means the worker is stateless — credentials are never stored locally on disk.
- **MT5 candle data extraction**: Supports on-demand OHLC candle fetching per trade (symbol + timeframe + time range) so the web UI can render actual price charts alongside journal entries.
- **Contract size resolution**: Dynamically queries MT5's `SymbolInfoDouble` for each instrument's contract size, enabling accurate lot-to-dollar risk calculations in the analytics engine.
- **Production deployment scripts**: Includes `bootstrap.ps1`, `install-scheduled-task.ps1`, `package-worker.ps1`, `smoke-test.ps1`, and `check-worker.ps1` — a complete deployment and diagnostics toolkit for zero-manual-intervention production operation.

#### Provider B — Terminal Farm with Custom MQL5 Expert Advisor (`ea/` + `orchestrator/` + `terminal-farm/`)

A fully self-hosted MT5 terminal infrastructure running headless MetaTrader 5 instances inside Docker containers, orchestrated by a Python service:

- **Custom MQL5 Expert Advisor** (`TradingJournalSync.mq5`, 654 lines): A compiled `.ex5` Expert Advisor that runs inside the MT5 terminal. It implements:
  - **Dual heartbeat/sync loop** with configurable intervals (default 15s), sending account balance, equity, margin, session info, and sync state to the backend via `WebRequest`.
  - **Batched deal history upload** with configurable batch sizes (default 200 deals per request) to handle large accounts without timeout.
  - **Real-time trade event capture** via the `OnTradeTransaction` callback — any `TRADE_TRANSACTION_DEAL_ADD` event immediately marks the sync as dirty, triggering an upload within the next timer tick.
  - **Open position streaming** — continuously syncs all live positions (ticket, symbol, type, volume, prices, SL/TP, swap, P&L) so the web UI shows real-time portfolio state.
  - **Broker session readiness detection** — validates that the MT5 session is fully initialized (login, server, and either account metadata or financial data present) before syncing, preventing partial/stale data uploads.
  - **Session mismatch and authorization recovery** — if the backend returns `SESSION_MISMATCH` or `UNAUTHORIZED`, the EA resets its validation state and re-authenticates on the next heartbeat.
  - **Persistent sync cursor** using MT5 `GlobalVariableSet/Get` so that deal counts and last sync timestamps survive EA restarts.
  - **File-based session status reporting** — writes `session_status.json` to the MT5 data directory, enabling external monitoring tools to verify terminal health.

- **Docker Orchestrator** (`orchestrator/`, Python): Manages the lifecycle of MT5 terminal containers.
  - Creates, starts, stops, and removes Docker containers named `mt5-terminal-{terminalId}`.
  - Supports TLS-authenticated Docker API connections for production-grade remote Docker hosts.
  - Configures per-container memory limits (1GB), VNC port exposure for debugging, and `unless-stopped` restart policies.
  - Passes MT5 credentials, backend URLs, and webhook secrets as container environment variables.
  - Implements **reconciliation logic** to detect and clean up orphaned containers that no longer have matching backend assignments.

#### Provider C — MetaAPI Cloud Integration (`src/lib/metaapi/`)

A cloud-hosted alternative using the MetaAPI third-party service (via `metaapi.cloud-sdk` v29), supporting traders who cannot or prefer not to self-host MT5 infrastructure.

---

### 2. Analytics Engine

A **~1,000-line pure TypeScript computation engine** (`src/lib/analytics/compute.ts`) that transforms raw trade data into institutional-grade analytics. Every metric is computed client-side with zero external dependencies.

#### Core Metrics
- **Win rate, profit factor, expectancy** — the foundational trade-level statistics
- **R-multiple distribution** — buckets trades into `<-2R`, `-2R to -1R`, `-1R to 0R`, `0R`, `0R to 1R`, `1R to 2R`, and `2R+` ranges for edge quality analysis
- **P&L distribution** — dynamic 7-bucket histogram with auto-scaling ranges
- **Equity curve construction** — per-trade cumulative balance tracking with peak/trough detection

#### Risk Metrics (Institutional-Grade)
- **Sharpe Ratio** — annualized daily return Sharpe using `√252` scaling, requiring ≥5 data points
- **Sortino Ratio** — downside-deviation-adjusted Sharpe for asymmetric return profiles
- **Calmar Ratio** — annualized CAGR divided by maximum drawdown percentage
- **Recovery Factor** — total net P&L divided by maximum drawdown amount
- **Monte Carlo Risk of Ruin** — 1,200-path simulation with a deterministic PRNG (linear congruential generator, modulus `0x7FFFFFFF`) that bootstraps from historical R-values over a configurable horizon (60–200 trades). Returns the probability of account ruin as a percentage.

#### Drawdown Analytics
- **Per-trade drawdown tracking** with peak balance, drawdown amount, drawdown percentage, and all-time high (ATH) event detection
- **Drawdown cycle reconstruction** — identifies distinct drawdown periods (peak → trough → recovery) with cycle duration and deepest-point metrics
- **Underwater equity chart** — continuous drawdown-from-peak visualization data

#### Consistency Score (Composite)
A proprietary multi-factor consistency rating (0–100) computed from four weighted dimensions:
| Factor | Weight | Method |
|---|---|---|
| Position Size Consistency | 35% | Coefficient of variation of risk fractions (% of equity risked per trade) |
| Session Timing Consistency | 25% | Herfindahl-Hirschman Index (HHI) normalized across session buckets |
| Win/Loss Balance Consistency | 25% | CV of rolling 10-trade R-multiple means |
| Stop Loss Adherence | 15% | Percentage of trades with a defined stop loss |

Requires ≥20 trades to produce a score.

#### Multi-Dimensional Breakdowns
- **By instrument** (symbol) — trades, win rate, profit factor, avg P&L, total P&L, avg hold time
- **By strategy** (playbook) — same metrics, grouped by assigned strategy
- **By trading session** — Asia, London, New York, Overnight — with preconfigured UTC-4 time ranges and color-coded visualization data
- **By day of week** — Monday through Friday P&L and win rate heatmap data
- **By hour of day** — 24-bucket hourly performance distribution
- **By hold duration** — Scalp (<15m), Quick Intraday (15m–1h), Session Trade (1h–4h), Extended Hold (>4h) — with average P&L per bucket

#### Streak Analysis
- Current streak (win/loss/flat), longest win streak, longest loss streak
- Last 12 trades result ribbon (W/L/B) for quick visual assessment

#### MAE/MFE Analysis
- Maximum Adverse Excursion (MAE) and Maximum Favorable Excursion (MFE) scatter plot data per trade, tagged as win/loss, for trade execution quality analysis

---

### 3. Journal Review System

A **deeply structured trade review system** that goes far beyond simple note-taking. The journal domain layer (`src/domain/`, ~48,000 bytes across 6 files) implements a typed, validated review model with 40+ structured fields per trade.

#### Journal Entry Fields
The `JournalReview` type captures:

| Category | Fields |
|---|---|
| **Strategy Context** | `strategyName`, `setupName`, `tradeIdeaId`, `tradeIdeaTitle` |
| **Position Structure** | `positionRole` (primary / add / re-entry / trim / hedge), `positionReason`, `linkedTradeIds`, `groupSummary` |
| **Trade Thesis** | `reasonForTrade`, `invalidation`, `targetPlan`, `intendedTakeProfit` |
| **Market Context** | `marketContext`, `priorSessionBehavior`, `sessionState` (continuation / reversal / ranging), `higherTimeframeBias`, `higherTimeframeNotes` |
| **Timeframe Analysis** | `executionTimeframe`, `triggerTimeframe`, `timeframeAlignment` (aligned / mixed / countertrend / unclear) |
| **Execution Review** | `entryReason`, `managementReview`, `exitReason`, `scaleInNotes` |
| **Execution Quality Ratings** | `entryRatingScore`, `exitRatingScore`, `managementRatingScore` (1–5 scale) |
| **Psychology Tracking** | `psychologyBeforeTags`, `psychologyDuringTags`, `psychologyAfterTags`, free-text `psychologyBefore/During/After` |
| **Post-Trade Reflection** | `overallGrade`, `primaryFailureCause`, `stopDoing`, `followUpAction`, `retakeDecision` (yes / maybe / no) |
| **Trivial Trade Filtering** | `isTrivial`, `trivialReason` — marks trades that should be excluded from behavioral analysis |

#### Rule Intelligence Engine (`journal-rule-intelligence.ts`)

An automated rule-checking system that cross-references trade data against the trader's defined rules:

- **Natural language rule parsing**: Parses rule strings for trade limits (`"no more than 3 trades"`, `"3 trades max"`), daily loss limits (`"daily loss $500"`, `"max loss $200"`), and loss count limits (`"stop after 2 losses"`) using regex-based extraction.
- **Multi-source rule evaluation**: Rules can come from global settings, strategy-specific definitions, or setup-specific criteria. Each source is tagged (`global` / `strategy` / `setup` / `system`) for attribution.
- **Setup context validation**: Automatically checks whether the trade's session matches the setup's `preferredSession`, whether the market condition matches `preferredMarketCondition`, and whether the execution checklist covers the setup's `entryCriteria`.
- **Suggested rule results**: Cross-references auto-detected rule flags against the trader's active `RuleSet` items and pre-fills `followed` / `broken` statuses based on keyword matching.

#### Autosave & Draft Management

- `useJournalAutosave` hook implements debounced autosaving of journal drafts with dirty-state tracking
- `viewModelToDraft` and `mapDraftToTradeUpdate` provide bidirectional mapping between the UI view model and the database persistence layer

#### Trade Review Document

The `use-trade-review-document.ts` hook (45,604 bytes) orchestrates the entire journal review flow — loading trade data, resolving linked strategies/setups/rulebooks, computing rule intelligence, managing screenshots, and persisting changes through the API client.

---

### 4. AI-Powered Performance Reports (Gemini 2.5 Pro)

The reporting system combines a **~1,000-line deterministic report derivation engine** with **Google Gemini 2.5 Pro** AI commentary generation.

#### Report Derivation Engine (`derive-trade-report.ts`)

Produces a `TradeReportSnapshot` containing:
- **Summary statistics**: Total trades, net P&L, gross P&L, total costs, win rate, profit factor, expectancy, average/median hold time, largest win/loss, average win/loss, Sharpe, Sortino
- **Multi-dimensional distributions**: By symbol, direction, session, playbook, weekday, hour, setup tags, mistake tags
- **Hold time buckets**: `<5m` (scalp burst), `5m–15m` (fast scalp), `15m–1h` (intraday reaction), `1h–4h` (session hold), `4h–1d` (extended intraday), `>1d` (multi-day hold)
- **Execution risk analysis**: MAE/MFE averages (overall, winners, losers), entry/exit/management ratings, conviction distribution, stop loss coverage, R-distribution, would-take-again percentage
- **Behavioral pattern detection**: Repeated lessons, common setup/mistake tags, best/worst session, conviction accuracy, management-rating correlation with outcomes
- **Style profile synthesis**: Automatically classifies the trader's style (e.g., "Scalp-heavy with London participation"), direction bias, playbook dependence, execution discipline grade, and risk behavior assessment
- **Detailed trade table**: Per-trade breakdown with all review fields for AI consumption

#### AI Commentary Generation (`gemini-report.ts`)

Sends the full report snapshot to Gemini 2.5 Pro with a **200-line structured prompt** that instructs the model to produce:
- Performance narrative (3–4 paragraphs)
- Psychology analysis (2–3 paragraphs)
- Risk analysis (2–3 paragraphs)
- Timing analysis (2 paragraphs)
- Playbook analysis (2 paragraphs)
- Authoritative verdict paragraph
- Strengths, weaknesses, psychology flags, risk flags, repeated patterns
- Timing observations, playbook observations
- Quick wins, longer-term focus areas, numbered corrective actions
- Confidence assessment

The prompt enforces that every observation must cite specific numbers from the data — no generic advice allowed.

#### Report Builder & Viewer UI

- `report-builder.tsx` (25,414 bytes): Interactive report configuration with date range, symbol, session, and strategy filters
- `report-viewer.tsx` (26,862 bytes): Full report rendering with expandable sections, data tables, and AI commentary display
- Reports are saved to the database as persistent snapshots that can be revisited and compared over time

---

### 5. Guardrail & Risk Management System

A **real-time violation detection engine** (`src/lib/guardrails/violations.ts`) that evaluates every trade against the trader's configurable risk rules:

| Guardrail | Detection Method |
|---|---|
| **Max Risk Per Trade** | Computes `positionSize / accountSize * 100` and flags if above threshold |
| **Max Trades Per Day** | Counts same-day trades by entry date |
| **Daily Loss Cap** | Aggregates same-day closed P&L as a percentage of account size |
| **Below Target R:R** | Compares closed trade R-multiple against minimum target |
| **Loss Streak Break** | Walks backwards through chronologically-sorted closed trades counting consecutive losses |

Violations are surfaced in the UI via `guardrail-violation-badge.tsx` components attached to individual trades.

---

### 6. Strategy Studio

A dedicated workspace (`/strategies`) for defining and managing trading strategies:

- **Strategy CRUD** with name, description, rules, active/inactive toggle, and duplication
- **Setup definitions** with preferred session, preferred market condition, and entry criteria checklists
- **Mistake definitions** for tagging common errors
- **Journal templates** — customizable review form configurations that can be assigned per strategy
- **Rulebook system** — structured rule sets with items, categories, and severity levels, automatically evaluated during journal review via the Rule Intelligence Engine

The strategy system has its own API surface (`/api/strategies/**`) while internally persisting through the playbook domain layer — a deliberate architectural decision to allow UI evolution without data migration.

---

### 7. Calendar Review Workspace

A month-view calendar (`/calendar`) that provides a visual P&L heatmap:

- `calendar-month-map.tsx` renders color-coded day cells based on daily P&L
- `calendar-day-focus.tsx` expands into a detailed day view showing all trades, notes, and statistics
- `use-calendar-workspace.ts` (12,033 bytes) manages calendar state, date navigation, and data loading
- Integrates with the profile timezone system so calendar days align with the trader's local time
- Economic news calendar integration (`src/lib/news/economic-calendar.ts`, 9,818 bytes) with Finnhub API

---

### 8. Dashboard & Data Visualization

- **Cashflow chart** (`cashflow-chart.tsx`, 19,015 bytes): Cumulative P&L equity curve with interactive tooltips and comparison overlays
- **Statistics donut** (`statistics-donut.tsx`, 9,478 bytes): Win/loss/breakeven distribution with animated SVG arcs
- **Recent trades table** (`recent-trades.tsx`, 7,059 bytes): Sortable, filterable trade list with quick-access journal links
- **Playbooks widget** (`playbooks-widget.tsx`): Strategy performance summary cards
- **TradingView Lightweight Charts** integration via `journal-trade-chart.tsx` for per-trade OHLC chart rendering using actual MT5 candle data
- **Arc progress** and **drawdown gauge** custom SVG components for prop firm account health visualization

---

### 9. Prop Firm Account Management

- Full CRUD for prop trading firm accounts with challenge phase tracking
- Account balance, daily drawdown, total drawdown, and profit target monitoring
- MT5 account linking — associates prop accounts with MT5 terminal IDs for automatic trade routing
- **Dual deletion modes**: Archive (hides from workspace, restorable from Settings) and permanent delete (cascades to linked trades and account-scoped records)
- Orphan trade detection — identifies and filters detached MT5-imported trades (`prop_account_id = null, mt5_account_id = null`) left behind by legacy account deletions

---

### 10. Settings & Profile System

- **Account management** (`settings-accounts-panels.tsx`, 28,765 bytes): MT5 account linking, prop account configuration, worker deployment status
- **Profile settings** (`settings-sections.tsx`, 28,520 bytes): Timezone selection (driven by `src/lib/profile/timezones.ts` shared timezone option set), default risk parameters, guardrail configuration
- **Theme system**: Dark/light mode with system preference detection and anti-FOUC protection (inline script in `<head>`)

---

## Technical Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.1.1 | React framework with App Router, Server Components, and Server Actions |
| **React** | 19.2.3 | UI library with concurrent rendering and Server Components |
| **TypeScript** | 5.x | End-to-end type safety across the entire codebase |
| **Tailwind CSS** | 4.x | Utility-first styling with PostCSS integration |
| **Framer Motion** | 12.23.26 | Page transitions, micro-animations, and gesture-driven interactions |
| **Recharts** | 2.15.4 | Composable chart library for analytics visualizations |
| **Lightweight Charts** | 5.1.0 | TradingView's financial charting library for OHLC candle rendering |
| **Radix UI** | Latest | Accessible, unstyled primitive components (Dialog, Dropdown, Tabs, Select, etc.) |
| **BlockNote** | 0.45.0 | Notion-style rich-text editor for journal notebook entries |
| **Lucide React** | 0.562.0 | Icon library |
| **date-fns** | 4.1.0 | Date manipulation and formatting |
| **Zod** | 4.3.6 | Runtime schema validation for API payloads and form data |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Next.js API Routes** | 16.1.1 | 24 RESTful API route handlers via App Router |
| **Clerk** | 7.0.1 | Authentication, session management, and middleware-level route protection |
| **Drizzle ORM** | 0.45.1 | Type-safe SQL query builder with schema-first PostgreSQL integration |
| **Neon Serverless** | 1.0.2 | WebSocket-based serverless PostgreSQL driver for edge/serverless deployment |
| **Supabase** | 2.89.0 | PostgreSQL hosting with Row-Level Security (RLS), storage buckets, and database functions |
| **Google Generative AI** | 0.24.1 | Gemini 2.5 Pro integration for AI-powered performance reports |

### Infrastructure & Integrations
| Technology | Purpose |
|---|---|
| **Docker** | Headless MT5 terminal containers with VNC debugging, memory limits, and restart policies |
| **Python 3.11** | Windows MT5 worker daemon and Docker orchestration service |
| **MetaTrader5 Python** | IPC bridge to local MT5 terminal for deal/position/candle extraction |
| **MetaAPI Cloud SDK** | Third-party hosted MT5 synchronization alternative |
| **MQL5** | Custom Expert Advisor compiled into the MT5 terminal for real-time webhook-based sync |
| **Vercel** | Production deployment target for the Next.js application |
| **Finnhub API** | Economic news calendar integration |

### Testing & Quality
| Technology | Purpose |
|---|---|
| **Jest** | 30.2.0 | Unit testing framework |
| **Testing Library** | React + User Event | Component testing with accessibility-first queries |
| **ESLint** | 9.x | Code linting with Next.js-specific rules |

---

## System Architecture Deep Dive

### MT5 Sync Providers

The system abstracts MT5 connectivity behind a provider pattern (`MT5_SYNC_PROVIDER` env var):

| Provider | Value | Runtime | Best For |
|---|---|---|---|
| Windows MT5 Worker | `windows_mt5_python` | Python daemon on Windows | Traders running MT5 locally |
| Terminal Farm | `terminal_farm` | Docker + MQL5 EA | Self-hosted headless MT5 fleet |
| MetaAPI Cloud | `metaapi` | Cloud-hosted | Zero-infra-management users |

All providers converge on the same webhook API surface:
- `POST /api/webhook/terminal/heartbeat` — account state + session info
- `POST /api/webhook/terminal/trades` — batched deal history
- `POST /api/webhook/terminal/positions` — live position snapshot

### Database Design

PostgreSQL schema with **9 core tables**, **Row-Level Security (RLS)** policies on every table, and **database-side computed columns**:

- `profiles` — extends Clerk's `auth.users` with trading preferences (timezone, default risk %, default R:R ratio)
- `trades` — 30+ columns including entry/exit prices, P&L, R-multiple, session, conviction, MAE/MFE, journal review (JSONB), rule results (JSONB), template snapshots (JSONB), setup/mistake tags (TEXT arrays), and multi-timeframe observations (JSONB)
- `playbooks` — strategies with rules (TEXT array), description, and active state
- `prop_accounts` — prop firm accounts with balance tracking, drawdown limits, profit targets, and phase status
- `journal_entries` — rich-text notebook entries (JSONB content via BlockNote)
- `tags` / `trade_tags` — many-to-many trade tagging system
- `setup_definitions` / `mistake_definitions` / `rule_sets` — journal structure configuration

Key database features:
- **Auto-computed R-multiples** via a `BEFORE INSERT OR UPDATE` trigger that calls `calculate_r_multiple()`
- **Auto-created profiles** via an `AFTER INSERT ON auth.users` trigger
- **`trade_analytics` materialized view** for aggregate query performance
- **Comprehensive RLS** — every table has per-user `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies enforcing `auth.uid() = user_id`

### API Architecture

24 API route handler groups organized by resource:

| Route Group | Methods | Purpose |
|---|---|---|
| `/api/trades` | GET, POST, PUT, DELETE | Trade CRUD with filtering, sorting, and pagination |
| `/api/analytics` | GET | Analytics workspace data with date range, session, and strategy filters |
| `/api/reports` | GET, POST, PUT, DELETE | Report generation, persistence, and AI commentary |
| `/api/ai` | POST | Standalone AI analysis endpoint |
| `/api/strategies` | GET, POST, PUT, DELETE | Strategy management with duplicate and toggle-active actions |
| `/api/playbooks` | GET, POST, PUT, DELETE | Underlying playbook persistence layer |
| `/api/setups` | GET, POST, PUT, DELETE | Setup definition management |
| `/api/mistakes` | GET, POST, PUT, DELETE | Mistake definition management |
| `/api/templates` | GET, POST, PUT, DELETE | Journal template CRUD |
| `/api/rulebooks` | GET, POST, PUT, DELETE | Rule set management |
| `/api/notes` | GET, POST, PUT, DELETE | Notebook entry CRUD |
| `/api/daily-plans` | GET, POST | Daily trading plan entries |
| `/api/profile` | GET, PUT | User profile and preferences |
| `/api/prop-accounts` | GET, POST, PUT, DELETE | Prop firm account management (archive + permanent delete) |
| `/api/prop-firms` | GET | Prop firm metadata |
| `/api/prop-firm-challenges` | GET, POST, PUT, DELETE | Challenge phase tracking |
| `/api/mt5-accounts` | GET, POST, PUT, DELETE | MT5 account linking |
| `/api/news` | GET | Economic calendar proxy |
| `/api/downloads` | GET | Trade data export |
| `/api/seed` | POST | Development data seeding |
| `/api/webhook/terminal/*` | POST | MT5 sync webhook endpoints (heartbeat, trades, positions) |
| `/api/internal/mt5-worker` | GET, POST | Worker assignment distribution |
| `/api/orchestrator` | GET, POST | Docker orchestration commands |

### Authentication & Security

- **Clerk middleware** (`middleware.ts`) intercepts every request:
  - Public page routes (landing, auth flows) are allowed through
  - Public API routes (webhooks, worker endpoints, orchestrator) are allowed with API key validation
  - All other API routes require a valid Clerk `userId`
  - All other page routes call `auth.protect()` to enforce authentication
- **MT5 credential encryption** — MT5 passwords are encrypted at rest using the `MT5_ENCRYPTION_KEY` before database storage
- **Webhook authentication** — Terminal webhooks validate `x-api-key` headers against `TERMINAL_WEBHOOK_SECRET`
- **Worker authentication** — The Windows MT5 worker authenticates with `MT5_WORKER_SECRET`
- **Rate limiting** — `src/lib/rate-limit.ts` implements request-rate enforcement on sensitive endpoints
- **Environment validation** — `src/lib/env.ts` validates all required environment variables at application startup, failing fast with clear error messages

### Domain Layer

The `src/domain/` directory implements a clean **domain-driven design (DDD) boundary** between the raw database schema and the UI:

- `journal-mapper.ts` (579 lines) — bidirectional mapping between database `Trade` records and `JournalTradeViewModel` objects, with type-safe parsing of JSONB review fields, screenshot arrays, rule results, and timeframe observations
- `journal-types.ts` — exhaustive TypeScript type definitions for the journal domain model
- `journal-review-groups.ts` (11,300 bytes) — groups related trades by position ID, trade idea, or time proximity for multi-trade review workflows
- `journal-session-profile.ts` — session-level aggregation and profile building
- `journal-brief.ts` — compact trade summary generation for dashboard and list views
- `journal-rule-intelligence.ts` (334 lines) — automated rule evaluation engine (described above)

---

## Project Structure

```
trading-journal/
├── ea/                           # MQL5 Expert Advisor
│   ├── TradingJournalSync.mq5    # 654-line source (heartbeat, sync, positions)
│   └── TradingJournalSync.ex5    # Compiled binary for MT5
├── orchestrator/                 # Python Docker orchestration
│   ├── docker_client.py          # Container lifecycle management
│   ├── reconciliation.py         # Orphan container cleanup
│   ├── config.py                 # Environment configuration
│   ├── main.py                   # Orchestration entry point
│   └── Dockerfile                # Orchestrator container image
├── windows-mt5-worker/           # Python MT5 worker daemon
│   ├── main.py                   # 441-line worker with cursor sync
│   ├── mt5_client.py             # MetaTrader5 IPC wrapper
│   ├── api_client.py             # Backend API client
│   ├── models.py                 # Assignment, cursor, and job models
│   ├── config.py                 # Worker configuration
│   ├── cursor_store.py           # Persistent sync cursor storage
│   ├── discover_session.py       # MT5 session discovery utilities
│   ├── bootstrap.ps1             # Automated deployment setup
│   ├── install-scheduled-task.ps1 # Windows Task Scheduler integration
│   └── smoke-test.ps1            # Deployment verification
├── terminal-farm/                # Docker-based headless MT5 infrastructure
│   ├── Dockerfile                # MT5 terminal container image (3,695 bytes)
│   ├── supervisor.conf           # Process supervisor configuration
│   └── scripts/                  # Container init and health check scripts
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # 24 API route handler groups
│   │   ├── dashboard/            # Main dashboard page
│   │   ├── journal/              # Trade journal review workspace
│   │   ├── analytics/            # Full analytics workspace
│   │   ├── calendar/             # Calendar review workspace
│   │   ├── reports/              # Report builder and viewer
│   │   ├── strategies/           # Strategy studio
│   │   ├── notebook/             # Rich-text notebook (BlockNote)
│   │   ├── notes/                # Quick notes workspace
│   │   ├── weekly/               # Weekly review workspace
│   │   ├── news/                 # Economic news calendar
│   │   ├── settings/             # Profile and account settings
│   │   ├── auth/                 # Authentication pages
│   │   ├── layout.tsx            # Root layout with providers
│   │   └── globals.css           # 30,806-byte design system
│   ├── components/               # 18 component directories
│   │   ├── ui/                   # 31 primitive UI components
│   │   ├── analytics/            # Analytics workspace components
│   │   ├── calendar/             # Calendar workspace components
│   │   ├── dashboard/            # Dashboard widget components
│   │   ├── journal/              # Journal review components (15 files)
│   │   ├── reports/              # Report builder and viewer
│   │   ├── settings/             # Settings panels
│   │   ├── strategies/           # Strategy studio components
│   │   ├── trade/                # Trade form and list components
│   │   └── layout/               # App shell, sidebar, navigation
│   ├── domain/                   # Domain-driven design layer
│   │   ├── journal-mapper.ts     # 579-line bidirectional mapper
│   │   ├── journal-types.ts      # Exhaustive type definitions
│   │   ├── journal-review-groups.ts  # Multi-trade grouping logic
│   │   ├── journal-rule-intelligence.ts  # Automated rule engine
│   │   ├── journal-session-profile.ts    # Session profiling
│   │   ├── journal-brief.ts      # Compact summary generation
│   │   └── __tests__/            # Domain unit tests
│   ├── lib/                      # 25 service module directories
│   │   ├── analytics/            # ~1,000-line compute engine
│   │   ├── reports/              # Report derivation + Gemini AI
│   │   ├── guardrails/           # Violation detection engine
│   │   ├── mt5-sync/             # MT5 sync service abstraction
│   │   ├── metaapi/              # MetaAPI cloud integration
│   │   ├── terminal-farm/        # Terminal farm service
│   │   ├── db/                   # Drizzle schema (33,529 bytes)
│   │   ├── api/                  # Server + client API layers
│   │   ├── validation/           # Zod schemas
│   │   ├── calendar/             # Calendar review logic
│   │   ├── news/                 # Economic calendar service
│   │   ├── strategies/           # Strategy view model
│   │   ├── rulebooks/            # Rulebook types and logic
│   │   ├── playbooks/            # Playbook persistence layer
│   │   ├── journal-structure/    # Template configuration
│   │   ├── profile/              # Profile and timezone management
│   │   ├── prop-accounts/        # Prop account service
│   │   ├── supabase/             # Supabase client and types
│   │   ├── auth/                 # Auth utilities
│   │   ├── chart/                # Chart data services
│   │   ├── constants/            # Application constants
│   │   ├── data/                 # Data utilities
│   │   ├── mt5/                  # MT5 encryption utilities
│   │   ├── utils/                # General utilities
│   │   └── types/                # Shared TypeScript types
│   ├── hooks/                    # React hooks
│   └── types/                    # Global type declarations
├── supabase/                     # Database schema and migrations
│   ├── schema.sql                # Core schema (318 lines, 9 tables, RLS, triggers)
│   ├── ai_trading_schema.sql     # AI feature extensions
│   ├── add_screenshots.sql       # Screenshot storage migration
│   └── migrations/               # Incremental migration files
├── middleware.ts                  # Clerk auth middleware
├── next.config.ts                # Next.js configuration with redirects
├── drizzle.config.ts             # Drizzle ORM configuration
├── jest.config.ts                # Test configuration
├── package.json                  # Dependencies (43 production, 14 dev)
└── tsconfig.json                 # TypeScript configuration
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20.x
- **pnpm** or **npm**
- **PostgreSQL** database (Supabase recommended, or any PostgreSQL 15+ instance)
- **Clerk** account (authentication provider)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd trading-journal

# Install dependencies
npm install

# Configure environment
cp env.example .env.local
# Edit .env.local with your credentials (see Environment Variables below)

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### MT5 Worker Setup (Optional)

For live MT5 synchronization, deploy the Windows MT5 Worker:

```powershell
cd windows-mt5-worker

# Set up Python virtual environment and install dependencies
.\bootstrap.ps1

# Configure environment
cp .env.example .env
# Edit .env with backend URL, worker secret, and MT5 terminal path

# Run preflight checks
.\smoke-test.ps1

# Install as a Windows Scheduled Task for persistent operation
.\install-scheduled-task.ps1
```

---

## Environment Variables

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g., Neon serverless URL) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key for client-side auth |
| `CLERK_SECRET_KEY` | Clerk secret key for server-side auth |
| `MT5_ENCRYPTION_KEY` | AES encryption key for MT5 credential storage |

### Optional (Feature-Gated)

| Variable | Description |
|---|---|
| `TERMINAL_WEBHOOK_SECRET` | API key for Terminal Farm EA webhook authentication |
| `ORCHESTRATOR_SECRET` | API key for Docker orchestrator communication |
| `ADMIN_API_SECRET` | API key for admin-level operations |
| `MT5_WORKER_SECRET` | API key for Windows MT5 Worker authentication |
| `MT5_SYNC_PROVIDER` | Active sync provider: `terminal_farm`, `metaapi`, or `windows_mt5_python` |
| `GEMINI_API_KEY` | Google Gemini API key for AI-powered report commentary |
| `FINNHUB_API_KEY` | Finnhub API key for economic news calendar |

---

## Deployment

### Web Application

The Next.js application is configured for **Vercel** deployment:

```bash
# Production build
npm run build

# Or deploy via Vercel CLI
vercel --prod
```

### Windows MT5 Worker

Deployed as a **Windows Scheduled Task** via the included PowerShell scripts. The worker runs as a persistent background service that polls the backend for sync assignments every N seconds.

### Terminal Farm (Docker)

The terminal farm orchestrator manages Docker containers:

```bash
cd orchestrator
docker build -t mt5-orchestrator .
python main.py
```

Individual MT5 terminal containers are created dynamically based on backend assignments.

---

## Design Philosophy

1. **Computation at the edge**: All analytics, R-multiple calculations, and consistency scoring happen in pure TypeScript with zero external compute dependencies. The browser does the work — no analytics backend service required.

2. **Provider-agnostic MT5 integration**: The system abstracts over three completely different MT5 connectivity methods behind a unified webhook contract, so the core application never knows or cares how trades arrived.

3. **Domain boundary enforcement**: Raw database rows never leak into the UI. Every trade passes through a typed mapper layer (`journal-mapper.ts`) that normalizes, validates, and enriches the data before it reaches a React component.

4. **AI as augmentation, not dependency**: Gemini AI generates commentary on top of already-complete deterministic reports. The report is fully functional without AI — the AI layer adds narrative analysis and coaching recommendations.

5. **Structured reflection over free-text journaling**: The journal system captures 40+ typed fields per trade review, enabling programmatic analysis of trading psychology and behavior patterns that free-text notes can never provide.

---

<p align="center">
  <sub>Built as a solo full-stack engineering project. Designed for professional traders. Powered by obsessive attention to quantitative detail.</sub>
</p>
