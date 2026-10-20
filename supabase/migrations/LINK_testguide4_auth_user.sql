-- Link the newly created testguide4@gmail.com auth user to existing guide record
-- Run this AFTER creating the auth user in Supabase Dashboard

DO $$
DECLARE
  v_new_user_id UUID;
  v_old_profile_id UUID;
BEGIN
  -- Get the new auth user ID
  SELECT id INTO v_new_user_id
  FROM auth.users
  WHERE email = 'testguide4@gmail.com';

  IF v_new_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user testguide4@gmail.com not found. Create it first in Supabase Authentication.';
  END IF;

  -- Get the old profile_id from the guide record
  SELECT profile_id INTO v_old_profile_id
  FROM tours_guides
  WHERE contact_phone = '09171234568'
  LIMIT 1;

  IF v_old_profile_id IS NULL THEN
    RAISE EXCEPTION 'Guide with phone 09171234568 not found';
  END IF;

  -- Update the guide record to point to new user
  UPDATE tours_guides
  SET profile_id = v_new_user_id
  WHERE contact_phone = '09171234568';

  -- Create/update profile for the new user
  INSERT INTO profiles (id, full_name, role, created_at)
  VALUES (v_new_user_id, 'Mark Alfred Barrios', 'guide', NOW())
  ON CONFLICT (id)
  DO UPDATE SET
    full_name = 'Mark Alfred Barrios',
    role = 'guide';

  RAISE NOTICE 'Successfully linked testguide4@gmail.com to guide record';
  RAISE NOTICE 'New user ID: %', v_new_user_id;
  RAISE NOTICE 'Old profile ID: %', v_old_profile_id;
END $$;

-- Verify the link
SELECT 
  u.email,
  u.email_confirmed_at,
  p.full_name,
  p.role,
  g.contact_phone,
  g.accreditation_status
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN tours_guides g ON g.profile_id = u.id
WHERE u.email = 'testguide4@gmail.com';
