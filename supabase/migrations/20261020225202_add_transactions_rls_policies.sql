-- Migration: Add RLS policies for tours_payment_transactions
-- Purpose: Ensure tourists can only access their own transactions
-- Related to: Module 5 - Payment System

BEGIN;

-- Enable Row-Level Security
ALTER TABLE tours_payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Tourists can view their own transactions
CREATE POLICY "Tourists can view own transactions"
  ON tours_payment_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tours_bookings
      WHERE tours_bookings.id = tours_payment_transactions.booking_id
        AND tours_bookings.tourist_id = auth.uid()
    )
  );

-- Policy: Tourists can create transactions for their own bookings
CREATE POLICY "Tourists can create transactions for own bookings"
  ON tours_payment_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tours_bookings
      WHERE tours_bookings.id = tours_payment_transactions.booking_id
        AND tours_bookings.tourist_id = auth.uid()
        AND tours_bookings.status = 'pending_payment'
    )
  );

-- Policy: System (service_role) can update any transaction for webhook processing
-- This is necessary because webhooks run with service_role privileges
CREATE POLICY "Service role can update transactions"
  ON tours_payment_transactions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Admins can view all transactions
CREATE POLICY "Admin views all transactions"
  ON tours_payment_transactions
  FOR SELECT
  USING (
    (SELECT get_my_role()) = 'admin'
  );

-- Add comment for documentation
COMMENT ON POLICY "Tourists can view own transactions" ON tours_payment_transactions IS 
  'Allows tourists to SELECT only their own transaction records by filtering through booking ownership';
COMMENT ON POLICY "Tourists can create transactions for own bookings" ON tours_payment_transactions IS 
  'Allows tourists to INSERT transactions only for bookings they own that are in pending_payment status';
COMMENT ON POLICY "Service role can update transactions" ON tours_payment_transactions IS 
  'Allows service_role (webhooks) to UPDATE transaction status regardless of ownership';
COMMENT ON POLICY "Admin views all transactions" ON tours_payment_transactions IS 
  'Allows administrators to view all transaction records for support and monitoring';

COMMIT;

-- Verification queries (run these after applying migration)
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'tours_payment_transactions';
-- SELECT count(*) FROM pg_policies WHERE tablename = 'tours_payment_transactions'; -- Should return 4
