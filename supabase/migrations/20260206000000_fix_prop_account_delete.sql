-- Migration: Fix prop account deletion issue
-- Issue: validate_prop_account_ownership trigger may interfere with cascading deletes
-- Fix: Ensure trigger only validates when prop_account_id is being set, not when it's being cleared
-- Date: 2026-02-06

-- Update the validate_prop_account_ownership function to handle NULL values correctly
-- When prop_account_id is being set to NULL (during cascading delete), we should allow it
CREATE OR REPLACE FUNCTION public.validate_prop_account_ownership()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER
AS $$
BEGIN
    -- Allow service role to bypass ownership check
    IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- If prop_account_id is NULL or being set to NULL, allow it (cascading delete scenario)
    IF NEW.prop_account_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- If prop_account_id is being changed, verify ownership
    -- Only check if the prop_account_id is actually being set (not cleared)
    IF NEW.prop_account_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.prop_accounts 
            WHERE id = NEW.prop_account_id 
            AND user_id = auth.uid()
        ) THEN
            RAISE EXCEPTION 'You do not own this prop account';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Ensure the trigger is only on INSERT/UPDATE, not DELETE
DROP TRIGGER IF EXISTS validate_trade_prop_account ON public.trades;
CREATE TRIGGER validate_trade_prop_account
    BEFORE INSERT OR UPDATE ON public.trades
    FOR EACH ROW
    WHEN (NEW.prop_account_id IS NOT NULL)  -- Only trigger when prop_account_id is not NULL
    EXECUTE FUNCTION public.validate_prop_account_ownership();

COMMENT ON FUNCTION public.validate_prop_account_ownership() IS 'Validates that users can only assign trades to their own prop accounts. Allows NULL values for cascading deletes.';
