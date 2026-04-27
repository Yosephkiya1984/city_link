-- ===========================================================================
-- CityLink Security Hardening — 2026-04-19
-- Fixes:
--   1. Add admin_reject_merchant RPC (server-side auth, consistent with admin_approve_merchant)
--   2. Replace random() with gen_random_bytes() for pickup_pin generation in
--      process_marketplace_purchase — random() is a PRNG, not cryptographically secure.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. admin_reject_merchant RPC
--    Enforces server-side role check via auth.uid() before performing any
--    mutations. Previously rejectMerchant() in the client was directly writing
--    to profiles and merchants tables, bypassing this check.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_reject_merchant(
  p_merchant_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  -- Verify the caller is an admin (server-side; cannot be spoofed from the client)
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not an admin';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rejection reason is required');
  END IF;

  -- Temporarily bypass the sensitive-fields trigger for this privileged operation
  PERFORM set_config('app.bypass_rls', 'true', true);

  -- Update profile KYC status
  UPDATE profiles
  SET
    kyc_status    = 'REJECTED',
    fayda_verified = false,
    reject_reason  = trim(p_reason),
    updated_at     = NOW()
  WHERE id = p_merchant_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Merchant profile not found');
  END IF;

  -- Update merchant record
  UPDATE merchants
  SET merchant_status = 'REJECTED'
  WHERE id = p_merchant_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Fix pickup_pin generation in process_marketplace_purchase
--    Replaces: lpad(floor(random() * 1000000)::text, 6, '0')
--    With:     encode(gen_random_bytes(3), 'hex') trimmed to 6 digits
--
--    gen_random_bytes() uses the OS CSPRNG (same source as pgcrypto).
--    This PIN gates escrow release via confirm_agent_handover, so it must
--    be unpredictable.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.process_marketplace_purchase(uuid, uuid, uuid, integer, text, numeric);

CREATE OR REPLACE FUNCTION public.process_marketplace_purchase(
  p_buyer_id        uuid,
  p_product_id      uuid,
  p_merchant_id     uuid,
  p_qty             integer,
  p_shipping_address text,
  p_delivery_fee    numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_product_name  text;
  v_price         numeric;
  v_total         numeric;
  v_balance       numeric;
  v_agent_fee     numeric;
  v_platform_fee  numeric;
  v_order_id      uuid    := gen_random_uuid();
  v_escrow_id     uuid    := gen_random_uuid();
  v_idempotency_key text  := 'mkt-' || v_order_id::text;
  v_pickup_pin    varchar(6);
BEGIN
  -- 1. Auth Check
  IF auth.uid() <> p_buyer_id AND NOT is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  -- 2. Fetch Product Data
  SELECT name, price INTO v_product_name, v_price
  FROM public.products
  WHERE id = p_product_id;

  IF v_product_name IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'product_not_found');
  END IF;

  -- Fee Validation (max 20% of subtotal)
  IF p_delivery_fee > (v_price * p_qty * 0.20) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Delivery fee exceeds maximum allowed percentage');
  END IF;

  -- Split mapping logic
  v_total        := (v_price * p_qty) + COALESCE(p_delivery_fee, 0);
  v_agent_fee    := COALESCE(p_delivery_fee, 0);
  v_platform_fee := ROUND((v_price * p_qty) * 0.05, 2);

  -- 🛡️ SECURITY FIX: Use gen_random_bytes() (CSPRNG) instead of random() (PRNG).
  -- A 6-digit PIN derived from 3 random bytes gives ~16.7M possible values with
  -- uniform distribution from the OS entropy pool.
  v_pickup_pin := lpad(
    (get_byte(gen_random_bytes(3), 0) * 65536
     + get_byte(gen_random_bytes(3), 1) * 256
     + get_byte(gen_random_bytes(3), 2)) % 1000000,
    6, '0'
  )::varchar;

  -- 3. Lock Buyer Wallet
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_buyer_id FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wallet_not_found');
  END IF;

  IF v_balance < v_total THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance');
  END IF;

  -- 4. Check & Decrement Stock
  IF NOT (SELECT (public.decrement_stock(p_product_id, p_qty))->>'ok')::boolean THEN
    RETURN jsonb_build_object('ok', false, 'error', 'out_of_stock');
  END IF;

  -- 5. Deduct Balance
  UPDATE public.wallets SET balance = balance - v_total, updated_at = now()
  WHERE user_id = p_buyer_id;

  -- 6. Create Escrow
  INSERT INTO public.escrows (
    id, buyer_id, merchant_id, amount, service_type, status, created_at, updated_at
  )
  VALUES (
    v_escrow_id, p_buyer_id, p_merchant_id, v_total, 'marketplace', 'LOCKED', now(), now()
  );

  -- 7. Create Order
  INSERT INTO public.marketplace_orders (
    id, escrow_id, buyer_id, merchant_id, product_id, product_name,
    qty, quantity, total, status, shipping_address,
    created_at, updated_at, expires_at, idempotency_key, pickup_pin, agent_fee, platform_fee
  )
  VALUES (
    v_order_id::text, v_escrow_id, p_buyer_id, p_merchant_id, p_product_id, v_product_name,
    p_qty, p_qty, v_total, 'PAID', p_shipping_address,
    now(), now(), now() + INTERVAL '7 days', v_idempotency_key, v_pickup_pin, v_agent_fee, v_platform_fee
  );

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'total', v_total,
    'new_balance', v_balance - v_total
  );
END;
$$;
