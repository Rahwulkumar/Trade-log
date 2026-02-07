# Terminal Farm Setup Guide

## Overview

The Trading Journal now uses **Terminal Farm** - a self-hosted Docker-based system for syncing MT5 trades. This replaces the old MetaAPI Cloud integration.

## Architecture

```
┌─────────────────┐
│  Trading Journal│
│   (Next.js App) │
└────────┬────────┘
         │
         │ 1. User creates prop account
         │ 2. User adds MT5 credentials
         │ 3. System creates terminal instance
         │
         ▼
┌─────────────────┐
│   Supabase DB   │
│  - prop_accounts │
│  - mt5_accounts │
│  - terminal_     │
│    instances     │
└────────┬────────┘
         │
         │ 4. Orchestrator polls for config
         │
         ▼
┌─────────────────┐
│  Orchestrator   │
│  (Python/Docker)│
│  - Polls /api/  │
│    orchestrator/│
│    config        │
│  - Manages       │
│    containers    │
└────────┬────────┘
         │
         │ 5. Creates/stops Docker containers
         │
         ▼
┌─────────────────┐
│  Docker Container│
│  - MT5 Terminal  │
│  - WINE (Linux)  │
│  - EA (MQL5)     │
└────────┬────────┘
         │
         │ 6. EA syncs trades via webhooks
         │
         ▼
┌─────────────────┐
│  Webhook Routes │
│  /api/webhook/  │
│  terminal/*     │
└─────────────────┘
```

## Prerequisites

### 1. MetaTrader 5 Account
You need:
- **MT5 Account Number** (Login)
- **MT5 Server** (e.g., `ICMarketsSC-Demo`, `FTMO-Demo`)
- **MT5 Password** (Investor/Read-only password recommended for safety)

### 2. Infrastructure Setup (Required for Auto-Sync)

The Terminal Farm requires a **self-hosted orchestrator** to manage Docker containers. This is **NOT set up yet** - you'll need to:

#### Option A: Self-Hosted Orchestrator (Recommended)
1. **Server Requirements:**
   - Linux server (Ubuntu 20.04+ recommended)
   - Docker & Docker Compose installed
   - Python 3.9+
   - WINE (for running MT5 on Linux)

2. **Orchestrator Setup:**
   - Python script that polls `/api/orchestrator/config` every 60 seconds
   - Creates/stops Docker containers based on terminal instances
   - Manages MT5 terminal lifecycle

3. **Environment Variables:**
   ```bash
   ORCHESTRATOR_SECRET=your-secret-key-here
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Reference Implementation:**
   - See `F:\tradetaper\terminal-farm\` for reference code
   - Docker Compose setup
   - MQL5 Expert Advisor

#### Option B: Manual Setup (For Testing)
- You can create MT5 accounts and terminal instances in the database
- But trades won't sync until the orchestrator is running

## How to Add a New Account

### Step 1: Create Prop Account

1. Go to **Prop Firm** page (`/prop-firm`)
2. Click **"Add Account"** button
3. Fill in:
   - **Firm**: Select from dropdown (e.g., FTMO, MyForexFunds)
   - **Challenge**: Select challenge type
   - **Name**: Give your account a name (e.g., "FTMO 50K Challenge")
   - **Start Date**: When you started the challenge
4. Click **"Create Account"**

This creates a `prop_accounts` record with:
- Initial balance
- Drawdown limits
- Profit targets
- Challenge rules

### Step 2: Link MT5 Account

1. Select the prop account you just created
2. Click **"Sync MT5"** button
3. In the dialog, enter:
   - **Server**: Your MT5 broker server (e.g., `ICMarketsSC-Demo`)
   - **Login**: Your MT5 account number
   - **Password**: Your MT5 password (investor password recommended)
4. Click **"Connect"**

This will:
- Create an `mt5_accounts` record (encrypted password)
- Link it to your prop account via `prop_account_id`
- Create a `terminal_instances` record with status `PENDING`
- Mark the MT5 account as `terminal_enabled = true`

### Step 3: Wait for Orchestrator (If Running)

If you have the orchestrator running:
1. Orchestrator polls `/api/orchestrator/config` every 60 seconds
2. Sees the new `PENDING` terminal instance
3. Creates a Docker container with:
   - MT5 Terminal (via WINE on Linux)
   - Expert Advisor (MQL5)
   - Decrypted credentials
4. Container starts MT5 and connects
5. EA begins syncing trades via webhooks

### Step 4: Monitor Status

Check terminal status:
- **Status**: `PENDING` → `STARTING` → `RUNNING` → `STOPPED`
- **Last Heartbeat**: Should update every 30 seconds if running
- **Last Sync**: When trades were last synced

## Current Status

### ✅ What's Working
- ✅ Prop account creation
- ✅ MT5 account linking
- ✅ Terminal instance creation
- ✅ Database schema (all migrations applied)
- ✅ Webhook endpoints for receiving trades
- ✅ Trade processing logic
- ✅ Frontend UI for account management

### ⚠️ What's Missing (For Full Functionality)
- ⚠️ **Orchestrator Service**: Python script to manage Docker containers
- ⚠️ **Docker Setup**: Container images for MT5 terminals
- ⚠️ **Expert Advisor**: MQL5 EA to sync trades (reference exists in `F:\tradetaper`)
- ⚠️ **Environment Variables**: `ORCHESTRATOR_SECRET` needs to be set

## Manual Testing (Without Orchestrator)

You can test the system by manually sending webhook payloads:

```bash
# Example: Sync trades webhook
curl -X POST http://localhost:3000/api/webhook/terminal/trades \
  -H "Content-Type: application/json" \
  -d '{
    "terminalId": "your-terminal-id",
    "trades": [
      {
        "ticket": "12345",
        "symbol": "EURUSD",
        "type": "BUY",
        "volume": 0.1,
        "openPrice": 1.1000,
        "openTime": "2026-02-06T10:00:00Z",
        "positionId": 12345,
        "entryType": 0
      }
    ]
  }'
```

## Next Steps

1. **Set up Orchestrator** (if you want auto-sync):
   - Deploy Python orchestrator script
   - Set up Docker environment
   - Configure environment variables
   - Deploy MQL5 EA

2. **Or Continue Manual Testing**:
   - Create accounts via UI
   - Manually send webhook payloads
   - Verify trades are being created

## Database Schema

### Key Tables

**prop_accounts**
- Stores prop firm challenge accounts
- Links to `mt5_accounts` via `prop_account_id`

**mt5_accounts**
- Stores MT5 credentials (encrypted)
- One per prop account
- `terminal_enabled` flag indicates if auto-sync is enabled

**terminal_instances**
- Represents a Docker container
- Status: `PENDING`, `STARTING`, `RUNNING`, `STOPPING`, `STOPPED`, `ERROR`
- Links to `mt5_accounts` via `account_id`

**trades**
- Synced trades from MT5
- Links to `prop_accounts` via `prop_account_id`
- Links to `mt5_accounts` via `mt5_account_id`

## Troubleshooting

### Terminal Status Stuck on "PENDING"
- **Cause**: Orchestrator not running or not polling
- **Fix**: Start orchestrator service or check logs

### Trades Not Syncing
- **Cause**: EA not running or webhook URL incorrect
- **Fix**: Check EA logs, verify webhook endpoint is accessible

### "Terminal Connected" but No Heartbeats
- **Cause**: Container running but EA not sending heartbeats
- **Fix**: Check EA configuration, verify webhook URL in EA

## Support

For issues or questions:
1. Check browser console for errors
2. Check server logs for API errors
3. Verify database migrations are applied
4. Verify environment variables are set
