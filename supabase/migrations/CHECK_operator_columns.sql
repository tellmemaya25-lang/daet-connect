-- Check what columns exist in tours_operators table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tours_operators'
ORDER BY ordinal_position;
