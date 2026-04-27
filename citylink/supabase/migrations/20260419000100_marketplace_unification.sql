-- 20260419000100_marketplace_unification.sql
-- Consolidated and hardened marketplace operations

-- 1. Cleanup Legacy/Shadow Functions
DROP FUNCTION IF EXISTS public.process_marketplace_purchase(uuid, uuid, uuid, integer, text, numeric);
DROP FUNCTION IF EXISTS public.process_marketplace_purchase(uuid, uuid, uuid, integer, text, numeric, numeric);
DROP FUNCTION IF EXISTS public.release_escrow(text, text, text);
DROP FUNCTION IF EXISTS public.release_escrow(text, text, text, text);

-- 2. Unified process_marketplace_purchase (Hardened)
CREATE OR REPLACE FUNCTION public.process_marketplace_purchase(
    p_buyer_id uuid, 
    p_product_id uuid, 
    p_merchant_id uuid, 
    p_qty integer, 
    p_shipping_address text, 
    p_delivery_fee numeric DEFAULT 0,
    p_expected_price numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_product_name    text;
  v_price           numeric;
  v_total           numeric;
  v_balance         numeric;
  v_agent_fee       numeric;
  v_platform_fee    numeric;
  v_order_id        uuid    := gen_random_uuid();
  v_escrow_id       uuid    := gen_random_uuid();
  v_idempotency_key text    := 'mkt-' || v_order_id::text;
  v_rand_bytes      bytea;
  v_pickup_pin      varchar(6);
BEGIN
  -- Authorization
  IF auth.uid() <> p_buyer_id AND NOT is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  -- Wallet Integrity (Locking Row)
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_buyer_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wallet_not_found');
  END IF;

  -- Fetch Product Data
  SELECT name, price INTO v_product_name, v_price
  FROM public.products
  WHERE id = p_product_id;

  IF v_product_name IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'product_not_found');
  END IF;

  -- PRICE LOCK VALIDATION
  IF p_expected_price IS NOT NULL AND v_price <> p_expected_price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'price_changed', 'current_price', v_price);
  END IF;

  -- Fee Sanity Check
  IF p_delivery_fee > GREATEST(v_price * p_qty * 0.50, 500) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'delivery_fee_excessive');
  END IF;

  -- Economic Calculations
  v_total        := (v_price * p_qty) + COALESCE(p_delivery_fee, 0);
  v_agent_fee    := COALESCE(p_delivery_fee, 0);
  v_platform_fee := ROUND((v_price * p_qty) * 0.05, 2);

  IF v_balance < v_total THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance', 'required', v_total);
  END IF;

  -- CSPRNG PIN Generation
  v_rand_bytes := gen_random_bytes(4);
  v_pickup_pin := lpad(
    (abs(
       get_byte(v_rand_bytes, 0) * 16777216
     + get_byte(v_rand_bytes, 1) * 65536
     + get_byte(v_rand_bytes, 2) * 256
     + get_byte(v_rand_bytes, 3)
    ) % 1000000)::text,
    6, '0'
  )::varchar;

  -- Inventory Integrity (Atomic Decrement)
  IF NOT (SELECT (public.decrement_stock(p_product_id, p_qty))->>'ok')::boolean THEN
    RETURN jsonb_build_object('ok', false, 'error', 'out_of_stock');
  END IF;

  -- Deduct Balance
  UPDATE public.wallets SET balance = balance - v_total, updated_at = now()
  WHERE user_id = p_buyer_id;

  -- Create Escrow
  INSERT INTO public.escrows (id, buyer_id, merchant_id, amount, service_type, status, created_at, updated_at)
  VALUES (v_escrow_id, p_buyer_id, p_merchant_id, v_total, 'marketplace', 'LOCKED', now(), now());

  -- Create Order
  INSERT INTO public.marketplace_orders (
    id, escrow_id, buyer_id, merchant_id, product_id, product_name,
    qty, total, status, shipping_address,
    created_at, updated_at, expires_at, idempotency_key, pickup_pin, agent_fee, platform_fee
  )
  VALUES (
    v_order_id::text, v_escrow_id, p_buyer_id, p_merchant_id, p_product_id, v_product_name,
    p_qty, v_total, 'PAID', p_shipping_address,
    now(), now(), now() + INTERVAL '7 days', v_idempotency_key, v_pickup_pin, v_agent_fee, v_platform_fee
  );

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'total', v_total,
    'new_balance', v_balance - v_total,
    'price_locked', v_price
  );
END;
$function$;

-- 3. Unified release_escrow (Hardened)
CREATE OR REPLACE FUNCTION public.release_escrow(
    p_escrow_id text, 
    p_order_id text, 
    p_release_method text DEFAULT 'delivery_pin',
    p_delivery_pin text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_escrow RECORD; v_order RECORD;
  v_merch_wallet_id UUID; v_agent_wallet_id UUID; v_treasury_id UUID;
  v_merch_share DECIMAL; v_agent_share DECIMAL; v_platform_fee DECIMAL;
BEGIN
  -- Fetch and Lock Escrow/Order
  SELECT * INTO v_escrow FROM public.escrows WHERE id::TEXT = p_escrow_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'escrow_not_found'); END IF;
  IF v_escrow.status <> 'LOCKED' THEN RETURN json_build_object('ok', false, 'error', 'escrow_already_processed'); END IF;

  SELECT * INTO v_order FROM public.marketplace_orders WHERE id::TEXT = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'order_not_found'); END IF;

  -- PIN Check
  IF p_release_method = 'delivery_pin' THEN
    IF v_order.delivery_pin IS NULL OR v_order.delivery_pin <> p_delivery_pin THEN
      UPDATE marketplace_orders 
      SET failed_pin_attempts = COALESCE(failed_pin_attempts, 0) + 1,
          is_locked = CASE WHEN COALESCE(failed_pin_attempts, 0) + 1 >= 5 THEN true ELSE false END
      WHERE id::TEXT = p_order_id;
      
      RETURN json_build_object('ok', false, 'error', 'invalid_pin');
    END IF;
  END IF;

  -- Authorization
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_escrow.buyer_id AND auth.uid() <> v_escrow.merchant_id AND NOT is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  -- Wallet Retrieval
  SELECT id INTO v_merch_wallet_id FROM public.wallets WHERE user_id = v_escrow.merchant_id;
  SELECT id INTO v_agent_wallet_id FROM public.wallets WHERE user_id = v_order.agent_id;
  SELECT id INTO v_treasury_id FROM public.wallets WHERE user_id = '00000000-0000-0000-0000-000000000000';

  IF v_merch_wallet_id IS NULL OR v_treasury_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'wallet_missing');
  END IF;

  v_agent_share := COALESCE(v_order.agent_fee, 0);
  v_platform_fee := COALESCE(v_order.platform_fee, 0);
  v_merch_share := v_escrow.amount - v_agent_share - v_platform_fee;

  -- Atomic Transfers
  UPDATE public.wallets SET balance = balance + v_merch_share, updated_at = now() WHERE id = v_merch_wallet_id;
  INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
  VALUES (gen_random_uuid(), v_merch_wallet_id, v_merch_share, 'credit', 'marketplace_payout', 'Sale: ' || v_order.product_name, now(), 'merch-' || p_order_id);

  IF v_order.agent_id IS NOT NULL AND v_agent_wallet_id IS NOT NULL AND v_agent_share > 0 THEN
    UPDATE public.wallets SET balance = balance + v_agent_share, updated_at = now() WHERE id = v_agent_wallet_id;
    INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
    VALUES (gen_random_uuid(), v_agent_wallet_id, v_agent_share, 'credit', 'delivery_earning', 'Delivery: ' || v_order.product_name, now(), 'agent-' || p_order_id);
  END IF;

  UPDATE public.wallets SET balance = balance + v_platform_fee, updated_at = now() WHERE id = v_treasury_id;
  INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
  VALUES (gen_random_uuid(), v_treasury_id, v_platform_fee, 'credit', 'platform_fee', 'Platform Fee: ' || p_order_id, now(), 'fee-' || p_order_id);

  -- Finalize State
  UPDATE public.escrows SET status = 'RELEASED', release_method = p_release_method, resolved_at = now(), updated_at = now() WHERE id::TEXT = p_escrow_id;
  UPDATE public.marketplace_orders SET status = 'COMPLETED', updated_at = now() WHERE id::TEXT = p_order_id;

  RETURN json_build_object('ok', true, 'merchant_share', v_merch_share);
END;
$function$;

-- 4. Rate Limit Hardening
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_role_only_rate_limits ON public.rate_limits;
CREATE POLICY service_role_only_rate_limits ON public.rate_limits
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);
