-- =====================================================
-- FIX: Remove infinite recursion in RLS policies v2
-- Simplify policies to avoid circular dependencies
-- =====================================================

-- Step 1: Drop ALL problematic policies
DROP POLICY IF EXISTS "Everyone can view approved guide profiles" ON profiles;
DROP POLICY IF EXISTS "Operators can view approved guides for assignment" ON tours_guides;
DROP POLICY IF EXISTS "Authenticated users can view guide profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view approved guides" ON tours_guides;

-- Step 2: Create simpler, non-recursive policies with unique names

-- Allow authenticated users to view ALL profiles (simplest approach)
CREATE POLICY "Auth users read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to view approved guides only
CREATE POLICY "Auth users read approved guides"
ON tours_guides
FOR SELECT
TO authenticated
USING (accreditation_status = 'approved');

-- Verify the policies
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'tours_guides')
  AND policyname IN ('Auth users read all profiles', 'Auth users read approved guides')
ORDER BY tablename, policyname;
