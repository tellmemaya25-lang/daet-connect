-- Check approved guides with their full names (same query as the page uses)

-- Step 1: Get approved guides
SELECT 
  g.id,
  g.profile_id,
  g.contact_phone,
  g.accreditation_status
FROM tours_guides g
WHERE g.accreditation_status = 'approved'
ORDER BY g.id;

-- Step 2: Get profiles for those guides
SELECT 
  p.id,
  p.full_name
FROM profiles p
WHERE p.id IN (
  SELECT profile_id FROM tours_guides WHERE accreditation_status = 'approved'
);

-- Step 3: Combined query (what the page should see)
SELECT 
  g.id as guide_id,
  g.profile_id,
  g.contact_phone,
  p.full_name,
  u.email
FROM tours_guides g
LEFT JOIN profiles p ON p.id = g.profile_id
LEFT JOIN auth.users u ON u.id = g.profile_id
WHERE g.accreditation_status = 'approved'
ORDER BY g.id;
