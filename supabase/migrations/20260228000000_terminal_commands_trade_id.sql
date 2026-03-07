-- Add optional trade_id to terminal_commands for FETCH_CANDLES (aligns Drizzle schema with DB)
ALTER TABLE public.terminal_commands
ADD COLUMN IF NOT EXISTS trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.terminal_commands.trade_id IS 'Optional: trade id for FETCH_CANDLES command completion matching';
