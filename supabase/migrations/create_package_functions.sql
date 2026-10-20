-- Create RPC functions for package management

-- Function to get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'tourist');
END;
$$;

-- Function to atomically replace package price variants
CREATE OR REPLACE FUNCTION replace_package_price_variants(
  p_package_id UUID,
  p_variants JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the package belongs to the current user's operator account
  IF NOT EXISTS (
    SELECT 1 FROM tours_packages tp
    JOIN tours_operators  toper ON tp.operator_id = toper.id
    WHERE tp.id = p_package_id AND toper.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Package not found or access denied';
  END IF;

  -- Delete existing variants
  DELETE FROM tours_package_price_variants
  WHERE package_id = p_package_id;

  -- Insert new variants
  INSERT INTO tours_package_price_variants (
    package_id,
    variant_name,
    price_per_pax,
    flat_price,
    min_pax,
    max_pax,
    is_default
  )
  SELECT
    p_package_id,
    (v->>'variant_name')::TEXT,
    (v->>'price_per_pax')::NUMERIC,
    (v->>'flat_price')::NUMERIC,
    (v->>'min_pax')::INTEGER,
    (v->>'max_pax')::INTEGER,
    (v->>'is_default')::BOOLEAN
  FROM jsonb_array_elements(p_variants) AS v;
END;
$$;

-- Function to atomically replace package stops with server-computed ordering
CREATE OR REPLACE FUNCTION replace_package_stops(
  p_package_id UUID,
  p_stops JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the package belongs to the current user's operator account
  IF NOT EXISTS (
    SELECT 1 FROM tours_packages tp
    JOIN tours_operators toper ON tp.operator_id = toper.id
    WHERE tp.id = p_package_id AND toper.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Package not found or access denied';
  END IF;

  -- Delete existing stops
  DELETE FROM tours_package_stops
  WHERE package_id = p_package_id;

  -- Insert new stops with computed order_index
  INSERT INTO tours_package_stops (
    package_id,
    stop_name,
    stop_description,
    latitude,
    longitude,
    order_index
  )
  SELECT
    p_package_id,
    (v->>'stop_name')::TEXT,
    (v->>'stop_description')::TEXT,
    (v->>'latitude')::NUMERIC,
    (v->>'longitude')::NUMERIC,
    ROW_NUMBER() OVER () - 1 AS order_index
  FROM jsonb_array_elements(p_stops) AS v;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION replace_package_price_variants(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION replace_package_stops(UUID, JSONB) TO authenticated;
