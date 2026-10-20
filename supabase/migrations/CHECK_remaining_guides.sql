-- Check remaining guides after cleanup
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
