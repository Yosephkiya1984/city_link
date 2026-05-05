-- supabase/migrations/20260505000100_fix_pickup_unification.sql

-- 1. Add pickup_pin to food_orders if missing
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS pickup_pin CHARACTER VARYING(6);

-- Backfill existing orders with a random pin if they don't have one
UPDATE public.food_orders 
SET pickup_pin = lpad(floor(random() * 1000000)::text, 6, '0')
WHERE pickup_pin IS NULL;

-- 2. Update process_food_purchase to generate a pickup_pin
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
  v_delivery_pin TEXT;
  v_pickup_pin TEXT;
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
  v_delivery_pin := COALESCE(p_delivery_pin, lpad(floor(random() * 1000000)::text, 6, '0'));
  v_pickup_pin := lpad(floor(random() * 1000000)::text, 6, '0');

  -- Deduct
  UPDATE public.wallets SET balance = balance - p_total, updated_at = now() WHERE user_id = p_citizen_id;

  -- Escrow
  INSERT INTO public.escrows (id, buyer_id, merchant_id, amount, service_type, status, created_at, updated_at)
  VALUES (v_escrow_id, p_citizen_id, p_merchant_id, p_total, 'food', 'LOCKED', now(), now());

  -- Order
  INSERT INTO public.food_orders (
    id, citizen_id, merchant_id, restaurant_id, restaurant_name,
    items, total, status, delivery_pin, pickup_pin, escrow_id,
    shipping_address, destination_lat, destination_lng,
    agent_fee, platform_fee, created_at, updated_at
  ) VALUES (
    p_order_id, p_citizen_id, p_merchant_id, p_restaurant_id, p_restaurant_name,
    p_items_json, p_total, 'PENDING', v_delivery_pin, v_pickup_pin, v_escrow_id,
    p_shipping_address, p_lat, p_lng,
    v_agent_fee, v_platform_fee, now(), now()
  );

  INSERT INTO public.transactions (id, wallet_id, amount, type, category, description, idempotency_key, created_at)
  VALUES (gen_random_uuid(), (SELECT id FROM wallets WHERE user_id = p_citizen_id),
    p_total, 'debit', 'food_purchase', 'Food: ' || p_restaurant_name, 'food-' || p_order_id, now());

  RETURN jsonb_build_object('ok', true, 'order_id', p_order_id, 'delivery_pin', v_delivery_pin, 'pickup_pin', v_pickup_pin, 'escrow_id', v_escrow_id);
END;
$function$;

-- 3. Update confirm_order_pickup to handle PIN validation
CREATE OR REPLACE FUNCTION public.confirm_order_pickup(
  p_order_id text,
  p_user_id uuid,
  p_order_type text DEFAULT 'MARKETPLACE',
  p_pickup_pin text DEFAULT NULL
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_table_name text;
  v_order RECORD;
  v_delivery_pin text;
  v_final_status text;
  v_sql text;
  v_is_agent boolean;
BEGIN
  -- Determine Table
  IF p_order_type = 'FOOD' THEN
    v_table_name := 'food_orders';
  ELSE
    v_table_name := 'marketplace_orders';
  END IF;

  -- 1. Dynamic SELECT and LOCK
  v_sql := format('SELECT * FROM public.%I WHERE id = $1 FOR UPDATE', v_table_name);
  EXECUTE v_sql INTO v_order USING p_order_id;

  IF v_order.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  -- 2. Authorization
  v_is_agent := (v_order.agent_id IS NOT NULL AND p_user_id = v_order.agent_id);
  
  IF p_user_id <> v_order.merchant_id
     AND NOT v_is_agent
     AND NOT is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  -- 3. PIN Validation (MANDATORY for Agents)
  IF v_is_agent THEN
    IF p_pickup_pin IS NULL THEN
       RETURN json_build_object('ok', false, 'error', 'pickup_pin_required');
    END IF;
    IF v_order.pickup_pin IS NULL OR v_order.pickup_pin <> p_pickup_pin THEN
       RETURN json_build_object('ok', false, 'error', 'invalid_pickup_pin');
    END IF;
  END IF;

  -- 4. Status Validation
  IF v_order.status NOT IN ('PAID', 'DISPATCHING', 'AGENT_ASSIGNED', 'PLACED', 'READY', 'PENDING', 'ACCEPTED') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status_for_pickup', 'current_status', v_order.status);
  END IF;

  -- 5. Update Confirmation Status
  IF p_user_id = v_order.merchant_id THEN
    -- Merchant confirms
    v_sql := format('UPDATE public.%I SET merchant_confirmed_pickup = true, updated_at = now() WHERE id = $1', v_table_name);
    EXECUTE v_sql USING p_order_id;
  ELSIF v_is_agent THEN
    -- Agent confirms
    v_sql := format('UPDATE public.%I SET agent_confirmed_pickup = true, picked_up_at = now(), updated_at = now() WHERE id = $1', v_table_name);
    EXECUTE v_sql USING p_order_id;
  END IF;

  -- 6. Check for completion of pickup phase
  v_sql := format('SELECT merchant_confirmed_pickup, agent_confirmed_pickup, status, agent_id FROM public.%I WHERE id = $1', v_table_name);
  EXECUTE v_sql INTO v_order USING p_order_id;

  -- If it's a self-delivery (no agent) or both confirmed, transition to SHIPPED
  IF (v_order.agent_confirmed_pickup = true OR v_order.agent_id IS NULL) 
     AND v_order.merchant_confirmed_pickup = true THEN
    
    v_final_status := 'SHIPPED';
    v_sql := format('UPDATE public.%I SET status = $1, picked_up_at = COALESCE(picked_up_at, now()), updated_at = now() WHERE id = $2', v_table_name);
    EXECUTE v_sql USING v_final_status, p_order_id;
  ELSE
    v_final_status := v_order.status;
  END IF;

  RETURN json_build_object(
    'ok', true, 
    'status', v_final_status,
    'pickup_pin', v_order.pickup_pin,
    'delivery_pin', v_order.delivery_pin
  );
END;
$function$;
