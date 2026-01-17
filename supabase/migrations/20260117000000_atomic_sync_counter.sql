-- Migration: Atomic sync counter function
-- Issue: C1 - Race condition in sync counter reset
-- Fix: Use PostgreSQL function with row-level locking
-- Date: 2026-01-17

-- This function atomically:
-- 1. Locks the connection row
-- 2. Checks if monthly reset is needed
-- 3. Checks if sync limit is reached
-- 4. Increments counter only if allowed
-- Returns: can_sync (boolean), current_count (integer), reset_needed (boolean)

CREATE OR REPLACE FUNCTION check_and_increment_sync(
    p_connection_id UUID,
    p_max_syncs INTEGER
) 
RETURNS TABLE(
    can_sync BOOLEAN, 
    current_count INTEGER, 
    reset_needed BOOLEAN
) AS $$
DECLARE
    v_current_syncs INTEGER;
    v_reset_date TIMESTAMPTZ;
    v_month_start TIMESTAMPTZ;
    v_needs_reset BOOLEAN := FALSE;
BEGIN
    -- Get current month start (for reset comparison)
    v_month_start := date_trunc('month', now());
    
    -- Lock the row for update (prevents concurrent access)
    SELECT syncs_this_month, syncs_reset_at 
    INTO v_current_syncs, v_reset_date
    FROM mt5_connections
    WHERE id = p_connection_id
    FOR UPDATE;
    
    -- Check if connection exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, FALSE;
        RETURN;
    END IF;
    
    -- Check if reset is needed (new month)
    IF v_reset_date < v_month_start THEN
        v_current_syncs := 0;
        v_needs_reset := TRUE;
    END IF;
    
    -- Check if limit reached
    IF v_current_syncs >= p_max_syncs THEN
        -- Update reset date if needed, but don't increment
        IF v_needs_reset THEN
            UPDATE mt5_connections
            SET syncs_reset_at = v_month_start
            WHERE id = p_connection_id;
        END IF;
        
        RETURN QUERY SELECT FALSE, v_current_syncs, v_needs_reset;
        RETURN;
    END IF;
    
    -- Increment counter atomically
    UPDATE mt5_connections
    SET 
        syncs_this_month = v_current_syncs + 1,
        syncs_reset_at = CASE WHEN v_needs_reset THEN v_month_start ELSE syncs_reset_at END,
        updated_at = now()
    WHERE id = p_connection_id;
    
    RETURN QUERY SELECT TRUE, v_current_syncs + 1, v_needs_reset;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_and_increment_sync(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_increment_sync(UUID, INTEGER) TO service_role;
