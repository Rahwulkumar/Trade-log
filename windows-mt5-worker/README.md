# Windows MT5 Worker

This worker is the planned replacement for the current terminal-farm runtime.

It runs on a native Windows machine or VPS, logs into MT5 using the official
`MetaTrader5` Python package, pulls account info / positions / history deals,
and posts normalized payloads back to the Trading Journal backend.

## Runtime model

- one worker process
- one MT5 terminal session at a time
- backend assignments fetched from:
  - `GET /api/internal/mt5-worker/assignments`
- sync payloads posted to:
  - `POST /api/internal/mt5-worker/heartbeat`
  - `POST /api/internal/mt5-worker/positions`
  - `POST /api/internal/mt5-worker/trades`

The worker currently assumes a single active assignment. If the backend returns
multiple assignments, the backend will scope the response to the requesting
worker and return at most one claimed assignment. That is intentional for the
low-cost single-worker phase from `docs/MT5_BACKEND_REWORK_PLAN.md`.

## Required environment variables

```env
TRADING_JOURNAL_URL=https://your-app.example.com
MT5_WORKER_SECRET=replace_with_backend_worker_secret
```

## Optional environment variables

```env
MT5_WORKER_ID=windows-worker-1
MT5_WORKER_HOST=windows-vps-1
POLL_INTERVAL_SECONDS=60
INITIAL_HISTORY_DAYS=90
SYNC_OVERLAP_MINUTES=5
REQUEST_TIMEOUT_SECONDS=30
MT5_INITIALIZE_TIMEOUT_MS=60000
MT5_TERMINAL_PATH=C:\\Program Files\\MetaTrader 5\\terminal64.exe
MT5_PORTABLE=false
MT5_CURSOR_STORE_PATH=state\\cursors.json
```

## Install

```powershell
cd windows-mt5-worker
powershell -ExecutionPolicy Bypass -File .\bootstrap.ps1
```

Recommended:
- Python 3.11 x64
- the worker bootstrap will use `py -3.11` automatically if it is installed

If the Windows machine cannot download packages directly, prepare a local wheelhouse on a machine with internet access:

```powershell
cd windows-mt5-worker
powershell -ExecutionPolicy Bypass -File .\prepare-wheelhouse.ps1
```

Then copy the `wheelhouse` folder to the Windows worker and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\bootstrap.ps1
```

## Run once

```powershell
.\preflight.ps1
.\run-worker.ps1 -Once
```

## Run smoke test

```powershell
.\smoke-test.ps1
```

This runs:
- preflight checks
- one sync cycle
- latest worker log/task diagnostics

## Run continuously

```powershell
python main.py
```

## Run via PowerShell wrapper

```powershell
.\run-worker.ps1
```

## Install as a scheduled task

```powershell
.\install-scheduled-task.ps1
```

This uses Windows Task Scheduler instead of a custom service wrapper, which
keeps the first deployment pass simpler and avoids introducing another runtime
dependency.

## Notes

- The worker reuses the backend importer contract already used by the EA path.
- Deal cursors are stored locally in `state/cursors.json` by default.
- No UI changes are required for this worker path.
- Worker logs are written to `logs/worker-YYYYMMDD.log`.
- Use `.\check-worker.ps1` to inspect the scheduled task and latest log.
- Use `.\preflight.ps1` before the first live run or after config changes.
- If MT5 reports `Authorization failed`, open the exact terminal from
  `MT5_TERMINAL_PATH` manually and sign into the broker account once. If the
  broker provides its own MT5 installer, use that terminal instead of the
  generic MetaQuotes install.
- Full Windows VPS deployment steps are documented in `docs/WINDOWS_MT5_WORKER_DEPLOYMENT.md`.
