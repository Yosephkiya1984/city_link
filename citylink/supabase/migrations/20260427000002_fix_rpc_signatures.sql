-- supabase/migrations/20260427000002_fix_rpc_signatures.sql

-- 1. Fix log_client_errors (Critical for startup)
CREATE OR REPLACE FUNCTION log_client_errors(p_errors JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO system_audit_logs (event_type, details, severity, actor_id, created_at)
    SELECT 
        'CLIENT_ERROR',
        error_item,
        COALESCE(error_item->>'severity', 'medium'),
        auth.uid(),
        NOW()
    FROM jsonb_array_elements(p_errors) AS error_item;
END;
$$;

-- 2. Fix calculate_credit_score_rpc
CREATE OR REPLACE FUNCTION calculate_credit_score_rpc(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_score INT := 300;
    v_on_time_count INT;
    v_fayda_verified BOOLEAN;
BEGIN
    -- Base score from on-time payments
    SELECT COUNT(*) INTO v_on_time_count 
    FROM transactions 
    WHERE user_id = p_user_id AND status = 'COMPLETED';
    
    v_score := v_score + (v_on_time_count * 5);
    
    -- Fayda bonus
    SELECT fayda_verified INTO v_fayda_verified 
    FROM profiles 
    WHERE id = p_user_id;
    
    IF v_fayda_verified THEN
        v_score := v_score + 50;
    END IF;
    
    -- Cap score
    v_score := LEAST(GREATEST(v_score, 300), 850);
    
    -- Update profile
    UPDATE profiles 
    SET credit_score = v_score,
        credit_updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN v_score;
END;
$$;

-- 3. Fix lookup_profile_by_phone
CREATE OR REPLACE FUNCTION lookup_profile_by_phone(p_phone TEXT)
RETURNS TABLE (id UUID, role TEXT, full_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.role::TEXT, p.full_name
    FROM profiles p
    WHERE p.phone = p_phone
    LIMIT 1;
END;
$$;

-- 4. Fix get_nearby_agents (PostGIS optimized)
CREATE OR REPLACE FUNCTION get_nearby_agents(
    p_lat DOUBLE PRECISION, 
    p_lng DOUBLE PRECISION, 
    p_radius_meters INT DEFAULT 5000
)
RETURNS TABLE (
    agent_id UUID, 
    first_name TEXT, 
    last_name TEXT, 
    vehicle_type TEXT, 
    current_status TEXT, 
    distance_meters FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        da.id,
        p.full_name as first_name, -- Split logic can be added if needed
        ''::TEXT as last_name,
        da.vehicle_type::TEXT,
        da.agent_status::TEXT,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(da.current_lng, da.current_lat), 4324)::geography,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4324)::geography
        ) as distance_meters
    FROM delivery_agents da
    JOIN profiles p ON da.id = p.id
    WHERE da.is_online = true
      AND da.agent_status = 'APPROVED'
      AND ST_DWithin(
            ST_SetSRID(ST_MakePoint(da.current_lng, da.current_lat), 4324)::geography,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4324)::geography,
            p_radius_meters
      )
    ORDER BY distance_meters ASC;
END;
$$;

-- 5. Fix get_platform_revenue (Parameterless)
CREATE OR REPLACE FUNCTION get_platform_revenue()
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total DECIMAL;
BEGIN
    SELECT SUM(amount) INTO v_total FROM transactions WHERE type = 'COMMISSION';
    RETURN COALESCE(v_total, 0);
END;
$$;

-- 6. Define is_real_user helper
CREATE OR REPLACE FUNCTION is_real_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE;
END;
$$;
