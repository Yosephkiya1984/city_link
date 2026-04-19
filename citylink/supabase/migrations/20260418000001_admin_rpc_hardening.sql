-- supabase/migrations/20260418000001_admin_rpc_hardening.sql

-- RPC to approve a merchant
CREATE OR REPLACE FUNCTION admin_approve_merchant(p_merchant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_merchant RECORD;
BEGIN
  -- Verify caller is an admin
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not an admin';
  END IF;

  -- Temporarily bypass our own trigger using the session variable
  PERFORM set_config('app.bypass_rls', 'true', true);

  -- 1. Update Merchant Status
  UPDATE merchants
  SET merchant_status = 'APPROVED'
  WHERE id = p_merchant_id
  RETURNING * INTO v_merchant;

  IF FOUND THEN
    -- 2. Update Profile KYC
    UPDATE profiles 
    SET kyc_status = 'VERIFIED',
        updated_at = NOW()
    WHERE id = p_merchant_id;

    RETURN jsonb_build_object('success', true, 'data', row_to_json(v_merchant));
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Merchant not found');
  END IF;
END;
$$;

-- RPC to approve a delivery agent
CREATE OR REPLACE FUNCTION admin_approve_agent(p_agent_id UUID, p_vehicle_type TEXT DEFAULT NULL, p_license_number TEXT DEFAULT NULL, p_plate_number TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_agent RECORD;
  v_rows_affected INTEGER;
BEGIN
  -- Verify caller is an admin
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not an admin';
  END IF;

  -- Temporarily bypass our own trigger using the session variable
  PERFORM set_config('app.bypass_rls', 'true', true);

  -- 1. Upsert Agent Status
  INSERT INTO delivery_agents (id, agent_status, vehicle_type, license_number, plate_number)
  VALUES (p_agent_id, 'APPROVED', p_vehicle_type, p_license_number, p_plate_number)
  ON CONFLICT (id) DO UPDATE SET 
    agent_status = 'APPROVED',
    vehicle_type = COALESCE(p_vehicle_type, delivery_agents.vehicle_type),
    license_number = COALESCE(p_license_number, delivery_agents.license_number),
    plate_number = COALESCE(p_plate_number, delivery_agents.plate_number)
  RETURNING * INTO v_agent;

  -- 2. Update Profile KYC
  UPDATE profiles 
  SET kyc_status = 'VERIFIED',
      updated_at = NOW()
  WHERE id = p_agent_id;

  -- Verify the profile was updated
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agent profile not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'data', row_to_json(v_agent));
END;
$$;
