-- Migration: Remove MetaAPI Cloud Integration
-- Removes all MetaAPI-related tables, functions, and views
-- Terminal Farm is now the only MT5 integration method
-- Date: 2026-02-03

-- ============================================
-- PART 1: DROP DEPENDENT OBJECTS FIRST
-- ============================================

-- Drop view that references mt5_connections
DROP VIEW IF EXISTS public.mt5_sync_history;

-- Drop function that references mt5_connections
DROP FUNCTION IF EXISTS public.check_and_increment_sync(UUID);
DROP FUNCTION IF EXISTS public.check_and_increment_sync(p_connection_id UUID);
DROP FUNCTION IF EXISTS public.check_and_increment_sync(UUID, INTEGER);

-- Drop sync_logs table (depends on mt5_connections)
-- Note: sync_logs was used for MetaAPI sync tracking
-- Terminal Farm uses terminal_instances.last_sync_at instead
DROP TABLE IF EXISTS public.sync_logs CASCADE;

-- ============================================
-- PART 2: DROP MT5_CONNECTIONS TABLE
-- ============================================

-- Drop the main MetaAPI table
-- Note: Data migration to mt5_accounts was done in 20260201000000_terminal_farm_migration.sql
DROP TABLE IF EXISTS public.mt5_connections CASCADE;

-- ============================================
-- PART 3: CLEANUP COMMENTS
-- ============================================

-- Remove any comments referencing MetaAPI
COMMENT ON TABLE public.mt5_accounts IS 'MT5 accounts for Terminal Farm integration. Stores encrypted credentials for Docker-based terminal containers.';

-- ============================================
-- VERIFICATION QUERIES (commented out - run manually to verify)
-- ============================================

-- Verify mt5_connections is gone:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name = 'mt5_connections';
-- Should return 0 rows

-- Verify sync_logs is gone:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name = 'sync_logs';
-- Should return 0 rows

-- Verify check_and_increment_sync function is gone:
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_schema = 'public' AND routine_name = 'check_and_increment_sync';
-- Should return 0 rows
