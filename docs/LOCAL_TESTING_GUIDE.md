# Local Backend Testing Guide

This guide will help you set up and test the Trading Journal backend locally.

---

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn** or **pnpm**
3. **Supabase Account** (or local Supabase instance)

---

## Step 1: Install Dependencies

```bash
cd trading-journal
npm install
```

---

## Step 2: Set Up Environment Variables

Create a `.env.local` file in the `trading-journal` directory:

```bash
# Copy the example file
cp env.example .env.local
```

Then edit `.env.local` with your Supabase credentials:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Supabase Service Role Key (Optional - for admin operations)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Terminal Farm Configuration (Optional - for terminal sync testing)
ORCHESTRATOR_SECRET=your-orchestrator-secret-here
TERMINAL_WEBHOOK_SECRET=your-webhook-secret-here

# MT5 Encryption Key (Required if using MT5 accounts)
MT5_ENCRYPTION_KEY=your-32-character-encryption-key-here

# Google AI (Optional - for AI features)
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-key-here
```

### Where to Get Supabase Credentials:

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

---

## Step 3: Run Database Migrations

Make sure your Supabase database has all the required tables. Run migrations in order:

1. Go to Supabase Dashboard → **SQL Editor**
2. Run migrations from `supabase/migrations/` in order (by date prefix)

Or use Supabase CLI (if installed):
```bash
supabase db push
```

---

## Step 4: Start the Development Server

```bash
npm run dev
```

The server will start on **http://localhost:3000**

---

## Step 5: Test Backend Endpoints

### Authentication Endpoints

#### 1. Test Login
```bash
# POST /api/auth/login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

#### 2. Test Signup
```bash
# POST /api/auth/signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "firstName": "Test", "lastName": "User"}'
```

### Trade Endpoints

#### 3. Get Trades (requires auth)
```bash
# GET /api/trades
curl http://localhost:3000/api/trades \
  -H "Cookie: your-auth-cookie-here"
```

#### 4. Create Trade
```bash
# POST /api/trades
curl -X POST http://localhost:3000/api/trades \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie-here" \
  -d '{
    "symbol": "EURUSD",
    "direction": "LONG",
    "entry_price": 1.1000,
    "position_size": 0.1,
    "entry_date": "2026-02-07T10:00:00Z"
  }'
```

### Terminal Farm Endpoints

#### 5. Get Orchestrator Config (requires orchestrator secret)
```bash
# GET /api/orchestrator/config
curl http://localhost:3000/api/orchestrator/config \
  -H "x-orchestrator-secret: your-orchestrator-secret"
```

#### 6. Test Terminal Webhook (trades)
```bash
# POST /api/webhook/terminal/trades
curl -X POST http://localhost:3000/api/webhook/terminal/trades \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-webhook-secret" \
  -d '{
    "terminalId": "test-terminal-id",
    "trades": [{
      "ticket": "12345",
      "symbol": "EURUSD",
      "type": "BUY",
      "volume": 0.1,
      "openPrice": 1.1000,
      "openTime": "2026-02-07T10:00:00Z",
      "positionId": 123,
      "entryType": 0
    }]
  }'
```

#### 7. Test Terminal Heartbeat
```bash
# POST /api/webhook/terminal/heartbeat
curl -X POST http://localhost:3000/api/webhook/terminal/heartbeat \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-webhook-secret" \
  -d '{
    "terminalId": "test-terminal-id",
    "accountInfo": {
      "balance": 10000,
      "equity": 10050,
      "margin": 100,
      "freeMargin": 9950
    }
  }'
```

---

## Step 6: Test Using Browser DevTools

1. Open **http://localhost:3000** in your browser
2. Open **Developer Tools** (F12)
3. Go to **Network** tab
4. Interact with the app (login, create trade, etc.)
5. Check API requests in the Network tab

---

## Step 7: Test Using Postman/Insomnia

1. Import the following collection or create requests manually:

### Collection: Trading Journal API

**Base URL:** `http://localhost:3000`

#### Request 1: Login
- **Method:** POST
- **URL:** `/api/auth/login`
- **Headers:**
  - `Content-Type: application/json`
- **Body:**
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

#### Request 2: Get Trades
- **Method:** GET
- **URL:** `/api/trades`
- **Headers:**
  - `Cookie: [session cookie from login]`

#### Request 3: Create Trade
- **Method:** POST
- **URL:** `/api/trades`
- **Headers:**
  - `Content-Type: application/json`
  - `Cookie: [session cookie]`
- **Body:**
```json
{
  "symbol": "EURUSD",
  "direction": "LONG",
  "entry_price": 1.1000,
  "position_size": 0.1,
  "entry_date": "2026-02-07T10:00:00Z"
}
```

---

## Step 8: Check Logs

The Next.js dev server will show:
- ✅ Successful requests
- ❌ Errors
- 📝 Console logs from `console.log()` statements

Watch the terminal where `npm run dev` is running.

---

## Common Issues & Solutions

### Issue 1: "Supabase Not Configured"
**Solution:** Make sure `.env.local` exists and has correct values.

### Issue 2: "Unauthorized" errors
**Solution:** 
- Make sure you're logged in
- Check that cookies are being sent with requests
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct

### Issue 3: Database errors
**Solution:**
- Run all migrations in Supabase SQL Editor
- Check that RLS policies are set up correctly
- Verify table names match your schema

### Issue 4: Port 3000 already in use
**Solution:**
```bash
# Use a different port
npm run dev -- -p 3001
```

---

## Testing Specific Features

### Test Terminal Farm Integration

1. **Enable Auto-Sync:**
   ```bash
   POST /api/mt5-accounts/[id]/enable-autosync
   ```

2. **Check Orchestrator Config:**
   ```bash
   GET /api/orchestrator/config
   # Headers: x-orchestrator-secret: your-secret
   ```

3. **Simulate Terminal Webhook:**
   ```bash
   POST /api/webhook/terminal/trades
   # Headers: x-api-key: your-webhook-secret
   ```

### Test Trade Processing

1. Create a trade via API
2. Check it appears in database
3. Verify calculations (PNL, R-multiple) are correct
4. Test filtering by date range, status, etc.

---

## Next Steps

Once local testing works:
1. ✅ Test all API endpoints
2. ✅ Verify database operations
3. ✅ Test authentication flow
4. ✅ Test Terminal Farm webhooks
5. ✅ Check error handling

---

*Last updated: 2026-02-07*
