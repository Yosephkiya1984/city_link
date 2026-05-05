-- supabase/migrations/20260504000100_unified_pickup_system.sql

-- 1. DROP ALL PREVIOUS VARIANTS to prevent signature ambiguity
DROP FUNCTION IF EXISTS public.confirm_order_pickup(text, uuid);
DROP FUNCTION IF EXISTS public.confirm_order_pickup(text, uuid, text);

-- 2. CREATE UNIFIED VERSION
CREATE OR REPLACE FUNCTION public.confirm_order_pickup(
  p_order_id text,
  p_user_id uuid,
  p_order_type text DEFAULT 'MARKETPLACE'
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

  -- 2. Authorization (Merchant, Agent, or Admin)
  -- Note: in food_orders it is merchant_id, in marketplace_orders it is merchant_id
  IF p_user_id <> v_order.merchant_id
     AND (v_order.agent_id IS NULL OR p_user_id <> v_order.agent_id)
     AND NOT is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  -- 3. Status Validation (Relaxed for operational flexibility)
  -- Added 'PLACED' and 'READY' to common list
  IF v_order.status NOT IN ('PAID', 'DISPATCHING', 'AGENT_ASSIGNED', 'PLACED', 'READY', 'PENDING') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status_for_pickup', 'current_status', v_order.status);
  END IF;

  -- 4. PIN Generation/Retrieval
  -- delivery_pin is the 6-digit code for the citizen
  IF v_order.delivery_pin IS NULL OR v_order.delivery_pin = '' THEN
    v_delivery_pin := lpad(floor(random() * 1000000)::text, 6, '0');
  ELSE
    v_delivery_pin := v_order.delivery_pin;
  END IF;

  -- 5. Update Confirmation Status
  IF p_user_id = v_order.merchant_id OR v_order.agent_id IS NULL THEN
    -- Merchant confirms or it's a merchant-only handover prep
    v_sql := format('UPDATE public.%I SET merchant_confirmed_pickup = true, delivery_pin = $1, updated_at = now() WHERE id = $2', v_table_name);
    EXECUTE v_sql USING v_delivery_pin, p_order_id;
  ELSE
    -- Agent confirms
    v_sql := format('UPDATE public.%I SET agent_confirmed_pickup = true, delivery_pin = $1, updated_at = now() WHERE id = $2', v_table_name);
    EXECUTE v_sql USING v_delivery_pin, p_order_id;
  END IF;

  -- 6. Check for completion of pickup phase
  v_sql := format('SELECT merchant_confirmed_pickup, agent_confirmed_pickup, status, agent_id FROM public.%I WHERE id = $1', v_table_name);
  EXECUTE v_sql INTO v_order USING p_order_id;

  IF (v_order.agent_confirmed_pickup = true OR v_order.agent_id IS NULL) 
     AND v_order.merchant_confirmed_pickup = true THEN
    
    v_final_status := 'SHIPPED';
    v_sql := format('UPDATE public.%I SET status = $1, picked_up_at = now(), updated_at = now() WHERE id = $2', v_table_name);
    EXECUTE v_sql USING v_final_status, p_order_id;
  ELSE
    v_final_status := v_order.status;
  END IF;

  RETURN json_build_object(
    'ok', true, 
    'status', v_final_status, 
    'delivery_pin', v_delivery_pin
  );
END;
$function$;
