-- Fix RLS policies for tours_packages table
-- This allows operators to create packages

-- Enable RLS on tours_packages (if not already enabled)
ALTER TABLE tours_packages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Operators can insert their own packages" ON tours_packages;
DROP POLICY IF EXISTS "Operators can view their own packages" ON tours_packages;
DROP POLICY IF EXISTS "Operators can update their own packages" ON tours_packages;
DROP POLICY IF EXISTS "Public can view published packages" ON tours_packages;

-- Policy 1: Operators can INSERT their own packages
CREATE POLICY "Operators can insert their own packages"
ON tours_packages
FOR INSERT
TO authenticated
WITH CHECK (
  operator_id IN (
    SELECT id FROM tours_operators 
    WHERE profile_id = auth.uid()
    AND accreditation_status = 'approved'
  )
);

-- Policy 2: Operators can SELECT their own packages
CREATE POLICY "Operators can view their own packages"
ON tours_packages
FOR SELECT
TO authenticated
USING (
  operator_id IN (
    SELECT id FROM tours_operators 
    WHERE profile_id = auth.uid()
  )
);

-- Policy 3: Operators can UPDATE their own packages
CREATE POLICY "Operators can update their own packages"
ON tours_packages
FOR UPDATE
TO authenticated
USING (
  operator_id IN (
    SELECT id FROM tours_operators 
    WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  operator_id IN (
    SELECT id FROM tours_operators 
    WHERE profile_id = auth.uid()
  )
);

-- Policy 4: Everyone can view published packages
CREATE POLICY "Public can view published packages"
ON tours_packages
FOR SELECT
TO anon, authenticated
USING (status = 'published');

-- Policy 5: Admins can view all packages
CREATE POLICY "Admins can view all packages"
ON tours_packages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy 6: Admins can update all packages
CREATE POLICY "Admins can update all packages"
ON tours_packages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'tours_packages';
