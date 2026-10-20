-- =====================================================
-- GUIDE ASSIGNMENT SYSTEM
-- Add guide assignment to bookings
-- =====================================================

-- Add assigned_guide_id column to tours_bookings
ALTER TABLE tours_bookings
ADD COLUMN IF NOT EXISTS assigned_guide_id UUID REFERENCES tours_guides(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_guide 
ON tours_bookings(assigned_guide_id);

-- Add index for guide lookups
CREATE INDEX IF NOT EXISTS idx_bookings_tour_date 
ON tours_bookings(tour_date);

-- Add comment
COMMENT ON COLUMN tours_bookings.assigned_guide_id IS 'The guide assigned to lead this tour';

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tours_bookings' 
  AND column_name = 'assigned_guide_id';
