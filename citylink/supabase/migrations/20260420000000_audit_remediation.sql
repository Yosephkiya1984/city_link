-- supabase/migrations/20260420000000_audit_remediation.sql

-- 1. RPC to reject a delivery agent
CREATE OR REPLACE FUNCTION admin_reject_agent(p_agent_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_agent RECORD;
BEGIN
  -- Verify caller is an admin
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not an admin';
  END IF;

  -- Temporarily bypass RLS for administrative update
  PERFORM set_config('app.bypass_rls', 'true', true);

  -- 1. Update Agent Status
  UPDATE delivery_agents
  SET agent_status = 'REJECTED'
  WHERE id = p_agent_id
  RETURNING * INTO v_agent;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agent record not found');
  END IF;

  -- 2. Update Profile KYC
  UPDATE profiles 
  SET kyc_status = 'REJECTED',
      reject_reason = p_reason,
      updated_at = NOW()
  WHERE id = p_agent_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2. RPC to open a marketplace dispute (Atomic)
CREATE OR REPLACE FUNCTION open_order_dispute(
  p_order_id TEXT, 
  p_buyer_id UUID, 
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Verify caller is the buyer
  IF auth.uid() IS DISTINCT FROM p_buyer_id THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not the buyer';
  END IF;

  -- Fetch order details and verify ownership
  SELECT * INTO v_order 
  FROM marketplace_orders 
  WHERE id = p_order_id AND buyer_id = p_buyer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found or unauthorized');
  END IF;

  IF v_order.status = 'DISPUTED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is already disputed');
  END IF;

  -- 1. Update Order Status
  UPDATE marketplace_orders
  SET status = 'DISPUTED',
      updated_at = NOW()
  WHERE id = p_order_id;

  -- 2. Insert Dispute Record
  INSERT INTO disputes (
    id,
    order_id,
    buyer_id,
    merchant_id,
    product_name,
    amount,
    reason,
    description,
    stage,
    status,
    raised_at
  ) VALUES (
    gen_random_uuid(),
    (p_order_id)::uuid, -- Casting text ID to UUID for disputes table
    p_buyer_id,
    v_order.merchant_id,
    COALESCE(v_order.product_name, 'Unknown Product'),
    v_order.total,
    p_reason,
    p_reason,
    'before_pin',
    'OPEN',
    NOW()
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. RPC to securely update PIN hash
CREATE OR REPLACE FUNCTION secure_update_pin_hash(
  p_new_hash TEXT, 
  p_old_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_hash TEXT;
BEGIN
  -- Get current hash
  SELECT pin_hash INTO v_current_hash FROM profiles WHERE id = auth.uid();

  -- If current hash exists, we MUST verify the old hash
  IF v_current_hash IS NOT NULL THEN
    IF p_old_hash IS NULL OR p_old_hash IS DISTINCT FROM v_current_hash THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid current PIN hash');
    END IF;
  END IF;

  -- Update hash
  UPDATE profiles
  SET pin_hash = p_new_hash,
      updated_at = NOW()
  WHERE id = auth.uid();

  RETURN jsonb_build_object('success', true);
END;
$$;
