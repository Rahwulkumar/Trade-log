-- Fix overly permissive RLS policies on prop_firms and prop_firm_challenges
-- These tables should only be managed by admins or service role, not all authenticated users

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can manage firms" ON prop_firms;
DROP POLICY IF EXISTS "Authenticated users can manage challenges" ON prop_firm_challenges;

-- Create restrictive policies for prop_firms
-- Only allow INSERT/UPDATE/DELETE via service role (admin operations)
-- SELECT remains public for active firms (existing policy is fine)

-- Note: Service role bypasses RLS, so we don't need a policy for it
-- Regular authenticated users can only SELECT active firms (existing policy)
-- Admin role check can be added later when admin system is implemented:
-- USING (auth.jwt()->>'role' = 'admin')

-- For now, only service role can manage firms (via admin client)
-- This is secure because service role key is server-side only

-- Create restrictive policies for prop_firm_challenges
-- Same approach: only service role can manage, regular users can only SELECT active challenges

-- The existing SELECT policies are fine and remain unchanged:
-- - "Everyone can read active firms" (SELECT only, for active firms)
-- - "Everyone can read active challenges" (SELECT only, for active challenges)

-- No new policies needed - service role bypasses RLS for INSERT/UPDATE/DELETE
-- Regular authenticated users will be blocked from INSERT/UPDATE/DELETE by default
-- since we removed the permissive policies
