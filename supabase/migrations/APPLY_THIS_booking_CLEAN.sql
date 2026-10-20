-- ================================================================
-- BOOKING SYSTEM - CLEAN INSTALL
-- This drops and recreates everything fresh
-- ================================================================

-- Drop existing tables (in reverse order of dependencies)
DROP TABLE IF EXISTS tours_booking_payments CASCADE;
DROP TABLE IF EXISTS tours_booking_participants CASCADE;
DROP TABLE IF EXISTS tours_bookings CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS generate_booking_reference() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ================================================================
-- BOOKINGS TABLE
-- ================================================================
CREATE TABLE tours_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  package_id UUID NOT NULL REFERENCES tours_packages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  price_variant_id UUID REFERENCES tours_package_price_variants(id) ON DELETE SET NULL,
  
  -- Booking details
  booking_reference VARCHAR(20) UNIQUE NOT NULL,
  tour_date DATE NOT NULL,
  number_of_pax INTEGER NOT NULL CHECK (number_of_pax > 0),
  
  -- Pricing
  price_per_pax DECIMAL(10,2),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  
  -- Contact information
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
  cancelled_by UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bookings_package ON tours_bookings(package_id);
CREATE INDEX idx_bookings_user ON tours_bookings(user_id);
CREATE INDEX idx_bookings_status ON tours_bookings(status);
CREATE INDEX idx_bookings_tour_date ON tours_bookings(tour_date);
CREATE INDEX idx_bookings_reference ON tours_bookings(booking_reference);

-- ================================================================
-- BOOKING PARTICIPANTS TABLE
-- ================================================================
CREATE TABLE tours_booking_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES tours_bookings(id) ON DELETE CASCADE,
  
  full_name VARCHAR(200) NOT NULL,
  age INTEGER CHECK (age > 0 AND age < 150),
  special_requirements TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_participants_booking ON tours_booking_participants(booking_id);

-- ================================================================
-- BOOKING PAYMENTS TABLE
-- ================================================================
CREATE TABLE tours_booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES tours_bookings(id) ON DELETE CASCADE,
  
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50) NOT NULL 
    CHECK (payment_method IN ('cash', 'gcash', 'bank_transfer', 'card', 'other')),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  
  receipt_url TEXT,
  transaction_reference VARCHAR(200),
  
  paid_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON tours_booking_payments(booking_id);
CREATE INDEX idx_payments_status ON tours_booking_payments(payment_status);

-- ================================================================
-- FUNCTIONS
-- ================================================================

-- Booking reference generator
CREATE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
  ref TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    ref := 'BK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
           UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    SELECT EXISTS(SELECT 1 FROM tours_bookings WHERE booking_reference = ref) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Updated at trigger function
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- TRIGGERS
-- ================================================================

CREATE TRIGGER trigger_bookings_updated_at
  BEFORE UPDATE ON tours_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_payments_updated_at
  BEFORE UPDATE ON tours_booking_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE tours_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours_booking_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours_booking_payments ENABLE ROW LEVEL SECURITY;

-- Tourists can view their own bookings
CREATE POLICY "Tourists can view own bookings"
ON tours_bookings FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Tourists can create bookings
CREATE POLICY "Tourists can create bookings"
ON tours_bookings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Tourists can cancel their bookings
CREATE POLICY "Tourists can cancel own bookings"
ON tours_bookings FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() AND
  status IN ('pending', 'confirmed') AND
  NEW.status = 'cancelled'
);

-- Operators can view bookings for their packages
CREATE POLICY "Operators can view bookings for their packages"
ON tours_bookings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tours_packages p
    JOIN tours_operators o ON p.operator_id = o.id
    WHERE p.id = package_id
    AND o.profile_id = auth.uid()
  )
);

-- Operators can update booking status
CREATE POLICY "Operators can update booking status"
ON tours_bookings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tours_packages p
    JOIN tours_operators o ON p.operator_id = o.id
    WHERE p.id = package_id
    AND o.profile_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tours_packages p
    JOIN tours_operators o ON p.operator_id = o.id
    WHERE p.id = package_id
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

-- Participants policies
CREATE POLICY "Tourists can view own booking participants"
ON tours_booking_participants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tours_bookings
    WHERE id = booking_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Tourists can add participants"
ON tours_booking_participants FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tours_bookings
    WHERE id = booking_id
    AND user_id = auth.uid()
  )
);

-- Payment policies
CREATE POLICY "Tourists can view own payments"
ON tours_booking_payments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tours_bookings
    WHERE id = booking_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Operators can view payments"
ON tours_booking_payments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tours_bookings b
    JOIN tours_packages p ON b.package_id = p.id
    JOIN tours_operators o ON p.operator_id = o.id
    WHERE b.id = booking_id
    AND o.profile_id = auth.uid()
  )
);

-- ================================================================
-- SETUP COMPLETE!
-- ================================================================
