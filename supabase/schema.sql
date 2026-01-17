-- Trading Journal Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  default_risk_percent DECIMAL DEFAULT 1.0,
  default_rr_ratio DECIMAL DEFAULT 2.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playbooks (must create before trades due to FK)
CREATE TABLE IF NOT EXISTS playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rules TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trades
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('LONG', 'SHORT')) NOT NULL,
  entry_price DECIMAL NOT NULL,
  exit_price DECIMAL,
  stop_loss DECIMAL,
  take_profit DECIMAL,
  position_size DECIMAL NOT NULL,
  pnl DECIMAL DEFAULT 0,
  r_multiple DECIMAL,
  entry_date TIMESTAMPTZ NOT NULL,
  exit_date TIMESTAMPTZ,
  playbook_id UUID REFERENCES playbooks(id) ON DELETE SET NULL,
  prop_account_id UUID REFERENCES prop_accounts(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  notes TEXT,
  feelings TEXT,
  observations TEXT,
  screenshots TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prop Accounts
CREATE TABLE IF NOT EXISTS prop_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  firm TEXT NOT NULL,
  phase TEXT NOT NULL,
  initial_balance DECIMAL NOT NULL,
  current_balance DECIMAL NOT NULL,
  daily_dd_current DECIMAL DEFAULT 0,
  daily_dd_max DECIMAL,
  total_dd_current DECIMAL DEFAULT 0,
  total_dd_max DECIMAL,
  profit_target DECIMAL,
  start_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  content JSONB,
  entry_date DATE NOT NULL,
  entry_type TEXT CHECK (entry_type IN ('daily', 'weekly', 'trade')),
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  folder_id UUID,
  is_favorite BOOLEAN DEFAULT false,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT
);

-- Trade Tags (many-to-many)
CREATE TABLE IF NOT EXISTS trade_tags (
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (trade_id, tag_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_entry_date ON trades(entry_date);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_playbook_id ON trades(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_user_id ON playbooks(user_id);
CREATE INDEX IF NOT EXISTS idx_prop_accounts_user_id ON prop_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON journal_entries(entry_date);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE prop_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_tags ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trades policies
CREATE POLICY "Users can view own trades" ON trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON trades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" ON trades
  FOR DELETE USING (auth.uid() = user_id);

-- Playbooks policies
CREATE POLICY "Users can view own playbooks" ON playbooks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playbooks" ON playbooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playbooks" ON playbooks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own playbooks" ON playbooks
  FOR DELETE USING (auth.uid() = user_id);

-- Prop accounts policies
CREATE POLICY "Users can view own prop accounts" ON prop_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prop accounts" ON prop_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prop accounts" ON prop_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prop accounts" ON prop_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Journal entries policies
CREATE POLICY "Users can view own journal entries" ON journal_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal entries" ON journal_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries" ON journal_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries" ON journal_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Tags policies
CREATE POLICY "Users can view own tags" ON tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags" ON tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags" ON tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" ON tags
  FOR DELETE USING (auth.uid() = user_id);

-- Trade tags policies (user must own the trade)
CREATE POLICY "Users can view own trade tags" ON trade_tags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM trades WHERE trades.id = trade_id AND trades.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own trade tags" ON trade_tags
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM trades WHERE trades.id = trade_id AND trades.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own trade tags" ON trade_tags
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM trades WHERE trades.id = trade_id AND trades.user_id = auth.uid())
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate R-multiple
CREATE OR REPLACE FUNCTION calculate_r_multiple(
  entry_price DECIMAL,
  exit_price DECIMAL,
  stop_loss DECIMAL,
  direction TEXT
) RETURNS DECIMAL AS $$
BEGIN
  IF exit_price IS NULL OR stop_loss IS NULL THEN
    RETURN NULL;
  END IF;
  
  IF direction = 'LONG' THEN
    RETURN (exit_price - entry_price) / NULLIF(entry_price - stop_loss, 0);
  ELSE
    RETURN (entry_price - exit_price) / NULLIF(stop_loss - entry_price, 0);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-calculate R-multiple on trade update
CREATE OR REPLACE FUNCTION update_r_multiple()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.exit_price IS NOT NULL AND NEW.stop_loss IS NOT NULL THEN
    NEW.r_multiple := calculate_r_multiple(
      NEW.entry_price,
      NEW.exit_price,
      NEW.stop_loss,
      NEW.direction
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for R-multiple calculation
DROP TRIGGER IF EXISTS trade_r_multiple_trigger ON trades;
CREATE TRIGGER trade_r_multiple_trigger
  BEFORE INSERT OR UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_r_multiple();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- VIEWS
-- ============================================

-- Trade analytics view
CREATE OR REPLACE VIEW trade_analytics AS
SELECT 
  user_id,
  COUNT(*) as total_trades,
  COUNT(*) FILTER (WHERE pnl > 0) as winning_trades,
  COUNT(*) FILTER (WHERE pnl < 0) as losing_trades,
  COALESCE(SUM(pnl), 0) as total_pnl,
  COALESCE(AVG(pnl), 0) as avg_pnl,
  COALESCE(AVG(r_multiple), 0) as avg_r_multiple,
  COALESCE(
    SUM(pnl) FILTER (WHERE pnl > 0) / NULLIF(ABS(SUM(pnl) FILTER (WHERE pnl < 0)), 0),
    0
  ) as profit_factor
FROM trades
WHERE status = 'closed'
GROUP BY user_id;

-- ============================================
-- STORAGE BUCKETS (optional - for avatars)
-- ============================================

-- Run these in Storage section of Supabase dashboard:
-- 1. Create bucket 'avatars' with public access
-- 2. Create policy for authenticated users to upload their own avatar
