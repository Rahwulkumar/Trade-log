-- Create prop_firms table
CREATE TABLE IF NOT EXISTS prop_firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for prop_firms
ALTER TABLE prop_firms ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read active firms
CREATE POLICY "Everyone can read active firms" ON prop_firms
  FOR SELECT USING (is_active = true);

-- Policy: Only authenticated users (admins in future) can insert/update
CREATE POLICY "Authenticated users can manage firms" ON prop_firms
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- Create prop_firm_challenges table
CREATE TABLE IF NOT EXISTS prop_firm_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES prop_firms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g. "100k Swing"
  phase_name TEXT NOT NULL, -- e.g. "Phase 1", "Funded"
  phase_order INTEGER NOT NULL DEFAULT 1,
  
  -- Rules
  initial_balance DECIMAL NOT NULL,
  daily_loss_percent DECIMAL, -- Stored as percentage e.g. 5.0 for 5%
  max_loss_percent DECIMAL,   -- Stored as percentage e.g. 10.0 for 10%
  daily_loss_amount DECIMAL,  -- Fixed amount alternative
  max_loss_amount DECIMAL,    -- Fixed amount alternative
  
  profit_target_percent DECIMAL,
  min_trading_days INTEGER,
  max_trading_days INTEGER,
  
  -- Logic
  drawdown_type TEXT CHECK (drawdown_type IN ('balance', 'equity', 'relative', 'trailing')) NOT NULL DEFAULT 'balance',
  trailing_threshold_amount DECIMAL, -- For Apex/TopStep trailing drawdown stop point
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for prop_firm_challenges
ALTER TABLE prop_firm_challenges ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read active challenges
CREATE POLICY "Everyone can read active challenges" ON prop_firm_challenges
  FOR SELECT USING (is_active = true);

-- Policy: Authenticated users can manage challenges
CREATE POLICY "Authenticated users can manage challenges" ON prop_firm_challenges
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- Alter prop_accounts to link to challenges
ALTER TABLE prop_accounts 
ADD COLUMN IF NOT EXISTS challenge_id UUID REFERENCES prop_firm_challenges(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS current_phase_status TEXT CHECK (current_phase_status IN ('in_progress', 'passed', 'failed')) DEFAULT 'in_progress',
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_prop_firm_challenges_firm_id ON prop_firm_challenges(firm_id);
CREATE INDEX IF NOT EXISTS idx_prop_accounts_challenge_id ON prop_accounts(challenge_id);
