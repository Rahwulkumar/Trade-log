-- Migration: Add prop_account_id to mt5_accounts
-- Links MT5 accounts to prop accounts (one MT5 account per prop account)
-- Date: 2026-02-05

-- Add prop_account_id column
ALTER TABLE public.mt5_accounts 
ADD COLUMN IF NOT EXISTS prop_account_id UUID REFERENCES public.prop_accounts(id) ON DELETE CASCADE;

-- Create unique index: one MT5 account per prop account
CREATE UNIQUE INDEX IF NOT EXISTS idx_mt5_accounts_prop_account_id 
ON public.mt5_accounts(prop_account_id)
WHERE prop_account_id IS NOT NULL;

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_mt5_accounts_prop_account_lookup 
ON public.mt5_accounts(prop_account_id)
WHERE prop_account_id IS NOT NULL;

-- Update existing mt5_accounts to link to prop_accounts if possible
-- This matches by user_id and assumes one prop account per user for now
-- (Users can manually update if they have multiple prop accounts)
UPDATE public.mt5_accounts ma
SET prop_account_id = (
    SELECT pa.id 
    FROM public.prop_accounts pa 
    WHERE pa.user_id = ma.user_id 
    ORDER BY pa.created_at DESC 
    LIMIT 1
)
WHERE ma.prop_account_id IS NULL;

COMMENT ON COLUMN public.mt5_accounts.prop_account_id IS 'Links MT5 account to prop account. One MT5 account per prop account.';
