# Codebase Audit Report
## Stack: Next.js · React · Neon · Clerk
Generated: 2026-03-17

---

## Executive Summary
- Total files audited: 235
- Critical issues: 4
- High issues: 8
- Medium issues: 6
- Low issues: 5

Verification performed:
- `cmd /c npm run lint`: passes with 16 warnings, 0 errors
- `cmd /c npx tsc --noEmit`: passes
- `cmd /c npm run build`: blocked in this environment because `next/font/google` could not reach Google Fonts during build

Highest-risk conclusion:
- The app's trade and MT5 core is mostly functional, but the identity layer is still half-migrated.
- Clerk is the real auth system, while parts of the codebase still assume Supabase auth, Supabase storage, and Supabase-shaped profile data.
- Mutation endpoints still trust raw JSON bodies, which means data integrity depends on callers being well-behaved.

---

## CRITICAL Issues
### [C1] Clerk/Neon identity modeling is internally inconsistent
**File**: `src/lib/db/schema.ts` (lines 26-27), `src/components/auth-provider.tsx` (lines 65-76)

**Problem**: The database still defines `profiles.id` as a UUID "matching auth.users(id)", but the rest of the app stores ownership as Clerk `userId` text values such as `user_xxx`. At the same time, the auth provider fabricates profile values in memory and exposes a no-op `refreshProfile`. This means there is no trustworthy application-level user record in Neon.

**Evidence**:
```ts
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // matches auth.users(id)
```

```ts
profile: user
  ? {
      full_name: user.fullName,
      avatar_url: user.imageUrl,
      first_name: user.firstName ?? null,
      last_name: user.lastName ?? null,
      timezone: null,
      default_risk_percent: null,
      default_rr_ratio: null,
    }
  : null,
refreshProfile: async () => {}, // Clerk auto-refreshes
```

**Fix**: Introduce a Clerk-keyed user table in Neon, migrate `profiles` to text IDs, and provision users from Clerk webhook or first-login upsert.

```ts
export const appUsers = pgTable('app_users', {
  id: text('id').primaryKey(), // Clerk userId
  email: text('email').notNull(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  timezone: text('timezone'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### [C2] Stale Supabase auth/profile flows are still live in a Clerk app
**File**: `src/app/settings/page.tsx` (lines 20, 89, 188-256), `src/app/auth/callback/route.ts` (lines 1-14)

**Problem**: The settings page still imports the Supabase browser client and attempts to update `profiles` and Supabase auth, but the page hard-disables that path with `supabaseEnabled = false`. The auth callback route still exchanges a Supabase session code.

**Evidence**:
```ts
import { createClient } from "@/lib/supabase/client";
const supabaseEnabled = false;
```

```ts
const supabase = createClient();
const { error } = await supabase
  .from("profiles")
  .update({
    first_name: firstName.trim() || null,
    last_name: lastName.trim() || null,
    timezone,
  })
```

```ts
const supabase = await createClient()
const { error } = await supabase.auth.exchangeCodeForSession(code)
```

**Fix**: Remove Supabase auth/profile logic entirely. Move settings persistence behind a Clerk-aware `/api/profile` route backed by a real Neon user/profile table, and retire the Supabase callback route.

```ts
const res = await fetch('/api/profile', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ firstName, lastName, timezone, defaultRiskPercent, defaultRrRatio }),
});
if (!res.ok) throw new Error('Failed to save profile');
```

### [C3] Mutation endpoints accept raw JSON and write directly to the database
**File**: `src/app/api/trades/route.ts` (lines 42-43), `src/app/api/trades/[id]/route.ts` (lines 30-33), `src/app/api/playbooks/route.ts` (lines 23-24), `src/app/api/playbooks/[id]/route.ts` (lines 34-37), `src/app/api/prop-accounts/route.ts` (lines 26-59), `src/app/api/prop-accounts/[id]/route.ts` (lines 33-36), `src/app/api/mt5-accounts/route.ts` (lines 52-87), `src/app/api/ai/route.ts` (lines 10-11)

**Problem**: Most mutation routes call `await request.json()` and pass the result straight into write helpers. The app already ships `zod`, but it is not used here. Invalid shapes, unexpected enum values, malformed dates, and oversized payloads rely on callers being well-behaved.

**Evidence**:
```ts
const body = await request.json();
const trade = await createTrade(userId, body);
```

```ts
const body = await request.json();
const playbook = await updatePlaybook(id, userId, body);
```

```ts
const body = await request.json();
const { action, ...params } = body;
```

**Fix**: Define Zod schemas per route, parse at the boundary, reject unknown keys, and normalize enum/date inputs before they reach the database.

```ts
const TradeCreateSchema = z.object({
  symbol: z.string().min(1).max(20),
  direction: z.enum(['LONG', 'SHORT']),
  status: z.enum(['OPEN', 'CLOSED']).default('OPEN'),
  entryPrice: z.coerce.string(),
  positionSize: z.coerce.string(),
  entryDate: z.coerce.date(),
  propAccountId: z.string().uuid().nullable().optional(),
  playbookId: z.string().uuid().nullable().optional(),
}).strict();
```

### [C4] MT5 relink/update flow is a multi-step write without a transaction
**File**: `src/app/api/mt5-accounts/route.ts` (lines 130-165, 175-187)

**Problem**: Reusing an existing MT5 login performs dependent writes in sequence: update the MT5 account, reassign linked trades, and update the prop account balance. If any later step fails, the system is left partially moved.

**Evidence**:
```ts
await db
  .update(mt5Accounts)
  .set(updatePayload)
  .where(eq(mt5Accounts.id, existingLoginAccount.id));

await db
  .update(trades)
  .set({ propAccountId })
  .where(eq(trades.mt5AccountId, existingLoginAccount.id));

await db
  .update(propAccounts)
  .set(propUpdates)
  .where(and(eq(propAccounts.id, propAccountId), eq(propAccounts.userId, userId)));
```

**Fix**: Wrap the entire relink/create path in `db.transaction`.

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
### [H1] Terminal health endpoint leaks platform-wide infrastructure state to any signed-in user
**File**: `src/app/api/terminal-farm/health/route.ts` (lines 13-21, 23-53)

**Problem**: Any authenticated Clerk user can call `/api/terminal-farm/health` and receive health information for every terminal instance in the system.

**Evidence**:
```ts
if (orchestratorSecret && authHeader === `Bearer ${orchestratorSecret}`) {
  // Orchestrator machine-to-machine auth — proceed
} else {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
}
```

```ts
const terminals = await db
  .select({
    id: terminalInstances.id,
    status: terminalInstances.status,
    lastHeartbeat: terminalInstances.lastHeartbeat,
    lastSyncAt: terminalInstances.lastSyncAt,
  })
```

**Fix**: Remove the generic browser-session fallback, or gate it behind an explicit admin/ops permission check.

### [H2] Server analytics code calls the client fetch helper instead of reading the database directly
**File**: `src/lib/api/analytics.ts` (lines 1-6, 132-140)

**Problem**: The analytics service is a server-side helper, but it imports `getTrades` from the client API layer. That forces analytics into an internal HTTP-shaped path and couples server computations to `/api/trades`.

**Evidence**:
```ts
/**
 * Analytics helpers read from /api/trades so dashboard and journal use the same
 * filtered trade source after the Drizzle migration.
 */
import { getTrades } from '@/lib/api/client/trades';
```

```ts
async function fetchClosedTrades(...): Promise<AnalyticsTrade[]> {
  const rows = await getTrades(buildClosedTradeFilters(options));
  return rows as unknown as AnalyticsTrade[];
}
```

**Fix**: Split analytics into a server-only data path that queries Drizzle directly.

### [H3] Analytics page still ships and renders a large dummy-data dashboard in production
**File**: `src/app/analytics/page.tsx` (lines 56-71, 317-345, 427-457, 622-623, 785-786, 1277-1283)

**Problem**: Even after loading real analytics summary data, the page still statically imports a large dummy dataset module and renders many charts and cards directly from those dummy arrays.

**Evidence**:
```ts
import {
  DUMMY_RISK,
  DUMMY_EQUITY,
  DUMMY_DRAWDOWN,
  DUMMY_R_DIST,
  DUMMY_PNL_DIST,
  DUMMY_HOLD,
  DUMMY_SESSIONS,
  DUMMY_DOW,
  DUMMY_HOURLY,
  DUMMY_STREAKS,
  DUMMY_CONSISTENCY,
  DUMMY_MAE_MFE,
  DUMMY_INSTRUMENTS,
  DUMMY_STRATEGIES,
} from "@/lib/data/dummy";
```

```ts
const useDummy = !loading && tradeCount === 0;
const eqData = useMemo(() => useDummy ? DUMMY_EQUITY : equityCurve.map(...), ...);
```

**Fix**: Move examples into a dedicated demo mode or remove them from the production page entirely.

### [H4] Screenshot uploads still depend on Supabase storage
**File**: `src/lib/api/storage.ts` (lines 1, 6, 20, 47, 76), `src/hooks/use-screenshot-upload.tsx` (lines 7, 29-33), `next.config.ts` (lines 12-19), `env.example` (lines 1-4)

**Problem**: The journal screenshot path still depends on Supabase browser client, Supabase URL envs, Supabase public object URLs, and a Supabase image host whitelist.

**Evidence**:
```ts
import { createClient } from '@/lib/supabase/client'
const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabase = createClient()
```

```ts
const path = await uploadTradeScreenshot(file, userId);
const newScreenshot: JournalScreenshot = {
  url: getScreenshotUrl(path),
```

**Fix**: Move screenshot storage behind a first-party upload route and provider-neutral storage service.

### [H5] Gemini environment wiring is broken, and the AI endpoint still trusts raw actions
**File**: `src/lib/api/gemini.ts` (lines 1-5), `src/lib/env.ts` (line 19), `src/app/api/ai/route.ts` (lines 10-11)

**Problem**: The environment validator expects `NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_KEY`, while the Gemini client is initialized from `process.env.GEMINI_API_KEY`. The route also accepts any raw `action`/`params` payload without runtime validation or rate limiting.

**Evidence**:
```ts
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
```

```ts
const optional = [
  ...
  'NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_KEY',
  'FINNHUB_API_KEY',
] as const;
```

```ts
const body = await request.json();
const { action, ...params } = body;
```

**Fix**: Use one server-only env name, validate it at startup, add an action schema, and rate-limit the route.

### [H6] Trade chart endpoint trusts client-supplied symbol and timestamps
**File**: `src/app/api/trades/chart/route.ts` (lines 11-26)

**Problem**: The route verifies that the trade belongs to the current user, but then it ignores the stored trade fields and forwards client-supplied `symbol`, `entryTime`, and `exitTime` to the pricing service.

**Evidence**:
```ts
const body = await request.json();
const { tradeId, symbol, entryTime, exitTime } = body;
...
const trade = await getTrade(tradeId, userId);
if (!trade) {
  return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
}

const result = await getTradeChartData(tradeId, symbol, entryTime, exitTime);
```

**Fix**: Use the stored trade values after authorization, and only let the client pass optional display modifiers.

### [H7] Trade status casing is inconsistent across the schema and business logic
**File**: `src/lib/db/schema.ts` (line 133), `src/lib/terminal-farm/service.ts` (lines 1035, 1094), `src/lib/api/playbooks.ts` (line 114)

**Problem**: The schema default is lowercase `open`, the MT5 sync writer inserts uppercase `OPEN`/`CLOSED`, and playbook stats query for lowercase `closed`.

**Evidence**:
```ts
status: text('status').notNull().default('open'), // open | closed
```

```ts
status: 'OPEN',
...
status: 'CLOSED',
```

```ts
const conditions = [
  eq(trades.playbookId, playbookId),
  eq(trades.userId, userId),
  eq(trades.status, 'closed'),
];
```

**Fix**: Normalize status to a single enum everywhere.

### [H8] Compliance endpoints always report success defaults and mask errors
**File**: `src/lib/api/prop-accounts.ts` (lines 120-145), `src/app/api/prop-accounts/[id]/compliance/route.ts` (lines 14-21)

**Problem**: Compliance is not implemented, but the current code returns a happy-path placeholder as if it were real data. The route also converts thrown errors into HTTP 200 success payloads.

**Evidence**:
```ts
return {
  isCompliant: true,
  dailyDdRemaining: 100,
  totalDdRemaining: 100,
  profitProgress: null,
  daysRemaining: null,
};
```

```ts
} catch (err) {
  console.error('[compliance route]', err);
  return NextResponse.json(
    { isCompliant: true, dailyDdRemaining: 100, totalDdRemaining: 100, profitProgress: null, daysRemaining: null },
    { status: 200 }
  );
}
```

**Fix**: Either implement real compliance from challenge/account data, or mark the feature explicitly unavailable.

---

## MEDIUM Issues
### [M1] Notes page rewrites the entire notebook to localStorage on each edit
**File**: `src/app/notes/page.tsx` (lines 87-99, 277-307, 337-355)

**Problem**: The notes page keeps a separate localStorage-backed notebook and serializes the entire notes collection on every create, edit, and delete. This duplicates the DB-backed notebook feature, guarantees data divergence, and becomes progressively slower as the note count grows.

**Evidence**:
```ts
function loadNotes(): Note[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Note[]) : [];
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}
```

```ts
const updated = prev.map((n) =>
  n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
);
saveTimer.current = setTimeout(() => {
  saveNotes(updated);
```

**Fix**: Either remove the legacy notes page or make it a thin UI over the DB-backed `/api/notes` surface used by notebook.

### [M2] Notebook editor still mutates the whole note list and forces layout on input
**File**: `src/app/notebook/page.tsx` (lines 315-318, 335-340, 580-581)

**Problem**: The notebook page still maps over the entire note array for single-note edits and pin toggles, and it manually resets textarea height to `auto` then `scrollHeight` on input. The first issue increases React work as note counts grow; the second forces synchronous layout recalculation on every keystroke.

**Evidence**:
```ts
saveTimer.current = setTimeout(async () => {
  try {
    const updated = await updateNoteApi(noteId, { [field]: value });
    setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
```

```ts
setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: next } : n)));
```

```ts
e.target.style.height = "auto";
e.target.style.height = `${e.target.scrollHeight}px`;
```

**Fix**: Store selected-note draft separately from the list, update only that object during editing, and use CSS auto-grow or a deferred layout effect instead of per-keystroke DOM writes.

### [M3] Prop-firm dashboard does expensive recomputation/refetch work during normal navigation
**File**: `src/app/prop-firm/page.tsx` (lines 153-169, 258-262, 285-305)

**Problem**: On load, the page fetches prop accounts and MT5 accounts, then triggers a balance recalculation and a second account fetch whenever any non-MT5 account exists. It also starts a 10-second polling loop whenever the sync dialog is open.

**Evidence**:
```ts
const [accountsData, mt5AccountList] = await Promise.all([
  getPropAccounts(),
  getMT5Accounts(),
]);
...
if (hasNonMt5) {
  await recalculateAllBalances();
  updatedAccountsData = await getPropAccounts();
}
```

```ts
const timer = window.setInterval(() => {
  void poll();
}, 10_000);
```

**Fix**: Recalculate lazily after relevant mutations, cache MT5 linkage metadata, and replace blind polling with event-driven refresh or backoff.

### [M4] Trading calendar still contains Supabase messaging and a broken route link
**File**: `src/components/calendar/trading-calendar.tsx` (lines 72-89, 208-211, 413-417)

**Problem**: The calendar is already using the current trade API, but its empty-state copy still tells users to add Supabase credentials. It also links users to `/trades`, which does not exist in this repo.

**Evidence**:
```ts
const tradesData = await getTradesByDateRange(
  start,
  end,
  propAccountIdFilter,
);
```

```ts
<h2 className="mb-2 text-xl font-semibold text-foreground">
  Supabase Not Configured
</h2>
<p className="text-muted-foreground">
  Please add your Supabase credentials.
</p>
```

```ts
<Link href="/trades">
  Go to Trades ->
</Link>
```

**Fix**: Update the copy to reflect Clerk/app configuration, and link to the real journaling route.

### [M5] Security headers and CSP are missing while the root layout injects inline script
**File**: `next.config.ts` (lines 3-22), `src/app/layout.tsx` (lines 70-71)

**Problem**: The root layout injects an inline theme bootstrap script with `dangerouslySetInnerHTML`, but `next.config.ts` does not define a Content Security Policy or any common security headers.

**Evidence**:
```ts
const nextConfig: NextConfig = {
  experimental: { ... },
  images: { ... },
};
```

```ts
<script
  dangerouslySetInnerHTML={{
    __html: `(function(){var t=localStorage.getItem('theme');...})()`,
  }}
/>
```

**Fix**: Add `headers()` in `next.config.ts` with CSP, `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`.

### [M6] Economic calendar silently falls back to mock data in the live API route
**File**: `src/app/api/news/economic-calendar/route.ts` (lines 16-31, 41-46, 92-112)

**Problem**: If the Finnhub key is missing or the live API fails, the route returns mock macro events as if they were current calendar data. The response does expose `usingMock`, but the fallback is still silent enough to mislead users if the client does not surface that flag clearly.

**Evidence**:
```ts
function getMockEvents(from: string, currencies: string[]): EconomicEvent[] {
  const allEvents: EconomicEvent[] = [
    { id: "1", ... event: "Non-Farm Payrolls", ... },
```

```ts
const apiKey = process.env.FINNHUB_API_KEY;
if (!apiKey) return [];
```

```ts
let events = await fetchFinnhub(from, to);
const usingMock = events.length === 0;
if (usingMock) events = getMockEvents(from, currencies);
...
return NextResponse.json({ events, usingMock });
```

**Fix**: Reserve mock events for explicit development mode and otherwise return a degraded/error response that the UI must handle explicitly.

---

## LOW / Best Practice
### [L1] Legacy Supabase auth/session modules still live beside Clerk middleware
**File**: `src/lib/supabase/middleware.ts` (lines 1-45)

**Problem**: The repo still contains a complete Supabase session middleware flow even though the active runtime middleware is Clerk-based. Keeping both systems around increases migration confusion and raises the chance of future accidental imports.

**Evidence**:
```ts
import { createServerClient } from '@supabase/ssr'
...
const {
  data: { user },
} = await supabase.auth.getUser()
```

**Fix**: Delete the unused Supabase session middleware and any imports that depend on it once the last Supabase paths are removed.

### [L2] Environment docs and dependencies still describe a Supabase app
**File**: `env.example` (lines 1-8), `package.json` (lines 38-39, 56), `src/lib/env.ts` (line 19)

**Problem**: `env.example` documents only Supabase env vars, while the real app requires Clerk and `DATABASE_URL`. `package.json` still ships both Supabase packages, and `zod` is installed but not used where it matters most.

**Evidence**:
```ts
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

```json
"@supabase/ssr": "^0.8.0",
"@supabase/supabase-js": "^2.89.0",
"zod": "^4.3.6"
```

**Fix**: Rewrite `env.example` for the current runtime, remove Supabase deps after migration, and actually use `zod` on input boundaries.

### [L3] Orchestrator config generation has an avoidable N+1 query pattern
**File**: `src/lib/terminal-farm/service.ts` (lines 535-556)

**Problem**: `getOrchestratorConfig()` loops over terminal rows and performs a fresh `mt5Accounts` select for each terminal. It is acceptable at small scale, but it is a direct N+1 pattern in an endpoint the orchestrator polls repeatedly.

**Evidence**:
```ts
for (const terminal of terminals) {
  ...
  const [account] = await db
    .select()
    .from(mt5Accounts)
    .where(eq(mt5Accounts.id, terminal.accountId))
    .limit(1);
```

**Fix**: Join terminal instances to MT5 accounts in one query before iterating.

### [L4] Global seed endpoint is not admin-scoped
**File**: `src/app/api/seed/prop-firms/route.ts` (lines 5-11)

**Problem**: Any authenticated user can trigger the system seed endpoint for shared prop-firm reference data. The operation is idempotent, but it is still a global mutation surface that should be reserved for admin or deployment workflows.

**Evidence**:
```ts
export async function POST() {
  const { error } = await requireAuth();
  if (error) return error;
  const { inserted } = await seedPropFirmsIfEmpty();
```

**Fix**: Restrict the route to admin users or remove it from the public app surface and run it in migrations/ops tooling.

### [L5] Production paths still use ad-hoc console logging instead of structured logging
**File**: `src/lib/api/pricing.ts` (lines 66, 93, 214, 250), `src/lib/terminal-farm/service.ts` (multiple `console.*` paths)

**Problem**: High-churn runtime paths log directly to console with trade IDs, symbols, timestamps, and sync events. This is useful during development, but it becomes noisy and hard to filter in production.

**Evidence**:
```ts
console.log(`[Pricing] Returning cached data for trade ${tradeId}`);
console.log(`[Pricing] Fetching from Twelve Data: ${symbol} from ${startTime.toISOString()} to ${endTime.toISOString()}`);
console.log(`[Pricing] Fetched ${candles.length} candles from Twelve Data`);
```

**Fix**: Route logs through a structured logger with levels, request context, and sampling for noisy sync paths.

---

## Performance Wins (Quick)
Ranked by expected impact:
1. **[P1]** Move analytics off the client fetch helper and query Drizzle directly — removes internal HTTP hop and simplifies caching — `src/lib/api/analytics.ts`
2. **[P2]** Remove dummy analytics datasets from the production route — large bundle and render savings — `src/app/analytics/page.tsx`
3. **[P3]** Stop serializing the entire legacy notes collection on every edit — reduces main-thread work — `src/app/notes/page.tsx`
4. **[P4]** Rework prop-firm account load so it does not recalculate/refetch on every normal load — reduces duplicate network and DB work — `src/app/prop-firm/page.tsx`
5. **[P5]** Replace `getOrchestratorConfig()` N+1 reads with a join — lowers orchestrator poll cost — `src/lib/terminal-farm/service.ts`

---

## Security Checklist
- [x] Clerk middleware protects app pages and most API routes by default
- [x] Orchestrator config route validates a shared secret before returning credentials
- [x] The Drizzle DB client is marked `server-only`
- [ ] Clerk-to-Neon user sync/webhook path exists
- [ ] Mutation routes validate payloads with Zod or equivalent
- [ ] Mutation routes use rate limiting where abuse is expensive (`/api/ai`, MT5 setup, account creation)
- [ ] Global infrastructure endpoints are admin- or machine-scoped
- [ ] Content Security Policy is configured
- [ ] Common security headers are configured
- [ ] Screenshot uploads enforce file type/size at the server boundary

---

## Database Health
- Query patterns: most domain reads go through centralized Drizzle helpers, but one confirmed N+1 remains in `getOrchestratorConfig()` and several client pages still fan out through API fetch helpers instead of server-side data reads.
- Schema issues:
  - `profiles.id` is still UUID-based while the app uses Clerk text user IDs.
  - `trades.status` is modeled inconsistently (`open`, `OPEN`, `closed`, `CLOSED`).
  - The app still lacks a canonical Clerk-keyed user table in the code path currently in use.
  - Screenshot storage still lives outside the main Neon-backed app model.
- Transactions:
  - MT5 account relink/update is not atomic.
  - Trade sync batching in terminal farm is resilient, but still not modeled as one transaction per logical relink/update flow.
- Index coverage:
  - Not fully verifiable from `src/lib/db/schema.ts` alone because this repo still relies on SQL migrations for some DB concerns.
  - No explicit indexes are declared in the Drizzle schema file for common filters such as `user_id`, `status`, and `prop_account_id`; verify they exist in SQL migrations before assuming good query plans at scale.

---

## Technical Debt Summary
Top 5 refactors that will pay off most:
1. Finish the Supabase-to-Clerk migration completely: user table, settings, auth callback, screenshot storage, env docs, and dependency cleanup.
2. Add runtime validation and rate limiting to every mutation/API boundary, starting with trades, playbooks, prop accounts, MT5 setup, and AI.
3. Rebuild analytics as a true server-side aggregation layer and remove production dummy datasets.
4. Consolidate notes/notebook into one persistence model and delete the legacy localStorage notebook.
5. Normalize trade/account domain enums and identifiers at the schema level so the app stops translating between old and new models at runtime.

---

## What's Done Well
- Middleware posture is mostly correct. `middleware.ts` protects pages and non-public API routes by default instead of relying on client-side checks.
- The Drizzle DB client is `server-only`, which prevents accidental client bundling of the database layer.
- MT5 webhook/service code does perform schema validation on heartbeat/trade/position payloads before processing, which is the right boundary for an external sync surface.
- TypeScript discipline is materially better than average for a migration-heavy repo: `strict` is enabled and `npx tsc --noEmit` passes.
- User scoping is generally applied in the core CRUD helpers. For example, notes, trades, playbooks, and prop accounts consistently filter by `userId` in their Drizzle queries.
