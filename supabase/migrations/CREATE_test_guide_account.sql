-- =====================================================
-- CREATE TEST GUIDE ACCOUNT (testguide4)
-- Separate from operator account
-- =====================================================

-- Step 1: Create the auth user in Supabase Dashboard
-- Email: testguide4@gmail.com
-- Password: testguide4
-- Auto-confirm: YES

-- Step 2: Run this SQL after creating the user

DO $$
DECLARE
  v_user_id UUID;
  v_guide_exists BOOLEAN;
BEGIN
  -- Get user_id for testguide4@gmail.com
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'testguide4@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User testguide4@gmail.com not found. Please create the user first in Supabase Auth.';
  END IF;

  -- Check if guide already exists
  SELECT EXISTS(
    SELECT 1 FROM tours_guides WHERE profile_id = v_user_id
  ) INTO v_guide_exists;

  IF NOT v_guide_exists THEN
    -- Create guide record
    INSERT INTO tours_guides (
      profile_id,
      contact_phone,
      bio,
      accreditation_status,
      consent_full_id_display,
      consent_given_at
    ) VALUES (
      v_user_id,
      '09171234568',
      'Test guide for Sprint 4',
      'approved',
      true,
      NOW()
    );
    
    RAISE NOTICE 'Created guide for testguide4@gmail.com';
  ELSE
    -- Update existing guide to approved
    UPDATE tours_guides
    SET accreditation_status = 'approved'
    WHERE profile_id = v_user_id;
    
    RAISE NOTICE 'Updated existing guide to approved';
  END IF;

  -- Create/update profile with full_name
  INSERT INTO profiles (id, full_name, role, created_at)
  VALUES (v_user_id, 'Test Guide 4', 'guide', NOW())
  ON CONFLICT (id) 
  DO UPDATE SET 
    full_name = 'Test Guide 4',
    role = 'guide';

END $$;

-- Verify the guide was created
SELECT 
  u.email,
  g.id as guide_id,
  p.full_name,
  g.accreditation_status,
  g.contact_phone
FROM auth.users u
JOIN tours_guides g ON g.profile_id = u.id
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = 'testguide4@gmail.com';
