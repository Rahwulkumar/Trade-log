-- ─────────────────────────────────────────────────────────────────────────────
-- Notebook: free-form notes table (Notion-like)
-- Each user can create unlimited notes with rich block content (BlockNote JSON)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT 'Untitled',
  content     TEXT,                                 -- BlockNote document as JSON string
  icon        TEXT        NOT NULL DEFAULT '📝',    -- Emoji icon shown in list + header
  pinned      BOOLEAN     NOT NULL DEFAULT FALSE,
  tags        TEXT[]      NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user note lookups
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes (user_id, updated_at DESC);

-- RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_user_crud" ON public.notes
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-bump updated_at on every update
CREATE OR REPLACE FUNCTION public.touch_notes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER notes_touch_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_notes_updated_at();
