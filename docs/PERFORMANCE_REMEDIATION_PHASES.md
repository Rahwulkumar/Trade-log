# Performance Remediation Phases

Date: 2026-03-17

Reference audit: [PERFORMANCE_AUDIT_REPORT.md](/f:/TradingJournal/trading-journal/docs/PERFORMANCE_AUDIT_REPORT.md)

This plan converts the findings in the performance audit into an execution order that removes dead surfaces first, then fixes the architectural causes of repeated fetches, heavy client transforms, and large client-only UI trees.

## Phase 0: Baseline And Guardrails

### Goal
Create a repeatable way to prevent the audited issues from returning after the first cleanup pass.

### Audit Findings Covered
- Repeated client fetching without shared contracts
- Heavy client-only pages that keep growing without budget checks
- Regressions caused by unused legacy surfaces staying in the tree

### Work
- Lock the remediation sequence to this document and the audit.
- Add a rule to future code review: no new feature code may ship with direct overlapping fetches from the same page without a shared data hook or aggregated endpoint.
- Treat any new route-level `Promise.all([getTrades(), getAnalyticsSummary(), getPerformanceByDay()])` pattern as a blocker.
- Require pagination or an explicit limit on any new client trade list fetch.
- Require cleanup for timers, listeners, and observers in client components.

### Exit Criteria
- A single remediation plan exists and is used as the source of truth.
- The highest-impact findings have owners and implementation order.

## Phase 1: Remove Dead Surfaces

### Goal
Delete the unused Chrome extension and every app-side integration that exists only to support it.

### Audit Findings Covered
- Chrome extension issues 11, 12, 25, 26 in the audit summary

### Work
- Remove the top-level `chrome-extension` project from the repo.
- Delete `/api/extension`.
- Delete `src/lib/validation/extension-api.ts`.
- Remove `requireAuthOrBearer()` if it is unused after extension removal.
- Leave the audit report intact as historical evidence, but treat all extension findings as retired by deletion.

### Why This Is First
- The extension is confirmed unused.
- Keeping it around leaves dead bundle weight, dead validation code, extra auth code paths, and a stale public API surface.
- This is the cleanest way to eliminate four audited findings permanently.

### Verification
- Repo no longer contains `chrome-extension`.
- `rg "/api/extension|requireAuthOrBearer|extension-api"` returns no live app references.

### Exit Criteria
- The extension codebase and extension API are gone.

## Phase 2: Normalize Trade Query Contracts

### Goal
Stop downloading oversized trade datasets when the UI only needs a subset.

### Audit Findings Covered
- Client trade API always fetches the full trade list
- Recent trades downloads the whole closed-trade result set and slices in the browser
- Journal page loads the full trade history into one client state bucket

### Work
- Extend the trades query contract to support:
  - `limit`
  - `offset`
  - `sortBy`
  - `sortOrder`
- Apply those parameters in:
  - `src/lib/api/trades.ts`
  - `src/app/api/trades/route.ts`
  - `src/lib/api/client/trades.ts`
- Update `RecentTrades` to request only the rows it needs.
- Prepare the journal and dashboard surfaces to consume limited result sets instead of whole histories.

### Why This Matters
- This is the shared choke point for most of the audited data waste.
- Without fixing the contract, every widget-level fix becomes one-off and fragile.

### Verification
- Recent trades requests include `limit`.
- The trades API enforces ordering and pagination server-side.

### Exit Criteria
- No client component fetches all trades when it only renders a partial list.

## Phase 3: Consolidate Analytics Fetching

### Goal
Fetch a filtered trade dataset once per view and derive all analytics from that shared result.

### Audit Findings Covered
- Analytics helpers refetch and recompute the same closed-trade dataset repeatedly
- Analytics page mounts three overlapping requests and duplicates work already done in analytics helpers
- Statistics donut mounts its own summary request
- Dashboard widgets fragment data loading across multiple independent calls

### Work
- Replace independent analytics helper fetches with a shared cached dataset path.
- Introduce one aggregated analytics overview contract for screens that need summary plus chart series.
- Remove redundant `getTrades()` calls in the analytics page where analytics helpers already cover the same dataset.
- Allow dashboard widgets like `StatisticsDonut` to accept preloaded summary data from the parent page.
- Use a short-lived in-memory cache or route-level aggregated endpoint to dedupe concurrent loads.

### Why This Matters
- This is the biggest current source of duplicated network and compute work.
- Fixing it reduces both render latency and backend load.

### Verification
- Analytics page performs one logical closed-trade fetch per selected account state.
- Dashboard no longer issues a second summary request for the donut when the page already has summary data.

### Exit Criteria
- The analytics page and dashboard stop fan-out fetching overlapping datasets.

## Phase 4: Shrink And Split Heavy Client Pages

### Goal
Break up oversized client components so inactive views do not pay parse, render, and animation cost.

### Audit Findings Covered
- Production analytics bundle eagerly includes large dummy datasets and chart sections
- Journal library ships demo data, charting, and motion libraries in one eager client chunk
- Extension popup is monolithic (retired by Phase 1)

### Work
- Remove or isolate demo datasets behind dev-only or lazy boundaries.
- Split `journal-library.tsx` into:
  - list/grid shell
  - entry detail view
  - chart module
- Dynamically import chart-heavy subtrees.
- Stop shipping demo data in production route bundles.

### Verification
- Journal route imports a smaller top-level module tree.
- Analytics and journal no longer import demo datasets at module scope in production code paths.

### Exit Criteria
- Large charting and demo modules are loaded on demand instead of eagerly.

## Phase 5: Fix Chart Lifecycle And List Rendering

### Goal
Remove full chart teardown loops and unbounded list rendering.

### Audit Findings Covered
- Compact chart destroys and rebuilds the chart instance on every relevant prop change
- Trade chart recreates the full chart instance on resize and data changes
- Journal library renders the full card grid with motion wrappers and no virtualization

### Work
- Refactor chart components to:
  - create the chart once
  - update series data imperatively
  - resize via chart options instead of React state churn
- Virtualize journal entry lists once the data contract supports paging.
- Restrict animations to initial mount or inserted rows only.

### Verification
- Charts no longer call `createChart()` inside broad dependency effects.
- Large trade libraries render only the visible row/window subset.

### Exit Criteria
- Charts update in place.
- Large lists are virtualized or paginated.

## Phase 6: Journal Data Flow Hardening

### Goal
Stop the journal route from treating all trade data as one giant client collection.

### Audit Findings Covered
- Journal page loads the full trade history into one client state bucket
- Journal filters and stats recompute large arrays on every search or filter change
- Autosave hook performs a deep dirty check on every render
- Journal screen polls MT5 terminal status every 15 seconds while mounted

### Work
- Split journal data loading by mode:
  - pending trades
  - journaled library entries
- Paginate library data.
- Move journaled/unjournaled filtering out of the hottest render path.
- Replace broad dirty diff checks with incremental dirty tracking or a stable hash.
- Gate MT5 polling by visibility and UI need.

### Verification
- Search and filter interactions do not require full-array recomputation of unrelated journal views.
- Autosave does not deep-scan the whole draft on every keystroke.

### Exit Criteria
- Journal runtime cost scales with the visible view, not total trade history.

## Phase 7: Notebook And Notes Persistence Cleanup

### Goal
Reduce typing-path blocking work and stale-save risk in note editors.

### Audit Findings Covered
- Notebook autosave can queue stale PATCH requests while rewriting the entire local notes array
- Notebook list rendering does repeated full-array passes and expensive relative-time formatting
- Notes page serializes the entire notebook to localStorage on every edit and CRUD action
- Notes page mixes forced layout measurement with hover-time DOM style mutation

### Work
- Add request sequencing or abort logic to notebook autosave.
- Update only the selected note rather than rewriting the whole array for each keystroke where practical.
- Memoize grouped note lists and derived labels.
- Remove inline hover-time DOM mutations.
- Defer or batch persistence writes off the hot typing path.

### Verification
- Fast typing does not race stale note PATCH responses back into state.
- Local-only notes avoid whole-collection serialization on every keystroke where possible.

### Exit Criteria
- Note editors remain responsive under continuous typing.

## Phase 8: Shell And Theming Cleanup

### Goal
Reduce always-on app shell overhead.

### Audit Findings Covered
- Root layout loads three Google font families into the critical path
- Header scroll shadow is driven by React state on every scroll

### Work
- Reduce root font payload to the minimum required families.
- Scope decorative fonts to the surfaces that need them.
- Remove header scroll state if a CSS-only solution is sufficient.

### Verification
- Root layout font usage is narrower.
- Header behavior no longer depends on a hot scroll-state loop.

### Exit Criteria
- The app shell does less work on every route.

## Phase 9: Regression Prevention

### Goal
Make the fixes durable.

### Work
- Add targeted lint rules or review checklist items for:
  - unbounded client trade fetches
  - duplicate analytics fetch patterns
  - unmanaged timers/listeners/observers
  - eager demo-data imports in production components
- Keep the audit and this plan in `docs` as live engineering references.

### Exit Criteria
- The same performance anti-patterns are blocked early instead of rediscovered later.
