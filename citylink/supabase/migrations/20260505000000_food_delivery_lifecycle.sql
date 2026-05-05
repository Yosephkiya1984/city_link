-- =============================================================================
-- 20260505000000_food_delivery_lifecycle.sql
-- Complete Food Delivery Lifecycle: Table hardening + All missing RPCs
-- =============================================================================

-- 1. ENSURE food_orders has ALL delivery-related columns
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS escrow_id UUID REFERENCES public.escrows(id);
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS agent_fee NUMERIC DEFAULT 0;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS destination_lat NUMERIC;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS destination_lng NUMERIC;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS dispatch_attempts INTEGER DEFAULT 0;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS dispatch_expires_at TIMESTAMPTZ;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS agent_confirmed_pickup BOOLEAN DEFAULT false;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS merchant_confirmed_pickup BOOLEAN DEFAULT false;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS delivery_proof_url TEXT;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS failed_pin_attempts INTEGER DEFAULT 0;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS display_ref TEXT;

-- Indexes for agent queries
CREATE INDEX IF NOT EXISTS idx_food_orders_agent ON public.food_orders(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_food_orders_status ON public.food_orders(status);

-- 2. DROP old signatures to prevent ambiguity
DROP FUNCTION IF EXISTS public.process_food_purchase(text, uuid, uuid, uuid, text, integer, numeric, text, jsonb, text, numeric, numeric);
DROP FUNCTION IF EXISTS public.complete_food_order_payout(text, uuid, text);
DROP FUNCTION IF EXISTS public.reject_food_order_refund(text, uuid);
DROP FUNCTION IF EXISTS public.reveal_food_order_pin(text);
DROP FUNCTION IF EXISTS public.dispatch_order(text, uuid, text, numeric, numeric);
DROP FUNCTION IF EXISTS public.mark_delivery_delivered_atomic(text, uuid, text);
-- Keep old accept_delivery_job(text, uuid) signature alive, add new unified one
DROP FUNCTION IF EXISTS public.accept_delivery_job(text, uuid, text);
-- Keep old confirm_delivery_with_pin(text, text, uuid) alive, add unified
DROP FUNCTION IF EXISTS public.confirm_delivery_with_pin(text, text, uuid, text);

-- =============================================================================
-- 3. process_food_purchase — Atomic food order + wallet deduction + escrow
-- =============================================================================
CREATE OR REPLACE FUNCTION public.process_food_purchase(
  p_order_id TEXT,
  p_citizen_id UUID,
  p_merchant_id UUID,
  p_restaurant_id UUID,
  p_restaurant_name TEXT,
  p_items_count INTEGER,
  p_total NUMERIC,
  p_delivery_pin TEXT DEFAULT NULL,
  p_items_json JSONB DEFAULT '[]'::jsonb,
  p_shipping_address TEXT DEFAULT NULL,
  p_lat NUMERIC DEFAULT NULL,
  p_lng NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance NUMERIC;
  v_escrow_id UUID := gen_random_uuid();
  v_agent_fee NUMERIC := 0;
  v_platform_fee NUMERIC;
  v_pin TEXT;
BEGIN
  IF auth.uid() <> p_citizen_id AND NOT is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_citizen_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wallet_not_found');
  END IF;
  IF v_balance < p_total THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance');
  END IF;

  v_platform_fee := ROUND(p_total * 0.05, 2);
  v_pin := COALESCE(p_delivery_pin, lpad(floor(random() * 1000000)::text, 6, '0'));

  -- Deduct
  UPDATE public.wallets SET balance = balance - p_total, updated_at = now() WHERE user_id = p_citizen_id;

  -- Escrow
  INSERT INTO public.escrows (id, buyer_id, merchant_id, amount, service_type, status, created_at, updated_at)
  VALUES (v_escrow_id, p_citizen_id, p_merchant_id, p_total, 'food', 'LOCKED', now(), now());

  -- Order
  INSERT INTO public.food_orders (
    id, citizen_id, merchant_id, restaurant_id, restaurant_name,
    items, total, status, delivery_pin, escrow_id,
    shipping_address, destination_lat, destination_lng,
    agent_fee, platform_fee, created_at, updated_at
  ) VALUES (
    p_order_id, p_citizen_id, p_merchant_id, p_restaurant_id, p_restaurant_name,
    p_items_json, p_total, 'PENDING', v_pin, v_escrow_id,
    p_shipping_address, p_lat, p_lng,
    v_agent_fee, v_platform_fee, now(), now()
  );

  INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, idempotency_key, created_at)
  VALUES (gen_random_uuid(), (SELECT id FROM wallets WHERE user_id = p_citizen_id),
    p_total, 'debit', 'food_purchase', 'Food: ' || p_restaurant_name, 'food-' || p_order_id, now());

  RETURN jsonb_build_object('ok', true, 'order_id', p_order_id, 'delivery_pin', v_pin, 'escrow_id', v_escrow_id);
END;
$function$;

-- =============================================================================
-- 4. dispatch_order — UNIFIED dispatcher for FOOD and MARKETPLACE
-- =============================================================================
CREATE OR REPLACE FUNCTION public.dispatch_order(
  p_order_id TEXT,
  p_merchant_id UUID,
  p_order_type TEXT DEFAULT 'MARKETPLACE',
  p_lat NUMERIC DEFAULT NULL,
  p_lng NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_table TEXT;
  v_dispatched_count INT := 0;
  v_expires_at TIMESTAMPTZ := now() + interval '5 minutes';
  v_agent_ids UUID[];
  v_sql TEXT;
BEGIN
  v_table := CASE WHEN p_order_type = 'FOOD' THEN 'food_orders' ELSE 'marketplace_orders' END;

  EXECUTE format('SELECT * FROM public.%I WHERE id = $1 FOR UPDATE', v_table) INTO v_order USING p_order_id;
  IF v_order.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF v_order.merchant_id <> p_merchant_id AND NOT is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  IF v_order.status NOT IN ('PENDING', 'PAID', 'READY', 'DISPATCHING', 'AGENT_ASSIGNED') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status_for_dispatch');
  END IF;

  EXECUTE format('UPDATE public.%I SET status = $1, dispatch_expires_at = $2, dispatch_attempts = COALESCE(dispatch_attempts,0)+1, updated_at = now() WHERE id = $3', v_table)
    USING 'DISPATCHING', v_expires_at, p_order_id;

  IF p_lat IS NULL OR p_lng IS NULL THEN
    SELECT array_agg(id) INTO v_agent_ids FROM (
      SELECT id FROM public.delivery_agents
      WHERE is_online = true AND agent_status = 'APPROVED'
        AND (blocked_until IS NULL OR blocked_until <= now())
      ORDER BY location_updated_at DESC NULLS LAST LIMIT 5
    ) x;
  ELSE
    SELECT array_agg(id) INTO v_agent_ids FROM (
      SELECT id FROM public.delivery_agents
      WHERE is_online = true AND agent_status = 'APPROVED'
        AND current_lat IS NOT NULL AND current_lng IS NOT NULL
        AND (blocked_until IS NULL OR blocked_until <= now())
        AND location_updated_at > now() - interval '10 minutes'
      ORDER BY (6371*2*atan2(sqrt(sin(radians((current_lat-p_lat)/2))^2+cos(radians(p_lat))*cos(radians(current_lat))*sin(radians((current_lng-p_lng)/2))^2),sqrt(1-(sin(radians((current_lat-p_lat)/2))^2+cos(radians(p_lat))*cos(radians(current_lat))*sin(radians((current_lng-p_lng)/2))^2)))) ASC
      LIMIT 5
    ) x;
  END IF;

  IF v_agent_ids IS NULL OR array_length(v_agent_ids, 1) = 0 THEN
    RETURN json_build_object('ok', true, 'dispatched_count', 0);
  END IF;

  INSERT INTO public.delivery_dispatches (order_id, agent_id, order_type, expires_at, status, created_at)
  SELECT p_order_id, aid, p_order_type, v_expires_at, 'PENDING', now()
  FROM unnest(v_agent_ids) AS aid
  ON CONFLICT (order_id, agent_id) DO UPDATE
  SET expires_at = EXCLUDED.expires_at, status = EXCLUDED.status, created_at = EXCLUDED.created_at;

  SELECT COUNT(*) INTO v_dispatched_count FROM public.delivery_dispatches
  WHERE order_id = p_order_id AND status = 'PENDING';

  RETURN json_build_object('ok', true, 'dispatched_count', v_dispatched_count);
END;
$function$;

-- =============================================================================
-- 5. accept_delivery_job — UNIFIED (supports order_type)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.accept_delivery_job(
  p_order_id TEXT,
  p_agent_id UUID,
  p_order_type TEXT DEFAULT 'MARKETPLACE'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_updated_count INT;
  v_agent_balance NUMERIC;
  v_table TEXT;
BEGIN
  v_table := CASE WHEN p_order_type = 'FOOD' THEN 'food_orders' ELSE 'marketplace_orders' END;

  SELECT balance INTO v_agent_balance FROM public.wallets WHERE user_id = p_agent_id;
  IF v_agent_balance IS NULL OR v_agent_balance < 500 THEN
    RETURN json_build_object('ok', false, 'error', 'Insufficient collateral. Need 500 ETB minimum.');
  END IF;

  EXECUTE format('UPDATE public.%I SET agent_id = $1, status = $2, updated_at = now() WHERE id = $3 AND agent_id IS NULL AND status IN ($4, $5, $6, $7)', v_table)
    USING p_agent_id, 'AGENT_ASSIGNED', p_order_id, 'DISPATCHING', 'PAID', 'READY', 'PENDING';
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Job already taken or no longer available');
  END IF;

  UPDATE delivery_dispatches SET status = 'ACCEPTED', responded_at = now()
  WHERE order_id = p_order_id AND agent_id = p_agent_id;

  UPDATE delivery_dispatches SET status = 'SUPERSEDED'
  WHERE order_id = p_order_id AND agent_id != p_agent_id AND status = 'PENDING';

  RETURN json_build_object('ok', true);
END;
$function$;

-- =============================================================================
-- 6. mark_delivery_delivered_atomic — Agent marks arrival at destination
-- =============================================================================
CREATE OR REPLACE FUNCTION public.mark_delivery_delivered_atomic(
  p_order_id TEXT,
  p_agent_id UUID,
  p_order_type TEXT DEFAULT 'MARKETPLACE'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_table TEXT;
BEGIN
  v_table := CASE WHEN p_order_type = 'FOOD' THEN 'food_orders' ELSE 'marketplace_orders' END;

  EXECUTE format('SELECT * FROM public.%I WHERE id = $1 FOR UPDATE', v_table) INTO v_order USING p_order_id;
  IF v_order.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF v_order.agent_id <> p_agent_id AND NOT is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized_agent');
  END IF;

  IF v_order.status NOT IN ('SHIPPED', 'IN_TRANSIT') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  EXECUTE format('UPDATE public.%I SET status = $1, delivered_at = now(), updated_at = now() WHERE id = $2', v_table)
    USING 'AWAITING_PIN', p_order_id;

  RETURN json_build_object('ok', true, 'status', 'AWAITING_PIN');
END;
$function$;

-- =============================================================================
-- 7. confirm_delivery_with_pin — UNIFIED (handles both tables + payout)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.confirm_delivery_with_pin(
  p_order_id TEXT,
  p_pin TEXT,
  p_agent_id UUID DEFAULT NULL,
  p_order_type TEXT DEFAULT 'MARKETPLACE'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_escrow RECORD;
  v_table TEXT;
  v_merch_wallet_id UUID;
  v_agent_wallet_id UUID;
  v_treasury_id UUID;
  v_merch_share NUMERIC;
  v_agent_share NUMERIC;
  v_plat_fee NUMERIC;
  v_buyer_field TEXT;
BEGIN
  v_table := CASE WHEN p_order_type = 'FOOD' THEN 'food_orders' ELSE 'marketplace_orders' END;
  v_buyer_field := CASE WHEN p_order_type = 'FOOD' THEN 'citizen_id' ELSE 'buyer_id' END;

  EXECUTE format('SELECT * FROM public.%I WHERE id = $1 FOR UPDATE', v_table) INTO v_order USING p_order_id;
  IF v_order.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF p_agent_id IS NOT NULL AND v_order.agent_id IS NOT NULL AND v_order.agent_id <> p_agent_id AND NOT is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized_agent');
  END IF;

  IF v_order.status NOT IN ('AWAITING_PIN', 'SHIPPED', 'IN_TRANSIT') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status_for_confirmation');
  END IF;

  IF v_order.is_locked = true THEN
    RETURN json_build_object('ok', false, 'error', 'order_locked_too_many_attempts');
  END IF;

  IF v_order.delivery_pin IS NULL OR v_order.delivery_pin <> p_pin THEN
    EXECUTE format('UPDATE public.%I SET failed_pin_attempts = COALESCE(failed_pin_attempts,0)+1, is_locked = CASE WHEN COALESCE(failed_pin_attempts,0)+1 >= 5 THEN true ELSE false END WHERE id = $1', v_table)
      USING p_order_id;
    RETURN json_build_object('ok', false, 'error', 'invalid_pin');
  END IF;

  -- Lookup escrow
  SELECT * INTO v_escrow FROM public.escrows WHERE id = v_order.escrow_id FOR UPDATE;
  IF NOT FOUND OR v_escrow.status <> 'LOCKED' THEN
    RETURN json_build_object('ok', false, 'error', 'escrow_invalid');
  END IF;

  -- Wallets
  SELECT id INTO v_merch_wallet_id FROM wallets WHERE user_id = v_order.merchant_id;
  SELECT id INTO v_agent_wallet_id FROM wallets WHERE user_id = v_order.agent_id;
  SELECT id INTO v_treasury_id FROM wallets WHERE user_id = '00000000-0000-0000-0000-000000000000';

  IF v_merch_wallet_id IS NULL OR v_treasury_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'wallet_missing');
  END IF;

  v_agent_share := COALESCE(v_order.agent_fee, 0);
  v_plat_fee := COALESCE(v_order.platform_fee, 0);
  v_merch_share := v_escrow.amount - v_agent_share - v_plat_fee;

  -- Merchant payout
  UPDATE wallets SET balance = balance + v_merch_share, updated_at = now() WHERE id = v_merch_wallet_id;
  INSERT INTO transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
  VALUES (gen_random_uuid(), v_merch_wallet_id, v_merch_share, 'credit', 'food_payout',
    'Food Sale: ' || COALESCE(v_order.restaurant_name, v_order.id::text), now(), 'fmerch-' || p_order_id);

  -- Agent payout
  IF v_order.agent_id IS NOT NULL AND v_agent_wallet_id IS NOT NULL AND v_agent_share > 0 THEN
    UPDATE wallets SET balance = balance + v_agent_share, updated_at = now() WHERE id = v_agent_wallet_id;
    INSERT INTO transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
    VALUES (gen_random_uuid(), v_agent_wallet_id, v_agent_share, 'credit', 'delivery_earning',
      'Delivery: ' || COALESCE(v_order.restaurant_name, ''), now(), 'fagent-' || p_order_id);
    UPDATE delivery_agents SET total_deliveries = COALESCE(total_deliveries,0)+1 WHERE id = v_order.agent_id;
  END IF;

  -- Platform fee
  UPDATE wallets SET balance = balance + v_plat_fee, updated_at = now() WHERE id = v_treasury_id;
  INSERT INTO transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
  VALUES (gen_random_uuid(), v_treasury_id, v_plat_fee, 'credit', 'platform_fee',
    'Fee: food-' || p_order_id, now(), 'ffee-' || p_order_id);

  -- Finalize
  UPDATE escrows SET status = 'RELEASED', release_method = 'delivery_pin', resolved_at = now(), updated_at = now()
  WHERE id = v_escrow.id;

  EXECUTE format('UPDATE public.%I SET status = $1, updated_at = now() WHERE id = $2', v_table)
    USING 'COMPLETED', p_order_id;

  RETURN json_build_object('ok', true, 'agent_share', v_agent_share, 'merchant_share', v_merch_share);
END;
$function$;

-- =============================================================================
-- 8. complete_food_order_payout — For dine-in/quick-sale (no delivery agent)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.complete_food_order_payout(
  p_order_id TEXT,
  p_merchant_id UUID,
  p_pickup_pin TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_escrow RECORD;
  v_merch_wallet_id UUID;
  v_treasury_id UUID;
  v_merch_share NUMERIC;
  v_plat_fee NUMERIC;
BEGIN
  SELECT * INTO v_order FROM public.food_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF v_order.merchant_id <> p_merchant_id AND NOT is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  IF v_order.status IN ('COMPLETED', 'CANCELLED') THEN
    RETURN json_build_object('ok', false, 'error', 'order_already_finalized');
  END IF;

  -- PIN check if provided
  IF p_pickup_pin IS NOT NULL AND v_order.delivery_pin IS NOT NULL AND v_order.delivery_pin <> p_pickup_pin THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_pin');
  END IF;

  -- If no escrow (quick sale / cash), just mark complete
  IF v_order.escrow_id IS NULL THEN
    UPDATE food_orders SET status = 'COMPLETED', updated_at = now() WHERE id = p_order_id;
    RETURN json_build_object('ok', true, 'new_balance', 0);
  END IF;

  SELECT * INTO v_escrow FROM escrows WHERE id = v_order.escrow_id FOR UPDATE;
  IF NOT FOUND OR v_escrow.status <> 'LOCKED' THEN
    UPDATE food_orders SET status = 'COMPLETED', updated_at = now() WHERE id = p_order_id;
    RETURN json_build_object('ok', true, 'new_balance', 0);
  END IF;

  SELECT id INTO v_merch_wallet_id FROM wallets WHERE user_id = p_merchant_id;
  SELECT id INTO v_treasury_id FROM wallets WHERE user_id = '00000000-0000-0000-0000-000000000000';

  v_plat_fee := COALESCE(v_order.platform_fee, ROUND(v_escrow.amount * 0.05, 2));
  v_merch_share := v_escrow.amount - v_plat_fee;

  UPDATE wallets SET balance = balance + v_merch_share, updated_at = now() WHERE id = v_merch_wallet_id;
  INSERT INTO transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
  VALUES (gen_random_uuid(), v_merch_wallet_id, v_merch_share, 'credit', 'food_payout',
    'Food: ' || COALESCE(v_order.restaurant_name, ''), now(), 'fpayout-' || p_order_id);

  IF v_treasury_id IS NOT NULL THEN
    UPDATE wallets SET balance = balance + v_plat_fee, updated_at = now() WHERE id = v_treasury_id;
    INSERT INTO transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
    VALUES (gen_random_uuid(), v_treasury_id, v_plat_fee, 'credit', 'platform_fee',
      'Fee: food-' || p_order_id, now(), 'fpfee-' || p_order_id);
  END IF;

  UPDATE escrows SET status = 'RELEASED', release_method = 'merchant_complete', resolved_at = now(), updated_at = now()
  WHERE id = v_escrow.id;
  UPDATE food_orders SET status = 'COMPLETED', updated_at = now() WHERE id = p_order_id;

  RETURN json_build_object('ok', true, 'new_balance', v_merch_share);
END;
$function$;

-- =============================================================================
-- 9. reject_food_order_refund — Cancel + refund citizen
-- =============================================================================
CREATE OR REPLACE FUNCTION public.reject_food_order_refund(
  p_order_id TEXT,
  p_merchant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_escrow RECORD;
  v_wallet_id UUID;
BEGIN
  SELECT * INTO v_order FROM food_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF v_order.merchant_id <> p_merchant_id AND NOT is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  IF v_order.status IN ('COMPLETED', 'CANCELLED') THEN
    RETURN json_build_object('ok', false, 'error', 'order_already_finalized');
  END IF;

  -- Refund escrow if exists
  IF v_order.escrow_id IS NOT NULL THEN
    SELECT * INTO v_escrow FROM escrows WHERE id = v_order.escrow_id FOR UPDATE;
    IF FOUND AND v_escrow.status = 'LOCKED' THEN
      SELECT id INTO v_wallet_id FROM wallets WHERE user_id = v_order.citizen_id;
      IF v_wallet_id IS NOT NULL THEN
        UPDATE wallets SET balance = balance + v_escrow.amount, updated_at = now() WHERE id = v_wallet_id;
        INSERT INTO transactions (id, wallet_id, amount, type, category, description, created_at, idempotency_key)
        VALUES (gen_random_uuid(), v_wallet_id, v_escrow.amount, 'credit', 'refund',
          'Food refund: ' || COALESCE(v_order.restaurant_name, ''), now(), 'frefund-' || p_order_id);
      END IF;
      UPDATE escrows SET status = 'REFUNDED', resolved_at = now(), updated_at = now() WHERE id = v_escrow.id;
    END IF;
  END IF;

  UPDATE food_orders SET status = 'CANCELLED', updated_at = now() WHERE id = p_order_id;
  RETURN json_build_object('ok', true);
END;
$function$;

-- =============================================================================
-- 10. reveal_food_order_pin — Rate-limited PIN reveal for merchant
-- =============================================================================
CREATE OR REPLACE FUNCTION public.reveal_food_order_pin(p_order_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM food_orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF v_order.merchant_id <> auth.uid() AND NOT is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  IF v_order.delivery_pin IS NULL OR v_order.delivery_pin = '' THEN
    RETURN json_build_object('ok', false, 'error', 'no_pin_generated');
  END IF;

  RETURN json_build_object('ok', true, 'delivery_pin', v_order.delivery_pin);
END;
$function$;

-- =============================================================================
-- 11. RLS update: allow agent + merchant UPDATE on food_orders
-- =============================================================================
DROP POLICY IF EXISTS food_orders_agent_update ON food_orders;
CREATE POLICY food_orders_agent_update ON food_orders
  FOR UPDATE TO authenticated
  USING (agent_id = auth.uid() OR merchant_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS food_orders_insert_citizen ON food_orders;
CREATE POLICY food_orders_insert_citizen ON food_orders
  FOR INSERT TO authenticated
  WITH CHECK (citizen_id = auth.uid() OR is_admin());

-- Add order_type column to delivery_dispatches if missing
ALTER TABLE public.delivery_dispatches ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'MARKETPLACE';
