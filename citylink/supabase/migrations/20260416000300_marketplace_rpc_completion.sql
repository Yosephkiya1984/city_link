-- Marketplace RPC completion and missing flow hardening
-- Adds the missing order dispatch, pickup, delivery confirmation, and refund RPCs

DROP FUNCTION IF EXISTS public.confirm_order_pickup(text, uuid);
DROP FUNCTION IF EXISTS public.confirm_delivery_with_pin(text, text, uuid);
DROP FUNCTION IF EXISTS public.dispatch_marketplace_order(text, uuid, numeric, numeric);
DROP FUNCTION IF EXISTS public.cancel_and_refund_marketplace_order(text, text);

CREATE OR REPLACE FUNCTION public.confirm_order_pickup(
  p_order_id text,
  p_user_id uuid
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_delivery_pin text;
BEGIN
  SELECT * INTO v_order FROM public.marketplace_orders WHERE id::text = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF v_order.merchant_id <> p_user_id AND NOT is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  IF v_order.status NOT IN ('PAID', 'DISPATCHING', 'AGENT_ASSIGNED') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status_for_pickup');
  END IF;

  IF v_order.delivery_pin IS NULL OR v_order.delivery_pin = '' THEN
    v_delivery_pin := lpad(floor(random() * 1000000)::text, 6, '0');
  ELSE
    v_delivery_pin := v_order.delivery_pin;
  END IF;

  UPDATE public.marketplace_orders
  SET status = 'SHIPPED',
      delivery_pin = v_delivery_pin,
      merchant_confirmed_pickup = true,
      updated_at = now()
  WHERE id::text = p_order_id;

  RETURN json_build_object('ok', true, 'status', 'SHIPPED', 'delivery_pin', v_delivery_pin);
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_delivery_with_pin(
  p_order_id text,
  p_pin text,
  p_agent_id uuid DEFAULT NULL
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_escrow RECORD;
  v_release json;
BEGIN
  SELECT * INTO v_order FROM public.marketplace_orders WHERE id::text = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF p_agent_id IS NOT NULL AND v_order.agent_id IS NOT NULL AND v_order.agent_id <> p_agent_id AND NOT is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized_agent');
  END IF;

  IF v_order.status NOT IN ('AWAITING_PIN', 'SHIPPED', 'IN_TRANSIT') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status_for_confirmation');
  END IF;

  IF v_order.delivery_pin IS NULL OR v_order.delivery_pin <> p_pin THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_pin');
  END IF;

  SELECT * INTO v_escrow FROM public.escrows WHERE id = v_order.escrow_id FOR UPDATE;
  IF NOT FOUND OR v_escrow.status <> 'LOCKED' THEN
    RETURN json_build_object('ok', false, 'error', 'escrow_invalid');
  END IF;

  SELECT public.release_escrow(v_escrow.id::text, v_order.id::text, 'delivery_pin') INTO v_release;
  IF v_release->>'ok' <> 'true' THEN
    RETURN json_build_object('ok', false, 'error', v_release->>'error');
  END IF;

  RETURN json_build_object('ok', true, 'agent_share', COALESCE(v_order.agent_fee, 0));
END;
$function$;

CREATE OR REPLACE FUNCTION public.dispatch_marketplace_order(
  p_order_id text,
  p_merchant_id uuid,
  p_lat numeric,
  p_lng numeric
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_dispatched_count int := 0;
  v_expires_at timestamp with time zone := now() + interval '5 minutes';
  v_agent_ids uuid[];
BEGIN
  SELECT * INTO v_order FROM public.marketplace_orders WHERE id::text = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF v_order.merchant_id <> p_merchant_id AND NOT is_admin() THEN
    RETURN json_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  IF v_order.status NOT IN ('PAID', 'DISPATCHING', 'AGENT_ASSIGNED') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status_for_dispatch');
  END IF;

  UPDATE public.marketplace_orders
  SET status = 'DISPATCHING',
      dispatch_expires_at = v_expires_at,
      dispatch_attempts = COALESCE(dispatch_attempts, 0) + 1,
      updated_at = now()
  WHERE id::text = p_order_id;

  IF p_lat IS NULL OR p_lng IS NULL THEN
    SELECT array_agg(id) INTO v_agent_ids
    FROM (
      SELECT id
      FROM public.delivery_agents
      WHERE is_online = true
        AND agent_status = 'APPROVED'
        AND (blocked_until IS NULL OR blocked_until <= now())
      ORDER BY location_updated_at DESC NULLS LAST
      LIMIT 5
    ) x;
  ELSE
    SELECT array_agg(id) INTO v_agent_ids
    FROM (
      SELECT id,
        6371 * 2 * atan2(
          sqrt(
            sin(radians((current_lat - p_lat) / 2)) ^ 2 +
            cos(radians(p_lat)) * cos(radians(current_lat)) *
            sin(radians((current_lng - p_lng) / 2)) ^ 2
          ),
          sqrt(1 - (
            sin(radians((current_lat - p_lat) / 2)) ^ 2 +
            cos(radians(p_lat)) * cos(radians(current_lat)) *
            sin(radians((current_lng - p_lng) / 2)) ^ 2
          ))
        ) AS distance_km
      FROM public.delivery_agents
      WHERE is_online = true
        AND agent_status = 'APPROVED'
        AND current_lat IS NOT NULL
        AND current_lng IS NOT NULL
        AND (blocked_until IS NULL OR blocked_until <= now())
        AND location_updated_at > now() - interval '10 minutes'
      ORDER BY distance_km ASC
      LIMIT 5
    ) x;
  END IF;

  IF v_agent_ids IS NULL OR array_length(v_agent_ids, 1) = 0 THEN
    RETURN json_build_object('ok', true, 'dispatched_count', 0);
  END IF;

  INSERT INTO public.delivery_dispatches (order_id, agent_id, expires_at, status, created_at)
  SELECT p_order_id, agent_id, v_expires_at, 'PENDING', now()
  FROM unnest(v_agent_ids) AS agent_id
  ON CONFLICT (order_id, agent_id) DO UPDATE
  SET expires_at = EXCLUDED.expires_at,
      status = EXCLUDED.status,
      created_at = EXCLUDED.created_at;

  SELECT COUNT(*) INTO v_dispatched_count FROM public.delivery_dispatches
  WHERE order_id = p_order_id
    AND status = 'PENDING';

  RETURN json_build_object('ok', true, 'dispatched_count', v_dispatched_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_and_refund_marketplace_order(
  p_order_id text,
  p_reason text
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_escrow RECORD;
  v_wallet_id uuid;
BEGIN
  SELECT * INTO v_order FROM public.marketplace_orders WHERE id::text = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF v_order.status IN ('COMPLETED', 'CANCELLED', 'DISPUTED', 'REJECTED_BY_BUYER') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status_for_cancellation');
  END IF;

  SELECT * INTO v_escrow FROM public.escrows WHERE id = v_order.escrow_id FOR UPDATE;
  IF NOT FOUND OR v_escrow.status <> 'LOCKED' THEN
    RETURN json_build_object('ok', false, 'error', 'escrow_invalid');
  END IF;

  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = v_order.buyer_id;
  IF v_wallet_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'buyer_wallet_missing');
  END IF;

  UPDATE public.wallets
  SET balance = balance + v_escrow.amount,
      updated_at = now()
  WHERE id = v_wallet_id;

  INSERT INTO public.transactions (
    id,
    wallet_id,
    amount,
    type,
    category,
    description,
    created_at,
    idempotency_key
  ) VALUES (
    gen_random_uuid(),
    v_wallet_id,
    v_escrow.amount,
    'credit',
    'refund',
    'Marketplace refund: ' || COALESCE(p_reason, 'cancelled'),
    now(),
    'refund-' || p_order_id
  );

  UPDATE public.escrows
  SET status = 'REFUNDED',
      resolved_at = now(),
      updated_at = now()
  WHERE id = v_escrow.id;

  UPDATE public.marketplace_orders
  SET status = 'CANCELLED',
      rejection_reason = COALESCE(p_reason, 'cancelled'),
      updated_at = now()
  WHERE id::text = p_order_id;

  RETURN json_build_object('ok', true);
END;
$function$;
