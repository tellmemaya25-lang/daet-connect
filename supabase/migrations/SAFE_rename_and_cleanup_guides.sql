-- =====================================================
-- CLEANUP GUIDES: Rename Unknown Guide & Delete Test Guide
-- =====================================================
-- 1. Rename "Unknown Guide" (094564564645) → "Jeremiah Sabihon"
-- 2. Delete "TEST Guide Delete Me2" (operator, not a real guide)
-- 3. Setup email account for Jeremiah Sabihon
-- =====================================================

BEGIN;

-- Step 1: Rename "Unknown Guide" → "Jeremiah Sabihon"
-- This guide has assigned bookings, so we only update the profile name
DO $$
BEGIN
  UPDATE profiles
  SET full_name = 'Jeremiah Sabihon'
  WHERE id = (
    SELECT profile_id 
    FROM tours_guides 
    WHERE contact_phone = '094564564645'
    LIMIT 1
  );

  RAISE NOTICE 'Renamed Unknown Guide to Jeremiah Sabihon';
END $$;

-- Step 2: Delete "TEST Guide Delete Me2" from tours_guides
-- This is an operator account, not a real guide - safe to remove from guides table
DO $$
DECLARE
  test_guide_id UUID;
  test_profile_id UUID;
  assigned_count INTEGER;
BEGIN
  -- Get the guide ID and profile_id for TEST Guide Delete Me2
  SELECT g.id, g.profile_id INTO test_guide_id, test_profile_id
  FROM tours_guides g
  LEFT JOIN profiles p ON p.id = g.profile_id
  WHERE g.contact_phone = '09642435634566'
     OR p.full_name LIKE '%TEST Guide Delete Me2%'
  LIMIT 1;

  IF test_guide_id IS NOT NULL THEN
    -- Check if this guide has any assigned bookings
    SELECT COUNT(*) INTO assigned_count
    FROM tours_bookings
    WHERE assigned_guide_id = test_guide_id;

    IF assigned_count = 0 THEN
      -- Safe to delete from tours_guides (but keep the user account for operator role)
      DELETE FROM tours_guides WHERE id = test_guide_id;
      
      RAISE NOTICE 'Deleted TEST Guide Delete Me2 from guides (operator account preserved)';
    ELSE
      RAISE NOTICE 'Cannot delete TEST Guide Delete Me2 - has % assigned booking(s)', assigned_count;
    END IF;
  ELSE
    RAISE NOTICE 'TEST Guide Delete Me2 not found in guides table';
  END IF;
END $$;

COMMIT;

-- Step 3: Create auth account for Jeremiah Sabihon
-- Manual Step: Create in Supabase Auth Dashboard
-- =====================================================
-- Email: jeremiah.sabihon@guide.daet.ph
-- Password: sabihon2026
-- Auto-confirm: YES
-- =====================================================

-- After creating the auth user, run this to link the account:
DO $$
DECLARE
  v_user_id UUID;
  v_guide_profile_id UUID;
BEGIN
  -- Get user_id for jeremiah.sabihon@guide.daet.ph
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'jeremiah.sabihon@guide.daet.ph';

  -- Get the profile_id of the guide with phone 094564564645
  SELECT profile_id INTO v_guide_profile_id
  FROM tours_guides
  WHERE contact_phone = '094564564645'
  LIMIT 1;

  IF v_user_id IS NOT NULL AND v_guide_profile_id IS NOT NULL THEN
    -- Update the guide record to link to new auth user
    UPDATE tours_guides
    SET profile_id = v_user_id
    WHERE contact_phone = '094564564645';
    
    -- Update profile to new user_id
    UPDATE profiles
    SET id = v_user_id,
        full_name = 'Jeremiah Sabihon',
        role = 'guide'
    WHERE id = v_guide_profile_id;
    
    RAISE NOTICE 'Linked Jeremiah Sabihon guide account';
  ELSIF v_user_id IS NULL THEN
    RAISE NOTICE 'Auth user not found - create jeremiah.sabihon@guide.daet.ph first';
  END IF;
END $$;

-- Verify the changes
SELECT 
  u.email,
  p.full_name,
  g.contact_phone,
  g.accreditation_status,
  (SELECT COUNT(*) FROM tours_bookings WHERE assigned_guide_id = g.id) as assigned_bookings
FROM tours_guides g
LEFT JOIN profiles p ON p.id = g.profile_id
LEFT JOIN auth.users u ON u.id = g.profile_id
WHERE g.accreditation_status = 'approved'
ORDER BY p.full_name;
