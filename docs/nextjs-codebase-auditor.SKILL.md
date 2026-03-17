---
name: nextjs-codebase-auditor
description: >
  Deep full-stack audit skill for Next.js + React + Neon (PostgreSQL) + Clerk codebases.
  Use this skill whenever the user wants to audit, debug, optimize, review performance,
  or check code quality across any part of their stack. Triggers on: "audit my code",
  "check my codebase", "optimize my app", "debug my Next.js app", "review performance",
  "check my database queries", "is my auth secure", "why is my app slow", "code review",
  "check for issues", "analyze my project", "find bugs", or any combination of these.
  Always use this skill when the user's project involves Next.js, React, Neon, or Clerk —
  even if they only ask about one layer. The audit covers every layer end-to-end.
---

# Next.js Full-Stack Codebase Auditor
## Stack: Next.js · React · Neon (PostgreSQL) · Clerk

---

## 0. Auditor Mindset

You are a **senior full-stack engineer and performance architect**. Your job is not to skim — it is to read every file that matters, trace every data flow, and produce a prioritized, actionable report. You do not guess; you read the actual code. You do not skip files; you build a complete map first.

**Golden rule**: Never output findings based on assumptions. Always `cat` or `view` the file before commenting on it.

---

## 1. Phase 1 — Codebase Mapping

Before auditing anything, build a complete structural map.

```bash
# 1. Top-level structure
find . -maxdepth 3 \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/.next/*' \
  | sort

# 2. Capture package versions (critical for known CVEs and deprecations)
cat package.json

# 3. Next.js config
cat next.config.js 2>/dev/null || cat next.config.mjs 2>/dev/null || cat next.config.ts 2>/dev/null

# 4. Environment variables shape (values redacted — never read .env values)
cat .env.example 2>/dev/null || grep -E '^[A-Z_]+=?' .env.local 2>/dev/null | sed 's/=.*/=<REDACTED>/'

# 5. TypeScript config
cat tsconfig.json 2>/dev/null

# 6. Middleware
cat middleware.ts 2>/dev/null || cat middleware.js 2>/dev/null
```

**Output**: A structured tree annotated with roles (App Router vs Pages Router, API routes, server components, client components, DB layer, auth layer).

---

## 2. Phase 2 — Layer-by-Layer Audit

Run each section in order. Each section produces findings tagged with severity:

| Tag | Meaning |
|-----|---------|
| 🔴 CRITICAL | Data loss, security breach, app crash |
| 🟠 HIGH | Performance regression, auth bypass risk, major bug |
| 🟡 MEDIUM | Suboptimal pattern, future maintenance risk |
| 🟢 LOW | Style/best practice, minor optimization |

---

### 2.1 Next.js Architecture Audit

**Check every file in `app/` or `pages/`.**

```bash
# Find all page/layout/route files
find ./app ./pages -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) 2>/dev/null | sort

# Find all API routes
find ./app/api ./pages/api -type f 2>/dev/null | sort

# Find all Server Actions
grep -rn '"use server"' ./app ./src 2>/dev/null

# Find all Client Components
grep -rn '"use client"' ./app ./src 2>/dev/null
```

**Check for these issues in every file read:**

**App Router specific:**
- [ ] Are Server Components fetching data directly (good) or passing props from client (bad)?
- [ ] Are large components unnecessarily marked `"use client"`, blocking RSC optimization?
- [ ] Are `loading.tsx` and `error.tsx` present for every major route segment?
- [ ] Is `generateMetadata` used for dynamic SEO, not hardcoded `<head>` tags?
- [ ] Are Route Handlers (`route.ts`) returning `NextResponse` with proper cache headers?
- [ ] Are Server Actions validated server-side (never trust client input)?
- [ ] Is `revalidatePath` / `revalidateTag` used correctly after mutations?
- [ ] Are `Suspense` boundaries placed to avoid full-page waterfalls?

**Pages Router specific (if applicable):**
- [ ] Is `getServerSideProps` used where `getStaticProps` + ISR would be faster?
- [ ] Are API routes doing heavy computation that should be in a background worker?
- [ ] Is `_app.tsx` bloated with logic that belongs in layouts or middleware?

**General:**
- [ ] Are images using `next/image` with explicit `width`/`height` or `fill`?
- [ ] Are fonts using `next/font` (eliminates FOUT and external font requests)?
- [ ] Are scripts using `next/script` with correct `strategy`?
- [ ] Are dynamic imports (`next/dynamic`) used for heavy client components?

---

### 2.2 React Component Audit

```bash
# Find all components
find ./components ./app ./src -type f \( -name "*.tsx" -o -name "*.jsx" \) 2>/dev/null | sort

# Find useState usage
grep -rn 'useState' ./components ./app ./src 2>/dev/null | grep -v node_modules

# Find useEffect usage
grep -rn 'useEffect' ./components ./app ./src 2>/dev/null | grep -v node_modules

# Find missing keys in lists
grep -rn '\.map(' ./components ./app ./src 2>/dev/null | grep -v 'key='
```

**Check every component file for:**

**Performance:**
- [ ] Are expensive computations wrapped in `useMemo`?
- [ ] Are callbacks passed as props wrapped in `useCallback`?
- [ ] Are components that re-render on every parent update wrapped in `React.memo`?
- [ ] Are lists missing `key` props (causes full list re-render)?
- [ ] Is state lifted too high, causing unnecessary re-renders of subtrees?
- [ ] Are context values stable (memoized), not recreated on every render?

**Architecture:**
- [ ] Are components doing too many things (violates Single Responsibility)?
- [ ] Are prop types / TypeScript interfaces complete (no `any`)?
- [ ] Are there deeply nested component trees that should be flattened with composition?
- [ ] Is global state (Zustand/Redux/Context) used where local state suffices?

**useEffect correctness:**
- [ ] Are all dependencies declared in the dependency array?
- [ ] Are effects that set up subscriptions returning cleanup functions?
- [ ] Are there effects that could be replaced with `useSyncExternalStore` or derived state?
- [ ] Are there infinite loop risks (object/array deps recreated each render)?

---

### 2.3 Neon (PostgreSQL) Database Audit

```bash
# Find all DB connection/client files
grep -rn 'neon\|@neondatabase\|postgres\|pg\|drizzle\|prisma' \
  ./lib ./db ./src ./app \
  --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null | grep -v node_modules

# Read the DB client setup
find . -name "db.ts" -o -name "db.js" -o -name "client.ts" -o -name "drizzle.ts" 2>/dev/null \
  | grep -v node_modules | xargs cat 2>/dev/null

# Find all raw SQL or query calls
grep -rn 'sql`\|\.query(\|\.execute(\|db\.' ./app ./lib ./src 2>/dev/null | grep -v node_modules

# Find schema files
find . -name "schema.ts" -o -name "schema.js" -o -name "*.prisma" 2>/dev/null \
  | grep -v node_modules | xargs cat 2>/dev/null
```

**Check for:**

**Connection Management:**
- [ ] Is the Neon client created once and reused (singleton pattern), not instantiated per request?
- [ ] Is `@neondatabase/serverless` used with `neonConfig.fetchConnectionCache = true`?
- [ ] Are connection strings in environment variables, never hardcoded?
- [ ] Is the connection pooler URL used for serverless (pooler endpoint, not direct)?

**Query Safety:**
- [ ] Are all user inputs parameterized — never string-interpolated into SQL?
- [ ] Are there N+1 query patterns (loop calling DB inside a loop)?
- [ ] Are queries fetching `SELECT *` when only specific columns are needed?
- [ ] Are large result sets paginated with `LIMIT`/`OFFSET` or cursor-based pagination?

**Schema & Indexes:**
- [ ] Are foreign keys defined with proper ON DELETE/UPDATE rules?
- [ ] Are columns used in WHERE/JOIN/ORDER BY clauses indexed?
- [ ] Are there missing NOT NULL constraints on required fields?
- [ ] Are timestamps using `TIMESTAMPTZ` (timezone-aware), not `TIMESTAMP`?

**ORM-specific (Drizzle / Prisma):**
- [ ] Is `select` narrowed to needed fields, not `findMany()` returning everything?
- [ ] Are transactions used for multi-step writes that must be atomic?
- [ ] Is eager loading (`.with()` in Drizzle / `include` in Prisma) used instead of N+1?
- [ ] Are migrations committed and reviewed (no schema drift)?

**Neon-specific:**
- [ ] Is the project on the correct compute size (auto-suspend enabled for dev, larger for prod)?
- [ ] Are read replicas used for read-heavy workloads?
- [ ] Are Neon branches used for preview environments?

---

### 2.4 Clerk Authentication Audit

```bash
# Find all Clerk usage
grep -rn 'clerk\|@clerk\|auth()\|currentUser\|useUser\|useAuth\|SignIn\|SignUp\|UserButton\|clerkMiddleware\|authMiddleware' \
  ./app ./src ./middleware.ts ./middleware.js ./components \
  --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null | grep -v node_modules

# Read middleware
cat middleware.ts 2>/dev/null || cat middleware.js 2>/dev/null

# Find protected routes configuration
grep -rn 'publicRoutes\|ignoredRoutes\|afterSignIn\|afterSignUp' \
  . --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules

# Find all places auth() is called
grep -rn 'auth()\|getAuth\|currentUser()' ./app ./src 2>/dev/null | grep -v node_modules
```

**Check for:**

**Middleware (most critical):**
- [ ] Is `clerkMiddleware` (v5+) or `authMiddleware` (v4) set up in `middleware.ts`?
- [ ] Does the `matcher` pattern cover all protected routes (including API routes)?
- [ ] Are `publicRoutes` explicitly defined — is the default deny-all or allow-all?
- [ ] Are webhook routes (e.g., `/api/webhooks/clerk`) excluded from auth middleware?

**Server-side protection:**
- [ ] Do all Server Components that render user-specific data call `auth()` or `currentUser()`?
- [ ] Do all API Route Handlers / Server Actions verify auth before processing?
- [ ] Is `userId` from `auth()` used as the WHERE clause in DB queries (row-level security)?
- [ ] Is there any path where unauthenticated users can trigger DB writes?

**Client-side:**
- [ ] Are client-side auth checks (`useAuth`, `useUser`) used only for UI state, never for access control?
- [ ] Is `<ClerkProvider>` wrapping the root layout (not per-page)?
- [ ] Are `<SignedIn>` / `<SignedOut>` used for conditional rendering?

**Webhooks & Sync:**
- [ ] Are Clerk webhooks (`user.created`, `user.updated`, `user.deleted`) handled to sync users to Neon?
- [ ] Is the webhook signature verified using `svix` before processing?
- [ ] Is the webhook endpoint idempotent (handles duplicate delivery)?

**Organization / Roles (if applicable):**
- [ ] Are `orgId` and `role` checks performed server-side for multi-tenant data access?
- [ ] Is `has({ permission: '...' })` used for fine-grained permission checks?

---

### 2.5 API Routes & Server Actions Audit

```bash
# Read every API route
find ./app/api ./pages/api -type f 2>/dev/null | xargs -I{} sh -c 'echo "=== {} ===" && cat "{}"'

# Read all server actions
grep -rln '"use server"' ./app ./src 2>/dev/null | xargs -I{} sh -c 'echo "=== {} ===" && cat "{}"'
```

**Check every route/action for:**
- [ ] Authentication check at the very top (before any logic)
- [ ] Input validation using Zod or equivalent (never trust req.body/FormData shape)
- [ ] Correct HTTP status codes (401 vs 403, 400 vs 422, 404 vs 200 with null)
- [ ] Error responses not leaking stack traces or internal details in production
- [ ] Rate limiting on mutation endpoints
- [ ] CORS headers if the API is consumed by external clients
- [ ] Idempotency for POST/PUT operations where applicable

---

### 2.6 Performance Audit

```bash
# Bundle analysis — check if analyzer is configured
grep -n 'withBundleAnalyzer\|@next/bundle-analyzer' next.config.* package.json 2>/dev/null

# Find large static imports that could be dynamic
grep -rn '^import ' ./app ./components ./src \
  --include="*.tsx" --include="*.ts" 2>/dev/null \
  | grep -v node_modules | grep -v 'from "react"\|from "next'

# Find missing Suspense around async components
grep -rn 'async function\|async (' ./app \
  --include="*.tsx" 2>/dev/null | grep -v node_modules

# Check for fetch without caching strategy
grep -rn 'fetch(' ./app ./lib ./src \
  --include="*.ts" --include="*.tsx" 2>/dev/null \
  | grep -v 'node_modules\|test'
```

**Check for:**
- [ ] Are `fetch()` calls in Server Components using `cache: 'force-cache'` or `next: { revalidate }` where appropriate?
- [ ] Are third-party libraries imported selectively (e.g., `import { X } from 'lib'` not `import lib from 'lib'`)?
- [ ] Are heavy components (`<Editor>`, charts, maps) loaded with `next/dynamic` + `ssr: false`?
- [ ] Are DB queries in parallel where independent (`Promise.all`) instead of sequential?
- [ ] Are Neon queries running inside React render (should be in Server Component, not useEffect)?
- [ ] Are large images optimized and served via Next.js Image Optimization?
- [ ] Is `turbopack` enabled in dev for faster builds?
- [ ] Is `experimental.ppr` (Partial Prerendering) considered for hybrid static/dynamic routes?

---

### 2.7 Security Audit

```bash
# Check for exposed secrets patterns
grep -rn 'process\.env\.' ./app ./src ./components \
  --include="*.tsx" --include="*.ts" 2>/dev/null \
  | grep -v 'node_modules' | grep -v 'NEXT_PUBLIC_'

# Check for dangerouslySetInnerHTML
grep -rn 'dangerouslySetInnerHTML' ./app ./src ./components 2>/dev/null | grep -v node_modules

# Check for direct eval usage
grep -rn '\beval(' ./app ./src ./components 2>/dev/null | grep -v node_modules

# Check Content Security Policy
grep -rn 'Content-Security-Policy\|contentSecurityPolicy' next.config.* ./app 2>/dev/null
```

**Check for:**
- [ ] Are `NEXT_PUBLIC_` env vars used only for truly public values (never secrets)?
- [ ] Are server-only env vars imported only in server files (use `server-only` package)?
- [ ] Is there a Content Security Policy header configured in `next.config`?
- [ ] Are security headers set (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`)?
- [ ] Is `dangerouslySetInnerHTML` used anywhere without sanitization (`DOMPurify`)?
- [ ] Are Clerk's JWT verification / `auth()` results trusted without re-verification against DB?
- [ ] Are file uploads validated for type and size before processing?

---

### 2.8 TypeScript & Code Quality Audit

```bash
# Run TypeScript check (if available)
npx tsc --noEmit 2>&1 | head -80

# Find all `any` usages
grep -rn ': any\|as any\|<any>' ./app ./src ./components ./lib \
  --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules

# Find TODO/FIXME/HACK
grep -rn 'TODO\|FIXME\|HACK\|XXX' ./app ./src ./components ./lib \
  --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules

# Find console.log left in production code
grep -rn 'console\.log\|console\.error\|console\.warn' ./app ./src ./components \
  --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules
```

**Check for:**
- [ ] Is `strict: true` enabled in `tsconfig.json`?
- [ ] Are there `any` types that should be properly typed?
- [ ] Are there unhandled Promise rejections (missing `try/catch` in async functions)?
- [ ] Are there `console.log` statements that should be removed or replaced with a logger?
- [ ] Are error boundaries in place for client component subtrees?
- [ ] Is `zod` or `valibot` used for runtime type validation at boundaries?

---

## 3. Phase 3 — Dependency & Configuration Audit

```bash
# Check for outdated packages
npm outdated 2>/dev/null | head -40

# Check for known vulnerabilities
npm audit --audit-level=moderate 2>/dev/null | head -60

# Verify Next.js version and known issues
node -e "console.log(require('./node_modules/next/package.json').version)" 2>/dev/null

# Check Clerk SDK version
node -e "console.log(require('./node_modules/@clerk/nextjs/package.json').version)" 2>/dev/null

# Check Neon serverless version
node -e "console.log(require('./node_modules/@neondatabase/serverless/package.json').version)" 2>/dev/null
```

**Flag:**
- Any package with a known CVE
- Mismatched peer dependencies
- Using deprecated Clerk v4 patterns when v5 is installed (or vice versa)
- Using deprecated `@vercel/postgres` instead of `@neondatabase/serverless`

---

## 4. Phase 4 — Audit Report Format

Produce the final report in this exact structure:

```
# 🔍 Codebase Audit Report
## Stack: Next.js · React · Neon · Clerk
Generated: <date>

---

## 📊 Executive Summary
- Total files audited: N
- Critical issues: N
- High issues: N
- Medium issues: N
- Low issues: N

---

## 🔴 CRITICAL Issues
### [C1] <Issue Title>
**File**: `path/to/file.ts` (line N)
**Problem**: Clear description of what is wrong and why it is dangerous.
**Evidence**: (paste the exact problematic code snippet)
**Fix**: Exact code showing the corrected version.

[repeat for each critical issue]

---

## 🟠 HIGH Issues
### [H1] <Issue Title>
[same format]

---

## 🟡 MEDIUM Issues
[same format]

---

## 🟢 LOW / Best Practice
[same format — can be grouped if many]

---

## ⚡ Performance Wins (Quick)
Ranked by expected impact:
1. **[P1]** Description — expected gain — file — fix

---

## 🔐 Security Checklist
- [x] Auth middleware covers all routes
- [ ] CSP headers not configured ← fix in next.config
[complete checklist]

---

## 🗃️ Database Health
- Query patterns: N queries found, N are N+1 risks
- Missing indexes: list columns
- Schema issues: list

---

## 🧹 Technical Debt Summary
Top 5 refactors that will pay off most:
1. ...

---

## ✅ What's Done Well
Highlight genuinely good patterns found — be specific, not generic.
```

---

## 5. Auditor Rules

1. **Read before you write.** Never describe a file you haven't viewed.
2. **Quote the code.** Every finding must include the exact offending code.
3. **Give the fix.** Every finding must include the corrected code, not just advice.
4. **Prioritize ruthlessly.** A report with 3 Critical findings is more valuable than one with 50 Low findings that buries the real problems.
5. **Don't be generic.** "Use React.memo where appropriate" is useless. "Wrap `<ProductList>` in `components/ProductList.tsx:47` in React.memo — it re-renders on every `cartCount` change even though it doesn't use it" is a real finding.
6. **Environment safety.** Never read, log, or output actual secret values from `.env` files.
7. **Scope awareness.** If the codebase is large (>200 files), prioritize: middleware → auth → API routes → DB layer → Server Components → Client Components → config.
