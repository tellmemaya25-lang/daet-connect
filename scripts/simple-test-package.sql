-- Simpler approach: Check and create test package
-- Run this in Supabase SQL Editor

-- First, let's see what operators exist
SELECT 
  id,
  business_name,
  accreditation_status,
  created_at
FROM tours_operators
ORDER BY created_at DESC;

-- If you see an operator above, use its ID in the next part
-- Replace 'PUT_OPERATOR_ID_HERE' with the actual UUID from above

/*
-- Uncomment and use this if you found an operator ID above:

INSERT INTO tours_packages (
  operator_id,
  title,
  description,
  location_name,
  duration_value,
  duration_type,
  status
) VALUES (
  'PUT_OPERATOR_ID_HERE',  -- Replace this with actual operator UUID
  'Island Hopping Adventure',
  'Explore the beautiful islands of Daet with our expert guides.',
  'Daet, Camarines Norte',
  1,
  'days',
  'published'
) RETURNING *;
*/
