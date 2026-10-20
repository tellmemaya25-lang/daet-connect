-- Debug testguide4 account issue
-- Check if auth user exists and is properly linked

-- Check auth user
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'testguide4@gmail.com';

-- Check if profile exists
SELECT 
  id,
  full_name,
  role
FROM profiles
WHERE id IN (SELECT id FROM auth.users WHERE email = 'testguide4@gmail.com');

-- Check if guide record exists
SELECT 
  g.id,
  g.profile_id,
  g.contact_phone,
  g.accreditation_status,
  p.full_name
FROM tours_guides g
LEFT JOIN profiles p ON p.id = g.profile_id
WHERE g.profile_id IN (SELECT id FROM auth.users WHERE email = 'testguide4@gmail.com');

-- Check for orphaned guide records (no matching auth user)
SELECT 
  g.id,
  g.profile_id,
  g.contact_phone,
  p.full_name
FROM tours_guides g
LEFT JOIN profiles p ON p.id = g.profile_id
LEFT JOIN auth.users u ON u.id = g.profile_id
WHERE g.contact_phone = '09171234568'
  AND u.id IS NULL;
