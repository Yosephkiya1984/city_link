-- supabase/migrations/20260427170000_distance_pricing_engine.sql
-- 1. Add Location support to Citizens and Merchants
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2. Haversine Distance Function (Returns KM)
CREATE OR REPLACE FUNCTION public.calculate_distance(lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION, lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    R DOUBLE PRECISION := 6371; -- Earth radius in KM
    dLat DOUBLE PRECISION;
    dLon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN 5.0; -- Default to 5km if locations are missing for some reason
    END IF;

    dLat := radians(lat2 - lat1);
    dLon := radians(lon2 - lon1);
    a := sin(dLat/2) * sin(dLat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLon/2) * sin(dLon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    RETURN R * c;
END;
$$;

-- 3. Delivery Fee Logic (Market-Correct for Ethiopia)
-- Logic: 80 ETB Base + 12 ETB/KM. Minimum 100 ETB.
CREATE OR REPLACE FUNCTION public.calculate_delivery_fee(p_merchant_id UUID, p_citizen_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_m_lat DOUBLE PRECISION;
    v_m_lng DOUBLE PRECISION;
    v_c_lat DOUBLE PRECISION;
    v_c_lng DOUBLE PRECISION;
    v_dist DOUBLE PRECISION;
    v_fee NUMERIC;
BEGIN
    SELECT latitude, longitude INTO v_m_lat, v_m_lng FROM public.merchants WHERE id = p_merchant_id;
    SELECT latitude, longitude INTO v_c_lat, v_c_lng FROM public.profiles WHERE id = p_citizen_id;
    
    v_dist := public.calculate_distance(v_m_lat, v_m_lng, v_c_lat, v_c_lng);
    
    -- Base 80 + 12 per KM, floor at 100
    v_fee := GREATEST(100, 80 + (v_dist * 12));
    
    -- Round to nearest 5 ETB for cleaner pricing (Ethiopian market preference)
    RETURN round(v_fee / 5) * 5;
END;
$$;

-- 4. Secure Wrapper for Frontend
CREATE OR REPLACE FUNCTION public.get_cart_delivery_fees(p_merchant_ids UUID[], p_citizen_id UUID)
RETURNS TABLE (merchant_id UUID, fee NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT m_id, public.calculate_delivery_fee(m_id, p_citizen_id)
    FROM unnest(p_merchant_ids) AS m_id;
END;
$$;
