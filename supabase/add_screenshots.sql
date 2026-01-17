-- Migration: Add Screenshots to Trades
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. Add screenshots column to trades table
-- ============================================
ALTER TABLE trades ADD COLUMN IF NOT EXISTS screenshots TEXT[] DEFAULT '{}';

-- ============================================
-- 2. Create storage bucket for trade screenshots
-- ============================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('trade-screenshots', 'trade-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. Storage policies for trade screenshots
-- ============================================

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload trade screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trade-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view their own screenshots
CREATE POLICY "Users can view own trade screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'trade-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access for displaying screenshots
CREATE POLICY "Public read access for trade screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'trade-screenshots');

-- Allow users to delete their own screenshots
CREATE POLICY "Users can delete own trade screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'trade-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
