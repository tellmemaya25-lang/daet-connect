-- Check what columns exist in tours_guides table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tours_guides'
ORDER BY ordinal_position;
