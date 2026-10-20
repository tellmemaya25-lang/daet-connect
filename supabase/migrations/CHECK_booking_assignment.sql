-- Check which guide is assigned to Bagasbas Beach booking
SELECT 
  b.id as booking_id,
  b.booking_reference,
  b.status,
  b.assigned_guide_id,
  g.contact_phone as guide_phone,
  p.full_name as guide_name,
  u.email as guide_email
FROM tours_bookings b
LEFT JOIN tours_guides g ON g.id = b.assigned_guide_id
LEFT JOIN profiles p ON p.id = g.profile_id
LEFT JOIN auth.users u ON u.id = g.profile_id
WHERE b.booking_reference LIKE '%Bagasbas%'
   OR b.status = 'confirmed';
