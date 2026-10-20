-- ================================================================
-- PACKAGE IMAGES STORAGE SETUP
-- Creates storage bucket and policies for tour package images
-- ================================================================

-- Step 1: Create storage bucket for package images
-- ================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('package-images', 'package-images', true)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Storage policies for package images
-- ================================================================

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload package images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'package-images' AND
  (storage.foldername(name))[1] = 'packages'
);

-- Allow public read access to all package images
CREATE POLICY "Public can view package images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'package-images');

-- Allow operators to update their own package images
CREATE POLICY "Operators can update their package images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'package-images' AND
  (storage.foldername(name))[1] = 'packages'
);

-- Allow operators to delete their own package images
CREATE POLICY "Operators can delete their package images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'package-images' AND
  (storage.foldername(name))[1] = 'packages'
);

-- Step 3: Add image URL columns to tours_packages (if not exists)
-- ================================================================
ALTER TABLE tours_packages 
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

ALTER TABLE tours_packages 
ADD COLUMN IF NOT EXISTS featured_image_url TEXT;

-- Add comments
COMMENT ON COLUMN tours_packages.cover_image_url IS 'Main cover image for the package';
COMMENT ON COLUMN tours_packages.featured_image_url IS 'Featured/hero image for package details';

-- ================================================================
-- MIGRATION COMPLETE
-- Package images can now be uploaded to: package-images/packages/{package-id}/
-- ================================================================
