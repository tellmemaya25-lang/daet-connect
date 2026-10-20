-- =====================================================
-- FIX: Link operator account to correct user
-- Run this AFTER running DEBUG_operator_user_mapping.sql
-- =====================================================

-- Option 1: If operator exists but has wrong user_id, update it
-- Replace 'OPERATOR_ID_HERE' and 'USER_ID_HERE' with actual IDs from debug query

-- UPDATE tours_operators 
-- SET user_id = 'USER_ID_HERE'
-- WHERE id = 'OPERATOR_ID_HERE';


-- Option 2: If no operator exists for testguide2@gmail.com, create one
-- First, get the user_id for testguide2@gmail.com

DO $$
DECLARE
  v_user_id UUID;
  v_operator_exists BOOLEAN;
BEGIN
  -- Get user_id for testguide2@gmail.com
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'testguide2@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User testguide2@gmail.com not found';
  END IF;

  -- Check if operator already exists
  SELECT EXISTS(
    SELECT 1 FROM tours_operators WHERE profile_id = v_user_id
  ) INTO v_operator_exists;

  IF NOT v_operator_exists THEN
    -- Create operator record
    INSERT INTO tours_operators (
      profile_id,
      business_name,
      contact_person,
      contact_email,
      contact_phone,
      business_address,
      accreditation_status
    ) VALUES (
      v_user_id,
      'Daet Tours & Travel',
      'Test Operator',
      'testguide2@gmail.com',
      '09171234567',
      'Daet, Camarines Norte',
      'approved'
    );
    
    RAISE NOTICE 'Created operator for testguide2@gmail.com';
  ELSE
    -- Update existing operator to approved
    UPDATE tours_operators
    SET accreditation_status = 'approved'
    WHERE profile_id = v_user_id;
    
    RAISE NOTICE 'Updated existing operator to approved';
  END IF;
END $$;

-- Verify the fix
SELECT 
  u.email,
  o.id as operator_id,
  o.business_name,
  o.accreditation_status
FROM auth.users u
JOIN tours_operators o ON o.profile_id = u.id
WHERE u.email = 'testguide2@gmail.com';
