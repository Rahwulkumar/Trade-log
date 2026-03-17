-- Canonical Clerk-backed user/profile table for the application layer.
-- This coexists with the legacy public.profiles table while the remaining
-- Supabase-era flows are removed.

CREATE TABLE IF NOT EXISTS public.app_users (
    id TEXT PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'utc',
    default_risk_percent DOUBLE PRECISION DEFAULT 1,
    default_rr_ratio DOUBLE PRECISION DEFAULT 2,
    default_timeframe TEXT DEFAULT 'h4',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.app_users
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS full_name TEXT,
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'utc',
    ADD COLUMN IF NOT EXISTS default_risk_percent DOUBLE PRECISION DEFAULT 1,
    ADD COLUMN IF NOT EXISTS default_rr_ratio DOUBLE PRECISION DEFAULT 2,
    ADD COLUMN IF NOT EXISTS default_timeframe TEXT DEFAULT 'h4',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;

CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);
