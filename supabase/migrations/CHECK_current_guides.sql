-- Check current guides and their relationships
SELECT 
  g.id,
  g.profile_id,
  p.full_name,
  g.contact_phone,
  g.accreditation_status,
  (SELECT COUNT(*) FROM tours_bookings WHERE assigned_guide_id = g.id) as assigned_bookings_count
FROM tours_guides g
LEFT JOIN profiles p ON p.id = g.profile_id
ORDER BY g.created_at;
