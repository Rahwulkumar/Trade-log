-- Migration: Security Fixes
-- Addresses Supabase linter security warnings and errors

-- ============================================
-- 1. FIX: SECURITY DEFINER Views (ERROR)
-- Change to SECURITY INVOKER for proper RLS enforcement
-- ============================================

-- Recreate trade_analytics view without SECURITY DEFINER
DROP VIEW IF EXISTS public.trade_analytics;
CREATE OR REPLACE VIEW public.trade_analytics
WITH (security_invoker = true)
AS
SELECT 
    user_id,
    COUNT(*) as total_trades,
    COUNT(*) FILTER (WHERE pnl > 0) as winning_trades,
    COUNT(*) FILTER (WHERE pnl < 0) as losing_trades,
    COALESCE(SUM(pnl), 0) as total_pnl,
    COALESCE(AVG(pnl), 0) as avg_pnl,
    COALESCE(AVG(r_multiple), 0) as avg_r_multiple,
    COALESCE(
        SUM(pnl) FILTER (WHERE pnl > 0) / NULLIF(ABS(SUM(pnl) FILTER (WHERE pnl < 0)), 0),
        0
    ) as profit_factor
FROM public.trades
WHERE status = 'closed'
GROUP BY user_id;

-- Recreate mt5_sync_history view without SECURITY DEFINER (if it exists)
DROP VIEW IF EXISTS public.mt5_sync_history;
-- Note: If you need this view, recreate it with security_invoker = true

-- ============================================
-- 2. FIX: Function Search Path Mutable (WARN)
-- Set immutable search_path for all functions
-- ============================================

-- Fix: calculate_r_multiple
CREATE OR REPLACE FUNCTION public.calculate_r_multiple(
    entry_price DECIMAL,
    exit_price DECIMAL,
    stop_loss DECIMAL,
    direction TEXT
) RETURNS DECIMAL 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF exit_price IS NULL OR stop_loss IS NULL THEN
        RETURN NULL;
    END IF;
    
    IF direction = 'LONG' THEN
        RETURN (exit_price - entry_price) / NULLIF(entry_price - stop_loss, 0);
    ELSE
        RETURN (entry_price - exit_price) / NULLIF(stop_loss - entry_price, 0);
    END IF;
END;
$$;

-- Fix: update_r_multiple trigger function
CREATE OR REPLACE FUNCTION public.update_r_multiple()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NEW.exit_price IS NOT NULL AND NEW.stop_loss IS NOT NULL THEN
        NEW.r_multiple := public.calculate_r_multiple(
            NEW.entry_price,
            NEW.exit_price,
            NEW.stop_loss,
            NEW.direction
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Fix: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name'
    );
    RETURN NEW;
END;
$$;

-- Fix: validate_prop_account_ownership
CREATE OR REPLACE FUNCTION public.validate_prop_account_ownership()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    -- Verify the user owns the prop_account before allowing insert
    IF NOT EXISTS (
        SELECT 1 FROM public.prop_accounts 
        WHERE id = NEW.prop_account_id 
        AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'You do not own this prop account';
    END IF;
    RETURN NEW;
END;
$$;

-- Fix: check_and_increment_sync
CREATE OR REPLACE FUNCTION public.check_and_increment_sync(p_connection_id UUID)
RETURNS TABLE(can_sync BOOLEAN, current_count INTEGER, max_syncs INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_syncs_this_month INTEGER;
    v_syncs_reset_at TIMESTAMPTZ;
    v_max_syncs INTEGER := 60;
BEGIN
    -- Get current sync count
    SELECT syncs_this_month, syncs_reset_at
    INTO v_syncs_this_month, v_syncs_reset_at
    FROM public.mt5_connections
    WHERE id = p_connection_id;

    -- Reset counter if new month
    IF date_trunc('month', v_syncs_reset_at) < date_trunc('month', now()) THEN
        UPDATE public.mt5_connections
        SET syncs_this_month = 0, syncs_reset_at = now()
        WHERE id = p_connection_id;
        v_syncs_this_month := 0;
    END IF;

    -- Check if can sync
    IF v_syncs_this_month >= v_max_syncs THEN
        RETURN QUERY SELECT FALSE, v_syncs_this_month, v_max_syncs;
        RETURN;
    END IF;

    -- Increment counter atomically
    UPDATE public.mt5_connections
    SET syncs_this_month = syncs_this_month + 1
    WHERE id = p_connection_id;

    RETURN QUERY SELECT TRUE, v_syncs_this_month + 1, v_max_syncs;
END;
$$;

-- Fix: check_rate_limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_action TEXT,
    p_max_requests INTEGER,
    p_window_seconds INTEGER
)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count INTEGER;
    v_window_start TIMESTAMPTZ;
BEGIN
    v_window_start := now() - (p_window_seconds || ' seconds')::INTERVAL;

    -- Count requests in window
    SELECT COUNT(*) INTO v_count
    FROM public.rate_limit_tracking
    WHERE user_id = p_user_id
      AND action = p_action
      AND created_at > v_window_start;

    -- If under limit, log request and return true
    IF v_count < p_max_requests THEN
        INSERT INTO public.rate_limit_tracking (user_id, action)
        VALUES (p_user_id, p_action);
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- ============================================
-- 3. FIX: Overly Permissive RLS Policies (WARN)
-- Note: Some are intentional for admin/shared data
-- ============================================

-- The prop_firms and prop_firm_challenges tables are INTENTIONALLY 
-- globally readable by authenticated users (shared reference data).
-- Add comment to document this decision:
COMMENT ON TABLE public.prop_firms IS 'Shared reference data - read by all authenticated users, write by admins';
COMMENT ON TABLE public.prop_firm_challenges IS 'Shared reference data - read by all authenticated users, write by admins';

-- For rate_limit_tracking and sync_logs, these are managed by service role
-- which bypasses RLS anyway. The policies are redundant but not harmful.
COMMENT ON TABLE public.rate_limit_tracking IS 'Managed by service role only - RLS bypassed';
COMMENT ON TABLE public.sync_logs IS 'Managed by service role only - RLS bypassed';

-- ============================================
-- 4. MANUAL FIX REQUIRED: Leaked Password Protection
-- Go to Supabase Dashboard > Authentication > Settings > Password
-- Enable "Leaked Password Protection"
-- ============================================
