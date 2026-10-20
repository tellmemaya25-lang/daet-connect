-- Fix database schema mismatches
-- This migration creates missing tables and updates RPC functions

-- ============================================================================
-- 1. CREATE MISSING TABLES
-- ============================================================================

-- Create tours_package_inclusions table
CREATE TABLE IF NOT EXISTS tours_package_inclusions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES tours_packages(id) ON DELETE CASCADE,
  item_text TEXT NOT NULL,
  is_included BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_inclusions_package_id ON tours_package_inclusions(package_id);

-- Create tours_package_gallery table  
CREATE TABLE IF NOT EXISTS tours_package_gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES tours_packages(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_gallery_package_id ON tours_package_gallery(package_id);
CREATE INDEX IF NOT EXISTS idx_package_gallery_order ON tours_package_gallery(package_id, display_order);

-- ============================================================================
-- 2. UPDATE RPC FUNCTIONS WITH CORRECT COLUMN NAMES
-- ============================================================================

-- Fix replace_package_stops to use correct column names (location_name, description, stop_order)
CREATE OR REPLACE FUNCTION replace_package_stops(
  p_package_id UUID,
  p_stops JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the package belongs to the current user's operator account
  -- Note: Using profile_id (not user_id) to match actual schema
  IF NOT EXISTS (
    SELECT 1 FROM tours_packages tp
    JOIN tours_operators toper ON tp.operator_id = toper.id
    WHERE tp.id = p_package_id AND toper.profile_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Package not found or access denied';
  END IF;

  -- Delete existing stops
  DELETE FROM tours_package_stops
  WHERE package_id = p_package_id;

  -- Insert new stops with computed stop_order (not order_index)
  INSERT INTO tours_package_stops (
    package_id,
    location_name,
    description,
    latitude,
    longitude,
    stop_order
  )
  SELECT
    p_package_id,
    (v->>'location_name')::TEXT,
    (v->>'description')::TEXT,
    (v->>'latitude')::NUMERIC,
    (v->>'longitude')::NUMERIC,
    ROW_NUMBER() OVER () - 1 AS stop_order
  FROM jsonb_array_elements(p_stops) AS v;
END;
$$;

-- Fix replace_package_price_variants to use profile_id
CREATE OR REPLACE FUNCTION replace_package_price_variants(
  p_package_id UUID,
  p_variants JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the package belongs to the current user's operator account
  -- Note: Using profile_id (not user_id) to match actual schema
  IF NOT EXISTS (
    SELECT 1 FROM tours_packages tp
    JOIN tours_operators toper ON tp.operator_id = toper.id
    WHERE tp.id = p_package_id AND toper.profile_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Package not found or access denied';
  END IF;

  -- Delete existing variants
  DELETE FROM tours_package_price_variants
  WHERE package_id = p_package_id;

  -- Insert new variants
  INSERT INTO tours_package_price_variants (
    package_id,
    variant_name,
    price_per_pax,
    flat_price,
    min_pax,
    max_pax,
    is_default
  )
  SELECT
    p_package_id,
    (v->>'variant_name')::TEXT,
    (v->>'price_per_pax')::NUMERIC,
    (v->>'flat_price')::NUMERIC,
    (v->>'min_pax')::INTEGER,
    (v->>'max_pax')::INTEGER,
    (v->>'is_default')::BOOLEAN
  FROM jsonb_array_elements(p_variants) AS v;
END;
$$;

-- ============================================================================
-- 3. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON tours_package_inclusions TO authenticated;
GRANT ALL ON tours_package_gallery TO authenticated;

-- Re-grant function permissions
GRANT EXECUTE ON FUNCTION replace_package_stops(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION replace_package_price_variants(UUID, JSONB) TO authenticated;

-- ============================================================================
-- 4. ADD SAMPLE INCLUSIONS TO EXISTING PACKAGE (IF EXISTS)
-- ============================================================================

DO $$
DECLARE
  v_package_id UUID;
BEGIN
  -- Find our test package
  SELECT id INTO v_package_id
  FROM tours_packages
  WHERE title = 'Island Hopping Adventure'
  LIMIT 1;

  -- If package exists, add sample inclusions
  IF v_package_id IS NOT NULL THEN
    INSERT INTO tours_package_inclusions (package_id, item_text, is_included) VALUES
      (v_package_id, 'Round-trip boat transfer', true),
      (v_package_id, 'Snorkeling equipment', true),
      (v_package_id, 'Lunch and refreshments', true),
      (v_package_id, 'Professional tour guide', true),
      (v_package_id, 'Entrance fees to islands', true),
      (v_package_id, 'Personal expenses', false),
      (v_package_id, 'Travel insurance', false)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Added inclusions to test package';
  END IF;
END $$;

-- Verify tables were created
SELECT 
  'tours_package_inclusions' as table_name,
  COUNT(*) as row_count
FROM tours_package_inclusions
UNION ALL
SELECT 
  'tours_package_gallery' as table_name,
  COUNT(*) as row_count
FROM tours_package_gallery;
