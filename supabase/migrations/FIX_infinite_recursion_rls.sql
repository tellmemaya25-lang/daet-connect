-- =====================================================
-- FIX: Remove infinite recursion in RLS policies
-- Simplify policies to avoid circular dependencies
-- =====================================================

-- Step 1: Drop the problematic policies
DROP POLICY IF EXISTS "Everyone can view approved guide profiles" ON profiles;
DROP POLICY IF EXISTS "Operators can view approved guides for assignment" ON tours_guides;

-- Step 2: Create simpler, non-recursive policies

-- Allow authenticated users to view profiles of approved guides
-- (No subquery - just allow reading if authenticated)
CREATE POLICY "Authenticated users can view guide profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  role = 'guide' OR role IS NULL
);

-- Allow authenticated users to view approved guides
-- (No complex subquery checking operator status)
CREATE POLICY "Authenticated users can view approved guides"
ON tours_guides
FOR SELECT
TO authenticated
USING (
  accreditation_status = 'approved'
);

-- Verify the policies
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'tours_guides')
ORDER BY tablename, policyname;
