-- Clean up orphaned and duplicate test guide records
-- Keep only Jeremiah Sabihon as the working guide account

BEGIN;

-- Step 1: Delete testguide3@gmail.com guide (if no assigned bookings)
DO $$
DECLARE
  v_guide3_id UUID;
  v_assigned_count INTEGER;
BEGIN
  -- Get guide ID for testguide3
  SELECT g.id INTO v_guide3_id
  FROM tours_guides g
  WHERE g.profile_id = (SELECT id FROM auth.users WHERE email = 'testguide3@gmail.com')
  LIMIT 1;

  IF v_guide3_id IS NOT NULL THEN
    -- Check assigned bookings
    SELECT COUNT(*) INTO v_assigned_count
    FROM tours_bookings
    WHERE assigned_guide_id = v_guide3_id;

    IF v_assigned_count = 0 THEN
      DELETE FROM tours_guides WHERE id = v_guide3_id;
      RAISE NOTICE 'Deleted testguide3@gmail.com guide (no assigned bookings)';
    ELSE
      RAISE NOTICE 'Cannot delete testguide3 - has % assigned booking(s)', v_assigned_count;
    END IF;
  END IF;
END $$;

-- Step 2: Delete orphaned guide record (Mark Alfred Barrios with no auth user)
-- This is the guide with phone 09171234568 that has no matching auth user
DO $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM tours_guides
  WHERE contact_phone = '09171234568'
    AND profile_id NOT IN (SELECT id FROM auth.users);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count > 0 THEN
    RAISE NOTICE 'Deleted % orphaned guide record(s) (Mark Alfred Barrios - no auth user)', v_deleted_count;
  ELSE
    RAISE NOTICE 'No orphaned guide records found to delete';
  END IF;
END $$;

-- Step 3: Verify - show only the auth users we want to keep for manual deletion
-- These duplicate auth users should be deleted manually in Supabase Dashboard:
SELECT 
  u.id,
  u.email,
  u.created_at,
  'DELETE THIS - duplicate test account' as action
FROM auth.users u
WHERE u.email IN (
  'testguide3@gmail.com',
  'testguide4@gmail.com'
)
ORDER BY u.email;

-- Step 4: Keep only valid guides with actual auth users
-- Show remaining guides
SELECT 
  u.email,
  p.full_name,
  g.contact_phone,
  g.accreditation_status,
  (SELECT COUNT(*) FROM tours_bookings WHERE assigned_guide_id = g.id) as assigned_bookings
FROM tours_guides g
JOIN profiles p ON p.id = g.profile_id
JOIN auth.users u ON u.id = g.profile_id
WHERE g.accreditation_status = 'approved'
ORDER BY u.email;

COMMIT;

-- Summary of remaining guides
SELECT 
  COUNT(*) as total_guides,
  COUNT(CASE WHEN accreditation_status = 'approved' THEN 1 END) as approved_guides
FROM tours_guides;
