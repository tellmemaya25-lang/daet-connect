-- ================================================================
-- BOOKING SYSTEM - SIMPLE VERSION (No complex policies)
-- Just get the tables created first, policies can be refined later
-- ================================================================

-- Drop existing tables
DROP TABLE IF EXISTS tours_booking_payments CASCADE;
DROP TABLE IF EXISTS tours_booking_participants CASCADE;
DROP TABLE IF EXISTS tours_bookings CASCADE;
DROP FUNCTION IF EXISTS generate_booking_reference() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ================================================================
-- CREATE TABLES
-- ================================================================

CREATE TABLE tours_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES tours_packages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  price_variant_id UUID REFERENCES tours_package_price_variants(id) ON DELETE SET NULL,
  booking_reference VARCHAR(20) UNIQUE NOT NULL,
  tour_date DATE NOT NULL,
  number_of_pax INTEGER NOT NULL CHECK (number_of_pax > 0),
  price_per_pax DECIMAL(10,2),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  contact_name VARCHAR(200) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50) NOT NULL,
  special_requests TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'rejected')),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tours_booking_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES tours_bookings(id) ON DELETE CASCADE,
  full_name VARCHAR(200) NOT NULL,
  age INTEGER CHECK (age > 0 AND age < 150),
  special_requirements TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- ================================================================
-- INDEXES
-- ================================================================

CREATE INDEX idx_bookings_package ON tours_bookings(package_id);
CREATE INDEX idx_bookings_user ON tours_bookings(user_id);
CREATE INDEX idx_bookings_status ON tours_bookings(status);
CREATE INDEX idx_bookings_tour_date ON tours_bookings(tour_date);
CREATE INDEX idx_bookings_reference ON tours_bookings(booking_reference);
CREATE INDEX idx_booking_participants_booking ON tours_booking_participants(booking_id);
CREATE INDEX idx_payments_booking ON tours_booking_payments(booking_id);
CREATE INDEX idx_payments_status ON tours_booking_payments(payment_status);

-- ================================================================
-- FUNCTIONS
-- ================================================================

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
-- SIMPLE RLS POLICIES (Just enable basic access, we'll refine later)
-- ================================================================

ALTER TABLE tours_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours_booking_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours_booking_payments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all bookings (temporary - will restrict later)
CREATE POLICY "Allow authenticated read" ON tours_bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON tours_bookings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON tours_bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read participants" ON tours_booking_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert participants" ON tours_booking_participants FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read payments" ON tours_booking_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert payments" ON tours_booking_payments FOR INSERT TO authenticated WITH CHECK (true);

-- ================================================================
-- SUCCESS!
-- ================================================================
-- Tables created with basic RLS
-- You can now build the booking UI
-- We'll add more restrictive policies later once everything works
-- ================================================================
