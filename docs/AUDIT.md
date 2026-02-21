# Trading Journal — Codebase Audit

> **Phase 0 — Audit & Planning**
> Completed: 2026-02-20
> Scope: Every file in `src/` — pages, components, lib, hooks, types, domain

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Issue Classification](#2-issue-classification)
3. [Page-by-Page Breakdown](#3-page-by-page-breakdown)
4. [Component Audit](#4-component-audit)
5. [Lib / API Layer Audit](#5-lib--api-layer-audit)
6. [Dead Code Catalog](#6-dead-code-catalog)
7. [Hardcoded Values Catalog](#7-hardcoded-values-catalog)
8. [Duplicate Logic Catalog](#8-duplicate-logic-catalog)
9. [Type Safety Issues](#9-type-safety-issues)
10. [Security Issues](#10-security-issues)
11. [Missing Shared Components](#11-missing-shared-components)
12. [Inconsistent UI Patterns](#12-inconsistent-ui-patterns)
13. [Prioritized Action List](#13-prioritized-action-list)
14. [Proposed File Structure After Refactor](#14-proposed-file-structure-after-refactor)
15. [Standards & Rules (Phase 1 Preview)](#15-standards--rules-phase-1-preview)

---

## 1. Executive Summary

The codebase is a **functional, full-stack Next.js trading journal** with solid core architecture (Supabase, Zod validation, Supabase Auth, well-structured API routes). However, the codebase has grown organically and shows significant drift from clean-code standards across four axes:

| Category | Count | Impact |
|---|---|---|
| Dead code (unused imports, functions, variables) | 28 instances | Bloat, confusion |
| Hardcoded values (magic numbers, strings, colors) | 65+ instances | Fragility, inconsistency |
| Duplicated logic (copy-paste across files) | 19 instances | Maintenance burden |
| Type safety holes (`any`, unsound casts) | 23 instances | Runtime bugs |
| Security issues | 8 instances | Data exposure risk |
| Non-functional UI (placeholder buttons, mock data) | 12 instances | Broken user experience |
| Style inconsistency (inline styles vs Tailwind vs CSS vars) | 30+ instances | Visual incoherence |
| Component size violations (>200 lines, doing too much) | 7 components | Hard to maintain |

**Total files audited:** 85
**Total issues found:** 186+

---

## 2. Issue Classification

### Severity Levels

| Level | Definition |
|---|---|
| **CRITICAL** | Security vulnerability, data loss risk, broken feature |
| **HIGH** | Bug risk, significant code quality problem, user-facing broken UI |
| **MEDIUM** | Code smell, maintainability concern, missing best practice |
| **LOW** | Style inconsistency, naming, minor cleanup |

### Issue Type Codes

| Code | Meaning |
|---|---|
| `DEAD` | Dead code — remove immediately |
| `HARD` | Hardcoded value — extract to constant or config |
| `DUP` | Duplicated logic — extract to shared utility |
| `TYPE` | TypeScript type safety issue |
| `SEC` | Security concern |
| `UX` | Non-functional or broken user experience |
| `STYLE` | Visual/styling inconsistency |
| `STRUCT` | File/component structure issue |
| `PERF` | Performance concern |

---

## 3. Page-by-Page Breakdown

### `src/app/layout.tsx` — Root Layout

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | `marginLeft: "240px"` inline style | `HARD` | MEDIUM | Magic number for sidebar width — should be a CSS variable or Tailwind class |
| 2 | `suppressHydrationWarning` appears twice on `<body>` | `DEAD` | LOW | Redundant |
| 3 | No React Error Boundary | `STRUCT` | MEDIUM | Unhandled render errors crash entire app |

---

### `src/app/dashboard/page.tsx` — Dashboard (759 lines)

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | `fmt()` and `signedFmt()` defined inline | `DUP` | HIGH | Same formatters defined in analytics page, notebook page, cashflow-chart. Extract to `lib/utils/format.ts` |
| 2 | `CHART_PERIODS` constant defined in component | `HARD` | MEDIUM | Move to `lib/constants/` |
| 3 | `ArcProgress` SVG component inline (custom, ~50 lines) | `DUP` | HIGH | Duplicated SVG arc logic also exists in prop-firm page. Extract to `components/ui/arc-progress.tsx` |
| 4 | `DrawdownGauge` inline component (~40 lines) | `DUP` | HIGH | Near-identical gauge on prop-firm page. Extract to `components/ui/drawdown-gauge.tsx` |
| 5 | Color ternary for stat cards nested 3 levels | `STYLE` | MEDIUM | Extract to `getStatCardColor(value, type)` helper |
| 6 | `useCallback` for `loadData` has `propAccounts` in deps | `PERF` | MEDIUM | Causes unnecessary re-fetches on any prop account change |
| 7 | `Math.max(totalPnl, 0)` — assumes `totalPnl` defined | `TYPE` | MEDIUM | `totalPnl` can be `undefined`; guard properly |
| 8 | Inline date range calculation (5 lines) | `DUP` | LOW | Same pattern in analytics, weekly. Extract to `lib/utils/date-range.ts` |
| 9 | `signedFmt` imported but only used twice | `DEAD` | LOW | Inline or document usage |
| 10 | `PropAccountWithCompliance` type defined locally | `STRUCT` | MEDIUM | Should live in `src/types/prop-accounts.ts` |

---

### `src/app/analytics/page.tsx` — Analytics (520 lines)

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | `MetricCard` interface defined locally | `DUP` | MEDIUM | Same shape exists in dashboard page. Extract to shared types |
| 2 | `FileText` icon imported but never used | `DEAD` | LOW | Remove import |
| 3 | Hardcoded R-multiple breakpoints: `-3R+`, `-2R`, etc. | `HARD` | MEDIUM | Move to `lib/constants/analytics.ts` |
| 4 | Tooltip inline styles duplicated 3× | `DUP` | MEDIUM | Extract to shared `ChartTooltipStyle` object |
| 5 | `Infinity` checked as string comparison (`=== Infinity`) | `TYPE` | HIGH | Inconsistent handling; `profitFactor` should be clamped, not string-compared |
| 6 | 4 `useMemo` hooks that could be consolidated | `PERF` | LOW | Single `useMemo` returning combined derived data |
| 7 | CSS color vars as string literals (4× repeated) | `HARD` | MEDIUM | Centralize in `lib/constants/chart-colors.ts` |
| 8 | Chart axis config duplicated for monthly and R-dist charts | `DUP` | LOW | Extract shared axis config object |
| 9 | No timezone handling for dates | `UX` | MEDIUM | Dates display without user timezone |

---

### `src/app/trades/page.tsx` — Trades (869 lines)

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | Create Trade form and Edit Trade form are near-identical | `DUP` | HIGH | ~250 lines duplicated. Extract to `TradeForm` shared component |
| 2 | `updates: any = {}` in `handleUpdateTrade` | `TYPE` | HIGH | Should be typed as `Partial<TradeUpdate>` |
| 3 | `screenshots: [] as any[]` | `TYPE` | MEDIUM | Type screenshots properly as `TradeScreenshot[]` |
| 4 | Direction badge styling inline in table | `DUP` | MEDIUM | Already a `DirectionBadge` style in journal — use it |
| 5 | Search input has no debounce | `PERF` | MEDIUM | Every keystroke triggers filter on full trade list |
| 6 | Table has no pagination or sort | `UX` | HIGH | Large accounts (1000+ trades) will have severe performance issues |
| 7 | `getMetricColor()` defined inline, single use | `DEAD` | LOW | Inline the expression |
| 8 | Comment `"Simplified for brevity, similar structure"` | `DEAD` | HIGH | Indicates incomplete implementation — finish or remove |
| 9 | Default exit price set to entry price when closing | `UX` | MEDIUM | Confusing UX — default should be blank |
| 10 | No optimistic updates | `UX` | LOW | Perceived slowness on save |

---

### `src/app/trades/[id]/page.tsx` — Trade Detail (491 lines)

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | Three identical `useEffect` debounce patterns (1-sec save) | `DUP` | HIGH | Extract `useAutoSave(value, fn, delay)` hook |
| 2 | `as any` cast on chart candles (line 150) | `TYPE` | MEDIUM | Map properly to `ChartCandle[]` |
| 3 | `renderWidget` switch has 4 cases each 50+ lines | `STRUCT` | MEDIUM | Each widget case should be its own component |
| 4 | `"fixed inset-6 z-50"` — magic z-index and inset | `HARD` | LOW | Use design tokens |
| 5 | `playbook.rules as string[]` cast without validation | `TYPE` | MEDIUM | Rules could be object array from AI; validate before cast |
| 6 | `useCallback` for `loadChartData` may have stale closure | `PERF` | LOW | Add proper deps |
| 7 | `tone` color mapping defined locally | `DUP` | MEDIUM | Same color mapping in journal-step-header. Extract to constants |

---

### `src/app/notebook/page.tsx` — Notebook / Journal (424 lines)

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | `as unknown as TradeScreenshot[]` — double unsafe cast | `TYPE` | HIGH | Fragile; add proper type guard |
| 2 | `h-[calc(100vh-3.5rem)]` hardcoded | `HARD` | MEDIUM | Should be a design token or CSS variable |
| 3 | `w-[280px]` hardcoded sidebar width | `HARD` | MEDIUM | Conflicts with sidebar width constant (240px elsewhere). Unify |
| 4 | File `<input>` element created on every upload call | `PERF` | MEDIUM | Create once with `useRef`, reset `.value` |
| 5 | `useEffect` dependency on `loadChartData` could loop | `PERF` | HIGH | Missing stable dep; wraps unstable function |
| 6 | `fmt()` formatter defined locally | `DUP` | MEDIUM | Same as dashboard, analytics — use shared util |

---

### `src/app/playbooks/page.tsx` — Playbooks (514 lines)

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | `PlaybookWithStats` interface defined locally | `DUP` | MEDIUM | Same interface in strategies page. Move to `src/types/playbooks.ts` |
| 2 | Rules parsed with naive `"\n"` split | `TYPE` | HIGH | Different OS line endings (`\r\n`) will break parsing. Use `split(/\r?\n/)` |
| 3 | `"badge-void"` class | `HARD` | MEDIUM | Non-existent or undocumented class; verify or replace |
| 4 | Win rate progress bar overflows > 100% | `TYPE` | MEDIUM | No `Math.min(winRate, 100)` guard |

---

### `src/app/strategies/page.tsx` — Strategies / AI Builder (567 lines)

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | Full playbook management logic copy-pasted from playbooks page | `DUP` | CRITICAL | ~200 lines of identical code. Must consolidate |
| 2 | `ChatMessage` interface defined locally | `DUP` | MEDIUM | Already defined in `lib/api/gemini.ts`. Import from there |
| 3 | `PlaybookWithStats` defined locally (third copy) | `DUP` | HIGH | Third definition of same type. Extract to shared types |
| 4 | `Date.now().toString()` for message IDs | `HARD` | MEDIUM | Not collision-safe; use `crypto.randomUUID()` |
| 5 | Intro message string hardcoded inline | `HARD` | LOW | Extract to constants |
| 6 | Input doesn't regain focus after send | `UX` | LOW | Accessibility/usability gap |
| 7 | Form cleared on cancel but not validation state | `UX` | LOW | Stale validation UI on reopen |

---

### `src/app/weekly/page.tsx` — Weekly Review (397 lines)

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | **Entire economic calendar is mock data** | `HARD` / `UX` | CRITICAL | 80 lines of hardcoded event objects. No real data source |
| 2 | Date hardcoded: `"Dec 16-20, 2024"` | `HARD` | CRITICAL | Static date — should be dynamic current week |
| 3 | Performance metrics hardcoded (win rate, trades, PnL) | `HARD` | CRITICAL | Shows fake numbers. Must pull from real data |
| 4 | Textarea values not persisted | `UX` | HIGH | Plan/review/lessons text resets on refresh |
| 5 | Button colors hardcoded: `from-[#7c8bb8]` | `HARD` | MEDIUM | Magic hex color in Tailwind JIT class |
| 6 | `getImpactColor()` uses direct color strings | `HARD` | MEDIUM | Use CSS variables for theme consistency |
| 7 | No API calls anywhere on page | `UX` | CRITICAL | Page is entirely non-functional for real use |

---

### `src/app/reports/page.tsx` — Reports (72 lines)

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | All "Generate Report" buttons have no handler | `UX` | HIGH | Non-functional placeholder UI |
| 2 | Reports array hardcoded inline | `HARD` | MEDIUM | Should come from config or constants |
| 3 | Icon color `"#7c8bb8"` hardcoded | `HARD` | MEDIUM | Use CSS variable |
| 4 | No report generation logic exists anywhere | `UX` | HIGH | Feature appears to be a placeholder |

---

### `src/app/settings/page.tsx` — Settings (356 lines)

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | "Save Changes" / "Update Password" / all export buttons non-functional | `UX` | CRITICAL | Nothing on the page actually saves |
| 2 | Form defaults are placeholder data (e.g. `trader@example.com`) | `HARD` | HIGH | Should be populated from `profile` context |
| 3 | Avatar `src="/avatar.png"` file does not exist | `UX` | HIGH | Broken image |
| 4 | Notification toggles set state but never persist | `UX` | HIGH | State resets on refresh |
| 5 | No password strength validation | `UX` | MEDIUM | Any password accepted |
| 6 | No loading or success feedback on any save | `UX` | MEDIUM | User has no confirmation their changes were saved |

---

### `src/app/prop-firm/page.tsx` — Prop Accounts (1330 lines)

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | **1330 lines in a single file** | `STRUCT` | CRITICAL | Largest file in project. Must be split into sub-components |
| 2 | 15+ `console.log()` with emoji prefixes in render/effect paths | `DEAD` | HIGH | Debug code in production build |
| 3 | `await new Promise(r => setTimeout(r, 1000))` race condition hack | `DEAD` | HIGH | Hard-coded 1-second delay to work around race. Fix the race |
| 4 | `toPercent()` helper defined inline | `DUP` | MEDIUM | Used 6+ times; also duplicated in dashboard. Extract to utils |
| 5 | `w-[280px]` hardcoded | `HARD` | MEDIUM | Third occurrence — must become a token |
| 6 | Terminal status not polled — can become stale | `UX` | MEDIUM | Status shows offline/online but never refreshes |
| 7 | `Promise.all` recalculates balance for ALL accounts on every load | `PERF` | MEDIUM | Should only recalculate when balance is stale |

---

### `src/app/auth/login/page.tsx` — Login

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | Link to `/auth/forgot-password` — page does not exist | `UX` | HIGH | Broken link |
| 2 | Raw API error message shown to user | `SEC` | MEDIUM | Could expose internal details |
| 3 | `createClient` dynamically imported inside click handler | `PERF` | LOW | Import at module level |
| 4 | Env var check in `useEffect` could be build-time check | `STRUCT` | LOW | Move to module init |

---

### `src/app/auth/callback/route.ts` — OAuth Callback

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | `next` redirect param not validated | `SEC` | HIGH | Open redirect vulnerability — attacker can redirect to external domain |

---

## 4. Component Audit

### `src/components/journal/psychology-widget.tsx`

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | **Lines 23–33: entire duplicate textarea block** | `DEAD` | CRITICAL | First textarea is dead code — uses hardcoded dark colors and is never visible. Delete lines 23–33 |

---

### `src/components/journal/ui/stat-grid.tsx`

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | `grid-cols-${cols}` dynamic Tailwind class | `TYPE` | CRITICAL | Tailwind JIT cannot generate dynamic class names. This will silently fail for cols > 4. Use `style={{ gridTemplateColumns: \`repeat(${cols}, 1fr)\` }}` instead |

---

### `src/components/dashboard/statistics-donut.tsx`

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | Heavy inline `style={{}}` throughout (240+ lines) | `STYLE` | HIGH | Move to Tailwind classes or CSS module |
| 2 | `fmtMoney` lambda defined inline | `DUP` | MEDIUM | Same pattern in 5 other files. Use shared formatter |
| 3 | Hardcoded `innerRadius=52`, `outerRadius=76` | `HARD` | LOW | Extract to constants |

---

### `src/components/calendar/trading-calendar.tsx` (549 lines)

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | **549 lines — does data fetch, calculations, rendering, and modal** | `STRUCT` | HIGH | Split into: `CalendarGrid`, `DayStatsModal`, `MonthlyStatsCards`, `useCalendarData` hook |
| 2 | Hardcoded weekday array | `HARD` | LOW | Extract to constants |
| 3 | `100` magic number for win rate percentage | `HARD` | LOW | Extract as `MAX_WIN_RATE_PERCENT = 100` |
| 4 | PnL color logic duplicated here and in `pnl-badge`, `recent-trades`, `trade-timeline` | `DUP` | HIGH | Single `getPnLColor(pnl)` utility |

---

### `src/components/layout/sidebar-nav.tsx`

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | Heavy inline `style={{}}` throughout (290 lines) | `STYLE` | HIGH | Convert to Tailwind classes |
| 2 | `"CONIYEST"` branding string hardcoded | `HARD` | HIGH | Should come from app config/constants |
| 3 | `"Trading Journal"` tagline hardcoded | `HARD` | MEDIUM | Should come from app config |

---

### `src/components/layout/dashboard-header.tsx`

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | Heavy inline styles (lines 42–89) | `STYLE` | HIGH | Convert to Tailwind |
| 2 | `PAGE_TITLES` object is well-structured — good pattern to keep | — | — | Keep and export from constants |

---

### `src/components/journal/strategy-playbook-module.tsx` (341 lines)

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | **341 lines — playbook selection + rules checklist + AI prompt + create dialog** | `STRUCT` | HIGH | Split into `PlaybookSelector`, `RulesChecklist`, `CreatePlaybookDialog` |
| 2 | `createForm` reset missing on dialog close | `UX` | MEDIUM | Form state persists after closing modal |

---

### `src/components/prop-firm/prop-firm-manager.tsx` (374 lines)

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | **374 lines — firm selection + challenge editing + form management** | `STRUCT` | HIGH | Split into `FirmSelector`, `ChallengeEditor` components |
| 2 | `crypto.randomUUID()` for temporary IDs | `PERF` | LOW | Could cause React key warnings if IDs change |

---

### `src/components/journal/trade-detail-client.tsx`

| # | Issue | Type | Severity | Detail |
|---|---|---|---|---|
| 1 | Auto-save debounce `1000ms` hardcoded | `HARD` | LOW | `AUTOSAVE_DEBOUNCE_MS = 1000` constant |
| 2 | Missing error boundary | `STRUCT` | MEDIUM | An error in widget render crashes the entire trade detail |

---

### Color & Style Inconsistencies Across Components

| Component | Uses | Instead Of |
|---|---|---|
| `pnl-badge.tsx` | `emerald-600`, `rose-600` | CSS vars `--profit-primary`, `--loss-primary` |
| `equity-curve.tsx` | RGB `"78,203,6"`, `"255,68,85"` | CSS vars |
| `bias-widget.tsx` | `text-emerald-500`, `text-rose-500` | CSS vars |
| `trade-chart.tsx` | DOM-queried CSS vars | CSS vars directly |
| `cashflow-chart.tsx` | `"var(--profit-primary)"` string | CSS var reference |
| `statistics-donut.tsx` | `"var(--surface-elevated)"` string | CSS var reference |

**Rule:** All profit/loss colors must use `--profit-primary` and `--loss-primary` CSS variables. No hardcoded hex, RGB, or Tailwind color literals for semantic colors.

---

## 5. Lib / API Layer Audit

### `src/lib/api/analytics.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | Prop account filter logic copy-pasted 5× | `DUP` | HIGH |
| 2 | `startDate < endDate` not validated | `TYPE` | MEDIUM |
| 3 | Days array hardcoded (no i18n) | `HARD` | LOW |
| 4 | `profitFactor` division by zero → `Infinity` not consistently handled | `TYPE` | HIGH |
| 5 | `split('T')[0]` for date formatting — inconsistent with rest of codebase | `DUP` | MEDIUM |

---

### `src/lib/api/gemini.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | `GEMINI_API_KEY || ''` — empty string fallback instead of fail-fast | `TYPE` | HIGH |
| 2 | Regex JSON extraction without try-catch | `TYPE` | HIGH |
| 3 | Score weights (70, 30) and grade thresholds (90, 75, 60) hardcoded | `HARD` | MEDIUM |
| 4 | `focusAreas` param unused if extraction fails | `DEAD` | LOW |
| 5 | No rate limiting on AI calls | `PERF` | MEDIUM |

---

### `src/lib/api/journal.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | `PGRST116` error handling duplicated in two functions | `DUP` | MEDIUM |
| 2 | `saveTradeJournal` has TOCTOU race (get-then-insert) | `SEC` | MEDIUM |
| 3 | `'trade'` entry type hardcoded | `HARD` | LOW |
| 4 | `split('T')[0]` date formatting | `DUP` | LOW |

---

### `src/lib/api/playbooks.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | Prop account filter copy-pasted | `DUP` | HIGH |
| 2 | `togglePlaybookActive` reads then updates — race condition | `SEC` | MEDIUM |
| 3 | No input validation on `createPlaybook` | `TYPE` | MEDIUM |

---

### `src/lib/api/pricing.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | 4× `as any` casts with eslint-disable | `TYPE` | HIGH |
| 2 | `TWELVE_DATA_BASE_URL` hardcoded in file | `HARD` | MEDIUM |
| 3 | Symbol normalization map is 60-line untested function | `STRUCT` | MEDIUM |
| 4 | Returns empty array on error — caller cannot distinguish error from no-data | `TYPE` | MEDIUM |
| 5 | `getTradeChartData()` is 75 lines doing 5 distinct steps | `STRUCT` | MEDIUM |

---

### `src/lib/api/prop-accounts.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | `deletePropAccount` does 3 separate DB calls — TOCTOU race | `SEC` | HIGH |
| 2 | `updateAccountBalance` drawdown calculation inline | `STRUCT` | MEDIUM |
| 3 | `recalculateBalanceFromTrades` silently returns stale data on error | `TYPE` | MEDIUM |
| 4 | `newBalance >= 0` not validated | `TYPE` | LOW |

---

### `src/lib/api/storage.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | `BUCKET_NAME` constant but should be env var | `HARD` | LOW |
| 2 | No file size or type validation | `SEC` | HIGH |
| 3 | `deleteTradeScreenshot` has no ownership check | `SEC` | HIGH |
| 4 | Filename only uses timestamp — collision possible | `TYPE` | MEDIUM |

---

### `src/lib/api/tags.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | `getTags()` exported but never imported | `DEAD` | LOW |
| 2 | `getTagsForTrade` does 2 queries — should JOIN | `PERF` | MEDIUM |
| 3 | `addTagToTrade` / `removeTagFromTrade` no ownership check | `SEC` | HIGH |
| 4 | `updateTradeTags` TOCTOU race | `SEC` | MEDIUM |

---

### `src/lib/api/trades.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | Prop account filter copy-pasted | `DUP` | HIGH |
| 2 | `closeTrade` reads then updates — already-closed trade not caught | `TYPE` | HIGH |
| 3 | R-multiple calculation: `risk = 0` edge case not fully guarded | `TYPE` | MEDIUM |
| 4 | No validation on `createTrade` (price > 0, valid direction) | `TYPE` | MEDIUM |

---

### `src/lib/mt5/encryption.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | **Hardcoded `scrypt` salt: `'salt'`** | `SEC` | CRITICAL | Predictable salt makes passwords vulnerable to pre-computed attacks |
| 2 | No HMAC authentication — ciphertext can be tampered | `SEC` | HIGH | Should use AES-256-GCM (authenticated encryption) |
| 3 | `split(':')` on corrupted data throws unclear error | `TYPE` | LOW | Add validation |

---

### `src/lib/supabase/admin.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | Falls back to anon key if service role key missing — silently | `SEC` | HIGH | Should throw, not fall back |

---

### `src/lib/supabase/server.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | Empty catch block silently swallows cookie errors | `TYPE` | MEDIUM | At minimum log; ideally handle |

---

### `src/lib/supabase/middleware.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | Public routes hardcoded array | `HARD` | MEDIUM | Move to `lib/constants/routes.ts` |
| 2 | `/auth/forgot-password` not in public routes (page doesn't exist anyway) | `UX` | MEDIUM | — |

---

### `src/lib/terminal-farm/service.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | `const inserts: any[] = []` | `TYPE` | HIGH | Type properly |
| 2 | `processTrades()` is 250+ lines | `STRUCT` | HIGH | Extract: `buildTradeInserts()`, `matchAndCloseExits()`, `persistBatch()` |
| 3 | Orphan trade direction logic may be inverted | `TYPE` | HIGH | Line 370–395: `type === 'SELL' ? 'LONG' : 'SHORT'` — verify logic |
| 4 | Batch size hardcoded: `BATCH_SIZE = 50` | `HARD` | LOW | Name the constant properly, move to config |
| 5 | Only first 5 errors logged | `TYPE` | MEDIUM | Systematic failures hidden |

---

### `src/lib/terminal-farm/retry.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | Jitter applied before capping delay | `PERF` | LOW | Apply jitter after cap for correct exponential backoff |
| 2 | Broad string matching for retryable errors | `TYPE` | LOW | Could match unrelated errors |

---

### `src/lib/validation/extension-api.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | `payload: z.record(z.unknown())` — validates nothing | `TYPE` | MEDIUM | Define specific payload schemas per action |
| 2 | Action strings hardcoded in schema | `HARD` | MEDIUM | Extract to enum |

---

### `src/lib/utils/error-handler.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | TODOs for monitoring/toast integrations — incomplete | `DEAD` | MEDIUM | Implement or remove |
| 2 | Postgres error codes hardcoded inline | `HARD` | LOW | Move to constants |
| 3 | Network errors, timeouts, auth errors not handled | `TYPE` | MEDIUM | Expand error taxonomy |

---

### `src/lib/api/prop-firms.ts`

| # | Issue | Type | Severity |
|---|---|---|---|
| 1 | `upsertPropFirm` and `upsertChallenge` have no auth check | `SEC` | HIGH | Any logged-in user can modify prop firm definitions |
| 2 | Comment indicates confusion about `daily_loss_amount` vs `percent` | `TYPE` | HIGH | Ambiguous calculation could produce wrong values |
| 3 | Legacy `firm`, `phase` fields kept "for consistency" | `DEAD` | MEDIUM | Remove and migrate |

---

## 6. Dead Code Catalog

Items to **delete immediately**. No commenting out.

| File | Lines / Symbol | What to Remove |
|---|---|---|
| `psychology-widget.tsx` | L23–33 | Entire duplicate first textarea block |
| `analytics/page.tsx` | `FileText` import | Unused import |
| `analytics/page.tsx` | `getMetricColor()` | Single-use inline function — inline the expression |
| `strategies/page.tsx` | Local `ChatMessage` interface | Import from `lib/api/gemini.ts` instead |
| `src/lib/api/tags.ts` | `getTags()` export | Never imported anywhere |
| `src/lib/mt5/validation.ts` | `sanitizeInput()` export | Never imported anywhere |
| `lib/utils/error-handler.ts` | TODO comment blocks | Implement or remove dead code paths |
| `prop-firm/page.tsx` | 15+ `console.log()` statements | Debug code |
| `prop-firm/page.tsx` | `setTimeout(resolve, 1000)` hack | Fix the underlying race condition |
| `trades/page.tsx` | Comment `"Simplified for brevity"` | Either implement or remove the placeholder |
| `lib/api/prop-firms.ts` | Legacy `firm`, `phase` fields | Remove and handle in migration |
| `lib/api/gemini.ts` | Unused `focusAreas` parameter path | Remove unused branch |
| `src/app/auth/login/page.tsx` | Dynamic `createClient` import | Move to module level |
| `src/types/prop-firms.ts` | Entire file (duplicate of `lib/types/prop-firms.ts`) | Consolidate into one canonical file |

---

## 7. Hardcoded Values Catalog

All should become named constants or CSS variables.

### Magic Numbers / Sizes

| File | Value | Proposed Constant |
|---|---|---|
| `app/layout.tsx` | `marginLeft: "240px"` | `SIDEBAR_WIDTH = "240px"` → CSS var `--sidebar-width` |
| `notebook/page.tsx` | `w-[280px]` | `SIDEBAR_WIDTH` (same token) |
| `prop-firm/page.tsx` | `w-[280px]` | `SIDEBAR_WIDTH` |
| `trades/[id]/page.tsx` | `"fixed inset-6 z-50"` | `MODAL_Z_INDEX`, `MODAL_INSET` |
| `trade-detail-client.tsx` | `1000` ms debounce | `AUTOSAVE_DEBOUNCE_MS = 1000` |
| `terminal-farm/service.ts` | `50` batch size | `TRADE_BATCH_SIZE = 50` |
| `statistics-donut.tsx` | `52`, `76` | `DONUT_INNER_RADIUS`, `DONUT_OUTER_RADIUS` |
| `cashflow-chart.tsx` | `"0.7rem"` font size | Tailwind `text-xs` |
| `trading-calendar.tsx` | `7` days | `DAYS_PER_WEEK = 7` |
| `analytics/page.tsx` | R-multiple breakpoints | `R_MULTIPLE_RANGES` constant array |
| `gemini.ts` | `70`, `30` weight, `90`, `75`, `60` grade thresholds | `AI_SCORE_WEIGHTS`, `AI_GRADE_THRESHOLDS` |
| `encryption.ts` | `'salt'` scrypt salt | **Must be replaced with random per-record salt (security fix)** |
| `metrics.ts` | `2`, `60` (minute thresholds) | `TERMINAL_STALE_THRESHOLD_MS` etc. |
| `use-mobile.ts` | `768` breakpoint | `MOBILE_BREAKPOINT_PX = 768` |

### Hardcoded Colors

| File | Value | Fix |
|---|---|---|
| `pnl-badge.tsx` | `emerald-600`, `rose-600` | CSS vars `--profit-primary`, `--loss-primary` |
| `equity-curve.tsx` | `"78,203,6"`, `"255,68,85"` | CSS vars |
| `bias-widget.tsx` | `text-emerald-500`, `text-rose-500`, `text-zinc-500` | CSS vars |
| `weekly/page.tsx` | `from-[#7c8bb8]` | CSS var or design token |
| `reports/page.tsx` | `"#7c8bb8"` | CSS var |
| `journal-step-header.tsx` | Hardcoded color map | CSS vars |
| `sidebar-nav.tsx` | Inline style colors | CSS vars / Tailwind |
| `dashboard-header.tsx` | Inline style colors | CSS vars / Tailwind |
| `statistics-donut.tsx` | `"var(--surface-elevated)"` string | Proper CSS reference |

### Hardcoded Strings

| File | Value | Fix |
|---|---|---|
| `auth-shell.tsx` | `"TradeLog"` | `APP_NAME` constant |
| `sidebar-nav.tsx` | `"CONIYEST"`, `"Trading Journal"` | `APP_NAME`, `APP_TAGLINE` |
| `weekly/page.tsx` | `"Dec 16-20, 2024"` | Dynamic current week computation |
| `storage.ts` | `'trade-screenshots'` | `STORAGE_BUCKET` env var or constant |
| `supabase/middleware.ts` | Public routes array | `PUBLIC_ROUTES` constant |
| `extension-api.ts` | Action strings | Enum |

### Hardcoded API Endpoints

| File | Value | Fix |
|---|---|---|
| `terminal-farm.ts` | `/api/mt5-accounts/...` inline | `API_ROUTES` constants object |
| `pricing.ts` | `TWELVE_DATA_BASE_URL` inline | Move to env var |

---

## 8. Duplicate Logic Catalog

Each item below represents logic copy-pasted across multiple files. Must be extracted once.

| # | Logic | Appears In | Proposed Location |
|---|---|---|---|
| 1 | **Prop account query filter** | `analytics.ts` (5×), `playbooks.ts`, `trades.ts` | `lib/utils/query-helpers.ts` → `withPropAccountFilter(query, id)` |
| 2 | **`fmt()` / `fmtMoney()` currency formatter** | `dashboard/page.tsx`, `analytics/page.tsx`, `notebook/page.tsx`, `cashflow-chart.tsx`, `statistics-donut.tsx`, `journal-sidebar.tsx` | `lib/utils/format.ts` → `formatCurrency(n)` |
| 3 | **`signedFmt()` signed currency formatter** | `dashboard/page.tsx`, `analytics/page.tsx` | `lib/utils/format.ts` → `formatSignedCurrency(n)` |
| 4 | **Date range calculation** | `dashboard/page.tsx`, `analytics/page.tsx`, `equity-curve.tsx` | `lib/utils/date-range.ts` → `getDateRangeForPeriod(period)` |
| 5 | **PnL color logic** | `pnl-badge.tsx`, `recent-trades.tsx`, `trading-calendar.tsx`, `trade-timeline.tsx`, `trade-selector.tsx` | `lib/utils/trade-colors.ts` → `getPnLColor(pnl)` |
| 6 | **`split('T')[0]` date formatting** | `analytics.ts`, `journal.ts`, `trade-mapper.ts` | `lib/utils/format.ts` → `formatDate(date)` |
| 7 | **`PlaybookWithStats` interface** | `playbooks/page.tsx`, `strategies/page.tsx`, `playbooks-widget.tsx` | `src/types/playbooks.ts` |
| 8 | **`MetricCard` interface** | `dashboard/page.tsx`, `analytics/page.tsx` | `src/types/ui.ts` |
| 9 | **`ChatMessage` interface** | `strategies/page.tsx` (local), `gemini.ts` | `src/types/ai.ts` (use `gemini.ts` definition) |
| 10 | **ArcProgress SVG** | `dashboard/page.tsx` (inline), `prop-firm/page.tsx` (inline) | `components/ui/arc-progress.tsx` |
| 11 | **DrawdownGauge** | `dashboard/page.tsx` (inline), `prop-firm/page.tsx` (inline) | `components/ui/drawdown-gauge.tsx` |
| 12 | **`toPercent()` helper** | `dashboard/page.tsx`, `prop-firm/page.tsx` | `lib/utils/format.ts` → `toPercent(n)` |
| 13 | **Debounce auto-save pattern** | `trades/[id]/page.tsx` (3×), `notebook/page.tsx` | `hooks/use-auto-save.ts` |
| 14 | **Trade Create / Edit form** | `trades/page.tsx` (duplicated in create and edit dialogs) | `components/trade/trade-form.tsx` |
| 15 | **`PGRST116` Supabase error handling** | `journal.ts` (2×) | `lib/supabase/error-codes.ts` |
| 16 | **Chart axis config** | `analytics/page.tsx` (3× charts) | Shared `defaultAxisConfig` object |
| 17 | **Tooltip inline styles** | `analytics/page.tsx`, `cashflow-chart.tsx` | `components/ui/chart-tooltip.tsx` (already exists — use it) |
| 18 | **Playbook management logic** | `playbooks/page.tsx`, `strategies/page.tsx` | `hooks/use-playbooks.ts` |
| 19 | **`fullPlaybookManagementBlock`** | strategies page copy-pastes 200 lines from playbooks page | Shared `PlaybookManager` component or hook |

---

## 9. Type Safety Issues

| File | Issue | Fix |
|---|---|---|
| `trades/page.tsx` | `updates: any = {}` | `Partial<TradeUpdate>` |
| `trades/page.tsx` | `screenshots: [] as any[]` | `TradeScreenshot[]` |
| `notebook/page.tsx` | `as unknown as TradeScreenshot[]` | Type guard function |
| `trades/[id]/page.tsx` | `as any` on chart candles | Map to `ChartCandle[]` |
| `trades/[id]/page.tsx` | `rules as string[]` | Validate before cast |
| `terminal-farm/service.ts` | `inserts: any[]` | `TradeInsert[]` |
| `bias-widget.tsx` | `icon: any` | `React.ElementType` |
| `journal-sidebar.tsx` | `as unknown as TradeScreenshot[]` | Type guard |
| `screenshot-gallery.tsx` | Fragile `typeof s === "string"` narrowing | Explicit union type |
| `pricing.ts` | 4× `as any` with eslint-disable | Fix Supabase update type |
| `gemini.ts` | `JSON.parse` without validation | Add `z.parse()` with Zod schema |
| `analytics.ts` | `profitFactor` Infinity comparison | Clamp value: `Math.min(pf, 999)` |
| `types/prop-firms.ts` | **Duplicate file with different schema** | Delete `src/types/prop-firms.ts`, use `src/lib/types/prop-firms.ts` |
| `trade-mapper.ts` | R-multiple calculated differently than `trades.ts` | Consolidate into single `calculateRMultiple()` utility |
| `supabase/types.ts` | Manual `TradeScreenshot`, `ChartCandle` overrides | Generate from schema or document why overridden |
| `stat-grid.tsx` | Dynamic Tailwind class `grid-cols-${cols}` | Use inline style |
| `use-mobile.ts` | Initial state `undefined` — hydration mismatch | Initialize as `false` with `typeof window !== 'undefined'` guard |

---

## 10. Security Issues

Ordered by severity.

| # | File | Issue | Severity | Fix |
|---|---|---|---|---|
| 1 | `src/lib/mt5/encryption.ts` | Hardcoded scrypt salt `'salt'` — passwords vulnerable to pre-computation | CRITICAL | Use random per-entry salt stored alongside ciphertext |
| 2 | `src/app/auth/callback/route.ts` | Open redirect — `next` param not validated | HIGH | Validate `next` is a relative path |
| 3 | `src/lib/supabase/admin.ts` | Falls back to anon key silently if service role key missing | HIGH | Throw instead of fallback |
| 4 | `src/lib/api/storage.ts` | `deleteTradeScreenshot` has no ownership verification | HIGH | Check user owns the file path before deleting |
| 5 | `src/lib/api/storage.ts` | No file size or type validation on upload | HIGH | Validate MIME type and max size before upload |
| 6 | `src/lib/api/tags.ts` | `addTagToTrade` / `removeTagFromTrade` no ownership check | HIGH | Verify user owns both the tag and the trade |
| 7 | `src/lib/api/prop-firms.ts` | `upsertPropFirm`, `upsertChallenge` — no admin check | HIGH | Restrict to admin users only |
| 8 | `src/app/auth/login/page.tsx` | Raw API error message shown to user | MEDIUM | Map to user-friendly message |
| 9 | `src/lib/mt5/encryption.ts` | CBC mode has no authentication — ciphertext can be tampered | MEDIUM | Migrate to AES-256-GCM |

---

## 11. Missing Shared Components

Components that need to be created to unify duplicated or ad-hoc UI.

| Component | File | Replaces |
|---|---|---|
| `components/ui/arc-progress.tsx` | New | Inline SVG arc in dashboard + prop-firm pages |
| `components/ui/drawdown-gauge.tsx` | New | Inline gauge in dashboard + prop-firm pages |
| `components/ui/pnl-badge.tsx` | Already exists — standardize color source | `emerald/rose` → CSS vars |
| `components/ui/direction-badge.tsx` | New | Inline direction styling in trades table + journal |
| `components/ui/metric-card.tsx` | New | `MetricCard` ad-hoc in dashboard + analytics |
| `components/ui/chart-tooltip.tsx` | Already exists — use consistently | Inline tooltip styles across charts |
| `components/trade/trade-form.tsx` | New | Duplicate Create/Edit forms in trades page |
| `hooks/use-auto-save.ts` | New | 3 duplicate debounce useEffect patterns |
| `hooks/use-playbooks.ts` | New | Duplicate playbook state logic in 2 pages |
| `lib/utils/format.ts` | New (expand from `utils.ts`) | `fmt()`, `fmtMoney()`, `signedFmt()`, `toPercent()`, `formatDate()` |
| `lib/utils/trade-colors.ts` | New | `getPnLColor()` duplicated in 5 components |
| `lib/utils/query-helpers.ts` | New | `withPropAccountFilter()` duplicated in 3 lib files |
| `lib/utils/date-range.ts` | New | Date range logic in 3 pages |
| `lib/constants/chart-colors.ts` | New | CSS variable color strings scattered across charts |
| `lib/constants/routes.ts` | New | Public routes array in middleware, broken links |
| `src/types/playbooks.ts` | New | `PlaybookWithStats` in 3 files |
| `src/types/ui.ts` | New | `MetricCard` in 2 pages |

---

## 12. Inconsistent UI Patterns

### Layout Spacing
- Some pages use `p-6` for outer padding, some use `p-8`, some use `px-6 py-4`
- Prop-firm page uses ad-hoc layout; dashboard and analytics use `PageShell`
- **Fix:** All pages use `PageShell` + consistent inner padding via design tokens

### Typography
- Headings mix `text-2xl font-bold`, `text-xl font-semibold`, `text-lg font-medium` with no consistent hierarchy
- **Fix:** Define `h1`, `h2`, `h3`, `page-title`, `section-title` CSS classes

### Cards
- Dashboard uses glass-card style with border
- Prop-firm uses different card padding
- Playbooks uses a third card style
- **Fix:** Single `Card` variant from shadcn/ui with consistent props, or define `card`, `card-elevated` token classes

### Empty States
- `empty-state.tsx` exists and is good — but not used consistently
- Several pages implement their own empty state inline
- **Fix:** Use `EmptyState` component everywhere

### Loading States
- `loading.tsx` has `Spinner`, `PageLoader`, `CardSkeleton` — but pages implement their own loaders
- **Fix:** Use `Spinner` / `CardSkeleton` from the shared component

### Error Display
- Analytics page: error banner with border
- Playbooks page: separate error div
- Settings page: no error display at all
- **Fix:** Single `ErrorBanner` component

### Buttons
- Some CTA buttons use `bg-accent-primary` via inline style
- Some use `variant="default"` from shadcn
- Some use hardcoded gradient classes
- **Fix:** Establish button variants in shadcn config and use only those

---

## 13. Prioritized Action List

### Phase 0 — Critical Fixes (Before Any Refactor)

These are security or data integrity issues that need fixing first.

| Priority | Task | File(s) |
|---|---|---|
| P0-1 | Fix encryption: replace hardcoded salt with random per-entry salt | `lib/mt5/encryption.ts` |
| P0-2 | Fix open redirect in OAuth callback | `app/auth/callback/route.ts` |
| P0-3 | Add ownership check to `deleteTradeScreenshot` | `lib/api/storage.ts` |
| P0-4 | Add file type + size validation to screenshot upload | `lib/api/storage.ts` |
| P0-5 | Add ownership check to `addTagToTrade` / `removeTagFromTrade` | `lib/api/tags.ts` |
| P0-6 | Admin client: throw if service role key missing | `lib/supabase/admin.ts` |
| P0-7 | Fix dynamic Tailwind class in `stat-grid.tsx` | `components/journal/ui/stat-grid.tsx` |
| P0-8 | Delete dead duplicate textarea in `psychology-widget.tsx` | `components/journal/psychology-widget.tsx` |

---

### Phase 1 — Create Standards File

| Priority | Task |
|---|---|
| P1-1 | Create `.cursor-rules` with React/Next.js/TypeScript rules |
| P1-2 | Create `lib/constants/app.ts` (app name, routes, breakpoints) |
| P1-3 | Create `lib/utils/format.ts` (all formatters) |
| P1-4 | Create `lib/utils/trade-colors.ts` (semantic color helpers) |
| P1-5 | Create `lib/utils/query-helpers.ts` (prop account filter) |
| P1-6 | Create `lib/constants/chart-colors.ts` (CSS var references) |
| P1-7 | Create `src/types/playbooks.ts`, `src/types/ui.ts`, `src/types/ai.ts` |
| P1-8 | Delete `src/types/prop-firms.ts` (duplicate) |

---

### Phase 2 — Component Library

| Priority | Task |
|---|---|
| P2-1 | Create `hooks/use-auto-save.ts` |
| P2-2 | Create `hooks/use-playbooks.ts` |
| P2-3 | Create `components/ui/arc-progress.tsx` |
| P2-4 | Create `components/ui/drawdown-gauge.tsx` |
| P2-5 | Create `components/ui/direction-badge.tsx` |
| P2-6 | Create `components/ui/metric-card.tsx` |
| P2-7 | Create `components/trade/trade-form.tsx` (merged create+edit) |
| P2-8 | Fix `pnl-badge.tsx` colors → CSS vars |
| P2-9 | Convert `sidebar-nav.tsx` + `dashboard-header.tsx` inline styles → Tailwind |
| P2-10 | Split `trading-calendar.tsx` into sub-components + hook |
| P2-11 | Split `strategy-playbook-module.tsx` into sub-components |
| P2-12 | Split `prop-firm-manager.tsx` into sub-components |
| P2-13 | Remove all dead code from Dead Code Catalog |
| P2-14 | Replace all hardcoded values from Hardcoded Values Catalog |
| P2-15 | Delete all `console.log` debug statements |

---

### Phase 3 — Page-by-Page UI Fix

| Priority | Task | Page |
|---|---|---|
| P3-1 | Use `profile` context to populate settings form; wire Save buttons | Settings |
| P3-2 | Fix broken avatar image; replace placeholder data | Settings |
| P3-3 | Implement weekly page dynamic date + real data | Weekly |
| P3-4 | Add real data to weekly performance section | Weekly |
| P3-5 | Wire or remove Report generation buttons | Reports |
| P3-6 | Fix broken `/auth/forgot-password` link | Login |
| P3-7 | Add debounce to trade search input | Trades |
| P3-8 | Use `TradeForm` shared component in Trades page | Trades |
| P3-9 | Extract `useAutoSave` in trade detail + notebook | Trade Detail, Notebook |
| P3-10 | Implement missing pagination in Trades table | Trades |
| P3-11 | Unify prop-firm page using shared components (split 1330-line file) | Prop Firm |
| P3-12 | Fix strategies page: remove duplicate playbook logic, use hook | Strategies |
| P3-13 | Connect analytics charts to consistent `chartColors` constants | Analytics |
| P3-14 | Fix `profitFactor` Infinity display | Analytics |
| P3-15 | Dashboard: extract `ArcProgress`, `DrawdownGauge` to shared ui | Dashboard |

---

## 14. Proposed File Structure After Refactor

```
src/
├── app/                         # Next.js App Router (unchanged structure)
│
├── components/
│   ├── ui/                      # All primitives (shadcn + custom)
│   │   ├── arc-progress.tsx     # NEW: Reusable SVG arc gauge
│   │   ├── direction-badge.tsx  # NEW: LONG/SHORT badge
│   │   ├── drawdown-gauge.tsx   # NEW: Drawdown percentage gauge
│   │   ├── empty-state.tsx      # Existing — use consistently
│   │   ├── loading.tsx          # Existing — use consistently
│   │   ├── metric-card.tsx      # NEW: Standard stat metric card
│   │   ├── chart-tooltip.tsx    # Existing — use consistently
│   │   └── ...shadcn primitives
│   │
│   ├── trade/
│   │   ├── trade-chart.tsx      # Existing
│   │   └── trade-form.tsx       # NEW: Unified create/edit form
│   │
│   ├── journal/
│   │   ├── widgets/             # NEW sub-directory
│   │   │   ├── bias-widget.tsx
│   │   │   ├── execution-widget.tsx
│   │   │   ├── psychology-widget.tsx
│   │   │   └── strategy-logic.tsx
│   │   ├── playbook/            # NEW sub-directory
│   │   │   ├── playbook-selector.tsx
│   │   │   ├── rules-checklist.tsx
│   │   │   └── create-playbook-dialog.tsx
│   │   └── ui/                  # Generic journal UI (existing)
│   │
│   ├── calendar/
│   │   ├── trading-calendar.tsx # Split: CalendarGrid + DayStatsModal + MonthlyStatsCards
│   │   └── ...
│   │
│   ├── dashboard/               # Existing — unchanged
│   ├── layout/                  # Existing — clean up inline styles
│   ├── prop-firm/               # Split prop-firm-manager into sub-components
│   ├── auth-provider.tsx
│   ├── prop-account-provider.tsx
│   └── theme-provider.tsx
│
├── hooks/
│   ├── use-mobile.ts            # Existing — fix hydration issue
│   ├── use-auto-save.ts         # NEW
│   └── use-playbooks.ts         # NEW
│
├── lib/
│   ├── api/                     # Existing — clean up duplicates
│   ├── constants/
│   │   ├── app.ts               # NEW: APP_NAME, APP_TAGLINE, SIDEBAR_WIDTH
│   │   ├── routes.ts            # NEW: PUBLIC_ROUTES, API_ROUTES
│   │   ├── chart-colors.ts      # NEW: CSS var references
│   │   ├── analytics.ts         # NEW: R-multiple ranges, grade thresholds
│   │   └── ict-pd-arrays.ts     # Existing
│   ├── utils/
│   │   ├── format.ts            # NEW: All currency, date, percentage formatters
│   │   ├── trade-colors.ts      # NEW: getPnLColor, getDirectionColor
│   │   ├── query-helpers.ts     # NEW: withPropAccountFilter
│   │   ├── date-range.ts        # NEW: getDateRangeForPeriod
│   │   └── error-handler.ts     # Existing — expand
│   ├── supabase/                # Existing
│   ├── terminal-farm/           # Existing — refactor service.ts
│   └── mt5/
│       └── encryption.ts        # Fix: random salt, GCM mode
│
├── types/
│   ├── ai.ts                    # NEW: ChatMessage, GeneratedStrategy
│   ├── playbooks.ts             # NEW: PlaybookWithStats
│   ├── ui.ts                    # NEW: MetricCard, StatCardProps
│   └── notes.ts                 # Existing
│   # DELETED: src/types/prop-firms.ts (duplicate)
│
└── domain/
    ├── trade-mapper.ts          # Fix: use shared calculateRMultiple()
    └── trade-types.ts
```

---

## 15. Standards & Rules (Phase 1 Preview)

The `.cursor-rules` file will enforce these standards:

### React & Next.js
- Server components by default. Add `"use client"` only when using hooks, browser APIs, or event handlers.
- No `useEffect` for data fetching — use React Server Components or `loader` pattern.
- `useCallback` and `useMemo` only when profiling proves necessity.
- Pages are thin — business logic lives in hooks or lib.

### Components
- Max 200 lines per component file. Split if exceeded.
- One component per file.
- Props always typed with interface, not inline type literal.
- No prop named `data` — be specific (`trades`, `account`, `stats`).
- Event handlers named `on[Noun][Verb]`: `onTradeCreate`, `onAccountSelect`.
- Components live in the most specific directory: `ui/` for primitives, `trade/` for trade-specific, etc.

### Styling
- **No inline `style={{}}` objects** unless absolutely necessary (dynamic computed values).
- **No hardcoded hex colors or Tailwind color literals** for semantic colors (profit, loss, accent). Use CSS variables.
- All semantic colors: `--profit-primary`, `--loss-primary`, `--accent-primary`, `--text-primary`, etc.
- Spacing: use Tailwind spacing scale only. No `px-[17px]` or arbitrary values without comment.
- Sidebar width: `var(--sidebar-width)`. Never hardcode `240px` or `280px`.

### TypeScript
- No `any` type. Use `unknown` if type is genuinely unknown, then narrow.
- No `as any` casts. Fix the underlying type.
- No `// @ts-ignore`. Fix the type error.
- All API response data validated with Zod before use.
- No `JSON.parse()` without try-catch and Zod validation.

### Dead Code
- No commented-out code.
- No `console.log` / `console.warn` / `console.error` in components or lib files (use logger service).
- No placeholder functions that do nothing.
- No TODO comments that are weeks old — either fix or file an issue.

### Hardcoded Values
- No magic numbers. Named constants only.
- No magic strings for routes — use `ROUTES` constants.
- No magic strings for feature flags — use config.
- API keys and secrets: env vars only, never in source.

### Backend / API Routes
- Every route: authenticate first, then authorize, then process.
- All input validated with Zod before use.
- All responses follow shape: `{ data?, error?, message? }`.
- No `console.log` debug statements.
- Rate limiting on all AI and expensive endpoints.

### File Naming
- Pages: `page.tsx` (Next.js convention).
- Components: `kebab-case.tsx`.
- Hooks: `use-kebab-case.ts`.
- Utilities: `kebab-case.ts`.
- Types: `kebab-case.ts`.
- Constants: `kebab-case.ts`.

---

*This audit represents Phase 0. No code has been changed yet. Proceed to Phase 1 only after this document is reviewed and approved.*
