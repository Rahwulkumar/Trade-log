# MT5 Backend Rework Plan

## Summary
Replace the current MT5 runtime stack with a native Windows worker running the official MetaTrader 5 Python integration. Keep the existing UI and frontend API contract as stable as possible. Rebuild only the backend execution path for MT5 account lifecycle, balance sync, positions sync, and historical trade ingestion.

## Primary Decision
- Keep the UI unchanged.
- Replace the MT5 backend/runtime completely.
- Do not continue with Linux/Wine terminal farm as the production path.
- Do not require MetaApi for the production path.
- Optimize for lowest recurring cost, one hosted worker, and predictable debugging.

## Goals
- Remove Docker/Wine/EA runtime fragility from the live MT5 sync path.
- Keep existing account pages, journal pages, and client API helpers stable.
- Preserve current trade importer behavior where it still fits.
- Support one worker now, but not block later multi-account or multi-user growth.
- Keep the ongoing cost as low as possible.

## Non-Goals
- No UI redesign.
- No journal analytics redesign.
- No schema-heavy rewrite unless strictly necessary.
- No broker-manager API or broker-only integrations.

## Target Architecture

### App Layer
- Existing Next.js app remains the source of truth for:
  - MT5 account creation
  - sync enable/disable
  - terminal/sync status
  - journal trade display
  - prop account balance display

### Worker Layer
- One Windows VPS runs:
  - MetaTrader 5 terminal
  - a Python sync service using the official `MetaTrader5` Python package
- The Python service handles:
  - broker login validation
  - account info reads
  - open position reads
  - history deal reads
  - incremental sync cursor management
  - posting normalized payloads to the app backend

### Backend Layer
- Existing webhook/import path is reused where practical.
- Existing UI-facing API routes remain stable.
- `terminal_instances` remains the sync-status record.
- Backend no longer depends on Docker MT5 workers for the primary sync path.

## Why This Architecture
- MT5 runs natively on Windows, not under Wine.
- Python integration is official and simpler than terminal emulation.
- Debugging is direct through Windows/RDP.
- Hosting cost is limited to the VPS and normal app hosting.
- The app/frontend does not need to be rewritten.

## Backend Boundary

### Keep
- `src/app/prop-firm/page.tsx`
- `src/app/journal/journal-client.tsx`
- `src/lib/api/terminal-farm.ts` client contract where possible
- existing trade importer and journal tables where possible
- existing account and diagnostics UI shape

### Replace
- terminal farm worker lifecycle
- orchestrator dependency for MT5 account execution
- Linux/Wine MT5 session runtime
- EA bridge as the primary production sync path
- MetaApi as the primary production sync path

## Proposed Runtime Model

### Worker Ownership
- One Windows worker process owns one MT5 terminal session.
- One MT5 account maps to one configured worker session.
- The worker is long-lived and reconnect-capable.

### Sync Strategy
- Incremental history sync only.
- No full-history sync on every poll.
- Use a persisted cursor:
  - `lastDealTime`
  - `lastDealTicket`
  - overlap window of 2 to 5 minutes to avoid missed edge cases

### Position Strategy
- Read live positions directly from MT5 Python API.
- Continue exposing live positions separately from closed trade history.
- Do not create fake trade rows for live positions.

### Balance Strategy
- Account balance/equity from MT5 updates `mt5_accounts`
- linked `prop_accounts.currentBalance` is updated from the worker sync path

## Data Model Plan

### Phase 1
- Reuse current tables:
  - `mt5_accounts`
  - `terminal_instances`
  - `trades`
- Store worker metadata inside `terminal_instances.metadata`:
  - `syncProvider = "windows_mt5_python"`
  - `workerId`
  - `workerHost`
  - `loginState`
  - `lastDealCursor`
  - `lastSuccessfulSyncAt`
  - `lastError`

### Phase 2 if needed
- Add a dedicated worker table only if multi-worker scheduling becomes necessary.

## API Contract Plan

### Frontend-Facing Routes
Keep these routes and swap their internals:
- `POST /api/mt5-accounts`
- `POST /api/mt5-accounts/[id]/enable-autosync`
- `DELETE /api/mt5-accounts/[id]/disable-autosync`
- `GET /api/mt5-accounts/[id]/terminal-status`
- `GET /api/mt5-accounts/by-prop-account/[propAccountId]/terminal-status`
- `POST /api/mt5-accounts/by-prop-account/[propAccountId]/reset-sync`

### Worker-Facing Routes
Use backend-owned authenticated routes for worker sync:
- `POST /api/internal/mt5-worker/heartbeat`
- `POST /api/internal/mt5-worker/positions`
- `POST /api/internal/mt5-worker/trades`

These should not use browser auth. They should use a dedicated worker secret.

## Sync Flow

### Enable Auto-Sync
1. User adds MT5 account.
2. Backend stores encrypted credentials.
3. Backend marks sync enabled.
4. Backend assigns or creates a worker record in `terminal_instances`.
5. Worker receives the assignment or polls for it.
6. Worker logs into MT5.
7. Worker posts heartbeat.
8. Worker posts positions.
9. Worker posts incremental deals.

### Status Refresh
1. UI requests terminal status.
2. Backend reads `terminal_instances` and metadata.
3. UI receives:
  - connected/disconnected
  - last heartbeat
  - last trade sync
  - last positions sync
  - diagnostics
  - live positions

### Disable Auto-Sync
1. Backend marks account disabled.
2. Worker stops syncing that account.
3. Backend status becomes `STOPPED`.

### Reset Sync
1. Backend preserves imported trades on the prop account.
2. Backend deletes MT5 linkage.
3. Backend clears worker metadata and sync cursor.
4. User reconnects the account cleanly.

## Worker Service Plan

### Runtime
- Python 3.x on Windows
- official `MetaTrader5` Python package
- one small background service

### Responsibilities
- Initialize MT5 terminal session
- verify login/server/account info
- detect disconnected broker state
- read:
  - account info
  - open positions
  - historical deals
- maintain local sync cursor
- post normalized payloads to the app

### Required Local State
- worker config file
- encrypted account credential source or secure env injection
- last sync cursor persisted on disk
- structured logs

### Error States
- `LOGIN_FAILED`
- `SERVER_NOT_FOUND`
- `MT5_NOT_INITIALIZED`
- `DISCONNECTED_FROM_BROKER`
- `ZERO_DEALS`
- `NO_NEW_DEALS`
- `SYNC_POST_FAILED`

## Security Plan
- Do not store plaintext API tokens in the repo.
- `.env.local` remains ignored.
- Worker secret is separate from browser auth.
- MT5 passwords remain encrypted at rest in the app DB.
- Windows worker receives only the credentials it needs.

## Cost Optimization Plan
- One Windows VPS only.
- No MetaApi subscription.
- No multi-worker pool.
- No streaming dependency.
- Status polling from the frontend only.
- Worker sync interval:
  - active account: 60 seconds
  - no aggressive high-frequency polling
- Optional later:
  - longer intervals when idle
  - scheduled sync windows

## Implementation Phases

### Phase 0: Repo Safety
- Push current state.
- Create separate branch for backend rework.
- Keep secrets out of Git.

### Phase 1: Backend Abstraction
- Introduce a provider abstraction for MT5 sync.
- Current provider labels:
  - `terminal_farm`
  - `metaapi`
  - new `windows_mt5_python`
- Move provider-specific logic behind a service interface.

### Phase 2: Worker API
- Add internal worker webhook routes.
- Add worker auth secret validation.
- Add payload validation.
- Reuse existing `processHeartbeat`, `processPositions`, `processTrades` where valid.

### Phase 3: Windows Worker
- Create Python worker project:
  - login bootstrap
  - heartbeat sender
  - positions sender
  - deals sync sender
  - cursor persistence
- Add Windows service or scheduled startup mode.

### Phase 4: Assignment and Status
- Update `enable-autosync` to assign the MT5 account to the worker backend path.
- Update status routes to show worker-origin sync state.
- Stop Docker/orchestrator from managing `windows_mt5_python` accounts.

### Phase 5: Migration Cutover
- Migrate one account first.
- Validate:
  - account info
  - live positions
  - historical deals
  - partial closes / reversals
- Only after that, disable terminal-farm as primary runtime.

### Phase 6: Cleanup
- Remove dead terminal-farm production dependencies after cutover is proven.
- Keep only what is still needed for historical code compatibility, or remove entirely.

## Testing Plan

### Unit / Type Safety
- TypeScript compile
- lint
- existing test suite remains green

### Backend Integration
- enable sync creates worker-backed terminal record
- disable sync stops worker-backed account
- status route reflects worker heartbeat
- reset sync preserves historical trades

### Worker Tests
- login success
- login failure
- zero deals
- deals imported
- positions imported
- sync retry on transient network failure

### Manual End-to-End
- add MT5 account
- enable sync
- confirm balance/equity updates
- confirm live positions show
- confirm closed trades import
- confirm partial-close and INOUT behavior

## Acceptance Criteria
- No UI rewrite required to use the new backend.
- MT5 account can sync from a hosted native Windows worker.
- Balance, positions, and deals update reliably.
- Existing journal pages continue to work.
- No Docker/Wine dependency in the primary MT5 production path.
- Cost remains limited to normal hosting plus one Windows VPS.

## Risks
- Official MT5 Python integration is Windows-bound.
- The worker machine becomes critical infrastructure.
- Some brokers may still require terminal-specific configuration or first-run manual setup.

## Rollback Plan
- Keep the current codebase state in Git before rework begins.
- Perform the backend rewrite on a separate branch.
- Do not delete legacy provider code until the new worker path is validated.

## Immediate Next Step
- Push current state to GitHub.
- Create a dedicated backend rework branch.
- Start Phase 1 by introducing the provider abstraction and worker-authenticated internal sync endpoints.
