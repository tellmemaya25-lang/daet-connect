-- =====================================================
-- FIX: Allow operators to view approved guides
-- Operators need to see approved guides to assign them to bookings
-- =====================================================

-- Add policy for operators to view approved guides
CREATE POLICY "Operators can view approved guides for assignment"
ON tours_guides
FOR SELECT
TO authenticated
USING (
  accreditation_status = 'approved'
  AND (
    -- User is an operator
    EXISTS (
      SELECT 1 FROM tours_operators
      WHERE tours_operators.profile_id = auth.uid()
        AND tours_operators.accreditation_status = 'approved'
    )
    -- OR user is an admin (already covered by another policy but adding for clarity)
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
);

-- Verify the policies
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'tours_guides'
ORDER BY policyname;
