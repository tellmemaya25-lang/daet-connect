-- ================================================================
-- IMAGE UPLOAD SYSTEM - CORRECTED SQL
-- Run this in Supabase SQL Editor
-- ================================================================

-- Step 1: Create storage bucket
-- ================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('package-images', 'package-images', true)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop existing policies if they exist (to avoid conflicts)
-- ================================================================
DROP POLICY IF EXISTS "Authenticated users can upload package images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view package images" ON storage.objects;
DROP POLICY IF EXISTS "Operators can update their package images" ON storage.objects;
DROP POLICY IF EXISTS "Operators can delete their package images" ON storage.objects;

-- Step 3: Create new policies
-- ================================================================

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload package images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'package-images' AND
  (storage.foldername(name))[1] = 'packages'
);

-- Allow public read access
CREATE POLICY "Public can view package images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'package-images');

-- Allow operators to update their images
CREATE POLICY "Operators can update their package images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'package-images' AND
  (storage.foldername(name))[1] = 'packages'
);

-- Allow operators to delete their images
CREATE POLICY "Operators can delete their package images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'package-images' AND
  (storage.foldername(name))[1] = 'packages'
);

-- Step 4: Add image URL columns (if not exists)
-- ================================================================
ALTER TABLE tours_packages 
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS featured_image_url TEXT;

COMMENT ON COLUMN tours_packages.cover_image_url IS 'Main cover image URL';
COMMENT ON COLUMN tours_packages.featured_image_url IS 'Featured/hero image URL';

-- ================================================================
-- SETUP COMPLETE!
-- ================================================================
-- Verify in Supabase Dashboard:
-- Storage → Buckets → package-images should exist
-- Storage → package-images → Policies → should show 4 policies
-- ================================================================
