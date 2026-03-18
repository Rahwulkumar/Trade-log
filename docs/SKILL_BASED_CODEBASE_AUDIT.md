# Codebase Audit Report
## Stack: Next.js · React · Neon · Clerk
Generated: 2026-03-18

---

## Executive Summary
- Total files audited: 247
- Critical issues: 3
- High issues: 7
- Medium issues: 6
- Low issues: 5

Verification performed:
- `npx tsc --noEmit`: passes
- `npm run lint`: passes with warnings

Highest-risk conclusion:
- The previous audit's C1 (UUID profiles) and C2 (dead Supabase auth) are **fixed** — `appUsers` table now exists with text PKs, settings uses Clerk-native client, auth callback redirects to login.
- The previous audit's C3 (no Zod) is **fixed** — every mutation route now has a validation file in `src/lib/validation/`.
- The previous audit's C4 (non-atomic MT5 relink) is **partially fixed** — now uses `db.batch()`, which is atomic on Neon HTTP but not a true ACID transaction. Needs `db.transaction()`.
- **New C1**: `gemini.ts` imports `Trade, Json` from `@/lib/supabase/types` — dead import from a deprecated module that still ships in the bundle.
- **New C2**: Trade chart endpoint validates input but still forwards client-supplied `symbol`/`entryTime`/`exitTime` to the pricing service instead of using the stored trade values.
- **New C3**: `supabase/types.ts` is still the canonical type source for 16 components and 4 domain files — a dead Supabase module is load-bearing for the entire type system.

---

## CRITICAL Issues

### [C1] `supabase/types.ts` is still the canonical type source for the whole domain layer
**File**: `src/lib/supabase/types.ts`, `src/domain/trade-types.ts:1`, `src/domain/journal-mapper.ts:6-7`, `src/lib/api/gemini.ts:2` + 12 more component imports
**Problem**: Sixteen source files import `Trade`, `TradeScreenshot`, `Json`, `Playbook`, or `TfObservations` from `@/lib/supabase/types`. This means the Supabase package ships in the production bundle even though no Supabase auth or DB is in use. Any attempt to remove Supabase from `package.json` will break the entire domain layer.
**Evidence**:
```ts
// src/domain/trade-types.ts
import { Trade } from "@/lib/supabase/types";

// src/lib/api/gemini.ts
import { Trade, Json } from '@/lib/supabase/types';

// src/components/journal/trade-row.tsx
import type { Trade } from "@/lib/supabase/types";
// ... 13 more files
```
**Fix**: Promote the types to a first-party domain module and delete the Supabase type dependency.
```ts
// src/domain/types.ts  (new canonical file)
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];
export type TradeScreenshot = { id: string; url: string; caption?: string; createdAt: string };
// Re-export Trade from schema inference:
export type { Trade } from '@/lib/db/schema';
```
Then do a global find-replace: `from "@/lib/supabase/types"` → `from "@/domain/types"`.

---

### [C2] Trade chart endpoint uses client-supplied symbol and timestamps after auth check
**File**: `src/app/api/trades/chart/route.ts:22-28`
**Problem**: The route validates the payload with Zod and confirms the trade belongs to the user, but then calls `getTradeChartData(tradeId, symbol, entryTime, exitTime)` with the **client-supplied** values rather than the stored trade fields. An authenticated user can request chart data for any symbol/timerange by supplying arbitrary values.
**Evidence**:
```ts
const { tradeId, symbol, entryTime, exitTime } = result.data;
const trade = await getTrade(tradeId, userId);   // ownership confirmed ✓
if (!trade) { ... }
// But then ignores trade.symbol / trade.entryDate / trade.exitDate:
const chart = await getTradeChartData(tradeId, symbol, entryTime, exitTime);
```
**Fix**: Use stored values after the ownership check:
```ts
const trade = await getTrade(tradeId, userId);
if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 });

// Use stored trade values — client may only pass optional display overrides
const resolvedSymbol = trade.symbol;
const resolvedEntry = trade.entryDate?.toISOString() ?? result.data.entryTime;
const resolvedExit  = trade.exitDate?.toISOString()  ?? result.data.exitTime;
const chart = await getTradeChartData(tradeId, resolvedSymbol, resolvedEntry, resolvedExit);
```

---

### [C3] MT5 relink uses `db.batch()` — parallel execution, not an atomic transaction
**File**: `src/app/api/mt5-accounts/route.ts:155-185`
**Problem**: The previous audit flagged sequential writes; they were consolidated into `db.batch()`. However, `db.batch()` on Neon HTTP sends statements in one round-trip but **does not wrap them in a transaction**. If the second or third statement fails (e.g. trades reassignment hits a FK violation), the MT5 account is already updated and the state is partially migrated.
**Evidence**:
```ts
await db.batch([
  db.update(mt5Accounts).set(updatePayload).where(...),
  db.update(trades).set({ propAccountId }).where(...),
  db.update(propAccounts).set(propUpdates).where(...),
]);
```
**Fix**: Use `db.transaction()` which Neon HTTP supports via `BEGIN`/`COMMIT`:
```ts
await db.transaction(async (tx) => {
  await tx.update(mt5Accounts).set(updatePayload).where(eq(mt5Accounts.id, existingLoginAccount.id));
  await tx.update(trades).set({ propAccountId }).where(eq(trades.mt5AccountId, existingLoginAccount.id));
  if (balanceToSet !== null) {
    await tx.update(propAccounts).set(propUpdates).where(and(eq(propAccounts.id, propAccountId), eq(propAccounts.userId, userId)));
  }
});
```

---

## HIGH Issues

### [H1] `analytics.ts` is a server helper that calls the client HTTP fetch layer
**File**: `src/lib/api/analytics.ts:1-6`, `src/lib/api/client/trades.ts`
**Problem**: `analytics.ts` imports `getTrades` from the client fetch helper. Every analytics call makes an internal HTTP request to `/api/trades` rather than querying Drizzle directly. This adds a full network round-trip on the server, bypasses edge caching, and makes analytics impossible to call from middleware or background tasks.
**Evidence**:
```ts
import { getTrades } from '@/lib/api/client/trades';
// ...
async function fetchClosedTrades(...): Promise<AnalyticsTrade[]> {
  const rows = await getTrades(buildClosedTradeFilters(options));
```
**Fix**: Replace with a direct Drizzle query:
```ts
import { db } from '@/lib/db';
import { trades } from '@/lib/db/schema';
import { and, eq, isNotNull } from 'drizzle-orm';

async function fetchClosedTrades(userId: string, propAccountId?: string) {
  return db.select().from(trades).where(
    and(eq(trades.userId, userId), eq(trades.status, 'CLOSED'), isNotNull(trades.exitDate))
  );
}
```

---

### [H2] Analytics page imports 14 dummy datasets at module scope — ships in production bundle
**File**: `src/app/analytics/page.tsx:56-71`
**Problem**: The page statically imports `DUMMY_RISK`, `DUMMY_EQUITY`, `DUMMY_DRAWDOWN`, and 11 other large demo arrays unconditionally. Even real-data users parse and execute the full dummy dataset module on every analytics page load.
**Evidence**:
```ts
import {
  DUMMY_RISK, DUMMY_EQUITY, DUMMY_DRAWDOWN, DUMMY_R_DIST,
  DUMMY_PNL_DIST, DUMMY_HOLD, DUMMY_SESSIONS, DUMMY_DOW,
  DUMMY_HOURLY, DUMMY_STREAKS, DUMMY_CONSISTENCY,
  DUMMY_MAE_MFE, DUMMY_INSTRUMENTS, DUMMY_STRATEGIES,
} from "@/lib/data/dummy";
```
**Fix**: Lazy-load the demo fallback:
```ts
// Only import when actually needed
const DummyFallback = dynamic(() => import('@/components/analytics/AnalyticsDemoFallback'), { ssr: false });
// In render:
if (tradeCount === 0) return <DummyFallback />;
```

---

### [H3] `storage.ts` still reads `NEXT_PUBLIC_SUPABASE_URL` and writes to Supabase Storage
**File**: `src/lib/api/storage.ts:1-10`
**Problem**: Screenshot uploads depend on the Supabase client, Supabase bucket, and Supabase CDN URL. The Supabase packages are effectively kept alive by this one file. Any user uploading a trade screenshot in journal hits this path.
**Evidence**:
```ts
import { createClient } from '@/lib/supabase/client'
const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabase = createClient()
await supabase.storage.from(BUCKET_NAME).upload(fileName, file, ...)
```
**Fix**: Route uploads through a first-party API endpoint that writes to any provider-neutral storage (Cloudflare R2, Vercel Blob, S3):
```ts
// src/app/api/uploads/screenshot/route.ts
export async function POST(request: NextRequest) {
  const { userId } = await requireAuth();
  const formData = await request.formData();
  const file = formData.get('file') as File;
  // validate type + size, then write to R2/Blob/S3
}
```

---

### [H4] `gemini.ts` Gemini env var mismatch — AI is silently non-functional when key missing
**File**: `src/lib/api/gemini.ts:4`, `src/lib/env.ts:19`
**Problem**: The Gemini client initialises from `process.env.GEMINI_API_KEY`, but `env.ts` validates `NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_KEY`. The wrong variable name means the startup validator never catches a missing Gemini key, and the SDK initialises with an empty string, making every AI call fail silently at runtime.
**Evidence**:
```ts
// gemini.ts
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// env.ts optional list
'NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_KEY',  // ← wrong name, never matches
```
**Fix**: Pick one server-only name and use it everywhere:
```ts
// env.ts — add to optional:
'GEMINI_API_KEY',

// gemini.ts — already correct, just remove the NEXT_PUBLIC_ alias from env.ts
```

---

### [H5] Trading calendar shows stale "Supabase Not Configured" copy and links to `/trades` (404)
**File**: `src/components/calendar/trading-calendar.tsx:208-211, 414`
**Problem**: The calendar's empty state tells users to add Supabase credentials — messaging that is wrong and confusing in a Clerk/Neon app. The CTA links to `/trades` which doesn't exist in this router.
**Evidence**:
```tsx
<h2>Supabase Not Configured</h2>
<p>Please add your Supabase credentials.</p>
// ...
<Link href="/trades">Go to Trades -></Link>
```
**Fix**:
```tsx
<h2>No trades found</h2>
<p>Add your first trade to see it on the calendar.</p>
<Link href="/journal">Go to Journal</Link>
```

---

### [H6] N+1 query pattern in `getOrchestratorConfig()` — queried on every orchestrator poll
**File**: `src/lib/terminal-farm/service.ts:535-556`
**Problem**: The function loops over terminal rows and fires a separate `SELECT` from `mt5Accounts` per terminal. The orchestrator polls this endpoint repeatedly, so any fleet larger than a few terminals generates proportional DB load.
**Evidence**:
```ts
for (const terminal of terminals) {
  const [account] = await db
    .select()
    .from(mt5Accounts)
    .where(eq(mt5Accounts.id, terminal.accountId))
    .limit(1);
```
**Fix**: Join in one query:
```ts
const rows = await db
  .select({ terminal: terminalInstances, account: mt5Accounts })
  .from(terminalInstances)
  .innerJoin(mt5Accounts, eq(terminalInstances.accountId, mt5Accounts.id))
  .where(/* active filter */);
```

---

### [H7] 120 `console.log/error/warn` calls in production source paths
**File**: `src/lib/api/pricing.ts:66,93,214,250`, `src/lib/terminal-farm/service.ts` (many), across 120 total call sites
**Problem**: High-frequency paths like the MT5 heartbeat processor, pricing cache, and trade sync writer all log trade IDs, symbols, timestamps, and internal state to stdout on every call. In production this generates enormous noise and leaks internal data shapes to log aggregators.
**Evidence**:
```ts
console.log(`[Pricing] Returning cached data for trade ${tradeId}`);
console.log(`[MT5 Sync] Processing heartbeat for terminal ${terminalId}`);
```
**Fix**: Replace with a levelled structured logger:
```ts
import { logger } from '@/lib/logger'; // thin wrapper over pino/winston
logger.debug({ tradeId }, 'Returning cached pricing data');
logger.info({ terminalId }, 'Heartbeat processed');
```

---

## MEDIUM Issues

### [M1] No security headers or CSP — `dangerouslySetInnerHTML` used in root layout
**File**: `next.config.ts:1-22`, `src/app/layout.tsx:70`, `src/components/ui/chart.tsx:83`
**Problem**: `next.config.ts` defines no `headers()` export. The root layout injects an inline theme-bootstrap script via `dangerouslySetInnerHTML` with no nonce, so adding a CSP later will require retrofitting nonces. The chart component also uses `dangerouslySetInnerHTML` for SVG gradients.
**Fix**:
```ts
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};
```

---

### [M2] Notes page (`/notes`) serialises the entire collection to localStorage on every keystroke
**File**: `src/app/notes/page.tsx:94-96`
**Problem**: `saveNotes()` calls `JSON.stringify(notes)` on the full collection inside a debounced timer triggered by every edit, creation, and deletion. This is a duplicate persistence system that diverges from the DB-backed `/api/notes` surface used by notebook.
**Evidence**:
```ts
function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}
```
**Fix**: Consolidate onto the DB-backed `/api/notes` endpoints used by notebook, or at minimum scope localStorage writes to the single changed note.

---

### [M3] Prop-firm page triggers `recalculateAllBalances()` + a second fetch on every normal load
**File**: `src/app/prop-firm/page.tsx:153-169`
**Problem**: On every page mount, if any non-MT5 account exists, the page calls `recalculateAllBalances()` and then re-fetches `getPropAccounts()`. This is unconditional — it fires on navigation, tab switch, and refresh equally.
**Evidence**:
```ts
if (hasNonMt5) {
  await recalculateAllBalances();
  updatedAccountsData = await getPropAccounts();
}
```
**Fix**: Trigger recalculation only after explicit user mutations (deposit, withdrawal, trade close), not on every page load.

---

### [M4] Supabase middleware file still present beside Clerk middleware
**File**: `src/lib/supabase/middleware.ts`
**Problem**: A full Supabase session middleware (with `createServerClient`, `auth.getUser()`, cookie refresh) lives in the repo next to the active Clerk middleware. It is not imported anywhere active, but it increases migration confusion and will be accidentally re-imported as the codebase grows.
**Fix**: Delete `src/lib/supabase/middleware.ts` and `src/lib/supabase/admin.ts` once storage migration is done.

---

### [M5] `env.example` still documents Supabase variables; Supabase deps in `package.json`
**File**: `env.example`, `package.json:38-39`
**Problem**: `env.example` lists `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as the documented env vars. New developers following the docs will misconfigure the app. `package.json` still ships `@supabase/ssr` and `@supabase/supabase-js` even though auth is on Clerk and DB is on Neon.
**Fix**: Rewrite `env.example`:
```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
MT5_ENCRYPTION_KEY=...
GEMINI_API_KEY=...         # optional — enables AI features
FINNHUB_API_KEY=...        # optional — enables live economic calendar
```
Remove Supabase deps after storage migration completes.

---

### [M6] `recharts` is 2.x (major version behind 3.x); `framer-motion` is 15 releases behind
**File**: `package.json`
**Problem**: `recharts@2.15.4` is installed while `3.8.0` is available — a major version jump that includes tree-shaking improvements and smaller bundle size. `framer-motion@12.23.26` is 15 patch versions behind `12.38.0`. These are not blocking issues but create accumulating upgrade debt.
**Recommendation**: Upgrade `recharts` to 3.x in an isolated branch (breaking API changes). Keep `framer-motion` minor-version upgrades in the normal release cycle.

---

## LOW / Best Practice

### [L1] `profiles` table (UUID PK) is still in `schema.ts` beside the new `appUsers` table
**File**: `src/lib/db/schema.ts:44-53`
**Problem**: The legacy `profiles` table with a UUID primary key is still defined in the schema. It's not referenced by any active query, but it occupies space in the schema file and could be accidentally used by future code.
**Fix**: Drop the `profiles` table definition once confirmed empty in production.

---

### [L2] Clerk webhook sync path is missing — no `user.created` handler in `src/app/api`
**File**: `src/app/api/` (no webhook/clerk route exists)
**Problem**: There is no Clerk webhook endpoint to sync `user.created`/`user.updated`/`user.deleted` to the `app_users` table. New users exist in Clerk but only get an `app_users` row when they first trigger an action that upserts them. If a user's profile is looked up before that first action, it returns null.
**Fix**:
```ts
// src/app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
export async function POST(req: NextRequest) {
  const payload = await verifyClerkWebhook(req); // verify svix signature
  if (payload.type === 'user.created') {
    await db.insert(appUsers).values({ id: payload.data.id, email: payload.data.email_addresses[0]?.email_address }).onConflictDoNothing();
  }
}
```

---

### [L3] `metaapi.cloud-sdk` ships in production dependencies but appears unused
**File**: `package.json:30`
**Problem**: `metaapi.cloud-sdk@29.3.2` is in `dependencies` (not devDependencies). This is a large SDK. If it is not actively used in any active code path, it adds bundle weight and a large attack surface.
**Fix**: Run `grep -rn 'metaapi' src --include="*.ts"` to confirm usage. If unused, remove it.

---

### [L4] `journalEntries` table is defined in schema but appears to be the legacy journal model
**File**: `src/lib/db/schema.ts` (bottom)
**Problem**: The `journalEntries` table is still defined but trades now embed their own journal fields (V2 migration). If no active queries use `journalEntries`, it is dead schema.
**Fix**: Confirm via `grep -rn 'journalEntries' src` and drop if unused.

---

### [L5] `5` TypeScript `any` usages remain — concentrated in analytics and domain mappers
**File**: Various (5 instances found)
**Problem**: A small but non-zero `any` count. In a `strict: true` codebase these should be typed.
**Fix**: Replace each with the appropriate inferred type or `unknown` + type guard.

---

## Performance Wins (Quick)
Ranked by expected impact:
1. **[P1]** Move `analytics.ts` off client fetch → Drizzle direct query — removes internal HTTP hop, enables proper server caching — `src/lib/api/analytics.ts`
2. **[P2]** Remove 14 dummy dataset imports from analytics page — large bundle and parse-time savings — `src/app/analytics/page.tsx`
3. **[P3]** Fix N+1 in `getOrchestratorConfig()` — reduces DB load on every orchestrator poll — `src/lib/terminal-farm/service.ts`
4. **[P4]** Stop `recalculateAllBalances()` running on every prop-firm page load — eliminates redundant DB writes on navigation — `src/app/prop-firm/page.tsx`
5. **[P5]** Replace full localStorage `JSON.stringify` on every note edit with per-note partial save — eliminates main-thread serialization at scale — `src/app/notes/page.tsx`

---

## Security Checklist
- [x] Clerk middleware protects all app pages and API routes by default
- [x] `clerkMiddleware` v5 pattern in use (not deprecated `authMiddleware`)
- [x] `requireAuth()` called at the top of every mutation route
- [x] `userId` used as WHERE clause in all domain queries
- [x] Zod validation on all mutation routes (trades, playbooks, prop accounts, MT5 accounts, AI, notes)
- [x] Rate limiting on MT5 account creation and AI endpoints
- [x] Orchestrator config route validates shared secret
- [x] Seed route gated behind `ADMIN_API_SECRET`
- [x] Terminal health endpoint gated behind `requireAdminOrSecret`
- [x] Drizzle DB client marked `server-only`
- [x] EA webhook validates `x-api-key` against `TERMINAL_WEBHOOK_SECRET`
- [ ] Clerk webhook sync (`user.created` → `app_users`) not implemented
- [ ] Content Security Policy not configured
- [ ] Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) not set
- [ ] Screenshot uploads not validated for file type/size at server boundary
- [ ] `dangerouslySetInnerHTML` used without nonce in root layout and chart component
- [ ] Trade chart still uses client-supplied symbol/timestamps after auth check

---

## Database Health
- **Query patterns**: Most domain reads go through centralised Drizzle helpers with `userId` scoping. One confirmed N+1 in `getOrchestratorConfig()`. Analytics layer still routes through client HTTP fetch instead of direct Drizzle.
- **Schema issues**:
  - `profiles` table (UUID PK) is dead — should be dropped.
  - `journalEntries` table may be dead — confirm and drop if so.
  - `trades.status` default is now `'OPEN'` (uppercase) — consistent with MT5 sync writer. Verify playbook stats queries use uppercase.
  - `appUsers` table properly uses Clerk text IDs. ✓
- **Transactions**:
  - MT5 relink uses `db.batch()` (not a true transaction) — needs `db.transaction()`.
  - All other multi-step writes reviewed appear to be single-statement or safe.
- **Index coverage**:
  - No explicit indexes declared in `schema.ts`. Verify SQL migrations define indexes on `trades(user_id)`, `trades(prop_account_id)`, `trades(status)`, `trades(entry_date)`, and `terminal_instances(account_id)`.

---

## Technical Debt Summary
Top 5 refactors that will pay off most:
1. **Migrate domain types off `supabase/types.ts`** — create `src/domain/types.ts`, update 16 files, then `@supabase/ssr` and `@supabase/supabase-js` can be removed from `package.json`.
2. **Migrate screenshot storage off Supabase** — move to a first-party upload API route, then `storage.ts` and `NEXT_PUBLIC_SUPABASE_URL` are dead.
3. **Add security headers and CSP** — one `headers()` block in `next.config.ts`, then add nonces to `dangerouslySetInnerHTML` usages.
4. **Fix MT5 relink to use `db.transaction()`** — one-line change, prevents partial state corruption.
5. **Add Clerk webhook handler** — ensures every user has an `app_users` row from first sign-up, not from first action.

---

## What's Done Well
- **Middleware posture is correct**: `clerkMiddleware` v5 with explicit `publicRoutes` and a deny-all default for API routes. Webhook routes are properly excluded.
- **Zod validation is now in every mutation route**: `src/lib/validation/` covers trades, playbooks, prop accounts, MT5 accounts, AI, notes, and more. This is a significant improvement over the previous audit.
- **Rate limiting is applied to expensive endpoints**: MT5 account creation and AI route both use `checkRateLimit()` before processing.
- **`db` client is `server-only`**: No risk of database credentials leaking into the client bundle.
- **MT5 webhook validates the shared secret** before processing any heartbeat/trade/position payload — correct boundary enforcement for an external sync surface.
- **`auth/callback` route no longer exchanges a Supabase session** — it now redirects with a clear error message, preventing silent Supabase auth attempts.
- **`appUsers` table properly models Clerk identity** with `text('id')` primary key — the previous UUID/Clerk mismatch is resolved.
- **TypeScript `strict: true` is on** and `tsc --noEmit` passes cleanly — strong type discipline throughout.
- **`requireAdminOrSecret` pattern** is consistently applied to infra-level endpoints (health, orchestrator config, seed).
