-- ================================================================
-- BOOKING SYSTEM - Database Schema
-- Run this in Supabase SQL Editor
-- ================================================================

-- ================================================================
-- BOOKINGS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS tours_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  package_id UUID NOT NULL REFERENCES tours_packages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Just store the auth user ID, no foreign key to avoid table structure issues
  price_variant_id UUID REFERENCES tours_package_price_variants(id) ON DELETE SET NULL,
  
  -- Booking details
  booking_reference VARCHAR(20) UNIQUE NOT NULL, -- e.g., BK-20261018-ABC123
  tour_date DATE NOT NULL,
  number_of_pax INTEGER NOT NULL CHECK (number_of_pax > 0),
  
  -- Pricing
  price_per_pax DECIMAL(10,2),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  
  -- Contact information (stored even if user is not registered)
  contact_name VARCHAR(200) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50) NOT NULL,
  special_requests TEXT,
  
  -- Status workflow
  status VARCHAR(50) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'rejected')),
  
  -- Cancellation/rejection
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID, -- Just store UUID, no foreign key
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_package ON tours_bookings(package_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON tours_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON tours_bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_tour_date ON tours_bookings(tour_date);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON tours_bookings(booking_reference);

COMMENT ON TABLE tours_bookings IS 'Tour package bookings by tourists';
COMMENT ON COLUMN tours_bookings.booking_reference IS 'Unique human-readable booking reference';
COMMENT ON COLUMN tours_bookings.status IS 'pending: awaiting operator confirmation, confirmed: operator accepted, cancelled: tourist cancelled, completed: tour finished, rejected: operator rejected';

-- ================================================================
-- BOOKING PARTICIPANTS TABLE (optional, for group bookings)
-- ================================================================
CREATE TABLE IF NOT EXISTS tours_booking_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES tours_bookings(id) ON DELETE CASCADE,
  
  full_name VARCHAR(200) NOT NULL,
  age INTEGER CHECK (age > 0 AND age < 150),
  special_requirements TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_participants_booking ON tours_booking_participants(booking_id);

COMMENT ON TABLE tours_booking_participants IS 'Individual participants/pax for a booking (optional detailed info)';

-- ================================================================
-- BOOKING PAYMENTS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS tours_booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES tours_bookings(id) ON DELETE CASCADE,
  
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50) NOT NULL 
    CHECK (payment_method IN ('cash', 'gcash', 'bank_transfer', 'card', 'other')),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  
  -- Payment proof
  receipt_url TEXT,
  transaction_reference VARCHAR(200),
  
  -- Payment details
  paid_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID, -- Just store UUID, no foreign key
  
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON tours_booking_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON tours_booking_payments(payment_status);

COMMENT ON TABLE tours_booking_payments IS 'Payment records for bookings';

-- ================================================================
-- BOOKING REFERENCE SEQUENCE FUNCTION
-- ================================================================
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
  ref TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Format: BK-YYYYMMDD-RANDOM6
    ref := 'BK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
           UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    -- Check if reference already exists
    SELECT EXISTS(SELECT 1 FROM tours_bookings WHERE booking_reference = ref) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

ALTER TABLE tours_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours_booking_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours_booking_payments ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "Tourists can view own bookings" ON tours_bookings;
DROP POLICY IF EXISTS "Tourists can create bookings" ON tours_bookings;
DROP POLICY IF EXISTS "Tourists can cancel own bookings" ON tours_bookings;
DROP POLICY IF EXISTS "Operators can view bookings for their packages" ON tours_bookings;
DROP POLICY IF EXISTS "Operators can update booking status" ON tours_bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON tours_bookings;

-- Bookings: Tourists can view their own bookings
CREATE POLICY "Tourists can view own bookings"
ON tours_bookings FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Bookings: Tourists can create bookings
CREATE POLICY "Tourists can create bookings"
ON tours_bookings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Bookings: Tourists can cancel their own bookings
CREATE POLICY "Tourists can cancel own bookings"
ON tours_bookings FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() AND
  status IN ('pending', 'confirmed') AND
  NEW.status = 'cancelled'
);

-- Bookings: Operators can view bookings for their packages
CREATE POLICY "Operators can view bookings for their packages"
ON tours_bookings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tours_packages p
    JOIN tours_operators o ON p.operator_id = o.id
    WHERE p.id = tours_bookings.package_id
    AND o.profile_id = auth.uid()
  )
);

-- Bookings: Operators can update booking status
CREATE POLICY "Operators can update booking status"
ON tours_bookings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tours_packages p
    JOIN tours_operators o ON p.operator_id = o.id
    WHERE p.id = tours_bookings.package_id
    AND o.profile_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tours_packages p
    JOIN tours_operators o ON p.operator_id = o.id
    WHERE p.id = tours_bookings.package_id
    AND o.profile_id = auth.uid()
  )
);

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
ON tours_bookings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Drop existing participant policies
DROP POLICY IF EXISTS "Tourists can view own booking participants" ON tours_booking_participants;
DROP POLICY IF EXISTS "Tourists can add participants to own bookings" ON tours_booking_participants;

-- Participants: Same policies as bookings
CREATE POLICY "Tourists can view own booking participants"
ON tours_booking_participants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tours_bookings
    WHERE id = tours_booking_participants.booking_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Tourists can add participants to own bookings"
ON tours_booking_participants FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tours_bookings
    WHERE id = tours_booking_participants.booking_id
    AND user_id = auth.uid()
  )
);

-- Drop existing payment policies
DROP POLICY IF EXISTS "Tourists can view own booking payments" ON tours_booking_payments;
DROP POLICY IF EXISTS "Operators can view payments for their bookings" ON tours_booking_payments;

-- Payments: Similar policies
CREATE POLICY "Tourists can view own booking payments"
ON tours_booking_payments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tours_bookings
    WHERE id = tours_booking_payments.booking_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Operators can view payments for their bookings"
ON tours_booking_payments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tours_bookings b
    JOIN tours_packages p ON b.package_id = p.id
    JOIN tours_operators o ON p.operator_id = o.id
    WHERE b.id = tours_booking_payments.booking_id
    AND o.profile_id = auth.uid()
  )
);

-- ================================================================
-- UPDATED_AT TRIGGER
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bookings_updated_at
  BEFORE UPDATE ON tours_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_payments_updated_at
  BEFORE UPDATE ON tours_booking_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- SETUP COMPLETE!
-- ================================================================
-- Next: Build booking forms and management pages
-- ================================================================
