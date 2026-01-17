-- Add journal fields to trades table
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS feelings text,
ADD COLUMN IF NOT EXISTS observations text;

-- Create an index for faster searching if needed later (optional but good practice)
-- CREATE INDEX IF NOT EXISTS idx_trades_entry_date ON public.trades(entry_date);
