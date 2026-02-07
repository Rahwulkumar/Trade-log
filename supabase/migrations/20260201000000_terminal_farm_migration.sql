-- ============================================
-- Terminal Farm Migration
-- Migrates from MetaAPI-based MT5 system to Terminal Farm architecture
-- ============================================

-- ============================================
-- PART 1: CREATE MT5_ACCOUNTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.mt5_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    server TEXT NOT NULL,
    login TEXT NOT NULL,
    password TEXT NOT NULL, -- Encrypted with MT5_ENCRYPTION_KEY
    balance NUMERIC DEFAULT 0,
    equity NUMERIC DEFAULT 0,
    terminal_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for mt5_accounts
CREATE INDEX IF NOT EXISTS idx_mt5_accounts_user_id ON public.mt5_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_mt5_accounts_terminal_enabled ON public.mt5_accounts(terminal_enabled);
CREATE INDEX IF NOT EXISTS idx_mt5_accounts_server_login ON public.mt5_accounts(server, login);

-- RLS for mt5_accounts
ALTER TABLE public.mt5_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own mt5 accounts" ON public.mt5_accounts;
CREATE POLICY "Users can view own mt5 accounts"
ON public.mt5_accounts FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own mt5 accounts" ON public.mt5_accounts;
CREATE POLICY "Users can insert own mt5 accounts"
ON public.mt5_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own mt5 accounts" ON public.mt5_accounts;
CREATE POLICY "Users can update own mt5 accounts"
ON public.mt5_accounts FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own mt5 accounts" ON public.mt5_accounts;
CREATE POLICY "Users can delete own mt5 accounts"
ON public.mt5_accounts FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access mt5 accounts" ON public.mt5_accounts;
CREATE POLICY "Service role full access mt5 accounts"
ON public.mt5_accounts FOR ALL
USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_mt5_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mt5_accounts_updated_at ON public.mt5_accounts;
CREATE TRIGGER trigger_mt5_accounts_updated_at
    BEFORE UPDATE ON public.mt5_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_mt5_accounts_updated_at();

-- ============================================
-- PART 2: ADD TERMINAL FARM COLUMNS TO TRADES
-- ============================================

-- Add new columns for Terminal Farm
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS external_deal_id TEXT,
ADD COLUMN IF NOT EXISTS mt5_account_id UUID REFERENCES public.mt5_accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contract_size NUMERIC,
ADD COLUMN IF NOT EXISTS asset_type TEXT CHECK (asset_type IN ('FOREX', 'CRYPTO', 'INDICES', 'COMMODITIES', 'STOCKS'));

-- ============================================
-- PART 3: MIGRATE EXISTING DATA
-- ============================================

-- Temporarily disable ownership validation trigger to allow migration
-- (Cannot use DISABLE TRIGGER ALL as it tries to disable system triggers)
ALTER TABLE public.trades DISABLE TRIGGER validate_trade_prop_account;

-- Migrate external_ticket → external_id
UPDATE public.trades 
SET external_id = external_ticket 
WHERE external_ticket IS NOT NULL AND external_id IS NULL;

-- Re-enable ownership validation trigger
ALTER TABLE public.trades ENABLE TRIGGER validate_trade_prop_account;

-- ============================================
-- PART 4: CREATE NEW INDEXES
-- ============================================

-- Create unique index for external_id + mt5_account_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_external_id_mt5_account 
ON public.trades(external_id, mt5_account_id)
WHERE external_id IS NOT NULL;

-- Create index for mt5_account_id lookups
CREATE INDEX IF NOT EXISTS idx_trades_mt5_account_id 
ON public.trades(mt5_account_id)
WHERE mt5_account_id IS NOT NULL;

-- Create index for asset_type filtering
CREATE INDEX IF NOT EXISTS idx_trades_asset_type 
ON public.trades(asset_type)
WHERE asset_type IS NOT NULL;

-- ============================================
-- PART 5: MIGRATE OLD MT5_CONNECTIONS DATA (OPTIONAL)
-- ============================================

-- Only migrate if mt5_connections table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'mt5_connections') THEN
        
        -- Migrate connections to mt5_accounts
        INSERT INTO public.mt5_accounts (user_id, account_name, server, login, password, created_at)
        SELECT 
            user_id,
            CONCAT(server, ' - ', login) as account_name,
            server,
            login,
            password_encrypted as password,
            created_at
        FROM public.mt5_connections
        WHERE NOT EXISTS (
            SELECT 1 FROM public.mt5_accounts ma 
            WHERE ma.server = mt5_connections.server 
            AND ma.login = mt5_connections.login
            AND ma.user_id = mt5_connections.user_id
        );
        
        -- Temporarily disable ownership validation trigger to allow migration
        ALTER TABLE public.trades DISABLE TRIGGER validate_trade_prop_account;
        
        -- Link trades to mt5_accounts via prop_account_id
        UPDATE public.trades t
        SET mt5_account_id = ma.id
        FROM public.mt5_connections mc
        JOIN public.mt5_accounts ma ON ma.server = mc.server 
            AND ma.login = mc.login 
            AND ma.user_id = mc.user_id
        WHERE t.prop_account_id = mc.prop_account_id
        AND t.mt5_account_id IS NULL;
        
        -- Re-enable ownership validation trigger
        ALTER TABLE public.trades ENABLE TRIGGER validate_trade_prop_account;
        
        RAISE NOTICE 'Successfully migrated mt5_connections data to mt5_accounts';
    ELSE
        RAISE NOTICE 'mt5_connections table does not exist, skipping data migration';
    END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.mt5_accounts IS 'MT5 accounts for Terminal Farm integration. Replaces mt5_connections table.';
COMMENT ON COLUMN public.mt5_accounts.password IS 'AES-256 encrypted password using MT5_ENCRYPTION_KEY';
COMMENT ON COLUMN public.trades.external_id IS 'MT5 Position ID - unique identifier for the position';
COMMENT ON COLUMN public.trades.external_deal_id IS 'MT5 Deal Ticket - the specific deal/transaction ID';
COMMENT ON COLUMN public.trades.mt5_account_id IS 'Link to mt5_accounts table for Terminal Farm';
COMMENT ON COLUMN public.trades.asset_type IS 'Auto-detected asset type: FOREX, CRYPTO, INDICES, COMMODITIES, STOCKS';
