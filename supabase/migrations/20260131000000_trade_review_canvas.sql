-- Migration: Trade Review Canvas
-- Adds chart_data JSONB for cached candles and upgrades screenshots to tagged JSONB

-- ============================================
-- 1. Add chart_data column for cached candle data
-- ============================================
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS chart_data JSONB;

COMMENT ON COLUMN public.trades.chart_data IS 'Cached 1m OHLC candles from Twelve Data API: {candles: [...], symbol: string, fetched_at: string}';

-- ============================================
-- 2. Migrate screenshots from TEXT[] to JSONB
-- ============================================

-- Step 2a: Add new JSONB column
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS screenshots_tagged JSONB DEFAULT '[]'::jsonb;

-- Step 2b: Migrate existing TEXT[] data to JSONB objects
-- Each old URL becomes {url: string, timeframe: 'Execution', timestamp: created_at}
UPDATE public.trades 
SET screenshots_tagged = (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'url', url,
        'timeframe', 'Execution',
        'timestamp', trades.created_at
      )
    ),
    '[]'::jsonb
  )
  FROM unnest(screenshots) AS url
)
WHERE screenshots IS NOT NULL 
  AND array_length(screenshots, 1) > 0;

-- Step 2c: Drop old column and rename new one
ALTER TABLE public.trades DROP COLUMN IF EXISTS screenshots;
ALTER TABLE public.trades RENAME COLUMN screenshots_tagged TO screenshots;

COMMENT ON COLUMN public.trades.screenshots IS 'Tagged screenshots: [{url: string, timeframe: "4H"|"1H"|"15M"|"Execution", timestamp: string}]';

-- ============================================
-- 3. Add index for chart_data queries (optional optimization)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_trades_chart_data_null 
ON public.trades ((chart_data IS NULL))
WHERE chart_data IS NULL;
