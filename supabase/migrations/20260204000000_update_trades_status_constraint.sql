-- Migration: Update trades status constraint to uppercase
-- Aligns with code changes in Phase 2
-- Date: 2026-02-04

-- Drop existing constraint
ALTER TABLE public.trades 
DROP CONSTRAINT IF EXISTS trades_status_check;

-- Disable ownership validation trigger for migration
ALTER TABLE public.trades DISABLE TRIGGER validate_trade_prop_account;

-- Update existing data to uppercase
UPDATE public.trades 
SET status = UPPER(status)
WHERE status IN ('open', 'closed');

-- Re-enable ownership validation trigger
ALTER TABLE public.trades ENABLE TRIGGER validate_trade_prop_account;

-- Create new constraint with uppercase values
ALTER TABLE public.trades 
ADD CONSTRAINT trades_status_check 
CHECK (status IN ('OPEN', 'CLOSED'));

-- Update default value
ALTER TABLE public.trades 
ALTER COLUMN status SET DEFAULT 'OPEN';

-- Verification query (run manually to verify):
-- SELECT DISTINCT status FROM public.trades;
-- Should only show 'OPEN' and 'CLOSED'
