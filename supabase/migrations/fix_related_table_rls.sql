-- Fix RLS policies for package-related tables
-- Allows operators to manage their package details

-- ============================================================================
-- tours_package_price_variants
-- ============================================================================

ALTER TABLE tours_package_price_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators can manage price variants" ON tours_package_price_variants;
DROP POLICY IF EXISTS "Public can view price variants" ON tours_package_price_variants;

-- Operators can manage their package price variants
CREATE POLICY "Operators can manage price variants"
ON tours_package_price_variants
FOR ALL
TO authenticated
USING (
  package_id IN (
    SELECT p.id FROM tours_packages p
    JOIN tours_operators o ON p.operator_id = o.id
    WHERE o.profile_id = auth.uid()
  )
)
WITH CHECK (
  package_id IN (
    SELECT p.id FROM tours_packages p
    JOIN tours_operators o ON p.operator_id = o.id
    WHERE o.profile_id = auth.uid()
  )
);

-- Public can view price variants for published packages
CREATE POLICY "Public can view price variants"
ON tours_package_price_variants
FOR SELECT
TO anon, authenticated
USING (
  package_id IN (
    SELECT id FROM tours_packages WHERE status = 'published'
  )
);

-- ============================================================================
-- tours_package_inclusions
-- ============================================================================

ALTER TABLE tours_package_inclusions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators can manage inclusions" ON tours_package_inclusions;
DROP POLICY IF EXISTS "Public can view inclusions" ON tours_package_inclusions;

-- Operators can manage their package inclusions
CREATE POLICY "Operators can manage inclusions"
ON tours_package_inclusions
FOR ALL
TO authenticated
USING (
  package_id IN (
    SELECT p.id FROM tours_packages p
    JOIN tours_operators o ON p.operator_id = o.id
    WHERE o.profile_id = auth.uid()
  )
)
WITH CHECK (
  package_id IN (
    SELECT p.id FROM tours_packages p
    JOIN tours_operators o ON p.operator_id = o.id
    WHERE o.profile_id = auth.uid()
  )
);

-- Public can view inclusions for published packages
CREATE POLICY "Public can view inclusions"
ON tours_package_inclusions
FOR SELECT
TO anon, authenticated
USING (
  package_id IN (
    SELECT id FROM tours_packages WHERE status = 'published'
  )
);

-- ============================================================================
-- tours_package_stops
-- ============================================================================

ALTER TABLE tours_package_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators can manage stops" ON tours_package_stops;
DROP POLICY IF EXISTS "Public can view stops" ON tours_package_stops;

-- Operators can manage their package stops
CREATE POLICY "Operators can manage stops"
ON tours_package_stops
FOR ALL
TO authenticated
USING (
  package_id IN (
    SELECT p.id FROM tours_packages p
    JOIN tours_operators o ON p.operator_id = o.id
    WHERE o.profile_id = auth.uid()
  )
)
WITH CHECK (
  package_id IN (
    SELECT p.id FROM tours_packages p
    JOIN tours_operators o ON p.operator_id = o.id
    WHERE o.profile_id = auth.uid()
  )
);

-- Public can view stops for published packages
CREATE POLICY "Public can view stops"
ON tours_package_stops
FOR SELECT
TO anon, authenticated
USING (
  package_id IN (
    SELECT id FROM tours_packages WHERE status = 'published'
  )
);

-- ============================================================================
-- tours_package_gallery
-- ============================================================================

ALTER TABLE tours_package_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators can manage gallery" ON tours_package_gallery;
DROP POLICY IF EXISTS "Public can view gallery" ON tours_package_gallery;

-- Operators can manage their package gallery
CREATE POLICY "Operators can manage gallery"
ON tours_package_gallery
FOR ALL
TO authenticated
USING (
  package_id IN (
    SELECT p.id FROM tours_packages p
    JOIN tours_operators o ON p.operator_id = o.id
    WHERE o.profile_id = auth.uid()
  )
)
WITH CHECK (
  package_id IN (
    SELECT p.id FROM tours_packages p
    JOIN tours_operators o ON p.operator_id = o.id
    WHERE o.profile_id = auth.uid()
  )
);

-- Public can view gallery for published packages
CREATE POLICY "Public can view gallery"
ON tours_package_gallery
FOR SELECT
TO anon, authenticated
USING (
  package_id IN (
    SELECT id FROM tours_packages WHERE status = 'published'
  )
);

-- Verify all policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN (
  'tours_package_price_variants',
  'tours_package_inclusions',
  'tours_package_stops',
  'tours_package_gallery'
)
ORDER BY tablename, policyname;
