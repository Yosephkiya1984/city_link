-- Add new columns IF NOT EXISTS
ALTER TABLE public.marketplace_orders ADD COLUMN IF NOT EXISTS pickup_pin character varying;
ALTER TABLE public.marketplace_orders ADD COLUMN IF NOT EXISTS agent_fee numeric DEFAULT 0;
ALTER TABLE public.marketplace_orders ADD COLUMN IF NOT EXISTS platform_fee numeric DEFAULT 0;

-- DROP existing functions avoiding return type mismatches
DROP FUNCTION IF EXISTS public.confirm_agent_handover(text, uuid, text);
DROP FUNCTION IF EXISTS public.reject_delivery_by_buyer(text, uuid, text);
DROP FUNCTION IF EXISTS public.process_marketplace_purchase(uuid, uuid, uuid, integer, text, numeric);
DROP FUNCTION IF EXISTS public.process_marketplace_purchase(uuid, uuid, uuid, integer, text);
DROP FUNCTION IF EXISTS public.accept_delivery_job(text, uuid);
DROP FUNCTION IF EXISTS public.release_escrow(text, text, text);

-- Update process_marketplace_purchase with validations
CREATE OR REPLACE FUNCTION public.process_marketplace_purchase(p_buyer_id uuid, p_product_id uuid, p_merchant_id uuid, p_qty integer, p_shipping_address text, p_delivery_fee numeric DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product_name text;
  v_price numeric;
  v_total numeric;
  v_balance numeric;
  v_agent_fee numeric;
  v_platform_fee numeric;
  v_order_id uuid := gen_random_uuid();
  v_escrow_id uuid := gen_random_uuid();
  v_idempotency_key text := 'mkt-' || v_order_id::text;
  v_pickup_pin varchar(6);
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
  v_total := (v_price * p_qty) + COALESCE(p_delivery_fee, 0);
  v_agent_fee := COALESCE(p_delivery_fee, 0);
  v_platform_fee := ROUND((v_price * p_qty) * 0.05, 2);

  v_pickup_pin := lpad(floor(random() * 1000000)::text, 6, '0');

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
$function$;

-- Update accept_delivery_job for 500 ETB collateral
CREATE OR REPLACE FUNCTION public.accept_delivery_job(p_order_id text, p_agent_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated_count int;
  v_agent_balance numeric;
BEGIN
  -- 0. Check Agent Collateral 
  SELECT balance INTO v_agent_balance FROM public.wallets WHERE user_id = p_agent_id;
  
  -- Changed from 1000 to 500 ETB based on requirements
  IF v_agent_balance IS NULL OR v_agent_balance < 500 THEN
    RETURN json_build_object('ok', false, 'error', 'Insufficient collateral. You need at least 500 ETB in your wallet to accept this delivery.');
  END IF;

  -- 1. Attempt to claim the order
  UPDATE marketplace_orders
  SET agent_id = p_agent_id,
      status = 'AGENT_ASSIGNED',
      updated_at = now()
  WHERE id = p_order_id
    AND agent_id IS NULL
    AND status IN ('DISPATCHING', 'PAID', 'SHIPPED');

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- 2. If we didn't update any rows
  IF v_updated_count = 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Job already taken or no longer available');
  END IF;

  -- 3. Mark the winner's dispatch record as ACCEPTED
  UPDATE delivery_dispatches
  SET status = 'ACCEPTED',
      responded_at = now()
  WHERE order_id = p_order_id
    AND agent_id = p_agent_id;

  -- 4. Mark all other dispatches for this order as SUPERSEDED (only if they were PENDING)
  UPDATE delivery_dispatches
  SET status = 'SUPERSEDED'
  WHERE order_id = p_order_id
    AND agent_id != p_agent_id
    AND status = 'PENDING';

  RETURN json_build_object('ok', true);
END;
$function$;

-- Update confirm_agent_handover
CREATE OR REPLACE FUNCTION public.confirm_agent_handover(p_order_id text, p_agent_id uuid, p_pickup_pin text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.marketplace_orders WHERE id::text = p_order_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF v_order.agent_id <> p_agent_id THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized_agent');
  END IF;

  IF v_order.pickup_pin IS NULL OR v_order.pickup_pin <> p_pickup_pin THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_pickup_pin');
  END IF;

  UPDATE public.marketplace_orders 
  SET 
    status = 'IN_TRANSIT', 
    agent_confirmed_pickup = true, 
    picked_up_at = now(),
    updated_at = now()
  WHERE id::text = p_order_id;

  RETURN json_build_object('ok', true, 'status', 'IN_TRANSIT');
END;
$function$;

-- Update reject_delivery_by_buyer
CREATE OR REPLACE FUNCTION public.reject_delivery_by_buyer(p_order_id text, p_buyer_id uuid, p_reason text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.marketplace_orders WHERE id::text = p_order_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF v_order.buyer_id <> p_buyer_id AND NOT is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  IF v_order.status NOT IN ('IN_TRANSIT', 'SHIPPED', 'AWAITING_PIN') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status_for_rejection');
  END IF;

  -- Mark as rejected
  UPDATE public.marketplace_orders 
  SET status = 'REJECTED_BY_BUYER', updated_at = now() 
  WHERE id::text = p_order_id;
  
  -- Open a dispute
  INSERT INTO public.disputes (
    order_id, buyer_id, merchant_id, product_name, amount, reason, description, stage, status, raised_at
  )
  VALUES (
    v_order.id, v_order.buyer_id, v_order.merchant_id, v_order.product_name, v_order.total, 'rejected_by_buyer', p_reason, 'at_delivery', 'OPEN', now()
  );

  RETURN json_build_object('ok', true, 'status', 'REJECTED_BY_BUYER');
END;
$function$;

-- Update release_escrow
CREATE OR REPLACE FUNCTION public.release_escrow(p_escrow_id text, p_order_id text, p_release_method text DEFAULT 'delivery_pin'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_escrow          RECORD;
  v_order           RECORD;
  v_merch_wallet_id UUID;
  v_agent_wallet_id UUID;
  v_treasury_id     UUID;
  v_merch_name      TEXT;
  v_merch_share     DECIMAL;
  v_agent_share     DECIMAL;
  v_platform_fee    DECIMAL;
BEGIN
  SELECT * INTO v_escrow FROM escrows WHERE id::TEXT = p_escrow_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'escrow_not_found');
  END IF;

  IF v_escrow.status <> 'LOCKED' THEN
    RETURN json_build_object('ok', false, 'error', 'escrow_already_processed');
  END IF;

  SELECT * INTO v_order FROM marketplace_orders WHERE id::TEXT = p_order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  -- SECURITY HARDENING: Prevent release if the order is disputed or REJECTED
  IF v_order.status IN ('DISPUTED', 'REJECTED_BY_BUYER') THEN
    RETURN json_build_object('ok', false, 'error', 'order_disputed_or_rejected');
  END IF;

  IF auth.uid() IS NOT NULL
     AND auth.uid() <> v_escrow.buyer_id
     AND auth.uid() <> v_escrow.merchant_id
     AND NOT is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT id INTO v_merch_wallet_id FROM wallets WHERE user_id = v_escrow.merchant_id;
  SELECT id INTO v_agent_wallet_id FROM wallets WHERE user_id = v_order.agent_id;
  SELECT id INTO v_treasury_id     FROM wallets WHERE user_id = '00000000-0000-0000-0000-000000000000';
  SELECT COALESCE(business_name, full_name, 'Merchant') INTO v_merch_name FROM profiles WHERE id = v_escrow.merchant_id;

  IF v_merch_wallet_id IS NULL OR v_treasury_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'wallet_missing');
  END IF;

  -- Use explicit order fields instead of hardcoded amounts
  v_agent_share := COALESCE(v_order.agent_fee, 0);
  v_platform_fee := COALESCE(v_order.platform_fee, 0);
  
  -- The product cost portion
  v_merch_share := v_escrow.amount - v_agent_share - v_platform_fee;

  UPDATE wallets SET balance = balance + v_merch_share, updated_at = now() WHERE id = v_merch_wallet_id;
  INSERT INTO transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
  VALUES (gen_random_uuid(), v_merch_wallet_id, v_merch_share, 'credit', 'marketplace_payout',
          'Sale: ' || v_order.product_name, now(), 'merch-' || p_order_id);

  IF v_order.agent_id IS NOT NULL AND v_agent_wallet_id IS NOT NULL AND v_agent_share > 0 THEN
    UPDATE wallets SET balance = balance + v_agent_share, updated_at = now() WHERE id = v_agent_wallet_id;
    INSERT INTO transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
    VALUES (gen_random_uuid(), v_agent_wallet_id, v_agent_share, 'credit', 'delivery_earning',
            'Delivery: ' || v_order.product_name, now(), 'agent-' || p_order_id);
    UPDATE delivery_agents SET total_deliveries = COALESCE(total_deliveries, 0) + 1 WHERE id = v_order.agent_id;
  END IF;

  UPDATE wallets SET balance = balance + v_platform_fee, updated_at = now() WHERE id = v_treasury_id;
  INSERT INTO transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
  VALUES (gen_random_uuid(), v_treasury_id, v_platform_fee, 'credit', 'platform_fee',
          'Fee: ' || v_merch_name, now(), 'fee-' || p_order_id);

  UPDATE escrows SET status = 'RELEASED', release_method = p_release_method, resolved_at = now(), updated_at = now()
  WHERE id::TEXT = p_escrow_id;

  UPDATE marketplace_orders SET status = 'COMPLETED', updated_at = now() WHERE id::TEXT = p_order_id;

  RETURN json_build_object(
    'ok', true,
    'merchant_share', v_merch_share,
    'agent_share',    v_agent_share,
    'platform_fee',   v_platform_fee
  );
END;
$function$;

-- Add decrement_stock function with concurrency lock
CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id uuid, p_qty integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_stock integer;
BEGIN
  -- Lock the product row for update to prevent concurrent modifications
  SELECT stock INTO v_current_stock 
  FROM public.products 
  WHERE id = p_product_id 
  FOR UPDATE;

  IF v_current_stock IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'product_not_found');
  END IF;

  IF v_current_stock < p_qty THEN
    RETURN json_build_object('ok', false, 'error', 'insufficient_stock');
  END IF;

  -- Decrement stock
  UPDATE public.products 
  SET stock = stock - p_qty, updated_at = now() 
  WHERE id = p_product_id;

  RETURN json_build_object('ok', true);
END;
$function$;
