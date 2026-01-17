-- Migration: MetaAPI Cloud Integration
-- Run this in Supabase SQL Editor or via CLI

-- 1. Create MT5 Connections Table
-- Stores the credentials and status for the On-Demand Cloud connection
CREATE TABLE IF NOT EXISTS public.mt5_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    prop_account_id UUID REFERENCES public.prop_accounts(id) ON DELETE CASCADE UNIQUE, -- One connection per prop account
    
    -- MetaAPI Details
    meta_api_account_id TEXT UNIQUE, -- Returned from MetaAPI
    server TEXT NOT NULL,
    login TEXT NOT NULL,
    password_encrypted TEXT NOT NULL, -- AES-256 encrypted using app server key
    
    -- Sync Status
    connection_status TEXT DEFAULT 'undeployed', -- 'undeployed', 'deploying', 'deployed', 'syncing', 'error'
    last_synced_at TIMESTAMPTZ,
    error_message TEXT, -- To show "Monthly Limit Reached" or auth errors
    
    -- Budget Tracking (60 syncs/month = ~$6)
    syncs_this_month INTEGER DEFAULT 0,
    syncs_reset_at TIMESTAMPTZ DEFAULT date_trunc('month', now()),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies for mt5_connections
ALTER TABLE public.mt5_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view their own connections" ON public.mt5_connections;
DROP POLICY IF EXISTS "Users can manage their own connections" ON public.mt5_connections;
DROP POLICY IF EXISTS "Users can insert their own connections" ON public.mt5_connections;
DROP POLICY IF EXISTS "Users can update their own connections" ON public.mt5_connections;
DROP POLICY IF EXISTS "Users can delete their own connections" ON public.mt5_connections;

-- Explicit RLS policies
CREATE POLICY "Users can view their own connections" 
    ON public.mt5_connections FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections" 
    ON public.mt5_connections FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" 
    ON public.mt5_connections FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections" 
    ON public.mt5_connections FOR DELETE 
    USING (auth.uid() = user_id);


-- 2. Add MT5 specific fields to Trades table
-- These capture the full details of every trade sourced from the broker
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS external_ticket TEXT, -- The DEAL_TICKET from MT5
ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS swap NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS magic_number INTEGER;

-- 3. Prevent duplicate imports
-- We use a unique index on (external_ticket, prop_account_id) to strictly enable upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_external_ticket_prop_id 
ON public.trades(external_ticket, prop_account_id)
WHERE external_ticket IS NOT NULL;

