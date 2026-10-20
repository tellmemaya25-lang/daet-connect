-- Add payment details columns to tours_operators table
-- This allows operators to specify their GCash number, bank account, etc.

BEGIN;

-- Add payment details columns
ALTER TABLE tours_operators
  ADD COLUMN IF NOT EXISTS gcash_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS gcash_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

COMMIT;

-- Show current operators
SELECT 
  business_name,
  contact_phone,
  gcash_number,
  bank_name
FROM tours_operators
ORDER BY created_at;
