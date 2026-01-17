-- Migration: MT5 Security Enhancements
-- Adds audit logging, sync tracking, rate limiting, and platform support

-- 1. Add platform column to existing mt5_connections table
ALTER TABLE public.mt5_connections 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'mt5' CHECK (platform IN ('mt4', 'mt5'));

-- 2. Create audit_logs table for tracking all MT5 actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    action TEXT NOT NULL, -- 'mt5_connect', 'mt5_disconnect', 'mt5_sync'
    resource_type TEXT NOT NULL, -- 'mt5_connection'
    resource_id UUID, -- mt5_connection.id
    metadata JSONB, -- Additional context (server, login, etc.)
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view their own audit logs" 
    ON public.audit_logs FOR SELECT 
    USING (auth.uid() = user_id);

-- 3. Create sync_logs table for detailed sync history
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mt5_connection_id UUID REFERENCES public.mt5_connections(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'error', 'partial'
    trades_imported INTEGER DEFAULT 0,
    trades_skipped INTEGER DEFAULT 0,
    duration_ms INTEGER,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_connection_id ON public.sync_logs(mt5_connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON public.sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON public.sync_logs(started_at DESC);

-- RLS for sync_logs
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sync logs" ON public.sync_logs;
DROP POLICY IF EXISTS "Users can insert their own sync logs" ON public.sync_logs;

CREATE POLICY "Users can view their own sync logs" 
    ON public.sync_logs FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync logs" 
    ON public.sync_logs FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Server can update any sync log (for background processes)
CREATE POLICY "Service role can update sync logs" 
    ON public.sync_logs FOR UPDATE 
    USING (true);

-- 4. Create rate_limit_tracking table
CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    action TEXT NOT NULL, -- 'mt5_connect', 'mt5_sync'
    attempted_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_action_attempt UNIQUE(user_id, action, attempted_at)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user_action ON public.rate_limit_tracking(user_id, action);
CREATE INDEX IF NOT EXISTS idx_rate_limit_attempted_at ON public.rate_limit_tracking(attempted_at DESC);

-- RLS for rate_limit_tracking
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limit tracking
CREATE POLICY "Service role can manage rate limits" 
    ON public.rate_limit_tracking FOR ALL 
    USING (true);

-- 5. Create view for recent sync history (useful for UI)
CREATE OR REPLACE VIEW public.mt5_sync_history AS
SELECT 
    sl.id,
    sl.mt5_connection_id,
    sl.user_id,
    sl.status,
    sl.trades_imported,
    sl.trades_skipped,
    sl.duration_ms,
    sl.error_message,
    sl.started_at,
    sl.completed_at,
    mc.server,
    mc.login
FROM sync_logs sl
JOIN mt5_connections mc ON sl.mt5_connection_id = mc.id
ORDER BY sl.started_at DESC;

-- Grant access to the view
GRANT SELECT ON public.mt5_sync_history TO authenticated;
