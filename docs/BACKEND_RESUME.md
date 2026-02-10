# Backend Resume Checklist

**Status:** Backend development is **paused** so we can focus on UI. Use this file when you return to backend work.

---

## When We Paused

- Backend (API, Terminal Farm, orchestrator) was implemented and quality-checked.
- Local backend testing was set up and documented.
- GCP deployment is **not** done yet (blocked by billing account setup).

---

## What’s Already Done

| Area | Status | Notes |
|------|--------|--------|
| **API & Supabase** | Done | Prop accounts, trades, extension, MT5 webhooks, RLS fixes, indexes |
| **Terminal Farm** | Done | `terminal-farm/` – Dockerfile, EA, start script, supervisor |
| **Orchestrator** | Done | `orchestrator/` – Python reconciliation, Docker client, config |
| **Migrations** | Done | All in `supabase/migrations/` including Terminal Farm, RLS, indexes |
| **Scripts** | Done | `scripts/setup-vm.sh`, `build-terminal-image.sh`, `deploy-orchestrator.sh`, `test-local.sh` |
| **Code quality** | Done | Audit fixes applied; integration/compat verified |
| **Local testing** | Done | See `docs/LOCAL_TESTING_GUIDE.md` |

---

## What’s Left When You Resume Backend

1. **GCP billing**  
   - Create/fix billing account (was declined before).  
   - Needed before any GCP deployment.

2. **GCP setup (after billing)**  
   - Create VM (e.g. e2-micro) for MT5 terminals: `scripts/setup-vm.sh`.  
   - Build and push terminal image: `scripts/build-terminal-image.sh`.  
   - Deploy orchestrator as Cloud Run Job + Cloud Scheduler: `scripts/deploy-orchestrator.sh`.

3. **Docs to use when resuming**  
   - `docs/LOCAL_TESTING_GUIDE.md` – local API and backend testing.  
   - `docs/TERMINAL_FARM_SETUP_GUIDE.md` – Terminal Farm architecture (if present).  
   - `docs/GCP_ORCHESTRATOR_SETUP.md` or `docs/GCP_QUICK_START.md` – GCP steps (if present).  
   - `orchestrator/README.md`, `terminal-farm/README.md` – per-component usage.

4. **Quick “where was I?” checks**  
   - Run backend locally: `npm run dev` and follow `docs/LOCAL_TESTING_GUIDE.md`.  
   - Run orchestrator locally: `scripts/test-local.sh` (Docker + env required).  
   - Confirm env: `.env.local` and orchestrator env (e.g. `TRADING_JOURNAL_URL`, `ORCHESTRATOR_SECRET`, `TERMINAL_WEBHOOK_SECRET`).

---

## Key Paths

- **API routes:** `src/app/api/`  
- **Terminal Farm:** `trading-journal/terminal-farm/`  
- **Orchestrator:** `trading-journal/orchestrator/`  
- **Migrations:** `supabase/migrations/`  
- **Scripts:** `scripts/`

---

*Last updated when pausing backend for UI work. Re-open this file when you return to backend.*
