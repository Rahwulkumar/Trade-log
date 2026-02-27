# Trading Journal — Exact Details for PowerPoint

Use this document to fill your slides. Copy the sections as-is or shorten per slide.

---

## Slide 1: Title

- **Project name:** TradeLog (Trading Journal)
- **Tagline:** Full-stack trading journal for prop firm traders: log trades manually or sync from MetaTrader 5, track prop compliance, run ICT-style reviews with screenshots and charts, and use AI (Gemini) for strategy and news analysis—without giving trade signals.

---

## Slide 2: Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16.1.1 (App Router) |
| **Language** | TypeScript 5 (strict) |
| **Frontend** | React 19.2.3, Tailwind CSS 4, Framer Motion, Recharts |
| **UI** | Radix UI (shadcn-style), Mantine (BlockNote), Lucide icons |
| **Charts** | lightweight-charts (candlesticks), Recharts |
| **Rich text** | BlockNote (Notion-style notes) |
| **Backend** | Next.js Route Handlers (`src/app/api/`) |
| **Database** | PostgreSQL via Supabase |
| **Auth** | Supabase Auth (cookie-based sessions) |
| **Storage** | Supabase Storage (trade screenshots) |
| **AI** | Google Gemini (`@google/generative-ai`) |
| **Chart data** | Twelve Data API (1m OHLC, cached in DB) |
| **MT5 sync** | Terminal Farm: Python orchestrator + Docker + EA webhooks |
| **Validation** | Zod 4.x |

---

## Slide 3: High-Level Architecture

- **Next.js app** — Single full-stack app (UI + API). No separate backend repo.
- **Supabase** — PostgreSQL (tables, RLS), Auth (JWT in httpOnly cookies), Storage.
- **API routes** — Trades/chart, prop accounts, Terminal Farm webhooks, orchestrator config, AI, news, Chrome extension.
- **Terminal Farm** — Python orchestrator polls `GET /api/orchestrator/config`; Docker MT5 + EA POST to `/api/webhook/terminal/*` (trades, heartbeat, positions, candles). Data written to `trades`, `terminal_instances`.
- **Chrome extension** — `POST /api/extension` (create/update trade); Supabase auth; dev bypass on localhost only.

**One-line flow:** Browser ↔ Next.js (UI + API) ↔ Supabase (DB/Auth/Storage); Gemini + Twelve Data for AI and charts; Terminal Farm (orchestrator + Docker + EA) syncs MT5 → webhooks → API → Supabase.

---

## Slide 4: Key Features / Modules

| Route | Feature |
|-------|---------|
| **/dashboard** | Overview: account card, P&L stats (gross/net, today, win rate, avg R:R), cashflow chart, win/loss donut, top strategies, prop firm tracker (profit target + drawdown), recent trades, calendar heatmap. |
| **/trades** | Trade list and CRUD; manual entry + sync from Terminal Farm; filters (status, direction, symbol); close trade (PnL, R-multiple); link playbook and prop account. |
| **/journal** | Structured trade review: trade list + selected trade; strategy dropdown; bias (timeframe, notes, ICT PD arrays search/add, screenshots); execution (why now, PD arrays, 1m/5m screenshots); notes & psychology; tags; execution chart (Twelve Data + cache). |
| **/notebook** | BlockNote rich-text notes; folders, favorites; can link to trades. |
| **/playbooks** | Strategy definitions: name, description, rule checklists, categories; AI-generated playbooks; performance metrics per playbook. |
| **/strategies** | Strategy docs and strategy-related views. |
| **/prop-firm** | Prop accounts: firm, phase, balance, profit target, daily/total drawdown gauges, status (challenge/completed/failed); recalculate balance from closed trades. |
| **/analytics** | Win rate, profit factor, expectancy, equity curve, monthly P&L, performance by playbook. |
| **/reports** | Exportable trade reports. |
| **/news** | Economic calendar; AI (Gemini) verdicts: TRADE / CAUTION / AVOID. |
| **/calendar** | Trading activity heatmap; links to trades. |
| **/settings** | Profile (risk %, R:R, timezone); MT5 accounts (add/remove, enable sync). |

**Terminal Farm** — MT5 auto-sync: orchestrator + Docker MT5 + EA; webhooks for trades, heartbeat, positions, candles; credentials stored AES-256-CBC encrypted.

**Chrome extension** — Quick log from browser via API; auth required (dev bypass on localhost).

---

## Slide 5: Data Model (Main Tables)

| Table | Purpose |
|-------|---------|
| **profiles** | User profile (id = auth id), email, name, avatar, default_risk_percent, default_rr_ratio, timezone. Created on signup. |
| **trades** | Core: symbol, direction, entry/exit price/date, status (open/closed), pnl, r_multiple, position_size, commission, swap, stop_loss, take_profit, notes, feelings, observations, screenshots (array), chart_data (cached OHLC), playbook_id, prop_account_id, mt5_account_id, external_id (MT5), tf_observations, execution_notes, execution_arrays, tags via junction. |
| **playbooks** | Strategies: name, description, rules[], required_rules[], rule_categories, ai_generated, ai_prompt, is_active. |
| **prop_accounts** | User prop accounts: name, firm, phase, initial/current balance, status, profit_target, daily_dd_*, total_dd_*, start_date. |
| **prop_firms** | Master list of prop firms (name, website, logo_url). |
| **prop_firm_challenges** | Challenge rules: phase_name, profit_target_percent, drawdown_type, daily/max loss %, min/max trading days. |
| **mt5_accounts** | MT5 credentials: account_name, server, login, password (AES-256 encrypted), terminal_enabled; optional prop_account_id. |
| **terminal_instances** | Per-account container state: account_id, status (PENDING/RUNNING/…), last_heartbeat, last_sync_at. |
| **terminal_commands** | Command queue for EA: terminal_id, command_type (e.g. FETCH_CANDLES), payload, status. |
| **journal_entries** / **notes** | BlockNote notes: title, content (jsonb), trade_id, folder_id, icon, is_favorite. |
| **tags** / **trade_tags** | User tags (name, color); junction trade_tags(trade_id, tag_id). |
| **ai_insights** | Cached AI insights: title, content, insight_type, confidence. |
| **audit_logs** | Action, resource_type, resource_id, ip_address, user_agent. |

**View:** `trade_analytics` — per-user aggregates (total_pnl, win_rate, profit_factor, total_trades).

---

## Slide 6: Integrations

| Integration | Role |
|-------------|------|
| **Supabase** | Auth (email/password, OAuth), PostgreSQL (all tables, RLS), Storage (screenshots). |
| **Twelve Data** | 1m OHLC for candlestick charts; symbol normalized (e.g. EURUSD→EUR/USD); fetch then cache in `trades.chart_data`; rate-limit handling. |
| **Google Gemini** | `/api/ai`: generate-strategy, chat, analyze-trades, setup-scoring; API key server-side only. |
| **Terminal Farm / MT5** | Orchestrator (Python) polls `/api/orchestrator/config` with secret; Docker MT5 + EA; EA sends `X-API-Key: TERMINAL_WEBHOOK_SECRET` to `/api/webhook/terminal/trades`, `/heartbeat`, `/positions`, `/candles`. |
| **Chrome extension** | `POST /api/extension` with action + payload; Zod validation; create/update trade; Supabase auth (dev bypass on localhost). |

---

## Slide 7: Technical Highlights

- **Auth:** Supabase Auth; JWT in httpOnly cookies. Middleware refreshes session; public routes: `/`, `/auth/*`; unauthenticated → redirect to `/auth/login`.
- **RLS:** Enabled on user tables; policies restrict to `auth.uid() = user_id`. Service role only server-side for operations that bypass RLS (e.g. recalculate balance).
- **Migrations:** 26 SQL files in `supabase/migrations/` (run in filename order): journal fields, Terminal Farm tables, RLS, indexes, prop_account_id, security (rate limit, audit), notes table.
- **MT5 security:** Passwords AES-256-CBC encrypted; decryption only in orchestrator and server-side Terminal Farm logic.
- **Webhook security:** Terminal webhooks require `X-API-Key: TERMINAL_WEBHOOK_SECRET`; otherwise 401.
- **Env vars (examples):** `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `MT5_ENCRYPTION_KEY`, `TWELVE_DATA_API_KEY`, `ORCHESTRATOR_SECRET`, `TERMINAL_WEBHOOK_SECRET`, `GOOGLE_GENERATIVE_AI_API_KEY`.
- **Deployment:** Backend/orchestrator ready; GCP deployment paused (billing). Local: `npm run dev`; health: `GET /api/terminal-farm/health`.

---

---

## Slide: Work Done / Status

### Completed

| Area | Status | Details |
|------|--------|---------|
| **API & Supabase** | Done | Prop accounts, trades CRUD, extension API, MT5 webhooks, RLS fixes, indexes |
| **Terminal Farm** | Done | Dockerfile, EA (TradeTaperSync), start script, supervisor |
| **Orchestrator** | Done | Python reconciliation, Docker client, config API |
| **Database migrations** | Done | 26 migrations: journal fields, Terminal Farm tables, RLS, prop_account_id, security (rate limit, audit), notes |
| **Deploy & test scripts** | Done | `setup-vm.sh`, `build-terminal-image.sh`, `deploy-orchestrator.sh`, `test-local.sh` |
| **Code quality** | Done | Audit fixes applied; integration/compat verified |
| **Local testing** | Done | Documented in `docs/LOCAL_TESTING_GUIDE.md` |
| **Frontend (core)** | Done | Dashboard, Trades, Journal, Playbooks, Strategies, Prop Firm, Analytics, Reports, News, Calendar, Settings |
| **Auth & security** | Done | Supabase Auth, RLS, MT5 AES-256 encryption, webhook API key |
| **Integrations** | Done | Twelve Data (chart cache), Gemini (AI), Chrome extension API |

### In progress / Focus

- **UI/UX** — Current focus (backend paused to prioritize UI improvements).
- **Journal** — Revamped layout: trade list, strategy dropdown, bias/execution (search-and-add PD arrays), notes, tags, chart.

### Pending / Blocked

| Item | Status | Blocker |
|------|--------|---------|
| **GCP deployment** | Not done | Billing account setup (was declined earlier) |
| **Orchestrator on GCP** | Pending | Needs GCP VM + Cloud Run Job + Cloud Scheduler after billing |
| **Terminal Farm on GCP** | Pending | Build/push Docker image to GCP after VM |

### One-line summary for slide

**Done:** Full API, Supabase, Terminal Farm, orchestrator, 26 migrations, all main app features, auth/security, local testing. **Focus:** UI/UX. **Blocked:** GCP deployment (billing).

---

## Suggested Slide Order

1. **Title** — TradeLog + tagline  
2. **Tech stack** — Table (framework, frontend, backend, DB, AI, integrations)  
3. **Architecture** — Diagram: Next.js ↔ Supabase; Gemini, Twelve Data, Terminal Farm, Extension  
4. **Features** — Table of routes and one-line description each  
5. **Data model** — Table names + one-line purpose  
6. **Integrations** — Supabase, Twelve Data, Gemini, Terminal Farm, Chrome extension  
7. **Work done / Status** — Completed vs in progress vs pending (table + one-liner)  
8. **Technical details** — Auth, RLS, migrations, security, env, deployment status  

---

*Generated from codebase exploration. File: `docs/PPT_CONTENT.md`*
