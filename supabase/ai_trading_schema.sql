-- AI Trading System Database Schema Updates
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. ENHANCE PLAYBOOKS TABLE (For AI Strategies)
-- ============================================

ALTER TABLE playbooks 
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_prompt TEXT,
ADD COLUMN IF NOT EXISTS required_rules TEXT[],
ADD COLUMN IF NOT EXISTS rule_categories JSONB;

-- ============================================
-- 2. ENHANCE TRADES TABLE (For AI Scoring)
-- ============================================

ALTER TABLE trades
ADD COLUMN IF NOT EXISTS ai_setup_score DECIMAL,
ADD COLUMN IF NOT EXISTS ai_setup_notes TEXT,
ADD COLUMN IF NOT EXISTS checked_rules TEXT[],
ADD COLUMN IF NOT EXISTS execution_grade TEXT;

-- ============================================
-- 3. BACKTEST RESULTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS backtest_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  strategy_id UUID REFERENCES playbooks(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_trades INTEGER,
  win_rate DECIMAL,
  profit_factor DECIMAL,
  total_pnl DECIMAL,
  max_drawdown DECIMAL,
  avg_r_multiple DECIMAL,
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for backtest_results
ALTER TABLE backtest_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own backtest results" ON backtest_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own backtest results" ON backtest_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own backtest results" ON backtest_results
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 4. AI INSIGHTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence DECIMAL,
  data_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for ai_insights
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights" ON ai_insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights" ON ai_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights" ON ai_insights
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 5. STRATEGY CHAT CONVERSATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS strategy_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]',
  current_strategy_id UUID REFERENCES playbooks(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for strategy_chats
ALTER TABLE strategy_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chats" ON strategy_chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chats" ON strategy_chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats" ON strategy_chats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats" ON strategy_chats
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 6. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_backtest_results_user ON backtest_results(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_results_strategy ON backtest_results(strategy_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_chats_user ON strategy_chats(user_id);
