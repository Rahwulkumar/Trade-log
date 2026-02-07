-- Migration: Terminal Farm Infrastructure
-- Creates terminal_instances table for managing MT5 terminal containers

-- ============================================
-- 1. Terminal Instances Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.terminal_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.mt5_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Container Management
    container_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'STARTING', 'RUNNING', 'STOPPING', 'STOPPED', 'ERROR')),
    terminal_port INTEGER,
    
    -- Health Tracking
    last_heartbeat TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one terminal per account
CREATE UNIQUE INDEX IF NOT EXISTS idx_terminal_instances_account_id 
ON public.terminal_instances(account_id);

-- Index for orchestrator queries (find all running terminals)
CREATE INDEX IF NOT EXISTS idx_terminal_instances_status 
ON public.terminal_instances(status);

-- ============================================
-- 2. Command Queue Table (for EA commands)
-- ============================================

CREATE TABLE IF NOT EXISTS public.terminal_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terminal_id UUID NOT NULL REFERENCES public.terminal_instances(id) ON DELETE CASCADE,
    command TEXT NOT NULL, -- e.g., 'FETCH_CANDLES'
    payload TEXT, -- e.g., 'EURUSD,1m,2024-01-01 00:00:00,2024-01-01 12:00:00,trade-uuid'
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DISPATCHED', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    dispatched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Index for fetching pending commands
CREATE INDEX IF NOT EXISTS idx_terminal_commands_pending 
ON public.terminal_commands(terminal_id, status) 
WHERE status = 'PENDING';

-- Note: terminal_enabled column is already defined in mt5_accounts table creation
-- (see 20260201000000_terminal_farm_migration.sql)

-- ============================================
-- 4. RLS Policies
-- ============================================

ALTER TABLE public.terminal_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminal_commands ENABLE ROW LEVEL SECURITY;

-- Users can view their own terminal instances
CREATE POLICY "Users can view own terminals"
ON public.terminal_instances FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own terminals (via API)
CREATE POLICY "Users can create own terminals"
ON public.terminal_instances FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own terminals
CREATE POLICY "Users can update own terminals"
ON public.terminal_instances FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own terminals
CREATE POLICY "Users can delete own terminals"
ON public.terminal_instances FOR DELETE
USING (auth.uid() = user_id);

-- Service role can do everything (for webhooks)
CREATE POLICY "Service role full access terminals"
ON public.terminal_instances FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access commands"
ON public.terminal_commands FOR ALL
USING (auth.role() = 'service_role');

-- ============================================
-- 5. Trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_terminal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_terminal_instances_updated_at
    BEFORE UPDATE ON public.terminal_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_terminal_updated_at();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE public.terminal_instances IS 'Tracks MT5 terminal containers managed by the Terminal Farm orchestrator';
COMMENT ON TABLE public.terminal_commands IS 'Queue of commands to be dispatched to MT5 terminals (e.g., FETCH_CANDLES)';
COMMENT ON COLUMN public.terminal_instances.status IS 'PENDING: Waiting to start, STARTING: Container initializing, RUNNING: EA connected, STOPPING: Shutting down, STOPPED: Terminated, ERROR: Failed';
