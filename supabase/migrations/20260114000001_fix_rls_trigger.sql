-- Migration: Fix RLS trigger to allow service role (admin) inserts
-- Issue: Trigger blocks admin client from inserting trades during sync
-- Fix: Check if current user is service role before validating ownership

CREATE OR REPLACE FUNCTION validate_prop_account_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service role to bypass ownership check
  -- Service role is used by backend sync process
  IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For regular users, validate ownership
  IF NEW.prop_account_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM prop_accounts 
      WHERE id = NEW.prop_account_id AND user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'prop_account_id must belong to the authenticated user';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists, just updated the function above
