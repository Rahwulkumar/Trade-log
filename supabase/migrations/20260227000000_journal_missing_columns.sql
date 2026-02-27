-- ─────────────────────────────────────────────────────────────────────────────
-- Journal Missing Columns — 2026-02-27
-- Adds all journal fields that the app expects but don't exist in the live DB.
-- All statements use ADD COLUMN IF NOT EXISTS so they are safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- Execution detail (per-timeframe bias, trigger notes, confluence arrays)
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS tf_observations   JSONB    DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS execution_notes   TEXT,
  ADD COLUMN IF NOT EXISTS execution_arrays  JSONB    DEFAULT '[]'::jsonb;

-- MAE / MFE (max adverse / favorable excursion in R)
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS mae  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS mfe  DOUBLE PRECISION;

-- Trade context
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS session           TEXT
    CHECK (session IN ('London', 'New York', 'Asian', 'Pre-market', 'Overlap')),
  ADD COLUMN IF NOT EXISTS market_condition  TEXT
    CHECK (market_condition IN ('Trending', 'Ranging', 'Choppy', 'High Volatility'));

-- ICT tag arrays  (TEXT[] — supports custom tags, no enum restriction)
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS setup_tags    TEXT[],
  ADD COLUMN IF NOT EXISTS mistake_tags  TEXT[];

-- Granular grading
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS entry_rating      TEXT CHECK (entry_rating   IN ('Good', 'Neutral', 'Poor')),
  ADD COLUMN IF NOT EXISTS exit_rating       TEXT CHECK (exit_rating    IN ('Good', 'Neutral', 'Poor')),
  ADD COLUMN IF NOT EXISTS management_rating TEXT CHECK (management_rating IN ('Good', 'Neutral', 'Poor'));

-- Conviction at entry (1–5)
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS conviction SMALLINT CHECK (conviction BETWEEN 1 AND 5);

-- Post-trade reflection
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS lesson_learned  TEXT,
  ADD COLUMN IF NOT EXISTS would_take_again BOOLEAN;

-- ─── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.trades.tf_observations  IS 'Per-timeframe bias map: { "D": { bias: "Bullish", notes: "..." }, ... }';
COMMENT ON COLUMN public.trades.execution_notes  IS 'Why did you pull the trigger? Entry trigger reflection.';
COMMENT ON COLUMN public.trades.execution_arrays IS 'ICT confluence tags selected at entry (e.g. FVG, OB, SMC)';
COMMENT ON COLUMN public.trades.setup_tags       IS 'Setup classification tags — ICT or custom (TEXT[] supports custom values)';
COMMENT ON COLUMN public.trades.mistake_tags     IS 'Mistake classification tags — ICT or custom';
