-- Command Center Journal Detail: bias (tf_observations), execution notes/arrays
-- No rating column. Screenshots timeframe values extended in app (W, D, 4H, 1H, 15m, 1m, 5m, Execution).

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS tf_observations JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS execution_notes TEXT,
  ADD COLUMN IF NOT EXISTS execution_arrays JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.trades.tf_observations IS 'Per-timeframe bias: keys W|D|4H|1H|15m, value { notes: string, pd_arrays: string[] }';
COMMENT ON COLUMN public.trades.execution_notes IS 'Why now? / trigger reflection';
COMMENT ON COLUMN public.trades.execution_arrays IS 'Entry confluences: array of ICT terms (e.g. FVG, iFVG, OB Retest, SMR)';

-- Document allowed screenshot timeframe values (app uses these; no enum)
COMMENT ON COLUMN public.trades.screenshots IS 'Tagged screenshots: [{url, timeframe: "W"|"D"|"4H"|"1H"|"15m"|"1m"|"5m"|"Execution", timestamp}]';
