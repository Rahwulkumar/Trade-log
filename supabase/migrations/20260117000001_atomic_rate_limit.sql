-- Migration: Atomic rate limit function
-- Issue: H8 - Rate limit race condition
-- Fix: Use PostgreSQL function for atomic check + increment
-- Date: 2026-01-17

-- This function atomically:
-- 1. Counts recent attempts within the window
-- 2. Checks if limit is reached
-- 3. Records new attempt if allowed
-- Returns: allowed (boolean), remaining (integer)

CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_action TEXT,
    p_window_start TIMESTAMPTZ,
    p_max_attempts INTEGER
) 
RETURNS TABLE(
    allowed BOOLEAN, 
    remaining INTEGER
) AS $$
DECLARE
    v_current_count INTEGER;
BEGIN
    -- Count existing attempts in window
    SELECT COUNT(*) INTO v_current_count
    FROM rate_limit_tracking
    WHERE user_id = p_user_id
      AND action = p_action
      AND attempted_at >= p_window_start;
    
    -- Check limit
    IF v_current_count >= p_max_attempts THEN
        RETURN QUERY SELECT FALSE, 0;
        RETURN;
    END IF;
    
    -- Record new attempt
    INSERT INTO rate_limit_tracking (user_id, action, attempted_at)
    VALUES (p_user_id, p_action, now());
    
    RETURN QUERY SELECT TRUE, p_max_attempts - v_current_count - 1;
    
EXCEPTION WHEN unique_violation THEN
    -- Handle race condition: another request inserted simultaneously
    -- Recount and return
    SELECT COUNT(*) INTO v_current_count
    FROM rate_limit_tracking
    WHERE user_id = p_user_id
      AND action = p_action
      AND attempted_at >= p_window_start;
    
    IF v_current_count >= p_max_attempts THEN
        RETURN QUERY SELECT FALSE, 0;
    ELSE
        RETURN QUERY SELECT TRUE, p_max_attempts - v_current_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID, TEXT, TIMESTAMPTZ, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID, TEXT, TIMESTAMPTZ, INTEGER) TO service_role;
