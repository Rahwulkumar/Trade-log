-- Migration: Fix trades unique constraint for proper upserts
-- Issue: Partial index with WHERE clause cannot be used as ON CONFLICT target
-- Fix: Replace with full unique constraint
-- Date: 2026-01-14

-- Drop the partial unique index created in previous migrations
DROP INDEX IF EXISTS idx_trades_external_ticket_prop_id;

-- Drop constraint if it exists (for idempotency - allows re-running migration)
ALTER TABLE public.trades 
DROP CONSTRAINT IF EXISTS trades_external_ticket_prop_account_unique;

-- Create proper unique constraint
-- This allows PostgreSQL to use it as ON CONFLICT target in upserts
-- NULL values in external_ticket are allowed (for manual trades)
-- PostgreSQL treats NULL != NULL in unique constraints, so multiple (NULL, account_id) rows are allowed
-- But when external_ticket IS NOT NULL, it must be unique per prop_account_id
ALTER TABLE public.trades 
ADD CONSTRAINT trades_external_ticket_prop_account_unique 
UNIQUE (external_ticket, prop_account_id);

-- Verification query (run manually to verify):
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'trades' 
--   AND constraint_name = 'trades_external_ticket_prop_account_unique';
