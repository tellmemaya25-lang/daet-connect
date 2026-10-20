-- =====================================================
-- CLEANUP: Fix Test Guide 4 name and delete test guides
-- =====================================================

-- Step 1: Fix Test Guide 4 full_name
-- The profile exists but the name isn't showing up correctly
UPDATE profiles
SET full_name = 'Guide Juan Dela Cruz'
WHERE id = (
  SELECT profile_id FROM tours_guides 
  WHERE contact_phone = '09171234568'
  LIMIT 1
);

-- Step 2: Fix the other Unknown Guide (tellmemay25)
UPDATE profiles
SET full_name = 'Guide Maria Santos'
WHERE id = (
  SELECT profile_id FROM tours_guides 
  WHERE contact_phone = '09456456464'
  LIMIT 1
);

-- Step 3: Delete TEST Guide Delete Me2 
-- First, unassign from any bookings
UPDATE tours_bookings
SET assigned_guide_id = NULL
WHERE assigned_guide_id = (
  SELECT id FROM tours_guides 
  WHERE contact_phone = '09642435634'
);

-- Delete the guide record
DELETE FROM tours_guides
WHERE contact_phone = '09642435634';

-- Note: The user account (testguide2@gmail.com) will remain as it's also an operator
-- Only the guide profile is deleted

-- Verify the changes
SELECT 
  g.id as guide_id,
  g.contact_phone,
  p.full_name,
  u.email
FROM tours_guides g
LEFT JOIN profiles p ON p.id = g.profile_id
LEFT JOIN auth.users u ON u.id = g.profile_id
WHERE g.accreditation_status = 'approved'
ORDER BY p.full_name;
