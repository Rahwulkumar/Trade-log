# Static Analysis Audit Report
## Trade-log Repository

**Date:** 2026-02-08  
**Auditor:** Automated Static Analysis (v2 - Fresh Audit)  
**Repository:** Rahwulkumar/Trade-log  
**Branch:** copilot/audit-codebase-static-analysis

---

## Executive Summary

This is a **fresh comprehensive audit** of the Trade-log codebase (a Next.js 16 trading journal application with Supabase backend). The analysis covers architectural flaws, security vulnerabilities, performance bottlenecks, and deviations from industry best practices.

### Current Status

| Check | Status | Details |
|-------|--------|---------|
| ESLint | ❌ 3 errors, 2 warnings | `prefer-const`, `@typescript-eslint/no-explicit-any`, unused imports |
| TypeScript | ❌ 28+ errors | Missing type exports, null safety, type mismatches |
| npm Audit | ❌ 14 vulnerabilities | 4 low, 4 moderate, 4 high, 2 critical |
| Build | ⚠️ Would fail | TypeScript errors block build |

### Issue Summary by Severity

| Severity | Count | Categories |
|----------|-------|------------|
| Critical | 5 | npm Vulnerabilities, Security Bypasses, RLS |
| High | 14 | TypeScript Errors, Type Safety, API Validation |
| Medium | 16 | Architecture, Performance, Best Practices |
| Low | 12 | Code Quality, Accessibility, Naming |

---

## 1. Architecture & Maintainability

### 1.1 Component Size Violations (Single Responsibility Principle)

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `src/app/prop-firm/page.tsx` (1329 lines) | **Medium** | Component exceeds 200 lines significantly. Contains account creation, deletion, terminal management, compliance checking, and UI rendering all in one file. | Extract into smaller components: `PropAccountCard`, `PropAccountForm`, `TerminalStatusWidget`, `ComplianceProgressBar`. Create custom hooks: `usePropAccountManagement`, `useTerminalSync`. |
| `src/app/trades/page.tsx` (1225 lines) | **Medium** | Large page component handling multiple responsibilities: trade listing, filtering, creation, deletion, and bulk operations. | Split into: `TradeListView`, `TradeFilters`, `TradeCreateDialog`. Extract filter logic to `useTradeFilters` hook. |
| `src/app/strategies/page.tsx` (701 lines) | **Medium** | Strategy page handles CRUD operations and complex AI analysis in single component. | Extract AI analysis to separate component/hook. Create `StrategyCard` and `StrategyForm` components. |
| `src/components/ui/sidebar.tsx` (728 lines) | **Medium** | UI component with excessive boilerplate. | Consider using shadcn/ui composition patterns more effectively. |
| `src/lib/terminal-farm/service.ts` (677 lines) | **Medium** | Large service file handling multiple concerns: trade processing, position syncing, terminal management. | Split into: `trade-processor.ts`, `position-sync.ts`, `terminal-manager.ts`. |

### 1.2 Prop Drilling Issues

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `src/app/prop-firm/page.tsx` | **Low** | Terminal status and form data passed through multiple levels. | Already uses Context for auth/propAccount. Consider adding `TerminalStatusContext` for cleaner terminal state management. |
| `src/app/trades/[id]/page.tsx` | **Low** | Trade data passed to multiple child widgets. | Consider using React Context or Zustand for trade detail state. |

### 1.3 Hardcoded Values (Magic Numbers/Strings)

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `src/lib/terminal-farm/metrics.ts:39` | **Low** | TODO comment indicates monitoring service not implemented. | Implement proper monitoring integration. |
| `src/supabase/migrations/20260131100000_security_fixes.sql:129` | **Low** | `v_max_syncs INTEGER := 60` hardcoded in function. | Move to configuration table or environment variable. |
| `src/components/auth-provider.tsx:61` | **Low** | Hardcoded 3000ms timeout for profile fetch. | Use constant: `const PROFILE_FETCH_TIMEOUT_MS = 3000`. |
| `src/app/api/extension/route.ts:84` | **Low** | Mock user UUID `00000000-0000-0000-0000-000000000000` hardcoded. | Define as constant with clear documentation. |

### 1.4 Dead Code / Unused Exports

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `src/app/api/extension/route.ts:93` | **Low** | `let targetUserId` should be `const` (never reassigned per ESLint). | Change to `const`. |
| `src/lib/mt5/sync.ts:200` | **Low** | `let allDeals` should be `const` (never reassigned per ESLint). | Change to `const`. |

---

## 2. Type Safety (TypeScript)

### 2.1 Explicit `any` Usage (Safety Bypasses)

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `src/app/api/extension/route.ts:124,146,164,181` | **High** | Multiple `as any` casts on Supabase queries to bypass type checking. | Create properly typed Supabase client or use type assertions with specific types. |
| `src/app/notebook/page.tsx:154,171,174,207` | **High** | Multiple `any` types for chart data and screenshot handling. | Define proper interfaces: `ChartDataPayload`, use type guards for JSON data. |
| `src/lib/api/pricing.ts:53,82,307,317` | **High** | `as any` casts on trade data and Supabase updates. | Type the trade data properly using existing `Trade` type. |
| `src/lib/terminal-farm/service.ts:308,309` | **Medium** | `any[]` for inserts and updates arrays. | Define `TradeInsert` and `TradeUpdate` types for these arrays. |
| `src/components/trade/trade-chart.tsx:103` | **Medium** | `chart as any` cast for candlestick series. | Use lightweight-charts TypeScript definitions properly. |
| `src/lib/api/gemini.ts:26,57,127` | **Medium** | Multiple `any` types in AI integration. | Define proper types for Gemini API responses. |
| `src/lib/api/pricing.ts:39,78,267,273,282` | **Medium** | Multiple `any` annotations in pricing functions. | Define `ChartDataResponse` and related types. |
| `src/lib/mt5/audit.ts:10,27` | **Medium** | `any` types in audit logging. | Use `Record<string, unknown>` or specific metadata types. |
| `src/lib/mt5/sync.ts:54` | **Medium** | `any` type in sync function. | Define proper MetaAPI response types. |
| `src/components/prop-firm/prop-firm-manager.tsx:79` | **Medium** | `any` type in error handling. | Use `unknown` and type guards. |
| `src/app/api/prop-accounts/recalculate-balance/route.ts:31,50,68` | **Medium** | Multiple `as any` casts. | Use typed Supabase client. |

### 2.2 Null Safety Issues

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `src/app/dashboard/page.tsx:354,363` | **High** | `propAccount.daily_dd_current` and `total_dd_current` possibly null but used directly. | Add null checks: `(propAccount.daily_dd_current ?? 0).toFixed(1)`. |
| `src/app/prop-firm/page.tsx:638,648,661,669,820,833,841,850,863,876,884,893,977,978` | **High** | Multiple null safety violations on `daily_dd_current`, `total_dd_current`, and `status` fields. | Add null coalescing: `account.daily_dd_current ?? 0`. |
| `src/app/trades/[id]/page.tsx:184` | **High** | `trade.pnl` possibly null but used with `.toFixed()`. | Use `(trade.pnl ?? 0).toFixed(2)`. |
| `src/components/calendar/trading-calendar.tsx:113,124,132,133` | **High** | `pnl` field accessed without null check. | Filter trades with non-null pnl or use null coalescing. |
| `src/components/dashboard/recent-trades.tsx:94,97` | **High** | `trade.pnl` possibly null in conditional rendering. | Use `trade.pnl ?? 0` for comparisons. |
| `src/components/journal/trade-timeline.tsx:73,75,80` | **High** | `trade.pnl` possibly null. | Add null checks before arithmetic operations. |
| `src/lib/api/analytics.ts:71-76,95-96,150,154,200,202,254,256` | **High** | Multiple instances of potentially null `pnl` field being accessed. | Filter trades with valid pnl or use default values. |
| `src/lib/api/gemini.ts:135,136,137` | **Medium** | `t.pnl` possibly null in AI context building. | Filter or default pnl values. |
| `src/lib/api/prop-accounts.ts:103,132,133` | **Medium** | Null values passed where numbers expected. | Add null checks before calling functions. |

### 2.3 Missing Type Exports

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `src/lib/supabase/types.ts` | **High** | Missing exports: `Profile`, `PlaybookInsert`, `PlaybookUpdate`, `TradeUpdate`, `PropAccountInsert`, `ChartData`. | Add missing type exports to types.ts. Currently at lines 979-1020, but some referenced types are missing. |
| `src/lib/types/prop-firms.ts:48` | **Medium** | `PropAccountWithChallenge` interface incorrectly extends base type - `current_phase_status` types incompatible. | Fix interface to use `string | null` or align with base type. |

### 2.4 Type Assertion Issues

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `src/app/notebook/page.tsx:186,189,193` | **Medium** | Unsafe type conversions between `Json` and `TradeScreenshot[]`. | Create type guards: `isTradeScreenshotArray()`. |
| `src/app/notebook/page.tsx:306,313` | **Medium** | Type mismatch: `TerminalCandlePayload[]` not assignable to `ChartCandle[]`. | Map terminal payloads to chart candles with proper transformation. |
| `src/app/trades/[id]/page.tsx:242` | **Medium** | `string` not assignable to `"LONG" | "SHORT"`. | Validate direction before assignment or use type guard. |
| `src/components/journal/screenshot-gallery.tsx:51,53,146,149,150,164,165` | **Medium** | Multiple type errors with `TradeScreenshot` - missing properties. | Update `TradeScreenshot` interface or fix function signatures. |
| `src/components/trade/trade-chart.tsx:113` | **Medium** | `time` property doesn't exist on `ChartCandle` type. | Add `time` to `ChartCandle` interface or use correct property. |

---

## 3. Security & Data Integrity

### 3.1 Row Level Security (RLS) Issues

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `src/supabase/migrations/20260103000000_prop_firms.sql:20-21` | **Critical** | `USING (true) WITH CHECK (true)` - Overly permissive RLS policy allows any authenticated user to modify all prop firms. | Implement admin-only policies: `USING (auth.jwt()->>'role' = 'admin')` or use service role for admin operations. |
| `src/supabase/migrations/20260103000000_prop_firms.sql:59-60` | **Critical** | Same permissive policy on `prop_firm_challenges` table. | Restrict to admin role or remove INSERT/UPDATE/DELETE from authenticated policy. |
| `src/supabase/migrations/20260113000000_mt5_security_enhancements.sql:87-88` | **Medium** | Rate limit tracking policy `USING (true)` allows any user to access all rate limit data. | This is documented as service-role only, but policy is too broad. Use service role bypass instead. |
| `src/supabase/migrations/20260113000000_mt5_security_enhancements.sql:67-68` | **Low** | Sync logs update policy `USING (true)` - documented for service role but could leak data. | Add comment clarifying service-role-only usage. |

### 3.2 API Input Validation

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `src/app/api/extension/route.ts:109-122` | **Critical** | `create_trade` action validates only presence, not types or bounds. Entry price, position size not validated for reasonable values. | Add Zod schema: `z.object({ symbol: z.string().min(1).max(20), entry_price: z.number().positive(), ... })`. |
| `src/app/api/extension/route.ts:174-187` | **Critical** | `update_trade` accepts arbitrary updates without validation. Could allow setting invalid states. | Define allowed update fields and validate with Zod schema. |
| `src/app/api/trades/chart/route.ts` | **Medium** | Chart data endpoint should validate trade ID format and ownership. | Add UUID validation and ownership check. |
| `src/app/api/ai/route.ts` | **Medium** | AI endpoint should validate request body structure. | Add Zod validation for AI request payload. |
| `src/app/api/mt5-accounts/route.ts` | **Medium** | MT5 account creation should validate server/login format. | Add Zod schema for MT5 credentials. |

### 3.3 Authentication & Authorization

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `src/app/api/extension/route.ts:35-86` | **High** | DEV mode bypass allows unauthenticated access and user impersonation. Mock user creation with hardcoded UUID is dangerous. | Remove DEV bypass entirely or restrict to `NODE_ENV === 'development'` AND localhost only with explicit opt-in. |
| `src/app/api/extension/route.ts:94-101` | **High** | In DEV mode, `get_strategies` returns ALL strategies without user filtering. | Always filter by authenticated user, even in dev mode. |
| `src/app/api/webhook/terminal/trades/route.ts:17-19` | **Medium** | If `TERMINAL_WEBHOOK_SECRET` is not set, webhook accepts any request. | Require secret in production: `if (!expectedKey) throw new Error('Webhook secret not configured')`. |
| `src/lib/supabase/admin.ts:13-18` | **Medium** | Fallback to anon key when service role key missing logs warning but continues. | In production, this should fail loudly rather than silently downgrade. |

### 3.4 npm Dependency Vulnerabilities

| Package | Severity | Issue | Recommendation |
|---------|----------|-------|----------------|
| `crypto-js` <4.2.0 | **Critical** | Critical vulnerability in crypto-js used by metaapi.cloud-sdk. | Update or remove metaapi.cloud-sdk dependency. |
| `axios` 1.0.0-1.11.0 | **Critical** | CSRF, SSRF, and DoS vulnerabilities in axios used by metaapi.cloud-sdk. | Run `npm audit fix --force` or update metaapi.cloud-sdk. |
| `metaapi.cloud-sdk` 29.3.2 | **High** | Root cause of 10+ vulnerabilities. Depends on vulnerable axios, crypto-js, socket.io-client. | Consider removal since terminal-farm migration exists. If needed, update to latest version or find alternative. |
| `socket.io-client` (transitive) | **Moderate** | Vulnerable version in metaapi.cloud-sdk dependency tree. | Update parent package. |

**Total: 14 vulnerabilities (2 critical, 4 high, 4 moderate, 4 low)**

### 3.5 Secret Management

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| All files using `process.env.NEXT_PUBLIC_*` | **Low** | Public environment variables are appropriately prefixed. Good practice observed. | Continue current pattern. |
| `src/lib/api/gemini.ts:5` | **Low** | Gemini API key read with fallback to empty string - could cause silent failures. | Log warning or throw if key missing in production. |
| `src/lib/api/pricing.ts:216` | **Low** | Twelve Data API key with `.trim()` - good sanitization practice. | Continue current pattern. |

---

## 4. Performance & Optimization

### 4.1 Unnecessary Re-renders

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `src/app/prop-firm/page.tsx` | **Medium** | Multiple `useState` hooks without memoization. Complex state objects recreated on each render. | Use `useMemo` for derived state, `useCallback` for event handlers passed to children. |
| `src/app/dashboard/page.tsx:49-117` | **Medium** | Large `useEffect` with many dependencies could trigger unnecessary re-fetches. | Split into separate effects for analytics vs prop account loading. |
| `src/components/calendar/trading-calendar.tsx` | **Medium** | Trade filtering logic in render path. | Memoize filtered trades with `useMemo`. |
| `src/app/trades/page.tsx` | **Medium** | Filter state changes trigger full data refetch. | Implement client-side filtering for already-loaded data, fetch only on pagination. |

### 4.2 Database Query Optimization

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `src/lib/api/trades.ts:19` | **Medium** | `select('*')` fetches all columns when often only subset needed. | Create specific queries: `select('id, symbol, pnl, entry_date')` for list views. |
| `src/lib/api/analytics.ts:29` | **Medium** | `select('*')` on trades for analytics when only `pnl`, `r_multiple`, dates needed. | Use `select('pnl, r_multiple, entry_date, direction')`. |
| `src/lib/api/journal.ts:9,21,37,53,120,134` | **Medium** | All journal queries use `select('*')`. | Specify needed columns. |
| `src/lib/api/prop-accounts.ts:9,21,34` | **Medium** | All prop account queries use `select('*')`. | Specify needed columns for list vs detail views. |
| `src/lib/terminal-farm/service.ts:39,53,134,162,229` | **Medium** | Multiple `select('*')` in terminal farm service. | Select only required fields. |
| `src/components/auth-provider.tsx:67,156` | **Low** | Profile fetch uses `select('*')`. | Select only display-relevant fields: `select('id, first_name, last_name, avatar_url')`. |

### 4.3 Bundle Size Concerns

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `package.json` - `metaapi.cloud-sdk` | **Medium** | MetaAPI SDK is a large dependency. Migration to terminal-farm noted in migrations. | Verify MetaAPI is still needed. If migrated to terminal-farm, remove unused dependency. |
| `package.json` - `@blocknote/*` | **Low** | BlockNote editor packages are substantial. | Lazy-load editor components with `dynamic()` import. |
| `package.json` - `framer-motion` | **Low** | Full framer-motion imported; often only subset needed. | Consider `motion` submodule for smaller bundle. |

### 4.4 Missing Database Indexes

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| Trade queries filtering by `entry_date`, `status`, `prop_account_id` | **Medium** | Composite indexes may be missing for common query patterns. | Add: `CREATE INDEX idx_trades_user_entry_date ON trades(user_id, entry_date DESC)`. |
| Analytics queries grouping by date ranges | **Low** | Date-based queries could benefit from date extraction indexes. | Consider: `CREATE INDEX idx_trades_entry_date_status ON trades(entry_date, status)`. |

---

## 5. Best Practices

### 5.1 ESLint Violations (from eslint-report.txt)

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `src/app/analytics/page.tsx:204` | **Low** | Using `<a>` instead of Next.js `<Link>` for internal navigation. | Replace with `<Link href="/trades/" />`. |
| `src/app/dashboard/page.tsx:408` | **Low** | Same issue - using HTML anchor for internal link. | Use `<Link>` component. |
| `src/components/calendar/trading-calendar.tsx:355` | **Low** | Same issue - raw anchor tag. | Use `<Link>` component. |
| `src/app/weekly/page.tsx:210` | **Low** | Unescaped apostrophe in JSX. | Use `&apos;` or `&#39;`. |

### 5.2 Naming Convention Inconsistencies

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| Database columns | **Low** | `snake_case` columns (correct for PostgreSQL). TypeScript uses `camelCase`. Inconsistency in code when mapping. | Use consistent transformation layer or adopt Supabase's built-in column naming. |
| `src/lib/terminal-farm/validation.ts` | **Low** | Schema names use `PascalCase` (correct), but payload properties mix `camelCase` and abbreviations. | Standardize on `camelCase` for all payload properties. |
| File naming | **Low** | Most files use `kebab-case` (good), but some use `camelCase`. | Standardize on `kebab-case` for all files. |

### 5.3 Error Handling Patterns

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `src/app/prop-firm/page.tsx:123,132` | **Medium** | `.catch(console.error)` provides no user feedback. | Show toast/alert on error, log to monitoring service. |
| `src/app/prop-firm/page.tsx:771,1065` | **Medium** | Same pattern - errors logged but not surfaced to user. | Implement consistent error handling with user notification. |
| Multiple catch blocks across codebase | **Medium** | Inconsistent error handling - some throw, some log, some ignore. | Create centralized error handler: `handleApiError(error, { showToast: true })`. |
| `src/components/auth-provider.tsx:85-91` | **Low** | Good pattern: catches timeout errors gracefully with fallback. | Extend this pattern to other async operations. |

### 5.4 Accessibility Issues

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `src/components/ui/sidebar.tsx:289` | **Low** | Only one `aria-label` found in entire UI components directory. | Add `aria-label` to all interactive elements: buttons, links, form inputs. |
| All dialog components | **Medium** | Dialogs should have proper focus management and aria-labelledby. | Radix UI provides this - ensure `DialogTitle` is always rendered. |
| Chart components | **Medium** | Charts lack alternative text descriptions. | Add `aria-label` describing chart purpose, consider data table alternative. |
| Form inputs across pages | **Medium** | Labels exist but may not be properly associated. | Verify all `<Label>` components have matching `htmlFor` attributes. |
| Color-only status indicators | **Low** | Profit/loss shown only with color (green/red). | Add text indicators like "Profit: +$X" or icons for colorblind users. |

### 5.5 Console Statements in Production

| Location | Severity | Issue | Recommendation |
|----------|----------|-------|----------------|
| `src/components/auth-provider.tsx:45,55,58,81,87,97-103,117-121` | **Low** | Extensive `console.log` statements for debugging. | Remove or wrap in `if (process.env.NODE_ENV === 'development')`. |
| `src/app/api/extension/route.ts:47,49,62,71,79,83` | **Low** | Multiple console.log statements in production API route. | Use proper logging library with log levels. |
| Various catch blocks | **Low** | `console.error` calls should go to monitoring service in production. | Implement centralized logging/monitoring. |

---

## 6. TypeScript Compilation Errors (Current State)

The TypeScript compilation currently fails with **28+ errors**. Key categories:

### 6.1 Missing Type Exports (Blocking)

| Issue | Files Affected | Fix Priority |
|-------|---------------|--------------|
| `TradeUpdate` not exported | src/lib/api/trades.ts:2 | **High** - Add export |
| `PlaybookUpdate` not exported | src/lib/api/playbooks.ts:2 | **High** - Add export |
| `ChartData` not exported | src/lib/api/pricing.ts:14 | **High** - Add export |

### 6.2 Zod v4 Breaking Changes (Blocking)

| Issue | Files Affected | Fix |
|-------|---------------|-----|
| `.error.errors` doesn't exist | webhook/terminal/candles/route.ts:35 | Change to `.error.issues` |
| `.error.errors` doesn't exist | webhook/terminal/heartbeat/route.ts:38 | Change to `.error.issues` |
| `.error.errors` doesn't exist | webhook/terminal/positions/route.ts:35 | Change to `.error.issues` |
| `.error.errors` doesn't exist | webhook/terminal/trades/route.ts:35 | Change to `.error.issues` |

### 6.3 Type Incompatibilities (Blocking)

| Issue | Location | Fix |
|-------|----------|-----|
| `TerminalHeartbeatPayload` margin/freeMargin types | webhook/heartbeat/route.ts:45 | Make margin/freeMargin optional in type |
| `ChartCandle` missing 'time' property | components/trade/trade-chart.tsx:113 | Add `time` to ChartCandle interface |
| `TradeScreenshot` missing 'timestamp' property | components/journal/screenshot-gallery.tsx:151-170 | Add `timestamp` to TradeScreenshot interface |
| `PropAccountWithChallenge` extends incompatible | lib/types/prop-firms.ts:48 | Change `current_phase_status` type to match base |
| `t.pnl` possibly null | lib/api/gemini.ts:135-137 | Add null coalescing: `t.pnl ?? 0` |
| `retry` function return type | lib/terminal-farm/service.ts:450-473 | Fix Promise return types |

### 6.4 Null Safety Violations

| Issue | Locations | Fix |
|-------|-----------|-----|
| `t.pnl` possibly null | lib/api/gemini.ts:135-137 | Filter trades or use `t.pnl ?? 0` |
| `cached` property doesn't exist | lib/api/pricing.ts:48,59,71,91,97,103 | Add `cached?: boolean` to ChartDataResult |

---

## 7. Recommended Priority Actions

### Immediate (Critical/High)

1. **Fix npm Vulnerabilities** - Address 14 security vulnerabilities including 2 critical (crypto-js, axios in metaapi.cloud-sdk)
2. **Fix TypeScript Errors** - 28+ compilation errors blocking builds (missing type exports, null safety)
3. **Fix RLS policies** - Remove overly permissive `USING (true)` on prop_firms tables
4. **Remove DEV bypass** - Eliminate authentication bypass in extension route
5. **Add API input validation** - Implement Zod schemas for extension API
6. **Export missing types** - Add `TradeUpdate`, `PlaybookUpdate`, `ChartData` to types.ts

### Short-term (Medium)

1. **Fix Zod v4 compatibility** - `.error.errors` → `.error.issues` for Zod error handling
2. **Refactor large components** - Split prop-firm (1329 LOC), trades (1225 LOC) pages
3. **Optimize database queries** - Replace 31 instances of `select('*')` with specific columns
4. **Add accessibility** - Only 1 `aria-label` found in entire codebase
5. **Standardize error handling** - Create centralized error handling utility

### Long-term (Low)

1. **Remove any usage** - 18 instances of explicit `any` type usage
2. **Remove unused imports** - `getTerminalStatus`, `TerminalSyncPayloadSchema`
3. **Remove console statements** - Replace with proper logging
4. **Bundle optimization** - Consider removing or replacing metaapi.cloud-sdk (large + vulnerable)
5. **Add monitoring** - Implement error tracking service (Sentry, etc.)

---

## Appendix A: Current Error Summary

### ESLint Errors (3)
```
src/lib/terminal-farm/service.ts:283 - 'existingTradesMap' should be const
src/lib/terminal-farm/service.ts:308 - Unexpected any type
src/lib/terminal-farm/service.ts:309 - Unexpected any type
```

### ESLint Warnings (2)
```
src/app/prop-firm/page.tsx:37 - 'getTerminalStatus' defined but never used
src/lib/terminal-farm/service.ts:21 - 'TerminalSyncPayloadSchema' defined but never used
```

### TypeScript Errors (28+)
```
- Missing exports: TradeUpdate, PlaybookUpdate, ChartData
- Zod v4 breaking change: .error.errors → .error.issues
- Type mismatches: TerminalHeartbeatPayload optional fields
- Null safety: t.pnl possibly null in 3 locations
- Interface extension: PropAccountWithChallenge incompatible types
- Type mismatch: ChartCandle missing 'time' property
- TradeScreenshot missing 'timestamp' property (5 locations)
```

### npm Vulnerabilities (14)
```
Critical (2): crypto-js <4.2.0, axios CSRF
High (4): axios SSRF, DoS vulnerabilities
Moderate (4): Various dependencies
Low (4): Various dependencies

Root cause: metaapi.cloud-sdk@29.3.2 depends on vulnerable packages
```

## Appendix B: Files Analyzed

```
src/app/ - 18 route files
src/components/ - 25+ component files  
src/lib/ - 15+ utility/API files
src/hooks/ - 1 hook file
supabase/migrations/ - 19 migration files
middleware.ts - 1 file
Total: ~19,425 lines of TypeScript/TSX code
```

## Appendix C: Tools Used

- ESLint 9 with Next.js and TypeScript plugins
- TypeScript 5 compiler (strict mode)
- npm audit for vulnerability scanning
- Manual code review
- Pattern matching (grep) for security anti-patterns
- Line count analysis (wc -l)

---

*End of Report - Generated 2026-02-08*
