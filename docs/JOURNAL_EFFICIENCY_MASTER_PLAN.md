# Journal Efficiency & UX Hardening — Master Plan

> **Status:** Phase 0 Complete → Ready for Phase 1 execution  
> **Scope:** Journal-first, strict quality gate, phased delivery  
> **Output also written to:** `f:\TradingJournal\trading-journal\docs\JOURNAL_EFFICIENCY_MASTER_PLAN.md`

---

## Phase 0: Architecture Map (Produced by Audit)

### File Inventory

| File                                            | Lines | Role                                                   | Risk   |
| ----------------------------------------------- | ----- | ------------------------------------------------------ | ------ |
| `src/app/journal/journal-client.tsx`            | 1504  | Page shell + TradeJournal editor + all sub-components  | High   |
| `src/components/journal/journal-library.tsx`    | 1906  | Library grid + entry detail view + chart               | High   |
| `src/components/journal/screenshot-gallery.tsx` | ~200  | Screenshot grid UI                                     | Medium |
| `src/domain/trade-types.ts`                     | 31    | `EnrichedTrade`, `TradeOutcome`, `TradeFilterCriteria` | Stable |
| `src/lib/api/trades.ts`                         | 172   | Data access — `getTrades`, `updateTrade`, etc.         | Stable |

### State Ownership Map

```
JournalPage (journal-client.tsx:961)
├── trades: Trade[]                    ← raw Supabase rows
├── selectedTrade: Trade | null        ← drives TradeJournal render
├── pageMode: "log" | "library"
├── entryTrade: { symbol, pnl, outcome } | null
├── search, outcome, direction         ← log-mode filter state
│
├── pendingTrades (useMemo)            ← filtered, un-journaled trades
├── libraryTrades (useMemo)            ← ALL trades mapped to JournalTrade
│
└── TradeJournal (journal-client.tsx:472)
    ├── state: TradeJournalState        ← all mutable journal fields
    ├── activeTab: JournalTab
    ├── saving, savedAt, fullscreenUrl
    ├── dirty: useRef<boolean>          ← mutation sentinel
    └── useScreenshotUpload (hook, lines 372–423)

JournalLibrary (journal-library.tsx)
├── activeEntry: JournalTrade | null
├── filterText, filterOutcome
└── CompactChart (inline component, lightweight-charts)
```

### Save Flow

```
User edits field
  → update(patch)        [journal-client.tsx:499]
  → dirty.current = true
  → useEffect([state])   [journal-client.tsx:591]  ← AUTOSAVE BUG
      → setTimeout(handleSave, 2500)               ← stale closure
  → OR user clicks Save (manual)
  → supabase.from("trades").update(...)
  → dirty.current = false; setSavedAt(new Date()); onSaved()
```

---

## Phase 0: Problem Inventory

### P1 — Unsafe Type Casts

| Location              | Line | Pattern                                                          |
| --------------------- | ---- | ---------------------------------------------------------------- |
| `journal-client.tsx`  | 347  | `trade as unknown as Record<string,unknown>` in `defaultState()` |
| `journal-client.tsx`  | 129  | `as EnrichedTrade` spread cast                                   |
| `journal-client.tsx`  | 509  | `state.tf_observations as unknown as Json`                       |
| `journal-client.tsx`  | 366  | `t.screenshots as unknown as TradeScreenshot[]`                  |
| `journal-library.tsx` | 125  | `t.tf_observations as Record<string, unknown>`                   |

### P2 — Hook Dependency Warnings

| Location             | Lines   | Issue                                                                |
| -------------------- | ------- | -------------------------------------------------------------------- |
| `journal-client.tsx` | 591–595 | `useEffect([state])` calls `handleSave` — not in deps, stale closure |
| `journal-client.tsx` | 514–521 | `useCallback(handleTradeUpdate, [])` — empty dep array, writes state |

### P3 — Code Duplication

| Symbol                         | Duplicated In                                                               |
| ------------------------------ | --------------------------------------------------------------------------- |
| `fmtCurrency()`                | `journal-client.tsx:61`, `journal-library.tsx:81`                           |
| `fmtR()`                       | `journal-client.tsx:65`, `journal-library.tsx:85`                           |
| `fmtDate()`                    | `journal-client.tsx:69`, `journal-library.tsx:89`, `journal-library.tsx:97` |
| `getOutcome()`                 | `journal-client.tsx:78`, `journal-library.tsx:73`                           |
| `ACCENT/PROFIT/LOSS` constants | Both files                                                                  |

### P4 — Misplaced Types

| Item                | Current Location          | Should Be                     |
| ------------------- | ------------------------- | ----------------------------- |
| `JournalTrade`      | `journal-library.tsx:39`  | `src/domain/journal-types.ts` |
| `TradeJournalState` | `journal-client.tsx:329`  | `src/domain/journal-types.ts` |
| `JournalTab`        | `journal-client.tsx:318`  | `src/domain/journal-types.ts` |
| `JournaledFields`   | `journal-library.tsx:106` | `src/domain/journal-types.ts` |

### P5 — Demo Data in Production

| Item                                | Location                  | Action                      |
| ----------------------------------- | ------------------------- | --------------------------- |
| `DUMMY_JOURNAL_TRADES` (140+ lines) | `journal-library.tsx:142` | Move to `src/lib/fixtures/` |
| Picsum image URLs in screenshots    | same                      | Remove                      |

### P6 — Direct DOM Style Mutations

| Location              | Lines    | Pattern                                                       |
| --------------------- | -------- | ------------------------------------------------------------- |
| `journal-client.tsx`  | 261–267  | `onMouseEnter/Leave` → `style.background`                     |
| `journal-client.tsx`  | 675–695  | `onMouseEnter/Leave` → `style.borderColor`/`style.background` |
| `journal-client.tsx`  | 762–767  | `onFocus/Blur` → `style.borderColor`                          |
| `journal-library.tsx` | multiple | Same pattern throughout                                       |

### P7 — No Test Infrastructure

- Zero `*.spec.ts` / `*.test.ts` files exist under `src/`
- No Jest, Vitest, or Playwright config
- Full test runner bootstrap required in Phase 6

---

## Phase 1: Type Safety — Execution Guide

### New: `src/domain/journal-types.ts`

```typescript
export interface JournalTradeViewModel {
  /* see plan */
}
export interface JournalEntryDraft {
  /* mutable editor state */
}
export interface JournalFilters {
  search;
  outcome;
  direction;
  dateFrom;
  dateTo;
}
export type QualityRating = "Good" | "Neutral" | "Poor";
export type JournalTab =
  | "notes"
  | "bias"
  | "setup"
  | "execution"
  | "psychology";
```

### New: `src/domain/journal-mapper.ts`

Exports:

- `mapTradeRowToViewModel(t: Trade): JournalTradeViewModel` — single mapping boundary
- `viewModelToDraft(vm: JournalTradeViewModel): JournalEntryDraft` — initialize editor
- `mapDraftToTradeUpdate(draft: JournalEntryDraft): Record<string, unknown>` — Supabase payload

The cast `as unknown as Record<string,unknown>` is justified **only here** (interop boundary with Supabase types that don't include journal v2 columns). Annotate with `// JUSTIFIED: Supabase type doesn't include journal v2 columns`.

### New: `src/components/journal/utils/format.ts`

Shared `fmtCurrency`, `fmtR`, `fmtDate`, `fmtDateShort` — remove from both journal files.

### Acceptance (Phase 1)

- [ ] `journal-types.ts`, `journal-mapper.ts`, `format.ts` created
- [ ] `defaultState()` replaced by `viewModelToDraft(mapTradeRowToViewModel(t))`
- [ ] `toJournalTrade()` replaced by `mapTradeRowToViewModel()`
- [ ] `DUMMY_JOURNAL_TRADES` moved to `src/lib/fixtures/journal-fixtures.ts`
- [ ] `npx tsc --noEmit` passes with 0 Journal errors

---

## Phase 2: Autosave Reliability

### New: `src/hooks/use-journal-autosave.ts`

```typescript
function useJournalAutosave({
  draft,
  initialDraft,
  tradeId,
  onSave,
  debounceMs = 2500,
}): {
  saving: boolean;
  savedAt: Date | null;
  isDirty: boolean;
  save: () => Promise<void>;
};
```

- Trailing debounce via `useRef<ReturnType<typeof setTimeout>>`
- Generation counter (`genRef.current++`) for stale-save protection
- `isDirty = !deepEqual(draft, initialDraft)` (use `fast-deep-equal`)

### Acceptance (Phase 2)

- [ ] Hook created and imported in `TradeJournal`
- [ ] Zero `react-hooks/exhaustive-deps` warnings in `journal-client.tsx`
- [ ] No duplicate saves on rapid edits
- [ ] Correct draft reset when `trade.id` changes

---

## Phase 3: Component Decomposition — File Targets

| Extract to                                        | From (journal-client.tsx) | Lines   |
| ------------------------------------------------- | ------------------------- | ------- |
| `src/components/journal/trade-journal-editor.tsx` | `TradeJournal` function   | 472–958 |
| `src/components/journal/ui/trade-row.tsx`         | `TradeRow`                | 238–315 |
| `src/components/journal/ui/outcome-badge.tsx`     | `OutcomeBadge`            | 152–172 |
| `src/components/journal/ui/direction-badge.tsx`   | `DirectionBadge`          | 175–193 |
| `src/hooks/use-screenshot-upload.ts`              | `useScreenshotUpload`     | 372–423 |
| `src/components/journal/fullscreen-image.tsx`     | `FullscreenImage`         | 426–469 |

| Extract to                   | From (journal-library.tsx) |
| ---------------------------- | -------------------------- |
| `library/library-grid.tsx`   | Card grid view             |
| `library/entry-view.tsx`     | Detail entry view          |
| `library/compact-chart.tsx`  | `CompactChart` component   |
| `library/library-header.tsx` | Search/filter header       |

### Acceptance (Phase 3)

- [ ] `journal-client.tsx` < 200 lines
- [ ] `journal-library.tsx` < 300 lines
- [ ] Each extracted file < 350 lines
- [ ] No circular imports

---

## Phase 4: Styling Discipline

Replace all `onMouseEnter/Leave`/`onFocus/Blur` direct style mutations:

```tsx
// BEFORE
onMouseEnter={(e) => (e.currentTarget.style.background = ACCENT)}

// AFTER — Tailwind + CSS variable
className="hover:bg-[var(--accent-primary)] transition-colors"
// OR for complex states: CSS data attr  data-[active=true]:bg-[var(--surface-active)]
```

---

## Phase 5: Performance

| Target                             | Fix                                                              |
| ---------------------------------- | ---------------------------------------------------------------- |
| `filteredTrades` in JournalLibrary | `useMemo([trades, filterText, filterOutcome, dateFrom, dateTo])` |
| `CompactChart` remounts            | `React.memo` + stable chart config deps                          |
| Leaf component callbacks           | `useCallback` for all props passed to memoized children          |

---

## Phase 6: Tests

### Bootstrap

```bash
npm install --save-dev jest @types/jest jest-environment-jsdom ts-jest
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Test files

| File                                                    | Covers                                            |
| ------------------------------------------------------- | ------------------------------------------------- |
| `src/domain/__tests__/journal-mapper.test.ts`           | `mapTradeRowToViewModel`, `mapDraftToTradeUpdate` |
| `src/components/journal/__tests__/is-journaled.test.ts` | `isJournaled` all 10 fields                       |
| `src/hooks/__tests__/use-journal-autosave.test.ts`      | debounce timing, stale protection                 |

### Run

```bash
npx jest --testPathPattern=src/
npx tsc --noEmit
npx eslint src/app/journal/ src/components/journal/ --max-warnings=0
```

---

## Baseline Behavioral Checklist

Before Phase 1, manually verify:

- [ ] Journal Library loads (`/journal`)
- [ ] Tab switching (Journal Library ↔ Log a Trade) works
- [ ] Symbol search filter works
- [ ] Date range filter works
- [ ] WIN/LOSS outcome filter works
- [ ] Library entry opens detail view on click
- [ ] Edit from detail view opens correct trade in editor
- [ ] All 5 journal tabs (Notes/Bias/Setup/Execution/Psychology) render
- [ ] Save button triggers Supabase update (Network tab)
- [ ] Auto-save triggers after 2.5s
- [ ] Screenshot upload → preview works
- [ ] Dark mode and light mode render without broken styles
- [ ] No hydration warning in console

---

## Rollout

```
PR 1: journal-types.ts + journal-mapper.ts + format.ts + fixture removal
PR 2: useJournalAutosave + hook dep cleanup
PR 3: Component decomposition
PR 4: Hover/focus styling overhaul
PR 5: Test infrastructure + suite
```
