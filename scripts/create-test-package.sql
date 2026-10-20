-- Create a test package with sample data
-- Run this in Supabase SQL Editor

-- First, get an approved operator (replace with actual operator_id if you know it)
DO $$
DECLARE
  v_operator_id UUID;
  v_package_id UUID;
BEGIN
  -- Get the first approved operator
  SELECT id INTO v_operator_id
  FROM tours_operators
  WHERE accreditation_status = 'approved'
  LIMIT 1;

  IF v_operator_id IS NULL THEN
    RAISE EXCEPTION 'No approved operators found. Please approve an operator first.';
  END IF;

  -- Create the test package
  INSERT INTO tours_packages (
    operator_id,
    title,
    description,
    location_name,
    duration_value,
    duration_type,
    status
  ) VALUES (
    v_operator_id,
    'Island Hopping Adventure',
    'Explore the beautiful islands of Daet with our expert guides. Visit pristine beaches, snorkel in crystal-clear waters, and enjoy a delicious lunch on a secluded island. Perfect for families and groups!',
    'Daet, Camarines Norte',
    1,
    'days',
    'published'
  ) RETURNING id INTO v_package_id;

  -- Add inclusions
  INSERT INTO tours_package_inclusions (package_id, item_text, is_included) VALUES
    (v_package_id, 'Round-trip boat transfer', true),
    (v_package_id, 'Snorkeling equipment', true),
    (v_package_id, 'Lunch and refreshments', true),
    (v_package_id, 'Professional tour guide', true),
    (v_package_id, 'Entrance fees to islands', true),
    (v_package_id, 'Personal expenses', false),
    (v_package_id, 'Travel insurance', false);

  -- Add price variant
  INSERT INTO tours_package_price_variants (
    package_id,
    variant_name,
    price_per_pax,
    min_pax,
    max_pax,
    is_default
  ) VALUES (
    v_package_id,
    'Standard Rate',
    1500,
    2,
    10,
    true
  );

  -- Add itinerary stops
  INSERT INTO tours_package_stops (package_id, stop_name, stop_description, latitude, longitude, order_index) VALUES
    (v_package_id, 'Bagasbas Beach', 'Starting point - meet at the main beach entrance', 14.1167, 122.9500, 0),
    (v_package_id, 'Apuao Grande Island', 'First stop - white sand beach and snorkeling', 14.0833, 122.9667, 1),
    (v_package_id, 'Canimog Island', 'Lunch break and swimming', 14.0667, 122.9833, 2),
    (v_package_id, 'Bagasbas Beach', 'Return to starting point', 14.1167, 122.9500, 3);

  RAISE NOTICE 'Test package created successfully! Package ID: %', v_package_id;
END $$;

-- Verify the package was created
SELECT 
  id,
  title,
  status,
  location_name,
  'http://localhost:3000/tours/packages/' || id::text as public_url
FROM tours_packages
WHERE title = 'Island Hopping Adventure'
ORDER BY created_at DESC
LIMIT 1;
