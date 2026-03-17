# Performance Audit Report

Date: 2026-03-17

Scope:
- `trading-journal/src`
- `chrome-extension/src`

Method:
- Static code audit of all major frontend routes, shared providers, charting surfaces, and extension UI.
- Findings below are limited to issues that are directly traceable to specific source locations.

## Summary

### Issue Count By Feature Area

| Feature Area | Issues |
| --- | ---: |
| Data layer and analytics | 4 |
| Dashboard widgets | 5 |
| Journal workspace | 7 |
| Notebook and notes | 4 |
| Layout and shell | 2 |
| Chrome extension | 4 |
| Total | 26 |

### Severity Distribution

| Priority | Count |
| --- | ---: |
| Critical | 2 |
| High | 11 |
| Medium | 12 |
| Low | 1 |

## Data Layer And Analytics

### Issue: Client trade API always fetches the full trade list with no cache or pagination
- **File:** `trading-journal/src/lib/api/client/trades.ts`
- **Line(s):** 9-22, 27-32
- **Root Cause:** `buildQuery()` does not support `limit`, `page`, `sort`, or any cache key normalization, and `getTrades()` performs a raw `fetch()` every time a client component mounts. Every widget that needs trades pulls the full response again, which amplifies network cost and main-thread JSON parsing.
- **Fix:** Extend the API contract to support `limit`, `offset`, and `sort`, then replace direct `fetch()` callers with a shared query hook using request deduplication and caching.
  ```ts
  useQuery({
    queryKey: ["trades", filters],
    queryFn: () => getTrades(filters),
    staleTime: 30_000,
  })
  ```
  Also add server-side pagination so widgets like "recent trades" never download the entire dataset.
- **Priority:** High

### Issue: Analytics helpers refetch and recompute the same closed-trade dataset repeatedly
- **File:** `trading-journal/src/lib/api/analytics.ts`
- **Line(s):** 121-128, 132-173, 186-232, 245-274, 287-325, 330-356
- **Root Cause:** `fetchClosedTrades()` is called independently by `getAnalyticsSummary()`, `getEquityCurve()`, `getPerformanceByDay()`, `getMonthlyPerformance()`, and `getTodayStats()`. A single analytics screen can therefore fetch the same trade set multiple times and rerun the same filtering, sorting, `reduce()`, and `filter()` passes multiple times.
- **Fix:** Build one server-side analytics endpoint that fetches the filtered trade set once and derives all metrics from the same in-memory result. Cache the derived payload by `(userId, propAccountId, date range)` using `unstable_cache` or a query cache.
- **Priority:** Critical

### Issue: Analytics page mounts three overlapping requests and duplicates work already done in analytics helpers
- **File:** `trading-journal/src/app/analytics/page.tsx`
- **Line(s):** 317-343
- **Root Cause:** The page calls `getTrades()`, `getEquityCurve()`, and `getPerformanceByDay()` in parallel. `getEquityCurve()` and `getPerformanceByDay()` already refetch and re-aggregate the same closed trades internally, so the page immediately creates request fan-out and duplicate client transforms.
- **Fix:** Replace the three-call `Promise.all()` with one analytics payload request that returns all chart series and summary cards. Memoize final view models with `useMemo()` if client transforms are still needed.
- **Priority:** High

### Issue: Production analytics bundle eagerly includes large dummy datasets and chart sections
- **File:** `trading-journal/src/app/analytics/page.tsx`
- **Line(s):** 59-72, 336-343, 425-453, 618-1433
- **Root Cause:** The page imports all `DUMMY_*` datasets at module scope and renders many sections directly from those arrays. That code ships in the production client bundle even when real data exists, increasing parse time, bundle size, and render work.
- **Fix:** Move demo-only datasets behind a dev-only import, or split demo panels into a lazily loaded `AnalyticsDemoFallback` component that is only rendered when explicitly enabled.
- **Priority:** High

## Dashboard Widgets

### Issue: Recent trades downloads the whole closed-trade result set and slices in the browser
- **File:** `trading-journal/src/components/dashboard/recent-trades.tsx`
- **Line(s):** 29-30
- **Root Cause:** `getTrades({ status: "closed", propAccountId })` returns the full filtered result set, and the component trims it with `data.slice(0, limit)` after the network request. This is wasteful for any account with a long trade history.
- **Fix:** Add `limit` and `sort=desc` to the trades endpoint and request only the rows needed for the widget.
- **Priority:** High

### Issue: Cashflow chart performs full-range trade bucketing on the client
- **File:** `trading-journal/src/components/dashboard/cashflow-chart.tsx`
- **Line(s):** 127-187
- **Root Cause:** The component downloads all trades in the selected period, converts dates repeatedly with `new Date()`, groups them in a `Map`, sorts buckets, and then runs another `reduce()` for net PnL. All of this work executes on the main thread in a client component.
- **Fix:** Move bucketing to the server and return pre-aggregated `{ label, winners, losers, netPnl }` rows. If client bucketing must remain, wrap the aggregation in `useMemo()` and reuse a normalized timestamp field instead of repeatedly constructing `Date` objects.
- **Priority:** High

### Issue: Equity curve widget fetches and filters an oversized series in the client
- **File:** `trading-journal/src/components/dashboard/equity-curve.tsx`
- **Line(s):** 47-60, 74-77
- **Root Cause:** The widget requests the full equity curve, remaps every point into display strings, then filters the whole series again with `useMemo()` when the selected period changes. The server already has the date context needed to return only the required window.
- **Fix:** Pass `startDate` to `getEquityCurve()` based on the selected period, return preformatted x-axis labels from the API, and only keep the visible window in state.
- **Priority:** Medium

### Issue: Performance-by-day widget triggers another analytics request for a small derived chart
- **File:** `trading-journal/src/components/dashboard/performance-by-day.tsx`
- **Line(s):** 36-40
- **Root Cause:** This widget mounts its own analytics request and then maps the response again for chart labels. On the dashboard this adds another independent round-trip and another render pass over data that is already derived elsewhere.
- **Fix:** Feed this widget from a shared dashboard analytics payload or a shared query cache. Return the final `{ day, pnl }` shape directly from the server.
- **Priority:** Medium

### Issue: Statistics donut mounts its own summary request and recomputes derived money totals in render state
- **File:** `trading-journal/src/components/dashboard/statistics-donut.tsx`
- **Line(s):** 87-111, 124-153
- **Root Cause:** The widget performs another network request for summary data, then derives `breakEven`, `income`, `expense`, and `pieData` locally. This fragments dashboard data loading and creates repeated render-time work for a small card.
- **Fix:** Hydrate the donut from a shared summary object returned with the rest of the dashboard analytics response. Return `wins`, `losses`, `breakEven`, `income`, and `expense` directly from the API.
- **Priority:** Medium

## Journal Workspace

### Issue: Journal page loads the full trade history into one client state bucket
- **File:** `trading-journal/src/app/journal/journal-client.tsx`
- **Line(s):** 633-636
- **Root Cause:** `load()` fetches all trades for the selected account and normalizes the entire list before any journal-specific filtering. That turns the page into an O(n) client data pipeline even when the user only needs one subset.
- **Fix:** Split the page into separate queries for `pending journal trades` and `journaled library entries`, add server-side pagination, and normalize records on the server or in a dedicated mapper that runs only on returned rows.
- **Priority:** Critical

### Issue: Journal screen polls MT5 terminal status every 15 seconds while mounted
- **File:** `trading-journal/src/app/journal/journal-client.tsx`
- **Line(s):** 645-676
- **Root Cause:** The polling loop runs whenever a prop account is selected, regardless of whether the user is actively viewing the live-status section. This keeps network traffic and React state updates alive in the background.
- **Fix:** Pause polling when the tab is hidden, when the page mode is not using the live MT5 banner, or when the section is collapsed. Use a polling hook with `enabled` conditions and visibility-based suspension.
- **Priority:** Medium

### Issue: Journal filters and stats recompute large arrays on every search or filter change
- **File:** `trading-journal/src/app/journal/journal-client.tsx`
- **Line(s):** 683-712
- **Root Cause:** `pendingTrades`, `libraryTrades`, and `stats` all derive from the same large `trades` array. Every search keystroke and filter toggle runs fresh `filter()`, `map()`, and `reduce()` passes and then feeds new arrays into large child trees.
- **Fix:** Move filtering and aggregation server-side for library and log modes, or at minimum memoize normalized lowercase symbol fields and split state so log mode does not recompute library mode data.
- **Priority:** Medium

### Issue: Journal library ships demo data, charting, and motion libraries in one eager client chunk
- **File:** `trading-journal/src/components/journal/journal-library.tsx`
- **Line(s):** 15-16, 101-270, 490-653
- **Root Cause:** `lightweight-charts`, `framer-motion`, `DUMMY_JOURNAL_TRADES`, and chart helper data all live in one client component file. Any route importing the journal library pays the parse and execution cost for demo data and chart code whether or not the user opens a journal entry.
- **Fix:** Split the file into `JournalGrid`, `JournalEntryView`, and `CompactChart` modules. Dynamically import the chart view and remove demo datasets from the production bundle.
- **Priority:** High

### Issue: Compact chart destroys and rebuilds the chart instance on every relevant prop change
- **File:** `trading-journal/src/components/journal/journal-library.tsx`
- **Line(s):** 691-831
- **Root Cause:** The effect removes any existing chart, calls `createChart()`, recreates every price line, recalculates computed styles, and reattaches a `ResizeObserver` whenever candles or trade metadata change. That is expensive for any chart-heavy journal session.
- **Fix:** Create the chart instance once, store the series in refs, and update series data and price lines imperatively instead of rebuilding the chart object. Keep the `ResizeObserver` in its own mount-only effect.
- **Priority:** High

### Issue: Journal library renders the full card grid with motion wrappers and no virtualization
- **File:** `trading-journal/src/components/journal/journal-library.tsx`
- **Line(s):** 1665-1691, 1909-1923
- **Root Cause:** The filtered journal list is fully materialized and each card is wrapped in `AnimatePresence` and `motion.div`. Large trade libraries will pay render, layout, and animation cost for every visible and off-screen card.
- **Fix:** Virtualize the grid with `react-virtual` or `react-window`, and limit entry animations to first paint or newly inserted rows only.
- **Priority:** High

### Issue: Autosave hook performs a deep dirty check on every render
- **File:** `trading-journal/src/hooks/use-journal-autosave.ts`
- **Line(s):** 37-86, 168-180
- **Root Cause:** `isDraftDirty()` walks all scalar fields, arrays, screenshots, and observation maps on every render. Because journal state changes on each keystroke, the hook repeatedly performs O(n) comparisons before the debounce timer is even scheduled.
- **Fix:** Track dirty state incrementally when fields change, or compare a stable serialized hash generated only when the draft mutates. Keep expensive diff logic out of the render path.
- **Priority:** Medium

### Issue: Trade chart recreates the full `lightweight-charts` instance on resize and data changes
- **File:** `trading-journal/src/components/trade/trade-chart.tsx`
- **Line(s):** 44-59, 79-236
- **Root Cause:** The component stores chart dimensions in React state, then rebuilds the chart whenever `dimensions` or candle props change. Resizing the container therefore causes React state churn and full chart teardown/recreation.
- **Fix:** Initialize the chart once, update size via `chart.applyOptions({ width, height })`, and update candle data through the existing series ref. Avoid storing chart dimensions in React state unless they affect JSX.
- **Priority:** Medium

## Notebook And Notes

### Issue: Notebook autosave can queue stale PATCH requests while rewriting the entire local notes array
- **File:** `trading-journal/src/app/notebook/page.tsx`
- **Line(s):** 287-301
- **Root Cause:** Every field edit rewrites the full `notes` array in state, resets a timer, and eventually fires `updateNoteApi()` without aborting prior requests or version-checking the response. Rapid edits can return out of order and replace newer content with older payloads.
- **Fix:** Use one debounced mutation per note with `AbortController` or request sequencing, and update only the selected note object instead of rebuilding the entire list on every keystroke.
- **Priority:** Medium

### Issue: Notebook list rendering does repeated full-array passes and expensive relative-time formatting
- **File:** `trading-journal/src/app/notebook/page.tsx`
- **Line(s):** 98, 341-352, 444-495
- **Root Cause:** Search runs a full filter pass, then the result is split again into pinned and unpinned lists. Each row also formats `updated_at` via `formatDistanceToNowStrict()` during render, and each item is wrapped in motion components.
- **Fix:** Memoize a precomputed `relativeUpdatedAt` string when notes are loaded or updated, and compute grouped note lists in a single pass.
- **Priority:** Medium

### Issue: Notes page serializes the entire notebook to localStorage on every edit and CRUD action
- **File:** `trading-journal/src/app/notes/page.tsx`
- **Line(s):** 94-96, 275-278, 289, 298
- **Root Cause:** `saveNotes()` calls `JSON.stringify(notes)` for the full collection on every debounced keystroke, new note creation, and deletion. That blocks the main thread and scales poorly as note count and note size grow.
- **Fix:** Persist only the changed note, or move storage to IndexedDB. At minimum batch writes with a single background save queue and keep the serialized snapshot outside the hot typing path.
- **Priority:** High

### Issue: Notes page mixes forced layout measurement with hover-time DOM style mutation
- **File:** `trading-journal/src/app/notes/page.tsx`
- **Line(s):** 122-128, 205, 328-339
- **Root Cause:** `NoteListItem` mutates inline styles in `onMouseEnter` and `onMouseLeave`, while `AutoTextarea` writes `height = "auto"` and then immediately reads `scrollHeight`, forcing layout on each value change. Search filtering and sorting also rerun on every render.
- **Fix:** Replace hover mutations with CSS classes only, and resize textareas with `requestAnimationFrame` or a CSS-based auto-grow technique. Wrap the filtered list computation in `useMemo()`.
- **Priority:** Medium

## Layout And Shell

### Issue: Root layout loads three Google font families into the critical path
- **File:** `trading-journal/src/app/layout.tsx`
- **Line(s):** 3-34, 71
- **Root Cause:** `Syne`, `Inter`, and `JetBrains_Mono` are all loaded via `next/font/google` at the root layout. That increases font CSS, preload work, and build-time dependency on external font downloads while affecting every route.
- **Fix:** Keep one primary UI font and one monospace font, self-host where possible, and scope decorative fonts like `Syne` to the few components that actually need them.
- **Priority:** Medium

### Issue: Header scroll shadow is driven by a React state update on every scroll event
- **File:** `trading-journal/src/components/layout/dashboard-header.tsx`
- **Line(s):** 74-83
- **Root Cause:** The header attaches a scroll listener and calls `setScrolled(window.scrollY > 4)` on each scroll event. Even though the state is boolean, the handler still executes on the hottest interaction path in the app shell.
- **Fix:** Replace the scroll listener with CSS `position: sticky` styling only, or throttle the state update with `requestAnimationFrame`. If the shadow only depends on "has scrolled past threshold", use an `IntersectionObserver` sentinel instead.
- **Priority:** Low

## Chrome Extension

### Issue: Extension popup is a monolithic eagerly loaded client bundle
- **File:** `chrome-extension/src/App.tsx`
- **Line(s):** 1-4, 134-304
- **Root Cause:** The popup imports `ScreenshotManager` and `ActiveTradesList` eagerly and keeps all form, screenshot, and active-trade UI logic in one component. Even opening the default tab pays the parse and render cost for inactive subtrees.
- **Fix:** Split the popup by tab and lazy-load the active-trades and screenshot flows. Keep only the current tab mounted.
- **Priority:** High

### Issue: Extension popup fires mount-time browser messaging and leaves a status timer unmanaged
- **File:** `chrome-extension/src/App.tsx`
- **Line(s):** 50-58, 75-82, 108-123
- **Root Cause:** On mount the popup queries the active tab and fetches strategies immediately, then `handleSubmit()` schedules a `setTimeout()` with no cleanup. Reopening and closing the popup repeatedly creates unnecessary work and can leave orphaned timers during unmount.
- **Fix:** Load strategies lazily when the strategy field is opened, guard the tab query behind the "new entry" tab, and store the timeout id in a ref cleared during cleanup.
- **Priority:** Medium

### Issue: Active trades editor rerenders and clones the entire list for single-row edits
- **File:** `chrome-extension/src/components/ActiveTradesList.tsx`
- **Line(s):** 18-20, 35-37, 52, 65-121
- **Root Cause:** `updateTrade()` maps the entire `trades` array on every keystroke, and the whole list re-renders because row components are not memoized. Saving also reuses the same top-level `saving` state for all rows, forcing broad rerenders.
- **Fix:** Extract an `ActiveTradeRow` component wrapped in `React.memo`, keep draft state local to the expanded row, and track saving state per trade id instead of globally.
- **Priority:** Medium

### Issue: Screenshot manager stores large base64 images in React state and renders full previews in the popup
- **File:** `chrome-extension/src/components/ScreenshotManager.tsx`
- **Line(s):** 19-38, 65-117
- **Root Cause:** The component holds raw screenshot data URLs in React state, then renders them directly in `<img>` tags. Base64 screenshots are memory-heavy, increase reconciliation cost, and can freeze the popup when multiple images are captured.
- **Fix:** Convert screenshots to `Blob` objects, create revocable object URLs for previews, and generate smaller thumbnails for the popup list. Release object URLs on removal and unmount.
- **Priority:** High

## Prioritized Summary

| Rank | Issue | File | Priority |
| --- | --- | --- | --- |
| 1 | Analytics helpers refetch and recompute the same closed-trade dataset repeatedly | `trading-journal/src/lib/api/analytics.ts` | Critical |
| 2 | Journal page loads the full trade history into one client state bucket | `trading-journal/src/app/journal/journal-client.tsx` | Critical |
| 3 | Analytics page mounts three overlapping requests and duplicates work already done in analytics helpers | `trading-journal/src/app/analytics/page.tsx` | High |
| 4 | Production analytics bundle eagerly includes large dummy datasets and chart sections | `trading-journal/src/app/analytics/page.tsx` | High |
| 5 | Recent trades downloads the whole closed-trade result set and slices in the browser | `trading-journal/src/components/dashboard/recent-trades.tsx` | High |
| 6 | Cashflow chart performs full-range trade bucketing on the client | `trading-journal/src/components/dashboard/cashflow-chart.tsx` | High |
| 7 | Journal library ships demo data, charting, and motion libraries in one eager client chunk | `trading-journal/src/components/journal/journal-library.tsx` | High |
| 8 | Compact chart destroys and rebuilds the chart instance on every relevant prop change | `trading-journal/src/components/journal/journal-library.tsx` | High |
| 9 | Journal library renders the full card grid with motion wrappers and no virtualization | `trading-journal/src/components/journal/journal-library.tsx` | High |
| 10 | Notes page serializes the entire notebook to localStorage on every edit and CRUD action | `trading-journal/src/app/notes/page.tsx` | High |
| 11 | Extension popup is a monolithic eagerly loaded client bundle | `chrome-extension/src/App.tsx` | High |
| 12 | Screenshot manager stores large base64 images in React state and renders full previews in the popup | `chrome-extension/src/components/ScreenshotManager.tsx` | High |
| 13 | Client trade API always fetches the full trade list with no cache or pagination | `trading-journal/src/lib/api/client/trades.ts` | High |
| 14 | Equity curve widget fetches and filters an oversized series in the client | `trading-journal/src/components/dashboard/equity-curve.tsx` | Medium |
| 15 | Performance-by-day widget triggers another analytics request for a small derived chart | `trading-journal/src/components/dashboard/performance-by-day.tsx` | Medium |
| 16 | Statistics donut mounts its own summary request and recomputes derived money totals in render state | `trading-journal/src/components/dashboard/statistics-donut.tsx` | Medium |
| 17 | Journal screen polls MT5 terminal status every 15 seconds while mounted | `trading-journal/src/app/journal/journal-client.tsx` | Medium |
| 18 | Journal filters and stats recompute large arrays on every search or filter change | `trading-journal/src/app/journal/journal-client.tsx` | Medium |
| 19 | Autosave hook performs a deep dirty check on every render | `trading-journal/src/hooks/use-journal-autosave.ts` | Medium |
| 20 | Trade chart recreates the full `lightweight-charts` instance on resize and data changes | `trading-journal/src/components/trade/trade-chart.tsx` | Medium |
| 21 | Notebook autosave can queue stale PATCH requests while rewriting the entire local notes array | `trading-journal/src/app/notebook/page.tsx` | Medium |
| 22 | Notebook list rendering does repeated full-array passes and expensive relative-time formatting | `trading-journal/src/app/notebook/page.tsx` | Medium |
| 23 | Notes page mixes forced layout measurement with hover-time DOM style mutation | `trading-journal/src/app/notes/page.tsx` | Medium |
| 24 | Root layout loads three Google font families into the critical path | `trading-journal/src/app/layout.tsx` | Medium |
| 25 | Extension popup fires mount-time browser messaging and leaves a status timer unmanaged | `chrome-extension/src/App.tsx` | Medium |
| 26 | Active trades editor rerenders and clones the entire list for single-row edits | `chrome-extension/src/components/ActiveTradesList.tsx` | Medium |
