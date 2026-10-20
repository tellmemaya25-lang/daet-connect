-- Migration: Create tours_payment_transactions table
-- Purpose: Store payment transaction records for tour bookings
-- Related to: Module 5 - Payment System

BEGIN;

-- Create payment transactions table
CREATE TABLE tours_payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES tours_bookings(id) ON DELETE RESTRICT,
  payment_token TEXT,
  payment_method TEXT CHECK (payment_method IN ('gcash', 'card', 'bank_transfer', 'paymaya', 'grabpay')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'PHP',
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired', 'refunded')),
  gateway_response JSONB,
  idempotency_key TEXT NOT NULL UNIQUE,
  refunded_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  refund_reason TEXT,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_transactions_booking_id ON tours_payment_transactions(booking_id);
CREATE INDEX idx_transactions_payment_token ON tours_payment_transactions(payment_token) WHERE payment_token IS NOT NULL;
CREATE INDEX idx_transactions_status ON tours_payment_transactions(status);
CREATE INDEX idx_transactions_created_at ON tours_payment_transactions(created_at DESC);
CREATE INDEX idx_transactions_idempotency_key ON tours_payment_transactions(idempotency_key);

-- Add updated_at trigger
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON tours_payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE tours_payment_transactions IS 'Stores payment transaction records for tour bookings. Links to tours_bookings and tracks payment status, gateway responses, and refund information.';
COMMENT ON COLUMN tours_payment_transactions.idempotency_key IS 'Unique key to prevent duplicate payment requests. Format: payment_{bookingId}_{timestamp}';
COMMENT ON COLUMN tours_payment_transactions.gateway_response IS 'Full webhook payload from payment gateway stored as JSON for debugging and auditing';
COMMENT ON COLUMN tours_payment_transactions.payment_token IS 'Payment session ID from gateway (e.g., PayMongo checkout session ID)';

COMMIT;

-- Verification queries (run these after applying migration)
-- SELECT COUNT(*) FROM tours_payment_transactions;
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'tours_payment_transactions';
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'tours_payment_transactions'::regclass;
