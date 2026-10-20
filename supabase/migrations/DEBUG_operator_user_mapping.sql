-- =====================================================
-- DEBUG: Check operator and user mapping
-- Run this to see what's in the database
-- =====================================================

-- Check users
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- Check operators
SELECT id, profile_id, business_name, contact_email, accreditation_status, created_at
FROM tours_operators
ORDER BY created_at DESC;

-- Check if testguide2@gmail.com has an operator record
SELECT 
  u.id as user_id,
  u.email,
  o.id as operator_id,
  o.business_name,
  o.accreditation_status
FROM auth.users u
LEFT JOIN tours_operators o ON o.profile_id = u.id
WHERE u.email = 'testguide2@gmail.com';

-- If no operator found, show all operators with their user emails
SELECT 
  o.id as operator_id,
  o.profile_id,
  u.email,
  o.business_name,
  o.accreditation_status
FROM tours_operators o
LEFT JOIN auth.users u ON u.id = o.profile_id
ORDER BY o.created_at DESC;
