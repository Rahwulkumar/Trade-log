-- Migration: Add prop_account_id to trades table
-- Run this in Supabase SQL Editor

-- Add column
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS prop_account_id UUID REFERENCES prop_accounts(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_trades_prop_account_id ON trades(prop_account_id);

-- Add feelings, observations, screenshots columns if missing (from previous migration)
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS feelings TEXT;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS screenshots TEXT[];

-- RLS: Validate prop_account_id ownership on insert/update
-- This ensures users can only assign trades to their own prop accounts
CREATE OR REPLACE FUNCTION validate_prop_account_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.prop_account_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM prop_accounts 
      WHERE id = NEW.prop_account_id AND user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'prop_account_id must belong to the authenticated user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_trade_prop_account ON trades;
CREATE TRIGGER validate_trade_prop_account
  BEFORE INSERT OR UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION validate_prop_account_ownership();
