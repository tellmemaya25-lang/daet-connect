-- =====================================================
-- FIX: Allow viewing profiles of approved guides
-- Everyone needs to see guide names for assignment/display
-- =====================================================

-- Add policy for viewing profiles of approved guides
CREATE POLICY "Everyone can view approved guide profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- Profile belongs to an approved guide
  EXISTS (
    SELECT 1 FROM tours_guides
    WHERE tours_guides.profile_id = profiles.id
      AND tours_guides.accreditation_status = 'approved'
  )
);

-- Verify the policies
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;
