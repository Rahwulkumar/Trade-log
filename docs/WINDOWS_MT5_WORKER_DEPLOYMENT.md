# Windows MT5 Worker Deployment

This is the concrete deployment path for the backend rework on
`backend/windows-mt5-python-rework`.

## Scope

- no UI changes
- native Windows MT5 runtime
- official `MetaTrader5` Python package
- one worker process
- one scheduled task

## Prerequisites

1. A Windows VPS with RDP access
2. Python 3.11 x64 on `PATH` (preferred)
3. MetaTrader 5 installed natively
4. The broker account can log in successfully inside that MT5 terminal
5. The Trading Journal app is reachable from the VPS

## Files to use

- `windows-mt5-worker/bootstrap.ps1`
- `windows-mt5-worker/run-worker.ps1`
- `windows-mt5-worker/install-scheduled-task.ps1`
- `windows-mt5-worker/check-worker.ps1`
- `windows-mt5-worker/preflight.ps1`
- `windows-mt5-worker/smoke-test.ps1`
- `windows-mt5-worker/.env.example`

## Initial setup

```powershell
cd F:\TradingJournal\trading-journal\windows-mt5-worker
powershell -ExecutionPolicy Bypass -File .\bootstrap.ps1
notepad .env
```

If the Windows machine cannot reach PyPI directly, prepare the dependencies on another machine:

```powershell
cd F:\TradingJournal\trading-journal\windows-mt5-worker
powershell -ExecutionPolicy Bypass -File .\prepare-wheelhouse.ps1
```

Copy the generated `wheelhouse` directory to the worker machine and rerun:

```powershell
cd F:\TradingJournal\trading-journal\windows-mt5-worker
powershell -ExecutionPolicy Bypass -File .\bootstrap.ps1
```

## Required `.env` values

```env
TRADING_JOURNAL_URL=https://your-app.example.com
MT5_WORKER_SECRET=replace_with_backend_worker_secret
MT5_WORKER_ID=windows-worker-1
MT5_WORKER_HOST=windows-vps-1
MT5_TERMINAL_PATH=C:\Program Files\MetaTrader 5\terminal64.exe
```

## Recommended optional values

```env
POLL_INTERVAL_SECONDS=60
INITIAL_HISTORY_DAYS=90
SYNC_OVERLAP_MINUTES=5
REQUEST_TIMEOUT_SECONDS=30
MT5_INITIALIZE_TIMEOUT_MS=60000
MT5_PORTABLE=false
MT5_CURSOR_STORE_PATH=state\cursors.json
```

## First verification

Run preflight first, then one sync cycle manually before installing the scheduled task:

```powershell
cd F:\TradingJournal\trading-journal\windows-mt5-worker
.\preflight.ps1
.\run-worker.ps1 -Once
```

Or run the combined smoke test:

```powershell
cd F:\TradingJournal\trading-journal\windows-mt5-worker
.\smoke-test.ps1
```

Expected result:

1. `preflight.ps1` validates:
   - `.env` presence
   - virtual environment presence
   - `MetaTrader5` Python package import
   - backend assignment fetch with the configured worker secret
2. `run-worker.ps1 -Once` validates:
   - MT5 initializes and logs in
   - heartbeat posts successfully
   - positions post successfully
   - trades post successfully or reports no new deals

## Install persistent startup

```powershell
cd F:\TradingJournal\trading-journal\windows-mt5-worker
.\install-scheduled-task.ps1
```

This creates:

- scheduled task name: `TradingJournal-MT5Worker`
- startup trigger
- logon trigger
- automatic retry on failure

## Check status

```powershell
cd F:\TradingJournal\trading-journal\windows-mt5-worker
.\check-worker.ps1
```

This shows:

- scheduled task status
- last run time
- last task result
- tail of the latest worker log

## Logs

Worker output is written to:

```text
windows-mt5-worker\logs\worker-YYYYMMDD.log
```

## Backend env required on the app side

```env
MT5_SYNC_PROVIDER=windows_mt5_python
MT5_WORKER_SECRET=the_same_secret_used_on_the_worker
```

## Exact operator inputs

### App `.env.local`

```env
MT5_SYNC_PROVIDER=windows_mt5_python
MT5_WORKER_SECRET=<shared secret for the worker>
```

### Worker `.env`

```env
TRADING_JOURNAL_URL=https://<your-app-domain>
MT5_WORKER_SECRET=<same shared secret as app .env.local>
MT5_WORKER_ID=windows-worker-1
MT5_WORKER_HOST=<windows machine name or VPS label>
POLL_INTERVAL_SECONDS=60
INITIAL_HISTORY_DAYS=90
SYNC_OVERLAP_MINUTES=5
REQUEST_TIMEOUT_SECONDS=30
MT5_INITIALIZE_TIMEOUT_MS=60000
MT5_TERMINAL_PATH=C:\Program Files\MetaTrader 5\terminal64.exe
MT5_PORTABLE=false
MT5_CURSOR_STORE_PATH=state\cursors.json
```

## Operational notes

1. The worker uses backend assignments and only claims one running terminal at a time.
2. A stale assignment can be reclaimed by another worker after heartbeat expiry.
3. The worker persists incremental deal cursors on disk.
4. The existing backend importer and UI status routes are reused.
5. The old terminal-farm Docker/orchestrator path is not used for `windows_mt5_python` terminals.

## Failure checklist

If sync does not appear in the app, check in this order:

1. `.\check-worker.ps1`
2. `.\preflight.ps1`
3. worker `.env`
4. MT5 terminal can log in manually
   - if the worker reports `Authorization failed`, open the exact `MT5_TERMINAL_PATH`
     terminal manually and log into the broker account once
   - if FundingPips provides a broker-specific MT5 installer, use that terminal
     instead of the generic MetaQuotes install
5. backend `MT5_WORKER_SECRET` matches the worker
6. backend `MT5_SYNC_PROVIDER=windows_mt5_python`
7. app terminal-status endpoint shows recent heartbeat and diagnostics
