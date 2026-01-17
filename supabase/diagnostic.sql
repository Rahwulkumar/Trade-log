-- DIAGNOSTIC & FIX SCRIPT
-- Run this in your Supabase SQL Editor to check and fix issues

-- Step 1: Check if trades table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'trades'
) AS trades_table_exists;

-- Step 2: Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('trades', 'playbooks', 'prop_accounts', 'profiles');

-- Step 3: Check existing policies on trades table
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'trades';

-- Step 4: If tables don't exist, create just the trades table
-- (uncomment the lines below if needed)

/*
CREATE TABLE IF NOT EXISTS trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('LONG', 'SHORT')) NOT NULL,
  entry_price DECIMAL NOT NULL,
  exit_price DECIMAL,
  stop_loss DECIMAL,
  take_profit DECIMAL,
  position_size DECIMAL NOT NULL DEFAULT 1,
  pnl DECIMAL DEFAULT 0,
  r_multiple DECIMAL,
  entry_date TIMESTAMPTZ DEFAULT NOW(),
  exit_date TIMESTAMPTZ,
  playbook_id UUID,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades" ON trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON trades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" ON trades
  FOR DELETE USING (auth.uid() = user_id);
*/

-- Step 5: Test query to see if your user can access the table
SELECT auth.uid() AS current_user_id;
