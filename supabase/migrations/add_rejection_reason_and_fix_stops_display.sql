-- Add rejection_reason column to tours_packages table
ALTER TABLE tours_packages 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add comment
COMMENT ON COLUMN tours_packages.rejection_reason IS 'Reason for rejection when status is rejected';
