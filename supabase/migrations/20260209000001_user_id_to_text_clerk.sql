-- Clerk user IDs are strings (e.g. user_xxx), not UUIDs.
-- Alter all user_id columns to TEXT. Drop FK to auth.users if present.

-- prop_accounts
ALTER TABLE IF EXISTS public.prop_accounts
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- playbooks
ALTER TABLE IF EXISTS public.playbooks
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- trades
ALTER TABLE IF EXISTS public.trades
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- mt5_accounts
ALTER TABLE IF EXISTS public.mt5_accounts
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- terminal_instances
ALTER TABLE IF EXISTS public.terminal_instances
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- notes
ALTER TABLE IF EXISTS public.notes
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- tags
ALTER TABLE IF EXISTS public.tags
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- journal_entries
ALTER TABLE IF EXISTS public.journal_entries
  ALTER COLUMN user_id TYPE text USING user_id::text;
