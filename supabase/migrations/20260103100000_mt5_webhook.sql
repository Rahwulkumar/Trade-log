-- Migration: Support for Custom MT5 EA Webhook
-- Run this in Supabase SQL Editor

-- 1. Add Webhook Key to Prop Accounts
-- This key is used to authenticate requests coming from the user's MT5 terminal
ALTER TABLE public.prop_accounts 
ADD COLUMN IF NOT EXISTS webhook_key TEXT DEFAULT encode(gen_random_bytes(16), 'hex');

-- Ensure uniqueness just in case, though random bytes are sufficient usually
CREATE UNIQUE INDEX IF NOT EXISTS idx_prop_accounts_webhook_key ON public.prop_accounts(webhook_key);


-- 2. Add MT5 specific fields to Trades table
-- These fields map directly to MQL5 deal properties
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS external_ticket TEXT, -- The DEAL_TICKET from MT5
ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS swap NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS magic_number INTEGER;

-- 3. Prevent duplicate imports
-- We use a unique index on (external_ticket, prop_account_id) so that if the EA sends the same trade twice, 
-- it won't create a duplicate row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_external_ticket_prop_id 
ON public.trades(external_ticket, prop_account_id)
WHERE external_ticket IS NOT NULL;
