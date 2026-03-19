-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Daily Planner + Universal Trading Rules
-- Date: 2026-03-18
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Universal trading rules stored per user (ordered JSON array of strings)
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS trading_rules JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. One plan per user per calendar day
CREATE TABLE IF NOT EXISTS public.daily_plans (
  id                      UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 TEXT             NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  date                    DATE             NOT NULL,

  -- Morning fields
  bias                    TEXT             CHECK (bias IN ('Bullish', 'Neutral', 'Bearish')),
  playbook_id             UUID             REFERENCES public.playbooks(id) ON DELETE SET NULL,
  max_trades              INTEGER          CHECK (max_trades > 0),
  daily_limit             DOUBLE PRECISION CHECK (daily_limit >= 0),
  universal_rules_checked TEXT[]           NOT NULL DEFAULT '{}',
  strategy_rules_checked  TEXT[]           NOT NULL DEFAULT '{}',
  pre_note                TEXT,

  -- Evening fields
  day_grade               TEXT             CHECK (day_grade IN ('A', 'B', 'C', 'D', 'F')),
  went_well               TEXT,
  went_wrong              TEXT,

  created_at              TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ      NOT NULL DEFAULT now(),

  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS daily_plans_user_date_idx
  ON public.daily_plans (user_id, date DESC);
