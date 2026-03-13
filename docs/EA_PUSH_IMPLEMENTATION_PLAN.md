# EA Push Implementation Plan

## Summary

This plan replaces the primary MT5 runtime path with a native MQL5 Expert Advisor
running inside the desktop FundingPips MT5 terminal. The EA posts directly to
the existing backend terminal webhook routes.

The UI remains unchanged.

The key design decision is to reuse the existing terminal webhook routes and the
existing hardened importer in `src/lib/terminal-farm/service.ts` instead of
building a parallel ingestion pipeline.

## What Stays

- Existing UI pages and flows
- Existing DB schema
- Existing `trades` import/reconciliation logic
- Existing terminal webhook routes:
  - `POST /api/webhook/terminal/heartbeat`
  - `POST /api/webhook/terminal/trades`
  - `POST /api/webhook/terminal/positions`
- Existing webhook secret model using `TERMINAL_WEBHOOK_SECRET`

## What Changes

- `windows-mt5-worker/` stops being the primary runtime path
- `terminal-farm/` stops being the primary runtime path
- A desktop EA becomes the sync runtime
- `TradeTaperSync.mq5` is adapted into a desktop EA version with simpler config

## Why This Path

- Avoids Python MT5 IPC entirely
- Avoids Docker/Wine/orchestrator complexity
- Reuses proven importer logic already in the app
- Keeps the frontend and DB contract stable
- Lowest-cost path that still uses native MT5

## Critical Constraints From The Existing Code

### Terminal identity

The current backend contract resolves all sync by `terminalId`, not MT5 login.

Required in all payloads:

- `terminalId` as a UUID string

This matches:

- `src/lib/terminal-farm/types.ts`
- `src/lib/terminal-farm/validation.ts`

### Timestamp format

Do not switch to Unix timestamps in Phase 1.

The current importer expects string timestamps and already parses the MT5-style
formats emitted by the existing EA. Reusing that format minimizes risk.

### Backend ingress

Do not create new `/api/webhook/mt5-ea/*` routes in Phase 1.

The current routes already provide:

- auth
- JSON parsing
- Zod validation
- rate limiting
- importer handoff

Using those routes gives the fastest validation path.

## Existing Backend Contract To Reuse

### Heartbeat payload

Route:

- `POST /api/webhook/terminal/heartbeat`

Shape:

```json
{
  "terminalId": "uuid",
  "accountInfo": {
    "balance": 10000.0,
    "equity": 10045.5,
    "margin": 120.0,
    "freeMargin": 9925.5
  },
  "sessionInfo": {
    "login": "11603204",
    "server": "FundingPips2-SIM",
    "accountName": "Account Name",
    "company": "FundingPips",
    "currency": "USD"
  },
  "syncState": {
    "totalDeals": 12,
    "openPositions": 1,
    "lastHistorySyncAt": "2026.03.12 15:00:00",
    "lastHistorySyncReason": "poll"
  }
}
```

### Trades payload

Route:

- `POST /api/webhook/terminal/trades`

Shape:

```json
{
  "terminalId": "uuid",
  "trades": [
    {
      "ticket": "98001",
      "symbol": "EURUSD",
      "type": "BUY",
      "volume": 0.1,
      "openPrice": 1.085,
      "commission": -0.7,
      "swap": 0.0,
      "profit": 0.0,
      "openTime": "2026.03.12 10:30:00",
      "comment": "",
      "positionId": "100001",
      "magic": 0,
      "entryType": 0,
      "reason": 0,
      "stopLoss": 1.082,
      "takeProfit": 1.09,
      "contractSize": 100000
    }
  ]
}
```

Important notes:

- The importer keys dedupe by `ticket` through `externalDealId`
- `positionId` is required for the best reconciliation behavior
- `entryType` values:
  - `0` = IN
  - `1` = OUT
  - `2` = INOUT

### Positions payload

Route:

- `POST /api/webhook/terminal/positions`

Shape:

```json
{
  "terminalId": "uuid",
  "positions": [
    {
      "ticket": "100001",
      "positionId": "100001",
      "symbol": "EURUSD",
      "type": "BUY",
      "volume": 0.1,
      "openPrice": 1.085,
      "currentPrice": 1.0862,
      "profit": 12.0,
      "openTime": "2026.03.12 10:30:00",
      "stopLoss": 1.082,
      "takeProfit": 1.09,
      "swap": 0.0,
      "comment": ""
    }
  ]
}
```

## EA Runtime Design

### Source file

Start from:

- `terminal-farm/ea/TradeTaperSync.mq5`

Do not rewrite from zero.

### Keep

- HTTP request wrapper
- heartbeat builder
- history sync builder
- positions snapshot builder
- incremental sync state using MT5 global variables

### Remove or simplify

- terminal-farm runtime config loading from container-specific paths
- bridge outbox fallback
- terminal-farm startup/command queue assumptions
- candle fetch handling for Phase 1

### New EA file

Create:

- `ea/TradingJournalSync.mq5`

### Inputs

```mq5
input string BackendURL = "";
input string APIKey = "";
input string TerminalId = "";
input int HeartbeatInterval = 15;
input int SyncInterval = 15;
input int HistorySyncBatchSize = 200;
```

## Event Model

### Do not do heavy HTTP in `OnTradeTransaction()`

Use:

- `OnTradeTransaction()` to set a dirty flag only
- `OnTimer()` to perform HTTP sync

### Recommended behavior

#### `OnInit()`

1. validate `BackendURL`, `APIKey`, `TerminalId`
2. restore sync cursor from MT5 global variables
3. do initial:
   - heartbeat
   - positions snapshot
   - deal history sync
4. start timer

#### `OnTradeTransaction()`

If transaction is deal-related:

- set `gDirtyTrades = true`
- return immediately

#### `OnTimer()`

Every tick:

1. send heartbeat
2. send positions snapshot
3. if dirty flag is set:
   - sync deal history using overlap window
   - clear dirty flag only on successful sync

#### `OnDeinit()`

- optional best-effort final heartbeat
- backend must still rely on missed-heartbeat detection for stale status

## Sync Semantics

### Positions

Send positions on every timer tick, not only when dirty.

Reason:

- floating PnL and current price change continuously without a trade event

### Trade history

Use overlap window plus dedupe.

Suggested behavior:

- restore `lastSyncTime`
- query from `lastSyncTime - 1 day` or another safe overlap
- backend dedupes by deal ticket

This matches the current EA behavior and works with the existing importer.

## Authentication

Reuse the existing terminal webhook secret:

- header: `x-api-key`
- env: `TERMINAL_WEBHOOK_SECRET`

Do not add a separate `MT5_EA_WEBHOOK_SECRET` in Phase 1.

Reason:

- simpler
- already supported by the existing routes
- fewer moving parts during validation

## MT5 Terminal Setup

The EA must run inside the desktop FundingPips MT5 terminal.

One-time setup:

1. open FundingPips MT5 desktop terminal
2. go to `Tools -> Options -> Expert Advisors`
3. enable `Allow WebRequest for listed URL`
4. add the backend origin
5. compile `TradingJournalSync.mq5`
6. attach it to one chart
7. fill:
   - `BackendURL`
   - `APIKey`
   - `TerminalId`

## Validation Gates

### Phase 0: contract validation

Before changing the EA:

1. post a sample heartbeat payload to the existing route
2. post a sample positions payload
3. post a sample trades payload
4. verify:
   - auth works
   - validation passes
   - importer updates the existing DB/UI path

### Phase 1: EA adaptation

Adapt `TradeTaperSync.mq5` into `TradingJournalSync.mq5` with:

- no bridge
- no container config assumptions
- timer-driven positions snapshots
- dirty-flag trade sync

### Phase 2: desktop MT5 validation

Attach EA to the FundingPips terminal and verify:

1. heartbeat succeeds
2. positions snapshot succeeds
3. one opened trade appears in positions
4. one closed trade appears in imported trades
5. repeated timer ticks do not create duplicates

## Failure Rules

### Backend non-200

- log locally in MT5
- keep dirty flag set
- retry on next timer tick

### Duplicate payloads

- backend dedupes on trade deal ticket

### Missed trade event

- timer-driven overlap sync catches it later

### EA restart

- restore cursor from MT5 global variables

### MT5 closed

- heartbeat stops
- backend should mark terminal stale based on missed heartbeats

## What We Will Not Do In Phase 1

- no new DB tables
- no UI changes
- no new parallel importer
- no new EA-only webhook routes
- no worker assignment model in the EA path
- no candle sync
- no command queue usage

## Deliverables

1. `docs/EA_PUSH_IMPLEMENTATION_PLAN.md`
2. `ea/TradingJournalSync.mq5`
3. validated backend contract using existing webhook routes
4. one real MT5 desktop validation cycle

## Exit Criteria

The EA-push path is accepted only if all of these are true:

1. desktop EA posts heartbeat successfully
2. desktop EA posts positions successfully
3. desktop EA posts trade history successfully
4. one trade open/close round-trip appears correctly in the existing UI
5. repeated timer ticks do not create duplicate trades
6. no UI changes are required
