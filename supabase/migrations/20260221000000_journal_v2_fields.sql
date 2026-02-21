-- Journal V2: Professional-grade trade fields
-- Adds MAE/MFE, session, market condition, tags, granular grading,
-- conviction rating, and post-trade reflection fields.

-- Execution quality metrics (missing from most journals)
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mae DOUBLE PRECISION;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mfe DOUBLE PRECISION;

-- Trade context
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS session TEXT
  CHECK (session IN ('London', 'New York', 'Asian', 'Pre-market', 'Overlap'));
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS market_condition TEXT
  CHECK (market_condition IN ('Trending', 'Ranging', 'Choppy', 'High Volatility'));

-- ICT-focused tag arrays (simple, fast — no junction table needed)
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS setup_tags TEXT[];
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mistake_tags TEXT[];

-- Edgewonk-style granular grading (entry, exit, management separately)
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS entry_rating TEXT
  CHECK (entry_rating IN ('Good', 'Neutral', 'Poor'));
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS exit_rating TEXT
  CHECK (exit_rating IN ('Good', 'Neutral', 'Poor'));
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS management_rating TEXT
  CHECK (management_rating IN ('Good', 'Neutral', 'Poor'));

-- Conviction at entry (1-5 stars)
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS conviction SMALLINT
  CHECK (conviction BETWEEN 1 AND 5);

-- Post-trade reflection
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS lesson_learned TEXT;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS would_take_again BOOLEAN;
