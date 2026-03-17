# Audit Remediation Execution Plan

Generated: 2026-03-17
Source audit: `docs/SKILL_BASED_CODEBASE_AUDIT.md`

## Phase 1: Identity Repair
- Goal: Replace the broken Clerk/Supabase profile split with one canonical Clerk-keyed user record in Neon.
- Work:
  - Add a new `app_users` table keyed by Clerk `userId`.
  - Sync signed-in Clerk users into `app_users`.
  - Replace fabricated profile state in `src/components/auth-provider.tsx`.
  - Replace stale Supabase settings/profile writes with API-backed Neon reads and writes.
  - Remove the dead Supabase auth callback path from the live auth flow.
- Exit criteria:
  - Signed-in users always resolve to a Neon-backed app profile.
  - Settings reads and writes no longer depend on Supabase.
  - No live auth/profile route imports Supabase auth helpers.

## Phase 2: API Boundary Hardening
- Goal: Ensure every mutation route validates input and returns predictable error shapes.
- Work:
  - Add Zod validation to trade, playbook, prop-account, MT5-account, and AI mutation routes.
  - Standardize mutation error payloads.
  - Add rate limiting to abuse-prone routes.
  - Restrict infrastructure routes to admins or machine-authenticated callers.
- Exit criteria:
  - No mutation route writes raw `request.json()` to the database.
  - Sensitive operational routes are not reachable by normal signed-in users.

## Phase 3: MT5 and Trade Integrity
- Goal: Make the highest-value write paths correct under partial failure.
- Work:
  - Wrap MT5 relink/update flows in DB transactions.
  - Normalize trade status storage and reads.
  - Stop compliance helpers from masking failures as healthy defaults.
  - Re-check ownership guarantees across MT5, prop account, and trade joins.
- Exit criteria:
  - MT5 relink/update cannot leave partial ownership state behind.
  - Trade status has one canonical representation.

## Phase 4: Supabase Decommissioning
- Goal: Remove the remaining Supabase runtime dependencies that are no longer part of the architecture.
- Work:
  - Replace screenshot storage integration.
  - Delete dead Supabase auth/session helpers and callback routes.
  - Update env docs and dependencies to the real stack.
- Exit criteria:
  - Supabase is no longer required for auth or user settings.
  - Runtime env documentation matches the deployed architecture.

## Phase 5: Analytics and Performance
- Goal: Remove the biggest data-flow inefficiencies and production-only placeholder payloads.
- Work:
  - Move analytics to direct server-side aggregation.
  - Remove dummy analytics datasets from the production page.
  - Reduce notes/notebook state churn and rewrite-heavy flows.
  - Reduce redundant prop-firm and orchestrator work.
- Exit criteria:
  - Analytics payloads are fully server-backed.
  - Notes and notebook stop rewriting whole collections on routine edits.

## Phase 6: Production Hardening
- Goal: Finish the security and operational cleanup needed for production readiness.
- Work:
  - Add CSP and baseline security headers.
  - Replace ad-hoc console logging with structured logs.
  - Fix stale UI messaging and broken legacy links.
  - Add regression coverage for identity, validation, MT5 writes, and analytics.
- Exit criteria:
  - High-risk flows have regression coverage.
  - Security posture matches the current architecture.
