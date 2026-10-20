-- Link newly created testguide4@gmail.com auth user to existing Mark Alfred Barrios guide
DO $$
DECLARE
  v_new_auth_user_id UUID;
  v_old_guide_profile_id UUID;
BEGIN
  -- Get the NEW auth user ID
  SELECT id INTO v_new_auth_user_id
  FROM auth.users
  WHERE email = 'testguide4@gmail.com';

  IF v_new_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user testguide4@gmail.com not found. Create it first in Supabase Authentication!';
  END IF;

  -- Get the current profile_id from the guide record
  SELECT profile_id INTO v_old_guide_profile_id
  FROM tours_guides
  WHERE contact_phone = '09171234568'
  LIMIT 1;

  RAISE NOTICE 'New auth user ID: %', v_new_auth_user_id;
  RAISE NOTICE 'Old guide profile ID: %', v_old_guide_profile_id;

  -- Update guide record to point to new auth user
  UPDATE tours_guides
  SET profile_id = v_new_auth_user_id
  WHERE contact_phone = '09171234568';

  -- Create profile for new user
  INSERT INTO profiles (id, full_name, role, created_at)
  VALUES (v_new_auth_user_id, 'Mark Alfred Barrios', 'guide', NOW())
  ON CONFLICT (id)
  DO UPDATE SET
    full_name = 'Mark Alfred Barrios',
    role = 'guide';

  RAISE NOTICE 'Successfully linked testguide4@gmail.com to guide record';
END $$;

-- Verify
SELECT 
  u.email,
  u.email_confirmed_at,
  p.full_name,
  g.contact_phone,
  g.accreditation_status
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN tours_guides g ON g.profile_id = u.id
WHERE u.email = 'testguide4@gmail.com';
