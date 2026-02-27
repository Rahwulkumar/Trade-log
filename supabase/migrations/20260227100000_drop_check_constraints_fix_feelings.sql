-- FIX-009: Remove overly strict CHECK constraint on session column
-- Application-layer validation (SESSIONS array in journal-primitives.tsx) handles this
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_session_check;

-- FIX-010: Remove overly strict CHECK constraint on market_condition column
-- Application-layer validation (MARKET_CONDITIONS array in journal-primitives.tsx) handles this
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_market_condition_check;

-- FIX-019: Migrate feelings column from TEXT to TEXT[]
-- This aligns with how setup_tags and mistake_tags work
ALTER TABLE public.trades
  ALTER COLUMN feelings TYPE TEXT[]
  USING CASE
    WHEN feelings IS NULL THEN NULL
    WHEN feelings = '' THEN ARRAY[]::TEXT[]
    ELSE ARRAY[feelings]
  END;
